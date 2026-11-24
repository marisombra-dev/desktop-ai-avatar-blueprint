# 21 — Capabilities beyond the face: presentation, sensors, computer use, autonomy and migration

Both visual renderers are only the *presentation* layer. This appendix consolidates later design choices that were not universal requirements in the old MetaHuman-first blueprint. Implement optional capabilities behind explicit adapters and human approval. Do not copy private identity files, media or installed machine paths into this public documentation.

## Desktop presentation and scene switching

The reference retains an original 3D/close/optional wide-view presentation alongside a separately selectable photographic close face. The **selected view owns presentation**:

- Choosing photographic close view suspends only the owned Unreal rendering process and routes local LOOK/ATTN/GAZE, facial mood and gaze events to the neural bridge.
- Returning to Original/Wide restores the owned Unreal view and its original gaze/gesture UDP controls.
- The conversation session, microphone, ASR, TTS, continuity, tool permissions, touch server and phone session stay alive during a view change.
- Do not suspend/kill an unrelated Unreal process; use a session/owner record and watchdog. Never start competing local face services.
- Wide View is an optional 3D scene with video-backed transitions, full-body behaviors, mouse input/interactive regions, an environment and return-to-close choreography. Do not imply that the 2D portrait is itself a whole-body 3D rig.
- When a scene changes, preserve screen/camera privacy state and restore only the explicit sensors that remain authorized.

See docs/02a–02f, 09f and docs/16 for renderer-specific code paths.

## Local sensors and “actually seeing”

- Manual Screen or Camera ON is a **permission state**; a model can only describe what is actually captured and delivered after the user permits it.
- Separate a camera lease for **presence/gaze tracking** from the explicit Camera permission for **sending camera imagery into model vision**. Phone mode may own face/gaze sensing without allowing a model to view raw webcam pictures.
- Screen ON and “look now” should send a current actual image, not just text saying “screen enabled.” Keep view/source attribution and invalidate frames when the source changes or permission closes.
- Spoken Screen ON/OFF/LOOK is an explicit narrow local command, not a general desktop tool action.
- Watch-along can include loopback program audio, bounded transcription and context-aware comments; it must not leak unrestricted system audio into historical memory.
- Desktop presence should require independent camera evidence and a sustained absence condition when enabled. A microphone transcript or silent desktop is not proof of presence or absence.
- Eye contact and reciprocal smiles require fresh opt-in camera data, explicit owner and short-lived cues. Concern can override a reflexive smile.
- Screen focus and camera gaze must arbitrate head/eye ownership. Gaze state is a visual behavior, not proof that the agent has actually inspected that screen.
- Optional hand tracking must arbitrate camera ownership among gesture tracking, eye contact and explicit Camera vision. A spatial airboard remains an input peripheral, not a second autonomous assistant.

Read docs/07, 07a, 07b, 08, 09a, 10a–10i for the original sensor/visual experiments; verify each feature in the chosen renderer separately.

## Behavior and presence

- Wake word and local sign-off are separate from OS sleep. Wake recognizer releases the microphone before speech conversation acquires it. Sleep/sign-off clears voice and re-arms local wake recognition without erasing long-term session.
- Face expressions, short laughs, nods, glances and a quiet “NO_MESSAGE” path reduce repetitive spoken filler.
- A desk-return greeting requires real absence/return evidence and cooldown, not guessing emotional states from inactivity.
- Proactive speech is non-obligatory, with quiet hours, interruption ownership, evidence thresholds and duplicate suppression.
- Shared activities (radio, TV, reading/screen watching) should have explicit states that survive tool calls or transient silence, without endlessly narrating content.
- A request to focus or be quiet should mute *proactive commentary* without implicitly ending the entire conversation or changing sensor permissions.
- Gestures may be triggered by model reply meaning, a local direct command or trusted sensor event. Do not let the face fabricate tool success or role-play hardware actions that have not occurred.

## Safe computer-use tools and tasks

Tools are beneath the chosen agent's existing permissions:

~~~text
main conversation agent
   ↓ explicit intent / authorization
verified deterministic browser, file, window controls
   ↓ fallback only where appropriate
bounded Windows UI Automation worker (hands, not second brain)
   ↓ execution claim and independently verified postcondition
durable task ledger
~~~

Treat target discovery, target ownership, execution and verification as distinct boundaries. Prefer reliable browser/window/file APIs first; use generalized UI automation for unsupported apps only with strict target selection. Ambiguous/destructive operations fail closed. A command must not be retried after an uncertain state-changing effect until the postcondition is checked.

Scheduled work requires a durable record and clearly chosen worker model, not an assumption that the currently chatting hosted model remains available forever. If a selected model becomes unavailable, either wait/queue with clear status or use an explicitly authorized fallback, preserving instructions, permission limits and identity. Consult docs/11a–11e.

## Multi-surface conversation continuity

An agent may speak in the main OpenCode app, on desktop voice and eventually on a phone companion. These are different interfaces, not automatic access to one shared transcript.

Implement a cross-surface bridge that captures **confirmed** recent messages and metadata for each authorized surface. Separate long-term curated memory, raw historical archive and recent working context; deduplicate by stable message IDs. Transfer bounded conversation edges into a new model session on migration and keep the original archive intact. Test actual cross-surface recall instead of claiming “connected to Obsidian” proves it.

A phone touch dashboard and a phone talking-portrait preview are NOT full mobile conversation clients until live audio capture/playback, turn ownership, cancellation, session continuity and transport security are validated.

## Optional local-first future

Keep the agent backend, local ASR, TTS and visual renderer individually replaceable. Fully local model options can reduce network reliance but may increase first-token delay, VRAM use or hallucination. Evaluate actual conversational consistency, available context window, tools and speech behavior before switching. A neural renderer is not itself an LLM and should not be described as the agent brain.

For hardware upgrades, measure GPU VRAM, memory contention, model inference tokens/s, face motion deadlines, cold model load and realtime audio. Keep each benchmark comparable to an approved quality/voice baseline.

## Practical migration sequence

1. Freeze known-good current app and private backups, including selected portrait, agent session mappings, TTS config and face service calibration.
2. Choose Path A or B and write a capability matrix against docs/20. Do not install both paths merely because the original README mentioned Unreal.
3. Decouple conversation, voice, renderer, haptics and sensor services into narrow contracts.
4. Migrate the agent/model behind the same conversation adapter; prove history, identity, tool permissions and speech before changing the renderer.
5. Migrate the renderer behind the same audio/visual contract; prove expression, screen/camera ownership and lip sync without touching model behavior.
6. Restore optional mobile touch and other peripherals; prove verified delivery, opt-out and disconnect.
7. Test full cold reboot, absence/return, cancellation, privacy off, long context and provider outage. Log what is human verified vs native tested.
8. Treat unresolved latency or incomplete phone capability as remaining work; don't relabel because a new dependency was installed.

## Shared independent development

The [shared initiative and developmental architecture](22-shared-initiative-and-development.md) extends optional proactivity into durable goals, curiosity, bounded public research, self-observation, learning, skills, projects, isolated experiments, reflective memory and model comparisons. It is not a new visual route and cannot bypass existing desktop tool permissions. The [private mobile inbox](26-attention-environment-and-cross-device.md) is a distinct optional polling channel, not live mobile speech or haptics. Follow [the development build gates](28-development-build-and-acceptance.md) and retain original memory during model changes.
