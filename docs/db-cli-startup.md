# Supabase DB CLI Startup Guide (Casa PMS)

This guide shows how to start using the Supabase CLI for this repository and run all migrations safely.

## 1. Prerequisites
- Node.js installed
- Access to the Supabase project in your organization
- Project URL configured in `.env.local`

Project ref in this repo:
- `kydhktnavicrwsdeemzl`

## 2. Login
Use one of these methods.

### Option A: Interactive login
```bash
npx supabase login
```

### Option B: Access token (CI or non-interactive)
```bash
export SUPABASE_ACCESS_TOKEN="<your_token>"
```

## 3. Link local repo to remote project
```bash
npx supabase link --project-ref kydhktnavicrwsdeemzl
```

If this fails with `Access token not provided`, do step 2 first.

## 4. Run all migrations (push local -> remote)
```bash
npm run supabase:db:push
```

Equivalent direct command:
```bash
npx supabase db push
```

## 5. Verify status
```bash
npm run supabase:status
```

## 6. Common commands in this repo
```bash
# push local migrations to remote
npm run supabase:db:push

# pull remote schema to a new migration file
npm run supabase:db:pull

# reset local db + rerun migrations (local dev only)
npm run supabase:db:reset
```

## 7. Troubleshooting

### `Cannot find project ref. Have you run supabase link?`
Run:
```bash
npx supabase link --project-ref kydhktnavicrwsdeemzl
```

### `Access token not provided`
Run:
```bash
npx supabase login
```
Or set `SUPABASE_ACCESS_TOKEN`.

### Migration fails due to legacy columns
Use latest repo migrations (already includes compatibility updates for legacy `room_rates` columns), then retry:
```bash
npm run supabase:db:push
```

## 8. Team workflow recommendation
1. Pull latest `main`
2. Run `npm run supabase:db:push`
3. Implement feature schema changes in a new migration
4. Re-run `npm run supabase:db:push`
5. Commit migration SQL with app code
