# Electron + Unreal Overlay Flicker Mitigation

## Purpose

This note records a Windows desktop-avatar flicker mitigation validated while integrating a packaged Unreal MetaHuman runtime beneath an Electron shell.

Use it when Electron controls or chrome visibly flash, blink, or alternate with the Unreal window several times per second.

Keep an already-stable overlay stack unchanged unless the same symptom appears.

## Symptom

The avatar render can remain mostly stable while Electron-owned elements flash at roughly 2–3 Hz:

- minimize and close buttons,
- status indicators,
- microphone, screen, camera, or view controls,
- transparent Electron chrome layered over Unreal.

That points first to the window-composition layer rather than to MetaHuman animation, lip sync, or the audio bridge.

## Fragile window pattern

A particularly fragile arrangement is:

1. Electron and Unreal occupy nearly the same rectangle.
2. Both windows are topmost.
3. A helper repeatedly reasserts Unreal then Electron z-order on a short timer.
4. Electron stays transparent across most or all of the Unreal render surface.

The exact root cause can vary between machines, GPU drivers, Chromium/Electron versions, Windows DPI state, and Unreal presentation mode. Treat the repeated z-order churn as a prime suspect, not as a universal diagnosis.

## Validated mitigation

The stable arrangement used three presentation zones:

- **Top Electron band**: drag area, minimize, close, and other window chrome.
- **Middle Unreal viewport**: avatar render only.
- **Bottom Electron band**: Mic, Screen, Camera, Wide View, and later controls.

The Unreal HWND is resized to the middle rectangle instead of occupying the entire Electron window.

This removes control pixels from the continuously rendered Unreal surface and reduces transparent-window overlap.

The periodic 100 ms z-order reassert loop was removed. Stacking is established when the windows are discovered, moved, resized, restored, or otherwise actually need resynchronization.

## Mouse and focus ownership

Keep Unreal visually present but non-owning for desktop input. The working helper uses the same family of protections as the normal overlay stack:

- remove `WS_CAPTION` and `WS_THICKFRAME`,
- add `WS_EX_TRANSPARENT`, `WS_EX_TOOLWINDOW`, and `WS_EX_NOACTIVATE`,
- remove `WS_EX_APPWINDOW`,
- call `EnableWindow(unrealHwnd, false)`,
- clear any cursor clip with `ClipCursor(nullptr)`,
- use `SWP_NOACTIVATE` when synchronizing bounds.

Electron owns actual controls. The middle avatar zone can be click-through while the top and bottom bands temporarily capture pointer input.

Electron's `setIgnoreMouseEvents(..., { forward: true })` is useful here because hover movement can still be observed while clicks pass through the avatar area.

## Geometry sketch

For an Electron window `(x, y, width, height)` with native top and bottom insets:

```text
UnrealX = x
UnrealY = y + topInset
UnrealWidth = width
UnrealHeight = height - topInset - bottomInset
```

Apply the Unreal bounds with `SWP_NOZORDER | SWP_NOACTIVATE`.

Do not assume CSS pixels and Win32 pixels are identical. DPI scaling can change the effective native band sizes, so inspect the real HWND rectangles on the target machine.

## What not to do

- Do not increase a visible z-order fight from 10 Hz to 30 or 60 Hz. Faster flicker is still flicker.
- Do not retune MetaHuman animation to solve chrome that is visibly flashing.
- Do not add arbitrary sleeps unless a measured race requires one.
- Do not move working voice, wake, PCM, or animation plumbing while diagnosing a window-composition defect.

## Validation order

Follow the project's normal evidence discipline:

1. Observe the human-visible symptom first.
2. Confirm Electron and Unreal HWND rectangles.
3. Confirm Unreal is disabled/no-activate and does not trap the cursor.
4. Confirm Electron is above Unreal in z-order.
5. Remove periodic z-order churn and split controls into dedicated bands.
6. Restart the full Electron + Unreal stack. Do not trust renderer hot reload for native-window changes.
7. Re-test dragging, buttons, ordinary desktop mouse use, minimize/restore, wake/voice, and shutdown.
8. Treat the fix as validated only when the human-visible flicker is gone.

## Result observed on the validation machine

Before the mitigation, Electron-owned controls visibly strobed around 2–3 times per second while the Unreal avatar stayed comparatively stable.

After separating the top and bottom Electron bands, constraining Unreal to the middle viewport, and removing the periodic 100 ms z-order reassert loop, the user reported **no visible flicker**.

Wake/sleep voice lifecycle remained functional after the window refactor.

This is a mitigation pattern, not a mandate to alter a working Ethan installation. If Ethan does not exhibit the symptom, leave the validated working stack alone.
