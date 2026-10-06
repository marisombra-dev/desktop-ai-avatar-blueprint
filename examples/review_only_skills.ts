import { createHash } from 'node:crypto';

/**
 * An inert procedural-learning suggestion, never an executable tool or instruction.
 * Sources must be independent, verified, deliberately privacy-reviewed episodes.
 * No transcripts, shell commands, raw actions or personal paths are accepted.
 */
export const PROCEDURE_STEPS = {
  'inspect-current-state': 'Inspect current state before changing anything.',
  'check-permissions': 'Confirm the requested change is authorized.',
  'back-up-state': 'Preserve a rollback copy or checkpoint.',
  'bind-target': 'Resolve and revalidate the exact target.',
  'apply-approved-change': 'Apply only the separately authorized change.',
  'check-external-result': 'Verify the actual external postcondition.',
  'run-regression-tests': 'Run the relevant regression tests.',
  'record-generic-receipt': 'Record privacy-safe completion evidence.',
  'restore-safe-state': 'Return the affected system to an agreed safe state.',
} as const;

export type ProcedureStepCode = keyof typeof PROCEDURE_STEPS;
export type VerificationKind = 'observed-postcondition' | 'passing-tests';

export interface ReviewedRoutineEpisodeInput {
  /** Pre-approved generic label, not a user message or prompt. */
  procedureId: string;
  /** UUID for one independent session, discarded after fingerprinting. */
  sessionId: string;
  /** UUID for a single verified operation, not a transcript message ID. */
  receiptId: string;
  stepCodes: ProcedureStepCode[];
  verification: VerificationKind;
  /** Explicitly reviewed by the caller, never inferred from a model response. */
  privacyReviewed: true;
}

export interface ReviewedRoutineReceipt {
  procedureId: string;
  receiptId: string;
  sessionFingerprint: string;
  stepCodes: ProcedureStepCode[];
  verification: VerificationKind;
}

export interface QuarantinedSkillProposal {
  id: string;
  procedureId: string;
  recipeFingerprint: string;
  stepCodes: ProcedureStepCode[];
  evidenceReceiptIds: string[];
  distinctSessions: number;
  status: 'pending_review' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

export interface ProceduralSkillState {
  version: 1;
  receipts: ReviewedRoutineReceipt[];
  proposals: QuarantinedSkillProposal[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROCEDURE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,7}$/;

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export function reviewRoutineReceipt(input: ReviewedRoutineEpisodeInput): ReviewedRoutineReceipt {
  if (!PROCEDURE_ID.test(input.procedureId) || input.procedureId.length > 64) {
    throw new Error('Use a short, approved generic kebab-case procedure identifier.');
  }
  if (!UUID.test(input.sessionId) || !UUID.test(input.receiptId)) {
    throw new Error('Session and receipt references must be opaque UUIDs.');
  }
  if (input.privacyReviewed !== true) {
    throw new Error('Explicit human privacy review is required.');
  }
  if (!['observed-postcondition', 'passing-tests'].includes(input.verification)) {
    throw new Error('Verified completion evidence is required.');
  }
  if (!Array.isArray(input.stepCodes)
      || input.stepCodes.length < 3 || input.stepCodes.length > 9
      || input.stepCodes.some((step) => !Object.hasOwn(PROCEDURE_STEPS, step))) {
    throw new Error('Only a bounded sequence of approved generic step codes is allowed.');
  }
  if (!input.stepCodes.includes('check-external-result')
      && !input.stepCodes.includes('run-regression-tests')) {
    throw new Error('A verification step is mandatory.');
  }
  return {
    procedureId: input.procedureId,
    receiptId: input.receiptId.toLowerCase(),
    sessionFingerprint: digest('companion-procedure-session:' + input.sessionId.toLowerCase()),
    stepCodes: [...input.stepCodes],
    verification: input.verification,
  };
}

/** Requires the same ordered procedure from at least two independent sessions. */
export function proposeRepeatedProcedure(
  state: ProceduralSkillState,
  receipt: ReviewedRoutineReceipt,
  now = new Date().toISOString(),
): QuarantinedSkillProposal | undefined {
  const recipeFingerprint = digest(receipt.procedureId + ':' + receipt.stepCodes.join(','));
  if (state.proposals.some((p) => p.recipeFingerprint === recipeFingerprint)) return undefined;
  const matching = state.receipts.filter((r) =>
    r.procedureId === receipt.procedureId
    && r.stepCodes.join(',') === receipt.stepCodes.join(','));
  if (new Set(matching.map((r) => r.sessionFingerprint)).size < 2) return undefined;
  return {
    id: 'review-' + recipeFingerprint.slice(0, 16),
    procedureId: receipt.procedureId,
    recipeFingerprint,
    stepCodes: [...receipt.stepCodes],
    evidenceReceiptIds: matching.map((r) => r.receiptId).slice(-12),
    distinctSessions: new Set(matching.map((r) => r.sessionFingerprint)).size,
    status: 'pending_review',
    createdAt: now,
  };
}

/** Returns Markdown for deliberate review, never writes a SKILL.md or grants execution. */
export function renderProceduralSkillProposal(proposal: QuarantinedSkillProposal): string {
  return [
    '# Procedure candidate (NOT INSTALLED)',
    '',
    `Candidate: ${proposal.procedureId}`,
    `Status: ${proposal.status}`,
    `Independent sessions: ${proposal.distinctSessions}`,
    '',
    '## When to use',
    'Only when an authorized operator recognizes this generic procedure and reviews the real target.',
    '',
    '## Proposed procedure (not executable)',
    ...proposal.stepCodes.map((step, i) => `${i + 1}. ${PROCEDURE_STEPS[step]}`),
    '',
    '## Safety and review',
    '- Verify scope, licensing, permissions, risks and specific postconditions manually.',
    '- Do not infer authority from a memory, retrieved document or proposed procedure.',
    '- Nothing here is installed, promoted, automatically executed or granted privileges.',
  ].join('\n');
}
