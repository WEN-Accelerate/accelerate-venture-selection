/**
 * AI Service - Ultra-Fast Direct API Implementation
 * 
 * Optimized for speed by:
 * - Using curated model list (no discovery overhead)
 * - Smart caching of rate-limited models
 * - Exponential backoff for retries
 * - Minimal API calls
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Dual-model strategy for optimal performance
// - Fast model (gemini-2.5-flash) for general tasks WITHOUT web search
// - Research model (gemini-3-flash-preview) for company profiles WITH web search
const MODELS = [
    { name: 'gemini-2.5-flash', version: 'v1beta', rank: 100, fast: true },        // Primary: Fast, no web search needed
    { name: 'gemini-3-flash-preview', version: 'v1beta', rank: 90, search: true }, // Fallback: With web search
    { name: 'gemini-pro-latest', version: 'v1beta', rank: 80 },                   // Emergency fallback
];

// Blocklist for rate-limited or failed models (clears after 5 minutes)
const modelBlocklist = new Map();
const BLOCKLIST_DURATION = 5 * 60 * 1000; // 5 minutes

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
const blockModel = (modelName, duration = BLOCKLIST_DURATION) => {
    modelBlocklist.set(modelName, Date.now() + duration);
    console.log(`⏸️ AI Service: Blocked ${modelName} for ${duration / 1000}s`);
};

/**
 * Sleep utility for retry logic
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Make a single API call with retry logic
 */
