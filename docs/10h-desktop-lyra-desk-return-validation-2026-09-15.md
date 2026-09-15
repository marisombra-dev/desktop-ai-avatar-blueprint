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

## Current validation status

Automated gates are green for the pure policy, controller orchestration with a fake sensor, helper lifecycle, detector self-test, and the complete production build.

The fast live profile has also demonstrated technically valid closed-voice away/return cycles: confirmed absence, confirmed return, pending greeting creation, playback-only dispatch, and playback completion. Human confirmation of the audible line remains separate from the technical log.

The required Gate V open-voice lifecycle is still in progress at the time of this note. The remaining live proof is to keep an interactive voice session open, qualify a real away interval, return without speaking first, and confirm that the greeting uses the existing Realtime session while webcam ownership remains singular.

Do not mark Phase V fully green until both the closed-voice and open-voice human-visible lifecycles have passed.
