# Sources and Version-Sensitive References

This repository is based on a working implementation, but several APIs and editor workflows evolve quickly. Before adapting the examples to a new machine, check the current upstream documentation below.

Last reviewed: **2026-09-05**.

## OpenAI Realtime

### Realtime API overview

Official documentation:

https://developers.openai.com/api/docs/guides/realtime

Use this for the current Realtime model/session lifecycle, supported modalities, tool calls, audio behavior, and general architecture.

### Realtime API with WebRTC

Official documentation:

https://developers.openai.com/api/docs/guides/realtime-webrtc

The reference desktop build uses WebRTC because the client is an Electron/browser environment and low-latency bidirectional audio is central to the experience.

Key design principle from the current docs: client/browser Realtime applications should use WebRTC rather than exposing a normal long-lived provider API key in browser code.

### Realtime conversations and session updates

Official documentation:

https://developers.openai.com/api/docs/guides/realtime-conversations

Current Realtime sessions emit `session.created`, accept `session.update`, and use an event-driven conversation lifecycle.

The reference build encountered a current-schema requirement where its local-tool `session.update` needed the session type. The working pattern was:

```json
{
  "type": "session.update",
  "session": {
    "type": "realtime",
    "tools": []
  }
}
```

Do not assume that exact event schema is immutable. If a future provider error disagrees, follow the current official API reference.

## OpenClaw

### OpenClaw documentation

Main documentation:

https://docs.openclaw.ai/

Project site:

https://openclaw.ai/

### Talk mode

Official documentation:

https://docs.openclaw.ai/nodes/talk

This is the relevant source for OpenClaw realtime Talk behavior, agent consultation, transcript/session handling, and the distinction between internal consult prompts and user-visible conversation.

The validated reference architecture uses the full OpenClaw agent as the long-lived person and treats the Realtime layer as the live speech surface.

### Gateway configuration

Official documentation:

https://docs.openclaw.ai/gateway/configuration-reference

Use this for current Gateway/Talk configuration keys, including the current equivalent of consult reasoning/routing settings.

Do not blindly copy a historical `openclaw.json` fragment from this repository. OpenClaw's configuration schema can change between releases.

### Voice-call / realtime agent context

Official documentation:

https://docs.openclaw.ai/plugins/voice-call

Current OpenClaw releases document both lightweight realtime agent-context approaches and full agent consultation. This blueprint intentionally favors full agent consultation for ordinary substantive dialogue where preserving the existing person's memory/personality continuity is more important than shaving every possible millisecond of latency.

## Monolith

### Monolith repository

https://github.com/tumourlove/monolith

The project README currently documents:

- UE 5.7 and UE 5.8 support from one source tree,
- engine-specific precompiled release ZIPs,
- installation in `YourProject/Plugins/Monolith`,
- `.mcp.json` using `Plugins/Monolith/Binaries/monolith_proxy.exe`,
- first-launch indexing,
- `monolith_discover()` / namespace-dispatch tooling,
- MCP listener behavior on port 9316.

### Releases

https://github.com/tumourlove/monolith/releases

Use the release asset matching the exact Unreal engine version when using precompiled binaries.

### Security

https://github.com/tumourlove/monolith/blob/master/SECURITY.md

At the time of review, Monolith's Unreal HTTP listener is reachable on all network interfaces because Unreal's `FHttpServerModule` does not expose a bind-address setting. Restrict inbound TCP 9316 with Windows Firewall on untrusted networks, or disable the MCP server when not needed.

## Epic Games / MetaHuman

### MetaHuman Creator in Unreal Engine

Official documentation:

https://dev.epicgames.com/documentation/metahuman/metahuman-creator-in-unreal-engine

Use this as the entry point for the current in-editor MetaHuman Creator workflow.

### MetaHuman Creator import tools

Official documentation:

https://dev.epicgames.com/documentation/metahuman/metahuman-creator-import-tools-in-unreal-engine

This page is useful for choosing the correct import workflow:

- From Custom Mesh for arbitrary topology,
- From Template for standard MetaHuman topology/UV layout,
- From Identity for a solved MetaHuman Identity,
- From DNA for compatible DNA data.

### From Custom Mesh

Official documentation:

https://dev.epicgames.com/documentation/metahuman/metahuman-creator-from-custom-mesh-tool-in-unreal-engine

As of the current UE 5.8-era workflow, From Custom Mesh can fit a biped custom mesh with arbitrary topology, including sculpts, scans, and AI-generated meshes, and produces a standard MetaHuman topology/rig.

### From Template

Official documentation:

https://dev.epicgames.com/documentation/metahuman/metahuman-creator-from-template-tool-in-unreal-engine

Use this only when the source already uses MetaHuman-compatible topology or UV layout. Do not use it as a generic arbitrary-mesh conversion path.

### Mesh to MetaHuman / From Mesh Identity workflow

