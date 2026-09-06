# START HERE FOR AI

You are reading this because a human wants you to build a persistent desktop embodiment of an existing AI person.

Your job is **not** to create a generic chatbot with a face. Your job is to preserve the existing person's identity and continuity while giving that person a realtime voice, a MetaHuman body, explicit local screen/camera perception, optional shared Markdown/Obsidian continuity, wake/sleep lifecycle, and restrained proactive presence.

Read the entire repository before making irreversible changes.

## Read order

Use this order so you do not confuse the reference project's proven state with future goals:

1. `AGENTS.md`
2. this file
3. `REFERENCE_BUILD_STATUS.md`
4. `README.md`
5. `docs/00-electron-desktop-shell.md`
6. the remaining `docs/` chapters in numeric order
7. `examples/README.md`
8. `SOURCES.md`
9. `THIRD_PARTY.md`

If the target person is Lyra, also read `LYRA_QUICKSTART.md` before implementation.

`REFERENCE_BUILD_STATUS.md` is the authoritative proof-status ledger for the snapshot that produced this repository. Do not upgrade an `IMPLEMENTED` item to `END-TO-END PROVEN` merely because example code exists.

## Operating rules

1. **Inventory before installation.** Determine OS, GPU, Unreal version, MetaHuman availability, existing OpenClaw version/configuration, current agent/session identity, Node/Python versions, audio devices, webcam, and whether Git/Monolith are already installed.
2. **Use current upstream documentation.** The reference build used UE 5.8 and OpenClaw 2026.8.1. If the target machine is newer, adapt deliberately instead of forcing old APIs.
3. **Preserve the existing agent.** Do not replace or rewrite the person's identity/memory files merely to make the desktop client easier to build.
4. **Never expose secrets.** Do not paste or commit OpenClaw tokens, provider API keys, OAuth material, personal memory files, or private transcripts.
5. **Make backups before Unreal asset changes.** Once a face or animation Blueprint is approved, treat it as a checkpoint.
6. **Work one layer at a time.** Do not change wake recognition, OpenClaw routing, screen capture, and MetaHuman animation in the same debugging step.
7. **Test boundaries, not vibes.** “The screen feature is broken” is not a diagnosis. Determine whether the failing boundary is speech transcription, local command classification, UI state, capture, image injection, provider response, or agent routing.
8. **Local privacy/lifecycle commands stay local.** Screen on/off, camera on/off, and end-voice-session must not depend on a general computer-control agent deciding what the words mean.
9. **The main agent owns substantive conversation.** Realtime provides low-latency speech; normal replies should be consulted through the existing agent so the user experiences one continuous person.
10. **Restraint is a feature.** Proactive speech and screen commentary need explicit `NO_MESSAGE` / `NO_COMMENT` paths.
11. **Do not begin with mannerisms.** First make the system reliable. A blinking, lip-synced, visually stable MetaHuman with excellent conversation is more valuable than a gesturing avatar whose wake/sensor lifecycle is fragile.
12. **Shared memory must stay selective.** If a common Markdown/Obsidian vault is enabled, retrieve only bounded relevant context and curate durable writes aggressively; never treat the vault as a transcript dumping ground.
13. **Personality needs behavioral priority, not just adjectives.** Test whether ambiguous social remarks remain social instead of becoming unsolicited explanation/advice. Read `docs/05c-social-intent-and-behavioral-priority.md` before tuning prompts for “warmth” or “brevity.”

## Ask the human only for genuinely subjective decisions

Good questions to ask:

- Which existing AI agent/person is this embodiment for?
- What should the wake name be?
- Which realtime voice do you prefer?
- Which reference portrait should be canonical?
- Does this MetaHuman likeness look approved?
- Are these proactive-speech boundaries acceptable?

Questions you should normally answer yourself through inspection/research:

- Where is Unreal installed?
- What OpenClaw version is running?
- Which webcam/audio devices exist?
- Is the Gateway healthy?
- Which Monolith release matches the engine?
- Which file contains the relevant handler?

## The mandatory stage gates

Do not move forward until each gate passes.

### Gate A: Agent continuity
The existing agent works through its normal OpenClaw surface and demonstrates the desired identity/style.

