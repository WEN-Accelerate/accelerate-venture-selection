# Consultant Layer - Quick Reference

## URLs

- **Consultant Dashboard:** `/consultant.html`
- **SME Dashboard:** `/dashboard.html`
- **Profile Wizard:** `/profile.html`
- **Home:** `/index.html`

## User Roles

```
sme         → Regular company user (default)
consultant  → Advisor managing multiple companies
admin       → Full system access
```

## Key SQL Commands

### Create Consultant
```sql
-- Step 1: Set role
UPDATE profiles SET role = 'consultant' WHERE user_id = 'USER_ID';

-- Step 2: Add consultant record
INSERT INTO consultants (user_id, consultant_name, email, specialization)
VALUES ('USER_ID', 'Name', 'email@example.com', 'Specialization');
```

### Assign Company to Consultant
```sql
INSERT INTO company_assignments (consultant_id, company_user_id, assigned_by)
VALUES ('CONSULTANT_UUID', 'COMPANY_USER_ID', 'admin_id');
```

### View Consultant's Companies
```sql
SELECT * FROM consultant_companies_view 
WHERE consultant_id = 'CONSULTANT_UUID';
```

### List All Consultants
```sql
SELECT c.*, p.role 
FROM consultants c
JOIN profiles p ON p.user_id = c.user_id
WHERE c.active = true;
```

### Remove Assignment
```sql
DELETE FROM company_assignments 
WHERE consultant_id = 'CONSULTANT_UUID' 
AND company_user_id = 'COMPANY_USER_ID';
```

## Session Storage Keys

When consultant creates/views companies:

```javascript
sessionStorage.setItem('consultant_mode', 'true');
sessionStorage.setItem('consultant_id', 'UUID');
sessionStorage.setItem('consultant_user_id', 'USER_ID');
sessionStorage.setItem('viewing_company_id', 'COMPANY_USER_ID');
```

## Flow Diagrams

### Consultant Creates Company
```
Consultant Dashboard
    ↓ Click "Add New Company"
Profile Wizard (consultant_mode=true)
    ↓ Complete wizard
Create company with new user_id
    ↓
Create assignment record
    ↓
Redirect to Consultant Dashboard
```

### Consultant Views Company
```
Consultant Dashboard
    ↓ Click company card
Set viewing_company_id in session
    ↓
Company Dashboard (consultant_mode=true)
    ↓ Shows "Consultant View" badge
    ↓ Logout button returns to consultant dashboard
```

## Database Schema

```
profiles
├── user_id (PK, TEXT)
├── company_name (TEXT)
├── role (TEXT) → 'sme' | 'consultant' | 'admin'
└── details (JSONB)

consultants
├── id (PK, UUID)
├── user_id (FK → profiles.user_id)
├── consultant_name (TEXT)
├── email (TEXT)
├── specialization (TEXT)
└── active (BOOLEAN)

company_assignments
├── id (PK, UUID)
├── consultant_id (FK → consultants.id)
├── company_user_id (FK → profiles.user_id)
├── assigned_at (TIMESTAMP)
└── notes (TEXT)
```

## Access Control Matrix

| Action | SME | Consultant | Admin |
|--------|-----|------------|-------|
| View own company | ✅ | ✅ | ✅ |
| View other companies | ❌ | ✅ (assigned only) | ✅ |
| Edit own company | ✅ | ✅ | ✅ |
| Edit other companies | ❌ | ✅ (assigned only) | ✅ |
| Create companies | ✅ | ✅ (for clients) | ✅ |
| Assign companies | ❌ | ❌ | ✅ |
| View consultants | ❌ | Own record | ✅ |

## Component Files

```
src/
├── ConsultantDashboard.jsx  → Main consultant portal
├── consultant.jsx           → Entry point
├── ProfileWizard.jsx        → Supports consultant mode
└── DashboardMain.jsx        → Supports consultant viewing

HTML files:
├── consultant.html          → Consultant portal page
├── dashboard.html           → Company dashboard
└── profile.html             → Onboarding wizard
```

## Testing Checklist

- [ ] Consultant can log in to `/consultant.html`
- [ ] Consultant sees assigned companies
- [ ] Consultant can add new company
- [ ] New company appears in consultant dashboard
- [ ] Consultant can view company dashboard
- [ ] "Consultant View" badge shows
- [ ] Logout returns to consultant dashboard
- [ ] SME user cannot access consultant portal
- [ ] SME user cannot see other companies
- [ ] Assignments persist after page reload

## Common Issues

**"Access Denied"**
→ Check role in profiles table

**Companies not showing**
→ Verify assignments in company_assignments table

**Can't create company**
→ Check consultant record exists

**RLS errors**
→ Re-run schema SQL to reset policies

---

For detailed setup instructions, see `CONSULTANT_SETUP_GUIDE.md`
