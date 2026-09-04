# 10 — Privacy and Security

A desktop embodiment has access to microphone, optional webcam, optional screen pixels, a local agent gateway, and potentially computer tools. The design should make those capabilities narrower and more visible than the corresponding chat-system privileges, not broader.

## 1. Threat model

Protect against:

- accidental publication of auth secrets,
- renderer compromise exposing provider/OpenClaw credentials,
- sensors remaining active after UI says OFF,
- stale visual context being treated as current,
- broad model tool calls controlling local lifecycle unexpectedly,
- LAN exposure of local development servers,
- unwanted proactive speech,
- accidental disclosure of private screen/camera content into long-lived logs,
- destructive debugging of OpenClaw state,
- arbitrary UDP/control message execution.

## 2. Keep Gateway local by default

OpenClaw's common local Gateway address is loopback:

```text
127.0.0.1:18789
```

Do not bind it publicly merely because the desktop client lives on the same machine. If remote access is genuinely needed, use the current OpenClaw remote-access guidance, authenticated tunnels/VPN, and explicit trust boundaries.

One local profile normally needs one Gateway. Multiple profiles/instances require separate ports, state directories, configs, and workspaces.

## 3. Never commit the Gateway token

Read it from the user's OpenClaw configuration at runtime.

Bad:

```ts
const token = 'abc123...';
```

Better:

```ts
function readGatewayToken() {
  const configPath = process.env.OPENCLAW_CONFIG_PATH ?? defaultLocalPath;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.gateway.auth.token;
}
```

Then make sure the actual config file is ignored and remains private.

Do not print the token in debug logs.

## 4. Renderer receives only constrained realtime credentials

Electron renderer/browser is a less privileged environment. It should receive a short-lived client secret/reservation for the realtime session, not a long-lived provider API key or ChatGPT OAuth credential.

OpenClaw's current Talk architecture brokers appropriate credentials. Use that instead of `dangerouslyAllowAPIKeyInBrowser` patterns.

## 5. Narrow preload bridge

Disable or avoid broad Node integration in the renderer. Expose named IPC methods:

```text
startVoice
stopVoice
captureScreenFrame
setAwareness
saveVoiceTranscript
runVoiceToolCall
appendVoiceAudio
getInitialState
onWakeWord
onScreenObservation
```

Do not expose arbitrary `exec`, filesystem, or unrestricted IPC channels to renderer code.

## 6. Camera OFF is physical

At startup:

```text
camera = OFF
no getUserMedia stream exists
```

At shutdown/off:

```ts
stream.getTracks().forEach(track => track.stop());
```

The camera indicator in the UI is secondary evidence. The actual media tracks are authoritative.

## 7. Screen OFF is enforced in capture function

The screen-capture IPC should throw/refuse when privacy state is OFF.

Bad design:

```text
button says OFF but capture function works if called
```

Good design:

```text
button OFF → state OFF → privileged capture refuses
```

## 8. Minimize retained raw visual data

For normal operation:

- keep frames in memory,
- downscale before model input,
- avoid saving screenshots unless debugging explicitly requires it,
- delete/rotate temporary debug captures,
- keep screen-observer summaries compact,
- avoid writing camera images into normal logs.

A one-off developer smoke-test JPEG is different from a permanent surveillance archive.

## 9. Visual context invalidation

When screen or camera switches OFF, mark previous visual observations stale in the realtime session.

This protects privacy semantics as well as factual correctness. “I used to see that” must not become “I can still see that.”

## 10. Local tools should be tiny and explicit

Good local function tools:

```text
desktop_screen_control({enabled})
desktop_camera_control({enabled})
desktop_sleep({})
```

Bad local tool:

```text
desktop_execute_anything({command})
```

The main OpenClaw agent can have broader tools under its own policy. The realtime avatar should not acquire an extra unaudited shell simply because it has a face.

## 11. Sign-off is not OS sleep

Keep “Thanks, Lyra” → end voice session inside the local desktop client. Do not pass ambiguous natural-language lifecycle intent into arbitrary OS control.

This was a real failure mode in development and is a good example of semantic privilege separation.

## 12. Monolith network exposure

Current Monolith uses an Unreal HTTP server whose bind behavior can expose its port beyond loopback. Upstream specifically warns about this.

