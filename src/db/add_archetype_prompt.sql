
-- Prompt for DOMESTIC expansion strategies (Ansoff Matrix)
INSERT INTO prompts (key, template, description)
VALUES (
    'generate_archetypes_domestic',
    'Act as a Growth Strategy Expert using Ansoff''s Matrix.
    Company: {{companyName}}
    Industry: {{industry}}
    Quadrant identified: {{quadrant}} (Market Focus: {{marketFocus}}, Product Focus: {{productFocus}}).
    Customer Model: {{customerModel}}.
    
    Goal: Generate 3 distinct, actionable strategy archetype cards for this specific quadrant.
    For "Market Deepening", specific tactics might include "Loyalty Program", "Upselling", "Distribution Efficiency". 
    Customize the titles to be specific (e.g. "Market Deepening: Loyalty Boost").

    Return strictly JSON:
    [
        {
            "title": "Strategy Name",
            "description": "2-line goal/context description tailored to the industry.",
            "outcome": "Example deliverable (e.g. ''Launch Plan'', ''Partnership Agreement'')"
        }
    ]',
    'Generates Ansoff Matrix strategy archetypes for domestic expansion.'
)
ON CONFLICT (key) DO UPDATE 
SET template = EXCLUDED.template;

-- Prompt for INTERNATIONAL expansion strategies (10 Common Modes)
INSERT INTO prompts (key, template, description)
VALUES (
    'generate_archetypes_international',
    'Act as an International Trade Expert.
    Company: {{companyName}}
    Industry: {{industry}}
    Sales Model: {{customerModel}} (Primary).
    Entry Preference: {{entryMode}}.
    
    Goal: Select the top 3-5 most relevant entry modes from this standard list:
    [Generating Importer Leads, Institutional Sales, Overseas Agents/Distributors, International Trade Expos, Foreign Office (FDI), Joint Ventures, Cross-border E-commerce, Merchant Exporters, Trade Missions, Franchise/Licensing].
    
    Logic Guide:
    - {{customerModel}} + Partnership -> Favor Agents, JV, Franchising.
    - {{customerModel}} + Organic -> Favor E-commerce, FDI, Trade Expos.
    - B2G -> Favor Institutional Sales, Trade Missions.
    
    Return strictly JSON array of objects:
    [
        {
            "title": "Strategy Name (choose from list)",
            "description": "2-line goal/context description.",
            "outcome": "Example deliverable."
        }
    ]',
    'Generates international expansion strategy archetypes based on 10 standard modes.'
)
ON CONFLICT (key) DO UPDATE 
SET template = EXCLUDED.template;
