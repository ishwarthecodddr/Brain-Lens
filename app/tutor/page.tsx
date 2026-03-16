'use client';

import { useState } from 'react';
import CameraView from '@/components/CameraView';
import TutorChat from '@/components/TutorChat';
import { BookOpen, Loader as Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TutorPage() {
  const [problem, setProblem] = useState<string | null>(null);
  const [latestStep, setLatestStep] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapture = async (imageData: string, mode: 'problem' | 'step') => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/read-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mode, problem }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || 'Failed to read problem');
      }

      const data = await response.json();

      if (mode === 'step') {
        const nextStep = typeof data.step === 'string' ? data.step.trim() : '';
        if (nextStep && nextStep !== 'NO_CLEAR_STEP') {
          setLatestStep((prev) => (prev === nextStep ? prev : nextStep));
        }
      } else {
        setProblem(data.problem);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      if (mode === 'problem') {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to read the problem. Please try again.';
        alert(message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <header className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">Brain Lens</h1>
            </div>
            <p className="text-gray-600">
              AI-powered live tutor — learn step-by-step with vision and voice
            </p>
          </header>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              1. Point Camera at Problem
            </h2>
            <CameraView onCapture={handleCapture} hasProblem={Boolean(problem)} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              2. Extracted Problem
            </h2>
            <Card className="h-full">
              <CardContent className="p-6">
                {isProcessing ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    <span className="ml-3 text-gray-600">
                      Reading problem...
                    </span>
                  </div>
                ) : problem ? (
                  <div className="prose">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {problem}
                    </p>
                    {latestStep && (
                      <p className="text-sm text-amber-700 mt-3 font-semibold">
                        Latest detected step: {latestStep}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 h-32 flex items-center justify-center">
                    No problem captured yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            3. Chat with Your AI Tutor
          </h2>
          <TutorChat problem={problem} latestStep={latestStep} />
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>
            Powered by Google Gemini AI • Use voice input, type, or capture steps to interact
          </p>
        </footer>
      </div>
    </div>
  );
}
