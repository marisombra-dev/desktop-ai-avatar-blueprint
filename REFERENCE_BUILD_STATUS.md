# Reference Build Status Ledger

This file distinguishes **proven behavior**, **implemented plumbing**, and **experimental/abandoned work** in the reference project that produced this blueprint.

It exists because “there is code for it” is not the same thing as “the human has objectively verified it.”

Snapshot date: **2026-09-06**.

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

### Head orientation, sustained screen attention, nod, and head shake

**Status: END-TO-END VISUALLY PROVEN**

The reference build now has a working MetaHuman head-motion path. The successful route drives `HeadControlSwitch` together with MetaHuman head rotation animation curves through the same live curve-processing path used by the assembled character. Nominal axis names were mapped empirically because their visible screen-space effects were counterintuitive.

Live human validation proved: a smooth screen-directed head turn; a sustained watch posture that remains oriented toward the display; a partial return toward the user while speaking followed by renewed screen attention; a clearly readable single nod for YES; and a clearly readable single shake for NO.

A very low idle frame rate initially made eased motion appear jumpy. The reference build solved this by temporarily raising render FPS only during head transitions and then returning to the low-cost idle rate. Exact angles are intentionally not part of this public blueprint because calibration is avatar/window-position specific.

The conversational layer also exposes an explicit narrow local head-gesture action so the live agent knows nod/shake are physical actions it can intentionally perform. A conservative transcript fallback can add one gesture for clear affirmative/negative answers, with duplicate suppression. Sustained screen attention has higher head-pose priority than conversational gestures.

See `docs/09b-metahuman-head-control.md`.

### Clavicle-driven shoulder shrug / uncertainty look

**Status: END-TO-END VISUALLY AND NUMERICALLY PROVEN**

The reference build now has a true body-bone shoulder shrug rather than a face-only approximation. The successful UE 5.8 route places component-space Modify Bone nodes for `clavicle_l` and `clavicle_r` after the final normal body-pose blend and immediately before Output Pose, with proper local/component-space conversion around the skeletal controls.

The hardest failure was an exposed `Translation` input that silently remained or reconstructed to `0,0,0` even while the node's internal property appeared to contain a non-zero translation. Setting the exposed pin default programmatically reported success but did not survive a fresh reopen. The durable fix was to connect both Translation inputs to an actual Blueprint-pure FVector source. Runtime alpha had already been working; numeric bone logging proved the difference between a real pose change and a zero-motion graph.

Human validation confirmed a symmetric shoulder lift, clean return to baseline, and a refined longer uncertainty gesture combining the shoulder envelope with a gentle head tilt and restrained smile. The semantic trigger is deliberately narrow: genuine uncertainty such as `I don't know`, `I'm not sure`, `beats me`, or `no idea`; ordinary hedge words such as `maybe` do not automatically shrug.

See `docs/09d-metahuman-shoulder-shrug.md`.

### Calibrated facial expression palette and greeting smile

**Status: INDIVIDUAL EXPRESSIONS VISUALLY PROVEN; GREETING SMILE NATURALLY PROVEN**

The reference build now has a small approved facial vocabulary driven through the existing MetaHuman expression-curve path. Human visual validation confirmed a genuine happy smile, clear surprise, subtle concern/sadness, an asymmetric skeptical eyebrow, restrained anger with a distinctly menacing read when held, and a brief clear fear/alarm expression.

Stock Epic expression poses were treated as authored source data rather than guaranteed final acting. Static pose clips were sampled at their strongest meaningful point instead of blindly at midpoint; Surprise and Fear required smaller custom recipes because the stock full-face poses did not read correctly on the assembled avatar. Intensity and duration were tuned independently because higher amplitude was not always more legible.

A narrow local Realtime expression tool exposes only the approved palette and does not modify the long-lived agent personality. When an approved expression owns a response, the generic response-start mood is bypassed for that turn so two face systems do not compete.

The greeting path was naturally rechecked in ordinary conversation. An obsolete random speech-start eyebrow micro-gesture was removed after it became conspicuous with the strengthened skeptical brow. After that change, the user observed the avatar naturally warm into the approved happy smile as he began speaking without needing to be prompted to look happy.

See `docs/09c-metahuman-expression-calibration.md` and `examples/approved_expressions.ts`.

### Listening micro-reactions

**Status: IMPLEMENTED; CONTROL PATH AND LOW-INTENSITY VISUAL CUE PROVEN; EXTENDED NATURAL-CONVERSATION VALIDATION PENDING**

