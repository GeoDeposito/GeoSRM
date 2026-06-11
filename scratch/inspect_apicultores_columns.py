import pg8000.dbapi

password = "8ObWJYQsXru98ur2"
try:
    conn = pg8000.dbapi.connect(
        user="postgres.ajrfkkiuludrdexgprmb",
        password=password,
        host="aws-1-us-east-1.pooler.supabase.com",
        port=6543,
        database="postgres"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'apicultores';")
    rows = cursor.fetchall()
    print("Columns in apicultores table:")
    for r in rows:
        print(f"{r[0]}: {r[1]}")
    conn.close()
except Exception as e:
    print("Error:", e)
