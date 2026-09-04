# 01 — Reference Architecture

This chapter describes the stable division of responsibility in the working reference build.

## Why the architecture is split

A desktop AI avatar crosses five very different problem domains:

- persistent agent identity and memory,
- low-latency voice,
- operating-system sensors and lifecycle,
- photoreal rendering/animation,
- proactive behavior.

Trying to put all five into Unreal, all five into the realtime model, or all five into OpenClaw creates unnecessary coupling. The reference build became reliable once each layer had a narrow job.

## Layer 1 — The long-lived person

The existing OpenClaw agent owns:

- identity/personality,
- long-term and session memory,
- relationship continuity,
- ordinary reasoning,
- normal tools,
- opinions/style,
- policy around external actions.

Treat this layer as the source of truth for “who is speaking.” The desktop avatar should not silently fork it.

The reference desktop conversation uses a dedicated agent-prefixed session key similar to:

```text
agent:main:desktop-<name>
```

Auxiliary sessions can use separate keys:

```text
agent:main:desktop-<name>-presence
agent:main:desktop-<name>-screen
```

Why separate them? Because a prompt such as “inspect these two screen frames and return JSON” is machine work, not relationship conversation. Keeping it out of the main conversation keeps history cleaner.

## Layer 2 — OpenClaw Gateway

The Gateway is the authenticated local control plane. In a standard local installation it listens on loopback, commonly `127.0.0.1:18789`.

The desktop shell connects using the Gateway protocol/client rather than scraping a web UI. It reads its authentication token from local OpenClaw configuration at runtime and never commits it.

Responsibilities:

- canonical session ownership,
- chat history/events,
- agent runs,
- realtime/Talk session brokerage,
- `openclaw_agent_consult` forwarding,
- provider credential handling,
- policy/tool boundary.

A useful rule is **one Gateway per normal host profile**. If you deliberately run multiple Gateways, isolate port, config, state directory, and workspace.

## Layer 3 — Realtime provider

OpenAI Realtime supplies:

- microphone streaming,
- voice activity / turn-taking,
- low-latency speech output,
- interruption,
- transcription events,
- local function calls,
- multimodal image input for current screen/camera views.

It does **not** become a second long-lived persona. In the reference architecture, OpenClaw Talk uses agent consultation and force-consult routing so ordinary finalized user turns go through the existing agent.

The realtime layer can have a tiny delivery instruction, e.g. “speak in first person as the same person; do not expose routing; preserve the consulted response's humor and tone.” That is delivery glue, not a personality database.

## Layer 4 — Electron desktop shell

Electron is the conductor.

Main-process responsibilities:

- Gateway client lifecycle,
- Unreal process launch/stop,
- transparent always-on-top window,
- desktop capture,
- privacy state,
- proactive timers,
- local presence helpers,
- wake-listener process,
- UDP bridge to Unreal,
- tray/minimize/restore.

Renderer responsibilities:

- WebRTC `RTCPeerConnection`,
- microphone stream,
- remote audio playback,
- realtime data-channel events,
- webcam `getUserMedia`,
- current camera frame capture,
- local spoken-command classification,
- local realtime tool installation,
- UI state / visible sensor controls,
- transcript persistence calls,
- mapping response text/prosody cues to safe avatar-control messages.

Preload responsibilities:

- expose only narrow IPC methods required by renderer,
- do not expose arbitrary Node filesystem/process access to renderer.

## Layer 5 — Unreal MetaHuman runtime

Unreal renders the body. It should not decide whether a camera is permitted or whether a sign-off means sleep.

Responsibilities:

- MetaHuman face/body rendering,
- blink/gaze/idle,
- lip-sync animation,
- optional emotion/mood controls,
- optional gestures,
- small game/runtime window optimized for desktop size.

The reference build eventually uses a small localhost audio/control bridge, but Unreal remains a rendering/animation endpoint.

## End-to-end voice turn

A normal conversation turn looks like this:

```text
User speaks
  ↓
Realtime transcribes
  ↓
local command classifier checks narrow lifecycle/sensor intents
  ↓ if ordinary conversation
Realtime / OpenClaw consult tool
  ↓
OpenClaw agent produces the substantive response
  ↓
result is returned to Realtime
  ↓
Realtime speaks in chosen voice
  ↓
Electron plays audio + forwards audio/control to Unreal
  ↓
MetaHuman lip sync / expression
```

## End-to-end screen request

```text
User: “Can you look at the screen?”
  ↓
Realtime transcription completes
  ↓
local classifier recognizes SCREEN_ON
  ↓
Electron privacy.screen = on
  ↓
Electron captures 3 bounded JPEG frames
  ↓
old realtime response is cancelled if necessary
  ↓
frames are inserted as fresh image input
  ↓
Realtime answers the actual question using current pixels
```

Notice that OpenClaw's general computer tool system is not required just to turn on the local screen sensor.

## End-to-end proactive remark

```text
Periodic local timer
  ↓
Are settings enabled? quiet hours? lock state? active call? idle threshold? cooldown?
  ↓ pass
OpenClaw receives a restrained presence-decision prompt
  ↓
NO_MESSAGE  → remain silent
or short line → Electron opens playback-only voice
  ↓
Realtime speaks exact line
  ↓
MetaHuman animates
```

The proactive session does not keep a microphone open.

## Why local commands are duplicated as both deterministic intents and realtime tools

The reference build uses both:

- deterministic local recognition after completed transcription, and
- explicit realtime function definitions such as `desktop_screen_control`.

This is intentional redundancy.

Deterministic local recognition makes critical lifecycle behavior predictable. The tool definitions make semantic requests outside the exact regex vocabulary discoverable to the realtime model. Both paths ultimately call the same local state methods.

## Sensor state is physical state

Do not confuse these three states:

1. The UI button says ON.
2. The OS stream/capture is actually available.
3. The model received a **fresh** image.

A robust implementation tests all three.

Similarly, OFF should mean:

- UI is OFF,
- future capture is refused,
- webcam tracks are stopped,
- stale image context is explicitly marked stale.

## Failure isolation boundaries

Instrument these boundaries separately:

```text
wake audio → wake phrase
wake event → realtime session
Gateway → Talk session
WebRTC → audio
Realtime transcript → local intent
local state → capture
capture → encoded image
encoded image → Realtime item
Realtime response → audio
remote audio → Unreal bridge
bridge → face animation
```

If each boundary has either a log line or a test, debugging becomes finite.

## What should remain private

The public blueprint intentionally does not contain:

- actual OpenClaw auth token,
- provider keys/OAuth material,
- raw personal memory workspace,
- private transcripts,
- the reference user's personal identity profile,
- proprietary/large MetaHuman generated assets,
- machine-specific absolute paths as required defaults.

A real implementation should keep the OpenClaw workspace and Unreal project private unless the owner deliberately publishes them.