# Antigravity Build Seed — Flyer Personalizer: Auth Completion + Live Template Sync

## Context
Backend is a FastAPI service (`flyer-personalizer/`) already deployed against
Supabase (Postgres + Storage). Frontend is an existing dummy build that needs
wiring to (1) real Supabase Auth for the admin area and (2) the live
`templates` bucket instead of placeholder data. This doc is the complete spec
— implement it as-is, don't re-derive the schema.

---

## 1. Environment variables the frontend needs

Add to the frontend's `.env.local` (Next.js) or equivalent:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...        # anon key ONLY — never service_role
NEXT_PUBLIC_API_BASE_URL=https://<render-service>.onrender.com
NEXT_PUBLIC_DEV_BYPASS_AUTH=true                  # mirrors backend's DEV_BYPASS_AUTH
```

Rules:
- `NEXT_PUBLIC_*` vars are bundled into client JS and are public — only the
  anon key goes here, never `service_role`.
- `.env.local` must be gitignored (check before committing).
- `DEV_BYPASS_AUTH` must be identical on frontend and backend — if they
  disagree, the frontend will send no auth header while the backend expects
  one (or vice versa) and every admin call 401s.

## 2. Supabase client setup (frontend)

Install `@supabase/supabase-js`. Create a single shared client:

```ts
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Only ever instantiate one client (module-level singleton as above) — creating
a new client per component causes duplicate auth-state listeners.

## 3. Auth flow — admin login

The DB side is already done: `migrations/002_admin_auth.sql` creates
`admin_profiles`, synced automatically from `auth.users` via trigger. **Do
not manually insert rows into `admin_profiles`** — the trigger handles it,
and a manually-invented UUID will not match `auth.uid()`, breaking every RLS
policy silently (no error, just empty results).

**Creating the first admin user** (do this once, in the Supabase dashboard,
not in app code):
- Authentication → Users → **Add user** → enter email + password → toggle
  **Auto Confirm User** on (skips email verification for now).
- Check Table Editor → `admin_profiles` → confirm a row appeared automatically
  with that user's real `id`. If it didn't, the trigger from
  `002_admin_auth.sql` wasn't run — go run that migration first.

**Login screen** (frontend):
```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
// data.session.access_token is the JWT — send it as:
// Authorization: Bearer <access_token>
// on every request to /admin/* backend routes.
```

**Every admin-area API call** must attach that header:
```ts
const { data: { session } } = await supabase.auth.getSession()
fetch(`${API_BASE_URL}/admin/templates`, {
  headers: { Authorization: `Bearer ${session?.access_token}` }
})
```

**Dev bypass** — keep exactly as it works today: when
`NEXT_PUBLIC_DEV_BYPASS_AUTH=true`, skip the login screen and Supabase
session entirely, and don't attach an Authorization header at all (the
backend's `DEV_BYPASS_AUTH=true` accepts unauthenticated requests on
`/admin/*`). Gate this with the env var, never hardcode a bypass that could
ship to production.

**Session persistence / logout**: Supabase's client handles token refresh
automatically. For logout: `await supabase.auth.signOut()`.

## 4. Syncing the frontend with real templates in Supabase Storage

Don't have the frontend talk to Supabase Storage directly for reading
templates — the backend already exposes everything needed, with signed URLs
generated server-side (so the frontend never needs storage credentials of
any kind, anon or otherwise):

- **Public template picker** (attendee-facing):
  `GET {API_BASE_URL}/templates/active`
  → `[{ id, name, mode }]` — enough for a dropdown/selector.

- **Richer picker with a visual preview** (use this instead if the frontend
  wants to show a thumbnail):
  `GET {API_BASE_URL}/templates/active/detailed`
  → `[{ id, name, mode, page_size, preview_pdf_url }]`
  `preview_pdf_url` is a signed, expiring (1hr) URL straight to the clean
  template PDF in the `templates` bucket — render it with a PDF viewer
  component (`react-pdf` or an `<iframe>` for a quick pass) or convert it to
  an image client-side if a raster thumbnail is preferred.

- **Admin template list** (needs the auth header from section 3):
  `GET {API_BASE_URL}/admin/templates` → all templates regardless of status.

- **Admin upload** (multipart form, needs auth header):
  `POST {API_BASE_URL}/admin/templates`
  fields: `name`, `mode` (`flyer`|`sticker`), `marker_pdf` (file),
  `clean_pdf` (file), optional `anchor_mode`, `bleed_pct`.
  Returns `422` with a `warnings` array if required markers are missing —
  surface that array directly to the admin user, it names exactly which
  marker is missing (e.g. "No {{NAME}} text token found").

- **Admin activate/deactivate** (needs auth header):
  `PATCH {API_BASE_URL}/admin/templates/{id}` form field `status`
  (`active`|`inactive`).

- **Admin preview** (needs auth header):
  `GET {API_BASE_URL}/admin/templates/{id}/preview` → returns a PNG directly
  (dummy-filled render) — use as an `<img>` src or blob download.

Do not cache `preview_pdf_url` beyond its 1-hour expiry — re-fetch
`/templates/active/detailed` if a preview link goes stale (404/403 from
Supabase Storage).

## 5. Order of implementation

1. Wire the Supabase client + env vars (section 1–2).
2. Build/confirm the admin login screen against section 3, gated by
   `NEXT_PUBLIC_DEV_BYPASS_AUTH`. Test both states: bypass on (no login
   screen shown, admin calls succeed unauthenticated) and bypass off (login
   required, admin calls 401 without a valid session).
3. Replace whatever placeholder template data the dummy frontend currently
   uses with real calls to `/templates/active` (or `/detailed`) and
   `/admin/templates`.
4. Confirm end-to-end: upload a template via admin UI → see it in the admin
   list → activate it → see it appear in the public picker → generate a
   poster from it.
