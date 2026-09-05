# 09 — Avatar Behavior and Animation

This chapter is deliberately late in the sequence. MetaHuman mannerisms are seductive because every small improvement is visible immediately, but they can consume days while more important plumbing remains unfinished.

The reference project reached wake/sleep, continuity, screen vision, camera vision, lip sync, and proactive presence before returning to this layer.

## 1. Establish three animation states

Think in three broad states:

```text
IDLE
LISTENING / THINKING
SPEAKING
```

Do not make them radically different poses. They are subtle behavioral overlays on the same person.

### Idle

Desired:

- natural blinking,
- tiny gaze drift,
- subtle breathing/posture change,
- occasional small head adjustment,
- no constant smile,
- no fixed stare.

### Listening / thinking

Desired:

- eyes attentive but not wide,
- occasional gaze hold,
- slightly reduced random motion,
- optional small “thinking” behavior after long latency, but avoid canned loop repetition.

### Speaking

Desired:

- reliable lip sync first,
- small head/gaze motion,
- emotion overlay from response content,
- occasional explicit gesture when semantically justified.

## 2. Do not animate every semantic event

If every “yes” produces a nod, every question raises a brow, and every joke creates a grin, the avatar becomes a puppet show.

Use two layers:

- **automatic low-amplitude face behavior** for normal presence,
- **sparse explicit gestures** for strong semantic cues.

## 2a. Listening micro-reactions: make the avatar visibly listen

A convincing avatar should not wait until its own speaking turn to become expressive. The safest useful pattern is a two-stage listening layer:

1. when user speech starts, enter a subtle attentive/listening state without guessing emotion;
2. when partial or final transcription supplies a strong semantic cue, allow **one** small face reaction for that user turn.

Keep this layer much weaker than speaking expressions. Ordinary speech should usually produce no semantic reaction at all. Good examples are a tiny brow lift for surprise, a slight interested brow for “hear me out,” a small playfulness lift for teasing, or a softening for serious material.

Do not make the voice pipeline depend on partial-transcript events. If the provider emits input-transcription deltas, use them opportunistically for earlier timing. If it does not, the completed transcript should trigger the same classifier immediately before the response.

A useful invariant is:

```text
one user speaking turn -> zero or one semantic listening reaction
```

This prevents the face from reacting to every keyword in a long sentence. Reset the per-turn guard at the next `speech_started` event.

See `examples/listening_reactions.ts` for a sanitized cue classifier.

## 3. Response-start smile

A tiny smile at the beginning of a friendly response can prevent the avatar from looking frozen while speech ramps up.

The early reference approach used a generic happiness pulse at response start. After facial calibration matured, friendly greetings were upgraded to a visually approved happy expression while ordinary responses retained the lightweight generic path.

Important ordering rule: if an approved expression owns the turn, suppress the generic response-start mood for that response so the two layers do not fight. The approved greeting smile should warm in naturally as speech begins rather than snapping instantly to a fixed grin.

See `09c-metahuman-expression-calibration.md` for the live-validated expression workflow.

## 4. Mood commands as rendering hints

A simple local protocol can express:

```text
MOOD|Happiness|0.66
MOOD|Interested|0.50
MOOD|Concerned|0.35
MOOD|AutoDetect|1.00
```

The exact Unreal mapping is project-specific. Keep mood intensity normalized and clamp values.

Do not let mood control alter the agent's language. The response content comes first; the face follows.

## 5. Semantic gesture detection from response text

A lightweight transcript observer can look at the start of an assistant response for strong agreement/disagreement cues.

Example positive start patterns:

```text
yes
yep
yeah
exactly
correct
absolutely
definitely
I agree
```

Negative:

```text
no
nope
not...
absolutely not
definitely not
I don't...
that's not...
incorrect
```

If the first phrase strongly matches and a gesture has not already been sent for this response:

```text
GESTURE|NOD|0.75
```

or

```text
GESTURE|SHAKE|0.75
```

Then mark that response as having consumed the explicit head gesture.

This layer should remain disabled until the actual MetaHuman gesture implementation is visually proven on the target avatar. In the reference build, nod and shake are now visually proven and intentionally invokable; see `09b-metahuman-head-control.md` for the working control path and duplicate-suppression rules.

## 6. Gesture control should be event-like

Do not keep `NOD=true` as a persistent state. Prefer an event with intensity/duration/variant.

Example future protocol:

```text
GESTURE|NOD|0.55|single
GESTURE|SHAKE|0.45|small
GESTURE|BROW_QUESTION|0.35
GESTURE|WINK_LEFT|0.40
GESTURE|CHIN_TOUCH|0.30
GESTURE|HAIR_PASS|0.20
```

Unreal should play/weight the gesture and return to the underlying idle/speech animation.

## 7. MetaHuman axis/space testing protocol

Before wiring a gesture to language, determine how the rig actually moves.

For each candidate control:

1. duplicate/checkpoint the animation Blueprint,
2. disable other head/gaze modifiers,
3. apply one constant value,
4. record visible result from front and 3/4 camera,
5. reset,
6. apply negative value,
7. record,
8. only then create a time curve.

