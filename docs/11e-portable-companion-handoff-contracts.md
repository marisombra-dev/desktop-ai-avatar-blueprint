# Portable companion contracts: voice turns, provider handoff, phone pairing, and avatar sync

A persistent AI person eventually spans more than one process: a realtime voice transport, a long-lived reasoning agent, a phone surface, an avatar renderer, and sometimes multiple model providers. The safest way to grow that system is to define narrow contracts between surfaces rather than replacing the entire stack with one large framework.

## Semantic end-of-turn is optional advice, not a new speech owner

Silence length alone is a poor proxy for whether the user is finished. A local semantic-audio detector can improve this by examining only the just-finished utterance waveform for intonation and trailing-thought cues.

The useful architecture, inspired by the pluggable turn detector in Mynah, is: bounded utterance tail -> optional local semantic detector -> end-of-turn probability/decision -> existing turn coordinator.

Keep this worker outside the continuous media hot path. Send only a bounded tail of the current utterance, not microphone history. If the detector is absent or fails, fall back to the already-proven transcript/silence policy. An optional model must never leave voice permanently waiting.

See examples/semantic_turn_boundary.ts. Do not blindly bundle another project's model. Review the exact model license and runtime dependencies separately. The Mynah repository documented its Smart Turn v3.2 worker/model as BSD-2-Clause during the October 2026 review, while Mynah itself is Apache-2.0.

## Keep provider-native sessions native

Switching the reasoning provider does not require pretending that one vendor's hidden conversation state can be translated into another's. Keep each provider's native session reference separately. When switching between providers, create a bounded checkpoint containing only the explicit objective, verified progress, remaining work, a small amount of user-visible recent dialogue, and optional safe repository/workspace state.

When returning to an earlier provider, resume its own native session and optionally give it any verified external progress that happened while it slept. Do not replay another vendor's private transcript, hidden reasoning, tool internals, or credential state. This pattern is informed by MultiCC. See examples/provider_native_handoff.ts.

## A phone is a scoped peer, not a duplicate desktop administrator

Ethan Anywhere style continuity needs a pairing model before it needs more buttons. A safe local pairing flow should use a short-lived high-entropy single-use offer; a QR/deep-link secret carried in the URL fragment rather than the HTTP query string; explicit requested scopes; a long-lived random mobile bearer token returned once with only its hash stored on the computer; revocation and expiry; per-command IDs and expiry for state-changing actions; and retained outcomes so reconnects do not repeat side effects.

The reference MobilePairingGate implements the authorization and idempotency half of that pattern. It is not encryption. A real non-loopback deployment must add authenticated encryption plus peer-identity confirmation. Do not expose a plain HTTP local gateway merely because the Wi-Fi network feels private. Lume's local mobile architecture was a useful source for these boundaries. See examples/secure_mobile_pairing.ts.

## Synchronized avatar frames belong to one audible turn

For richer facial animation, bind audio and facial frames to one response turn ID. A typical stream is audio_start, then synchronized PCM plus 52 ARKit weights, then audio_end. When the user interrupts, stop queued speech, invalidate facial frames from that turn, reject late packets, and begin the next response under a new turn ID.

The reference parser accepts only a narrow packet vocabulary, validates sample rates and turn identifiers, requires exactly 52 blendshape values, clamps numeric weights, and rejects duplicate or out-of-order frames. It was inspired by the interruption-aware protocol in myned-ai/avatar-chat-server. See examples/avatar_sync_protocol.ts.

This is a transport pattern, not a recommendation to replace a working MetaHuman lip-sync system. Benchmark latency, interruption behavior, GPU/CPU use, face ownership, and visual quality before changing production animation.

## Lightweight avatar surfaces can use the same person-state contract

A phone does not need to run Unreal to feel alive. A useful renderer-neutral state vocabulary is idle, listening, thinking, speaking, and working. A lightweight portrait can respond with restrained image swaps or bounded motion while the desktop MetaHuman realizes the same conceptual states through its own animation system. The state belongs to the companion, not to a particular renderer.

The October 2026 review of react-ai-avatar reinforced this architecture. That library is MIT and offers React, 2D, and optional VRM/GLB rendering, but the blueprint does not require it. A small PWA can implement the same state contract without importing React or Three.js.

## Evidence remains evidence, not permission

Dense-Mem's current architecture emphasizes that provenance identifiers do not create authorization. That matches the blueprint's existing durable-task and memory rules. Do not use remembered context, a provider session ID, a phone pairing record, or a retrieved document as permission to perform an action. Authorization comes from the relevant local permission boundary. No second memory backend is needed merely to adopt this principle.

## Reference tests

The four examples are dependency-free TypeScript using Node built-ins. With Node.js 24, run: node --test examples/portable_companion_contracts.test.ts

The tests verify semantic turn continuation with deterministic fallback; provider-native session isolation; scoped single-use mobile pairing and replay-safe commands; and synchronized avatar-frame invalidation after interruption.

## Upstream design references

Reviewed in October 2026: honwee/mynah (Apache-2.0); myned-ai/avatar-chat-server (MIT); Lume-agents/Lume (MIT); lsjwzh/MultiCC (MIT); markhuangai/dense-mem (Apache-2.0); aralde/react-ai-avatar (MIT). These repositories are references, not bundled dependencies. Check current upstream licenses, model and asset licenses, account policies, and security posture before installing anything.