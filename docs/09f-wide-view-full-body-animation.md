# 09f — Unifying Close View and Wide View for Full-Body MetaHuman Motion

This chapter documents an in-progress but highly reusable transition from a seated desktop MetaHuman to a full-room embodiment with walking, standing conversation, environmental idle behavior, and a return-to-chair path.

The reference project began with two conceptual phases: a proven close/seated desktop avatar and a separate full-room “wide view.” That separation quickly became confusing because the user was interacting with one AI person, not two actors. The architecture was therefore changed so Wide View is a physical/camera state of the same person.

The strongest lessons so far are architectural, cinematic, and skeletal. Several tempting technical fixes for full-body MetaHuman neck distortion were also tested and rejected. Those failures are documented here so another build does not repeat them blindly.

## 1. Treat Wide View as embodiment state, not a second avatar

The close and wide presentations should share one identity, one voice session, one conversational state, and one behavior model.

The reference state model is:

```text
CLOSE_SEATED
WIDE_ACTIVE_CONVERSATION
WIDE_IDLE
RETURNING_TO_CHAIR
```

Changing camera/view should not automatically create or destroy the voice connection.

If the user is already talking when Wide View is requested, the conversation continues through the transition. The avatar begins to rise, the view changes, and conversation continues while the avatar stands or walks.
## 2. Give the controls semantic meaning

Once the avatar can inhabit the room, a generic `Mic` button becomes ambiguous. The reference design separates two intents:

```text
Talk  = open/close conversation where the avatar currently is
Phone = deliberately ring/summon the avatar back to the chair
Wide  = change physical/camera mode, preserving an active conversation
```

`Talk` should not ring anything and should not force movement. If the avatar is standing at a window, Talk begins or ends conversation there.

`Phone` is an environmental event. It can ring, interrupt idle behavior, cause the avatar to return to the chair, interact with the room on the way back, and then cut to the close seated view.

This distinction also makes autonomous behavior possible. When Wide View is idle and Talk is off, the avatar can pace, revisit the window, look around, stretch, or eventually decide to return to the chair without the user explicitly pressing Phone.

Do not allow random autonomous return in the middle of active conversation unless that behavior is intentionally part of the character.

## 3. Use film grammar to avoid unnecessary animation engineering

A technically perfect sit-to-stand animation is not required if the camera can hide the difficult part.

The reference plan uses a match cut:

```text
close view: seated avatar leans forward and begins to rise
CUT / expand to Wide View
wide view: avatar is already standing correctly in front of the chair
```
The viewer sees enough upper-body motion to infer the rest. This removes the need to solve pelvis translation, foot placement, chair collision, and camera composition simultaneously.

The reverse transition can use the same trick. The reference return concept is:

```text
phone rings
avatar walks back to chair
avatar shoos cat / clears chair
camera cuts to close view
avatar is seated and answers
```

The sit-down itself never needs to be visible.

This is not a hack to apologize for. It is normal visual storytelling applied to an interactive character.

## 4. Position a standing MetaHuman from a foot contact, not the seated actor origin

A seated avatar is often positioned by pelvis/butt contact with the chair. Reusing that actor origin for a standing animation can place the character inside or beside the chair even when the animation itself is valid.

The reference build solved standing placement with an anchor method:

1. choose a planted-foot contact bone or socket, preferably near the ball/toe contact,
2. attach or compute a world-space marker at that foot contact,
3. place a second marker at the desired standing point on the floor,
4. translate the whole actor by `floor_target - foot_marker`,
5. verify the foot marker lands exactly on the floor target after the move.

In the reference QA, the computed post-alignment error was exactly `0,0,0`. More importantly, the human observer immediately judged the result as looking like the avatar had just stood up from the chair.
This is preferable to repeated visual nudging because the standing origin becomes derived from anatomy and scene geometry rather than a guessed actor coordinate.

If the first Wide View frame is meant to imply “just stood up,” put the floor target directly in front of the chair on a plausible human centerline. Do not place the actor off to one side merely because that is convenient for the camera.

## 5. Curate animation donors instead of importing whole packs into production

The reference build found useful motion in several external animation packs, but direct migration pulled large amounts of irrelevant mannequin meshes, materials, textures, and demo props into the target project.

A safer workflow is:

```text
Fab / external pack
    -> sandbox project
    -> visual review
    -> shortlist clips
    -> build/verify retarget bridge
    -> bake selected clips onto the target MetaHuman skeleton
    -> migrate only target-native results
```

Useful categories found during the reference search included:

- seated upper-body stretch and side-lean motions,
- a hands-behind-head seated stretch,
- standing Talk / LookAround / ScratchArm,
- Point / Wave / emotional reactions,
- a sit/stand donor whose early torso motion can sell the close-view rise cue.

