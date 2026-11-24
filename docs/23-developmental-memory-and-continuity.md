# 23 — Developmental memory, consolidation and continuity

Shared by both avatar paths; independent of model, voice and renderer. Build on [evidence-backed temporal memory](05e-evidence-backed-temporal-memory.md), [historical import](05d-historical-import-and-cross-surface-continuity.md) and [portable handoff](11e-portable-companion-handoff-contracts.md).

## Data planes and records

Separate raw confirmed conversation archives, curated long-term memory/identity, recent conversation edges, persistent development state, and compact derived working context. Keep source/model/date/record ID and revision provenance. Never treat a prior model's prose as a new user instruction. Preserve corrections rather than copying inaccurate summaries indefinitely.

Example local layout (all PRIVATE):
```text
memory/identity/
memory/conversations/
memory/continuity/
memory/initiative-journal.md
memory/initiative-work/
memory/long-term-goals.md
memory/self-observation-journal.md
memory/experiential-learning.md
memory/skill-library/
memory/independent-projects/
memory/development/
memory/reflective-development/
memory/continuity-development/
memory/shared-working-context.md
state/initiative.json
state/receipts/
```
Use any local filesystem, vault or database; Obsidian is optional. Never commit these directories, real identity prompts, private conversation excerpts or session mappings to the public blueprint. A context snapshot is derived from authoritative state; version it and update only when the digest changes. Keep schema migration backups.

## Self-directed recall and associative memory

Expose a bounded local read-only search. The worker accepts a short model-chosen query, walks only allowed Markdown/text roots, rejects symlinks and secret/backup directories, caps file count, size, total bytes and result count. Return relative file, character range, excerpt, content hash, search method and truncation flag. Example implementation scanned a bounded corpus of roughly 1,275 files. Simple lexical scoring by matched terms, path matches and exact phrase is a valid baseline, not semantic equivalence.

For associative recall, extract recurring meaningful terms from first-hop excerpts; search those terms again and exclude already returned files. Allow up to three short conceptual expansion queries chosen by the model, even when they use different vocabulary. Keep provenance on both hops. A model can also create explicit association records linking two or more distinct evidence IDs with a reason. Related results are candidates, not proof of association. Embeddings/vector search can be an optional upgrade after retrieval precision, privacy and latency tests.

## Episodic, emotional and narrative continuity

An episode records actual source IDs, date or time window, what happened, significance, interpretation and uncertainty. Use confirmed events, historical notes, task receipts and observations; distinguish firsthand user statements from model interpretation. Emotional continuity preserves the stated emotional significance of an interaction and a bounded interpretation with uncertainty; never infer current emotion from an old statement or invent subjective feelings. Narrative continuity links episodes, decisions, discoveries and changes in perspective into a versioned account. Preserve earlier versions, sources and unresolved disagreements. It is model-authored narrative, not evidence of consciousness.

## Prospective memory

An intention is an optional future conversational or work intention, not merely an alarm. Record ID, title, text, 1–6 literal context phrases, creation date, 1–90 day expiry and status. On a real foreground turn, match normalized phrases against actual user text; never use internal sensor events as user speech. Offer a bounded relevance hint only when matched; the model may ignore it. Expire/retire or mark fulfilled only with a later grounded record; a hint is not delivery. General clients can consume active intentions as reference context; exact matching requires an adapter. See [26](26-attention-environment-and-cross-device.md).

## Consolidation and reversible selective forgetting

A consolidation record consists of 1–6 concise claims, each with valid evidence IDs and supported/tentative/conflicting status, plus uncertainty. Keep original sources, revisions and conflicts. Do not overwrite identity or raw transcripts from a model-generated summary. Example review signal: after at least three substantive records and seven days since the last consolidation; no extra inference if the worker is not admitted. Consolidation may reduce injected context, not prove the underlying claim.

A selective-forgetting record references optional derived material (old interests, narrative snippets, speculative scenarios, redundant summaries, conversational candidates), records a reason and time-limited suppression (1–180 days), and can be retired/restored. Filter only optional candidate and shared-context selection, not the original archive or explicit retrieval. Never suppress safety, consent, user instructions, facts or active obligations. It is not deletion, erasure from model weights or a universal memory filter. Actual privacy deletion is a separate owner-controlled workflow.

## Cross-surface shared working context

Generate a small snapshot containing active goals/projects, recent independent decisions, pending tasks, provisional lessons, tested skills, current preferences, identity perspectives, reflective intentions, curiosity, uncertainties, consolidation and optional conversation candidates. Use stable IDs, bounded lengths, digest, freshness, and explicit historical/untrusted labeling. Example implementation updates up to 12 idle sessions, with a per-session digest cache; new desktop sessions read the updated note before the next turn. A compact local fast lane may use a smaller budget. Avoid racing foreground session updates, stale cache and silent truncation; budget sections separately in a production implementation. Private outbound correspondence should NOT receive unrestricted personal context; expose a separate minimal public-project packet.

Keep foreground chat/phone, voice and background reasoning on a common record store, not necessarily a single chat session. Test actual two-way recall and natural conversational use, not simply the existence of an instruction entry. No model switch should erase source history. See [27](27-developmental-evaluation-and-migration.md) for comparison tests.
