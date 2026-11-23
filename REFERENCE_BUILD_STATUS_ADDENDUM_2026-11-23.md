# Reference Build Status Addendum — November 23, 2026

This records the **two different visual paths** without rewriting the historical September reference ledger. It derives from inspection of the current reference runtime code and its dated local validation notes, plus direct user reports. The source media, actual image, identity/personality, private files and logs have deliberately not been copied here.

Read docs/15–21 for reconstruction instructions. Status words:
- **CODE INSPECTED** = present in current working tree.
- **NATIVE TESTED** = local engine or UI-level tests were recorded.
- **HUMAN VERIFIED** = operator directly confirmed visible/functional behavior.
- **UNRESOLVED** = not proven, incomplete or known imperfect.
- **HISTORICAL** = earlier Path A evidence, not proof for Path B.

## Path A: Unreal / MetaHuman

**HISTORICAL, PRESERVED AS A SUPPORTED BUILD PATH.** The September 2026 blueprint and tests described a photoreal 3D MetaHuman, head/neck and expression rigs, PCM lip sync, OpenClaw/Realtime voice, Electron shell and optional Wide View / hand tracking. See REFERENCE_BUILD_STATUS.md and the September addendum, docs/02–14. That status should not be transferred to a brand-new install without target-machine testing.

The current reference still has selectable Original/Wide presentation support, but its default photographic close-face work is Path B. No claim is made that MetaHuman is currently driving the close-face speech.

## Path B: realistic photographic neural 2D face

- **CODE INSPECTED + NATIVE TESTED:** private approved source portrait is driven by Ditto-style audio motion, LivePortrait-style canonical keypoint emotion deltas, genuine head/eye gaze, neural composite and audio-clocked playback.
- **CODE INSPECTED:** current approved Faster rendering uses both conditioning/guidance branches, 8 sampling steps, around 12.5 generated neural frames/s and blended 25 displayed frames/s. This is a different quality/speed choice from true 25 neural frames/s.
- **NATIVE TESTED:** accelerated window/prefix rendering and prepared-clip playback; local reports describe zero late frames and zero max lag in specific cached two-clip tests. THESE EXCLUDE speech recognition, fresh model text and new TTS.
- **NATIVE TESTED:** incremental per-window HuBERT feature assembly preserved recorded input-window equivalence; reduced preparation in reference 8-second and long stress fixtures. No meaningful short-greeting benefit demonstrated.
- **NATIVE TESTED:** face-only process restart and remount/rebind; native reports show face replies resumed without killing the desktop voice conversation.
- **CODE INSPECTED + NATIVE TESTED:** local screen LOOK and camera gaze share a native attention mixer; explicit screen look takes priority and camera gaze can return after clear. Reciprocal camera smile and expression effects can appear during audio playback.
- **NATIVE TESTED:** idle blink, head drift, listening drafts, concern/amusement/curiosity and animated native facial deltas in the local laboratory.
- **HUMAN VERIFIED:** the user accepted the earlier gentle natural blink and later confirmed that the facial smile works after a regression/fix on November 23, 2026. Keep direct smile/big smile/regression tests; confirmation of “smile fixed” is not automatic proof of every possible mood/sensor combination.
- **HUMAN VERIFIED:** desktop lip sync and ordinary responses have worked in the photographic face path during recent sessions. Overall latency was still a concern.

## Agent, voice and memory (shared)

- **CODE INSPECTED:** desktop route uses an OpenCode native session adapter and local multilingual Whisper transcription with GPU acceleration and fallback. The earlier OpenClaw path is retained in the blueprint as an alternative.
- **CODE INSPECTED:** as inspected Nov 23, selectable OpenCode models include a default Muse Spark 1.3 contributor/Go audition, a local Gemma 4 multimodal QAT trial and a HY4 Flash route. The chosen model is a live operational decision, not a fixed requirement or a completed model-selection success. Temporary/free hosted providers cannot be assumed to persist.
- **CODE INSPECTED:** external ElevenLabs TTS, including v4 Turbo dialogue WebSocket and HTTP option, drives the reference speech. The websocket implementation returns an assembled MP3 contract; streaming the network bytes is not synonymous with playing audio immediately.
- **CODE INSPECTED + NATIVE TESTED:** selective recent-context carry-over, bounded session overflow continuation, persistent native session mapping, model/voice isolation, tool presentation tuning and whisper voice gate.
- **UNRESOLVED:** total perceived speech latency has not been reliably reduced to a satisfactory level. Isolated face-only and warm first-token speedups do not prove end-to-end gains. The project continues model and voice latency evaluation, including correctness/hallucination tradeoffs.
- **PARTIAL:** full direct cross-surface recent text ↔ desktop voice continuity must be retested after model changes; shared Obsidian memory alone does not prove newest-conversation propagation.

## Phone touch and haptics (both renderers)

- **CODE INSPECTED:** installable phone web touch surface, private body-map asset routing, normalized pointer capture, tap/press/stroke recognition, region summaries, live position and connection state.
- **CODE INSPECTED:** optional immediate receipt vibration and differentiated reciprocal haptic patterns with cooldown; authenticated browser stream, bounded patterns, response ID and browser acceptance acknowledgment/timeout.
- **CAUTION:** browser “accepted” or event delivery is not physical sensor proof on every handset/browser. Do not claim motor-level tactile verification from code inspection.
- **PARTIAL:** separate phone speaking-portrait UI/speech-sample preview exists, but inspection does not prove fully connected remote microphone conversation and neural lip sync. Full mobile assistant is its own stage gate.

## Sensor, action and proactive layers

- **CODE INSPECTED + HISTORY:** local Screen/Camera and spoken controls, presence/gaze, return awareness, optional video and system-audio watch-along, 3D Wide View, computer-use tools, and touch semantics are individually documented in earlier chapters and docs/21. Their historical status does not imply Path B feature parity without a live check for each mode.
- **HUMAN VERIFIED:** a prior “microphone off after returning” problem was repaired, and the user reported normal answers afterward. The face and voice are separate recovery surfaces.
- **CAUTION:** clear stage directions from generated text, spoken emoji names and model selection instability remain regression tests; do not assume every conversational run is free of these merely because sanitizers exist.

## Privacy note

No actual source photograph, body image, personal names, private prompt, cloned voice sample/ID, credential, paired-phone URL, local path or private conversation from the reference build is included in this addendum. Numeric timings are clearly scoped to their tested configurations and do not identify private sessions.
