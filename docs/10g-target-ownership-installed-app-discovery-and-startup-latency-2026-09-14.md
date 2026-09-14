# 10g - Target Ownership, Installed-App Discovery, and Greeting Latency: 2026-09-14

**Status: BROWSER TARGET-OWNERSHIP HUMAN-VALIDATED; GENERIC APP DISCOVERY CODE/RESOLVER-VALIDATED; GREETING-LATENCY REORDER IMPLEMENTED WITH HUMAN RETEST PENDING**

This follow-up records four failures that appeared only after local computer control became broad enough to feel conversational:

1. a contextual pronoun such as `close it` could lose the identity of the object it referred to and be converted into `close current`;
2. application launch was constrained by a static app-name list even though Windows already knows what is installed;
3. `again` could accidentally repeat the previous command instead of modifying the concrete command the user had just spoken;
4. synchronous startup bookkeeping could sit in front of a one-word wake greeting and make a healthy voice system feel slow.

The fixes share one principle: **preserve the user's object and intent as data for as long as possible, and keep nonessential work out of the interaction's critical path.**

The post-fix project gate was **31 test files / 243 tests**, clean TypeScript typecheck, clean Python syntax validation for the desktop-control bridge, and a clean Electron/Vite production build.

## 1. Critical failure: contextual `it` became `current`

The dangerous browser bug was not fundamentally a Chrome automation problem. It was an object-ownership problem.

The broken flow looked like this:

```text
User: Open / switch to YouTube.
System records: browser action succeeded.
Parser later hears: Close it.
Context resolver produces: close-tab current
User changes the selected tab before execution.
Bridge faithfully closes the new current tab.
```

Nothing in that sequence requires the bridge to be "wrong." The mistake happened earlier, when the system discarded the identity of the object referred to by `it` and replaced it with a moving pointer called `current`.

That is a concurrency bug in conversational clothing.

### Repair: pronouns inherit object identity

After a verified browser action, the operational context stores the actual browser target label/query. A later contextual pronoun uses that target:

```text
successful target: "YouTube"
"Close it"       -> close-tab "YouTube"
```

It does **not** become `close-tab current`.

Explicit deictic commands remain different:

```text
"Close this tab" -> close-tab current
```

That distinction matters. `this tab` explicitly names the user's present selection. `it` refers back to a previously established object.

### Rule

> A pronoun should resolve to a stable object identity, not to a UI cursor that can move before execution.

This principle applies well beyond browsers. A future `delete it`, `move it`, `mute it`, or `send it` implementation should preserve the verified object identity in the same way.

## 2. Fail closed when browser identity is ambiguous

Once contextual operations target a named browser object, the target matcher must refuse ambiguity instead of taking the first partial match.

The hardened lookup rules are:

```text
exact title:     one match required
partial title:   one match required
site alias:      one candidate required
multiple matches -> fail as ambiguous
no match          -> fail as missing
```

Aliases such as ChatGPT/GPT, YouTube, and GitHub/repository are convenience layers, not permission to guess among multiple matching tabs.

Before a destructive close, the bridge rechecks that the exact target is still selected in the expected Chrome window immediately before sending `Ctrl+W`. Afterward, it verifies that the target disappeared.

The important priority is:

> **A failed close is cheaper than a wrong close.**

Automation code should therefore optimize destructive UI actions for *false negatives*, not for aggressive completion.

## 3. Do not live-test browser safety against valuable state

The target-ownership bug was discovered during live natural-language QA. That exposed a second engineering lesson: validation itself must respect object value.

For browser close/switch testing:

- use disposable tabs whenever possible;
- ensure both the intended target and the currently selected tab are expendable before testing pronoun ownership;
- avoid two disposable tabs with identical titles if the purpose is to validate named identity;
- never interpret a restored browser tab as proof that playback position, form state, or other transient state was preserved.

A safety regression test should not be capable of destroying the very state the user is relying on.

## 4. Static app allowlists do not scale

The first local window-control implementation deliberately used a short known-app list. That was useful while the capability surface was small, but became the wrong abstraction once users naturally expected commands such as:

