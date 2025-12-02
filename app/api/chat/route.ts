// app/api/chat/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const { prompt } = await request.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    // Engineered Prompt
    const fullPrompt = `
      You are an expert AI assistant for a Web3 learning platform called CryptoLearn.
      A student has a question: "${prompt}".
      Your goal is to provide a clear, concise, and helpful answer to guide their learning.
      Do not answer with JSON. Respond in plain, conversational text.
      If you don't know the answer, say so. Keep your answers focused on blockchain, Web3, Solidity, Rust, cryptocurrencies, and related technologies.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ response: text }), { status: 200 });
  } catch (error) {
    console.error("Error in AI Chat API route:", error);
    return new Response(JSON.stringify({ error: "Failed to get a response from the AI." }), { status: 500 });
  }
}