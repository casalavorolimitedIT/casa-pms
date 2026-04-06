-- 070_media_public_buckets.sql
-- Public storage buckets for room gallery, F&B menu media, and property branding.
-- These are public-read (no signed URL needed) as they serve OTA/website display.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'room-gallery',
    'room-gallery',
    true,
    3145728,
    array['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'fnb-menu-media',
    'fnb-menu-media',
    true,
    2097152,
    array['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'property-branding',
    'property-branding',
    true,
    2097152,
    array['image/jpeg','image/png','image/webp','image/svg+xml']::text[]
  )
on conflict (id) do update
set
  name        = excluded.name,
  public      = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─── RLS: public read (anyone can view public bucket objects) ─────────────────
drop policy if exists media_public_buckets_read on storage.objects;
create policy media_public_buckets_read
on storage.objects
for select to public
using (
  bucket_id in ('room-gallery', 'fnb-menu-media', 'property-branding')
);

-- ─── RLS: authenticated staff can insert ──────────────────────────────────────
drop policy if exists media_public_buckets_insert on storage.objects;
create policy media_public_buckets_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id in ('room-gallery', 'fnb-menu-media', 'property-branding')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);

-- ─── RLS: authenticated staff can update their own uploads ───────────────────
drop policy if exists media_public_buckets_update on storage.objects;
create policy media_public_buckets_update
on storage.objects
for update to authenticated
using (
  bucket_id in ('room-gallery', 'fnb-menu-media', 'property-branding')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);

-- ─── RLS: authenticated staff can delete ──────────────────────────────────────
drop policy if exists media_public_buckets_delete on storage.objects;
create policy media_public_buckets_delete
on storage.objects
for delete to authenticated
using (
  bucket_id in ('room-gallery', 'fnb-menu-media', 'property-branding')
  and exists (
    select 1
    from pms.user_property_roles upr
    where upr.user_id = auth.uid()
      and upr.property_id = pms.storage_property_id_from_key(name)
  )
);
