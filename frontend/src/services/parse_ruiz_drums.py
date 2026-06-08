import pandas as pd
import json

file_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\Ficha RUIZ RUBEN OSCAR (G.PICO).xlsx"

def clean_num(val):
    if pd.isna(val):
        return 0
    try:
        return float(val)
    except:
        return 0

def parse_23t():
    df = pd.read_excel(file_path, sheet_name='20 y 3 Tamb', skiprows=0)
    # The columns are on row 0 (which became the header, but let's verify)
    print("20 y 3 columns:", df.columns.tolist())
    # The first row actually is headers: ID, LOTE, Nº TAMBOR, KG BRUTO, TARA, KG NETO, COLOR, HUMEDAD, ANTIBIO., HMF, EAN
    # Let's inspect the data
    drums = []
    for idx, row in df.iterrows():
        nro = row.iloc[2]
        if pd.isna(nro) or str(nro).strip() == "" or str(nro).startswith("RUIZ"):
            continue
        try:
            drums.append({
                "nro_tambor": str(row.iloc[2]),
                "lote": int(row.iloc[1]) if pd.notna(row.iloc[1]) else 13006,
                "kilos_bruto": clean_num(row.iloc[3]),
                "tara": clean_num(row.iloc[4]),
                "kilos_neto": clean_num(row.iloc[5]),
                "color_pfund": clean_num(row.iloc[6]),
                "humedad": clean_num(row.iloc[7]),
                "hmf": clean_num(row.iloc[9]),
                "barras_ean": str(row.iloc[10]) if pd.notna(row.iloc[10]) else ""
            })
        except Exception as e:
            print(f"Row {idx} error: {e}")
    print(f"Parsed {len(drums)} drums from '20 y 3 Tamb'")
    return drums

def parse_10t():
    # Sheet '10 T'
    df = pd.read_excel(file_path, sheet_name='10 T', skiprows=1)
    print("10 T columns:", df.columns.tolist())
    drums = []
    for idx, row in df.iterrows():
        nro = row.iloc[4] # ID Geomiel / SENASA?
        if pd.isna(nro) or str(nro).strip() == "" or row.iloc[0] == "#" or pd.isna(row.iloc[0]):
            continue
        try:
            drums.append({
                "nro_tambor": str(row.iloc[4]), # ID Geomiel
                "lote": 10308,
                "kilos_bruto": clean_num(row.iloc[6]),
                "tara": clean_num(row.iloc[7]),
                "kilos_neto": clean_num(row.iloc[8]),
                "color_pfund": clean_num(row.iloc[10]),
                "humedad": clean_num(row.iloc[11]),
                "hmf": clean_num(row.iloc[12]),
                "barras_ean": str(row.iloc[5]) if pd.notna(row.iloc[5]) else "" # SENASA is EAN
            })
        except Exception as e:
            print(f"10 T Row {idx} error: {e}")
    print(f"Parsed {len(drums)} drums from '10 T'")
    return drums

drums23 = parse_23t()
print(json.dumps(drums23[:3], indent=2))

drums10 = parse_10t()
print(json.dumps(drums10[:3], indent=2))
