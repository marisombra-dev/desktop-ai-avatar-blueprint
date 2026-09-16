# 10i - BareHands Shared Spatial Airboard: 2026-09-16

**Status: HUMAN-VALIDATED FOR LIVE HAND-TRACKED MANIPULATION; AI BOARD-STATE READBACK IMPLEMENTED AND AUTOMATION-TESTED**

This chapter records a new interaction layer for the desktop companion: a webcam-tracked spatial board that the human can manipulate with bare hands while the same existing AI person can place content onto the board and inspect its live state.

The reference implementation adapts **BareHands** by Jared Rhodenizer as a separate localhost component rather than absorbing it into the desktop application's identity, memory, voice, or agent stack.

Upstream used for the validated prototype:

- https://github.com/jaredrhod/barehands
- pinned upstream commit: `eb23bed2d772f9d5a24de26fb92f46c3c76d69cf`
- upstream license: **AGPL-3.0-or-later**
- upstream hand tracking: Google MediaPipe Hand Landmarker
- upstream rendering: browser DOM / three.js

The human live-tested the resulting Hands mode and confirmed that a card could be grabbed, moved, rotated, and spun naturally with real hand gestures. The reaction was essentially: this may or may not become essential, but it is extremely fun and convincingly physical.

That reaction matters. Embodiment work is not only about efficiency. A companion becomes more spatially believable when the human and the AI can manipulate the same visible objects rather than communicating exclusively through speech and conventional mouse/keyboard UI.

---

## 1. Architectural principle: shared body layer, not another brain

BareHands is unusually well suited to an existing-agent architecture because it does not require its own conversational AI.

The integration uses it as:

```text
webcam
  -> MediaPipe hand landmarks
  -> gesture physics
  -> spatial glass board

existing Ethan Realtime/personality/tool loop
  <-> small localhost board API
```

The existing person still owns:

- identity;
- memory;
- conversation;
- task intent;
- decisions about what to show;
- interpretation of what is currently on the board.

BareHands supplies a body/input surface only.

Do **not** add an alternate Claude/LLM agent, alternate voice stack, alternate memory vault, or alternate assistant persona merely because the upstream setup instructions demonstrate those integrations.

The useful lesson is the same as the generalized Windows UI-hands chapter, but the direction is different:

- Windows-Use gives the AI better hands on Windows.
- BareHands gives the human better hands inside the AI's shared visual space.

---

## 2. Keep BareHands as a separate localhost component

The validated build keeps the upstream project outside the main desktop application source tree and talks to it over localhost.

Reference shape:

```text
Desktop Ethan
  Electron main process
    -> HandsBoard integration
       -> localhost:8794
          -> BareHands server.py
          -> stage.html tracker/gesture runtime
```

Benefits:

- upstream remains easy to update or pin independently;
- AGPL code is not casually copied into otherwise differently licensed application glue;
- rollback is simple;
- camera lifecycle is explicit;
- the desktop application can expose only the tiny subset of board actions it actually needs.

The local server is intentionally boring. That is good. It provides a small command/state boundary instead of another agent protocol.

---

## 3. Licensing boundary is not optional

BareHands is licensed under **AGPL-3.0-or-later**.

That is materially different from permissive MIT-style dependencies.

The reference blueprint therefore describes the integration but does not copy BareHands source into this repository.

Before distributing a product that embeds, modifies, serves, or redistributes BareHands, review the current upstream license and obtain legal advice appropriate to the distribution model.

A useful engineering default is:

> Keep BareHands as a separately obtained, separately identified localhost component unless you deliberately choose a tighter source-sharing/license relationship.

Do not assume that "free to use" means "safe to paste wholesale into a closed-source application."

---

## 4. The transparent tracker is the important mode

BareHands can run a normal mirrored webcam view, but that is not what the desktop companion needs.

The validated integration loads the tracker as a transparent Electron overlay:

```text
http://localhost:8794/stage.html?mode=overlay&res=1280x720
```

The overlay:

- is frameless;
- is transparent;
- stays above the relevant desktop view;
- does not appear in the taskbar;
- is not focusable;
- ignores ordinary mouse events;
- continues running hand tracking and gesture physics;
- hides the webcam picture itself.

The human therefore sees the glass objects and gesture cursors floating over the existing desktop / Wide View experience instead of seeing a replacement full-screen camera feed.

This preserves the illusion that the shared objects belong to Ethan's environment rather than to a separate webcam application.

---

## 5. Do not show the overlay until MediaPipe is actually ready

The upstream tracker has a boot/loading state while its hand-tracking assets initialize.

Showing the transparent Electron window before that boot state is gone can briefly expose an unwanted opaque/black loading surface.

