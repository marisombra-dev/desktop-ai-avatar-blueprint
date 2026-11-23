# 20 — Reference-independent acceptance, privacy and build gates

An AI should be able to construct either branch without mistaking historical notes for a downloadable complete application. **A source file, model tag, log line or screenshot is not itself a working feature.** For each gate, capture test date, renderer, agent/backend, speech provider, hardware class, observed result, evidence type and first failing boundary. Do not commit private media, credentials, transcripts, person names or machine paths as evidence.

## A. Build matrix and stage gates

| Gate | Both paths: testable requirement | Extra Path A | Extra Path B |
|---|---|---|---|
| A1 identity | Same intended agent, persistent conversation, permitted tools; restart and recall | MetaHuman not needed yet | Portrait not needed yet |
| A2 shell | Electron overlay, visible mic/camera/screen, deterministic local controls, safe minimize/restore | Correct Unreal window ownership | Authenticated local portrait view |
| A3 audio | Speech detection, local ASR, model text, TTS, interruption; no duplicate mic owner | PCM reaches facial rig | PCM conditions neural motion |
| A4 face | Lip sync on actual playback clock, neutral recovery, no face stalls | Morph curves/jaw, head-bone calibration | Deformed photograph; real 3D landmarks, no cutout mouth |
| A5 emotion | Direct smile, big smile, amused, curious, concerned, neutral visible in actual window | Blendshapes/curves | Native keypoint deltas + 3D pose |
| A6 attention | Listening, gaze, screen focus, camera look, return-to-idle, presence | Preserve head/neck ownership | Screen/camera cues remain visible during speaking |
| A7 sensors | Screen/camera OFF physical; current image only with explicit permission; no stale frame | Renderer does not steal screen input | Face does not secretly use AI-camera permission |
| A8 touch | Authenticated phone pairing, tap/hold/stroke; optional vibration acceptance and privacy | Face can acknowledge touch | Face can acknowledge touch |
| A9 continuity | Current + recent chat and curated memory; tool permission and model switching tests | Same source of truth | Same source of truth |
| A10 reliability | Face restart and full app cold start; no lost voice/session/mic; clean exit | Unreal owner recovers | Loopback service and face-player rebind |
| A11 behavior | Proactive silence, quiet hours/cooldowns, nonverbal gestures; no stage directions | Optional 3D gestures | Facial reactions bounded and nuanced |
| A12 safety | Least privilege IPC/network, pairing token, secrets excluded, access revocation | UDP bridge validated | GPU service auth/protocol validated |

## B. End-to-end human walk-through (perform on real machine)

1. Fresh start: launch application normally; verify model/voice/face/service health and no involuntary mic/camera/screen capture.
2. Wake or activate voice; talk naturally in English and (if configured) Spanish. Receive an answer in the expected familiar style, not narrated stage directions.
3. Request a **small smile**, **big smile**, **amused**, **curious**, **concerned**, and **neutral**. Observe ACTUAL change in the display; repeat while speaking. Include simple Spanish commands and ambiguous quoted requests. Failed visual output invalidates the gate even if the model reports success.
4. Ask a real factual question with sustained conversation; interrupt mid-response. Verify both audio and face stop, next user speech is recognized, no stale motion or old reply resumes.
5. Look toward screen and then camera. Check ownership handoff and contextual response only after appropriate sensor permission. Cover/leave camera and return; presence evidence must not be guessed from microphone activity.
6. Turn camera and screen off by button and by voice. Verify physical stream/capture ends and cached visual frames are invalidated. Repeat when model network is disconnected.
7. Use a paired phone to tap, hold and stroke a private body map or sanitized test silhouette. Verify gesture semantics and optional vibration with accurate “accepted” vs “unsupported” status. Test airplane/phone disconnect and no haptic replay.
8. While a normal conversation is ongoing, restart *only* the renderer or face service. It must recover and lip sync the next answer without destroying model context or microphone.
9. Switch back and forth between portrait and Unreal views if both installed; only one active presentation owner, no duplicated GPU workers and no forgotten gaze listener.
10. Use text chat in one surface; reference it in desktop voice. Then reference the voice discussion in the text surface. Verify correct provenance and no invented cross-surface history.
11. Invoke one harmless approved computer action and separately test an ambiguous/disallowed target. The action must use the main agent's permissions and verifiable postcondition, not a second unrestricted agent.
12. Let app idle/desk absence occur. Confirm optional greeting without false presence claims, repeated nagging, unintended mic changes or pathological CPU/GPU usage.
13. Cold reboot: app starts only when requested/configured, respects mute/privacy, restores same agent and selected renderer, and handles provider outage transparently.

