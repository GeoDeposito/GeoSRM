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

    # List all Ruiz apicultores
    cursor.execute("SELECT id, nombre, cuit, localidad, cod_api, renapa, telefono FROM public.apicultores WHERE nombre ILIKE '%ruiz%' OR cuit IN ('20-17672615-7', '20-16194725-9');")
    rows = cursor.fetchall()
    print(f"\nFound {len(rows)} Ruiz records in database:")
    for r in rows:
        print(f"ID: {r[0]} | Nombre: {r[1]} | CUIT: {r[2]} | Localidad: {r[3]} | Code: {r[4]} | RENAPA: {r[5]} | Tel: {r[6]}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
