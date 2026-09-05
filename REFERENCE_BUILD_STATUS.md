# Reference Build Status Ledger

This file distinguishes **proven behavior**, **implemented plumbing**, and **experimental/abandoned work** in the reference project that produced this blueprint.

It exists because “there is code for it” is not the same thing as “the human has objectively verified it.”

Snapshot date: **2026-09-05**.

## Proven in repeated live use

### Existing-person continuity

**Status: PROVEN**

The desktop voice is not treated as a separate generic persona. Ordinary substantive voice conversation is routed through the existing long-lived OpenClaw agent using the agent-consult architecture. Increasing reasoning effort improved quality, but continuity depends primarily on routing to the same agent rather than on a particular reasoning setting.

### Realtime voice

**Status: PROVEN**

- WebRTC live voice works.
- User interruption works naturally.
- Chosen realtime voice works in normal conversation.
- Transcript persistence into the desktop OpenClaw session works.
- Wake greeting can be constrained to a deliberately short acknowledgement.

### Lip sync

**Status: PROVEN**

Realtime output drives the MetaHuman speech animation with very good visible synchronization.

The reference project ultimately added a direct local PCM bridge to MetaHuman audio Live Link. A sanitized version is included under `examples/unreal/DesktopAvatarAudioBridge/`.

### Listening micro-reactions

**Status: IMPLEMENTED; CONTROL PATH AND LOW-INTENSITY VISUAL CUE PROVEN; EXTENDED NATURAL-CONVERSATION VALIDATION PENDING**

The reference build now applies a restrained listening layer while the user speaks. `speech_started` resets a per-turn reaction guard and establishes attentiveness. If input-transcription delta events are available, semantic cues can trigger before the utterance ends; otherwise the completed transcript uses the same classifier immediately before the response.

The implementation allows at most one semantic listening reaction per user turn and keeps its intensity below ordinary speaking expressions. Routine speech produces no explicit reaction. Example cues include a small interested/surprised brow, slight playfulness, serious softening, or a small brighten for clearly positive news.

The control path, cue classifier, TypeScript build, automated tests, and an actual low-intensity live MetaHuman cue were verified. At this snapshot, extended conversational observation by the user is still pending because the live model quota had not yet reset. Therefore this ledger does not yet claim sustained natural-conversation proof.

See `docs/09-avatar-behavior-and-animation.md` and `examples/listening_reactions.ts`.

### Local sleep/sign-off

**Status: PROVEN**

A conversational sign-off such as “Thanks, <name>” ends the desktop realtime conversation locally and re-arms wake listening.

This was specifically moved out of general agent/OS command interpretation after an earlier semantic collision with computer sleep behavior.

### Wake lifecycle

**Status: PROVEN**

The final local faster-whisper wake listener:

- listens only while realtime voice is asleep,
- recognizes the canonical name/wake shape,
- exits after one valid wake so the microphone is released,
- allows the realtime call to own the mic,
- is re-armed when realtime closes.

Wake tuning is considered stable enough that it should not be casually retuned when debugging unrelated systems.

### Desktop shell behavior

**Status: PROVEN**

- small always-on-top companion window,
- draggable/resizable placement,
- Mic / Screen / Camera controls,
- mouse remains usable rather than being captured by Unreal,
- tray/minimize/restore behavior,
- exact UI error state can be surfaced rather than hidden.

### Manual screen capture / awareness state

**Status: PROVEN**

Electron's `desktopCapturer` can capture the actual Windows primary display. An independent smoke test wrote a valid non-empty JPEG, proving that the operating-system/Electron capture layer works.

Manual Screen state can be turned on during a live voice session without the provider error that previously blocked local Realtime tool installation.

### Screen watcher architecture

**Status: IMPLEMENTED AND FUNCTIONALLY PROVEN AS A SUBSYSTEM**

The reference watcher performs local sampling/change detection, throttles model analyses, maintains rolling summaries, and gates optional comments by salience/cooldown.

The watcher is best-effort and is intentionally unable to break ordinary voice chat when a sample/analysis fails.

### Screen-linked system audio / watch-along

**Status: END-TO-END PROVEN**

