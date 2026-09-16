# 10h - Generalized Windows UI Hands Without a Second Agent: 2026-09-16

**Status: HUMAN-VALIDATED END TO END**

This chapter records a major extension to local computer control: adding generalized Windows UI automation without adding a second AI personality, second memory system, or second autonomous agent.

The reference build reused the low-level Windows/UI Automation machinery from **Windows-Use** while deliberately refusing its higher-level agent loop.

The guiding sentence was:

> **Keep the same brain. Give it more capable hands.**

That distinction matters. A desktop companion that already has a long-lived identity, memory, conversation style, and tool-routing architecture should not silently hand difficult computer tasks to a second LLM agent with different instructions and context. The result may be technically competent while feeling like a different person took over the keyboard.

The validated architecture instead keeps one conversational owner and adds Windows-Use only as a bounded local actuator.

Upstream project used for the reference integration:

- https://github.com/Jeomon/Windows-Use
- pinned source commit in the validated prototype: `0c24f9931feb42e293f49c7cc9c4c920d7e2cc37`
- upstream package identified itself as `windows-use 0.8.1` during implementation
- upstream license: MIT

Versions will change. Re-check the upstream project before reproducing this integration.

---

## 1. Why add a generalized UI layer?

The deterministic computer-control stack had become reliable for known capability families:

- browser tabs and page navigation;
- installed-application launch;
- top-level window focus/minimize/maximize/restore/close;
- conservative local file operations;
- contextual pronouns such as `close it` when recent capability ownership is known.

But there is a scaling problem if every application workflow is implemented manually.

Without a generalized UI layer, requests such as these require new bespoke engineering:

```text
Open Settings and click Bluetooth & devices.
Open an unfamiliar application and press its Save button.
Find the search box in this program and type a query.
Scroll this application's main panel.
Open a menu item in software the assistant has never seen before.
```

Building a parser/bridge for every Windows control would eventually reproduce a UI Automation framework badly.

Windows-Use already contains a mature accessibility/UIA layer that can inspect windows and controls and interact with them. Reusing that machinery turns the engineering problem from:

> Teach the assistant every Windows operation.

into:

> Teach the same assistant how to inspect and operate Windows interfaces safely.

---

## 2. Do not import the second brain

Windows-Use includes both:

1. a Windows/UI Automation implementation; and
2. its own LLM-driven `Agent` loop.

The reference build uses the first and rejects the second.

The following Windows-Use components are **not** part of the runtime decision-making path:

- its autonomous `Agent` loop;
- its LLM/provider selection;
- its conversational/system prompt;
- its memory/context compaction;
- its speech integrations;
- its telemetry path;
- its unrestricted shell tool;
- its destructive/general-purpose file tool.

The existing desktop companion still decides what the user meant and what action should happen. The generalized worker only performs a narrowly described local UI operation and returns observable state.

### Architectural invariant

```text
User
  |
  v
Existing Realtime/personality/tool loop
  |
  +--> proven deterministic desktop controls
  |
  +--> generalized UI hands worker when needed
             |
             v
       Windows UI Automation
```

There is no nested conversational agent between the person and the hands worker.

This is a continuation of the repository's oldest architectural rule:

> Do not build another personality for the desktop embodiment.

The same warning now applies to computer-use libraries: do not accidentally create another decision-making person merely because the library ships with one.

---

## 3. Isolate the dependency physically

The reference prototype did not dump Windows-Use and all of its optional/provider dependencies into the desktop application's primary Python runtime.

Instead it created a separate Python environment and a separate worker bridge.

Reference layout:

```text
Desktop application
  scripts/desktop_control_bridge.py
      # existing verified browser/window/file actions

  scripts/windows_use_hands_bridge.py
      # bounded generalized UIA actions

Separate Python environment
  Windows-Use source pinned to a known commit
  only dependencies needed by the imported desktop/UIA layer
```

Benefits:

- dependency conflicts cannot destabilize the existing bridge as easily;
- the generalized layer has a clean kill switch;
- rollback does not require unwinding the primary control bridge;
- upstream source can be pinned independently;
- an experimental UI framework does not gain implicit ownership of established safety paths.

The worker imports the Windows-Use desktop/UIA machinery directly rather than instantiating its autonomous agent.

---

## 4. Deterministic controls remain first-class

Adding generalized hands does **not** mean replacing code that already has stronger postcondition checks.

The routing order in the reference build is intentionally asymmetric:

```text
1. Parse established deterministic intent families.
2. If one matches, use the existing verified bridge.
3. If the request is a broader UI workflow, keep it in the same Realtime tool loop.
4. Let that loop inspect and manipulate the UI through the hands worker.
```

Examples:

```text
"Open Chrome."
    -> deterministic installed-app launcher

"Close the YouTube tab."
    -> deterministic browser target-ownership path

"Open Settings and click Bluetooth & devices."
    -> verified app launch, then generalized UI inspection/click

"Click the Save button."
    -> generalized UI hands, if the target is unique and allowed
```

