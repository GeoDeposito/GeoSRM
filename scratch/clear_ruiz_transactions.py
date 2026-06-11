import pg8000.dbapi

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
    print("Connected successfully!")

    ruiz_id = 'e37fb194-9e25-5d90-b912-9925001072c0'

    # Delete related records
    print("Deleting from ficha_control_envases...")
    cursor.execute("DELETE FROM public.ficha_control_envases WHERE apicultor_id = %s;", [ruiz_id])
    print(f"Deleted {cursor.rowcount} records.")

    print("Deleting from ficha_cuenta_corriente...")
    cursor.execute("DELETE FROM public.ficha_cuenta_corriente WHERE apicultor_id = %s;", [ruiz_id])
    print(f"Deleted {cursor.rowcount} records.")

    print("Deleting from ficha_control_operculo...")
    cursor.execute("DELETE FROM public.ficha_control_operculo WHERE apicultor_id = %s;", [ruiz_id])
    print(f"Deleted {cursor.rowcount} records.")

    print("Deleting from ficha_entrega_tambores...")
    cursor.execute("""
        DELETE FROM public.ficha_entrega_tambores 
        WHERE entrega_id IN (SELECT id FROM public.ficha_entregas_miel WHERE apicultor_id = %s);
    """, [ruiz_id])
    print(f"Deleted {cursor.rowcount} records.")

    print("Deleting from ficha_entregas_miel...")
    cursor.execute("DELETE FROM public.ficha_entregas_miel WHERE apicultor_id = %s;", [ruiz_id])
    print(f"Deleted {cursor.rowcount} records.")

    # Commit changes
    conn.commit()
    print("\nAll transaction movements for Ruiz, Ruben Oscar have been successfully deleted!")

    conn.close()
except Exception as e:
    print(f"Error during deletion: {e}")
