-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Tables mirror app/core/db.py — SQLAlchemy's init_db() will also create
-- these automatically on first boot if you'd rather skip this file, but
-- running it explicitly lets you review/adjust before the app touches prod.

create table if not exists templates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    mode text not null check (mode in ('flyer', 'sticker')),
    marker_pdf_key text not null,
    clean_pdf_key text not null,
    config_json jsonb not null,
    status text not null default 'inactive' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now()
);

create table if not exists submissions (
    id uuid primary key default gen_random_uuid(),
    template_id uuid not null references templates(id),
    field_values jsonb default '{}'::jsonb,
    generated_key text,
    used_face_detection boolean default false,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

create table if not exists generation_jobs (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references submissions(id),
    status text not null default 'queued' check (status in ('queued','processing','done','failed')),
    error text,
    attempts int default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_submissions_expires_at on submissions(expires_at);
create index if not exists idx_templates_status on templates(status);

-- Storage buckets: create these in Supabase Dashboard -> Storage
--   "templates"  (private) — marker/clean PDFs, admin-only
--   "generated"  (private) — output PNGs, served only via signed URLs, add a
--                            lifecycle/expiry rule or rely on the hourly
--                            cleanup cron in render.yaml to delete rows past
--                            expires_at (belt-and-suspenders for NFR-10).