This prevents a generic UI tool from weakening carefully engineered guarantees.

The generalized layer is a fallback/extension, not a replacement operating system.

---

## 5. Accessibility names are better than blind coordinates

The integration does not expose an unrestricted coordinate-level mouse cannon to the conversational model.

Windows-Use's accessibility tree already provides useful structure such as:

```text
window name
control type
accessible name
bounding box / center
control metadata
```

The hands worker therefore exposes semantic operations around those controls rather than expecting the model to guess pixels.

Typical flow:

```text
inspect current UI
-> receive bounded list of accessible controls
-> identify desired control by name/type/window
-> require a unique match
-> execute bounded action
-> inspect again if the task continues
```

This makes actions more portable across screen resolution and minor layout changes and gives the bridge something meaningful to verify before it acts.

---

## 6. Ambiguity must fail, not guess

The most important safety behavior carried forward from browser target ownership is:

> **Wrong target is worse than failed target.**

During non-destructive validation, the worker inspected the real desktop and found multiple controls whose accessible name was simply `Close`.

A request to target `Close` returned an ambiguity error and clicked nothing.

That is the required behavior.

A generalized UI matcher should use a narrowing sequence such as:

```text
accessible name
+ optional control type
+ optional owning window
```

and require a unique result before mutation.

Do not resolve ambiguity by taking:

- the first result;
- the nearest result;
- the currently focused result;
- the highest fuzzy-match score when two plausible controls remain.

Ask for a better selector or inspect again.

---

## 7. Keep destructive operations out of the generic layer

Windows-Use itself is powerful enough to do far more than this integration permits. The reference build deliberately narrows the surface.

Examples of boundaries enforced in the hands layer:

- no arbitrary shell / PowerShell execution;
- no generalized delete-file capability;
- no silent overwrite path;
- destructive-looking UI labels such as Delete / Uninstall / Reset are blocked from generic clicking;
- destructive browser shortcut `Ctrl+W` is blocked in the generalized worker;
- browser-tab closing remains in the dedicated target-ownership implementation;
- clipboard-paste shortcuts are not part of the generic shortcut set;
- ambiguous controls always fail closed.

The exact blocklist is not the architecture. The architecture is:

> A generalized actuator should have **less authority** than the total authority of the desktop application.

When a destructive action is later needed, implement it as an explicit capability family with stronger identity/postcondition checks instead of quietly expanding the generic worker.

---

## 8. Multi-step work must remain one person's task

The first integration seam uncovered a subtle orchestration problem.

Consider:

```text
Open Settings and click Bluetooth & devices.
```

The safest way to perform the first step is the existing deterministic application launcher. But that launcher historically treated successful launch as the end of its job.

If the runtime simply returned to listening after opening Settings, the user's request would stop halfway through.

The repair was to preserve **task continuation** when the current utterance is recognized as a generalized multi-step UI task:

```text
same user turn begins
-> deterministic launcher opens Settings and verifies it
-> result is returned to the same Realtime response/tool loop
-> the same Ethan inspects the new UI
-> generalized hands locate Bluetooth & devices
-> click occurs
-> task continues or completes
```

This is important conceptually: individual tools may finish, but the **user's task** has not necessarily finished.

Tool completion and task completion are different states.

---

## 9. New user speech invalidates old hand plans

Generalized UI automation can take several inspect/action steps. That creates another concurrency risk: the user may speak again while a task is underway.

The reference architecture associates the hands workflow with the current completed user turn and maintains a bounded step budget.

A new completed user turn changes that task identity.

Subsequent actions from the older plan must therefore be rejected as stale rather than continuing to click after the user has changed instructions.

General rule:

> Every multi-step computer-use plan needs a user-turn generation/token, not merely a timeout.

Timeouts protect against hangs. Generation ownership protects against acting on obsolete intent.

---

## 10. Do not add memory latency to a GUI task

A broad computer-use command should enter the existing tool-capable Realtime loop directly when it clearly represents local UI work.

It should not first perform an unrelated social-memory lookup or external agent consultation merely to discover that it needs to click a button.

The reference routing therefore gives generalized GUI requests a fast lane after deterministic local parsing:

```text
completed user turn
-> deterministic local parser
-> if established command matched: execute it
-> else if broad GUI task recognized: Realtime + local tools immediately
-> ordinary conversation / continuity logic otherwise
```

This keeps "hands" tasks local and responsive while preserving memory/continuity behavior for conversation that actually needs it.

---

## 11. Validation sequence used in the reference build

The integration was deliberately validated in layers.

### A. Import / dependency validation

A separate Python 3.11 environment was created and the Windows-Use desktop/UIA layer was imported without moving the primary desktop-control runtime.

