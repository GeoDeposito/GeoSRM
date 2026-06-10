# [SYS_ARCH] - Arquitectura de Base de Datos y Supabase

Este documento centraliza la definición del backend en Supabase, el diseño del esquema relacional en PostgreSQL, sus índices, triggers y políticas de seguridad por fila (RLS) necesarias para recrear el proyecto desde cero.

---

## 1. Esquema de Base de Datos (DDL)

A continuación, se detalla el código SQL definitivo y optimizado para ser ejecutado en el editor SQL de Supabase.

```sql
-- Habilitar extensión para UUID si no está habilitada
create extension if not exists "uuid-ossp";

-- Habilitar extensión http para consultas externas (e.g. validación de RENAPA)
create extension if not exists "http";

-- =========================================================================
-- TABLA: apicultores
-- Representa el maestro único de proveedores apícolas.
-- =========================================================================
create table if not exists public.apicultores (
    id uuid default gen_random_uuid() primary key,
    nombre text not null,
    cuit varchar(15) unique not null,
    dni varchar(20),
    renapa varchar(50),
    provincia text,
    localidad text,
    telefono text,
    cod_api varchar(20),
    puntuacion numeric(3, 2) default 5.00 check (puntuacion >= 0.00 and puntuacion <= 5.00),
    etapa text default 'ACTIVO' check (etapa in ('PROSPECTO', 'CONTACTADO', 'NEGOCIANDO', 'ACTIVO')),
    tag text default 'PRODUCTOR',
    notas_onboarding text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- TABLA: ficha_entregas_miel
-- Registro analítico y detallado de cada entrega de miel física.
-- =========================================================================
create table if not exists public.ficha_entregas_miel (
    id uuid default gen_random_uuid() primary key,
    apicultor_id uuid references public.apicultores(id) on delete cascade not null,
    fecha timestamp with time zone default timezone('utc'::text, now()) not null,
    romaneo varchar(50), -- Número de romaneo único
    color_pfund numeric(5, 2) not null check (color_pfund >= 0.00), -- Escala Pfund (mm)
    humedad numeric(4, 2) not null check (humedad >= 0.00 and humedad <= 100.00), -- % Humedad
    hmf numeric(6, 2) not null check (hmf >= 0.00), -- Hidroximetilfurfural (mg/kg)
    cantidad_tambores integer not null check (cantidad_tambores > 0),
    kilos_neto numeric(10, 2) not null check (kilos_neto > 0.00),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- TABLA: ficha_control_envases
-- Control de préstamos y devoluciones de tambores vacíos para cosecha.
-- =========================================================================
create table if not exists public.ficha_control_envases (
    id uuid default gen_random_uuid() primary key,
    apicultor_id uuid references public.apicultores(id) on delete cascade not null,
    fecha timestamp with time zone default timezone('utc'::text, now()) not null,
    tipo_movimiento text not null check (tipo_movimiento in ('PRESTAMO', 'DEVOLUCION')),
    cantidad integer not null check (cantidad > 0),
    observaciones text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- TABLA: ficha_cuenta_corriente
-- Cuenta corriente financiera consolidando Debe, Haber y Saldos en ARS/USD.
-- Soporta doble denominación financiera y equivalencia en miel.
-- =========================================================================
create table if not exists public.ficha_cuenta_corriente (
    id uuid default gen_random_uuid() primary key,
    apicultor_id uuid references public.apicultores(id) on delete cascade not null,
    fecha timestamp with time zone default timezone('utc'::text, now()) not null,
    moneda varchar(3) default 'ARS' not null check (moneda in ('ARS', 'USD')),
    tipo_movimiento text not null check (tipo_movimiento in ('DEBE', 'HABER')),
    monto numeric(12, 2) not null check (monto >= 0.00),
    detalle text,
    precio_referencia_miel numeric(10, 2), -- Precio de referencia de la miel al registrar
    kilos_miel_equiv numeric(10, 2),       -- Kilos equivalentes de miel (negativo en DEBE)
    tipo_transaccion text check (tipo_transaccion in ('ANTICIPO_CASH', 'RETIRO_INSUMO', 'CARGO_ENVASE', 'VENTA_LIQUIDACION', 'SALDO_INICIAL', 'AJUSTE')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- TABLA: ficha_entrega_tambores
-- Detalle unitario (tambor por tambor) de cada entrega de miel física.
-- =========================================================================
create table if not exists public.ficha_entrega_tambores (
    id uuid default gen_random_uuid() primary key,
    entrega_id uuid references public.ficha_entregas_miel(id) on delete cascade not null,
    nro_tambor varchar(50) not null,
    barras_ean varchar(100),
    lote integer,
    kilos_bruto numeric(6, 2) not null,
    tara numeric(4, 2) not null,
    kilos_neto numeric(6, 2) generated always as (kilos_bruto - tara) stored,
    color_pfund numeric(5, 2),
    humedad numeric(4, 2),
    hmf numeric(6, 2),
    antibiotico text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- TABLA: ficha_control_operculo
-- Registro analítico de entregas de opérculo bruto y retiros de cera.
-- =========================================================================
create table if not exists public.ficha_control_operculo (
    id uuid default gen_random_uuid() primary key,
    apicultor_id uuid references public.apicultores(id) on delete cascade not null,
    fecha timestamp with time zone default timezone('utc'::text, now()) not null,
    tipo_movimiento text not null check (tipo_movimiento in ('ENTREGA_OP', 'RETIRO_CERA', 'AJUSTE')),
    kilos_op numeric(10, 2) not null, -- Positivo en entregas, negativo en retiros
    rendimiento_cera numeric(3, 2) default 0.80, -- Usualmente 0.80
    detalle text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

---

## 2. Índices de Rendimiento y Búsqueda

Para asegurar tiempos de respuesta mínimos (sub-milisegundo) al consultar la ficha técnica 360° de un apicultor, se definen los siguientes índices relacionales:

```sql
-- Búsqueda rápida de apicultores por CUIT (e.g. validaciones impositivas y buscadores)
create index if not exists idx_apicultores_cuit on public.apicultores (cuit);

