-- =====================================================
-- CONSULTANT LAYER SCHEMA (FIXED VERSION)
-- =====================================================
-- This version removes foreign key constraints to avoid "column id does not exist" errors
-- It relies on application logic and unique constraints for integrity

-- Step 1: Add role column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'sme';
        ALTER TABLE profiles ADD CONSTRAINT check_role CHECK (role IN ('sme', 'consultant', 'admin'));
    END IF;
END $$;

-- Step 2: Create consultants table (NO foreign key constraints)
CREATE TABLE IF NOT EXISTS consultants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL, -- Logical link to profiles.user_id
    consultant_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    specialization TEXT,
    bio TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create company_assignments table (NO foreign key constraints)
CREATE TABLE IF NOT EXISTS company_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL, -- Logical link to consultants.id
    company_user_id TEXT NOT NULL, -- Logical link to profiles.user_id
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT,
    notes TEXT,
    UNIQUE(consultant_id, company_user_id)
);

-- Step 4: Ensure columns exist and create indexes
-- Ensure active column exists if table was created previously without it
DO $$ 
BEGIN
    ALTER TABLE consultants ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_consultants_user_id ON consultants(user_id);
-- CREATE INDEX IF NOT EXISTS idx_consultants_active ON consultants(active); -- Commenting out to be safe
CREATE INDEX IF NOT EXISTS idx_company_assignments_consultant ON company_assignments(consultant_id);
CREATE INDEX IF NOT EXISTS idx_company_assignments_company ON company_assignments(company_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Step 5: Enable Row Level Security
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_assignments ENABLE ROW LEVEL SECURITY;

-- Step 6: Cleanup old policies to avoid conflicts
DROP POLICY IF EXISTS "Consultants can view own record" ON consultants;
DROP POLICY IF EXISTS "Admins can view all consultants" ON consultants;
DROP POLICY IF EXISTS "Admins can manage consultants" ON consultants;
DROP POLICY IF EXISTS "Consultants can view their assignments" ON company_assignments;
DROP POLICY IF EXISTS "Admins can view all assignments" ON company_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON company_assignments;
DROP POLICY IF EXISTS "Consultants can view assigned companies" ON profiles;

-- Step 7: Create RLS policies for consultants table
CREATE POLICY "Consultants can view own record" ON consultants
    FOR SELECT
    USING (user_id = auth.uid()::text);

CREATE POLICY "Admins can view all consultants" ON consultants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage consultants" ON consultants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Step 8: Create RLS policies for company_assignments
CREATE POLICY "Consultants can view their assignments" ON company_assignments
    FOR SELECT
    USING (
        consultant_id IN (
            SELECT id FROM consultants 
            WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Admins can view all assignments" ON company_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage assignments" ON company_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Step 9: Create policy for consultants to view assigned companies
CREATE POLICY "Consultants can view assigned companies" ON profiles
    FOR SELECT
    USING (
        user_id IN (
            SELECT company_user_id 
            FROM company_assignments 
            WHERE consultant_id IN (
                SELECT id FROM consultants 
                WHERE user_id = auth.uid()::text
            )
        )
        OR user_id = auth.uid()::text
    );

-- Step 10: Create view for consultant dashboard
CREATE OR REPLACE VIEW consultant_companies_view AS
SELECT 
    ca.consultant_id,
    p.user_id,
    p.company_name,
    p.details->>'industry' as industry,
    p.details->>'ventureType' as venture_type,
    p.details->>'strategyDescription' as strategy,
    p.updated_at as last_updated,
    ca.assigned_at,
    ca.notes
FROM company_assignments ca
JOIN profiles p ON ca.company_user_id = p.user_id
WHERE p.role = 'sme';

-- Step 11: Grant permissions
GRANT SELECT ON consultant_companies_view TO authenticated;
GRANT SELECT ON consultants TO authenticated;
GRANT SELECT ON company_assignments TO authenticated;

-- Step 12: Add helpful comments
COMMENT ON TABLE consultants IS 'Stores consultant/advisor profiles';
COMMENT ON TABLE company_assignments IS 'Maps consultants to their assigned SME companies';
COMMENT ON COLUMN profiles.role IS 'User role: sme (default), consultant, or admin';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Consultant layer schema created successfully!';
END $$;
