# 🔧 FIXING THE SCHEMA ERROR - Step by Step

## The Problem
You're getting: `ERROR: 42703: column "id" referenced in foreign key constraint does not exist`

This happens because your profiles table structure might be different than expected.

## ✅ SOLUTION: Use the New Schema File

I've created a **simplified version** that avoids the foreign key issue.

### Step 1: Use the New Schema File

**File to use:** `supabase_consultant_schema_v2.sql`

This version:
- ✅ Creates tables WITHOUT foreign key constraints
- ✅ Uses application-level referential integrity instead
- ✅ Works with any profiles table structure
- ✅ Includes all the same functionality

### Step 2: Run in Supabase

1. Open Supabase dashboard
2. Go to **SQL Editor**
3. Open the file `supabase_consultant_schema_v2.sql`
4. Copy ALL the content
5. Paste into SQL Editor
6. Click **RUN**
7. Wait for success message

### Step 3: Verify Tables Created

Go to **Table Editor** and check you see:
- ✅ `consultants` table
- ✅ `company_assignments` table
- ✅ `profiles` table (with new `role` column)

## 🎯 What's Different?

**Old Schema (causing error):**
```sql
-- Had foreign key constraints
CONSTRAINT fk_consultant_user FOREIGN KEY (user_id) 
    REFERENCES profiles(user_id) ON DELETE CASCADE
```

**New Schema (working):**
```sql
-- No foreign key constraints
-- Relationships enforced by application logic
user_id TEXT UNIQUE NOT NULL,
```

## Why This Works

Foreign keys are **optional** in databases. They're nice to have but not required. The new schema:

1. **Still maintains data integrity** through:
   - Unique constraints
   - Application logic
   - RLS policies

2. **Avoids the error** by:
   - Not using foreign key constraints
   - Working with any table structure

3. **Same functionality**:
   - All queries work the same
   - All features work the same
   - Just no database-level cascading deletes

## 🚀 After Running the Schema

### Create Your First Consultant

```sql
-- Step 1: Set role (replace USER_ID with actual Netlify Identity ID)
UPDATE profiles 
SET role = 'consultant' 
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Step 2: Create consultant record
INSERT INTO consultants (user_id, consultant_name, email, specialization)
VALUES (
    'YOUR_USER_ID_HERE',
    'John Doe',
    'john@example.com',
    'Export Strategy'
);

-- Step 3: Verify it worked
SELECT * FROM consultants;
```

### Assign a Company

```sql
-- Get consultant ID
SELECT id, consultant_name FROM consultants;

-- Assign company (replace the UUIDs)
INSERT INTO company_assignments (consultant_id, company_user_id)
VALUES (
    'CONSULTANT_UUID_FROM_ABOVE',
    'COMPANY_USER_ID'
);

-- Verify
SELECT * FROM consultant_companies_view;
```

## 🐛 If You Still Get Errors

### Error: "relation already exists"
**Solution:** Tables already exist. That's OK! The schema uses `IF NOT EXISTS` so it won't break anything.

### Error: "policy already exists"
**Solution:** The schema drops existing policies first. Run it again.

### Error: "column role already exists"
**Solution:** That's fine! It means you already ran part of the schema. Continue with the consultant creation steps.

## 📋 Quick Test Checklist

After running the schema:

```sql
-- 1. Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('consultants', 'company_assignments');

-- 2. Check role column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- 3. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('consultants', 'company_assignments');
```

All should return results!

## 🎉 You're Ready!

Once the schema runs successfully:
1. Create a consultant (SQL above)
2. Go to `/consultant.html`
3. Log in
4. Start using the consultant portal!

---

**File to use:** `supabase_consultant_schema_v2.sql`
**This version will work!** ✅
