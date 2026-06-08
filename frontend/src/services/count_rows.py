import pg8000

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
    
    tables = [
        "productos",
        "apicultores",
        "ficha_entregas_miel",
        "ficha_entrega_tambores",
        "ficha_control_envases",
        "ficha_cuenta_corriente",
        "ficha_control_operculo"
    ]
    
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM public.{table};")
            count = cursor.fetchone()[0]
            print(f"Table '{table}': {count} rows")
        except Exception as e:
            print(f"Table '{table}' Error: {e}")
            
except Exception as e:
    print("Connection Error:", e)
finally:
    if 'conn' in locals():
        conn.close()
