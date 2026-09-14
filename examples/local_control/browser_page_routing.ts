// Sanitized deterministic browser page-interaction routing from the human-validated 2026-09-14 reference build.
// Keep these grammars narrow so ordinary conversation is not hijacked.

export type LocalBrowserPageIntent = {
  action: 'back' | 'forward' | 'scroll-down' | 'scroll-up' | 'click-link' | 'repeat';
  query?: string;
};

function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9'\s.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.?!]+$/g, '')
    .replace(/^(?:(?:hey|hi)\s+)?ethan\s*/, '')
    .replace(/\s+ethan$/, '')
    .replace(/^(?:(?:okay|ok|alright|great|good|right|so|now)\s+(?:and\s+)?)*/, '')
    .replace(/^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?/, '')
    .trim();
}

function cleanLink(value: string): string {
  return value.replace(/^(?:on\s+)?(?:the\s+)?/i, '').replace(/\s+link$/i, '').trim();
}

function concreteLinkTarget(value: string): string | undefined {
  const target = cleanLink(value);
  if (!target || /^(?:around|here|there|somewhere|anywhere|something|anything|stuff)(?:\s|$)/i.test(target)) return undefined;
  return target;
}

export function parseLocalBrowserPageIntent(text: string): LocalBrowserPageIntent | undefined {
  const compact = normalize(text);
  if (!compact || /\btab\b/.test(compact)) return undefined;
  if (/^(?:again|try again|do (?:it|that) again|same thing again|one more time)$/.test(compact)) return { action: 'repeat' };

  if (/^(?:go\s+)?back(?:\s+(?:a|one)\s+page)?$/.test(compact)
      || /^(?:previous|prior)\s+page$/.test(compact)
      || /^take me back$/.test(compact)) return { action: 'back' };
  if (/^(?:go\s+)?forward(?:\s+(?:a|one)\s+page)?$/.test(compact)
      || /^next\s+page$/.test(compact)) return { action: 'forward' };

  if (/^(?:scroll|move|go)\s+down(?:\s+(?:the\s+)?page)?$/.test(compact) || /^page down$/.test(compact)) return { action: 'scroll-down' };
  if (/^(?:scroll|move|go)\s+up(?:\s+(?:the\s+)?page)?$/.test(compact) || /^page up$/.test(compact)) return { action: 'scroll-up' };

  let match = compact.match(/^(?:click|press|select)(?:\s+on)?\s+(.+)$/);
  if (match?.[1]) { const query = concreteLinkTarget(match[1]); if (query) return { action: 'click-link', query }; }
  match = compact.match(/^follow\s+(.+?)(?:\s+link)?$/);
  if (match?.[1]) { const query = concreteLinkTarget(match[1]); if (query) return { action: 'click-link', query }; }
  match = compact.match(/^open\s+(?:the\s+)?link\s+(?:that\s+)?(?:says|called|named)\s+(.+)$/);
  if (match?.[1]) { const query = concreteLinkTarget(match[1]); if (query) return { action: 'click-link', query }; }
  match = compact.match(/^open\s+(?:a|the)\s+page\s+(?:on|about|for)\s+(.+)$/);
  if (match?.[1]) { const query = concreteLinkTarget(match[1]); if (query) return { action: 'click-link', query }; }
  match = compact.match(/^open\s+(?:the\s+)?(.+?)\s+link$/);
  if (match?.[1]) { const query = concreteLinkTarget(match[1]); if (query) return { action: 'click-link', query }; }
  return undefined;
}
