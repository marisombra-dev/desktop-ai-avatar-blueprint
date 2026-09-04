# 11 — Troubleshooting Runbook

Use this chapter when something “suddenly stops working.” The rule is simple: identify the first broken boundary before changing architecture.

## 1. Start with a subsystem map

```text
A. Unreal avatar runtime
B. Electron shell/window
C. OpenClaw Gateway
D. WebRTC realtime voice
E. wake/sleep lifecycle
F. local command routing
G. screen capture
H. camera capture
I. image injection/model response
J. lip-sync/audio bridge
K. proactive presence
L. animation/mannerisms
```

Write down which of A–L still work. A failure in F is not evidence that G is broken.

---

## 2. Gateway will not connect

### Check 1 — health/probe

Use the current OpenClaw CLI:

```bash
openclaw gateway health --port 18789
openclaw gateway probe --port 18789
```

Or verify the configured equivalent.

### Check 2 — one Gateway

Look for duplicate processes/listeners. A normal desktop profile should not have two copies competing for the same port/state.

### Check 3 — manual launch

If startup automation fails, run the Gateway directly in a terminal from the expected OpenClaw working directory.

If manual launch works, the database/client is probably not your first suspect. Inspect scheduled-task/service environment, working directory, inherited `NODE_OPTIONS`, permissions, stdin/session lifetime, and restart policy.

### Check 4 — token/config

Make sure the Electron client reads the same active config the Gateway uses.

Do not print the token into chat/logs. Compare paths and existence, not secret text.

### Do not

- delete `openclaw.sqlite` because a scheduled task failed,
- wipe the workspace,
- regenerate identity/personality files,
- downgrade several packages simultaneously.

---

## 3. Gateway manual launch works but Windows startup does not

Treat this as launcher lifecycle.

A Windows task/launcher should:

- use the correct Node executable,
- use the correct OpenClaw script/CLI,
- set a stable working directory,
- avoid inherited incompatible `NODE_OPTIONS`,
- not redirect in a way that causes premature EOF if the process expects a long-lived stdin context,
- restart on failure if appropriate,
- avoid a task time limit that kills a healthy long-lived Gateway,
- not launch a duplicate if one is already bound.

Validate by rebooting once the task is fixed. Do not declare victory because a manual terminal is still open.

---

## 4. Avatar window traps the mouse

Ensure Unreal game launch includes the appropriate no-mouse-capture behavior. In the reference build:

```text
-NoMouseCapture
```

Also inspect:

- Unreal input mode,
- game viewport mouse-lock settings,
- Electron overlay hit-testing,
- whether the transparent Electron window is swallowing input over the whole rectangle.

Only the actual controls/drag region should need mouse input.

---

## 5. MetaHuman is upside-down / drifting / swaying as a whole

Separate camera/window transforms from skeletal/face animation.

Checklist:

- Did a parent/root actor transform change?
- Did a camera transform change?
- Did an animation Blueprint add a component-space rotation?
- Did a control value remain latched after a probe?
- Did the overlay sync helper move/resize rather than rotate?

Restore the last known-good animation asset before introducing compensating rotations.

---

## 6. Face looks right at rest but wrong after animation changes

Restore approved face/animation checkpoint and isolate:

- MetaHuman identity geometry,
- facial animation Blueprint,
- body animation Blueprint,
- Control Rig,
- mood overlay,
- audio-driven face animation.

Do not “fix” an animation regression by re-sculpting the person's face.

---

## 7. Head control moves in the wrong direction

Do not rename variables and hope.

Probe one control:

```text
+ small value
- small value
```

with other head/gaze modifiers disabled. Record actual result and coordinate space.

The reference project observed nominal yaw/pitch controls behaving counterintuitively. This is normal enough that empirical axis mapping should be part of development.

---

## 8. Wake word is not heard

Check in this order:

1. Is wake process running?
2. Which input device did `sounddevice` select?
3. Does the wake log show non-zero RMS when you speak?
4. Does Whisper transcription contain the name?
5. Does normalized phrase match the strict wake regex?
6. Are log-probability/no-speech gates rejecting it?
7. Is the listener intentionally paused because a live/proactive voice session is still active?

If raw transcription is wrong, tune audio/recognizer. If transcription is right but candidate is rejected, tune thresholds. Do not retune the wake recognizer because Realtime failed after wake.

