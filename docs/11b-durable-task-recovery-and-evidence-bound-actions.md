# Durable task recovery and evidence-bound desktop actions

A companion that can operate a computer needs two different kinds of recovery:

- **Component recovery:** restart a failed wake listener, UI overlay or audio helper with a bounded retry budget. See [11a](11a-bounded-self-healing.md).
- **Task recovery:** remember what a long-running *user-authorized task* was doing when the process, provider session, or computer-control channel disappeared.

The second problem is harder. A button may have been clicked or a message may have been sent **just before the process crashed**. A new model session cannot infer from a missing reply whether that side effect happened. Do not ask the model to guess.

## 1. Keep one small task ledger outside the provider session

Store a privacy-minimal task snapshot in the companion's private application-data folder, independently of the conversation model and the Obsidian memory adapter.

A step has a stable ID, generic description and phase:

| Phase | Meaning after a crash | Recovery rule |
| --- | --- | --- |
| `pending` | Not dispatched according to the ledger | Revalidate target, authority and prerequisites; do not auto-execute |
| `executing` | An action may already have happened | **Outcome unknown**; inspect external state before considering another action |
| `verified` + receipt | Requested postcondition was independently observed | Treat as complete; normally do not redo |
| `blocked` | Safety policy or missing evidence stopped the step | Keep halted until re-evaluated |

A `verified` label without a postcondition receipt does **not** establish success. A provider saying “Done!” is not a receipt.

The companion may produce a deterministic recovery handoff from this ledger. It must not let the model improvise what was previously verified.

## 2. Write *before* and *after* an externally visible action

The safe sequence is:

```text
Observe target and permissions
  -> Bind stable target identity (window, tab, control, document revision)
  -> Check risk policy and acquire any required user confirmation
  -> Persist "executing" BEFORE dispatch
  -> Dispatch one bounded action
  -> Inspect current target and independently verify postcondition
  -> Persist "verified" plus a privacy-safe receipt
  -> Continue to the next step
```

If the companion dies after dispatch but before the final persist, the step is `executing` on restart. **No automatic replay.** Re-observe and determine whether the effect is already present. For financial transfers, sends, deletions or other irreversible actions, an absent local receipt is not authorization to retry.

Reversible, idempotent operations such as “ensure checkbox OFF” can often be rechecked safely. An unverified “click the toggle” cannot. For services supporting idempotency keys, generate and persist the key *before* the request and reuse it only according to that service's documented semantics.

## 3. Prevent filesystem races and silent data loss

Persist snapshots with write-to-temporary-file and rename on the same volume. **Serialize state transitions, not just file writes**: two asynchronous callbacks must not each overwrite the other's stale snapshot.

- Permit only one writer process for a ledger file, or add an explicit interprocess locking strategy.
- Load the existing file on launch; create a new one only if it is genuinely missing.
- A corrupt or unsupported ledger must produce a visible recovery error, **not** be silently reset.
- Keep snapshots small and redact typed values, raw page text, credentials, screenshots, audio and sensitive window titles.
- An atomic rename improves process-interruption safety, but is not a blanket guarantee against power loss, disk failure or an unreliable network filesystem. Use stronger durability controls where required.

A fully local and dependency-free reference, with four failure-focused tests, is in [`examples/durable_task_recovery.ts`](../examples/durable_task_recovery.ts) and [its tests](../examples/durable_task_recovery.test.ts).

Run the example tests with Node.js 24 or a compatible TypeScript test runner:

```shell
node --test examples/durable_task_recovery.test.ts
```

These are **reference patterns**, not a privileged desktop-control service. They never issue a click, keyboard event, network request or model call.

## 4. Every desktop action needs fresh evidence

For a Windows UI Automation controller, prefer:

1. Accessibility element resolution before OCR or general screen-coordinate guessing.
2. Exact window/control fingerprint and visibility/enabled-state checks.
3. Confirmation for meaningful state changes; deny high-risk actions outside the explicitly approved scope.
4. Re-resolution of the bound target **immediately before action**.
5. Independent postcondition checks, not just an API return code.
6. Explicitly unverified outcomes when the target disappears or the result is ambiguous.

If using screenshots or coordinate actions, bind coordinates to an observation ID and invalidate them when the window moves, scrolls, changes scale or refreshes. Treat observed pixels as evidence with a short lifetime, never as permanent authority.

Do not install a general-purpose computer-control MCP server merely because it has more tools. The existing bounded UIA approach described in [the validated Windows hands chapter](10h-generalized-windows-ui-hands-without-a-second-agent-validated-2026-09-16.md) is often the safer architecture. Add a capability only when the current broker has a demonstrated gap.

## 5. Continuity does not mean running arbitrary learned skills

Repeated successful repairs can suggest a useful reusable `SKILL.md`, but detection is not execution. Store suggestions in a review queue. Require a human to approve the instructions, scope, permissions and tests before installing them. Generated skills should never gain unattended shell access or silently ingest personal conversation, tokens or vault content.

The user's existing agent and memory system stay authoritative. Do not bolt on another memory backend unless it demonstrably improves retrieval/reconciliation without creating a competing source of truth.

## 6. Lip-sync research belongs on a separate safety track

The same principle applies to Unreal/MetaHuman experiments. An external audio-to-face model may offer synchronized audio plus ARKit curves, but evaluate it in a disposable project first:

- Verify compatible MetaHuman animation ownership and correct mapping of ARKit channels.
- Compare latency, lip accuracy, facial-expression blending, VRAM usage and GPU contention with the currently working voice path.
- Verify third-party weights, model provenance and **separate model-asset licensing**.
- Treat PyTorch checkpoints as executable-risk artifacts: a repository using `torch.load(..., weights_only=False)` must not load untrusted checkpoint files.
- Keep sidecar listeners bound to loopback, and never forward untrusted model text into Unreal console commands.

Do not replace a working realtime lip-sync system merely because a new model produces more facial curves per frame.

## 7. Fault-injection acceptance checks

Before adopting this pattern in a live companion:

- Crash after persisting `executing` but before marking the action verified. Restart and prove **no action replays**.
- Confirm the existing external effect is detected and that a second click/send is not issued.
- Run 25 overlapping ledger transitions. Reload the JSON and prove every update survived.
- Introduce malformed JSON. Prove the original bytes remain untouched.
- Change the target window/control between inspection and action. Prove the controller refuses to act.
- Revoke computer-control permission during recovery. Prove nothing executes.
- Confirm private transcripts, secrets and sensor samples never reach the ledger or diagnostics.

## External ideas worth studying, not wholesale installing

The following links are design references; these repositories are not bundled here:

- [agent-memory-mcp](https://github.com/ipiton/agent-memory-mcp) — task/session context and memory stewardship ideas.
- [Litopys](https://github.com/litopys-dev/litopys) — proposed reusable skills with review.
- [Computer Use MCP](https://github.com/astraclawteam/agent-computer-use-mcp) — evidence-bound desktop actions and target freshness.
- [Audio2Lipsync](https://github.com/aaryansachdeva/unreal-audio2lipsync) — synchronized MetaHuman facial curves; evaluate checkpoint safety and model licensing separately.

The referenced source repositories displayed MIT licenses during the October 2026 review, but **their dependencies, downloaded weights and hosted services may have different terms**. Check current upstream sources before installing or redistributing anything.

**Status:** The generic example and tests are supplied for adaptation. This chapter does not claim a complete public app or live end-to-end deployment of these new task-ledger patterns.
