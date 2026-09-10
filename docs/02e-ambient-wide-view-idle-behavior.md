# 02e - Ambient Wide View idle behavior

A believable embodied assistant should not perform continuously. The reference Wide View became more natural when **stillness was treated as the default state** and animation became an occasional interruption rather than a constant playlist.

This matters especially when the avatar may stand in one place for a minute or more between meaningful actions.

## Separate stationary and moving idles

The reference design uses two independent layers:

1. **Stationary idle behavior** while the avatar remains at the window.
2. **Moving idle behavior** for occasional excursions to another room feature.

The stationary layer waits through a randomized quiet interval, performs one small action, lets it finish, then starts another quiet interval.

The moving layer runs on a longer clock. When it fires, it cancels any pending stationary action, owns the avatar until the excursion completes, and restarts the stationary cycle only after the avatar returns.

This avoids stacked gestures and makes the room feel inhabited rather than choreographed.

## Quiet time is part of the animation system

Early reference tuning used roughly 10–25 seconds of quiet standing between stationary actions and a much longer randomized interval for moving excursions. Those numbers are not a contract. The important design rule is that dead time remains abundant.

A plausible sequence is:

```text
stand quietly
→ small head movement
→ stand quietly
→ scratch arm
→ stand quietly
→ notice the window
→ stand quietly
→ walk to another room feature and return
→ restart
```

Do not try to squeeze every available animation into each minute. Repetition becomes obvious faster than silence does.

Distinctive actions should also have their own cooldowns. A head turn can recur relatively often; a scratch, stretch, or expressive gesture should be rarer so it does not become a nervous tic.

## Let the environment cue attention without commanding it

The Wide View window rotates through live scenic feeds. A scene change is therefore a useful attention cue, but not every change should trigger a visible response.

The reference architecture treats a new scene as an **opportunity to notice**:

```text
scene changes
→ probabilistic notice decision
→ optional slow head turn toward the window
→ optional short hold
→ return to neutral
```

Most scene changes can pass without comment. A small fraction of noticed scenes can add a tiny non-conversational remark grounded in the scene metadata, for example a brief reaction to the country or place.

Metadata should be silent grounding, not narration. The line should sound like a thought escaping rather than a camera database being read aloud.

A larger pointing-and-remark behavior can remain a separate, rarer event. Do not make every glance escalate into speech.

## Keep body fidgets from stealing head ownership

Full-body animation had already shown how easily a MetaHuman neck can be damaged when multiple systems try to own the same structure.

For stationary body fidgets, the reference build therefore retargeted useful source clips onto Ethan and stripped `neck_01`, `neck_02`, and `head` tracks before runtime use. Head attention remained under the already-proven procedural head system.

That separation gives each layer one job:

```text
body fidget → torso / shoulders / arms
head system → gaze direction / head attention
```

It also makes individual clips easier to reject without destabilizing the rest of the pose stack.

## Human visual QA outranks a plausible animation name

One early `LookAround` body clip was technically valid, head-neutral, and logged as playing correctly. In live use, however, one portion read as swatting at a fly and another left the arm extended awkwardly for part of the clip.

The correct response was not to defend the asset because its name sounded appropriate. The clip was removed from the randomized pool while the good ScratchArm and head-only behaviors were retained.

For embodied systems, **semantic fit must be judged on the actual avatar**, not inferred from filenames or successful montage playback.

## Priority and cancellation rules

Ambient behavior should never compete with interaction.

A practical priority order is:

```text
active conversation / explicit user action
→ moving room behavior
→ event-cued attention
→ stationary fidget
→ quiet neutral stand
```

If a higher-priority state starts, cancel pending lower-priority timers rather than letting them fire late. When the higher-priority state ends, begin a fresh quiet interval instead of immediately "catching up" on skipped idles.

Also prevent immediate repetition and keep per-action cooldowns. Randomness without memory can still look mechanical.

## What is validated versus still tunable

The reference build visually validated natural window-looking, ScratchArm, and a clean fireplace round trip. The body LookAround clip was rejected from the random pool after live observation.

The exact delay ranges, probabilities, and future behavior weights remain tuning values rather than locked architecture. More moving idles such as radio, TV, furniture, and room exploration can be added later without changing the two-layer model.

The reusable principle is: **build presence from stillness, sparse motion, environmental attention, and clear behavior ownership, not from constant animation.**
