import os
import psycopg2
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Execute SQL
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not found")
    exit(1)

print("Connecting to DB...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

sql_script = """
drop table if exists submissions cascade;
drop table if exists templates cascade;

create table if not exists modules (
    id text primary key,              -- human slug, e.g. 'event_flyer' — matches frontend ModuleItem.id
    name text not null,
    enabled boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists themes (
    id uuid primary key default gen_random_uuid(),
    module_id text not null references modules(id),
    name text not null,
    marker_pdf_key text not null,       -- storage key in 'themes' bucket
    clean_pdf_key text not null,        -- storage key in 'themes' bucket
    thumbnail_key text,                 -- dummy-filled PNG preview, storage key in 'themes' bucket
    config_json jsonb not null,         -- parsed photo_slots + text_boxes
    default_paper_size text not null default 'A4' check (default_paper_size in ('A4','12x18')),
    max_character_count int not null default 1,
    status text not null default 'inactive' check (status in ('active','inactive')),
    created_at timestamptz not null default now()
);

create table if not exists generations (
    id uuid primary key default gen_random_uuid(),
    module_id text not null references modules(id),
    theme_id uuid not null references themes(id),
    college_id text,                     -- from X-College-Id header, no real per-user auth yet
    paper_size text not null default 'A4',
    character_count int not null default 1,
    student_name text,
    school_name text,
    photo_storage_paths jsonb not null default '[]'::jsonb,  -- keys in 'uploads' bucket, one per slot
    preview_key text,                    -- storage key in 'generated' bucket
    final_pdf_key text,
    final_png_key text,
    status text not null default 'previewed' check (status in ('previewed','finalized')),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

create table if not exists credit_accounts (
    college_id text primary key,
    remaining int not null default 10,
    updated_at timestamptz not null default now()
);

create table if not exists generation_jobs (
    id uuid primary key default gen_random_uuid(),
    generation_id uuid not null references generations(id),
    status text not null default 'queued' check (status in ('queued','processing','done','failed')),
    error text,
    attempts int default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_themes_module_status on themes(module_id, status);
create index if not exists idx_generations_expires_at on generations(expires_at);
create index if not exists idx_generations_college_id on generations(college_id);

insert into modules (id, name, enabled) values
    ('notebook_sticker', 'Notebook Sticker', true),
    ('event_flyer', 'Event Flyer', true),
    ('id_card', 'ID Card / Badge', true)
on conflict (id) do nothing;
"""

print("Executing SQL script...")
cur.execute(sql_script)
print("SQL script executed.")

# Create buckets
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("SUPABASE_URL or SUPABASE_SERVICE_KEY not found")
    exit(1)

supabase: Client = create_client(url, key)

for bucket_name in ["themes", "generated", "uploads"]:
    try:
        # Check if bucket exists first
        bucket = supabase.storage.get_bucket(bucket_name)
        print(f"Bucket '{bucket_name}' already exists.")
    except Exception:
        try:
            res = supabase.storage.create_bucket(bucket_name, options={"public": False})
            print(f"Created bucket '{bucket_name}': {res}")
        except Exception as e:
            print(f"Error creating bucket '{bucket_name}': {e}")

print("Done.")