Record results in a table:

| Control | + value | - value | Space | Visible result | Safe amplitude |
|---|---|---|---|---|---|
| `HeadYaw` | ... | ... | face rig | ... | ... |

The reference project discovered that nominal head axes did not correspond cleanly to expected screen-space movement. Never assume names prove behavior. The eventual working route used MetaHuman head-control animation curves plus `HeadControlSwitch`; see `09b-metahuman-head-control.md`.

## 8. Screen-looking gesture is optional, not proof of perception

It is visually appealing for the avatar to glance toward the screen when screen awareness activates. But the actual perception pipeline is image capture → model input.

Do not let a failed head-turn animation block screen vision.

The reference build correctly treated visual head orientation as cosmetic while screen perception was being proven. It later returned to the acting layer and achieved a visually proven screen glance plus sustained screen-attention posture. Perception still remains independent of where the avatar's head is pointing.

## 9. Gaze behavior

Gaze often matters more than head movement.

Bad gaze:

- fixed directly at camera forever,
- rapid random darting,
- eyes leading too far without head follow,
- frequent extreme sideways gaze.

Good desktop-scale gaze:

- mostly forward/near-user,
- tiny horizontal/vertical drift,
- occasional focus hold,
- blink resets,
- slightly more stable during speech/listening.

Use MetaHuman/RigLogic-native behavior where possible before custom bone math.

## 10. Blink behavior

Validate:

- full eyelid closure,
- no eyeball clipping,
- reasonable interval variation,
- blink continues during speech,
- no repeated rhythmic metronome.

Do not add deliberate wink until ordinary blink is stable.

## 11. Mouth and cheeks

Speech-to-face/lip sync can become uncanny when you stack a strong smile curve on top of certain phonemes.

Test combinations:

```text
neutral + speech
small happiness + speech
larger happiness + speech
amused expression + speech
```

Watch:

- mouth corner tearing,
- cheek overcompression,
- teeth/gum exposure,
- nasolabial fold exaggeration,
- lower lip collapse.

Keep speech legibility more important than emotional amplitude.

## 12. Clothing and neck regression

Head/neck animation can expose:

- collar clipping,
- neck seam,
- disappearing garment sections,
- hair/shoulder intersections.

The reference build saw occasional collar disappearance at extreme idle/head positions. Small rare artifacts can be deprioritized if the alternative is destabilizing the whole character. Document known cosmetic issues instead of reflexively rebuilding the rig.

## 13. Hands are the last frontier

Hand gestures are expensive because they involve:

- body pose,
- arm reach,
- hand/finger animation,
- collision/clipping with face/hair,
- timing relative to speech,
- return-to-idle blending.

Add only after head/face behavior is mature.

Good low-frequency candidates:

- brief chin touch during genuine thinking latency,
- occasional hair pass,
- tiny shrug/hand motion for uncertainty (still a later body-animation task in the reference build),
- restrained laugh gesture.

Do not loop them. Rare is better.

## 14. Mood/gesture transport from Electron

The reference app sends local control messages over the same loopback path used for avatar audio.

Conceptual sender:

```ts
function sendAvatarControl(message: string) {
  const payload = Buffer.from(`DECTRL|${message}`, 'utf8');
  udp.send(payload, LOCAL_AVATAR_PORT, '127.0.0.1');
}
```

Receiver rules:

- reject oversized/malformed packets,
- bind local-only where possible,
- whitelist command families,
- clamp numeric values,
- ignore unknown commands rather than executing arbitrary console text.

## 15. Restore automatic state after temporary expressions

Every temporary mood should have an escape path:

```ts
setMood('Happiness', 0.6);
setTimeout(() => setMood('AutoDetect', 1.0), 1500);
```

Clear/reset timers when a newer mood supersedes an older one.

Otherwise the avatar can get “stuck happy” after one greeting or stuck sad after one serious sentence.

## 16. Keep avatar feedback independent of tool success

Do not smile because a tool call succeeded. Smile because the content/emotional moment warrants it.

Likewise, do not show a worried face merely because network latency is high. Technical state and emotional state should not leak into each other.

## 17. Validation checklist for every new mannerism

Before keeping it:

- [ ] Does it visibly do what its name says?
- [ ] Is the direction correct?
- [ ] Is amplitude subtle enough at desktop size?
- [ ] Does it blend into speech?
- [ ] Does it preserve lip sync?
- [ ] Does it preserve gaze/blink?
- [ ] Does it avoid clothing/hair clipping?
- [ ] Does it return to idle?
- [ ] Does it occur rarely enough?
- [ ] Can it be reverted without touching other systems?

If any answer is no, the gesture is not ready.

## 18. Recommended order of mannerism work

1. stable blink/gaze idle,
2. restrained listening micro-reactions,
3. response-start smile,
4. content-linked mood intensity,
5. nod,
6. head shake,
7. question brow,
8. amused/laugh expression,
9. deliberate screen/camera orientation if still desired,
10. hand gestures,
11. advanced posture/body motion.

The reference project learned this order after doing some of it backwards.
