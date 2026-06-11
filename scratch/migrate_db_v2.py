import pg8000.dbapi

password = "8ObWJYQsXru98ur2"
print("Connecting to Supabase PostgreSQL...")

sql_statements = [
    # 1. Alter public.ficha_control_envases
    """
    ALTER TABLE public.ficha_control_envases 
    ADD COLUMN IF NOT EXISTS producto varchar(50) DEFAULT 'TRR',
    ADD COLUMN IF NOT EXISTS remito varchar(50),
    ADD COLUMN IF NOT EXISTS nro_viaje varchar(50),
    ADD COLUMN IF NOT EXISTS chofer text;
    """,
    # 2. Alter public.ficha_control_operculo
    """
    ALTER TABLE public.ficha_control_operculo
    ADD COLUMN IF NOT EXISTS nro_viaje varchar(50),
    ADD COLUMN IF NOT EXISTS chofer text;
    """,
    # 3. Recreate public.obtener_saldo_envases_campo(uuid)
    """
    create or replace function public.obtener_saldo_envases_campo(apicultor_uuid uuid)
    returns integer as $$
    declare
        prestados integer := 0;
        devueltos integer := 0;
    begin
        select coalesce(sum(cantidad), 0) into prestados
        from public.ficha_control_envases
        where apicultor_id = apicultor_uuid 
          and tipo_movimiento = 'PRESTAMO'
          and coalesce(producto, '') <> 'TCM';

        select coalesce(sum(cantidad), 0) into devueltos
        from public.ficha_control_envases
        where apicultor_id = apicultor_uuid 
          and tipo_movimiento = 'DEVOLUCION'
          and coalesce(producto, '') <> 'TCM';

        return prestados - devueltos;
    end;
    $$ language plpgsql;
    """
]

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
    
    for stmt in sql_statements:
        print("Running SQL statement...")
        cursor.execute(stmt)
        
    conn.commit()
    conn.close()
    print("Migration V2 completed successfully!")
except Exception as e:
    print("Error:", e)
