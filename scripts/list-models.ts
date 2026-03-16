// Run this script to list available models for your API key
// Usage: npx ts-node scripts/list-models.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Set GEMINI_API_KEY environment variable');
  process.exit(1);
}

async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await response.json();
    
    console.log('Available models:\n');
    data.models?.forEach((model: any) => {
      console.log(`- ${model.name}`);
      console.log(`  Methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
