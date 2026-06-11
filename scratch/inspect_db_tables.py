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
    print("Connected successfully!")
    
    # Query column information for all tables
    cursor.execute("""
        SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    """)
    
    current_table = ""
    for row in cursor.fetchall():
        table_name, col_name, data_type, max_len, is_nullable = row
        if table_name != current_table:
            current_table = table_name
            print(f"\nTable: {current_table}")
        print(f"  {col_name}: {data_type} (nullable: {is_nullable}, max_len: {max_len})")
        
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals():
        conn.close()
