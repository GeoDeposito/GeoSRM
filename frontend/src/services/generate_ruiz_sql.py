import json
import os

products_sql = """-- 1. CREAR TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.productos (
    codigo integer PRIMARY KEY,
    producto text NOT NULL,
    descripcion text,
    unidad text,
    categoria text
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- Crear política de lectura pública para clientes anónimos y autenticados
DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.productos;
CREATE POLICY "Permitir lectura publica de productos" ON public.productos 
    FOR SELECT TO anon, authenticated USING (true);

-- 2. INSERTAR PRODUCTOS OFICIALES DE GEOMIEL
INSERT INTO public.productos (codigo, producto, descripcion, unidad, categoria) VALUES
(1, 'TCM', 'Tambor con Miel', 'Uni', 'Miel'),
(2, 'TRR', 'Tambor Reacondicionado Raldas', 'Uni', 'Vacios'),
(3, 'TRC', 'Tambor Reacondicionado Cosde', 'Uni', 'Vacios'),
(4, 'TRO', 'Tambor Reacondicionado Ombu', 'Uni', 'Vacios'),
(5, 'TNAR', 'Tambor Nuevo Alto Raldas', 'Uni', 'Vacios'),
(6, 'TNAF', 'Tambor Nuevo Alto Fabritam', 'Uni', 'Vacios'),
(7, 'TNP', 'Tambor Nuevo Petiso', 'Uni', 'Vacios'),
(8, 'CO', 'Cera Operculo', 'Kg', 'Cera'),
(9, 'CR', 'Cera Recupero', 'Kg', 'Cera'),
(10, 'CE STD', 'Cera Estampada STD', 'Uni', 'Cera'),
(11, 'CE 3/4', 'Cera Estampada 3/4', 'Uni', 'Cera'),
(12, 'NU', 'Nucleros', 'Uni', 'Insumos'),
(13, 'TE', 'Techo Calden', 'Uni', 'Insumos'),
(14, 'PI', 'Piso Calden', 'Uni', 'Insumos'),
(15, 'AL1 STD', 'Alzas de Primera STD', 'Uni', 'Insumos'),
(16, 'AL2 STD', 'Alzas de Segunda STD', 'Uni', 'Insumos'),
(17, 'AL1 3/4', 'Alzas de Primera 3/4', 'Uni', 'Insumos'),
(18, 'AL2 3/4', 'Alzas de Segunda 3/4', 'Uni', 'Insumos'),
(19, 'TV', 'Tabla de Varroa', 'Caja x 600 Uni', 'Insumos'),
(20, 'AZ', 'Azucar', 'Bolsa x 50 Kg', 'Alimento'),
(21, 'GL', 'Glucosa', 'Kg', 'Alimento'),
(22, 'TRM S/B', 'Tambor Reacondicionado Myhura S/B', 'Uni', 'Vacios'),
(23, 'TRM C/B', 'Tambor Reacondicionado Myhura C/B', 'Uni', 'Vacios'),
(24, 'LA', 'Largueros', 'Uni', 'Insumos'),
(25, 'CU', 'Cuadros', 'Uni', 'Insumos')
ON CONFLICT (codigo) DO UPDATE SET
    producto = EXCLUDED.producto,
    descripcion = EXCLUDED.descripcion,
    unidad = EXCLUDED.unidad,
    categoria = EXCLUDED.categoria;
"""

# Let's read the ruizMockData compiled TS structure or python structured data to generate SQL insertions
# Profile, Deliveries (Entregas), Envases, CC entries, Operculo.
# Profile UUID: e37fb194-9e25-5d90-b912-9925001072c0
RUIZ_PROFILE_ID = "e37fb194-9e25-5d90-b912-9925001072c0"

ruiz_profile_sql = f"""
-- 3. INSERTAR PERFIL DE RUIZ RUBEN OSCAR
INSERT INTO public.apicultores (id, nombre, cuit, localidad, cod_api, provincia, dni, renapa, telefono, puntuacion) VALUES
('{RUIZ_PROFILE_ID}', 'Ruiz, Ruben Oscar', '20-17672615-7', 'General pico', '428', 'La Pampa', '17672615', 'L3461', '5492302640499', 5.0)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    cuit = EXCLUDED.cuit,
    localidad = EXCLUDED.localidad,
    cod_api = EXCLUDED.cod_api,
    provincia = EXCLUDED.provincia,
    dni = EXCLUDED.dni,
    renapa = EXCLUDED.renapa,
    telefono = EXCLUDED.telefono,
    puntuacion = EXCLUDED.puntuacion;
"""

