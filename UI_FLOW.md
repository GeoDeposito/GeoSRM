# [UI_FLOW] - Estructura de Pantallas, Componentes y Diseño Frontend

Este documento define la estructura de pantallas, layouts, componentes y estilos de la aplicación frontend de **APICULTOR SRM** para asegurar que el diseño y la experiencia de usuario puedan recrearse de forma idéntica desde cero.

---

## 1. Estructura de Navegación y Vistas

La aplicación está dividida en las siguientes vistas principales controladas por la barra de navegación lateral (Sidebar):

### A. Dashboard Central
* **Métricas Principales (KPI Cards)**:
  * *Volumen Total Acopiado*: Total de Kg netos recibidos.
  * *Existencia de Envases en Campo*: Balance neto de tambores vacíos prestados vs devueltos.
  * *Socios VIP (Clase A)*: Cantidad y porcentaje de apicultores Clase A bajo Pareto 80/20.
  * *Volumen Promedio por Apicultor*: Kilos netos promedio.
* **Integración SharePoint (TCM)**: Tarjeta destacada con detalles del esquema de sincronización de planillas y el botón interactivo "Sincronizar ahora con SharePoint" (que ejecuta un mock de sincronización reactivo y muestra el wizard interactivo de Power Automate).
* **Alertas Críticas**: Panel derecho/inferior que evalúa y muestra incidencias operacionales (e.g. lotes con humedad > 18% o HMF > 40, o apicultores con saldo de envases negativo).
* **Últimos Lotes Recibidos**: Tabla dinámica con las últimas 4 entregas registradas en tiempo real.

### B. Directorio de Apicultores
* Tabla con el listado completo de apicultores, que permite buscar dinámicamente por nombre, CUIT, RENAPA o localidad.
* **Columna Categoría 80/20**: Indica si el apicultor es **Clase A (Socio VIP)** o **Clase B** en base a su aporte acumulado.
* **Acciones**: Botón de "Onboarding" para registrar un nuevo apicultor (autocompleta DNI y busca datos en RENAPA en base al CUIT). Al hacer clic en un apicultor, redirige de forma instantánea a su **Ficha 360°**.

### C. Clasificación Pareto 80/20 (Panel Analítico)
* Pantalla dedicada que muestra la concentración comercial de Geomiel.
* **KPIs**: Muestra el Volumen Neto Total, Proveedores Clase A (80% del acopio), Proveedores Clase B (20% del acopio) y la tasa de concentración.
* **Tabla Pareto**: Apicultores ordenados por volumen neto descendente, detallando su rango, porcentaje individual, porcentaje acumulado y badge representativo. Cada fila es clickeable para abrir la Ficha 360° del apicultor.

---

## 2. Ficha 360° del Apicultor (Radiografía Técnica y Operaciones)

Al seleccionar un apicultor del directorio o de Pareto, se abre su ficha detallada estructurada en dos columnas:

### Columna Izquierda: Ficha de Perfil y Estadísticas
1. **Perfil del Apicultor**: Tarjeta compacta (sin avatar ni email mock) que despliega:
   * Nombre del Apicultor / Razón Social.
   * Localidad y Provincia (icono `location_on`).
   * Teléfono (icono `phone`).
   * CUIT (icono `badge`).
   * DNI (icono `fingerprint`).
   * RENAPA (icono `hive`).
2. **Aporte al Volumen (Pareto 80/20)**: Tarjeta visual que grafica el aporte porcentual del productor y ofrece sugerencias comerciales según su clase (A o B).
*(Nota: Se eliminó la antigua tarjeta global de Clasificación de Acopio en esta columna para evitar redundancias globales, moviéndose al detalle individual por Romaneo).*

