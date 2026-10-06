/**
 * Dependency-free, privacy-minimal crash-recovery example for one desktop process.
 * A ledger is an observation record, NOT an agent that automatically replays actions.
 * Use a private application-data path, never a public repository or memory vault.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type StepPhase = 'pending' | 'executing' | 'verified' | 'blocked';

export interface TaskStep {
  id: string;
  description: string; // Generic label; never user input, credentials, or screen text.
  phase: StepPhase;
  /** Set only after independently checking the requested postcondition. */
  verifiedAt?: string;
}

export interface TaskSnapshot {
  version: 1;
  taskId: string;
  objective: string; // Generic, privacy-safe objective.
  steps: TaskStep[];
  updatedAt: string;
}

export type RecoveryDisposition =
  | 'verified_complete'
  | 'outcome_unknown'
  | 'not_started'
  | 'requires_review';

export interface RecoveryItem {
  id: string;
  description: string;
  disposition: RecoveryDisposition;
}

function validateSnapshot(value: unknown): asserts value is TaskSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid task ledger.');
  const data = value as Partial<TaskSnapshot>;
  if (data.version !== 1 || typeof data.taskId !== 'string'
      || !Array.isArray(data.steps) || typeof data.updatedAt !== 'string'
      || typeof data.objective !== 'string') {
    throw new Error('Unsupported or corrupt task ledger: refusing to overwrite it.');
  }
  for (const step of data.steps) {
    if (typeof step.id !== 'string' || typeof step.description !== 'string'
        || !['pending', 'executing', 'verified', 'blocked'].includes(step.phase)
        || (step.verifiedAt !== undefined && typeof step.verifiedAt !== 'string')) {
      throw new Error('Invalid task step: refusing to overwrite the ledger.');
    }
  }
}

export function reviewInterruptedTask(snapshot: TaskSnapshot): RecoveryItem[] {
  return snapshot.steps.map((step) => ({
    id: step.id,
    description: step.description,
    disposition: step.phase === 'pending'
      ? 'not_started'
      : step.phase === 'verified' && step.verifiedAt
        ? 'verified_complete'
        : step.phase === 'blocked'
          ? 'requires_review'
          : 'outcome_unknown',
  }));
}

export function formatRecoveryHandoff(snapshot: TaskSnapshot): string {
  const lines = [
    `Task: ${snapshot.objective}`,
    `Reference: ${snapshot.taskId}`,
    'Recovery is advisory only. Do not automatically execute or repeat actions.',
  ];
  for (const item of reviewInterruptedTask(snapshot)) {
    lines.push(`- [${item.disposition}] ${item.description}`);
  }
  lines.push(
    'For outcome_unknown, inspect fresh external state before considering a retry.',
    'Respect original permissions, confirmations, and idempotency guards.',
  );
  return lines.join('\n');
}

/**
 * One-process serialized state transitions and atomic file replacements.
 * Call update() to persist 'executing' BEFORE dispatching an external effect;
 * persist 'verified' only AFTER independently checking the postcondition.
 * Crash between those writes -> outcome_unknown, never silent replay.
 *
 * Only one TaskLedger instance/process should write this file.
 */
export class TaskLedger {
  private queue: Promise<void> = Promise.resolve();
  private readonly filePath: string;
  private snapshot: TaskSnapshot;

  private constructor(filePath: string, snapshot: TaskSnapshot) {
    this.filePath = filePath;
    this.snapshot = snapshot;
  }

  static async open(filePath: string, initial: () => TaskSnapshot): Promise<TaskLedger> {
    try {
      const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
      validateSnapshot(parsed);
      return new TaskLedger(filePath, structuredClone(parsed));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const first = initial();
      validateSnapshot(first);
      const ledger = new TaskLedger(filePath, structuredClone(first));
      await ledger.update((state) => state);
      return ledger;
    }
  }

  read(): TaskSnapshot {
    return structuredClone(this.snapshot);
  }

  async update(change: (current: TaskSnapshot) => TaskSnapshot): Promise<TaskSnapshot> {
    let result: TaskSnapshot | undefined;
    const job = this.queue.then(async () => {
      const next = change(this.read());
      validateSnapshot(next);
      if (next.taskId !== this.snapshot.taskId) {
        throw new Error('Cannot silently replace a different task.');
      }
      const temporary = `${this.filePath}.tmp`;
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
      await rename(temporary, this.filePath);
      this.snapshot = structuredClone(next);
      result = this.read();
    });
    // A rejected write must not poison subsequent attempts.
    this.queue = job.catch(() => undefined);
    await job;
    return result!;
  }
}
