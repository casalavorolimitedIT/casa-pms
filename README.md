# Next.js + Supabase Boilerplate

Production-ready starter with:

- Next.js App Router
- Supabase SSR auth (middleware + server actions)
- Login / register / dashboard flow
- Reusable UI primitives (shadcn/base-ui)

## 1) Environment setup

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SMS_FROM=your_twilio_sms_number
TWILIO_WHATSAPP_FROM=your_twilio_whatsapp_sender
```

The app validates these variables at startup.

Twilio variables are only required if you want live outbound and inbound guest messaging. Without them, outbound messages stay queued in the inbox for local workflow testing.

## 2) Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 3) Auth routes

- `/login`
- `/register`
- `/dashboard` (protected)

`/` automatically redirects to `/dashboard` if authenticated, otherwise `/login`.

## 4) Boilerplate structure

- `lib/supabase/config.ts`: central env config
- `lib/supabase/client.ts`: browser client
- `lib/supabase/server.ts`: server component client
- `lib/supabase/action.ts`: server action client (cookie writes)
- `lib/supabase/middleware.ts`: session refresh in middleware
- `app/(auth)/actions/auth-actions.ts`: login/register/logout actions

## 5) Workflow tips

- Add feature routes under `app/(dashboard)/...` and protect them with `redirectIfNotAuthenticated`.
- Keep writes in server actions and reads in server components when possible.
- Put shared DB calls in `lib/` (service-style functions) so UI stays thin.
- Run checks before commits:

```bash
npm run lint
```
