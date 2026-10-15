import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizePortableFact, supportedAt, withdrawSource,
  type TemporalFact,
} from './evidence_aware_memory.ts';

function sample(): TemporalFact {
  return {
    id: 'fact-a',
    text: 'The sample exhibit is open',
    learnedAt: '2026-10-01T00:00:00Z',
    validFrom: '2026-10-01T00:00:00Z',
    evidence: [
      { sourceId: 'source-1', kind: 'document', observedAt: '2026-10-01T00:00:00Z' },
      { sourceId: 'source-2', kind: 'user', observedAt: '2026-10-02T00:00:00Z' },
    ],
  };
}

test('one retracted source does not invalidate another', () => {
  const oneGone = withdrawSource(sample(), 'source-1', '2026-10-03T00:00:00Z');
  assert.equal(supportedAt(oneGone, '2026-10-04T00:00:00Z'), true);
  const allGone = withdrawSource(oneGone, 'source-2', '2026-10-05T00:00:00Z');
  assert.equal(supportedAt(allGone, '2026-10-06T00:00:00Z'), false);
  assert.equal(supportedAt(allGone, '2026-10-02T12:00:00Z'), true);
  assert.equal(sample().evidence?.[0]?.withdrawnAt, undefined);
});

test('a new fact can supersede an old claim without erasing its history', () => {
  const old = normalizePortableFact({
    ...sample(),
    validTo: '2026-10-10T00:00:00Z',
    supersededById: 'fact-b',
  });
  assert.equal(supportedAt(old, '2026-10-09T00:00:00Z'), true);
  assert.equal(supportedAt(old, '2026-10-10T00:00:00Z'), false);
  assert.equal(old.supersededById, 'fact-b');
});

test('serialization preserves all evidence/temporal fields', () => {
  const fact = withdrawSource(sample(), 'source-1', '2026-10-05T00:00:00Z');
  const portable = normalizePortableFact(JSON.parse(JSON.stringify(fact)));
  assert.deepEqual(portable, fact);
});

test('malformed imports are rejected instead of silently erasing provenance', () => {
  assert.throws(() => normalizePortableFact({
    ...sample(), evidence: 'not-an-array',
  }), /evidence collection/);
  assert.throws(() => normalizePortableFact({
    ...sample(), evidence: [{ sourceId: 'x', kind: 'unknown',
      observedAt: '2026-10-01T00:00:00Z' }],
  }), /kind/);
  assert.throws(() => normalizePortableFact({
    ...sample(), evidence: [{ sourceId: 'x', kind: 'tool',
      observedAt: '2026-10-09T00:00:00Z',
      withdrawnAt: '2026-10-01T00:00:00Z' }],
  }), /predates/);
});

test('legacy records without evidence remain retrievable but not proven', () => {
  const legacy = sample();
  delete legacy.evidence;
  assert.equal(supportedAt(legacy, '2026-10-10T00:00:00Z'), true);
  assert.equal(supportedAt({ ...legacy, evidence: [] }, '2026-10-10T00:00:00Z'), false);
});
