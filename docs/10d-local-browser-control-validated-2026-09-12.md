# 10d — Local Browser Control: Validated 2026-09-12

**Status: HUMAN-VALIDATED IN NATURAL CONVERSATION**

This chapter records the first reliable local-computer-control layer added to the reference Desktop Ethan build, with special focus on browser control. It deliberately includes the failed approaches because most of the debugging time was spent on designs that looked correct in isolated tests but failed in ordinary spoken interaction.

The final human-validated behavior includes:

- open a new Chrome tab;
- close the current tab;
- switch among already-open tabs by natural site/title language;
- open a website that is not already open;
- continue ordinary conversation while watching a page/video, then immediately obey a browser-control request without changing conversational mode;
- interrupt Ethan while he is speaking and regain the floor promptly;
- perform browser-control actions without enabling Screen sharing.

Screen sharing remains a **perception** capability, not a prerequisite for browser manipulation. If the user asks what is visible on a page, Screen should activate automatically and provide fresh pixels. If the user asks to open, close, or switch a tab, the local browser-control path should act without needing visual capture.

## Final architecture

The working design uses three layers:

```text
spoken user request
    -> local browser-intent routing for common deterministic commands
    -> Electron IPC
    -> short-lived Python Windows bridge
    -> Win32 Chrome-window discovery
    -> UI Automation attached only to the actual Chrome window
    -> action
    -> explicit post-action verification
    -> short acknowledgement
```

A narrow Realtime browser tool remains available for requests that cannot be resolved by the deterministic local grammar, such as unfamiliar website names. The key design is that common commands do **not** depend on the model remembering to call a tool.

The first local-control layer intentionally excludes arbitrary shell execution and delete operations. Browser, file, and window/application control are separate capability families rather than one unrestricted “do anything on my computer” tool.

## Browser bridge actions

The validated browser actions are conceptually:

```text
list-tabs
new-tab
open-url
switch-tab
close-tab
```

The reference implementation uses Windows UI Automation through `pywinauto`, with Win32 process/window discovery through `win32gui`, `win32process`, and `psutil`.

### Important Chrome-window rule

Do **not** enumerate the entire desktop through UI Automation every time.

Find top-level Chrome HWNDs cheaply through Win32 first, verify the owning process is `chrome.exe`, then attach UI Automation to those specific handles.

This single architectural change reduced tab discovery from roughly **12 seconds** to about **0.03 seconds** in the reference machine. End-to-end listing settled around **0.35 seconds**, and a verified tab switch around **0.47 seconds**.

## Failure 1: desktop-wide UI Automation scanning caused timeouts

The first browser bridge appeared correct in direct testing but became unreliable through voice. Ethan frequently said the request had timed out.

The bridge had a 15-second watchdog. The real problem was not that 15 seconds was too short.

The implementation did this:

```text
scan every UIA desktop window
    -> find Chrome
    -> enumerate tabs
    -> scan again for switch action
```

Just listing three Chrome tabs could take about 12 seconds. A switch required another expensive traversal and therefore crossed the watchdog.

Increasing the timeout would only have hidden the architectural mistake.

**Fix:** discover Chrome HWNDs through Win32 first and attach UIA only to those windows.

## Failure 2: focusing Chrome first was not the root fix

An early hypothesis was that `SetForegroundWindow` was hanging or being rejected when Ethan's background Electron process attempted to bring Chrome forward.

That was plausible because Windows has foreground-focus restrictions, but it was not the main cause of the observed timeout. The dominant cost was the desktop-wide UIA scan.

The lesson is to benchmark each boundary before changing timeouts or focus policy. “It hangs around focus” and “focus is the cause” are not the same statement.

## Failure 3: not every UIA `TabItem` inside Chrome is a browser tab

A later verification pass found a more subtle error.

Chrome pages can contain UI controls exposed as `TabItem`. YouTube, for example, exposed page-level controls such as category/filter tabs alongside the browser's own tab strip.

