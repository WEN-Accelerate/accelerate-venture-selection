-- Create a table for storing user business profiles
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Link to the user (Firebase UID is a string, so we use text)
  -- Ideally this would match your auth system's ID format
  user_id text not null,
  
  -- Core Identity
  company_name text not null,
  
  -- The full JSON dump of the profile wizard state
  details jsonb,

  -- Constraint to ensure one profile per user (or remove if multiple allowed)
  constraint profiles_user_id_key unique (user_id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policy: Allow anyone to insert/select (for this prototype)
-- IN PRODUCTION: You should restrict this to the authenticated user's own rows.
create policy "Allow public access for prototype"
on public.profiles
for all
using (true)
with check (true);
