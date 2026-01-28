/**
 * AI Service - Robust Gemini API Integration
 * 
 * CRITICAL FIX: Using v1 (stable) API instead of v1beta which causes 404s
 * The @google/generative-ai SDK defaults to v1beta, but gemini models aren't available there.
 * 
 * This service bypasses the SDK entirely and uses direct REST calls to the v1 API.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * reliableGenerateContent - Direct REST API calls with multiple model fallbacks
 * 
 * Strategy:
 * 1. Try gemini-1.5-flash via v1 REST API (Fast, widely available)
 * 2. Try gemini-1.5-pro via v1 REST API (More capable)
 * 3. Try gemini-pro via v1 REST API (Legacy stable)
 * 
 * Each attempt uses the stable v1 endpoint, NOT v1beta which causes 404s.
 */
export const reliableGenerateContent = async (prompt) => {
    if (!API_KEY) {
        console.warn("AI Service: No API Key found.");
        return null;
    }

    // Model list in order of preference
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    for (const modelName of models) {
        try {
            console.log(`AI Service: Attempting ${modelName} via v1 REST API...`);

            // CRITICAL: Use v1 (stable) NOT v1beta
            const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`;

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
                console.warn(`AI Service: ${modelName} failed (${response.status}):`, errorText);
                continue; // Try next model
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                console.log(`AI Service: Success with ${modelName}`);
                return text;
            }

            console.warn(`AI Service: ${modelName} returned empty response`);
            continue;

        } catch (error) {
            console.warn(`AI Service: ${modelName} exception:`, error);
            continue; // Try next model
        }
    }

    // All models failed
    console.error("AI Service: All models exhausted.");
    throw new Error("AI Generation Failed: All models returned errors.");
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
