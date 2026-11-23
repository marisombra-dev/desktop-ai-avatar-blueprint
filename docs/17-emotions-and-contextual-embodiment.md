# 17 — Facial emotions, conversation context, attention and nonverbal presence

Applies to both paths. Path A realizes these cues as Unreal facial animation curves/bones; Path B applies bounded LivePortrait-style 3D facial-keypoint deltas through a Ditto-style renderer. No photos, private prompts, voice recordings or identity data are provided.

## 1. What makes the expression system conversational

A common failure is an avatar that *says* “I am smiling” without moving, or a model that narrates “(smiles warmly)” as stage directions. Keep **spoken content** and **animation intents** separate. The answer text is genuine conversational content; a private sideband chooses an optional visual cue. The face renderer must accept the cue and create measurable, visible movement.

The inspected system uses a palette:
- neutral: no forced affect; natural eye/blink/pose still runs.
- smile: friendly greeting or directed warmth, smile visible primarily in cheeks, corners and eyes.
- amused: less wide than smile, subtle asymmetric cheek/eye and small head inclination.
- delighted: visibly broader grin, not merely a larger name for the exact same tiny smile. Avoid opening the jaw while speech owns lips.
- curious: raised brow interest and a restrained 3D head tilt; during listening the default is much lower strength.
- concerned: gentle brow contraction and settled mouth corners, no inappropriate grin.

Do not silently map every direct “big smile” instruction to a barely perceptible smile. Distinguish neutral, small smile and delighted at the real display size, with reference stills and a human pass. Exact per-keypoint weights are face-dependent; calibrate them against the private reference and keep the bounded mapping in a private per-face file.

## 2. Three sources of intent, in priority order

1. **Direct valid user command:** “smile,” “show me a big smile,” “look curious,” “look concerned,” “nod,” “shake your head,” etc. A local deterministic parser may handle these even while the model is slow. Reject negations, quotations, hypotheticals, status questions and sentences ABOUT a command. Offer an English/Spanish vocabulary without insisting on exact wording.
2. **Model-selected silent cue:** optional leading directives of the form `<face:smile>`, `<face:amused>`, `<face:delighted>`, `<face:curious>`, `<face:concerned>`, `<face:neutral>`. This is an *internal* output protocol, not stage directions to read aloud. Parse at the beginning of the reply, withhold incomplete streaming tags, strip the entire directive before TTS and before user-visible transcript. Never speak the literal tag.
3. **Local bounded contextual fallback:** greetings, affection, visible humor, affirmative/negative gestures, interest, difficult news or an accepted ASR draft can produce an optional expression when no explicit cue is available. Be conservative: a speculative quote or “I am not worried” must not produce concern merely because it contains the word “worried.”

Use a *separate* local listening path on accepted incremental Whisper/ASR drafts, with no additional model calls. This preview path is lower-priority than final user commands and final model intent; it expires when listening ends or a newer draft revision supersedes it.

Example event:

~~~json
{
  "kind": "mood",
  "name": "amused",
  "strength": 0.68,
  "durationMs": 3600,
  "at": 0
}
~~~

The timestamp is illustrative only: in a live system stamp it at receipt. Clamp [0,1] strength, keep durations short and record turn/utterance ownership; never replay old events after voice cancellation.

## 3. Timing and arbitration

A useful priority matrix:

| Situation | Visual priority |
|---|---|
| Mute/privacy/end voice or stale turn | Cancel/clear prohibited cues |
| Explicit screen look | Hold head and gaze on intended screen anchor, then restore |
| Explicit facial command | Show requested expression, with a bounded lease |
| Serious/concerned social context | Concern; suppress reciprocal camera grin |
| Current camera gaze / smile | Follow calibrated gaze and optionally return smile |
| While speaking | TTS drives mouth; emotion drives eyes/brow/cheek |
| Listening draft | Weak interested or contextual cue |
| Idle | Gentle blink/micro head, rarely a glance |

Expiring cues should ease in/out rather than snap to neutral. Repeated same-name cues renew the lease without restarting the beginning of the transition. Crossfade mutually exclusive moods in a single mixer. Suggested envelopes from the reference: approximately 0.3–0.4 seconds in and 0.5–0.8 seconds out, with a smoothing constant near 0.24 seconds; benchmark at target frame rate and don't present them as universal values.

