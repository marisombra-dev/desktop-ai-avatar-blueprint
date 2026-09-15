# 10h — Desktop Lyra Desk-Return Validation — 2026-09-15

This note records a second Windows implementation of optional desk return. It is intentionally sanitized and contains no camera frames, personal content, local account names, process ids, or private conversation text.

## Scope and privacy boundary

The implementation keeps presence sensing local. The helper reports only `present`, `absent`, or `unknown`; no identity model is loaded, no camera frames are persisted, and no presence image is sent to the agent.

The production policy arms only after a long idle interval, requires repeated absence confirmation, records an away timestamp, requires a meaningful minimum-away duration before greeting, and uses a bounded pending-return window.

Return detection and greeting delivery are separate states. A pending greeting can be deferred by interruption policy, consumed by user interaction, delivered through an already-open voice session, or rendered through a microphone-free playback session when voice is closed.

## Webcam ownership

A local presence helper may own the webcam only while explicit Camera visual-awareness is inactive. Before explicit Camera acquisition, the main process awaits helper shutdown so the device is actually released. Camera OFF makes the desk sensor eligible again.

The helper also has an immediate shutdown path for application exit so an Electron quit cannot orphan a Python process that still owns the webcam.

A no-camera lifecycle smoke test proved helper start/check/stop semantics and verified that the immediate shutdown path terminates the OS child process.

## False-return failure and repair

The first accelerated live test exposed an important detector failure. A face-only detector occasionally missed the seated user for consecutive checks. The accelerated policy then interpreted those misses as departure and a later positive hit as return, producing a false welcome-back event.

The live test was stopped immediately rather than accepting the greeting as success.

The repair deliberately biases toward avoiding false absence:

- each local `CHECK` examines several fresh frames rather than one frame;
- presence may be established by default frontal face, alternate frontal face, left/right profile, or upper-body evidence;
- the fast validation profile requires a longer consecutive-absence streak before entering `away`;
- production return now requires multiple consecutive present confirmations rather than one positive frame;
- after the first return candidate, the controller performs a quicker confirmation poll instead of immediately creating a pending greeting.

After the repair, the detector-only live soak produced fifteen consecutive `present` results while the user remained seated. The full application then sustained a long present-state soak with only isolated misses that never reached the away threshold.

Portable lesson: for desk-return sensing, false absence is more socially expensive than delayed absence. Prefer conservative hysteresis and redundant local evidence over trying to make one frame classifier decisive.

## Final validation status

Automated gates are green for the pure policy, controller orchestration with a fake sensor, helper lifecycle, detector self-test, live-session route selection, and the complete production build.

Live validation passed both required lifecycles. With voice closed, a qualified away/return cycle dispatched through microphone-free playback and completed. With an interactive voice session left open, desk presence continued independently, a qualified return dispatched through the existing Realtime session, and the greeting was spoken without opening a second voice transport.

A live test also exposed that raw VAD `speech_started` was incorrectly counted as meaningful user interaction. That allowed incidental voice activity to cancel a spontaneous line and permanently consume the pending return. The repair separates low-level voice activity from a finalized user turn: VAD may interrupt speech and refresh generic recency, while only a completed user/UI interaction consumes the pending arrival event. The open-voice lifecycle passed after this change.

Webcam ownership is singular. Explicit Camera acquisition first pauses and awaits shutdown of the local presence helper; follow-up Camera questions reuse the already-open stream; Camera release makes desk sensing eligible again. A human fresh-frame check correctly localized a small visible object to its current position, confirming that the reused Camera stream was current rather than stale.

Phase V is GREEN.
