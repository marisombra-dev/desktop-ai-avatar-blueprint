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

## 4. MetaHuman head axes did not mean what we expected

### What happened

Experimental face/body controls produced surprising results. Nominal yaw/pitch/roll names did not correspond cleanly to intuitive screen-space movement, and several upstream control routes changed values without moving the rendered head.

### Lesson

Never infer control semantics from names. Probe the assembled rig empirically, one channel at a time, with every competing head path disabled. Human-visible motion is the acceptance criterion.

---

## 5. Physical “look at the screen” was a rabbit hole until we found the authority contract

### What happened

Direct bone rotations, face-side targets, body-side head variables, raw directional curves, and skeleton-retarget experiments all looked plausible. None produced a reliable visible screen turn.

The successful route came only after identifying the MetaHuman head-movement processor's curve contract: `HeadControlSwitch` plus the head rotation curves, delivered through a live curve path already proven on the assembled character.

### Lesson

Perception and visual acting are independent, so prove screen vision first. When returning to acting, discover the final rig's actual authority/input contract before inventing another upstream rotation mechanism. See `09b-metahuman-head-control.md`.

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