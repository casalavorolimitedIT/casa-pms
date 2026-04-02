-- 020_reporting
begin;

create table if not exists pms.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references pms.properties(id),
  report_key text not null,
  snapshot_date date not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

commit;
