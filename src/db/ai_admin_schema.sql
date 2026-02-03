-- Create table for managing AI Prompts
create table if not exists public.ai_prompts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Unique identifier for the prompt (e.g., 'company_research', 'generate_one_pager')
  slug text not null unique,
  
  -- The prompt template with variable placeholders like {{variable}}
  template text not null,
  
  -- Description of what this prompt does
  description text,
  
  -- Available models for this prompt (optional override)
  model_config jsonb default '{}'::jsonb,
  
  -- Is this prompt active?
  is_active boolean default true
);

-- Policy to allow public read access (for the app to fetch prompts)
comment on table public.ai_prompts is 'Stores dynamic AI prompt templates managed via Admin Panel';

-- Enable RLS
alter table public.ai_prompts enable row level security;

create policy "Allow public read of prompts"
on public.ai_prompts for select
using (true);

create policy "Allow admin write access"
on public.ai_prompts for all
using (true) with check (true);

-- Insert Initial Prompts (Seed Data)
insert into public.ai_prompts (slug, description, template)
values 
('company_research', 'Deep search prompt for Step 1', 'Research the company "{{companyName}}". Return a JSON object with these exact keys: { "name": "Legal Name", "industry": "Industry Category", "location": "HQ City, State", "logo": "URL to company logo (best guess)", "description": "2 sentence description", "promoters": ["Name 1", "Name 2"], "products": ["Product 1", "Product 2"], "customers": ["Segment 1"], "marketPosition": "Current standing", "employees": "Estimated count (e.g. 100-500)" }. If specific data is not found, make a best guess or leave empty. Return ONLY JSON.'),
('generate_one_pager', 'Executive Summary Generator', 'Generate a "One Page Executive Summary" for {{companyName}}''s expansion strategy. Data: - Goal: Reach {{growthTarget}} in 4 years. - Strategy: {{ventureType}} Expansion. - Description: {{strategyDescription}} - 4Ps: {{strategyDimensions}} - Help Needed: {{supportDetails}}. Format as a cohesive narrative (approx 200 words).')
on conflict (slug) do nothing;
