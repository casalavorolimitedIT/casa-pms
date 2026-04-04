begin;
-- 050_media_metadata_soft_delete
-- Add soft-delete support to media_metadata for compliance/audit trails.

alter table pms.media_metadata
  add column deleted_at timestamptz;

-- Index for filtering soft-deleted rows in cleanup queries
create index if not exists idx_media_metadata_deleted_at 
  on pms.media_metadata(deleted_at) where deleted_at is null;

commit;
