import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  TaskLedger,
  formatRecoveryHandoff,
  reviewInterruptedTask,
  type TaskSnapshot,
} from './durable_task_recovery.ts';

function initialTask(): TaskSnapshot {
  return {
    version: 1,
    taskId: 'sample-task',
    objective: 'Perform a bounded UI operation',
    updatedAt: '2026-10-06T00:00:00.000Z',
    steps: [
      { id: 'one', description: 'Inspect target', phase: 'pending' },
      { id: 'two', description: 'Perform requested action', phase: 'pending' },
      { id: 'three', description: 'Verify result', phase: 'pending' },
    ],
  };
}

async function temporaryFile(): Promise<{ directory: string; file: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'blueprint-task-'));
  return { directory, file: join(directory, 'tasks.json') };
}

test('classifies verified, interrupted and pending steps without replaying them', async () => {
  const { directory, file } = await temporaryFile();
  try {
    const ledger = await TaskLedger.open(file, initialTask);
    await ledger.update((s) => {
      s.steps[0]!.phase = 'verified';
      s.steps[0]!.verifiedAt = '2026-10-06T00:01:00.000Z';
      s.steps[1]!.phase = 'executing';
      return s;
    });
    const restarted = await TaskLedger.open(file, () => {
      throw new Error('Existing ledger must be read instead');
    });
    assert.deepEqual(reviewInterruptedTask(restarted.read()).map((x) => x.disposition), [
      'verified_complete', 'outcome_unknown', 'not_started',
    ]);
    assert.match(formatRecoveryHandoff(restarted.read()), /Do not automatically execute/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a completed-looking step without independent verification remains unknown', () => {
  const snapshot = initialTask();
  snapshot.steps[0]!.phase = 'verified';
  assert.equal(reviewInterruptedTask(snapshot)[0]?.disposition, 'outcome_unknown');
});

test('concurrent transitions preserve all updates and produce valid JSON', async () => {
  const { directory, file } = await temporaryFile();
  try {
    const ledger = await TaskLedger.open(file, initialTask);
    await Promise.all(Array.from({ length: 25 }, (_, i) => ledger.update((s) => {
      s.updatedAt = `step-${i}`;
      s.steps.push({ id: `event-${i}`, description: 'Safe checkpoint', phase: 'pending' });
      return s;
    })));
    const raw = JSON.parse(await readFile(file, 'utf8')) as TaskSnapshot;
    assert.equal(raw.steps.length, 28);
    assert.equal(raw.updatedAt, 'step-24');
    assert.equal(ledger.read().steps.length, 28);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('invalid persisted data is not silently replaced', async () => {
  const { directory, file } = await temporaryFile();
  try {
    await writeFile(file, '{broken json', 'utf8');
    await assert.rejects(TaskLedger.open(file, initialTask));
    assert.equal(await readFile(file, 'utf8'), '{broken json');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
