# 🎓 Beginner's Guide to Consultant Layer

## What Did We Build?

Imagine you're a consultant who helps 10 different companies grow their business. Before, you had to log in separately to each company's account. Now, you have ONE dashboard where you can see all your clients and manage them easily!

## 🌟 The Big Picture

Think of it like this:

**Before:**
- You = 1 account
- Each company = 1 separate account
- To help 10 companies = Log in/out 10 times 😫

**After:**
- You = 1 consultant account
- You can see all 10 companies in one place
- Click any company to view/edit their details
- Add new companies easily ✨

## 📚 Key Terms (Simple Explanations)

| Term | What It Means |
|------|---------------|
| **SME** | Small/Medium Enterprise - a regular company user |
| **Consultant** | An advisor who helps multiple companies |
| **Admin** | Super user who can manage everything |
| **Dashboard** | The main screen you see when logged in |
| **Assignment** | Linking a consultant to a company they help |
| **Role** | What type of user you are (SME, Consultant, or Admin) |

## 🎯 What Each User Can Do

### Regular Company (SME)
```
✅ See their own company dashboard
✅ Edit their own company details
✅ Create action plans
❌ Cannot see other companies
❌ Cannot access consultant portal
```

### Consultant
```
✅ See all companies assigned to them
✅ Add new companies for clients
✅ View/edit any assigned company
✅ Access special consultant portal
❌ Cannot see unassigned companies
❌ Cannot assign themselves to companies
```

### Admin (You)
```
✅ Everything consultants can do
✅ Assign companies to consultants
✅ View all consultants
✅ Manage user roles
```

## 🚀 How to Get Started (Step-by-Step)

### Step 1: Setup the Database (One-Time)

**What:** Add new tables to store consultant data
**Where:** Supabase dashboard
**How:**

1. Open your web browser
2. Go to supabase.com and log in
3. Click on your project
4. Click "SQL Editor" in the left menu
5. Open the file `supabase_consultant_schema.sql` from your computer
6. Copy ALL the text
7. Paste it into the SQL Editor
8. Click the green "RUN" button
9. Wait for "Success" message

**What just happened?**
You created 3 new "tables" (like Excel sheets) in your database:
- `consultants` - stores consultant info
- `company_assignments` - tracks which consultant helps which company
- Added a `role` column to existing `profiles` table

### Step 2: Create Your First Consultant

**What:** Turn a regular user into a consultant
**Where:** Supabase SQL Editor
**How:**

1. First, the person needs to sign up normally on your website
2. Go to Netlify Identity dashboard
3. Find their email and copy their User ID (looks like: `abc123-def456-ghi789`)
4. Go back to Supabase SQL Editor
5. Paste this code (replace the parts in CAPS):

```sql
-- Step A: Make them a consultant
UPDATE profiles 
SET role = 'consultant' 
WHERE user_id = 'PASTE_USER_ID_HERE';

-- Step B: Add their consultant details
INSERT INTO consultants (user_id, consultant_name, email, specialization)
VALUES (
    'PASTE_USER_ID_HERE',
    'John Doe',
    'john@example.com',
    'Export Strategy'
);
```

6. Click RUN

**What just happened?**
You upgraded a regular user to a consultant. Now when they log in, they'll see the consultant dashboard!

### Step 3: Assign a Company to the Consultant

**What:** Let the consultant manage an existing company
**Where:** Supabase SQL Editor
**How:**

1. First, get the consultant's ID:
```sql
SELECT id, consultant_name FROM consultants;
```
Copy the `id` (looks like: `12345678-abcd-efgh-ijkl-123456789012`)

2. Get the company's user ID from the profiles table:
```sql
SELECT user_id, company_name FROM profiles WHERE role = 'sme';
```
Copy the company's `user_id`

3. Create the assignment:
```sql
INSERT INTO company_assignments (consultant_id, company_user_id)
VALUES (
    'PASTE_CONSULTANT_ID_HERE',
    'PASTE_COMPANY_USER_ID_HERE'
);
```

4. Click RUN

**What just happened?**
You connected the consultant to the company. Now the company will appear in the consultant's dashboard!

## 🎨 How to Use (For Consultants)

### Logging In

1. Go to: `https://your-website.com/consultant.html`
2. Log in with your email/password
3. You'll see your consultant dashboard!

### Viewing the Dashboard

You'll see:
- **Stats at the top** - How many companies you manage
- **Search bar** - Find companies quickly
- **Company cards** - Click any to view details
- **Add New Company button** - Create a new client

### Adding a New Company

1. Click the big "Add New Company" button
2. Fill out the form (company name, industry, etc.)
3. The AI will help auto-fill some details
4. Complete all 9 steps
5. Click "Save"
6. You'll return to your dashboard
7. The new company appears in your list!

### Viewing a Company's Dashboard

1. Click on any company card
2. You'll see their full dashboard
3. Notice the purple "Consultant View" badge at the top
4. You can view everything about the company
5. Click the logout button to return to your consultant dashboard

