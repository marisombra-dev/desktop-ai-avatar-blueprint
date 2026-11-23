# START HERE FOR AI — choose 3D MetaHuman OR neural photographic 2D

**Current architecture 2026-11-23.** This repository documents TWO different routes to a persistent voice-first desktop AI companion. The original Unreal/MetaHuman reference remains an option, not the default or a prerequisite. A newer reference uses a real photograph with neural facial deformation and motion, while preserving the underlying long-lived agent, voice, sensors, tools, memory and touch features.

The objective is an AI-readable construction manual. Reconstruct from generalized architecture and public licensed upstream tools; NEVER copy private source portrait, body image, actual identity/personality, user conversations, cloned voice, secrets, local account details, or personal runtime calibration from any reference machine.

## First decision: select renderer

**Path A: 3D Unreal / MetaHuman.** Build a licensed 3D facial/body rig with Unreal and optionally Monolith. Lip sync, eye/head control, expressions, gestures and Wide View use the 3D model. Read docs/15, then docs/02, 03, 04, 09b–09g, 12, 20.

**Path B: photographic neural 2D.** Build a realistic facially deformable portrait from the user's own private licensed photo. Use neural audio-to-motion plus LivePortrait-style canonical 3D facial expression/gaze keypoints; output is an audio-clocked moving 2D view. Neither Unreal nor MetaHuman is required. Read docs/15–20. The reference uses Ditto-style motion, native keypoint blends, a GPU face service and a trusted Electron view.

The **conversation backend** is a separate choice: OpenCode or OpenClaw, as appropriate to the human's existing identity/tools. The **speech backend** is another choice: local ASR plus ElevenLabs voice, an alternative TTS, or the earlier OpenAI Realtime route. Do not confuse “which voice plays” with “which model thinks.” The reference dates prove specific implementations, not mandatory dependencies.

## Reading order

1. AGENTS.md, this page.
2. docs/15-dual-path-build-guide.md.
3. REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-23.md (latest state, limitations and evidence labels).
4. docs/20-validation-and-reproducibility.md.
5. Choose renderer:
   - Path A: docs/00, 01, 02, 03, 04, 09b–09g, 12.
   - Path B: docs/00, 01, 16, 17, 19.
6. Shared optional systems: docs/05–08, 09, 10, 11, 18, 21; inspect remaining chapters when their capability is chosen.
7. examples/README.md and any examples actually relevant.
8. SOURCES.md, THIRD_PARTY.md for upstream licenses.

The prior REFERENCE_BUILD_STATUS.md and September addendum describe **historical Path A**, not automatic completion of Path B. Old versions of README chapters “Stage 2 Unreal” and mandatory MetaHuman gates apply only to Path A. The page LYRA_QUICKSTART.md is a historical example name/implementation, not the only target character.

## What to build

~~~text
Existing intended AI person, private memory and stable agent sessions
     ↕ one permissioned OpenCode or OpenClaw conversation adapter
Electron desktop shell + narrow local IPC + sensor controls
     ↕ ASR, voice/interrupt coordinator, TTS, audio playback clock
     ↕ typed emotion/gaze/lip-sync/presence events
        ├── Path A: Unreal MetaHuman renderer
        └── Path B: loopback neural photo face renderer
Optional paired phone touch + haptic peripheral
Optional screen/camera/media observation and verified OS tool actions
~~~

An animation renderer must never own a separate “AI self,” session secrets, arbitrary computer-use tools or the authority to turn on sensors. The agent's answer text, optional private visual tags and TTS audio follow separate contracts. The user can move between renderers and voice/model providers without starting a different identity.

## Prerequisite inventory report

Inspect automatically where possible and report privately, without secret values:

~~~text
Chosen path: A (3D) / B (photographic)
Existing agent + backend:
Available candidate model(s), including local or hosted and provenance:
Target OS / GPU / VRAM:
Node / Python:
Current voice input/output and ASR backend:
Selected TTS / model/voice transport (no voice ID or secret printed):
Existing conversation session and recovery method:
Chosen private portrait or MetaHuman asset approval state:
For A: Unreal version, MetaHuman, Monolith, GPU project/rig status:
For B: neural weights/license, registered source, GPU service, cache state:
Available screen/camera devices and their independent permission/ownership:
Paired phone touch/haptic support, if opted in:
Existing memory and current recent-thread continuity:
Existing backups and rollback:
Last human-verified gate:
First failing boundary:
Single next action:
~~~

For missing subjective choices ask the user, including portrait selection/approval, actual voice, desired sensor permissions and acceptable haptics. Do not ask the user to find machine files that authorized tools can inspect. Do not claim a hardware device “did vibrate” because JavaScript accepted a request.

## Safety and operating rules

- **Preserve the person.** Back up and do not rewrite existing private identity, memory, session mappings, transcript archives or permissions merely to make the renderer simpler.
- **Preserve the current working build.** Back up approved portrait/MetaHuman, audio, working scripts and config before changes. Run one subsystem experiment at a time. Fix the earliest failing boundary, not the most visible symptom.
- **Never publish personal assets.** No source photo or body-map, keypoint embedding, user utterances, private prompts, cloned voice sample/ID, real URLs or tokens, private screenshots or identifying machine paths in Git, logs or examples.
- **One active ownership per resource.** One microphone owner, one current animation renderer, one model conversation owner, one authoritative speech clock and one explicit camera lease per device. Stale cue IDs must expire.
- **Respect local privacy.** Screen/camera/mute/sleep controls are narrow deterministic operations and physically stop capture/usage, not generic model-generated suggestions.
- **Distinguish evidence.** Code present ≠ unit tested ≠ live native playback tested ≠ human verified. Cached-clip timing excludes ASR, model and TTS. See docs/20.
- **Keep the model naturally conversational.** It is not supposed to read stage directions, face tags, emoji names or tool descriptions aloud. Natural visible emotion should come from sideband cues and sensors, not simulated words.
- **No automatic false fallback.** If a model/provider is unavailable, do not invent continuity or actions. Preserve prior history, ask for explicitly authorized fallback or queue tasks with a durable status.
- **Tools are hands.** Computer use must be authorized by the existing agent, bounded to target/action and backed by postcondition evidence, not delegated to an uncontrolled second assistant.
- **Haptics are physical device requests.** A phone browser accepting navigator.vibrate does not certify actual vibration; absent support/connection must degrade gracefully.

## Mandatory functional gates

A. Existing intended agent works in text and survives restart.

B. Electron shell, local privacy toggles and voice session work independently of renderer.

C. Local microphone recognition, real spoken answer, interruption and reliable return to listening.

D. Selected face is visually approved; real audio makes real mouth movement at the audio clock.

E. **Small smile, large smile, amused, curious, concerned and neutral** are actually visible on selected renderer; events alone are insufficient. They do not interrupt lip sync.

F. Screen/camera gaze priority and sensor permissions are true; model sees fresh frames only when invited.

G. Face service crash/rebind does not destroy audio, mic, conversation, memory or camera ownership.

H. Phone tap/press/stroke and optional haptic browser receipt are accurate if enabled.

I. Proactive system can choose silence; no nagging, hallucinated presence, stage directions or unsafe unauthorized tools.

J. Cold start, provider/model unavailability, context overflow and long dialogue recover without silently losing confirmed recent context.

**Completion:** pass the human walk-through from docs/20, record the selected path and evidence, and leave remaining limitations explicit.

## Philosophy

This is a blueprint, not a license to overwrite a real working system. Make a stable human-approved conversation and voice first. Then add a faithful face. Then add sensors, touch and optional 3D presence. The best animated avatar is worthless if it cannot hear, respond naturally or retain the same person across a restart.
