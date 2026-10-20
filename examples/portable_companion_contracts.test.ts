import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveTurnBoundary, tailTurnAudio } from './semantic_turn_boundary.ts';
import {
  buildCrossProviderCheckpoint,
  formatCrossProviderCheckpoint,
  NativeProviderSessionRegistry,
} from './provider_native_handoff.ts';
import { MobilePairingGate } from './secure_mobile_pairing.ts';
import { AvatarSyncTurnGate, parseAvatarSyncEvent } from './avatar_sync_protocol.ts';

test('semantic turn detector can hold a mid-thought pause without becoming mandatory', () => {
  assert.equal(resolveTurnBoundary('That is a sentence.', {
    source: 'local-semantic-eot',
    endOfTurn: false,
    probability: 0.2,
    threshold: 0.5,
  }), 'continue');
  assert.equal(resolveTurnBoundary('I was going to'), 'continue');
  assert.equal(resolveTurnBoundary('Done.'), 'complete');
  assert.equal(tailTurnAudio(new Float32Array(160_000), 16_000).length, 128_000);
});

test('provider switching preserves native sessions outside the bounded checkpoint', () => {
  const sessions = new NativeProviderSessionRegistry();
  sessions.remember('provider-a', 'private-native-session-a');
  sessions.remember('provider-b', 'private-native-session-b');
  const checkpoint = buildCrossProviderCheckpoint({
    objective: 'Continue the same task with another engine',
    verifiedProgress: ['Validated the current implementation'],
    pending: ['Package the release'],
    recentVisibleTurns: [{ role: 'user', text: 'Keep going.' }],
  });
  const rendered = formatCrossProviderCheckpoint(checkpoint);
  assert.match(rendered, /Validated the current implementation/);
  assert.doesNotMatch(rendered, /private-native-session/);
  assert.equal(sessions.get('provider-a')?.nativeSessionId, 'private-native-session-a');
});

test('mobile pairing is scoped, one-use, expiring and replay-safe', () => {
  const gate = new MobilePairingGate();
  const offer = gate.createOffer(['presence.read', 'computer.approve'], {
    now: 1000,
    ttlMs: 60_000,
  });
  const qrTarget = gate.pairingUrl('http://192.168.1.20:9000/mobile?leak=1', offer);
  assert.doesNotMatch(qrTarget, /leak=1/);
  assert.match(qrTarget, /#pair=/);

  const paired = gate.redeem(offer.id, offer.secret, ['computer.approve'], {
    now: 2000,
    sessionTtlMs: 120_000,
  });
  assert.equal(gate.authorize(
    paired.session.id, paired.token, 'computer.approve', 3000,
  ), true);
  assert.equal(gate.authorize(
    paired.session.id, paired.token, 'conversation.prompt', 3000,
  ), false);
  assert.throws(() => gate.redeem(offer.id, offer.secret, [], { now: 3000 }));

  assert.deepEqual(gate.admitCommand({
    sessionId: paired.session.id,
    token: paired.token,
    scope: 'computer.approve',
    commandId: 'approve:example-1234',
    expiresAt: 30_000,
    now: 4000,
  }), { admitted: true, duplicate: false });
  assert.equal(gate.recordCommandOutcome('approve:example-1234', { ok: true }), true);
  assert.deepEqual(gate.admitCommand({
    sessionId: paired.session.id,
    token: paired.token,
    scope: 'computer.approve',
    commandId: 'approve:example-1234',
    expiresAt: 30_000,
    now: 5000,
  }), { admitted: false, duplicate: true, outcome: { ok: true } });
});

test('avatar sync drops duplicate and post-interrupt face/audio packets', () => {
  const gate = new AvatarSyncTurnGate();
  const start = parseAvatarSyncEvent({
    type: 'audio_start', turnId: 'turn-1', sampleRate: 24000, timestamp: 1,
  });
  assert.ok(start);
  assert.equal(gate.apply(start).accepted, true);

  const packet = {
    type: 'sync_frame',
    turnId: 'turn-1',
    frameIndex: 0,
    audio: Buffer.from([1, 2]).toString('base64'),
    weights: Array(52).fill(0),
    timestamp: 2,
  };
  const frame = parseAvatarSyncEvent(packet);
  assert.ok(frame);
  assert.equal(gate.apply(frame).accepted, true);
  assert.equal(gate.apply(frame).accepted, false);

  assert.equal(gate.apply({ type: 'interrupt', turnId: 'turn-1', at: 3 }).interrupted, true);
  const late = parseAvatarSyncEvent({
    type: 'audio_chunk',
    turnId: 'turn-1',
    data: Buffer.from([3, 4]).toString('base64'),
    timestamp: 4,
  });
  assert.ok(late);
  assert.equal(gate.apply(late).accepted, false);
});