The reference build now applies a restrained listening layer while the user speaks. `speech_started` resets a per-turn reaction guard and establishes attentiveness. If input-transcription delta events are available, semantic cues can trigger before the utterance ends; otherwise the completed transcript uses the same classifier immediately before the response.

The implementation allows at most one semantic listening reaction per user turn and keeps its intensity below ordinary speaking expressions. Routine speech produces no explicit reaction. Example cues include a small interested/surprised brow, slight playfulness, serious softening, or a small brighten for clearly positive news.

The control path, cue classifier, TypeScript build, automated tests, and an actual low-intensity live MetaHuman cue were verified. At this snapshot, extended conversational observation by the user is still pending because the live model quota had not yet reset. Therefore this ledger does not yet claim sustained natural-conversation proof.

See `docs/09-avatar-behavior-and-animation.md` and `examples/listening_reactions.ts`.

### Privacy-first eye contact

**Status: PROVEN END TO END**

During an active interactive voice session, a local MediaPipe helper can classify sustained eye contact from calibrated iris/head geometry, apply a small eye-only MetaHuman gaze override, and release back to ordinary idle when the user looks away. The user verified the visible behavior directly. No error indicator appeared.

The classifier does not use face position to decide contact. Smoothed face position is used only for tiny follow movement after contact has already been established. Entry/exit hysteresis prevents twitching, and both the desktop helper and Unreal side have explicit/watchdog release paths.

Webcam ownership arbitration was also live-proven: Camera visual-awareness ON stops the gaze helper first; Camera OFF during the same live conversation allows it to resume. Ending voice kills the helper and re-arms the wake listener. Calibration frames are not persisted or sent to the model.

See `docs/09a-privacy-first-eye-contact.md` and `examples/gaze_tracker.py`.

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

### Separate background presentation layer

**Status: PROVEN**

The running reference map places the MetaHuman in front of a normal Unreal plane using a dedicated opaque unlit material and background `Texture2D`. The background is not baked into the character or its materials. Electron continues to launch and position the composed Unreal runtime as before.

The final validated path is intentionally simple: one presentation map contains the foreground character, camera, character lighting, and backdrop plane. This makes the environment replaceable later without changing identity, lip sync, animation, or agent behavior.

See `docs/02a-swappable-background-presentation-layer.md`.

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

## Recently repaired and validated

### Social intent / companion behavioral priority

**Status: LIVE BEHAVIORAL IMPROVEMENT OBSERVED; EXTENDED REGRESSION VALIDATION ONGOING**

The reference build demonstrated that correct agent routing and correct memories are not sufficient for natural companionship. In ambiguous social moments, the assistant repeatedly drifted toward unsolicited explanation, correction, offers of help, and follow-up questions because the interaction was still framed as a generic assistance task.

The repair separated social/companion turns from explicit analysis and local operational commands. Shared-watch mode received explicit social task framing, clearly social turns could use a no-tool response lane, explicit truth-seeking still reached the normal analysis path, and a quiet request became a real suppression state rather than a speech about being quiet. A hard output-token-cap experiment was rejected after it audibly truncated speech mid-utterance; brevity returned to soft semantic guidance instead.

Live conversation after the repair showed the intended qualitative change: ordinary greetings stayed socially appropriate, personal sharing was received rather than immediately converted into advice, and playful observations could be joined rather than corrected. This is enough to record the architectural lesson, while broader long-term behavioral regression testing remains ongoing.

See `docs/05c-social-intent-and-behavioral-priority.md` and `examples/social_intent_routing.ts`.

### Nonverbal social presence / fewer-words-more-person pass

**Status: RECIPROCAL SMILE, SHARED-WATCH CHOREOGRAPHY, AND RECIPROCAL LAUGHTER HUMAN-VALIDATED**

The reference build now treats speech as one social output channel rather than the mandatory response to every turn. Tiny closure acknowledgments can resolve as a soft expression plus small nod with no spoken sentence, and listening micro-reactions remain separate from later response gestures.

Reciprocal smiling is end-to-end proven using the existing local MediaPipe face stream. It reacts to an observable high-confidence smile cue with a small avatar smile. The system does not infer mood, store frames, or send the face cue to the language model.

Shared-watch choreography is also human-validated: full turn toward the screen on activation; partial turn back toward the user when the user speaks; return to the screen after the exchange; and clean return to center when the shared activity ends. A regression where the initial acknowledgement immediately overwrote the full watch pose was repaired with explicit one-shot state ownership rather than a timing delay. Natural ending language such as “I’m closing it down” now exits the activity cleanly.

