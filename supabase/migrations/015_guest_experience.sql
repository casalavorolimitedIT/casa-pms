-- 015_guest_experience
begin;

create table if not exists pms.concierge_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  reservation_id uuid references pms.reservations(id),
  category text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists pms.message_threads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  guest_id uuid not null references pms.guests(id),
  channel text not null,
  created_at timestamptz not null default now()
);

create table if not exists pms.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references pms.message_threads(id),
  direction text not null,
  body text not null,
  created_at timestamptz not null default now()
);

commit;
