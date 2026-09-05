# 12 — Build Order Checklist

Use this as the execution checklist for a new AI person such as Lyra. Do not mark an item complete because source code exists. Mark it complete only after the observable validation passes.

## Phase A — Define the person

- [ ] Identify existing OpenClaw agent/workspace.
- [ ] Record desired wake name.
- [ ] Record desired realtime voice candidates.
- [ ] Record privacy expectations.
- [ ] Record proactive-speech boundaries.
- [ ] Write visual brief for avatar.
- [ ] Choose inspiration images.
- [ ] Choose/freeze canonical reference portrait.
- [ ] Save a few baseline agent-continuity questions for later regression testing.

**Gate A test:** Existing agent answers normally and is the identity source of truth.

---

## Phase B — Machine inventory

- [ ] Windows version.
- [ ] GPU/VRAM.
- [ ] Unreal install/version.
- [ ] MetaHuman plugin availability.
- [ ] Git.
- [ ] Node/npm.
- [ ] Python.
- [ ] OpenClaw version.
- [ ] Gateway address/health.
- [ ] microphone input device(s).
- [ ] speaker/output device(s).
- [ ] webcam device(s).
- [ ] optional loopback audio device.
- [ ] disk locations with enough space for Unreal project/assets.

**Gate B test:** Every prerequisite can launch independently.

---

## Phase C — Unreal + Monolith

- [ ] Create dedicated Unreal project.
- [ ] Enable MetaHuman/ControlRig/RigLogic required plugins.
- [ ] Install Monolith matching engine.
- [ ] Create `.mcp.json`.
- [ ] Launch Unreal and let Monolith index.
- [ ] Verify AI can use `monolith_discover` and inspect project assets.
- [ ] Firewall Monolith port appropriately.
- [ ] Create minimal avatar test map.
- [ ] Create locked portrait validation map.

**Gate C test:** AI makes one reversible structured Unreal edit through Monolith.

---

## Phase D — MetaHuman likeness

- [ ] Prepare source mesh/identity from canonical visual target.
- [ ] Use current supported From Identity / From Custom Mesh workflow.
- [ ] Inspect facial landmark solve manually.
- [ ] Assemble MetaHuman.
- [ ] Match macro silhouette.
- [ ] Match eyes/brows/nose/mouth.
- [ ] Match hair/hairline.
- [ ] Match facial hair/skin/clothing.
- [ ] Capture from locked portrait camera.
- [ ] Obtain human approval.
- [ ] Freeze/checkpoint approved face.

**Gate D test:** Human says the actual Unreal render is the intended person.

---

## Phase E — Stable avatar runtime

- [ ] Natural blink.
- [ ] Natural subtle gaze.
- [ ] Small idle motion.
- [ ] No fixed stare.
- [ ] No serious hair/clothing/neck artifact in normal range.
- [ ] Launch test map using `-game -windowed`.
- [ ] `-NoMouseCapture` or equivalent works.
- [ ] Choose small desktop resolution.
- [ ] Tune low-cost renderer/FPS.
- [ ] Command-line start/stop works.

**Gate E test:** Leave avatar idling several minutes while using computer normally.

---

## Phase F — Electron shell

- [ ] Create TypeScript/Electron app.
- [ ] Add minimal React renderer if desired.
- [ ] Use narrow preload bridge.
- [ ] Make shell frameless/transparent/always-on-top.
- [ ] Make drag region work.
- [ ] Add Mic / Screen / Camera visible controls.
- [ ] Add real error tooltip/logging.
- [ ] Launch Unreal runtime from Electron main.
- [ ] Sync Unreal window bounds to shell.
- [ ] Add tray/minimize/restore.
- [ ] Ensure no mouse trapping.
- [ ] Persist window bounds/settings.

**Gate F test:** Restart Electron repeatedly; avatar launches and follows it reliably.

---

## Phase G — OpenClaw Gateway

