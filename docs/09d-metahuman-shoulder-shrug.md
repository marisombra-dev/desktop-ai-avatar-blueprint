# 09d — MetaHuman Shoulder Shrug / Body-Gesture Layer

**Status: END-TO-END VISUALLY AND NUMERICALLY PROVEN IN THE REFERENCE BUILD**

A small shoulder shrug sounds trivial. On an assembled UE 5.8 MetaHuman it became one of the more deceptive animation problems in the reference build because several implementations compiled, accepted runtime input, and changed the gesture alpha while producing exactly zero visible clavicle motion.

This chapter records the route that finally worked and the failure modes worth avoiding.

## 1. Put body-bone modification after the final body-pose blend

The working AnimGraph order is:

```text
all normal body-pose branches
        ↓
final Blend Poses by bool
        ↓
Convert Local to Component Space
        ↓
Transform (Modify) Bone: clavicle_l
        ↓
Transform (Modify) Bone: clavicle_r
        ↓
Convert Component to Local Space
        ↓
Output Pose
```

Do not hide the shrug layer inside only one branch of the final body blend. The reference build initially did that, which made the gesture dependent on which branch owned the pose.

## 2. The exposed Translation-pin trap

The Modify Bone nodes appeared correctly configured with an internal additive translation of approximately `Z +2.5 cm` in component space. Yet a fresh asset inspection showed the exposed `Translation` input pin at `0,0,0`.

That exposed pin won over the internal property. Runtime diagnostics showed the shrug alpha reaching almost `1.0`, while both clavicle transforms stayed unchanged.

Worse, programmatically setting the exposed pin default to `0,0,2.5` reported success, compiled, saved, and then silently reconstructed back to zero on a fresh reopen.

The durable fix was to drive the Translation input with a real graph connection instead of relying on the pin default.

Conceptually:

```cpp
UFUNCTION(BlueprintPure, meta=(BlueprintThreadSafe))
static FVector GetShrugTranslation()
{
    return FVector(0.0, 0.0, 2.5);
}
```

Wire that function's `ReturnValue` into the `Translation` input of both clavicle Modify Bone nodes. After compile/save, close and freshly reopen the asset and verify that the links still exist.

This is the most important debugging lesson in this chapter: **a property inspector saying `2.5` does not prove the evaluated pose node is receiving `2.5`. Inspect the actual exposed pin and its links.**

## 3. Working Modify Bone settings

For the reference avatar, both shoulder nodes use:

```text
Bone: clavicle_l / clavicle_r
Translation mode: Additive
Translation space: Component Space
Translation: driven by connected FVector source
Alpha: driven by a transient shrug envelope
LOD threshold: unrestricted during validation
Rotation: ignored
Scale: ignored
```

The reference translation magnitude was `2.5 cm`, but treat that as a calibration example rather than a universal value. Body proportions, camera crop, clothing, and desktop window size all affect what reads naturally.

## 4. Prove bone movement numerically before judging it visually

Do not repeatedly ask a human to stare at an avatar while the graph may still be doing nothing.

At gesture start, peak, and release, log the live component-space transforms for `clavicle_l` and `clavicle_r` together with the gesture alpha.

The reference build finally proved the fix with values equivalent to:

```text
before: Z 138.33 / 138.33, alpha 0.000
peak:   Z 140.83 / 140.83, alpha 1.000
after:  Z 138.33 / 138.33, alpha 0.000
```

That is a real 2.50 cm rise on both sides followed by an exact return to baseline. Only after that proof did visual tuning resume.

## 5. A readable shrug needs acting, not just shoulders

Once the clavicles actually moved, the first version was mechanically correct but too quick to register as a social gesture.

The approved reference timing became roughly `1.90 s` total. Using normalized `T = elapsed / 1.90`:

```text
T 0.00–0.28  ease shoulders up     (~0.53 s)
T 0.28–0.68  hold at full lift     (~0.76 s)
T 0.68–1.00  ease back down        (~0.61 s)
```

The shoulder height stayed unchanged. Only timing was stretched.

The final uncertainty look combines that shoulder envelope with:

- a gentle head tilt of about 6 degrees,
- a low-intensity happy/soft-smile expression around 0.22,
- the same envelope so the parts arrive and release together.

The result reads as a human `beats me / I don't know` gesture instead of a disconnected shoulder animation.

## 6. Give the gesture a narrow semantic meaning

Use this gesture for genuine uncertainty, not every hedge word.

Good triggers include response starts such as:

```text
I don't know
I'm not sure
beats me
no idea
I couldn't tell you
```

Do **not** automatically shrug for `maybe` or `possibly`. Also keep disagreement separate: `I don't think so` should remain a NO/head-shake gesture rather than uncertainty.

## 7. Failure modes worth remembering

The reference build tried or investigated all of these before the working route was proven:

- an additive/montage-style shoulder animation that did not affect the live clavicles,
- Modify Bone nodes placed inside only one branch of the final body blend,
- runtime gesture state where alpha changed correctly but bones did not,
- setting an exposed vector-pin default that appeared to save but reset to zero after Blueprint reconstruction,
- suspecting the MetaHuman body post-process AnimBP before proving whether the main pose had moved at all.

The body mesh did have a MetaHuman body post-process AnimBP. That fact alone was not the root cause. Numeric transform logging was what separated an upstream no-op from a downstream overwrite hypothesis.

## 8. Validation checklist

Before calling a body gesture complete:

- [ ] The modification is after the final normal body-pose blend.
- [ ] Component/local-space conversion surrounds skeletal-control nodes correctly.
- [ ] The actual exposed Translation inputs are connected to a durable source.
- [ ] A fresh reopen preserves those links.
- [ ] Runtime alpha reaches the expected peak.
- [ ] Live clavicle transforms measurably change at peak.
- [ ] Both clavicles return to the exact baseline afterward.
- [ ] The motion reads naturally at the final desktop crop.
- [ ] Clothing/collar/hair do not regress.
- [ ] Head/face additions do not fight nod, shake, gaze, lip sync, or sustained attention.
- [ ] The semantic trigger is narrow enough that the gesture stays special.

A shoulder shrug should be one small mannerism. Getting it right should not require destabilizing the rest of the MetaHuman.
