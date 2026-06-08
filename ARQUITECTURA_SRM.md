# [ARQUITECTURA_SRM] - Master Blueprint del Proyecto APICULTOR SRM (Geo_SRM)

Este documento es la directriz inmutable y de lectura obligatoria para cualquier agente de IA o desarrollador que trabaje en este repositorio. Define las reglas de arquitectura de base de datos, estructuración del frontend y las directivas de seguridad.

---

## 🛡️ 1. Directivas Inmutables de Proyecto y Aislamiento

> [!CRITICAL]
> **REGLA DE AISLAMIENTO ABSOLUTO**:
> 1. Este proyecto se denomina **APICULTOR SRM** (también conocido internamente como **Geo_SRM**).
> 2. Está estrictamente prohibido mezclar, importar, referenciar o heredar lógica, bases de datos o configuraciones de la aplicación móvil **GeoLogística** o del negocio **Distribuidora Córdoba** (por ejemplo, perfiles como Claudio Oviedo u otros datos de su dominio comercial).
> 3. Los datos de prueba, nombres de usuarios de la interfaz (ej. "Operador Apícola"), logotipos y títulos deben ser 100% genéricos y alineados únicamente al sector apícola.

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
 | cuit (unique)    |        | color_pfund (numeric)    |
 | localidad (text) |        | humedad (numeric)        |
 | puntuacion       |        | hmf (numeric)            |
 +------------------+        | cantidad_tambores (int)  |
          ^                  | kilos_neto (numeric)     |
          |                  +--------------------------+
          |                               ^
          |                               |
          |                  +--------------------------+
          |                  |  ficha_entrega_tambores  |
          |                  +--------------------------+
          |                  | id (PK, UUID)            |
          |                  | entrega_id (FK, UUID)    |
          |                  | nro_tambor (varchar)     |
          |                  | kilos_bruto (numeric)    |
          |                  | tara (numeric)           |
          |                  | kilos_neto (generated)   |
          |                  +--------------------------+
          |
          |                  +--------------------------+
          +------------------|  ficha_control_envases   |
          |                  +--------------------------+
          |                  | id (PK, UUID)            |
          |                  | apicultor_id (FK, UUID)  |
          |                  | tipo_movimiento (enum)   |
          |                  | cantidad (integer)       |
          |                  +--------------------------+
          |
          |                  +--------------------------+
          +------------------|  ficha_cuenta_corriente  |
          |                  +--------------------------+
          |                  | id (PK, UUID)            |
          |                  | apicultor_id (FK, UUID)  |
          |                  | moneda (ARS/USD)         |
          |                  | tipo_movimiento (enum)   |
          |                  | monto (numeric)          |
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
                             | tipo_movimiento (text)   |
                             | kilos_op (numeric)       |
                             | rendimiento_cera (num)   |
                             +--------------------------+
```

### Reglas de Integridad y Restricciones
- **Escala de Puntuación**: `puntuacion` debe estar comprendida estrictamente entre `0.00` y `5.00`.
- **Análisis de Miel**: `color_pfund` y `hmf` deben ser valores positivos. `humedad` debe estar comprendida entre `0.00` y `100.00`%.
- **Control de Envases**: `tipo_movimiento` debe ser `'PRESTAMO'` o `'DEVOLUCION'`.
- **Cuenta Corriente**: Soporta doble moneda (`'ARS'` y `'USD'`). El `tipo_movimiento` es obligatoriamente `'DEBE'` o `'HABER'`. Permite registrar el `precio_referencia_miel`, `kilos_miel_equiv` (negativo en DEBE), y clasificar la transacción en `tipo_transaccion`.
- **Control de Opérculo**: El `tipo_movimiento` debe ser `'ENTREGA_OP'`, `'RETIRO_CERA'`, o `'AJUSTE'`. El rendimiento predeterminado es `0.80`.
- **Triggers**: Todas las tablas modificables cuentan con un disparador automático `set_timestamp` que actualiza `updated_at` a la hora del servidor en UTC.

---

## 🖥️ 3. Arquitectura del Frontend (Google IDX)

El frontend está estructurado como una Single Page Application (SPA) modular:
- **Tecnología**: React + TypeScript + Vite.
- **Estilo Visual (CSS)**: Vanilla CSS estructurado por variables en [variables.css](file:///c:/Users/Parque-Apicola/Desktop/apicultor_srm/frontend/src/styles/variables.css). Tema claro premium, con sombras suaves, bordes redondeados a `16px` y acentos ámbar (miel), verde lima y verde esmeralda. No se permite Tailwind CSS.
- **Gestión de Estado**:
  - `SRMContext.tsx` y estados reactivos locales en `App.tsx` para coordinar la vista activa (Dashboard vs Radiografía 360°).
  - Los formularios interactúan mediante modales emergentes y actualizan la información reactivamente.
- **Modo Offline (Mock Mode)**: En caso de ausencia de las variables `.env`, el archivo `supabaseClient.ts` activa automáticamente el modo simulación, persistiendo la información de forma coherente en el `localStorage` del cliente.

---

## 🐍 4. Flujo de Migración Histórica (ETL)

El archivo `importador_excel.py` clasifica semánticamente las planillas Excel a través de dos patrones regex compilados:
- **Cuenta Corriente**: `(?i)(pago|cobro|anticipo|adelanto|efectivo|transferencia|cheque|factura|liq|liquidaci[oó]n|dolar|usd|pesos|val[e|es]|\bvs\b|\$)`
- **Envases**: `(?i)(tambor|envase|tcm|vacio|prestamo|devolucion|entrega.*envase|dev.*envase|tacho|barril)`

Si la clasificación semántica es dudosa, el script deriva la fila a un listado de revisión manual sin detener el procesamiento de la planilla.
