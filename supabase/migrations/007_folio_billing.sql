begin;
-- 007_folio_billing

create table if not exists pms.folios (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references pms.reservations(id),
  status text not null default 'open',
  currency_code text not null,
  created_at timestamptz not null default now()
);

create table if not exists pms.folio_charges (
  id uuid primary key default gen_random_uuid(),
  folio_id uuid not null references pms.folios(id),
  amount_minor integer not null,
  category text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists pms.folio_payments (
  id uuid primary key default gen_random_uuid(),
  folio_id uuid not null references pms.folios(id),
  amount_minor integer not null,
  method text not null,
  provider text,
  provider_reference text,
  created_at timestamptz not null default now()
);

commit;
