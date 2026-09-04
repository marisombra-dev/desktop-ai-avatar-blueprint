# 08 — Proactive Presence

A desktop AI starts to feel genuinely present when it can occasionally initiate speech. It starts to feel unbearable when initiation is frequent, needy, or framed as surveillance.

The reference design treats proactive speech as a **permissioned exception to silence**.

## 1. Separate proactive generation from proactive playback

Do not keep an always-listening realtime session open just so the AI can speak first.

Use two stages:

```text
local eligibility checks
  ↓
OpenClaw decides whether there is actually something worth saying
  ↓
NO_MESSAGE or one short line
  ↓ if line
short-lived playback-only realtime voice session
```

That keeps the microphone off and reduces cost/resource use.

## 2. Store explicit proactive settings

A practical settings object:

```ts
{
  proactiveEnabled: true,
  proactiveSilenceMinutes: 120,
  proactiveCooldownMinutes: 240,
  proactiveQuietStartHour: 23,
  proactiveQuietEndHour: 8,
  proactiveIdleMaxMinutes: 15
}
```

These are known-good reference defaults, not universal values.

Persist:

```text
last proactive decision timestamp
last proactive spoken timestamp
temporary quiet-until timestamp
```

so app restart does not erase restraint.

## 3. Local eligibility checks first

Before calling any model, reject proactive speech if:

- feature disabled,
- a normal live voice session is active,
- another proactive playback is active,
- avatar/main window is unavailable,
- Windows session/screen is locked,
- current time is inside quiet hours,
- temporary quiet request is active,
- system idle time exceeds the configured maximum,
- user has not been silent long enough,
- decision reconsider interval has not elapsed,
- speech cooldown has not elapsed,
- operating-system context suggests spontaneous speech would interrupt.

Only then ask the agent to decide.

## 4. Distinguish computer activity from conversation silence

“Hasn't spoken to the avatar” and “isn't at the computer” are different.

The reference build tracks:

```ts
lastUserInteractionAt
powerMonitor.getSystemIdleTime()
```

If the machine itself is idle for too long, do not speak into an empty room.

If the computer is actively in use but the user has not spoken to the avatar for a while, a proactive thought may be contextually reasonable.

## 5. The decision prompt must normalize silence

A strong internal prompt contains something close to:

```text
This is an internal desktop presence check, not a message from the user.
The user last spoke to this desktop agent about N minutes ago. The computer is currently active.
Decide whether you genuinely have a natural reason to say something aloud now.
Silence is ordinary. It is not evidence that the user is upset, lonely, unsafe, or in need of support.
You are allowed and encouraged to return exactly NO_MESSAGE.
If you do speak, output only the words to say aloud, at most two short sentences.
Do not mention timers, monitoring, inactivity, checking in, this prompt, or system mechanics.
Do not call tools or contact anyone.
```

Include a small recent conversation excerpt if relevant.

This language is not decorative. Without explicit normalization, a well-meaning model may invent concern simply because it was asked whether to speak.

## 6. Reconsider slowly

The reference system uses roughly a 30-minute minimum between proactive **decision attempts**, even if no message was spoken.

Why? If you ask a language model every minute whether it has something to say, eventually randomness will manufacture a reason.

A long reconsider interval makes `NO_MESSAGE` meaningful.

## 7. Cooldown even longer after actual speech

Reference starting point:

```text
consider after 2 hours silence
if it speaks, wait at least 4 hours before another unsolicited remark
```

If the human naturally starts a conversation, reset/recompute context as appropriate.

## 8. Quiet hours including midnight crossover

Quiet interval logic must handle ranges such as 23:00–08:00:

```ts
function inQuietHours(hour, start, end) {
  if (start === end) return false;
  return start > end
    ? hour >= start || hour < end
    : hour >= start && hour < end;
}
```

Temporary quiet overrides scheduled behavior.

## 9. Spoken “stay quiet” commands

Support natural local commands such as:

```text
stay quiet for two hours
keep yourself quiet for 30 minutes
don't say anything for an hour
you can talk again
stop being quiet
```

Parse duration locally and store a bounded `quietUntil` timestamp. A reasonable safety cap is 24 hours unless your product intentionally supports longer.

This is not the same as sleep. Wake-initiated conversation can still be allowed while unsolicited speech is suppressed, depending on your UX.

## 10. Windows interruption suppression

