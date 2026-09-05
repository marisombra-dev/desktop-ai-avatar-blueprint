# 07a — Screen-Linked System Audio for Watch-Along Use

This chapter adds a capability that feels small but changes the experience dramatically: when the user turns **Screen** on, the desktop AI can also follow the sound produced by the computer.

The reference build uses this for TV programs, streamed video, games, and other shared-screen media. The implementation is deliberately tied to the existing Screen privacy control:

```text
Screen OFF = no screen frames + no system-audio capture
Screen ON  = screen frames + optional system-audio capture
```

The important architectural rule is:

> **Program audio is not user microphone audio. Keep the two paths separate.**

If you simply mix Windows output into the same realtime microphone stream, dialogue from actors or game characters can trigger VAD, transcription, agent replies, or local commands as if the human user had spoken. That is the wrong mental model.

The working design is:

```text
Windows output audio
  ↓ Electron loopback
renderer AudioContext
  ↓ bounded PCM16 chunks
Electron main / local helper
  ↓ faster-whisper
PROGRAM AUDIO transcript
  ↙                 ↘
Realtime context     screen-observer context
```

Raw program audio stays local in this pattern. The long-lived agent receives text context, not a permanent audio recording.

## 1. Grant Windows loopback only while Screen is authorized

Electron exposes Windows system-audio loopback through the display-media request handler. Install the handler in the main process and gate it with your existing Screen privacy state.

Conceptual shape:

```ts
session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
  const trusted = request.securityOrigin.startsWith('file://')
    || request.securityOrigin.startsWith('http://localhost:');

  if (!trusted || privacy.screen !== 'on') {
    callback({});
    return;
  }

  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 0, height: 0 },
    fetchWindowIcons: false
  });

  const source = sources.find(s => s.display_id === String(display.id)) ?? sources[0];
  callback(source ? { video: source, audio: 'loopback' } : {});
});
```

`audio: 'loopback'` is Windows-specific Electron behavior. Check the current Electron `session` / `Streams` documentation before adapting this code to a different Electron release.

Do not grant loopback simply because a renderer asks. The privileged main process should remain the authority on whether Screen is currently ON.

## 2. Request display media, then keep only the audio track

In the trusted renderer:

```ts
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true
});

const audioTrack = stream.getAudioTracks()[0];
if (!audioTrack) throw new Error('No system-audio loopback track was granted.');

// Visual frames already come from desktopCapturer in this architecture.
for (const track of stream.getVideoTracks()) track.stop();
```

Stopping the display-video track matters. Otherwise you have two separate screen-capture pipelines running for no benefit.

Create an `AudioContext`, attach the audio track through `createMediaStreamSource`, and turn the samples into small chunks. The reference build used a `ScriptProcessorNode` because it was simple and reliable in the target Electron version; a new build should prefer `AudioWorklet` if practical.

The processing sink should have zero gain so the capture graph itself does not echo audio back through the speakers.

Conceptually:

```ts
source -> processor -> gain(0) -> context.destination
```

Convert each float32 sample to signed little-endian PCM16 and send bounded chunks across a narrow preload/IPC API. Do not expose arbitrary process/file access to the renderer merely to support audio capture.

A sanitized renderer/main pattern is in `../examples/screen_audio_loopback.ts`.

## 3. Transcribe locally instead of sending raw program audio into Realtime

The reference build launches a small Python helper when Screen audio starts. It receives lines shaped like:

```text
PCM|48000|<base64 pcm16 bytes>
```

The helper:

1. decodes PCM16,
2. keeps a short rolling buffer,
3. resamples to 16 kHz,
4. skips near-silence,
5. runs local `faster-whisper`,
6. emits only short `TEXT|...` lines.

The reference machine already had both `base` and `tiny` models cached. `tiny` was chosen for program audio because it started much faster and screen images provide additional semantic context. For this job, a slightly imperfect transcript available quickly is more useful than a more accurate transcript that makes Screen take a long time to become ready.

Keep the helper local-only:

```py
WhisperModel(
    'tiny',
    device='cpu',
    compute_type='int8',
    local_files_only=True,
)
```

Do not write raw audio to disk. A production build also does not need to keep a permanent transcript log. The rolling text exists only long enough to support the current shared-screen context.

