# Learning reusable procedures without granting new authority

A persistent companion can notice that a development or desktop-repair routine keeps succeeding. The useful next move is **propose a reusable procedure**, not silently convert a transcript into a privileged executable skill.

This chapter is a generic, provider-neutral pattern. It does not require another vector store, memory graph, model provider, remote service, or background agent.

## Evidence before learning

A trusted, explicitly opt-in host supplies a small, privacy-reviewed receipt only after an **independent** postcondition is observed or regression tests pass. Do not accept an LLM's statement that a step succeeded as proof.

A receipt includes:
- a generic procedure identifier (for example `safe-build-review`);
- opaque session and receipt UUIDs;
- 3–9 step codes from a fixed, non-executable vocabulary;
- a verification method (`observed-postcondition` or `passing-tests`);
- an affirmative privacy-review assertion supplied by trusted application code.

A boolean such as `privacyReviewed: true` is **not an authorization system**. Do not expose receipt submission as a model-callable MCP tool. A human or trusted local host must perform the review and verify the outcome independently.

Never ingest entire transcripts, project-specific filesystem paths, private conversations, sensitive window titles, passwords, or untrusted tool output merely to find possible skills. Existing user memory remains authoritative.

## How a suggestion qualifies

The same approved procedure identifier **and exactly the same ordered step codes** must recur with verified receipts from **at least two different sessions**. Repeating a step in the same session does not count.

Matching records produce an inert proposal stored in a quarantine JSON file, outside the companion's normal skill directories. The renderer labels its Markdown `NOT INSTALLED`.

The queue supports inspection and rejection. It deliberately has **no** install, promote, approve-to-execute, or shell-run entry point. A rejected candidate does not automatically reappear after another repeated receipt. That gives humans a chance to say, “No, that's not a skill worth keeping,” without playing whack-a-mole.

## Source and tests

These standalone TypeScript files illustrate the reference design:

- [`examples/review_only_skills.ts`](../examples/review_only_skills.ts) – runtime schema validation, exact-match repetition detection, inert Markdown renderer.
- [`examples/review_only_skill_store.ts`](../examples/review_only_skill_store.ts) – bounded quarantine, serialized state mutations, atomic file replacement, corrupt-store preservation, rejection.
- [`examples/review_only_skills.test.ts`](../examples/review_only_skills.test.ts) – deterministic verification and persistence checks.

With Node.js 24, run:

```shell
node --test examples/review_only_skills.test.ts
```

The examples use built-in Node modules and make no network requests. They do not install software, alter local applications, or hook into the user's conversation. Integrators must select a **private application-data path** for the evidence ledger. One store instance/process must own each file unless an interprocess lock is added.

## Before making this an active companion feature

1. Obtain explicit user opt-in for a limited set of verified, privacy-reviewed work receipts.
2. Implement a trusted local verification producer. **Do not** derive success from an assistant's final message or generic task names.
3. Add a visible review screen with evidence and rejection, initially read-only.
4. Only if separately requested, design a security-reviewed manual skill installation flow with path and symlink protection, permission prompts, provenance, dry-run support, and rollback.

This deliberately borrows the **review-before-reuse** idea seen in [Litopys](https://github.com/litopys-dev/litopys), not Litopys's entire transcript-processing pipeline or any third-party source code.

**Status:** example and unit tests supplied, not end-to-end proven in a running personal companion. The finished reference build does not automatically collect work episodes or generate executable skills.