- [ ] Read Gateway token from local config at runtime.
- [ ] Never log/commit token.
- [ ] Connect Gateway client on loopback.
- [ ] Enforce protocol compatibility.
- [ ] Handle reconnects/transient startup failures.
- [ ] Subscribe to chat/session events.
- [ ] Define agent-prefixed desktop session key.
- [ ] Define separate proactive/screen observer session keys.
- [ ] Verify text `chat.send` to intended agent.

**Gate G test:** Desktop shell receives a correct text answer from the existing AI person.

---

## Phase H — Realtime voice

- [ ] Request client-owned WebRTC Talk session through OpenClaw.
- [ ] Use current realtime provider/model/voice config.
- [ ] Add microphone track.
- [ ] Create remote audio element.
- [ ] Create data channel.
- [ ] Exchange SDP through Gateway offer broker.
- [ ] Track listening/thinking/speaking/error phases.
- [ ] Persist user transcripts.
- [ ] Persist assistant transcripts.
- [ ] Verify interruption.
- [ ] Cleanly stop microphone/peer/channel.

**Gate H test:** Several minutes of ordinary realtime conversation without avatar lip sync yet.

---

## Phase I — Same-person routing

- [ ] Use agent-consult architecture.
- [ ] Configure force-agent-consult or current equivalent.
- [ ] Use minimal provider-facing delivery instruction.
- [ ] Forward `openclaw_agent_consult` through Gateway.
- [ ] Wait for run-id final response.
- [ ] Return result to provider.
- [ ] Do not expose “checking with Lyra” architecture in spoken response.
- [ ] Run baseline continuity questions.

**Gate I test:** Human cannot detect a separate generic realtime persona in ordinary conversation.

---

## Phase I2 — Optional shared continuity vault

- [ ] Choose a private Markdown/Obsidian continuity root.
- [ ] Separate shared moments, patterns/preferences, open threads, and activity continuity.
- [ ] Whitelist retrieval roots; exclude transcript/log dumps and archives.
- [ ] Retrieve only a bounded set of relevant excerpts at the ordinary agent-consult boundary.
- [ ] Mark retrieved historical text as context, not executable instruction.
- [ ] Keep a bounded recent voice-session window for possible curation.
- [ ] Filter obvious secret-like text before curation/write.
- [ ] Use a separate curator session that can return an empty memory list.
- [ ] Cap durable writes per session and deduplicate before append.
- [ ] Make retrieval/curation failure unable to break ordinary voice.
- [ ] Verify one known memory can be retrieved and one safe written memory can be retrieved later.

**Gate I2 test:** Known shared context is retrieved when relevant, irrelevant vault material stays out, and a mundane session creates no durable memory.

See `05a-shared-obsidian-memory.md`.

---

## Phase I3 — Contextual local time

- [ ] Resolve timezone from the current operating system/runtime rather than a hardcoded location.
- [ ] Inject a bounded local date/time/daypart block into ordinary agent consults.
- [ ] Supply the same temporal frame to proactive/arrival decisions and memory curation.
- [ ] Make time context factual only; it must not create reminders, obligations, or proactive-speech reasons by itself.
- [ ] Stamp durable memory dates in the same resolved system timezone.
- [ ] Verify an alternate-timezone date near midnight.

**Gate I3 test:** today/tomorrow/yesterday resolve correctly and changing the computer timezone requires no source edit.

See `05b-contextual-time-awareness.md`.

---

## Phase J — Lip sync

### Initial route

- [ ] Route speaker audio to loopback/virtual input.
- [ ] Configure current MetaHuman audio Live Link/Speech-to-Face path.
- [ ] Verify source/subject alive.
- [ ] Tune audio level.
- [ ] Test phonemes/pauses/questions.

### Optional direct bridge after initial proof

- [ ] Tap decoded WebRTC audio.
- [ ] Forward bounded PCM through IPC.
- [ ] Send via loopback UDP or equivalent.
- [ ] Unreal plugin receives PCM.
- [ ] Feed current MetaHuman audio animation path.
- [ ] Add narrow `DECTRL` control sideband.

**Gate J test:** Near-synchronous face motion during normal conversation and interruption.

---

## Phase K — Wake listener

