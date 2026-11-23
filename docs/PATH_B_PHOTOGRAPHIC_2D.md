# Path B — Lifelike 2D photographic face with neural animation

**You chose the photographic route.** This path turns a privately supplied realistic photograph into an expressive **moving face**, not a static image with a sliding mouth. Audio-conditioned motion plus native facial keypoint deformation produces lips, eyes, brows, cheeks, blinks, small 3D head turns and contextual expressions in a 2D desktop view.

**Unreal, MetaHuman and Monolith are NOT required for this path.**

[← Choose another path](../README.md) · [Path A: fully rigged 3D](PATH_A_3D_METAHUMAN.md)

## What you will construct

1. A privately held portrait, licensed for the builder's own use, with private approved registration and golden quality checks.
2. A local audio-conditioned talking-face model (a Ditto-style motion generator is one optional implementation) and a native facial deformation/stitching engine (a LivePortrait-style method is one option).
3. A single locally authenticated GPU face service that can be restarted independently of conversation or microphone.
4. An Electron display bound to that face service and an authoritative output-audio playback clock.
5. A renderer-neutral event mixer driving neutral, small smile, broad grin, amused, curious, concerned, eye gaze, blink, and native 3D head offsets while speech owns the lips.
6. Your **own** AI identity and memory, delivered by any compatible native live-voice model or streaming ASR + language model + TTS pipeline. Optional screen/camera, proactive presence, mobile touch and haptics use the shared contracts.

## Build sequence

| Gate | Build and verify | Detailed chapter |
|---|---|---|
| B0 | Inventory hardware, choose agent and speech providers, preserve existing identity, collect PRIVATE portrait approval | [AI setup](../START_HERE_FOR_AI.md), [shared design](15-dual-path-build-guide.md) |
| B1 | Register source image privately; calibrate face landmarks, cache by hash and establish neutral quality baseline | [Neural portrait renderer](16-neural-portrait-build.md) |
| B2 | Prove canned audio moves the lips and other real face geometry, with no image-cutout mouth or distorted portrait | [Motion pipeline](16-neural-portrait-build.md) |
| B3 | Wrap motion engine in one healthy authenticated loopback service and Electron frame/clock interface | [Service architecture](16-neural-portrait-build.md) |
| B4 | Connect any compatible live speech-to-speech model or streaming ASR/LLM/TTS stack; preserve interruption, conversation history and actual audio time | [Model/voice/memory adapters](19-agents-voice-memory-and-latency.md) |
| B5 | Wire small smile, broad grin, amusement, curiosity, concern, blinks, screen/camera gaze, listening micro-reactions | [Expressions and attention](17-emotions-and-contextual-embodiment.md) |
| B6 | Add optional screen/camera context, phone touch/haptics, computer tools and proactive presence | [Mobile touch](18-mobile-touch-and-haptics.md), [capabilities](21-capabilities-migration-and-optional-surfaces.md) |
| B7 | Verify native visible motion, facial reaction during speaking, face restart, latency and real human acceptance | [Complete tests](20-validation-and-reproducibility.md) |

## Where the animation actually happens

~~~text
privately owned source photo ──────┐
                                   ↓
spoken audio → motion model → native keypoints + expression offsets
                                   ↓
                  face warping, stitching and GPU compositing
                                   ↓
               timed frames aligned with real audio playback
                                   ↓
                       desktop portrait window
~~~

The output is a 2D presentation with 3D-aware facial controls. It is **not** a 3D body rig, and it does not deliver full-body movements by itself. Those belong to optional other renderers. Changing a TTS or LLM should not require rebuilding the face.

## The model is your choice

Any model that can provide a conversational text stream through the chosen adapter is suitable *if it meets your requirements*. The portrait engine has no reason to know the brand or identity of the LLM. It takes approved speech audio and bounded, optional emotion/attention cues. Cloud or local TTS can be used, **or the audio can come directly from a native streaming speech-to-speech model**, provided the real audio reaches the motion engine with correct timing and cancellation.

The dated reference happened to use particular speech, motion and conversation libraries. They are examples for reproducing known interfaces, not mandatory suppliers. Always inspect current licensing, model formats and hardware compatibility.

## What proves Path B works

- Human-approved photographic quality, neutral face, and real visible lip sync.
- Small smile and broad grin are actually distinct; concern, curiosity and amusement produce recognizable restrained facial changes.
- Expressions, camera gaze and deliberate screen focus still work while talking; serious/concerned context suppresses inappropriate grins.
- Streaming speech uses an audio clock; canceled text/face cues never replay.
- Face service can crash and recover without resetting mic, agent memory or the voice session.
- Total ASR-to-spoken-answer delay is measured end to end rather than inferred from cached face tests.
- Optional phone touch/haptics and active sensors have accurate consent, pairing, and on/off states.

The approved subject photo, private face embeddings, cloned voice and pairing secrets are never published in this repository. Start with [the neural portrait implementation](16-neural-portrait-build.md) and [emotion policy](17-emotions-and-contextual-embodiment.md).

[← Back to the two choices](../README.md)
