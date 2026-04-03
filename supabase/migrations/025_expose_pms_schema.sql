-- Expose the pms schema to PostgREST so that API requests with
-- Accept-Profile: pms (sent by the Supabase JS client's db.schema option)
-- are accepted rather than rejected with "Invalid schema".
--
-- After this migration is pushed, the Supabase JS client configured with
-- db: { schema: "pms" } will be able to query all pms.* tables directly.

ALTER ROLE authenticator SET pgrst.db_schemas TO 'public, pms';

-- Signal PostgREST to reload its config without a restart.
NOTIFY pgrst, 'reload config';
