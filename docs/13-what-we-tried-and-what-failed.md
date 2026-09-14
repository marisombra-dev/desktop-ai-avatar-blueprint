# 13 — What We Tried, What Failed, and What It Taught Us

This chapter is here because a build guide containing only the successful final architecture can make the project look much easier than it was. These failures explain why the recommended sequence and boundaries exist.

## 1. Generic face first, mannerisms first

### What happened

Early animation work was performed on a relatively generic face before the final visual identity was settled.

### Why it was inefficient

Mouth corners, cheek raises, eye squint, and smile intensity read differently on different facial geometry. Tuning them before the face was approved risked throwing away the work.

### Lesson

Approve the person first. Then tune expressions on that exact face.

---

## 2. Whole-picture motion instead of embodied motion

### What happened

Some early idle/animation attempts made the entire rendered picture feel like it was swaying rather than the person subtly moving.

### Lesson

Keep camera/root/window transformations separate from skeletal/face idle. Desktop-scale movement must be extremely restrained.

---

## 3. Over-focusing on tiny collar artifacts

### What happened

Certain head/idle positions caused occasional collar disappearance/flicker.

### Tradeoff

Fixing a tiny rare artifact risked destabilizing an otherwise strong face/idle stack.

### Lesson

Prioritize by impact. Document cosmetic edge cases and move on when the capability stack matters more.

---

## 4. MetaHuman head-axis tests produced misleading results

### What happened

Experimental face/body controls produced surprising motion because the assembled `head` bone's local axes did not match semantic yaw/pitch expectations. Several early constant-rotation tests also appeared to do nothing because an exposed Blueprint `Rotation` pin remained `0,0,0` and overrode the node struct value set by script.

### Lesson

Never infer control semantics from names, and never trust a scripted AnimGraph edit until exposed pins are inspected after save/cold reload and runtime bone transforms are measured. The final reference mapping was empirically established as bone-space Pitch = shoulder tilt, Yaw = up/down, Roll = left/right. See `09g-metahuman-neck-head-ownership.md`.

---

## 5. Physical “look at the screen” was a rabbit hole until we found the authority contract

### What happened

Direct bone rotations, face-side targets, body-side head variables, raw directional curves, and skeleton-retarget experiments all looked plausible. None produced a reliable visible screen turn.

The successful route came only after identifying the MetaHuman head-movement processor's curve contract: `HeadControlSwitch` plus the head rotation curves, delivered through a live curve path already proven on the assembled character.

### Lesson

Perception and visual acting are independent, so prove screen vision first. When returning to acting, discover the final rig's actual authority/input contract before inventing another upstream rotation mechanism.

The `HeadControlSwitch`/HeadMovementIK route described in `09b-metahuman-head-control.md` was genuinely successful for the close-view avatar. Full-body Point motion later showed that letting the Face-side HeadMovementIK solver retain structural ownership could stretch the neck. For a unified/full-body avatar, the newer Body-owned solution in `09g-metahuman-neck-head-ownership.md` supersedes that structural route.

---

## 6. Mouse capture regression

### What happened

At one point the mouse became trapped in the avatar window.

### Lesson

A desktop companion's window/input behavior is a primary usability requirement. Use no-mouse-capture runtime flags/input settings and verify after every window/runtime refactor.

---

## 7. Voice that sounded technically good but socially wrong

### What happened

Some voice choices/delivery settings were too enthusiastic, polished, or “game show host” flavored for the intended personality.

### Lesson

Voice should be judged during real multi-turn interaction. Warmth, pace, humor, laughter, and serious tone matter as much as raw audio quality.

---

## 8. Realtime voice felt like a different person

### What happened

A realtime provider can answer quickly and competently from its own prompt/context. That does not guarantee the same humor, salience, memories, or social instincts as the long-lived agent.

### Lesson

Force ordinary realtime dialogue through the existing OpenClaw agent. Keep provider-facing personality instructions thin and focused on delivery.

---

## 9. Wake greeting became a speech

### What happened

A simple “Hi Ethan” could generate a long warm response: greeting, questions, offers to listen, suggestions for what to do, and so on.

### Lesson

A wake acknowledgement is not a normal agent turn. Use a short exact-response path and let the user start the actual conversation.

---

## 10. Wake recognition had to be tuned as an acoustic system

### What happened

Wake detection initially had false negatives/positives and could be affected by recognition bias.

### Lesson

