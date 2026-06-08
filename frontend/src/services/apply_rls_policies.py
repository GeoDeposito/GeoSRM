import pg8000

password = "8ObWJYQsXru98ur2"

sql = """
-- Habilitar lectura pública para todas las tablas
DROP POLICY IF EXISTS "Permitir lectura publica de tambores" ON public.ficha_entrega_tambores;
CREATE POLICY "Permitir lectura publica de tambores" ON public.ficha_entrega_tambores FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de operculo" ON public.ficha_control_operculo;
CREATE POLICY "Permitir lectura publica de operculo" ON public.ficha_control_operculo FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de entregas" ON public.ficha_entregas_miel;
CREATE POLICY "Permitir lectura publica de entregas" ON public.ficha_entregas_miel FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de envases" ON public.ficha_control_envases;
CREATE POLICY "Permitir lectura publica de envases" ON public.ficha_control_envases FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de cc" ON public.ficha_cuenta_corriente;
CREATE POLICY "Permitir lectura publica de cc" ON public.ficha_cuenta_corriente FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de apicultores" ON public.apicultores;
CREATE POLICY "Permitir lectura publica de apicultores" ON public.apicultores FOR SELECT TO anon, authenticated USING (true);
"""

print("Connecting to Supabase to apply RLS SELECT policies...")
try:
    conn = pg8000.dbapi.connect(
        user="postgres.ajrfkkiuludrdexgprmb",
        password=password,
        host="aws-1-us-east-1.pooler.supabase.com",
        port=6543,
        database="postgres"
    )
    cursor = conn.cursor()
    print("Connected successfully!")
    
    cursor.execute(sql)
    conn.commit()
    print("RLS read policies applied successfully to all tables!")
    
except Exception as e:
    print("Error applying policies:", e)
finally:
    if 'conn' in locals():
        conn.close()
