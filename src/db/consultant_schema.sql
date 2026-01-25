-- WARNING: This will reset the consultant tables and REMOVE dependent policies. Use with caution.

-- 1. Reset Tables with CASCADE to remove dependencies (policies, foreign keys)
drop table if exists public.consultant_clients cascade;
drop table if exists public.consultants cascade;
-- Also cleaning up any potentially conflicting old tables if you had them named differently
drop table if exists public.company_assignments cascade; 

-- 2. Create 'consultants' table
create table public.consultants (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create 'consultant_clients' table
create table public.consultant_clients (
  id uuid default gen_random_uuid() primary key,
  consultant_email text not null, 
  client_profile_id text not null, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(consultant_email, client_profile_id)
);

-- 4. Enable RLS
alter table public.consultants enable row level security;
alter table public.consultant_clients enable row level security;

-- 5. Open Access Policies (Prototype Only)
create policy "Allow public read consultants" on public.consultants for select using (true);
create policy "Allow public insert consultants" on public.consultants for insert with check (true);
create policy "Allow public update consultants" on public.consultants for update using (true);

create policy "Allow public read clients" on public.consultant_clients for select using (true);
create policy "Allow public insert clients" on public.consultant_clients for insert with check (true);

-- 6. SEED DATA (Run this line to give yourself access)
insert into public.consultants (email, name) values ('kedarpandya@hotmail.com', 'Kedar Pandya');
