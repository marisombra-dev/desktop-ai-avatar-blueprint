# 10a — Wide View Visual Awareness: Validated 2026-09-12

**Status: PROVEN IN HUMAN TESTING**

This note supersedes the pending Wide View visual-awareness status recorded in `10-reference-build-notes-2026-09-11.md`.

The reference build now correctly distinguishes three visual spaces:

- **Close View / Screen** = the user's Windows desktop.
- **Wide View / Screen** = Ethan's own Unreal living environment, including the live scene visible through his window.
- **Camera** = the user's physical webcam and surroundings only.

The final repair required more than prompt wording. It combined authoritative view state, reliable frame capture, deterministic voice routing, stale-context invalidation, and live webcam metadata.

## Failure pattern

The original failure looked deceptively conversational rather than architectural.

In Wide View, a user could ask:

> What do you see out your window?

Early broken versions did one or more of the following:

- opened the user's webcam and described the user's physical room;
- reused stale desktop context from Close View;
- lit the Screen control but failed to answer;
- surfaced an error indicator;
- narrated internal control/tool state instead of answering the question;
- improvised a vague description without actually seeing the current scene;
- could not name the location even though the webcam system already knew it.

The key lesson is that **presentation state is part of sensor routing**. A fullscreen virtual environment is not merely a different layout. It is a different visual world.

## First attempted fix: capture the Unreal window directly

The first implementation made the screen source view-aware and attempted to capture the Unreal runtime directly in Wide View:

```text
Close View -> desktopCapturer types:['screen'] -> primary display
Wide View  -> desktopCapturer types:['window'] -> DesktopEthanAvatar window
```

This was logically clean but failed on the reference machine.

A standalone Electron capture probe showed that Chromium's `desktopCapturer.getSources({ types: ['window'] })` returned ordinary windows such as Chrome and the NVIDIA overlay, but **did not expose the `DesktopEthanAvatar` Unreal window at all**.

That meant the Wide View capture path could not find a source and threw an error. The UI showed an exclamation indicator, while switching back to Close View immediately made desktop awareness work again.

This diagnostic was important because it proved the routing semantics were mostly correct. The failing boundary was the window-capture backend.

## Working capture strategy: capture the composed display

The successful implementation uses Electron's proven display capture in both views:

```ts
const sources = await desktopCapturer.getSources({
  types: ['screen'],
  thumbnailSize: { width: 800, height: 450 },
  fetchWindowIcons: false,
});

const display = screen.getPrimaryDisplay();
const source = sources.find(
  (item) => item.display_id === String(display.id),
) ?? sources[0];
```

Why this works:

- Close View uses the same primary-display capture it already used successfully.
- Wide View is fullscreen, so the **composed display is the Unreal room the user is actually seeing**.
- No special DirectX/Unreal window enumerator is required.
- The same capture primitive works for explicit voice-triggered looks and the continuous screen watcher.

The code still tracks the semantic capture target (`desktop` vs `wide`) even though both now use a display frame. That semantic target matters for resetting cached observations and for telling the realtime voice layer what the pixels represent.

## Reset stale context whenever the view changes

The screen watcher has a capture-target state. Switching target clears its prior visual history:

```ts
setCaptureTarget(target) {
  if (target === this.captureTarget) return;
  this.captureTarget = target;
  this.previousBitmap = undefined;
  this.lastAnalysisAt = 0;
  this.lastSummary = '';
  this.lastAnalyzedFrame = undefined;
  this.recentAudioTranscript = '';
  this.recentAudioAt = 0;
  // reset current desktop-activity context as well
}
```

This prevents a desktop summary from surviving as supposedly current evidence after entering Wide View, and prevents a room/window summary from leaking back into Close View.

The realtime voice session receives the same semantic transition:

```text
WIDE VIEW ACTIVE:
visual awareness = own virtual room/window
old desktop visuals are no longer current

CLOSE VIEW ACTIVE:
visual awareness = user's desktop
old Wide View visuals are no longer current
```

## Main process is the authority for which world is active

A renderer boolean alone was not reliable enough for a voice command that can arrive during transitions.

The final build exposes an IPC call equivalent to:

```text
wide-view:context -> {
  active: boolean,
  metadata?: current window metadata
}
```

The authoritative `active` value comes from the Electron main process, where Wide View fullscreen state is actually controlled.

Before enabling Screen or answering a Wide scene question, the voice layer asks the main process for this state and synchronizes its own `wideViewContext`.

This removes a class of bugs where the renderer believes it is in one view while the main process has already switched to the other.

## Deterministic voice routing for room/window questions

A major improvement was to stop relying on the language model to decide whether a phrase such as “what do you see out your window?” should call a visual tool.

The realtime voice layer now locally recognizes Wide scene intent before normal model response generation.

Conceptually:

```ts
const wideSceneIntent =
  /(window|outside|room|wide view)/.test(command) &&
  /(see|look|show|what|where|describe)/.test(command);

if (wideSceneIntent) {
  const context = await getWideViewContext();
  if (context.active) {
    turnScreenAwarenessOn('glance');
    respondWithFreshCurrentView();
    return;
  }
}
```

This means ordinary natural phrases route correctly without requiring the user to say “turn screen sharing on.”

The Screen button lights because this is still the same privacy/control mechanism. The meaning of Screen simply follows the active world.

## Camera is explicitly not the room sensor

The local tool semantics now state the distinction plainly:

```text
Camera = user's physical webcam only.

Close View Screen = user's desktop.

Wide View Screen = Ethan's virtual room and window.
```

