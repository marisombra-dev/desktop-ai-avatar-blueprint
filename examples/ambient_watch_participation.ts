export type AmbientDecision =
  | { kind: 'none' }
  | { kind: 'laugh' }
  | { kind: 'ambient'; text: string };

const CONTROL_NARRATION = /\b(?:turn|shut|switch|stop|close|end)(?:ing)?\b.*\b(?:screen|screenshare|video|watch)\b/i;

export function sanitizeAmbientLine(value: string): AmbientDecision {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || text === 'NO_COMMENT') return { kind: 'none' };
  if (text === 'LAUGH_ONLY') return { kind: 'laugh' };
  if (text.length > 90 || /[?]/.test(text)) return { kind: 'none' };
  const sentences = text.split(/[.!]+/).map((part) => part.trim()).filter(Boolean);
  if (sentences.length > 1) return { kind: 'none' };
  if (/\b(?:let me explain|do you want|would you like|i can help)\b/i.test(text)) return { kind: 'none' };
  if (CONTROL_NARRATION.test(text)) return { kind: 'none' };
  return { kind: 'ambient', text };
}

export interface WatchState {
  screenOn: boolean;
  watchMode: boolean;
  userSpeaking: boolean;
  responseActive: boolean;
  quietRequested: boolean;
}
export function maySpeakAmbiently(state: WatchState): boolean {
  return state.screenOn
    && state.watchMode
    && !state.userSpeaking
    && !state.responseActive
    && !state.quietRequested;
}

export async function verifiedScreenOff(
  commandOff: () => Promise<void>,
  readActualState: () => Promise<'on' | 'off'>,
  clearLocalWatchState: () => void,
): Promise<boolean> {
  await commandOff();
  const actual = await readActualState();
  if (actual !== 'off') return false;
  clearLocalWatchState();
  return true;
}

export function shouldEndWatch(text: string, watchActive: boolean): boolean {
  const value = text.toLowerCase().replace(/[^a-z0-9'\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!value || /\b(?:not|don't|do not)\s+(?:stop|shut|turn|close|end)\b/.test(value)) return false;
  if (/\b(?:shut|turn|switch)\b.*\b(?:screen|screenshare)\b.*\b(?:off|down)\b/.test(value)) return true;
  if (!watchActive) return false;
  return /\b(?:stopping|stopped|ending|ended|closing|closed|shut|turn(?:ed|ing)? off)\b.*\b(?:video|movie|show|stream|it|this)\b/.test(value);
}
export function hasRepeatedScreenControlNarration(text: string): boolean {
  const normalized = text.toLowerCase().replace(/screen\s+share/g, 'screenshare').replace(/\s+/g, ' ');
  const phrases = [
    /\bi(?:'m| am)\s+(?:shutting|turning|switching)\s+(?:off\s+)?(?:the\s+)?screenshare\b/g,
    /\bthis is me\s+(?:shutting|turning|switching)\s+(?:off\s+)?(?:the\s+)?screenshare\b/g,
  ];
  let hits = 0;
  for (const pattern of phrases) hits += normalized.match(pattern)?.length ?? 0;
  return hits >= 2;
}

// Recommended runtime contract:
// 1. The observer may emit NO_COMMENT, LAUGH_ONLY, or one short ambient line.
// 2. Ambient speech is allowed only in sustained Watch mode and never over user speech.
// 3. Ending Watch is a local control operation, not a conversational promise.
// 4. Verify authoritative Screen state before acknowledging success.
// 5. If control narration repeats, cancel it rather than letting the model improvise a loop.