Use a strict phrase shape plus real acoustic quality gates. Log RMS, log probability, no-speech probability, and transcription. Tune from evidence rather than repeatedly changing the wake phrase.

---

## 11. Two microphone owners are a bad idea

### What happened

Wake recognition and live realtime both need the same microphone.

### Lesson

The wake listener should exit after detection and be restarted only after realtime closes. Process lifecycle is the microphone mutex.

---

## 12. “Thanks Ethan” reached the wrong semantic layer

### What happened

Because the desktop realtime path consulted OpenClaw for ordinary speech, a conversational sign-off could reach a general agent/tool interpretation. “Sleep” has an OS meaning too.

### Lesson

End-voice-session is a local lifecycle command. Intercept it before general agent/tool routing.

---

## 13. Local command code existed but was not wired to the event

### What happened

The function for handling local voice commands was present, but completed user transcription did not call it.

### Symptom

The source looked implemented; spoken commands still did nothing.

### Lesson

For event-driven systems, verify the full event-to-handler path. Existence of a handler is not a runtime feature.

---

## 14. Screen/camera tool handlers existed but the tools were not installed

### What happened

Response completion code knew how to handle `desktop_screen_control`, `desktop_camera_control`, and `desktop_sleep`, but the current Realtime session never received those tool definitions.

### Lesson

Inspect `session.created` → tool merge → `session.update` as its own subsystem.

---

## 15. Missing `session.type` produced the mysterious exclamation mark

### What happened

The local-tool installer sent a Realtime session update containing tools but omitted the session type required by the current API.

### Exact error

```text
Missing required parameter: 'session.type'.
```

### Symptom

The avatar UI showed a small `!` error indicator.

### Lesson

Expose exact errors. The final fix was surgical:

```text
session.type = existing type or "realtime"
```

No screen/camera rebuild was needed.

---

## 16. We nearly blamed screen capture for a voice-routing problem

### What happened

Manual screen awareness had already worked, but spoken “look at the screen” failed.

### Lesson

Preserve proof. If manual capture works, start at spoken transcription/routing/tool installation, not the capture implementation.

---

## 17. We proved screen capture independently

### What happened

To separate OS capture from model behavior, a tiny Electron smoke test captured the primary display and wrote a JPEG.

### Lesson

A boundary smoke test can collapse a huge debugging tree. Once a valid JPEG exists, Windows/Electron capture is no longer the leading suspect.

---

## 18. A sensor button turning on was not enough

### What happened

Even after screen/camera state changed, we still needed to prove that the model received pixels.

### Lesson

Use objective tests. The webcam path was accepted after the AI correctly counted fingers held in front of the camera. Screen was accepted after it described actual current display content.

---

## 19. Fresh vision can race an automatic response

### What happened

The realtime provider may begin answering the user's spoken request before local code has turned on the sensor and injected images.

### Lesson

If a response is active, cancel it, wait a short beat, inject fresh images, then create the grounded response.

---

## 20. “Screen is on” is not the same as “I looked”

### What happened

A model can know from a tool result that screen awareness is enabled while still having no visual data.

### Lesson

Immediately send fresh image input after enabling a sensor for an explicit look request.

---

## 21. Stale visual context needs explicit invalidation

### Problem

Models can continue using earlier visual summaries after a sensor is turned off.

### Lesson

On OFF, inject “prior visual context is no longer current” and make physical capture reject requests.

---

## 22. Screen watching cannot be frame-by-frame narration

### Problem

A naive watcher turns a companion into a commentator that never shuts up.

### Lesson

Local change detection + model salience + high comment threshold + cooldown + explicit `NO_COMMENT` is the right shape.

---

## 23. Proactive outreach can become artificial concern

### Problem

If you ask a model “The user has been silent; should you check in?”, the wording implies that silence is a problem.

### Lesson

Tell the model that silence is normal and `NO_MESSAGE` is encouraged. Apply local quiet/cooldown/idle rules before asking it at all.

---

## 24. `response.done` can precede audible playback completion

### What happened

Short-lived proactive speech could be clipped if the voice session closed the instant the provider finished producing audio.

### Lesson

Separate provider-generation completion from speaker playback completion. Allow an audio drain or observe media state.

---

## 25. Gateway state was not the problem just because startup was broken

### What happened

The Gateway worked under manual launch but had Windows scheduled-task/startup problems.

### Risk

A tempting but destructive debugging move is to reset/delete state.

