# 10b — Electra HLS Relay Stability: Validated 2026-09-12

**Status: PROVEN FIXED IN TARGETED AND PRODUCTION ROTATION TESTING**

This note documents the repair for the Wide View crash in which Unreal could disappear while the Electron shell and controls remained alive during rotating public webcam playback.

The final repair does **not** blacklist troublesome cameras and does **not** replace Electra. It inserts a local normalization boundary between irregular public HLS feeds and Unreal.

## Failure signature

Repeated crash captures pointed into Unreal's Electra decoder stack rather than Electron.

The strongest crash signature was:

```text
Assertion failed: InitialCodecSpecificData.IsValid()
ElectraPlayerRuntime / VideoDecoder.cpp
```

A separate historical crash produced an access violation after another public webcam rotation.

The camera pages involved were not isolated one-off failures. Public webcam feeds can expose irregular HLS manifests, including non-multivariant playlists, missing or incomplete `CODECS` metadata, expired tokenized URLs, and uneven segment delivery.

The design requirement was therefore to make media ingestion robust without changing the higher-level Wide View behavior.

## Failed approach: direct public HLS into Electra

The original path was:

```text
Skyline webcam page
    -> tokenized public HLS URL
    -> Unreal Electra
    -> Wide View window
```

That path allowed third-party manifest and codec quirks to reach Electra directly.

The observed result was intermittent decoder failure severe enough to terminate the Unreal avatar runtime.

Forcing Windows Media Foundation was also tested and rejected. It rendered the webcam feeds black and reported unsupported byte-stream types.

## Working architecture

The validated production path is:

```text
Skyline webcam page
    -> fresh tokenized HLS URL
    -> FFmpeg normalization child process
    -> local HLS generation directory
    -> localhost HTTP server
    -> Unreal Electra
    -> Wide View window
```

The camera catalog, random selection, 25-second rotation cadence, and camera/location metadata remain above this boundary.

Electra no longer receives the arbitrary public feed directly.

## Normalized media profile

Each selected camera is converted to a deliberately conservative video-only HLS profile:

```text
Video codec:       H.264 / AVC
Profile:           Main
Level:             3.1
Pixel format:      yuv420p
Output size:       640x360
Frame rate:        15 fps
Audio:             disabled
Nominal bitrate:   900 kbps
Max bitrate:       1100 kbps
Buffer:            1800 kb
Segment length:    3 seconds
Keyframe interval: 45 frames / 3 seconds
```

