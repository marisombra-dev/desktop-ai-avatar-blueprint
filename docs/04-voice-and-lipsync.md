# 04 — Realtime Voice and Lip Sync

This chapter gets you from a silent MetaHuman to a low-latency conversational voice whose audio drives the face.

## 1. Keep voice transport and agent reasoning conceptually separate

The reference system uses OpenAI Realtime over WebRTC for the live acoustic experience, while OpenClaw owns the long-lived person and routes substantive dialogue through the existing agent.

This gives you:

- low-latency microphone/audio,
- natural interruption,
- realtime transcription events,
- provider function calls,
- image input for screen/camera,
- the same long-lived personality/memory.

Do not start by sending microphone recordings to a normal text chat endpoint and bolting TTS on afterward unless realtime is unavailable. The conversational feel is materially different.

## 2. Create the WebRTC session through OpenClaw

In the validated reference build, the desktop client asks OpenClaw Talk for a client-owned session with semantics similar to:

```ts
const result = await gateway.request('talk.client.create', {
  sessionKey: 'agent:main:desktop-lyra',
  mode: 'realtime',
  transport: 'webrtc',
  brain: 'agent-consult',
  reasoningEffort: 'medium',
  voice: 'ash',
  capabilities: ['voice-transcript', 'camera-frame']
});
```

The exact options/voice names can change. Read current OpenClaw Talk documentation and current provider catalog instead of copying old names blindly.

A successful result should contain enough information for the client to establish the provider call, typically:

- voice session id,
- ephemeral/constrained client secret,
- provider/transport,
- SDP offer URL or broker route,
- optional headers/model/voice/expiry.

Never put a normal long-lived OpenAI API key into Electron renderer code.

## 3. Create the peer connection

Renderer-side flow:

```ts
const peer = new RTCPeerConnection();
const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
for (const track of mic.getAudioTracks()) peer.addTrack(track, mic);

const remoteAudio = document.createElement('audio');
remoteAudio.autoplay = true;
peer.addEventListener('track', (event) => {
  remoteAudio.srcObject = event.streams[0];
});

const channel = peer.createDataChannel('oai-events');

const offer = await peer.createOffer();
await peer.setLocalDescription(offer);

const answerSdp = await fetch(offerUrl, {
  method: 'POST',
  body: offer.sdp ?? '',
  headers: {
    Authorization: `Bearer ${clientSecret}`,
    'Content-Type': 'application/sdp',
    ...offerHeaders
  }
}).then(r => {
  if (!r.ok) throw new Error(`Realtime setup failed (${r.status})`);
  return r.text();
});

await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
```

Wait for the data channel to become `open` before sending session events.

## 4. Use provider events as explicit state

Track at least:

```text
session.created
input_audio_buffer.speech_started
input_audio_buffer.speech_stopped
conversation.item.input_audio_transcription.completed
response.created
response.*transcript*.delta
response.*transcript*.done
response.done
response.cancelled
error
```

Map them to UI phases such as:

```text
idle
listening
thinking
speaking
error
```

Do not infer everything from the audio element. The data channel gives you much better lifecycle information.

## 5. Persist both sides of the transcript through OpenClaw

When user transcription completes, persist it to the same desktop voice session through the Gateway. When the assistant's transcript completes, persist that too.

Benefits:

- continuity/history survives the ephemeral realtime call,
- the long-lived agent can use conversation history,
- debugging becomes much easier,
- wake/sleep can start fresh provider calls without losing the desktop conversation.

Deduplicate by role + provider item id + text so repeated provider events do not create duplicate history entries.

## 6. Interruption

Realtime interruption should be a first-class behavior, not a later feature.

When user speech starts during assistant output:

- update phase to listening,
- let provider/server interruption semantics stop or truncate output as appropriate,
- ensure local avatar audio/control does not keep “speaking” after the audible response was cancelled.

If you create custom responses from local sensor requests, track response ownership explicitly. Treat a locally sent `response.create` as pending immediately rather than waiting for the later `response.created` event. If cancellation is in progress, queue at most one replacement response until cancellation is acknowledged. This closes the race where two rapid turns can otherwise trigger a provider error saying a response is already active.

A separate turn-completion guard improves listening patience. If a completed transcript is linguistically unfinished, for example ending in `but`, `because`, `just`, or `the reason is`, hold it briefly rather than answering immediately. If speech resumes during that window, merge the continuation and keep listening. Complete turns bypass the hold entirely, so ordinary response latency does not increase.

The reference build validated this with a deliberate mid-sentence pause: the avatar waited through the pause, answered only after the continuation, showed no apparent added latency on completion, and did not reproduce the overlapping-response error.

## 7. Delivery instructions should be small

A useful realtime delivery instruction is something like:

```text
Speak as the same long-lived agent in first person. The user should experience one continuous person, never internal routing. Do not say you need to “check with” the agent. Deliver the consulted response naturally in the selected voice. Preserve humor, affection, uncertainty, opinions, and dry timing that are actually present. Do not add generic support-coach framing that was not in the consulted answer.
```

