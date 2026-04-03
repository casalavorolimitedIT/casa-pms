-- Grant PostgREST roles access to the pms schema and all its tables/sequences.
-- Without USAGE on the schema, Postgres raises "permission denied for schema pms"
-- before RLS policies even run.

grant usage on schema pms to anon, authenticated, service_role;

-- All tables (present and future)
grant all on all tables    in schema pms to authenticated, service_role;
grant all on all sequences in schema pms to authenticated, service_role;
grant select on all tables in schema pms to anon;

-- Future tables created in pms will inherit the same grants automatically.
alter default privileges in schema pms
  grant all on tables    to authenticated, service_role;

alter default privileges in schema pms
  grant all on sequences to authenticated, service_role;

alter default privileges in schema pms
  grant select on tables to anon;
