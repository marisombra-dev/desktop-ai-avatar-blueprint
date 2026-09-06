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

// Example calibration only. Tune against the actual person/camera.
// Ordinary speech often opens the jaw enough to fool a sensitive quiet-laugh gate.
export function acceptVisibleLaugh(userSpeaking: boolean, jawOpen: number): boolean {
  return userSpeaking ? jawOpen >= 0.19 : jawOpen >= 0.09;
}

export const NON_SPEECH_AMUSEMENT_GUIDANCE = `
Produce one brief non-lexical amused exhalation. No words, syllables, labels, or stage directions.
If a true non-speech sound cannot be produced, remain silent rather than describing the sound.
`.trim();

export type SocialVocalReaction = 'thoughtful' | 'surprise' | 'skeptical' | 'sympathy';

export function socialVocalReactionFor(text: string): SocialVocalReaction | undefined {
  const value = normalizeSocialTurn(text);
  if (!value || value.length > 72 || value.split(/\s+/).length > 10) return undefined;
  if (/[?]/.test(text) && !/^(?:seriously|no way)[?!. ]*$/i.test(text.trim())) return undefined;
  if (/^(?:that's|that is) (?:interesting|curious|odd|strange)$|^(?:interesting|curious|odd|strange)$/.test(value)) return 'thoughtful';
  if (/^(?:wow|whoa|no way|seriously)$/.test(value)) return 'surprise';
  if (/^(?:yeah right|right sure|well that's convenient|how convenient)$/.test(value)) return 'skeptical';
  if (/^(?:that's a shame|that is a shame|what a shame|that's sad|that sucks)$/.test(value)) return 'sympathy';
  return undefined;
}

export const SOCIAL_VOCAL_GUIDANCE: Record<SocialVocalReaction, string> = {
  thoughtful: 'Produce exactly one quiet thoughtful "mm" hum and no other words.',
  surprise: 'Make one tiny genuine surprised inhale. No words; silence if unavailable.',
  skeptical: 'Produce exactly one short dry "hm" and no other words.',
  sympathy: 'Produce exactly one soft low "mm" and no other words.',
};

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
