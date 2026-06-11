import pg8000.dbapi

password = "8ObWJYQsXru98ur2"
print("Connecting to Supabase PostgreSQL...")

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

    # 1. Add interes_mensual column
    print("Altering public.ficha_cuenta_corriente to add column 'interes_mensual'...")
    cursor.execute("""
        ALTER TABLE public.ficha_cuenta_corriente 
        ADD COLUMN IF NOT EXISTS interes_mensual numeric(6, 2) NULL;
    """)
    print("Column 'interes_mensual' added (or already existed)!")

    # 2. Update CHECK constraint for tipo_transaccion
    print("Updating CHECK constraint on 'tipo_transaccion'...")
    cursor.execute("""
        ALTER TABLE public.ficha_cuenta_corriente 
        DROP CONSTRAINT IF EXISTS ficha_cuenta_corriente_tipo_transaccion_check;
    """)
    cursor.execute("""
        ALTER TABLE public.ficha_cuenta_corriente 
        ADD CONSTRAINT ficha_cuenta_corriente_tipo_transaccion_check 
        CHECK (tipo_transaccion = ANY (ARRAY[
            'ANTICIPO_CASH'::text, 
            'RETIRO_INSUMO'::text, 
            'CARGO_ENVASE'::text, 
            'VENTA_LIQUIDACION'::text, 
            'SALDO_INICIAL'::text, 
            'AJUSTE'::text, 
            'SERVICIO_TRAZABILIDAD'::text
        ]));
    """)
    print("CHECK constraint updated successfully!")

    conn.commit()

    # 3. Verify columns and constraints
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ficha_cuenta_corriente';
    """)
    rows = cursor.fetchall()
    print("\nUpdated columns in ficha_cuenta_corriente table:")
    for r in rows:
        print(f"  - {r[0]}: {r[1]}")

    cursor.execute("""
        SELECT conname, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'public.ficha_cuenta_corriente'::regclass AND conname = 'ficha_cuenta_corriente_tipo_transaccion_check';
    """)
    con = cursor.fetchone()
    if con:
        print(f"\nConstraint '{con[0]}' details:")
        print(f"  {con[1]}")

    conn.close()
    print("\nMigration completed successfully!")

except Exception as e:
    print("Error during migration:", e)
