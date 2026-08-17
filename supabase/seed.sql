-- =================================================================
-- CNC JOB WORK ERP SYSTEM - INITIAL SEED DATA
-- Run this in Supabase SQL Editor to populate initial data
-- =================================================================

-- 1. COMPANY SETTINGS
INSERT INTO company_settings (
  id, company_name, gstin, state_code, state_name, address, phone, email, bank_name, account_no, ifsc_code, branch
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Precision CNC Machining & Engineering Works',
  '27AAACP9988C1Z4',
  '27',
  'Maharashtra',
  'Plot 88, Sector 10, MIDC Industrial Area, Bhosari, Pune, MH - 411026',
  '+91 20 2712 8899 / +91 98220 99887',
  'operations@precisioncncworks.com',
  'HDFC Bank Ltd',
  '50200049811204',
  'HDFC0000241',
  'MIDC Bhosari Pune Branch'
) ON CONFLICT (id) DO NOTHING;

-- 2. PROFILES
INSERT INTO profiles (id, email, full_name, phone, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@cncerp.com', 'Vikramaditya Rao', '+91 98110 00111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'pm@cncerp.com', 'Suresh Patil', '+91 98220 22334', 'production_manager'),
  ('33333333-3333-3333-3333-333333333333', 'operator.vmc@cncerp.com', 'Ramesh Pawar (VMC)', '+91 98330 44556', 'operator'),
  ('44444444-4444-4444-4444-444444444444', 'accounts@cncerp.com', 'Priya Kulkarni', '+91 98440 66778', 'accounts'),
  ('55555555-5555-5555-5555-555555555555', 'store@cncerp.com', 'Mahesh Shinde', '+91 98550 88990', 'store_clerk'),
  ('66666666-6666-6666-6666-666666666666', 'qc@cncerp.com', 'Anand Deshmukh', '+91 98660 11223', 'qc_inspector')
ON CONFLICT (id) DO NOTHING;

-- 3. MACHINES
INSERT INTO machines (id, name, code, machine_type, status, hourly_rate, capacity_hours_per_day) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'VMC 3-Axis Heavy Duty (Haas VF-2)', 'MAC-VMC-01', 'VMC 3-Axis', 'Active', 1200.00, 16),
  ('a2222222-2222-2222-2222-222222222222', 'VMC 5-Axis Precision (Doosan DVF 5000)', 'MAC-VMC-02', 'VMC 5-Axis', 'Active', 2500.00, 16),
  ('a3333333-3333-3333-3333-333333333333', 'CNC Turning Center (Mazak Quick Turn)', 'MAC-CNC-01', 'CNC Turning', 'Active', 950.00, 16),
  ('a4444444-4444-4444-4444-444444444444', 'CNC Lathe Dual Turret (Ace Micromatic)', 'MAC-CNC-02', 'CNC Lathe', 'Maintenance', 800.00, 12),
  ('a5555555-5555-5555-5555-555555555555', 'Wire EDM Precision (Mitsubishi MV2400)', 'MAC-EDM-01', 'Wire EDM', 'Active', 1500.00, 16)
ON CONFLICT (id) DO NOTHING;

-- 4. VENDORS
INSERT INTO vendors (id, vendor_name, gstin, category, contact_person, phone, email, city, state_code, address, outstanding_payable) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Hindalco Metals & Alloys Ltd', '27AAACH8899A1Z1', 'raw_material', 'Subhash Mehta', '+91 98230 44112', 'sales@hindalco-dist.com', 'Pune', '27', 'Gate 4, Chakan Industrial Phase 1, Pune', 125000.00),
  ('b2222222-2222-2222-2222-222222222222', 'Apex Surface Heat Treaters', '27AABCA7766K1Z8', 'outsourced_process', 'Sunil Jagtap', '+91 94220 55331', 'heattreat@apexsurface.in', 'Bhosari Pune', '27', 'S-45, MIDC Bhosari, Pune', 34000.00),
  ('b3333333-3333-3333-3333-333333333333', 'Sandvik Coromant Tooling India', '27AAACS1122D1Z3', 'tooling', 'Rahul Verma', '+91 98900 88776', 'r.verma@sandvik.com', 'Pune', '27', 'Dapodi Industrial Zone, Pune', 18500.00)