The reference integration therefore:

1. creates the overlay hidden;
2. loads the BareHands tracker URL;
3. polls the page for completion/removal of the boot element;
4. detects explicit tracker failure text;
5. only then calls `showInactive()`.

This is a general desktop-overlay lesson:

> A transparent window is only transparent after the page inside it has reached the state you expect.

Treat renderer readiness as a gate, not an aesthetic assumption.

---

## 6. Webcam ownership must be explicit

The reference desktop companion already used the webcam for two different purposes before BareHands arrived:

1. local privacy-first eye-contact / gaze tracking;
2. explicit Camera visual awareness when the human asks the AI to look through the physical webcam.

BareHands introduces a third webcam consumer.

Do not let those components race each other.

The validated ownership rule is:

```text
Normal active conversation
  -> local gaze tracker may own webcam

Hands ON
  -> stop gaze tracker
  -> BareHands tracker owns webcam

Camera awareness ON while Hands is active
  -> Hands yields / is disabled first
  -> Camera awareness owns webcam

Hands requested while Camera awareness is active
  -> Camera awareness is turned off first
  -> Hands then acquires webcam

Hands OFF
  -> release BareHands webcam
  -> if active voice conditions allow it, resume gaze tracking
```

The low-level HandsBoard object also refuses camera acquisition if the camera-awareness owner has not actually released the device.

This double boundary is intentional: UI orchestration tries to resolve ownership cleanly, while the main-process integration still fails closed if that orchestration is wrong.

---

## 7. Minimal Ethan-facing capability surface

The reference integration does **not** expose every BareHands command to the conversational model.

The first capability surface is deliberately small:

```text
enable / disable Hands mode
show-card
inspect
clear
status
```

`show-card` accepts a bounded title/body and optional normalized `x` / `y` placement.

Coordinates are clamped to reachable board space rather than allowing content to spawn far outside the view.

`inspect` returns a sanitized state shape such as:

```json
{
  "ok": true,
  "enabled": true,
  "cursorCount": 1,
  "items": [
    {
      "id": 7,
      "type": "card",
      "title": "MOVE ME",
      "x": 0.81,
      "y": 0.22,
      "scale": 1.3,
      "grabbed": false
    }
  ]
}
```

The model does not need the entire internal physics state to understand where a card ended up.

Keep the model-facing state semantic and bounded.

---

## 8. Board state is more important than gesture event narration

The AI does not need a firehose of individual hand landmarks or every pinch/rotation frame.

The human is allowed to manipulate the board freely. The AI can look afterward.

That creates a much cleaner interaction contract:

```text
AI places object
-> human grabs / moves / scales / rotates / throws it
-> board settles
-> AI asks current board state
-> AI reasons from the new state
```

This matches physical reality better than attempting to narrate every frame of manipulation to the language model.

A user may spend several seconds turning an object around. The AI only needs the resulting spatial relationship unless the conversation specifically requires live commentary.

---

## 9. First reference implementation

The main Electron integration lives in a dedicated `HandsBoard` layer rather than being scattered through camera, Realtime, and window code.

Its responsibilities include:

- find the separate BareHands install;
- start `server.py` when localhost is not already healthy;
- wait for server readiness;
- create/destroy the transparent tracker overlay;
- acquire/release camera ownership through hooks;
- wait for tracker readiness before showing;
- post bounded commands to `/cmd`;
- read current board state from `/state`;
- sanitize the returned board state;
- kill the child server it started during application shutdown.

The default integration port is `8794`.

The default upstream directory is resolved separately from the desktop app and can be overridden through an environment variable rather than hard-wired into the application source.

That keeps the dependency replaceable.

---

## 10. Realtime tool behavior

The existing Realtime/personality loop receives a narrow local board tool.

Its purpose is to support natural requests such as:

```text
"Turn Hands on."
"Put a card on the board that says MOVE ME."
"What's on the board now?"
"Clear the board."
```

Important behavioral rule:

> The assistant should perform the board action silently and talk about the resulting shared object naturally, rather than narrating tool names, localhost endpoints, or camera arbitration.

The board is part of the interaction, not a developer console.

---

## 11. Validation sequence

The feature was validated in stages.

### A. Upstream inspection

The upstream repository was reviewed to confirm that:

- the hand tracker is browser/MediaPipe based;
- the AI integration is optional;
- the tracker owns the camera;
- board commands are accepted over localhost;
- board state can be read back;
- transparent overlay operation is supported;
- a separate render role exists for other composition workflows.

### B. Localhost server probe

The real upstream `server.py` was run locally without opening the gesture UI.

The integration confirmed:

