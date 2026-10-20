export interface NativeProviderSession {
  providerId: string;
  nativeSessionId: string;
  updatedAt: string;
}

export interface CrossProviderCheckpointInput {
  objective: string;
  verifiedProgress: string[];
  pending: string[];
  recentVisibleTurns: Array<{ role: 'user' | 'assistant'; text: string }>;
  repositoryState?: string;
}

export interface CrossProviderCheckpoint {
  version: 1;
  objective: string;
  verifiedProgress: string[];
  pending: string[];
  recentVisibleTurns: Array<{ role: 'user' | 'assistant'; text: string }>;
  repositoryState?: string;
}

const MAX_ITEM = 700;
const MAX_TURNS = 16;
const MAX_TOTAL_TURN_CHARS = 12_000;

function clean(value: string, max = MAX_ITEM): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export class NativeProviderSessionRegistry {
  private readonly sessions = new Map<string, NativeProviderSession>();

  remember(providerId: string, nativeSessionId: string, now = new Date().toISOString()): void {
    const provider = clean(providerId, 100);
    const session = nativeSessionId.trim().slice(0, 500);
    if (!provider || !session) throw new Error('Provider and native session identifiers are required.');
    this.sessions.set(provider, { providerId: provider, nativeSessionId: session, updatedAt: now });
  }

  get(providerId: string): NativeProviderSession | undefined {
    const found = this.sessions.get(clean(providerId, 100));
    return found ? structuredClone(found) : undefined;
  }

  list(): NativeProviderSession[] {
    return [...this.sessions.values()].map((value) => structuredClone(value));
  }
}

/**
 * Cross-provider continuity contains only bounded visible context and verified
 * task state. Native provider session identifiers never enter the checkpoint.
 */
export function buildCrossProviderCheckpoint(
  input: CrossProviderCheckpointInput,
): CrossProviderCheckpoint {
  const objective = clean(input.objective, 1_000);
  if (!objective) throw new Error('A provider handoff requires an objective.');

  const turns = input.recentVisibleTurns.slice(-MAX_TURNS);
  const boundedTurns: CrossProviderCheckpoint['recentVisibleTurns'] = [];
  let chars = 0;
  for (const turn of turns) {
    const text = clean(turn.text, 2_000);
    if (!text) continue;
    if (chars + text.length > MAX_TOTAL_TURN_CHARS && boundedTurns.length) break;
    boundedTurns.push({ role: turn.role, text });
    chars += text.length;
  }

  const repositoryState = input.repositoryState
    ? clean(input.repositoryState, 2_000)
    : undefined;

  return {
    version: 1,
    objective,
    verifiedProgress: input.verifiedProgress.map((x) => clean(x)).filter(Boolean).slice(-20),
    pending: input.pending.map((x) => clean(x)).filter(Boolean).slice(-20),
    recentVisibleTurns: boundedTurns,
    ...(repositoryState ? { repositoryState } : {}),
  };
}

export function formatCrossProviderCheckpoint(checkpoint: CrossProviderCheckpoint): string {
  const lines = [
    'Cross-provider continuation checkpoint',
    `Objective: ${checkpoint.objective}`,
    'Use this as bounded context only. Resume your own native provider session when returning to that provider.',
  ];
  if (checkpoint.verifiedProgress.length) {
    lines.push('Verified progress:', ...checkpoint.verifiedProgress.map((x) => `- ${x}`));
  }
  if (checkpoint.pending.length) {
    lines.push('Pending:', ...checkpoint.pending.map((x) => `- ${x}`));
  }
  if (checkpoint.repositoryState) lines.push(`Repository state: ${checkpoint.repositoryState}`);
  if (checkpoint.recentVisibleTurns.length) {
    lines.push('Recent visible conversation:');
    for (const turn of checkpoint.recentVisibleTurns) {
      lines.push(`- ${turn.role}: ${turn.text}`);
    }
  }
  lines.push('Do not infer hidden provider state, private chain of thought, or completed side effects from this checkpoint.');
  return lines.join('\n');
}
