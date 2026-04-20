import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    console.log("Available models:");
    data.models?.forEach((m: any) => console.log(m.name));
  } catch (err: any) {
    console.error(err);
  }
}

run();
