import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.error('⚠️ GEMINI_API_KEY is not set. Please add your API key to .env.local');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const visionModelCandidates = [
  'models/gemini-2.5-flash',
  'models/gemini-2.0-flash-lite',
  'models/gemini-2.0-flash',
  'models/gemini-flash-latest',
] as const;

const chatModelCandidates = [
  'models/gemini-2.5-flash',
  'models/gemini-2.0-flash-lite',
  'models/gemini-2.0-flash',
  'models/gemini-flash-latest',
] as const;

async function generateVisionContent(parts: unknown[]) {
  if (!genAI) {
    throw new Error(
      'Gemini API key not configured. Please add GEMINI_API_KEY to .env.local'
    );
  }

  const failures: string[] = [];

  for (const modelName of visionModelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await model.generateContent(parts as any);
    } catch (error: any) {
      const message = error?.message || String(error);
      failures.push(`${modelName}: ${message}`);

      const isQuotaError =
        message.includes('429') || message.toLowerCase().includes('quota');
      const isNotFoundError = message.includes('404');

      if (isQuotaError || isNotFoundError) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    'All available Gemini vision models failed. This is usually a quota issue. ' +
      'Please retry later, create a new API key/project, or enable billing.\n' +
      failures.join('\n')
  );
}

export async function generateTutorResponse(
  history: { role: string; parts: { text: string }[] }[],
  message: string
): Promise<string> {
  if (!genAI) {
    throw new Error(
      'Gemini API key not configured. Please add GEMINI_API_KEY to .env.local'
    );
  }

  const failures: string[] = [];

  for (const modelName of chatModelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({ history: history as any });
      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (error: any) {
      const messageText = error?.message || String(error);
      failures.push(`${modelName}: ${messageText}`);

      const isQuotaError =
        messageText.includes('429') ||
        messageText.toLowerCase().includes('quota');
      const isNotFoundError = messageText.includes('404');

      if (isQuotaError || isNotFoundError) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    'All available Gemini chat models failed. This is usually a quota issue. ' +
      'Please retry later, create a new API key/project, or enable billing.\n' +
      failures.join('\n')
  );
}

export async function extractMathProblem(imageDataUrl: string): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to .env.local');
  }

  // Strip the data URL prefix to get raw base64
  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

  const result = await generateVisionContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    },
    {
      text: `You are a problem reader for a tutoring system. Look at this image of a notebook or paper and extract the math or science problem written on it.

Rules:
- Extract ONLY the problem statement, not any solutions or working shown.
- If there are multiple problems, extract the most prominent or most recent one.
- Format the problem clearly and concisely.
- If you cannot identify a problem, respond with "No problem detected. Please make sure the problem is clearly visible."
- Preserve any mathematical notation as best you can using plain text (e.g., x^2 for x squared, sqrt(x) for square root).`,
    },
  ]);

  return result.response.text();
}

export async function extractStudentStep(
  imageDataUrl: string,
  problem?: string
): Promise<string> {
  if (!genAI) {
    throw new Error(
      'Gemini API key not configured. Please add GEMINI_API_KEY to .env.local'
    );
  }

  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const scopedProblem = problem
    ? `Original problem context: ${problem}`
    : 'No problem context is available yet.';

  const result = await generateVisionContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    },
    {
      text: `You are reading a student's notebook while they solve a problem step-by-step.

${scopedProblem}

Task:
- Extract only the latest newly written step from the notebook.
- If the latest step is unclear, respond exactly: NO_CLEAR_STEP
- Keep the response very short (one line).
- Do not solve the problem.
- Do not add explanation.`,
    },
  ]);

  return result.response.text().trim();
}
