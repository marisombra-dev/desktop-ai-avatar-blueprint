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

If the moment is clearly funny, a brief real laugh can be the complete response.

Do not force the model to say:

```text
That's hilarious.
That was funny.
Haha, I love that.
```

when an actual chuckle already communicates the social response more naturally.

A useful narrow response instruction is:

```text
Nonverbal social reaction only. Give one brief genuine amused chuckle or laugh and then stop. Do not speak words or narrate the reaction.
```

Keep laughter routing conservative. Explicit laughter, a direct `laugh for me` request, or unmistakable short amusement is safer than merely seeing the word `funny`.

A regression test should verify that:

```text
LOL                       -> laugh may be appropriate
Hahaha                    -> laugh may be appropriate
Laugh for me              -> laugh requested
Tell me why that was funny -> analysis/conversation, NOT laugh-only
That wasn't funny          -> NOT laugh-only
```

This distinction matters because keyword matching can otherwise let the companion escape a real question by giggling.

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
