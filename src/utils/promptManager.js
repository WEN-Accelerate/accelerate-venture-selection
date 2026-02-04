import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache for prompts to avoid DB hits on every keystroke
let promptCache = {};

/**
 * Fetch a prompt template by slug.
 * 1. Checks memory cache.
 * 2. Fetches from Supabase 'ai_prompts' table.
 * 3. Falls back to provided default template.
 */
export const getPromptQuery = async (slug, defaultTemplate) => {
    // 1. Cache Check
    if (promptCache[slug]) return { template: promptCache[slug] };

    try {
        // 2. DB Fetch
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('template, is_active')
            .eq('slug', slug)
            .single();

        if (error || !data || !data.is_active) {
            console.warn(`⚠️ AI Prompt: DB fetch failed/missing for '${slug}'. Using hardcoded default.`);
            // Auto-insert default into cache so we don't spam DB on failure
            promptCache[slug] = defaultTemplate;
            return { template: defaultTemplate };
        }

        // Update Cache
        promptCache[slug] = data.template;
        return { template: data.template };

    } catch (e) {
        console.error("AI Prompt System Error:", e);
        return { template: defaultTemplate };
    }
};

/**
 * Hydrates a template string with variable values.
 * Replaces {{key}} with value.
 */
export const hydratePrompt = (template, variables) => {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return variables[key] !== undefined ? variables[key] : `[Missing: ${key}]`;
    });
};

/**
 * Clears the local prompt cache (useful when Admin updates a prompt)
 */
export const clearPromptCache = () => {
    promptCache = {};
    console.log("🧹 AI Prompt Cache Cleared");
};
