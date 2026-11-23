# 15 — Two complete avatar build paths (2026-11-23)

**Read this before the older chapters.** The original blueprint documents a working 2026 Unreal/MetaHuman architecture. It is preserved as **Path A**, not an obligatory dependency. A newer, independently selectable **Path B** uses an approved private photographic portrait, a neural 2D facial motion renderer, an OpenCode agent and an external TTS provider. Both share the same desktop shell, identity/continuity concepts, wake/sleep semantics, sensors, tool permissions, tactile interaction and reliability requirements.

This repository publishes architecture, contracts, sanitised examples and acceptance tests only. It does not contain the reference portrait, private identity/memory/transcripts, a proprietary voice, real tokens, model weights, calibration frames or machine-specific directories.

## Choose first

| | Path A: 3D Unreal / MetaHuman | Path B: realistic rigged 2D photograph |
|---|---|---|
| Visual | 3D MetaHuman and facial/body rig | Source photograph, neural landmark deformation and motion rendering |
| Engine | Unreal Engine + MetaHuman; Monolith optional | Independent Python GPU face service and Electron portrait view |
| Mouth | PCM/face-animation bridge to MetaHuman | Audio-conditioned Ditto-style motion, output from a deformable portrait |
| Emotions | Blendshape/animation curves and bones | LivePortrait-style native expression deltas plus 3D keypoint head/eye rotation |
| Full-body | Full 3D body, environment and Wide View possible | Talking-face close view; optional separate body/presentation renderer |
| Speaking backend | Any compatible agent and speech adapter; historical example used a gateway agent + WebRTC speech | Any compatible agent and speech adapter; inspected Nov reference uses OpenCode + local Whisper ASR + ElevenLabs |
| Best for | Free 3D movement and environments | Photographic likeness and natural close-face conversation |
| Detail | docs/02, 03, 09b–09g | docs/16, 17 |

**Important:** “2D” describes the input and presentation, not CSS-puppet animation. A moving photograph needs deformable facial keypoints and the ability to synthesize newly visible facial geometry. The attempted whole-image CSS turns and artificial mouth cutouts did not meet this requirement. The approved portrait itself is not in this repo.

## Shared system and trust boundaries

~~~text
Windows desktop / Electron shell
  ├─ narrow preload IPC, explicit privacy + local lifecycle controls
  ├─ microphone owner → voice/turn adapter
  │    ├─ native live speech-to-speech model, OR
  │    └─ ASR → chosen conversation model → TTS
  ├─ conversation coordinator → chosen agent/model + memory + tools
  │    ├─ any compatible ConversationBackend adapter
  │    ├─ one answer owner, continuing sessions and bounded context
  │    └─ independent background/screen-observer sessions
  ├─ approved answer → text cleaner + optional silent emotion cue
  ├─ streaming audio output (native live model OR TTS) → authoritative playback clock
  ├─ animation/attention event mixer
  │    ├─ Path A → Unreal MetaHuman bridge
  │    └─ Path B → loopback neural portrait renderer
  ├─ screen / camera / desk presence / media-watch observers
  ├─ optional paired mobile touch + haptics endpoint
  └─ optional bounded Windows computer-use tools
~~~

Do not fork the AI's identity into the voice engine or renderer. Neither must control memory, unapproved tools or sensor permissions. A renderer replacement must not change the persona, voice, audio device, saved conversation, mic, or tactile pairing. Choose one presentation owner at a time; the reference can switch its Unreal view and photographic face, but they must not both compete for the same animation/audio resources.

### Renderer-neutral event contract

~~~ts
type Activity = 'idle'|'listening'|'thinking'|'speaking'|'interrupted';
type Emotion = 'neutral'|'smile'|'amused'|'delighted'|'curious'|'concerned';
type VisualCue = {
  sequence: number; turnId: string; at: number; expiresAt: number;
  activity?: Activity;
  emotion?: {name: Emotion; strength: number; durationMs: number};
  gaze?: {source: 'camera'|'screen'; x: number; y: number; strength: number};
  head?: {yaw: number; pitch: number; roll: number};
  audio?: {utteranceId: string; sampleRate: number; startedAt: number};
  cancelUtteranceId?: string;
};
interface Renderer {
  start(): Promise<void>;
  send(cue: VisualCue): void;
  health(): Promise<{ready:boolean; owner:string; lastFrameAt?:number}>;
  stop(): Promise<void>;
}
~~~

Clamp parameters, verify event type and owner, expire stale cues and discard cancellation-generation mismatches. Never feed untrusted markdown/model output directly to a shell, HTML renderer, UDP command or network request. A model may suggest an expression, not raw GPU/OS instructions.

## Shared build order

