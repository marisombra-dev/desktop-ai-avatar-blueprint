# 10g — Desktop Lyra Port Validation — 2026-09-14

This note records behavior validated while adapting the blueprint to a second Windows desktop-avatar implementation. It intentionally focuses on portable engineering details rather than user-specific content.

## Environment

- Windows 11
- Electron 44.3.0
- OpenClaw 2026.9.2
- Unreal Engine 5.8.x / MetaHuman audio Live Link
- Realtime voice over WebRTC
- local Windows screen loopback + faster-whisper for program audio

## App-owned response ownership worked better than mixed ownership

The initial port had `create_response:false` for VAD, but still exposed `openclaw_agent_consult` to Realtime and sometimes continued with `function_call_output -> response.create`.

That left two possible owners for a substantive answer: the provider and the application.

The validated replacement was:

1. persist the finalized user transcript once with `talk.client.transcript`;
2. invoke `openclaw_agent_consult` from application code through the same logical voice session;
3. wait for the consult result;
4. ask Realtime only to speak that already-decided answer;
5. persist the spoken assistant transcript once.

The delivery response used explicit correlation metadata (`request_id`, origin, turn generation), disabled tools, and rejected stale completions whose response id no longer matched the active owner.

A probe confirmed that `talk.client.transcript` created one normal user-history entry while the application-owned consult did not create a duplicate user turn. A human voice test then produced one user turn and one assistant answer; a later repeat request appeared as a separate user turn rather than a duplicate provider response.

### Portable lesson

If ordinary dialogue has a long-lived agent behind it, pick exactly one substantive-response owner. Let Realtime render speech, not independently decide whether to answer again.

## Proactive speech works best as a dual delivery path

The older local policy blocked proactive speech whenever a live voice session existed. The newer blueprint behavior was validated successfully in the port:

- closed voice session: use a separate recv-only playback session with no microphone;
- open but quiet voice session: reuse the existing Realtime session;
- open voice session + shared Screen/Watch: suppress proactive speech;
- new user speech always wins and cancels the spontaneous response;
- only stamp the spoken cooldown if audio actually began.

The live-session test was armed only by a current-session user phrase. After a normal acknowledgement, the application emitted one short unsolicited line several seconds later through the same voice session. The temporary test hook was removed immediately after validation.

## OpenClaw schema/runtime mismatch: `brain: "none"`

The installed protocol schema advertised `brain: "none"` for Talk client creation, but the live OpenClaw 2026.9.2 gateway rejected that value and accepted `brain: "agent-consult"`.

The safe compatibility adaptation was to keep the playback transport microphone-free and constrain the actual Realtime response with `tools: []`, `tool_choice: "none"`, and an exact-line instruction. No user turn is supplied to that playback session.

### Portable lesson

Treat the live gateway as authoritative when schema and runtime disagree. Record the version-specific mismatch rather than weakening the design silently.

## Duplicate Electron shells can detach a composite overlay

A proactive playback experiment launched a second visible Electron shell against the same avatar stack. The overlay follower could then bind to the wrong `Desktop Lyra` HWND, making the top/bottom controls appear detached or duplicated.

The recovery was to close all duplicate shells and start exactly one composite stack. The expected geometry was restored with one Electron top-level window and one Unreal viewport inset by the documented top/bottom control bands.

### Portable lesson

Do not validate playback by launching a second visible copy of a composite Electron/Unreal desktop avatar. Use the existing session, or isolate the test process so it cannot compete for the same window title/overlay follower.

## Program-audio loopback and self-echo suppression

Windows system audio was captured separately from the microphone, converted to bounded PCM, and transcribed locally with faster-whisper. Raw audio was not persisted.

The anti-echo stack used two guards:

1. Chromium loopback requested `restrictOwnAudio: true` where supported;
2. renderer PCM forwarding was suppressed while assistant audio was active, with a short tail after playback.

A system-output sentence reached local Whisper through the loopback path. During assistant playback, suppression activated and no program-audio transcript event was produced. Screen OFF terminated the Whisper helper and stopped further observer/audio events.

## MetaHuman lip-sync cadence

The port independently converged on the same smoother cadence now documented upstream:

- 16 kHz mono Float32 PCM;
- 512-sample chunks, about 32 ms each;
- roughly 300 ms of paced silence after speech transitions.

The silence tail mattered visibly because provider generation completion can precede audible buffer drain. Treat playback completion and response completion as separate events.

## Validation status

The response-owner refactor and open-session proactive delivery were human-validated. The long-duration Phase U restraint soak remains a separate acceptance test; a one-shot forced delivery proves plumbing, not social restraint.
