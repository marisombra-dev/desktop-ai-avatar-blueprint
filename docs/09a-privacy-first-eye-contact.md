# Privacy-First Eye Contact and Gaze

A desktop avatar gains a surprising amount of presence when its eyes can briefly meet the user's gaze during an active conversation and then release naturally when the user looks away.

The important design choice is restraint. This feature should not become head tracking, cursor tracking, continuous visual surveillance, or a second camera-permission path. The reference architecture uses the webcam locally to estimate whether the user is looking toward the avatar, converts that estimate into a tiny numerical gaze target, and drives only MetaHuman eye-look curves.

No webcam frame needs to leave the machine for this feature.

## What this feature is

The reference pattern is:

```text
webcam
  -> local MediaPipe Face Landmarker
  -> iris + head-pose features
  -> user-specific eye-contact classifier
  -> smoothing + hysteresis
  -> small gaze target
  -> local UDP control packet
  -> Unreal / MetaHuman eye-look curves
```

The behavioral result should be simple:

- While the avatar is idle, the gaze helper is not running.
- During an interactive voice conversation, the local gaze helper may own the webcam.
- Looking toward the avatar for a short sustained interval activates eye contact.
- Looking away for a short sustained interval releases the override.
- Normal idle gaze resumes immediately after release.
- Ending the conversation stops the helper and releases the webcam.
- Explicit Camera/visual-awareness mode always wins webcam ownership.

The avatar should never stare continuously merely because a face is present.

## Privacy boundary

Treat local eye-contact sensing as a separate capability from visual camera awareness.

A useful policy is:

**Camera visual awareness OFF**

- Local landmark processing may run during an active conversation if the user has opted into the eye-contact feature.
- Frames are processed locally and discarded.
- No frame is sent to the language/vision model.
- No image is written to disk.
- Only numerical landmark-derived values affect avatar gaze.

**Camera visual awareness ON**

- Stop the gaze helper first.
- Release the webcam completely.
- Then allow the visual-awareness path to acquire the camera.

This avoids turning a social animation feature into an undeclared visual-observation channel.

## Do not classify eye contact from face position

A tempting shortcut is to learn that the user is "looking at the avatar" whenever their face happens to be in a particular part of the webcam frame or at a particular distance from the camera. That works during one calibration pose and fails as soon as the user sits differently.

The reference classifier instead used features derived from:

- iris position inside the right eye,
- iris position inside the left eye,
- vertical iris position in both eyes,
- facial-transform head yaw,
- optionally head pitch if it proves stable for that user and camera geometry.

Face center and face scale are deliberately excluded from the eye-contact decision.

One geometry detail matters: the two eyes have opposite anatomical horizontal orientation. If both iris coordinates are projected in their local outer-to-inner directions and then averaged naively, part of the horizontal gaze signal can cancel. Normalize one eye into the same global orientation before training the classifier.

## Calibration

Eye contact is geometric. The target depends on where the avatar sits on the monitor, the user's camera position, and ordinary posture. A generic threshold is not good enough.

Use a short local calibration with at least three targets:

1. Look directly at the avatar's eyes.
2. Look at a nearby non-avatar point, such as the center of the main application.
3. Look at a clearly different point, such as another corner of the display.

Collect only numerical feature vectors. Do not save calibration frames.

A simple linear classifier is sufficient for a first version. Save only:

```json
{
  "feature_names": ["right_h", "left_h_global", "right_v", "left_v", "head_yaw", "head_pitch"],
  "classifier": {
    "weights": ["user-specific values"],
    "threshold": "user-specific value",
    "heldout_accuracy": "measured locally"
  }
}
```

Do not publish a real user's calibration weights as a biometric-like artifact. The public example intentionally omits them.

Measure held-out accuracy before trusting the classifier. If you later drop or add a feature for runtime stability, re-measure rather than inheriting the old accuracy number by implication.

## Hysteresis prevents twitching

Do not switch gaze on and off from one frame.

Use separate enter and exit rules:

```text
contact OFF
  -> classifier margin must stay above ENTER_MARGIN
  -> for ENTER_SECONDS
  -> contact ON

contact ON
  -> classifier margin must stay below EXIT_MARGIN
     or the face must remain absent
  -> for EXIT_SECONDS
  -> contact OFF
```

The enter threshold should be stricter than the exit threshold. This creates a stable latch rather than a flickering expression.

A practical starting range is roughly half a second for both entry and release. Tune by feel, but favor social naturalness over maximum responsiveness.

## Separate detection from follow movement

Face position should not decide whether the user is making eye contact, but it can be useful after contact has already been established.

