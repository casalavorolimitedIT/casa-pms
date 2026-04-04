begin;
-- 053_drop_lost_found_image_url
-- Lost & found evidence now lives exclusively in media_metadata/storage.

alter table pms.lost_found_items
  drop column if exists image_url;

commit;