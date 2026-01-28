/**
 * AI Service - Auto-discovering Gemini API Integration
 * 
 * CRITICAL DISCOVERY: The API key doesn't have access to standard model names.
 * This service will auto-discover available models and use them dynamically.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Cache for discovered models
let discoveredModels = null;

/**
 * Discover available models by calling the ListModels API
 */
const discoverModels = async () => {
    if (discoveredModels) return discoveredModels;

    try {
        console.log("AI Service: Discovering available models...");

        // Try both v1 and v1beta endpoints
        const endpoints = [
            `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`,
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;

                const data = await response.json();
                const models = data.models || [];

                // Filter for models that support generateContent
                const contentModels = models
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => ({
                        name: m.name.replace('models/', ''),
                        fullName: m.name,
                        version: endpoint.includes('v1beta') ? 'v1beta' : 'v1'
                    }));

                if (contentModels.length > 0) {
                    console.log("AI Service: Discovered models:", contentModels);
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
 * reliableGenerateContent - Auto-discovers and uses available models
 */
export const reliableGenerateContent = async (prompt) => {
    if (!API_KEY) {
        console.warn("AI Service: No API Key found.");
        return null;
    }

    // Discover available models first
    const models = await discoverModels();

    if (models.length === 0) {
        console.error("AI Service: No models available with this API key");
        throw new Error("No AI models available. Please check your API key permissions.");
    }

    // Try each discovered model
    for (const model of models) {
        try {
            console.log(`AI Service: Attempting ${model.name} via ${model.version}...`);

            const url = `https://generativelanguage.googleapis.com/${model.version}/${model.fullName}:generateContent?key=${API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`AI Service: ${model.name} failed (${response.status}):`, errorText);
                continue; // Try next model
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                console.log(`AI Service: ✓ Success with ${model.name}`);
                return text;
            }

            console.warn(`AI Service: ${model.name} returned empty response`);
            continue;

        } catch (error) {
            console.warn(`AI Service: ${model.name} exception:`, error);
            continue; // Try next model
        }
    }

    // All models failed
    console.error("AI Service: All discovered models failed.");
    throw new Error("AI Generation Failed: All available models returned errors.");
};

/**
 * Helper to parse loose JSON often returned by AI
 */
export const cleanAndParseJson = (text) => {
    if (!text) return {};
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // Sometimes AI adds text before or after, find the first '{' and last '}'
        const first = clean.indexOf('{');
        const last = clean.lastIndexOf('}');
        if (first >= 0 && last >= 0) {
            clean = clean.substring(first, last + 1);
        }
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return {};
    }
};
