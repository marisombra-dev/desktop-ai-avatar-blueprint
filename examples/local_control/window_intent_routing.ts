// Sanitized deterministic window/application intent routing from the human-validated 2026-09-14 reference build.
// Keep these grammars narrow so ordinary conversation is not hijacked.

export type LocalWindowCommand = {
  action: 'launch' | 'focus' | 'minimize' | 'maximize' | 'restore' | 'close' | 'repeat';
  query?: string;
  app?: string;
};

const KNOWN_APPS = [
  'google chrome', 'chrome', 'microsoft edge', 'edge', 'notepad', 'calculator', 'calc',
  'file explorer', 'explorer', 'powershell', 'command prompt', 'cmd',
  'visual studio code', 'vscode', 'vs code', 'spotify', 'unreal editor', 'unreal',
];

function cleanTarget(value: string): string {
  return value
    .replace(/\s+(?:app|application|program|window)$/i, '')
    .replace(/^(?:the|my)\s+/i, '')
    .trim();
}

function knownTargetPattern(): RegExp {
  return new RegExp(`^(?:${KNOWN_APPS.map((value) => value.replace(/ /g, '\\s+')).join('|')})$`, 'i');
}
export function parseLocalWindowCommand(text: string): LocalWindowCommand | undefined {
  const compact = text.toLowerCase().replace(/[^a-z0-9'\s-]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^(?:(?:hey|hi)\s+)?ethan\s*/, '')
    .replace(/\s+ethan$/, '')
    .replace(/^(?:(?:okay|ok|alright|great|good|right|so|now)\s+(?:and\s+)?)*/, '')
    .replace(/^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?/, '')
    .trim();

  if (/\btab\b/.test(compact)) return undefined;
  if (/^(?:again|try again|do (?:it|that) again|same thing again|one more time)$/.test(compact)) return { action: 'repeat' };

  let match = compact.match(/^(?:launch|start|open)\s+(.+)$/);
  if (match?.[1]) {
    const target = cleanTarget(match[1]);
    if (knownTargetPattern().test(target)) return { action: 'launch', app: target };
  }

  match = compact.match(/^(?:bring|put)\s+(.+?)\s+(?:forward|to the front|in front)$/);
  if (match?.[1]) return { action: 'focus', query: cleanTarget(match[1]) };
  match = compact.match(/^(?:bring|put)\s+(.+?)\s+back(?:\s+up)?$/);
  if (match?.[1]) return { action: 'focus', query: cleanTarget(match[1]) };
  match = compact.match(/^(?:focus|switch)\s+(?:to|on)\s+(.+?)(?:\s+(?:app|application|window))?$/);
  if (match?.[1]) return { action: 'focus', query: cleanTarget(match[1]) };

  match = compact.match(/^minimi[szc]e\s+(.+)$/);
  if (match?.[1]) return { action: 'minimize', query: cleanTarget(match[1]) };
  match = compact.match(/^maximi[sz]e\s+(.+)$/);
  if (match?.[1]) return { action: 'maximize', query: cleanTarget(match[1]) };
  match = compact.match(/^(?:restore|unminimi[sz]e)\s+(.+)$/);
  if (match?.[1]) return { action: 'restore', query: cleanTarget(match[1]) };

  match = compact.match(/^(?:close|quit|exit)\s+(.+)$/);
  if (match?.[1]) {
    const target = cleanTarget(match[1]);
    if (/\b(?:app|application|program|window)\b/.test(match[1]) || knownTargetPattern().test(target)) {
      return { action: 'close', query: target };
    }
  }

  return undefined;
}
