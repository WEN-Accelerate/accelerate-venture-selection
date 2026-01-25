# 🏗️ Consultant Layer Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN SCREEN                              │
│                       (index.html)                               │
│                                                                   │
│   ┌─────────────┐         ┌──────────────┐                      │
│   │ SME Login   │         │ Guest Access │                      │
│   └──────┬──────┘         └──────┬───────┘                      │
└──────────┼───────────────────────┼──────────────────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ROLE DETECTION                                 │
│                  (DashboardMain.jsx)                              │
│                                                                   │
│   1. Check: Is user in 'consultants' table?                      │
│   2. Check: Does user have 'consultant_id' assignments?          │
│   3. Check: Does user have SME 'user_id' profile?                │
└──────────┬────────────────┬─────────────────┬────────────────────┘
           │                │                 │
   ┌───────▼───────┐   ┌────▼────┐   ┌───────▼────────┐
   │  CONSULTANT   │   │   SME   │   │  GUEST / NEW   │
   │   DASHBOARD   │   │DASHBOARD│   │  → Onboarding  │
   └───────┬───────┘   └────┬────┘   └────────────────┘
           │                │
           │                │
    ┌──────▼──────────────────────────────────────────────────┐
    │        CONSULTANT DASHBOARD                             │
    │        (ConsultantDashboard.jsx)                        │
    │                                                          │
    │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
    │  │ Company A  │  │ Company B  │  │ Company C  │        │
    │  │ Industry   │  │ Industry   │  │ Industry   │        │
    │  │ Progress   │  │ Progress   │  │ Progress   │        │
    │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
    │        │                │                │               │
    │        └────────────────┴────────────────┘               │
    │                        │                                 │
    │        ┌───────────────▼───────────────┐                │
    │        │   📝 Add New Company Button   │                │
    │        └───────────────┬───────────────┘                │
    └────────────────────────┼──────────────────────────────┘
                             │
                             ▼
    ┌────────────────────────────────────────────────────────┐
    │           ONBOARDING WIZARD                            │
    │           (ProfileWizard.jsx)                          │
    │                                                         │
    │   Session Flags:                                       │
    │   • accelerate_consultant_mode = 'true'                │
    │   • accelerate_consultant_id = 'consultant_uid'        │
    │                                                         │
    │   Steps: Company → Industry → Revenue → Strategy...    │
    │                                                         │
    │   On Save:                                             │
    │   • consultant_id = consultant_uid                     │
    │   • user_id = NULL (not yet assigned to SME)           │
    └───────────────────────┬────────────────────────────────┘
                            │
                            ▼
    ┌────────────────────────────────────────────────────────┐
    │              SUPABASE DATABASE                         │
    │                                                         │
    │   profiles table:                                      │
    │   ┌──────────┬──────────────┬───────────────┐         │
    │   │ id       │ consultant_id│ user_id       │         │
    │   ├──────────┼──────────────┼───────────────┤         │
    │   │ uuid-1   │ cons-123     │ NULL          │ ← New   │
    │   │ uuid-2   │ cons-123     │ sme-456       │ ← Owned │
    │   │ uuid-3   │ NULL         │ sme-789       │ ← Direct│
    │   └──────────┴──────────────┴───────────────┘         │
    │                                                         │
    │   consultants table:                                   │
    │   ┌──────────┬─────────┬──────────────────┐           │
    │   │ user_id  │ name    │ email            │           │
    │   ├──────────┼─────────┼──────────────────┤           │
    │   │ cons-123 │ John D. │ john@advisor.com │           │
    │   └──────────┴─────────┴──────────────────┘           │
    └────────────────────────────────────────────────────────┘
```

## Access Control Matrix

| User Type  | Can View                    | Can Edit                    | Can Create             |
|------------|-----------------------------|-----------------------------|------------------------|
| SME        | ✅ Own profile only         | ✅ Own profile only         | ✅ Own profile         |
| Consultant | ✅ All assigned companies   | ✅ All assigned companies   | ✅ New client profiles |
| Admin      | ✅ All (via DB)             | ✅ All (via DB)             | ✅ All (via DB)        |
| Guest      | ✅ Local draft only         | ✅ Local draft only         | ✅ Draft → must login  |

## RLS Policy Flow

```sql
-- When User tries to access profiles table:

User makes request → Supabase Auth validates → RLS checks:

┌─────────────────────────────────────────┐
│ Is auth.uid()::text = user_id?          │ → YES → Grant Access (SME)
└────────────┬────────────────────────────┘
             │ NO
             ▼
┌─────────────────────────────────────────┐
│ Is auth.uid()::text = consultant_id?    │ → YES → Grant Access (Consultant)
└────────────┬────────────────────────────┘
             │ NO
             ▼
         DENY ACCESS
```

## Key Files

```
src/
├── App.jsx                      (Landing page + auth check)
├── ProfileWizard.jsx            (Onboarding wizard with consultant mode)
├── DashboardMain.jsx            (Role router + SME dashboard)
├── ConsultantDashboard.jsx      (Consultant multi-company view)
├── supabaseClient.js            (Singleton DB connection)
└── db/
    └── consultant_schema.sql    (Database migration script)
```

## Data Flow: Add New Company

```
Consultant Dashboard
     │
     │ 1. Click "Add New Company"
     ▼
Set Session Flags
  • consultant_mode = 'true'
  • consultant_id = user.uid
     │
     │ 2. Redirect to /profile.html
     ▼
ProfileWizard.jsx
     │
     │ 3. User fills company data
     ▼
handleSave()
     │
     │ 4. Read session flags
     │    consultantMode = true?
     ▼
     YES → Set consultant_id
           Set user_id = NULL
     │
     │ 5. INSERT INTO profiles
     ▼
Supabase RLS
     │
     │ 6. Check: consultant_id = auth.uid()?
     ▼
     YES → Allow INSERT
     │
     │ 7. Clear session flags
     ▼
Redirect to /dashboard.html
     │
     │ 8. Auto-detects consultant role
     ▼
Show Consultant Dashboard
  (new company appears in list)
```

## State Management

### Session Storage (Temporary)
```javascript
// Set during "Add New Company"
sessionStorage.setItem('accelerate_consultant_mode', 'true');
sessionStorage.setItem('accelerate_consultant_id', user.uid);

// Cleared after save
sessionStorage.removeItem('accelerate_consultant_mode');
sessionStorage.removeItem('accelerate_consultant_id');
```

### Local Storage (Fallback Only)
```javascript
// Legacy support for offline/localStorage mode
localStorage.getItem('user_profile_data')  // SME draft
localStorage.getItem('accelerate_guest_id') // Guest session
```

### Supabase Auth
```javascript
// Primary source of truth
netlifyIdentity.currentUser().id  // User UID
supabase.auth.getUser()          // Alternative check
```

## Environment Variables

```env
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional (AI features)
VITE_GEMINI_API_KEY=your-gemini-key
```

## Testing Checklist

- [ ] Run SQL migration (consultant_schema.sql)
- [ ] Add test consultant to database
- [ ] Log in as consultant → See dashboard
- [ ] Click "Add New Company" → Complete wizard
- [ ] Verify company appears in list
- [ ] Click company → Opens SME dashboard with ?companyId=X
- [ ] Click "Back to Client List" → Returns to consultant view
- [ ] Log in as SME → Cannot see other companies
- [ ] Verify search functionality
- [ ] Test RLS policies (try accessing other UIDs via console)
