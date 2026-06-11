import psycopg2

conn_str = "postgresql://postgres.ajrfkkiuludrdexgprmb:8ObWJYQsXru98ur2@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

sql_alter_table = """
ALTER TABLE public.ficha_cuenta_corriente 
ADD COLUMN IF NOT EXISTS tcp numeric(12, 2);
"""

try:
    conn = psycopg2.connect(conn_str)
    cursor = conn.cursor()
    
    print("Altering table public.ficha_cuenta_corriente to add column 'tcp'...")
    cursor.execute(sql_alter_table)
    conn.commit()
    print("Column 'tcp' added or already exists successfully!")
    
    # Verify the table schema by querying columns
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ficha_cuenta_corriente';
    """)
    columns = cursor.fetchall()
    print("\nColumns in ficha_cuenta_corriente:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]}")
        
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