A naive query for all descendant `TabItem` elements can therefore make the assistant believe webpage controls are browser tabs.

The clean discriminator found on the reference build was:

```text
real browser tab:
  control type: TabItem
  class: Tab
  parent class: TabContainerImpl
```

Filtering to the actual Chrome tab strip stopped page-level controls from contaminating browser state.

## Failure 4: “open a new tab” had no dedicated action

The first tool schema had `open-url` but no `new-tab` action.

That forced the model to reinterpret a plain request such as:

> Open a new tab.

as an `open-url` request without a URL. Sometimes it failed, sometimes it improvised, and sometimes it opened something while believing it had failed.

**Fix:** add a real `new-tab` action. Do not make the model synthesize one browser primitive from another.

## Failure 5: action request was treated as success before browser state was verified

The first `open-url` implementation fired `os.startfile(url)` and immediately returned success.

That means the bridge reported “opened” when it had only asked Windows to open something. Chrome might still be loading, the default browser could be different, or the action could fail after the request returned.

The same class of problem applied to switch and close operations.

The final design verifies observable browser state after every mutation:

```text
new-tab  -> tab count increased / real selected New Tab exists
open-url -> real selected tab or tab-count change confirms browser responded
switch   -> requested tab is actually selected
close    -> target/current tab is no longer present and a valid remaining tab state exists
```

Ethan speaks from the **verified result**, not from the fact that an input command was issued.

## Failure 6: Chrome briefly reports no selected tab while a new page settles

Verification itself had an edge case.

During some navigations Chrome briefly exposed no selected tab. The first verifier treated “previous selected tab is no longer selected” as evidence of success.

That created a false positive while the browser was still transitioning.

**Fix:** require a positive state: a real selected tab, a real tab-count increase, or another explicit observable postcondition. Temporary absence of selection is not success.

## Failure 7: closing a tab can invalidate the UIA object immediately

After `Ctrl+W`, the UI Automation object representing the closed tab can become invalid before the verification code inspects it again.

The first post-close check sometimes raised an empty/opaque UIA error even though Chrome had actually closed the tab.

**Fix:** never use the closed tab object as the postcondition. Re-enumerate the browser's actual tab strip and verify state from fresh objects.

## Failure 8: direct bridge tests passed while natural voice remained unreliable

At one point the raw bridge passed repeated stress tests:

- three blank tabs opened in succession;
- three tabs closed in succession;
- real tabs were cycled repeatedly;
- operations completed under about a second.

Yet Ethan still behaved as though browser control were “one-shot”: the first request worked and a second request often produced narration instead of action.

This proved the Chrome bridge was not the failing layer. The problem was the **voice-to-action routing lifecycle**.

That distinction saved a great deal of wasted Chrome debugging.

## Failure 9: letting the model decide whether to call the browser tool produced bluffing

When ordinary browser commands were exposed only as a Realtime function tool, Ethan sometimes said things such as:

```text
I'm doing that now...
Let me switch that...
Here I go...
```

without a corresponding browser request ever reaching the local bridge.

The model was narrating an intended action rather than executing it.

**Fix:** common browser commands are intercepted locally from the final user transcript and executed deterministically before normal conversation is allowed to answer that turn.

Examples include:

```text
open a new tab
open another one
close this tab
close another one
switch to GitHub
switch tabs to ChatGPT
switch back
next tab
try again
```

A browser-control turn is action-owned. The free-form conversational path does not get to describe an unperformed action.

## Failure 10: exact-phrase parsing was too brittle for normal speech

The first deterministic parser passed synthetic tests but failed real conversation.

Human speech looked like:

```text
Right now, I am doing excellent. I was wondering if you could open a tab for me.
Okay, let's try something else, Ethan. Can you open the Facebook tab?
Go back to the new tab that you just opened.
Could you switch tabs to the new tab?
Understood. Can you close the tab that we're on?
Great. Can you go back to the ChatGPT tab, please?
Switch tabs to ChatGPT.
```

