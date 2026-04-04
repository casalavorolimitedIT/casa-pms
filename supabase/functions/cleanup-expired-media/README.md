# Media Retention Cleanup

This edge function handles nightly cleanup of expired media files based on the `expires_at` timestamp in the `media_metadata` table.

## Setup

### 1. Deploy the Edge Function

```bash
supabase functions deploy cleanup-expired-media
```

### 2. Create a Supabase Cron Job

Use the Supabase dashboard or API to schedule the function to run nightly at 2 AM UTC:

**Via Dashboard:**
1. Go to Supabase Project Settings → Functions → Cron Jobs
2. Create a new cron job:
   - Function: `cleanup-expired-media`
   - Schedule: `0 2 * * *` (daily at 2 AM UTC)
   - Name: "Daily media retention cleanup"

**Via CLI (programmatic):**

```bash
# Set up a cron trigger (requires Supabase CLI v1.41+)
supabase functions deploy cleanup-expired-media \
  --no-verify-jwt \
  --import-map ./import_map.json
```

Then configure the cron via dashboard or Terraform.

### 3. Function Behavior

The edge function will:

1. **Query** all media_metadata rows where `expires_at < now()` and `deleted_at IS NULL`
2. **Delete** the physical file from the Supabase Storage bucket
3. **Write audit log** entry with action='expire' and reason documenting the expiration date
4. **Soft-delete** the metadata row (set deleted_at timestamp)
5. **Return** cleanup statistics (files deleted, errors)

### 4. Retention Periods by Bucket

| Bucket | Retention | Example Expires At |
|--------|-----------|-------------------|
| `guest-documents` | 7 years | Now + 2557 days |
| `guest-profiles` | 5 years | Now + 1826 days |
| `housekeeping-condition` | 90 days | Now + 90 days |
| `lost-and-found` | 2 years | Now + 730 days |
| `cleaning-tasks` | 30 days | Now + 30 days |
| `asset-registry` | Permanent | NULL (never expires) |
| `work-order-photos` | 3 years | Now + 1095 days |
| `maintenance-proof` | 2 years | Now + 730 days |
| `guest-messages-media` | 1 year | Now + 365 days |

### 5. Manual Testing

Run the cleanup manually to test:

```bash
curl -X POST https://<project_id>.supabase.co/functions/v1/cleanup-expired-media \
  -H "Authorization: Bearer <service_role_token>" \
  -H "Content-Type: application/json"
```

Response example:

```json
{
  "message": "Cleanup completed: 12 files deleted",
  "stats": {
    "filesDeleted": 12,
    "metadataRowsDeleted": 12,
    "auditEntriesCreated": 12,
    "errors": []
  }
}
```

### 6. Monitoring & Logs

View logs in Supabase dashboard:

- **Edge Functions → cleanup-expired-media → Logs**
- Check for any errors in error entries
- Monitor `media_audit_log` table for deletion records with `action='expire'`

### 7. Compliance & GDPR

The soft-delete approach preserves an audit trail:

- **media_metadata** rows remain queryable via deleted_at filter (for GDPR audits)
- **media_audit_log** entries persist permanently (immutable audit trail)
- Files are deleted from storage immediately, but metadata deletion occurs after audit period

To perform hard-delete (if required by compliance policy):

```sql
-- Hard-delete old expired records after 90-day audit period
delete from pms.media_metadata
where deleted_at < now() - interval '90 days';
```

## Troubleshooting

### "No files deleted" on first run

Check that media_metadata rows have `expires_at < now()`. During development, manually set past dates for testing:

```sql
update pms.media_metadata
set expires_at = now() - interval '1 day'
where feature_type = 'room_condition'
limit 5;
```

### Storage bucket access errors

Ensure the Supabase service role key is set in `SUPABASE_SERVICE_ROLE_KEY`. The edge function uses this for admin-level storage access (bypassing row-level security).

### High error rates

Check:
- Storage bucket names match exactly (`housekeeping-condition`, `lost-and-found`, etc.)
- File keys are valid paths in the format `properties/<uuid>/<feature>/<timestamp>_<filename>`
- File still exists in storage (may have been manually deleted already)

## References

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/functions/scheduled-functions)
- [Database Setup](../../supabase/migrations/050_media_metadata_soft_delete.sql)
