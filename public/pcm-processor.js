/**
 * AudioWorkletProcessor: converts Float32 mic audio to Int16 PCM
 * and posts each chunk buffer to the main thread for WebSocket transmission.
 * Runs at 16 kHz (AudioContext is created at 16 kHz on the client side).
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const float32 = input[0];
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    // Transfer ownership of the buffer — zero-copy
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