### Lesson

Manual success strongly points toward launcher/process environment. Validate database integrity before touching state, and never delete it as a reflex.

---

## 26. Old log errors can masquerade as current failures

### What happened

Long development logs contained historical errors from previous iterations.

### Lesson

Reproduce the current failure and inspect timestamped tail output. Do not grep a giant log and assume the first matching error is current.

---

## 27. Animation and capability debugging should not be interleaved

### What happened

When both were in motion, it was easy to wonder whether a face change, Unreal restart, voice restart, or routing change caused a new symptom.

### Lesson

Freeze working layers. Once wake/screen/camera are proven, do not retune them while working on MetaHuman nods.

---

## 28. Two head-control paths can create a convincing false diagnosis

### What happened

A legacy bone-modification route and the new MetaHuman curve route were briefly active together. The combined motion was dramatic but wrong, making it appear that the new axis mapping itself was broken.

### Lesson

During calibration, exactly one explicit head-authority path should be active. Isolation is not tidiness; it is the experiment.

---

## 29. Low idle FPS can make correct easing look broken

### What happened

A transition that was mathematically smooth still looked jumpy because the tiny desktop avatar intentionally rendered at a very low idle frame rate.

### Lesson

Temporarily raise render cadence during short head transitions, then restore the low-cost idle rate. Do not permanently spend GPU budget to solve a one-second animation problem.

---

## 30. A physical gesture can work while the conversational AI has no idea it exists

### What happened

Manual nod/shake commands worked perfectly. In normal conversation, no gesture command reached Unreal. When explicitly asked to “show” yes/no, the live model explained nodding instead of doing it because nod/shake were not exposed as actions it knew it could call.

### Lesson

Embodied capabilities need an action surface. Install a narrow local gesture tool, instruct the live model when to use it, optionally intercept explicit gesture requests deterministically, and keep semantic transcript detection as a fallback rather than the only control path.

---

## 31. Tiny technically measurable movement can still be a failed desktop gesture

### What happened

An eye-only screen-attention experiment produced measurable iris movement and clean lifecycle behavior, but the user could not perceive it from normal seating distance.

### Lesson

For embodied UI, “measurable” and “communicative” are different thresholds. If the intended human cannot see the behavior at normal avatar size, it has not satisfied the feature.

---

## 32. Sampling a static expression at its midpoint can erase the expression

### What happened

Very short MetaHuman facial-pose clips were initially sampled at half their reported play length. The result looked weak or almost neutral even though the source pose was strongly authored.

### Lesson

For static/near-one-frame poses, inspect curve values across the clip and choose the strongest meaningful sample. Do not assume `length / 2` represents the authored pose.

---

## 33. More expression amplitude can make the emotion less readable

### What happened

A stock anger pose became less recognizably angry when its overall intensity was increased because extra channels diluted the useful facial signal. A lower amplitude held longer communicated more.

### Lesson

Tune face shape and duration separately. Human emotional readability is not monotonic with curve amplitude.

---

## 34. A strengthened micro-gesture can expose obsolete random triggers

### What happened

A formerly tiny random speech-start eyebrow twitch became a clear skeptical expression after the brow recipe was improved. Friendly greetings could therefore begin with an unintended confused/doubtful look.

### Lesson

Whenever a gesture recipe is strengthened, search every old call site. Remove random triggers that were acceptable only because the old motion was nearly invisible.

---

## 35. Personality adjectives did not defeat the generic helper reflex

### What happened

The desktop agent could have the correct identity, memories, warmth, humor instructions, and voice yet still interpret casual remarks as information tasks. Shared entertainment became unsolicited explanation or fact-checking; gratitude could grow an availability speech; personal news could trigger advice before reaction.

### Lesson

Do not keep adding adjectives such as `warm`, `playful`, or `funny` and expect the inferred task to change. Define the social objective explicitly and distinguish social, analytical, operational, and quiet lanes. Put that behavioral contract in every route that can actually generate speech. See `05c-social-intent-and-behavioral-priority.md`.

---

## 36. Hard token caps fixed length by breaking speech

### What happened

A hard Realtime output-token limit was added to force short social replies. It succeeded at stopping extra wording by audibly cutting a normal greeting off mid-utterance.

### Lesson

Do not use a hard generation cap to repair a social-intent problem. Fix why the model thinks it should explain, advise, ask, or offer help. Then tune brevity with response-specific semantic instructions. In realtime voice, abrupt token exhaustion is worse than one unnecessary sentence.

