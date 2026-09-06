# 09e — Fewer Words, More Presence

A voice-first desktop companion becomes more convincing when it stops treating speech as the only valid response channel.

The reusable principle is:

> **If a glance, smile, nod, laugh, or small body reaction already communicates the answer, do not automatically add a sentence.**

This is not merely a brevity technique. It is an embodiment technique.

A generic assistant is rewarded for producing useful language. A visible companion can communicate through several channels at once:

```text
speech
prosody / laughter
face
head gesture
shoulders / posture
gaze direction
silence
```

The runtime should choose among them rather than always producing text first and decorating it afterward.

## 1. Separate semantic content from social acknowledgment

Not every turn needs new information.

Examples that may be adequately answered without words:

- a bare `okay`, `got it`, or `understood`,
- obvious shared amusement,
- acknowledgment while the user is still speaking,
- a visual `yes` / `no` when speech would be redundant,
- playful skepticism already expressed by an eyebrow or glance.

Keep factual questions, emotionally meaningful disclosures, safety-relevant moments, and substantive requests verbal unless the user clearly prefers otherwise.

## 2. Use nonverbal closure conservatively

A deterministic local classifier is appropriate for tiny closure acknowledgments because the semantic risk is low.

A safe starting set might include:

```text
okay
ok
got it
understood
makes sense
all right
```

For these, the avatar may use a small nod plus a soft expression and produce no spoken response.

Do not broaden this classifier to ambiguous phrases such as `sure`, `fine`, `whatever`, or longer sentences without testing. Those can carry tone, disagreement, resignation, or a new request.

The important implementation detail is that a listening/acknowledgment micro-gesture should not consume the stronger gesture budget for the assistant's later substantive answer.

Use separate cooldown/state for:

```text
listening micro-reaction
response semantic gesture
```

Otherwise a tiny nod while the user speaks may suppress the later visible YES/NO/uncertainty gesture.

## 3. Let laughter be audio, not commentary

Human validation exposed an important voice-model edge case: asking a realtime voice to “laugh” can produce literal spoken `ha ha ha` instead of laughter. A stronger reusable contract is to request a **brief non-speech amused exhalation** with no lexical syllables, then let ordinary speech continue if the turn contains something to answer.

A useful narrow instruction is:

```text
Non-speech social reaction only. Produce one brief warm amused exhalation.
No words, no syllables, no narration, then stop.
```

The reference build ultimately validated both cases in live use:

```text
pure user laughter        -> audible non-speech amused reaction + natural social follow-up
speech containing laughter -> audible chuckle/amused reaction + context-aware verbal reply
```

Keep laughter detection conservative and based on **observable cues**, not inferred mood. One successful local detector combined a very strong bilateral smile cue with short-lived mouth/jaw movement, hysteresis, and cooldown. Exact thresholds are camera/person dependent and should be calibrated rather than copied. The local detector is a supplementary social cue, not an emotion classifier.

Calibrate **speaking and non-speaking laughter separately**. A broad smile plus ordinary mouth opening while greeting or talking can resemble a visual laugh. In the reference build, a softer non-speaking laugh needed a sensitive gate, while the same gate produced a false laugh during a smiling greeting. The durable repair kept the sensitive quiet-laugh gate but required stronger jaw/mouth evidence whenever user speech was actively in progress.

Also fail safely at synthesis time. If the voice model cannot produce a true non-lexical amused sound, silence is preferable to literally saying stage directions such as `short warm exhalation sound`. Explicitly tell the dedicated reaction response not to describe the requested sound.

If the voice can hear amusement but the dedicated local detector misses it, do not immediately make the language model responsible for synthesizing laughter inside normal prose. That experiment increased latency and produced lexicalized `ha ha ha` in the reference build. Separate recognition, reaction sound, and semantic reply whenever possible.

## 3a. Add a tiny vocal-reaction vocabulary

Once laughter is stable, a few other short reactions can make the companion feel present without adding sentences. Keep the set deliberately small and use it only when the reaction can genuinely stand alone.

A validated reference set was:

```text
thoughtful / interesting -> quiet "mm"
surprise / disbelief     -> tiny surprised inhale
skeptical amusement      -> dry "hm"
sympathy                 -> soft low "mm"
```

Do not route questions, longer statements, personal disclosures, or task requests into this lane. Those usually need a real answer. A deterministic local classifier is appropriate because the semantic scope is intentionally tiny.

Voice synthesis may treat abstract directions such as `skeptical exhale` or `sympathetic breath` as text to narrate. If that happens, give the voice a concrete vocal target such as a short `hm` or low `mm`, forbid extra words, and prefer silence over spoken stage directions. Tune one failing sound at a time rather than rewriting reactions that already work.

## 4. Give the screen observer a nonverbal option

A shared-screen observer should not be limited to:

```text
NO_COMMENT
or
one spoken sentence
```

A useful third outcome is conceptually:

```text
LAUGH_ONLY
```

For genuinely funny shared moments, that enables:

```text
notice event
-> glance toward user
-> brief laugh
-> return attention to screen
```

No explanatory sentence is required.

Treat this as a high-salience social reaction, not something to fire on every mildly amusing scene.

## 5. Build a shared-glance pattern from proven gaze controls