When contact turns on:

1. Record the smoothed face center as an anchor.
2. Continue smoothing face x/y locally.
3. Convert only small movement relative to that anchor into tiny eye offsets.
4. Clamp the offsets aggressively.

This lets the avatar's eyes subtly follow normal seated motion without making the classifier dependent on where the user's face happens to be in the webcam image.

## Keep the strength small

Human eyes are extremely sensitive to unnatural gaze. The correct control range is usually much smaller than what looks impressive in a manual rig test.

The reference implementation sends a normalized horizontal target, vertical target, and bounded strength:

```text
DECTRL|GAZE|horizontal|vertical|strength
```

The Unreal bridge clamps all three values before they touch the rig.

For a MetaHuman, an eye-only implementation can drive curves such as:

```text
CTRL_expressions_eyeLookLeftL
CTRL_expressions_eyeLookLeftR
CTRL_expressions_eyeLookRightL
CTRL_expressions_eyeLookRightR
CTRL_expressions_eyeLookUpL
CTRL_expressions_eyeLookUpR
CTRL_expressions_eyeLookDownL
CTRL_expressions_eyeLookDownR
```

Do not add head bones, neck rotation, body lean, or Control Rig changes merely to make this feature feel stronger. Eye contact should layer on top of an already-stable idle animation.

## Add a watchdog release

A crashed helper must not leave the avatar frozen in a stare.

The Unreal side should remember the time of the last gaze packet. If updates stop:

1. begin fading the eye override after a short timeout,
2. fully release it after a slightly longer timeout.

The desktop side should also send an explicit zero-strength release whenever it stops the helper:

```text
DECTRL|GAZE|0|0|0
```

The helper should send the same release from its `finally`/shutdown path.

These two safeguards are intentionally redundant.

## Webcam ownership arbitration

Only one subsystem should own a physical webcam at a time.

A clean desktop-shell state machine is:

```text
interactive voice starts
  -> stop wake listener
  -> create voice session
  -> if Camera visual mode is OFF, start local gaze helper

Camera turns ON
  -> stop gaze helper
  -> wait for webcam release
  -> start visual camera stream

Camera turns OFF
  -> stop visual camera stream
  -> if interactive voice is still active, restart gaze helper

voice ends / sleep
  -> stop gaze helper
  -> explicit gaze release
  -> close voice session
  -> re-arm wake listener
```

Also stop the gaze helper on system lock, suspend, and application quit. On unlock/resume, restart it only if an interactive voice session is still active and Camera visual mode does not own the webcam.

Proactive or unsolicited speech should not automatically start eye contact. In the reference design, gaze is tied to actual interactive engagement.

## Packaging caveat

Bundling the Python script, calibration schema, and MediaPipe model file is not the same thing as bundling a working runtime.

If the implementation depends on a separate Python environment containing MediaPipe, OpenCV, and NumPy, a packaged Electron application is portable only on machines that also have that runtime.

For distribution, choose one of these intentionally:

- bundle a dedicated Python environment,
- compile the gaze helper into a standalone executable,
- or document the runtime dependency clearly.

Do not call the feature portable until this dependency is solved.

## Validation gate

Do not declare eye contact complete because the classifier prints plausible numbers. Validate the whole path:

1. Idle: wake listener is armed and no gaze helper exists.
2. Start interactive voice: wake listener stops and gaze helper starts.
3. Look directly at the avatar: after the enter delay, the eyes meet the user's gaze subtly.
4. Look elsewhere: after the exit delay, the eye override releases and ordinary idle gaze returns.
5. Move slightly while maintaining contact: the eyes follow only a small amount.
6. End the voice session: gaze helper exits and wake listener returns.
7. During one live conversation, turn Camera ON: gaze helper releases the webcam before visual camera capture begins.
8. Turn Camera OFF: gaze helper resumes.
9. Kill the helper unexpectedly: Unreal watchdog releases the eyes.
10. Confirm no frames were saved and no local gaze frames were sent to the model.
11. Confirm the avatar window did not capture or clip the user's mouse during testing.

That last check sounds mundane until a desktop avatar accidentally becomes a tiny 3D prison warden. Avoid foreground-focus capture tricks during validation.

## Example

See `examples/gaze_tracker.py` for a sanitized implementation pattern. It deliberately expects a local calibration file and contains no real user's classifier weights.

The reusable lesson is not a particular threshold. It is the separation of concerns:

**classify eye contact from eye/head geometry, use face position only for tiny follow after contact, gate transitions with hysteresis, keep the rig influence weak, arbitrate webcam ownership explicitly, and always fail back to normal idle gaze.**