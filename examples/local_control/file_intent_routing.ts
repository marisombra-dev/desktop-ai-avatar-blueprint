// Sanitized deterministic file-control intent routing from the human-validated 2026-09-14 reference build.
// Keep these grammars narrow so ordinary conversation is not hijacked.

export type LocalFileCommand = {
  action: 'find' | 'list' | 'read' | 'open' | 'copy' | 'move' | 'rename' | 'repeat';
  query?: string;
  path?: string;
  root?: string;
  destination?: string;
};

const ROOT_PATTERN = '(downloads|documents|desktop|home)';

function cleanValue(value: string): string {
  return value
    .replace(/[.!?]+$/g, '')
    .replace(/^(?:the|my)\s+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+(?:file|document|folder)$/i, '')
    .trim();
}

function cleanRoot(value: string): string {
  return cleanValue(value).replace(/\s+folder$/i, '').trim();
}

function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9'\s._:\\/-]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
export function parseLocalFileCommand(text: string): LocalFileCommand | undefined {
  const compact = normalize(text)
    .replace(/^(?:(?:hey|hi)\s+)?ethan\s*/, '')
    .replace(/\s+ethan$/, '')
    .replace(/^(?:(?:okay|ok|alright|great|good|right|so|now)\s+(?:and\s+)?)*/, '')
    .replace(/^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?/, '')
    .trim();

  if (/\b(?:tab|youtube|wikipedia|github|weather)\b/.test(compact)) return undefined;
  if (/^(?:again|try again|do (?:it|that) again|same thing again|one more time)[.!?]?$/.test(compact)) {
    return { action: 'repeat' };
  }

  let match = compact.match(new RegExp(`^(?:list|show me)(?: the)? (?:files|documents|folders|contents)(?: in| from| of) ${ROOT_PATTERN}(?: folder)?[.!?]?$`));
  if (match?.[1]) return { action: 'list', path: cleanRoot(match[1]) };

  match = compact.match(new RegExp(`^(?:find|locate)(?: the)? (?:(?:file|document|folder)(?: called| named)? )?(.+?)(?: in| from) ${ROOT_PATTERN}(?: folder)?[.!?]?$`));
  if (match?.[1] && match?.[2]) {
    return { action: 'find', query: cleanValue(match[1]), root: cleanRoot(match[2]) };
  }

  match = compact.match(new RegExp(`^(read|open)(?: the)? (?:file|document)? ?(.+?)(?: in| from) ${ROOT_PATTERN}(?: folder)?[.!?]?$`));
  if (match?.[1] && match?.[2] && match?.[3]) {
    return { action: match[1] as 'read' | 'open', query: cleanValue(match[2]), root: cleanRoot(match[3]) };
  }
  match = compact.match(new RegExp(`^(copy|move)(?: the)? (?:file|document)? ?(.+?) from ${ROOT_PATTERN}(?: folder)? to (.+?)[.!?]?$`));
  if (match?.[1] && match?.[2] && match?.[3] && match?.[4]) {
    return {
      action: match[1] as 'copy' | 'move',
      query: cleanValue(match[2]),
      root: cleanRoot(match[3]),
      destination: cleanRoot(match[4]),
    };
  }

  match = compact.match(new RegExp(`^rename(?: the)? (?:file|document)? ?(.+?)(?: in| from) ${ROOT_PATTERN}(?: folder)? to (.+?)[.!?]?$`));
  if (match?.[1] && match?.[2] && match?.[3]) {
    return {
      action: 'rename',
      query: cleanValue(match[1]),
      root: cleanRoot(match[2]),
      destination: cleanValue(match[3]),
    };
  }

  return undefined;
}