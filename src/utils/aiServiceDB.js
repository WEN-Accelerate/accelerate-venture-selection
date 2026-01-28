/**
 * AI Service - Database-Driven Configuration
 * 
 * All settings (models, prompts, web search) are managed via Super Admin Console
 * Changes apply immediately without code deployment
 */

import { createClient } from '@supabase/supabase-js';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cache for configuration (refresh every 5 minutes)
let configCache = {
    models: null,
    prompts: null,
    settings: null,
    lastFetch: 0
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Blocklist for rate-limited models
const modelBlocklist = new Map();

/**
 * Fetch AI configuration from database
 */
const fetchConfig = async () => {
    const now = Date.now();

    // Return cached config if still valid
    if (configCache.models && (now - configCache.lastFetch) < CACHE_DURATION) {
        return configCache;
    }

    try {
        console.log('📡 Fetching AI configuration from database...');

        // Fetch in parallel
        const [modelsRes, promptsRes, settingsRes] = await Promise.all([
            supabase.from('ai_models').select('*').eq('enabled', true).order('rank', { ascending: false }),
            supabase.from('ai_prompts').select('*').eq('enabled', true),
            supabase.from('ai_settings').select('*')
        ]);

        if (modelsRes.error) throw modelsRes.error;
        if (promptsRes.error) throw promptsRes.error;
        if (settingsRes.error) throw settingsRes.error;

        configCache = {
            models: modelsRes.data || [],
            prompts: promptsRes.data || [],
            settings: settingsRes.data || [],
            lastFetch: now
        };

        console.log(`✅ Loaded config: ${configCache.models.length} models, ${configCache.prompts.length} prompts`);
        return configCache;

    } catch (error) {
        console.error('❌ Failed to fetch AI config:', error);

        // Fallback to hardcoded config if database fails
        return getFallbackConfig();
    }
};

/**
 * Fallback configuration (if database unavailable)
 */
const getFallbackConfig = () => {
    console.warn('⚠️ Using fallback AI configuration');
    return {
        models: [
            { name: 'gemini-2.5-flash', version: 'v1beta', rank: 100, enabled: true },
            { name: 'gemini-3-flash-preview', version: 'v1beta', rank: 90, enabled: true },
            { name: 'gemini-pro-latest', version: 'v1beta', rank: 80, enabled: true }
        ],
        prompts: [],
        settings: []
    };
};

/**
 * Get prompt configuration by key
 */
export const getPromptConfig = async (key) => {
    const config = await fetchConfig();
    return config.prompts.find(p => p.key === key);
};

/**
 * Check if model is currently blocked
 */
const isModelBlocked = (modelName) => {
    const blockedUntil = modelBlocklist.get(modelName);
    if (!blockedUntil) return false;

    if (Date.now() > blockedUntil) {
        modelBlocklist.delete(modelName);
        return false;
    }
    return true;
};

/**
 * Block a model temporarily
 */
const blockModel = (modelName, duration = 300000) => {
    modelBlocklist.set(modelName, Date.now() + duration);
    console.log(`⏸️ Blocked ${modelName} for ${duration / 1000}s`);
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Make API call to Gemini
 */
const callModel = async (model, prompt, generationConfig, options = {}) => {
    const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${API_KEY}`;

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig
    };

    // Enable web search if requested
    if (options.useSearch && model.version === 'v1beta') {
        requestBody.tools = [{ googleSearch: {} }];
        console.log(`  🔍 Web search enabled for ${model.name}`);
    }

    // Add JSON schema if provided
    if (options.responseSchema && model.version === 'v1beta') {
        requestBody.generationConfig = {
            ...requestBody.generationConfig,
            responseMimeType: "application/json",
            responseSchema: options.responseSchema
        };
        console.log(`  📋 JSON schema enforced`);
    }

    for (let attempt = 0; attempt <= 2; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (response.status === 429) {
                console.warn(`⚠️ ${model.name} rate limited (429)`);
                blockModel(model.name);
                return { error: 'rate_limit' };
            }

            if (!response.ok) {
                if (attempt < 2) {
                    const backoff = Math.pow(2, attempt) * 500;
                    console.log(`  ⏳ Retrying in ${backoff}ms...`);
                    await sleep(backoff);
                    continue;
                }
                return { error: 'http_error', status: response.status };
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) return { error: 'empty_response' };

            console.log(`✅ Success with ${model.name} (${text.length} chars)`);
            return { success: true, text };

        } catch (error) {
            if (attempt < 2) {
                await sleep(Math.pow(2, attempt) * 500);
                continue;
            }
            return { error: 'exception', message: error.message };
        }
    }

    return { error: 'max_retries' };
};

/**
 * Main function - generates content using database configuration
 */
export const reliableGenerateContent = async (prompt, options = {}) => {
    if (!API_KEY) {
        console.warn("❌ No API Key found");
        return null;
    }

    console.log("🚀 AI Service: Starting generation...");

    // Fetch configuration from database
    const config = await fetchConfig();

    // Filter available models
    const availableModels = config.models.filter(m => !isModelBlocked(m.name));

    if (availableModels.length === 0) {
        console.warn("⚠️ All models blocked, trying anyway...");
        availableModels.push(...config.models);
    }

    console.log(`📋 Using models: ${availableModels.map(m => m.name).join(', ')}`);

    // Generation config
    const generationConfig = {
        temperature: options.temperature ?? 0.2,
        topK: options.topK ?? 40,
        topP: options.topP ?? 0.85,
        maxOutputTokens: options.maxOutputTokens ?? 8192,
    };

    const callOptions = {
        useSearch: options.useSearch === true,
        responseSchema: options.responseSchema
    };

    if (callOptions.useSearch) {
        console.log(`🔍 Web search enabled`);
    } else {
        console.log(`⚡ Fast mode (no web search)`);
    }

    // Try each model
    for (const model of availableModels) {
        console.log(`⚡ Attempting ${model.name}...`);

        const result = await callModel(model, prompt, generationConfig, callOptions);

        if (result.success) {
            return result.text;
        }

        console.log(`  ↪️ Trying next model...`);
    }

    console.error("❌ All models failed");
    throw new Error("AI Generation Failed: All models returned errors");
};

/**
 * Generate content using a named prompt template
 */
export const generateFromTemplate = async (promptKey, variables = {}, options = {}) => {
    const promptConfig = await getPromptConfig(promptKey);

    if (!promptConfig) {
        throw new Error(`Prompt template "${promptKey}" not found`);
    }

    // Replace variables in template
    let prompt = promptConfig.prompt_template;
    for (const [key, value] of Object.entries(variables)) {
        prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    // Merge prompt config with options
    const mergedOptions = {
        useSearch: promptConfig.use_web_search,
        temperature: promptConfig.temperature,
        maxOutputTokens: promptConfig.max_tokens,
        responseSchema: promptConfig.json_schema,
        ...options // Allow overrides
    };

    console.log(`📝 Using template: ${promptConfig.name}`);

    return await reliableGenerateContent(prompt, mergedOptions);
};

/**
 * Helper to parse JSON from AI response
 */
export const cleanAndParseJson = (text) => {
    if (!text) return {};

    try {
        let clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        const lastBrace = clean.lastIndexOf('}');
        const lastBracket = clean.lastIndexOf(']');

        let start = -1, end = -1;

        if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
            start = firstBrace;
            end = lastBrace;
        } else if (firstBracket >= 0) {
            start = firstBracket;
            end = lastBracket;
        }

        if (start >= 0 && end >= 0 && end > start) {
            clean = clean.substring(start, end + 1);
        }

        try {
            return JSON.parse(clean);
        } catch (e) {
            clean = clean.replace(/,(\s*[}\]])/g, '$1');
            clean = clean.replace(/'/g, '"');
            return JSON.parse(clean);
        }

    } catch (e) {
        console.error("❌ JSON parse error:", e);
        console.error("📄 Problematic text:", text.substring(0, 500));
        return {};
    }
};
