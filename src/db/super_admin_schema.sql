-- Super Admin Schema

-- 1. Create Super Admins Table
create table if not exists public.super_admins (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Insert Initial Super Admin (Replace with your email or user's email)
-- For now, I will insert a placeholder. The user can run specific SQL to add themselves.
-- insert into public.super_admins (email) values ('admin@wadhwani.org');

-- 3. RLS Policies for Super Admin Access
-- We need a way to check if a user is a super admin in RLS. 
-- A helper function is useful here.

create or replace function public.is_super_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.super_admins 
    where email = auth.jwt() ->> 'email'
  );
end;
$$ language plpgsql security definer;

-- 4. Update Policies to allow Super Admins to do ANYTHING
-- (Recursive policies are dangerous, so we apply this to specific tables)

-- Profiles (Companies)
create policy "Allow super admin all on profiles"
  on public.profiles
  for all
  using (public.is_super_admin());

-- Consultants
create policy "Allow super admin all on consultants"
  on public.consultants
  for all
  using (public.is_super_admin());

-- Consultant Clients (Assignments)
create policy "Allow super admin all on consultant_clients"
  on public.consultant_clients
  for all
  using (public.is_super_admin());

-- Quarterly Progress
create policy "Allow super admin all on quarterly_progress"
  on public.quarterly_progress
  for all
  using (public.is_super_admin());
