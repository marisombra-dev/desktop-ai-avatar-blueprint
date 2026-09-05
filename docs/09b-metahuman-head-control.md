# 09a — MetaHuman Head Control Without the Rabbit Holes

This chapter documents a head-motion path that was visually proven on an assembled Unreal Engine 5.8 MetaHuman after many plausible alternatives failed.

The important discovery was not “rotate the head bone harder.” It was identifying the control contract already consumed by Epic's MetaHuman head-movement rig and feeding that contract through a curve path that was known to reach the live character.

Treat every angle and axis as rig-specific. Copy the method, not somebody else's calibration numbers.

## 1. The working control contract

The reference build ultimately drove these animation curves together:

```text
HeadControlSwitch
HeadYaw
HeadPitch
HeadRoll
```

They are consumed by MetaHuman head-movement Control Rig logic including `CR_MetaHuman_HeadMovement_IK_Proc`.

The key detail is `HeadControlSwitch`: when head rotation curves are supplied, the switch must be asserted as part of the same active control state. Sending rotation values without the corresponding authority/switch curve can produce no visible head movement.

In the reference build, the curves were inserted through an existing `CurveMap` / `ModifyCurve` path already proven to drive facial controls.## 2. Do not trust the names of the axes

The reference MetaHuman did **not** map the nominal curve names to intuitive screen-space motion.

During isolated testing:

- one nominal axis produced visible up/down head motion,
- another produced ear-toward-shoulder tilt,
- the remaining axis produced the useful left/right turn.

That mapping is a property of the assembled rig/coordinate conventions, not a universal promise.

Use an empirical probe matrix:

| Curve | Positive test | Negative test | Visible motion |
|---|---|---|---|
| `HeadYaw` | observe | observe | record actual result |
| `HeadPitch` | observe | observe | record actual result |
| `HeadRoll` | observe | observe | record actual result |

At desktop-avatar scale, tiny probes can be visually meaningless. Use a clearly visible but safe test amplitude, then reduce it after the axis is identified.

The acceptance criterion is the human's naked-eye observation of the live avatar, not a changed variable, screenshot drift, or landmark measurement.## 3. Isolate the test or the result is meaningless

Never let two head-control systems run during calibration.

The reference project briefly had a legacy bone-modification route active at the same time as the new MetaHuman curve route. The combined result produced a dramatic wrong-axis motion that could easily have been blamed on the new mechanism.

Before every axis test:

1. disable legacy `ModifyBone` / bone-rotation output,
2. disable older custom head target curves,
3. pause any other explicit head gesture,
4. keep ordinary blink/lip-sync/face animation intact,
5. drive exactly one head rotation curve plus `HeadControlSwitch`,
6. hold long enough for a human to see it,
7. release cleanly.

Do not infer success from logs alone. Logs prove delivery; the live avatar proves rendering.

## 4. Smooth motion on a low-FPS desktop avatar

A tiny desktop MetaHuman may intentionally idle at a very low frame rate to reduce heat and GPU load. That can make an otherwise correct eased head turn look like a snap because only a handful of rendered frames occur during the transition.A practical solution is a temporary motion-rate boost:

```text
idle: low FPS
head transition begins: raise FPS briefly
transition completes: restore low FPS
```

Do not leave the higher frame rate enabled merely because one gesture needed it.

Use eased interpolation rather than a step change. A smoothstep-style transition is enough:

```text
t = clamp(elapsed / duration, 0..1)
eased = t*t*(3 - 2*t)
value = lerp(start, target, eased)
```

Keep the authority switch stable through the transition. Repeatedly dropping and reasserting the switch can create solver handoff artifacts.

## 5. Distinguish a glance from sustained attention

A screen glance and “watch this with me” should not share the same lifecycle.

**Glance:** turn toward the display, hold briefly, return to center.

**Sustained watch:** turn toward the display and remain there. When speaking, move only partway back toward the user, then return attention to the display when speech ends. Clearing watch mode returns smoothly to center.Make the target position-aware. Compute the display-center direction from the avatar window's current monitor and location rather than hardcoding “always turn left.” Calibrate a comfortable maximum visually on the target avatar, then derive intermediate speaking posture from that target.

A useful priority order is:

```text
sustained attention target
    > temporary explicit head gesture
    > transient screen glance
    > ordinary idle head behavior
```

That prevents a conversational nod from yanking the avatar away from a movie or game it is visibly watching.

## 6. Nod and shake from the same proven mechanism

Once a readable left/right turn and up/down motion are identified, nod and shake should be time curves on those **already proven** channels, not a new animation architecture.

For example:

```text
shake: center -> side A -> side B -> center
nod:   center -> down -> slightly up -> center
```

Use restrained amplitude and a single cycle. The goal is unmistakable semantic communication, not maximum motion.

