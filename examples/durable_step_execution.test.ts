import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { TaskLedger, reviewInterruptedTask } from './durable_task_recovery.ts';
import { performDurableStep } from './durable_step_execution.ts';

async function withLedger(
  fn: (ledger: TaskLedger, path: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'blueprint-step-'));
  const file = join(directory, 'work.json');
  try {
    const ledger = await TaskLedger.open(file, () => ({
      version: 1,
      taskId: 'generic-example',
      objective: 'Bounded test operation',
      updatedAt: new Date().toISOString(),
      steps: [{ id: 'action-1', phase: 'pending', description: 'Set a safe test state' }],
    }));
    await fn(ledger, file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('claims and persists the step before executing; independently checks result', async () => {
  await withLedger(async (ledger, file) => {
    let executions = 0;
    const run = () => {
      assert.equal(ledger.read().steps[0]?.phase, 'executing');
      executions += 1;
      return Promise.resolve('tool reported OK');
    };
    const result = await performDurableStep(ledger, 'action-1', run, async () => ({
      verified: true, receipt: 'Verified by a separate target inspection',
    }));
    assert.equal(result.status, 'verified');
    assert.equal(executions, 1);
    const reopened = await TaskLedger.open(file, () => { throw Error('must reopen'); });
    assert.equal(reviewInterruptedTask(reopened.read())[0]?.disposition, 'verified_complete');
    await assert.rejects(performDurableStep(reopened, 'action-1', run, async () => ({
      verified: true, receipt: 'irrelevant',
    })), /do not replay/);
    assert.equal(executions, 1);
  });
});

test('a timed-out tool action stays outcome-unknown after restart', async () => {
  await withLedger(async (ledger, file) => {
    let executions = 0;
    assert.deepEqual(await performDurableStep(ledger, 'action-1', async () => {
      executions += 1;
      throw new Error('network disconnected after click');
    }, async () => ({ verified: true, receipt: 'not reached' })),
    { status: 'outcome_unknown' });
    const reopened = await TaskLedger.open(file, () => { throw Error('must reopen'); });
    assert.equal(reviewInterruptedTask(reopened.read())[0]?.disposition, 'outcome_unknown');
    await assert.rejects(performDurableStep(reopened, 'action-1', async () => {
      executions += 1;
    }, async () => ({ verified: true, receipt: 'no' })), /do not replay/);
    assert.equal(executions, 1);
  });
});

test('the claimed state blocks two simultaneous calls from executing twice', async () => {
  await withLedger(async (ledger) => {
    let executions = 0;
    const run = async () => { executions += 1; return 'result'; };
    const [first, second] = await Promise.allSettled([
      performDurableStep(ledger, 'action-1', run,
        async () => ({ verified: true, receipt: 'Checked result' })),
      performDurableStep(ledger, 'action-1', run,
        async () => ({ verified: true, receipt: 'Checked result' })),
    ]);
    assert.equal(executions, 1);
    assert.equal([first.status, second.status].filter((s) => s === 'fulfilled').length, 1);
  });
});

test('a missing independent receipt cannot become verified', async () => {
  await withLedger(async (ledger) => {
    assert.deepEqual(await performDurableStep(ledger, 'action-1',
      async () => 'OK', async () => ({ verified: true })),
    { status: 'outcome_unknown' });
    assert.equal(ledger.read().steps[0]?.phase, 'executing');
  });
});

test('a failure to durably claim a step prevents the action from running', async () => {
  await withLedger(async (ledger) => {
    // Simulate a rejected persistence method without touching the real filesystem.
    ledger.update = async () => { throw Error('storage failure'); };
    let called = false;
    await assert.rejects(performDurableStep(ledger, 'action-1',
      async () => { called = true; }, async () => ({ verified: true, receipt: 'no' })),
    /storage failure/);
    assert.equal(called, false);
  });
});
