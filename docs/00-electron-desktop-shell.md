# 00 — Electron Desktop Shell

The Electron shell is the physical orchestration layer between Windows, OpenClaw/Realtime, and Unreal.

If Unreal is the body and OpenClaw is the long-lived mind, Electron is the nervous system.

## 1. Suggested project layout

```text
desktop-shell/
  package.json
  tsconfig.json
  electron.vite.config.ts
  src/
    main/
      index.ts
      gateway/
        index.ts
      screenWatcher.ts
    preload/
      index.ts
    renderer/
      src/
        App.tsx
        realtimeVoice.ts
        proactiveVoice.ts
        styles.css
    shared/
      ipc.ts
      types.ts
      pure.ts
  scripts/
    wake_word_listener.py
    overlay_sync.py
    desk_presence_detector.py
    windows_interruption_state.py
  tests/
```

Do not copy machine-specific absolute paths into the public source. Put them in settings/environment/config discovery.

## 2. Known-good dependency shape

The reference build used:

```json
{
  "dependencies": {
    "@openclaw/gateway-client": "2026.8.1",
    "@openclaw/gateway-protocol": "2026.8.1",
    "electron-store": "11.0.2",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "electron": "44.1.0",
    "electron-builder": "26.15.3",
    "electron-vite": "5.0.0",
    "typescript": "6.0.3",
    "vite": "7.3.6",
    "vitest": "4.1.11"
  }
}
```

These are a reference snapshot. Prefer the current mutually compatible releases when starting a new build.

Recommended scripts:

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "build": "npm run typecheck && electron-vite build",
    "verify": "npm run typecheck && npm test && npm run build"
  }
}
```

## 3. Main-process settings/state

Persist ordinary UX settings with `electron-store`:

```ts
type Settings = {
  handsFree: boolean;
  proactiveEnabled: boolean;
  proactiveSilenceMinutes: number;
  proactiveCooldownMinutes: number;
  proactiveQuietStartHour: number;
  proactiveQuietEndHour: number;
  proactiveIdleMaxMinutes: number;
};
```

Persist window bounds and proactive timestamps too.

Do **not** put the OpenClaw token in electron-store. Read the canonical local config when needed.

## 4. Visible privacy state

Main process should own authoritative state:

```ts
const privacy = {
  screen: 'off' as const,
  microphone: 'off' as const,
  playback: 'off' as const
};
```

Camera stream physically lives in renderer because `getUserMedia` is a web media API, but its UI/permission state should still be visible and synchronized.

## 5. Create the companion window

Conceptual BrowserWindow:

```ts
const win = new BrowserWindow({
  width: 280,
  height: 360,
  minWidth: 220,
  minHeight: 260,
  frame: false,
  transparent: true,
  resizable: true,
  maximizable: false,
  minimizable: true,
  fullscreenable: false,
  show: false,
  webPreferences: {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    nodeIntegration: false
  }
});

win.setAlwaysOnTop(true, 'floating');
```

Position near a screen corner by default but save the user's last bounds.

## 6. UI composition

Keep the interface small:

```text
┌─────────────────────┐
│   Unreal avatar      │
│                      │
│                      │
│ Mic  Screen  Camera  │
└─────────────────────┘
```

Requirements:

- avatar area can be drag region,
- control buttons must be `-webkit-app-region: no-drag`,
- button active state is obvious,
- error indicator is small but exposes exact text,
- do not build a giant dashboard unless the user asks.

The user should be able to ignore the controls most of the time.

## 7. Unreal process launch

Discover/configure rather than hardcoding paths in a reusable build.

Conceptually:

```ts
const args = [
  projectPath,
  mapPath,
  '-game',
  '-windowed',
  '-NoMouseCapture',
  `-ResX=${width}`,
  `-ResY=${height}`,
  '-ExecCmds=t.MaxFPS 8,sg.ShadowQuality 0,r.ScreenPercentage 50'
];

