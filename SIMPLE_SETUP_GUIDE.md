# 🎯 Super Simple Setup Guide - No Coding Required!

## What We're Going to Do

We're adding a "consultant mode" to your app so advisors can manage multiple companies. This takes about 10 minutes.

---

## PART 1: Setup Database (5 minutes)

### Step 1: Open Supabase
1. Go to: **https://supabase.com**
2. Click **"Sign In"** (top right)
3. Log in with your account
4. You'll see a list of your projects
5. Click on your **"accelerate-venture-selection"** project (or whatever you named it)

### Step 2: Open SQL Editor
1. On the left sidebar, find and click **"SQL Editor"** (it has a "</>" icon)
2. Click the **"New query"** button (green button, top right)
3. You'll see a big empty text box

### Step 3: Copy the Migration Script
1. Open this file on your computer: `c:\Accelerate-venture-selection\src\db\consultant_schema.sql`
2. Press **Ctrl+A** (selects all the text)
3. Press **Ctrl+C** (copies it)

### Step 4: Paste and Run
1. Go back to Supabase (the SQL Editor tab)
2. Click in the big empty text box
3. Press **Ctrl+V** (pastes the script)
4. Click the **"RUN"** button (bottom right corner)
5. Wait 2-3 seconds

### Step 5: Check It Worked
Look at the bottom of the screen. You should see:
- ✅ **"Success. No rows returned"** (green checkmark)

If you see an error in red, take a screenshot and we'll fix it.

---

## PART 2: Create Your First Consultant Account (3 minutes)

### Step 1: Create an Account
1. Open your app: **https://YOUR-APP-NAME.netlify.app** (replace with your actual app URL)
2. Click **"Sign Up"** or **"Get Started"**
3. Enter the consultant's email (e.g., `consultant@yourcompany.com`)
4. Enter a password
5. Click **"Sign Up"**
6. **IMPORTANT**: After signing up, click **"Log Out"** - DON'T fill out any forms yet!

### Step 2: Get the User ID (Choose ONE option)

**OPTION A: Easy Way (From Supabase)**
1. Go back to Supabase
2. Click **"Authentication"** on the left sidebar (icon looks like a key)
3. Click **"Users"** at the top
4. Find the consultant's email in the list
5. Click on that email
6. You'll see **"UID"** - copy that long weird text (looks like: `a1b2c3d4-e5f6-7890...`)
7. Save it in Notepad - you'll need it in the next step

