# ⚡ Quick Start: Deploy Consultant Layer (5 Minutes)

## Step 1: Database Setup (2 minutes)

### 1.1 Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

### 1.2 Copy & Run Migration Script
```sql
-- COPY ENTIRE FILE: src/db/consultant_schema.sql
-- OR use this condensed version:

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create consultants table
CREATE TABLE IF NOT EXISTS consultants (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Update profiles table structure
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE profiles ADD PRIMARY KEY (id);
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultant_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS venture_stage TEXT DEFAULT 'Researching';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strategy_progress INTEGER DEFAULT 0;

-- Set up security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SME Access" ON profiles;
DROP POLICY IF EXISTS "Consultant Access" ON profiles;
DROP POLICY IF EXISTS "Consultant Insert" ON profiles;
DROP POLICY IF EXISTS "Public read access for consultants" ON consultants;

CREATE POLICY "SME Access" ON profiles FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Consultant Access" ON profiles FOR ALL USING (auth.uid()::text = consultant_id);
CREATE POLICY "Consultant Insert" ON profiles FOR INSERT WITH CHECK (auth.uid()::text = consultant_id);
CREATE POLICY "Public read access for consultants" ON consultants FOR SELECT USING (true);
```

### 1.3 Click "Run"
✅ You should see: "Success. No rows returned"

---

## Step 2: Add First Consultant (1 minute)

### 2.1 Create Consultant Account
1. Go to your app: `https://your-app.netlify.app`
2. Create account with consultant's email
3. **Don't onboard** - just sign up and log out

### 2.2 Get User ID
**Option A: From Console**
1. Log back in as consultant
2. Open browser console (F12)
3. Look for: `[App.checkProfile] Checking UID: abc123xyz`
4. Copy that UID

**Option B: From Supabase**
1. Go to: Supabase → Authentication → Users
2. Find consultant's email
3. Click to view → Copy "User UID"

### 2.3 Add to Database
Run in SQL Editor (replace `YOUR_UID` and details):
```sql
INSERT INTO consultants (user_id, email, name)
VALUES 
  ('YOUR_UID_HERE', 'consultant@company.com', 'John Advisor'),
  ('ANOTHER_UID', 'jane@advisor.com', 'Jane Consultant');
```

✅ Verification:
```sql
SELECT * FROM consultants;
```

---

## Step 3: Test It (2 minutes)

### 3.1 Log in as Consultant
1. Go to: `https://your-app.netlify.app/dashboard.html`
2. Log in with consultant credentials
3. **Expected**: See "Consultant Dashboard" with "Managing 0 Companies"

### 3.2 Create First Company
1. Click "Add New Company"
2. Fill out wizard (use test data):
   - Company Name: "Test Corp"
   - Industry: "Technology"
   - Employees: "50"
   - Revenue: "$500K"
   - etc.
3. Complete all steps → Click "Finalize Submission"
4. **Expected**: Redirected to consultant dashboard, company appears in list

### 3.3 View Company
1. Click arrow on company card
2. **Expected**: Opens full dashboard with `?companyId=xyz` in URL
3. Click "Back to Client List"
4. **Expected**: Returns to consultant view

---

## ✅ SUCCESS CHECKLIST

After following above:
- [ ] Consultant logs in → sees Consultant Dashboard
- [ ] Can click "Add New Company" → wizard opens
- [ ] Can complete wizard → new company appears
- [ ] Can click company → full dashboard opens
- [ ] SME user logs in → sees ONLY their own company
- [ ] Search works in consultant dashboard

---

## 🚨 Troubleshooting

### Consultant sees "Setup Required" instead of dashboard

**Fix 1: Check UID matches**
```sql
-- Run this, replace YOUR_EMAIL
SELECT user_id FROM consultants WHERE email = 'YOUR_EMAIL';
-- Compare with logged UID in console
```

**Fix 2: RLS Policy**
```sql
-- Re-run this
CREATE POLICY "Public read access for consultants" 
ON consultants FOR SELECT USING (true);
```

**Fix 3: Clear cache**
- Open incognito window
- Log in again

### Company doesn't appear in consultant list

**Check database:**
```sql
SELECT id, company_name, consultant_id, user_id 
FROM profiles 
WHERE consultant_id = 'YOUR_UID';
```

If `consultant_id` is NULL → wizard didn't save consultant mode.
**Fix**: Clear browser cache, try "Add New Company" again.

### "Multiple GoTrueClient" warning

✅ Already fixed in latest code. Just redeploy.

---

## 🎯 Admin Operations

### List all consultants
```sql
SELECT user_id, name, email, created_at 
FROM consultants 
ORDER BY created_at DESC;
```

### List companies by consultant
```sql
SELECT p.id, p.company_name, p.details->>'industry' as industry, 
       c.name as consultant_name
FROM profiles p
JOIN consultants c ON p.consultant_id = c.user_id
ORDER BY c.name, p.company_name;
```

### Assign existing company to consultant
```sql
UPDATE profiles 
SET consultant_id = 'CONSULTANT_UID', user_id = NULL
WHERE id = 'COMPANY_UUID';
```

### Transfer company to SME
```sql
UPDATE profiles 
SET user_id = 'SME_UID', consultant_id = NULL
WHERE id = 'COMPANY_UUID';
```

### Remove consultant access
```sql
DELETE FROM consultants 
WHERE user_id = 'CONSULTANT_UID';
-- Note: Companies stay but become orphaned
```

---

## 📚 Documentation

- **Full Guide**: `CONSULTANT_LAYER_GUIDE.md`
- **Architecture**: `ARCHITECTURE.md`
- **Database Schema**: `src/db/consultant_schema.sql`

---

## 🎉 You're Done!

The consultant layer is now live. Your consultants can:
- ✅ Log in with their email
- ✅ See all assigned companies
- ✅ Add new companies via existing wizard
- ✅ Manage each company's full profile
- ✅ Search and filter their portfolio

SMEs still have their own isolated access.

**Ready for production!** 🚀
