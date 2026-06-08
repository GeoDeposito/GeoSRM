import sys
import subprocess
import os

# Ensure pg8000 is installed
try:
    import pg8000
except ImportError:
    print("Installing pg8000 database client...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pg8000"])
        import pg8000
    except Exception as e:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pg8000", "--user"])
        import pg8000

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
    print("Connected successfully to Supabase!")
    
    print("Reading ruiz_seed.sql...")
    sql_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\ruiz_seed.sql"
        
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
        
    print("Executing SQL script...")
    try:
        cursor.execute(sql_content)
        executed_count = 1
    except Exception as query_error:
        print("[ERROR] Error executing SQL script:")
        print(query_error)
        raise query_error
        
    conn.commit()
    print("Execution successful!")
    print("All tables and data for Ruiz Ruben Oscar & Products have been seeded in Supabase!")

    
except Exception as e:
    print("\nError connecting or executing SQL:")
    try:
        print(str(e))
    except Exception:
        print(repr(e))
finally:
    if 'conn' in locals():
        conn.close()