avatarProcess = spawn(unrealExe, args, {
  stdio: 'ignore',
  windowsHide: false
});
```

Tune quality after measuring the target GPU and visual result.

## 8. Keep Unreal aligned with Electron

There are several valid Windows implementations:

- a Python helper using Win32 APIs,
- a small native helper,
- Node FFI/native addon,
- an Unreal-side plugin that watches an IPC channel.

The reference project uses a helper process to find the Unreal runtime window and keep its bounds aligned with the Electron companion box.

Rules:

- do not steal focus while syncing,
- do not capture mouse,
- rate-limit move/resize updates,
- account for Windows scaling/DPI,
- terminate helper when Electron exits.

Do not attempt to solve alignment by constantly rebuilding Unreal viewport assets.

## 9. Tray behavior

A tray icon gives the user a recovery path if the frameless window is off-screen or minimized.

Suggested menu:

```text
Show <Name>
Minimize <Name>
────────────
Quit <Name>
```

Double-click can restore/show.

## 10. IPC design

Define channels centrally in `shared/ipc.ts`.

Examples:

```text
state:get-initial
settings:update
screen:capture-frame
screen:set-awareness
voice:start
voice:stop
voice:tool-call
voice:save-transcript
voice:append-audio
voice:start-proactive
voice:stop-proactive
event:wake-word
event:screen-observation
event:privacy
```

Renderer should never invent string channel names ad hoc.

## 11. Preload API

Expose typed methods:

```ts
contextBridge.exposeInMainWorld('desktopAvatar', {
  getInitialState: () => ipcRenderer.invoke(IPC.getInitialState),
  startVoice: input => ipcRenderer.invoke(IPC.startVoice, input),
  stopVoice: () => ipcRenderer.invoke(IPC.stopVoice),
  captureScreenFrame: () => ipcRenderer.invoke(IPC.captureScreenFrame),
  setAwareness: input => ipcRenderer.invoke(IPC.setAwareness, input),
  saveVoiceTranscript: input => ipcRenderer.invoke(IPC.saveVoiceTranscript, input),
  runVoiceToolCall: input => ipcRenderer.invoke(IPC.runVoiceToolCall, input),
  appendVoiceAudio: data => ipcRenderer.invoke(IPC.appendVoiceAudio, data),
  onWakeWord: listener => subscribe(IPC.wakeWord, listener),
  onScreenObservation: listener => subscribe(IPC.screenObservation, listener)
});
```

Keep arbitrary shell execution out.

## 12. State callbacks from renderer

The realtime voice controller should expose narrow callbacks to React/App:

```ts
{
  onPhase,
  onAmplitude,
  onError,
  onSleepRequested,
  onScreenCommand,
  onCameraCommand
}
```

React owns visible UI state; the controller owns provider media/event lifecycle.

## 13. Screen button behavior

Manual button path must use the same authoritative setter as spoken control:

```ts
async function setScreenState(enabled: boolean): Promise<boolean> {
  try {
    await api.setAwareness({ enabled, sessionKey });
    voiceController?.setScreenEnabled(enabled);
    setScreenOn(enabled);
    clearError();
    return true;
  } catch (err) {
    setError(String(err));
    return false;
  }
}
```

Do not maintain separate “manual screen” and “voice screen” implementations.

## 14. Camera button behavior

Similarly:

```ts
async function setCameraState(enabled: boolean): Promise<boolean> {
  try {
    await voiceController?.setCameraEnabled(enabled);
    setCameraOn(enabled);
    clearError();
    return true;
  } catch (err) {
    setError(String(err));
    return false;
  }
}
```

If the live realtime controller does not exist, decide explicitly whether manual camera should be unavailable or whether you support a separate preview-only stream.

## 15. Error indicator

A tiny error badge can be:

```tsx
{error ? <div className="overlay-error" title={error}>!</div> : null}
```

The `title` is valuable because:

- human can hover,
- DevTools can inspect,
- Windows UI Automation can often expose it as HelpText for remote debugging.

Do not display `!` without retaining the exact underlying message.

## 16. Audio/control bridge

Renderer receives remote audio. A Web Audio processing node can emit PCM chunks to preload/main. Main forwards bounded bytes to a localhost socket.

Control messages can use a recognizable text prefix:

```text
DECTRL|...
```

Main should distinguish binary audio from text control and cap packet sizes.

## 17. Clean shutdown

On app quit:

```text
stop wake listener
stop proactive playback
close realtime voice
stop camera tracks
stop screen watcher
stop overlay sync helper
stop Unreal runtime
close UDP socket
stop Gateway client
```

Use best-effort cleanup so one failure does not prevent remaining resources from closing.

## 18. Reboot/startup

A production daily-use build should not depend on the developer remembering six terminals.

Decide which components start at login:

- OpenClaw Gateway service/task,
- Electron companion app,
- Unreal is normally launched by Electron,
- wake listener is normally launched by Electron.

Test a cold reboot after the full stack stabilizes.

## 19. Development discipline

After every TypeScript change:

```bash
npm run typecheck
npm test
npm run build
```

When running `electron-vite dev`, confirm Hot Module Replacement actually applied renderer changes before assuming a code fix is live. Main/preload changes may require a process restart depending on the toolchain.

## Exit criteria

- [ ] Shell starts Unreal automatically.
- [ ] Companion window is stable, draggable, resizable, always-on-top.
- [ ] Mouse remains free.
- [ ] Mic/Screen/Camera state is visible.
- [ ] Errors retain exact messages.
- [ ] Preload is narrow.
- [ ] Gateway integration lives in main/backend, not browser hacks.
- [ ] All helper processes close on quit.
- [ ] Window/tray recover correctly.
- [ ] Cold reboot plan exists.