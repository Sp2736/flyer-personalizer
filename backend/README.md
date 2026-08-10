# Custom Event Poster / Sticker Generator — Backend

FastAPI backend implementing the SRS, unified with the sticker-sheet engine
from your Colab R&D notebook. One codebase, two template `mode`s:

- **`flyer`** — magenta photo box + `{{NAME}}`/`{{ID}}` text tokens, OpenCV
  face-detect crop.
- **`sticker`** — one or more magenta character slots, `rembg` background
  removal, bottom-center anchored cutouts (no text fields).

## Layout
```
app/
  main.py              FastAPI app, CORS, rate-limit wiring, /health
  core/
    marker_parser.py   Parses Marker Map PDF -> TemplateConfig (photo slots + text boxes)
    compositor.py       Face-crop / rembg-cutout + text insertion -> final PNG
    storage.py          Supabase Storage wrapper (falls back to local disk with no creds)
    db.py                SQLAlchemy models: Template, Submission, GenerationJob
    cleanup.py           Retention sweep (deletes files past expires_at)
  routers/
    templates.py        Admin: upload/list/activate templates, preview render
    generate.py          Public: list active templates, POST /generate (rate-limited)
    download.py          Local-dev-only download route (prod uses Supabase signed URLs)
migrations/001_init.sql  Supabase Postgres schema (or let SQLAlchemy auto-create)
render.yaml               Render.com free-tier blueprint (web service + cron cleanup)
Dockerfile
requirements.txt
.env.example
```

Already tested locally end-to-end: marker parsing on a synthetic PDF, full
generation (photo composite + text render) producing a correct PNG — see
the smoke test output from this session.

## Getting off Colab — step by step

**1. Supabase (free) — database + storage**
- Create a project at supabase.com.
- SQL Editor → run `migrations/001_init.sql` (or skip it — the app auto-creates
  tables on first boot via `init_db()`).
- Storage → create two **private** buckets: `templates` and `generated`.
- Project Settings → API → copy `SUPABASE_URL` and the **service_role** key
  (not anon — this is server-side only).
- Project Settings → Database → copy the connection string (use the
  **Session pooler** URI, port 6543, for compatibility with Render free tier).

**2. GitHub**
- Push this folder as a repo (e.g. `poster-generator-backend`).

**3. Render (free) — hosting**
- New → Blueprint → point at your repo → it reads `render.yaml` and creates
  the web service + hourly cleanup cron automatically.
- Fill in the three env vars it asks for (`DATABASE_URL`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_KEY`) with the Supabase values from step 1.
- First deploy takes a few minutes (installing opencv/rembg's onnx runtime).
  Free tier spins down on idle — first request after inactivity will be slow
  (cold start); fine for a college event with a known start time, just hit
  `/health` a few minutes before doors open to warm it.

**4. Connect your frontend dummy**
- Point its API calls at `https://<your-render-service>.onrender.com`.
- `GET /templates/active` → populate the event/template selector.
- `POST /generate` (multipart: `template_id`, `name`, `student_id`, `photo`)
  → returns `{ submission_id, download_url, warnings }`.
- Once you know the deployed frontend's URL, set `CORS_ORIGINS` on Render to
  that exact origin instead of `*`.

**5. Register your first template**
- `POST /admin/templates` (multipart: `name`, `mode`, `marker_pdf`, `clean_pdf`)
  — this is unauthenticated right now (FR-1.1 says "admin," section 5.1 lists
  auth as v1.1/optional). Before this goes live for a real event, put this
  route behind at minimum a shared-secret header — happy to add that next.
- `GET /admin/templates/{id}/preview` → sanity-check placement with dummy data.
- `PATCH /admin/templates/{id}` (`status=active`) → publish it.

## What's stubbed / next
- **Admin auth** — currently open; add before real deployment (simple API-key
  header is enough for a solo/small-team project).
- **Async job queue (FR-6.1)** — `GenerationJob` model exists but isn't wired
  up; current `/generate` is synchronous, fine at 5–10s per request on
  Render's free CPU tier for the 20–50 concurrent load NFR-2 specifies. Add
  Celery+Redis only if you see timeouts in testing.
- **Multi-slot sticker sheets** — `compositor.generate()` currently binds one
  uploaded photo to the first slot; extend it to accept a `{slot_id: photo}`
  map for sheets with several character cutouts.
- **NSFW moderation (FR-7.3)** — only needed if you turn on the gallery
  feature; not wired up.