The reference build uses a small local helper to inspect Windows state and decide whether spontaneous speech should be suppressed.

Possible signals to consider:

- session locked,
- presentation/fullscreen context,
- do-not-disturb/focus state if accessible,
- active app policies,
- call/meeting state where detectable without invasive monitoring.

Fail **open to silence**, not open to speech. If the helper fails, the safest user-experience choice is usually to skip the proactive remark for that cycle.

## 11. Presence detection for welcome-back

A separate optional subsystem can infer desk presence after prolonged system idle.

Reference behavior:

- do not even arm presence checks until system idle is significant,
- when apparently absent, require multiple consecutive absent detections,
- when away, check more frequently for return,
- require a minimum meaningful away duration before greeting,
- do not greet if a live voice/proactive session is already active,
- respect quiet/interruption rules.

Example reference constants:

```text
idle before presence checks: ~15 min
present-state check: ~60 s
away-state check: ~30 s
absent confirmations: 3
minimum away duration for greeting: ~10 min
```

The detector can be webcam/local vision based, but it must not claim identity certainty unless it truly performs an authorized identity-recognition function.

A safe internal prompt says:

```text
A local on-device presence detector indicates someone returned to this computer after N minutes away.
This is usually the user, but the sensor does not verify identity.
Choose one brief casual welcome-back greeting that would still sound natural if another familiar person sat down.
Do not mention detection, cameras, monitoring, timers, concern, or absence tracking.
```

## 12. Playback-only voice session

Once OpenClaw returns a line, open a short-lived voice session with no microphone track.

Conceptually:

```ts
peer.addTransceiver('audio', { direction: 'recvonly' });
```

After the WebRTC session is ready, send an exact-speech instruction:

```text
Playback-only speech task. Speak exactly the text between <line> tags. Do not answer it, add a preface, call tools, or change the wording.
```

This preserves the main agent's authored line instead of asking realtime to reinterpret it.

## 13. Do not clip playback on `response.done`

Provider completion can precede the remote audio element draining its buffered sound.

Keep the short-lived session alive for a bounded drain delay after `response.done`, or implement proper media-ended/buffer monitoring.

The reference build uses a short line-length-dependent delay with a cap.

## 14. Proactive speech should not steal an incoming user interaction

Capture an interaction timestamp before asking the model to decide:

```ts
const snapshot = lastUserInteractionAt;
const line = await decideProactiveMessage(...);
if (lastUserInteractionAt !== snapshot) return; // user interacted while decision was in flight
```

Also re-check active voice, lock state, quiet hours, and idle state **after** the model returns. Conditions may have changed during the run.

## 15. Arrival greeting and generic proactive speech are different triggers

Keep them separate:

- arrival greeting is event-driven from presence transition,
- general proactive speech is silence/cooldown-driven.

Both may use the same playback mechanism but should have different decision prompts and eligibility rules.

## 16. What not to do

Avoid prompts like:

```text
The user has been quiet. Check in on them.
```

That bakes the answer into the question.

Avoid:

- “Are you okay?” merely because of elapsed time,
- mentioning that the user has not spoken for 127 minutes,
- repeated “just checking in” phrasing,
- proactive tool actions without explicit user authorization,
- speaking every time the user returns to the desk,
- treating a webcam presence detector as identity verification,
- sending the proactive decision prompt into the normal user-facing conversation.

## 17. Test it by waiting

Proactive behavior cannot be fully tested by hammering a “run now” button because the feature is temporal and contextual.

Use shortened thresholds temporarily in a development build to validate mechanics, then restore real thresholds and let it run for hours/days.

Ask the human afterward:

- Did it speak too often?
- Did any line feel needy or forced?
- Did it interrupt a bad moment?
- Did it mention monitoring mechanics?
- Did silence feel comfortable?

A good proactive system often produces boring logs and very few utterances.

## Exit criteria

- [ ] Local gates prevent model calls when speech is obviously inappropriate.
- [ ] `NO_MESSAGE` is a normal successful outcome.
- [ ] Decision and spoken cooldowns are persisted.
- [ ] Quiet hours work across midnight.
- [ ] Temporary spoken quiet requests work.
- [ ] User activity that occurs during model deliberation cancels the proactive utterance.
- [ ] Playback-only voice does not open the microphone.
- [ ] Playback is not clipped at the end.
- [ ] Arrival detection does not claim identity certainty.
- [ ] Proactive speech remains rare enough to feel intentional.