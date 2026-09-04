# 14 — Windows Startup and Cold-Reboot Hardening

A desktop AI avatar is not finished when it works from three developer terminals. It is finished when Windows reboots, the required background services come back cleanly, the avatar launches, the wake listener arms, and the human does not need to remember the build architecture.

This chapter captures the launcher lessons from the reference project.

## 1. Decide which process owns which child

Recommended ownership:

```text
Windows startup
  ├─ OpenClaw Gateway (long-lived task/service)
  └─ Electron desktop avatar app
       ├─ Unreal avatar runtime
       ├─ overlay/window-sync helper
       ├─ wake listener while voice is asleep
       └─ other local helper processes as needed
```

Do not independently autostart Unreal and Electron if Electron is supposed to own the Unreal runtime. Duplicate ownership creates orphaned windows/processes.

## 2. OpenClaw Gateway should be independently healthy

The Gateway must not depend on the Electron avatar being open.

Before creating a startup task, prove a manual command works from a normal terminal using the intended config/state directory.

Conceptual command:

```text
node <openclaw-install>/openclaw.mjs gateway run --port 18789
```

Use the current OpenClaw launch command for the installed release.

If manual launch is unhealthy, fix OpenClaw first. If manual launch is healthy but the scheduled task is not, the problem is almost certainly the launcher environment until proven otherwise.

## 3. Scheduled-task environment differs from a terminal

A Windows scheduled task can differ in:

- working directory,
- inherited environment variables,
- `PATH`,
- `NODE_OPTIONS`,
- stdin/stdout behavior,
- user/session permissions,
- network availability at boot,
- whether an interactive desktop exists,
- task time limits,
- restart policy.

The reference project benefited from an explicit wrapper rather than putting a complicated Node command directly into Task Scheduler.

See:

```text
examples/openclaw-gateway.cmd.example
```

## 4. Clear inherited Node options deliberately

A launcher can inherit `NODE_OPTIONS` that were useful for another process but harmful to a long-lived Gateway.

A wrapper can begin with:

```bat
set "NODE_OPTIONS="
```

then apply only the Node flags you intentionally need.

Do not cargo-cult a heap size from the reference machine. Measure the target system.

## 5. Use a stable working directory

Before starting OpenClaw:

```bat
cd /d "%USERPROFILE%\.openclaw"
```

or the actual configured OpenClaw home for that user.

This avoids relative-path behavior changing between manual and scheduled launch.

## 6. Long-lived process and stdin

Some Windows launcher combinations behave differently when a child process inherits a transient console/stdin.

The reference launcher used an explicit non-interactive stdin redirection:

```bat
< NUL
```

because the Gateway is a daemon-like process and should not depend on an interactive terminal remaining attached.

Treat this as a platform-specific launcher detail, not an OpenClaw protocol requirement.

## 7. Task Scheduler checklist

Configure the task so that:

- it runs as the correct Windows user,
- it uses the intended working environment,
- it starts at logon/startup according to the product requirement,
- it does not have an accidental short “stop task after N hours” limit,
- it restarts after a genuine process failure when appropriate,
- it does not launch a second copy while the healthy Gateway is already bound,
- its wrapper paths are absolute or reliably expanded,
- the task history/log makes failures diagnosable.

After changing it, close all manual Gateway terminals before testing.

## 8. Do not diagnose launcher failure by deleting OpenClaw state

A healthy manual Gateway plus unhealthy scheduled Gateway is powerful evidence.

Before touching the state database:

1. verify the manual command,
2. compare working directory and environment,
3. verify which config path each process reads,
4. verify only one process owns the port,
5. inspect the latest startup log,
6. if concerned about database corruption, run the appropriate integrity check and back up first.

Do not delete/replace the agent's state database merely to see if Task Scheduler behaves differently.

## 9. Electron startup

Once Gateway startup is independently stable, decide whether the companion app should launch at logon.

The Electron app should be tolerant of this race:

```text
Electron starts
Gateway is still booting
Gateway client connection fails once
Gateway becomes ready
client reconnects automatically
avatar becomes online
```

