// Blueprint example: pace direct MetaHuman lip-sync PCM in small chunks and
// flush explicit zero-energy frames after audible speech has actually drained.
//
// This is intentionally transport-agnostic. Replace appendAvatarAudio() with
// your Electron IPC / localhost bridge.

const SAMPLE_RATE = 16_000;
const CHUNK_SAMPLES = 512; // ~32 ms at 16 kHz
const SETTLE_MS = 300;
const CHUNK_MS = Math.round((CHUNK_SAMPLES / SAMPLE_RATE) * 1000);

type AppendAvatarAudio = (pcmFloat32Base64: string) => Promise<void>;

function float32Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000)));
  }
  return btoa(binary);
}

export async function flushAvatarSilence(
  appendAvatarAudio: AppendAvatarAudio,
  durationMs = SETTLE_MS,
): Promise<void> {
  let remaining = Math.max(1, Math.round(SAMPLE_RATE * durationMs / 1000));

  while (remaining > 0) {
    const count = Math.min(CHUNK_SAMPLES, remaining);
    await appendAvatarAudio(float32Base64(new Float32Array(count)));
    remaining -= count;
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, CHUNK_MS));
  }
}

// Important: do not start the settling tail merely because the provider emitted
// response.done. That is a control-plane completion event and can precede the
// end of physical playback. Observe the actual output stream and flush silence
// only after audible energy has remained low long enough to indicate the speaker
// has drained.
export function createAudibleDrainDetector(
  onDrained: () => void | Promise<void>,
  threshold = 0.035,
  quietMs = 180,
): (amplitude: number, responseActive: boolean) => void {
  let speechSeen = false;
  let lastSpeechHotAt = 0;
  let tailFlushed = true;

  return (amplitude, responseActive) => {
    const now = performance.now();
    if (amplitude > threshold) {
      speechSeen = true;
      lastSpeechHotAt = now;
      tailFlushed = false;
      return;
    }

    if (speechSeen && !tailFlushed && !responseActive && now - lastSpeechHotAt >= quietMs) {
      tailFlushed = true;
      void onDrained();
    }
  };
}

// Why chunk the silence?
// 300 ms at 16 kHz = ~4800 Float32 samples = ~19.2 KB before transport overhead.
// If your local bridge rejects packets above 16 KB, one giant silence packet
// disappears. Pacing 512-sample chunks keeps speech and settling frames within
// the same safe packet envelope.
