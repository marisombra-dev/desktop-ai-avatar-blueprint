# 02f - Wide-to-Close cinematic return without flicker

A desktop avatar sometimes needs to leave a live full-room state and return to a compact desktop view after a short physical action. The reference build validated one such sequence around a ringing telephone: the avatar interrupts idle behavior, runs across the room, reaches toward the phone, a still image briefly sells the pickup, and the system returns to Close View.

What looked like a tiny presentation change exposed several reusable lessons about transparent Electron windows, Unreal layering, fullscreen transitions, z-order helpers, and debugging discipline.

The strongest rule is simple:

> **Cover first. Change the live system underneath the cover. Uncover last.**

## Validated reference flow

The human-approved return sequence is:

```text
Wide View is live
        ↓
Phone becomes a priority interrupt
        ↓
avatar runs to the phone
        ↓
short right-arm reach begins
        ↓
independent opaque fullscreen cinematic window is already preloaded
        ↓
black cover is shown
        ↓
still pickup image is revealed for about 1 second
        ↓
image is hidden, leaving the cinematic window black
        ↓
Wide → Close happens underneath the black cover
        ↓
Close View is allowed to finish shrinking/settling
        ↓
black cinematic window closes last
        ↓
stable compact Close View is revealed
```

The final accepted visual result was:

```text
run → reach → black → picture → black → Close View
```

The sit-down itself remains invisible. The image and black cut do the storytelling work.

## Why the reverse transition is not identical to Wide View entry

The validated Close → Wide video transition can minimize the ordinary Ethan stack before showing the transition video because the live avatar is no longer needed on screen.

The Wide → Close phone return is different. The live Wide room must remain visible long enough for the avatar to physically run to the prop and reach toward it. Minimizing the main stack too early exposes the desktop before the cinematic cover appears.

That difference matters:

```text
entry transition:
minimize live stack → show opaque media → prepare Wide behind black

return transition:
keep live Wide visible → preload media window → show black cover → switch Close underneath it
```

Do not mechanically copy lifecycle order from one direction to the other.

## Use a separate opaque top-level BrowserWindow

The still image was first painted inside the transparent production Electron window. That produced visible flicker because the transparent Electron layer and Unreal were still competing during composition.

The proven solution was the same architecture already validated for the Wide View transition video:

- independent top-level `BrowserWindow`;
- `transparent: false`;
- fullscreen and frameless;
- black background;
- unique native title;
- image preloaded before the window is exposed;
- media hidden when black is required.

The still image itself was not the hard part. The compositor boundary was.

## Preload before showing the cover

The cinematic window should be created hidden, load its HTML, and confirm that the image has decoded successfully before it becomes visible.

Conceptually:

```text
create hidden opaque player
load HTML
wait until image.complete && image.naturalWidth > 0
show player as black
wait short black-in interval
reveal image
```

This prevents media decode or first-paint work from becoming part of the visible transition.

## The z-order helper must yield to the cinematic window

The reference desktop avatar uses a native helper that keeps the Unreal room and Electron controls layered correctly. In normal operation it may periodically reassert:

```text
Unreal TOPMOST
Electron controls TOPMOST above Unreal
```

That behavior is correct for the avatar itself, but wrong while an independent cinematic cover is supposed to own the screen. The helper can repeatedly climb over the cinematic window even if the cinematic window was created `alwaysOnTop`.

The validated fix was narrow: while the uniquely titled phone-return cinematic window is visible, the helper must **stop changing z-order** for the ordinary avatar stack.

Geometry synchronization can continue. The exception is specifically about stacking order.

General rule:

> A temporary presentation surface needs explicit authority over every helper that can promote another window.

Do not create a second competing z-order controller.

## Unique native titles are part of window identity

The existing video transition had already exposed a subtle title-collision failure. A window-discovery helper that searches by title can mistake a temporary media window for the main control window if both reuse the same HTML title.

The return cinematic therefore uses its own stable native title, for example:

```text
Desktop Ethan
Desktop Ethan Wide Video
Desktop Ethan Phone Return
```

If a shared renderer page can modify the title, prevent `page-title-updated` from collapsing those identities back together.

## `leave-full-screen` does not mean the Close View is visually settled

One of the final defects was a brief fullscreen close-up of the avatar's head after the picture ended. Logs showed that the black cinematic cover remained visible through Electron's `leave-full-screen` event, yet the giant-head frame still appeared afterward.

That proved an important point:

> `leave-full-screen` means the fullscreen state changed. It does **not** guarantee that the transparent Electron/Unreal composite has finished resizing and visually settled.

The working Close → Wide video path already kept its black media surface alive for roughly 1100 ms after the live mode switch. Reusing that proven post-switch black hold on the return path hid the resize completely.

The exact number is reference-build tuning, not a universal constant. The reusable lesson is to keep the black cover until the underlying composite is actually ready to reveal.

## The black frame is a synchronization primitive

A black interval is not dead time or cosmetic padding. It is a safe boundary during which multiple state changes can happen without exposing intermediate frames.

The robust order is:

```text
show black cover
→ perform hidden state transition
→ wait for underlying windows to settle
→ remove black cover
```

The fragile order is:

```text
hide old state
→ begin state transition
→ hope black appears before an intermediate frame leaks through
```

If the desktop, a giant avatar head, an old camera state, or a half-resized room flashes between media and the final view, the cover is being applied too late or removed too early.

## Failure modes observed in the reference build

### 1. Painting the picture inside the transparent main window

