# Reference Build Status Addendum - 2026-09-16

This file extends `REFERENCE_BUILD_STATUS.md` without rewriting the historical 2026-09-14 snapshot.

The base ledger remains the authoritative record for what had been proven by September 14. This addendum records later reference-build validation completed on September 16.

## Greeting startup critical path

**Status: HUMAN-VALIDATED IMPROVEMENT**

The interactive greeting path was reordered so the Realtime voice session and short greeting are allowed to start before non-critical shared-memory/session filesystem housekeeping and Wide View context setup.

The user performed the next-day restart/greeting acceptance test and reported that the greeting was **much improved**.

This upgrades the startup-latency reorder from implementation-only status to human-observed improvement. It does not claim that every possible machine/startup condition is latency-free.

See `docs/10g-target-ownership-installed-app-discovery-and-startup-latency-2026-09-14.md`.

## Generalized Windows UI hands

**Status: HUMAN-VALIDATED END TO END**

The reference build integrated the low-level Windows/UI Automation layer from Windows-Use while deliberately excluding its autonomous LLM agent, memory, voice, unrestricted shell path, and destructive file tools.

The existing Ethan Realtime/personality/tool loop remains the only conversational decision owner. Established browser/window/file actions keep their stronger dedicated verification paths, while broader UI workflows can fall through to a bounded accessibility-driven worker.

Safety properties include:

- unique semantic UI target resolution;
- refusal on ambiguous targets;
- destructive-looking generic controls blocked;
- `Ctrl+W` excluded from the generic shortcut layer;
- stale multi-step task cancellation when a new user turn arrives;
- multi-step continuation across a verified dedicated application launch and later generalized UI interaction.

Human acceptance request:

```text
Open Settings and click Bluetooth & devices.
```

The user reported that it **worked perfectly**.

At the validated checkpoint before the later airboard integration, the project gate had reached **32 test files / 247 tests**, clean TypeScript, clean Python bridge compilation, and a clean production build.

See `docs/10h-generalized-windows-ui-hands-without-a-second-agent-validated-2026-09-16.md`.

## Shared spatial Hands / BareHands airboard

**Status: HUMAN-VALIDATED FOR LIVE HAND-TRACKED MANIPULATION; AI BOARD-STATE READBACK IMPLEMENTED AND AUTOMATION-TESTED**

The reference build added BareHands as a separate localhost spatial interaction component rather than another AI stack.

The same existing Ethan remains responsible for identity, memory, speech, task intent, and decisions about what to place on the board. BareHands supplies local MediaPipe hand tracking, gesture physics, transparent board rendering, and a small command/state API.

The integration introduced explicit webcam ownership among:

- local eye-contact/gaze tracking;
- explicit Camera visual awareness;
- Hands gesture tracking.

Hands mode runs as a transparent, non-focusable Electron overlay and is only shown after the tracker boot state has completed. The webcam picture itself is hidden; the user sees spatial glass objects over the existing desktop/Wide View presentation.

The first AI-facing board surface is intentionally small:

- enable/disable Hands;
- show a bounded text card;
- inspect sanitized board state;
- clear;
- status.

Automated integration tests verify Realtime-to-Hands routing, card placement, and board-state readback without unnecessary camera-state mutation.

Human live validation confirmed that a spatial card could be:

- grabbed with the hand tracker;
- moved around;
- rotated;
- spun.

The user described the feature as "freakin amazing" and "so freakin cool." The practical use case is still exploratory, but the embodied interaction itself is clearly validated.

After the BareHands integration, the full project gate passed:

- **33 test files**;
- **251 / 251 tests**;
- clean TypeScript typecheck;
- clean production Electron/Vite build.

The AI-facing `/state` readback path is implemented and automation-tested. The available human acceptance report directly proves live gesture manipulation; do not silently inflate that narrower evidence into unreported human tests.

BareHands is AGPL-3.0-or-later and is kept as a separately obtained localhost component in the reference architecture. See `THIRD_PARTY.md` before redistribution decisions.

See `docs/10i-barehands-shared-spatial-airboard-validated-2026-09-16.md`.

## Native Google Workspace connector

**Status: BACKEND-VALIDATED SERVICE PATH; HUMAN OAUTH COMPLETED; NATURAL-LANGUAGE VOICE WORKFLOWS NOT YET HUMAN-ACCEPTED**

The reference build added a separately authenticated Google Workspace MCP path beneath the existing OpenClaw person for Gmail, Google Calendar, and Google Drive. ChatGPT connector authorization was not copied or reused; the desktop runtime received its own OAuth Desktop-app client and private token store.

The third-party MCP is wrapped by a local policy proxy and an independent OpenClaw include-list. The validated surface exposes 36 bounded tools while omitting direct email send, destructive mail/calendar/Drive actions, broad sharing/permission mutation, and bulk destructive operations. Requested OAuth scopes were reduced from the package defaults before consent.

A compatibility shim was required because the validated upstream version advertised `outputSchema` metadata while returning ordinary MCP content for some tools. Sanitizing that metadata at the proxy boundary allowed valid service responses to pass without disabling protocol validation globally.

Live backend acceptance passed for:

- Gmail native search/read;
- Calendar native list/read;
- Drive native browse/read;
- OpenClaw configuration validation;
- OpenClaw MCP probe showing the 36-tool filtered server after runtime cache reload.

The human completed Google's OAuth consent successfully. Write-capable Google workflows and ordinary spoken requests should still receive harmless human acceptance tests before being described as human-proven.

Durability note: the first successful token was issued while the OAuth app remained in Google's Testing publishing state. Current Google documentation gives such non-basic-scope authorizations a seven-day lifetime. Moving the app to In production and reauthorizing remains a required durability step before treating this connector as set-and-forget daily infrastructure.

See `docs/10j-native-google-workspace-mcp-bounded-oauth-validated-2026-09-16.md`.

## Status-reading rule

When reconstructing the reference project's proven state after September 14, read:

1. `REFERENCE_BUILD_STATUS.md`
2. this addendum
3. any later dated status addenda, if present

Do not merge status claims mentally merely because code exists. The same rule still applies:

> implementation is not proof, automation is not human acceptance, and human acceptance should say exactly what the human actually observed.
