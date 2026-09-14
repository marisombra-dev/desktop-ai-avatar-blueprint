# 10f - Window, File, and Rich Browser Control: Human-Validated 2026-09-14

**Status: HUMAN-VALIDATED ACROSS APPLICATION, FILE, AND PAGE-INTERACTION CAPABILITIES**

This chapter extends the first local-control tier from browser tabs/search into three additional areas:

- top-level Windows application/window control;
- conservative local file control;
- richer interaction with the active browser page.

The central lesson was the same across all three: **a spoken claim is not evidence that an action happened**. Common commands should be owned by deterministic local routing, and completion should be based on observable OS/browser/filesystem state.

The final live validation covered natural speech, not just direct helper calls. The project gate after the last repair was **29 test files / 204 tests**, clean TypeScript typecheck, and a clean Electron/Vite production build.

## Capability boundaries

The reference build keeps three manipulation domains separate:

```text
window/application -> launch, focus, minimize, maximize, restore, close
file               -> find, list, read, open, copy, move, rename
browser page        -> back, forward, scroll, click visible link text
```

Browser tab control and browser search remain separate families from page interaction. This separation prevents phrases such as `go back`, `switch back`, `close it`, and `open X` from silently changing meaning as more capabilities are added.
## Window/application control

The first application tier uses a deliberately narrow alias set for ordinary desktop apps, while the bridge can still match visible top-level windows by title/process for open-ended focus operations.

Live validation included:

```text
Open Calculator
Minimize Calculator
Close Calculator while minimized
Minimize Chrome
Bring Chrome back
```

The final implementation verifies state after each mutation instead of trusting `ShowWindow`, `SetForegroundWindow`, or a launch call. Window records include minimized/maximized/foreground state, and focus is not considered successful until the target is visible, non-minimized, and foreground.

A Windows 11 Calculator-specific failure exposed an important shell-window detail. Modern packaged applications may present a real app process plus an `ApplicationFrameHost.exe` shell frame. The app process is useful for identity; the shell frame may be the correct control surface for focus/minimize/maximize/restore. UI Automation `set_focus()` on the shell frame worked where direct foreground calls against the app HWND did not.

Launching also prefers an already-open matching application rather than blindly creating duplicates. Explicit app-level close can close all matching windows for a known alias and then verifies that no matching window remains.
## Failure: bare “close it” belonged to the wrong domain

The first live application test exposed a semantic ownership bug. After opening Calculator, `close it` was still claimed by the browser-tab parser and could close the current Chrome tab instead of the application.

The repair removed bare pronoun-close language from browser-tab grammar. Pronouns are now resolved by recent successful action family:

```text
last action = window/application -> close that window/app
last action = opened file        -> close its associated window when resolvable
last action = browser            -> close current tab
no reliable owner                -> do not guess
```

This is a general rule: as capabilities multiply, **pronouns need context ownership**, not a growing pile of regexes that all believe they own `it`.

A related failure occurred with `Bring Chrome back`. The phrase was not locally owned, so the conversational model narrated success without issuing a Windows action. Explicit `bring/put <window> back` routing plus foreground verification fixed the problem.

## File control

The reference file tier intentionally remains conservative. It supports find/list/read/open/copy/move/rename, but **no delete and no overwrite**.
Natural file requests can resolve a filename plus a known root such as Downloads/Documents/Desktop without requiring the model to invent an absolute Windows path. An exact file directly inside the named folder wins over duplicates in subfolders; otherwise ambiguous matches are refused rather than guessed.

Transfer operations verify postconditions:

```text
copy   -> destination exists and source still exists
move   -> destination exists and source is gone
rename -> destination exists and source is gone
```

Opening a file required a separate truth rule. `os.startfile()` only proves that Windows accepted the request. The first version incorrectly labeled that as verified. The repaired version waits briefly for a visible application window whose title contains the opened filename. If no such evidence appears, the bridge reports `verified: false` instead of inventing certainty.

A disposable lifecycle test exercised find, list, read, copy, rename, move, refused overwrite, refused delete, and cleanup. Live voice testing then confirmed filename discovery, naming the result, reading it, and opening it through the associated application.

## Rich browser page interaction

The page tier adds:

- Back and Forward;
- vertical scroll up/down;
- click/follow a hyperlink by human-visible text.

The language boundary is deliberate:

```text
go back                 -> page history
switch back             -> previous browser tab
go back to <name> tab   -> named tab
```

Regression tests lock those meanings so future parser changes cannot collapse page navigation and tab navigation back together.
## Failure: Chrome accessibility selection could lie

A critical browser bug appeared while adding page interaction. Calling UI Automation `select()` on a Chrome tab could make the accessibility tree report the tab as selected while the actual visible document and omnibox remained on the previous page.

The repair changed tab activation to a real UI click on the tab element, then verified the result against Chrome's active document/address state. This also matters before `Ctrl+W`: closing a tab after a phantom selection can close the wrong page.