Result: visible flicker.

Cause: transparent Electron and Unreal remained active participants in the composition while the image was being painted.

Fix: independent opaque media window.

### 2. Minimizing Ethan before the black cover was visible

Result: the user's ordinary desktop appeared between the reach and the picture.

Cause: the live stack disappeared before another opaque surface owned the screen.

Fix: preload first, show the black cover first, then change anything underneath it.

### 3. Restoring or exposing Close View before the cover had done its job

Result: a large fullscreen view of the avatar's head appeared briefly before the window shrank.

Cause: the Close composite was technically leaving fullscreen but had not visually settled.

Fix: keep the cinematic window black through the full resize and close it last.

### 4. Letting the overlay helper continue its normal z-order heartbeat

Result: black and/or the picture could disappear behind the ordinary Ethan windows.

Cause: the helper correctly promoted the avatar stack for normal use, but did not know a cinematic surface temporarily owned presentation authority.

Fix: a narrow cinematic-visible z-order exception.

### 5. Rewriting proven Wide/Close lifecycle code to insert one image

Result: unrelated regressions in always-on-top behavior, button visibility, fullscreen sizing, persisted bounds, and launcher behavior.

Cause: a bounded presentation feature was implemented by changing the lifecycle that already worked instead of inserting a temporary presentation layer around it.

Fix: rollback to the last known-good lifecycle, preserve the existing `setWideViewMode(false)` path, and place the cinematic around that transition.

This was the most expensive mistake in the whole exercise.

## Separate logical state from visible state

At one point the visible Unreal room had disappeared while Wide View logic continued running. The avatar still produced a normal environment-grounded idle remark because the idle scheduler and scene metadata were alive even though the visual room was not.

That observation was diagnostic evidence that the logical Wide state survived while its presentation surface failed.

Do not infer that the content of a coincident remark, camera feed, or log line caused the visual failure merely because it happened nearby in time.

Use the symptom to ask which layer survived:

```text
voice/idle logic alive?
Electron controls alive?
Unreal process alive?
Unreal HWND alive?
cinematic window alive?
z-order correct?
```

Correlation in a multi-process desktop stack is cheap. Layer-specific evidence is better.

## Roll back when a bounded feature starts breaking unrelated invariants

A small visual insertion should not require changing launcher behavior, persistent window bounds, normal always-on-top policy, Wide View input ownership, or camera-feed logic.

If fixing one transition begins breaking unrelated proven behavior, stop adding compensating patches.

Use this recovery sequence:

```text
identify the last known-good lifecycle checkpoint
restore it
prove the original Close ↔ Wide behavior again
reintroduce only the bounded feature
change one authority boundary at a time
```

This is much cheaper than stacking patches until nobody knows which window owns the screen.

## Priority interruption pattern

The phone return also established a reusable behavior rule: explicit user summons outrank ambient room behavior.

When the phone is pressed in Wide View:

```text
cancel pending stationary/moving idles
stop any environmental excursion
run the dedicated return action
prewarm conversation while motion/cinematic runs
complete the cinematic handoff
resume interactive Close View
```

The user should never have to wait for a fireplace walk, window remark, radio interaction, or other idle to finish before the explicit summon begins.

## Validate the physical action separately from the cinematic

The reference build first proved the physical pieces independently:

- real phone coordinates were read from the map rather than guessed;
- run endpoint and final facing were visually approved;
- a full-body cross-reach donor was rejected because it caused a seated/prayer-like pose;
- a custom right-arm-only additive reach was authored and visually approved;
- only then was the cinematic cut inserted.

This matters because a clean black transition cannot rescue a bad body performance, and a good body performance cannot rescue broken window ownership.

## Reference timing from the validated build

The accepted reference implementation used approximately:

```text
run/reach wait:        3225 ms
initial black:          150 ms
picture:               1000 ms
black before switch:    250 ms
post-fullscreen black: 1100 ms
```

These are not architectural requirements. They are useful known-good values from one Windows 11 / Electron / Unreal composition.

The important part is the ordering and ownership, not the milliseconds.

## Acceptance test

Do not call the transition finished because the code compiled or every log stage fired.

Human-visible acceptance should confirm:

1. Close View still launches at the approved size.
2. The avatar and controls remain always-on-top in Close View.
3. Close → Wide still reaches the room with usable controls.
4. Wide room interaction still works.
5. Phone immediately interrupts idle behavior.
6. The avatar runs to the approved phone location and faces it correctly.
7. The approved reach plays without seated fallback.
8. Black appears with no desktop leak.
9. The picture appears cleanly with no flicker.
10. Final black hides the fullscreen-to-close resize.
11. Compact Close View appears directly, with no giant-head frame.
12. No unrelated camera rotation, media interaction, bounds persistence, or launcher behavior changed.

Logs are evidence for explaining the observed result. They are not a substitute for the observed result.

## Design principle

The reusable lesson from this transition is:

> **When inserting cinematic media between two already-working live states, do not rewrite those states. Put an opaque temporary presentation surface above them, give it explicit z-order authority, change the live system underneath black, wait until the destination is visually settled, and uncover it last.**

For debugging, preserve the same discipline:

```text
observable result
→ evidence from the specific surviving/failing layer
→ one hypothesis
→ one isolated change
→ human verification
```

A one-second still image should remain a one-second still image problem. If it starts changing launchers, saved geometry, unrelated camera feeds, and normal input policy, the implementation boundary is wrong.