A correct test question is not “did the head move?” It is “did the human immediately read that as YES/NO rather than stronger idle?”## 7. The conversational model must know the gesture exists

A perfect Unreal animation is useless if the live conversational layer cannot intentionally invoke it.

The reference build initially tried to infer nod/shake silently from assistant transcript text. When the user explicitly asked the avatar to “show” yes or no, the model could explain what nodding meant but had no action it knew how to call.

The robust design uses both:

1. an explicit narrow local tool such as:

```text
desktop_head_gesture(gesture: "nod" | "shake")
```

2. a conservative automatic fallback for plainly affirmative/negative responses.

Install the tool into every fresh Realtime session just like other local tools. The provider-facing instruction should say that explicit requests to nod/shake should call the tool before verbal explanation.

Also intercept extremely narrow direct phrases locally if desired, so “nod your head yes” does not depend entirely on model tool choice.

Add duplicate suppression so the explicit tool and transcript fallback cannot both fire for the same response.## 8. Rabbit holes that did not solve the reference build

These approaches were plausible enough to consume real debugging time. Do not retry them blindly as though they are new discoveries:

- writing nominal `HeadPitch` / `HeadYaw` values through an unrelated face-side path,
- custom target curves such as project-specific `TargetHeadPitch` / `TargetHeadYaw`,
- direct `HeadRoll` experiments outside the MetaHuman head-control contract,
- direct face/body bone or component-space rotation injected upstream of the final pose,
- raw directional `headTurn*` curve fragments or U/M/D triplets without the correct authority path,
- retargeting an animation Blueprint to a newer-generation skeleton and assuming that alone will restore visible head control,
- driving body-side `ARKit_HeadRotation` while the downstream MetaHuman rig still owns final head pose,
- copying a Sequencer/Control-Rig forum switch name into a runtime rig that does not actually expose that control,
- accepting a tiny eye-only screen cue because landmarks say the pupils moved,
- calibrating with amplitudes too small to judge on a tiny desktop avatar.

Some of those techniques may be valid in another MetaHuman assembly. The lesson is not “these APIs are bad.” The lesson is: if the live rig already contains a documented head-movement processor, identify its actual inputs before inventing a parallel control system.

## 9. Skeleton mismatches are real, but not automatically causal

The reference investigation found older animation Blueprints targeting earlier-generation face/body skeleton assets while the live assembled character used newer-generation skeletons. Duplicate retarget tests compiled cleanly, yet large live head commands still produced no visible turn.

Therefore:

> a genuine asset mismatch is evidence worth investigating, not proof that it explains the current symptom.Retarget in a duplicate first. Compile. Test visibly. If it does not solve the behavior, restore the approved baseline rather than keeping an unproven structural change.

## 10. Epic 5.8 facts that help frame the problem

Epic's MetaHuman documentation says assembled MetaHumans are primarily driven from the Body skeletal mesh, with face bone transforms propagated from the Body through post-processing. Epic also documents UE 5.8 issues/fixes involving body-to-face head/neck propagation and LookAt behavior.

That explains why “I changed a face control” does not necessarily mean the rendered head bone will follow it.

Epic support also describes the head translation/rotation curves plus `HeadControlSwitch` as inputs used by MetaHuman head-movement Control Rig logic. Check the current engine version before assuming the same implementation names or behavior.

See `SOURCES.md` for the relevant official and Epic Developer Community references.

## 11. Validation sequence

Do not call the feature complete until all of these pass:

- [ ] one isolated axis produces an unmistakable visible motion,
- [ ] opposite sign produces the opposite visible direction,
- [ ] legacy head paths are disabled during the test,
- [ ] a screen glance turns and returns smoothly,
- [ ] sustained watch holds its target without continuous high FPS,
- [ ] speaking posture partially returns toward the user and then resumes watch,
- [ ] nod reads clearly as YES,
- [ ] shake reads clearly as NO,- [ ] explicit spoken request can intentionally invoke nod/shake,
- [ ] ordinary conversational fallback does not overfire,
- [ ] lip sync remains correct,
- [ ] blink/gaze remain correct,
- [ ] no face/clothing regression appears,
- [ ] no mouse capture or foreground-focus regression appears,
- [ ] motion returns to the approved baseline when released.

## 12. Recovery rule

Keep a byte-for-byte or source-control checkpoint of the last visually approved animation/control state.

If a new motion layer becomes jumpy, deformed, or unstable, restore that checkpoint **before** debugging the next idea. A stable binary running old code while the source tree contains half-finished experiments is dangerous; rebuild from a known-good source and cold-restart the avatar when validating production behavior.

The shortest summary of the entire investigation is:

> Use the MetaHuman rig's own head-control contract, empirically map the visible axes, keep only one head authority active, interpolate at enough rendered frames to look human, and give the conversational model an explicit gesture action.
