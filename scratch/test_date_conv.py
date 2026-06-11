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
    
    cursor.execute("""
        SELECT 
            '1899-12-30'::timestamp + (46129::numeric * interval '1 day') as parsed_excel_date,
            '2026-06-10T12:00:00Z'::timestamp with time zone as parsed_iso_date;
    """)
    res = cursor.fetchone()
    print("Parsed Excel Date:", res[0])
    print("Parsed ISO Date:", res[1])
    
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals():
        conn.close()
