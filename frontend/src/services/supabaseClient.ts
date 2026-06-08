/* src/services/supabaseClient.ts */
import { createClient } from '@supabase/supabase-js';

// Intentar leer las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Si faltan las credenciales, arrojamos una advertencia pero no rompemos la inicialización
// para permitir un modo de simulación o demostración visual (mock mode)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase: Falta configurar VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env. ' +
    'La aplicación iniciará en MOCK MODE (datos simulados localmente).'
  );
}

export const isMockMode = !supabaseUrl || !supabaseAnonKey;

// Creamos el cliente de Supabase (o un proxy nulo si no hay configuración)
export const supabase = !isMockMode 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
