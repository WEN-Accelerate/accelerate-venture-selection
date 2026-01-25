-- 1. Table to whitelist consultants
create table if not exists public.consultants (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Table to link consultants to the companies they manage
create table if not exists public.consultant_clients (
  id uuid default gen_random_uuid() primary key,
  consultant_email text not null, -- references consultants(email)
  client_profile_id text not null, -- references profiles(user_id) (using text to match profiles.user_id type)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(consultant_email, client_profile_id)
);

-- 3. RLS Policies (For Prototype: Open Access)
alter table public.consultants enable row level security;
create policy "Allow public read consultants" on public.consultants for select using (true);
create policy "Allow public insert consultants" on public.consultants for insert with check (true);

alter table public.consultant_clients enable row level security;
create policy "Allow public read clients" on public.consultant_clients for select using (true);
create policy "Allow public insert clients" on public.consultant_clients for insert with check (true);

-- 4. Initial Seed (Add your email as consultant for testing)
-- insert into public.consultants (email, name) values ('your_email@example.com', 'Primary Consultant');
