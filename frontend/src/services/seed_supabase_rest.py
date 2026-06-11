import urllib.request
import json
import re
import os
import urllib.error

anon_key = "sb_publishable_bYlB4bsuJyv7nMOUXrsRew_ubUacX2Q"
base_url = "https://ajrfkkiuludrdexgprmb.supabase.co/rest/v1/"

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# 1. Parse data from ruizMockData.ts
ts_file_path = os.path.join(os.path.dirname(__file__), 'ruizMockData.ts')
with open(ts_file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def extract_json_var(var_name):
    pattern = rf"export const {var_name} = (\[.*?\]|\{{.*?\}});"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return None

entregas = extract_json_var("RUIZ_MOCK_ENTREGAS")
envases = extract_json_var("RUIZ_MOCK_ENVASES")
cc_entries = extract_json_var("RUIZ_MOCK_CUENTA_CORRIENTE")
operculo = extract_json_var("RUIZ_MOCK_OPERCULO")
profile = extract_json_var("RUIZ_PROFILE")
productos = extract_json_var("PRODUCTOS_MOCK")

RUIZ_PROFILE_ID = "e37fb194-9e25-5d90-b912-9925001072c0"

def rest_request(endpoint, data=None, method='POST'):
    url = f"{base_url}{endpoint}"
    payload = json.dumps(data).encode('utf-8') if data is not None else None
    
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status
    except urllib.error.HTTPError as e:
        print(f"Error on {method} {endpoint}: {e.code} - {e.reason}")
        print("Body:", e.read().decode('utf-8'))
        raise e

print("Starting Supabase Direct REST Seeding...")

# A. Clean up old records for Ruiz in child tables to avoid duplicates or conflicts
print("Cleaning up existing Ruiz data in Supabase...")

# Deleting tambores
# We need to delete tambores linked to Ruiz entregas
try:
    for ent in entregas:
        rest_request(f"ficha_entrega_tambores?entrega_id=eq.{ent['id']}", method='DELETE')
except Exception as e:
    print("Warning deleting tambores:", e)

# Deleting from other tables
tables_to_clean = [
    "ficha_entregas_miel",
    "ficha_control_envases",
    "ficha_cuenta_corriente",
    "ficha_control_operculo",
    "apicultores"
]

for table in tables_to_clean:
    try:
        col = "id" if table == "apicultores" else "apicultor_id"
        rest_request(f"{table}?{col}=eq.{RUIZ_PROFILE_ID}", method='DELETE')
    except Exception as e:
        print(f"Warning deleting from {table}:", e)

# B. Insert Products
print("Seeding products...")
try:
    prod_headers = headers.copy()
    prod_headers["Prefer"] = "resolution=merge-duplicates"
    
    req = urllib.request.Request(f"{base_url}productos", data=json.dumps(productos).encode('utf-8'), headers=prod_headers, method='POST')
    with urllib.request.urlopen(req) as response:
        print("Products seeded successfully!")
except Exception as e:
    print("Warning seeding products table (might not exist yet):", e)

# C. Insert Ruiz Rubén Oscar profile
print("Inserting Ruiz profile...")
rest_request("apicultores", profile, method='POST')

# D. Insert Ruiz transactions
print("Inserting control_envases...")
rest_request("ficha_control_envases", envases, method='POST')

print("Inserting cuenta_corriente...")
rest_request("ficha_cuenta_corriente", cc_entries, method='POST')

print("Inserting control_operculo...")
for op in operculo:
    if "updated_at" in op:
        del op["updated_at"]
rest_request("ficha_control_operculo", operculo, method='POST')

print("Inserting entregas_miel...")
# We must prepare entregas without nested tambores for insertion into ficha_entregas_miel
entregas_payload = []
tambores_payload = []
for ent in entregas:
    ent_copy = ent.copy()
    if "tambores" in ent_copy:
        del ent_copy["tambores"]
    # If updated_at is missing in DB schema, we can strip it to be safe
    # Let's check and strip if needed (we'll do it to be safe)
    if "updated_at" in ent_copy:
        del ent_copy["updated_at"]
    entregas_payload.append(ent_copy)
    
    if "tambores" in ent:
        for t in ent["tambores"]:
            t_copy = t.copy()
            if "kilos_neto" in t_copy:
                del t_copy["kilos_neto"]
            if "antibiotico" not in t_copy:
                t_copy["antibiotico"] = "NEGATIVO"
            if "updated_at" in t_copy:
                del t_copy["updated_at"]
            tambores_payload.append(t_copy)

# Insert entregas
rest_request("ficha_entregas_miel", entregas_payload, method='POST')


# Insert tambores
print("Inserting entrega_tambores...")
rest_request("ficha_entrega_tambores", tambores_payload, method='POST')

print("Seeding completed successfully directly to Supabase REST API!")
