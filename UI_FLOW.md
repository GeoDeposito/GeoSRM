# [UI_FLOW] - Estructura de Pantallas, Componentes y Diseño Frontend

Este documento define la arquitectura de la aplicación frontend de **APICULTOR SRM** construida en Google Project IDX.

---

## 1. Propuesta de Estructura de Carpetas (Google IDX - React + TS + Vite)

La estructura propuesta organiza la aplicación utilizando un patrón modular orientado a componentes, hooks reutilizables y servicios desacoplados para conectar con Supabase.

```text
apicultor_srm/
├── frontend/
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/              # Logotipos de la empresa e iconos decorativos
│   │   │   └── logo_apicultor.svg
│   │   ├── components/          # Componentes de UI comunes y reutilizables
│   │   │   ├── Button/          # Botones interactivos con micro-animaciones
│   │   │   ├── Card/            # Tarjetas contenedoras de UI (Bordes 16px, sombras suaves)
│   │   │   ├── Sidebar/         # Panel de navegación principal lateral con perfil de usuario
│   │   │   ├── StatCard/        # Tarjetas de estadísticas (Kpi) con círculos de progreso
│   │   │   └── Chart/           # Gráficos analíticos (Torta para cobros, Barras para entregas)
│   │   ├── context/             # Estados globales
│   │   │   ├── AuthContext.tsx  # Sesión y roles de Supabase Auth
│   │   │   └── SRMContext.tsx   # Estado global del apicultor seleccionado en sesión
│   │   ├── hooks/               # Custom hooks para aislar lógica del componente
│   │   │   ├── useSupabase.ts   # Conectividad base
│   │   │   └── useApicultores.ts# Operaciones CRUD y agregaciones de apicultores
│   │   ├── pages/               # Vistas de página principales
│   │   │   ├── Dashboard/       # Tablero general 360° (Entregas totales, Saldos en campo)
│   │   │   ├── Apicultores/     # Lista con filtros de búsqueda por CUIT, Nombre, Localidad
│   │   │   ├── FichaDetalle/    # Radiografía 360° del Apicultor (Ficha central)
│   │   │   │   ├── FichaGeneral.tsx   # Datos impositivos e información básica
│   │   │   │   ├── FichaEntregas.tsx  # Análisis analíticos de miel (Pfund, Humedad, HMF)
│   │   │   │   ├── FichaEnvases.tsx   # Préstamos/Devoluciones y "Saldo en Campo"
│   │   │   │   └── FichaCuentaCorriente.tsx # Debe/Haber/Saldos acumulados (ARS/USD)
│   │   │   └── Login/           # Acceso de usuarios del sistema
│   │   ├── services/            # Clientes API para Supabase
│   │   │   ├── supabaseClient.ts
│   │   │   └── srmService.ts    # Métodos de negocio específicos
│   │   ├── styles/              # Sistema de diseño con variables CSS nativas
│   │   │   ├── variables.css    # Paleta de colores Premium Light, tipografía y sombras
│   │   │   └── index.css        # Reset global y estilos generales
│   │   ├── types/               # Tipados TypeScript
│   │   │   └── srm.types.ts     # Interfaces de Apicultores, Entregas, Envases y CuentaCorriente
│   │   ├── utils/               # Formateadores numéricos, de fecha e impositivos (CUIT)
│   │   │   └── formatters.ts
│   │   ├── App.tsx              # Configuración de Router y Layout global
│   │   └── main.tsx             # Punto de entrada de Vite
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
```

---

## 2. Paleta de Colores y Tokens Visuales (Inspiración Tablero "D. Córdoba")

El diseño de APICULTOR SRM adopta un tema claro premium, de alto contraste visual y limpieza de cuadrícula, heredando la estructura exacta del tablero de control de referencia.

```css
/* frontend/src/styles/variables.css */
:root {
  /* Fondo general y contenedores */
  --bg-app: #F8FAFC;           /* Gris pizarra ultra-claro para fondo de pantalla */
  --bg-card: #FFFFFF;          /* Blanco puro para tarjetas principales */
  --bg-sidebar: #FFFFFF;       /* Lateral blanco estructurado */
  --border-color: #E2E8F0;     /* Gris suave para bordes sutiles */
  
  /* Colores de Marca y Acentos */
  --primary: #85E344;          /* Verde lima vibrante (indicadores activos, botones clave) */
  --primary-dark: #64B82A;
  
  --secondary: #054C34;        /* Verde pino profundo (bloques consolidados, balances positivos) */
  --secondary-light: #D1FAE5;  /* Fondo verde claro para badges */
  
  --amber: #D97706;            /* Ámbar de Miel (detalles analíticos, entregas de producto) */
  --amber-light: #FEF3C7;
  
  --danger: #EF4444;           /* Rojo coral (deudas financieras, alertas de Humedad > 18%) */
  --danger-light: #FEE2E2;
  
  /* Textos */
  --text-title: #0F172A;       /* Slate 900 para títulos jerárquicos */
  --text-body: #334155;        /* Slate 700 para lectura y tablas */
  --text-secondary: #64748B;   /* Slate 500 para descripciones y placeholders */
  
  /* Componentes del Tablero */
  --radius-premium: 16px;      /* Bordes curvos idénticos al tablero Córdoba */
  --shadow-subtle: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --shadow-card: 0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
}
```

---

## 3. Elementos Clave Replicados del Tablero de Referencia

### A. Estructura Lateral (Sidebar)
* **Logotipo superior**: Marca "APICULTOR SRM - ADMINISTRACIÓN".
* **Navegación contextual**: Enlace activo destacado con fondo verde lima (`--primary`) y texto oscuro. Botones para Dashboard, Apicultores, Entregas, Envases y Cuenta Corriente.
* **Badge de Alertas**: Un círculo rojo con el número de incidencias críticas (ej. lotes de miel con exceso de humedad o apicultores con saldo de tambores negativo).
* **Tarjeta de Usuario (Footer)**: Despliega la foto del operador, nombre ("Operador Apícola") y rol ("ADMINISTRADOR"). Incluye los accesos rápidos a "Cambiar Clave" y "Cerrar Sesión".

### B. Barra de Filtro de Fechas e Interacción
* **Selector Horizontal**: Botones individuales por día para filtrar rápidamente la visualización comercial o rango personalizado.
* **Botón de Reporte**: Botón "Imprimir Resumen" con icono de impresora que exporta un PDF limpio y formateado de la ficha actual.

### C. Tarjetas de Indicadores KPI (Circular Progress Badges)
* Tarjetas rectangulares con bordes curvos (`--radius-premium`), mostrando el total (ej. "Entregados", "Saldo en Campo", "Ingresos Brutos") y un círculo dinámico a la derecha que indica el porcentaje de cumplimiento (usando bordes SVG con `stroke-dasharray`).

### D. Gráficos y Desglose
* **Desglose analítico**: Sub-tarjetas con bordes de color en la parte superior para separar cobros por Efectivo, Transferencia, Cheque, etc.
* **Gráfico circular integrado**: Un gráfico de torta dinámico implementado mediante SVG o Recharts para visualizar las proporciones operacionales.
