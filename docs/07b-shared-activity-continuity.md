# 07b — Shared Activity Continuity

A watch-along or game session feels dramatically more companion-like when the AI remembers where the shared activity left off.

The reference build adds a small continuity layer on top of screen observation, program-audio context, and the shared Markdown/Obsidian memory system.

The core rule is:

> **Keep enough evidence to resume the activity, not enough to recreate a transcript.**

This design is useful for television, streamed video, games, long-form videos, and other shared activities where chronology and unresolved context matter.

## 1. Do not add another permanent transcript

The live screen/audio stack already produces many updates. Persisting all of them would create a noisy surveillance archive and make retrieval worse.

Instead, keep a bounded in-memory activity snapshot while Screen is ON:

```text
activity start time
sparse visual checkpoints
meaningful events
widely spaced program-audio samples
activity end time
```

The snapshot exists only to support later curation.
## 2. Record sparse checkpoints, not every observation

The screen watcher already knows when it has a fresh summary and whether something notable happened. Reuse that signal.

A practical recorder can keep:

- one checkpoint every few minutes,
- any observation with a meaningful event,
- any unusually salient observation,
- the final meaningful state near Screen OFF.

Cap the list. The reference pattern keeps only a few dozen checkpoints and preserves the first/last context while trimming the middle if necessary.

For program audio, sample much less frequently. A few short excerpts spaced several minutes apart are enough to help identify a show, game state, character, clue, or current topic.

Do not store raw PCM or a continuous speech transcript merely because the live system had access to them.

## 3. Require a substantial activity before curation

Most screen sessions should leave no durable memory.

A short random video, a quick menu visit, or a few minutes of browsing should normally disappear.

The reference gate considers factors such as:

- session duration,
- activity mode,
- number of useful checkpoints,- presence of meaningful events,
- whether the dominant mode is video/game rather than ordinary desktop work.

The exact thresholds are taste parameters. The important product rule is that **ordinary screen use should not constantly create memories**.

## 4. Reuse the existing memory curator

Do not spend a second model call just to summarize Screen OFF.

A cheaper architecture is:

```text
Screen OFF
  ↓
qualifying activity snapshot queued locally
  ↓
normal voice session eventually ends
  ↓
existing shared-memory curator receives conversation + activity evidence
  ↓
0–3 distilled durable memories
```

This makes activity continuity part of the same salience system that already decides whether jokes, corrections, preferences, or open threads deserve memory.

For substantial media/game sessions, instruct the curator to prefer one compact `activity` memory that makes the next session resumable.

The curator should preserve only supported details such as:

- show/game/activity identity when confidently known,
- where the session stopped,
- important clues/events/decisions,- shared theories or interpretations,
- unresolved threads that matter next time.

Do not invent names, episode numbers, or plot details the evidence does not support.

## 5. Preserve chronology when chronology matters

Some activities are mostly about state. Others depend heavily on sequence.

A mystery program may require remembering that clue B appeared before alibi C. A game may require remembering that a boss was defeated before a new gate opened.

Keep checkpoint timestamps or relative offsets in the in-memory snapshot. The curator can then preserve chronology selectively without copying the entire timeline.

A good durable note might say:

```markdown
## 2026-09-05 — Mystery episode continuity
- **Memory:** We stopped after the phone-record reveal. The witness timeline still appeared inconsistent with the earlier travel-time evidence, and that contradiction remained unresolved.
- **Why it matters:** Resume from this theory next time rather than treating the episode as new.
```

That is enough to restore shared context without storing the show.

## 6. Fail safely when curation is unavailable

Activity continuity should survive model quota failures.

If a substantial activity clearly qualified for continuity but the curator call fails, write a conservative deterministic fallback containing only:

- dominant mode,
- approximate duration,
- last meaningful summary/event,- and a note that richer interpretation was unavailable.

The fallback should never guess the activity title or invent a theory. Its purpose is to preserve the stopping point, not to impersonate the curator.

If the curator succeeds but returns no activity memory for a session that passed the substantial-activity gate, the reference pattern still preserves the conservative fallback. A qualifying shared evening should not disappear merely because the curator chose minimalism.

## 7. Retrieve only activity memory when resuming

