INSERT INTO ai_prompts (slug, template, description, is_active) VALUES
(
    'suggest_stream_goals',
    'Act as a Senior Strategy Consultant.
    
    Context:
    Venture Description: "{{strategyDescription}}"
    Industry: "{{industry}}"
    Growth Target: "{{growthTarget}}"
    
    Task:
    For the operational stream "{{streamName}}", propose 5 distinct, specific, measurable, and outcome-focused End Goals.
    These should not be mere activities, but clear milestones/states of success (e.g., "Achieve $1M ARR via direct sales" instead of "Hire sales team").
    
    Return a JSON object with a single key "goals" containing an array of 5 strings.
    Example: { "goals": ["Goal 1...", "Goal 2...", ...] }
    Return ONLY valid JSON.',
    'Suggests 5 measurable goals for a specific business stream.',
    true
),
(
    'generate_substreams',
    'Act as an Execution Expert and Project Manager.
    
    Context:
    Stream: "{{streamName}}"
    Selected End Goal: "{{endGoal}}"
    Venture Context: {{strategyDescription}}
    
    Task:
    Generate 5 SMART sub-streams (actions/checkpoints) to achieve this End Goal.
    Spread them out over a timeline (approx 30, 90, 120, 150, 180 days).
    
    Return a JSON array of objects with this exact schema:
    [
        {
            "title": "Short Action Title",
            "description": "Specific action description",
            "deliverable": "Tangible output/artifact",
            "days_due": 30
        }
    ]
    Return ONLY valid JSON.',
    'Generates 5 execution milestones for a selected stream goal.',
    true
),
(
    'generate_stream_playbook',
    'Act as a Business Process Expert.
    
    Context:
    Stream: "{{streamName}}"
    Action: "{{actionTitle}}"
    Goal: "{{endGoal}}"
    
    Task:
    Create a comprehensive, interactive "Playbook" for executing this specific action.
    Output MUST be valid HTML code using Tailwind CSS for styling.
    
    Structure:
    1. Title & Executive Summary
    2. Step-by-Step SOP (Standard Operating Procedure)
    3. Required Resources & Tools
    4. Key Performance Indicators (KPIs)
    5. Common Risks & Mitigation
    
    Design:
    - Use a clean, professional, "Enterprise SaaS" aesthetic (Inter font, slate/blue colors).
    - Use cards, lists, and clear typography.
    - Do NOT include <html> or <body> tags, just the inner content container.
    
    Return ONLY the HTML string.',
    'Generates a detailed HTML playbook for a specific action.',
    true
)
ON CONFLICT (slug) DO UPDATE
SET template = EXCLUDED.template,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;
