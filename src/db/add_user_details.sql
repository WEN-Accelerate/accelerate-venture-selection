-- Add email and name columns to profiles table for easier identification
alter table public.profiles 
add column if not exists email text,
add column if not exists full_name text;

-- Optional: Update existing rows if possible (This won't work perfectly for existing data since we don't have the auth data here, but it prepares the table)
-- Future logins usually update the row, so data will fill in over time.