### B. Real read-only desktop inspection

The worker inspected the live Windows accessibility tree without clicking, typing, focusing, closing, or launching anything.

It correctly reported the active browser window and accessible controls including items such as:

- browser tabs;
- address/search bar;
- Back button;
- taskbar application buttons.

### C. Ambiguity refusal

A generic `Close` target produced multiple valid candidates.

Expected result:

```text
ambiguous target
-> refuse action
-> zero clicks
```

Observed result: **passed**.

### D. Destructive-shortcut refusal

`Ctrl+W` was sent to the generalized shortcut validator.

Observed result: **refused as not enabled**.

This leaves tab close in the verified browser-specific implementation.

### E. Regression gate

Before live acceptance, the project passed:

- all pre-existing computer-control regressions;
- new routing tests proving simple launches remain on the deterministic path;
- new routing tests proving broad UI tasks reach the generalized hands path;
- a continuation regression proving a successful dedicated application launch can return control to the same multi-step task;
- TypeScript typecheck;
- Python syntax validation for both control bridges;
- Electron/Vite production build.

A checkpoint copy of one test was briefly discovered by Vitest as a duplicate test suite; the checkpoint filename was changed to `.bak`. That was backup hygiene, not a runtime failure, and is worth remembering: **do not place executable/discoverable test filenames under project backup directories that the test runner scans.**

### F. Human acceptance

The first live end-to-end acceptance request was intentionally non-destructive:

```text
Open Settings and click Bluetooth & devices.
```

The user reported that it **worked perfectly**.

That validates the important seam:

```text
natural user request
-> same conversational person
-> safe dedicated app launch
-> generalized UI inspection
-> semantic control selection
-> real UI click
-> no second agent/personality takeover
```

Status is therefore **HUMAN-VALIDATED** for the generalized-hands architecture itself.

---

## 12. What not to do

Do not "simplify" this design into any of the following:

### Do not instantiate Windows-Use Agent as a hidden sub-agent

That reintroduces a second decision-maker with its own system prompt/context.

### Do not give the model unrestricted screen coordinates

Prefer semantic accessibility targets and unique-match checks.

### Do not route every existing operation through generalized UIA

Keep stronger dedicated implementations where they exist.

### Do not make ambiguity disappear through fuzzy matching

Fuzzy matching may help discover candidates; it must not authorize a destructive or state-changing action when several candidates remain plausible.

### Do not expose unrestricted shell execution merely because the upstream project supports it

Shell execution is a separate security domain and should remain an explicit capability, not an accidental side effect of importing a computer-use library.

### Do not let an old plan survive a new user instruction

Multi-step UI tasks need user-turn ownership.

### Do not treat a tool result as proof that the overall task is complete

A verified `launch` can be step one of a five-step user request.

---

## 13. Recommended implementation contract

A generalized hands bridge should accept a small explicit request vocabulary, for example:

```text
inspect
click
set/type text
scroll
approved shortcut
```

Each mutation request should carry enough selector information to resolve one UI object safely:

```text
name
optional control type
optional owning window
```

Each response should be structured and evidence-based:

```json
{
  "ok": true,
  "action": "click",
  "verified": true,
  "target": {
    "window": "Settings",
    "controlType": "Button",
    "name": "Bluetooth & devices"
  }
}
```

On ambiguity:

```json
{
  "ok": false,
  "error": "UI target is ambiguous"
}
```

Never invent success from the model's intention to click.

---

## 14. Rules worth carrying forward

1. One person owns meaning, memory, personality, and task intent.
2. Computer-use frameworks may contribute actuators without contributing another agent.
3. Keep experimental/generalized UI automation in a separate process/environment when practical.
4. Pin upstream source used by a validated build.
5. Deterministic verified controls outrank generalized automation.
6. Generalized UI targets must resolve uniquely before mutation.
7. Wrong-target prevention is more important than aggressive task completion.
8. Keep destructive actions out of the generic hands layer.
9. Tool completion is not the same as user-task completion.
10. Preserve multi-step continuation across dedicated and generalized tools.
11. Invalidate an old UI plan when a new user turn arrives.
12. Give clear local UI tasks a fast path that does not perform unrelated memory/network work first.
13. Validate read-only inspection before allowing mutation.
14. Validate ambiguity refusal and blocked destructive actions explicitly.
15. Human-test the seam between safe dedicated controls and generalized hands with a harmless multi-step task.
16. Never let a convenience library quietly become a second personality.

This chapter extends:

- `docs/10f-window-file-and-rich-browser-control-validated-2026-09-14.md`
- `docs/10g-target-ownership-installed-app-discovery-and-startup-latency-2026-09-14.md`
- `docs/13-what-we-tried-and-what-failed.md`

The central lesson is simple:

> **Reuse mature automation machinery where it saves engineering time, but keep identity and decision ownership in exactly one place.**