Do not make the first connection failure permanently poison the application.

Keep the Gateway readiness promise/retry state recoverable.

## 10. Unreal launch belongs to Electron

Electron main process should launch the correct:

```text
Unreal executable
.uproject
map
-game
-windowed
-NoMouseCapture
resolution/performance args
```

On Electron quit, terminate the Unreal runtime and window-sync helper.

On Electron crash, consider cleanup/recovery at next launch so duplicate avatar windows are not accumulated.

## 11. Python/helper discovery

A development machine may have a hardcoded Python path such as:

```text
C:\Python314\python.exe
```

A reusable build should discover/configure Python or package helpers into the application.

At startup validate helper prerequisites and expose a specific error such as:

```text
Wake listener could not start: Python/faster-whisper unavailable.
```

rather than silently leaving hands-free mode dead.

## 12. Wake listener startup order

Do not arm wake until:

- Electron UI exists,
- settings are loaded,
- no live/proactive voice session is active,
- the target microphone is available.

A normal cold-start sequence is:

```text
Electron ready
→ create window
→ connect Gateway asynchronously
→ launch Unreal
→ load settings/privacy OFF
→ arm wake listener
```

The wake listener can operate before Gateway is fully ready, but when it hears the name the voice start path must either wait for Gateway readiness or present a recoverable error and re-arm wake.

## 13. Sensor startup state

After every cold boot:

```text
Screen = OFF
Camera = OFF
no camera MediaStream exists
screen capture function rejects unauthorized calls
```

Do not persist “Screen ON” or “Camera ON” across application reboot as a convenience unless the product explicitly asks for that behavior and makes it visible.

The reference privacy contract restarts sensors OFF.

## 14. Proactive timestamps across restart

Persist enough presence state that restarting the app does not immediately trigger an unsolicited line.

Useful persisted values:

```text
last proactive decision time
last proactive spoken time
temporary quiet-until
```

Do not treat app restart as “the user has been silent forever, say something now.”

## 15. Cold-reboot acceptance test

After the stack is believed stable:

1. Close developer terminals/editors that are not part of daily operation.
2. Reboot Windows normally.
3. Do not manually launch OpenClaw, Unreal, Python, or Electron unless the design intentionally requires a single Electron shortcut.
4. Confirm Gateway health.
5. Confirm only one Gateway process/listener exists.
6. Confirm companion window/Unreal avatar appears as intended.
7. Confirm mouse is not captured.
8. Confirm Screen and Camera begin OFF.
9. Say the wake name.
10. Have a normal conversation.
11. Use the sign-off and verify wake re-arms.
12. Wake again.
13. Manually/spoken-enable screen and run a visual grounding test.
14. Disable screen.
15. Enable camera and run an objective visual test.
16. Disable camera and confirm the hardware stream closes.
17. Quit/reopen the companion app and confirm no orphan Unreal/helper processes remain.

Do not declare daily-use readiness before this test passes.

## 16. What to log at startup

Useful, non-secret entries:

```text
app version
OpenClaw client/protocol version
Gateway connecting/connected/reconnecting
gateway server version after hello
Unreal executable/project/map path (if not sensitive)
Unreal child PID
wake listener start/ready/wake/exit
selected microphone device name
sensor initial OFF state
proactive timers loaded
exact child-process launch failures
```

Never log the Gateway token or provider credentials.

## Exit criteria

- [ ] Manual Gateway launch works.
- [ ] Scheduled/startup Gateway works without a developer terminal.
- [ ] Electron tolerates Gateway boot races.
- [ ] Electron owns Unreal/helper process lifecycle.
- [ ] Wake arms after cold start.
- [ ] Sensors start physically OFF.
- [ ] Proactive state does not chatter after restart.
- [ ] No duplicate Gateway/Unreal/wake processes accumulate.
- [ ] Full wake/talk/sleep/wake sequence passes after reboot.
- [ ] Visual sensor tests pass after reboot.

Passing this chapter is what turns a development experiment into a desktop presence.