One audio frame clock is authoritative during speaking. Expression offsets are overlaid on already generated motion before each render batch, not by replacing the mouth opening. The reference caps prepared visible frames ahead of speech to about 36 displayed frames, so a live gaze/face cue does not wait through an excessively long prefetched animation queue.

## 4. Native portrait implementation

The inspected face pipeline has 21 three-axis facial landmarks, stored as 63 numbers. Example expression code builds a zero delta of shape (1,21,3), modifies carefully calibrated cheek/mouth/eye/brow landmarks for the named emotion and reshapes to (1,63). Apply it in the **canonical native LivePortrait expression space** before driving pose transformation and stitching. Do not deform the whole flat image in CSS or create a second mouth controller.

For delighted, brighten cheeks and widen mouth corners while respecting actual speaking jaw. For concerned, make brow/eye and mouth-corner settling **visible** but avoid a theatrical frown. Different portrait proportions require different numeric coefficients. Save the exact calibrations locally with image/rig hash and regression stills; do not publish these identifying artifacts.

The explicit full-smile parser should test variations of “show me a really big smile,” “grin wider,” “smile for me,” and casual ASR lead-ins. It must not fire on “he didn't smile,” “why won't you smile,” “we need to fix the smile code,” or quoted test cases. For parser testing, use synthetic text only.

## 5. Native head/eye control and source ownership

- Apply yaw/pitch/roll as small **3D keypoint rotations**, never entire-photo turns.
- Maintain deliberate screen LOOK, live camera GAZE, optional presence and reciprocal smile as separate stale-expiring sources.
- Screen LOOK has priority; clear restores camera gaze. Do not let camera tracking steal screen focus.
- Camera gaze should only work when the phone/camera lease actually owns that feed and the relevant permission is active. Distinguish camera-based desk presence/gaze from separately enabled “let the AI see camera images.”
- Use current pose/gaze snapshot on service rebind; require correct ownership and let expired cues die.
- Blink is a separate eyelid waveform with soft closure (a hard eye squeeze was rejected in the reference); human-review at normal render size.
- Idle movement should be irregular and restrained; don't perform continuous neural idle inference when hidden or unowned.
- Response gesture cues: affirmative answer → nod, clear refusal → shake, actual uncertainty → shrug. Semantic gestures are optional, not replacements for truthful spoken answers.
- The user can ask to focus quietly, stay nearby or move away. Contextual presence honors those requests rather than interpreting ordinary inactivity as a crisis.

## 6. Natural conversation, not performance

The chosen agent's dialogue instructions should make responses feel like normal speech, not a theatrical demonstration. Exclude stage directions and emoji-name pronunciations from synthesized speech without stripping meaningful text or bilingual sentences. Do not force a constant smile merely because conversation is friendly. Do not have the avatar ask for feedback after every expression. Keep private persona examples and personal relationship context in the user's own workspace, not this public blueprint.

The original screen/camera/proactive chapters 05c, 07–09 still apply. Expressions must be tied to active social context and trusted sensor evidence, not guesses about private feelings.

## 7. Regression matrix

For EACH renderer, test all of the following after expression changes:

- [ ] Local request “smile for me” changes pixels/landmarks and is plainly visible to the human.
- [ ] “Show me a really big smile” is distinguishable from a small smile.
- [ ] Amused, curious and concerned each create visibly different eyes/brows/mouth/head pose.
- [ ] “Don't smile,” quotes, debugging discussions and negations never produce an accidental smile.
- [ ] An affectionate greeting may smile; serious news suppresses inappropriate grinning.
- [ ] A spontaneous smile and a face requested by command return smoothly to neutral without frozen cheeks.
- [ ] Valid model tags do not appear in audio/transcripts; partial tags cannot leak during streaming.
- [ ] Listening-expression events never arrive after cancel, mute or a newer ASR revision.
- [ ] Native lip sync remains accurate while an emotion and screen/camera gaze are active.
- [ ] Smile reciprocity works with relevant Camera/Phone + Screen combinations; look precedence stays deterministic.
- [ ] A face-only restart and dev hot reload leave BOTH speech player and face bound to the same controller.
- [ ] Direct voice commands are tested in a real running window; tests that only assert emitted mood names are not a pass.

**Reference status 2026-11-23:** an expression-visibility regression occurred during recent work. The user subsequently confirmed the smile was fixed. Record it as **human-confirmed fixed**; continue keeping the smile visibility gates above. Do not claim every expression is equally obvious unless separately checked.
