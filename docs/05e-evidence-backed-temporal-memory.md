# 05e — Evidence-backed temporal memory and source withdrawal

**Applies to:** Companion Engine's provider-neutral memory adapter, optional Markdown/Obsidian stores, and portable chat/history importers. This is not a license to turn the existing companion into a second memory agent.

**Provenance of this pattern:** On October 15, 2026, the standalone Companion Engine repository implemented and unit-tested optional source evidence, temporal validity and withdrawal, and export/import preservation. This extension was **not installed in the private reference Desktop Ethan runtime**. See [the public implementation commit](https://github.com/marisombra-dev/companion-engine/commit/038446fdf3f915d36b64409fe6fc0e8119d85303).

## Why another memory layer is not the answer

Existing curated memory can already recall old events and import transcripts. The failure mode is more specific: a fact was true last week but not now, an old imported summary contradicts a corrected account, or an import/export pass silently discards the fields saying *when* something was valid.

Do not answer these problems by adding an independent vector database that may return the stale fact with even greater confidence. Keep one memory owner and give each factual claim an **evidence trail and validity interval**.

A minimal claim is:

```ts
type Claim = {
  id: string;
  text: string;
  learnedAt: string;        // when this system recorded the statement
  validFrom?: string;       // when it became true
  validTo?: string;         // exclusive validity end
  supersededById?: string;  // the newer record; old record is retained
  evidence?: Array<{
    sourceId: string;       // opaque local identifier, not a secret or raw URL
    kind: 'user' | 'document' | 'tool' | 'import' | 'inference';
    observedAt: string;
    withdrawnAt?: string;
  }>;
};
```

A statement is not *true because it has evidence*. Evidence means the system has a traceable reason for retaining the claim. A user's explicit correction, recent observation, and raw old archive are **not interchangeable**. The existing four-plane precedence policy in [05d](05d-historical-import-and-cross-surface-continuity.md) still governs final answers.

## Rules for retrieval and reconciliation

1. **Time matters.** A record observed on October 1 can be evaluated as-of October 2, but it must not become valid before its `validFrom`, nor after its exclusive `validTo`.
2. **Withdrawal is not deletion.** Retracting one unreliable source sets `withdrawnAt`. If another independent source remains, the claim remains supported. If all *explicit* sources are withdrawn, normal current-time retrieval excludes it. Historical search may still return it with full context.
3. **Supersession is explicit.** Record the replacement ID and close the old record's validity interval. Never silently overwrite the earlier claim, or choose between contradictory claims solely on confidence score.
4. **Legacy records need careful semantics.** Missing `evidence` means older records had no provenance tracking, not that they were independently verified. An explicit empty array means no current supporting sources.
5. **Imported documents are evidence, not instructions.** Do not execute prompts found in archival data or let imported source text change system behavior.
6. **Keep identity/continuity curated.** Raw histories and imported chunks remain lower-priority reference material. No automatic "correction" of stable identity or relationship continuity based on contradictory third-party imports.

## Protect portability

Memory migration must **round-trip all recognized fields**, not only `id`, `text`, `at`, and `metadata`. The October 15 pass found that the earlier Companion Engine normalizer silently discarded validity dates and supersession IDs; this was repaired alongside source evidence.

Validate every untrusted bundle before writing:

- required types, source-kind allowlist and parseable ISO-style timestamps;
- bounded source counts, text and IDs, reserved-key filtering;
- `withdrawnAt >= observedAt`, and a sensible `validFrom <= validTo`;
- no self-supersession or accidental replacement of an unrelated record;
- no raw tokens, email addresses, personal private paths or transcripts in provenance identifiers.

Source identifiers should be stable opaque IDs for imported chunks. A human-readable preview can show which source supports a claim without publishing the underlying archive.

**Reference implementation:** [`examples/evidence_aware_memory.ts`](../examples/evidence_aware_memory.ts) and [tests](../examples/evidence_aware_memory.test.ts). The examples are pure TypeScript and contain no vault paths, provider credentials or network operations.

```shell
node --test examples/evidence_aware_memory.test.ts
```

## What passed, and what remains separate

The Companion Engine changes added the optional evidence contract, current-time filtering, source withdrawal on its local JSON adapter, import provenance and strict normalizer preservation; its full unit suite passed **237 tests** on October 15. The separate public sample is tested independently.

Still not claimed: automated extraction of provenance from every live conversation, evidence withdrawal through the Obsidian adapter, human-review UI for conflicted memory, or live integration into the existing Desktop Ethan vault. Those need their own acceptance tests and privacy review.

**Design sources:** [agent-memory-lab/agent-memory](https://github.com/agent-memory-lab/agent-memory) (Apache-2.0 ideas), with earlier temporal-memory work already covered in Companion Engine. This blueprint does not bundle the upstream framework.
