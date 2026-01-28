# Super Admin Console - Architecture Overview

## 🏗️ **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN CONSOLE                      │
│                      (ai-admin.html)                        │
│  ┌───────────┐  ┌────────────┐  ┌──────────────┐          │
│  │  Models   │  │  Prompts   │  │   Settings   │          │
│  │   Tab     │  │    Tab     │  │     Tab      │          │
│  └─────┬─────┘  └──────┬─────┘  └───────┬──────┘          │
│        │                │                 │                 │
│        └────────────────┴─────────────────┘                 │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ CRUD Operations
                          ▼
              ┌───────────────────────┐
              │   SUPABASE DATABASE   │
              ├───────────────────────┤
              │   ┌──────────────┐    │
              │   │  ai_models   │    │
              │   ├──────────────┤    │
              │   │ · name       │    │
              │   │ · version    │    │
              │   │ · rank       │    │
              │   │ · usecase   │    │
              │   │ · enabled    │    │
              │   └──────────────┘    │
              │                       │
              │   ┌──────────────┐    │
              │   │  ai_prompts  │    │
              │   ├──────────────┤    │
              │   │ · key        │    │
              │   │ · template   │    │
              │   │ · websearch  │    │
              │   │ · temp       │    │
              │   │ · enabled    │    │
              │   └──────────────┘    │
              │                       │
              │   ┌──────────────┐    │
              │   │ ai_settings  │    │
              │   ├──────────────┤    │
              │   │ · key        │    │
              │   │ · value      │    │
              │   └──────────────┘    │
              └───────────────────────┘
                          ▲
                          │ Fetch Config
                          │ (cached 5min)
                          │
              ┌───────────────────────┐
              │   aiServiceDB.js      │
              ├───────────────────────┤
              │ · fetchConfig()       │
              │ · reliableGenerate()  │
              │ · generateFromTemplate()│
              └───────────────────────┘
                          ▲
                          │ Import & Use
                          │
              ┌───────────────────────┐
              │  APPLICATION CODE     │
              ├───────────────────────┤
              │ · ProfileWizard.jsx   │
              │ · DashboardMain.jsx   │
              │ · Other components    │
              └───────────────────────┘
```

---

## 🔄 **Data Flow**

### 1. Admin Makes Change
```
Admin opens console
  ↓
Edits prompt template
  ↓
Clicks "Save"
  ↓
Data saved to Supabase
  ↓
Change live in database
```

### 2. Application Uses Config
```
User triggers AI request
  ↓
aiServiceDB.fetchConfig()
  ↓
Check cache (5min TTL)
  ↓
If expired: Fetch from Supabase
  ↓
Apply configuration
  ↓
Call Gemini API
  ↓
Return result
```

---

## 📊 **Configuration Tables**

### ai_models
Stores AI model configuration

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| name | Text | Model name (e.g., gemini-2.5-flash) |
| version | Text | API version (v1beta, v1) |
| rank | Integer | Priority (higher = tried first) |
| enabled | Boolean | Active/inactive |
| supports_web_search | Boolean | Capability flag |
| use_case | Text | general/research/fallback |
| description | Text | Admin notes |

### ai_prompts
Stores prompt templates

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| key | Text | Unique key (e.g., COMPANY_RESEARCH) |
| name | Text | Display name |
| prompt_template | Text | Template with {variables} |
| use_web_search | Boolean | Enable web search |
| use_json_schema | Boolean | Enforce JSON output |
| temperature | Decimal | Creativity (0-1) |
| max_tokens | Integer | Response length |
| enabled | Boolean | Active/inactive |

### ai_settings
Stores global configuration

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| key | Text | Setting name |
| value | JSONB | Setting value |
| description | Text | Purpose explanation |

---

## 🎯 **Code Usage Patterns**

### Pattern 1: Named Template (RECOMMENDED)
```javascript
// Define once in database, use everywhere
const result = await generateFromTemplate('COMPANY_RESEARCH', {
    companyName: 'Zeus Engitech'
});
```

**Benefits:**
- Centralized prompts
- Easy to refine
- Consistent across app
- Web search configured in DB

### Pattern 2: Direct Call (For Dynamic Prompts)
```javascript
// When prompt is truly dynamic
const result = await reliableGenerateContent(
    `Custom prompt: ${dynamicContent}`,
    { useSearch: true, temperature: 0.3 }
);
```

**Use when:**
- Prompt varies significantly
- One-off requests
- Prototyping

### Pattern 3: Hybrid (Best Flexibility)
```javascript
// Use template but override settings
const result = await generateFromTemplate(
    'COMPANY_RESEARCH',
    { companyName: 'Acme' },
    { temperature: 0.5 } // Override default
);
```

---

## ⚡ **Performance Considerations**

### Caching Strategy
```
First request:
  ↓