See `../examples/screen_audio_transcriber.py` for the sanitized helper.

## 4. Label the transcript so the model never mistakes it for the user

When a transcript arrives, do not create a normal user message. Add it as system/context material with an explicit source label:

```text
[SHARED SCREEN PROGRAM AUDIO. Do not respond to this update by itself.
This is audio from the show/game/application, NOT the user speaking.
Automatic transcript may contain recognition errors.]
Recent program audio: ...
```

That same recent transcript can be attached to the screen-observer prompt:

```text
Recent PROGRAM AUDIO transcript from the shared screen: ...
```

Now the observer can combine visual evidence with dialogue. A character speaking off-screen, a title card, a dramatic reveal, or game commentary becomes much easier to interpret than vision alone.

Keep the transcript rolling and bounded. The reference pattern retained only a few thousand recent characters and discarded the continuous transcript after Screen ended. A separate optional activity-continuity layer may retain only a handful of widely spaced excerpts as temporary evidence for a distilled stopping-point memory; see `07b-shared-activity-continuity.md`.

## 5. Suppress the assistant's own voice

Windows loopback hears all computer output, including the desktop AI's own TTS/Realtime playback. Without a guard, the assistant can transcribe itself and feed its own words back into screen context.

The reference build already tracks whether a realtime response is active. During assistant output:

```text
assistant speaking -> do not forward loopback PCM
assistant done     -> wait a short tail, then resume
```

A few hundred milliseconds of tail suppression is enough to avoid most playback residue. The exact value depends on the audio stack.

Do not solve this by muting the user's speakers. The user should still hear both the program and the assistant normally.

## 6. Tie the full lifecycle to Screen

Screen ON should start the visual watcher and attempt program-audio capture. If loopback is unavailable, visual Screen should remain usable rather than failing the whole sensor.

Screen OFF should, in order:

1. stop forwarding PCM,
2. stop every loopback media track,
3. disconnect the audio graph,
4. close the `AudioContext`,
5. send `STOP` to the local transcriber and terminate it if it does not exit promptly,
6. clear recent program-audio transcript state,
7. invalidate stale screen context.

Ending the live voice session should perform the same cleanup if Screen was still active. After voice closes, the normal wake listener must be able to reacquire the microphone exactly as before.

This architecture deliberately does **not** add another button. The user already made the privacy decision by turning Screen on. If your product needs independent audio permission, add a separate visible control rather than hiding it.

## 7. Prove the path with an unmistakable sentence

Do not validate this by saying “the process is running.” Play an unusual sentence through Windows output while Screen is ON, for example:

```text
The red spacecraft has landed beside the old lighthouse.
```

Then verify that the local helper emits substantially that sentence. An unusual phrase is useful because it is extremely unlikely to have come from stale context or ordinary room speech.

Next:

- turn Screen OFF and verify the transcriber exits,
- confirm no raw audio file was created,
- wake the assistant again and verify the wake lifecycle still works,
- turn Screen back on during a real video and ask a question that depends on both dialogue and visuals.

## 8. Common failures

**Screen works visually but there is no program transcript:** confirm the returned display stream contains an audio track and that the Electron handler granted `audio: 'loopback'`.

**The assistant reacts to actors as though they are the user:** program audio leaked into the microphone/Realtime input path. Separate it and label transcript context explicitly.

**The assistant transcribes itself:** add or repair the self-voice suppression gate.

**Screen takes a long time to become ready:** use a smaller already-cached local speech model or keep the transcriber warm; do not make visual Screen wait for audio transcription.

**Audio capture survives Screen OFF:** cleanup is incomplete. Stop tracks, close the audio context, terminate the helper, and clear rolling transcript state.

## Exit criteria

- [ ] System audio is OFF whenever Screen is OFF.
- [ ] Program audio reaches a separate local transcription path, never the user's microphone path.
- [ ] A synthetic Windows-output sentence is recognized end to end.
- [ ] Program transcript is labeled as non-user context.
- [ ] The assistant's own voice is excluded from program transcription.
- [ ] Raw program audio is not permanently stored.
- [ ] Screen OFF terminates loopback/transcription promptly.
- [ ] Wake, realtime voice, camera, and visual screen capture still work after the feature is added.