## 🔍 How to Check If It's Working

### Test 1: Can the consultant log in?
1. Go to `/consultant.html`
2. Log in
3. ✅ Should see consultant dashboard
4. ❌ If you see "Access Denied", check the role in database

### Test 2: Can they see assigned companies?
1. Look at the dashboard
2. ✅ Should see company cards
3. ❌ If empty, check company_assignments table

### Test 3: Can they add a company?
1. Click "Add New Company"
2. Fill the form
3. Save
4. ✅ Should return to dashboard with new company
5. ❌ If error, check browser console (F12)

### Test 4: Can they view a company?
1. Click a company card
2. ✅ Should see company dashboard
3. ✅ Should see "Consultant View" badge
4. ❌ If you see "Access Denied", check assignments

## 🐛 Common Problems & Solutions

### Problem: "Access Denied" when logging in

**Why:** User is not set as a consultant
**Fix:**
```sql
UPDATE profiles SET role = 'consultant' WHERE user_id = 'USER_ID';
```

### Problem: No companies showing

**Why:** No assignments created
**Fix:**
```sql
-- Check if assignments exist
SELECT * FROM company_assignments WHERE consultant_id = 'CONSULTANT_ID';

-- If empty, create one
INSERT INTO company_assignments (consultant_id, company_user_id)
VALUES ('CONSULTANT_ID', 'COMPANY_ID');
```

### Problem: Can't add new company

**Why:** Consultant record doesn't exist
**Fix:**
```sql
-- Check if consultant exists
SELECT * FROM consultants WHERE user_id = 'USER_ID';

-- If empty, create one
INSERT INTO consultants (user_id, consultant_name, email)
VALUES ('USER_ID', 'Name', 'email@example.com');
```

### Problem: Error when viewing company

**Why:** Session storage issue
**Fix:**
1. Open browser console (F12)
2. Go to "Application" tab
3. Clear "Session Storage"
4. Refresh page

## 📖 Where to Find Help

**Documentation Files:**
1. `CONSULTANT_IMPLEMENTATION_SUMMARY.md` - Complete overview
2. `CONSULTANT_SETUP_GUIDE.md` - Detailed setup steps
3. `CONSULTANT_QUICK_REFERENCE.md` - SQL commands
4. `CONSULTANT_ARCHITECTURE.md` - System diagrams
5. This file - Beginner's guide

**In the Code:**
- `src/ConsultantDashboard.jsx` - Consultant portal code
- `src/ProfileWizard.jsx` - Wizard code (lines 130-170 for consultant mode)
- `src/DashboardMain.jsx` - Dashboard code (lines 20-50 for consultant viewing)

**Database:**
- Supabase dashboard → Table Editor
- Look at: `consultants`, `company_assignments`, `profiles`

## 💡 Tips for Success

1. **Start Small**
   - Create 1 consultant first
   - Assign 1 company
   - Test everything
   - Then scale up

2. **Keep Notes**
   - Write down User IDs
   - Save SQL commands you use
   - Document any custom changes

3. **Use the Browser Console**
   - Press F12 to open
   - Check for errors
   - Look at "Console" and "Network" tabs

4. **Test in Incognito**
   - Open incognito window
   - Test as different users
   - Avoid cache issues

5. **Backup Before Changes**
   - Export database before major changes
   - Keep old SQL commands
   - Test on staging first if possible

## 🎓 Understanding the Flow

**When a consultant adds a company:**

```
1. Consultant clicks "Add New Company"
   ↓
2. System remembers: "This is consultant mode"
   ↓
3. Consultant fills the form
   ↓
4. System creates:
   - New company profile
   - Link between consultant and company
   ↓
5. Consultant returns to dashboard
   ↓
6. New company appears in the list!
```

**When a consultant views a company:**

```
1. Consultant clicks company card
   ↓
2. System remembers: "Show this company's data"
   ↓
3. Company dashboard loads
   ↓
4. Purple badge shows "Consultant View"
   ↓
5. Consultant can see everything
   ↓
6. Logout button returns to consultant dashboard
```

## ✅ Final Checklist

Before going live:

- [ ] Database schema installed
- [ ] At least 1 consultant created
- [ ] At least 1 company assigned
- [ ] Tested consultant login
- [ ] Tested adding company
- [ ] Tested viewing company
- [ ] Tested logout flow
- [ ] Checked on different browsers
- [ ] Verified data persists after refresh

## 🎉 You're Ready!

The consultant layer is now fully set up and ready to use. Start with one consultant and one company, make sure everything works, then add more!

**Remember:**
- Take it slow
- Test each step
- Use the documentation
- Check the browser console for errors
- The database is your friend - check it often!

---

**Need Help?**
1. Check the error message
2. Look in browser console (F12)
3. Check Supabase logs
4. Review the documentation files
5. Verify database tables and data

**You've got this! 🚀**