- `/config` responded successfully;
- the Ethan-specific configuration loaded;
- `/state` was readable;
- no visible desktop manipulation was required for the probe.

### C. Automated routing tests

New regressions verified that:

- Realtime Hands enable routes through the application's camera-arbitration callback;
- a text card request reaches the shared board command layer;
- board state can be inspected without dispatching an unrelated camera-state change.

### D. Full project gate

After the integration, the desktop project passed:

- **33 test files**;
- **251 / 251 tests**;
- clean TypeScript typecheck;
- clean production Electron/Vite build.

### E. Human gesture validation

The human restarted the production desktop companion, activated Hands mode, and interacted with the live spatial card.

Human-observed behaviors included:

- the transparent overlay appeared correctly;
- hand tracking responded;
- the card could be physically grabbed;
- the card could be moved around;
- the card could be rotated;
- the card could be spun.

The human described the experience as "freakin amazing" and "so freakin cool."

That is sufficient to mark the **live gesture-manipulation path as human-validated**.

The AI-facing `/state` readback path is implemented and covered by automated integration tests. Do not silently upgrade that narrower readback claim beyond the evidence available in the human acceptance report.

---

## 12. What not to import from the upstream stack

The upstream project documents ways to pair BareHands with other assistant stacks.

For an existing persistent desktop companion, do not automatically import:

- Claude hooks;
- a Claude-specific system prompt;
- another assistant identity;
- another voice implementation;
- another memory system;
- another visual "assistant face" if the MetaHuman already fills that role.

Reuse the spatial interaction engine, not the whole demonstration stack.

The reference configuration was intentionally minimal rather than treating the BareHands ring as a second avatar.

---

## 13. Why this is more than a pseudo-touchscreen

A naive interpretation is:

> webcam gestures replace the mouse.

That is not the most interesting use.

The more promising interaction is a **shared spatial work surface** where the AI and human have different but complementary actions:

```text
AI:
  place something
  arrange initial material
  inspect current state
  explain / compare / react

Human:
  grab
  move
  scale
  rotate
  throw
  group spatially
```

Possible future uses include:

- comparing images side by side;
- sorting ideas into spatial groups;
- laying out reference material for a design discussion;
- manipulating 3D models;
- presenting maps or diagrams;
- letting the AI say "here, look at this" and actually put something into shared space;
- using spatial placement as conversational context.

Not every playful interface needs to justify itself as a productivity optimization on day one. Embodied interaction can be valuable because it changes how the relationship with the system feels.

---

## 14. Future extensions worth exploring

The validated prototype is deliberately small. Good next experiments include:

1. expose orientation (`rx`, `ry`, `rz`) in the sanitized board-state readback so Ethan can reason about how the human rotated an object;
2. add image presentation through the existing media airlock;
3. test 3D model handoff and exploded-view manipulation;
4. let Ethan place multiple comparison cards at deliberate positions;
5. let Ethan notice broad spatial groupings after the human rearranges several cards;
6. consider a shared camera broker only if simultaneous gaze + hand tracking becomes important enough to justify the complexity;
7. decide whether the board should appear primarily over Wide View, Close View, or both;
8. keep all new board actions bounded rather than exposing the complete upstream command vocabulary by default.

Avoid immediately turning every BareHands feature on. The small successful loop is more valuable than a giant, fragile gesture surface.

---

## 15. Rules worth carrying forward

1. Preserve one AI identity and one conversational decision owner.
2. Treat BareHands as a spatial body/input layer, not an assistant.
3. Keep the AGPL component clearly separated and attributed.
4. Pin the upstream commit used by a validated build.
5. Use a localhost API boundary rather than copying upstream code casually.
6. Make webcam ownership explicit.
7. Camera vision, gaze tracking, and hand tracking must not race for the device.
8. Hide the overlay until the tracker is genuinely ready.
9. Transparent overlays should ignore mouse events unless mouse interaction is explicitly required.
10. Keep the AI-facing board API small and semantic.
11. Prefer settled board state over streaming raw hand-landmark data into the model.
12. Keep visual manipulation local; do not send webcam frames to the language model merely to recognize hand gestures.
13. Human validation should describe exactly which physical gestures were actually proven.
14. Fun is a legitimate design signal in an embodied companion, even before the final productivity use case is obvious.

This chapter complements:

- `docs/09a-privacy-first-eye-contact.md`
- `docs/10h-generalized-windows-ui-hands-without-a-second-agent-validated-2026-09-16.md`
- `docs/02b-living-environment-wide-view.md`

The central lesson is:

> **A desktop companion can feel more physically present when the human and the AI share manipulable space, not merely shared text.**
