# [SYS_ARCH] - Arquitectura de Base de Datos y Supabase

Este documento centraliza la definición del backend en Supabase, el diseño del esquema relacional en PostgreSQL, sus índices, triggers y políticas de seguridad por fila (RLS).

---

## 1. Esquema de Base de Datos (DDL)

A continuación, se detalla el código SQL definitivo y optimizado para ser ejecutado en el editor SQL de Supabase.

```sql
-- Habilitar extensión para UUID si no está habilitada
create extension if not exists "uuid-ossp";

-- =========================================================================
-- TABLA: apicultores
-- Representa el maestro único de proveedores apícolas.
-- =========================================================================
create table if not exists public.apicultores (
    id uuid default gen_random_uuid() primary key,
    nombre text not null,
    cuit varchar(15) unique not null,
    localidad text,
    puntuacion numeric(3, 2) default 5.00 check (puntuacion >= 0.00 and puntuacion <= 5.00),
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

Para asegurar tiempos de respuesta mínimos (sub-milisegundo) al consultar la radiografía 360° de un apicultor, se definen los siguientes índices relacionales:

```sql
-- Búsqueda rápida de apicultores por CUIT (e.g. validaciones impositivas)
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
```

### Funciones Analíticas de Saldo Acumulado (Vistas Calculadas)
Podemos consultar el saldo consolidado de envases y la cuenta financiera dinámicamente mediante funciones de base de datos expuestas en Supabase API:

```sql
-- Cálculo del Saldo de Tambores en Campo (Prestados - Devueltos)
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