On untrusted networks:

- restrict inbound port 9316 with Windows Firewall, or
- disable the Monolith MCP server while not using it.

Do not assume “MCP for my local AI” means “localhost-only” unless verified.

## 13. UDP/control bridge

If using localhost UDP:

- send only to `127.0.0.1`,
- bind receiver to loopback if Unreal's socket API/config allows,
- use a private fixed message format,
- cap datagram size,
- validate prefix and field count,
- parse only numeric fields where expected,
- whitelist known gesture/mood names,
- never feed control strings directly to Unreal console execution.

Example safe parser domain:

```text
DECTRL|MOOD|<known-mood>|<0..1>
DECTRL|GESTURE|<known-gesture>|<0..1>
```

## 14. Proactive speech privacy

Proactive logic should not tell the agent invasive details it does not need.

It can say:

```text
The computer is currently active and the user has not spoken to the desktop agent for about N minutes.
```

It does not need to send:

- full process lists,
- keystrokes,
- browsing history,
- webcam images,
- exact window titles,

unless the user explicitly designed/authorized such context.

## 15. Presence detection is not identity recognition

If a local detector answers “person present / person absent,” phrase downstream logic exactly that way.

Do not tell the model:

```text
Patricia is back.
```

if the sensor only detected a face/body.

Tell it:

```text
Someone appears to have returned to this user's desk. It is usually the user, but identity is not verified.
```

That small distinction prevents the system from overstating what its sensor knows.

## 16. Transcript and memory privacy

Voice transcript persistence should follow the same trust model as normal OpenClaw conversation.

If you add automatic relationship-memory candidate capture:

- exclude obvious secret-like phrases,
- store only text needed for the memory decision,
- mark it candidate/raw rather than immutable truth,
- do not include raw webcam/screen imagery,
- let the normal memory process curate it.

## 17. Logs

Useful logs:

- subsystem start/stop,
- wake confidence/transcription,
- Gateway status,
- provider error strings,
- sensor ON/OFF events,
- image dimensions/byte counts (not image contents),
- tool names/call IDs,
- timing/latency.

Avoid:

- credentials,
- complete private config dumps,
- full screenshots encoded as base64,
- raw camera frames,
- full personal memory files,
- every conversation transcript duplicated into development logs.

## 18. Public-repo hygiene

Before publishing a real implementation, search for:

```text
api_key
apikey
token
secret
password
Bearer
Authorization
.openclaw
Users\\<username>
private email addresses
personal names/addresses
base64 screenshots
```

Use a `.gitignore` for:

```text
.env
.env.*
*.log
logs/
backups/
release/
out/
node_modules/
Saved/
Intermediate/
DerivedDataCache/
Binaries/
.openclaw/
*.key
*.pem
```

Unreal source plugins may legitimately need `Source/` committed, but generated Binaries/Intermediate generally should not be.

## 19. Debugging without destructive state changes

If OpenClaw is unhealthy:

1. run health/probe,
2. test manual Gateway launch,
3. inspect exact logs,
4. verify one process/port/config,
5. run database integrity checks if appropriate,
6. back up before any state migration.

Do not delete a working state database to solve a Windows scheduled-task bug.

## 20. Visible trust contract

The user should be able to infer:

```text
Mic lit → live voice microphone is open
Screen lit → screen capture is authorized
Camera lit → webcam stream is open
all off → those sensors are physically closed/refused
```

That contract matters more than a privacy-policy paragraph.

## Security exit criteria

- [ ] No long-lived credentials in renderer/source repo.
- [ ] Gateway stays loopback/private unless intentionally secured otherwise.
- [ ] Preload exposes narrow APIs only.
- [ ] Screen capture refuses while OFF.
- [ ] Camera tracks stop while OFF.
- [ ] Old visual context is invalidated.
- [ ] Local tools cannot run arbitrary OS commands.
- [ ] UDP/control protocol is validated.
- [ ] Monolith port is firewalled on untrusted networks.
- [ ] Proactive/presence prompts do not overclaim sensor knowledge.
- [ ] Logs exclude secrets/raw visual data by default.
- [ ] Public repo has been scanned for credentials/personal paths.