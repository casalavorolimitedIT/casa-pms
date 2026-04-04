begin;
-- 048_media_core_buckets_storage_rls
-- Phase 1 media foundation: core storage buckets and object-level RLS policies.

----------------------------------------------------------------------------
-- Core buckets (M01)
----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'guest-documents',
    'guest-documents',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp','application/pdf']::text[]
  ),
  (
    'guest-profiles',
    'guest-profiles',
    false,
    2097152,
    array['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'asset-registry',
    'asset-registry',
    false,
    5242880,
    array['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'work-order-photos',
    'work-order-photos',
    false,
    5242880,
    array['image/jpeg','image/png','image/webp']::text[]
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

----------------------------------------------------------------------------
-- Helper: safely extract property UUID from storage object path
-- Expected key format: properties/<property_uuid>/<feature>/...
----------------------------------------------------------------------------
create or replace function pms.storage_property_id_from_key(object_name text)
returns uuid
language sql
stable
as $$
  select
    case
      when split_part(object_name, '/', 1) = 'properties'
       and split_part(object_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 2)::uuid
      else null
    end;
$$;

----------------------------------------------------------------------------
-- RLS on storage.objects for core private buckets
----------------------------------------------------------------------------
drop policy if exists media_core_buckets_read on storage.objects;
create policy media_core_buckets_read
on storage.objects
for select to authenticated
using (
  bucket_id in ('guest-documents', 'guest-profiles', 'asset-registry', 'work-order-photos')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);

drop policy if exists media_core_buckets_insert on storage.objects;
create policy media_core_buckets_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id in ('guest-documents', 'guest-profiles', 'asset-registry', 'work-order-photos')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);

drop policy if exists media_core_buckets_update on storage.objects;
create policy media_core_buckets_update
on storage.objects
for update to authenticated
using (
  bucket_id in ('guest-documents', 'guest-profiles', 'asset-registry', 'work-order-photos')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
)
with check (
  bucket_id in ('guest-documents', 'guest-profiles', 'asset-registry', 'work-order-photos')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);

drop policy if exists media_core_buckets_delete on storage.objects;
create policy media_core_buckets_delete
on storage.objects
for delete to authenticated
using (
  bucket_id in ('guest-documents', 'guest-profiles', 'asset-registry', 'work-order-photos')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
      and upr.role in ('property_manager', 'super_admin')
  )
);

commit;
