# Consultant Layer Setup Guide

## Overview
This guide will walk you through setting up the consultant/advisor layer for managing multiple SME clients.

## Step 1: Database Setup

### 1.1 Run the Schema Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file `supabase_consultant_schema.sql`
4. Copy all the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute

This will create:
- `consultants` table - stores consultant profiles
- `company_assignments` table - maps consultants to companies
- Row Level Security (RLS) policies for access control
- A view for consultant dashboard queries

### 1.2 Verify Tables Created

In Supabase, go to **Table Editor** and confirm you see:
- `consultants`
- `company_assignments`
- `profiles` (should now have a `role` column)

## Step 2: Create Your First Consultant

### 2.1 Register a Consultant User

1. Have the consultant sign up via Netlify Identity
2. Note their `user_id` (you can find this in Netlify Identity dashboard)

### 2.2 Add Consultant to Database

Run this SQL in Supabase SQL Editor (replace values with actual data):

```sql
-- 1. Update the user's role in profiles table
UPDATE profiles 
SET role = 'consultant' 
WHERE user_id = 'NETLIFY_USER_ID_HERE';

-- 2. Create consultant record
INSERT INTO consultants (user_id, consultant_name, email, specialization, bio)
VALUES (
    'NETLIFY_USER_ID_HERE',
    'John Doe',
    'john@example.com',
    'Export Strategy & Market Entry',
    'Experienced consultant with 10+ years in international expansion'
);
```

## Step 3: Assign Companies to Consultant

### 3.1 Get the Consultant ID

```sql
SELECT id, consultant_name FROM consultants;
```

Note the `id` (UUID) of your consultant.

### 3.2 Assign Existing Company

```sql
INSERT INTO company_assignments (consultant_id, company_user_id, assigned_by, notes)
VALUES (
    'CONSULTANT_UUID_HERE',
    'COMPANY_USER_ID_HERE',
    'admin_user_id',
    'Initial assignment for Q1 2026'
);
```

## Step 4: Access the Consultant Portal

### 4.1 Login as Consultant

1. Go to `https://your-domain.netlify.app/consultant.html`
2. The consultant will be automatically logged in if they have an active Netlify Identity session
3. They will see their dashboard with all assigned companies

### 4.2 Add New Company

1. Click **"Add New Company"** button
2. Fill out the onboarding wizard on behalf of the client
3. The company will be automatically assigned to the consultant
4. Return to consultant dashboard to see the new company

## Step 5: View Company Dashboard as Consultant

1. From consultant dashboard, click on any company card
2. You'll be taken to that company's full dashboard
3. Notice the **"Consultant View"** badge in the header
4. Click the logout button to return to consultant dashboard

## Step 6: Create an Admin User (Optional)

### 6.1 Set Admin Role

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = 'ADMIN_USER_ID_HERE';
```

Admins can:
- View all consultants
- View all company assignments
- Manage assignments via SQL (UI coming later)

## Access Control Summary

| Role | Can View | Can Edit | Can Assign |
|------|----------|----------|------------|
| **SME** | Own company only | Own company only | ❌ |
| **Consultant** | Assigned companies | Assigned companies | ❌ |
| **Admin** | All companies & consultants | All | ✅ |

## Troubleshooting

### Consultant Can't See Companies

**Check:**
1. Consultant record exists in `consultants` table
2. `role` is set to 'consultant' in `profiles` table
3. Assignments exist in `company_assignments` table

```sql
-- Verify consultant setup
SELECT 
    p.user_id,
    p.role,
    c.consultant_name,
    COUNT(ca.id) as assigned_companies
FROM profiles p
LEFT JOIN consultants c ON c.user_id = p.user_id
LEFT JOIN company_assignments ca ON ca.consultant_id = c.id
WHERE p.user_id = 'USER_ID_HERE'
GROUP BY p.user_id, p.role, c.consultant_name;
```

### Access Denied Errors

**Solution:**
Ensure RLS policies are enabled and correctly configured. Re-run the schema SQL if needed.

### Company Not Showing in Consultant Dashboard

**Check:**
```sql
SELECT * FROM consultant_companies_view 
WHERE consultant_id = 'CONSULTANT_UUID_HERE';
```

If empty, verify the assignment exists:
```sql
SELECT * FROM company_assignments 
WHERE consultant_id = 'CONSULTANT_UUID_HERE';
```

## Next Steps

### Planned Features (Future)
- Admin panel UI for managing consultants
- Bulk assignment tools
- Consultant performance metrics
- Client communication tools
- Report generation

### Current Limitations
- Assignments must be created via SQL
- No UI for admin management (coming soon)
- Consultants cannot self-assign companies

## Security Notes

✅ **Implemented:**
- Row Level Security (RLS) on all tables
- Role-based access control
- Consultants can only view assigned companies
- SMEs cannot see other companies

⚠️ **Important:**
- Never share database credentials
- Always use environment variables for API keys
- Regularly audit user roles and assignments

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs for errors
3. Verify RLS policies are active
4. Check browser console for JavaScript errors

---

**Last Updated:** January 2026
**Version:** 1.0
