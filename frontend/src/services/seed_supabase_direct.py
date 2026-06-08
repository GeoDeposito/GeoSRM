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
        print("Failed to install pg8000 via pip. Trying to install using python -m pip:")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pg8000", "--user"])
        import pg8000

import getpass

# Ask user for password securely
print("================================================================")
print("  Supabase Direct Database Seeder")
print("================================================================")
try:
    password = getpass.getpass("Por favor, ingresa la contraseña de tu base de datos de Supabase: ")
except Exception:
    password = input("Por favor, ingresa la contraseña de tu base de datos de Supabase (se mostrará en pantalla): ")

print("\nConnecting to Supabase PostgreSQL...")
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
    sql_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "ruiz_seed.sql")
    if not os.path.exists(sql_path):
        # Fallback to absolute workspace path
        sql_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\ruiz_seed.sql"
        
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
        
    # Split queries by semicolon to execute them one by one
    # All statements in ruiz_seed.sql end with a semicolon followed by a newline.
    queries = sql_content.split(";\n")
    
    print("Executing queries...")
    executed_count = 0
    for query in queries:
        query_strip = query.strip()
        if not query_strip or query_strip.startswith("--"):
            continue
        cursor.execute(query_strip)
        executed_count += 1
        
    conn.commit()
    print(f"\nExecution successful! Executed {executed_count} SQL statements.")
    print("All tables and data for Ruiz Ruben Oscar & Products have been seeded in Supabase!")
    
except Exception as e:
    print("\n❌ Error connecting or executing SQL:")
    print(e)
finally:
    if 'conn' in locals():
        conn.close()
print("================================================================")
