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

    # Add columns to public.apicultores
    alter_query = """
    ALTER TABLE public.apicultores 
    ADD COLUMN IF NOT EXISTS etapa text DEFAULT 'ACTIVO' CHECK (etapa IN ('PROSPECTO', 'CONTACTADO', 'NEGOCIANDO', 'ACTIVO')),
    ADD COLUMN IF NOT EXISTS tag text DEFAULT 'PRODUCTOR',
    ADD COLUMN IF NOT EXISTS notas_onboarding text;
    """
    cursor.execute(alter_query)
    print("Columns added successfully (or already existed)!")

    # Let's verify by fetching the updated columns
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'apicultores';")
    rows = cursor.fetchall()
    print("\nUpdated columns in apicultores table:")
    for r in rows:
        print(f"{r[0]}: {r[1]}")

    conn.commit()
    conn.close()
    print("\nMigration commit completed successfully!")

except Exception as e:
    print("Error:", e)
