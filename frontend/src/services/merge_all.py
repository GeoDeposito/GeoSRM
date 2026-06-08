import pandas as pd
import json
import uuid
import os

file_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\Ficha RUIZ RUBEN OSCAR (G.PICO).xlsx"
products_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\Tabla Productos.xlsx"

# Deterministic UUID generator
def get_uuid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_OID, str(name)))

# 1. Parse Products
df_prod = pd.read_excel(products_path)
products_list = []
for idx, row in df_prod.iterrows():
    products_list.append({
        "codigo": int(row['CODIGO']),
        "producto": str(row['PRODUCTO']).strip(),
        "descripcion": str(row['DESCRIPCION']).strip(),
        "unidad": str(row['UNIDAD']).strip(),
        "categoria": str(row['CATEGORIA']).strip()
    })

# 2. Parse Ruiz transactions
with open('ruiz_seed_data.json', 'r', encoding='utf-8') as f:
    ruiz_data = json.load(f)

# 3. Parse drum details
def clean_num(val):
    if pd.isna(val): return 0
    try: return float(val)
    except: return 0

# Parse 29 drums (from 20 y 3 Tamb sheet)
df_23t = pd.read_excel(file_path, sheet_name='20 y 3 Tamb')
drums_23t = []
for idx, row in df_23t.iterrows():
    nro = row.iloc[2]
    if pd.isna(nro) or str(nro).strip() == "" or str(nro).startswith("RUIZ") or row.iloc[0] == "ID":
        continue
    drums_23t.append({
        "nro_tambor": str(row.iloc[2]).strip(),
        "lote": int(clean_num(row.iloc[1])) or 13006,
        "kilos_bruto": clean_num(row.iloc[3]),
        "tara": clean_num(row.iloc[4]),
        "kilos_neto": clean_num(row.iloc[5]),
        "color_pfund": clean_num(row.iloc[6]),
        "humedad": clean_num(row.iloc[7]),
        "hmf": clean_num(row.iloc[9]) if pd.notna(row.iloc[9]) else 0,
        "barras_ean": str(row.iloc[10]).strip() if pd.notna(row.iloc[10]) else ""
    })

# Parse 10 drums (from 10 T sheet)
df_10t = pd.read_excel(file_path, sheet_name='10 T', skiprows=1)
drums_10t = []
for idx, row in df_10t.iterrows():
    nro = row.iloc[4] # ID Geomiel
    if pd.isna(nro) or str(nro).strip() == "" or row.iloc[0] == "#" or pd.isna(row.iloc[0]):
        continue
    drums_10t.append({
        "nro_tambor": str(row.iloc[4]).strip(),
        "lote": 10308,
        "kilos_bruto": clean_num(row.iloc[6]),
        "tara": clean_num(row.iloc[7]),
        "kilos_neto": clean_num(row.iloc[8]),
        "color_pfund": clean_num(row.iloc[10]),
        "humedad": clean_num(row.iloc[11]),
        "hmf": clean_num(row.iloc[12]) if pd.notna(row.iloc[12]) else 0,
        "barras_ean": str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else ""
    })

# Parse 5 drums (from 5T 2022 sheet)
df_5t = pd.read_excel(file_path, sheet_name='5T 2022', skiprows=2)
drums_5t = []
for idx, row in df_5t.iterrows():
    nro = row.iloc[4] # ID Geomiel
    if pd.isna(nro) or pd.isna(row.iloc[0]):
        continue
    drums_5t.append({
        "nro_tambor": str(int(row.iloc[4])) if isinstance(row.iloc[4], (int, float)) else str(row.iloc[4]).strip(),
        "lote": int(clean_num(row.iloc[1])) or 12338,
        "kilos_bruto": clean_num(row.iloc[6]),
        "tara": clean_num(row.iloc[7]),
        "kilos_neto": clean_num(row.iloc[8]),
        "color_pfund": clean_num(row.iloc[10]),
        "humedad": clean_num(row.iloc[11]),
        "hmf": clean_num(row.iloc[12]) if pd.notna(row.iloc[12]) else 0,
        "barras_ean": str(int(row.iloc[5])) if isinstance(row.iloc[5], (int, float)) else str(row.iloc[5]).strip()
    })

# Convert Ruiz transaction IDs and apicultor_id to UUID
ruiz_profile_id = get_uuid("ruiz_profile")

