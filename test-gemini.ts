import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Testing Gemini API Key connection...");
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("No GEMINI_API_KEY found in .env");
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Sending ping request...");
    const result = await model.generateContent("Respond with the word 'PONG'");
    console.log("SUCCESS! AI Response:", result.response.text());
  } catch (error: any) {
    console.error("FAILED!");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    if (error.status) console.error("Status:", error.status);
    if (error.cause) console.error("Cause:", error.cause);
  }
}

run();
