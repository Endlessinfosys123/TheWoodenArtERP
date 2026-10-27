-- Khata Desk (CNC) — Migration 002: Tally-style Double-Entry Ledger Schema
-- Safe to run more than once (Idempotent).

-- 1. Account Groups (Tally Primary & Secondary Groups)
create table if not exists account_groups (
  id          text primary key,
  name        text not null unique,
  parent_id   text references account_groups(id),
  nature      text not null check (nature in ('Assets','Liabilities','Income','Expenses')),
  is_system   boolean not null default false,
  sort        integer default 0
);

-- 2. Ledgers (Accounts for Clients, Vendors, Bank, Cash, Taxes, Expenses, Incomes)
create table if not exists ledgers (
  id                 text primary key,
  name               text not null,
  group_id           text not null references account_groups(id),
  party_type         text check (party_type in ('client','vendor')),
  party_id           text,
  opening_paise      bigint not null default 0,
  opening_side       text not null default 'Dr' check (opening_side in ('Dr','Cr')),
  opening_date       date,
  gstin              text,
  state              text,
  phone              text,
  email              text,
  address            text,
  credit_days        integer default 0,
  credit_limit_paise bigint default 0,
  bill_wise          boolean not null default false,
  is_system          boolean not null default false,
  active             boolean not null default true,
  created_at         bigint not null,
  updated_at         bigint
);

-- 3. Vouchers (Header: Sales, Purchase, Receipt, Payment, Contra, Journal, Credit Note, Debit Note)
create table if not exists vouchers (
  id            text primary key,
  vtype         text not null check (vtype in ('sales','purchase','receipt','payment','contra','journal','credit_note','debit_note')),
  vno           text not null,
  fy            text not null,
  vdate         date not null,
  narration     text,
  ref_no        text,
  mode          text,
  source_type   text check (source_type in ('invoice','vendor_bill','txn','manual')),
  source_id     text,
  status        text not null default 'active' check (status in ('active','cancelled')),
  cancel_reason text,
  total_paise   bigint not null default 0,
  created_by    text,
  created_at    bigint not null,
  updated_by    text,
  updated_at    bigint
);

-- 4. Voucher Lines (Debit & Credit entries; integer paise)
create table if not exists voucher_lines (
  id         text primary key,
  voucher_id text not null references vouchers(id) on delete cascade,
  ledger_id  text not null references ledgers(id),
  dr_paise   bigint not null default 0,
  cr_paise   bigint not null default 0,
  line_no    integer not null,
  check (dr_paise >= 0 and cr_paise >= 0)
);

-- 5. Bill References (Bill-wise tracking for invoices, bills, advances, on-account)
create table if not exists bill_refs (
  id           text primary key,
  ledger_id    text not null references ledgers(id),
  ref_type     text not null check (ref_type in ('new','against','advance','on_account')),
  ref_name     text not null,
  voucher_id   text references vouchers(id) on delete cascade,
  line_id      text,
  amount_paise bigint not null,
  side         text not null check (side in ('Dr','Cr')),
  due_date     date
);

-- 6. Voucher Sequences (Row-locked numbering per vtype & financial year)
create table if not exists voucher_sequences (
  vtype   text not null,
  fy      text not null,
  last_no integer not null default 0,
  primary key (vtype, fy)
);

-- 7. Audit Log
create table if not exists audit_log (
  id        text primary key,
  entity    text not null,
  entity_id text not null,
  action    text not null,
  before    jsonb,
  after     jsonb,
  user_id   text,
  at        bigint not null
);

-- Indexes
create index if not exists voucher_lines_ledger_idx  on voucher_lines (ledger_id);
create index if not exists voucher_lines_voucher_idx on voucher_lines (voucher_id);
create index if not exists vouchers_vdate_idx        on vouchers (vdate desc);
create index if not exists vouchers_vtype_idx        on vouchers (vtype);
create index if not exists vouchers_status_idx       on vouchers (status);
create index if not exists bill_refs_ledger_ref_idx  on bill_refs (ledger_id, ref_name);
create index if not exists ledgers_party_idx         on ledgers (party_type, party_id);
create index if not exists ledgers_group_idx         on ledgers (group_id);

create unique index if not exists vouchers_source_uniq
  on vouchers (source_type, source_id)
  where source_type is not null and source_id is not null;

create unique index if not exists vouchers_vno_fy_uniq
  on vouchers (vtype, fy, vno);

-- Row Level Security
alter table account_groups    enable row level security;
alter table ledgers           enable row level security;
alter table vouchers          enable row level security;
alter table voucher_lines     enable row level security;
alter table bill_refs         enable row level security;
alter table voucher_sequences enable row level security;
alter table audit_log         enable row level security;

