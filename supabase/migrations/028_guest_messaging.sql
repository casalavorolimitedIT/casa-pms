begin;
-- 028_guest_messaging

alter table pms.message_threads
  add column if not exists reservation_id uuid references pms.reservations(id),
  add column if not exists external_address text,
  add column if not exists status text not null default 'open' check (status in ('open', 'waiting_on_guest', 'waiting_on_staff', 'closed')),
  add column if not exists last_message_at timestamptz not null default now(),
  add column if not exists last_message_preview text,
  add column if not exists unread_count integer not null default 0 check (unread_count >= 0),
  add column if not exists read_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table pms.messages
  add column if not exists channel text not null default 'sms' check (channel in ('sms', 'whatsapp', 'email')),
  add column if not exists status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'received', 'failed', 'read')),
  add column if not exists template_key text,
  add column if not exists external_message_id text,
  add column if not exists external_address text,
  add column if not exists created_by uuid references pms.profiles(id),
  add column if not exists read_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

update pms.message_threads thread
set
  last_message_at = coalesce(message_summary.last_message_at, thread.created_at),
  last_message_preview = coalesce(message_summary.last_message_preview, thread.last_message_preview),
  updated_at = coalesce(message_summary.last_message_at, thread.updated_at)
from (
  select distinct on (thread_id)
    thread_id,
    created_at as last_message_at,
    left(regexp_replace(body, '\s+', ' ', 'g'), 140) as last_message_preview
  from pms.messages
  order by thread_id, created_at desc
) as message_summary
where thread.id = message_summary.thread_id;

create index if not exists message_threads_property_activity_idx
  on pms.message_threads(property_id, last_message_at desc);

create index if not exists message_threads_external_address_idx
  on pms.message_threads(external_address, last_message_at desc);

create index if not exists messages_thread_created_idx
  on pms.messages(thread_id, created_at asc);

create index if not exists messages_external_id_idx
  on pms.messages(external_message_id);

alter table pms.message_threads enable row level security;
alter table pms.messages enable row level security;

drop policy if exists message_threads_read on pms.message_threads;
create policy message_threads_read
on pms.message_threads
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = message_threads.property_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists message_threads_insert on pms.message_threads;
create policy message_threads_insert
on pms.message_threads
for insert to authenticated
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = message_threads.property_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists message_threads_update on pms.message_threads;
create policy message_threads_update
on pms.message_threads
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = message_threads.property_id
      and upr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = message_threads.property_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists messages_read on pms.messages;
create policy messages_read
on pms.messages
for select to authenticated
using (
  exists (
    select 1
    from pms.message_threads thread
    join pms.user_property_roles upr on upr.property_id = thread.property_id
    where thread.id = messages.thread_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists messages_insert on pms.messages;
create policy messages_insert
on pms.messages
for insert to authenticated
with check (
  exists (
    select 1
    from pms.message_threads thread
    join pms.user_property_roles upr on upr.property_id = thread.property_id
    where thread.id = messages.thread_id
      and upr.user_id = auth.uid()
  )
);

drop policy if exists messages_update on pms.messages;
create policy messages_update
on pms.messages
for update to authenticated
using (
  exists (
    select 1
    from pms.message_threads thread
    join pms.user_property_roles upr on upr.property_id = thread.property_id
    where thread.id = messages.thread_id
      and upr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.message_threads thread
    join pms.user_property_roles upr on upr.property_id = thread.property_id
    where thread.id = messages.thread_id
      and upr.user_id = auth.uid()
  )
);

commit;