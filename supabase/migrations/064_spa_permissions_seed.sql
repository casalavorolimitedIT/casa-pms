begin;

-- 064_spa_permissions_seed
-- Add canonical spa permission grants for roles that typically operate the spa module.
insert into pms.permissions (role, permission_key) values
  ('owner', 'spa.manage'),
  ('general_manager', 'spa.manage'),
  ('supervisor', 'spa.manage'),
  ('front_desk', 'spa.manage'),
  ('concierge', 'spa.manage')
on conflict (role, permission_key) do nothing;

commit;
