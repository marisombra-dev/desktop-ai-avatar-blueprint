# 18 — Mobile touch, physical-presence events and haptics

A mobile companion can provide **touch input and vibration output** without a physical robot. The phone touch surface is its own paired peripheral; the avatar need not be MetaHuman. It is not a claim of real tactile sensation inside the model.

## Architecture

~~~text
Phone browser / installable web app
  private interactive body-map image or generic SVG silhouette
    pointerdown / move / up → normalized touch samples
       ↓ paired local network, authenticated event endpoint
Desktop main: physical-presence server
    gesture classifier + region mapper + sensor state
       ↘ controlled avatar reaction (face/pose)
       ↘ bounded semantic context for the conversation agent
       ↘ optional spoken response, with cooldown and silent outcome
Desktop main → verified phone stream → navigator.vibrate()
                                    ↳ browser acceptance acknowledgment
~~~

The source reference uses a phone-accessible local HTTP server, a high-entropy pairing token, a browser EventSource stream and authenticated POST events. Use a private network or secure transport with an explicit user pairing step; do not put its token in a public link, log or QR screenshot. Bind more restrictively than 0.0.0.0 where practical, or firewall/authorize trusted LAN clients. A browser vibration API is not universally supported, particularly on iOS or in insecure/browser-specific contexts.

Do not embed the actual private subject body/portrait in the blueprint. Use a neutral SVG humanoid, unit test coordinates, and let the *user* supply a licensed body map locally. The desktop may host the private image to the paired phone but must never leak it to a public endpoint, log, repository, caching proxy or unpaired caller.

## Incoming touch events

Use Pointer Events and pointer capture so a continuous drag survives movement within the interactive area. Record normalized [0,1] coordinates relative to the **image** rather than the padded page; suppress accidental scrolling and avoid saving the whole stroke into long-term history.

Recommended contract:

~~~ts
type TouchTrace = {
  id: number;
  start: {x:number;y:number};
  end: {x:number;y:number};
  pathLength: number;        // normalized integrated distance
  durationMs: number;
};
type TouchGesture = 'tap'|'press'|'stroke';
type SemanticTouch = {
  gesture: TouchGesture; startRegion:string; endRegion:string;
  durationMs:number; direction?:string; pace?:string;
  at:number; verifiedBy:'paired-phone';
};
~~~

Reference classifier:
- tap: path below ~0.025 and duration under ~340 ms;
- sustained press: path below ~0.03 and duration at least ~650 ms;
- otherwise a stroke;
- characterize direction using absolute dx/dy (one axis dominant over the other) and pace from normalized path per elapsed second;
- map normalized coordinates into bounded semantic regions (head, shoulder, arm, hand, torso, etc.), according to the user's **private map**.

All thresholds are initial engineering defaults; calibrate per device and accessible interaction style. Clamp coordinates, duration, path and numeric payloads; reject malformed/oversized messages. Do not trust client-supplied region names, permissions, timestamps or arbitrary commands. Server computes region/gesture itself.

A short live touch-state packet may update the face faster than an eventual completed gesture: on start/drag maintain optional latest position and expiry, on release/cancel remove it. The model receives a concise semantic event only when enough verified data exists, not a continuous unbounded touch stream.

## Optional responsive avatar behavior

One intentional touch may cause a small look, expression or glance; repeated frantic gesture events should not flood either the model or the renderer. The inspected reference has separate cooldowns for avatar movement (~900 ms), reciprocal haptics (~1.1 s), and proactive speech (~30 s), plus a probability-based silent path for spoken touch reactions.

Never hardwire sexual, emotional or psychological interpretation into touch coordinates. Regions and preferred response styles are user-configurable in private profile/consent settings. A safe default is a simple acknowledgment, and “NO_MESSAGE” is an acceptable outcome.

Keep touch reactions subordinate to ongoing voice, explicit screen attention, sensor/privacy state and a user's request for quiet. Do not turn haptic delivery into a forced conversational turn.

## Outgoing haptic commands

Implement patterns in milliseconds, arrays alternating vibration/pause, with length and duration bounds (the reference limits at most 16 elements and clamps each to [0,2000] ms). Example defaults:

~~~ts
const hapticPatterns = {
  tapReply: [30],
  pressReply: [180],
  strokeReply: [24,38,60],
  tinyReceiveAcknowledgment: [16],
  test: [65,55,120]
};
~~~

These are illustrative conservative patterns; the phone user can opt out of all or selected acknowledgments, and reduced-vibration/device settings must win. Use a single phone stream event of the form:

~~~json
{"type":"haptic","id":"example-request-id","pattern":[30],"reason":"touch_reply"}
~~~

In the browser, call navigator.vibrate(pattern) *only if present*, catch failures, and return haptic_ack {id,accepted}. The main server holds an acknowledgment promise bounded by a short timeout (~1400 ms in the inspected reference). A stream being connected or an HTTP request succeeding is NOT proof of vibration; even accepted:true proves the browser accepted the request, not that a motor moved perceptibly. Show “requested,” “browser accepted,” “unsupported” or “timed out” accurately. Never claim the AI “felt” the event literally.

The original uses a reciprocal haptic after tap/press/deliberate stroke, delayed around 220–340 ms and separated from the immediate tiny receipt buzz. A press reply can scale modestly with its duration. An unpaired or unsupported phone should not break conversation, nor should it cause repeated retries.

## Phone talking portrait and remote access are separate

A simple phone talking-portrait preview that changes idle/listening/working states or plays a sample audio clip does **not** establish live remote conversational ASR/TTS, authenticated WebRTC, or true neural lip sync. Do not copy desktop speech assumptions into the phone and mark the mobile gate complete. Full phone avatar requires a separate transport for live audio, video/frames, turn ownership, cancellation, reconnection, microphone consent and matching identity session.

A phone on a different network requires deliberate network security and pairing; do not expose the LAN development server directly on public Internet as a shortcut.

## Test gates

1. Open a paired phone on the trusted network, confirm private image loads only after authentication, and verify disconnect revokes the active presence state.
2. Tap, hold and stroke three different neutral silhouette regions; server records correct region/gesture/duration and directional movement; end and cancel clear live touch.
3. Verify the model receives bounded semantic context on the correct turn, without treating stale, forged, missing or malformed touch packets as facts.
4. Verify no unnecessary voice reply is produced, cooldown works, and touch never blocks mic or lip sync.
5. In supported Android browser, receive test vibration and inspect browser acknowledgment; test browser/API unsupported and user-disabled vibration.
6. Disconnect mid-acknowledgment: server times out rather than inventing success; reconnect does not replay old pulses.
7. Confirm touch/face interaction works with either MetaHuman or photographic face, without ever sending private image bytes to the model unless explicit authorized vision was requested.
8. Run security checks for token exposure, request limits, caching headers, origin/network policy, no LAN exposure without pairing and secret-free logs.

## Complete portable implementation

See [29 — phone touch app build](29-phone-touch-app-build.md) for installation, private pairing/HTTPS, reconnection, actual sensor integration and source code. The [two-way telephone inbox](30-phone-inbox-app-build.md) is separate.
