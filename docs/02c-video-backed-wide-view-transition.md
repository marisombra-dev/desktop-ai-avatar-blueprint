# 02c - Video-backed Wide View transition

A desktop avatar can use a short pre-rendered or generated video as a presentation bridge between a close conversational view and a larger live room. The reference build eventually validated a simple version of this pattern after several failed approaches.

The important lesson is that the video should be treated as a **temporary presentation surface**, not as a frame-perfect continuation of the live Unreal camera.

## Validated reference flow

The human-validated Wide View entry sequence is:

```text
user presses Wide View
        ↓
small Desktop Ethan stack is minimized
        ↓
opaque black top-level Electron video window appears
        ↓
short transition video plays
        ↓
video is hidden, leaving the same window black
        ↓
live Unreal Wide state is prepared behind black
        ↓
black player closes
        ↓
already-standing live Wide room is revealed
```

The reference build uses the black interval as a deliberate state boundary. It does not attempt to line the final video frame up perfectly with the first live frame.

The live Wide baseline was separately human-validated with the avatar standing neutrally in front of the chair before the video path was allowed to reveal it.

## Why the obvious implementation failed

### Do not play the video inside the transparent avatar window

The reference desktop shell uses a transparent Electron window layered with a live Unreal window. Playing decoded video directly inside that transparent renderer produced visible flashing/strobing.

The source clip was not the problem:

- the original and silent copy had identical decoded frame hashes;
- all 97 frames were upright;
- the clip played normally by itself;
- isolated ordinary Electron playback also remained upright.

The visual failure appeared only when the clip was composited through the transparent production window.

**Lesson:** if a transparent desktop shell flashes during hardware-decoded video playback, test the same bytes in an opaque Electron window before touching the media itself. Re-encoding or changing FPS is not the first fix.

### A child video window is still too coupled

Making an opaque video window a child of the transparent Ethan window did not isolate it enough. The live avatar window could still leak through or compete in the composition stack.

**Lesson:** use a completely independent top-level opaque video window.

### Topmost window helpers can fight the video

The reference build has an `overlay_sync.py` helper that keeps the Unreal avatar window and Electron controls synchronized and repeatedly reasserts topmost order. During early video tests this produced alternating frames of the video and the small live Ethan view.

That pattern was diagnostic: every-other-frame or rapid alternating-window flashes are a z-order/window-ownership problem, not normal 24-fps cadence judder.

**Lesson:** audit every process that can change window visibility, z-order, minimization, or topmost state before blaming the video decoder.

### Do not merely add an arbitrary delay

A measured diagnostic showed that minimizing the Electron shell happened almost immediately, while the sync helper took roughly 185 ms before the associated Unreal window was actually hidden.

A short safety delay helped, but timing alone did not solve the final startup flash because another identity collision remained.

**Lesson:** delays may close a measured race, but they should not be used to conceal an unexplained one. Measure the state transition first, then keep looking if a deterministic artifact remains.

## The subtle title-collision bug

The opaque video player reused the same renderer page as the main app. That page's HTML title was `Desktop Ethan`.

The overlay-sync helper identifies the control window by that exact title. For a brief interval there were therefore two native windows that looked like the same control window to the helper. The helper could select the video player as if it were the real control shell, conclude that Ethan was visible again, and re-show the Unreal head between black and video.

The fix was explicit identity separation:

```text
main control window: Desktop Ethan
video window:        Desktop Ethan Wide Video
```

The video window also prevents the loaded shared renderer page from changing its native title back by cancelling Electron's `page-title-updated` event.

**Lesson:** any external helper that discovers windows by title needs unique, stable native titles. Reusing one HTML page for multiple BrowserWindows can silently break that assumption.

## Why minimizing the normal stack works

The successful route uses the production shell's existing minimize/restore behavior instead of inventing a second z-order controller.

