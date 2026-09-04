# 07 — Screen and Camera Vision

The goal is not to tell the AI that a sensor is enabled. The goal is to give it **fresh visual evidence** when the user asks, while making OFF mean physically off.

## 1. Privacy state belongs in the desktop shell

Maintain explicit state such as:

```ts
type PrivacyState = {
  microphone: 'on' | 'off';
  screen: 'on' | 'off';
  playback: 'on' | 'off';
  camera?: 'on' | 'off';
};
```

The reference UI exposes Mic / Screen / Camera directly. Keep the indicators obvious enough that the user can tell what is active at a glance.

Never allow capture functions to ignore the state just because a model asked.

## 2. Screen capture in Electron main

Use `desktopCapturer` in the privileged main process.

Conceptual function:

```ts
async function capturePrimaryScreenFrame(): Promise<ScreenFrame> {
  if (privacy.screen !== 'on') throw new Error('Screen sharing is off.');

  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 800, height: 450 },
    fetchWindowIcons: false
  });

  const source = sources.find(s => s.display_id === String(display.id)) ?? sources[0];
  if (!source || source.thumbnail.isEmpty()) throw new Error('Could not capture screen.');

  // resize/compress to a bounded JPEG
  ...
}
```

The reference build uses a progressive JPEG ladder roughly like:

```ts
const attempts = [
  { width: 720, quality: 58 },
  { width: 600, quality: 48 },
  { width: 480, quality: 40 }
];
```

and stops when the encoded frame is small enough for efficient transport.

The exact byte limit is implementation-specific. The principle is: a desktop assistant does not need lossless 4K PNGs to tell whether a browser, game, or dialog is visible.

## 3. Prove capture independently

Before debugging voice, run a smoke test that:

1. sets screen privacy ON in a controlled test path,
2. calls `desktopCapturer.getSources`,
3. chooses the target display,
4. writes one JPEG to a temp/log path,
5. verifies non-zero bytes/dimensions,
6. visually opens the JPEG.

This isolates Windows/Electron screen-capture permission from Realtime/OpenClaw behavior.

## 4. Explicit “look now” screen flow

A spoken screen-on request should not merely enable a background watcher.

Reference flow:

```text
transcription completed
  ↓
SCREEN_ON intent
  ↓
set Electron screen state ON
  ↓
cancel an already-active realtime response if needed
  ↓
capture three fresh frames ~350 ms apart
  ↓
create a user item containing text labels + input_image items
  ↓
response.create
```

Example event content shape:

```ts
const content = [
  {
    type: 'input_text',
    text: 'The user just asked you to look at the screen. Screen awareness is ON. Inspect the fresh frames and answer the actual request.'
  },
  { type: 'input_text', text: 'Screen frame 1 of 3:' },
  { type: 'input_image', image_url: `data:image/jpeg;base64,${frame1}` },
  { type: 'input_text', text: 'Screen frame 2 of 3:' },
  { type: 'input_image', image_url: `data:image/jpeg;base64,${frame2}` },
  { type: 'input_text', text: 'Screen frame 3 of 3:' },
  { type: 'input_image', image_url: `data:image/jpeg;base64,${frame3}` }
];

send({
  type: 'conversation.item.create',
  item: { type: 'message', role: 'user', content }
});
send({ type: 'response.create' });
```

Use the current OpenAI Realtime input-image event schema. The API evolves.

## 5. Why use multiple frames?

One screen still can miss:

- a popup that just appeared,
- game motion/state transition,
- video action,
- a loading result,
- cursor/UI response to an action.

A short 3-frame sequence gives temporal context at low cost without becoming video streaming.

For a static document, one frame may be enough; three is a robust default for “look at what is happening.”

## 6. Screen OFF invalidates prior context

When screen turns off, send an explicit system context message:

```text
[SHARED SCREEN ENDED. Do not treat earlier screen summaries or images as current visual information.]
```

This prevents the model from casually describing the last-seen screen as if it remains visible.

Also make the capture IPC itself reject requests while OFF.

## 7. Ongoing screen watcher

Explicit look-now answers a question. Ongoing awareness supports “watch this with me.”

The reference watcher uses local change detection to avoid sending every frame.

### Sampling

Known-good starting values:

```text
sample interval: 1000 ms
minimum model-analysis interval: 5000 ms
heartbeat: 20000 ms
frame-change threshold: ~0.035 normalized difference
normal comment cooldown: 20000 ms
high-importance cooldown: 8000 ms
```

### Fingerprinting

For each sample:

1. capture roughly 640×360,
2. resize a copy to ~160×90,
3. obtain bitmap bytes,
4. compare sampled RGB bytes against previous bitmap,
5. compute normalized absolute difference.

You do not need computer vision just to tell whether the scene changed materially.

### Analysis trigger

Analyze when:

```text
change >= threshold AND min interval elapsed
OR
heartbeat interval elapsed
```

When change triggered and a previous analyzed frame exists, send both old and new frames. This lets the observer describe what changed.

## 8. Use a separate screen-observer OpenClaw session

