import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * reliableGenerateContent - Centralized AI generation with fallbacks
 * 
 * Strategy:
 * 1. Try SDK with 'gemini-1.5-flash' (Fast, efficient, widely available)
 * 2. Try SDK with 'gemini-pro' (Legacy stable, highly available)
 * 3. Fallback to raw REST API if SDK fails (removes SDK abstraction potential bugs)
 */
export const reliableGenerateContent = async (prompt) => {
    if (!API_KEY) {
        console.warn("AI Service: No API Key found.");
        return null;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        console.log("AI Service: Attempting gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (e1) {
        console.warn("AI Service: gemini-1.5-flash failed (404/Error). Switching to gemini-pro...", e1);

        try {
            // Fallback 1: gemini-pro (The most standard model)
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (e2) {
            console.warn("AI Service: gemini-pro failed. Trying raw REST fallback...", e2);

            try {
                // Fallback 2: Raw REST fetch (Bypasses SDK logic)
                // Sometimes SDK assumes v1beta features that might get 404'd on specific keys
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                if (!response.ok) {
                    throw new Error(`REST API Error: ${response.status}`);
                }

                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
            } catch (e3) {
                console.error("AI Service: All attempts failed.", e3);
                throw new Error("AI Generation Failed after multiple fallbacks.");
            }
        }
    }
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
