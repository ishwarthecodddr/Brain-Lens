'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type LiveVoiceStatus = 'idle' | 'connecting' | 'active' | 'error';

interface UseLiveVoiceOptions {
  problem: string | null;
  onUserTranscript?: (text: string) => void;
  onTutorTranscript?: (text: string) => void;
}

interface UseLiveVoiceReturn {
  status: LiveVoiceStatus;
  isSpeaking: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

export function useLiveVoice({
  problem,
  onUserTranscript,
  onTutorTranscript,
}: UseLiveVoiceOptions): UseLiveVoiceReturn {
  const [status, setStatus] = useState<LiveVoiceStatus>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Tracks the scheduled end-time so audio chunks play sequentially without gaps
  const nextPlayTimeRef = useRef<number>(0);

  const stop = useCallback(() => {
    try {
      // Disconnect mic worklet
      workletNodeRef.current?.disconnect();
      workletNodeRef.current = null;

      // Stop all mic tracks
      streamRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;

      // Close audio contexts
      try {
        micCtxRef.current?.close();
      } catch {}
      micCtxRef.current = null;

      try {
        playCtxRef.current?.close();
      } catch {}
      playCtxRef.current = null;

      // Close WebSocket
      try {
        if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
          wsRef.current.close();
        }
      } catch {}
      wsRef.current = null;

      nextPlayTimeRef.current = 0;
      setIsSpeaking(false);
      setStatus('idle');
    } catch (err) {
      console.error('[useLiveVoice] Error in stop:', err);
      setStatus('idle');
    }
  }, []);

  /**
   * Play a raw Int16 PCM chunk returned by Gemini (24 kHz mono).
   * Chunks are queued so they play back-to-back without gaps.
   */
  const playAudioChunk = useCallback(
    (buffer: ArrayBuffer, playCtx: AudioContext) => {
      try {
        const int16 = new Int16Array(buffer);
        if (int16.length === 0) return;

        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768;
        }

        const audioBuffer = playCtx.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = playCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(playCtx.destination);

        const startAt = Math.max(playCtx.currentTime, nextPlayTimeRef.current);
        source.start(startAt);
        nextPlayTimeRef.current = startAt + audioBuffer.duration;

        setIsSpeaking(true);
        source.onended = () => {
          // Only clear the speaking flag once all queued chunks have finished
          if (nextPlayTimeRef.current <= playCtx.currentTime + 0.05) {
            setIsSpeaking(false);
          }
        };
      } catch (err) {
        console.error('[useLiveVoice] Error playing audio chunk:', err);
      }
    },
    []
  );

  /**
   * Initialise the microphone and AudioWorklet after the Gemini session is ready.
   */
  const startMic = useCallback(async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
      });
      streamRef.current = stream;

      // Use the context created in start() if available, or create new (fallback)
      // Note: contexts created in start() have better chance of being "resumed" due to click event
      let micCtx = micCtxRef.current;
      if (!micCtx) {
         micCtx = new AudioContext({ sampleRate: 16000 });
         micCtxRef.current = micCtx;
      }
      
      if (micCtx.state === 'suspended') {
        await micCtx.resume();
      }

      await micCtx.audioWorklet.addModule('/pcm-processor.js');

      const source = micCtx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(micCtx, 'pcm-processor');
      workletNodeRef.current = worklet;

      worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(e.data); // raw Int16 PCM buffer — binary frame
          }
        } catch (err) {
          console.error('[useLiveVoice] Error sending mic data:', err);
        }
      };

      source.connect(worklet);
      // worklet need not connect to destination — we only want to capture, not play
    } catch (err) {
      console.error('[useLiveVoice] Error starting mic:', err);
      throw err;
    }
  }, []);

  const start = useCallback(async () => {
    if (status !== 'idle') return;
    setStatus('connecting');

    try {
      // Create contexts immediately on user click to ensure they are allowed to run
      const micCtx = new AudioContext({ sampleRate: 16000 });
      const playCtx = new AudioContext({ sampleRate: 24000 });
      
      micCtxRef.current = micCtx;
      playCtxRef.current = playCtx;
      
      // Attempt to resume immediately
      if (micCtx.state === 'suspended') await micCtx.resume();
      if (playCtx.state === 'suspended') await playCtx.resume();

      const params = problem
        ? `?problem=${encodeURIComponent(problem)}`
        : '';
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}/ws/live${params}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      // playCtx is already created and resumed above
      
      ws.onmessage = async (event: MessageEvent) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            // Binary frame = audio chunk from Gemini
            if (playCtxRef.current) {
               playAudioChunk(event.data, playCtxRef.current);
            }
            return;
          }

          // Text frame = JSON control message
          const msg = JSON.parse(event.data as string) as {
            type: string;
            role?: string;
            text?: string;
            message?: string;
          };

          if (msg.type === 'ready') {
            setStatus('active');
            await startMic(ws);
          } else if (msg.type === 'transcript') {
            if (msg.role === 'user' && msg.text) {
              onUserTranscript?.(msg.text);
            } else if (msg.role === 'tutor' && msg.text) {
              onTutorTranscript?.(msg.text);
            }
          } else if (msg.type === 'error') {
            console.error('[useLiveVoice] Server error:', msg.message);
            setStatus('error');
            stop();
          }
        } catch (err) {
          console.error('[useLiveVoice] Error in onmessage:', err);
        }
      };

      ws.onerror = () => {
        console.error('[useLiveVoice] WebSocket error');
        setStatus('error');
        stop();
      };

      ws.onclose = () => {
        // Only call stop if we are still in an active state (not initiated by us)
        setStatus((prev) => {
          if (prev === 'active' || prev === 'connecting') stop();
          return 'idle';
        });
      };
    } catch (err) {
      console.error('[useLiveVoice] Failed to start:', err);
      setStatus('error');
      stop();
    }
  }, [status, problem, startMic, playAudioChunk, onUserTranscript, onTutorTranscript, stop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, isSpeaking, start, stop };
}
