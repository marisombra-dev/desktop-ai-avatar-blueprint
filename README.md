# Desktop AI Avatar Blueprint

**One persistent AI companion. Two ways to give it a face.**

This is an AI-readable construction blueprint for a voice-first desktop companion with expression, memory, optional screen and camera awareness, physical-presence gestures, and mobile touch/haptics. **It is model-agnostic:** choose your existing AI agent, language model, speech recognition and voice synthesis independently from the visual path.

## Choose your avatar

### Path A: 3D character with Unreal Engine and MetaHuman

A fully rigged, photorealistic **3D digital person**. Use Unreal Engine and MetaHuman animation to drive a face and body with synchronized speech, blinking, gaze, emotional expressions, head movements and gestures. You can optionally expand the character into an interactive environment or full-body Wide View.

**Choose A when:** you want real 3D depth, movement through scenes, a full-body avatar, skeletal gestures or an immersive world, and can accommodate a heavier 3D engine/toolchain.

**You build:** a private licensed 3D character and rig → animation/face bridge → desktop presentation → shared voice, agent and sensor interfaces.

**[Start Path A: 3D / MetaHuman →](docs/PATH_A_3D_METAHUMAN.md)**

### Path B: lifelike 2D portrait with neural facial animation

A **realistic photograph brought to life**, using neural face motion rather than a sliding image or a cartoon mouth overlay. An audio-conditioned talking-face system animates lips and facial geometry, while native 3D facial keypoint controls add natural smiles, amusement, curiosity, concern, eye contact, head turns and blinks. The animated result is presented as a 2D desktop portrait. **No Unreal or MetaHuman required.**

**Choose B when:** preserving the look of a specific private photograph matters most, you prefer an intimate close-up face, or you want to avoid the 3D engine while retaining expressive speech and reactions.

**You build:** a privately owned portrait → neural motion/face renderer → audio-clocked display → shared voice, agent and sensor interfaces.

**[Start Path B: Photographic 2D →](docs/PATH_B_PHOTOGRAPHIC_2D.md)**

## Compare the paths

| | **A: 3D MetaHuman** | **B: Neural 2D portrait** |
|---|---|---|
| Visual foundation | Fully rigged 3D character | Private realistic still photo |
| Animation | Skeletal rig, facial curves and blendshapes | Audio-driven neural motion and native 3D facial keypoints |
| Scope | Face, body, gestures, environment | Expressive close-up face and small head movements |
| Rendering | Unreal Engine | Local GPU neural face service + desktop view |
| Lip sync | PCM/animation bridge | Speech-conditioned face motion synchronized with playback |
| Setup emphasis | 3D assets, rigging, engine integration | Portrait registration, face model, inference and compositing |
| AI model, voice, memory, sensors, haptics | **Your choice; shared interfaces** | **Your choice; shared interfaces** |

Neither route requires a specific LLM, cloud provider, chatbot product, agent framework, TTS engine, or voice service. The technical reference includes **optional examples** of particular libraries and services, but those are replaceable.

## Shared features, whichever path you choose

Both paths can connect to an existing long-lived AI identity and its memory, run local wake/sleep and speech recognition, support interruptible spoken conversation, and use context-appropriate facial expressions instead of narrated stage directions. Both can support explicit screen/camera controls, proactive presence with the option to remain silent, authorized desktop actions, and a paired phone that recognizes tap/press/stroke gestures and can request vibration feedback.

The boundary matters: **the agent owns conversation and tools; the voice provider generates speech; the renderer animates; sensors and mobile peripherals are permissioned separately.** Replacing one component should not erase identity, conversation history or permissions.

## Build and verification documentation

- **[AI builder entry point](START_HERE_FOR_AI.md)**: choose the path and inventory the target machine before installing anything.
- **[Shared architecture and staged build order](docs/15-dual-path-build-guide.md)**: contracts, common lifecycle and distinct renderers.
- **[Emotional expressions and facial behavior](docs/17-emotions-and-contextual-embodiment.md)**: contextual cues, smiles, gaze, direct voice commands and observable tests.
- **[Phone touch and haptics](docs/18-mobile-touch-and-haptics.md)**: authenticated touch events, optional phone vibration and acknowledgment.
- **[Model-agnostic agent, voice, memory and latency](docs/19-agents-voice-memory-and-latency.md)**: swappable backends and evidence-based tuning.
- **[Acceptance tests](docs/20-validation-and-reproducibility.md)** and **[optional capabilities](docs/21-capabilities-migration-and-optional-surfaces.md)**.

**Reference history:** the original 3D-first implementation is preserved in the [archived walkthrough](docs/archive/legacy-3d-first-readme.md). The [historical status](REFERENCE_BUILD_STATUS.md) and [newer status addendum](REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-23.md) distinguish what was code-only, locally tested and directly human-verified. They are evidence, **not** installation requirements or guarantees on your hardware.

## Privacy and scope

This public repository contains reusable patterns, documentation and sanitized examples, **not** the private portrait or body image, personal identity/memory/transcripts, real voice clone, API credentials, pairing tokens, or private machine paths. Provide those privately during your own build and keep them out of version control.

**Pick Path A or B above to begin.** The rest of the blueprint is organized around that choice.
