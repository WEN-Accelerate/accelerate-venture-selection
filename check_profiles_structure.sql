-- =====================================================
-- STEP 1: CHECK EXISTING PROFILES TABLE STRUCTURE
-- =====================================================
-- Run this first to see what columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