**OPTION B: From Browser (If Option A doesn't work)**
1. Open your app again
2. Log in with the consultant's email
3. Press **F12** on your keyboard (opens developer tools)
4. Click **"Console"** tab at the top
5. Look for text that says: `[App.checkProfile] Checking UID: ...`
6. Copy the weird text after "UID:" (looks like: `a1b2c3d4-e5f6-7890...`)
7. Save it in Notepad

---

## PART 3: Add Consultant to Database (2 minutes)

### Step 1: Open SQL Editor Again
1. Go back to Supabase
2. Click **"SQL Editor"** (left sidebar)
3. Click **"New query"** button

### Step 2: Run This Command
Copy this ENTIRE block and paste it into the SQL editor:

```sql
INSERT INTO consultants (user_id, email, name)
VALUES ('PASTE_THE_UID_HERE', 'consultant@email.com', 'Consultant Name');
```

**BEFORE YOU CLICK RUN:**
1. Replace `PASTE_THE_UID_HERE` with the UID you copied (keep the quotes!)
2. Replace `consultant@email.com` with the actual email
3. Replace `Consultant Name` with their actual name

**Example of what it should look like:**
```sql
INSERT INTO consultants (user_id, email, name)
VALUES ('a1b2c3d4-e5f6-7890-abcd-efghijklmnop', 'john@advisor.com', 'John Advisor');
```

### Step 3: Click RUN
1. Click the **"RUN"** button
2. You should see: ✅ **"Success. 1 row affected"**

### Step 4: Verify It Worked
Type this in a new SQL query and click RUN:
```sql
SELECT * FROM consultants;
```

You should see a table with your consultant's info. ✅

---

## PART 4: Test It! (2 minutes)

### Step 1: Log In as Consultant
1. Open your app: **https://YOUR-APP-NAME.netlify.app/dashboard.html**
2. Log in with the consultant's email and password
3. **What you should see**: A page that says **"Consultant Dashboard"** and **"Managing 0 Companies"**

### Step 2: Add a Test Company
1. Click the big **"Add New Company"** button
2. Fill out the form with test data:
   - Company Name: **"Test Company"**
   - Just put anything in the other fields
3. Go through all the steps (just click "Next" if you want)
4. At the end, click **"Finalize Submission"**

### Step 3: See Your Company
1. You should be redirected back to the Consultant Dashboard
2. You should now see **"Managing 1 Companies"**
3. You should see a card showing "Test Company"

🎉 **IT WORKS!**

---

## ❌ TROUBLESHOOTING - If Something Went Wrong

### Problem 1: "I see 'Setup Required' instead of Consultant Dashboard"

**Fix:**
1. Go to Supabase → SQL Editor
2. Run this query:
```sql
SELECT * FROM consultants;
```
3. Check if your consultant's email is there
4. If NOT there, go back to Part 3 and add them again
5. If it IS there, try these steps:
   - Clear your browser cache (Ctrl+Shift+Delete → Clear everything)
   - Log out and log in again
   - Try in a different browser (Chrome, Firefox, etc.)

### Problem 2: "I get an error when running the first SQL script"

**Most Common Errors:**

**Error: "relation 'profiles' does not exist"**
- This means your database doesn't have the profiles table yet
- You need to set up the basic database first
- Contact me/support to help with initial database setup

**Error: "duplicate key value violates unique constraint"**
- This means you already ran the script before
- That's OK! Skip to Part 2

**Error: "column 'consultant_id' already exists"**
- This means the migration was already done
- That's OK! Skip to Part 2

### Problem 3: "Company doesn't appear after I create it"

**Fix:**
1. Go to Supabase → SQL Editor
2. Run this query (replace YOUR_UID with the consultant's UID):
```sql
SELECT company_name, consultant_id, user_id 
FROM profiles 
WHERE consultant_id = 'YOUR_UID';
```
3. If you see the company there → Good! Just refresh the page
4. If you DON'T see it → The wizard didn't save it. Try creating another company

### Problem 4: "I can't find the SQL Editor in Supabase"

Look for these on the left sidebar:
- A "</>" icon that says "SQL Editor"
- Or a menu that says "Database" → click it → then "SQL Editor"

---

## 📞 STILL STUCK?

**Before asking for help, grab these screenshots:**

1. Screenshot of Supabase SQL Editor after running the migration
2. Screenshot of what you see when you log in (the "Setup Required" or whatever)
3. Screenshot of this query result:
```sql
SELECT * FROM consultants;
```

**Then send me:**
- The screenshots
- Your app URL (https://your-app.netlify.app)
- What step you're stuck on

---

## ✅ SUCCESS CHECKLIST

You know it's working when:
- [ ] You can log in with consultant email
- [ ] You see "Consultant Dashboard" (not "Setup Required")
- [ ] You see "Managing 0 Companies" (or 1, 2, etc.)
- [ ] You can click "Add New Company"
- [ ] After filling the form, company appears in the list
- [ ] You can click the arrow on a company card and see its details

**If all those work → YOU'RE DONE! 🎉**

---

## 🎯 Quick Reference: What Goes Where

**Supabase = Database**
- This is where all your data lives
- URL: https://supabase.com

**Netlify = Your Website**
- This is where your app lives
- URL: https://app.netlify.com

**Your App = What Users See**
- URL: https://YOUR-APP.netlify.app

**What we did:**
1. Updated the database (Supabase) to support consultants
2. Added a consultant to the database
3. Now when they log in, they see a different dashboard

---

## 🔄 To Add MORE Consultants Later

Just repeat Part 2 and Part 3:

1. Create account on your app → Log out
2. Get their UID (from Supabase → Authentication → Users)
3. Run this in SQL Editor (with their info):
```sql
INSERT INTO consultants (user_id, email, name)
VALUES ('THEIR_UID', 'their@email.com', 'Their Name');
```

Done! They can now log in and see the Consultant Dashboard.