If sustained screen attention already works, a shared glance can often be implemented without a new animation asset.

Conceptually:

```text
sustained watch pose
-> notable companion reaction begins
-> temporarily release watch pose toward user
-> speak/laugh while facing user
-> restore prior watch pose
```

This can read as the human social signal “did you see that?” even when no explicit phrase is spoken.

Important rules:

- remember the prior attention mode before releasing it,
- use a bounded hold duration,
- cancel/replace any earlier pending restore timer,
- restore only if Screen is still authorized and the live session still exists,
- never let the glance change the actual screen-perception pipeline,
- preserve webcam/gaze ownership rules.

The visible head turn is acting. Screen capture remains the perception source.

## 5a. Treat watch attention as an owned state machine

Shared-watch body language needs explicit priority, not timing guesses. The reference build regressed when a new “speaking” half-turn immediately replaced the full screen-facing pose created by the initial `watch` command. The durable repair used one-shot semantic ownership:

```text
watch activation -> protected full screen turn through its first acknowledgement
later user speech -> temporary half-turn toward user
reply/turn complete -> restore full watch pose
activity ends -> clear watch state and return center
```

Do not encode that first transition as an arbitrary delay if an explicit state flag can express the ownership rule. Natural ending phrases such as “I’m closing it down”, “I’m turning it off”, or “I’m done with this” should exit the shared activity once and cleanly restore center. A pathological speech-repetition guard is also useful, but it should be an emergency brake for repeated multi-word phrases, not another hard brevity cap.

## 6. Make listening visibly responsive

Listening micro-reactions should happen while the user is speaking, not only after the assistant starts its answer.

A useful policy is still:

```text
one user speaking turn -> zero or one semantic listening reaction
```

Extend the reaction vocabulary carefully:

- tiny nod for strong agreement/continuation cues,
- soft smile for clear amusement or positive news,
- slight brow/tilt for curiosity,
- restrained concern softening for serious material.

Ordinary speech should remain visually neutral often enough that reactions retain meaning.

## 7. Scale return greetings with absence duration

Welcome-back behavior is another place where embodiment beats a generic fixed phrase.

Once a return qualifies for acknowledgment, choose the *kind* of greeting from absence duration and recent context.

A practical three-band policy is:

```text
~10-30 minutes   -> light return recognition
~30-120 minutes  -> warmer welcome back
2+ hours         -> reunion-like recognition
```

Examples are product/personality specific. The architecture is not.

A short absence may warrant a simple acknowledgment or continuation cue. A long absence can sound more like a genuine reunion. Recent unfinished activity may make a brief `where were we?`-style continuation more natural than a generic welcome.

If the product requirement says every qualified return receives verbal recognition, do not allow the greeting model to return `NO_MESSAGE`. Use a deterministic duration-aware fallback when model generation fails or times out.

Keep **scheduled quiet hours** distinct from an **explicit user-requested quiet state**. Some products may still want a short return greeting during scheduled night hours while respecting a direct `stay quiet for two hours` command. Encode that policy deliberately instead of letting generic proactive-speech rules decide it accidentally.

Temporary OS interruption states should normally defer a pending greeting rather than erase it.

## 8. Do not make nonverbal behavior a second puppet show

The cure for too much talking is not constant animation.

Use strong scarcity:

- one listening reaction at most per user turn,
- one explicit semantic response gesture at most per assistant turn,
- laugh-only only on clear amusement,
- shared glance only for a notable shared reaction,
- closure nod only for genuinely tiny acknowledgments.

The goal is not `more animation`.

The goal is **less unnecessary language with more socially meaningful presence**.

## 9. Validate meaning, not only mechanics

Automated tests should protect the routing boundaries, but some behaviors require human observation.

Test mechanically:

- laugh-only positive/negative classifier cases,
- nonverbal acknowledgment classifier cases,
- separate micro-gesture and response-gesture cooldowns,
- shared-glance restore logic,
- absence-duration greeting bands and fallbacks,
- Screen authorization and session-existence guards.

Then validate naturally:

- Does the laugh sound like laughter rather than spoken `ha ha`?
- Does the shared glance read as social attention rather than a mechanical reset?
- Are listening nods subtle enough not to look like constant agreement?
- Does silence after `okay` feel natural rather than broken?
- Do return greetings feel proportional to the absence?

Do not mark a behavior end-to-end proven merely because the classifier and build pass.

## Exit criteria

- [ ] Tiny closure acknowledgments can use nonverbal response when appropriate.
- [ ] Listening micro-gestures do not consume later response-gesture authority.
- [ ] Clearly amused turns can produce real laughter without obligatory words.
- [ ] `funny` appearing in a factual question does not trigger laugh-only routing.
- [ ] Screen observation has a silence/nonverbal/spoken choice when useful.
- [ ] Shared glance temporarily turns toward the user and safely restores watch attention.
- [ ] Qualified return greetings scale with absence duration.
- [ ] If return acknowledgment is mandatory, model failure cannot silently erase it.
- [ ] Scheduled quiet-hours policy and explicit quiet commands are intentionally distinct.
- [ ] Human live use confirms the new behavior feels more natural rather than merely more animated.

The best test is simple: after the change, does the companion need fewer sentences to feel more present?