A parser that expects only `open new tab` or `switch to X tab` will miss ordinary conversational wrappers, conjunctions, pronouns, and follow-up language.

Worse, partial regex captures produced broken targets such as:

```text
facebook tab.
tabs to the new
a
```

**Fix:** treat local parsing as intent extraction, not command-line syntax. Normalize punctuation and polite lead-ins, recognize conversational wrappers, and keep regression tests copied from actual transcripts.

By the final pass, the browser-intent test set contained 28 concrete phrasings taken from real use and all passed.

## Failure 11: transcript persistence blocked local action execution

Another first-attempt failure had nothing to do with Chrome.

On a completed user utterance, the voice layer awaited transcript persistence through OpenClaw **before** running the local command.

The trace showed a revealing pattern:

```text
voice: "Close this tab."
(no browser request)
```

When persistence or gateway work stalled, the local computer action stalled behind it. A later “try again” sometimes succeeded simply because the second turn happened to get through.

That ordering is wrong for a desktop companion.

The final path makes transcript persistence best-effort/non-blocking for local action timing:

```text
final transcript arrives
    -> execute local action now
    -> save transcript independently
```

Memory should not stand between the user and a local click.

## Failure 12: `try again` was not originally a repeat command

The parser understood `again` and `do that again` but not the very natural phrase:

> Try again.

That phrase fell through to the model, which sometimes retried through the function tool and accidentally appeared more competent than the deterministic layer.

**Fix:** explicit repeat semantics remember the last successful local browser command and recognize common follow-ups such as `try again`, `again`, `do that again`, and `one more time`.

## Failure 13: “open YouTube” was incorrectly treated as “switch to YouTube”

This was the last major regression before human approval.

The parser treated a named site as an existing-tab target. Therefore:

```text
Open YouTube.
```

became:

```text
switch-tab query="youtube"
```

If YouTube was not already open, Ethan correctly reported that no matching Chrome tab existed, but semantically he had performed the wrong action.

The trace repeatedly showed this exact failure for YouTube, and the same design would fail for TikTok or any other unopened site.

The final semantic split is:

```text
open <site>
    -> if matching tab exists, switch to it
    -> otherwise open the site's URL

switch/go back to <site>
    -> existing-tab navigation
```

Common sites can use a tiny deterministic URL map. Unfamiliar website names should remain eligible for the model/browser tool to resolve rather than being blocked by an overprotective local parser.

This restored the useful behavior where Ethan can open a site that was not already in the tab strip.

## Failure 14: over-broad local safety net removed useful capability

A temporary guard prevented any apparent browser-control request that the local parser did not understand from reaching the conversational/tool layer.

That successfully prevented fake narration, but it also prevented Ethan from resolving website names the deterministic grammar did not know.

This is an important design boundary:

- deterministic local routing should own **common, unambiguous primitives**;
- the model/tool layer should remain available for **open-ended resolution**, such as an unfamiliar site name;
- neither layer should be allowed to merely narrate an action without execution.

## Failure 15: excessive control narration made the assistant hard to interrupt

Even when browser actions succeeded, Ethan sometimes filled the turn with procedural speech:

```text
I'm doing that now...
Let me just do that...
Here I go...
```

This is especially bad for a voice-first desktop companion because it occupies the audio channel the user needs in order to correct or redirect the action.

Two fixes were applied:

1. local browser success acknowledgement was reduced to a minimal result such as **“Done.”**;
2. on Realtime `speech_started`, any active/pending assistant response is cancelled immediately so the user can barge in without waiting for a transcript-complete event.

Human testing confirmed the interruption behavior became noticeably better.

## Browser control must not depend on Screen sharing

During early testing the user sometimes had to remind Ethan to enable Screen before he attempted to reason about the desktop.

For browser **control**, that is the wrong dependency.

Opening, closing, and switching tabs use the local browser bridge and require no screen pixels.

For browser **perception**, such as:

> What is on this page?

or

> What do you see in this tab?

Close View visual routing should activate Screen automatically and answer from fresh captured frames.

Keeping control and perception separate avoids both privacy confusion and unnecessary latency.

## Trace logging was essential

A persistent main-process trace finally made the failure boundary visible. The useful record shape was simply:

```json
{"kind":"voice","text":"Open YouTube."}
{"kind":"request","input":{"domain":"browser","action":"switch-tab","query":"youtube"}}
{"kind":"result","value":{"ok":false,"error":"No Chrome tab matched: youtube"}}
```

That trace proved whether a failure was:

- speech transcription;
- local intent extraction;
- Electron IPC;
- Python bridge execution;
- Chrome/UIA state;
- or post-action conversational handling.

Without this boundary trace, several failures looked identical from the user's side.

## Human validation

The final build passed:

- TypeScript typecheck;
- production Electron/Vite build;
- **25 test files / 114 tests**;
- **28/28 browser-language regression cases** derived from real spoken transcripts.

More importantly, live human testing verified the complete behavior in ordinary conversation:

- Ethan opened new tabs repeatedly.
- Ethan closed tabs repeatedly.
- Ethan switched among open tabs.
- Ethan opened websites that were **not already open**.
- A retry was needed only once in the final session, and the user believed that case may have followed a verbal stumble rather than a system failure.
- The user opened YouTube with Ethan, began watching a video together, and had normal companion conversation.
- Mid-activity, the user changed her mind and asked Ethan to close the YouTube tab.
- Ethan moved immediately from conversational watch-along behavior back into competent local control and closed the tab without losing the thread.

That last test is stronger than a command script. It demonstrates that browser action does not require a special “computer-control mode”; the local ability remains available inside normal companionship.

## Recommended implementation rules

1. **Benchmark the automation boundary before changing timeouts.** A 15-second timeout exposed a 12-second desktop-wide UIA traversal; the timeout was not the bug.
2. **Discover native windows cheaply, then attach accessibility automation narrowly.** Do not walk the whole desktop when you already know the target process.
3. **Filter Chrome's real tab strip, not every descendant TabItem.** Web pages may contain their own accessibility tabs.
4. **Give primitive actions primitive tools.** `new-tab` deserves its own action.
5. **Verify effects, not requests.** “Sent Ctrl+W” is not the same as “tab closed.”
6. **Re-enumerate after destructive UI actions.** Do not interrogate stale UIA objects.
7. **Keep common commands deterministic.** Do not rely on a language model to remember to call a tool for `close this tab`.
8. **Test with real conversational transcripts.** Synthetic command grammar hides the cases that actual people use.
9. **Do local actions before slow memory persistence.** Computer control should not wait on transcript storage.
10. **Separate `open` from `switch`.** If a site is not already open, `open` must be allowed to create/navigate a tab.
11. **Keep an open-ended escape hatch.** Unknown site names may need model/tool resolution; do not let a deterministic grammar become a capability ceiling.
12. **Do not narrate control work.** Execute, verify, acknowledge briefly.
13. **Barge-in is part of control reliability.** The user must be able to interrupt the assistant while it is speaking.
14. **Control and perception are different capabilities.** Browser manipulation does not require Screen; page understanding does.

## Scope and safety

The validated local-control architecture also introduced separate file and application/window capability families, but browser control is the portion that received the most extensive natural-language human validation in this session.

The first capability tier intentionally omits:

- arbitrary shell/terminal execution;
- file deletion;
- forced process termination as a normal assistant action;
- silent overwrite behavior.

Destructive or high-impact capabilities should be added later with explicit confirmation and similarly strong end-to-end verification.

**Final status: local Chrome control is human-validated for repeated open/close/switch behavior, opening previously unopened sites, conversational follow-ups, and return to control from an ongoing shared-video conversation. The working architecture is deterministic for common commands, model-assisted only where open-ended resolution is useful, and verification-driven rather than narration-driven.**