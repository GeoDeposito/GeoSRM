#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de Importación y ETL para APICULTOR SRM.
Procesa planillas históricas de apicultores y segrega los movimientos en Cuenta Corriente o Envases.
"""

import os
import re
import argparse
import pandas as pd
from datetime import datetime

# Expresiones Regulares para Clasificación Semántica (según ETL_MIGRATION.md)
REGEX_FINANCIERO = re.compile(
    r'(pago|cobro|anticipo|adelanto|efectivo|transferencia|cheque|factura|liq|liquidaci[oó]n|dolar|usd|pesos|val[e|es]|\bvs\b|\$)',
    re.IGNORECASE
)
REGEX_ENVASES = re.compile(
    r'(tambor|envase|tcm|vacio|prestamo|devolucion|entrega.*envase|dev.*envase|tacho|barril)',
    re.IGNORECASE
)

def clasificar_movimiento(detalle_texto, valor_monto, valor_cantidad):
    """
    Determina si la fila corresponde a Cuenta Corriente (Financiero) o a Control de Envases vacíos.
    """
    detalle = str(detalle_texto).strip()
    
    # Detección semántica por contenido del texto
    if REGEX_ENVASES.search(detalle):
        return 'ENVASES'
    if REGEX_FINANCIERO.search(detalle):
        return 'FINANCIERO'
        
    # Detección por columnas cargadas
    if pd.notna(valor_monto) and valor_monto != 0:
        return 'FINANCIERO'
    elif pd.notna(valor_cantidad) and valor_cantidad != 0:
        return 'ENVASES'
        
    return 'DESCONOCIDO'

def procesar_excel(filepath, apicultor_id, output_sql=None):
    """
    Carga y procesa el archivo Excel histórico.
    Genera colecciones de inserts listos para Supabase.
    """
    print(f"[*] Cargando planilla histórica: {filepath}")
    if not os.path.exists(filepath):
        print(f"[!] Error: El archivo '{filepath}' no existe.")
        return
        
    try:
        df = pd.read_excel(filepath, engine='openpyxl')
    except Exception as e:
        print(f"[!] Error leyendo Excel: {e}")
        return
        
    # Normalizar columnas
    df.columns = [str(c).strip().lower() for c in df.columns]
    print(f"[*] Columnas detectadas: {list(df.columns)}")
    
    # Buscar correspondencia de columnas
    col_fecha = 'fecha' if 'fecha' in df.columns else None
    col_detalle = 'detalle' if 'detalle' in df.columns else ('concepto' if 'concepto' in df.columns else None)
    col_debe = 'debe' if 'debe' in df.columns else None
    col_haber = 'haber' if 'haber' in df.columns else None
    col_cantidad = 'cantidad' if 'cantidad' in df.columns else ('cant' if 'cant' in df.columns else None)
    
    if not col_fecha or not col_detalle:
        print("[!] Error crítico: No se encontraron las columnas 'fecha' y/o 'detalle/concepto' en el Excel.")
        return

    cuenta_corriente_inserts = []
    envases_inserts = []
    revision_manual = []

    print("[*] Procesando registros y aplicando clasificación semántica...")
    for idx, row in df.iterrows():
        fecha_val = row[col_fecha]
        detalle_val = str(row[col_detalle]).strip()
        
        if pd.isna(fecha_val) or not detalle_val or detalle_val.lower() == 'nan':
            continue
            
        # Parseo de Fecha
        if isinstance(fecha_val, str):
            try:
                fecha_iso = pd.to_datetime(fecha_val).isoformat()
            except Exception:
                fecha_iso = datetime.now().isoformat()
        else:
            fecha_iso = fecha_val.isoformat() if hasattr(fecha_val, 'isoformat') else datetime.now().isoformat()
            
        debe = float(row[col_debe]) if col_debe and pd.notna(row[col_debe]) else 0.0
        haber = float(row[col_haber]) if col_haber and pd.notna(row[col_haber]) else 0.0
        cantidad = int(row[col_cantidad]) if col_cantidad and pd.notna(row[col_cantidad]) else 0
        
        monto_cc = debe if debe > 0 else haber
        tipo = clasificar_movimiento(detalle_val, monto_cc, cantidad)
        
        if tipo == 'FINANCIERO':
            tipo_mov = 'DEBE' if debe > 0 else 'HABER'
            moneda = 'USD' if any(word in detalle_val.lower() for word in ['usd', 'dolar', 'dólar']) else 'ARS'
            monto = debe if debe > 0 else haber
            if monto > 0:
                cuenta_corriente_inserts.append({
                    'apicultor_id': apicultor_id,
                    'fecha': fecha_iso,
                    'moneda': moneda,
                    'tipo_movimiento': tipo_mov,
                    'monto': monto,
                    'detalle': detalle_val
                })
        elif tipo == 'ENVASES':
            # Determinar Préstamo o Devolución
            tipo_envase = 'DEVOLUCION' if any(word in detalle_val.lower() for word in ['dev', 'ret', 'recib', 'devolución']) else 'PRESTAMO'
            
            # Buscar cantidad en el texto si la columna es 0
            cant_mov = cantidad
            if cant_mov == 0:
                match_num = re.search(r'\b(\d+)\b\s*(tambor|envase|tcm)', detalle_val, re.IGNORECASE)
                cant_mov = int(match_num.group(1)) if match_num else 1
                
            envases_inserts.append({
                'apicultor_id': apicultor_id,
                'fecha': fecha_iso,
                'tipo_movimiento': tipo_envase,
                'cantidad': cant_mov,
                'observaciones': detalle_val
            })
        else:
            revision_manual.append({
                'fila': idx + 2,
                'fecha': fecha_iso,
                'detalle': detalle_val,
                'debe': debe,
                'haber': haber,
                'cantidad': cantidad
            })

    print("\n[+] Resumen de Clasificación:")
    print(f"    - Movimientos Financieros (Cuenta Corriente): {len(cuenta_corriente_inserts)} filas.")
    print(f"    - Movimientos de Tambores Vacíos:            {len(envases_inserts)} filas.")
    print(f"    - Filas no clasificadas (revisión manual):   {len(revision_manual)} filas.")

    # Escribir volcado SQL si se solicita
    if output_sql:
        with open(output_sql, 'w', encoding='utf-8') as f:
            f.write(f"-- IMPORTACIÓN HISTÓRICA PARA APICULTOR ID: {apicultor_id}\n")
            f.write("-- Tabla: ficha_cuenta_corriente\n")
            for cc in cuenta_corriente_inserts:
                f.write(
                    f"INSERT INTO public.ficha_cuenta_corriente (apicultor_id, fecha, moneda, tipo_movimiento, monto, detalle) "
                    f"VALUES ('{cc['apicultor_id']}', '{cc['fecha']}', '{cc['moneda']}', '{cc['tipo_movimiento']}', {cc['monto']}, '{cc['detalle'].replace(\"'\", \"''\")}');\n"
                )
            
            f.write("\n-- Tabla: ficha_control_envases\n")
            for env in envases_inserts:
                f.write(
                    f"INSERT INTO public.ficha_control_envases (apicultor_id, fecha, tipo_movimiento, cantidad, observaciones) "
                    f"VALUES ('{env['apicultor_id']}', '{env['fecha']}', '{env['tipo_movimiento']}', {env['cantidad']}, '{env['observaciones'].replace(\"'\", \"''\")}');\n"
                )
        print(f"\n[+] Archivo SQL de migración generado exitosamente en: {output_sql}")

    if len(revision_manual) > 0:
        print("\n[!] Alerta: Las siguientes filas requieren revisión manual por no coincidir claramente:")
        for r in revision_manual[:10]:
            print(f"    Fila {r['fila']}: '{r['detalle']}' (Debe: {r['debe']}, Haber: {r['haber']}, Cant: {r['cantidad']})")
        if len(revision_manual) > 10:
            print(f"    ... y {len(revision_manual) - 10} filas más.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="ETL Script para importar historial de apicultores a Supabase.")
    parser.add_argument('--file', type=str, required=True, help="Ruta al archivo Excel (.xlsx)")
    parser.add_argument('--apicultor-id', type=str, required=True, help="UUID del apicultor en Supabase")
    parser.add_argument('--output-sql', type=str, default='migracion.sql', help="Archivo de salida SQL")
    
    args = parser.parse_args()
    procesar_excel(args.file, args.apicultor_id, args.output_sql)
