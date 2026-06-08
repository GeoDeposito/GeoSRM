# [ETL_MIGRATION] - Estructura Lógica de Importación de Datos Históricos

Este documento detalla el diseño y código del script Python encargado de migrar los registros históricos de los apicultores desde planillas Excel hacia las nuevas tablas estructuradas de Supabase.

---

## 1. Estrategia de Clasificación Mediante Expresiones Regulares (Regex)

Dado que las planillas históricas consolidan en una misma columna descriptiva tanto transacciones de dinero como movimientos de envases vacíos, utilizaremos un clasificador basado en reglas semánticas y expresiones regulares.

### Patrones para Identificar Movimientos Financieros (Cuenta Corriente)
Buscamos descripciones que contengan palabras asociadas a montos, pagos, monedas, facturas o adelantos de dinero:
- **Regex**: `r'(?i)(pago|cobro|anticipo|adelanto|efectivo|transferencia|cheque|factura|liq|liquidaci[oó]n|dolar|usd|pesos|val[e|es]|\bvs\b|\$)'`

### Patrones para Identificar Movimientos de Envases (Tambores Vacíos)
Buscamos descripciones referidas a tambores, entrega de envases, devoluciones físicas o préstamos para cosecha:
- **Regex**: `r'(?i)(tambor|envase|tcm|vacio|prestamo|devolucion|entrega.*envase|dev.*envase|tacho|barril)'`

---

## 2. Esqueleto del Script Python (ETL)

El siguiente script en Python utiliza `pandas` para el procesamiento estructurado de datos, `openpyxl` como motor de lectura para archivos `.xlsx`, y expresiones regulares para segregar los datos y enviarlos a la base de datos de Supabase.

```python
import os
import re
import pandas as pd
from datetime import datetime

# Expresiones Regulares para la clasificación semántica
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
    Analiza una fila del historial y determina si corresponde a:
    - 'FINANCIERO': Cuenta Corriente (Debe/Haber en ARS/USD)
    - 'ENVASES': Control de tambores prestados/devueltos
    - 'ENTREGA_MIEL': Entrega física de producto con análisis
    - 'DESCONOCIDO': Fila para revisión manual
    """
    detalle = str(detalle_texto).strip()
    
    # Caso 1: Detección por texto de envases vacíos
    if REGEX_ENVASES.search(detalle):
        return 'ENVASES'
        
    # Caso 2: Detección por texto de Cuenta Corriente
    if REGEX_FINANCIERO.search(detalle):
        return 'FINANCIERO'
        
    # Caso 3: Fallback por presencia de valores en las columnas
    if pd.notna(valor_monto) and valor_monto != 0:
        return 'FINANCIERO'
    elif pd.notna(valor_cantidad) and valor_cantidad != 0:
        return 'ENVASES'
        
    return 'DESCONOCIDO'

def procesar_historial_productor(filepath, apicultor_id):
    """
    Lee la planilla Excel, aplica la limpieza y clasifica las filas.
    """
    print(f"[*] Leyendo archivo: {filepath}...")
    
    # Cargar Excel utilizando openpyxl
    df = pd.read_excel(filepath, engine='openpyxl')
    
    # Normalización de nombres de columnas (limpieza de espacios y minúsculas)
    df.columns = [str(c).strip().lower() for c in df.columns]
    
    # Asegurar la existencia de columnas críticas o mapear alias
    # Columnas esperadas: 'fecha', 'detalle', 'debe', 'haber', 'cantidad', 'monto'
    columnas_requeridas = {'fecha', 'detalle'}
    if not columnas_requeridas.issubset(df.columns):
        raise ValueError(f"El archivo debe contener al menos las columnas {columnas_requeridas}")
        
    print(f"[*] Total de filas a procesar: {len(df)}")
    
    cuenta_corriente_rows = []
    control_envases_rows = []
    revision_manual_rows = []
    
    for index, row in df.iterrows():
        fecha = row.get('fecha')
        detalle = str(row.get('detalle', ''))
        
        # Ignorar filas vacías o de cabecera secundaria
        if pd.isna(fecha) or not detalle:
            continue
            
        # Intentar parsear fecha a formato ISO
        if isinstance(fecha, str):
            try:
                fecha_dt = pd.to_datetime(fecha).isoformat()
            except Exception:
                fecha_dt = datetime.now().isoformat()
        else:
            fecha_dt = fecha.isoformat() if hasattr(fecha, 'isoformat') else datetime.now().isoformat()

        debe = float(row.get('debe', 0.0)) if pd.notna(row.get('debe')) else 0.0
        haber = float(row.get('haber', 0.0)) if pd.notna(row.get('haber')) else 0.0
        cantidad = int(row.get('cantidad', 0)) if pd.notna(row.get('cantidad')) else 0
        
        # Determinar el tipo de movimiento
        monto_financiero = debe if debe > 0 else haber
        tipo = clasificar_movimiento(detalle, monto_financiero, cantidad)
        
        if tipo == 'FINANCIERO':
            tipo_mov = 'DEBE' if debe > 0 else 'HABER'
            monto = debe if debe > 0 else haber
            cuenta_corriente_rows.append({
                'apicultor_id': apicultor_id,
                'fecha': fecha_dt,
                'moneda': 'USD' if 'usd' in detalle.lower() or 'dolar' in detalle.lower() else 'ARS',
                'tipo_movimiento': tipo_mov,
                'monto': monto,
                'detalle': detalle
            })
            
        elif tipo == 'ENVASES':
            # Si el detalle indica devolución o la cantidad se asocia a devolución
            tipo_envase = 'DEVOLUCION' if 'dev' in detalle.lower() or 'ret' in detalle.lower() else 'PRESTAMO'
            # Si no hay cantidad declarada pero es un tambor, asignar un valor por defecto o extraer número del texto
            cant_mov = cantidad if cantidad > 0 else 1
            # Buscar si el número de tambores viene embebido en el texto (ej. "Entrega 10 tambores")
            match_num = re.search(r'\b(\d+)\b\s*(tambor|envase|tcm)', detalle, re.IGNORECASE)
            if match_num and cantidad == 0:
                cant_mov = int(match_num.group(1))
                
            control_envases_rows.append({
                'apicultor_id': apicultor_id,
                'fecha': fecha_dt,
                'tipo_movimiento': tipo_envase,
                'cantidad': cant_mov,
                'observaciones': detalle
            })
            
        else:
            revision_manual_rows.append({
                'fila_index': index,
                'fecha': fecha_dt,
                'detalle': detalle,
                'debe': debe,
                'haber': haber,
                'cantidad': cantidad
            })

    print(f"\n[+] Procesamiento completado:")
    print(f"    - Movimientos Financieros (Cta Cte) detectados: {len(cuenta_corriente_rows)}")
    print(f"    - Movimientos de Envases detectados: {len(control_envases_rows)}")
    print(f"    - Filas para Revisión Manual: {len(revision_manual_rows)}")
    
    return cuenta_corriente_rows, control_envases_rows, revision_manual_rows

# Ejemplo de uso simulado
if __name__ == '__main__':
    # Configuración de variables simuladas
    SAMPLE_APICULTOR_UUID = "d3b07384-d113-4a1a-a5f1-85b4931a7422"
    # cct_rows, env_rows, rev_rows = procesar_historial_productor("historial_ejemplo.xlsx", SAMPLE_APICULTOR_UUID)
    pass
```
