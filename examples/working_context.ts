export interface WorkingTurn {
  role: 'user' | 'assistant';
  text: string;
}

const MAX_TURNS = 8;
const MAX_CHARS = 2800;

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function formatWorkingContext(
  turns: WorkingTurn[],
  currentUserTurn?: string,
): string {
  const current = clean(currentUserTurn ?? '').toLowerCase();
  const recent = turns
    .map((turn) => ({ ...turn, text: clean(turn.text) }))
    .filter((turn) => turn.text)
    .slice(-MAX_TURNS);
  // The consult request is already supplied separately. Avoid duplicating it.
  if (current && recent.at(-1)?.role === 'user' && recent.at(-1)?.text.toLowerCase() === current) {
    recent.pop();
  }

  const lines: string[] = [];
  let used = 0;
  for (const turn of recent.reverse()) {
    const line = `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.text}`;
    if (used + line.length > MAX_CHARS) break;
    lines.unshift(line);
    used += line.length + 1;
  }
  return lines.join('\n');
}

export function enrichConsultWithWorkingContext(
  currentUserTurn: string,
  recentTurns: WorkingTurn[],
): string {
  const context = formatWorkingContext(recentTurns, currentUserTurn);
  if (!context) return currentUserTurn;
  return [
    '[INTERNAL CURRENT-CONVERSATION WORKING CONTEXT.]',
    'Use this only to resolve current shorthand, pronouns, corrections, and evolving ideas.',
    'This is recent dialogue from the active voice session, not durable memory or new user speech.',
    context,
    '[END CURRENT-CONVERSATION WORKING CONTEXT]',
    `Current consult request: ${currentUserTurn}`,
  ].join('\n\n');
}

// Keep this buffer session-local. Clear it when the live voice session ends.
// Do not write it to durable memory merely because it was useful for one consult.
