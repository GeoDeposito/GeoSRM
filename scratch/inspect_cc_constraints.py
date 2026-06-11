import psycopg2

conn_str = "postgresql://postgres.ajrfkkiuludrdexgprmb:8ObWJYQsXru98ur2@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(conn_str)
    cursor = conn.cursor()
    
    # Query constraints
    cursor.execute("""
        SELECT conname, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'public.ficha_cuenta_corriente'::regclass;
    """)
    constraints = cursor.fetchall()
    print("CONSTRAINTS ON ficha_cuenta_corriente:")
    for con in constraints:
        print(f"  - {con[0]}: {con[1]}")
        
    # Query check constraints in detail
    cursor.execute("""
        SELECT cc.conname, cc.consrc
        FROM pg_constraint cc
        JOIN pg_class c ON c.oid = cc.conrelid
        WHERE c.relname = 'ficha_cuenta_corriente';
    """)
    checks = cursor.fetchall()
    print("\nCHECK SOURCE:")
    for chk in checks:
        print(f"  - {chk[0]}: {chk[1]}")

    # Query columns and their types
    cursor.execute("""
        SELECT column_name, udt_name
        FROM information_schema.columns 
        WHERE table_name = 'ficha_cuenta_corriente';
    """)
    cols = cursor.fetchall()
    print("\nCOLUMNS AND UDT:")
    for col in cols:
        print(f"  - {col[0]}: {col[1]}")

    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
