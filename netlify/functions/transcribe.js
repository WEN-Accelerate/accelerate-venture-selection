import { GoogleGenerativeAI } from "@google/generative-ai";

export default async (req, context) => {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const apiKey = process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
