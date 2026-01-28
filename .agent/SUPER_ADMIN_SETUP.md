# Super Admin Console - Setup & Usage Guide

## 🎯 **Overview**

The Super Admin Console allows you to manage ALL AI settings without touching code:
- ✅ **Models**: Add/edit/disable AI models
- ✅ **Prompts**: Manage prompt templates with variables
- ✅ **Settings**: Global AI configuration
- ✅ **Hot Reload**: Changes apply immediately (no deployment needed!)

---

## 📋 **Setup Instructions**

### Step 1: Run Database Migration

Execute the SQL schema in your Supabase dashboard:

```bash
# File: src/db/ai_config_schema.sql
```

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Paste contents of `ai_config_schema.sql`
4. Click "Run"
5. Verify tables created: `ai_models`, `ai_prompts`, `ai_settings`

### Step 2: Configure Admin Console

Edit `ai-admin.html` and replace placeholders:

```javascript
// Line ~550
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your URL
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your key
```

Get these values from:
- Supabase Dashboard → Project Settings → API

### Step 3: Access Admin Console

Open `ai-admin.html` in your browser:

```bash
# Option 1: Direct file
open ai-admin.html

# Option 2: Serve via dev server
# Place in /public folder and access at http://localhost:5173/ai-admin.html
```

---

## 🎨 **Using the Admin Console**

### Models Tab

**Add/Edit Models:**
1. Click "+ Add Model"
2. Fill in:
   - **Model Name**: e.g., `gemini-2.5-flash`
   - **Version**: `v1beta` or `v1`
   - **Rank**: Priority (higher = tried first)
   - **Use Case**: `general`, `research`, or `fallback`
   - **Web Search**: ✅ if model supports it
   - **Enabled**: ✅ to use this model
   - **Description**: Notes for reference
3. Click "Save Model"

**Model Management:**
- **Edit**: Change any settings on the fly
- **Disable**: Temporarily stop using a model
- **Delete**: Remove model permanently
- **Reorder**: Change rank to adjust priority

### Prompts Tab

**Add/Edit Prompts:**
1. Click "+ Add Prompt"
2. Fill in:
   - **Key**: Unique ID (e.g., `COMPANY_RESEARCH`)
   - **Name**: Display name
   - **Template**: Prompt with `{variables}`
   - **Temperature**: Creativity (0-1)
   - **Max Tokens**: Response length
   - **Web Search**: ✅ for factual queries
   - **Enabled**: ✅ to use this prompt
3. Click "Save Prompt"

**Using Variables in Templates:**
```
Research the company "{companyName}".
Industry: {industry}
Products: {products}

Return JSON with...
```

Variables are replaced at runtime:
```javascript
generateFromTemplate('COMPANY_RESEARCH', {
    companyName: 'Acme Corp',
    industry: 'Technology',
    products: 'SaaS platforms'
});
```

### Settings Tab

**Global Configuration:**
- **blocklist_duration_ms**: How long to block rate-limited models
- **retry_attempts**: Number of retries for failed requests
- **default_temperature**: Default AI creativity
- **default_max_tokens**: Default response length

---

## 💻 **Code Integration**

### Option 1: Use New DB-Driven Service

Replace imports in your code:

```javascript
// OLD
import { reliableGenerateContent } from './utils/aiService';

// NEW
import { reliableGenerateContent, generateFromTemplate } from './utils/aiServiceDB';
```

### Option 2: Use Template System

Much cleaner! Define prompts in admin, use by key:

```javascript
// Instead of this:
const prompt = `Research company "${companyName}"...`;
const result = await reliableGenerateContent(prompt, { useSearch: true });

// Do this:
const result = await generateFromTemplate('COMPANY_RESEARCH', {
    companyName: companyName
});
// Web search setting comes from database!
```

### Example Usage

```javascript
// Company research (uses template from database)
const companyData = await generateFromTemplate('COMPANY_RESEARCH', {
    companyName: 'Zeus Engitech'
});

// Strategy suggestion
const strategy = await generateFromTemplate('STRATEGY_SUGGESTION', {
    companyName: 'Zeus Engitech',
    industry: 'Heavy Engineering',
    ventureType: 'Domestic'
});

// Chat response
const reply = await generateFromTemplate('CHAT_RESPONSE', {
    companyName: profile.companyName,
    industry: profile.industry,
    products: profile.products,
    employees: profile.employees,
    revenue: profile.revenue,
    ventureType: profile.ventureType,
    userMessage: userQuestion
});
```

---

## 🔧 **Advanced Features**

### Hot Reload

Configuration is cached for 5 minutes, then auto-refreshed:
- No need to restart server
- Changes propagate within 5 minutes
- Force refresh by reloading page

### Fallback System

If database is unavailable, aiServiceDB automatically uses hardcoded fallback:
```javascript
{
    models: [
        { name: 'gemini-2.5-flash', version: 'v1beta' },
        { name: 'gemini-3-flash-preview', version: 'v1beta' },
        { name: 'gemini-pro-latest', version: 'v1beta' }
    ]
}
```

