-- =====================================================
-- CONSULTANT LAYER SCHEMA
-- =====================================================
-- This extends the existing profiles table with consultant functionality

-- 1. Add role column to existing profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'sme' CHECK (role IN ('sme', 'consultant', 'admin'));

-- 2. Create consultants table for consultant-specific data
CREATE TABLE IF NOT EXISTS consultants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    consultant_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    specialization TEXT,
    bio TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to profiles table
    CONSTRAINT fk_consultant_user FOREIGN KEY (user_id) 
        REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- 3. Create company_assignments table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS company_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL,
    company_user_id TEXT NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT, -- admin user_id who made the assignment
    notes TEXT,
    
    -- Foreign keys
    CONSTRAINT fk_assignment_consultant FOREIGN KEY (consultant_id) 
        REFERENCES consultants(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_company FOREIGN KEY (company_user_id) 
        REFERENCES profiles(user_id) ON DELETE CASCADE,
    
    -- Ensure unique assignments
    UNIQUE(consultant_id, company_user_id)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultants_user_id ON consultants(user_id);
CREATE INDEX IF NOT EXISTS idx_consultants_active ON consultants(active);
CREATE INDEX IF NOT EXISTS idx_company_assignments_consultant ON company_assignments(consultant_id);
CREATE INDEX IF NOT EXISTS idx_company_assignments_company ON company_assignments(company_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_assignments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for consultants table
-- Consultants can view their own record
CREATE POLICY "Consultants can view own record" ON consultants
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Admins can view all consultants
CREATE POLICY "Admins can view all consultants" ON consultants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Admins can insert/update/delete consultants
CREATE POLICY "Admins can manage consultants" ON consultants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- 7. RLS Policies for company_assignments table
-- Consultants can view their assignments
CREATE POLICY "Consultants can view their assignments" ON company_assignments
    FOR SELECT
    USING (
        consultant_id IN (
            SELECT id FROM consultants WHERE user_id = auth.uid()::text
        )
    );

-- Admins can view all assignments
CREATE POLICY "Admins can view all assignments" ON company_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Admins can manage assignments
CREATE POLICY "Admins can manage assignments" ON company_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- 8. Update profiles RLS to allow consultants to view assigned companies
CREATE POLICY "Consultants can view assigned companies" ON profiles
    FOR SELECT
    USING (
        user_id IN (
            SELECT company_user_id 
            FROM company_assignments 
            WHERE consultant_id IN (
                SELECT id FROM consultants WHERE user_id = auth.uid()::text
            )
        )
        OR user_id = auth.uid()::text
    );

-- 9. Create view for consultant dashboard
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

-- 10. Grant permissions on the view
GRANT SELECT ON consultant_companies_view TO authenticated;

-- =====================================================
-- SAMPLE DATA (for testing - remove in production)
-- =====================================================
-- Example: Create a test consultant
-- INSERT INTO profiles (user_id, company_name, role, details)
-- VALUES ('consultant_test_001', 'Test Consultant', 'consultant', '{"email": "consultant@test.com"}'::jsonb);

-- INSERT INTO consultants (user_id, consultant_name, email, specialization)
-- VALUES ('consultant_test_001', 'John Doe', 'consultant@test.com', 'Export Strategy');

COMMENT ON TABLE consultants IS 'Stores consultant/advisor profiles';
COMMENT ON TABLE company_assignments IS 'Maps consultants to their assigned SME companies';
COMMENT ON COLUMN profiles.role IS 'User role: sme (default), consultant, or admin';
