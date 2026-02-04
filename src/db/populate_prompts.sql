-- Migration to populate ai_prompts table

INSERT INTO ai_prompts (slug, template, description, is_active) VALUES
(
    'company_research',
    'Research the company "{{companyName}}".
            Return a JSON object with these exact keys:
            {
                "name": "Legal Name",
                "industry": "Industry Category",
                "location": "HQ City, State",
                "logo": "URL to company logo (best guess)",
                "description": "2 sentence description",
                "promoters": ["Name 1", "Name 2"],
                "products": ["Product 1", "Product 2"],
                "customers": ["Segment 1"],
                "marketPosition": "Current standing",
                "employees": "Estimated count (e.g. 100-500)"
            }
            If specific data is not found, make a best guess or leave empty. Return ONLY JSON.',
    'Deep research on a company to auto-fill the profile wizard.',
    true
),
(
    'hypothetical_examples',
    'Context: Company {{companyName}}, Industry: {{industry}}, Product: {{products}}.
            Generate 2 hypothetical expansion scenarios (2 sentences each):
            1. Domestic Expansion Scenario
            2. International Expansion Scenario
            
            CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no additional text.
            Format: { "domestic": "string", "international": "string" }',
    'Generates hypothetical expansion scenarios for user inspiration.',
    true
),
(
    'explain_support_item',
    'Explain what "{{subItem}}" involves in the context of "{{category}}" for this company. Keep it to 1 sentence.',
    'Explains specific support items in the wizard.',
    true
),
(
    'generate_one_pager',
    'Generate a "One Page Executive Summary" for {{companyName}}''s expansion strategy.
            Data:
            - Goal: Reach {{growthTarget}} in 4 years.
            - Strategy: {{ventureType}} Expansion.
            - Description: {{strategyDescription}}
            - 4Ps: {{strategyDimensions}}
            - Help Needed: {{supportDetails}}

            Format as a cohesive narrative (approx 200 words).',
    'Creates the executive summary at the end of the wizard.',
    true
),
(
    'wizard_chat_advice',
    'Act as a Senior Growth Consultant for:
            Company: {{companyName}}
            Industry: {{industry}}
            Product: {{products}}
            Employees: {{employees}}
            Current Revenue: {{revenue}}
            
            Context: The user is defining their "{{ventureType}}" expansion strategy.
            User Question: "{{userMsg}}"
            
            Provide a short, specific, and high-impact piece of advice (max 2 sentences).',
    'Provides advice in the wizard chat interface.',
    true
),
(
    'learn_more_scenarios',
    'Context: Company {{companyName}}, Industry: {{industry}}.
            Goal: {{typeToAnalyze}} Expansion.
            
            Generate 6 distinct, hypothetical expansion scenarios (strategies) for this company.
            Each should be different (e.g. M&A, Organic, Partnership, Digital-First, etc.).
            
            Return JSON array of objects:
            [
                {
                    "title": "Strategy Name",
                    "recommendation": "2 sentence description of this specific approach.",
                    "type": "SCENARIO"
                }
            ]
            Return strictly JSON.',
    'Generates diverse expansion scenarios for the Learn More modal.',
    true
),
(
    'suggest_4ps',
    'Act as a Strategy Consultant for {{companyName}} ({{industry}}).
            Expansion Type: {{ventureType}}.
            
            Define the 4 Dimensions of their expansion strategy:
            1. Which Product/s? (What to sell)
            2. What Proposition? (Value prop)
            3. What Place? (Channel/Geo)
            4. What Promotion? (Marketing)

            Return JSON: { "product": "...", "proposition": "...", "place": "...", "promotion": "..." }',
    'Suggests the 4Ps of marketing strategy.',
    true
),
(
    'refine_strategy_transcript',
    'Act as a Strategy Consultant. Refine the expansion strategy for {{companyName}} based on this meeting transcript/notes.
            
            transcript: "{{transcriptStrategy}}"
            
            Current Context: {{ventureType}} Expansion.
            
            Task:
            1. Summarize the "How to expand" (Strategy Description) in 2 sentences.
            2. Extract the 4Ps: Product, Proposition, Place (Channel), Promotion.
            
            Return JSON: { "description": "...", "product": "...", "proposition": "...", "place": "...", "promotion": "..." }',
    'Refines strategy based on user voice transcript.',
    true
),
(
    'analyze_support_transcript',
    'Act as a Growth Diagnostics AI. Analyze this transcript to identify where the company needs EXTERNAL HELP (Wadhwani Foundation Support).
            
            Transcript: "{{transcriptSupport}}"
            
            Support Categories:
            - Product (Market Fit, Feature Roadmap, Tech Stack, UI/UX, QA)
            - Selling (Sales Scripting, Lead Gen, CRM, Training, Closing)
            - Placement (Channel Entry, Logistics, E-commerce, Retail, Supply Chain)
            - Money (Fundraising, Valuation, Modeling, Grants, Cash Flow)
            - People (Org Structure, Hiring, ESOP, Culture, Performance)
            - Process (Legal, Accounting, Agile, KPIs, Ops Manuals)
            
            Task:
            Identify specific areas where they need help. Map them to the categories above.
            Return JSON object where keys are "Category_SubItem" (e.g. "Product_Market Fit") and value is "WF" (for Wadhwani Foundation support) or "Self" (if they are doing it in-house).
            Only include mentioned items.
            Example: { "Product_Market Fit": "WF", "Structure_Hiring": "Self" }',
    'Analyzes transcript to identify support needs.',
    true
),
(
    'generate_action_plan',
    'Act as a Strategy Consultant for {{companyName}} (Industry: {{industry}}).
            
            COMPREHENSIVE CONTEXT:
            - Products: {{products}}
            - Target Customers: {{customers}}
            - Current Revenue: {{revenue}}
            - Team Size: {{employees}}
            - Core Strategy Statement: "{{strategyDescription}}"
            - Expansion Goal: {{ventureType}} Expansion targeting {{growthTarget}}.

            FOCUS AREA:
            - Capability to Build: "{{item}}"
            - Category: {{category}} Support
            - Execution Mode: {{type}} (Where ''WF'' = Wadhwani Foundation supported, ''Self'' = In-house)

            TASK:
            Create a highly specific, tactical Action Plan for executing this capability.
            
            Return a JSON object with:
            1. "description": A 2-sentence description of what this capability entails strategically.
            2. "context": Why is this specifically critical for {{ventureType}} expansion given the context above?
            3. "objectives": The primary specific outcome/objective to achieve implies success.
            4. "actions": An array of 5 specific, actionable sub-tasks. Each must have:
               - "text": The action text (be specific).
               - "masterclass": boolean (Is a workshop/training needed?)
               - "expert": boolean (Is expert consultation needed?)
               - "knowledge_pack": boolean (Is a template/guide/tool needed?)
            
            Return JSON only.',
    'Generates a detailed action plan for a specific capability card.',
    true
),
(
    'consultant_research_web',
    'You are researching a business consultant. Search the web for publicly available information.

SEARCH STRATEGY:
1. If LinkedIn URL provided: Search for "{{linkedInName}}" consultant professional profile
2. If Website provided: Visit {{website_url}}
3. Look for: Articles, interviews, company websites, professional directories, press releases

EXTRACT these details in JSON format:
{
    "name": "Full professional name",
    "location": "City, Country (e.g. Mumbai, India)",
    "industry_focus": "Key industries (Manufacturing, Technology, Healthcare - max 3)",
    "function_focus": "Expertise areas (Strategy, Operations, Finance - max 3)",
    "bio": "Professional summary - 3-4 sentences about experience, specialization, and value proposition",
    "past_companies": "Companies worked at or consulted for (comma-separated)",
    "other_comments": "Certifications, awards, notable projects, or methodologies"
}

SEARCH SOURCES TO TRY:
- "{{linkedin_url}}"
- "{{linkedInName}} consultant profile"
- "{{linkedInName}} professional biography"
- "{{website_url}}"

CRITICAL RULES:
- Search for PUBLIC information about this person (articles, bios, company pages)
- Do NOT make up information
- If you can''t find specific data, leave it empty
- Focus on professional credentials and experience
- Return ONLY valid JSON

Return JSON only.',
    'Researches a consultant using web sources.',
    true
),
(
    'consultant_extract_paste',
    'Extract consultant information from this LinkedIn profile text:

{{linkedInText}}

Parse and return ONLY valid JSON with these fields:
{
    "name": "Full name",
    "location": "City, Country",
    "industry_focus": "Industries mentioned (max 3, comma-separated)",
    "function_focus": "Functional expertise areas (max 3, comma-separated)",
    "bio": "Professional summary from About section (3-4 sentences)",
    "past_companies": "Companies from Experience section (comma-separated)",
    "other_comments": "Certifications, awards, skills mentioned"
}

Extract ONLY what is explicitly stated. Return valid JSON only.',
    'Extracts consultant info from pasted text.',
    true
),
(
    'consultant_extract_pdf',
    'You are analyzing a consultant''s resume/CV in PDF format.

Extract and return ONLY valid JSON with these fields:
{
    "name": "Full name from resume",
    "location": "City, Country if mentioned",
    "industry_focus": "Industries/sectors mentioned (max 3, comma-separated)",
    "function_focus": "Key skills/expertise areas (max 3, comma-separated)",
    "bio": "Professional summary - create 3-4 sentence bio based on experience",
    "past_companies": "Companies from work experience (comma-separated)",
    "other_comments": "Education, certifications, notable achievements"
}

Focus on professional experience and consulting-relevant information.
Return valid JSON only.

Resume content: {{fileName}}',
    'Extracts consultant info from PDF (simulated).',
    true
)
ON CONFLICT (slug) DO UPDATE
SET template = EXCLUDED.template,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;
