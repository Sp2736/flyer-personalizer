-- Run AFTER 001_init.sql. Sets up admin auth backed by Supabase's built-in
-- auth.users, with a trigger-synced profile table instead of manually
-- inserting rows with your own uuid.uuid4() — that's the #1 cause of
-- "foreign key violation" / "user not found" bugs people hit here: if you
-- insert into a public profile table with a UUID you invented, it will
-- never match the UUID Supabase Auth actually assigned that user, and any
-- join against auth.users(id) silently returns nothing.
--
-- The fix: never generate the UUID yourself. Create the user via
-- Supabase Auth (dashboard or API) first, and let this trigger copy the
-- real id auth.users chose into admin_profiles automatically.

create table if not exists admin_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    role text not null default 'admin',
    created_at timestamptz not null default now()
);

-- auto-create a profile row the moment a new auth.users row appears,
-- copying its real id — this is the piece that eliminates UUID drift
create or replace function public.handle_new_admin_user()
returns trigger as $$
begin
    insert into public.admin_profiles (id, email)
    values (new.id, new.email);
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_admin_user();

alter table admin_profiles enable row level security;

create policy "admins can read their own profile"
    on admin_profiles for select
    using (auth.uid() = id);