ON CONFLICT (id) DO NOTHING;

-- 5. CLIENTS
INSERT INTO clients (id, company_name, gstin, contact_person, phone, email, billing_address, shipping_address, city, state_code, state_name, credit_terms, payment_due_days, credit_limit, status, outstanding_balance) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Apex AeroTech Solutions Pvt Ltd', '27AAACA1234A1Z5', 'Rajesh Sharma', '+91 98220 11223', 'rajesh@apexaero.com', 'Plot 42, MIDC Bhosari, Pune, MH - 411026', 'Plant 2, Chakan Phase II, Pune, MH', 'Pune', '27', 'Maharashtra', '30 Days Net', 30, 1000000.00, 'active', 147500.00),
  ('c2222222-2222-2222-2222-222222222222', 'Bharat Heavy Dynamics Ltd', '27AAACB5678B1Z9', 'Amitabh Sen', '+91 98190 33445', 'a.sen@bharatdynamics.co.in', 'Building 7, Electronic Zone, Hinjewadi, Pune, MH', 'Building 7, Electronic Zone, Hinjewadi, Pune, MH', 'Pune', '27', 'Maharashtra', '45 Days Net', 45, 1500000.00, 'active', 88500.00),
  ('c3333333-3333-3333-3333-333333333333', 'Precision Hydraulic Motors Inc', '29AAACP9999C1Z0', 'Karan Patel', '+91 98450 77889', 'karan@precisionhyd.com', 'Industrial Suburb, Peenya 2nd Stage, Bengaluru, KA - 560058', 'Industrial Suburb, Peenya 2nd Stage, Bengaluru, KA - 560058', 'Bengaluru', '29', 'Karnataka', '15 Days Net', 15, 500000.00, 'active', 0.00)
ON CONFLICT (id) DO NOTHING;

-- 6. MATERIALS
INSERT INTO materials (id, name, category, grade, unit, hsn_code, thickness, thickness_unit, sheet_length, sheet_width, dimension_unit, sqft_per_sheet, current_stock, reorder_level, unit_cost, batch_tracking_enabled) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'HDMR MDF Sheet 18mm (8ft x 4ft)', 'MDF', 'HDMR Exterior Grade', 'sq_ft', '4411', 18.00, 'mm', 8.00, 4.00, 'ft', 32.00, 640.00, 160.00, 85.00, true),
  ('d2222222-2222-2222-2222-222222222222', 'Corian Solid Surface Sheet 12mm (8ft x 4ft)', 'Corian', 'Polymer Acrylic Solid Surface', 'sq_ft', '3920', 12.00, 'mm', 8.00, 4.00, 'ft', 32.00, 320.00, 96.00, 280.00, true),
  ('d3333333-3333-3333-3333-333333333333', 'Teak Wooden Plywood 19mm (8ft x 4ft)', 'Wooden', 'BWP Grade 710', 'sq_ft', '4412', 19.00, 'mm', 8.00, 4.00, 'ft', 32.00, 128.00, 200.00, 135.00, false),
  ('d4444444-4444-4444-4444-444444444444', 'Mild Steel Sheet 2mm (8ft x 4ft)', 'MS', 'CRCA IS 513', 'kg', '7209', 2.00, 'mm', 8.00, 4.00, 'ft', 32.00, 450.00, 100.00, 75.00, true),
  ('d5555555-5555-5555-5555-555555555555', 'Stainless Steel Sheet 304 3mm (8ft x 4ft)', 'SS', 'SS304 2B Finish', 'kg', '7219', 3.00, 'mm', 8.00, 4.00, 'ft', 32.00, 220.00, 80.00, 280.00, true),
  ('d6666666-6666-6666-6666-666666666666', 'Cast Acrylic Sheet Clear 6mm (8ft x 4ft)', 'Acrylic', 'High Clarity PMMA', 'sq_ft', '3920', 6.00, 'mm', 8.00, 4.00, 'ft', 32.00, 192.00, 64.00, 165.00, true)
ON CONFLICT (id) DO NOTHING;