-- Búsquedas analíticas y filtrado de entregas por apicultor y fecha
create index if not exists idx_entregas_miel_apicultor_fecha on public.ficha_entregas_miel (apicultor_id, fecha desc);

-- Control de envases agrupado por proveedor para cálculo del Saldo en Campo
create index if not exists idx_control_envases_apicultor on public.ficha_control_envases (apicultor_id, tipo_movimiento);

-- Cuenta corriente optimizada para ordenar movimientos cronológicamente
create index if not exists idx_cuenta_corriente_apicultor_fecha on public.ficha_cuenta_corriente (apicultor_id, fecha desc);
```

---

## 3. Seguridad por Fila (Row Level Security - RLS)

Supabase requiere declarar de forma explícita el control de accesos para resguardar los datos de proveedores.

```sql
-- Habilitar RLS en todas las tablas
alter table public.apicultores enable row level security;
alter table public.ficha_entregas_miel enable row level security;
alter table public.ficha_control_envases enable row level security;
alter table public.ficha_cuenta_corriente enable row level security;
alter table public.ficha_entrega_tambores enable row level security;
alter table public.ficha_control_operculo enable row level security;

-- Políticas de lectura/escritura para usuarios autenticados
create policy "Permitir lectura completa a usuarios autenticados"
on public.apicultores for select
using (auth.role() = 'authenticated');

create policy "Permitir inserción/modificación a administradores"
on public.apicultores for all
using (auth.role() = 'authenticated');

-- Políticas equivalentes para subtablas de fichas
create policy "Lectura de entregas para autenticados"
on public.ficha_entregas_miel for select using (auth.role() = 'authenticated');

create policy "Gestión de entregas para autenticados"
on public.ficha_entregas_miel for all using (auth.role() = 'authenticated');