---

## 9. Wake word false-triggers on ambient speech

Tighten the combination, not just one magic threshold:

- stricter phrase shape,
- higher RMS floor if room noise is triggering,
- better average log-probability floor,
- lower accepted no-speech probability,
- shorter/appropriate rolling window,
- avoid aggressive hotword bias that hallucinates the name.

Log accepted/rejected candidates with acoustic values before changing them.

---

## 10. Wake works once, then never again

Likely lifecycle.

After realtime stop, verify:

```text
activeVoice cleared
microphone tracks stopped
wakePaused false
wake listener process spawned
READY observed/logged
```

If camera/audio teardown throws, make wake re-arm run in a reliable `finally`/outer lifecycle path.

---

## 11. “Thanks, Lyra” does not end the call

Check:

1. Does completed transcription contain the phrase?
2. Is `handleLocalVoiceCommand(text)` actually called from the completed-transcription event?
3. Does normalization preserve/strip the name as expected?
4. Does sign-off regex match?
5. Does local callback close the realtime session?
6. Is `openclaw_agent_consult` receiving the phrase first? If so, does the consult-call interceptor also recognize local commands?

A handler sitting in source code is useless if no provider event calls it.

---

## 12. Sign-off tries to sleep Windows

Immediately remove the sign-off from general computer-control routing.

The local meaning is “close voice.” Implement it as a dedicated local intent/function. General OS tools never need to see the phrase.

---

## 13. Upper-right error indicator appears

Do not hide it.

Expose actual renderer/provider error text via:

- tooltip/title,
- DevTools,
- application log,
- Windows UI Automation `HelpText` if needed.

In the reference build the tiny `!` ultimately exposed:

```text
Missing required parameter: 'session.type'.
```

That one string solved the problem.

---

## 14. Local realtime tools exist in code but are never called

Verify installation, not handlers.

On every new `session.created`:

1. inspect current `session.tools`,
2. merge local definitions by name,
3. send `session.update`,
4. include the current required `session.type`,
5. confirm a `session.updated` or lack of error,
6. log the installed tool names.

If `localToolsInstalled` is per realtime controller instance, it should reset naturally on each new controller/session.

---

## 15. Realtime error: missing `session.type`

For current Realtime session updates, include:

```json
{
  "type": "session.update",
  "session": {
    "type": "realtime",
    "tools": []
  }
}
```

If your provider returns a different schema error in the future, follow current official API docs rather than freezing this example in amber.

---

## 16. Spoken “look at screen” does nothing, manual Screen works

This is **not a screen-capture problem until proven otherwise**.

Inspect:

```text
transcription
↓
local command normalizer
↓
SCREEN_ON match
↓
onScreenCommand callback
↓
UI/state
```

Also inspect the `openclaw_agent_consult` interception path.

Do not rewrite `desktopCapturer` if manual Screen already proves it.

---

## 17. Screen button turns ON but AI says it cannot see

Now split further.

### Independent capture test
Write one screenshot to disk using Electron. If it is non-empty and correct, OS capture works.

### Image injection
Confirm the realtime item contains actual `input_image` data URLs after screen is enabled.

### Response race
If an automatic provider response already started from the user's speech, cancel it before adding fresh images and creating the grounded response.

### Freshness wording
Tell the response that screen is ON **now** and that the attached frames are fresh. Do not rely on old session context.

---

## 18. Screen capture works but image event errors

Inspect exact provider error.

Check:

- current `input_image` schema,
- data URL MIME (`image/jpeg`),
- base64 content not empty,
- payload size,
- item role/content type allowed by current Realtime API,
- only one default-conversation response writing at a time.

Do not switch to OCR as a workaround unless the user's actual task requires OCR and image input is unavailable.

---

## 19. Screen answer describes old content after sharing is OFF

You have a stale-context problem.

On OFF:

- disable watcher,
- make capture function refuse,
- inject an explicit “shared screen ended / prior view is stale” context item.

On a future ON, provide fresh frames immediately.

---

## 20. Screen watcher talks constantly

Tune **policy before sampling frequency**.

Ensure observer prompt says:

- silence default,
- routine movement is unimportant,
- comments only for meaningful events.

Then tune:

- importance threshold upward,
- comment cooldown longer,
- analysis minimum interval longer,
- local frame-difference threshold upward.

