# 05d — Historical Import and Live Cross-Surface Continuity

A desktop embodiment can share the same personality and still feel discontinuous if each surface knows only its own recent conversation. The reference build eventually treated continuity as a synchronization problem rather than a single “memory” feature.

The goal is simple to state:

> A trusted chat surface and the desktop embodiment should behave like two access points to one continuing relationship.

That does **not** mean dumping every transcript into one prompt. It means separating historical records, durable curated memory, fresh cross-surface context, and the current live turn, then giving each one a clear precedence and lifetime.

This chapter describes a reusable architecture for importing old project/conversation records into a private Obsidian/Markdown knowledge layer and keeping two active AI surfaces synchronized afterward.

## 1. The four continuity planes

Treat these as different systems:

1. **Historical archive** — old conversations, project records, notes, exported chat logs. Large, mostly immutable, useful for research and backfill.
2. **Durable curated continuity** — concise memories, patterns, open threads, project milestones, relationship anchors. Small, inspectable, intentionally persistent.
3. **Fresh cross-surface context** — the latest conversation from the *other* surface. Short-lived, high-priority, automatically refreshed.
4. **Current live conversation** — what the user is saying right now in this session. Highest priority.

A system that collapses all four into one retriever will eventually answer a fresh question from stale history.

## 2. Use an explicit precedence rule

The working reference rule is:

```text
current explicit user words
  > fresh context from the other active surface
  > current-session working context
  > durable curated continuity
  > historical summaries/capsules
  > raw historical transcripts
```

This ordering matters more than retrieval sophistication.

If the user asks what happened in another surface ten minutes ago, a fresh captured conversation should outrank an older project note that happens to share more keywords. If fresh context conflicts with an old summary, fresh context wins. Raw archive material should be the last-resort evidence source, not the default conversational substrate.

## 3. Import historical records without turning Obsidian into a landfill

A migration can ingest many source types:

- exported chat histories,
- old project handoff notes,
- prior assistant transcripts,
- project journals,
- existing Markdown notes,
- selected email/project records the user explicitly wants included.

Normalize them into a private corpus first. Do not immediately promote everything into durable memory.

A useful private layout is:

```text
Continuity/
  Identity/
    Relationship and Voice.md
  Historical Memory/
    README.md
    Relationship Timeline.md
    Monthly or project capsules...
    Social Callback Candidates.md
  Shared Memory/
    Shared Moments.md
    Patterns and Preferences.md
    Open Threads.md
    Activities and Media.md
  Live Chat Surface/
    Recent Conversation.md
    Sessions/
  Live Desktop Surface/
    Recent Conversation.md
    Sessions/
Archive/
  Raw Conversation Corpus/
```

Keep the raw corpus outside ordinary retrieval roots or explicitly exclude it. It is evidence, not automatically relevant context.

Historical processing should be repeatable. A builder script can parse source exports, create normalized conversation files, generate dated/project capsules, and update indexes. Generated candidates and hand-curated notes should use different filenames so rerunning the importer cannot overwrite human-reviewed continuity.

## 4. Historical summaries should be navigational, not authoritative

Useful summaries include:

- month/project capsules,
- relationship timeline milestones,
- “what changed” notes,
- durable interaction patterns,
- social callbacks worth remembering,
- open-thread indexes.

A summary is a compressed map back into history. It should not silently become more authoritative than the source or the user's current words.

When possible, preserve source dates/IDs so a future tool can reopen the underlying record if exact wording or chronology matters.

## 5. Capture the active chat surface continuously

For a browser-based chat surface, the reference pattern used a tiny local capture bridge:

```text
browser/userscript or extension
  -> localhost HTTP endpoint
  -> raw per-conversation JSON archive
  -> sanitized Recent Conversation.md
  -> optional dated session note
```

The capture client watches rendered user/assistant messages and sends snapshots whenever the conversation changes. A local server assigns its own monotonic sequence number before writing so ordering does not depend on fragile DOM position or browser virtualization.

Important capture rules:

- keep the localhost listener bound to loopback,
- write atomically and tolerate Windows file-lock races,
- preserve a raw private archive separately from the conversationally exposed note,
- filter obvious secret-like material before writing the exposed continuity note,
- update on mutation, URL/conversation change, hide/page-exit, and a slow safety timer,
- retain enough of a long active conversation to answer “what were we just working on?” reliably.