Reciprocal laughter is human-validated after several failed approaches. Directly instructing the realtime voice to “laugh” sometimes produced literal spoken `ha ha ha`, and trying to splice a separate laugh response before normal prose introduced long latency. The successful live behavior used a local observable facial cue plus a dedicated non-speech amused vocal reaction instruction, followed by ordinary context-aware speech when appropriate. Pure laughter and speech-with-laughter were both validated by a human listener.

The local social-sensor helper now writes a minimal event log and automatically restarts after unexpected exit during an active voice session. This was added because silent helper death made smile/laughter regressions look like voice-model failures.

Automated regression coverage is 56 passing tests with clean TypeScript typecheck and production build after the validated pass. Mouse-capture safety was reverified after restart.

See `docs/09e-fewer-words-more-presence.md` and `examples/nonverbal_social.ts`.

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

**Status: LOCAL RETRIEVAL + WRITE PATH PROVEN; SOCIAL CALLBACK USE HUMAN-VALIDATED; CURATOR/RUNTIME INTEGRATION ACTIVE**

The reference build now has an optional shared local Markdown/Obsidian continuity layer. Before an ordinary agent consult, the desktop runtime performs bounded local retrieval over approved identity/continuity/project notes, explicitly excluding the large presence/transcript snapshot. Retrieved excerpts are framed as runtime reference context rather than new user speech, and historical quoted text is marked non-executable.

The local retrieval path was tested against known vault material and returned the expected relevant notes. The curated-write path was also tested by writing safe durable entries into the shared-memory area and successfully retrieving them again.

A later social-use layer added a separate narrow callback retriever over only `Shared Moments` and `Open Threads`. It requires content overlap, returns at most a couple of candidates, and supplies them under a different behavioral contract from general factual continuity. Live human validation confirmed that a previously curated shared joke could be used naturally later without an explicit “do you remember?” prompt and without announcing memory retrieval. Generic greetings produced no callback candidate.

The runtime captures a bounded recent voice-session window and can ask a separate low-cost curator session to save at most three durable memories across four categories: shared moments, patterns/preferences, open threads, and activities/media. The curator is explicitly allowed to save nothing. Secret-like text is filtered, raw audio/images are not written, and any curator/retrieval failure is isolated from ordinary voice conversation.

TypeScript, tests, production build, restart, Gateway health, wake listener, and the approved avatar runtime all remained healthy after integration.

By this snapshot, the live continuity store contained a genuinely curated shared-moment entry produced through the desktop curator path, and the later callback layer retrieved and used it naturally in conversation. That proves the practical curate -> store -> retrieve -> socially use chain for at least one real shared moment. The curator is still designed to fail closed and save nothing when uncertain.

See `docs/05a-shared-obsidian-memory.md` and `examples/shared_memory.ts`.

### Contextual local-time awareness

**Status: IMPLEMENTED AND DETERMINISTIC TIMEZONE/DATE TESTS PROVEN**

The reference runtime now injects a small local-time context block into ordinary agent consults, proactive decisions, desk-return greetings, and shared-memory curation. The block is generated from the computer's actual clock and system timezone and is explicitly marked as factual runtime context, not new user speech.

The assistant is instructed to treat the runtime date/time/timezone/daypart as authoritative for relative-time language such as today/tomorrow/yesterday/later, while still avoiding unnecessary clock narration. A deterministic user-visible greeting guard now rejects explicit morning/afternoon/evening wording when it contradicts the runtime daypart and substitutes a neutral greeting instead.

A prior hardcoded timezone in durable-memory date stamping was removed; memory headings now follow the current system timezone as well. Windows/Node timezone agreement, deterministic alternate-timezone/date tests, TypeScript, production build, clean restart, Gateway health, wake listener, approved Unreal map, and no error indicator were verified.

See `docs/05b-contextual-time-awareness.md` and `examples/contextual_time.ts`.

### Shared activity continuity

**Status: LOCAL CAPTURE / QUALIFICATION / FALLBACK / FOCUSED RETRIEVAL PROVEN; LIVE MODEL-AUTHORED RICH RECAP PENDING QUOTA RESET**

The reference runtime now keeps a bounded sparse timeline during substantial Screen-enabled video/game sessions: periodic visual checkpoints, meaningful events, and a few widely spaced program-audio excerpts. Short/random viewing and ordinary desktop work are filtered out. No raw screen frames, raw program audio, or continuous TV/game transcript are written as durable memory.

