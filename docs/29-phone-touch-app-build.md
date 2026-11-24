# 29 — Build the phone touch and haptic app (A and B)

This is the construction guide for the paired phone touch surface, not a robot or a claim of biological sensation. It is shared across Unreal/MetaHuman and photographic 2D. Read [18](18-mobile-touch-and-haptics.md) for the full gesture/behavior contract. The [complete portable reference](../examples/mobile/haptics/server.mjs), [phone HTML](../examples/mobile/haptics/phone.html) and [browser JavaScript](../examples/mobile/haptics/phone.js) use a synthetic neutral SVG and Node 20+, with no avatar or model dependency.

## Installation and pairing

1. Install Node 20+ on the desktop, clone the blueprint and run the synthetic tests: `node examples/mobile/test.mjs`.
2. Choose a trusted private network/HTTPS proxy that authenticates the phone owner. A private overlay HTTPS service is one option. Configure the proxy to strip and replace incoming identity headers; configure the exact authenticated owner login privately in COMPANION_OWNER_LOGIN. Only trust this header on loopback from the private proxy. Do not publish a LAN bearer token in a URL or QR screenshot; for a separate pairing implementation see [secure pairing](../examples/secure_mobile_pairing.ts).
3. Start `node examples/mobile/haptics/server.mjs` with the private environment variable set. The demo listens on 127.0.0.1:19942. Map a private HTTPS endpoint to that port, require owner identity, never expose the raw listener publicly. Generate a fresh QR for the actual current endpoint locally. Do not embed the reference machine's address or token.
4. Open the private HTTPS URL in the phone browser. If desired, add the page to the home screen using the browser's installation/shortcut feature (not a native APK). Enable vibration explicitly. Test three distinct regions, a sustained press and stroke; the page shows server receipts. The synthetic map is deliberately generic. A licensed private body image may replace it locally only when served behind the same authentication; adjust geometry and region mapping, never commit the image.
5. To integrate, import createTouchHub and createTouchServer, pass an onTouch callback and onLive callback in the desktop host, start the loopback server and bind the hub's setState to the existing foreground state. A standalone demo emits only synthetic touch acknowledgments; it does not connect to your agent automatically.

## Wire the agent, renderer and haptic return

On a completed touch, the server computes semantic gesture from normalized image-relative coordinates, path and duration. Emit a trusted bounded record (event ID, server time, gesture, regions, direction, pace, verified source) to the selected conversation agent via its existing sensor/context adapter. Preserve actual incoming user speech separately. In normal dialogue, a gesture can be acknowledged naturally when relevant, rather than reciting an anatomical location; for accuracy testing, explicit region reporting is useful. No event means no touch, and stale/missing data must never be interpreted as new contact.

Use a short-lived live touch snapshot for immediate glance/expression if supported. Clear it on cancel/end, disconnection or expiry; never carry a previous touch into a later unrelated voice turn. Route any visible reaction through the existing renderer-neutral expression/gesture adapter; ongoing speech owns the mouth. An optional response or silence is valid. Bound movement/speech/haptic rates independently.

Call hub.haptic([30], 'touch_reply') on the trusted desktop side to request a return vibration. The phone opts in and calls navigator.vibrate; the hub resolves with browser_accepted, not_accepted, timeout, disconnected or cooldown. Do not imply physical vibration was felt merely because the API accepted a command. No unbounded replays or forced speech.

## Protocol and reconnection

| Endpoint | Purpose |
|---|---|
| GET / | Authenticated phone touch page |
| GET /phone.js | Authenticated browser logic |
| GET /api/stream | SSE ready/command with heartbeat; response-close releases stream |
| GET /api/poll?since=N | Authenticated bounded command queue and cursor; -1 establishes baseline |
| POST /api/event | JSON hello, bye, touch_live, touch_trace, haptic_request, haptic_ack |

touch_trace fields: eventId (UUID), startX/startY/lastX/lastY in 0–1, integrated path, durationMs. touch_live fields: active, x, y; haptic_ack fields: id, accepted. Ignore client-supplied identity/region labels and use server receipt timestamp. SSE and polling share sequence IDs; the browser deduplicates them. The actual reference used an approximately 1.1-second HTTPS fallback poll, 4.5-second request timeout, 5-second fresh connection window, bounded 64-command/15-second history and response-close tracking. These matter when Android suspends an SSE stream. The portable example preserves the pattern with a more restrictive proxy-based authentication and a separate cancel path. Restart may reset sequence state; reconnect establishes baseline and old commands are not replayed. For production use explicit server epoch, per-device session and bounded event rate, and expire pending acknowledgments on disconnect.

## Acceptance and troubleshooting

- QR opens wrong host: regenerate from current private endpoint; test TLS and overlay connectivity. Do not temporarily open public ports.
- Stuck reconnecting: verify both authenticated GET /api/poll and stream, check proxy buffering and whether phone page is visible; a fresh successful poll is evidence of connection even if SSE is suspended.
- Phone sees touch but model invents extra events: inspect actual semantic receipt, freshness, context injection and clearing; run a no-touch conversation, then an intentional randomized touch sequence. A model assertion is not evidence.
- Vibration absent: check opt-in, browser support, user interaction permission, quiet/device settings, actual acknowledgment and timeout. Browser accepted is not physical confirmation.
- Test tap/press/stroke, cancel, malformed coordinates, duplicates, stale event, disconnect/reconnect, auth denial, no-touch control and actual human-observed vibration. Verify the selected renderer and voice remain responsive. The demo cannot establish live model perception or tactile sensation.

For the separate asynchronous telephone note app see [30](30-phone-inbox-app-build.md). A live talking portrait or mobile voice transport is a third independent optional surface, not required for either.
