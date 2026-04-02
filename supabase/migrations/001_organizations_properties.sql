begin;
-- 001_organizations_properties

create extension if not exists pgcrypto;
create schema if not exists pms;

create table if not exists pms.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists pms.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references pms.organizations(id),
  name text not null,
  currency_code text not null default 'USD',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists pms.property_settings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references pms.properties(id),
  check_in_time time not null default '15:00',
  check_out_time time not null default '11:00',
  created_at timestamptz not null default now()
);

commit;
