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

ruiz_id = 'e37fb194-9e25-5d90-b912-9925001072c0'

tables = [
    'ficha_entregas_miel',
    'ficha_control_envases',
    'ficha_cuenta_corriente',
    'ficha_control_operculo'
]

print("Scanning transactions for Ruiz...")
for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM public.{table} WHERE apicultor_id = %s;", [ruiz_id])
    cnt = cursor.fetchone()[0]
    print(f"Table {table}: {cnt} records")

# Also count related drums (tambores)
cursor.execute("""
    SELECT COUNT(*) FROM public.ficha_entrega_tambores 
    WHERE entrega_id IN (SELECT id FROM public.ficha_entregas_miel WHERE apicultor_id = %s);
""", [ruiz_id])
drums_cnt = cursor.fetchone()[0]
print(f"Table ficha_entrega_tambores (via entregas): {drums_cnt} records")

conn.close()