const callModel = async (model, prompt, generationConfig, options = {}) => {
    const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${API_KEY}`;

    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig
    };

    // CRITICAL: Enable Google Search grounding for accurate, factual responses
    // This prevents hallucination by grounding answers in real web search results
    if (options.useSearch !== false && model.version === 'v1beta') {
        requestBody.tools = [{
            googleSearch: {}
        }];
        console.log(`  🔍 Enabled web search grounding for ${model.name}`);
    }

    // Add JSON schema if provided (enforces structured output)
    if (options.responseSchema && model.version === 'v1beta') {
        requestBody.generationConfig = {
            ...requestBody.generationConfig,
            responseMimeType: "application/json",
            responseSchema: options.responseSchema
        };
        console.log(`  📋 Enforcing JSON schema`);
    }

    for (let attempt = 0; attempt <= 2; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            // Handle rate limiting (429)
            if (response.status === 429) {
                console.warn(`⚠️ AI Service: ${model.name} rate limited (429)`);
                blockModel(model.name, BLOCKLIST_DURATION);
                return { error: 'rate_limit', status: 429 };
            }

            // Handle other errors
            if (!response.ok) {
                console.warn(`⚠️ AI Service: ${model.name} failed (${response.status})`);

                // Block model on persistent errors
                if (response.status >= 500 || attempt === 2) {
                    blockModel(model.name, 60 * 1000); // 1 minute for server errors
                }

                // Retry with exponential backoff
                if (attempt < 2) {
                    const backoff = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s...
                    console.log(`  ⏳ Retrying in ${backoff}ms...`);
                    await sleep(backoff);
                    continue;
                }

                return { error: 'http_error', status: response.status };
            }

            // Parse response
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                console.warn(`⚠️ AI Service: ${model.name} returned empty response`);
                return { error: 'empty_response' };
            }

            // Extract grounding metadata (sources) if available
            const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
            const sources = groundingMetadata?.groundingChunks?.map(chunk => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title
            })).filter(s => s.uri) || [];

            if (sources.length > 0) {
                console.log(`  📚 Found ${sources.length} web sources`);
            }

            console.log(`✅ AI Service: Success with ${model.name} (${text.length} chars)`);
            return { success: true, text, sources };

        } catch (error) {
            console.warn(`⚠️ AI Service: ${model.name} exception:`, error.message);

            // Retry on network errors
            if (attempt < 2) {
                const backoff = Math.pow(2, attempt) * 500;
                console.log(`  ⏳ Retrying in ${backoff}ms...`);
                await sleep(backoff);
                continue;
            }

            return { error: 'exception', message: error.message };
        }
    }

    return { error: 'max_retries' };
};

/**
 * reliableGenerateContent - Optimized for speed and reliability
 */
export const reliableGenerateContent = async (prompt, options = {}) => {
    if (!API_KEY) {
        console.warn("❌ AI Service: No API Key found.");
        return null;
    }

    console.log("🚀 AI Service: Starting generation...");

    // Configuration optimized for speed and accuracy
    const generationConfig = {
        temperature: options.temperature ?? 0.2, // Slightly higher for better quality
        topK: options.topK ?? 40,
        topP: options.topP ?? 0.85,
        maxOutputTokens: options.maxOutputTokens ?? 8192,
    };

    // Filter out blocked models
    const availableModels = MODELS.filter(m => !isModelBlocked(m.name));

    if (availableModels.length === 0) {
        console.warn("⚠️ AI Service: All models are currently blocked. Trying anyway...");
        // If all blocked, try them anyway (blocklist might be stale)
        availableModels.push(...MODELS);
    }

    console.log(`📋 AI Service: Trying ${availableModels.length} models: ${availableModels.map(m => m.name).join(', ')}`);

    // Web search is OPTIONAL - only enable when explicitly requested
    // Default: OFF for speed, enable for company research
    const callOptions = {
        useSearch: options.useSearch === true, // Default: disabled (fast)
        responseSchema: options.responseSchema  // Optional JSON schema
    };

    if (callOptions.useSearch) {
        console.log(`🔍 Web search grounding will be enabled for accuracy`);
    } else {
        console.log(`⚡ Fast mode: Web search disabled`);
    }

    // Try each available model
    for (const model of availableModels) {
        console.log(`⚡ AI Service: Attempting ${model.name}...`);

        const result = await callModel(model, prompt, generationConfig, callOptions);

        if (result.success) {
            return result.text;
        }

        // Continue to next model on any error
        console.log(`  ↪️ Trying next model...`);
    }

    // All models failed
    console.error("❌ AI Service: All models failed.");
    throw new Error("AI Generation Failed: All models returned errors. Please try again later.");
};

/**
 * Helper to parse loose JSON often returned by AI
 * Handles multiple formats: pure JSON, markdown blocks, narrative + JSON, etc.
 */
export const cleanAndParseJson = (text) => {
    if (!text) return {};

    try {
        // Strategy 1: Remove markdown code blocks
        let clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        // Strategy 2: Extract JSON from mixed content
        // Look for the first '{' or '[' and last '}' or ']'
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        const lastBrace = clean.lastIndexOf('}');
        const lastBracket = clean.lastIndexOf(']');

        // Determine if it's an object or array
        let start = -1;
        let end = -1;

        if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
            // Object
            start = firstBrace;
            end = lastBrace;
        } else if (firstBracket >= 0) {
            // Array
            start = firstBracket;
            end = lastBracket;
        }

        if (start >= 0 && end >= 0 && end > start) {
            clean = clean.substring(start, end + 1);
        }

        // Strategy 3: Try to parse
        try {
            return JSON.parse(clean);
        } catch (e) {
            // Strategy 4: Try to fix common JSON issues
            // Remove trailing commas before } or ]
            clean = clean.replace(/,(\s*[}\]])/g, '$1');
            // Fix single quotes to double quotes (common AI mistake)
            clean = clean.replace(/'/g, '"');
            // Try again
            return JSON.parse(clean);
        }

    } catch (e) {
        console.error("❌ JSON Parse Error (all strategies failed):", e);
        console.error("📄 Problematic text:", text.substring(0, 500));
        return {};
    }
};

/**
 * Generates content with mandatory Company Context injection.
 * 
 * @param {string} prompt - The specific prompt for the task
 * @param {object} profile - The company profile object (must contain companyName, industry, etc.)
 * @param {object} options - Generation options (useSearch, etc.)
 */
export const generateWithContext = async (prompt, profile, options = {}) => {
    if (!profile) {
        console.warn("⚠️ generateWithContext called without profile! Falling back to raw prompt.");
        return reliableGenerateContent(prompt, options);
    }

    const contextBlock = `
--- GLOBAL COMPANY CONTEXT ---
Company: ${profile.companyName || 'Unspecified'}
Industry: ${profile.industry || 'Unspecified'}
Product/Service: ${profile.products || 'Unspecified'}
Target Customer: ${profile.customers || 'Unspecified'}
Employees: ${profile.employees || 'Unknown'}
Location: ${profile.location || 'Unknown'}
Current Revenue: ${profile.revenue || 'Unknown'}
Venture Type: ${profile.ventureType} Expansion
Strategy Description: "${profile.strategyDescription || 'N/A'}"
--- END CONTEXT ---

Task:
${prompt}
    `;

    console.log("🧬 AI Service: Injecting Company Context...");
    return reliableGenerateContent(contextBlock, options);
};
