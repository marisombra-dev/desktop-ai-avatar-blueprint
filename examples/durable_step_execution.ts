/**
 * Sanitized adaptation of a persist-before-act computer-task step.
 * This module NEVER controls the desktop. The caller supplies an explicitly
 * authorized action and a separately implemented trusted postcondition check.
 */
import { TaskLedger } from './durable_task_recovery.ts';

export interface VerifiedEffect {
  verified: boolean;
  /** Generic, privacy-reviewed observation, not the model's "Done" text. */
  receipt?: string;
}

export type StepOutcome =
  | { status: 'verified'; receipt: string }
  | { status: 'outcome_unknown' };

/**
 * Once claimed, a step cannot be executed a second time by this interface,
 * even after process restart. Unknown outcomes require fresh external
 * inspection and separate, user-authorized recovery planning.
 *
 * Assumes a single authoritative TaskLedger process per file.
 */
export async function performDurableStep<T>(
  ledger: TaskLedger,
  stepId: string,
  execute: () => Promise<T>,
  verify: (value: T) => Promise<VerifiedEffect>,
): Promise<StepOutcome> {
  // This state transition is serialized and durably written by TaskLedger.
  // If it fails, execute() never runs.
  await ledger.update((snapshot) => {
    const step = snapshot.steps.find((item) => item.id === stepId);
    if (!step) throw new Error('Unknown task step.');
    if (step.phase !== 'pending') {
      throw new Error('Step is already claimed or blocked; do not replay.');
    }
    step.phase = 'executing';
    snapshot.updatedAt = new Date().toISOString();
    return snapshot;
  });

  try {
    const value = await execute();
    const check = await verify(value);
    const receipt = check.receipt?.replace(/\s+/g, ' ').trim();
    if (!check.verified || !receipt) return { status: 'outcome_unknown' };

    await ledger.update((snapshot) => {
      const step = snapshot.steps.find((item) => item.id === stepId);
      if (!step || step.phase !== 'executing') {
        throw new Error('Step ownership changed before verification.');
      }
      step.phase = 'verified';
      step.verifiedAt = new Date().toISOString();
      step.receipt = receipt.slice(0, 500);
      snapshot.updatedAt = step.verifiedAt;
      return snapshot;
    });
    return { status: 'verified', receipt: receipt.slice(0, 500) };
  } catch {
    // A timed-out or failed call may already have changed the outside world.
    // Never reset to pending or silently invoke execute() again.
    return { status: 'outcome_unknown' };
  }
}