create policy "Lectura de envases para autenticados"
on public.ficha_control_envases for select using (auth.role() = 'authenticated');

create policy "Gestión de envases para autenticados"
on public.ficha_control_envases for all using (auth.role() = 'authenticated');

create policy "Lectura de cuenta corriente para autenticados"
on public.ficha_cuenta_corriente for select using (auth.role() = 'authenticated');

create policy "Gestión de cuenta corriente para autenticados"
on public.ficha_cuenta_corriente for all using (auth.role() = 'authenticated');

create policy "Lectura de operculo para autenticados"
on public.ficha_control_operculo for select using (auth.role() = 'authenticated');

create policy "Gestión de operculo para autenticados"
on public.ficha_control_operculo for all using (auth.role() = 'authenticated');
```

---

## 4. Triggers y Funciones de Base de Datos

### Actualización Automática de `updated_at`
Para mantener un historial preciso de auditoría de modificaciones de filas:

```sql
create or replace function public.handle_update_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Asignación de triggers
create trigger set_timestamp_apicultores
    before update on public.apicultores
    for each row execute procedure public.handle_update_timestamp();

create trigger set_timestamp_entregas
    before update on public.ficha_entregas_miel
    for each row execute procedure public.handle_update_timestamp();

create trigger set_timestamp_envases
    before update on public.ficha_control_envases
    for each row execute procedure public.handle_update_timestamp();

create trigger set_timestamp_cuenta_corriente
    before update on public.ficha_cuenta_corriente
    for each row execute procedure public.handle_update_timestamp();

create trigger set_timestamp_operculo
    before update on public.ficha_control_operculo
    for each row execute procedure public.handle_update_timestamp();
```

### Funciones Analíticas y RPCs del Sistema

#### A. Cálculo del Saldo de Tambores en Campo (Prestados - Devueltos)
```sql
create or replace function public.obtener_saldo_envases_campo(apicultor_uuid uuid)
returns integer as $$
declare
    prestados integer := 0;
    devueltos integer := 0;
begin
    select coalesce(sum(cantidad), 0) into prestados
    from public.ficha_control_envases
    where apicultor_id = apicultor_uuid and tipo_movimiento = 'PRESTAMO';

    select coalesce(sum(cantidad), 0) into devueltos
    from public.ficha_control_envases
    where apicultor_id = apicultor_uuid and tipo_movimiento = 'DEVOLUCION';

    return prestados - devueltos;
