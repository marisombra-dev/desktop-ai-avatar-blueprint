# 02d - Interactive Wide View input layering

A transparent desktop-avatar stack can look correct while being completely unable to receive room interaction. The reference build hit this after Wide View gained clickable radio and TV props: both drivers were alive, both actors were found, and the shared interaction router initialized correctly, yet right-clicking either device did nothing.

The failure was not in either device. It was in the native-window input stack.

## The two-gate rule

For a click to reach Unreal in a layered Electron + Unreal desktop presentation, **both native windows must permit the event to travel correctly**:

1. The Electron window above Unreal must not swallow room clicks.
2. The Unreal HWND itself must be enabled and allowed to receive mouse input.

Fixing only one side is insufficient.

The reference shell already used Electron click-through behavior, but its external Windows overlay helper had originally configured the Unreal window for the small portrait use case:

```text
WS_EX_TRANSPARENT
WS_EX_NOACTIVATE
EnableWindow(False)
```

That was appropriate when Unreal was meant to behave only as a visual layer. It made an interactive room impossible.
## Use different input policy for close and Wide states

The successful architecture gives the Unreal HWND two modes.

**Close / portrait state:**

- keep Unreal disabled for mouse interaction;
- retain `WS_EX_TRANSPARENT` and `WS_EX_NOACTIVATE`;
- keep the cursor free;
- let Electron own the small companion controls.

**Wide / room state:**

- call `EnableWindow(hwnd, True)`;
- remove `WS_EX_TRANSPARENT` and `WS_EX_NOACTIVATE` from the Unreal window;
- preserve the layered/tool-window presentation flags needed by the desktop composition;
- keep the cursor unclipped;
- make the transparent Electron room surface click-through by default;
- let only real Electron controls temporarily reclaim pointer input when hovered.

The reference implementation derives the native-window mode from the active presentation size/state rather than globally changing the user's normal click-through preference.

This preserves the safe portrait behavior while allowing the same Unreal runtime to become a real interactive environment in Wide View.
## Diagnose shared failures before rewriting individual props

A useful symptom in the reference build was that **radio and TV broke at the same time**.

Before editing either media driver, runtime logs showed:

```text
WIDE_TV ready targets=1 screen=1
WIDE_INTERACTION ready radio=1 tv=1
```

That proved the actors and drivers existed. A later live test produced no interaction log entries at all. The common path was therefore the better suspect.

General rule:

> When several unrelated room objects stop responding simultaneously, inspect shared input delivery, focus, z-order, and hit routing before changing each object.

Driver-ready logs are not interaction proof. A real validation must exercise the user action and observe the expected device state change.

For the reference build, the acceptance test was deliberately simple: enter Wide View, right-click the radio, right-click the TV, and verify that both actually toggle. Human confirmation closed the bug.
## Keep interaction semantics separate from who triggers them

The user may click a device today while the avatar physically approaches and operates it tomorrow. Do not create two unrelated implementations of `radio on` or `TV off`.

Use one authoritative device action and allow multiple callers:

```text
user right-click
        ┐
avatar idle routine ──> device toggle action ──> media driver
        ┘
```

That lets later autonomous behavior reuse already-proven room interactions instead of bypassing them with a second hidden control path.

## Practical checklist

When a transparent Unreal room should be clickable:

- verify the Electron surface is not consuming the room click;
- verify the Unreal HWND is enabled;
- inspect `WS_EX_TRANSPARENT` and `WS_EX_NOACTIVATE` rather than assuming Electron click-through is enough;
- preserve `-NoMouseCapture` / cursor-release safeguards;
- validate z-order after changing native window flags;
- prove actual device state changes, not just actor discovery;
- if several props fail together, debug the shared path first.

The reusable lesson is simple: **visual transparency and input transparency are separate systems**. A desktop avatar needs an explicit input-ownership policy for every presentation state.