- [ ] Install/cache faster-whisper.
- [ ] Implement rolling 16kHz listener.
- [ ] Strict wake phrase shape.
- [ ] Add RMS/logprob/no-speech gates.
- [ ] Log candidates/acoustic values locally.
- [ ] Emit one WAKE event.
- [ ] Exit listener immediately after accepted wake.
- [ ] Electron receives wake and opens realtime.
- [ ] Realtime stop re-arms listener.
- [ ] Calibrate on target microphone/room.

**Gate K test:** Five wake cycles with no manual clicking and acceptable false-positive rate.

---

## Phase L — Short wake greeting

- [ ] Keep wake acknowledgment short.
- [ ] Use exact response-specific instruction.
- [ ] Disable tools for greeting response.
- [ ] Optionally rotate user-approved terms of address.
- [ ] Leave live session listening afterward.

**Gate L test:** Wake greeting ends quickly enough that the user can naturally continue.

---

## Phase M — Local sleep

- [ ] Handle completed transcript locally.
- [ ] Normalize name/polite wrappers.
- [ ] Match agreed sign-off narrowly.
- [ ] Intercept sign-off in consult tool-call path too.
- [ ] Cancel current response if needed.
- [ ] Close realtime.
- [ ] Stop camera if active.
- [ ] Release microphone.
- [ ] Re-arm wake.
- [ ] Ensure no OS power command is involved.

**Gate M test:** Wake → talk → sign-off → wake repeatedly.

---

## Phase N — Manual screen

- [ ] Screen starts OFF.
- [ ] Main process owns desktop capture.
- [ ] Capture function refuses while OFF.
- [ ] Manual Screen button sets privacy ON.
- [ ] Independent screenshot smoke test writes valid JPEG.
- [ ] Manual OFF stops watcher/refuses capture.

**Gate N test:** Manual button accurately represents capture capability.

---

## Phase O — Manual camera

- [ ] Camera starts OFF.
- [ ] Manual ON calls `getUserMedia`.
- [ ] Hidden video becomes ready.
- [ ] Canvas captures current frame.
- [ ] Manual OFF stops every track.
- [ ] Full voice stop also stops every track.

**Gate O test:** Camera hardware indicator goes off when UI says OFF.

---

## Phase P — Realtime local tools

- [ ] Define screen control function.
- [ ] Define camera control function.
- [ ] Define local sleep function.
- [ ] Merge into existing session tools on `session.created`.
- [ ] Include `session.type: 'realtime'` or current required shape.
- [ ] Log installed tool names.
- [ ] Handle calls in completed response/tool path.

**Gate P test:** No provider schema error after fresh voice session begins.

---

## Phase Q — Spoken screen/camera intents

- [ ] Completed transcript calls local command handler.
- [ ] Polite wrappers normalized.
- [ ] Screen ON variants narrow and tested.
- [ ] Screen OFF variants narrow and tested.
- [ ] Camera ON variants narrow and tested.
- [ ] Camera OFF variants narrow and tested.
- [ ] Local intent interception also applied to agent-consult tool call.

**Gate Q test:** Spoken requests toggle the same state as manual buttons.

---

## Phase R — Fresh screen vision

- [ ] On explicit look, cancel stale active response if necessary.
- [ ] Capture fresh screen frames.
- [ ] Bound JPEG dimensions/bytes.
- [ ] Add labeled `input_image` items.
- [ ] Create new response after image insertion.
- [ ] On OFF, invalidate stale visual context.

**Gate R test:** AI answers a question requiring current on-screen pixels.

---

## Phase S — Fresh camera vision

- [ ] Capture one current bounded camera JPEG.
- [ ] Label camera source.
- [ ] Insert image before response.
- [ ] Combined describe-view supports screen + camera if both enabled.
- [ ] OFF invalidates prior view.

**Gate S test:** Finger count/object test passes.

---

## Phase T — Smart screen watcher

- [ ] Sample locally ~1 s.
- [ ] Fingerprint small bitmap.
- [ ] Compute normalized change score.
- [ ] Enforce minimum model analysis interval.
- [ ] Enforce heartbeat.
- [ ] Use separate screen observer session.
- [ ] Return strict JSON.
- [ ] Parse/clamp fields.
- [ ] Inject compact context without auto-response.
- [ ] Only speak comment above salience threshold/cooldown.
- [ ] Watcher errors never break voice.

