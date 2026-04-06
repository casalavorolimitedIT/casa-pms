-- Add optional description column to spa_services
alter table pms.spa_services
  add column if not exists description text check (char_length(description) <= 500);