A tiny local master playlist explicitly advertises the normalized codec:

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-STREAM-INF:BANDWIDTH=1100000,CODECS="avc1.4d401f"
variant.m3u8
```

This prevents Electra from having to infer decoder initialization data from the irregular public source.

## Fresh token handling matters

Skyline's tokenized HLS URLs are ephemeral.

An early standalone relay test failed because it reused an expired token. The final implementation starts FFmpeg immediately after the camera page produces a fresh stream token, inside the same selection transaction.

This avoids treating an expired source URL as a media-decoder problem.

## Local HLS server behavior

A small localhost-only Python HTTP server serves the relay directory on a fixed loopback port.

Important behavior:

- binds to `127.0.0.1` only;
- serves `.m3u8` as HLS and `.ts` as MPEG transport stream;
- sends `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`;
- sends `Pragma: no-cache` and `Expires: 0`;
- watches the parent Unreal PID and exits when the parent is gone.

The server also rewrites the served variant playlist's target duration to a conservative value:

```text
#EXT-X-TARGETDURATION:10
```

This was necessary because some upstream cameras deliver frames in bursts. FFmpeg may still produce 3-second segments, but actual playlist rewrites can occasionally pause for several seconds.

With a 3-second advertised target duration, Electra could conclude that the live playlist was dead even while FFmpeg was still healthy. Advertising a 10-second target duration gives the normalized live stream enough tolerance for those irregular upstream pauses without increasing the actual segment size or making scene startup sluggish.

## Relay lifecycle

The Wide Window driver owns two child-process types:

1. one local HTTP server for the lifetime of the Unreal process;
2. one FFmpeg child for the currently selected camera.

On every camera switch:

1. Electra closes the prior local media URL;
2. the previous FFmpeg process is stopped;
3. the previous relay generation directory is deleted;
4. a new generation directory is created;
5. FFmpeg begins writing the normalized variant and segments;
6. the driver waits until the variant contains playable segments;
7. Electra opens the localhost master playlist;
8. the pending generation becomes the active generation.

If a relay fails before it becomes playable, its pending directory is removed and the normal camera retry/backoff path continues.

On startup, stale relay residue is deleted before the local server starts. On normal Unreal shutdown the relay tree is removed. If Unreal is force-killed and cannot run shutdown cleanup, the next launch removes the stale generation before creating `g_000001` again.

This prevents a long-running rotating window from becoming a disk-space leak.

## Failure isolation

A bad or temporarily unavailable webcam now fails at the relay boundary instead of taking down the avatar.

Examples:

- If the webcam page does not yield a live token, the camera is skipped through the existing retry path.
- If FFmpeg exits before producing a ready playlist, the pending relay is abandoned and cleaned up.
- If Electra refuses the normalized local URL, the relay is cleaned up and selection retries later.

The key architectural change is that third-party HLS irregularities no longer directly control Electra's decoder initialization.

## Targeted regression against historically dangerous feeds

Crash logs identified two especially useful regression families:

- **Rhodes, Greece** immediately preceded the `InitialCodecSpecificData.IsValid()` assertion.
- **Gerona, Spain** immediately preceded an Electra access violation.

The full catalog contains multiple pages under those location labels.

A temporary test catalog was built containing only the Rhodes/Gerona feeds, then later Rhodes-only, to force repeated exposure instead of waiting for random selection.

After the target-duration repair:

- Gerona: **4 clean relay sessions**;
- Rhodes: **4 clean relay sessions**;
- HLS timing warnings: **0** in the validated targeted runs;
- Electra player errors: **0**;
- codec assertions: **0**;
- access violations: **0**;
- Unreal remained responsive.

Some Rhodes pages temporarily returned no stream token. That was handled as ordinary upstream unavailability and did not destabilize the runtime.

## Production-catalog validation

The original **1,284-camera catalog** was restored unchanged.

The final production run completed repeated 25-second rotations through ordinary random cameras including locations in Italy, Greece, Malta, Spain, and the Maldives.

Across the final validation sequence, including the targeted runs and production runs, the normalized relay completed **19 clean relay sessions** with:

- **0 Electra player errors**;
- **0 `InitialCodecSpecificData` assertions**;
- **0 access violations**;
- **0 relay failures**;
- Unreal responsive throughout;
- webcam audio still disabled;
- random rotation preserved;
- camera/location metadata preserved.

The relay directory was also inspected during rotation. After multiple generations it contained exactly one active generation directory rather than an accumulating history.

## Forced-restart validation

A forced Desktop Ethan process-tree stop was performed while a later relay generation existed.

Because a hard kill bypasses Unreal `EndPlay`, the old generation remained on disk immediately after the kill. On the next launch:

1. startup cleanup removed the stale relay tree;
2. generation numbering restarted at `g_000001`;
3. a fresh local HTTP helper and FFmpeg child attached to the new Unreal PID;
4. webcam playback resumed through localhost;
5. subsequent camera rotations again retained exactly one generation directory;
6. no player errors or crash signatures appeared.

This proves the relay recovers cleanly from the same class of abrupt avatar-runtime death it was designed to prevent.

## What remained unchanged

The fix intentionally preserves approved Wide View behavior:

- 25-second random camera rotation;
- full 1,284-camera catalog;
- current camera metadata used by Wide View visual awareness;
- silent webcam window feed;
- existing room/window material and presentation path;
- existing Wide View animation and idle systems;
- Electron shell and Screen/Camera privacy semantics.

The repair is an ingestion boundary, not a redesign of Wide View.

## Operational dependencies

The reference implementation currently expects local executables discoverable on Windows through `where.exe`:

```text
ffmpeg.exe
python.exe
```

A distributable build should either bundle equivalent runtime dependencies or provide a deliberate installation/configuration path rather than assuming development-machine PATH state.

## General lesson

When a real-time engine consumes uncontrolled public live media, treat the public stream as hostile input from a robustness perspective even when the source is trusted.

Do not make the avatar renderer responsible for tolerating every manifest, codec declaration, token lifetime, timestamp discontinuity, and delivery cadence found on the public Internet.

Normalize at the boundary:

```text
uncontrolled public media
        -> controlled local representation
        -> renderer
```

That boundary converted an intermittent process-killing decoder failure into a stable, testable subsystem while preserving the user-facing behavior.