Do not search the entire relationship vault every time a video appears.

Use a focused retriever over only:

```text
Shared Memory/Activities and Media.md
Shared Memory/Open Threads.md
```

Require real lexical/content overlap with the current screen/audio summary before returning a prior note. Being in the right folder is not enough.

This prevents an unrelated old watch-along from being injected into a new program simply because both are television.

Refresh the match occasionally as the current activity becomes clearer. Program dialogue can provide useful identifying terms after the first visual frame.

## 8. Feed matched continuity into both perception and conversation

Once a prior activity note clearly matches, supply it to two places:

1. the screen observer, so it can interpret new evidence against the previous stopping point;
2. the normal agent consult, so vague conversational references can resolve naturally.

Frame it explicitly as historical context:
```text
[INTERNAL PRIOR SHARED-ACTIVITY CONTINUITY]
Use only if it clearly matches the activity currently on screen.
Do not assume unresolved details have already been resolved.
...bounded prior note...
[END PRIOR SHARED-ACTIVITY CONTINUITY]
```

This lets a user say something like “I still don’t believe his alibi” without having to restate the entire previous episode.

## 9. Prefer explicit user identification and silent resume

If the user naturally says something like `we're watching X` or `we're playing Y`, treat that as high-value activity-identification evidence. It is often more reliable and cheaper than trying to infer a title from arbitrary pixels.

Use that utterance to immediately run the focused activity-memory search, even if the first screen-observer cycle has not finished yet. The utterance can also act as a temporary activity identity hint for the current Screen session so later visual/audio summaries do not have to rediscover the activity name.

Clear the hint when Screen turns OFF or when the activity mode clearly changes.

Once a matching prior note is found, load it as **silent background context**. The assistant should not announce `I remember this`, recite the prior recap unprompted, or mention the memory system merely to prove continuity. The point is to resolve references naturally and surface prior theories/stopping points only when relevant or asked.

This is the difference between possessing memory and constantly performing memory.

## 10. Privacy and storage boundaries

A good activity-continuity layer stores substantially less than the live system observed.

Recommended boundaries:

- no raw screen frames in durable memory,
- no raw program audio,
- no continuous transcript,
- bounded sparse checkpoints only while the activity is active,
- distilled Markdown after curation,
- focused retrieval only when a later activity appears to match,
- secret-like text rejected before any durable write.

If Screen is OFF, no new activity evidence should be collected.

## 11. Validation sequence

1. Verify a short random video does not qualify for durable activity memory.
2. Verify a substantial video/game session does qualify.
3. Verify ordinary desktop work does not get misclassified as media continuity.
4. Force curator failure and confirm a conservative fallback preserves the stopping point.
5. Store a known activity memory, then present matching screen/audio terms and confirm focused retrieval returns it.6. Confirm unrelated activity memories are not returned merely because they share the same category.
7. Resume the same show/game later and verify the observer and normal conversation both receive the matched prior context.

## Exit criteria

- [ ] Short/random Screen sessions normally leave no durable activity memory.
- [ ] Substantial video/game sessions retain sparse chronology and a stopping point.
- [ ] No raw screen frames, raw audio, or continuous program transcript are persisted.
- [ ] Activity curation reuses the existing memory-curator call rather than adding a second model call.
- [ ] Curator failure still preserves a conservative stopping-point fallback.
- [ ] Focused retrieval requires actual overlap and cannot pull unrelated media memories merely by folder/category.
- [ ] Matched prior continuity reaches both the screen observer and normal agent consult.
- [ ] A natural user identification such as `we're watching X` can prime focused retrieval immediately.
- [ ] Matched history is loaded quietly rather than announced merely to prove memory.
- [ ] Activity identity hints clear on Screen OFF or clear activity change.
- [ ] Screen OFF ends evidence collection.

**Reference status:** sparse activity capture, qualification rules, deterministic fallback, focused activity retrieval, explicit user-identification priming, quiet resume context, TypeScript, 19 automated tests, production build, and clean runtime restart were verified. A naturally model-authored rich recap after a long real-world session still requires post-quota live validation.

See `examples/activity_continuity.ts` for a sanitized implementation pattern.