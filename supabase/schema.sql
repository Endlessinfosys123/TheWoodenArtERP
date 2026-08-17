-- =================================================================
-- CNC JOB WORK ERP SYSTEM - COMPLETE POSTGRESQL / SUPABASE SCHEMA
-- Modules: Clients, Vendors, Material Stock Pools, Drawings,
-- 7-Stage Jobs, QC Rework Loops, Dispatch Challans, GST Invoices
-- =================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'production_manager', 'store_clerk', 'qc_inspector', 'accounts', 'operator');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE material_unit AS ENUM ('kg', 'pcs', 'mm', 'sheet', 'meter', 'sq_ft', 'sq_m', 'inch');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE material_source_type AS ENUM ('own_stock', 'client_supplied');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE stock_ledger_type AS ENUM ('grn_inward', 'issue_to_job', 'return_to_stock', 'scrap_entry');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE machine_type AS ENUM ('CNC Turning', 'VMC 3-Axis', 'VMC 4-Axis', 'VMC 5-Axis', 'CNC Lathe', 'Wire EDM', 'Grinding');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE machine_status AS ENUM ('Active', 'Maintenance', 'Offline');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('Order Received', 'Material Allocated', 'Programming', 'Machining', 'Quality Check', 'Rework', 'Ready for Dispatch', 'Delivered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE job_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE drawing_approval_status AS ENUM ('draft', 'approved', 'superseded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE qc_result AS ENUM ('pass', 'fail', 'rework');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_type AS ENUM ('labour_only', 'material_and_labour');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'unpaid', 'partially_paid', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode AS ENUM ('bank_transfer', 'upi', 'cheque', 'cash', 'credit');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. COMPANY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  gstin TEXT NOT NULL,
  state_code VARCHAR(5) NOT NULL DEFAULT '27',
  state_name TEXT NOT NULL DEFAULT 'Maharashtra',
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  bank_name TEXT,
  account_no TEXT,
  ifsc_code TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROFILES TABLE (USERS & RBAC)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLIENTS MASTER
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  gstin TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  billing_address TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state_code VARCHAR(5) NOT NULL DEFAULT '27',
  state_name TEXT NOT NULL DEFAULT 'Maharashtra',
  credit_terms TEXT DEFAULT '30 Days Net',
  payment_due_days INT DEFAULT 30,
  credit_limit NUMERIC(12, 2) DEFAULT 500000.00,
  status VARCHAR(20) DEFAULT 'active',
  outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_contact_persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. VENDORS MASTER
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  gstin TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- raw_material / outsourced_process / tooling
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  state_code VARCHAR(5) DEFAULT '27',
  address TEXT,
  outstanding_payable NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  rate_per_unit NUMERIC(10, 2) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MATERIALS MASTER & STOCK LEDGER
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'MDF',
  grade TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'sq_ft',
  hsn_code TEXT NOT NULL DEFAULT '4411',
  thickness NUMERIC(8, 2) DEFAULT 18.00,
  thickness_unit VARCHAR(10) DEFAULT 'mm',
  sheet_length NUMERIC(8, 2) DEFAULT 8.00,
  sheet_width NUMERIC(8, 2) DEFAULT 4.00,
  dimension_unit VARCHAR(10) DEFAULT 'ft',
  sqft_per_sheet NUMERIC(8, 2) DEFAULT 32.00,
  current_stock NUMERIC(10, 2) DEFAULT 0.00, -- Own Stock Qty
  reorder_level NUMERIC(10, 2) DEFAULT 50.00,
  unit_cost NUMERIC(10, 2) DEFAULT 0.00,
  batch_tracking_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_inwards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ledger_type stock_ledger_type NOT NULL DEFAULT 'grn_inward',
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  job_order_id UUID,
  source_type material_source_type NOT NULL DEFAULT 'own_stock',
  batch_no TEXT,
  heat_no TEXT,
  dimensions TEXT,
  qty NUMERIC(10, 2) NOT NULL,
  unit_rate NUMERIC(10, 2) DEFAULT 0.00,
  inward_date DATE NOT NULL DEFAULT CURRENT_DATE,
  challan_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MACHINES MASTER
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  machine_type machine_type NOT NULL,
  status machine_status DEFAULT 'Active',
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
  capacity_hours_per_day INT DEFAULT 16,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. JOB ORDERS & DRAWING VAULT
CREATE TABLE IF NOT EXISTS job_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_no TEXT UNIQUE NOT NULL,
  po_ref TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  part_number TEXT,
  drawing_ref TEXT,
  drawing_version INT DEFAULT 1,
  qty INT NOT NULL DEFAULT 1,
  material_id UUID REFERENCES materials(id),
  material_source material_source_type DEFAULT 'own_stock',
  batch_no TEXT,
  heat_no TEXT,
  machine_id UUID REFERENCES machines(id),
  operator_id UUID REFERENCES profiles(id),
  status job_status DEFAULT 'Order Received',
  priority job_priority DEFAULT 'Medium',
  due_date DATE NOT NULL,
  estimated_setup_min INT DEFAULT 60,
  estimated_cycle_min INT DEFAULT 30,
  actual_setup_min INT DEFAULT 0,
  actual_cycle_min INT DEFAULT 0,
  qr_code_token TEXT UNIQUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_sub_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  op_sequence INT NOT NULL,
  op_name TEXT NOT NULL,
  machine_id UUID REFERENCES machines(id),
  operator_name TEXT,
  estimated_min INT DEFAULT 30,
  actual_min INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL, -- pdf / image / cad
  version INT DEFAULT 1,
  is_latest BOOLEAN DEFAULT TRUE,
  approval_status drawing_approval_status DEFAULT 'draft',
  uploaded_by_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drawing_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES job_files(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  role TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. QC INSPECTION & REWORK LOOP
CREATE TABLE IF NOT EXISTS qc_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL,
  inspected_qty INT NOT NULL,
  passed_qty INT NOT NULL,
  failed_qty INT DEFAULT 0,
  result qc_result NOT NULL DEFAULT 'pass',
  defect_category TEXT,
  rework_instructions TEXT,
  root_cause TEXT,
  checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. DISPATCH & DELIVERY CHALLANS
CREATE TABLE IF NOT EXISTS dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_no TEXT UNIQUE NOT NULL,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  dispatched_qty INT NOT NULL,
  transporter TEXT NOT NULL,
  vehicle_no TEXT NOT NULL,
  driver_phone TEXT,
  lr_no TEXT,
  eway_bill_no TEXT,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. INVOICES & PAYMENTS
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no TEXT UNIQUE NOT NULL,
  financial_year TEXT NOT NULL DEFAULT 'FY 2026-27',
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  dispatch_id UUID REFERENCES dispatches(id),
  job_order_id UUID REFERENCES job_orders(id),
  invoice_type invoice_type NOT NULL DEFAULT 'labour_only',
  hsn_sac_code TEXT DEFAULT '9988',
  labour_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  material_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_interstate BOOLEAN DEFAULT FALSE,
  cgst_rate NUMERIC(5, 2) DEFAULT 9.00,
  cgst_amount NUMERIC(12, 2) DEFAULT 0.00,
  sgst_rate NUMERIC(5, 2) DEFAULT 9.00,
  sgst_amount NUMERIC(12, 2) DEFAULT 0.00,
  igst_rate NUMERIC(5, 2) DEFAULT 0.00,
  igst_amount NUMERIC(12, 2) DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(12, 2) DEFAULT 0.00,
  status invoice_status DEFAULT 'unpaid',
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  amount NUMERIC(12, 2) NOT NULL,
  mode payment_mode DEFAULT 'bank_transfer',
  reference_no TEXT,
  paid_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_jobs_client ON job_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_inwards_material ON material_inwards(material_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS and grant full select/insert/update/delete access for standard web client access
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contact_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_inwards ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sub_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access on company_settings" ON company_settings;
CREATE POLICY "Allow public access on company_settings" ON company_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on profiles" ON profiles;
CREATE POLICY "Allow public access on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on clients" ON clients;
CREATE POLICY "Allow public access on clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on client_contact_persons" ON client_contact_persons;
CREATE POLICY "Allow public access on client_contact_persons" ON client_contact_persons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on vendors" ON vendors;
CREATE POLICY "Allow public access on vendors" ON vendors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on vendor_rate_history" ON vendor_rate_history;
CREATE POLICY "Allow public access on vendor_rate_history" ON vendor_rate_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on materials" ON materials;
CREATE POLICY "Allow public access on materials" ON materials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on material_inwards" ON material_inwards;
CREATE POLICY "Allow public access on material_inwards" ON material_inwards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on machines" ON machines;
CREATE POLICY "Allow public access on machines" ON machines FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on job_orders" ON job_orders;
CREATE POLICY "Allow public access on job_orders" ON job_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on job_sub_operations" ON job_sub_operations;
CREATE POLICY "Allow public access on job_sub_operations" ON job_sub_operations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on job_files" ON job_files;
CREATE POLICY "Allow public access on job_files" ON job_files FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on drawing_comments" ON drawing_comments;
CREATE POLICY "Allow public access on drawing_comments" ON drawing_comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on qc_checks" ON qc_checks;
CREATE POLICY "Allow public access on qc_checks" ON qc_checks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on dispatches" ON dispatches;
CREATE POLICY "Allow public access on dispatches" ON dispatches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on invoices" ON invoices;
CREATE POLICY "Allow public access on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on payments" ON payments;
CREATE POLICY "Allow public access on payments" ON payments FOR ALL USING (true) WITH CHECK (true);