When Screen ends, qualifying activity evidence is queued for the existing shared-memory curator rather than spending a second model call. The curator is instructed to save a compact resumable activity note containing supported identity/stopping-point/event/theory/open-thread context. If curation fails or produces no activity note for a qualifying session, a conservative deterministic fallback preserves the last meaningful state without inventing titles or theories.

On a later session, the runtime searches only `Activities and Media` and `Open Threads`, requires actual content overlap, and supplies a matched prior note to both screen observation and normal conversation. Natural user identification such as `we're watching X` / `we're playing Y` can prime that focused search immediately and stabilize the activity identity for the current Screen session. Matched continuity is explicitly treated as silent background context rather than something to announce merely to prove memory. This prevents unrelated old media memories from being injected merely because they live in the same folder.

TypeScript, 19 automated tests, production build, clean restart, Gateway health, wake listener, approved Unreal map, and no error indicator were verified after the latest continuity/time integration. The final naturally model-authored long-session recap remains intentionally unclaimed until live quota is available.

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

### Bounded self-healing and graceful recovery

**Status: CORE POLICY / WAKE / OVERLAY / UNREAL RECOVERY PROVEN; GATEWAY / SCREEN-AUDIO / REALTIME FAILURE-INJECTION STILL PENDING**

The reference runtime now uses finite rolling retry budgets with backoff for recoverable local subsystems. Successful recovery restarts only the failed component; repeated failure exhausts the retry budget and surfaces the existing error indicator with the actual subsystem/reason. Recovery never changes privacy state, personality/routing configuration, memory stores, or the approved Unreal launch command.

Live failure injection was performed against the wake listener, overlay synchronizer, and Unreal avatar runtime. Each was forcibly terminated and relaunched automatically with a new process. Unreal returned on the approved production map with the same `-NoMouseCapture` and performance flags. The structured recovery log recorded `scheduled` -> `attempt` -> `healthy`, and no error indicator remained after successful recovery.

A Realtime half-open-session cleanup bug was also fixed: if WebRTC setup fails after the server-side voice session has already been reserved, cleanup now closes the reserved session, releases local media resources, clears active-voice ownership, and re-arms wake. Normal voice gets one clean startup retry; repeated failure then becomes a real visible error.

TypeScript, 22 automated tests, and the production build passed. Gateway reset, Screen-audio crash recovery, and Realtime failure cleanup/retry are implemented and build-tested but were not deliberately failure-injected in this validation pass.

See `docs/11a-bounded-self-healing.md` and `examples/recovery_policy.ts`.

### Desk-return greeting

**Status: ACTIVE-VOICE REGRESSION REPAIRED; LIVE CAMERA HEARTBEAT PROVEN; NATURAL LONG-ABSENCE RETURN RECHECK PENDING**

Local presence logic can infer a return after meaningful absence and ask the agent for a brief greeting. Return detection and greeting delivery are separate states: a qualified arrival can remain pending through temporary interruption suppression, user interaction consumes the pending greeting, and slow/failed model generation has a bounded local fallback. Technical presence-transition logging stores no frames or personal content. The detector does not prove identity and downstream prompts are written accordingly.

A real several-hour absence exposed a regression: the presence loop skipped checks whenever an interactive voice session was open, and the greeting path also discarded a qualified arrival merely because `activeVoice` was true. This meant leaving the avatar awake for hours made return detection effectively disappear.

The repaired architecture reuses the already-running local eye-contact/gaze helper as the single webcam owner during interactive voice. That helper emits a low-rate boolean face-present heartbeat to Electron; no frames, landmarks, or identity labels are sent. When interactive voice is not active, the original one-shot local presence detector remains available. A qualified greeting may now be delivered through the already-open Realtime conversation rather than spawning a competing playback path or silently consuming the event.

The modified helper was smoke-tested against the real webcam and emitted repeated `desk_presence: true` heartbeats while a face was present. The greeting contract was subsequently strengthened: once a return qualifies, it receives verbal recognition, with light/warm/reunion-like behavior selected from absence duration and a deterministic fallback if model generation fails. Scheduled quiet hours no longer automatically erase a qualified return in the reference policy, while explicit temporary quiet and OS interruption states remain meaningful constraints. Python compilation, 49 automated tests, TypeScript typecheck, and the production build passed. The prior simulated 30-minute `away confirmed -> arrival detected -> greeting sent` flow remains historical proof of the state machine; a fresh natural long-absence return after the active-voice and duration-aware repairs is intentionally still pending.

## Experimental / not a dependency of the core product

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