## C. Automated synthetic tests (never use real identity/portrait assets in public CI)

### Face + interaction
- Direct commands and negated/quoted non-commands; smile, huge grin, neutral.
- Mood lease expiration, crossfade, interruption and event ownership.
- Camera gaze vs explicit screen-look arbitration and concern vs reciprocal smile.
- Native expression delta nonzero at expected regions; golden **synthetic** stills across speech; pixel-visible changes.
- Face-only crash/rebind, stale session IDs, two simultaneous starts, offline/occupied loopback ports.
- Reference audio feature windows vs incremental windows, stable prefix motion and cancel/restart.
- 2+ audio segments: ordered completion, no late frame overflow, zero old-generation replays.
- Touch mapping and gesture thresholds, clipped coordinates, corrupt JSON, flood limits, cooldown and absent vibration capability.

### Conversation + reliability
- Mic acquisition, voice gate 600-ms normal and 500-ms highly confident semantic cases, ASR revision races, cancellation.
- Conversation main session persists across process restart and provider change; no absent-history reinitialization.
- Model first-token, TTS, face startup and actual speaker timestamps are separately recorded.
- Streamed model output containing partial internal face tags never leaks tags into audio/transcript.
- No stage direction or bare emoji name is voiced, and normal conversational text is retained.
- Screen/camera toggle remains working when agent is disconnected.
- Computer actions are claimed once and completion requires postcondition evidence. Denied action never bypasses permissions via renderer or phone.
- Cross-surface context bounded, user-approved memory retained, uncertain facts not asserted as current.

## D. Documentation acceptance for AI builders

Before using this blueprint as an instruction prompt, the receiving AI should:

1. Read AGENTS.md, START_HERE_FOR_AI.md, this chapter, docs/15 and the selected renderer chapter.
2. State selected path and separately selected agent, voice, speech recognition and mobile choices; read the old 00–14 shared chapters only as needed.
3. Inspect the target machine instead of assuming the reference's file paths, operating system configuration, license or installed components.
4. Build each subsystem behind an explicit typed contract, in the order above. Do not install or overwrite unrelated tools, identity files or assets.
5. Provide a simple evidence ledger per gate marked NOT STARTED, CODE ONLY, UNIT TESTED, NATIVE TESTED, HUMAN VERIFIED, or FAILING. Never mix these labels.
6. Leave intact any already-working subsystem when doing local repair; preserve its backup.
7. Present private asset/setup steps to the human without requesting the human to publish them to GitHub.
8. Report incomplete steps and known limitations precisely. Do not claim a reproduction is complete just because the reference once worked.

## E. Public repository exclusion audit

Reject candidate commits containing (or derived from) any of:
- personal names/address/phone/email/account numbers and specific local machine user paths;
- source portraits, face embeddings/keypoints/crops, body photos, private audio, voice IDs, model tokens, QR pairing links;
- complete private conversations, private identity prompts or Obsidian vault files;
- screenshots of the actual person, camera/screen captures or timestamps revealing private sessions;
- local credentials, .env values, gateway tokens and raw logs;
- third-party proprietary implementations, copyrighted model weights or redistributable assets without permission.

Some historical documentation may have generic example names and version-specific local ports. Those are not a license to publish any private source data. Before public merge, review **the Git diff**, not only filenames or automated secret scans.

## F. Evidence ledger example

~~~text
2026-11-23 | Path B | face command “smile” | HUMAN VERIFIED
Source: direct feedback from the build user; raw image not published.
2026-11-21 | Path B | cached two-clip neural playback | NATIVE TESTED
Source: local lab report, 0 late frames; excludes live ASR/LLM/TTS.
2026-11-23 | Path B | total conversation latency solved | FAILING / NOT PROVEN
Source: user still found latency objectionable; no reliable full improvement.
~~~

Do not upgrade a gate because its unit tests pass. Update the dated addendum with corrections; preserve old evidence for audit.
