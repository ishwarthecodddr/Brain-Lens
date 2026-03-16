'use client';

import { Mic, MicOff, Loader2, Volume2, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveVoice } from '@/hooks/useLiveVoice';

interface LiveVoiceButtonProps {
  problem: string | null;
  onUserTranscript?: (text: string) => void;
  onTutorTranscript?: (text: string) => void;
}

export default function LiveVoiceButton({
  problem,
  onUserTranscript,
  onTutorTranscript,
}: LiveVoiceButtonProps) {
  const { status, isSpeaking, start, stop } = useLiveVoice({
    problem,
    onUserTranscript,
    onTutorTranscript,
  });

  if (status === 'connecting') {
    return (
      <Button size="icon" variant="outline" disabled title="Connecting to Gemini Live…">
        <Loader2 className="w-5 h-5 animate-spin" />
      </Button>
    );
  }

  if (status === 'active') {
    return (
      <Button
        size="icon"
        onClick={stop}
        title={isSpeaking ? 'Tutor is speaking…' : 'Live session active — click to end'}
        className={
          isSpeaking
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse'
            : 'bg-red-500 hover:bg-red-600 animate-pulse'
        }
      >
        {isSpeaking ? (
          <Volume2 className="w-5 h-5 text-white" />
        ) : (
          <PhoneOff className="w-5 h-5 text-white" />
        )}
      </Button>
    );
  }

  if (status === 'error') {
    return (
      <Button
        size="icon"
        variant="outline"
        onClick={() => start()}
        title="Connection failed — click to retry"
        className="border-red-400 text-red-500 hover:bg-red-50"
      >
        <MicOff className="w-5 h-5" />
      </Button>
    );
  }

  // idle
  return (
    <Button
      size="icon"
      variant="outline"
      onClick={() => start()}
      disabled={!problem}
      title={
        problem
          ? 'Start live voice session with Gemini'
          : 'Capture a problem first'
      }
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
}
