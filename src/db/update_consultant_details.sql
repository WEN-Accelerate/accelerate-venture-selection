-- Add profile fields to consultants table
ALTER TABLE public.consultants
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS industry_focus text,
ADD COLUMN IF NOT EXISTS function_focus text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS past_companies text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS other_comments text;
