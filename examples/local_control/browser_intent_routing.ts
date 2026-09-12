// Sanitized routing pattern from the human-validated Desktop Ethan build.
// Keep common browser primitives deterministic; preserve a model/tool escape hatch
// for open-ended website resolution.

export type LocalBrowserCommand = {
  action: 'new-tab' | 'open-site' | 'switch-tab' | 'close-tab' | 'next-tab' | 'previous-tab' | 'repeat';
  query?: string;
};

export function knownSiteUrl(site: string): string | undefined {
  const sites: Record<string, string> = {
    youtube: 'https://www.youtube.com/',
    tiktok: 'https://www.tiktok.com/',
    facebook: 'https://www.facebook.com/',
    github: 'https://github.com/',
    chatgpt: 'https://chatgpt.com/',
    reddit: 'https://www.reddit.com/',
    google: 'https://www.google.com/',
    wikipedia: 'https://www.wikipedia.org/',
    gmail: 'https://mail.google.com/',
    instagram: 'https://www.instagram.com/',
    twitter: 'https://x.com/',
    x: 'https://x.com/',
    amazon: 'https://www.amazon.com/',
  };
  return sites[site.toLowerCase().trim()];
}

export function parseLocalBrowserCommand(text: string): LocalBrowserCommand | undefined {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9'\s-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const compact = cleaned
    .replace(/^(?:(?:hey|hi)\s+)?ethan\s*/, '')
    .replace(/\s+ethan$/, '')
    .replace(/^(?:(?:okay|ok|alright|great|good|understood|right|so|now)\s+(?:and\s+)?)*/, '')
    .replace(/^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?/, '')
    .replace(/^(?:i\s+(?:was\s+)?wondering\s+if\s+you\s+could\s+)/, '')
    .trim();

  if (/\b(?:again|try again|do (?:it|that) again|same thing again|one more time)\b/.test(compact)) {
    return { action: 'repeat' };
  }

  if (/\b(?:open|make|create)\s+(?:another|one more)\s+one\b/.test(compact)) {
    return { action: 'new-tab' };
  }
  if (/\b(?:close|shut)\s+(?:another|one more)\s+one\b/.test(compact)) {
    return { action: 'close-tab', query: 'current' };
  }

  const openKnownSite = compact.match(
    /\bopen\b[^.?!]*\b(youtube|tiktok|facebook|github|chatgpt|reddit|google|wikipedia|gmail|instagram|twitter|amazon|x)\b/
  );
  if (openKnownSite?.[1]) return { action: 'open-site', query: openKnownSite[1] };

  if (
    /\b(?:open|make|create)\b[^.?!]*\b(?:a|another|one more)?\s*(?:new|blank)?\s*(?:browser\s+)?tab\b/.test(compact)
    && !/\b(?:facebook|github|chatgpt|youtube|tiktok)\b/.test(compact)
  ) {
    return { action: 'new-tab' };
  }

  if (
    /\b(?:close|shut)\b[^.?!]*\b(?:this|that|current|active)?\s*tab\b/.test(compact)
    || /\b(?:close|shut)\b[^.?!]*\btab\s+(?:that\s+)?(?:we(?:'re| are)\s+on|i(?:'m| am)\s+on)\b/.test(compact)
    || /\b(?:close|shut)\s+(?:it|that one)\b/.test(compact)
  ) {
    return { action: 'close-tab', query: 'current' };
  }

  if (/\b(?:switch|change)\b[^.?!]*\b(?:another|next)\s+(?:browser\s+)?tab\b|\bnext tab\b|\bswitch tabs\b(?!\s+to\b)/.test(compact)) {
    return { action: 'next-tab' };
  }

  if ((/\b(?:previous|prior) tab\b|\b(?:switch|go|move)\s+back(?:\s+one)?(?:\s+tab)?\b/.test(compact)) && !/\bto\b/.test(compact)) {
    return { action: 'previous-tab' };
  }

  if (/\bnew tab\b/.test(compact) && /\b(?:switch|change|go|move|open)\b/.test(compact)) {
    return { action: 'switch-tab', query: 'New Tab' };
  }

  const namedSite = compact.match(
    /\b(?:switch|change|go|move)\b(?:\s+tabs?)?(?:\s+back)?(?:\s+to)?\s+(?:the\s+)?(facebook|github|chatgpt|youtube|tiktok)(?:\s+tab)?\b/
  );
  if (namedSite?.[1]) return { action: 'switch-tab', query: namedSite[1] };

  const namedTab = compact.match(
    /\b(?:switch|change|go|move)\b(?:\s+tabs?)?(?:\s+back)?(?:\s+to)?\s+(?:the\s+)?(.+?)\s+tab\b/
  );
  if (namedTab?.[1]) return { action: 'switch-tab', query: namedTab[1].trim() };

  return undefined;
}

export interface DesktopControlApi {
  runDesktopControl(input: {
    domain: 'browser';
    action: string;
    query?: string;
    url?: string;
  }): Promise<Record<string, unknown> & { ok?: boolean }>;
}

export async function executeLocalBrowserCommand(
  api: DesktopControlApi,
  command: LocalBrowserCommand,
  lastSuccessful?: LocalBrowserCommand,
): Promise<{ result: Record<string, unknown> & { ok?: boolean }; remembered?: LocalBrowserCommand }> {
  const resolved = command.action === 'repeat' ? lastSuccessful : command;
  if (!resolved || resolved.action === 'repeat') {
    return { result: { ok: false, error: 'No browser action is available to repeat.' } };
  }

  let result: Record<string, unknown> & { ok?: boolean };
  if (resolved.action === 'open-site' && resolved.query) {
    // Prefer an existing matching tab first. If none exists, open a URL.
    result = await api.runDesktopControl({ domain: 'browser', action: 'switch-tab', query: resolved.query });
    if (result.ok !== true) {
      const url = knownSiteUrl(resolved.query);
      if (!url) {
        // Let the caller hand an unknown site to the model/tool resolver rather
        // than turning the deterministic grammar into a capability ceiling.
        return { result: { ok: false, error: 'SITE_RESOLUTION_REQUIRED', site: resolved.query } };
      }
      result = await api.runDesktopControl({ domain: 'browser', action: 'open-url', url });
    }
  } else {
    result = await api.runDesktopControl({
      domain: 'browser',
      action: resolved.action,
      ...(resolved.query ? { query: resolved.query } : {}),
    });
  }

  return { result, remembered: result.ok === true ? resolved : lastSuccessful };
}

// Realtime lifecycle rule used by the validated build:
//
// 1. Configure server VAD with create_response=false.
// 2. On final user transcript, try local deterministic routing first.
// 3. If a browser command is recognized, cancel any active/pending assistant
//    response, execute + verify the local action, then acknowledge minimally.
// 4. Persist transcript independently; do not await memory storage before the
//    local action.
// 5. On input_audio_buffer.speech_started, immediately cancel an active/pending
//    assistant response so the user can barge in.
// 6. Only create a normal conversational response when the turn was not claimed
//    by a local action.
