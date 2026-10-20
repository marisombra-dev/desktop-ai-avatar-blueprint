export type AvatarSyncEvent =
  | { type: 'audio-start'; turnId: string; sampleRate: number; at: number }
  | { type: 'sync-frame'; turnId: string; frameIndex: number; audioPcm16: Uint8Array; weights: number[]; at: number }
  | { type: 'audio-chunk'; turnId: string; audioPcm16: Uint8Array; at: number }
  | { type: 'audio-end'; turnId: string; at: number }
  | { type: 'interrupt'; turnId?: string; at: number };

function cleanTurnId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  return /^[A-Za-z0-9._:-]{1,160}$/.test(clean) ? clean : undefined;
}

function at(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}

function decodeBase64(value: unknown): Uint8Array | undefined {
  if (typeof value !== 'string' || value.length > 2_000_000) return undefined;
  try {
    return new Uint8Array(Buffer.from(value, 'base64'));
  } catch {
    return undefined;
  }
}

/**
 * Provider-neutral parser for synchronized audio + ARKit packets.
 * It intentionally understands only the narrow transport, not any provider key,
 * model endpoint, or avatar implementation.
 */
export function parseAvatarSyncEvent(value: unknown): AvatarSyncEvent | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  const type = typeof input.type === 'string' ? input.type : '';
  const turnId = cleanTurnId(input.turnId ?? input.sessionId);

  if (type === 'interrupt') {
    return {
      type: 'interrupt',
      ...(turnId ? { turnId } : {}),
      at: at(input.timestamp),
    };
  }
  if (!turnId) return undefined;

  if (type === 'audio_start') {
    const sampleRate = Number(input.sampleRate);
    if (!Number.isInteger(sampleRate) || sampleRate < 8_000 || sampleRate > 96_000) return undefined;
    return { type: 'audio-start', turnId, sampleRate, at: at(input.timestamp) };
  }

  if (type === 'sync_frame') {
    const frameIndex = Number(input.frameIndex);
    const audio = decodeBase64(input.audio);
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || !audio) return undefined;
    if (!Array.isArray(input.weights) || input.weights.length !== 52) return undefined;
    const weights = input.weights.map(Number);
    if (weights.some((weight) => !Number.isFinite(weight))) return undefined;
    return {
      type: 'sync-frame',
      turnId,
      frameIndex,
      audioPcm16: audio,
      weights: weights.map((weight) => Math.max(0, Math.min(1, weight))),
      at: at(input.timestamp),
    };
  }

  if (type === 'audio_chunk') {
    const audio = decodeBase64(input.data);
    if (!audio) return undefined;
    return { type: 'audio-chunk', turnId, audioPcm16: audio, at: at(input.timestamp) };
  }

  if (type === 'audio_end') {
    return { type: 'audio-end', turnId, at: at(input.timestamp) };
  }
  return undefined;
}

export interface AvatarSyncApplyResult {
  accepted: boolean;
  interrupted: boolean;
  stale: boolean;
}

/**
 * Keeps audio/face packets bound to one response turn. After an interruption,
 * late packets from the cancelled turn are rejected instead of animating a face
 * that no longer matches audible speech.
 */
export class AvatarSyncTurnGate {
  private activeTurnId: string | undefined;
  private interrupted = new Set<string>();
  private lastFrameIndex = -1;

  apply(event: AvatarSyncEvent): AvatarSyncApplyResult {
    if (event.type === 'audio-start') {
      this.activeTurnId = event.turnId;
      this.interrupted.delete(event.turnId);
      this.lastFrameIndex = -1;
      return { accepted: true, interrupted: false, stale: false };
    }

    if (event.type === 'interrupt') {
      const target = event.turnId ?? this.activeTurnId;
      if (target) this.interrupted.add(target);
      if (!event.turnId || event.turnId === this.activeTurnId) this.activeTurnId = undefined;
      return { accepted: true, interrupted: true, stale: false };
    }

    const stale = event.turnId !== this.activeTurnId;
    const wasInterrupted = this.interrupted.has(event.turnId);
    if (stale || wasInterrupted) {
      return { accepted: false, interrupted: wasInterrupted, stale };
    }

    if (event.type === 'sync-frame') {
      if (event.frameIndex <= this.lastFrameIndex) {
        return { accepted: false, interrupted: false, stale: true };
      }
      this.lastFrameIndex = event.frameIndex;
    }

    if (event.type === 'audio-end') this.activeTurnId = undefined;
    return { accepted: true, interrupted: false, stale: false };
  }

  activeTurn(): string | undefined {
    return this.activeTurnId;
  }
}