1. **Private baseline:** inventory Windows, GPU/VRAM, camera, mic, audio, Node/Python, existing agent, model access, authorized sensors and approved image. Keep local absolute paths and secrets private.
2. **Continuity first:** prove the intended agent answers correctly in its normal session. Back up identity and history; do not overwrite existing memories.
3. **Desktop shell:** implement Electron + a least-privilege preload; confirm window size, always-on-top, close/reopen, no mouse capture, health/error states and deterministic local controls.
4. **Text conversation:** connect a chosen local or hosted model through a compatible conversation adapter (examples include OpenCode and OpenClaw), then verify stream, interruption, session reentry, tool authorization and bounded historical context.
5. **Speech:** choose either native streaming speech-to-speech or VAD/ASR → text agent → TTS. Implement mic permission, interrupt ownership, available text cleanup, audio playback and timing spans. Test voice without any face renderer.
6. **Choose renderer:** run the Path A gates below or Path B gates in docs/16. Verify lip sync using the very audio being played.
7. **Social embodiment:** state-driven idle/listening/speaking, context-selected silent expressions, manual voice commands, gaze, blink, eye contact and intentional screen attention. See docs/17.
8. **Sensors/tools:** locally enforce mic/camera/screen off; fresh image delivery, bounded background observations, optional computer UI hands and deterministic target ownership. Existing chapters 05–11 apply to both renderers.
9. **Mobile presence:** paired body-map touch, region/gesture interpretation, safe optional browser vibration, verified delivery semantics, testable disconnect. See docs/18.
10. **Reliability:** recover dropped face service without dropping conversation, reconnect sessions, preserve voice and identity, measure every latency boundary, test cold reboot and regression suite. See docs/19–20.

Do not install Unreal, MetaHuman or Monolith when following Path B. Do not install Ditto/LivePortrait models when following Path A. OpenCode, OpenClaw, ElevenLabs and any WebRTC or local audio provider shown in reference examples are replaceable adapters, not required dependencies. Any compatible model, agent interface and voice service can be used.

## Path A (3D) construction checklist

1. Inventory a compatible Unreal + MetaHuman version and licensing; import a licensed human source privately. Create a minimal scene and correct face camera/lighting. Read docs/02 and docs/03.
2. Verify idle breathing/blinks, gaze, jaw and head with a canned local clip before the agent and TTS connection.
3. Install the MetaHuman facial animation and PCM lip-sync bridge (docs/04); measure actual rendered face while a full voice turn plays. Keep the jaw/lips under voice ownership.
4. Wire explicit gestures through calibrated pose controls and animation curves. Follow docs/09b–09g, including neck/head ownership, nod/shake, calibrated expression and shrug regressions.
5. Use typed events from Electron to Unreal. Constrain UDP/HTTP loopback and do not expose a generic console executor.
6. Optional Wide View: use docs/02a–02f and docs/09f for full-body environments, transition/return semantics and click-through controls.
7. Test all common privacy, touch, voice, memory, interruption and startup gates from docs/20. 3D-specific gate: gestures genuinely rotate rig/bones without breaking lips, camera, clothes or windows.

## Path B (2D) construction checklist

1. Choose a private owned portrait; generate neutral calibration, hashes and a golden still/audio fixture in a protected directory.
2. Install a licensed Ditto-style audio-to-facial-motion pipeline, LivePortrait-style facial keypoint deformation and a local GPU compositor. Read docs/16. Never publish model weights or subject media.
3. Launch one resident, authenticated loopback face process. Detect occupied ports and existing sessions rather than killing arbitrary processes.
4. Preserve natural facial geometry. Calibrate lip motion, 21-keypoint deformation, eye/brow/cheek expression offsets and actual 3D head orientation. The current reference uses 8 motion sampling steps, both guidance branches, ~12.5 rendered neural fps plus blended 25 display fps, and an audio clock.
5. Apply expression/gaze/idle mixers without replacing lip ownership. Add deliberate smile, broad delighted grin, amused, curious, concerned, blink, micro head movement and reciprocal camera smiles; verify visible output with a human, not only enum/event logs.
6. Integrate the face into Electron; rebind both speech and face controllers after a reload. Suspend the old 3D renderer while the photographic close view owns presentation, and restore it only on an explicit view switch.
7. Preserve working voice and memory unchanged while tuning expression or visual latency. A face restart must be recoverable during an intact conversation.
8. Verify docs/17, 18, 19 and 20. The separate mobile portrait preview is not automatically a live neural lip-sync client.

## How to interpret older material

- The older README and START_HERE_FOR_AI originally describe a MetaHuman-first implementation. They now need to be read through this dual-path guide. Their mandatory 3D gates apply only to Path A.
- REFERENCE_BUILD_STATUS.md and the September addendum are historical snapshots. The 2026-11-23 addendum reports later Path B evidence, human corrections and current limitations; it does not retroactively rewrite old outcomes.
- “Implemented,” “unit tested,” “cached-render tested,” “native playback tested,” “human-verified” and “fully live end-to-end” are distinct labels. Use the strongest **actually supported** status for each subsystem.
