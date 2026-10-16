-- Khata Desk (CNC) — database schema for PostgreSQL / Supabase
-- Safe to run more than once. The server also runs this automatically on start.

create table if not exists users (
  id            text primary key,
  name          text not null,
  username      text not null unique,
  password_hash text not null,
  role          text not null default 'staff' check (role in ('admin','staff')),
  active        boolean not null default true,
  created_at    bigint not null
);

create table if not exists settings (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at bigint
);

-- Business records. Each row keeps its fields in "data" (jsonb) so the app can grow
-- without migrations. created_at / created_by are kept as columns for sorting and audit.
create table if not exists invoices      (id text primary key, data jsonb not null, created_at bigint not null, updated_at bigint, created_by text);
create table if not exists quotations    (id text primary key, data jsonb not null, created_at bigint not null, updated_at bigint, created_by text);
create table if not exists transactions  (id text primary key, data jsonb not null, created_at bigint not null, updated_at bigint, created_by text);
create table if not exists materials     (id text primary key, data jsonb not null, created_at bigint not null, updated_at bigint, created_by text);
create table if not exists stock_moves   (id text primary key, data jsonb not null, created_at bigint not null, updated_at bigint, created_by text);
create table if not exists vendors       (id text primary key, data jsonb not null, created_at bigint not null, updated_at bigint, created_by text);
create table if not exists vendor_bills  (id text primary key, data jsonb not null, created_at bigint not null, updated_at bigint, created_by text);
create table if not exists clients       (id text primary key, data jsonb not null, created_at bigint not null, updated_at bigint, created_by text);

create table if not exists files (
  id           text primary key,
  name         text,
  content_type text not null,
  size_bytes   integer not null,
  storage_path text not null,
  created_at   bigint not null,
  created_by   text
);

create index if not exists invoices_created_idx     on invoices (created_at desc);
create index if not exists quotations_created_idx   on quotations (created_at desc);
create index if not exists transactions_created_idx on transactions (created_at desc);
create index if not exists stock_moves_created_idx  on stock_moves (created_at desc);
create index if not exists vendor_bills_created_idx on vendor_bills (created_at desc);
create index if not exists clients_created_idx      on clients (created_at desc);

-- Supabase: these tables are reached only by the server (service connection),
-- so turn on Row Level Security with no policies to block the public anon API.
alter table users        enable row level security;
alter table settings     enable row level security;
alter table invoices     enable row level security;
alter table quotations   enable row level security;
alter table transactions enable row level security;
alter table materials    enable row level security;
alter table stock_moves  enable row level security;
alter table vendors      enable row level security;
alter table vendor_bills enable row level security;
alter table clients      enable row level security;
alter table files        enable row level security;

