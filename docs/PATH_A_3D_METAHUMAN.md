# Path A — Rigged 3D character with Unreal / MetaHuman

**You chose the full 3D route.** This path is for a photorealistic character that can animate its face *and body*, move naturally, turn in three dimensions, perform gestures, and optionally inhabit an interactive scene.

[← Choose another path](../README.md) · [Path B: photographic neural 2D](PATH_B_PHOTOGRAPHIC_2D.md)

## What you will construct

1. A private, approved, legally usable 3D character and MetaHuman facial/body rig.
2. A standalone Unreal presentation with face animation, controlled blinking/gaze, and optional full-body environment.
3. A desktop host that positions the avatar without stealing mouse input and uses narrow control messages.
4. A **model-independent** conversation adapter: your existing AI agent and memory, a chosen ASR/speech solution, interruptible audio and a single authoritative playback clock.
5. An audio-to-face animation bridge and a bounded body/gesture event interface.
6. Optional local screen/camera senses, computer use, proactive presence and paired phone touch/haptic peripherals.

## Build sequence

| Gate | Build and verify | Detailed chapter |
|---|---|---|
| A0 | Verify intended agent identity and permissioned session; inventory GPU, voice devices and privacy controls | [AI setup](../START_HERE_FOR_AI.md), [shared design](15-dual-path-build-guide.md) |
| A1 | Install compatible Unreal and licensed MetaHuman; approve likeness and rig, calibrate lighting/camera | [Unreal/MetaHuman](02-unreal-metahuman-monolith.md), [likeness](03-reference-photo-to-metahuman.md) |
| A2 | Test character idle, blink, head aim, gaze and lip/jaw independent of any LLM | [Animation behavior](09-avatar-behavior-and-animation.md), [head control](09b-metahuman-head-control.md) |
| A3 | Connect Electron, conversation adapter, microphone/ASR and your selected speech provider; verify audio without avatar | [Desktop shell](00-electron-desktop-shell.md), [voice interface](19-agents-voice-memory-and-latency.md) |
| A4 | Drive MetaHuman face from the **actual played audio**; verify visible lip synchronization and interruption | [Voice and lip sync](04-voice-and-lipsync.md), [PCM bridge example](../examples/unreal/DesktopAvatarAudioBridge/README.md) |
| A5 | Add silent smile/amused/delighted/curious/concerned and head/nod/shake/shrug cues | [Emotion policy](17-emotions-and-contextual-embodiment.md), [expression calibration](09c-metahuman-expression-calibration.md), [shoulder shrug](09d-metahuman-shoulder-shrug.md) |
| A6 | Add optional body motion and transitions, sensors and mobile touch | [Wide View options](02b-living-environment-wide-view.md), [sensor chapters](07-screen-and-camera-vision.md), [haptics](18-mobile-touch-and-haptics.md) |
| A7 | Run cold start, interruption, handoff and full verification | [Acceptance tests](20-validation-and-reproducibility.md) |

For advanced full-body scene transitions see the [02a–02f chapters](02a-swappable-background-presentation-layer.md), [full-body animation](09f-wide-view-full-body-animation.md) and [head/neck ownership](09g-metahuman-neck-head-ownership.md).

## The model is your choice

Nothing in this path requires a particular hosted or local language model, realtime speech vendor, voice clone, agent framework or memory backend. The **conversation layer and TTS** are separate from Unreal and MetaHuman. If you already have a working agent and speech engine, **do not replace them** just to follow the historical reference. Connect them through the neutral contracts in [the shared architecture](15-dual-path-build-guide.md) and [voice/backends](19-agents-voice-memory-and-latency.md).

Historical reference code demonstrates one possible gateway and realtime voice event protocol. Treat provider-specific RPC/event names as replaceable adapter internals, not universal requirements.

## What proves Path A works

- A human approves the rendered 3D likeness and actual display behavior.
- Speech output audibly and visibly matches mouth and facial animation using the same clock, including interruptions.
- “Smile,” “big smile,” amusement, concern and curiosity visibly change the face, with calibrated head/neck behavior and a clear return to neutral.
- Reboot and face/renderer restart preserve the selected agent, conversation context, privacy state and voice.
- Optional touch, camera, screen and body animations pass their own permissioned tests. Do not claim they work merely because the 3D renderer runs.

For source and license caveats see [third-party dependencies](../THIRD_PARTY.md). The [old 3D-first README](archive/legacy-3d-first-readme.md) is retained as **historical troubleshooting/reference**, not as a universal installation script.

[← Back to the two choices](../README.md)
