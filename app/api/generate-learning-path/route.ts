// app/api/generate-learning-path/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const { prompt } = await request.json();
  console.log("API Route Hit. Received prompt:", prompt);

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
  }

  try {
    // --- THIS IS THE CORRECTED MODEL NAME ---
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const fullPrompt = `
      You are an expert curriculum designer for a Web3 learning platform.
      A student wants to learn about: "${prompt}".
      Based on this, generate a concise, logical learning path consisting of 3 to 5 main topics.
      These topics should be keywords that can be used as tags.
      Your response MUST be a valid JSON array of strings, and nothing else.
      Example for "how to make an NFT": ["Blockchain", "Solidity", "Smart Contracts", "ERC-721", "Minting"]
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    console.log("Received from Gemini:", text);

    // Robust JSON parsing
    const startIndex = text.indexOf('[');
    const endIndex = text.lastIndexOf(']');
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("AI did not return a valid JSON array.");
    }

    const jsonString = text.substring(startIndex, endIndex + 1);
    const path = JSON.parse(jsonString);

    return new Response(JSON.stringify({ path }), { status: 200 });

  } catch (error) {
    console.error("Error in API route:", error);
    return new Response(JSON.stringify({ error: "Failed to generate learning path" }), { status: 500 });
  }
}