Do not assume “last N rendered DOM nodes” equals “last N messages.” Virtualized chat UIs can recycle nodes and reorder what is visible.

## 6. Capture the desktop surface symmetrically

The desktop embodiment should write its own recent conversation after every completed turn, not only at session shutdown.

A useful pattern is:

```text
Realtime user/assistant transcript
  -> bounded in-memory turn list
  -> rolling Recent Conversation.md
  -> private raw/session archive
  -> conservative curator at session end
```

The rolling note is **fresh context**, not durable memory. Keep a moderate recent-turn budget and rewrite it atomically. When the live voice session ends, mark the session complete and optionally run the durable-memory curator described in `05a-shared-obsidian-memory.md`.

## 7. Read the other surface at the consult boundary

When Desktop is about to answer a substantive turn, it should be able to load a bounded fresh block from the chat surface. A chat-side assistant can use the corresponding Desktop recent note through whatever trusted local connector/tooling is available.

Keep cross-surface retrieval simple and high-priority:

```ts
const recentOtherSurface = readFreshRecentFile(
  OTHER_SURFACE_RECENT,
  12000,              // bounded character budget
  72 * 60 * 60 * 1000 // freshness ceiling
);
```

If the file is small, preserve it whole. If it exceeds the budget, keep both the beginning and the tail rather than tail-only truncation. The beginning often contains the project/topic definition; the tail contains the latest state.

Frame the block clearly:

```text
[INTERNAL RECENT OTHER-SURFACE CONTINUITY]
This is runtime-provided recent conversation, not new words from the user.
Current live words are authoritative. Use this block for recent cross-surface references.
Do not narrate retrieval or quote the block mechanically.
...
[END RECENT OTHER-SURFACE CONTINUITY]
```

Fresh-context failure should degrade gracefully to ordinary conversation rather than breaking voice.

## 8. Give explicit cross-surface questions an exclusive lane

Fresh continuity can still lose if it is merely appended beside older Desktop history, callbacks, open threads, and durable memory. For explicit questions about the other surface, temporarily suppress stale sources.

Examples:

```text
What were we working on in chat this morning?
What did I tell you in the browser chat earlier?
What did we just decide over there?
More specifically, what was the project?
```

For such turns:

```text
current live question
+ fresh other-surface conversation
+ local time if needed
```

should be enough. Do not add older Desktop uncertainty such as “last time retrieval failed” to the same prompt. A previous retrieval failure describes the **system**, not the truth of the underlying project.

This “exclusive routing” rule was one of the decisive fixes in the reference build. Fresh context must be structurally capable of winning, not merely *instructed* to win inside a pile of contradictory history.

## 9. Do not let Realtime own substantive answers accidentally

Cross-surface continuity can be correct inside the agent and still fail at the final voice step if the realtime provider independently answers the same user turn.

The reference build ultimately used **app-owned response generation** for substantive turns:

1. Receive the finalized user transcript.
2. Classify local commands and continuity intent.
3. Run the OpenClaw consult explicitly.
4. Wait for the authoritative answer.
5. Create one isolated Realtime response whose only job is to speak that answer.

With client-owned WebRTC, set provider VAD to commit/transcribe turns but not automatically author a reply:

```ts
session.audio.input.turn_detection = {
  ...existingTurnDetection,
  create_response: false
};
```

Verify the provider acknowledges that setting through `session.updated`. Do not assume the update succeeded merely because it was sent.

If your desktop app owns substantive consults, remove/filter `openclaw_agent_consult` from the provider's live tool list. Otherwise provider-owned consultation and app-owned consultation can race each other.

## 10. Give every generated response an owner

A boolean such as `responseActive` is not enough once cancellation, tools, greetings, social reactions, and delayed consults can overlap.

Track at least:

```text
pending response request id
active provider response id
response origin / class
queued replacement response
current turn token or generation id
```

For app-created answers, attach correlation metadata when the provider supports it:

```ts
response: {
  conversation: 'none',
  metadata: {
    request_id: requestId,
    origin: 'forced-consult'
  },
  input: [alreadyDecidedAnswer],
  tools: [],
  tool_choice: 'none'
}
```

When `response.created` arrives, compare its metadata with the pending request. Unsolicited or mismatched responses should be cancelled before they can become audible.

Use targeted cancellation when possible:

