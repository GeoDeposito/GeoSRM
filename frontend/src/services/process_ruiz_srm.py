import pandas as pd
import json
import numpy as np
import os

file_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\Ficha RUIZ RUBEN OSCAR (G.PICO).xlsx"

def clean_num(val):
    if pd.isna(val):
        return 0
    try:
        if isinstance(val, str):
            val = val.replace("$", "").replace(".", "").replace(",", ".").strip()
            # Handle multiplication like 16*1
            if "*" in val:
                parts = val.split("*")
                return float(parts[0]) * float(parts[1])
        return float(val)
    except Exception as e:
        return 0

def clean_str(val):
    if pd.isna(val):
        return ""
    return str(val).strip()

def parse_ledger_data():
    df = pd.read_excel(file_path, sheet_name='Ficha')
    
    entregas = []
    envases = []
    cc_entries = []
    operculo = []
    
    # We will process rows from index 23 to 80 (where the actual modern ledger lies)
    # Let's inspect the entire sheet size
    print("Ledger sheet length:", len(df))
    
    # Let's read the first 100 rows to be safe
    for idx in range(23, min(len(df), 110)):
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
            fecha_str = new_date = pd.Timestamp(2022, 1, 1).isoformat() # fallback
            
        remito_str = clean_str(remito)
        mov_str = clean_str(movimiento)
        
        # 1. Opérculo movements
        kg_op = row.iloc[12]
        if pd.notna(kg_op) and kg_op != 0:
            kilos = float(kg_op)
            tipo_op = 'ENTREGA_OP' if kilos > 0 else 'RETIRO_CERA'
            operculo.append({
                "id": f"op_ruiz_{idx}",
                "apicultor_id": "4",
                "fecha": fecha_str,
                "tipo_movimiento": tipo_op,
                "kilos_op": kilos,
                "rendimiento_cera": 0.8,
                "detalle": f"{mov_str} (Remito: {remito_str})" if remito_str else mov_str,
                "created_at": fecha_str,
                "updated_at": fecha_str
            })
            
        # 2. Envases movements (prestamos and devoluciones)
        # We detect based on description
        # "Retira 32 TN RALDAs", "Retire 16 TNR", "Retira 16 TN Raldas", "Retira 15 TNR", "Retira 42 TROmbu", "Retira 42 TR Cosde", "Retira 2 TR Cosde", "Retira 20 TR", "Retira 3 TRO"
        # These are loans (PRESTAMO) of envases
        # "Entrega 5 TCM", "Entrega 6 TCM", "Entrega 34 TCM", "Entrega 35 TCM"
        # These are returns (DEVOLUCION) of envases (TCM contains empty drums returned eventually or filled)
        qty_drums = 0
        tipo_envase = None
        
        mov_upper = mov_str.upper()
        if "RETIRA" in mov_upper or "RETIRE" in mov_upper:
            # Try to extract drum quantity
            import re
            match = re.search(r'(\d+)\s*(?:TN|TR|TNR|TRO|COSD)', mov_upper)
            if match:
                qty_drums = int(match.group(1))
                tipo_envase = 'PRESTAMO'
            elif "1 AHUMADOR" in mov_upper or "GUANTES" in mov_upper or "CARETA" in mov_upper or "BOBINAS" in mov_upper or "CERA" in mov_upper:
                # Not a drum
                pass
            else:
                # Fallback check for "RETIRA 20 TR"
                match2 = re.search(r'RETIRA\s+(\d+)', mov_upper)
                if match2:
                    qty_drums = int(match2.group(1))
                    tipo_envase = 'PRESTAMO'
        elif "ENTREGA" in mov_upper and "TCM" in mov_upper:
            import re
            match = re.search(r'(\d+)\s*TCM', mov_upper)
            if match:
                qty_drums = int(match.group(1))
                tipo_envase = 'DEVOLUCION'
                
        if qty_drums > 0 and tipo_envase:
            envases.append({
                "id": f"env_ruiz_{idx}",
                "apicultor_id": "4",
                "fecha": fecha_str,
                "tipo_movimiento": tipo_envase,
                "cantidad": qty_drums,
                "observaciones": f"{mov_str} (Remito: {remito_str})" if remito_str else mov_str,
                "created_at": fecha_str,
                "updated_at": fecha_str
            })
            
        # 3. Deliveries (Honey Deliveries)
        # Any honey delivery in the ledger
        # "Entrega 35 TCM - 10.411kg", "Entrega 6 TCM - 1987kg", "Entrega 6 TCM-1732kg", "Entrega 34 TCM"
        # Also let's extract the net weight in kg
        if "ENTREGA" in mov_upper and "TCM" in mov_upper:
            import re
            kilos_neto = 0
            # Try to find something like "10.411kg" or "1987kg" or "1732kg"
            match_kg = re.search(r'(\d+[\.,]?\d*)\s*KG', mov_upper)
            if match_kg:
                kg_text = match_kg.group(1).replace(".", "").replace(",", ".")
                kilos_neto = float(kg_text)
            
            # If color/quality metrics are mentioned
            color = 50.0
            humedad = 17.5
            hmf = 10.0
            
            # Count drums
            match_drums = re.search(r'(\d+)\s*TCM', mov_upper)
            qty_d = int(match_drums.group(1)) if match_drums else 5
            
            if kilos_neto == 0:
                kilos_neto = qty_d * 300.0 # fallback
                
            entregas.append({
                "id": f"ent_ruiz_{idx}",
                "apicultor_id": "4",
                "fecha": fecha_str,
                "color_pfund": color,
                "humedad": humedad,
                "hmf": hmf,
                "cantidad_tambores": qty_d,
                "kilos_neto": kilos_neto,
                "created_at": fecha_str,
                "updated_at": fecha_str
            })
            
        # 4. Cuenta Corriente
        # Almost every row is in Cuenta Corriente!
        # If there is a price paid ($ Uni or $ Miel) or a honey equivalent (KG miel / row.iloc[6] / row.iloc[10]) or a cash amount ($ Uni / row.iloc[4])
        # Let's map it!
        # Let's see: row.iloc[4] represents either the cash amount or the unit price.
        # If "Recibe deposito" or "Recibe efectivo" or "Recibe u$d" or "Retira":
        # It's a CC movement!
        is_cc = False
        monto = 0
        moneda = 'ARS'
        tipo_mv = 'DEBE'
        tipo_txn = 'RETIRO_INSUMO'
        price_ref = 0
        kg_equiv = 0
        
        # If "RECIBE DEPOSITO" or "RECIBE EFECTIVO" or "RECIBE PAGO" or "RECIBE USD" or "RECIBE U$D" or "ADELANTO"
        if any(w in mov_upper for w in ["RECIBE", "ADELANTO", "DEPOSITO"]):
            is_cc = True
            tipo_mv = 'DEBE'
            tipo_txn = 'ANTICIPO_CASH'
            
            # Check currency
            if "USD" in mov_upper or "U$D" in mov_upper or "U$S" in mov_upper:
                moneda = 'USD'
                
            # Try to parse cash amount from movement text
            import re
            # Find "$ 850.000" or "USD 4350" or "u$d 3.000" or "$300.000" or "205.000$"
            match_money = re.search(r'(?:USD|\$|U\$D|U\$S)\s*(\d+[\.,]?\d*[\.,]?\d*)', mov_upper)
            if match_money:
                monto = clean_num(match_money.group(1))
            else:
                match_money2 = re.search(r'(\d+[\.,]?\d*[\.,]?\d*)\s*(?:USD|\$|U\$D|U\$S)', mov_upper)
                if match_money2:
                    monto = clean_num(match_money2.group(1))
            
            # Check price ref
            price_ref = clean_num(row.iloc[5]) if pd.notna(row.iloc[5]) else 0
            if price_ref == 0:
                price_ref = clean_num(row.iloc[9]) if pd.notna(row.iloc[9]) else 0
                
            # Check kg equivalent (negative for DEBE in honey)
            val_kg = row.iloc[6] if pd.notna(row.iloc[6]) else row.iloc[10]
            kg_equiv = clean_num(val_kg) if pd.notna(val_kg) else 0
            
            if monto == 0 and kg_equiv != 0 and price_ref > 0:
                monto = abs(kg_equiv * price_ref)
                
        elif "RETIRA" in mov_upper or "RETIRE" in mov_upper:
            is_cc = True
            tipo_mv = 'DEBE'
            if "TNR" in mov_upper or "TN R" in mov_upper or "TR" in mov_upper:
                tipo_txn = 'CARGO_ENVASE'
            else:
                tipo_txn = 'RETIRO_INSUMO'
                
            # Parse price
            monto = clean_num(row.iloc[4]) if pd.notna(row.iloc[4]) else 0
            price_ref = clean_num(row.iloc[5]) if pd.notna(row.iloc[5]) else 0
            val_kg = row.iloc[6] if pd.notna(row.iloc[6]) else row.iloc[10]
            kg_equiv = clean_num(val_kg) if pd.notna(val_kg) else 0
            
        elif "FA " in mov_upper or "VENTA" in mov_upper or "LIQUIDACION" in mov_upper:
            is_cc = True
            tipo_mv = 'HABER'
            tipo_txn = 'VENTA_LIQUIDACION'
            # Liquidations are credits in money (+), and debits in honey equivalent (-)
            # Parse amount
            price_ref = clean_num(row.iloc[5]) if pd.notna(row.iloc[5]) else 0
            val_kg = row.iloc[6] if pd.notna(row.iloc[6]) else row.iloc[10]
            kg_equiv = clean_num(val_kg) if pd.notna(val_kg) else 0
            monto = abs(kg_equiv * (price_ref if price_ref > 0 else 300))
            
        if is_cc:
            cc_entries.append({
                "id": f"cc_ruiz_{idx}",
                "apicultor_id": "4",
                "fecha": fecha_str,
                "moneda": moneda,
                "tipo_movimiento": tipo_mv,
                "monto": monto if monto > 0 else 1000.0, # default if 0
                "detalle": f"{mov_str} (Remito: {remito_str})" if remito_str else mov_str,
                "precio_referencia_miel": price_ref if price_ref > 0 else None,
                "kilos_miel_equiv": kg_equiv if kg_equiv != 0 else None,
                "tipo_transaccion": tipo_txn,
                "created_at": fecha_str,
                "updated_at": fecha_str
            })
            
    print(f"Parsed {len(entregas)} entregas")
    print(f"Parsed {len(envases)} envases")
    print(f"Parsed {len(cc_entries)} CC entries")
    print(f"Parsed {len(operculo)} operculo entries")
    
    return {
        "entregas": entregas,
        "envases": envases,
        "cc_entries": cc_entries,
        "operculo": operculo
    }

parsed = parse_ledger_data()

# Write output to JSON in the workspace for later inclusion
with open('ruiz_seed_data.json', 'w', encoding='utf-8') as f:
    json.dump(parsed, f, ensure_ascii=False, indent=2)
    
print("Successfully generated ruiz_seed_data.json!")
