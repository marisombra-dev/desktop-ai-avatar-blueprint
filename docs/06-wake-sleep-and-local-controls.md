# 06 — Wake, Sleep, and Local Controls

This chapter turns a working realtime call into a hands-free desktop presence.

## 1. The microphone ownership problem

A local wake recognizer and a live realtime browser call both want the microphone. Trying to keep both active indefinitely can create device contention, doubled processing, false wakes, or inconsistent release behavior.

The reference build uses a clean ownership handoff:

```text
wake process owns microphone
  ↓ wake detected
wake process exits
  ↓ microphone is physically released
realtime call owns microphone
  ↓ local sign-off
realtime call closes
  ↓
wake process is restarted
```

This is simpler than clever simultaneous ownership.

## 2. Canonical wake recognizer

The final reference wake recognizer is a local Python `faster-whisper` listener, not the earlier Windows `System.Speech` experiment.

Requirements:

```bash
pip install faster-whisper sounddevice numpy
```

A known-good reference starting point:

```python
SAMPLE_RATE = 16000
BLOCK_SIZE = 1600
WINDOW_SECONDS = 2.4
CHECK_INTERVAL = 0.55
ENERGY_THRESHOLD = 0.0120
MIN_AVG_LOGPROB = -1.15
MAX_NO_SPEECH = 0.40
MODEL = 'base'
DEVICE = 'cpu'
COMPUTE_TYPE = 'int8'
```

Do not treat those acoustic thresholds as universal. Log real samples from the target microphone and calibrate.

## 3. Restrict the vocabulary by shape, not prompt bias

The listener should only accept a normalized phrase shaped like:

```text
lyra
hey lyra
hi lyra
```

Optionally tolerate accidental repeated wakes such as “Lyra, Lyra.”

Use local normalization:

```python
normalized = re.sub(r'[^a-z ]+', ' ', text.lower())
normalized = re.sub(r'\s+', ' ', normalized).strip()
wake_shape = re.fullmatch(
    r'(?:(?:hey |hi )?lyra)(?: (?:(?:hey |hi )?lyra))*',
    normalized
)
```

Avoid heavily biasing Whisper with the wake name if it creates hallucinated wakes. The reference system improved when the acoustic/transcript result was judged after recognition rather than aggressively hotword-biasing the model.

## 4. Gate the candidate acoustically

The reference loop combines:

- RMS speech floor,
- average segment log probability,
- average no-speech probability,
- strict normalized phrase shape.

Conceptually:

```python
good = (
    wake_shape
    and rms >= ENERGY_THRESHOLD
    and avg_logprob >= MIN_AVG_LOGPROB
    and no_speech <= MAX_NO_SPEECH
)
```

When `good` is true:

```python
print(f'WAKE|1.0|{text}', flush=True)
sys.exit(0)
```

Exiting releases `sounddevice.InputStream` and therefore the microphone.

## 5. Make the listener local-only after model installation

For a stable desktop product, cache the Whisper model and prefer local-only loading so an ambient wake process does not unexpectedly download or require network access.

The reference uses CPU/int8 because wake detection does not need to occupy the GPU that Unreal is using.

## 6. Electron wake-process lifecycle

Main-process pseudocode:

```ts
function startWakeListener() {
  if (wakePaused || !handsFree || activeVoice || activeProactive || quitting || wakeProcess) return;

  const child = spawn(pythonExe, ['-u', wakeScript], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  wakeProcess = child;

  child.stdout.on('data', parseLines(line => {
    if (!line.startsWith('WAKE|')) return;

    wakePaused = true;
    wakeProcess = undefined;
    child.kill();
    restoreAvatarWindow();
    mainWindow.webContents.send('wake-word', parsedWakeEvent);
  }));

  child.once('exit', () => {
    if (wakeProcess !== child) return;
    wakeProcess = undefined;
    if (!wakePaused && handsFree && !activeVoice && !quitting) {
      setTimeout(startWakeListener, 1500);
    }
  });
}
```

When realtime voice finishes successfully:

```ts
wakePaused = false;
startWakeListener();
```

## 7. Wake phrase versus greeting

The wake phrase starts the session. It does not need to become a normal full conversational turn.

If you simply insert “Hi Lyra” as a user item and allow the full agent to answer normally, a warm agent may produce:

> “Hi! Great to hear from you. What are we doing today? Starting something new? Want to vent? I’m listening...”

That is charming once and exhausting on the 40th wake.

The reference solution uses a response-local exact greeting with tools disabled:

```ts
const greetings = [
  'Hi.',
  'Hey, love.',
  'Hi, sweetheart.',
  'Hey, you.'
];

send({ type: 'conversation.item.create', item: wakeUserItem });
send({
  type: 'response.create',
  response: {
    instructions: `Wake greeting only. Say exactly: ${greeting} Do not add anything else.`,
    tools: [],
    tool_choice: 'none'
  }
});
```

