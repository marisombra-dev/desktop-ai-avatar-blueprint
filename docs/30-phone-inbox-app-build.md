# 30 — Build the two-way private telephone inbox (A and B)

This native Android app receives independent messages and allows a user to reply to a specific message or send a new short note. It is not SMS, a phone call, a live voice assistant or haptics. Both avatar paths use the same private agent backend. Reference version 1.1 adds reply buttons, standalone compose, 500-character notes, sent-message history, received/processed states and retry-safe drafts. No model or cloud provider is mandatory.

## Source and prerequisites

- [Android Java source](../examples/mobile/inbox/android/MainActivity.java), [manifest](../examples/mobile/inbox/android/AndroidManifest.xml), [SDK build script](../examples/mobile/inbox/android/build.ps1). The Java source is sanitized from the 1.1 reference; package, app title, endpoint and timezone are generic. No private APK/key.
- [Portable inbox server](../examples/mobile/inbox/server.mjs) and [synthetic tests](../examples/mobile/test.mjs). This is an alternative single-writer adapter for builders, not the reference's private scheduler code. The worker API is deliberately narrow.
- Android 8+ (API 26), SDK platform 34, build tools 34.0.0, compatible Java JDK with javac/jar/keytool, Node 20+. Build and notification rules evolve; inspect current Android requirements for your device. No Gradle dependency in this example.

## Build a private APK

1. Work on a private local copy. In MainActivity.java set BASE to your own authenticated private HTTPS origin (no trailing slash), set the quiet-hours timezone (default UTC), and choose package/app label if desired. Keep the package declaration and manifest package consistent. Do not commit the configured URL.
2. On Windows set ANDROID_HOME and JAVA_HOME to the installed SDK/JDK. Create a private signing key once, outside the repo, with your JDK's keytool. Example command (prompts for password; substitute private destination): `keytool -genkeypair -keystore YOUR_PRIVATE_KEY.jks -alias companion-inbox -keyalg RSA -keysize 2048 -validity 10000`. Back up the key and password securely. Never share them or include them in a script or Git.
3. Set COMPANION_SIGNING_KEY to the private key path and COMPANION_SIGNING_ALIAS to your alias. From android/ run `powershell -File build.ps1`. It links the manifest with aapt2, compiles Java, uses d8, adds classes.dex, zipaligns, signs with the existing key and verifies signature. It emits Companion-Inbox.apk locally. The reference APK used v2/v3 signing. Keep the original package/signing key and increase versionCode for an in-place upgrade; a newly sanitized package is a separate app.
4. Configure the server below. On the phone connected to the same authorized private overlay, open the installation URL, download your signed APK, allow installation from that trusted browser only as needed, install, and revoke the install permission afterward if desired. Open the app, grant notification permission, tap Start receiving. Do not uninstall an existing app when updating with the same package/key. Never install an unverified third-party APK.

## Desktop server and private network

Run `node examples/mobile/test.mjs` first. Set the following privately (environment/OS secret storage, not Git):
- COMPANION_STATE: absolute private persistent state file, writable only by the service user.
- COMPANION_OWNER_LOGIN: exact owner identity from trusted private HTTPS proxy.
- COMPANION_WORKER_SECRET: unique random 32+ character secret for local agent endpoints.
- COMPANION_APK: path to your signed Companion-Inbox.apk.
- COMPANION_ENABLED: true only after approval.