---

## 37. Treating speech as the only valid response created unnecessary words

### What happened

Even after social intent improved, tiny acknowledgments and shared amusement could still produce an extra sentence because the runtime assumed every turn required spoken language.

### Lesson

An embodied companion has multiple output channels. For very low-risk social moments, a nod, expression, laugh, shared glance, or silence can be the complete response. Keep these routes narrow and semantically tested. See `09e-fewer-words-more-presence.md`.

---

## 38. A laughter keyword classifier can accidentally laugh at a real question

### What happened

An early laugh-only classifier was broad enough that a sentence such as `Tell me why that was funny` could be interpreted as a request for laughter rather than an actual conversational question.

### Lesson

Nonverbal routing needs negative regression cases, not only positive examples. Match unmistakable amusement or explicit laugh requests, not the mere presence of words such as `funny`.

---

## 39. A new listening pose can steal the initial watch pose

### What happened

A natural half-turn-toward-user behavior was added for conversation during shared viewing. On the initial `watch` command, the acknowledgement response immediately replaced the full screen-facing pose with the half-turn, so the user no longer perceived the intended screen turn.

### Lesson

Attention states need explicit ownership and priority. Protect the initial watch activation through its first acknowledgement, then allow later user speech to use the half-turn. Prefer semantic one-shot state over arbitrary timing windows.

---

## 40. Natural activity-ending language needs local intent coverage

### What happened

A phrase such as `I'm closing it down` was treated as ordinary companion conversation because the end-activity matcher expected explicit nouns such as `video`, `show`, or `game`. The assistant replied appropriately but kept staring at the now-closed content because watch mode never actually ended.

### Lesson

When context already supplies the object, support pronoun-only endings such as `I'm turning it off`, `I'm shutting it down`, and `I'm done with this`, with negation guards. Ending the activity should clear watch state once and restore center.

---

## 41. Asking a realtime voice to “laugh” can produce spoken `ha ha ha`

### What happened

The voice model understood that the user was laughing, but explicit instructions to laugh sometimes produced lexical syllables instead of a genuine nonverbal reaction. A later attempt to force a laugh before the ordinary response also created severe latency.

### Lesson

Treat laughter recognition, nonverbal reaction, and semantic reply as separate concerns. For some realtime voices, a narrowly requested non-speech amused exhalation is more reliable than the word `laugh`. Human ear-testing is mandatory.

---

## 42. Silent local-sensor death can masquerade as a voice problem

### What happened

Reciprocal social cues stopped appearing, while normal conversation remained socially appropriate. Without lifecycle telemetry, the failure initially looked like a problem in response routing. The local face/gaze helper had simply stopped being available during the active conversation.

### Lesson

A local sensor process needs minimal start/exit/error/event logging plus bounded restart during the session it serves. Log technical events only, not frames or inferred emotions. Prove the cue at the sensor boundary before debugging the voice model.

---

## 43. Asking the model to “must speak” is not a forced delivery test

### What happened

A validation prompt explicitly told the decision model that it MUST choose to speak. The model still returned a high-confidence silence decision.

### Lesson

Policy validation and transport validation are separate experiments. To prove unsolicited delivery, bypass model choice locally for exactly one grounded eligible check, while keeping every downstream safety/output guard intact. Then remove the bypass.

---

## 44. Stale silence can spend a one-shot before the conversation starts

### What happened

A forced one-shot delivery test initially fired while the desktop avatar was still loading because the runtime inherited an old `lastUserInteractionAt` timestamp. The feature worked, but the test was spent before the intended live conversation began.

### Lesson

Arm one-shot social tests from a user turn in the current voice session, not merely from process uptime or persisted silence. Test harnesses need their own lifecycle boundaries just as much as production features do.

---

## 45. Seated actor origins are poor standing-placement references

### What happened

The full-body test initially placed the avatar inside or beside the chair even though the standing animation itself was valid. The seated actor origin had been calibrated around chair/pelvis contact, not planted feet.

### Lesson

For posture changes, anchor from anatomy. Attach or compute a marker on a planted foot contact, place a target marker on the floor, and translate the actor by the marker delta. Verify the final contact error, then judge the result visually.

---

## 46. A clean MetaHuman idle can hide an active-motion neck failure

### What happened

