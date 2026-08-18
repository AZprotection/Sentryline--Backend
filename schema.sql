-- Sentryline production schema (PostgreSQL)
-- Run with: psql "$DATABASE_URL" -f sql/schema.sql
-- Or automatically on boot via src/db.js (see README).

create extension if not exists pgcrypto;

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  badge_number text unique,
  email text unique,
  phone text,
  password_hash text not null,
  role text not null default 'GUARD' check (role in ('GUARD','ADMIN','CLIENT')),
  created_at timestamptz not null default now()
);

create table if not exists checkpoints (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  zone text not null,
  nfc_tag_id text not null unique,
  is_asset_check boolean not null default false,
  post_order text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guard_id uuid not null references users(id) on delete cascade,
  status text not null default 'OFF' check (status in ('OFF','ON','BREAK')),
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  clock_in_photo_url text,
  total_break_ms bigint not null default 0,
  last_latitude double precision,
  last_longitude double precision,
  last_accuracy_m double precision,
  last_location_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sos_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guard_id uuid not null references users(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLEARED')),
  latitude double precision,
  longitude double precision,
  triggered_at timestamptz not null default now(),
  cleared_at timestamptz
);

create table if not exists breaks (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz
);

create table if not exists checkpoint_scans (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references checkpoints(id) on delete cascade,
  shift_id uuid not null references shifts(id) on delete cascade,
  guard_id uuid not null references users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','DONE','MISSED')),
  scanned_at timestamptz,
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  method text,
  created_at timestamptz not null default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  reported_by_id uuid not null references users(id) on delete cascade,
  type text not null,
  location text not null,
  description text not null,
  severity text not null default 'MEDIUM' check (severity in ('LOW','MEDIUM','HIGH')),
  created_at timestamptz not null default now()
);

create table if not exists visitors (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  company text,
  host text,
  purpose text,
  vehicle_plate text,
  id_checked boolean not null default false,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz
);

create table if not exists activity_log_entries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guard_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  meta text,
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('PHOTO','VIDEO','AUDIO')),
  url text not null,
  incident_id uuid references incidents(id) on delete cascade,
  activity_log_entry_id uuid references activity_log_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint attachment_has_one_parent check (
    (incident_id is not null and activity_log_entry_id is null) or
    (incident_id is null and activity_log_entry_id is not null)
  )
);

create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  locked boolean not null default false,
  schedule text,
  note text
);

create table if not exists sensors (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  zone text not null,
  type text not null,
  status text not null default 'normal',
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists client_contacts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  email text,
  phone text
);

create table if not exists client_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  summary text not null,
  sent_via text,
  created_at timestamptz not null default now()
);

create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guard_id uuid not null references users(id) on delete cascade,
  course text not null,
  pct int not null default 0 check (pct >= 0 and pct <= 100),
  status text not null default 'DUE' check (status in ('COMPLETE','DUE','OVERDUE')),
  updated_at timestamptz not null default now()
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text
);

create table if not exists passdowns (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  from_guard_id uuid not null references users(id) on delete cascade,
  to_guard_id uuid references users(id) on delete set null,
  message text not null,
  priority text not null default 'normal' check (priority in ('normal','urgent')),
  acknowledged_at timestamptz,
  acknowledged_by_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists geofences (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  type text not null check (type in ('authorized','restricted')),
  center_latitude double precision not null,
  center_longitude double precision not null,
  radius_m double precision not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists geofence_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guard_id uuid not null references users(id) on delete cascade,
  geofence_id uuid not null references geofences(id) on delete cascade,
  event_type text not null check (event_type in ('entered_restricted','exited_authorized')),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkpoint_scans_shift on checkpoint_scans(shift_id);
create index if not exists idx_activity_site_created on activity_log_entries(site_id, created_at desc);
create index if not exists idx_incidents_site_created on incidents(site_id, created_at desc);
create index if not exists idx_shifts_guard on shifts(guard_id, created_at desc);
create index if not exists idx_shifts_site_status on shifts(site_id, status);
create index if not exists idx_sos_site_status on sos_events(site_id, status);
create index if not exists idx_passdowns_site_created on passdowns(site_id, created_at desc);
create index if not exists idx_geofence_events_site_created on geofence_events(site_id, created_at desc);
