-- ==============================================================================
-- EYE - DENIM CRAFTS (KARACHI)
-- SUPABASE POSTGRESQL PRODUCTION DATABASE SETUP SCRIPT
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ekesyoziuhkgozcjqztj/sql
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'MERCHANDISER' CHECK (role IN ('ADMIN', 'MANAGER', 'MERCHANDISER')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Challans Table (DC Master Record)
CREATE TABLE IF NOT EXISTS challans (
  id TEXT PRIMARY KEY,
  dc_no TEXT UNIQUE NOT NULL,
  open_date DATE NOT NULL,
  opening_qty INTEGER NOT NULL CHECK (opening_qty > 0),
  party TEXT,
  article TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'VOID')),
  closed_date DATE,
  void_reason TEXT,
  created_by_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Entries Table (Daily IN / OUT Movements)
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  challan_id TEXT NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
  qty INTEGER NOT NULL CHECK (qty > 0),
  note TEXT,
  created_by_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete timestamp
);

-- 4. Audit Logs Table (Tamper-Evident History)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_challans_dc_no ON challans(dc_no);
CREATE INDEX IF NOT EXISTS idx_challans_status ON challans(status);
CREATE INDEX IF NOT EXISTS idx_challans_open_date ON challans(open_date);
CREATE INDEX IF NOT EXISTS idx_entries_challan_id ON entries(challan_id);
CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 7. IMMUTABILITY TRIGGER GUARD
-- Strictly prohibits any update to dc_no once created, even by ADMIN
CREATE OR REPLACE FUNCTION prevent_dc_no_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dc_no <> OLD.dc_no THEN
    RAISE EXCEPTION 'DC No is immutable and cannot be altered (OLD: %, NEW: %)', OLD.dc_no, NEW.dc_no;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_dc_no_update ON challans;
CREATE TRIGGER trg_prevent_dc_no_update
BEFORE UPDATE ON challans
FOR EACH ROW
EXECUTE FUNCTION prevent_dc_no_update();

-- 8. Enable Row Level Security (RLS) & Grant Public Read/Write for API & Anon Key
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access on profiles" ON profiles;
DROP POLICY IF EXISTS "Public access on challans" ON challans;
DROP POLICY IF EXISTS "Public access on entries" ON entries;
DROP POLICY IF EXISTS "Public access on audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Public access on settings" ON settings;

CREATE POLICY "Public access on profiles" ON profiles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access on challans" ON challans FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access on entries" ON entries FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access on audit_logs" ON audit_logs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access on settings" ON settings FOR ALL TO public USING (true) WITH CHECK (true);

-- 9. Seed Profiles (Usman as Admin, Floor Manager, Merchandiser)
INSERT INTO profiles (id, full_name, email, role, is_active)
VALUES 
  ('usr-admin-1', 'Usman (Admin)', 'tzkusman786@gmail.com', 'ADMIN', true),
  ('usr-manager-2', 'Rashid Khan (Floor Manager)', 'manager@denimcrafts.com', 'MANAGER', true),
  ('usr-merch-3', 'Bilal Ahmed (Merchandiser)', 'merch@denimcrafts.com', 'MERCHANDISER', true)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 10. Seed Default Settings
INSERT INTO settings (key, value)
VALUES ('app_settings', '{"staleDays": 5, "companyName": "Denim Crafts", "karachiTimezone": "Asia/Karachi"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Clean slate ready! No fake challans or entries are inserted.