### Testing Changes

1. Make changes in admin console
2. Wait ~5 minutes OR clear cache manually
3. Test in application
4. Check console for new configuration:
   ```
   📡 Fetching AI configuration from database...
   ✅ Loaded config: 3 models, 5 prompts  
   ```

---

## 📊 **Best Practices**

### Model Management

**Ranking Strategy:**
```
100-110: Fast models for general use
80-99:   Research models with web search
60-79:   Specialized models
40-59:   Fallback models
1-39:    Emergency/testing models
```

**Use Cases:**
- `general`: Default for most tasks (fast, no web search)
- `research`: Company profiles, factual data (web search)
- `fallback`: Proven reliable backup

### Prompt Templates

**Good Template:**
```
Research company "{companyName}" in {industry}.

Return JSON:
{
  "name": "Legal name",
  "products": ["Product 1", "Product 2"]
}

ONLY return valid JSON.
```

**Bad Template:**
```
Tell me about {companyName}
```
(Too vague, no structure)

**Template Tips:**
- Use clear variable names: `{companyName}` not `{c}`
- Specify output format explicitly
- Include examples if needed
- Keep it focused and specific

### Web Search Settings

**Enable for:**
- Company research
- Market data
- Current events
- Competitor analysis

**Disable for:**
- Chat/Q&A
- Strategy suggestions
- Creative tasks
- Hypothetical scenarios

---

## 🚀 **Migration from Old System**

### Step-by-Step Migration

1. **Set up database** (run SQL schema)
2. **Configure admin console** (add Supabase credentials)
3. **Verify data** (check models and prompts loaded)
4. **Update one file** as test:
   ```javascript
   // ProfileWizard.jsx
   import { generateFromTemplate } from './utils/aiServiceDB';
   
   const handleScrape = async () => {
       const rawText = await generateFromTemplate('COMPANY_RESEARCH', {
           companyName: profile.companyName
       });
       // ... rest of code
   };
   ```
5. **Test thoroughly**
6. **Migrate remaining files**
7. **Remove old aiService.js** (optional, keep as backup)

### Rollback Plan

If issues occur:
```javascript
// Just switch imports back
import { reliableGenerateContent } from './utils/aiService'; // Old system
```

---

## 🎯 **Benefits**

| Aspect | Before | After |
|--------|--------|-------|
| **Change Prompts** | Edit code → commit → deploy | Edit in UI → done |
| **Add Models** | Edit code → commit → deploy | Click "+ Add Model" |
| **Enable Web Search** | Change code | Toggle checkbox |
| **Test Changes** | Full deployment | Immediate (5min cache) |
| **Refine Prompts** | Multiple deploys | Live editing |
| **Team Collaboration** | Code access needed | Admin panel access |

---

## 📝 **Example Workflow**

### Scenario: Improve Company Research Accuracy

**Old Way:**
1. Edit `ProfileWizard.jsx`
2. Change prompt text
3. Commit to git
4. Deploy to Netlify
5. Wait 2-5 minutes
6. Test
7. Repeat if needed

**New Way:**
1. Open admin console
2. Click "Edit" on `COMPANY_RESEARCH` prompt
3. Update template
4. Click "Save"
5. Wait 5 minutes (cache refresh)
6. Test
7. Iterate in real-time

### Scenario: Add New AI Model

**Old Way:**
1. Edit `aiService.js`
2. Add to MODELS array
3. Commit to git
4. Deploy
5. Test

**New Way:**
1. Click "+ Add Model"
2. Fill form
3. Click "Save"
4. Model available in 5 minutes

---

## 🔒 **Security Notes**

### Production Checklist

- [ ] Update RLS policies to restrict write access
- [ ] Create admin-only user role
- [ ] Add authentication to admin console
- [ ] Use environment variables for Supabase credentials
- [ ] Enable audit logging
- [ ] Regular backups of configuration

### RLS Policy Example

```sql
-- Only allow admins to modify
CREATE POLICY "Admin only write" ON ai_models
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 📚 **Summary**

You now have:
- ✅ **Database-driven AI config** (models, prompts, settings)
- ✅ **Beautiful admin UI** (easy management)
- ✅ **Template system** (cleaner code)
- ✅ **Hot reload** (instant changes)
- ✅ **No-code refinement** (iterate quickly)

**Result**: Refine your AI without touching code! 🎉

---

**Files Created:**
1. `src/db/ai_config_schema.sql` - Database schema
2. `src/utils/aiServiceDB.js` - Database-driven AI service
3. `ai-admin.html` - Super Admin Console UI
4. `.agent/SUPER_ADMIN_SETUP.md` - This guide

**Next Steps:**
1. Run SQL migration
2. Configure admin console
3. Test with one feature
4. Gradually migrate all AI calls
5. Remove old hardcoded config
