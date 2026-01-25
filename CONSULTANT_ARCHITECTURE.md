# Consultant Layer - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    WADHWANI ACCELERATE SYSTEM                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   SME User   │     │  Consultant  │     │    Admin     │
│   (role:sme) │     │(role:consult)│     │ (role:admin) │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  dashboard   │     │ consultant   │     │  (Future)    │
│   .html      │     │   .html      │     │ admin.html   │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│      profiles       │
├─────────────────────┤
│ user_id (PK)        │◄─────┐
│ company_name        │      │
│ role ───────────────┼──┐   │
│ details (JSONB)     │  │   │
└─────────────────────┘  │   │
                         │   │
         ┌───────────────┘   │
         │                   │
         ▼                   │
    'sme'                    │
    'consultant' ────────────┼─────┐
    'admin'                  │     │
                             │     │
                             │     │
┌─────────────────────┐      │     │
│    consultants      │      │     │
├─────────────────────┤      │     │
│ id (PK, UUID)       │      │     │
│ user_id (FK) ───────┼──────┘     │
│ consultant_name     │            │
│ email               │            │
│ specialization      │            │
│ active              │            │
└──────────┬──────────┘            │
           │                       │
           │                       │
           │  ┌─────────────────────────┐
           │  │  company_assignments    │
           │  ├─────────────────────────┤
           └──┼─ consultant_id (FK)     │
              │  company_user_id (FK) ──┼──┘
              │  assigned_at            │
              │  notes                  │
              └─────────────────────────┘
```

## User Flows

### Flow 1: Consultant Creates Company

```
┌──────────────┐
│ Consultant   │
│ logs in      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ consultant.html              │
│ ┌──────────────────────────┐ │
│ │ Consultant Dashboard     │ │
│ │ • List of companies      │ │
│ │ • Stats                  │ │
│ │ • [Add New Company] ◄────┼─┼─── Click
│ └──────────────────────────┘ │
└──────────────┬───────────────┘
               │
               │ Set session:
               │ • consultant_mode = true
               │ • consultant_id = UUID
               │
               ▼
┌──────────────────────────────┐
│ profile.html                 │
│ ┌──────────────────────────┐ │
│ │ Profile Wizard           │ │
│ │ (Consultant Mode)        │ │
│ │                          │ │
│ │ Step 1: Company Name     │ │
│ │ Step 2: Auto-fill        │ │
│ │ Step 3-9: Details        │ │
│ └──────────────────────────┘ │
└──────────────┬───────────────┘
               │
               │ On Save:
               │ 1. Create company profile
               │ 2. Create assignment
               │
               ▼
┌──────────────────────────────┐
│ consultant.html              │
│ ┌──────────────────────────┐ │
│ │ New company appears!     │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### Flow 2: Consultant Views Company

```
┌──────────────────────────────┐
│ consultant.html              │
│ ┌──────────────────────────┐ │
│ │ [Company Card] ◄─────────┼─┼─── Click
│ └──────────────────────────┘ │
└──────────────┬───────────────┘
               │
               │ Set session:
               │ • viewing_company_id
               │
               ▼
┌──────────────────────────────┐
│ dashboard.html               │
│ ┌──────────────────────────┐ │
│ │ [Consultant View] Badge  │ │
│ │                          │ │
│ │ Company Dashboard        │ │
│ │ • Blueprint              │ │
│ │ • Sprint View            │ │
│ │ • Actions                │ │
│ │                          │ │
│ │ [Logout] ◄───────────────┼─┼─── Returns to
│ └──────────────────────────┘ │     consultant.html
└──────────────────────────────┘
```

### Flow 3: SME User (Normal)

