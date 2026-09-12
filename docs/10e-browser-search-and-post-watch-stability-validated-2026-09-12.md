# 10e â€” Browser Search and Post-Watch Stability: Validated 2026-09-12

**Status: HUMAN-VALIDATED ACROSS MULTIPLE CAPABILITIES**

This chapter extends the browser-control work in `10d` from tab manipulation into browser search, question-driven navigation, shared-watch handoff, and recovery from the failure modes that only appeared after several skills were chained together.

The important lesson is that a desktop companion is not finished when each capability works alone. The real test is whether the assistant can move among conversation, watching, browser control, search, page perception, and camera perception without carrying stale state from one mode into the next.

## Added browser-search capability

The reference build now distinguishes these intents:

```text
open <site>        -> switch if already open, otherwise navigate there
switch/go to <tab> -> navigate among existing tabs
search/find/look up -> construct and open a search destination
question + browse  -> navigate, inspect, then answer
```

Supported deterministic search families include:

- Weather.com location lookup;
- YouTube search;
- Wikipedia search;
- GitHub search;
- general web/Google search.

Ordinary factual conversation is intentionally not converted into browser activity. `Who was Catherine de' Medici?` remains conversation. `Look up Catherine de' Medici` is a browser request.

## Weather routing

A naive Weather.com city URL is not reliable because Weather.com's human-readable location paths include internal location identifiers.

The stable reference path resolves a named place to latitude/longitude, then opens Weather.com's coordinate form:

```text
weather question
    -> geocode named place
    -> latitude,longitude
    -> https://weather.com/.../l/<lat>,<lon>
    -> enable one-shot Screen glance
    -> inspect fresh page pixels
    -> answer the actual weather question
```

This was live-proven with London and Tokyo.

Weather is intentionally different from an ordinary search. If Patricia asks a question such as `What's the weather in London right now?`, opening the page is only the intermediate action. Ethan must inspect the page and answer.

By contrast, `Open the London weather page` may stop after navigation.

## Search navigation should normally be silent

An early version created a spoken `Done.` response after every search navigation. That looked harmless, but it created another Realtime response that could collide with the user's next utterance.

For search-only actions, the final rule is:

```text
act -> verify -> return to listening
```

No extra success narration is required when the browser visibly moved.

## Failure: successful Wikipedia search followed by total silence

The first live search run looked excellent at first: weather worked, YouTube search worked, and Wikipedia navigation succeeded. Immediately afterward Ethan stopped acknowledging speech entirely.

The browser trace showed the Wikipedia action itself succeeded. The decisive evidence came from the voice/social logs: roughly twelve seconds later the live voice session shut down cleanly while Electron, Unreal, and the avatar remained alive.

This was not a Chrome failure. It was a Realtime lifecycle failure.

A late-cancel microphone-liveness watchdog, originally added for a different cancellation race, could conclude that the provider had stopped receiving microphone speech. Its recovery behavior tore down the voice session, leaving a visually healthy but deaf companion.

**Lesson:** recovery code is part of user experience. Detecting a stale voice transport is useful; silently ending the conversation is not.

## Failure: Ethan said an action failed after visibly doing it

A later run showed a stranger symptom: Chrome visibly completed the requested action while Ethan simultaneously said he had been unable to do it.

The trace contained results such as:

```text
Desktop control returned no result.
```

even though the requested navigation had occurred.

The bridge verdict channel was hardened so JSON output is flushed reliably and ambiguous infrastructure failures are distinguished from verified browser failures. A 40-run result-channel stress test produced zero blank results and zero malformed results after the repair.

The conversational rule was also tightened: an ambiguous missing verdict must not become a confident spoken failure that contradicts visible reality.

## Failure: browser control died after closing a watched YouTube tab

The next regression only appeared after a longer natural interaction:

```text
open YouTube
watch and chat normally
close YouTube
attempt another browser action
```

YouTube opened correctly, shared watching worked, and the requested close succeeded. After that, browser control appeared dead.

The trace exposed two coupled state problems:

1. sustained Watch mode remained active after the media tab was gone;
2. about 55 seconds after the legitimate close, a second `close-tab` tool action appeared without a matching user voice transcript and closed another tab.

That second action was stale/unsolicited tool activity, not a parser misunderstanding.

The repair therefore treated this as a state-transition problem rather than adding retries.

## Final post-watch rules

The stabilized build applies these rules:

- closing the media tab ends the sustained shared-watch state;
- verified browser mutations do not create unnecessary spoken success responses;
- search-only success returns directly to listening;
- browser tool calls that are stale relative to the latest user turn are rejected;
- an ambiguous bridge result is not narrated as a definite failure;
- a genuinely stale Realtime transport gets one bounded automatic reconnect attempt instead of silently leaving Ethan deaf.

The local deterministic command path still owns ordinary tab actions. The Realtime browser tool remains an escape hatch for open-ended navigation/search resolution, but it is no longer allowed to execute old browser intent long after the user has moved on.

## Final cross-capability human validation

The final live run deliberately crossed several previously fragile boundaries in one uninterrupted session:

1. Ethan opened YouTube.
2. Patricia chose a video about teaching cats to communicate with buttons.
3. They watched together and Ethan reacted conversationally, calling it adorable.
4. Patricia asked him to close the YouTube tab; he did.
5. She asked him to go to the Henry VIII Wikipedia page; he navigated there correctly.
6. She asked him to close that page; he did.
7. He returned to the GitHub page correctly.
8. Patricia then asked him to look at her.
9. Ethan enabled Camera awareness and correctly answered the fresh visual question she asked.

The user described the run as flawless.

This is stronger validation than independent feature tests because the same live conversation moved through browser opening, shared watching, conversational reaction, browser close, Wikipedia navigation, another close, existing-tab switching, Camera activation, and fresh visual reasoning without losing control state or voice continuity.

## Validation gate

After the final repairs the local project passed:

- TypeScript typecheck;
- 25 test files;
- **128/128 tests**;
- production Electron/Vite build;
- 42 browser-language regression cases inside the full suite;
- 40 consecutive bridge-result stress runs with zero blank/bad verdicts.

The final acceptance criterion, however, was the human cross-capability session above.

## Implementation rules worth carrying forward

1. Search navigation and tab manipulation are different intents; keep them separate.
2. A question-driven search needs an answer stage; navigation alone is not completion.
3. Do not synthesize unstable third-party location URLs when a coordinate route is available.
4. Search-only success usually needs no spoken acknowledgement.
5. Treat the browser bridge result as a verdict channel and test that channel independently.
6. Do not convert an ambiguous transport/result failure into a confident spoken failure.
7. End shared-watch state when the watched media context is explicitly closed.
8. Reject stale tool calls whose originating user turn is no longer current.
9. Realtime recovery must restore the conversation, not merely detect that it broke.
10. Validate capability transitions in one natural session, not only each tool in isolation.

## Relationship to 10d

Read `docs/10d-local-browser-control-validated-2026-09-12.md` first for the Chrome/UIA architecture, deterministic command routing, verification strategy, and the first fifteen failure modes.

This chapter begins where that one ends: once browser primitives are reliable, the next reliability frontier is **state ownership across skills**.