Neutral standing looked normal, but the active Point animation exposed severe neck stretching. Several plausible fixes failed, including `Copy Pose From Mesh -> Use Mesh Pose`, stripping neck/head tracks, suppressing project-specific head curves, and setting the live Face Post Process `EnableHeadMovementIK` property false.

The decisive isolation came later: disabling the entire Face post-process fixed the neck, and a graph-level bypass proved `CR_MetaHuman_HeadMovement_IK_Proc` was the conflicting stage. Bypassing only that Control Rig preserved RigLogic and facial animation while the full-body Point motion remained neck-safe.

### Lesson

Do not declare head/neck propagation fixed from idle alone. Test an animation with meaningful spine/shoulder motion, distinguish a runtime property toggle from actually bypassing an evaluated node, and measure Body/Face head transforms before inventing more retarget fixes. Keep one structural head owner.

See `docs/09f-wide-view-full-body-animation.md` and `docs/09g-metahuman-neck-head-ownership.md`.

---

## 47. Tail-only fresh-context windows can preserve the ending and lose the answer

### What happened

A fresh conversation mirror was technically present, but the retrieval window kept only the tail. The actual project definition lived earlier in the conversation, so the desktop surface repeatedly received recent text that described the debugging failure rather than the work being asked about.

### Lesson

For bounded active-conversation mirrors, preserve both the beginning and the end when the file exceeds budget, or use another structure that protects topic-defining context. Freshness alone does not help if truncation removes the decisive evidence.

---

## 48. Provider force-consult plus application-owned consult created two answer paths

### What happened

The realtime provider could automatically consult the agent while the desktop application also launched its own deterministic consult after finalized transcription. Both looked individually correct. Together they raced.

### Lesson

Choose one consult-to-speech owner per user turn. Provider-owned and application-owned consultation are both viable; combining them is not redundancy, it is a race condition.

---

## 49. A correct consult result did not prove the user would hear that answer

### What happened

Direct agent tests returned the correct fresh-continuity answer, while live voice still spoke stale uncertainty. The retrieval and reasoning layer was working; a later Realtime response independently authored something else.

### Lesson

Validate the whole causal chain. Log the consult result and correlate it to the exact provider response id and audio playback that the user hears. Do not declare memory fixed because one intermediate log line is correct.

---

## 50. Tool output followed by bare `response.create` let Realtime answer again

### What happened

One consult path returned a function result to Realtime and then issued an unqualified `response.create`. The provider was free to synthesize a new answer from its own conversation state rather than faithfully speaking the consulted answer.

### Lesson

For application-owned consultation, create an isolated delivery response containing the already-decided answer, disable tools for that response, and tag it with request/origin metadata.

---

## 51. Untargeted cancellation and uncleared audio allowed stale speech to survive

### What happened

Cancelling without a specific response id could affect the wrong response, and cancelling generation did not necessarily remove already-buffered WebRTC audio. A stale answer could therefore remain audible after logic had moved on.

### Lesson

Cancel the exact active response id and clear the output-audio buffer when the provider supports it. Generation state and audible playback state are separate boundaries.

---

## 52. One global response boolean was not a response coordinator

### What happened

Late `response.done`, overlapping `response.create`, cancellation, and queued authoritative answers all shared a few booleans. An old event could reset state for a newer response, or a lower-priority response could overwrite a queued agent answer.

### Lesson

Track request ids, provider response ids, origins, active response ownership, and queued priority explicitly. Ignore stale completion events whose id does not match the active response.

---

## 53. Browser DOM order was not stable conversation order

### What happened

A live chat capture initially assumed the browser DOM represented the full conversation in stable order. Virtualized/re-rendered message nodes could reorder or omit content.

### Lesson

Assign monotonic sequence numbers when messages are first observed and merge snapshots by stable identity/sequence. Treat the browser DOM as a view, not the canonical transcript database.

---

## 54. Windows temp-file reuse made atomic-looking writes unreliable

### What happened

A capture server reused a predictable temporary filename while replacing JSON snapshots. Windows file locking occasionally caused replacement failures.

### Lesson

Use unique temp filenames, bounded retry/backoff, and a safe fallback. A live continuity bridge should fail softly rather than corrupt or lose the current conversation mirror.

---

## 55. Renderer console logs were not enough for response-race debugging

### What happened

The main development log showed agent consultation, but the critical Realtime response events lived in the renderer and were not reliably visible after the fact. That made several races look mysterious.

