// Sanitized pattern for separating social companionship from analysis.
// This is intentionally generic. Tune language and thresholds for the person you are building.

export type ConversationMode = 'ordinary' | 'watch';
export type ConversationLane = 'ordinary' | 'social' | 'analysis' | 'quiet' | 'operational';

const ANALYSIS_PATTERNS = [
  /\b(?:is|was|are|were) (?:this|that|it) (?:actually )?(?:true|real|accurate)\b/i,
  /\bfact[ -]?check\b/i,
  /\bwhat (?:is|are) the evidence\b/i,
  /\b(?:explain|research|look up|verify)\b/i,
  /\bhow does .+ work\b/i,
  /\bwhy does .+ happen\b/i,
];

const QUIET_PATTERNS = [
  /\b(?:be quiet|stay quiet|hush|shh|stop talking)\b/i,
  /\b(?:just|please) watch quietly\b/i,
];

const OPERATIONAL_PATTERNS = [
  /\b(?:turn|switch) (?:the )?(?:camera|screen) (?:on|off)\b/i,
  /\b(?:camera|screen) (?:on|off)\b/i,
];
export function classifyConversationLane(text: string, mode: ConversationMode): ConversationLane {
  const line = text.replace(/\s+/g, ' ').trim();
  if (!line) return mode === 'watch' ? 'social' : 'ordinary';
  if (QUIET_PATTERNS.some((pattern) => pattern.test(line))) return 'quiet';
  if (OPERATIONAL_PATTERNS.some((pattern) => pattern.test(line))) return 'operational';
  if (ANALYSIS_PATTERNS.some((pattern) => pattern.test(line))) return 'analysis';
  if (mode === 'watch') return 'social';
  return 'ordinary';
}

export function responsePolicy(lane: ConversationLane): {
  createSpokenResponse: boolean;
  tools: 'normal' | 'none';
  guidance: string;
} {
  if (lane === 'quiet') {
    return {
      createSpokenResponse: false,
      tools: 'none',
      guidance: 'Cancel any current response and suppress unsolicited commentary until the user resumes it.',
    };
  }
  if (lane === 'operational') {
    return {
      createSpokenResponse: true,
      tools: 'none',
      guidance: 'Perform the narrow local action first, then acknowledge briefly if acknowledgement is useful.',
    };
  }
  if (lane === 'analysis') {
    return {
      createSpokenResponse: true,
      tools: 'normal',
      guidance: 'Answer the explicit information request accurately. Use tools when the request requires them.',
    };
  }
  if (lane === 'social') {
    return {
      createSpokenResponse: true,
      tools: 'none',
      guidance: 'Treat this as a social bid. React, riff, laugh, tease, speculate, or simply share the moment. Do not manufacture a fact-check or advice task.',
    };
  }
  return {
    createSpokenResponse: true,
    tools: 'normal',
    guidance: 'Use the normal long-lived agent behavior. Do not force an ambiguous ordinary turn into the special social lane without contextual evidence.',
  };
}

// Regression examples should test categories, not exact prose:
// ordinary + "Who is the current prime minister?" -> ordinary (normal agent decides)
// watch    + "That cloud looks like a dragon."    -> social
// watch    + "Just watch quietly with me."        -> quiet
// watch    + "Is what the narrator said accurate?"-> analysis
// ordinary + "Turn the camera off."                -> operational