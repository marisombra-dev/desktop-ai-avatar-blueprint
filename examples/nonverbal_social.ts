export function normalizeSocialTurn(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isNonverbalAcknowledgment(text: string): boolean {
  const value = normalizeSocialTurn(text);
  return /^(?:ok|okay|got it|understood|makes sense|all right|alright)$/.test(value);
}

export function isClearlyLaughingTurn(text: string): boolean {
  const value = normalizeSocialTurn(text);
  if (!value || value.length > 120) return false;
  if (/\b(?:wasn't|was not|isn't|is not|not)\s+funny\b/.test(value)) return false;
  if (/^(?:laugh|chuckle)(?: for me| a little)?$/.test(value)) return true;
  if (/^(?:lol|lmao|rofl)$/.test(value)) return true;
  if (/^(?:ha){2,}$/.test(value) || /^(?:he){2,}$/.test(value)) return true;
  if (/^(?:that|this|he|she|they|it)(?:'s| is)? (?:hilarious|so funny)$/.test(value)) return true;
  return false;
}

export type ScreenReaction = 'silence' | 'laugh' | { speak: string };

export function parseScreenReaction(comment: string | undefined): ScreenReaction {
  const value = comment?.replace(/\s+/g, ' ').trim() ?? '';
  if (!value || /^NO_COMMENT[.!]?$/i.test(value)) return 'silence';
  if (/^LAUGH_ONLY[.!]?$/i.test(value)) return 'laugh';
  return { speak: value.slice(0, 500) };
}

export type WatchPose = 'center' | 'watch' | 'speaking';

// Keep semantic ownership explicit: the first watch acknowledgement must not
// immediately downgrade the full watch pose to the speaking half-turn.
export function nextWatchPose(current: WatchPose, event: 'activate' | 'user_speaks' | 'reply_done' | 'activity_ends', preserveInitial = false): WatchPose {
  if (event === 'activity_ends') return 'center';
  if (event === 'activate') return 'watch';
  if (event === 'user_speaks') return preserveInitial ? 'watch' : 'speaking';
  return current === 'center' ? 'center' : 'watch';
}