### Columna Derecha: Historial y Movimientos
Navegación por pestañas (Tabs):
1. **Historial de Romaneos (Entregas)**:
   * Muestra la tabla principal con las entregas de miel físicas: Fecha, Operación / Detalle (Romaneo), Documento, Físico (kilos y tambores), Analítica Promedio (Color, Humedad, HMF, Antibiótico).
   * **Inline Row Expander**: Al hacer clic en una fila, se despliega una subtabla con el desglose tambor por tambor (nro tambor, barras EAN, lote, bruto, tara, neto, color, humedad, HMF, antibiótico).
   * **Estadísticas de Romaneo**: Debajo de la subtabla se visualizan las cantidades analíticas de ese romaneo específico:
     * *Clara/Oscura* (Color: Pfund < 50mm es Clara).
     * *Altos/Petisos* (Peso: Bruto >= 331kg es Alto).
   * **Imprimir Romaneo PDF**: Botón que genera una hoja A4 lista para impresión con el detalle del romaneo de Geomiel.
2. **Control de Envases**: Detalle cronológico de préstamos y devoluciones de tambores vacíos con el cálculo del Saldo Neto en Campo.
3. **Cuenta Corriente**: Detalle financiero doble en ARS y USD. Integra de forma unificada (Opción A) el precio de referencia de miel y los kilos equivalentes (anteriormente en el panel inferior eliminado) como columnas directas (`Precio Ref. Miel` y `Miel Equiv.`) en el ledger.

---

## 3. Modales Operativos Unificados

Se cuenta con tres modales consolidados de alta densidad:

1. **`+ Registrar Recolección`** (Ingresos):
   * Permite seleccionar Miel (TCM), Opérculo, o Cera de Recupero. Para Miel, permite cargar un Romaneo con su listado de tambores y descuenta de forma automática el saldo de envases en campo.
2. **`- Registrar Distribución`** (Egresos y Préstamos):
   * Permite registrar entregas de Tambores Vacíos, Azúcar, o Cera Estampada.
   * **Optimización A4**: Márgenes y paddings compactos para que todo el formulario quepa perfectamente en una sola hoja/pantalla vertical sin desborde del botón "Confirmar Distribución".
3. **`$ Registrar Transacción`** (Operaciones Económicas):
   * Renombrado de "Cuenta Corriente" para enfatizar que solo procesa transacciones financieras (se removió "Retiro de Insumo").
   * **Tipo de Operación**:
     * *Anticipo de Fondos*:
       * Si es **USD**: Pide tasa de interés mensual (en %) y oculta el precio de referencia.
       * Si es **ARS**: Pide el precio de referencia de la miel (pesos) y oculta el interés.
     * *Servicio de Trazabilidad*: Operación exclusiva en ARS. Permite seleccionar:
       * **Contado**: Genera un DEBE y un HABER por montos idénticos para saldar el movimiento instantáneamente (deuda neta 0).
       * **A Cuenta**: Registra la deuda en el DEBE.
     * *Cargo/Venta de Envases vacíos*, *Fijación de Precio / Liquidación*, *Saldo Inicial*, *Ajuste Técnico*.

---

## 4. Estilos y Tokens de Diseño (Vanilla CSS)

```css
/* Paleta de Colores y Layout de Referencia */
:root {
  --bg-app: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-sidebar: #FFFFFF;
  --border-color: #E2E8F0;
  
  --primary: #85E344;          /* Verde Lima para elementos activos */
  --primary-dark: #64B82A;
  --secondary: #054C34;        /* Verde Pino para balances y marca */
  --secondary-light: #D1FAE5;
  --amber: #D97706;            /* Honey Amber para miel y detalles analíticos */
  --amber-light: #FEF3C7;
  --danger: #EF4444;           /* Rojo para deudas y alertas críticas */
  --danger-light: #FEE2E2;
  
  --text-title: #0F172A;
  --text-body: #334155;
  --text-secondary: #64748B;
  
  --radius-premium: 16px;
  --shadow-card: 0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
}

/* Evitar envoltura de unidades técnicas */
.nowrap-unit {
  white-space: nowrap;
}

/* Estilo para filas clickeables y expandidas */
tr.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
tr.clickable-row:hover {
  background-color: #F8FAFC;
}
tr.expanded-row {
  background-color: #F8FAFC;
}
.expanded-detail-container {
  padding: 16px;
  background-color: #FFFFFF;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin: 8px 0;
}
```
