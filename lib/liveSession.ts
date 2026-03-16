import { Buffer } from 'node:buffer';
import type { WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { buildLiveTutorSystemInstruction } from './tutorPrompt';

const LIVE_MODEL = 'gemini-2.0-flash-live-001';

/**
 * Called once per incoming WebSocket connection from the browser.
 * Opens a Gemini Live session and wires up bidirectional audio + transcript relay.
 *
 * NOTE: GoogleGenAI is instantiated here (not at module level) so that .env.local
 * is already loaded by the time this runs.
 */
export async function handleLiveConnection(
  ws: WebSocket,
  problem?: string
): Promise<void> {
  // Lazy init — env vars are loaded by Next.js before any WS connection arrives
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  if (!ai) {
    const msg = JSON.stringify({
      type: 'error',
      message: 'Gemini API key not configured. Please set GEMINI_API_KEY.',
    });
    try {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    } catch {}
    try {
      ws.close(1008, 'API key missing');
    } catch {}
    return;
  }

  let geminiSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
  let isClosed = false;

  const cleanup = () => {
    isClosed = true;
    try {
      if (geminiSession) {
         try { geminiSession.close(); } catch {}
      }
    } catch {}
    geminiSession = null;
    try {
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
         ws.close();
      }
    } catch {}
  };

  const sendJson = (payload: Record<string, unknown>) => {
    if (isClosed || ws.readyState !== ws.OPEN) return;
    try {
      ws.send(JSON.stringify(payload));
    } catch (err) {
      console.error('[liveSession] Error sending JSON:', err);
    }
  };

  // Register listeners immediately to handle early close
  ws.on('close', () => {
    cleanup();
  });

  ws.on('error', (err) => {
    console.error('[liveSession] WebSocket error:', err);
    cleanup();
  });

  try {
    const sessionCallback = await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO, Modality.TEXT],
        systemInstruction: buildLiveTutorSystemInstruction(problem),
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
      },
      callbacks: {
        onopen() {
          try {
            sendJson({ type: 'ready' });
          } catch (err) {
            console.error('[liveSession] Error in onopen:', err);
          }
        },

        onmessage(message: LiveServerMessage) {
          try {
            // ── Audio: use the SDK's .data getter (base64 of all inline data parts)
            if (message.data) {
              const audioBuf = Buffer.from(message.data, 'base64');
              if (ws.readyState === ws.OPEN) {
                try {
                  ws.send(audioBuf);
                } catch (err) {
                   // Ignore write errors to closing socket
                }
              }
            }

            // ── Text: use the SDK's .text getter (all text parts concatenated)
            if (message.text) {
              sendJson({ type: 'transcript', role: 'tutor', text: message.text });
            }

            // ── Input transcription (what Gemini heard the user say)
            const inputTranscript = message.serverContent?.inputTranscription;
            if (inputTranscript && (inputTranscript as any)?.text) {
              sendJson({
                type: 'transcript',
                role: 'user',
                text: (inputTranscript as any).text,
              });
            }

            // ── Turn complete
            if (message.serverContent?.turnComplete) {
              sendJson({ type: 'turn_complete' });
            }
          } catch (err) {
            console.error('[liveSession] Error in onmessage:', err);
          }
        },

        onclose() {
          try {
            cleanup();
          } catch (err) {
            console.error('[liveSession] Error in onclose:', err);
          }
        },

        onerror(err: ErrorEvent) {
          try {
            console.error('[liveSession] Gemini error:', err);
            sendJson({
              type: 'error',
              message: String(err?.message ?? err).substring(0, 500),
            });
          } catch (e) {
            console.error('[liveSession] Error sending error message:', e);
          } finally {
            cleanup();
          }
        },
      },
    });
    
    // Assign session
    geminiSession = sessionCallback;

    // If socket closed while we were connecting
    if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
        cleanup();
        return;
    }

    // ── Relay raw PCM audio from the browser → Gemini ─────────────────────
    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
      try {
        if (isClosed || !geminiSession) return;
        
        if (isBinary) {
          // Audio data
          let buf: Buffer;
          try {
             if (Array.isArray(data)) {
                 buf = Buffer.concat(data);
             } else if (Buffer.isBuffer(data)) {
                 buf = data;
             } else {
                 buf = Buffer.from(data as ArrayBuffer);
             }
          } catch (e) {
             console.error('[liveSession] Error converting buffer:', e);
             return;
          }

          if (buf.length === 0) return;

          try {
            geminiSession.sendRealtimeInput({
              media: {
                mimeType: "audio/pcm;rate=16000",
                data: buf.toString('base64')
              }
            });
          } catch (err: any) {
              // Valid to silently ignore if session is closing
              if (!isClosed) {
                  // Log as warning, not error, to avoid clutter
                  console.warn('[liveSession] sendRealtimeInput weak error:', err.message);
              }
          }
        } else {
             // Text data (JSON)
             try {
                const textStr = data.toString();
                const msg = JSON.parse(textStr);
                if (msg.type === 'text') {
                  try {
                    geminiSession.sendClientContent({
                      turns: [{ role: 'user', parts: [{ text: String(msg.text) }] }],
                      turnComplete: true,
                    });
                  } catch (err) {
                       console.error('[liveSession] Error sending text input:', err);
                  }
                }
             } catch (e) {
                 // ignore invalid JSON
             }
        }

      } catch (err) {
         console.error('[liveSession] Error in message handler:', err);
      }
    });

  } catch (err: any) {
    console.error('[liveSession] Failed to open Gemini session:', err);
    try {
        const errorMsg =
        err?.message?.substring(0, 200) ??
        'Failed to connect to Gemini Live API';
        sendJson({ type: 'error', message: errorMsg });
    } catch {}
    cleanup();
  }
}
