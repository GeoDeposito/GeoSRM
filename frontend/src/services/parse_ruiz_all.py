import pandas as pd
import json
import numpy as np

file_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\Ficha RUIZ RUBEN OSCAR (G.PICO).xlsx"

def clean_val(val):
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return val
    return str(val).strip()

def parse_ledger():
    df = pd.read_excel(file_path, sheet_name='Ficha')
    
    # We find where the second table starts. It starts around index 21 (row 22 in Excel)
    # Headers are: Fecha, Remito, Movimiento, Entrega, $ Uni, $ Miel, KG miel, Saldo Miel, $ Uni, $ Miel, KG miel, Saldo Miel, Kg OP, Saldo Op
    
    ledger_entries = []
    
    # Let's iterate from index 23 to the end of the sheet
    for idx in range(23, len(df)):
        row = df.iloc[idx]
        fecha = row.iloc[0]
        remito = row.iloc[1]
        movimiento = row.iloc[2]
        
        if pd.isna(fecha) and pd.isna(remito) and pd.isna(movimiento):
            continue
            
        # Parse date
        if isinstance(fecha, pd.Timestamp):
            fecha_str = fecha.isoformat()
        elif pd.notna(fecha):
            try:
                fecha_str = pd.to_datetime(fecha).isoformat()
            except:
                fecha_str = str(fecha)
        else:
            fecha_str = None
            
        # Let's see what columns we have
        # Columns in Excel:
        # Col 0: Fecha
        # Col 1: Remito
        # Col 2: Movimiento
        # Col 3: Entrega (could be name, e.g. "Gustavo", "Ruben Ruiz")
        # Col 4: $ Uni (for Honey <=50mm)
        # Col 5: $ Miel (for Honey <=50mm)
        # Col 6: KG miel (for Honey <=50mm)
        # Col 7: Saldo Miel (for Honey <=50mm)
        # Col 8: $ Uni (for Honey >50mm)
        # Col 9: $ Miel (for Honey >50mm)
        # Col 10: KG miel (for Honey >50mm)
        # Col 11: Saldo Miel (for Honey >50mm)
        # Col 12: Kg OP (Operculo)
        # Col 13: Saldo Op
        
        kg_miel_lte_50 = clean_val(row.iloc[6])
        kg_miel_gt_50 = clean_val(row.iloc[10])
        kg_op = clean_val(row.iloc[12])
        
        # Let's check what kind of entry this is
        # If it has Kg OP, it's an operculo transaction
        # If it has KG miel, it's a honey or CC transaction
        # Let's capture the raw row and parse it later
        
        entry = {
            "fecha": fecha_str,
            "remito": clean_val(remito),
            "movimiento": clean_val(movimiento),
            "entrega": clean_val(row.iloc[3]),
            "precio_uni_lte_50": clean_val(row.iloc[4]),
            "precio_miel_lte_50": clean_val(row.iloc[5]),
            "kg_miel_lte_50": kg_miel_lte_50,
            "saldo_miel_lte_50": clean_val(row.iloc[7]),
            "precio_uni_gt_50": clean_val(row.iloc[8]),
            "precio_miel_gt_50": clean_val(row.iloc[9]),
            "kg_miel_gt_50": kg_miel_gt_50,
            "saldo_miel_gt_50": clean_val(row.iloc[11]),
            "kg_op": kg_op,
            "saldo_op": clean_val(row.iloc[13])
        }
        ledger_entries.append(entry)
        
    print(f"Parsed {len(ledger_entries)} ledger entries")
    return ledger_entries

ledger = parse_ledger()
# Write top 15 to check
print(json.dumps(ledger[:15], indent=2))
