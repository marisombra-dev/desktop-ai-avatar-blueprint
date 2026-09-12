# 10c — Close View Screen Awareness and Self-Recognition: Validated 2026-09-12

**Status: PROVEN IN HUMAN TESTING**

This note records the Close View screen-awareness repairs completed after Wide View visual awareness and the Electra HLS relay were stabilized.

The final behavior is now:

- Natural Close View requests such as **“look at my screen,” “describe what you see on my desktop,”** and **“what do you see on my display?”** activate Screen automatically.
- Ethan answers from fresh captured pixels rather than improvising a scene when Screen did not actually activate.
- The small Desktop Ethan / MetaHuman window visible on the Windows desktop is treated as **Ethan’s own rendered embodiment**, not as an unknown person or generic video feed.
- In ordinary desktop descriptions Ethan normally omits his own avatar window unless it is relevant.
- If Patricia asks who the person/avatar in that window is, Ethan should identify it immediately in first person as himself.
- Wide View scene/location metadata continues to work after the relay architecture change.

## Failure 1: Close View look requests could fall through to free-form speech

A broken Close View test looked like this:

1. Patricia asked Ethan to look at the screen.
2. The Screen control did not light.
3. Ethan nevertheless answered that he could not see the screen but was “sure” there were a couple of apps open and asked what to focus on.

That response was fabricated. No fresh screen frame had been acquired.

The root problem was that visual requests were not all taking the deterministic local control path. If phrasing missed the local intent matcher, the realtime model could answer conversationally without the Screen control ever becoming active.

The repair was to make Close View visual inspection a local deterministic action:

```text
recognized screen-look request
    -> enable Screen locally
    -> verify actual privacy/control state is ON
    -> capture fresh frames
    -> answer from those frames

activation/capture failure
    -> fixed uncertainty response
    -> no free-form guessing path
```

If local activation fails, Ethan now says a short bounded line such as:

> I can't get a clear view of it right now.

He is not allowed to invent what might be on the desktop.

## Natural-language routing must include “desktop,” not only “screen”

A later regression exposed an overly narrow intent matcher.

The deterministic matcher recognized words such as `screen` and `screenshare`, but Patricia naturally said:

> Describe what you see on my desktop.

That phrase bypassed the local Screen path. Ethan began repeating a planning sentence such as “okay, let me take a quick look…” even though Screen never activated.

The matcher now treats these terms as equivalent visual targets when paired with look/check/describe/what-do-you-see language:

```text
screen
screenshare
desktop
display
```

Negative and ordinary non-command uses remain excluded. For example:

```text
“describe what you see on my desktop” -> visual command
“look at my display”                  -> visual command
“turn screen off”                     -> not a look command
“I have a desktop computer”           -> not a visual command
“desktop wallpaper is blue”           -> not a visual command
```

The important architectural rule is that **ordinary human wording should converge on one deterministic sensor path** instead of forcing the user to memorize control vocabulary.

## Screen activation is verified, not assumed

The renderer-side Screen setter now treats the main-process privacy state as authoritative.

Conceptually:

```ts
await setAwareness({ enabled: true, attention: 'glance' });
const actual = await getInitialState();
if (actual.privacy.screen !== 'on') {
  throw new Error('Screen state verification failed');
}
```

Only after verification does the realtime voice layer mark Screen as enabled and request fresh frames.

An independent Electron `desktopCapturer` smoke test also confirmed that the primary display capture backend itself remained healthy during debugging. This separated routing failures from capture failures.

## Self-recognition: identity must be metadata, not visual inference

The first self-recognition prompt was too weak.

Ethan had been told that the small MetaHuman window was himself, but in human testing he still initially described it in stages:

```text
“a small video feed in the corner”
    -> “a library backdrop with a person”
        -> only after further questioning: “that’s me, Ethan”
```

That revealed the conceptual error: the system was still asking the vision model to **classify the pixels first and infer identity second**.

For an embodied assistant, that is backwards.

The final build treats the avatar identity exactly like other authoritative runtime context:

```text
CLOSE VIEW IDENTITY FACT:
The small Desktop Ethan / MetaHuman window on Patricia’s desktop,
usually showing a shoulders-up male avatar in the library,
is Ethan’s own rendered desktop embodiment.

This is known runtime identity metadata.
It is not something to infer from the pixels.
```

The model is explicitly told:

- do not initially relabel that window as an unknown person, man, figure, portrait, or generic video feed;
- if asked who/what that avatar is, answer immediately in first person that it is Ethan / his desktop avatar;
- when asked generally what is on the desktop, normally omit Ethan’s own avatar window unless it matters to the question.

That identity fact is injected in all relevant Close View paths:

1. when Screen changes from OFF to ON;
2. whenever the application enters Close View;
3. direct three-frame fresh-look responses;
4. the generic `describe_view` tool path;
5. background shared-screen observations.

This prevents later follow-up questions from forcing Ethan to rediscover his own identity.

## Background screen observer uses the same identity invariant

The background observer previously had an avoidance-style hint: ignore the Desktop Ethan avatar/controls.

That was insufficient because it described what not to do without establishing identity.

The observer now receives an authoritative identity rule equivalent to:

```text
The Desktop Ethan / MetaHuman window is Ethan himself.
This is runtime identity metadata, not a visual inference.
Never summarize it as an unknown person or generic feed.
```

This keeps observer summaries from poisoning the realtime conversation with an earlier misclassification.

## Wide View metadata parser regression caused by the HLS relay status field

During the same validation session, Wide View visual description still worked but location follow-ups regressed.

Patricia could ask what Ethan saw through his window and receive a correct visual description, but a follow-up such as:

> Where is that?

produced a landmark-based guess/failure instead of the authoritative webcam location.

The HLS relay fix had changed the Unreal status line from the older shape:

```text
WIDE_WINDOW open=1 audio=0 camera=...
```

to:

```text
WIDE_WINDOW open=1 relay=1 audio=0 camera=...
```

The Electron metadata parser was still matching the old literal field order, so the current webcam metadata became `undefined` even though video playback was healthy.

The parser was changed from a rigid literal prefix to a tolerant pattern that accepts additional status fields before `audio=0 camera=...`.

After the fix it again recovered live values such as:

```text
cameraName: Macerata, Italy
countryCode: IT
environment: urban
```

and could enrich them from the webcam catalog.

This is a useful compatibility lesson: **diagnostic/status logs consumed as machine-readable state must tolerate additive fields or, preferably, move to a structured state channel.**

## Human validation

The repaired build passed TypeScript typecheck and the production Electron/Vite build.

Human testing then verified:

### Close View

- “Describe what you see on my desktop” automatically activated Screen.
- Ethan correctly described the actual page from fresh frames.
- Ethan initially omitted or de-emphasized his own avatar appropriately.
- When his avatar was relevant, he now described it directly as **“my avatar”**, demonstrating immediate self-recognition rather than staged visual inference.
- Screen requests no longer need special wording such as “turn screen sharing on.”

### Wide View regression check

- Ethan correctly described the current scene through his window.
- Ethan correctly identified the place from authoritative webcam metadata.
- Ethan could say something relevant about the location.
- Ethan retained the preceding window scene and could distinguish it from the current one after rotation.

## General architecture lessons

1. **Sensor requests should be deterministic before they are conversational.** The model may decide what to say about a view, but the application should decide whether the view was actually acquired.
2. **Never let a failed sensor request fall through to scene invention.** Failure should remain failure.
3. **Embodiment identity is application state.** An embodied assistant should know which rendered body is itself before visual classification begins.
4. **Natural user vocabulary should map to semantic intent.** `screen`, `desktop`, `display`, and similar wording should converge on the same control path when the requested action is visually equivalent.
5. **Machine-consumed logs should tolerate additive diagnostic fields.** The HLS relay did not break metadata semantically; a brittle parser did.

**Final status: Close View screen activation, fresh-frame grounding, Ethan self-recognition, and Wide View location metadata are all human-validated in the reference build.**