This solves presentation. It does not replace agent identity.

## 8. Short local utterances can bypass the brain

Not every spoken sound needs a full agent turn.

Good local/exact playback examples:

- wake greeting: “Hey, love.”
- a precomputed proactive line returned by the main agent,
- a short screen-spectator comment already authored by the main agent.

Use response-specific instructions with tools disabled, e.g.:

```ts
send({
  type: 'response.create',
  response: {
    instructions: `Say exactly: ${line}. Do not add words.`,
    tools: [],
    tool_choice: 'none'
  }
});
```

This avoids the comical failure mode where “Hi Lyra” produces a six-sentence orientation speech every time.

## 9. Lip-sync route A — system/virtual audio loopback

Use this for the first proof.

Architecture:

```text
Realtime remote audio
       ↓
Windows output device
       ↓
loopback / virtual input
       ↓
MetaHuman Audio Live Link / Speech-to-Face
       ↓
face animation
```

Steps:

1. Select a stable Windows output for realtime voice.
2. Expose that signal as a loopback/virtual capture source.
3. Configure the current MetaHuman audio animation/Live Link feature to use that source.
4. Confirm the subject is alive before speaking.
5. Speak a test phrase with hard consonants, vowels, pauses, and a question.
6. Tune audio level so the facial solver receives clean signal without clipping.

Advantages:

- fast to establish,
- easily inspected with OS audio tools,
- no custom Unreal C++ required.

Disadvantages:

- device routing can be fragile,
- audio can be duplicated/audible on wrong endpoint,
- harder to ship cleanly across machines.

## 10. Lip-sync route B — direct PCM bridge

After route A works, a direct bridge removes OS-loopback dependence.

Conceptual flow:

```text
WebRTC remote MediaStream
       ↓
Web Audio graph / ScriptProcessor or AudioWorklet
       ↓
decoded PCM chunks
       ↓
Electron main IPC
       ↓
localhost UDP / named pipe
       ↓
Unreal C++ receiver plugin
       ↓
MetaHuman audio animation input
```

The reference project sends small audio packets over loopback UDP and uses a control-message prefix for non-audio commands.

Important engineering details:

- bound packet size,
- keep transport loopback-only,
- preserve ordering as much as practical,
- decide the sample rate/format explicitly,
- use an AudioWorklet for a production implementation if current browser APIs favor it,
- do not block renderer/UI on audio forwarding,
- drop malformed/oversized packets.

## 11. Avatar control sideband

The same localhost channel can carry tiny text commands such as:

```text
DECTRL|MOOD|Happiness|0.66
DECTRL|MOOD|AutoDetect|1.00
DECTRL|GESTURE|NOD|0.75
DECTRL|GESTURE|SHAKE|0.75
DECTRL|LOOK|-14.0|0.0|2.20
```

Treat this as a private protocol between your shell and your Unreal project. Version it if it grows.

Do not couple mood commands to OpenClaw tool privileges. They are rendering hints.

## 12. Audio-drain problem in playback-only speech

A provider `response.done` event means the provider finished producing the response. It does **not necessarily mean the HTML audio element has finished playing all buffered audio**.

If you use a short-lived playback-only realtime session for proactive speech, closing it immediately on `response.done` can clip the last words.

The reference implementation keeps the session alive for a bounded drain interval based roughly on utterance length before teardown.

A more robust future implementation can observe media playback/buffer state directly, but the key is: do not equate provider completion with speaker completion.

## 13. Voice choice and tuning

Choose voice by listening in real interaction, not by a one-line sample.

Evaluate:

- baseline warmth,
- tendency to over-enthuse,
- laugh/chuckle quality,
- handling of serious tone,
- speed,
- whether names are pronounced consistently,
- whether long agent answers become tiring.

The reference project changed voices during development. Voice is a user-facing design choice, not an architectural dependency.

## 14. Objective validation

Test these sentences/behaviors:

- “Hi.” → short greeting, no speech inflation.
- A long sentence with interruptions.
- Ask a factual agent-continuity question.
- Speak over the assistant mid-sentence.
- Ask a question, pause briefly, then add a clause.
- Laugh or say something playful.
- End the call with the local sign-off.

Watch both the audible output and MetaHuman mouth timing.

## Exit criteria

- [ ] WebRTC opens repeatedly without leaking long-lived credentials.
- [ ] User microphone and remote speaker work.
- [ ] Provider events drive reliable listening/thinking/speaking state.
- [ ] User interruption works.
- [ ] User/assistant transcripts persist through OpenClaw.
- [ ] Ordinary answers preserve the existing person's identity.
- [ ] Wake/proactive exact utterances can be intentionally short.
- [ ] Audio drives MetaHuman lip sync.
- [ ] Closing a voice session releases microphone/camera/audio resources.