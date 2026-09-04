/* Sanitized Electron main-process screen watcher pattern. */

import { desktopCapturer, screen } from 'electron';

type ScreenFrame = {
  data: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
};

type ScreenObservation = {
  summary: string;
  event?: string;
  importance: number;
  comment?: string;
  mode: 'game' | 'video' | 'desktop' | 'other';
  timestamp: number;
};

type Observer = (
  frames: ScreenFrame[],
  previousSummary: string,
  reason: 'scene-change' | 'heartbeat'
) => Promise<Omit<ScreenObservation, 'timestamp'>>;

const SAMPLE_INTERVAL_MS = 1000;
const ANALYZE_MIN_MS = 5000;
const HEARTBEAT_MS = 20_000;
const CHANGE_THRESHOLD = 0.035;
const COMMENT_COOLDOWN_MS = 20_000;
const IMPORTANT_COMMENT_COOLDOWN_MS = 8000;

type Sample = { frame: ScreenFrame; bitmap: Buffer };

async function captureSample(): Promise<Sample> {
  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 640, height: 360 },
    fetchWindowIcons: false
  });

  const source = sources.find(s => s.display_id === String(display.id)) ?? sources[0];
  if (!source || source.thumbnail.isEmpty()) throw new Error('Could not sample screen.');

  const fingerprint = source.thumbnail.resize({ width: 160, height: 90 });
  const bitmap = Buffer.from(fingerprint.toBitmap());

  const image = source.thumbnail.resize({ width: 600 });
  const jpeg = image.toJPEG(50);
  const size = image.getSize();

  return {
    bitmap,
    frame: {
      data: jpeg.toString('base64'),
      mimeType: 'image/jpeg',
      width: size.width,
      height: size.height
    }
  };
}

function frameDifference(previous: Buffer, current: Buffer): number {
  const length = Math.min(previous.length, current.length);
  if (!length) return 1;

  let total = 0;
  let count = 0;
  // Electron NativeImage bitmap is BGRA. Sample every fourth pixel.
  for (let offset = 0; offset + 2 < length; offset += 16) {
    total += Math.abs(previous[offset] - current[offset]);
    total += Math.abs(previous[offset + 1] - current[offset + 1]);
    total += Math.abs(previous[offset + 2] - current[offset + 2]);
    count += 3;
  }
  return count ? total / (count * 255) : 1;
}

export class ScreenWatcher {
  private enabled = false;
  private timer?: ReturnType<typeof setInterval>;
  private inFlight = false;
  private previousBitmap?: Buffer;
  private lastAnalysisAt = 0;
  private lastCommentAt = 0;
  private lastSummary = '';
  private lastAnalyzedFrame?: ScreenFrame;

  constructor(
    private readonly observe: Observer,
    private readonly onObservation: (observation: ScreenObservation) => void
  ) {}

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;

    if (!enabled) {
      if (this.timer) clearInterval(this.timer);
      this.timer = undefined;
      this.previousBitmap = undefined;
      this.lastAnalysisAt = 0;
      this.lastSummary = '';
      this.lastAnalyzedFrame = undefined;
      return;
    }

    this.previousBitmap = undefined;
    this.lastAnalysisAt = 0;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), SAMPLE_INTERVAL_MS);
  }

  stop(): void {
    this.setEnabled(false);
  }

  private async tick(): Promise<void> {
    if (!this.enabled || this.inFlight) return;
    this.inFlight = true;

    try {
      const sample = await captureSample();
      if (!this.enabled) return;

      const now = Date.now();
      const difference = this.previousBitmap
        ? frameDifference(this.previousBitmap, sample.bitmap)
        : 1;
      this.previousBitmap = sample.bitmap;

      const dueToChange = difference >= CHANGE_THRESHOLD
        && now - this.lastAnalysisAt >= ANALYZE_MIN_MS;
      const dueToHeartbeat = now - this.lastAnalysisAt >= HEARTBEAT_MS;
      if (!dueToChange && !dueToHeartbeat) return;

      const frames = dueToChange && this.lastAnalyzedFrame
        ? [this.lastAnalyzedFrame, sample.frame]
        : [sample.frame];

      const raw = await this.observe(
        frames,
        this.lastSummary,
        dueToChange ? 'scene-change' : 'heartbeat'
      );
      if (!this.enabled) return;

      this.lastAnalysisAt = Date.now();
      this.lastSummary = raw.summary;
      this.lastAnalyzedFrame = sample.frame;

      const important = raw.importance >= 0.93;
      const cooldown = important
        ? IMPORTANT_COMMENT_COOLDOWN_MS
        : COMMENT_COOLDOWN_MS;

      const allowComment = Boolean(raw.comment)
        && raw.importance >= 0.72
        && Date.now() - this.lastCommentAt >= cooldown;

      if (allowComment) this.lastCommentAt = Date.now();

      this.onObservation({
        ...raw,
        comment: allowComment ? raw.comment : undefined,
        timestamp: Date.now()
      });
    } catch {
      // Best-effort watcher. Never break normal voice because sampling failed.
      this.lastAnalysisAt = Date.now();
    } finally {
      this.inFlight = false;
    }
  }
}
