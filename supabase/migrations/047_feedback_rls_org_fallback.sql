begin;
-- 047_feedback_rls_org_fallback
-- Align feedback RLS with reservation access rules so org-level staff can
-- manage surveys even when user_property_roles has not been backfilled.

----------------------------------------------------------------------------
-- feedback_tokens
----------------------------------------------------------------------------
drop policy if exists feedback_tokens_read on pms.feedback_tokens;
create policy feedback_tokens_read
on pms.feedback_tokens
for select to authenticated
using (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = feedback_tokens.reservation_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.reservations r
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where r.id = feedback_tokens.reservation_id
      and p.id = auth.uid()
  )
);

drop policy if exists feedback_tokens_insert on pms.feedback_tokens;
create policy feedback_tokens_insert
on pms.feedback_tokens
for insert to authenticated
with check (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = feedback_tokens.reservation_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.reservations r
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where r.id = feedback_tokens.reservation_id
      and p.id = auth.uid()
  )
);

----------------------------------------------------------------------------
-- feedback_entries
----------------------------------------------------------------------------
drop policy if exists feedback_entries_read on pms.feedback_entries;
create policy feedback_entries_read
on pms.feedback_entries
for select to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = feedback_entries.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = feedback_entries.property_id
      and p.id = auth.uid()
  )
);

drop policy if exists feedback_entries_update on pms.feedback_entries;
create policy feedback_entries_update
on pms.feedback_entries
for update to authenticated
using (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = feedback_entries.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = feedback_entries.property_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.user_property_roles upr
    where upr.property_id = feedback_entries.property_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.properties pr
    join pms.profiles p on p.organization_id = pr.organization_id
    where pr.id = feedback_entries.property_id
      and p.id = auth.uid()
  )
);

commit;
