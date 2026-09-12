# Local Control Examples

These files accompany [`docs/10d-local-browser-control-validated-2026-09-12.md`](../../docs/10d-local-browser-control-validated-2026-09-12.md).

They capture the first narrow local-computer-control tier from the Desktop Ethan reference build.

## Files

- `desktop_control_bridge.py` — Windows bridge for browser, file, and top-level application/window control.
- `browser_intent_routing.ts` — deterministic natural-language routing pattern for common browser commands, plus the open-ended fallback boundary.

## Validation status

### Browser control

**HUMAN-VALIDATED IN NATURAL CONVERSATION**

The reference build was live-tested for:

- repeated new-tab creation;
- repeated tab closing;
- switching among existing tabs;
- opening websites that were not already open;
- returning from ordinary shared-video conversation directly into browser control;
- user barge-in while the assistant was speaking.

The final validation build passed 28 browser-language regression cases and the full 114-test project suite.

### File control

**IMPLEMENTED AND DIRECTLY SMOKE-TESTED; NOT YET EQUIVALENTLY HUMAN-VALIDATED THROUGH VOICE**

Implemented actions:

- find;
- list;
- read bounded text files;
- open;
- copy;
- move;
- rename.

The first tier intentionally has no delete action and refuses overwrite when the destination already exists.

### Application/window control

**IMPLEMENTED AND DIRECTLY SMOKE-TESTED; NOT YET EQUIVALENTLY HUMAN-VALIDATED THROUGH VOICE**

Implemented actions:

- list visible top-level windows;
- launch from a narrow alias/available-path set;
- focus;
- minimize;
- maximize;
- restore;
- close.

A modern Notepad smoke test exposed a useful warning: launching an application does not guarantee a fresh blank instance. Session-restoring applications may reopen previous documents. Report observed state rather than assuming launch semantics.

## Dependencies

The bridge example assumes Windows and uses:

```text
psutil
pywin32
pywinauto
```

The reference Electron wrapper launched Python as a short-lived child process and passed a base64-encoded JSON request. Base64 was used because command-shell quoting of ordinary JSON caused avoidable Windows escaping failures during early smoke tests.

## Safety boundary

The reference first tier deliberately does **not** expose:

- arbitrary shell execution;
- file deletion;
- unrestricted process killing;
- silent overwrite;
- software installation;
- email sending or other external side effects.

Add higher-impact capabilities only after the narrow tier is reliable, and add explicit confirmation where appropriate.

## Design rule

Do not merge browser, file, and window control into one giant free-form computer tool merely because the language model can describe what it wants.

Keep capability families narrow, give common primitives deterministic local routing, verify the observable effect, and let the model handle only the genuinely open-ended part of the request.
