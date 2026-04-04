begin;
-- 049_media_phase2_buckets_housekeeping_ops
-- Phase 2 media: housekeeping operations, lost & found, and operational buckets.

----------------------------------------------------------------------------
-- Phase 2 buckets (M04, M05, M07)
----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'housekeeping-condition',
    'housekeeping-condition',
    false,
    5242880,
    array['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'lost-and-found',
    'lost-and-found',
    false,
    3145728,
    array['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'cleaning-tasks',
    'cleaning-tasks',
    false,
    2097152,
    array['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'maintenance-proof',
    'maintenance-proof',
    false,
    5242880,
    array['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'guest-messages-media',
    'guest-messages-media',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','application/pdf']::text[]
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

----------------------------------------------------------------------------
-- RLS on storage.objects for phase 2 private buckets
-- (housekeeping-condition, lost-and-found, cleaning-tasks, maintenance-proof, guest-messages-media)
----------------------------------------------------------------------------
drop policy if exists media_phase2_buckets_read on storage.objects;
create policy media_phase2_buckets_read
on storage.objects
for select to authenticated
using (
  bucket_id in ('housekeeping-condition', 'lost-and-found', 'cleaning-tasks', 'maintenance-proof', 'guest-messages-media')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);

drop policy if exists media_phase2_buckets_insert on storage.objects;
create policy media_phase2_buckets_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id in ('housekeeping-condition', 'lost-and-found', 'cleaning-tasks', 'maintenance-proof', 'guest-messages-media')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);

drop policy if exists media_phase2_buckets_update on storage.objects;
create policy media_phase2_buckets_update
on storage.objects
for update to authenticated
using (
  bucket_id in ('housekeeping-condition', 'lost-and-found', 'cleaning-tasks', 'maintenance-proof', 'guest-messages-media')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
)
with check (
  bucket_id in ('housekeeping-condition', 'lost-and-found', 'cleaning-tasks', 'maintenance-proof', 'guest-messages-media')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);

drop policy if exists media_phase2_buckets_delete on storage.objects;
create policy media_phase2_buckets_delete
on storage.objects
for delete to authenticated
using (
  bucket_id in ('housekeeping-condition', 'lost-and-found', 'cleaning-tasks', 'maintenance-proof', 'guest-messages-media')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
      and upr.role in ('property_manager', 'super_admin', 'housekeeping_manager', 'engineering_manager')
  )
);

commit;
