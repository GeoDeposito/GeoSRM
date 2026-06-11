import pg8000.dbapi

password = "8ObWJYQsXru98ur2"

sql_script = """
CREATE OR REPLACE FUNCTION public.registrar_tcm_desde_sharepoint(
    p_cuit text,
    p_apicultor_nombre text,
    p_fecha text,
    p_romaneo text,
    p_nro_tambor text,
    p_barras_ean text,
    p_kilos_bruto numeric,
    p_tara numeric,
    p_color_pfund numeric,
    p_humedad numeric,
    p_hmf numeric,
    p_lote integer DEFAULT NULL,
    p_antibiotico text DEFAULT 'NEGATIVO'
)
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
    v_fecha timestamp with time zone;
    v_apicultor_id uuid;
    v_entrega_id uuid;
    v_tambor_id uuid;
    v_kilos_neto numeric;
    v_dummy_cuit text;
    v_result jsonb;
BEGIN
    -- 1. Parsear la fecha robustamente (soporta strings ISO 8601 y números seriales de Excel)
    IF p_fecha IS NULL OR p_fecha = '' THEN
        v_fecha := now();
    ELSIF p_fecha ~ '^[0-9]+(\.[0-9]+)?$' THEN
        -- Es un número de Excel
        v_fecha := ('1899-12-30'::timestamp + (p_fecha::numeric * interval '1 day'))::timestamp with time zone;
    ELSE
        -- Es un string de fecha (ISO u otro)
        BEGIN
            v_fecha := p_fecha::timestamp with time zone;
        EXCEPTION WHEN OTHERS THEN
            v_fecha := now();
        END;
    END IF;

    -- 2. Buscar apicultor por CUIT (limpiando guiones), si se proporciona CUIT válido
    IF p_cuit IS NOT NULL AND p_cuit <> '' THEN
        SELECT id INTO v_apicultor_id
        FROM public.apicultores
        WHERE replace(cuit, '-', '') = replace(p_cuit, '-', '')
        LIMIT 1;
    END IF;

    -- Si no se encuentra por CUIT, buscar por nombre (insensible a mayúsculas/minúsculas)
    IF v_apicultor_id IS NULL AND p_apicultor_nombre IS NOT NULL AND p_apicultor_nombre <> '' THEN
        SELECT id INTO v_apicultor_id
        FROM public.apicultores
        WHERE lower(nombre) = lower(p_apicultor_nombre)
        LIMIT 1;
    END IF;

    -- Si sigue sin encontrarse, creamos el apicultor para evitar error en el flujo de importación
    IF v_apicultor_id IS NULL THEN
        IF p_cuit IS NOT NULL AND p_cuit <> '' THEN
            v_dummy_cuit := p_cuit;
        ELSE
            -- Generar un CUIT único ficticio de tipo 99-XXXXXXXX-9 para evitar colisiones únicas
            v_dummy_cuit := '99-' || floor(random() * 89999999 + 10000000)::text || '-9';
        END IF;

        INSERT INTO public.apicultores (nombre, cuit, localidad, etapa)
        VALUES (
            coalesce(p_apicultor_nombre, 'Apicultor CUIT: ' || v_dummy_cuit),
            v_dummy_cuit,
            'General Pico', -- localidad default
            'PROSPECTO'
        )
        RETURNING id INTO v_apicultor_id;
    END IF;

    -- Calcular kilos netos
    v_kilos_neto := p_kilos_bruto - p_tara;

    -- 3. Buscar si ya existe una entrega/romaneo para este apicultor con el número de romaneo especificado
    IF p_romaneo IS NOT NULL AND p_romaneo <> '' THEN
        SELECT id INTO v_entrega_id
        FROM public.ficha_entregas_miel
        WHERE apicultor_id = v_apicultor_id
          AND romaneo = p_romaneo
        LIMIT 1;
    ELSE
        -- Si no se especifica romaneo, agrupar por día
        SELECT id INTO v_entrega_id
        FROM public.ficha_entregas_miel
        WHERE apicultor_id = v_apicultor_id
          AND date_trunc('day', fecha) = date_trunc('day', v_fecha)
        LIMIT 1;
    END IF;

    -- Si existe, actualizamos los valores agregados de la entrega
    IF v_entrega_id IS NOT NULL THEN
        UPDATE public.ficha_entregas_miel
        SET
            cantidad_tambores = cantidad_tambores + 1,
            kilos_neto = kilos_neto + v_kilos_neto,
            color_pfund = round(coalesce((color_pfund * cantidad_tambores + p_color_pfund) / (cantidad_tambores + 1), color_pfund, p_color_pfund), 2),
            humedad = round(coalesce((humedad * cantidad_tambores + p_humedad) / (cantidad_tambores + 1), humedad, p_humedad), 2),
            hmf = round(coalesce((hmf * cantidad_tambores + p_hmf) / (cantidad_tambores + 1), hmf, p_hmf), 2),
            updated_at = now()
        WHERE id = v_entrega_id;
    ELSE
        -- Si no existe, creamos un nuevo romaneo
        INSERT INTO public.ficha_entregas_miel (
            apicultor_id,
            fecha,
            romaneo,
            color_pfund,
            humedad,
            hmf,
            cantidad_tambores,
            kilos_neto
        ) VALUES (
            v_apicultor_id,
            v_fecha,
            p_romaneo,
            coalesce(p_color_pfund, 0),
            coalesce(p_humedad, 0),
            coalesce(p_hmf, 0),
            1,
            v_kilos_neto
        )
        RETURNING id INTO v_entrega_id;
    END IF;

    -- 4. Verificar si el tambor ya está registrado (para evitar duplicados usando ID GEO / nro_tambor)
    SELECT id INTO v_tambor_id
    FROM public.ficha_entrega_tambores
    WHERE nro_tambor = p_nro_tambor;

    IF v_tambor_id IS NOT NULL THEN
        -- Si ya existe, actualizamos sus especificaciones
        UPDATE public.ficha_entrega_tambores
        SET
            entrega_id = v_entrega_id,
            barras_ean = p_barras_ean,
            lote = p_lote,
            kilos_bruto = p_kilos_bruto,
            tara = p_tara,
            color_pfund = p_color_pfund,
            humedad = p_humedad,
            hmf = p_hmf,
            antibiotico = p_antibiotico
        WHERE id = v_tambor_id;
        
        v_result := jsonb_build_object(
            'status', 'UPDATED',
            'tambor_id', v_tambor_id,
            'entrega_id', v_entrega_id,
            'apicultor_id', v_apicultor_id,
            'message', 'Tambor ' || p_nro_tambor || ' actualizado con éxito en Romaneo ' || coalesce(p_romaneo, 'S/R')
        );
    ELSE
        -- Si no existe, lo insertamos
        INSERT INTO public.ficha_entrega_tambores (
            entrega_id,
            nro_tambor,
            barras_ean,
            lote,
            kilos_bruto,
            tara,
            color_pfund,
            humedad,
            hmf,
            antibiotico
        ) VALUES (
            v_entrega_id,
            p_nro_tambor,
            p_barras_ean,
            p_lote,
            p_kilos_bruto,
            p_tara,
            p_color_pfund,
            p_humedad,
            p_hmf,
            p_antibiotico
        )
        RETURNING id INTO v_tambor_id;

        v_result := jsonb_build_object(
            'status', 'INSERTED',
            'tambor_id', v_tambor_id,
            'entrega_id', v_entrega_id,
            'apicultor_id', v_apicultor_id,
            'message', 'Tambor ' || p_nro_tambor || ' registrado e ingresado con éxito en Romaneo ' || coalesce(p_romaneo, 'S/R')
        );
    END IF;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'ERROR',
            'message', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;
"""

try:
    conn = pg8000.dbapi.connect(
        user="postgres.ajrfkkiuludrdexgprmb",
        password=password,
        host="aws-1-us-east-1.pooler.supabase.com",
        port=6543,
        database="postgres"
    )
    cursor = conn.cursor()
    print("Connected to Supabase. Deploying RPC function...")
    cursor.execute(sql_script)
    conn.commit()
    print("RPC function deployed successfully!")
except Exception as e:
    print("Error deploying RPC function:", e)
finally:
    if 'conn' in locals():
        conn.close()