The important lesson is not the specific commercial/free pack. It is to use animation packs as donor libraries and keep production free of their demo baggage.
## 6. Prefer MetaHuman-native locomotion when it already exists

UE 5.8 includes optional MetaHuman locomotion assets with standing idle plus walk start/loop/stop variants. The reference project confirmed that these clips use real root motion and the expected MetaHuman base bone layout.

That is a better starting point than making a MetaHuman inherit a mannequin gait unnecessarily.

The reference build also created target IK/retarget infrastructure and automatically characterized the MetaHuman with 29 retarget chains. Donor skeletons were characterized to the same chain count, after which representative external clips were baked successfully onto the target MetaHuman skeleton.

Smoke-test one animation from each donor family before batching the rest. A retarget operation reporting success is not enough. Inspect shoulders, elbows, wrists, spine, neck, feet, and clothing on the live assembled character.

## 7. Context matters as much as whether an animation is technically good

A clean pointing animation was technically excellent but looked inappropriate as the first motion immediately after standing from the chair.

The reference behavior was changed to:

```text
rise cue
cut to Wide View
neutral standing idle for a beat
turn
walk toward environmental target
settle
then allow contextual gestures
```

Point became a window-only/contextual behavior. Near a live window it can support a proactive invitation such as “look at that,” then wait for the user to decide whether to start Talk.
## 8. Full-body animation exposed a separate MetaHuman neck/head-authority problem

The seated reference build already had a visually proven face/head-control system. Larger body mocap exposed a deeper conflict: neutral standing could look correct while torso/shoulder motion made the neck stretch badly.

Offline inspection showed the Point source and retargeted clip did not contain destructive neck/head translation. Runtime measurements then showed Body `head` motion was reaching Face correctly and facial descendants stayed stable relative to `head`. Copy Pose was not secretly canceling the motion.

The decisive diagnostic was the Face post-process. Disabling the whole Face post-process made the neck immediately correct, but also removed wanted facial behavior. Bypassing only `CR_MetaHuman_HeadMovement_IK_Proc` preserved RigLogic/facial animation and fixed the active-motion neck distortion.

## 9. Important false leads and diagnostics

The following did not solve this assembly as permanent fixes: `Copy Pose From Mesh -> Use Mesh Pose`, forcing Face to a head socket, stripping neck/head tracks from Point, filtering only `FACIAL_C_FacialRoot`, bypassing only the second Copy Pose stage, or disabling the entire Face post-process.

A runtime `EnableHeadMovementIK=False` property test also did not prove the solver node was actually removed from the evaluation path. The later graph-level bypass of `CR_MetaHuman_HeadMovement_IK_Proc` was the decisive test.

Another major trap was scripted AnimGraph authoring. A `Transform (Modify) Bone` struct could contain a non-zero rotation while its exposed Blueprint `Rotation` pin still saved as `0,0,0`, overriding the struct and creating a false no-motion result. Always inspect exposed pins after save/cold reload and verify the live bone transform.

## 10. Validated QA architecture after the fix

The current validated QA route is:

```text
Body owns structural neck/head motion
Face Copy Pose follows Body
Face HeadMovementIK Control Rig bypassed
RigLogic/facial curves preserved
procedural look/nod/shake applied on Body
```

The target head bone's local axes were mapped empirically: bone-space Pitch = shoulder tilt, Yaw = up/down, Roll = left/right. After semantic controls were remapped to those visible axes, left/right/up/down look, nod, and shake all worked with a normal neck.

The original looping Point animation was then re-tested in the full-body view and remained visually normal. Shrug, smile/full expression sweep, winks/brows, and audio-driven lip sync also passed. This closes the active-motion diagnostic, but the architecture is still running through QA assets/flags and must be productionized before the project calls the fix final.

See `09g-metahuman-neck-head-ownership.md` for the detailed evidence and diagnostic sequence.

## 11. Suggested validation ladder for a full-room embodiment

Use progressively harder visible tests:

1. neutral standing idle at anatomically anchored floor position,
2. active standing gesture with torso/shoulder movement,
3. turn in place,
4. walk start,
5. root-motion walk loop,
6. walk stop,
7. settle into standing idle,
8. standing conversation with lip sync,
9. contextual point/look gesture,
10. return-to-chair route and camera cut.

Do not skip from a clean idle directly to a full autonomous room behavior. The reference build proved that an idle can hide a neck defect that immediately appears under active motion.

## 12. Design principle

The most reusable lesson from this phase is:

> Let camera cuts hide transitions the user does not need to inspect, anchor standing characters from real anatomical contact points, bake donor motion onto the target skeleton, and treat head/neck authority as a separate validation problem from body placement.

A convincing embodied character does not require every transition to be shown continuously. It requires the visible pieces to agree with one another strongly enough that the viewer's brain completes the motion.

That is often faster, safer, and more believable than forcing one animation system to solve every centimeter of the performance.