### Gate B: Unreal body
The chosen MetaHuman launches in a small game window, idles naturally, does not capture the mouse, and has an approved face.

### Gate C: Desktop shell
Electron launches/positions the avatar and exposes visible Mic / Screen / Camera state without touching the agent's private memory.

### Gate D: Gateway
Electron connects reliably to the intended OpenClaw agent/session over the local Gateway.

### Gate E: Realtime voice
A WebRTC voice session opens, the user can speak and interrupt, and audio output is stable.

### Gate F: Same-person routing
Spoken substantive answers demonstrably come from/through the existing OpenClaw person rather than an independent realtime persona.

### Gate F2: Social-behavior priority
Greetings, gratitude, jokes, personal sharing, and casual shared-media observations retain the intended person's social manner instead of automatically becoming explanation, advice, fact-checking, coaching, or availability speeches. Explicit analysis requests must still receive analysis.

### Gate G: Lip sync
Realtime output audibly and visually drives the MetaHuman face with acceptable latency.

### Gate H: Wake/sleep loop
Wake name opens voice; sign-off closes voice; wake listener re-arms. Repeat several times.

### Gate I: Manual sensors
Manual Screen and Camera buttons work independently and visibly reflect physical state.

### Gate J: Spoken sensors
Natural spoken requests toggle the correct local sensor without going through a general agent/tool path.

### Gate K: Actual vision
The AI answers objective questions that require the current screen/webcam image.

### Gate L: Smart observation
Ongoing screen awareness notices meaningful change without narrating routine motion.

### Gate M: Proactive presence
The system can choose silence, respects quiet/cooldown/interruption rules, and never treats ordinary inactivity as distress.

### Gate N: Mannerisms
Only now add one reversible gesture or expression at a time. Before custom head-bone experiments, read `docs/09b-metahuman-head-control.md`; before wiring facial emotion into conversation, read `docs/09c-metahuman-expression-calibration.md`; before modifying MetaHuman body bones for a shrug, read `docs/09d-metahuman-shoulder-shrug.md`. These chapters record live-proven control paths and failed routes that should not be blindly repeated.

## Implementation architecture to preserve

```text
existing person (OpenClaw agent)
        ↑ substantive consults / memory / tools
OpenClaw Gateway on loopback
        ↑ broker + policy
Electron desktop shell ↔ OpenAI Realtime WebRTC
        ↓ local sensor frames
        ↓ decoded audio / control messages
Unreal MetaHuman runtime
```

Use separate OpenClaw session keys for the main desktop conversation, proactive decision-making, and screen-observer summaries when possible. Internal observation prompts should not become ordinary conversation history.

## First machine-inventory report

Before you edit anything, give the human a concise report containing:

```text
OS:
GPU / VRAM:
Unreal version + install path:
MetaHuman plugins present:
Monolith present/version:
OpenClaw version:
Gateway health/address:
Existing agent/session to embody:
Node/npm:
Python:
Microphone(s):
Speaker/output path:
Webcam(s):
Existing loopback/virtual audio device:
Candidate project directories:
Anything that blocks Gate A or Gate B:
```

Do not include secret values in that report.

## Build philosophy

When something fails, prefer the smallest explanatory hypothesis.

If the Screen button turns on but the AI cannot describe the screen, the toggle is probably not the broken layer. If Electron can capture a JPEG but spoken “look at the screen” fails, do not rewrite `desktopCapturer`. If the realtime provider returns an exact schema error, fix the event schema before changing OpenClaw. If a MetaHuman head control rotates in the wrong direction, measure the actual rig instead of changing the AI personality.

This project became tractable once every subsystem was treated as a boundary with a test.

## Completion definition

The project is ready for daily use when the human can, without touching code:

1. say the person's name,
2. get a short natural acknowledgment,
3. have a normal same-person conversation,
4. ask the person to look at the screen and receive a visually grounded answer,
5. ask the person to look through the webcam and receive a visually grounded answer,
6. turn those sensors back off,
7. say the agreed sign-off and see voice close,
8. later wake the person again,
9. occasionally receive a context-appropriate unsolicited remark without feeling monitored or nagged,
10. see a stable MetaHuman whose facial behavior helps rather than distracts.

Once those are true, mannerism work is refinement rather than rescue.