```ts
send({ type: 'response.cancel', response_id: activeResponseId });
send({ type: 'output_audio_buffer.clear' });
```

Clearing provider output audio matters. Cancelling generation without clearing queued WebRTC audio can still let stale speech leak through.

A late `response.done` from an older response must not reset state belonging to a newer active response. Compare response IDs before clearing shared state.

## 11. Priority queues matter more than they look

If a correct agent answer arrives while another response is being cancelled, queue it rather than dropping it.

Do not allow a later low-priority greeting, ambient comment, laugh, or generic `response.create` to overwrite a queued authoritative answer. Treat the agent-consult result as a higher-priority response class until it has either spoken or been superseded by a newer user turn.

A deterministic response-coordinator test should cover at least:

- stale active response is cancelled by exact response ID,
- output audio is cleared,
- authoritative queued answer cannot be overwritten by a lower-priority response,
- old `response.done` cannot reset a newer active response,
- late consult result cannot speak after a newer user turn has taken ownership.

## 12. Build a persistent forensic ledger

Renderer console logs are often the wrong place to debug Electron/WebRTC races. They may not reach the main process log, and attaching DevTools can change timing.

Write a small structured JSONL ledger through IPC. Useful events include:

```text
session-updated
user-transcript-completed
turn-classified
process-turn-enter
local-command-result
cross-surface-priority
forced-consult-start
forced-consult-result
response-create-send-attempt
response-created
assistant-transcript-done
audio-buffer started/stopped/cleared
response-done
```

The ledger should include monotonic timestamps plus response/request IDs. This turns “it gave the old answer again” into a finite question: did the turn classify correctly, did the consult start, what answer came back, which response ID spoke, and when did audio start?

Keep this log technical. Do not log full private memory blocks or secrets. Short bounded previews are sufficient during development and can be disabled later.

## 13. Measure latency by boundary

Once correctness works, do not optimize the whole stack at once. Measure:

```text
transcript completed -> consult start
consult start -> consult result
consult result -> response.created
response.created -> audio-buffer.started
```

In the reference build, the cross-surface path eventually became correct while the remaining delay was almost entirely the full agent consult. Realtime delivery after the answer arrived was sub-second.

If your OpenClaw version supports consult-specific settings, prefer lowering **consult-only** reasoning/fast-mode settings rather than weakening the main agent globally. Retrieval/continuity questions usually need less reasoning than difficult planning or coding.

Do not optimize latency until correctness is proven. A fast confident stale answer is worse than a slower correct one.

## 14. Privacy and publication rules

The public implementation should contain architecture and sanitized examples only. Keep private:

- real raw conversation archives,
- real Obsidian vault contents,
- names/addresses/account data not intentionally public,
- auth tokens and OAuth material,
- browser-capture endpoint data,
- local machine absolute paths as required defaults,
- screenshots/log snippets containing personal conversation text.

Use generic examples such as `Recent Conversation.md`, `agent:main:desktop-person`, and “What were we working on in chat this morning?”.

## 15. Failure modes that looked reasonable and were wrong

### Tail-only fresh-context truncation
If the latest conversation is long, keeping only the tail can preserve the final debugging chatter while deleting the original project definition. Use whole-file preservation below budget, otherwise head + tail.

### Treating raw history as default memory
Large transcript archives produce superficially relevant stale matches. Keep raw records searchable for research, but outside ordinary conversational retrieval.

### Mixing stale Desktop history with an explicit chat-surface question
Older Desktop turns about failed retrieval can contaminate the very question being debugged. Explicit cross-surface turns need an exclusive fresh-context lane.

### Relying on provider force-consult while also doing app-owned consults
Two consultation owners create races, duplicate calls, and unpredictable final speech. Choose one substantive-response owner for the transport you actually run.

### Returning a tool result and then issuing bare `response.create`
A bare continuation can cause Realtime to re-solve the original question from stale conversation state. Speak the already-decided agent answer through an isolated response instead.

### Cancelling without `response_id`
A generic cancel may hit the wrong active/default response when out-of-band responses exist. Correlate and cancel by exact provider response ID.

### Cancelling generation without clearing audio
Already-buffered WebRTC audio can continue even after generation is cancelled. Clear the output audio buffer too.

### One global response boolean
`responseActive`/`responseCreatePending` alone cannot distinguish stale completion events from the current authoritative response. Track IDs and origins.