-- Seed Default Account Groups
insert into account_groups (id, name, parent_id, nature, is_system, sort) values
  ('grp_debtors',       'Sundry Debtors',       null, 'Assets',      true, 10),
  ('grp_creditors',     'Sundry Creditors',     null, 'Liabilities', true, 20),
  ('grp_cash',          'Cash-in-Hand',         null, 'Assets',      true, 30),
  ('grp_bank',          'Bank Accounts',        null, 'Assets',      true, 40),
  ('grp_sales',         'Sales Accounts',       null, 'Income',      true, 50),
  ('grp_purchase',      'Purchase Accounts',    null, 'Expenses',    true, 60),
  ('grp_duties',        'Duties & Taxes',       null, 'Liabilities', true, 70),
  ('grp_direct_exp',    'Direct Expenses',      null, 'Expenses',    true, 80),
  ('grp_indirect_exp',  'Indirect Expenses',    null, 'Expenses',    true, 90),
  ('grp_indirect_inc',  'Indirect Incomes',     null, 'Income',      true, 100),
  ('grp_capital',       'Capital Account',      null, 'Liabilities', true, 110),
  ('grp_loans',         'Loans (Liability)',    null, 'Liabilities', true, 120),
  ('grp_curr_assets',   'Current Assets',       null, 'Assets',      true, 130),
  ('grp_curr_liab',     'Current Liabilities',  null, 'Liabilities', true, 140)
on conflict (id) do nothing;

-- Seed Default System Ledgers
insert into ledgers (id, name, group_id, opening_paise, opening_side, bill_wise, is_system, active, created_at) values
  ('led_cash',          'Cash',                     'grp_cash',         0, 'Dr', false, true, true, 1700000000000),
  ('led_bank',          'Bank',                     'grp_bank',         0, 'Dr', false, true, true, 1700000000000),
  ('led_sales_cnc',     'Sales – CNC Job Work',     'grp_sales',        0, 'Cr', false, true, true, 1700000000000),
  ('led_sales_mat',     'Sales – Material',         'grp_sales',        0, 'Cr', false, true, true, 1700000000000),
  ('led_purch_mat',     'Purchase – Sheets/Material','grp_purchase',     0, 'Dr', false, true, true, 1700000000000),
  ('led_out_cgst',      'Output CGST',              'grp_duties',       0, 'Cr', false, true, true, 1700000000000),
  ('led_out_sgst',      'Output SGST',              'grp_duties',       0, 'Cr', false, true, true, 1700000000000),
  ('led_out_igst',      'Output IGST',              'grp_duties',       0, 'Cr', false, true, true, 1700000000000),
  ('led_in_cgst',       'Input CGST',               'grp_duties',       0, 'Dr', false, true, true, 1700000000000),
  ('led_in_sgst',       'Input SGST',               'grp_duties',       0, 'Dr', false, true, true, 1700000000000),
  ('led_in_igst',       'Input IGST',               'grp_duties',       0, 'Dr', false, true, true, 1700000000000),
  ('led_tds_rec',       'TDS Receivable',           'grp_curr_assets',  0, 'Dr', false, true, true, 1700000000000),
  ('led_round_off',     'Round Off',                'grp_indirect_exp', 0, 'Dr', false, true, true, 1700000000000),
  ('led_disc_allowed',  'Discount Allowed',         'grp_indirect_exp', 0, 'Dr', false, true, true, 1700000000000),
  ('led_disc_received', 'Discount Received',        'grp_indirect_inc', 0, 'Cr', false, true, true, 1700000000000),
  ('led_machine',       'Machine Running',          'grp_direct_exp',   0, 'Dr', false, true, true, 1700000000000),
  ('led_labour',        'Labour/Wages',             'grp_direct_exp',   0, 'Dr', false, true, true, 1700000000000),
  ('led_capital',       'Capital',                  'grp_capital',      0, 'Cr', false, true, true, 1700000000000),
  ('led_exp_rent',      'Rent',                     'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_electricity','Electricity',             'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_transport', 'Transport',                'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_fuel',      'Fuel',                     'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_repair',    'Repair',                   'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_office',    'Office',                   'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_phone',     'Phone',                    'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_food',      'Food',                     'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_tax_fees',  'Tax/Fees',                 'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_exp_other',     'Other',                    'grp_indirect_exp', 0, 'Dr', false, false, true, 1700000000000),
  ('led_inc_service',   'Service',                  'grp_indirect_inc', 0, 'Cr', false, false, true, 1700000000000),
  ('led_inc_interest',  'Interest',                 'grp_indirect_inc', 0, 'Cr', false, false, true, 1700000000000),
  ('led_inc_other',     'Other income',             'grp_indirect_inc', 0, 'Cr', false, false, true, 1700000000000)
on conflict (id) do nothing;
