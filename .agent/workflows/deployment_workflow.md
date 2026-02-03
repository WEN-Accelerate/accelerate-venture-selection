---
description: Standard workflow for developing features in Dev and deploying to Prod
---

# Scalable Development Workflow

This document outlines the strategy for managing code changes safely.

## 1. The Two-Environment Strategy

We have established two permanent parallel versions of your application:

1.  **Production (Prod)**
    *   **Branch**: `main`
    *   **URL**: Your main website URL (e.g., `accelerate-venture.netlify.app`)
    *   **Rule**: NEVER write code directly here. This is the "Live Stage". It only receives code that has been tested.

2.  **Development (Dev)**
    *   **Branch**: `dev`
    *   **URL**: Your development URL (e.g., `dev--accelerate-venture.netlify.app`)
    *   **Rule**: We make all messy changes, experiments, and fixes here first.

## 2. Daily Routine (How we work)

Whenever you have a new request:

1.  **Switch to Dev**: I (the AI) will ensure we are on the `dev` branch.
2.  **Code & Test**: I will implement the changes.
3.  **You Verify**: You will check the `dev` URL to see if it works.
4.  **Promote to Prod**: Once you say "It's good", I will merge `dev` into `main` and push.

## 3. How to Promote to Production

When you are happy with the version on the Dev link, tell me:
> "Push changes to production" or "Deploy to live"

I will then run:
```bash
git checkout main
git merge dev
git push origin main
git checkout dev
```

## 4. Setup Instructions (One Time)

**Enable Branch Deploys in Netlify:**
1.  Go to **Netlify Dashboard** > **Site Configuration**.
2.  Go to **Build & Deploy** > **Continuous Deployment**.
3.  Look for **Branch Deploys**.
4.  Select **"Let me add individual branches"** and add `dev`.
5.  Now, whenever I push to `dev`, Netlify will build a distinct URL for it.
