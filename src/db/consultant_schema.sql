-- CONSULTANT LAYER SCHEMA MIGRATION --

-- 1. Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 2. Modify Profiles Table to support Many-to-One (Many SMEs to One Consultant)
-- PRE-REQUISITE: We must remove user_id as Primary Key to allow one Consultant to create multiple profiles
-- WARNING: Back up your data before running this.

-- Drop existing PK
ALTER TABLE profiles DROP CONSTRAINT profiles_pkey;

-- Add new UUID ID as PK
ALTER TABLE profiles ADD COLUMN id UUID DEFAULT uuid_generate_v4() PRIMARY KEY;

-- Make user_id nullable (so Consultants can create profiles without an assigned SME yet)
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- Add consultant_id column
ALTER TABLE profiles ADD COLUMN consultant_id TEXT; -- Storing Auth User ID (String from Netlify/Supabase)

-- Add Status/Metadata columns for dashboard
ALTER TABLE profiles ADD COLUMN venture_stage TEXT DEFAULT 'Researching';
ALTER TABLE profiles ADD COLUMN strategy_progress INTEGER DEFAULT 0;

-- 3. Create Consultants Table (Optional, for Role Management)
CREATE TABLE consultants (
    user_id TEXT PRIMARY KEY, -- The User ID who is a consultant
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. RLS Policies (Row Level Security) - CRITICAL FOR SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: SMEs can access their own profile
CREATE POLICY "SME Access" ON profiles
    FOR ALL
    USING (auth.uid()::text = user_id);

-- Policy: Consultants can access profiles they manage
CREATE POLICY "Consultant Access" ON profiles
    FOR ALL
    USING (auth.uid()::text = consultant_id);

-- Policy: Consultants can insert new profiles (assigned to themselves)
CREATE POLICY "Consultant Insert" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid()::text = consultant_id);
