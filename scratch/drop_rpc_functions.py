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
    
    # Query pg_proc to find all signatures of registrar_tcm_desde_sharepoint
    cursor.execute("""
        SELECT oid::regprocedure::text
        FROM pg_proc
        WHERE proname = 'registrar_tcm_desde_sharepoint';
    """)
    funcs = cursor.fetchall()
    print("Found existing functions:", funcs)
    
    for (func_sig,) in funcs:
        drop_query = f"DROP FUNCTION {func_sig};"
        print(f"Executing: {drop_query}")
        cursor.execute(drop_query)
        
    conn.commit()
    print("All old function signatures dropped successfully!")
except Exception as e:
    print("Error dropping old functions:", e)
finally:
    if 'conn' in locals():
        conn.close()
