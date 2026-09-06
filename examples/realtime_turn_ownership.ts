export const UNFINISHED_TURN_HOLD_MS = 1800;

export function looksLikeUnfinishedTurn(text: string): boolean {
  const value = text.toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[\s]+/g, ' ')
    .replace(/[.!?,;:\-–—]+$/g, '')
    .trim();

  if (!value) return false;
  if (/\b(?:and|but|because|or|just|with|without|for|from|about|of|the|a|an)$/i.test(value)) return true;
  if (/\b(?:the reason is|what i mean is|here's why|here is why)$/i.test(value)) return true;
  if (/\b(?:i|we|you|they) (?:want|need|have|ought) to$/i.test(value)) return true;
  return false;
}

export class RealtimeTurnOwner {
  private responseActive = false;
  private responseCreatePending = false;
  private responseCancelPending = false;
  private cancelWhenResponseCreated = false;
  private queuedResponseCreate?: unknown;

  constructor(private readonly sendRaw: (event: unknown) => void) {}

  createResponse(event: unknown): void {
    if (this.responseCancelPending || this.cancelWhenResponseCreated) {
      this.queuedResponseCreate = event;
      return;
    }
    if (this.responseActive || this.responseCreatePending) return;
    this.responseCreatePending = true;
    this.sendRaw(event);
  }

  cancelResponse(): boolean {
    if (this.responseCancelPending || this.cancelWhenResponseCreated) return true;
    if (this.responseCreatePending && !this.responseActive) {
      this.cancelWhenResponseCreated = true;
      return true;
    }
    if (!this.responseActive) return false;
    this.responseCancelPending = true;
    this.sendRaw({ type: 'response.cancel' });
    return true;
  }

  onResponseCreated(): void {
    this.responseCreatePending = false;
    this.responseActive = true;
    if (this.cancelWhenResponseCreated) {
      this.cancelWhenResponseCreated = false;
      this.responseCancelPending = true;
      this.sendRaw({ type: 'response.cancel' });
    }
  }

  onResponseFinished(): void {
    const queued = this.queuedResponseCreate;
    this.queuedResponseCreate = undefined;
    this.responseActive = false;
    this.responseCreatePending = false;
    this.responseCancelPending = false;
    this.cancelWhenResponseCreated = false;
    if (queued) this.createResponse(queued);
  }
}

// If a completed transcript looks unfinished, wait briefly. If speech resumes,
// keep listening and combine the continuation instead of answering the fragment.
// Do not add this delay to complete turns.
