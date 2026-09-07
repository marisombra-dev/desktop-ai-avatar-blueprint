# 02b - Living Environment / Wide View

A desktop avatar does not have to remain a floating portrait forever. Once the close conversational embodiment is stable, it can expand into a persistent 3D environment that gives the same person somewhere to sit, move, look, wait, and interact.

The key architectural idea is **camera-state expansion, not replacement**.

Keep the proven close view intact. Build the larger environment separately, prove it, then let a Wide View camera state reveal it.

## 1. Protect the close view

Treat the approved conversational framing as a production checkpoint.

Do not rebuild the character, face, lip sync, gaze, gestures, or voice merely because the environment is changing. Experimental room maps, animation graphs, navigation, and props should live in a separate namespace or content area until validated.

A useful rule is:

```text
close view = stable product surface
wide view  = isolated environment experiment
```

Only merge the two after the wider scene preserves every previously proven behavior.

## 2. Asset-first beats pose-first

Do not perfect a seated pose against a placeholder cube and then search for a chair that happens to fit it.

Choose the real room, chair, desk, fireplace, stairs, or other large geometry first. Then fit the avatar pose, IK, animation, camera, and navigation to those real dimensions.

This avoids spending days tuning animation against geometry that will be discarded.

## 3. Wide View is a composition state

A Wide View control should not simply maximize the existing window. It should trigger a deliberate camera/composition transition.
Conceptually:

```text
CLOSE_CONVERSATION
    ↓ user requests Wide View / activity widens
CAMERA_PULLBACK
    ↓
WIDE_ENVIRONMENT
    ↓ conversation becomes active
CAMERA_GLIDE_TO_CONVERSATION
    ↓
CLOSE_CONVERSATION
```

The transition should be smooth enough to feel like one physical place rather than a map swap.

The person can remain seated at first. Walking, standing, window-looking, fireplace behavior, and room interaction can be layered in later.

## 4. Build the room around behavior zones

The room should not be decorated randomly. Give major areas behavioral meaning.

Useful zones include:

- **conversation seat** - the known close-view anchor;
- **window** - a reason to stand, look outward, and pause;
- **fireplace** - a warm idle/reading/thinking destination;
- **media object** - television, radio, display, or other optional content source;
- **interaction table/desk** - phone, books, food, papers, or small props;
- **navigation transitions** - clear paths between important destinations;
- **secondary seating** - optional alternate idle or guest locations.
Design destinations as named interaction points rather than hard-coded coordinates. A destination can own:

- approach point,
- facing direction,
- preferred idle animation,
- optional interaction animation,
- clearance radius,
- camera preference,
- whether conversation should pull the avatar back toward the user.

That makes later movement logic reusable across very different room designs.

## 5. Navigation is not personality

Pathfinding and movement selection belong in the local runtime/Unreal layer. The long-lived agent may decide *why* it wants to move, but it should not micromanage navmesh coordinates.

A useful split is:

```text
agent intent: "go look out the window"
local action: MOVE_TO(window_viewpoint)
Unreal: pathfind, walk, orient, blend to idle
```

If a third-party NPC package provides useful Move To, interaction-point, or locomotion helpers, treat those as replaceable infrastructure. Do not let installing a movement plugin silently replace the avatar's established identity, dialogue, memory, or social behavior.
## 6. Interactive media surfaces

A room can contain controlled links to the outside world without turning the environment into a browser UI.

Examples:

- a window whose surface displays a permitted live camera or ambient stream;
- a television whose screen is a MediaTexture;
- a radio that plays an approved stream or local media source;
- a picture frame or display that can change content contextually.

For a live window, prefer the original feed/provider and its permitted embedding or streaming path. Do not depend on scraping an aggregator page layout.

Keep external audio muted by default unless the user deliberately activates it. A visually active window can provide movement and atmosphere without competing with conversation.

Store metadata alongside the current feed so the avatar can answer simple questions such as where the view is from without guessing.

## 7. Physicalize conversation cues when useful