Use nicknames/endearments only if they fit the person's established relationship and the user wants them.

## 8. Completed transcription is the local-command hook

Do not classify commands from partial transcript deltas. Wait for:

```text
conversation.item.input_audio_transcription.completed
```

Then:

1. persist the user transcript,
2. normalize it,
3. run narrow local-command handling,
4. let ordinary conversation continue through agent consultation.

The reference build had command-recognition code present but not wired into this completed-transcript event. The feature looked implemented in source but could never fire. Verify event-to-handler wiring explicitly.

## 9. Normalization for natural speech

Example:

```ts
const normalized = text
  .toLowerCase()
  .replace(/[^a-z0-9'\s]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const command = normalized
  .replace(/^(?:(?:hey|hi)\s+)?lyra\s*/, '')
  .replace(/\s+lyra$/, '')
  .replace(/^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?/, '')
  .trim();
```

Now all of these can map to the same intent:

```text
look at the screen
Lyra, look at the screen
can you look at the screen
could you please look at my screen
```

## 10. Keep intent patterns narrow

Useful local command families:

### Sleep/sign-off

```text
thanks lyra
thank you lyra
lyra thanks
go back to sleep
end the voice session
```

### Screen ON

```text
look at the screen
look at my screen
watch my screen
see the screen
screen on
turn screen awareness on
watch me play
```

### Screen OFF

```text
stop watching my screen
stop looking at the screen
screen off
turn screen awareness off
```

### Camera ON

```text
look at me
see me
use the camera
camera on
turn the camera on
```

### Camera OFF

```text
stop looking at me
stop using the camera
camera off
turn the camera off
```

Do not match a broad substring like `/screen/` because “I bought a new screen” must remain normal conversation.

## 11. Install equivalent realtime tools

On `session.created`, merge these into the current session tool array:

```json
[
  {
    "type": "function",
    "name": "desktop_screen_control",
    "description": "Turn locally shared screen awareness on or off.",
    "parameters": {
      "type": "object",
      "properties": { "enabled": { "type": "boolean" } },
      "required": ["enabled"],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "desktop_camera_control",
    "description": "Turn local webcam awareness on or off.",
    "parameters": {
      "type": "object",
      "properties": { "enabled": { "type": "boolean" } },
      "required": ["enabled"],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "desktop_sleep",
    "description": "End this desktop voice conversation and return to wake listening.",
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  }
]
```

Merge by tool name. Preserve OpenClaw/provider tools.

## 12. Critical Realtime schema detail

Current Realtime `session.update` expects a realtime session type.

Use:

```ts
send({
  type: 'session.update',
  session: {
    type: typeof session.type === 'string' ? session.type : 'realtime',
    tools: merged
  }
});
```

The reference build initially omitted `session.type` and got:

```text
Missing required parameter: 'session.type'.
```

That exact error was the entire problem. Always inspect provider error text before rewriting architecture.

## 13. Intercept local commands inside agent-consult tool calls too

When a provider produces an `openclaw_agent_consult` function call:

```ts
const spoken = extractConsultText(args);
const local = classifyLocalCommand(spoken);
if (local) {
  await executeLocal(local);
  sendFunctionCallOutput(callId, localResult);
  return;
}
```

This closes the race where the provider chooses to consult before your transcript-completed handler acts.

## 14. Local sleep implementation

When sign-off matches:

```ts
cancelCurrentResponse();
await onSleepRequested();
return;
```

The outer app should then:

- close realtime peer/data channel,
- stop microphone tracks,
- stop camera tracks,
- turn off screen/camera transient state as your policy dictates,
- stop audio analyzers,
- close the server-side Talk session,
- mark UI idle,
- re-arm wake listener.

## 15. Test matrix

Run sequentially:

```text
Lyra                       → wakes
Thanks, Lyra               → sleeps
Lyra                       → wakes again
Can you look at the screen → screen ON + fresh visual answer
Stop watching my screen    → screen OFF
Can you look at me         → camera ON + fresh visual answer
Stop looking at me         → camera OFF
Thank you, Lyra            → sleeps
Lyra                       → wakes again
```

Do this without restarting the desktop application.

## Exit criteria

- [ ] Wake listener is local and releases mic on detection.
- [ ] Wake listener does not run during live voice.
- [ ] Wake greeting is deliberately short.
- [ ] Completed transcriptions reach local intent handling.
- [ ] Local tools are merged on each new realtime session.
- [ ] `session.update` uses the current required session shape.
- [ ] Sign-off cannot trigger OS sleep or unrelated tools.
- [ ] Sensor commands work through deterministic and tool-call routes.
- [ ] Repeated wake/sleep cycles remain clean.