When the main Electron window is minimized, the existing overlay synchronizer already knows how to hide the associated Unreal window and stop reasserting its topmost order. After the video window closes, the normal Desktop Ethan stack can be restored through the already-proven restoration path.

This is safer than killing and restarting the synchronization helper around every transition.

**General rule:** prefer an existing, proven lifecycle transition over temporarily disabling infrastructure.

## Keep the video window black after playback

At `ended`, the reference renderer does not immediately close the video window. It first hides the `<video>` element, exposing the player's opaque black background.

While that black surface still owns the screen, the app switches the live Unreal state to Wide. Only after the Wide state has had time to settle does the black player close.

This produces:

```text
video → black → prepared live room
```

rather than:

```text
video → partially prepared live room → correction
```

The black frame is not a defect. It is the synchronization primitive.

## Avoid frame-matching theater unless it is truly needed

Earlier experiments attempted to make the generated stand-up video, a live standing pose, camera position, teleport timing, animation slots, and camera pullback all meet on one apparent frame.

That accumulated too many independent variables at once. Failures included inverted/alternating presentation, room spins, incorrect live pose placement, and uncertainty about which subsystem owned the visible result.

The final design deliberately removed those requirements.

The video only needs to tell the visual story of the avatar rising. Black then separates that story from the live room. The first live frame only needs to be a convincing standing baseline.

**Lesson:** a clean perceptual cut is often more robust than a technically elaborate continuous illusion.

## Validate media and live state independently

Before combining them, prove both halves separately.

For the media half:

- verify the exact file bytes being used by production;
- inspect frame count, FPS, orientation metadata, and decoded-frame orientation;
- test the exact clip in an ordinary opaque Electron window;
- test the production video window without any Unreal state change.

For the live half:

- establish the target avatar transform independently;
- prove the intended idle pose independently;
- preserve known-good MetaHuman head/neck ownership;
- confirm the room looks correct before allowing the transition to reveal it.

Only after both halves are human-approved should the black handoff connect them.

## Reference implementation characteristics

The validated reference implementation has these properties:

- generated/silent transition clip at 24 fps;
- independent, opaque, fullscreen, frameless Electron BrowserWindow;
- black background;
- unique native window title;
- no parent/child relationship to the transparent Desktop Ethan window;
- normal Ethan stack minimized before player creation;
- a measured short startup safety interval for the existing hide lifecycle;
- video muted and played inline;
- video hidden at `ended` to create the final black interval;
- live Wide state prepared while black remains visible;
- video window closed only after the live state is ready enough to reveal;
- existing Desktop Ethan restore path used afterward.

The exact timings are implementation-specific. The architecture is the reusable part.

## Wide-state animation lesson

The production Body animation mode is not necessarily whatever was authored into the map. In the reference build, runtime launch flags replace the Body AnimBP with a neck-safe graph.

That means saving a standing idle directly into the map would have been silently overridden at runtime.

Before changing a default pose, verify who owns the final animation graph **after launch**.

The reference standing Wide state therefore uses a Body AnimBP that retains the proven head/neck ownership path and adds a dedicated full-body `WideTransition` slot. The neutral standing loop is played through that slot, while the older `DefaultSlot` remains untouched.

The proven standing anchor used by the reference build was:

```text
location: X=-144.451694, Y=-46.222782, Z=0.039902
rotation: yaw=-90 degrees
```

The neutral idle source was the MetaHuman neutral standing loop rather than the earlier test pose that held one arm outward.

## Debugging rule that matters most

For visual avatar work, the human observer's report is the test result.

A log saying that a montage played or a window was shown does not prove that the visible outcome was correct. Logs explain why the observed result happened. They do not overrule the observed result.

Use this order:

```text
observable result
→ inspect state/logs
→ form a hypothesis
→ isolate one variable
→ verify
→ change production
```

Do not use:

```text
guess
→ change production
→ explain the surprise
```

That discipline is what ultimately reduced a fragile multi-system transition to a small, repeatable sequence.