Interface events can gain presence by having a visible counterpart in the room.

For example, a microphone/session-start action could trigger a short phone ring or another local cue. The avatar can notice the object and orient toward it while the microphone becomes available immediately.

Do not add animation latency to the actual conversation path. The physical cue is presentation, not a permission gate.

Likewise, wake-word interaction may remain direct: the user calls the avatar by name, so the avatar simply looks toward the user rather than pretending every interaction came through an object.
## 8. Ambient life should reward attention, not demand it

A larger environment becomes convincing when small things continue to happen while the avatar is mostly stationary.

Examples include:

- fire and candle flicker,
- clock pendulum motion,
- curtain or plant movement,
- subtle steam or dust,
- a pet changing resting places,
- a small animal making a rare route through the room,
- occasional prop interaction.

These should run on sparse local schedules and simple state machines. They do not need a language-model decision every time.

The correct frequency is lower than you think. If the same creature crosses the room every two minutes, it stops feeling alive and starts feeling like a screensaver.

Ambient actors should yield to the avatar. If the avatar approaches their path, they can retreat, move aside, or suppress the event.

## 9. Give ambient actors homes and motives

Tiny environmental stories work better when motion has a physical origin and destination.

A pet can have a preferred rug, chair, or window spot. A small animal can emerge from behind furniture, investigate a food surface, then return to cover. These anchors make even simple loops read as behavior rather than random animation.
## 10. Performance budget matters more in Wide View

A room can easily cost more than the character.

Prefer:

- modular meshes over one enormous scene when practical,
- LOD/Nanite appropriate to the target engine and hardware,
- bounded particle counts,
- low-frequency ambient logic,
- media surfaces that pause when not visible or needed,
- no unnecessary tick on decorative props,
- dynamic lighting only where the visual payoff justifies it.

Measure GPU/CPU cost with the avatar, room, fire, media surface, and normal desktop workload running together. A beautiful library that makes the rest of the computer unpleasant is not a successful desktop companion.

## 11. Build order

A reliable Wide View sequence is:

1. freeze the known-good close view;
2. choose the real architectural shell and major furniture;
3. establish room scale, floor, walls, ceiling, and navigation clearance;
4. fit the real conversation chair and seated pose;
5. prove deterministic camera ownership and close↔wide transitions;
6. add fireplace/window/media anchor geometry;
7. prove stand, sit, and one short movement route;
8. add navigation points and destination idles;
9. add architectural finish such as trim, wall treatment, floor material, and lighting;
10. add a restrained amount of decorative clutter;
11. add ambient-life actors;
12. add optional interactive media and physical conversation cues;
13. regression-test every previously proven avatar capability.

## 12. Validation gates

Do not call the room complete because it looks good in the editor.

Validate in layers:

- [ ] Wide camera shows only intended room geometry; no default pawn/camera interference.
- [ ] Close framing still matches the approved conversational presentation.
- [ ] Pullback and return transitions are smooth and reversible.
- [ ] The seated body fits the real chair without obvious floating or clipping.
- [ ] Lip sync, face identity, gaze, blink, head controls, expressions, and gestures survive the wider body graph.
- [ ] At least one stand/move/idle/return path works on navmesh.
- [ ] Interactive objects fail quietly when their network/media source is unavailable.
- [ ] Ambient actors do not interrupt conversation or collide with the avatar.
- [ ] Wide View remains usable without mouse capture.
- [ ] The environment stays within the desktop performance budget.

Only after these pass should the wider environment replace a proven simple backdrop in ordinary use.

## 13. The design principle

The environment should create **reasons for presence**.

A chair gives the avatar somewhere to settle. A window gives it somewhere to look. A fireplace gives it somewhere to pause. A media object gives shared attention a physical location. Sparse ambient life gives the room continuity when nobody is speaking.

The goal is not to turn the desktop avatar into a game character that constantly performs. The goal is to let the same conversational person appear to inhabit a place even during the quiet moments.