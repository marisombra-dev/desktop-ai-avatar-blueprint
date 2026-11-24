# 22 — Shared initiative and developmental architecture

**Applies equally to Path A and Path B.** The avatar is a presentation client, not a second brain. This optional extension adds persistent, model-independent opportunities for self-directed work. It works with a local or hosted text agent, or with the reasoning side of a native speech-to-speech system. OpenCode is one reference scheduler/agent adapter, not a requirement.

Read [23 — memory and continuity](23-developmental-memory-and-continuity.md), [24 — learning and reflection](24-learning-reflection-and-skills.md), [25 — projects and laboratory](25-independent-projects-and-laboratory.md), [26 — attention and conversation](26-attention-environment-and-cross-device.md), [27 — evaluation and migration](27-developmental-evaluation-and-migration.md), and [28 — implementation and acceptance](28-development-build-and-acceptance.md).

## Ownership and flow

```text
user-approved identity, permissions, conversation and memory
       |                                 ^
       | bounded reference context       | verified records
       v                                 |
foreground agent <--- shared context --- durable state + private archive
       |                                 ^
       | voice/audio + silent cues        | validated decisions and receipts
       v                                 |
Path A OR Path B              scheduler -> initiative worker -> chosen model
                                         |              |
                                         |              +-- no action is valid
                                         +-- bounded research / lab / project tools
```

The foreground owner always has priority. The worker has no renderer, microphone, arbitrary shell or general computer-control permission. The model proposes structured actions; a trusted deterministic worker validates them and owns all side effects. Do not give autonomous reasoning the foreground agent's entire toolset. No claim of continuous cognition is implied by a running scheduler.

## Start with a minimal implementation

1. Create a private state directory, a versioned JSON state file or transactional database, and an append-only journal or immutable revisions. Use a single writer/lease and atomic writes; use idempotency keys and reconcile partial writes after crashes.
2. Choose an explicitly authorized model route and record model/provider/version on every cycle. Verify catalog, entitlement and actual responding model; fail closed if unavailable. A paid overflow switch must be checked at the provider/account level. No automatic paid fallback.
3. Schedule a cheap deterministic watchdog, not a model call every tick. One reference cadence: five-minute ticks, local quiet hours 23:00–08:00, maximum six model attempts per local day, ordinary minimum interval 90 minutes, event minimum interval 30 minutes, defer when foreground was active within ten minutes or another session is busy. These are configurable example defaults, not universal requirements.
4. Admit at most one initiative cycle at a time. Recheck foreground activity immediately before and during inference; cancel only the worker's own session if needed. Bound inference and tool timeouts. Never interrupt the human's session. On restart reconcile previous active session, pending jobs and receipts.
5. Supply a bounded evidence packet, not the whole archive. Allow action none, reflect, explore, share, propose, research, schedule, complete, defer and the typed record actions in later chapters. Validate JSON, field lengths, enum values, references, permission scope and due-task ownership. Reject unknown or conflicting fields. Malformed output is a failed attempt, not a successful action.
6. Save the decision and actual effects/receipts separately. A decision to research is not research; a draft is not a sent message; a successful tool call is not a physical outcome. Mirror readable records into a private Markdown vault if desired. State is authoritative; a generated note is only a projection.

```text
tick:
  acquire worker lease
  reconcile own interrupted work; collect local/authorized event receipts
  publish changed bounded shared context to eligible idle clients
  if disabled/rest/quiet/budget/cooldown/foreground busy: persist reason; return
  verify approved model and resource availability
  reserve attempt; select eligible due work; build evidence packet
  request one structured decision with no direct tools
  validate; execute only explicitly supported bounded operation
  persist receipt + decision; refresh derived context; release lease
```

Example decision envelope (adapt to your schema):
```json
{"action":"schedule","title":"Explore a question","note":"Why it is worth investigating","kind":"reflect","hours":4}
```

Action-specific fields must be validated, not simply spread into trusted configuration. Set limits for active goals, tasks, records, revisions and artifact size. Retain archived history; never silently delete source material for context savings.

## Goals, queue and event signals

Persistent goal records: stable ID, objective, motivation, priority, optional interests, creation time, review date, status (active/paused/completed/abandoned), history and linked tasks. Example limits: 12 open goals, eight pending tasks, reviews 1–90 days. No obligation to create a goal. A task has ID, kind, title, bounded brief/spec, due time, status, retry count, optional goal/project IDs and artifact receipt. A paused goal/project makes linked tasks ineligible; closing cancels pending tasks, not their historical work. Overdue jobs may take precedence over ordinary priority. Repeated failures back off and eventually stop; do not retry uncertain external effects.

Use durable events for due tasks, goal reviews, completed/failed artifacts, lab revisions, incubation dates, developmental/consolidation reviews and verified inbound messages. Deterministic ID = event type + stable source ID + revision/due timestamp. Retain pending events until successful review, expire stale events, deduplicate seen IDs and revalidate eligibility when status changes. In the reference, correspondence detection polls completed receipts from an existing authorized worker; it is not instant inbox delivery. Use identifiers and minimal metadata, not private message bodies, for wake signals. Treat missing/failed results as unknown. A wake is an invitation to reconsider, not an obligation to act.

## Resource management and rest

Expose actual CPU count, available/total RAM, measured model usage and queue state; do not mistake RAM for free VRAM. Example resource guard: postpone lab, local-review and reusable-tool work when available RAM is below 1.5 GiB. A model may choose a lower daily cap or longer interval within owner-set bounds, never increase cost, change model route or grant tools. Optional rest of 1–72 hours pauses only independent inference; foreground conversation, user-requested work, required maintenance and event retention remain available. Give the owner an immediate opt-out/override. Silence and inaction are legitimate, not failures.

## OpenCode or another scheduler

An adapter needs list/read session, create isolated session, set/read model and bounded context, start/stream/cancel own turn, read completion receipts, and schedule/pause/resume. Prefer native scheduling where available; otherwise use a local OS scheduler. Pin each job to an approved model, verify actual returned model, use explicit timezone, and check the current installed API before implementing. Do not copy private IDs, tokens, machine paths or provider-specific event schemas. A text-only scheduled worker can operate alongside any live speech frontend; both consume the same authoritative records.

See [build and acceptance](28-development-build-and-acceptance.md) for regression and rollout gates. The reference is a blueprint, not a downloadable production service.