Official documentation:

https://dev.epicgames.com/documentation/metahuman/from-mesh

The current workflow creates a MetaHuman Identity from mesh data, solves a neutral pose, and then uses in-editor conforming rather than the older web-based MetaHuman Creator path.

### Unreal Engine 5.8 release notes

Official documentation:

https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes

UE 5.8 introduced/expanded the full-body arbitrary-topology MetaHuman conversion workflow and changed several MetaHuman DNA details. Consult release notes when migrating an older project.

### MetaHuman DNA 5.8 changes

Official documentation:

https://dev.epicgames.com/documentation/metahuman/metahuman-creator-dna-asset-reference-in-unreal-engine

Use this when custom rig/DNA work crosses UE 5.7 → 5.8 because DNA storage/runtime behavior changed.

### MetaHuman expression poses and rig definition

Official expression-pose documentation:

https://dev.epicgames.com/documentation/metahuman/expression-poses

Epic describes Expression Poses as fixed semantic facial states in the MetaHuman rig definition. Treat those states as authored rig data, then validate their visible read on the assembled character before using them conversationally.

MetaHuman DNA / rig-definition documentation:

https://dev.epicgames.com/documentation/metahuman/metahuman-dna-rig-definition-and-rig-operation

This documents how the MetaHuman rig definition predetermines expression types and encodes expression animation data. It is useful background for understanding why semantic expression channels can be sampled and recombined without inventing arbitrary face-bone math.

### MetaHuman animation propagation and head-control references

Official custom-animation documentation:

https://dev.epicgames.com/documentation/metahuman/play-a-custom-animation

Epic documents that assembled MetaHumans are driven primarily from the Body skeletal mesh and that Face post-processing copies body bone transforms. This is important when diagnosing a face-side control that changes values without visibly moving the head.

UE 5.8 MetaHuman known issues:

https://dev.epicgames.com/documentation/unreal-engine/metahuman-known-issues-5-8-in-unreal-engine

The 5.8 issue list includes body-driven head-pose behavior for whole-rig head imports and a `Face_Archetype_Skeleton` animation issue. Treat these as diagnostic context, not proof that a specific project has the same failure.

Epic Developer Community support discussion of head curves / `CR_MetaHuman_HeadMovement_IK_Proc`:

https://forums.unrealengine.com/t/mhc-mh002-fmn-b-facialloop-sad-m-s001-head/2708048

This support explanation describes Head Translation, Head Roll/Pitch/Yaw, and Head Control Switch curves as part of MetaHuman head-bone control through Control Rig logic. The reference build's successful head-motion path was consistent with this contract, but axis mapping still required live empirical calibration.

## Electron

Official documentation:

https://www.electronjs.org/docs/latest/

Relevant APIs:

- `BrowserWindow`
- `desktopCapturer`
- `screen`
- `session.setDisplayMediaRequestHandler`
- Windows `Streams.audio = 'loopback'` for system-audio capture
- `ipcMain` / `ipcRenderer`
- `contextBridge`
- `powerMonitor`
- `Tray`

Electron session API:

https://www.electronjs.org/docs/latest/api/session

The reference watch-along path uses `setDisplayMediaRequestHandler` and the Windows-only `audio: 'loopback'` stream option. Check the current Electron session/Streams API before copying the example because capture semantics are version-sensitive.

Do not enable broad renderer Node integration merely for convenience. Keep privileged capture/process/Gateway work in main/preload.

## WebRTC / browser media

### MDN RTCPeerConnection

https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection

### MDN getUserMedia

https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

### MDN getDisplayMedia

https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia

These are useful references for browser/Electron peer connection, webcam lifecycle, and renderer-side display-media acquisition. Electron's Windows loopback behavior is controlled by Electron's own display-media handler, so use the Electron session docs together with MDN.

## faster-whisper

Repository:

https://github.com/SYSTRAN/faster-whisper

The reference wake listener uses a local `faster-whisper` `base` model on CPU/int8 plus `sounddevice` and strict acoustic/phrase gating. The thresholds in this blueprint were measured for one microphone/room and must be recalibrated elsewhere. The Screen-linked program-audio helper uses a smaller cached `tiny` model on CPU/int8 because fast startup is more important there than wake-grade phrase discrimination; visual screen context helps compensate for imperfect transcription.

## Node.js / TypeScript toolchain

Node.js:

https://nodejs.org/

TypeScript:

https://www.typescriptlang.org/

The exact Electron/Vite/TypeScript versions listed in the README describe one known-good snapshot, not permanent requirements.

## Licensing reminder

Every project above retains its own license and service terms. The MIT license in this repository applies only to the original documentation and example glue code authored for this blueprint. It does not relicense Unreal Engine, MetaHuman content, OpenAI services/models, OpenClaw, Monolith, Electron, or any third-party dependency.