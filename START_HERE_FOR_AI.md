# START HERE FOR AI — two avatar paths, any compatible model

This is the AI coding-agent entry point for the [Desktop AI Avatar Blueprint](README.md). **Do not assume a particular language model, vendor, agent framework, speech service, or renderer.** First select the visual route and preserve the human's existing conversation identity and data.

## Step 1 — Let the builder choose the face

| | Path A: 3D MetaHuman | Path B: photographic neural 2D |
|---|---|---|
| Input | Licensed 3D character / MetaHuman rig | Privately owned realistic photograph |
| Renderer | Unreal Engine and animation rig | Local face-motion inference and compositing |
| Motion | 3D face and full-body gestures | 2D photo with 3D-aware eye, face and head deformation |
| Ideal use | Full-body scenes and spatial 3D presence | Lifelike, expressive close-up face |
| Unreal required? | Yes | No |
| First guide | [PATH_A_3D_METAHUMAN.md](docs/PATH_A_3D_METAHUMAN.md) | [PATH_B_PHOTOGRAPHIC_2D.md](docs/PATH_B_PHOTOGRAPHIC_2D.md) |

**Do not begin by installing either engine.** First inspect the target machine, existing project and approved assets. If the human has already made the choice, proceed without asking again.

## Step 2 — Select independent, interchangeable services

You need an authorized implementation of these **roles**, not particular brands:

1. **Conversation/voice owner**: an integrated live speech-to-speech model **or** an existing text agent/LLM (hosted or local) connected through a streaming voice pipeline. Preserve one identity, tool authorization, history and memory. Use an adapter with session, stream, interrupt, history and health.
2. **Audio input**: feed speech directly to a live voice model, **or** transcribe it using local/remote ASR. Both must enforce mic permission, turn boundaries and interruption.
3. **Audio output**: use audio generated directly by the live voice model **or** by a separate TTS engine. Deliver actual audio chunks/timestamps to lip sync with an authoritative playback clock. A separate TTS provider is not required for native speech-to-speech.
4. **Renderer**: exactly one selected face implementation, Path A or B, driven by neutral timed audio/animation events.
5. **Desktop host and sensors**: narrow Electron IPC, independent screen/camera/microphone permissions and optional device activity.
6. **Optional peripherals/tools**: paired mobile touch/haptics, proactive presence and verified computer-control tools.

If the reference documents mention OpenClaw, OpenCode, Whisper, ElevenLabs, Ditto or LivePortrait, treat them as **optional inspected implementations**, not mandatory services. Any compatible native live voice model or streaming speech pipeline may be substituted. Do not treat any particular LLM, TTS, hosted API, provider event schema, or agent gateway as a prerequisite. Preserve the user's existing working technology whenever possible.

## Read order

1. [AGENTS.md](AGENTS.md) and this page.
2. Your chosen [3D guide](docs/PATH_A_3D_METAHUMAN.md) **or** [photographic 2D guide](docs/PATH_B_PHOTOGRAPHIC_2D.md).
3. [Common architecture and build sequence](docs/15-dual-path-build-guide.md).
4. [Visual/voice reference status](REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-23.md) and [developmental extension status](REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-24.md).
5. [Validation and safety gates](docs/20-validation-and-reproducibility.md).
6. The selected renderer's chapters, then optional [expressions](docs/17-emotions-and-contextual-embodiment.md), [mobile touch/haptics](docs/18-mobile-touch-and-haptics.md), [model/voice/memory/latency](docs/19-agents-voice-memory-and-latency.md) and [other features](docs/21-capabilities-migration-and-optional-surfaces.md).
7. [Sanitized examples](examples/README.md), [upstream references](SOURCES.md) and [third-party licenses](THIRD_PARTY.md) for technologies actually selected.

The [archived 3D-first walkthrough](docs/archive/legacy-3d-first-readme.md) is **historical** and applies only when deliberately using its corresponding older architecture. Never present it as the main build order.

## Optional shared developmental extension

