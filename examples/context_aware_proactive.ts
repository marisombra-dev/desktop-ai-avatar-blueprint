/*
 * Sanitized context-aware proactive decision helpers.
 * Local eligibility (see proactive_policy.ts) runs first. This layer decides
 * whether there is a concrete, timely reason to interrupt after those gates pass.
 */

export type ActivityMode = 'video' | 'game' | 'desktop' | 'other';
export type DecisionKind =
  | 'unfinished_thread'
  | 'current_event'
  | 'shared_callback'
  | 'help_offer'
  | 'social'
  | 'none';

export type SituationalEvidence = {
  silenceMinutes: number;
  activity?: ActivityMode;
  screenSummary?: string;
  screenEvent?: string;
  screenImportance?: number;
  recentProgramDialogue?: string;
  recentlyEndedActivity?: string;
  unfinishedThreadCue: boolean;
  frictionSignals: number;
  relevantDurableMemory?: string;
};
export type ProactiveDecision = {
  speak: boolean;
  confidence: number;
  kind: DecisionKind;
  message?: string;
};

const ALLOWED = new Set<DecisionKind>([
  'unfinished_thread', 'current_event', 'shared_callback',
  'help_offer', 'social', 'none'
]);

export function shouldRunDecision(e: SituationalEvidence): boolean {
  const concreteEvidence = Boolean(
    e.unfinishedThreadCue
    || e.frictionSignals >= 2
    || (e.screenEvent && (e.screenImportance ?? 0) >= 0.82)
    || e.recentlyEndedActivity
  );
  // Sparse reconsideration can ask again after a long silence, but silence
  // itself must never be presented to the model as a reason to speak.
  return concreteEvidence || e.silenceMinutes >= 45;
}

export function parseDecision(raw: string, minConfidence = 0.82): ProactiveDecision {
  const match = raw.trim().match(/\{[\s\S]*\}/);
  if (!match) return { speak: false, confidence: 0, kind: 'none' };
  try {
    const value = JSON.parse(match[0]) as Record<string, unknown>;
    const confidence = typeof value.confidence === 'number'
      ? Math.max(0, Math.min(1, value.confidence)) : 0;
    const kind = typeof value.kind === 'string' && ALLOWED.has(value.kind as DecisionKind)
      ? value.kind as DecisionKind : 'none';
    const message = typeof value.message === 'string'
      ? value.message.replace(/\s+/g, ' ').trim().slice(0, 320) : '';
    if (value.speak !== true || confidence < minConfidence || kind === 'none' || !message) {
      return { speak: false, confidence, kind: 'none' };
    }
    return { speak: true, confidence, kind, message };
  } catch {
    return { speak: false, confidence: 0, kind: 'none' };
  }
}

export function decisionGuidance(e: SituationalEvidence): string {
  const lines = [
    'Do not fill silence. Speak only when interrupting would improve this specific moment.',
    'Use a grounded/helpful/timely test: real evidence, clear benefit, good timing.',
    'Durable memory may enrich a reason, but memory existing by itself is never a reason to speak.',
    'Return JSON only: {"speak":boolean,"confidence":0.0,"kind":"...","message":""}.',
    'Malformed, vague, or low-confidence output must resolve to silence.'
  ];
  if (e.activity === 'video') lines.push('Video: do not speak over recent program dialogue.');
  if (e.activity === 'desktop') lines.push('Desktop work: require unusually strong practical value.');
  if (e.activity === 'game') lines.push('Game: brief timely reactions are okay; avoid play-by-play.');
  return lines.join('\n');
}
