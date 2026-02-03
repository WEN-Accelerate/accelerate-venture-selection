import { GoogleGenerativeAI } from "@google/generative-ai";

export default async (req, context) => {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            console.error("API Key is missing in environment variables.");
            return new Response(JSON.stringify({ error: "Server configuration error: API Key missing" }), { status: 500 });
        }

        const audioBuffer = await req.arrayBuffer();
        if (!audioBuffer || audioBuffer.byteLength === 0) {
            return new Response(JSON.stringify({ error: "No audio data received" }), { status: 400 });
        }

        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        const genAI = new GoogleGenerativeAI(apiKey);

        // Updated to match project's AI Service model version (2026 context)
        // Falling back to known stable versions if newer ones fail is a good strategy, 
        // but here we attempt to align with the codebase's "gemini-2.5-flash".
        // If that fails, the user might need to check available models via ListModels.
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent([
            "Please provide a verbatim transcription of this audio file. Do not add any introductory text or markdown formatting, just the text content.",
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: base64Audio
                }
            }
        ]);

        const transcription = result.response.text();

        return new Response(JSON.stringify({ transcription }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Transcription error:", error);
        // Provide detailed error to client
        return new Response(JSON.stringify({ error: `AI Model Error: ${error.message}` }), { status: 500 });
    }
};
