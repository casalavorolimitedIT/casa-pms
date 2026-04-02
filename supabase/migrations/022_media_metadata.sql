begin;
-- 022_media_metadata
-- Core media/image tracking tables for all uploaded files across the PMS.
-- Every Supabase Storage upload must have a corresponding row here.

create table if not exists pms.media_metadata (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references pms.properties(id),
  bucket_name text not null,
  file_key text not null,             -- full storage path: e.g. "properties/abc/rooms/001.jpg"
  file_name text not null,
  mime_type text,
  size_bytes integer,
  width integer,                      -- px width for images
  height integer,                     -- px height for images
  duration_seconds integer,           -- for video/audio
  owner_id uuid references auth.users(id),
  guest_id uuid references pms.guests(id),
  feature_type text not null,         -- 'guest_id' | 'guest_profile' | 'room_gallery' | 'lost_found' |
                                      -- 'room_condition' | 'asset' | 'work_order' | 'menu_item' |
                                      -- 'message_attachment' | 'concierge_catalog' | 'property_branding'
  related_entity_id uuid,             -- generic FK: room_id, asset_id, work_order_id, etc.
  related_entity_type text,           -- 'room' | 'guest' | 'asset' | 'work_order' | 'reservation'
  is_primary boolean not null default false,  -- primary image for room gallery, menu items, etc.
  sort_order integer,
  alt_text text,
  expires_at timestamptz,             -- set for auto-deletion; null = permanent
  created_at timestamptz not null default now(),
  constraint unique_file_key unique (bucket_name, file_key)
);

create index if not exists idx_media_metadata_property      on pms.media_metadata(property_id);
create index if not exists idx_media_metadata_guest         on pms.media_metadata(guest_id);
create index if not exists idx_media_metadata_feature_type  on pms.media_metadata(feature_type);
create index if not exists idx_media_metadata_related       on pms.media_metadata(related_entity_id, related_entity_type);
create index if not exists idx_media_metadata_expires       on pms.media_metadata(expires_at) where expires_at is not null;

-- Immutable audit log: every upload / download / delete / share action is recorded here.
create table if not exists pms.media_audit_log (
  id uuid primary key default gen_random_uuid(),
  media_metadata_id uuid references pms.media_metadata(id),
  bucket_name text not null,          -- preserved even if metadata row is deleted
  file_key text not null,
  action text not null                -- 'upload' | 'download' | 'delete' | 'share' | 'expire'
    check (action in ('upload','download','delete','share','expire')),
  actor_id uuid references auth.users(id),
  reason text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_audit_metadata on pms.media_audit_log(media_metadata_id);
create index if not exists idx_media_audit_actor    on pms.media_audit_log(actor_id);

-- RLS: property staff can only see media for their own property.
alter table pms.media_metadata  enable row level security;
alter table pms.media_audit_log enable row level security;

-- Read: authenticated users who belong to the same property.
create policy "media_metadata_select_own_property" on pms.media_metadata
  for select to authenticated
  using (
    exists (
      select 1 from pms.user_property_roles upr
      where upr.user_id = auth.uid()
        and upr.property_id = pms.media_metadata.property_id
    )
  );

-- Insert / update: property staff only.
create policy "media_metadata_insert_own_property" on pms.media_metadata
  for insert to authenticated
  with check (
    exists (
      select 1 from pms.user_property_roles upr
      where upr.user_id = auth.uid()
        and upr.property_id = pms.media_metadata.property_id
    )
  );

create policy "media_metadata_update_own_property" on pms.media_metadata
  for update to authenticated
  using (
    exists (
      select 1 from pms.user_property_roles upr
      where upr.user_id = auth.uid()
        and upr.property_id = pms.media_metadata.property_id
    )
  );

-- Delete: property managers only (soft-delete preferred; hard-delete only via service_role).
create policy "media_metadata_delete_manager" on pms.media_metadata
  for delete to authenticated
  using (
    exists (
      select 1 from pms.user_property_roles upr
      where upr.user_id = auth.uid()
        and upr.property_id = pms.media_metadata.property_id
        and upr.role in ('property_manager','super_admin')
    )
  );

-- Audit log: service_role inserts only (immutable from application).
create policy "media_audit_log_select_own_property" on pms.media_audit_log
  for select to authenticated
  using (
    exists (
      select 1 from pms.media_metadata mm
      join pms.user_property_roles upr on upr.property_id = mm.property_id
      where mm.id = pms.media_audit_log.media_metadata_id
        and upr.user_id = auth.uid()
        and upr.role in ('property_manager','super_admin','accountant')
    )
  );

commit;
