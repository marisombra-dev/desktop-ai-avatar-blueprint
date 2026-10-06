import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  proposeRepeatedProcedure,
  renderProceduralSkillProposal,
  reviewRoutineReceipt,
  type ProceduralSkillState,
  type ReviewedRoutineEpisodeInput,
} from './review_only_skills.ts';
import { ProceduralSkillReviewStore } from './review_only_skill_store.ts';

function reviewed(
  sessionId = randomUUID(),
  receiptId = randomUUID(),
): ReviewedRoutineEpisodeInput {
  return {
    procedureId: 'safe-build-review',
    sessionId,
    receiptId,
    privacyReviewed: true,
    verification: 'passing-tests',
    stepCodes: ['inspect-current-state', 'run-regression-tests', 'record-generic-receipt'],
  };
}

test('requires two independent verified sessions for the same ordered procedure', () => {
  const original = reviewed();
  const a = reviewRoutineReceipt(original);
  const b = reviewRoutineReceipt(reviewed(original.sessionId));
  const state: ProceduralSkillState = { version: 1, receipts: [a, b], proposals: [] };
  assert.equal(proposeRepeatedProcedure(state, b), undefined);
  const third = reviewRoutineReceipt(reviewed());
  state.receipts.push(third);
  const candidate = proposeRepeatedProcedure(state, third)!;
  assert.equal(candidate.status, 'pending_review');
  assert.equal(candidate.distinctSessions, 2);
  assert.match(renderProceduralSkillProposal(candidate), /NOT INSTALLED/);
  assert.ok(!JSON.stringify(state).includes(original.sessionId));
});

test('rejects raw commands, unreviewed inputs and missing verification', () => {
  assert.throws(() => reviewRoutineReceipt({
    ...reviewed(), stepCodes: ['curl example.com'] as never,
  }), /generic step codes/);
  assert.throws(() => reviewRoutineReceipt({
    ...reviewed(), privacyReviewed: false as true,
  }), /privacy review/);
  assert.throws(() => reviewRoutineReceipt({
    ...reviewed(), stepCodes: ['inspect-current-state', 'bind-target', 'apply-approved-change'],
  }), /verification step/);
});

test('proposal quarantine serializes concurrent receipts without installing skills', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'blueprint-review-'));
  try {
    const file = join(folder, 'proposals.json');
    const queue = new ProceduralSkillReviewStore(file);
    await queue.initialize();
    const results = await Promise.all(
      Array.from({ length: 25 }, () => queue.submit(reviewed())),
    );
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(queue.listPending().length, 1);
    const fresh = new ProceduralSkillReviewStore(file);
    await fresh.initialize();
    assert.equal(fresh.receiptCount(), 25);
    const proposal = fresh.listPending()[0]!;
    assert.equal(await fresh.reject(proposal.id), true);
    assert.equal(fresh.listPending().length, 0);
    assert.equal(await fresh.submit(reviewed()), undefined);
    assert.deepEqual(await readdir(folder), ['proposals.json']);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test('a corrupt evidence ledger is preserved rather than overwritten', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'blueprint-review-'));
  try {
    const file = join(folder, 'proposals.json');
    await writeFile(file, '{broken json', 'utf8');
    await assert.rejects(new ProceduralSkillReviewStore(file).initialize());
    assert.equal(await readFile(file, 'utf8'), '{broken json');
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