After the core conversation and memory gates work, either renderer can connect to the same initiative worker and private developmental state. Read [22–28](docs/22-shared-initiative-and-development.md) in order, then the [development acceptance gates](docs/28-development-build-and-acceptance.md). Choose capabilities explicitly; start disabled, preserve owner permissions, and avoid extra inference or paid model switching without approval. Build and validate the agent extension independently from the face. Do not publish private records or create an autonomous general computer-control agent.

## Machine inventory before edits

Report privately and without secrets:

~~~text
Chosen renderer path and user-approved target appearance:
Existing AI agent, chosen LLM, instructions, memory and sessions:
Available local/hosted model/provider options and permission boundaries:
OS, CPU, GPU and VRAM:
Working mic/speakers and speech recognition/synthesis:
Available camera/screen sources and separate sensor permissions:
Selected renderer software and existing assets/service:
Local runtimes and model weights/licenses where required:
Existing backups, service ownership and rollback:
Mobile touch/haptics options, if desired:
Most recent human-verified capability:
First failing subsystem:
Next smallest safe implementation/test:
~~~

Ask the human only for missing **subjective choices** (portrait/likeness approval, voice, privacy preferences). Use authorized inspection tools to learn versions, paths and device capabilities. Never copy source portrait, private voice model, personal data or secrets into public documentation.

## Architecture and correctness rules

~~~text
existing long-lived person / agent / memory / tool permissions
                ↕ neutral conversation adapter
desktop host ↔ voice adapter (native live audio OR ASR → model → TTS)
      │                          │                  │
      ├── permissioned sensors   └── silent emotion ┘
      ├── optional phone touch/haptics    ↓ playback clock
      └── one renderer owner:
             ├── Path A: Unreal / MetaHuman facial-body rig
             └── Path B: neural photographic 2D face
~~~

- One conversational response owner. An audio front end and an animation renderer must never create their own independent agent/personality.
- One active microphone owner, one active renderer, one authoritative speech clock and explicit camera lease/permission ownership.
- Voice, emotion, screen awareness, memory and tool actions are separate layers with narrow schemas; a model suggestion is not evidence that hardware moved or a tool completed an action.
- Keep local privacy controls physically enforceable even when the model or network is unavailable.
- Do not speak stage directions, silent face tags or raw debug metadata.
- Treat silence as valid for proactive behavior, and do not guess presence from missing data.
- Reject ambiguous or destructive computer use; persist claims and independently verify postconditions.
- Preserve private identity, session links, recent conversation context, historical archives and approved asset backups.
- Distinguish **CODE PRESENT**, **UNIT TESTED**, **NATIVE TESTED**, **HUMAN VERIFIED** and **UNRESOLVED**. Benchmarks on prepared audio do not prove end-to-end latency.

## Required acceptance gates

A. Working existing agent and chosen model; correct conversation and recoverable session history.

B. Electron window and physical mic/screen/camera privacy controls; no involuntary capture.

C. Reliable audio input, spoken output and interruption from the chosen native live-voice or streaming pipeline, independently of any renderer.

D. Selected face has human-approved quality and visibly matches the actual played speech audio.

E. Real, visible small smile, big smile, amusement, curiosity, concern and return-to-neutral; direct spoken commands also work. Sent events alone are not proof.

F. Screen/camera gaze priorities and model perception operate only with real, authorized fresh data.

G. Face restart/rebind does not reset voice, memory, identity or sensor truth.

H. Paired phone touch and accurate browser-acknowledged haptics, **only if enabled**.

I. Silence-capable proactivity, safe tool execution and robust context continuity.

J. Cold start, interrupted reply, model outage and long conversation recover without silent data loss.

K. If optional development is enabled: verify durable queue, source evidence, isolation, rest, contextual relevance, private delivery receipts and cross-model comparisons using [D0–D11](docs/28-development-build-and-acceptance.md). Do not count synthetic tests as spontaneous development.

Run the [full human acceptance walk-through](docs/20-validation-and-reproducibility.md) and report any unfinished gate.

**The model is interchangeable. The identity, consent, continuity, expressive behavior and visible results are the product.**
