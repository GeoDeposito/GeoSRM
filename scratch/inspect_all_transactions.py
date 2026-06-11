import pg8000.dbapi

password = "8ObWJYQsXru98ur2"
conn = pg8000.dbapi.connect(
    user="postgres.ajrfkkiuludrdexgprmb",
    password=password,
    host="aws-1-us-east-1.pooler.supabase.com",
    port=6543,
    database="postgres"
)
cursor = conn.cursor()

tables = [
    'ficha_entregas_miel',
    'ficha_control_envases',
    'ficha_cuenta_corriente',
    'ficha_control_operculo'
]

print("Scanning all transactions in database...")
for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM public.{table};")
    cnt = cursor.fetchone()[0]
    print(f"Table {table}: {cnt} records")

conn.close()
