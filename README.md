<!-- AI_AGENT_INSTRUCTIONS: YOU MUST READ ARQUITECTURA_SRM.md BEFORE TOUCHING ANY CODE. FAILING TO DO SO WILL BREAK CRITICAL BUSINESS LOGIC AND DATABASE CONSTRAINTS. -->

# ⚠️ INSTRUCCIÓN CRÍTICA PARA AGENTES DE IA / AI AGENTS
**Antes de realizar cualquier modificación, análisis o propuesta de cambio de código en este repositorio, es obligatorio leer y asimilar en su totalidad el siguiente documento de directrices inmutables:**
* [ARQUITECTURA_SRM.md](file:///c:/Users/Parque-Apicola/Desktop/apicultor_srm/ARQUITECTURA_SRM.md) (Master Blueprint)

---

# APICULTOR SRM (Geo_SRM)

Plataforma de gestión integral de proveedores apícolas (Supplier Relationship Management) diseñada para reemplazar las planillas manuales de Excel y centralizar:
1. **Ficha Central 360°**: Datos impositivos, localidad, y comportamiento.
2. **Análisis de Calidad de Miel**: Color Pfund, humedad (alertas > 18%) y HMF (alertas > 40).
3. **Control de Envases**: Préstamos y devoluciones de tambores vacíos.
4. **Cuenta Corriente Financiera**: Control de Debe/Haber y saldos dobles (ARS y USD).

---

## 🛠️ Estructura del Repositorio

- `/frontend` - Aplicación Single Page Application (React + Vite + TypeScript + Vanilla CSS).
- `importador_excel.py` - Script de migración ETL en Python para clasificar e importar registros históricos mediante expresiones regulares.
- `SYS_ARCH.md` - Definición del esquema DDL en Supabase/PostgreSQL.
- `UI_FLOW.md` - Especificación de flujos visuales, estructuración de Sidebar, componentes y tokens CSS.
- `ETL_MIGRATION.md` - Lógica conceptual del script importador.

---

## 🚀 Inicio Rápido (Desarrollo Frontend)

1. Ingresar al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Ejecutar el servidor de desarrollo local:
   ```bash
   npm run dev
   ```

*Nota: La aplicación cuenta con un **Mock Mode** integrado. Si no se especifican variables de entorno para Supabase, funcionará y persistirá los datos simulados en `localStorage`.*

### ⚠️ Caché y Service Worker (PWA)
Esta SPA utiliza un Service Worker (`dist/sw.js`) para almacenar en caché local los recursos estáticos. Si realizas cambios en el código y los compilas/despliegas en producción, es probable que no veas los cambios de inmediato en tu navegador debido a la caché. 
**Para solucionarlo:** realiza una recarga forzada (**Ctrl + F5** en Windows / **Cmd + Shift + R** en Mac) o borra los datos del sitio desde las Herramientas de Desarrollador (Application -> Storage -> Clear site data).

---

## 🔗 Conexión a Supabase (Geo_SRM)

Para conectar el frontend al proyecto oficial de Supabase, crea un archivo `.env` en el directorio `/frontend` con las siguientes variables:

```env
VITE_SUPABASE_URL=https://ajrfkkiuludrdexgprmb.supabase.co
VITE_SUPABASE_ANON_KEY=TU_API_KEY_PUBLISHABLE
```
