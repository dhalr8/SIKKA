-- ============================================================
-- SIKKA database schema + seed data  (SWE2 Phase 1)
-- Run this in Supabase -> SQL Editor -> New query -> Run.
-- Passwords are stored ONLY as salt + salted SHA-256 hash
-- (this is the "database authentication" protection layer).
-- ============================================================

create table if not exists users (
  id       serial primary key,
  username text unique not null,
  salt     text not null,
  hash     text not null,
  role     text not null,
  name     text
);

create table if not exists schedules (
  id     text primary key,
  route  text not null,
  dep    text,
  arr    text,
  seats  integer not null,
  booked integer not null default 0,
  price  numeric not null,
  status text not null default 'ACTIVE'
);

create table if not exists passengers (
  id    serial primary key,
  name  text not null,
  nid   text unique not null,
  phone text,
  email text
);

create table if not exists reservations (
  id        text primary key,
  passenger text,
  train     text,
  train_id  text,
  date      text,
  seat      text,
  status    text not null default 'Confirmed',
  price     numeric
);
-- for databases created before train_id existed:
alter table reservations add column if not exists train_id text;

create table if not exists audit_log (
  id      serial primary key,
  ts      timestamptz not null default now(),
  actor   text,
  action  text,
  detail  text
);

-- ---- Seed users (hashed; plaintext for testing only) ----
-- admin / admin123   staff1 / staff123   staff2 / staff123
insert into users (username, salt, hash, role, name) values
  ('admin',  'a1b2c3d4e5f60718', '9879a6c081970a685052bdaf0cba84347009c2f6f758c7a05257f5dcd6485ca8', 'Administrator', 'dhay'),
  ('staff1', '9f8e7d6c5b4a3021', '7fddc2d7eb42c79a594f7a854da653b52c1c3a8aaa10481c0a8c531a8240611e', 'Staff', 'Danah'),
  ('staff2', '1122334455667788', '63fe39a65e6d0f9b06f14be1a50aa67c5847aa67b39cbaf5ab5004cccae42d28', 'Staff', 'Lana')
on conflict (username) do nothing;

-- ---- Seed schedules ----
insert into schedules (id, route, dep, arr, seats, booked, price, status) values
  ('TRN-001', 'RIYADH TO JEDDAH', 'Apr 3, 2026 9:41 AM', 'Apr 9, 2026 11:15 AM', 120, 63, 50, 'ACTIVE'),
  ('TRN-002', 'JEDDAH TO RIYADH', 'May 9, 2026 7:00 PM', 'May 15, 2026 9:41 AM', 200, 200, 90, 'FULL'),
  ('TRN-003', 'RIYADH TO DAMMAM', 'Apr 1, 2026 9:41 AM', 'Apr 3, 2026 3:30 AM', 80, 0, 45, 'ACTIVE')
on conflict (id) do nothing;

-- ---- Seed passengers ----
insert into passengers (name, nid, phone, email) values
  ('Fatima Khaldi', '123670376', '555893790', 'Fatima@outlook.com'),
  ('Ahmad Fahad',   '114675376', '5890679243', 'Ahmad@outlook.com')
on conflict (nid) do nothing;

-- ---- Seed reservations (reference REAL schedule routes) ----
insert into reservations (id, passenger, train, date, seat, status, price) values
  ('#BK-00331', 'Fatima Khaldi', 'RIYADH TO JEDDAH', '10/03/2026', '3D', 'Confirmed', 50),
  ('#BK-00341', 'Ahmad Fahad',   'RIYADH TO DAMMAM', '14/05/2026', '12B', 'Cancelled', 45)
on conflict (id) do nothing;

-- ============================================================
-- DEMO ACCESS: allow the anon (publishable) key to read/write.
-- NOTE for the security report: disabling RLS is acceptable for a
-- course demo, but a production system MUST enable RLS with policies.
-- ============================================================
alter table users        disable row level security;
alter table schedules    disable row level security;
alter table passengers   disable row level security;
alter table reservations disable row level security;
alter table audit_log    disable row level security;
