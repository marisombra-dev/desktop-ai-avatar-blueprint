# Bounded self-healing and graceful recovery

A desktop AI with wake detection, realtime voice, screen/audio helpers, a local gateway, and an Unreal avatar is a small distributed system. Individual components will occasionally exit, disconnect, or fail to initialize.

The right goal is not “nothing ever fails.” It is:

> **Recover the smallest failed component quietly, but never restart forever.**

The reference build now uses bounded per-subsystem recovery with rolling attempt budgets, exponential backoff, stable-health confirmation, and explicit escalation only after recovery is exhausted.

## 1. Do not restart the whole application for a leaf failure

A failed helper should not erase healthy state elsewhere.

Examples:

- wake listener exits → restart only wake listener,
- screen-audio transcriber exits while Screen remains authorized → restart only the transcriber,
- overlay synchronizer exits → restart only overlay synchronization,
- Unreal runtime exits → relaunch only the approved avatar runtime,
- Gateway remains unhealthy beyond a grace period → reset only the Gateway client,
- screen observer throws once → discard that observation and keep watching.
## 2. Give every subsystem a bounded recovery budget

Never restart forever.

For each recoverable subsystem, keep a rolling list of recent recovery attempts and a policy such as:

```text
max attempts: 3
rolling window: 5 minutes
base delay: 1.5 seconds
maximum delay: 8 seconds
```

Prune attempts outside the rolling window, then use exponential backoff for the next retry. If the attempt budget is exhausted, stop automatically retrying and escalate the real failure.

This prevents a crashed helper from entering a hot loop that consumes CPU, fills logs, or repeatedly steals hardware resources.

Different subsystems can use different budgets. A tiny wake helper can retry faster than a heavyweight Unreal runtime.

## 3. Distinguish expected exits from crashes

A process exiting is not automatically a failure.
The wake listener intentionally exits after recognizing the wake phrase. Screen audio intentionally stops when Screen turns OFF. Unreal intentionally exits when the application quits.

Mark intentional child-process shutdowns before killing them, for example with a `WeakSet<ChildProcess>` or a generation/token mechanism. Exit handlers should schedule recovery only when the exit was unexpected and the capability is still supposed to be active.

This is especially important for privacy-linked helpers:

```text
Screen ON + transcriber crashes  -> retry transcriber
Screen OFF + transcriber exits   -> do not restart it
```

Recovery must never silently turn a sensor back on after the user turned it off.

## 4. “Spawned” is not the same as “healthy”

Do not erase the failure history immediately after `spawn()` succeeds. A broken process can launch and crash again one second later.

Require a short stable-health period or a positive readiness signal first. The reference pattern uses helper `READY` output plus a stability delay for wake/audio helpers, and a longer survival window for Unreal/overlay processes.

Only then clear the rolling failure history.

## 5. Keep a tiny recovery log

Recovery should be diagnosable without becoming another surveillance archive.
A useful JSONL record needs only:

```json
{"at":"...","subsystem":"wake-word","action":"scheduled","attempt":1,"detail":"unexpected exit"}
```

Log subsystem, action, attempt number, timestamp, and a short technical reason. Do not put conversation transcripts, screen content, program audio, tokens, memory excerpts, or provider secrets into a recovery log.

Useful actions include `scheduled`, `attempt`, `healthy`, and `exhausted`.

## 6. Let built-in reconnect logic have a grace period

Some components already recover themselves. A WebSocket Gateway may automatically reconnect after a short network interruption.

Do not fight that mechanism by resetting the client immediately. Give it a grace period first. If it remains unhealthy beyond that period, use the bounded recovery policy to rebuild only the local client connection.

This avoids turning a two-second network hiccup into a much larger restart.

## 7. Realtime voice has a dangerous half-open state

One subtle failure deserves special attention.

A voice session may be successfully reserved on the local agent/Gateway **before** the browser finishes WebRTC negotiation. If WebRTC setup then fails, local-only cleanup is not enough.
You must also close the server-side voice reservation and release every local resource:

```text
WebRTC setup fails
  -> close reserved voice session
  -> stop microphone tracks
  -> stop screen-audio/camera resources
  -> clear local active-voice ownership
  -> re-arm wake listener
```

Otherwise the UI can look idle while the main process still believes voice owns the microphone, leaving wake detection silent.

A reasonable recovery policy is one automatic retry from a completely clean state. If the second startup attempt also fails, surface the real error rather than looping.

For a mid-session peer/data-channel failure, cleanly tear down the dead session and return to wake-ready state. Do not leave a zombie conversation behind.

## 8. Optional output should fail more quietly than core capability

Not every failure deserves an error badge.

If a proactive greeting or spectator comment fails, ordinary voice may still be perfectly healthy. Treat optional output as best-effort unless its failure reveals a deeper subsystem problem.

Visible error state should mean something actionable: a core subsystem exhausted its recovery budget, or normal voice failed after its bounded retry.

## 9. Escalate truthfully after recovery is exhausted
Once the attempt budget is exhausted:

1. stop the retry loop,
2. keep unaffected subsystems running,
3. record `exhausted` with the subsystem/reason,
4. show the existing error indicator with that real reason.

Do not hide a genuine failure merely to make the UI look healthy. The value of self-healing is that the error badge becomes rarer **and more meaningful**.

## 10. Failure-injection validation

Do not validate recovery only by reading code. Deliberately break expendable components.

A useful sequence is:

1. kill the wake helper and confirm a new process appears automatically;
2. kill the overlay/synchronizer and confirm it returns without restarting the app;
3. kill the Unreal runtime and confirm the exact approved map/launch flags return;
4. confirm the recovery log records scheduled → attempt → healthy;
5. confirm no visible error remains after successful recovery;
6. unit-test repeated failures until the attempt budget becomes exhausted;
7. verify intentional shutdown does not trigger respawn.

Test privacy-linked helpers separately: a crashed screen-audio helper may restart only while Screen is still authorized.

## 11. Privacy and security boundaries
A recovery supervisor is privileged infrastructure. Keep its powers narrow.

- Never alter personality/routing configuration as a “repair.”
- Never enable microphone, camera, or Screen because a helper failed.
- Never replace/delete memory databases automatically.
- Never execute model-authored shell commands as recovery actions.
- Restart only a fixed whitelist of known local components.
- Keep technical recovery logs free of user content and credentials.
- Preserve the exact approved launch command for expensive runtimes such as Unreal.

## Exit criteria

- [ ] Leaf-process crashes restart only the failed component.
- [ ] Intentional process exits never trigger recovery.
- [ ] Every retry policy has a finite rolling attempt budget and backoff.
- [ ] Failure history clears only after a meaningful healthy period.
- [ ] Screen-linked helpers restart only while Screen remains authorized.
- [ ] Realtime setup failure closes the reserved server session and re-arms wake.
- [ ] Optional proactive/spectator output cannot create a false fatal error state.
- [ ] Exhausted recovery stops retrying and surfaces the actual subsystem/reason.
- [ ] Recovery logs contain technical metadata only, not conversation/sensor content.
- [ ] Deliberate failure-injection has been performed on representative leaf processes.

**Reference status:** bounded-policy unit tests, TypeScript, and production build are proven. Live failure injection was performed against the wake listener, overlay synchronizer, and Unreal avatar runtime; all three relaunched with new processes, the approved Unreal map/flags returned, and no error indicator remained after successful recovery. Gateway reset, Screen-audio crash recovery, and Realtime failure cleanup/retry are implemented and build-tested but were not deliberately failure-injected in this validation pass.

See `examples/recovery_policy.ts` for a sanitized policy pattern.