**Gate T test:** Meaningful events are noticed; ordinary movement is mostly silent.

---

## Phase T2 — Shared activity continuity

- [ ] Keep sparse in-memory checkpoints while Screen is ON.
- [ ] Sample program audio only at wide intervals; never persist a continuous transcript.
- [ ] Require a substantial video/game session before durable curation.
- [ ] Queue qualifying evidence for the existing shared-memory curator.
- [ ] Preserve a deterministic last-state fallback if curation is unavailable.
- [ ] Search only activity/open-thread memory when resuming.
- [ ] Require actual content overlap before returning prior activity memory.
- [ ] Feed matched prior context to both screen observation and normal agent consult.
- [ ] Let a natural user phrase such as `we're watching X` / `we're playing Y` prime focused retrieval immediately.
- [ ] Keep the user-named activity as a temporary Screen-session identity hint and clear it on Screen OFF/activity change.
- [ ] Treat matched history as silent context; do not announce memory merely to prove it exists.

**Gate T2 test:** Resume the same show/game later and verify the AI recalls the prior stopping point without pulling unrelated activity memory.

---

## Phase U — Proactive presence

- [ ] Store settings/timestamps.
- [ ] Quiet hours.
- [ ] temporary quiet-until command.
- [ ] active-call lockout.
- [ ] screen-lock lockout.
- [ ] system-idle lockout.
- [ ] silence threshold.
- [ ] reconsider interval.
- [ ] spoken cooldown.
- [ ] interruption suppression.
- [ ] `NO_MESSAGE` prompt path.
- [ ] context-aware evidence gate: silence permits consideration but is not itself a reason.
- [ ] current activity / meaningful screen event supplied when available.
- [ ] unfinished-thread and repeated-friction cues supplied conservatively.
- [ ] durable memory enriches a reason but never creates one by itself.
- [ ] structured decision parser fails closed on malformed or low-confidence output.
- [ ] activity-aware interruption bar (video quiet, desktop stricter, game looser).
- [ ] playback-only voice session.
- [ ] audio-drain handling.
- [ ] abort if user interacts while decision is in flight.

**Gate U test:** Several-hour real use feels restrained.

---

## Phase V — Optional desk return

- [ ] Local presence detector.
- [ ] Idle arm delay.
- [ ] Multiple absent confirmations.
- [ ] Track away timestamp.
- [ ] Minimum away duration before greeting.
- [ ] Presence detector does not claim identity.
- [ ] Welcome-back prompt remains generic/natural.
- [ ] Same quiet/interruption rules as proactive speech.

**Gate V test:** Return greeting happens only after meaningful absence and never mentions monitoring.

---

## Phase W — Mannerisms

- [ ] Response-start small smile.
- [ ] Mood auto-reset.
- [ ] Axis probe matrix.
- [ ] Nod proven in actual rig.
- [ ] Head shake proven.
- [ ] Question brow proven.
- [ ] Amused expression proven.
- [ ] Optional screen-look cosmetic gesture.
- [ ] Optional hand gestures last.

For every gesture:

- [ ] reversible checkpoint,
- [ ] low amplitude,
- [ ] no lip-sync regression,
- [ ] no clothing/hair regression,
- [ ] returns to idle,
- [ ] semantically sparse.

**Gate W test:** Human notices greater naturalness, not “more animation.”

---

## Phase X — Cold reboot acceptance

- [ ] OpenClaw Gateway starts correctly.
- [ ] Electron starts when intended.
- [ ] Unreal runtime launches.
- [ ] wake listener arms.
- [ ] avatar does not capture mouse.
- [ ] wake works.
- [ ] same-person voice works.
- [ ] screen vision works.
- [ ] camera vision works.
- [ ] sign-off sleeps locally.
- [ ] wake re-arms.
- [ ] proactive timers recover without immediately speaking.

**Final acceptance:** The user can use the system without opening a terminal/editor.