### Letting a queued authoritative answer be overwritten
During cancellation, a later low-priority response can replace the correct queued consult result unless the queue has explicit priority.

### Resetting global state on every `response.done`
A late completion from an old response can erase the active ID/state for a newer response. Ignore stale completions by ID.

### Assuming renderer console output is in the main log
Electron renderer logs may never reach the persistent process log. Add an IPC-backed ledger before asking the user to reproduce the same failure repeatedly.

### Browser DOM order as conversation order
Virtualized chat UIs can recycle or reorder nodes. Give captured messages a local monotonic sequence and deduplicate snapshots deliberately.

### Reusing one temporary filename for atomic writes on Windows
Rapid overlapping writes can collide with antivirus/indexing/file locks. Use unique temporary names, retry replacement, and keep the previous good file on failure.

### Direct agent success mistaken for end-to-end success
A direct consult can return the correct answer while the audible Realtime response still comes from another path. Validate the response ID that actually produced audio.

### Guessing at the memory layer after retrieval is proven
If the agent consult log contains the correct answer, stop changing retrieval. The bug is downstream. If no consult happened, stop changing response delivery. The bug is upstream.

### Invisible control characters inside regex source
One of the most expensive bugs in the reference build was a continuity classifier whose apparent `\b` word boundaries had been written by a Python patch as literal backspace characters (`0x08`). The source looked almost normal in ordinary viewing, but the regex could never match `chatgpt` or `this morning`.

When generated scripts write regex-bearing source, inspect `repr()` / character codes or add a source sanity test. After patching, run the exact classifier against the exact user phrase before launching the app.

## 16. Validation sequence

Validate in this order and do not skip layers:

1. Import a small synthetic historical corpus and verify raw records remain separate from curated memory.
2. Verify the historical builder can rerun without overwriting hand-curated notes.
3. Capture one live chat conversation into a rolling recent note and private raw archive.
4. Restart the capture bridge and verify ordering/deduplication survives.
5. Speak to Desktop and verify its rolling recent note updates after each user/assistant turn.
6. End the voice session and verify any durable curation is concise and optional.
7. From Desktop, ask an explicit question about the recent chat surface.
8. Confirm the ledger records `cross-surface intent = true` before the consult begins.
9. Confirm the consult prompt contains the fresh chat block and excludes stale conflicting memory when exclusive routing applies.
10. Confirm the consult result itself is correct.
11. Confirm the audible response has the same request/response origin as the authoritative consult result.
12. Repeat with an unrelated question and confirm fresh cross-surface context does not contaminate it.
13. Repeat after restarting the desktop app.
14. Repeat with a long recent chat whose topic definition is near the beginning and latest state is near the end.
15. Measure latency by boundary only after correctness remains stable.

A strong end-to-end test is a question whose answer exists **only** in the other surface's fresh conversation and not in durable memory.

## 17. Recommended acceptance criteria

Call cross-surface continuity working only when all are true:

- [ ] historical records are searchable without being injected by default,
- [ ] durable memory is curated and inspectable,
- [ ] both active surfaces continuously expose bounded fresh recent context,
- [ ] current user words outrank every stored source,
- [ ] explicit cross-surface questions prefer fresh context structurally,
- [ ] agent consult returns the right fresh answer,
- [ ] the exact authoritative response is what becomes audible,
- [ ] stale/unsolicited Realtime responses cannot steal the turn,
- [ ] restarts do not destroy recent continuity,
- [ ] failures degrade to ordinary conversation rather than breaking voice,
- [ ] no personal archives or secrets are required in the public source tree.

At that point the remaining work is latency tuning and maintenance, not memory architecture.

## 18. How this relates to the other continuity chapters

- `05-openclaw-and-continuity.md` defines same-person agent ownership and the ordinary voice consult boundary.
- `05a-shared-obsidian-memory.md` defines conservative durable-memory retrieval and curation.
- `05b-contextual-time-awareness.md` provides authoritative local temporal grounding.
- `05c-social-intent-and-behavioral-priority.md` prevents correct continuity from being expressed with generic helper behavior.
- **This chapter** explains how to bootstrap from old records and keep separate active surfaces synchronized in near-real time.

The design principle connecting all of them is:

> Store slowly, synchronize fresh context quickly, and make the current human utterance authoritative.