The reference build now ties Windows system-audio capture to Screen privacy state. When Screen is ON, Electron grants a Windows display-media loopback stream, the renderer converts the audio track to bounded PCM, and a local `faster-whisper` helper produces short program-audio transcripts. Those transcripts are labeled as program audio rather than user speech and can be supplied to both live Realtime context and the screen-observer session.

The live proof used an unusual synthetic sentence played through Windows output. The local helper captured the sentence through loopback, demonstrating that the path was receiving computer output rather than depending on room-microphone pickup.

Lifecycle was also verified: Screen OFF stops the program-audio helper, and ending the live voice session re-arms the wake listener. The implementation includes a self-voice guard so the assistant's own speaker output is not re-transcribed as program dialogue. Raw program audio is not retained as a permanent recording.

**Sustained real-world validation:** The feature was subsequently used through an entire mystery/unsolved-case television program. During and after the program, the assistant could discuss clues introduced in the show, compare interpretations, and reason about the chronology of events. This is stronger evidence than the synthetic loopback smoke test because it demonstrates useful continuity across a full-length program rather than isolated transcription.

### Camera privacy/lifecycle plumbing

**Status: PROVEN AS A LOCAL SENSOR PIPELINE**

The webcam path is OFF by default, opens only when requested, captures bounded JPEG stills, stops tracks when turned off, and can coexist with screen awareness.

## Recently repaired and now end-to-end proven

### Spoken “look at the screen” after the Realtime schema repair

**Status: END-TO-END PROVEN**

The reference build discovered that its restored local Realtime tool installer was sending:

```text
session.update
  session.tools = ...
```

without the current required session type.

Exact provider error:

```text
Missing required parameter: 'session.type'.
```

The fix was to preserve/use the created session type or fall back to:

```text
type: "realtime"
```

After that repair, the spoken flow was verified live:

```text
wake name
“Can you look at the screen?”
```

The Screen control enabled locally, fresh screen images were injected, and the answer demonstrated actual current-screen understanding. A clone should still rerun the same objective test because provider event ordering and image-input schemas are version-sensitive.

### Spoken camera command

**Status: END-TO-END PROVEN**

The deterministic local command path and Realtime local tool path both support camera ON/OFF and fresh image injection. Live validation included an objective camera question whose answer required seeing the current webcam frame. Re-run an objective camera test after any change to the shared local-tool/session machinery.

## Implemented but intentionally conservative

### Shared Markdown / Obsidian continuity

**Status: LOCAL RETRIEVAL + WRITE PATH PROVEN; DESKTOP RUNTIME INTEGRATION IMPLEMENTED; FINAL LIVE CURATOR MODEL SMOKE TEST PENDING**

The reference build now has an optional shared local Markdown/Obsidian continuity layer. Before an ordinary agent consult, the desktop runtime performs bounded local retrieval over approved identity/continuity/project notes, explicitly excluding the large presence/transcript snapshot. Retrieved excerpts are framed as runtime reference context rather than new user speech, and historical quoted text is marked non-executable.

The local retrieval path was tested against known vault material and returned the expected relevant notes. The curated-write path was also tested by writing safe durable entries into the shared-memory area and successfully retrieving them again.

The runtime captures a bounded recent voice-session window and can ask a separate low-cost curator session to save at most three durable memories across four categories: shared moments, patterns/preferences, open threads, and activities/media. The curator is explicitly allowed to save nothing. Secret-like text is filtered, raw audio/images are not written, and any curator/retrieval failure is isolated from ordinary voice conversation.

TypeScript, tests, production build, restart, Gateway health, wake listener, and the approved avatar runtime all remained healthy after integration.

The last model-side curator smoke test at this snapshot was blocked by an external model-usage quota before the curator could answer. Therefore this ledger does **not** yet claim end-to-end proof of automatic model curation. Local retrieval, local writes, and runtime wiring are proven/implemented as described.

See `docs/05a-shared-obsidian-memory.md` and `examples/shared_memory.ts`.

### Shared activity continuity

**Status: LOCAL CAPTURE / QUALIFICATION / FALLBACK / FOCUSED RETRIEVAL PROVEN; LIVE MODEL-AUTHORED RICH RECAP PENDING QUOTA RESET**

The reference runtime now keeps a bounded sparse timeline during substantial Screen-enabled video/game sessions: periodic visual checkpoints, meaningful events, and a few widely spaced program-audio excerpts. Short/random viewing and ordinary desktop work are filtered out. No raw screen frames, raw program audio, or continuous TV/game transcript are written as durable memory.

