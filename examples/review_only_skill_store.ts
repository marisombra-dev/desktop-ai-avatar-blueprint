import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  proposeRepeatedProcedure,
  reviewRoutineReceipt,
  type ProceduralSkillState,
  type QuarantinedSkillProposal,
  type ReviewedRoutineEpisodeInput,
} from './review_only_skills.ts';

const EMPTY: ProceduralSkillState = { version: 1, receipts: [], proposals: [] };

function validateState(value: unknown): asserts value is ProceduralSkillState {
  if (!value || typeof value !== 'object') throw new Error('Invalid procedure review state.');
  const state = value as Partial<ProceduralSkillState>;
  if (state.version !== 1 || !Array.isArray(state.receipts)
      || !Array.isArray(state.proposals)
      || state.receipts.some((r) =>
        typeof r.receiptId !== 'string' || typeof r.procedureId !== 'string'
        || typeof r.sessionFingerprint !== 'string' || !Array.isArray(r.stepCodes))
      || state.proposals.some((p) =>
        typeof p.id !== 'string' || !Array.isArray(p.stepCodes)
        || !['pending_review', 'rejected'].includes(p.status))) {
    throw new Error('Unsupported or damaged procedure review state. Original file preserved.');
  }
}

/**
 * Off by default. An explicit, trusted caller supplies privacy-reviewed,
 * independently verified routine receipts. Never reads conversation logs.
 * Deliberately exposes NO automatic skill promotion or execution.
 */
export class ProceduralSkillReviewStore {
  private state: ProceduralSkillState = structuredClone(EMPTY);
  private queue: Promise<void> = Promise.resolve();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async initialize(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, 'utf8'));
      validateState(parsed);
      this.state = structuredClone(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await this.writeSnapshot(EMPTY);
      this.state = structuredClone(EMPTY);
    }
  }

  listPending(): QuarantinedSkillProposal[] {
    return structuredClone(this.state.proposals.filter((p) => p.status === 'pending_review'));
  }

  receiptCount(): number {
    return this.state.receipts.length;
  }

  async submit(input: ReviewedRoutineEpisodeInput): Promise<QuarantinedSkillProposal | undefined> {
    const receipt = reviewRoutineReceipt(input);
    return this.serial(async () => {
      if (this.state.receipts.some((r) => r.receiptId === receipt.receiptId)) return undefined;
      const next = structuredClone(this.state);
      next.receipts.push(receipt);
      next.receipts = next.receipts.slice(-250);
      const proposal = proposeRepeatedProcedure(next, receipt);
      if (proposal) next.proposals.push(proposal);
      next.proposals = next.proposals.slice(-60);
      await this.writeSnapshot(next);
      this.state = next;
      return proposal ? structuredClone(proposal) : undefined;
    });
  }

  async reject(id: string): Promise<boolean> {
    return this.serial(async () => {
      const next = structuredClone(this.state);
      const proposal = next.proposals.find((p) => p.id === id && p.status === 'pending_review');
      if (!proposal) return false;
      proposal.status = 'rejected';
      proposal.reviewedAt = new Date().toISOString();
      await this.writeSnapshot(next);
      this.state = next;
      return true;
    });
  }

  private async serial<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(job);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  private async writeSnapshot(next: ProceduralSkillState): Promise<void> {
    const temp = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(next, null, 2), 'utf8');
      await rename(temp, this.filePath);
    } catch (error) {
      await rm(temp, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}