Fetch from database (200-500ms)
  ↓
Cache for 5 minutes
  ↓
Subsequent requests use cache (0ms)
```

### Cache Invalidation
- **Automatic**: After 5 minutes
- **Manual**: Refresh page
- **Future**: Add "Reload Config" button

### Fallback Mechanism
```
Try database
  ↓
If fails → Use hardcoded config
  ↓
Log warning
  ↓
Continue operation
```

---

## 🔧 **Maintenance Workflows**

### Refine a Prompt
1. Notice AI giving poor results
2. Open admin console
3. Find prompt by key
4. Click "Edit"
5. Improve template
6. Save
7. Test in ~5 minutes
8. Iterate as needed

### Add New Model
1. Google announces new model
2. Open admin console
3. Click "+ Add Model"
4. Enter details
5. Set rank appropriately
6. Save
7. Model available immediately

### A/B Test Prompts
1. Disable old prompt
2. Create new prompt with same key + "_V2"
3. Update code to use new key
4. Compare results
5. Keep better version
6. Delete other

---

## 💡 **Advanced Use Cases**

### Dynamic Prompt Templates
```sql
-- Store in database
prompt_template: '
Act as {role}.
Company: {companyName}
Industry: {industry}

{instruction}

Output format: {format}
'
```

```javascript
// Use in code
const result = await generateFromTemplate('DYNAMIC_CONSULTANT', {
    role: 'Senior Strategy Advisor',
    companyName: 'Acme Corp',
    industry: 'Manufacturing',
    instruction: 'Suggest 3 expansion strategies',
    format: 'Numbered list'
});
```

### Conditional Web Search
```javascript
// In admin: Set use_web_search = false by default
// Override when needed:
const result = await generateFromTemplate(
    'STRATEGY_SUGGESTION',
    variables,
    { useSearch: needsFactualData } // Dynamic!
);
```

### Multi-Language Support
```sql
-- Store multiple versions
key: 'COMPANY_RESEARCH_EN'
key: 'COMPANY_RESEARCH_ES'
key: 'COMPANY_RESEARCH_FR'
```

```javascript
const key = `COMPANY_RESEARCH_${userLanguage}`;
const result = await generateFromTemplate(key, variables);
```

---

## 🎓 **Best Practices**

### Naming Conventions
```
GOOD:
- COMPANY_RESEARCH
- STRATEGY_DOMESTIC
- CHAT_FOLLOWUP

BAD:
- prompt1
- test
- v2
```

### Template Design
```
GOOD:
- Clear variable names {companyName}
- Explicit instructions
- Defined output format
- Examples included

BAD:
- Vague {data}
- No structure
- Ambiguous expectations
```

### Model Ranking
```
100: Primary fast model
90:  Secondary specialized model
80:  Tertiary fallback
70:  Testing/experimental
60-: Deprecated/legacy
```

---

## 📈 **Future Enhancements**

### Planned Features
- [ ] A/B testing UI
- [ ] Prompt version history
- [ ] Usage analytics
- [ ] Cost tracking
- [ ] Performance metrics
- [ ] Prompt marketplace
- [ ] Automated testing
- [ ] Role-based access

### Integration Ideas
- Slack alerts for config changes
- Git sync for backup
- Automated prompt optimization
- ML-based prompt suggestions

---

## 🎉 **Summary**

You now have a **complete no-code AI management system**:

| Feature | Status |
|---------|--------|
| Database schema | ✅ Created |
| Admin UI | ✅ Built |
| Dynamic service | ✅ Implemented |
| Template system | ✅ Ready |
| Documentation | ✅ Complete |

**What You Can Do:**
- ✅ Manage models without code
- ✅ Refine prompts in real-time
- ✅ Toggle web search per prompt
- ✅ A/B test variations
- ✅ Collaborate with team
- ✅ Deploy instantly

**Architecture Benefits:**
- 🚀 Hot reload (5min)
- 🎯 Centralized config
- 🔧 Easy maintenance
- 📊 Better tracking
- 🤝 Team collaboration

---

**Commit:** `a3c9227`  
**Status:** ✅ Complete and ready to use
