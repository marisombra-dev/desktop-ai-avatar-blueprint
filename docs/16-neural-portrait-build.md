# 16 — Path B: reproducible neural 2D portrait runtime

This chapter specifies the photographic face path inspected on 2026-11-23. It is an architectural recipe, not a redistribution of the reference portrait, model weights, audio fixtures or secrets. Use legally obtained upstream models compatible with your platform and recheck their current licenses. GPU optimization is hardware-specific and must be rebenchmarked.

## 1. Private asset registration

Privately store: source portrait, approved crop and target framing, registration keypoints, model-specific appearance features, calibration/rig data, audio fixture, output reference render, SHA-256 manifest and rollback. Create neutral and speaking baseline frames and get human approval at the exact desktop display scale. NEVER commit any real image, face embedding, cloned voice, recording, media fixture, identifying project path or private metadata.

The input is an ordinary realistic still photo; the runtime uses learned deformable face geometry. CSS shifting/cropping the photograph or drawing a black animated mouth overlay is insufficient and historically failed the naturalness/geometry gate.

## 2. Separate service from shell

~~~text
Electron main: trusted configuration, process/session supervision
  -> loopback HTTP health / instance / session authentication
Electron renderer: trusted portrait iframe/webview and output audio
  -> bounded typed face/attention request from preload
Python face service:
  source appearance + cached registration
  audio encoder → motion windows → deformation/stitching
  explicit expression + gaze/pose overlays
  GPU compositor → timed frames
Electron renderer:
  frame buffer, playout pacing, actual audio clock, interruption
~~~

The inspected reference uses localhost port 3043, a private per-instance token, a protocol version and an instance ID. A new implementation should make the port configurable and refuse to claim an occupied port if its health/identity cannot be verified. Use one startup owner/in-flight promise; never spawn duplicate expensive GPU services. Do not publish the session token or include it in screenshots/logs.

The renderer should remain independently restartable; its failure cannot erase conversation or stop audio permanently. A speech player and face iframe must resolve to the SAME active service/controller. In development, hot reload can update one but leave the other attached to stale objects: test a face-bearing spoken greeting after every rebind. A single shared controller identity and explicit service-session refresh are a viable solution.

## 3. Motion and landmark pipeline

1. Freeze/source-register the private portrait and cache neutral appearance and 3D driving keypoints, invalidating cache on source/model/version hash change.
2. Convert the exact played ElevenLabs/other TTS waveform to the motion encoder's expected sample rate and channels. Preserve original feature-window padding, overlap and look-ahead.
3. Produce audio-conditioned head/mouth/eye motion using a Ditto-style model. On this reference the source conditions and both classifier-free guidance branches are retained; 8 sampling steps is the user-approved quality setting.
4. Fuse/smooth overlapping windows; release only stable prefixes whose later windows cannot change them. Test released prefix numerically against the original whole-clip result. Handle each utterance with generation ID and cancel tokens.
5. Add bounded native facial-expression deltas to 21 canonical 3D facial landmarks (63 coordinates), before pose transform and stitching. Use cheek, eyelid, brow and mouth-corner deltas; lip/jaw speech motion must not be replaced with a second animation.
6. Transform head direction through 3D driving keypoints. Iris and eye attention are native changes, not whole-photo rotation; keep neck/face compositing edges plausible.
7. Render/composite frames into the original image. Compare neutral, expression and speech frames against the approved reference for identity fidelity, no face drift, no exposed matte seams and no eye squeeze.
8. Emit frames with utterance ID, frame index and authoritative presentation time. Electron plays audio first according to a shared clock and displays the corresponding frame, not frames as quickly as GPU produces them.

The inspected Faster mode uses 12.5 neural frames per second and blends them into 25 displayed frames/sec. That is NOT 25 separately neural-generated frames; label it accurately. An optional full-detail mode could generate each frame, but must pass real-time deadlines on the target GPU before being enabled. Hidden views should not consume full idle GPU rendering cycles.

## 4. Motion scheduling for low latency

The reference improved preparation by pipelining audio analysis with motion windows. Whole-clip HuBERT analysis delays the first window; instead, compute exact upstream features incrementally for the next window and overlap later feature work with rendering. **This is not an instantaneous causal model**: the original first-window lookahead still applies. Test record/replay feature equivalence and motion prefix equivalence; don't rely only on JPEG hashes from separate nondeterministic neural runs.