### Lesson

During difficult realtime debugging, write a small structured on-disk ledger across the actual boundaries: finalized transcript, classifier result, consult start/result, response request, response id, audio start/stop, and completion. Keep it technical and omit private content where possible.

---

## 56. Generated source code turned regex word boundaries into backspace characters

### What happened

A source patch generated through Python wrote `\b` incorrectly. Python interpreted the escape while constructing the patch, leaving literal `0x08` backspace characters in a JavaScript regex. The source looked nearly normal during casual inspection, but the cross-surface intent classifier could never match phrases it was explicitly designed to recognize.

### Symptom

Fresh context, direct agent consultation, and response delivery all tested correctly in isolation, yet live cross-surface questions never entered the consult path and Realtime kept giving the same stale answer.

### Lesson

When code is generated by another language, validate the resulting bytes, not just the visual source. Scan for control characters, run the exact classifier against the exact user phrase, and keep a branch ledger that proves whether the intended route fired. Tiny invisible encoding defects can impersonate architectural failures for hours.

---

## 57. Bare `close it` was claimed by browser tabs after an app action

### What happened

After opening Calculator, `close it` could still be parsed as `close current browser tab`. The same pronoun had multiple capability owners, and the browser grammar won even though the user's recent action context was an application.

### Lesson

Do not give bare pronouns permanent ownership to one tool family. Resolve them from the most recent successfully completed capability family and refuse the action when ownership is ambiguous.

---

## 58. Chrome tab `select()` could report success without changing the visible page

### What happened

UI Automation could mark a Chrome tab selected while the window title, omnibox, and actual document remained on the previous tab. A later Ctrl+W could then close the wrong tab.

### Lesson

For Chrome tab activation, perform a real UI click and verify the visible document/address afterward. Accessibility state is evidence, not truth by itself.

---

## 59. A newly opened Chrome tab could be `Untitled` before the page existed

### What happened

The tab strip exposed a newly selected `Untitled` tab and the bridge treated that as completed navigation. The next action arrived before Chrome had created the destination document.

### Lesson

Do not hand control forward until the omnibox/document reflects the requested destination. Verify page identity, not just tab creation.

---

## 60. Physical clicking an off-screen hyperlink did nothing

### What happened

Wikipedia exposed several exact hyperlink elements for the same visible text, but the first matches were off-screen. `click_input()` clicked screen coordinates rather than semantically activating the hyperlink, so no navigation occurred even though the text match was correct.

### Lesson

Prefer the UI Automation Invoke action for off-screen links and verify a changed title/address. Use coordinate clicking only as a fallback.

---

## 61. `os.startfile()` was incorrectly labeled as verified file opening

### What happened

Windows accepted the file-open request, but the first implementation immediately returned `verified: true` even though no associated application window had yet appeared.

### Lesson

Dispatch and presentation are different states. Wait for observable application evidence, or return success with `verified: false` rather than overstating certainty.

---

## 62. Packaged Windows apps may need their shell frame controlled

### What happened

Calculator exposed both the real app process and `ApplicationFrameHost.exe` shell windows. Direct foreground calls against the real app HWND did not reliably bring the UI forward, while UI Automation focus on the shell frame did.

### Lesson

Separate app identity from UI control surface. For packaged apps, the real process can identify the application while the shell frame owns focus/minimize/maximize/restore behavior.

---

## 63. Unclaimed operational phrases became imaginary actions

### What happened

Natural phrases such as `Bring Chrome back` and `Open the link that says Anne Boleyn` were not claimed by deterministic local routing. They fell through to ordinary conversation, where the model could say it was performing the action even though no control call happened.

### Lesson

For common local operations, truth comes from deterministic action ownership plus verification. Do not try to solve missing routing with stronger prompting about honesty.

---

## 64. A slow old consult answered after the user had changed tasks

### What happened

A misheard application command fell through to the slower general-agent path. Its answer returned much later, after the user had moved on to unrelated file testing, creating stale narration in the middle of a new task.

### Lesson

Snapshot the user-turn generation/timestamp before slow work and discard the eventual answer or error if a newer user turn has occurred. Freshness gates belong on answers as well as tool calls.

---

## 65. Mixed provider/app response ownership created an avoidable race

### What happened

Realtime VAD was configured with `create_response:false`, but the provider could still call the agent consult tool and application code could also trigger a continuation. Two layers could therefore believe they owned the substantive answer.

