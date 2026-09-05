# 09c — MetaHuman Expression Calibration

Facial expression work should be treated as **acting calibration**, not as a lookup table where an asset named `Happy` automatically looks happy on every assembled MetaHuman.

The reference build reached this stage only after lip sync, idle, gaze, head control, and wake/conversation behavior were stable.

## 1. Start from MetaHuman-native expression data

UE 5.8 MetaHuman assets expose semantically named facial expression channels such as brow raise/down, eye widen/squint, cheek raise, mouth corner movement, jaw opening, and related controls.

Epic's expression system is useful as a source of authored facial states, but the final visible result still depends on the assembled character, neutral face, camera distance, active animation layers, and timing.

Do not assume a stock pose is visually correct just because its asset name matches the intended emotion.

## 2. Sample static expression poses correctly

A key reference-build failure came from treating a very short static facial pose as though it were an ordinary time-varying animation.

Sampling near the middle of a one-frame/very-short pose can interpolate toward neutral and dramatically weaken the authored expression.

For static pose assets, inspect the curve data and find the strongest meaningful sample rather than blindly using `length / 2`.

Conceptual peak search:

```cpp
float bestScore = -1.0f;
float bestTime = 0.0f;
for (int step = 0; step <= 24; ++step) {
    const float t = length * (float(step) / 24.0f);
    float score = 0.0f;
    for (const auto& curve : expressionCurves) {
        score += FMath::Abs(curve.Evaluate(t));
    }
    if (score > bestScore) {
        bestScore = score;
        bestTime = t;
    }
}
```

The reference build found that several stock static poses were strongest at the beginning of the clip, not the midpoint.

## 3. Build a visible-expression test harness

Before connecting emotion to conversation, expose one local command that can trigger a named expression with explicit intensity and duration.

Example protocol:

```text
EXPR|HAPPY|<intensity>|<duration>
EXPR|SURPRISE|<intensity>|<duration>
EXPR|FEAR|<intensity>|<duration>
```

Keep the receiver local-only, whitelist the expression names, clamp numeric values, and always return to the underlying automatic face state.

Test one expression at a time while the avatar is otherwise idle. Record what the human observer actually sees, not what the control names suggest.

A useful log is:

```text
intended emotion | source pose/custom recipe | intensity | duration | observed read | keep/reject
```

## 4. Intensity and duration are separate dimensions

More intensity does **not** necessarily produce a clearer emotion.

In the reference build, increasing one stock anger pose made the face read *less* angry because additional facial channels diluted the useful signal. Returning to a lower amplitude and increasing the hold time produced a much stronger emotional read.

Therefore tune in this order:

1. find a face shape that reads correctly,
2. freeze that shape,
3. tune duration,
4. only then consider another amplitude change.

Do not change shape and timing at the same time unless the previous trial clearly failed.

## 5. Some stock poses should be renamed, not "fixed"

A stock emotion that consistently reads as a different but useful state can become part of the avatar's vocabulary under the *observed* meaning.

The reference build found a low-intensity stock fear pose that read as quiet, inward, pensive concern rather than fear. It was kept as a separate subtle state instead of being forced into the wrong semantic label.

## 6. Custom recipes can outperform stock full-face poses

If a stock pose is dominated by one misleading channel, build a small recipe from the semantically useful controls instead of raising the whole pose amplitude.

Examples of useful control families:

- `browRaiseIn*` / `browRaiseOuter*`,
- `eyeWiden*` / upper-lid lift,
- cheek/squint controls,
- mouth-corner pull/depress/stretch,
- restrained jaw opening.

In the reference build, stock Surprise initially read mostly as "mouth open." A custom combination of bilateral brow lift, moderate eye widening, and only a small jaw opening produced an unmistakable surprise expression.

Likewise, a custom fear recipe using stronger inner-brow lift, eye/upper-lid widening, slight pupil widening, mouth tension, and very little jaw opening produced a clear brief alarm/"yikes" read without becoming generic shock.

## 7. Preserve asymmetric expressions

Not every useful expression is a full-face emotion.

