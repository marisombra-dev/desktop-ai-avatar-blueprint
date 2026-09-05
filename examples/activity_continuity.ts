export type ActivityMode = 'video' | 'game' | 'desktop' | 'other';

export interface ActivityCheckpoint {
  mode: ActivityMode;
  summary: string;
  event?: string;
  importance: number;
  timestamp: number;
}

export interface SharedActivitySnapshot {
  startedAt: number;
  endedAt: number;
  checkpoints: ActivityCheckpoint[];
  audioSamples: string[];
}

export interface ActivityFallbackMemory {
  title: string;
  memory: string;
  why: string;
}

function durationMinutes(snapshot: SharedActivitySnapshot): number {
  return Math.max(0, (snapshot.endedAt - snapshot.startedAt) / 60_000);
}

function dominantMode(snapshot: SharedActivitySnapshot): ActivityMode {
  const counts = new Map<ActivityMode, number>();  for (const point of snapshot.checkpoints) {
    counts.set(point.mode, (counts.get(point.mode) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}

export function shouldCurateSharedActivity(snapshot: SharedActivitySnapshot): boolean {
  const minutes = durationMinutes(snapshot);
  const mode = dominantMode(snapshot);
  const meaningfulEvents = snapshot.checkpoints.filter(
    (point) => Boolean(point.event) || point.importance >= 0.55,
  ).length;

  if (mode === 'desktop') return false;
  if (minutes < 10) return false;
  if (snapshot.checkpoints.length < 3) return false;

  if (mode === 'video' || mode === 'game') {
    return minutes >= 20 || meaningfulEvents >= 3 || snapshot.audioSamples.length >= 3;
  }

  return minutes >= 30 && meaningfulEvents >= 3;
}

export function recordCheckpoint(
  points: ActivityCheckpoint[],
  observation: ActivityCheckpoint,
  max = 48,
): ActivityCheckpoint[] {  const clean: ActivityCheckpoint = {
    ...observation,
    summary: observation.summary.replace(/\s+/g, ' ').trim().slice(0, 700),
    event: observation.event?.replace(/\s+/g, ' ').trim().slice(0, 360),
  };
  const next = [...points, clean];
  if (next.length <= max) return next;

  // Keep the first and newest states; trim an interior checkpoint.
  next.splice(1, 1);
  return next;
}

export function sampleProgramAudio(
  samples: string[],
  text: string,
  max = 8,
): string[] {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 420);
  if (!clean) return samples;
  const next = [...samples, clean];
  if (next.length <= max) return next;
  next.splice(1, 1);
  return next;
}

export function fallbackActivityMemory(
  snapshot: SharedActivitySnapshot,
): ActivityFallbackMemory | undefined {
  if (!shouldCurateSharedActivity(snapshot)) return undefined;
  const mode = dominantMode(snapshot);
  const minutes = Math.max(1, Math.round(durationMinutes(snapshot)));
  const last = [...snapshot.checkpoints]
    .reverse()
    .find((point) => point.event || point.summary);
  if (!last) return undefined;

  const stoppingPoint = last.event || last.summary;
  return {
    title: `${mode} activity stopping point`,
    memory: `A shared ${mode} session lasted about ${minutes} minutes. Last meaningful state: ${stoppingPoint}`,
    why: 'Preserves where the shared activity stopped when richer model curation is unavailable.',
  };
}

export function buildFocusedRetrievalQuery(
  latestSummary: string,
  latestEvent: string,
  recentProgramAudio: string,
): string {
  return [latestSummary, latestEvent, recentProgramAudio]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(-3200);
}

// Search only activity/open-thread notes, and require actual content overlap.
// Folder membership alone must never count as a match.