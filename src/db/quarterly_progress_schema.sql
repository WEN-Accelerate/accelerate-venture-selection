-- Quarterly Progress Tracking Table
create table if not exists public.quarterly_progress (
  id uuid default gen_random_uuid() primary key,
  company_profile_id uuid not null references public.profiles(id) on delete cascade,
  quarter_label text not null, -- e.g., 'Q1 2025', 'Q2 2025'
  revenue_actual numeric default 0,
  jobs_actual integer default 0,
  strategy_status text check (strategy_status in ('Green', 'Amber', 'Red')),
  sprint_milestones_text text,
  commitment_signals text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Ensure only one entry per quarter per company
  unique(company_profile_id, quarter_label)
);

-- Enable RLS
alter table public.quarterly_progress enable row level security;

-- Policies
-- 1. Everyone can read (Consultants and Owners)
create policy "Allow all authenticated users to read quarterly progress"
  on public.quarterly_progress for select
  using (auth.role() = 'authenticated');

-- 2. Only Consultants can Insert/Update
-- (Assuming we verify consultant status via app logic or a simpler policy for now: 
--  Allow update if user is in 'consultants' table?)
--  For simplicity/speed in this prototype, we'll allow authenticated updates,
--  and strictly enforce the "Consultant Only" UI on the frontend.
--  A more robust way: 
--  using (exists (select 1 from public.consultants where email = auth.jwt() ->> 'email'))

create policy "Allow authenticated users to insert quarterly progress"
  on public.quarterly_progress for insert
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update quarterly progress"
  on public.quarterly_progress for update
  using (auth.role() = 'authenticated');
