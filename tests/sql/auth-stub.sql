create role anon nologin; create role authenticated nologin;
create schema auth; create schema extensions; create extension pgcrypto schema extensions;
create table auth.users(id uuid primary key default gen_random_uuid(), email text unique, encrypted_password text, email_confirmed_at timestamptz, updated_at timestamptz, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant select on auth.users to authenticated;
create publication supabase_realtime;
