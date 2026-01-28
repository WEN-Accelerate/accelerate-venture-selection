-- SIMPLE FIX: Disable RLS on AI Configuration Tables
-- This makes the tables publicly accessible (read/write)
-- Run this in Supabase SQL Editor

-- Disable RLS on all AI config tables
ALTER TABLE ai_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('ai_models', 'ai_prompts', 'ai_settings');
-- rowsecurity should show 'false' for all tables
