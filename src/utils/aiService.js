/**
 * AI Service - Optimized for Deep Research & Accuracy
 * 
 * Prioritizes models in order of research capability:
 * 1. Thinking models (exp-1206, etc.) - Best for complex reasoning
 * 2. Pro models (2.0-flash-exp, 1.5-pro) - Most capable
 * 3. Flash models - Fallback only
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Cache for discovered models
let discoveredModels = null;

/**
 * Discover and rank models by research capability
 */
const discoverModels = async () => {
    if (discoveredModels) return discoveredModels;

    try {
        console.log("AI Service: Discovering available models...");

        // Try both v1 and v1beta endpoints
        const endpoints = [
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`,
            `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;

                const data = await response.json();
                const models = data.models || [];

                // Filter for models that support generateContent
                const contentModels = models
                    .filter(m => {
                        // Must support generateContent
                        if (!m.supportedGenerationMethods?.includes('generateContent')) return false;

                        // Exclude image generation models (not suitable for text/JSON)
                        const name = m.name.toLowerCase();
                        if (name.includes('image-generation')) return false;
                        if (name.includes('imagen')) return false;

                        return true;
                    })
                    .map(m => {
                        const name = m.name.replace('models/', '');
                        return {
                            name,
                            fullName: m.name,
                            version: endpoint.includes('v1beta') ? 'v1beta' : 'v1',
                            // Rank by capability (higher = better for research)
                            rank: getModelRank(name)
                        };
                    })
                    .sort((a, b) => b.rank - a.rank); // Sort by rank descending

                if (contentModels.length > 0) {
                    console.log("AI Service: Discovered models (ranked):", contentModels.map(m => `${m.name} (rank: ${m.rank})`));
                    discoveredModels = contentModels;
                    return contentModels;
                }
            } catch (e) {
                continue;
            }
        }

        console.warn("AI Service: Could not discover any models");
        return [];

    } catch (error) {
        console.error("AI Service: Discovery failed:", error);
        return [];
    }
};

/**
 * Rank models by research/accuracy capability
 */
const getModelRank = (modelName) => {
    const name = modelName.toLowerCase();

    // Experimental thinking models (best for deep research)
    if (name.includes('thinking') || name.includes('exp-1206')) return 100;

    // Gemini 2.0 experimental models
    if (name.includes('gemini-2.0') && name.includes('exp')) return 90;

    // Pro models (high capability)
    if (name.includes('gemini-2.0') && name.includes('pro')) return 85;
    if (name.includes('gemini-1.5-pro')) return 80;
    if (name.includes('gemini-pro')) return 70;

    // Flash models (fast but less capable)
    if (name.includes('gemini-2.0') && name.includes('flash')) return 60;
    if (name.includes('gemini-1.5-flash')) return 50;

    // Gemini 1.0 (legacy)
    if (name.includes('gemini-1.0')) return 40;

    // Unknown models
    return 30;
};

/**
 * reliableGenerateContent - Uses best available model with optimized settings
 */
export const reliableGenerateContent = async (prompt, options = {}) => {
    if (!API_KEY) {
        console.warn("AI Service: No API Key found.");
        return null;
    }

    // Discover and rank available models
    const models = await discoverModels();

    if (models.length === 0) {
        console.error("AI Service: No models available with this API key");
        throw new Error("No AI models available. Please check your API key permissions.");
    }

    // Configuration for accurate, factual responses
    const generationConfig = {
        temperature: options.temperature ?? 0.1, // Low temperature = more deterministic/factual
        topK: options.topK ?? 40,
        topP: options.topP ?? 0.8,
        maxOutputTokens: options.maxOutputTokens ?? 8192,
    };

    // Try each model (already sorted by rank)
    for (const model of models) {
        try {
            console.log(`AI Service: Attempting ${model.name} (rank: ${model.rank}) via ${model.version}...`);

            const url = `https://generativelanguage.googleapis.com/${model.version}/${model.fullName}:generateContent?key=${API_KEY}`;

            const requestBody = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig
            };

            // Add search grounding for supported models (v1beta only)
            if (model.version === 'v1beta' && options.useSearch !== false) {
                requestBody.tools = [{
                    googleSearch: {}
                }];
                console.log(`  → Enabled web search grounding for ${model.name}`);
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`AI Service: ${model.name} failed (${response.status})`);
                continue; // Try next model
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                console.log(`AI Service: ✓ Success with ${model.name} (${text.length} chars)`);
                return text;
            }

            console.warn(`AI Service: ${model.name} returned empty response`);
            continue;

        } catch (error) {
            console.warn(`AI Service: ${model.name} exception:`, error.message);
            continue; // Try next model
        }
    }

    // All models failed
    console.error("AI Service: All discovered models failed.");
    throw new Error("AI Generation Failed: All available models returned errors.");
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
        console.error("JSON Parse Error (all strategies failed):", e);
        console.error("Problematic text:", text.substring(0, 500));
        return {};
    }
};