Ask that session for strict JSON:

```json
{
  "summary": "one or two factual sentences",
  "event": "most meaningful new event or empty string",
  "importance": 0.0,
  "comment": "NO_COMMENT",
  "mode": "game|video|desktop|other"
}
```

Prompt principles:

- frames are user-authorized shared-screen images,
- identify what is actually happening now,
- ignore the avatar controls if visible in a corner,
- importance near zero for routine/static changes,
- high importance only for genuinely salient moments,
- silence is default,
- do not narrate scrolling, menus, ordinary gameplay movement, every video cut,
- any comment should sound like the main AI person and be short.

Parse defensively and clamp importance to [0, 1].

## 9. Comment gate

The reference system only allows a screen-watcher comment when something like:

```text
importance >= 0.72
AND cooldown elapsed
```

Very high importance (around 0.93+) can use a shorter cooldown.

This threshold is intentionally conservative.

## 10. Feed summaries to live voice without forcing speech

When a screen observation arrives while screen awareness and live voice are active, insert it as **non-response context**:

```text
[SHARED SCREEN CONTEXT UPDATE. Do not respond to this message by itself.]
Current screen: ...
Most recent meaningful event: ...
Screen mode: game.
Use this naturally if the user refers to what is on screen. Fresh visual capture overrides this summary.
```

Do not call `response.create` merely because the summary changed.

If the screen observer authored a permitted comment, use an exact-playback response to speak that line without elaboration.

## 11. Camera lifecycle

Renderer-side camera ON:

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user'
  }
});
```

Attach it to a hidden `<video>` and wait for playable video.

Create a reusable `<canvas>` for bounded still capture.

## 12. Capture one camera frame

Conceptual:

```ts
function captureCameraFrame() {
  if (!cameraEnabled || !video || video.readyState < 2) {
    throw new Error('Camera is not ready.');
  }

  const sourceW = video.videoWidth || 640;
  const sourceH = video.videoHeight || 480;
  const scale = Math.min(1, 640 / sourceW, 480 / sourceH);
  const width = Math.round(sourceW * scale);
  const height = Math.round(sourceH * scale);

  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(video, 0, 0, width, height);
  const url = canvas.toDataURL('image/jpeg', 0.78);
  return url;
}
```

Send it to Realtime with an explicit “Webcam view:” label.

## 13. Camera OFF means stop tracks

```ts
for (const track of cameraStream.getTracks()) track.stop();
video.srcObject = null;
video.remove();
cameraStream = undefined;
video = undefined;
canvas = undefined;
cameraEnabled = false;
```

Do this when:

- user says camera off,
- Camera button is turned off,
- live voice ends,
- app shuts down.

## 14. Combined describe-view tool

A useful realtime/OpenClaw tool can return all enabled current sensors.

Pseudo-flow:

```ts
if (!cameraEnabled && !screenEnabled) return error('Both are off');

if (cameraEnabled) add one labeled camera image;
if (screenEnabled) add three labeled screen images;

create user multimodal item;
return function-call output describing source metadata;
response.create;
```

The image item gives the model pixels. The function output tells the tool caller which sources were successfully collected.

## 15. Race handling

A common failure sequence:

```text
user speaks “look at the screen”
provider starts an automatic text response
local transcript handler turns screen on
local code also creates an image-grounded response
```

You can end up with an old “I can't see your screen” response racing the new visual response.

Before injecting a fresh sensor request:

```ts
if (responseActive) {
  send({ type: 'response.cancel' });
  responseActive = false;
  await sleep(100–150ms);
}
```

Then add the image item and create the new response.

## 16. Objective validation tests

### Screen

Ask:

- “What application is open?”
- “What does the large heading say?”
- “Which side of the screen is the dialog on?”

Change the screen between tests.

### Camera

Ask:

- “How many fingers am I holding up?”
- “What object am I holding?”
- “Am I wearing glasses right now?”

The reference system's camera path was accepted only after it correctly answered a finger-count question.

## 17. Failure diagnosis matrix

### Spoken request, button stays OFF
Investigate transcription/local-intent/tool callback.

### Button ON, exact capture smoke fails
Investigate Electron/OS capture or permission.

### Button ON, capture works, provider error appears
Inspect exact Realtime event/schema error.

### Button ON, no error, answer says sensor unavailable
Investigate response race and whether fresh image item actually preceded the created response.

### Correct first visual answer, later stale descriptions after OFF
Add/verify stale-context invalidation and capture refusal.

### Camera light stays on after OFF
You did not stop the media tracks.

## Exit criteria

- [ ] Screen starts OFF and capture rejects OFF state.
- [ ] Camera starts OFF and no track is open.
- [ ] Manual toggles work.
- [ ] Spoken toggles work.
- [ ] Explicit screen request sends fresh pixels.
- [ ] Explicit camera request sends fresh pixels.
- [ ] Objective visual questions pass.
- [ ] Sensor OFF invalidates old context.
- [ ] Screen watcher is change-driven and restrained.
- [ ] Watcher failure never breaks ordinary voice chat.