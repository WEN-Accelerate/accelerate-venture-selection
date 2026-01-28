-- AI Configuration Schema for Super Admin Console
-- This allows managing AI settings without code changes

-- 1. AI Models Configuration
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL DEFAULT 'v1beta',
    rank INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    supports_web_search BOOLEAN DEFAULT true,
    supports_json_schema BOOLEAN DEFAULT true,
    description TEXT,
    use_case TEXT, -- 'research', 'general', 'fallback'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI Prompts Configuration
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE, -- e.g. 'COMPANY_RESEARCH', 'STRATEGY_SUGGESTION'
    name TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    use_web_search BOOLEAN DEFAULT false,
    use_json_schema BOOLEAN DEFAULT false,
    json_schema JSONB,
    temperature DECIMAL(3,2) DEFAULT 0.2,
    max_tokens INTEGER DEFAULT 8192,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AI Settings (Global Configuration)
CREATE TABLE IF NOT EXISTS ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default models
INSERT INTO ai_models (name, version, rank, enabled, supports_web_search, use_case, description) VALUES
('gemini-2.5-flash', 'v1beta', 100, true, true, 'general', 'Fast general-purpose model - primary for most tasks'),
('gemini-3-flash-preview', 'v1beta', 90, true, true, 'research', 'Research model with web search capability'),
('gemini-pro-latest', 'v1beta', 80, true, true, 'fallback', 'Proven reliable fallback model')
ON CONFLICT (name) DO NOTHING;

-- Insert default prompts
INSERT INTO ai_prompts (key, name, prompt_template, use_web_search, use_json_schema, description, temperature, max_tokens) VALUES
(
    'COMPANY_RESEARCH',
    'Company Research',
    'Research the company "{companyName}".
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
    true,
    false,
    'Deep research for company profiles - requires web search',
    0.2,
    8192
),
(
    'STRATEGY_SUGGESTION',
    'Strategy Suggestion',
    'Act as a Strategy Consultant for {companyName} ({industry}).
Expansion Type: {ventureType}.

Define the 4 Dimensions of their expansion strategy:
1. Which Product/s? (What to sell)
2. What Proposition? (Value prop)
3. What Place? (Channel/Geo)
4. What Promotion? (Marketing)

Return JSON: { "product": "...", "proposition": "...", "place": "...", "promotion": "..." }',
    false,
    false,
    'Generate 4Ps expansion strategy - no web search needed',
    0.3,
    4096
),
(
    'CHAT_RESPONSE',
    'Chat Response',
    'Act as a Senior Growth Consultant for:
Company: {companyName}
Industry: {industry}
Product: {products}
Employees: {employees}
Current Revenue: {revenue}

Context: The user is defining their "{ventureType}" expansion strategy.
User Question: "{userMessage}"

Provide a short, specific, and high-impact piece of advice (max 2 sentences).',
    false,
    false,
    'Quick chat responses - optimized for speed',
    0.4,
    1024
)
ON CONFLICT (key) DO NOTHING;

-- Insert global settings
INSERT INTO ai_settings (key, value, description) VALUES
('blocklist_duration_ms', '300000'::jsonb, 'Duration to block rate-limited models (5 minutes)'),
('retry_attempts', '2'::jsonb, 'Number of retry attempts for failed requests'),
('default_temperature', '0.2'::jsonb, 'Default temperature for AI generation'),
('default_max_tokens', '8192'::jsonb, 'Default max output tokens')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_models_enabled ON ai_models(enabled, rank DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_key ON ai_prompts(key);
CREATE INDEX IF NOT EXISTS idx_ai_settings_key ON ai_settings(key);

-- Enable RLS (Row Level Security)
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - restrict in production)
CREATE POLICY "Allow public read access" ON ai_models FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON ai_prompts FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON ai_settings FOR SELECT USING (true);

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON ai_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_settings_updated_at BEFORE UPDATE ON ai_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ai_models IS 'AI model configurations - can be managed via super admin console';
COMMENT ON TABLE ai_prompts IS 'AI prompt templates with settings - editable via admin UI';
COMMENT ON TABLE ai_settings IS 'Global AI configuration settings';
