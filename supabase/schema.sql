-- ==============================================================================
-- SORA COCINA CASERA - ESQUEMA SUPABASE Y CONTROL DE ROLES
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ==============================================================================

-- 1. Crear el enum de roles permitidos
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'coadmin', 'delivery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Crear la tabla 'profiles'
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role user_role DEFAULT 'delivery' NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Migración segura para bases de datos existentes:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden leer su propio perfil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins pueden ver todos los perfiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins pueden actualizar cualquier perfil"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins pueden eliminar cualquier perfil"
    ON public.profiles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Trigger automático al registrar un nuevo usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN (NEW.raw_user_meta_data->>'role') IN ('admin', 'coadmin', 'delivery') 
            THEN (NEW.raw_user_meta_data->>'role')::public.user_role 
            ELSE 'delivery'::public.user_role 
        END,
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW; -- Evita bloquear la creación del usuario en Auth si ocurre algún error
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 4. TABLAS DE CLIENTES Y DIRECCIONES GEOLOCALIZADAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL, -- ej. 'Casa', 'Oficina', 'Negocio', 'Taller'
    address TEXT NOT NULL,
    reference TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de clientes para usuarios autenticados" ON public.clients;
CREATE POLICY "Lectura de clientes para usuarios autenticados"
    ON public.clients FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Escritura de clientes para usuarios autenticados" ON public.clients;
CREATE POLICY "Escritura de clientes para usuarios autenticados"
    ON public.clients FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura de direcciones para usuarios autenticados" ON public.client_addresses;
CREATE POLICY "Lectura de direcciones para usuarios autenticados"
    ON public.client_addresses FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Escritura de direcciones para usuarios autenticados" ON public.client_addresses;
CREATE POLICY "Escritura de direcciones para usuarios autenticados"
    ON public.client_addresses FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 5. TABLA 'expenses' (Control y Registro de Gastos)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('insumos', 'empaques', 'transporte', 'servicios', 'nomina', 'otros')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de gastos para admin y coadmin"
    ON public.expenses FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Escritura de gastos para admin y coadmin"
    ON public.expenses FOR ALL
    USING (auth.role() = 'authenticated');

-- ==============================================================================
-- 6. TABLA 'orders' (Ventas, Creación y Despacho de Pedidos)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    address_id UUID REFERENCES public.client_addresses(id) ON DELETE SET NULL,
    address_label TEXT,
    address TEXT NOT NULL,
    address_reference TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    delivery_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    delivery_user_name TEXT,
    status TEXT NOT NULL DEFAULT 'Pendiente',
    delivery_date DATE DEFAULT CURRENT_DATE,
    delivery_time TEXT,
    production_reminder_time TEXT,
    is_scheduled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Migración segura para tablas existentes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_time TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS production_reminder_time TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS con WITH CHECK para permitir inserción y actualización sin bloqueos
DROP POLICY IF EXISTS "Lectura de pedidos para usuarios autenticados" ON public.orders;
CREATE POLICY "Lectura de pedidos para usuarios autenticados"
    ON public.orders FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Escritura de pedidos para autenticados" ON public.orders;
CREATE POLICY "Escritura de pedidos para autenticados"
    ON public.orders FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura de clientes para usuarios autenticados" ON public.clients;
CREATE POLICY "Lectura de clientes para usuarios autenticados"
    ON public.clients FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Escritura de clientes para usuarios autenticados" ON public.clients;
CREATE POLICY "Escritura de clientes para usuarios autenticados"
    ON public.clients FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura de direcciones para usuarios autenticados" ON public.client_addresses;
CREATE POLICY "Lectura de direcciones para usuarios autenticados"
    ON public.client_addresses FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Escritura de direcciones para usuarios autenticados" ON public.client_addresses;
CREATE POLICY "Escritura de direcciones para usuarios autenticados"
    ON public.client_addresses FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura de gastos para admin y coadmin" ON public.expenses;
CREATE POLICY "Lectura de gastos para admin y coadmin"
    ON public.expenses FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Escritura de gastos para admin y coadmin" ON public.expenses;
CREATE POLICY "Escritura de gastos para admin y coadmin"
    ON public.expenses FOR ALL
    USING (true)
    WITH CHECK (true);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
