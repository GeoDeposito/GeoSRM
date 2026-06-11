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
    
    # Test case 1: Simulating Power Automate call (11 parameters, date as Excel serial number, no p_lote, no p_antibiotico)
    print("Testing Case 1: Simulating Power Automate HTTP request...")
    cursor.execute("""
        SELECT public.registrar_tcm_desde_sharepoint(
            p_cuit => '',
            p_apicultor_nombre => 'Rubino Juan Ignacio',
            p_fecha => '46129',
            p_romaneo => '99999',
            p_nro_tambor => '999999',
            p_barras_ean => '9999999999999',
            p_kilos_bruto => 300,
            p_tara => 16,
            p_color_pfund => 34,
            p_humedad => 17.5,
            p_hmf => 2.4
        );
    """)
    res1 = cursor.fetchone()
    print("Result Case 1:", res1[0])
    
    # Test case 2: Simulating Frontend call (13 parameters, date as ISO string, p_lote and p_antibiotico provided)
    print("\nTesting Case 2: Simulating Frontend RPC request...")
    cursor.execute("""
        SELECT public.registrar_tcm_desde_sharepoint(
            p_cuit => '20-12345678-9',
            p_apicultor_nombre => 'Rubino Juan Ignacio',
            p_fecha => '2026-06-10T12:00:00Z',
            p_romaneo => '99999',
            p_nro_tambor => '999999', -- updating same drum
            p_barras_ean => '9999999999999',
            p_kilos_bruto => 305,
            p_tara => 16,
            p_color_pfund => 35,
            p_humedad => 17.2,
            p_hmf => 2.5,
            p_lote => 12,
            p_antibiotico => 'NEGATIVO'
        );
    """)
    res2 = cursor.fetchone()
    print("Result Case 2:", res2[0])
    
    conn.rollback() # rollback changes to keep the DB clean
    print("\nTests completed and changes rolled back successfully!")
except Exception as e:
    print("Error during testing:", e)
finally:
    if 'conn' in locals():
        conn.close()
