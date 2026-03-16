import { NextRequest, NextResponse } from 'next/server';
import { generateTutorResponse } from '@/lib/gemini';
import { buildTutorContext } from '@/lib/tutorPrompt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, problem, history } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    const conversationHistory: { role: string; parts: { text: string }[] }[] =
      [];

    if (problem) {
      conversationHistory.push({
        role: 'user',
        parts: [{ text: buildTutorContext(problem) }],
      });
      conversationHistory.push({
        role: 'model',
        parts: [
          {
            text: "Hi! I'm here to help you work through this problem. Let's start by understanding what we're trying to solve. What do you think the first step should be?",
          },
        ],
      });
    }

    if (history && Array.isArray(history)) {
      history.forEach((msg: { role: string; content: string }) => {
        conversationHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      });
    }

    const tutorResponse = await generateTutorResponse(conversationHistory, message);

    return NextResponse.json({ response: tutorResponse });
  } catch (error: any) {
    console.error('Error getting tutor response:', error?.message || error);
    const errorMessage = error?.message || 'Failed to get tutor response';

    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid Gemini API key. Please check your .env.local file.' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
      return NextResponse.json(
        {
          error:
            'Gemini quota exceeded for tutor responses. Retry later, create a new API key/project, or enable billing.',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
