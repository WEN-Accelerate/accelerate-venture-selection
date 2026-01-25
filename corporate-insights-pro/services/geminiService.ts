
import { GoogleGenAI, Type } from "@google/genai";
import { CompanyData } from "../types";

export const researchCompany = async (companyName: string): Promise<CompanyData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `Perform comprehensive research on the company: "${companyName}". 
  Provide details for the following fields:
  - Exact Legal Name
  - Industry Category
  - Detailed Description of Business
  - Promoter/Founder/Director Details
  - GST Number (if publicly available/registrations)
  - Key Products/Services Offered
  - Primary Customer Segments (B2B, B2C, target audience)
  - Current Market Standing
  
  Be as factual as possible using search results.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          industry: { type: Type.STRING },
          description: { type: Type.STRING },
          promoters: { type: Type.ARRAY, items: { type: Type.STRING } },
          gstNumber: { type: Type.STRING },
          products: { type: Type.ARRAY, items: { type: Type.STRING } },
          customers: { type: Type.ARRAY, items: { type: Type.STRING } },
          marketPosition: { type: Type.STRING }
        },
        required: ["name", "industry", "description", "promoters", "gstNumber", "products", "customers"]
      }
    }
  });

  const rawText = response.text || "{}";
  const parsedData = JSON.parse(rawText);
  
  // Extract grounding sources
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .map((chunk: any) => chunk.web)
    .filter((web: any) => web && web.uri && web.title);

  return {
    ...parsedData,
    sources
  };
};
