begin;

-- Ensure staff with property access can read/write folios and folio ledger rows.
-- Folios are scoped through reservation -> property.

alter table if exists pms.folio_charges enable row level security;
alter table if exists pms.folio_payments enable row level security;

create policy folios_select_property_access_v1
on pms.folios
for select to authenticated
using (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = folios.reservation_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.reservations r
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where r.id = folios.reservation_id
      and p.id = auth.uid()
  )
);

create policy folios_insert_property_access_v1
on pms.folios
for insert to authenticated
with check (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = folios.reservation_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.reservations r
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where r.id = folios.reservation_id
      and p.id = auth.uid()
  )
);

create policy folios_update_property_access_v1
on pms.folios
for update to authenticated
using (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = folios.reservation_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.reservations r
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where r.id = folios.reservation_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.reservations r
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where r.id = folios.reservation_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.reservations r
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where r.id = folios.reservation_id
      and p.id = auth.uid()
  )
);

create policy folio_charges_select_property_access_v1
on pms.folio_charges
for select to authenticated
using (
  exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where f.id = folio_charges.folio_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where f.id = folio_charges.folio_id
      and p.id = auth.uid()
  )
);

create policy folio_charges_insert_property_access_v1
on pms.folio_charges
for insert to authenticated
with check (
  exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where f.id = folio_charges.folio_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where f.id = folio_charges.folio_id
      and p.id = auth.uid()
  )
);

create policy folio_charges_update_property_access_v1
on pms.folio_charges
for update to authenticated
using (
  exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where f.id = folio_charges.folio_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where f.id = folio_charges.folio_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where f.id = folio_charges.folio_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where f.id = folio_charges.folio_id
      and p.id = auth.uid()
  )
);

create policy folio_payments_select_property_access_v1
on pms.folio_payments
for select to authenticated
using (
  exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where f.id = folio_payments.folio_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where f.id = folio_payments.folio_id
      and p.id = auth.uid()
  )
);

create policy folio_payments_insert_property_access_v1
on pms.folio_payments
for insert to authenticated
with check (
  exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where f.id = folio_payments.folio_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where f.id = folio_payments.folio_id
      and p.id = auth.uid()
  )
);

create policy folio_payments_update_property_access_v1
on pms.folio_payments
for update to authenticated
using (
  exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where f.id = folio_payments.folio_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where f.id = folio_payments.folio_id
      and p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.user_property_roles upr on upr.property_id = r.property_id
    where f.id = folio_payments.folio_id
      and upr.user_id = auth.uid()
  )
  or exists (
    select 1
    from pms.folios f
    join pms.reservations r on r.id = f.reservation_id
    join pms.properties pr on pr.id = r.property_id
    join pms.profiles p on p.organization_id = pr.organization_id
    where f.id = folio_payments.folio_id
      and p.id = auth.uid()
  )
);

commit;
