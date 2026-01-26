-- Add Sprint Status Column to "quarterly_progress" table
alter table public.quarterly_progress
add column if not exists sprint_status text check (sprint_status in ('Green', 'Amber', 'Red')) default 'Green';

-- (Optional) Update existing rows to have default
update public.quarterly_progress
set sprint_status = 'Green'
where sprint_status is null;
