# [ARQUITECTURA_SRM] - Master Blueprint del Proyecto APICULTOR SRM (Geo_SRM)

Este documento es la directriz inmutable y de lectura obligatoria para cualquier agente de IA o desarrollador que trabaje en este repositorio. Define las reglas de arquitectura de base de datos, estructuración del frontend y las directivas de seguridad para recrear el proyecto completo desde cero.

---

## 🛡️ 1. Directivas Inmutables de Proyecto y Aislamiento

> [!CRITICAL]
> **REGLA DE AISLAMIENTO ABSOLUTO**:
> 1. Este proyecto se denomina **APICULTOR SRM** (también conocido internamente como **Geo_SRM**).
> 2. Está estrictamente prohibido mezclar, importar, referenciar o heredar lógica, bases de datos o configuraciones de la aplicación móvil **GeoLogística** o del negocio **Distribuidora Córdoba** (por ejemplo, perfiles como Claudio Oviedo u otros datos de su dominio comercial).
> 3. Los datos de prueba, nombres de usuarios de la interfaz, logotipos y títulos deben estar 100% alineados únicamente al sector apícola.

---

## 🗄️ 2. Arquitectura y Modelo de Base de Datos (Supabase)

La base de datos se aloja en un proyecto de Supabase independiente (Project ID: `ajrfkkiuludrdexgprmb`).

### Esquema Relacional (PostgreSQL)

```
 +------------------+        +--------------------------+
 |   apicultores    |<-------|   ficha_entregas_miel    |
 +------------------+        +--------------------------+
 | id (PK, UUID)    |        | id (PK, UUID)            |
 | nombre (text)    |        | apicultor_id (FK, UUID)  |
 | cuit (unique)    |        | fecha (timestamptz)      |
 | dni (text)       |        | romaneo (varchar)        |
 | renapa (text)    |        | color_pfund (numeric)    |
 | provincia (text) |        | humedad (numeric)        |
 | localidad (text) |        | hmf (numeric)            |
 | telefono (text)  |        | cantidad_tambores (int)  |
 | cod_api (text)   |        | kilos_neto (numeric)     |
 | puntuacion       |        +--------------------------+
 | etapa (text)     |                     ^
 | tag (text)       |                     |
 | notas_onboarding |        +--------------------------+
 +------------------+        |  ficha_entrega_tambores  |
          ^                  +--------------------------+
          |                  | id (PK, UUID)            |
          |                  | entrega_id (FK, UUID)    |
          |                  | nro_tambor (varchar)     |
          |                  | barras_ean (varchar)     |
          |                  | lote (integer)           |
          |                  | kilos_bruto (numeric)    |
          |                  | tara (numeric)           |
          |                  | kilos_neto (generated)   |
          |                  | color_pfund (numeric)    |
          |                  | humedad (numeric)        |
          |                  | hmf (numeric)            |
          |                  | antibiotico (text)       |
          |                  +--------------------------+
          |
          |                  +--------------------------+
          +------------------|  ficha_control_envases   |
          |                  +--------------------------+
          |                  | id (PK, UUID)            |
          |                  | apicultor_id (FK, UUID)  |
          |                  | fecha (timestamptz)      |
          |                  | tipo_movimiento (enum)   |
          |                  | cantidad (integer)       |
          |                  | observaciones (text)     |
          |                  +--------------------------+
          |
          |                  +--------------------------+
          +------------------|  ficha_cuenta_corriente  |
          |                  +--------------------------+
          |                  | id (PK, UUID)            |
          |                  | apicultor_id (FK, UUID)  |
          |                  | fecha (timestamptz)      |
          |                  | moneda (ARS/USD)         |
          |                  | tipo_movimiento (enum)   |
          |                  | monto (numeric)          |
          |                  | detalle (text)           |
          |                  | precio_ref_miel (num)    |
          |                  | kilos_miel_equiv (num)   |
          |                  | tipo_transaccion (text)  |
          |                  +--------------------------+
          |
          |                  +--------------------------+
          +------------------|  ficha_control_operculo  |
                             +--------------------------+
                             | id (PK, UUID)            |
                             | apicultor_id (FK, UUID)  |
                             | fecha (timestamptz)      |
                             | tipo_movimiento (text)   |
                             | kilos_op (numeric)       |
                             | rendimiento_cera (num)   |
                             | detalle (text)           |
                             +--------------------------+
```

### Reglas de Integridad y Restricciones
* **Análisis de Miel**: `color_pfund` y `hmf` deben ser valores positivos. `humedad` debe estar comprendida entre `0.00` y `100.00`%.
* **Control de Envases**: `tipo_movimiento` debe ser `'PRESTAMO'` o `'DEVOLUCION'`.
* **Cuenta Corriente**: Soporta doble moneda (`'ARS'` y `'USD'`). El `tipo_movimiento` es obligatoriamente `'DEBE'` o `'HABER'`. Permite registrar el `precio_referencia_miel`, `kilos_miel_equiv` (negativo en DEBE), y clasificar la transacción en `tipo_transaccion`.
* **Control de Opérculo**: El `tipo_movimiento` debe ser `'ENTREGA_OP'`, `'RETIRO_CERA'`, o `'AJUSTE'`. El rendimiento predeterminado es `0.80`.

### Funciones SQL Clave
1. `obtener_saldo_envases_campo(uuid)`: Retorna la diferencia neta de tambores vacíos en poder del apicultor.
2. `consultar_renapa(text)`: Realiza una solicitud HTTP POST al padrón nacional argentino para comprobar la vigencia y datos del apicultor en base a su CUIT.
3. `registrar_tcm_desde_sharepoint(...)`: Recibe e integra tambores individuales desde flujos externos (SharePoint/Power Automate), agrupándolos por Romaneo y recalculando promedios analíticos en tiempo real.

---

## 🖥️ 3. Arquitectura del Frontend

El frontend está estructurado como una Single Page Application (SPA) modular:
* **Tecnología**: React + TypeScript + Vite.
* **Estilo Visual (CSS)**: Vanilla CSS estructurado por variables en [variables.css](file:///c:/Users/Parque-Apicola/Desktop/apicultor_srm/frontend/src/styles/variables.css). Tema claro premium, con sombras suaves, bordes redondeados a `16px` y acentos ámbar (miel), verde lima y verde esmeralda. No se permite Tailwind CSS.
* **Gestión de Estado**: Lógica reactiva local con mock integrado. Si no se especifican variables en `.env`, la aplicación entra en **Mock Mode**, persistiendo la información de forma coherente en el `localStorage` del cliente.
* **Firma de Documentos**: Extracción regex de remitos y facturas en la descripción del detalle para mostrarlos en la columna independiente "Documento".
* **Categorización Pareto 80/20**: Clasificación de apicultores en tiempo real (Clase A y Clase B) basada en su aporte acumulado de kilos netos de miel sobre el total general.

---

## 🐍 4. Flujo de Migración Histórica (ETL)

El archivo `importador_excel.py` clasifica semánticamente las planillas Excel a través de patrones regex para dividir transacciones financieras de las entregas de envases físicos y cargarlos a Supabase.
