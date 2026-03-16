'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader as Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from './MessageBubble';
import LiveVoiceButton from './LiveVoiceButton';

interface Message {
  role: 'user' | 'tutor';
  content: string;
}

interface TutorChatProps {
  problem: string | null;
  latestStep?: string | null;
}

export default function TutorChat({ problem, latestStep }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastEvaluatedStep, setLastEvaluatedStep] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!problem || !latestStep || isLoading) return;
    if (latestStep === lastEvaluatedStep) return;

    const stepCheckPrompt = `I just wrote this new step on paper: "${latestStep}".
Please evaluate if this step is correct in the context of the problem.
If incorrect, tell me exactly what is wrong and give one hint to fix it.
If correct, confirm it briefly and ask for my next step.`;

    void (async () => {
      const ok = await sendMessage(stepCheckPrompt, { hideUserBubble: true });
      if (ok) {
        setLastEvaluatedStep(latestStep);
      }
    })();
  }, [latestStep, problem]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const sendMessage = async (
    messageText: string,
    options?: { hideUserBubble?: boolean }
  ): Promise<boolean> => {
    if (!messageText.trim() || isLoading) return false;

    const shouldHideUserBubble = options?.hideUserBubble ?? false;
    if (!shouldHideUserBubble) {
      const userMessage: Message = { role: 'user', content: messageText };
      setMessages((prev) => [...prev, userMessage]);
    }
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          problem: problem,
          history: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || 'Failed to get tutor response');
      }

      const data = await response.json();
      const tutorMessage: Message = { role: 'tutor', content: data.response };
      setMessages((prev) => [...prev, tutorMessage]);

      speak(data.response);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'tutor',
        content:
          error instanceof Error
            ? error.message
            : "I'm sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript);
    sendMessage(transcript);
  };

  /** Called when Gemini Live returns a tutor transcript over the voice channel */
  const handleLiveTutorTranscript = (text: string) => {
    const tutorMessage: Message = { role: 'tutor', content: text };
    setMessages((prev) => [...prev, tutorMessage]);
  };

  /** Called when the Live API echoes back what the user said */
  const handleLiveUserTranscript = (text: string) => {
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!problem) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-500">
          Capture a math problem to start the tutoring session
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-[500px]">
      <div className="p-4 border-b bg-green-50">
        <h3 className="font-semibold text-green-800">AI Math Tutor</h3>
        <p className="text-xs text-green-600 mt-1">
          {isSpeaking ? 'Tutor is speaking...' : 'Ready to help'}
        </p>
        {latestStep && (
          <p className="text-xs text-amber-700 mt-1">
            Live step detected: {latestStep}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Ask me anything about the problem!
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            role={message.role}
            content={message.content}
          />
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-green-500">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
            <div className="flex-1 max-w-[70%]">
              <div className="px-4 py-3 rounded-2xl bg-gray-200 text-gray-900 rounded-tl-none">
                <p className="text-sm text-gray-500 italic">
                  Tutor is thinking...
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
        <div className="flex gap-2 mb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sendMessage('Give me a small hint for only the next step.')}
            disabled={isLoading}
          >
            Hint
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sendMessage('Can you check my latest step and explain if it is correct?')}
            disabled={isLoading}
          >
            Check My Step
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            className="flex-1 text-black"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type your message..."
          />
          <LiveVoiceButton
            problem={problem}
            onUserTranscript={handleLiveUserTranscript}
            onTutorTranscript={handleLiveTutorTranscript}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