### Lesson

Choose one response owner. Persist the finalized user transcript once, run the long-lived agent consult from application code, then use Realtime only to speak the already-decided answer. Correlate response ids/origins and reject stale completion events.

---

## 66. The Talk schema advertised a brain mode the live gateway rejected

### What happened

OpenClaw 2026.9.2's installed schema exposed `brain: "none"`, but the live `talk.client.create` route rejected it and accepted `brain: "agent-consult"`.

### Lesson

When schema and runtime disagree, treat the live gateway as authoritative and record the version-specific mismatch. A playback-only session can still remain safe by opening no microphone and creating only a tool-disabled exact-line response.

---

## 67. A second visible Electron shell detached the control overlay

### What happened

A playback test launched another Electron shell against the same composite avatar. The overlay follower could bind to the wrong `Desktop Lyra` window, leaving the control bars detached or apparently duplicated.

### Lesson

Do not test a composite Electron/Unreal avatar by launching a competing visible shell with the same window identity. Reuse the existing voice session or isolate the test so only one shell can own the overlay pairing.

---

## 68. Proactive speech should reuse an open quiet voice session

### What happened

An early conservative policy blocked proactive speech whenever a voice session was open. That was safe but unnecessarily prevented bounded spontaneity during a long quiet live call.

### Lesson

Use two delivery paths: recv-only playback when voice is closed, and the already-open Realtime session when it is open but quiet. Suppress during shared Watch/Screen, cancel immediately on new user speech, and only stamp the spoken cooldown after audio actually begins.

---


## 69. Realtime hesitation fragments launched overlapping agent consults

### What happened

VAD finalized a paused sentence into several user fragments. Application-owned consults overlapped, allowing a stale run to finish after a newer fragment and emit an unrelated failure fallback.

### Lesson

Serialize substantive consults. Retain only the newest pending finalized turn, discard stale results by turn generation, then consult the newest turn against updated conversation context.

---

## 70. Voice cleanup accidentally owned Screen permission

### What happened

Ending a Mic session also disabled Screen, which intentionally stopped Screen-audio Whisper even though the user had left Screen enabled.

### Lesson

Capability ownership must stay explicit. Mic cleanup owns mic/camera and wake; Screen authorization is owned only by the Screen control and must survive unrelated voice-session cleanup.

---


## 71. A DPI-unaware geometry probe falsely accused the overlay

### What happened

After Unreal recovery, a diagnostic reported the wrong top/bottom control-band sizes. The probe was DPI-unaware, so Windows virtualized its coordinates at display scaling and made correct geometry look wrong.

### Lesson

Make window-geometry probes per-monitor-DPI-aware before changing stable overlay code. Validation instrumentation can be the bug.

---

## 72. Killing a stdin-fed helper surfaced an asynchronous `EPIPE`

### What happened

The Screen-audio transcriber recovered after being killed, but PCM writes still in flight produced a JavaScript error dialog. `try/catch` around `stdin.write()` did not catch the asynchronous stream error.

### Lesson

Attach an error listener to child stdin and check `destroyed`/`writable` before writes. After rebuilding Electron main-process code, restart the main process before retesting; a stale dev process can make a correct patch appear broken.

---

## 73. One-second desktop capture cadence stalled pointer motion

### What happened

With Screen enabled, the mouse visibly paused about once per second. The watcher enumerated/captured the desktop every 1000 ms, built a thumbnail, and JPEG-encoded a larger frame even when no model analysis was due.

### Lesson

Prioritize interactive input. A validated mitigation skips watcher sampling during recent user input, uses only a tiny fingerprint on the hot path, and captures a full JPEG only when analysis is actually due. Document the tradeoff: sustained input can defer observation, so a persistent low-cost capture stream may still be a better long-term architecture.

---

# The meta-lesson

The project was not hard because any one component was impossible. It was hard because a desktop AI avatar is a stack of systems that fail in visually similar ways.

“Ethan didn't respond” could mean:

- wake listener failed,
- microphone was still locked,
- Gateway was down,
- WebRTC failed,
- provider schema failed,
- local command swallowed the turn,
- OpenClaw consult failed,
- remote audio did not play,
- Unreal lip sync failed while audio worked.

The winning debugging method was always the same:

> Find the last boundary that is objectively proven, then test exactly one boundary after it.

If Fox/Lyra's build follows that principle, they should skip a remarkable percentage of the pain that produced this repository.