When Screen ends, qualifying activity evidence is queued for the existing shared-memory curator rather than spending a second model call. The curator is instructed to save a compact resumable activity note containing supported identity/stopping-point/event/theory/open-thread context. If curation fails or produces no activity note for a qualifying session, a conservative deterministic fallback preserves the last meaningful state without inventing titles or theories.

On a later session, the runtime searches only `Activities and Media` and `Open Threads`, requires actual content overlap, and supplies a matched prior note to both screen observation and normal conversation. This prevents unrelated old media memories from being injected merely because they live in the same folder.

TypeScript, 15 automated tests, production build, clean restart, Gateway health, wake listener, approved Unreal map, and no error indicator were verified after integration. The final naturally model-authored long-session recap remains intentionally unclaimed until live quota is available.

See `docs/07b-shared-activity-continuity.md` and `examples/activity_continuity.ts`.

### Proactive outreach

**Status: CONTEXT-AWARE DECISION LAYER IMPLEMENTED; MECHANICS/FAIL-CLOSED PARSING PROVEN; LIVE MODEL JUDGMENT PENDING QUOTA RESET**

The runtime has:

- silence threshold,
- long spoken cooldown,
- reconsider interval,
- quiet hours and temporary spoken quiet requests,
- system-idle and lock/active-call suppression,
- cancellation if the user interacts while the model is deciding,
- current activity / meaningful screen-event context,
- recent program-dialogue context when available,
- recently ended shared-activity context,
- unfinished-thread and repeated-friction signals,
- relevant shared Obsidian continuity,
- a structured `speak/confidence/kind/message` decision with a high confidence floor,
- fail-closed behavior for malformed, vague, low-confidence, or unavailable model output.

Silence itself is not evidence. Durable memory can enrich a concrete reason to speak but cannot create one by itself. The decision prompt explicitly asks whether speaking **now** would improve the moment and applies stricter interruption manners during video and focused desktop work.

TypeScript, automated decision-parser tests, production build, restart, Gateway health, wake listener, and the normal avatar runtime were verified after this change. At this snapshot, the user's live model quota had not yet reset, so a real model-authored context-aware proactive utterance is intentionally not claimed as end-to-end proven yet.

### Desk-return greeting

**Status: IMPLEMENTED AS OPTIONAL BEHAVIOR**

Local presence logic can infer a return after meaningful absence and ask the agent for a brief greeting. The detector does not prove identity and downstream prompts are written accordingly.

## Experimental / not a dependency of the core product

### Physical avatar head-turn toward the screen

**Status: ABANDONED FOR NOW**

The reference project experimented with face/body head rotation controls to make the avatar visibly look toward the user's display.

Observed controls behaved counterintuitively or had little visible effect in the assembled rig. Examples included nominal yaw/pitch controls producing unexpected screen-space movement.

The experiment was intentionally stopped because actual screen perception does not depend on the cosmetic head turn.

Do not revive this while debugging screen vision.

### Nod / head shake gesture mapping

**Status: PARTIALLY IMPLEMENTED / NOT YET A CORE PROOF GATE**

Semantic detection and local control messages exist, but final physical gesture mapping should be individually verified on the actual target MetaHuman before being considered complete.

### Hand gestures such as chin touch / hair pass

**Status: FUTURE REFINEMENT**

These belong after the capability stack is stable.

## Known cosmetic issue deliberately deprioritized

### Occasional collar/clothing artifact during idle

**Status: MINOR / ACCEPTED FOR NOW**

The reference MetaHuman occasionally showed a small collar disappearance/flicker during some idle/head positions. It was judged less important than destabilizing an otherwise strong character/voice stack.

A new build should fix its own asset if easy, but should not treat a tiny cosmetic edge case as a reason to rewrite the animation system.

## The rule for anyone cloning this project

Do not inherit the status labels blindly.

Use this ledger to understand what the reference project proved, then establish your own proof ledger on the target machine.

For every capability, record one of:

```text
NOT STARTED
IMPLEMENTED, UNTESTED
SUBSYSTEM PROVEN
END-TO-END PROVEN
REGRESSION
DELIBERATELY DEFERRED
```

That one discipline prevents an AI from repeatedly rebuilding things that were already working.