Another race appeared when opening a URL. Chrome could expose a newly selected tab named `Untitled` before the destination document had materialized. The bridge now waits until the omnibox/document reflects the requested host before declaring navigation complete.

## Failure: visible link text was not enough

The first Wikipedia link-click implementation found the requested text correctly but still did nothing. Inspection showed multiple exact `Anne Boleyn` hyperlink elements, all off-screen at the current scroll position. A physical `click_input()` against an off-screen accessibility element could therefore click meaningless coordinates.

The robust path uses the hyperlink's UI Automation **Invoke** action first, with physical click only as a fallback. Completion is then verified by a changed document title or address. This allowed an off-screen named Wikipedia link to navigate correctly without scrolling it into view first.

Link matching stays conservative: exact visible text wins; one unambiguous partial match may be accepted; multiple partial matches are refused.

## Scroll verification must prove direction

A keyboard Page Down/Page Up prototype initially verified only that the reported scroll percentage changed. One test showed Page Up producing a slightly higher percentage, proving that “something moved” was insufficient.

The final route uses the page Document's UI Automation scroll interface and checks direction explicitly:

```text
scroll down -> vertical percentage increases
scroll up   -> vertical percentage decreases
```
## Failure: the model narrated browser work it never performed

Live QA exposed several phrases that fell through deterministic routing and reached ordinary conversation instead:

```text
Open the link that says Anne Boleyn
Bring Chrome back
Open the Wikipedia page for Henry VIII
Search for Catherine of Aragon   (after Wikipedia was already opened)
```

In the broken path, the model could answer as though it had acted even though no local-control call occurred. The repair was not “tell the model to be more careful.” Those common phrases were moved into deterministic local ownership.

Wikipedia routing now recognizes direct page language such as `Open the Wikipedia page for X` / `Go to X's Wikipedia page`. A bare `Search for X` is interpreted as Wikipedia search only when the recent browser context is already Wikipedia; outside that context it remains ordinary language rather than being globally hijacked.

A short alias such as `GPT tab` is resolved to the existing ChatGPT tab by the browser matcher rather than requiring one exact product-name phrase.

## Stale answers are also stale actions

One misheard application command fell through to a slower general-agent consult and returned almost a minute later, after the user had moved on to file testing. Even if the late answer is linguistically valid, it no longer belongs to the current interaction.

The reference build now snapshots the user-turn timestamp before a slower consult and drops the eventual answer or error if a newer user turn has occurred. The same freshness principle is used for delayed browser/window/file tool activity: old intent must not execute after the user has changed tasks.

## Live acceptance

The final human pass confirmed the repaired behaviors in ordinary speech:

- mouse remained free on avatar launch;
- Calculator opened, minimized, and closed correctly, including pronoun close after a known app action;
- Chrome minimized and genuinely returned to the foreground on request;
- file discovery/read/open continued to work;
- YouTube opened and closed without disturbing unrelated tabs;
- browser scrolling worked in both directions;
- direct Wikipedia topic navigation/search worked;
- named Wikipedia links genuinely navigated;
- shorthand switching back to the ChatGPT/GPT tab worked.
## Validation gate

After the final natural-language Wikipedia repair, the reference project passed:

- **29/29 test files**;
- **204/204 automated tests**;
- clean TypeScript typecheck;
- clean Electron/Vite production build;
- direct Windows smoke checks for application restore/focus;
- direct Chrome smoke checks for named-link navigation and tab switching;
- human voice validation across the repaired application/file/browser paths.

The test count matters less than the layered proof. Parser tests prevent semantic collisions, direct bridge tests prove OS/browser mechanics, and live voice tests prove that the transcript actually reaches the intended deterministic owner.

## Implementation rules worth carrying forward

1. Never let a conversational acknowledgement stand in for action evidence.
2. Resolve pronouns from the most recent successful capability family; if ownership is ambiguous, do not guess.
3. Separate tab control, search/navigation, page interaction, window control, and file control even when the language overlaps.
4. Verify window mutations against real foreground/minimized/maximized/closed state.
5. Treat packaged-app shell frames as possible control surfaces while keeping the real app process as identity evidence.
6. For file mutations, verify filesystem postconditions and refuse overwrite by default.
7. `os.startfile()` proves dispatch, not application presentation; report the difference.
8. Prefer real Chrome tab activation plus document/omnibox verification over accessibility-selection flags alone.
9. Do not hand the next action an `Untitled`/half-loaded tab; wait for page identity.
10. Use UIA Invoke for off-screen hyperlinks and verify navigation afterward.
11. Verify scroll direction, not merely movement.
12. Reject stale consult/tool results after a newer user turn.
13. Add transcript-derived regression tests from real failures; synthetic command lists will miss natural phrasing.
14. Validate skill transitions in one conversation. A companion should not become a different system when moving from files to windows to browsing and back.

See `examples/local_control/` for the sanitized bridge and routing patterns.