# Let's read the TS file generated to extract JSON arrays
import re
ts_file_path = os.path.join(os.path.dirname(__file__), 'ruizMockData.ts')
with open(ts_file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We can parse the JSON strings in the TS file using regex
def extract_json_var(var_name):
    pattern = rf"export const {var_name} = (\[.*?\]|\{{.*?\}});"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        # Replace single quotes, handle trailing commas
        js_text = match.group(1)
        # Note: it's already in JSON format from the merge_all.py script!
        return json.loads(js_text)
    return None

entregas = extract_json_var("RUIZ_MOCK_ENTREGAS")
envases = extract_json_var("RUIZ_MOCK_ENVASES")
cc_entries = extract_json_var("RUIZ_MOCK_CUENTA_CORRIENTE")
operculo = extract_json_var("RUIZ_MOCK_OPERCULO")

entregas_sql = "\n-- 4. INSERTAR ENTREGAS DE MIEL Y DETALLE DE TAMBORES\n"
tambores_sql = "\n-- 5. INSERTAR TAMBORES DE MIEL\n"

def sql_val(val):
    if val is None:
        return "NULL"
    if isinstance(val, str):
        return "'" + val.replace("'", "''") + "'"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    return str(val)

for ent in entregas:
    ent_id = ent["id"]
    fecha = ent["fecha"]
    color = ent["color_pfund"]
    hum = ent["humedad"]
    hmf = ent["hmf"]
    qty_t = ent["cantidad_tambores"]
    kilos = ent["kilos_neto"]
    
    entregas_sql += f"INSERT INTO public.ficha_entregas_miel (id, apicultor_id, fecha, color_pfund, humedad, hmf, cantidad_tambores, kilos_neto) VALUES ({sql_val(ent_id)}, '{RUIZ_PROFILE_ID}', {sql_val(fecha)}, {sql_val(color)}, {sql_val(hum)}, {sql_val(hmf)}, {sql_val(qty_t)}, {sql_val(kilos)}) ON CONFLICT (id) DO NOTHING;\n"

    
    if "tambores" in ent:
        for t in ent["tambores"]:
            t_id = t["id"]
            nro = t["nro_tambor"]
            ean = t.get("barras_ean", "")
            lote = t.get("lote", 13006)
            bruto = t["kilos_bruto"]
            tara = t["tara"]
            neto = t["kilos_neto"]
            t_color = t.get("color_pfund", color)
            t_hum = t.get("humedad", hum)
            t_hmf = t.get("hmf", hmf)
            
            tambores_sql += f"INSERT INTO public.ficha_entrega_tambores (id, entrega_id, nro_tambor, barras_ean, lote, kilos_bruto, tara, color_pfund, humedad, hmf, antibiotico) VALUES ({sql_val(t_id)}, {sql_val(ent_id)}, {sql_val(nro)}, {sql_val(ean)}, {sql_val(lote)}, {sql_val(bruto)}, {sql_val(tara)}, {sql_val(t_color)}, {sql_val(t_hum)}, {sql_val(t_hmf)}, 'NEGATIVO') ON CONFLICT (id) DO NOTHING;\n"


envases_sql = "\n-- 6. INSERTAR CONTROL DE ENVASES\n"
for env in envases:
    env_id = env["id"]
    fecha = env["fecha"]
    tipo = env["tipo_movimiento"]
    qty = env["cantidad"]
    obs = env["observaciones"]
    
    envases_sql += f"INSERT INTO public.ficha_control_envases (id, apicultor_id, fecha, tipo_movimiento, cantidad, observaciones) VALUES ({sql_val(env_id)}, '{RUIZ_PROFILE_ID}', {sql_val(fecha)}, {sql_val(tipo)}, {sql_val(qty)}, {sql_val(obs)}) ON CONFLICT (id) DO NOTHING;\n"

cc_sql = "\n-- 7. INSERTAR CUENTA CORRIENTE\n"
for cc in cc_entries:
    cc_id = cc["id"]
    fecha = cc["fecha"]
    mon = cc["moneda"]
    tipo_mv = cc["tipo_movimiento"]
    monto = cc["monto"]
    det = cc["detalle"]
    pref = cc["precio_referencia_miel"]
    k_eq = cc["kilos_miel_equiv"]
    tipo_txn = cc["tipo_transaccion"]
    
    cc_sql += f"INSERT INTO public.ficha_cuenta_corriente (id, apicultor_id, fecha, moneda, tipo_movimiento, monto, detalle, precio_referencia_miel, kilos_miel_equiv, tipo_transaccion) VALUES ({sql_val(cc_id)}, '{RUIZ_PROFILE_ID}', {sql_val(fecha)}, {sql_val(mon)}, {sql_val(tipo_mv)}, {sql_val(monto)}, {sql_val(det)}, {sql_val(pref)}, {sql_val(k_eq)}, {sql_val(tipo_txn)}) ON CONFLICT (id) DO NOTHING;\n"

operculo_sql = "\n-- 8. INSERTAR CONTROL DE OPÉRCULO / CERA\n"
for op in operculo:
    op_id = op["id"]
    fecha = op["fecha"]
    tipo = op["tipo_movimiento"]
    k_op = op["kilos_op"]
    rend = op["rendimiento_cera"]
    det = op["detalle"]
    
    operculo_sql += f"INSERT INTO public.ficha_control_operculo (id, apicultor_id, fecha, tipo_movimiento, kilos_op, rendimiento_cera, detalle) VALUES ({sql_val(op_id)}, '{RUIZ_PROFILE_ID}', {sql_val(fecha)}, {sql_val(tipo)}, {sql_val(k_op)}, {sql_val(rend)}, {sql_val(det)}) ON CONFLICT (id) DO NOTHING;\n"

final_sql = products_sql + ruiz_profile_sql + entregas_sql + tambores_sql + envases_sql + cc_sql + operculo_sql

# Output SQL is saved in the workspace root
output_sql_path = r"c:\Users\Parque-Apicola\Desktop\apicultor_srm\ruiz_seed.sql"
with open(output_sql_path, 'w', encoding='utf-8') as f:
    f.write(final_sql)
    
print(f"Successfully generated {output_sql_path} with products and Ruiz Ruben Oscar profile & transactions!")

