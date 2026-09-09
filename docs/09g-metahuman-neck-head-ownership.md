# MetaHuman neck distortion: head ownership, Face post-process, and the fix

This chapter documents a difficult UE 5.8 MetaHuman failure mode from the reference build: ordinary head motion and a retargeted pointing animation could make the neck visibly stretch or deform even though the source animation itself was sane.

The final fix was not to rewrite the animation. It was to establish one owner for structural head/neck motion and stop a Face post-process Control Rig from fighting that owner.

## The symptom

The assembled MetaHuman looked correct while idle, but some head motion or full-body animation could produce a distorted neck. The problem was especially easy to reproduce with a standing right-hand pointing animation.

Offline inspection showed that the source and retargeted animation did **not** contain destructive neck/head translation. That was the first major clue: the deformation was being introduced by the runtime animation stack.

## The root cause

In the reference build, Body pose propagation and the Face post-process were both participating in head/neck placement.

The specific conflicting stage was the Face post-process Control Rig used for head movement (`CR_MetaHuman_HeadMovement_IK_Proc`). With Body supplying the structural pose, that Face-side head solver could re-solve the head/neck chain and create the visible stretch.

Disabling the entire Face post-process made the neck instantly correct, but that was only a diagnostic. It also removed useful facial behavior. The validated QA isolation was narrower:

- Body owns structural neck/head pose.
- Face follows the Body pose.
- Bypass the Face-side HeadMovementIK Control Rig.
- Keep RigLogic/facial curves active.

## What the runtime measurements proved

Do not trust the viewport alone when two animation systems appear to be fighting. Log transforms at the Body and Face stages.

The decisive measurements in the reference build showed:

1. the Body `head` transform changed when the procedural head control ran,
2. the Face `head` transform matched the Body `head` transform exactly,
3. `FACIAL_C_FacialRoot` was parented directly to `head`,
4. facial descendants such as nose, jaw, and eye kept stable transforms relative to `head` while the head moved.

That ruled out a hidden descendant counter-rotation. Copy Pose was working. The remaining problem was the extra Face-side head solver and, later, axis interpretation.

A useful diagnostic rule is:

> Compare OFF versus ON head motion and inspect both component-space transforms and transforms relative to `head`. If Face follows Body and facial descendants stay constant relative to `head`, do not keep hunting for a downstream cancellation that is not there.

## A trap that invalidated several early tests

Programmatic AnimGraph editing has a sharp edge: an exposed Blueprint pin can override the underlying node struct property.

In this case, code set the `Transform (Modify) Bone` node's rotation struct, but the exposed `Rotation` pin still contained `0,0,0`. The saved Blueprint therefore evaluated the pin value, not the struct value. Several early "constant head rotation does nothing" tests were false negatives.

After any scripted AnimGraph edit:

- inspect the actual exposed pin value,
- save and cold-reload the asset,
- verify the connection/default survived,
- and confirm the runtime bone transform actually changes.

Never declare an animation stage broken from an authoring script alone.

## The local-axis mapping was not semantic yaw/pitch

Once Body-owned head motion was genuinely evaluating, the remaining odd behavior was simply local bone-space mapping.

On this reference MetaHuman's `head` bone, additive bone-space rotation behaved as follows:

| Bone-space Rotator component | Visible anatomical motion |
|---|---|
| Pitch | tilt toward a shoulder |
| Yaw | look up/down |
| Roll | look left/right |

So semantic controls had to be remapped:

- semantic left/right yaw -> bone-space Roll,
- semantic up/down pitch -> bone-space Yaw,
- shrug/side tilt -> bone-space Pitch.

The important lesson is not that every MetaHuman will use this exact mapping. The lesson is to **probe the actual rig and space** instead of inferring anatomy from Euler labels.

A simplified version of the final mapping was:

```cpp
return FRotator(
    5.0f * ShrugTilt,
    FMath::Clamp(SemanticPitch, -18.0f, 18.0f),
    FMath::Clamp(SemanticYaw, -35.0f, 35.0f));
```

Here the `FRotator` components are being used according to the empirically measured bone-space axes above, not according to semantic variable names.

## Approaches that did not solve this case

These were useful diagnostics, but not the final solution:

- removing neck/head tracks from the pointing animation,
- forcing Face attachment to a head socket,
- switching the Face to Mesh Pose,
- filtering only `FACIAL_C_FacialRoot`,
- bypassing only the second Copy Pose stage,
- disabling the entire Face post-process as a permanent fix.

The whole-Face-PP-off test was especially valuable because it proved the deformation lived in that stack, but shipping it would freeze or remove wanted facial behavior.

## Validated QA architecture

1. Let the Body animation path own structural neck/head motion.
2. Let Face Copy Pose follow Body.
3. Bypass the Face post-process HeadMovementIK stage that competes for the same structure.
4. Preserve RigLogic and facial curves for expressions and lip sync.
5. Apply procedural nod/shake/look/tilt on the Body side with empirically verified local axes.
6. Keep eye/gaze behavior conceptually separate from structural neck/head ownership.

## Regression results after the fix

The reference build was visually re-tested with the neck remaining normal through:

- left/right/up/down look,
- nod,
- head shake,
- shrug,
- smile and the full facial-expression sweep,
- left/right wink and brow controls,
- audio-driven lip sync,
- and the original full-body pointing animation in the wide view.

Eye-contact/webcam tracking was not part of this nighttime regression because the room was too dark for a meaningful camera test. It should be rechecked separately in normal lighting.

This result is **validated in QA, not yet productionized**. The next step is to replace the QA-only Face/Body assets and command-line flags with the permanent graph architecture, then repeat the same regression with no QA flags.
