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
3. **Clasificación de Acopio (Tambores)**: Nueva tarjeta analítica que totaliza las entregas físicas de tambores del apicultor agrupadas por:
   * *Color*: Miel Clara ($<50\text{ mm Pfund}$) vs. Miel Oscura ($\ge50\text{ mm Pfund}$).
   * *Tamaño*: Altos ($\ge331\text{ kg}$) vs. Petisos ($\le330\text{ kg}$).

### Columna Derecha: `📊 Detalle de Operaciones y Ficha Técnica`
Navegación por pestañas (Tabs), por defecto en `'entregas'`:
1. **Historial de Romaneos (Entregas)**:
   * Muestra la tabla principal con las transacciones comerciales: Fecha, Operación / Detalle, Documento (extrae números de remitos/facturas en badges estilizados), y montos/cantidades.
   * **Inline Row Expander**: Al hacer clic en una fila del tipo **"Entrega de Miel"**, esta se expande horizontalmente para desplegar una subtabla con el detalle técnico de cada tambor individual:
     * Columnas: ID GEO (Nro Tambor), SENASA (Barras EAN), Lote, Peso Bruto, Tara, Peso Neto, Humedad, Color (mm), HMF, Antibiótico.
     * Muestra debajo de la subtabla las estadísticas específicas de ese romaneo (totales Clara/Oscura y Altos/Petisos del lote).
2. **Control de Envases**: Detalle cronológico de préstamos y devoluciones de tambores vacíos con el cálculo del Saldo Neto en Campo.
3. **Cuenta Corriente**: Detalle financiero doble en pesos (ARS) y dólares (USD) con equivalencia en kilos de miel para el balance comercial.

---

## 3. Modales Operativos Unificados

Se reemplazó el registro fragmentado por dos formularios emergentes consolidados:

1. **`+ Registrar Recolección`** (Ingresos):
   * Permite seleccionar el tipo de producto a recolectar:
     * **Miel (TCM)**: Registra el romaneo, fecha y el listado de tambores individuales (Pesos bruto/tara, color, humedad, HMF, antibiótico). **Aplica un descuento automático** de la cantidad de tambores entregados del saldo neto en campo del apicultor.
     * **Opérculo**: Registra kilos brutos y rendimiento de cera estimado.
     * **Cera de Recupero**: Ingreso directo de cera.
2. **`- Registrar Distribución`** (Egresos y Préstamos):
   * Permite seleccionar el tipo de insumo a distribuir/entregar:
     * **Tambores Vacíos**: Registra préstamo de envases (incrementando el saldo en campo).
     * **Azúcar**: Registra entrega de bolsas de azúcar como insumo alimenticio (debitando de la cuenta corriente en ARS/USD).
     * **Cera Estampada**: Registra entrega de cera estampada (debitando de la cuenta corriente).

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
