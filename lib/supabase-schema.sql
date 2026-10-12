-- EYE - Denim Crafts Karachi Delivery Challan (DC) System
-- Complete PostgreSQL & Supabase DDL Migration
-- Execute this script directly in the Supabase Dashboard -> SQL Editor

-- 1. Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom ENUM Types
DO $$ BEGIN
  CREATE TYPE role_enum AS ENUM ('ADMIN', 'MANAGER', 'MERCHANDISER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE challan_status_enum AS ENUM ('OPEN', 'CLOSED', 'VOID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE entry_type_enum AS ENUM ('IN', 'OUT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role role_enum NOT NULL DEFAULT 'MERCHANDISER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Challans Table
CREATE TABLE IF NOT EXISTS public.challans (
  id TEXT PRIMARY KEY,
  dc_no TEXT UNIQUE NOT NULL,
  open_date DATE NOT NULL,
  opening_qty INTEGER NOT NULL CHECK (opening_qty > 0),
  party TEXT,
  article TEXT,
  remarks TEXT,
  status challan_status_enum NOT NULL DEFAULT 'OPEN',
  closed_date DATE,
  created_by_id TEXT NOT NULL REFERENCES public.profiles(id),
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Strict Immutability Trigger on dc_no
CREATE OR REPLACE FUNCTION prevent_dc_no_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dc_no <> OLD.dc_no THEN
    RAISE EXCEPTION 'STRICT IMMUTABILITY ENFORCED: The Delivery Challan Number (dc_no) cannot be modified once created. If misnumbered, create a new DC and void the incorrect one.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_dc_no_update ON public.challans;
CREATE TRIGGER trg_prevent_dc_no_update
BEFORE UPDATE ON public.challans
FOR EACH ROW
EXECUTE FUNCTION prevent_dc_no_update();

-- 6. Entries Table
CREATE TABLE IF NOT EXISTS public.entries (
  id TEXT PRIMARY KEY,
  challan_id TEXT NOT NULL REFERENCES public.challans(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  type entry_type_enum NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  note TEXT,
  created_by_id TEXT NOT NULL REFERENCES public.profiles(id),
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'app-settings',
  company_name TEXT NOT NULL DEFAULT 'Denim Crafts',
  stale_days INTEGER NOT NULL DEFAULT 5,
  karachi_timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_challans_dc_no ON public.challans(dc_no);
CREATE INDEX IF NOT EXISTS idx_challans_open_date ON public.challans(open_date);
CREATE INDEX IF NOT EXISTS idx_challans_status ON public.challans(status);
CREATE INDEX IF NOT EXISTS idx_entries_challan_id ON public.entries(challan_id);
CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON public.entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 10. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and service roles access
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users on profiles" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users on challans" ON public.challans FOR ALL TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users on entries" ON public.entries FOR ALL TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users on audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users on settings" ON public.settings FOR ALL TO authenticated USING (true);

-- Allow service_role bypass for backend API
CREATE POLICY IF NOT EXISTS "Service role full access on profiles" ON public.profiles FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access on challans" ON public.challans FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access on entries" ON public.entries FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access on audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access on settings" ON public.settings FOR ALL TO service_role USING (true);

-- 11. Initial Admin Profile
INSERT INTO public.profiles (id, full_name, email, role, is_active)
VALUES ('usr-admin-1', 'Usman (Admin)', 'tzkusman786@gmail.com', 'ADMIN', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, company_name, stale_days, karachi_timezone)
VALUES ('app-settings', 'Denim Crafts', 5, 'Asia/Karachi')
ON CONFLICT (id) DO NOTHING;