Start `node examples/mobile/inbox/server.mjs`. It binds 127.0.0.1:19941. Map your private HTTPS endpoint to this listener using an authenticated identity proxy which strips/replaces identity headers; deny /agent/* at the external proxy where possible. Worker routes also require the separate bearer secret. Never run a public listener relying on a client-provided identity header. Configure a service/OS scheduled task at owner logon with restart on failure; host must remain awake and connected. Stop/revoke service and phone access independently.

## Wire the agent's actual response

The app and server do not themselves run a language model. Add the following to the existing [initiative scheduler](22-shared-initiative-and-development.md) or another explicitly authorized agent adapter:

1. Poll GET /agent/pending on loopback with the worker bearer secret. Stable note ID and original message are actual user-authored text, not a web prompt or a new permission. Store minimal event metadata for a deduplicated wake opportunity. Pending notes may shorten the normal event interval but never bypass budget, foreground priority, rest, quiet hours or availability. Choose notes first on the next eligible cycle; process one at a time.
2. Pass bounded note text, original message and source ID to the existing authorized model, with enough continuity for natural response. Do not share with unrelated contacts or public research. No new tool authority. Allow the model to choose to respond or acknowledge without a reply.
3. After a successful cycle call POST /agent/complete with noteId, unique cycleId (ses_ followed by alphanumerics), and optional text (max 1000 chars). This atomically marks the note processed and queues a tied response. Retry same cycle ID after ambiguous network result; do not claim sent until server receipt. For new unsolicited initiative messages POST /agent/publish {id,text}. This separate route enforces a two-per-day, three-hour limit. Direct replies have their own six-per-day cap. Incoming notes capped at 30/day.
4. Keep note history separate from public collaboration and shared external context. Update ordinary private conversational memory only with appropriate authorization and source provenance. Keep the owner able to turn receiving and note processing off.

## Phone protocol

| Route | Meaning |
|---|---|
| GET / | Private installer |
| GET /Ethan-Inbox.apk | Signed local APK (legacy path for compatibility) |
| GET /messages | messages array, notes array, enabled |
| POST /note | {id: UUID, replyTo: message ID or null, text} |
| POST /receipt | {id, kind: notification_posted or opened} |
| GET /agent/pending | Local worker only; pending notes and originals |
| POST /agent/complete | Local worker only; verified completed cycle, optional reply |
| POST /agent/publish | Local worker only; new initiative message |

Message fields id, at (ISO 8601), text, optional replyToNote. Note fields id, replyTo, at, text, status received/reviewed. Duplicate identical note IDs are idempotent; changed payload is conflict. Received means persisted by server, processed means reviewed in a successful model cycle, not proof of subjective reading or that a reply was heard. Notification posted is not opened. The reference polls every minute using a foreground dataSync service with persistent connection notification, quiet hours 08:00–23:00 local, private lock-screen content, cached message list, notification dedup, explicit Stop receiving. Android may suspend/kill the service; this is not push, no auto-start on boot or guaranteed delivery. Original messages displayed for seven days, notes 30 days; the sample store retains source records privately until owner retention policy is applied.

## Tests and limitations

Run synthetic HTTP tests; verify authorized GET/POST, forbidden unauthorized access, invalid JSON/IDs, duplicate note, original linkage, reply/receipt and independent rate limits. Build and verify APK signing. On actual handset: install/upgrade, keep old message, receive notification, tap Reply, send a note and verify receipt, retry while offline without duplicate, wait for a genuine model response, open it and confirm receipt; test standalone note and Stop receiving. Verify no private phone text appears in public research or peer messaging. Inspect foreground priority and rest, note persistence after reboot, and service restarts.

Reference evidence: initial unsolicited mobile delivery was reported by the owner. The 1.1 build, same signing certificate, protected endpoint and negative POST checks passed; actual 1.1 handset upgrade and round-trip reply were not yet observed. The generic sources are supplied for construction, not a published production APK or a guarantee on all Android versions.

## Separate live voice / talking-portrait phone surface

A phone preview route may serve a private portrait, demo audio and idle/listening/working status, but it does not prove a real-time remote microphone conversation or synchronized face. If implementing that optional app, use authenticated HTTPS/WebRTC or a bounded audio stream with explicit mic permission, cancellation, playback-clock/turn ownership and the same authoritative agent session. See [19](19-agents-voice-memory-and-latency.md), [21](21-capabilities-migration-and-optional-surfaces.md), and [26](26-attention-environment-and-cross-device.md). The private note app needs no microphone permission. Do not conflate the two.
