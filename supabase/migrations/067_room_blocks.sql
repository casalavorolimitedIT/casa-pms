begin;

-- 067_room_blocks
-- Stores out-of-order / maintenance blocks per room so they appear on the
-- timeline calendar and prevent reservations being assigned to that room.

create table if not exists pms.room_blocks (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id) on delete cascade,
  room_id     uuid not null references pms.rooms(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,   -- exclusive (checkout-style: the block covers [start_date, end_date))
  reason      text not null default 'Maintenance',
  created_at  timestamptz not null default now(),
  check (end_date > start_date)
);

create index if not exists idx_room_blocks_property_dates
  on pms.room_blocks(property_id, start_date, end_date);

alter table pms.room_blocks enable row level security;

-- Members via user_property_roles OR org-level profiles can manage blocks
create policy room_blocks_select on pms.room_blocks
  for select to authenticated
  using (
    exists (
      select 1 from pms.user_property_roles upr
      where upr.property_id = pms.room_blocks.property_id
        and upr.user_id = auth.uid()
    ) or exists (
      select 1 from pms.properties pr
      join pms.profiles p on p.organization_id = pr.organization_id
      where pr.id = pms.room_blocks.property_id
        and p.id = auth.uid()
    )
  );

create policy room_blocks_insert on pms.room_blocks
  for insert to authenticated
  with check (
    exists (
      select 1 from pms.user_property_roles upr
      where upr.property_id = pms.room_blocks.property_id
        and upr.user_id = auth.uid()
    ) or exists (
      select 1 from pms.properties pr
      join pms.profiles p on p.organization_id = pr.organization_id
      where pr.id = pms.room_blocks.property_id
        and p.id = auth.uid()
    )
  );

create policy room_blocks_delete on pms.room_blocks
  for delete to authenticated
  using (
    exists (
      select 1 from pms.user_property_roles upr
      where upr.property_id = pms.room_blocks.property_id
        and upr.user_id = auth.uid()
    ) or exists (
      select 1 from pms.properties pr
      join pms.profiles p on p.organization_id = pr.organization_id
      where pr.id = pms.room_blocks.property_id
        and p.id = auth.uid()
    )
  );

commit;