for ent in ruiz_data["entregas"]:
    fecha = ent["fecha"]
    ent["original_id"] = ent["id"]
    ent["id"] = get_uuid(ent["id"])
    ent["apicultor_id"] = ruiz_profile_id
    
    # Match detailed drums to entregas
    if "2019-05" in fecha:
        ent["tambores"] = [{
            **d, 
            "id": get_uuid(f"t_ruiz_{i}"), 
            "entrega_id": ent["id"], 
            "created_at": fecha
        } for i, d in enumerate(drums_23t)]
        ent["kilos_neto"] = sum(d["kilos_neto"] for d in drums_23t)
        ent["cantidad_tambores"] = len(drums_23t)
    elif "2020-12" in fecha:
        ent["tambores"] = [{
            **d, 
            "id": get_uuid(f"t_ruiz_{i}"), 
            "entrega_id": ent["id"], 
            "created_at": fecha
        } for i, d in enumerate(drums_10t)]
        ent["kilos_neto"] = sum(d["kilos_neto"] for d in drums_10t)
        ent["cantidad_tambores"] = len(drums_10t)
    elif "2022-11" in fecha:
        ent["tambores"] = [{
            **d, 
            "id": get_uuid(f"t_ruiz_{i}"), 
            "entrega_id": ent["id"], 
            "created_at": fecha
        } for i, d in enumerate(drums_5t)]
        ent["kilos_neto"] = sum(d["kilos_neto"] for d in drums_5t)
        ent["cantidad_tambores"] = len(drums_5t)
    else:
        # Generate 1 default drum
        default_drum = {
            "id": get_uuid(f"t_ruiz_def_{ent['original_id']}"),
            "entrega_id": ent["id"],
            "nro_tambor": f"TAMB-{ent['original_id'][-4:]}",
            "barras_ean": "18-08046134-4",
            "lote": 12000,
            "kilos_bruto": ent["kilos_neto"] + 17,
            "tara": 17,
            "kilos_neto": ent["kilos_neto"],
            "color_pfund": ent["color_pfund"],
            "humedad": ent["humedad"],
            "hmf": ent["hmf"],
            "antibiotico": "NEGATIVO",
            "created_at": fecha
        }
        ent["tambores"] = [default_drum]

for env in ruiz_data["envases"]:
    env["id"] = get_uuid(env["id"])
    env["apicultor_id"] = ruiz_profile_id

for cc in ruiz_data["cc_entries"]:
    cc["id"] = get_uuid(cc["id"])
    cc["apicultor_id"] = ruiz_profile_id

for op in ruiz_data["operculo"]:
    op["id"] = get_uuid(op["id"])
    op["apicultor_id"] = ruiz_profile_id

# 4. Construct Ruiz Ruben Oscar Profile with UUID
ruiz_profile = {
    "id": ruiz_profile_id,
    "nombre": "Ruiz Ruben Oscar (G. Pico)",
    "cuit": "20-16194725-9",
    "localidad": "General Pico",
    "cod_api": "9191",
    "provincia": "La Pampa",
    "dni": "16194725",
    "renapa": "L-4291",
    "telefono": "02302-156389",
    "puntuacion": 4.9,
    "created_at": "2019-01-03T00:00:00Z",
    "updated_at": "2023-04-14T00:00:00Z",
}

# Output TS file content
ts_output = f"""/* src/services/ruizMockData.ts */
import type {{ Producto }} from '../types/srm.types';


export const PRODUCTOS_MOCK: Producto[] = {json.dumps(products_list, indent=2, ensure_ascii=False)};

export const RUIZ_MOCK_ENTREGAS = {json.dumps(ruiz_data["entregas"], indent=2, ensure_ascii=False)};

export const RUIZ_MOCK_ENVASES = {json.dumps(ruiz_data["envases"], indent=2, ensure_ascii=False)};

export const RUIZ_MOCK_CUENTA_CORRIENTE = {json.dumps(ruiz_data["cc_entries"], indent=2, ensure_ascii=False)};

export const RUIZ_MOCK_OPERCULO = {json.dumps(ruiz_data["operculo"], indent=2, ensure_ascii=False)};

export const RUIZ_PROFILE = {json.dumps(ruiz_profile, indent=2, ensure_ascii=False)};
"""

# Write to typescript file
output_path = os.path.join(os.path.dirname(__file__), 'ruizMockData.ts')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(ts_output)
    
print(f"Successfully generated {output_path} with deterministic UUIDs!")