end;
$$ language plpgsql;
```

#### B. Consulta Externa de Padrón de RENAPA
Utiliza la extensión http de PostgreSQL para verificar en tiempo real el CUIT de un apicultor contra el padrón público nacional argentino de apicultores de la SAGyP.
```sql
CREATE OR REPLACE FUNCTION public.consultar_renapa(p_cuit text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response record;
  v_url text := 'https://renapa.magyp.gob.ar/publico/GetPadron';
  v_body text;
  v_clean_cuit text;
BEGIN
  -- Limpiar CUIT para contener solo dígitos
  v_clean_cuit := regexp_replace(p_cuit, '\D', '', 'g');
  
  -- Verificar longitud de CUIT
  IF length(v_clean_cuit) < 11 THEN
    RETURN json_build_object('Result', 'ERROR', 'Message', 'El CUIT debe tener al menos 11 digitos');
  END IF;

  v_body := 'NumeroRenapa=&Cuit=' || v_clean_cuit || '&RazonSocial=';

  -- Realizar la consulta HTTP POST
  SELECT status, content::text::json INTO v_response
  FROM http_post(
    v_url,
    v_body,
    'application/x-www-form-urlencoded; charset=UTF-8'
  );

  IF v_response.status = 200 THEN
    RETURN v_response.content;
  ELSE
    RETURN json_build_object('Result', 'ERROR', 'Message', 'Error de conexion con RENAPA: HTTP ' || v_response.status);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('Result', 'ERROR', 'Message', SQLERRM);
END;
$$;
```

#### C. Sincronización Automática e Ingreso de TCM desde SharePoint / Power Automate
Esta función de negocio recibe de forma individual o agregada cada tambor, comprueba si el apicultor ya existe por CUIT o por Nombre (y si no existe lo crea con un CUIT ficticio único para no bloquear el flujo de Power Automate), calcula los kilos netos, agrupa los tambores en la entrega respectiva del romaneo (o la crea si es nueva) actualizando dinámicamente los promedios analíticos de color, humedad y HMF de la entrega, e inserta o actualiza el registro unitario del tambor.
```sql
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
    -- 1. Parsear la fecha de forma robusta (soporta strings ISO y seriales numéricos de Excel)
    IF p_fecha IS NULL OR p_fecha = '' THEN
        v_fecha := now();
    ELSIF p_fecha ~ '^[0-9]+(\.[0-9]+)?$' THEN
        -- Es un número de días seriales de Excel
        v_fecha := ('1899-12-30'::timestamp + (p_fecha::numeric * interval '1 day'))::timestamp with time zone;
    ELSE
        -- Es un string de fecha estándar
        BEGIN
            v_fecha := p_fecha::timestamp with time zone;
        EXCEPTION WHEN OTHERS THEN
            v_fecha := now();
        END;
    END IF;

    -- 2. Buscar apicultor por CUIT (limpiando guiones)
    IF p_cuit IS NOT NULL AND p_cuit <> '' THEN
        SELECT id INTO v_apicultor_id
        FROM public.apicultores
        WHERE replace(cuit, '-', '') = replace(p_cuit, '-', '')
        LIMIT 1;
    END IF;

    -- Si no se encuentra por CUIT, buscar por Nombre (sin discriminar mayúsculas)
    IF v_apicultor_id IS NULL AND p_apicultor_nombre IS NOT NULL AND p_apicultor_nombre <> '' THEN
        SELECT id INTO v_apicultor_id
        FROM public.apicultores
        WHERE lower(nombre) = lower(p_apicultor_nombre)
        LIMIT 1;
    END IF;

    -- Si sigue sin existir, se crea automáticamente para evitar el bloqueo del flujo
    IF v_apicultor_id IS NULL THEN
        IF p_cuit IS NOT NULL AND p_cuit <> '' THEN
            v_dummy_cuit := p_cuit;
        ELSE
            -- Generar un CUIT único ficticio
            v_dummy_cuit := '99-' || floor(random() * 89999999 + 10000000)::text || '-9';
        END IF;

        INSERT INTO public.apicultores (nombre, cuit, localidad, etapa)
        VALUES (
            coalesce(p_apicultor_nombre, 'Apicultor CUIT: ' || v_dummy_cuit),
            v_dummy_cuit,
            'General Pico',
            'PROSPECTO'
        )
        RETURNING id INTO v_apicultor_id;
    END IF;

    -- Calcular kilos netos del tambor
    v_kilos_neto := p_kilos_bruto - p_tara;

    -- 3. Agrupación por Romaneo
    IF p_romaneo IS NOT NULL AND p_romaneo <> '' THEN
        SELECT id INTO v_entrega_id
        FROM public.ficha_entregas_miel
        WHERE apicultor_id = v_apicultor_id
          AND romaneo = p_romaneo
        LIMIT 1;
    ELSE
        -- Si no hay romaneo, agrupar por el día calendario
        SELECT id INTO v_entrega_id
        FROM public.ficha_entregas_miel
        WHERE apicultor_id = v_apicultor_id
          AND date_trunc('day', fecha) = date_trunc('day', v_fecha)
        LIMIT 1;
    END IF;

    -- Actualizar o Insertar Entrega
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

    -- 4. Registrar tambor individual
    SELECT id INTO v_tambor_id
    FROM public.ficha_entrega_tambores
    WHERE nro_tambor = p_nro_tambor;

    IF v_tambor_id IS NOT NULL THEN
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
```
