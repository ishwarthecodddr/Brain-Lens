import { NextRequest, NextResponse } from 'next/server';
import { extractMathProblem, extractStudentStep } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mode = 'problem', problem } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    if (mode === 'step') {
      const stepText = await extractStudentStep(image, problem);
      return NextResponse.json({ step: stepText });
    }

    const problemText = await extractMathProblem(image);

    return NextResponse.json({ problem: problemText });
  } catch (error: any) {
    console.error('Error reading problem:', error?.message || error);
    const errorMessage = error?.message || 'Failed to read problem';
    
    // Check for common API errors
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
            'Gemini quota exceeded for this key/project. Retry later, create a new API key/project, or enable billing.',
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