A deliberately asymmetric raised eyebrow became a readable skeptical/"really?" gesture. The useful version combined a strong raise on one side with a smaller inner-brow contribution and slight opposite-side contrast, then held long enough to register.

These expressions are especially valuable because they can communicate attitude without turning the whole face into an emotion mask.

## 8. Do not stack generic mood and calibrated expression blindly

A legacy mood layer may already be adding broad happiness/sadness/fear values at response start.

If a calibrated expression is triggered on the same turn, temporarily suppress the generic response-start mood so two different face systems do not fight each other.

Recommended priority for one response:

```text
explicit approved expression
    > queued semantic face gesture
    > generic response-start mood
    > ordinary automatic face state
```

Reset the bypass after that response so ordinary behavior resumes.

## 9. Remove obsolete random micro-gestures after strengthening them

A micro-gesture that was harmless at low amplitude can become conspicuous after its recipe is improved.

The reference build had an old random speech-start eyebrow twitch. After the eyebrow gesture was strengthened into a readable skeptical expression, that random listener twitch made a friendly greeting briefly look confused or doubtful.

The fix was not to weaken the approved eyebrow. The obsolete random trigger was removed, while content-aware listening reactions were retained.

This is a general rule: whenever you strengthen a gesture, search for **all old call sites** that can trigger it.

## 10. Greeting smiles should feel like a response, not a switch

For a friendly greeting, the reference build ultimately used the approved happy expression rather than a generic happiness pulse.

The best live result did **not** begin with an instantaneous grin. The face warmed into a genuine smile as speech began, which read more naturally than a hard expression cut.

Natural validation matters here. A manual expression smoke test proves that the control path works; an ordinary unscripted greeting proves that event ordering and competing animation layers also behave correctly.

## 11. Expose expressions to Realtime as a narrow local tool

A local Realtime function can expose only the approved palette, for example:

```text
happy
surprise
concern
anger
fear
really
```

Tool guidance should say to use expressions **sparingly**, only when the emotional beat genuinely benefits from visible emphasis or the user explicitly asks for one.

Keep the tool local. It changes the visible body; it should not rewrite agent personality, durable memory, or the long-lived agent prompt.

See `examples/approved_expressions.ts` for a sanitized pattern.

## 12. Validate speech overlap separately

A silent expression can look excellent and still interfere with lip sync when speaking.

For each full-face expression, separately test:

- silent onset,
- expression + normal speech,
- expression + large phoneme mouth opening,
- release back to automatic face state.

If mouth/jaw curves compete with speech, consider a two-stage design: a brief full expression before speech followed by an upper-face/speech-safe subset while talking. Do not weaken a proven silent pose until that A/B test shows a real problem.

## 13. Reference-build validation outcome

At the 2026-09-05 snapshot, the following visible reads had been individually approved by the human observer on the assembled avatar:

- genuine happy smile,
- clear surprise,
- subtle concern / sadness,
- asymmetric skeptical "really?" eyebrow,
- restrained anger that becomes distinctly menacing when held,
- clear brief fear / "yikes".

The greeting smile was then validated again in ordinary live conversation after removal of the obsolete random speech-start brow trigger. The user reported that the avatar naturally seemed happy as he began speaking, without needing to be prompted to smile.

Exact curve amplitudes and timing constants are intentionally not presented as universal defaults. They are calibration values for one face, camera framing, animation stack, and desktop rendering setup. Copy the method, then tune your own character.

## 14. Expression validation checklist

Before adding an expression to conversational behavior:

- [ ] Can a human identify the intended read without being told its label?
- [ ] Did you test duration separately from amplitude?
- [ ] Does a stronger amplitude actually improve the read?
- [ ] Does it return cleanly to idle?
- [ ] Does it coexist with blink and gaze?
- [ ] Does it coexist with lip sync when speech overlaps?
- [ ] Are competing generic mood layers suppressed for that moment?
- [ ] Have obsolete/random call sites for the same control been removed or retuned?
- [ ] Is conversational use sparse rather than constant?
- [ ] Is the recipe checkpointed before further tuning?

A facial expression is not finished when the command executes. It is finished when the **visible emotional meaning** survives the complete live stack.