At startup, perform a silent warmup that exercises later motion windows; release a bounded startup display reserve. The reference tested a 12-display-frame floor for short clips and 24 for longer clips, adapting upward when renderer speed is insufficient. Do not let a large prebuffer make facial reactions visibly stale: the inspected attention path limits rendered visible speech to about 36 display frames ahead of the audio clock. Allow background prefetch but keep one audio encoder and one render-buffer owner. Never delay voice merely to complete the whole animation when a stable prefix is ready.

Instrumentation must mark: captured speech end, final ASR, model first text, TTS first audio and final audio, face first ready frame, actual speaker playback start, first displayed face frame, segment gaps, interruptions, late-frame counts. Cache/fixture tests must not be advertised as end-to-end conversational speed.

## 5. Idle, eyes and head movement

Use activity states idle, listening, thinking, speaking and interrupted. A separate native attention controller should blend gaze, expression, explicit look and idle offsets against one monotonic clock.

- Idle: subtle irregular eyelid closure, occasional eased micro-head targets, rare glance away/back; no constantly-looping smile. Reference tuned a gentle blink after rejecting an exaggerated eye squeeze.
- Listening: focused gaze and only a small default curiosity weight; accepted ASR draft cues may briefly signal amusement, concern or curiosity.
- Thinking: hold attention with subtle movement rather than model-authored stage directions.
- Speaking: audio-conditioned mouth remains authoritative; eye/brow/cheek mood and gaze must remain active while talking.
- Sensor screen look: explicit LOOK/ATTN/GAZE event takes precedence over camera gaze; a clear event restores camera priority.
- Camera presence: only actively owned and permitted camera data can drive presence, gaze or reciprocal smile. Stale camera cues expire rapidly.
- Hidden or unowned: stop GPU idle work, cancel obsolete leases and do not catch up missed blinks on return.

Reference calibrated idle head target increased in small user-reviewed increments (eventually about 4.5° yaw, 2.7° pitch and 1.5° roll); treat these as an example, not a universal face-rig calibration. Keep unusual head angles and eyelid amplitude in per-face private config.

## 6. Deployment and recovery

- Main process starts face service only if signed/known executable path exists and the port is not owned by another service. Check process + health + instance, not an unbounded spawn loop.
- The service authenticates a session and heartbeat; use bounded waits, socket cancellation and clear ready/recover states.
- Face-only restart: the Electron shell and model continue, the renderer releases old frame IDs, the view obtains a new session token, the face bridge and speech player rebind together, and gaze/attention state is safely reacquired.
- Suspend Unreal only while this face owns the close view. View switch back to Original/Wide restores Unreal presentation and its original gaze path, without having two presenters fighting over the audio.
- Preserve known-good backup before changes to expression geometry, CUDA/TensorRT engines, model quality, buffering or attention. Do not “fix” one by rewriting the others.
- Validate at normal window size, during speech, while looking at the screen, after long idle, after returning from desk, after service restart and after microphone interruption.

## 7. Test gates

A. Neutral output matches the approved private portrait, and registration/appearance cache invalidates when source changes.

B. Canned audio moves eyes/cheeks/lips in the face, without pixel cutouts or torso sliding; lips visibly match audio and restore neutrality.

C. Original whole-clip and stable-window render respect numerical motion-prefix tolerance, cancellation and unaltered feature-window padding.

D. Face stream processes a short utterance, long utterance, and a two-segment reply with no positive A/V drift, correctly counted late frames and no repeated/disordered segments.

E. Direct smile, big smile, amused, curious, concerned and neutral produce objectively distinct native frames, followed by a human approval of **visible movement**. Event receipt alone does not satisfy this gate.

F. While speaking, camera gaze/smile and explicit screen attention work; concern suppresses reciprocal smile. The lip player remains unaffected.

G. Kill/restart *only* the face service; voice/mic/session remains intact and a new speaking turn restores lip sync. Repeat while the face view remounts.

H. Switch to and from any retained Unreal view without duplicate renderers, lost gaze control or an owned-process leak.

I. No subject images, original voice, credentials, remote URLs or identifying local machine details appear in public test output.

See docs/17 for emotional rules, docs/19 for voice/latency, docs/20 for full acceptance.