```
┌──────────────┐
│ SME User     │
│ logs in      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ dashboard.html               │
│ ┌──────────────────────────┐ │
│ │ Own Company Dashboard    │ │
│ │ • Can only see own data  │ │
│ │ • Cannot access          │ │
│ │   consultant.html        │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## Access Control Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROW LEVEL SECURITY (RLS)                    │
└─────────────────────────────────────────────────────────────────┘

Table: profiles
┌──────────────┬─────────────────────────────────────────────────┐
│ User Role    │ Can Access                                      │
├──────────────┼─────────────────────────────────────────────────┤
│ sme          │ • Own profile only                              │
│ consultant   │ • Own profile                                   │
│              │ • Assigned company profiles                     │
│ admin        │ • All profiles                                  │
└──────────────┴─────────────────────────────────────────────────┘

Table: consultants
┌──────────────┬─────────────────────────────────────────────────┐
│ User Role    │ Can Access                                      │
├──────────────┼─────────────────────────────────────────────────┤
│ sme          │ • None                                          │
│ consultant   │ • Own consultant record                         │
│ admin        │ • All consultant records                        │
└──────────────┴─────────────────────────────────────────────────┘

Table: company_assignments
┌──────────────┬─────────────────────────────────────────────────┐
│ User Role    │ Can Access                                      │
├──────────────┼─────────────────────────────────────────────────┤
│ sme          │ • None                                          │
│ consultant   │ • Own assignments only                          │
│ admin        │ • All assignments                               │
└──────────────┴─────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         REACT COMPONENTS                         │
└─────────────────────────────────────────────────────────────────┘

consultant.html
    │
    └── consultant.jsx
            │
            └── ConsultantDashboard.jsx
                    ├── Header
                    ├── Stats Cards
                    ├── Search Bar
                    └── Company Grid
                            └── CompanyCard (×N)

profile.html
    │
    └── profile.jsx
            │
            └── ProfileWizard.jsx
                    ├── Step 1-9 (Wizard)
                    ├── Consultant Mode Detection
                    └── Assignment Creation

dashboard.html
    │
    └── dashboard.jsx
            │
            └── DashboardMain.jsx
                    ├── Consultant Mode Detection
                    ├── "Consultant View" Badge
                    ├── Context View
                    ├── Sprint View
                    ├── Actions View
                    └── ActionPlanPanel
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSULTANT CREATES COMPANY                    │
└─────────────────────────────────────────────────────────────────┘

1. Click "Add New Company"
   │
   ├─ sessionStorage.setItem('consultant_mode', 'true')
   ├─ sessionStorage.setItem('consultant_id', UUID)
   └─ sessionStorage.setItem('consultant_user_id', USER_ID)
   │
   ▼
2. Redirect to profile.html
   │
   ▼
3. ProfileWizard detects consultant_mode
   │
   ▼
4. User fills wizard
   │
   ▼
5. On Save:
   │
   ├─ Generate new company_user_id
   │  (e.g., "company_1738012345_abc123")
   │
   ├─ INSERT INTO profiles
   │  ├─ user_id: company_user_id
   │  ├─ company_name: "ABC Corp"
   │  ├─ role: 'sme'
   │  └─ details: {...}
   │
   └─ INSERT INTO company_assignments
      ├─ consultant_id: from session
      ├─ company_user_id: new ID
      └─ assigned_by: consultant_user_id
   │
   ▼
6. Clear session storage
   │
   ▼
7. Redirect to consultant.html
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         SECURITY STACK                           │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Authentication
    ├─ Netlify Identity
    └─ Session Management

Layer 2: Authorization (Database)
    ├─ Row Level Security (RLS)
    ├─ Role-based policies
    └─ Foreign key constraints

Layer 3: Application Logic
    ├─ Role checking in components
    ├─ Session storage validation
    └─ Redirect protection

Layer 4: UI/UX
    ├─ Hide unauthorized features
    ├─ Show role-appropriate views
    └─ Clear mode indicators
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT                               │
└─────────────────────────────────────────────────────────────────┘

GitHub Repository
    │
    ├── Push to main branch
    │
    ▼
Netlify (Auto-deploy)
    │
    ├── Build React app
    ├── Deploy static files
    └── Configure redirects
    │
    ▼
Production URLs:
    ├── /index.html          (Home/Login)
    ├── /profile.html        (Wizard)
    ├── /dashboard.html      (SME Dashboard)
    └── /consultant.html     (Consultant Portal)

Supabase (Database)
    │
    ├── Tables
    ├── RLS Policies
    └── Views
```

---

**Legend:**
- `─` Connection/Flow
- `▼` Next Step
- `◄` User Action
- `├─` Branch/Option
- `└─` Final Branch