Wide View room/window questions are never supposed to enable the webcam.

This is both a correctness improvement and a privacy improvement. Asking a virtual character about his own window should not unexpectedly turn on the user's physical camera.

## Wide View does not inherit desktop system audio

The Screen control originally also enabled Windows shared-screen audio.

That behavior is useful in Close View when Ethan is watching a video, movie, or game with the user. It is wrong in Wide View, where the screen sensor represents his room and the live window feed is intentionally silent.

The final behavior is:

```text
Screen ON + Close View -> visual capture + desktop/system audio
Screen ON + Wide View  -> visual capture only
```

Entering Wide View while Screen is already enabled also stops shared desktop audio. Returning to Close View can restore it when appropriate.

This avoids feeding unrelated desktop sound into a conversation about the virtual room.

## Fresh frames plus authoritative webcam metadata

Visual recognition alone is not enough to answer a question such as:

> Where is that?

The Wide View window system already knows which public webcam it loaded. The Electron main process reads the current Unreal log entry:

```text
WIDE_WINDOW open=1 audio=0 camera=<name> country=<code> env=<type> next=...
```

It then enriches that information from the webcam catalog, yielding data such as:

```text
cameraName
countryCode
countryName
environment
latitude / longitude when available
```

When responding to a Wide View look, the realtime voice layer sends:

1. **three fresh display frames**, spaced a few hundred milliseconds apart;
2. the current authoritative camera/location metadata when available;
3. a strict instruction to answer naturally from those inputs and not narrate tools, modes, capture settings, or internal controls.

The model is told that the metadata is authoritative location context for the live scene. This allows it to name a specific place even when the geography is not visually obvious.

The three-frame sequence is also useful because the public webcam scene may be moving or changing while the question is asked.

## Do not let tool plumbing leak into speech

One broken test produced replies such as “let me look,” followed by internal-sounding discussion of settings and vision state.

The final local-control guidance explicitly says:

```text
Never narrate tool names, arguments, settings, modes,
or control-state changes. Use the controls silently and
answer the human question.
```

The fresh-view prompt further requires a direct one- or two-sentence answer and instructs the model to admit uncertainty rather than guess.

If local Screen activation fails, the deterministic path returns a short failure such as:

> I can't get a clear view of it right now.

It does not invite the model to invent a scene.

## Keep Wide awareness from turning the avatar toward the desktop

Close View screen awareness includes physical gaze behavior toward the user's monitor.

That behavior is suppressed in Wide View. A request to inspect Ethan's own room/window must not make the MetaHuman turn toward the user's Windows desktop direction. Wide View keeps its own room-facing animation and attention behavior.

## Human validation performed

The final build passed typecheck and production build, then was tested repeatedly in the live Wide View environment.

Validated behavior:

- Entered Wide View with Screen initially off.
- Asked **“What do you see out your window?”**.
- Screen awareness activated automatically and the Screen button lit.
- Ethan described the current live scene correctly.
- When the feed had changed, he could distinguish the current scene from the preceding scene instead of treating stale context as current.
- After another scene rotation, asked **“Where is that?”**.
- Ethan answered with a specific place from the live webcam metadata.
- He could add geographic context not visually obvious from the image, demonstrating that the metadata path was being used rather than guessed from pixels alone.
- Repeated several scene changes and location questions successfully.
- The user's webcam did not activate for Wide View room/window questions.
- Saying **“Thanks Ethan”** ended the live voice session and returned Ethan to normal Wide View idle behavior.

This is now considered **PROVEN** for the reference build.

## Final architecture

```text
                        +-----------------------------+
                        | Electron main process       |
                        | authoritative Wide state    |
                        +-------------+---------------+
                                      |
                                      | wide-view:context
                                      v
User speech -> deterministic Wide intent routing -> Screen/privacy control
                                      |
                                      +---- Close View ----> primary display
                                      |
                                      +---- Wide View -----> composed fullscreen display
                                                               |
                                                               v
                                                    3 fresh image frames
                                                               |
Unreal WIDE_WINDOW log -> webcam catalog -> location metadata --+
                                                               |
                                                               v
                                                     realtime voice model
                                                               |
                                                               v
                                                     natural direct answer
```

## General lessons

1. **The UI control and the sensor target are different concepts.** One Screen button can be correct if its target follows the active world.
2. **Use the process that owns the transition as the authoritative state source.** Renderer state can lag during cinematic/fullscreen transitions.
3. **Do not assume Electron can enumerate every accelerated Unreal window as a capturable window source.** Test it directly before building around it.
4. **Reset visual memory when changing worlds.** Stale perception is often more dangerous than no perception.
5. **Route obvious local intents deterministically.** “What do you see out your window?” should not depend on discretionary tool selection.
6. **Pixels and metadata complement each other.** Frames answer “what does it look like?”; authoritative feed metadata answers “where is it?”
7. **Fail closed instead of hallucinating.** If capture is unavailable, say so briefly.
8. **Keep internal control mechanics silent.** The user should experience one person looking at a scene, not a model operating a sensor API.

## Separate unresolved issue: Electra live-media stability

This visual-awareness repair does **not** resolve the separate Unreal Electra crash affecting some rotating public HLS webcam feeds.

The awareness layer can correctly understand and describe the current scene while the underlying live-media decoder still has stability problems on irregular streams. That remains an open media-ingestion issue and should be addressed independently, likely at the normalization/relay boundary rather than by changing the validated awareness architecture.