```text
Open Chrome
Open Claude
Open Photoshop
Open <some other installed application>
```

A fixed parser list creates two bad outcomes:

1. a genuinely installed application is rejected as "not allowed" or "not approved";
2. the conversational model may invent a policy explanation for what is really just a discovery failure.

The reference build therefore removed the static launch allowlist from the natural-language intent layer.

### Generic launch parsing

`open`, `launch`, and `start` can now produce a generic application launch intent when the target looks like an application name rather than a browser page, file, folder, or environmental object.

The parser still avoids obvious semantic collisions such as:

```text
Open the Wikipedia page for X
Open notes.txt in Downloads
Open the door
```

The local bridge, not the parser, decides whether an application can actually be resolved.

## 5. Let Windows be the application registry

Windows already maintains multiple sources of installed-application identity. The bridge now consults the operating system rather than requiring the project to duplicate that database by hand.

The resolution order is intentionally practical:

1. if a matching visible application window already exists, focus/restore it rather than creating a duplicate;
2. resolve known executable aliases or direct executable paths;
3. use normal `PATH` executable resolution;
4. query Windows **App Paths** registry entries for desktop executables;
5. query **Get-StartApps** for registered Start-menu / packaged applications;
6. launch the resolved target without constructing an arbitrary shell command;
7. verify that a matching visible window actually appears.

This supports both traditional Win32 applications and packaged applications whose launch identity is an AppID rather than a simple `.exe` path.

Example resolver validation on the reference machine proved both forms without opening either application:

```text
traditional desktop app -> resolved through App Paths to its executable
packaged desktop app    -> resolved through Get-StartApps to its registered AppID
```

The test used mocked process launch after real Windows discovery, so resolver correctness could be checked without disturbing the user's desktop.

### Security boundary

Removing a static app-name allowlist does **not** mean passing arbitrary user text to `cmd.exe` or PowerShell.

The safe boundary is:

> Resolve a spoken application name through Windows application registration/executable discovery, then launch the resolved identity directly.

Do not turn `open <text>` into unrestricted shell execution.

## 6. Failure: `again` resurrected the wrong command

A subtle routing bug came from treating the token `again` as though it always meant "repeat the previous desktop action."

That made concrete commands dangerous or nonsensical:

```text
previous action: Close YouTube
new request:     Open YouTube again
broken meaning:  repeat Close YouTube
```

The same shape can affect page movement, files, and windows.

The repaired rule is:

```text
"again"
"try again"
"do that again"
"same thing again"
    -> repeat the previous compatible action

"open YouTube again"
"scroll down again"
"maximize Chrome again"
    -> execute the concrete command just spoken
```

In other words, **repeat is an utterance-level intent, not a magic keyword.**

Regression tests now include real phrasing harvested from live QA rather than only synthetic command templates.

## 7. Chained conversational phrasing needs deterministic ownership

Natural voice commands often arrive with discourse glue:

```text
and maximize Chrome
then open Claude
try: open Chrome
okay, now minimize it
```

If deterministic parsers only accept sterile imperative strings, ordinary speech falls through to the conversational model. The model may then accurately describe what should happen while performing no local action at all.

The window parser now strips common conversational prefixes before action classification while preserving the semantic target.

A separate "looks like an unparsed desktop action" catch-net was also widened so likely computer-control utterances do not silently become ordinary conversation just because one phrasing variant missed the main parser.

The catch-net should produce an honest local-control failure/clarification path, not a fabricated capability or policy explanation.

## 8. Failure: bookkeeping blocked the greeting critical path

Voice logs showed that once the wake greeting request reached Realtime, audio generation was already fast. The long perceived delay happened *before* `response.create` was issued.

The startup sequence performed synchronous continuity/session bookkeeping before returning control to the renderer. That included ensuring shared-memory directories/files and writing the fresh desktop-conversation session marker. A Wide View context lookup could also occur before the greeting request.

Those operations are important, but a one-word greeting does not depend on them being complete first.

The startup path was therefore reordered around a latency budget:

```text
critical path:
  create voice session
  establish WebRTC/data channel
  issue short greeting immediately

noncritical setup:
  initialize/write shared-memory session bookkeeping
  refresh view-context details
  complete other continuity housekeeping
```

The continuity work is still performed; it simply no longer stands in front of the first audible response.

### General rule

> If a startup operation is not required to produce the first safe response, keep it off the first-response critical path.

This is especially important for companion interfaces. A two-second invisible filesystem operation feels much larger when it occurs between a wake word and `hello`.

**Current validation state:** the reordered startup path passes automated/type/build gates. Human perceived-latency retest is intentionally still pending, so this document does not label the greeting change human-validated yet.

## 9. Truthfulness is an execution-layer property

Several live failures initially looked like "confidence" problems: the assistant would say it could not perform an action, then succeed after the user insisted it could.

At least some of those cases were deterministic routing/discovery bugs, not personality problems.

The correct repair was therefore not to prompt the model to sound more confident. It was to make capability truth mechanically grounded:

```text
parse locally
-> resolve actual target
-> attempt actual operation
-> verify observable postcondition
-> only then describe success/failure
```

If a likely desktop command misses parsing, the system should not ask the general conversational model to invent whether the capability exists. It should route to an explicit local failure/clarification path.

This keeps "I can't" attached to evidence rather than mood.

## 10. Validation state at end of 2026-09-14

Automated/project gate:

- **31/31 test files passed**;
- **243/243 tests passed**;
- clean TypeScript typecheck;
- clean Python bridge syntax validation;
- clean Electron/Vite production build.

Additional non-destructive resolver validation:

- a traditional desktop browser resolved to its real installed executable through Windows;
- a packaged desktop application resolved to its registered Start-menu AppID;
- launch calls were mocked, so no application was opened during this resolver test.

Human/live status:

- browser contextual target ownership was exercised successfully after the repair;
- generic installed-app launching still needs a final ordinary voice acceptance pass;
- greeting latency still needs a final human timing/perception pass after restart.

Do not silently promote the latter two to HUMAN-VALIDATED until those live checks occur.

## 11. Regression checklist

When changing desktop-control routing later, explicitly test all of these together:

```text
Open an app
Close it

Open/switch to a named browser tab
Select another disposable tab manually
Close it
# must close the named owned target, not the newly current tab

Close this tab
# must intentionally close current

Open YouTube again
# must open/switch to YouTube, not repeat an older close

Scroll down again
# must scroll down

Try again
# may repeat the previous compatible action

And maximize Chrome
Try: open Chrome
Open <installed packaged app>
Open <installed Win32 app>
Open notes.txt in Downloads
Open the Wikipedia page for Henry VIII
Open the door
```

The point is not the exact nouns. The point is to preserve the boundary among:

- application launch;
- window manipulation;
- file opening;
- browser page navigation;
- browser tab ownership;
- contextual pronouns;
- explicit current-object commands;
- true repeat intent.

## 12. Rules worth carrying forward

1. Never replace a stable contextual object with `current` unless the user explicitly referred to the current object.
2. Revalidate destructive UI targets immediately before mutation.
3. Refuse ambiguous browser/window identities rather than guessing.
4. Test destructive automation with disposable state.
5. Ask Windows what applications are installed instead of maintaining an ever-growing parser allowlist.
6. Generic app discovery must not become arbitrary shell execution.
7. Treat `again` as repeat only when the utterance is actually a repeat request.
8. Accept conversational prefixes without surrendering command ownership to the general model.
9. Keep synchronous memory/filesystem/view bookkeeping off the first-response critical path unless it is truly required.
10. Capability confidence should come from verified execution, not from prompting the model to sound confident.
11. Preserve a distinction between code-validated and human-validated behavior in the project ledger.
12. Turn surprising live transcripts into regression tests. They are often better specifications than hand-written command lists.

This chapter extends `docs/10f-window-file-and-rich-browser-control-validated-2026-09-14.md` and should be read with the failure catalog in `docs/13-what-we-tried-and-what-failed.md`.