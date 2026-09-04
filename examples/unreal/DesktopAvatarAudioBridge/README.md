# DesktopAvatarAudioBridge example

This is a sanitized version of the direct local audio bridge pattern used in the working reference build.

It is **not** the first lip-sync route you should attempt. Prove MetaHuman audio animation through the simplest supported loopback/Live Link path first. Use this plugin when you want Electron/Reatime decoded audio to feed MetaHuman directly without depending on a Windows virtual-audio device.

## What it does

The plugin creates a local MetaHuman audio Live Link subject named:

```text
DesktopAvatar_PCM
```

and listens on:

```text
127.0.0.1:19781 UDP
```

Ordinary UDP datagrams are interpreted as raw:

```text
float32
little-endian
mono
16000 Hz
```

PCM samples. Values are clamped to `[-1, 1]` and inserted into `FMetaHumanAudioBaseLiveLinkSubject` as `FAudioSample` objects.

This means the desktop shell can tap decoded realtime speech and send small PCM chunks directly to Unreal.

## Optional rendering-control sideband

Datagrams beginning with:

```text
DECTRL|
```

are treated as local control messages rather than PCM.

This example implements mood only:

```text
DECTRL|MOOD|Happiness|0.66
DECTRL|MOOD|Neutral|1.0
DECTRL|MOOD|AutoDetect|1.0
```

The working reference project also extended this sideband with gesture and gaze controls. Those are intentionally omitted here because gesture implementation depends heavily on the target MetaHuman rig and should be added only after empirical axis/control testing.

## Installation

Copy this folder to:

```text
<YourUnrealProject>/Plugins/DesktopAvatarAudioBridge/
```

Enable the plugin and its required MetaHuman/Live Link dependencies, then restart/build the project.

The Build.cs dependencies reflect the UE 5.8 reference build and are version-sensitive:

```text
LiveLink
LiveLinkInterface
MetaHumanLiveLinkSource
MetaHumanLocalLiveLinkSource
MetaHumanPipelineCore
MetaHumanCoreTech
SpeechAnimationSolver
```

If a newer Unreal release renames/reorganizes those modules, use Monolith plus current engine/plugin source to adapt them. Do not downgrade the whole engine merely to preserve these exact names.

## Renderer/main sender pattern

On the Electron side, convert the current decoded audio buffer to little-endian float32 bytes and send bounded packets to localhost UDP.

Conceptual Node main-process sender:

```ts
import dgram from 'node:dgram';

const socket = dgram.createSocket('udp4');
const PORT = 19781;

function sendPcm(samples: Float32Array): void {
  const bytes = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  if (!bytes.length || bytes.length > 16_384) return;
  socket.send(bytes, PORT, '127.0.0.1');
}

function sendMood(name: string, intensity: number): void {
  const safe = Math.max(0, Math.min(1, intensity));
  const bytes = Buffer.from(`DECTRL|MOOD|${name}|${safe.toFixed(2)}`, 'utf8');
  socket.send(bytes, PORT, '127.0.0.1');
}
```

## Audio format must match

The example receiver assumes 16 kHz mono float32. If your Web Audio tap produces another sample rate, resample before sending or change both sides intentionally.

Do not reinterpret int16 bytes as float32.

## Packet behavior

UDP is used because this is a localhost realtime animation feed where occasional packet loss is preferable to blocking speech playback. Keep packets small.

The reference receiver:

- caps incoming packet bytes,
- uses a large local receive buffer,
- runs non-blocking,
- sleeps briefly when no packet is pending,
- clamps malformed/non-finite sample values,
- accepts only known control commands.

Do not turn the control sideband into arbitrary Unreal console execution.

## MetaHuman hookup

The plugin registers a local Live Link source/subject. Configure the target MetaHuman's current audio-driven animation path to consume that subject using the current UE/MetaHuman workflow.

Because MetaHuman audio APIs are engine-version-sensitive, inspect the actual subject in the Live Link panel and verify it is alive before debugging facial Blueprint logic.

## Validation

1. Start Unreal and confirm the log says the PCM Live Link source is ready.
2. Send a known sine/test PCM packet stream and confirm the Live Link subject is receiving data.
3. Route a short realtime spoken phrase through the Electron PCM tap.
4. Confirm MetaHuman facial speech follows the audible phrase.
5. Send `DECTRL|MOOD|Happiness|0.5` and confirm only the expected mood layer changes.
6. Stop the sender and ensure Unreal remains stable.

## Why this example is valuable

The direct bridge eliminates a fragile middle layer:

```text
Realtime → Windows speaker → virtual loopback → Unreal
```

and replaces it with:

```text
Realtime decoded PCM → localhost bridge → Unreal MetaHuman audio animation
```

That makes the avatar's lip-sync source explicit and controllable while leaving normal speaker playback independent.