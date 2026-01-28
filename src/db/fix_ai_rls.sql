-- Fix RLS Policies for AI Configuration Tables
-- Run this in Supabase SQL Editor to allow public read access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON ai_models;
DROP POLICY IF EXISTS "Allow public read access" ON ai_prompts;
DROP POLICY IF EXISTS "Allow public read access" ON ai_settings;

DROP POLICY IF EXISTS "public_read_ai_models" ON ai_models;
DROP POLICY IF EXISTS "public_read_ai_prompts" ON ai_prompts;
DROP POLICY IF EXISTS "public_read_ai_settings" ON ai_settings;

-- Create new policies with unique names for SELECT operations
CREATE POLICY "public_read_ai_models" 
ON ai_models FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "public_read_ai_prompts" 
ON ai_prompts FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "public_read_ai_settings" 
ON ai_settings FOR SELECT 
TO anon, authenticated
USING (true);

-- For admin operations, add policies for INSERT, UPDATE, DELETE
-- (Restrict these to authenticated users only)

CREATE POLICY "auth_write_ai_models" 
ON ai_models FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "auth_write_ai_prompts" 
ON ai_prompts FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "auth_write_ai_settings" 
ON ai_settings FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('ai_models', 'ai_prompts', 'ai_settings')
ORDER BY tablename, policyname;
