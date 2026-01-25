-- SAFE CONSULTANT LAYER SCHEMA MIGRATION --

-- 1. Ensure UUID extension is available
create extension if not exists "uuid-ossp";

-- 2. Handle Primary Key Migration
-- We check if 'user_id' is the current primary key. 
-- If 'id' already exists, we ensure it's the primary key.
DO $$ 
BEGIN
    -- Check if 'id' column exists. If not, add it.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id') THEN
        ALTER TABLE profiles ADD COLUMN id UUID DEFAULT uuid_generate_v4();
    END IF;

    -- Drop existing PK if it's 'user_id' (to allow one consultant to have multiple client rows)
    IF (SELECT count(*) FROM information_schema.table_constraints 
        WHERE table_name = 'profiles' AND constraint_type = 'PRIMARY KEY') > 0 THEN
        
        -- Only drop if it's named 'profiles_pkey' or similar and contains user_id
        -- For simplicity in a script, we drop the PK and set it to 'id'
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
        ALTER TABLE profiles ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 2.5 Create Consultants Table if it doesn't exist (Invitation List)
CREATE TABLE IF NOT EXISTS consultants (
    user_id TEXT PRIMARY KEY, -- The User ID who is a consultant
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Make user_id nullable (Consultants can create profiles without an SME user assigned)
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- 4. Add Consultant & Progress columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'consultant_id') THEN
        ALTER TABLE profiles ADD COLUMN consultant_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'venture_stage') THEN
        ALTER TABLE profiles ADD COLUMN venture_stage TEXT DEFAULT 'Researching';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'strategy_progress') THEN
        ALTER TABLE profiles ADD COLUMN strategy_progress INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. RLS Policies
-- First disable/enable RLS to clear old state if needed
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "SME Access" ON profiles;
DROP POLICY IF EXISTS "Consultant Access" ON profiles;
DROP POLICY IF EXISTS "Consultant Insert" ON profiles;

-- Create Policies
CREATE POLICY "SME Access" ON profiles
    FOR ALL
    USING (auth.uid()::text = user_id);

CREATE POLICY "Consultant Access" ON profiles
    FOR ALL
    USING (auth.uid()::text = consultant_id);

CREATE POLICY "Consultant Insert" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid()::text = consultant_id);

-- 6. Consultants Table Security (Invitation Registry)
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for consultants" ON consultants;
CREATE POLICY "Public read access for consultants" 
    ON consultants FOR SELECT 
    USING (true);

