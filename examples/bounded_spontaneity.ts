/* Sanitized bounded-spontaneity helpers for an already-open realtime voice session. */

export type SpontaneityEvidence = {
  unfinishedThread: boolean;
  currentEvent: boolean;
  endedActivity: boolean;
  repeatedFriction: boolean;
  sharedCallback: boolean;
};

export function hasGroundedEvidence(e: SpontaneityEvidence): boolean {
  return e.unfinishedThread || e.currentEvent || e.endedActivity
    || e.repeatedFriction || e.sharedCallback;
}

export function evidenceCount(e: SpontaneityEvidence): number {
  return Object.values(e).filter(Boolean).length;
}

export function boundedLine(raw: string): string | undefined {
  const line = raw.replace(/\s+/g, ' ').trim();
  if (!line) return undefined;
  if (line.length > 180) return undefined;
  if (/[?]/.test(line)) return undefined;
  if (/\b(i(?:'m| am) here if|want me to|can i help|let me know)\b/i.test(line)) return undefined;
  if ((line.match(/[.!]/g) ?? []).length > 1) return undefined;
  return line;
}
export function mayUseLiveSession(state: {
  liveVoiceOpen: boolean;
  userSpeaking: boolean;
  responseActive: boolean;
  screenWatchActive: boolean;
}): boolean {
  return state.liveVoiceOpen
    && !state.userSpeaking
    && !state.responseActive
    && !state.screenWatchActive;
}

export function buildRealtimeInstruction(line: string): string {
  return [
    'Bounded spontaneous thought.',
    'Say exactly the supplied line in the normal voice.',
    'Do not add a question, invitation, explanation, reassurance, or extra sentence.',
    `<line>${line}</line>`
  ].join(' ');
}

/*
 * Validation rule:
 * test the decision and delivery boundaries separately.
 * A model instruction saying "you must speak" is not a forced plumbing test.
 * For a one-shot delivery test, bypass model choice only after grounded evidence
 * exists, and arm the test from a current-session user turn so stale silence
 * cannot spend the one-shot during startup.
 */