Do not solve chatter by deleting all temporal awareness.

---

## 21. Camera button turns ON but question is wrong

Check:

1. `getUserMedia` opened the intended camera,
2. hidden video `readyState >= 2`,
3. `videoWidth/videoHeight` are non-zero,
4. canvas draws the current frame,
5. JPEG is fresh and non-empty,
6. image is sent before `response.create`,
7. old response was cancelled if needed.

Use an objective target like fingers or a held object.

---

## 22. Camera light stays on after OFF / sleep

Stop all tracks:

```ts
cameraStream?.getTracks().forEach(track => track.stop());
```

Then clear `srcObject` and references. Also call this from the full realtime-session stop path, not only the Camera button.

---

## 23. Realtime greeting is absurdly long

Do not ask the full agent to improvise every wake acknowledgement.

Use a tiny exact-response `response.create` with tools disabled. Keep the live session open afterward for the user's real next turn.

---

## 24. Proactive speech feels needy

Inspect the **decision prompt**, not the voice.

Bad premise:

```text
The user has been quiet. Check on them.
```

Good premise:

```text
Silence is ordinary. Return NO_MESSAGE unless you genuinely have something natural and specific to say.
```

Increase cooldowns and decrease context pressure to speak.

---

## 25. Proactive line gets clipped at the last word

Do not close playback session on provider `response.done` immediately. Keep enough time for the remote audio element to drain, or monitor actual media completion.

---

## 26. Proactive speech starts as user begins interacting

Take an interaction timestamp snapshot before model deliberation and compare it after the result. Abort speech if the user interacted meanwhile.

Re-check active live voice and lock/quiet conditions after the model returns too.

---

## 27. Avatar speech moves but audible sound is absent

Determine where the split occurs:

- Is remote WebRTC audio track received?
- Is HTML audio playing/unmuted?
- Is system output device correct?
- Is direct PCM bridge receiving packets?
- Is Unreal animation using the bridge while speaker output uses a different route?

Lip animation proves some audio signal reached Unreal, not necessarily the user's speakers.

---

## 28. Audio is audible but lip sync is dead

For loopback route:

- verify loopback input meter,
- MetaHuman Live Link source/subject status,
- animation Blueprint subject binding,
- current MetaHuman audio-animation plugin state.

For direct bridge:

- verify PCM callback,
- IPC/UDP packet counts,
- Unreal socket receiver,
- sample format/rate,
- bridge feeding the correct face animation path.

---

## 29. Lip sync works but face looks too intense

Separate speech solver from mood overlay. Set explicit mood to neutral/automatic and test speech alone. Then reintroduce emotion at low amplitude.

---

## 30. Build/typecheck fails after a surgical edit

Do not keep editing blindly.

Run:

```bash
npm run typecheck
npm test
npm run build
```

Fix the first compiler/test error. Then rerun all three.

Maintain a pre-edit backup for high-risk source changes.

---

## 31. Development log contains scary old errors

Timestamp matters.

A long-lived dev log may contain historical failures from hours/days earlier. Reproduce the current failure and inspect the newest block. Do not diagnose from the first matching string in the file.

---

## 32. “It worked before reboot”

Check services/process ownership:

- Gateway startup task,
- wake listener restart,
- Electron app auto-start if desired,
- Unreal runtime launch path,
- Python executable path,
- audio virtual device persistence,
- camera permission,
- firewall rules.

A production-ready desktop companion must pass a cold reboot test.

---

# Minimal incident report template

When handing a failure to another AI, provide:

```text
Last known-good behavior:
Exact action performed:
Exact observed behavior:
Which buttons/states changed:
Exact visible/provider error:
Gateway health:
Can manual sensor capture work:
Can manual UI toggle work:
Can text OpenClaw chat work:
Can realtime voice without sensor work:
Most recent relevant log timestamp:
Recent code change (one sentence):
```

This is dramatically more useful than “Lyra can't see again.”

# Final troubleshooting rule

When a subsystem has already been objectively proven, preserve that fact.

A later failure in spoken routing does not erase an earlier successful camera smoke test. A provider schema error does not mean Unreal is broken. A head gesture behaving oddly does not mean OpenClaw needs different reasoning effort.

The fastest path through a multi-layer system is to remember what you already proved.