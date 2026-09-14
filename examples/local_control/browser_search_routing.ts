// Sanitized search-routing patterns from the validated Desktop Ethan build.
// Explicit search requests are kept distinct from ordinary factual conversation.

export type BrowserSearchIntent = {
  action: 'weather' | 'search-web' | 'search-youtube' | 'search-wikipedia' | 'search-github';
  query: string;
  answerFromPage: boolean;
};

function cleanQuery(value: string): string {
  return value.replace(/\s+(?:right now|now|today)$/i, '').replace(/\s+please$/i, '').trim();
}

export function parseBrowserSearchIntent(text: string): BrowserSearchIntent | undefined {
  const compact = text.toLowerCase()
    .replace(/[^a-z0-9'\s.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:(?:hey|hi)\s+)?ethan\s*/, '')
    .replace(/^(?:(?:okay|ok|alright|great|good|right|so|now)\s+(?:and\s+)?)*/, '')
    .replace(/^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?/, '')
    .replace(/[.!?]+$/, '')
    .trim();

  let match = compact.match(/^(?:what(?:'s| is) (?:the )?(?:weather(?: like)?|temperature)|how(?:'s| is) (?:the )?weather)\s+(?:in|for|at)\s+(.+)$/);
  if (match?.[1]) return { action: 'weather', query: cleanQuery(match[1]), answerFromPage: true };
  match = compact.match(/^search (?:on )?youtube for (.+)$/);
  if (match?.[1]) return { action: 'search-youtube', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^(?:find|show me) (?:some )?(?:youtube )?videos?(?: on youtube)?\s+(?:about|for|of)\s+(.+)$/);
  if (match?.[1]) return { action: 'search-youtube', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^search wikipedia for (.+)$/);
  if (match?.[1]) return { action: 'search-wikipedia', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^(?:open|go to) (?:the )?wikipedia page (?:for|on|about) (.+)$/);
  if (match?.[1]) return { action: 'search-wikipedia', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^(?:open|go to) (.+?)(?:'s|s) wikipedia page$/);
  if (match?.[1]) return { action: 'search-wikipedia', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^look up (.+) on wikipedia$/);
  if (match?.[1]) return { action: 'search-wikipedia', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^search github for (.+)$/);
  if (match?.[1]) return { action: 'search-github', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^(?:find|look up) (.+) on github$/);
  if (match?.[1]) return { action: 'search-github', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^search (?:the )?(?:web|google) for (.+)$/);
  if (match?.[1]) return { action: 'search-web', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^google (.+)$/);
  if (match?.[1]) return { action: 'search-web', query: match[1].trim(), answerFromPage: false };

  match = compact.match(/^look up (.+)$/);
  if (match?.[1]) return { action: 'search-web', query: match[1].trim(), answerFromPage: false };

  return undefined;
}
export function isAmbiguousDesktopControlFailure(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const error = (value as { error?: unknown }).error;
  return typeof error === 'string' && /returned no result|invalid result|timed out/i.test(error);
}

export function isFreshBrowserToolCall(input: {
  now: number;
  latestUserTurnAt: number;
  maxAgeMs?: number;
}): boolean {
  const maxAgeMs = input.maxAgeMs ?? 15_000;
  return input.latestUserTurnAt > 0 && input.now - input.latestUserTurnAt <= maxAgeMs;
}

// Lifecycle rules validated after the first browser-search regressions:
//
// 1. Search-only success should return directly to listening. Do not create an
//    extra spoken "Done" response merely because navigation succeeded.
// 2. Weather/question intents are different: navigate, obtain a fresh visual
//    read of the page, then answer the user's question.
// 3. If the bridge result is ambiguous, do not confidently narrate failure.
// 4. Reject delayed/stale browser tool calls that no longer belong to the latest
//    user turn.
// 5. When the watched media tab is explicitly closed, end sustained Watch state
//    so later browser actions return to ordinary control/conversation mode.
// 6. A stale Realtime transport should get a bounded reconnect attempt rather
//    than silently leaving the visible avatar deaf.
