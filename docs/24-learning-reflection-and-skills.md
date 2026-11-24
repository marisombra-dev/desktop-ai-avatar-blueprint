# 24 — Reflection, experiential learning, skills and evolving perspectives

Both renderer paths use the same optional structured record actions. Keep model-authored interpretations in versioned private data, not system prompts or executable authority. The trusted worker validates changes and receipts. No model weights are changed by these mechanisms.

| Capability | Required record and lifecycle |
|---|---|
| Metacognition/self-observation | Select bounded historical passages and prior recorded decisions; reflection with source IDs, claims, uncertainty and optional proposal. Later review revisits the original evidence when hashes still match; compare the prior interpretation with new records. |
| Experiential learning | Hypothesis, prediction, disconfirming condition and scope; later evidence-linked evaluation (support/contradict/inconclusive). A provisional principle requires independent origins and at least one actual task receipt; contradiction demotes it; retire without erasing history. |
| Self-created skills | Need, scope, method, success check; experimental version, evidence-linked evaluation, tested-provisional or needs-revision; substantial revision resets validation. Retire obsolete versions. |
| Preferences | Model-authored provisional taste, reason, optional evidence, earlier version history; revise/retire. Never claim human-like sensation or assign a fixed personality. |
| Identity evolution | Evidence-linked account of changing perspectives, interests and working values; revision history. Do not automatically rewrite the core identity or authorization instructions. |
| Counterfactual reasoning | Cite actual event/decision; alternative approach, hypothetical consequence and uncertainty. Preserve the original result. |
| Salience and attention | Cite experience, importance 1–5 and reason. Present top candidates as optional priorities. Never override required owner tasks. |
| Deliberation | At least two competing cases and objections, decision criterion, evidence and uncertainty; concise authored analysis, not hidden internal reasoning. |
| Uncertainty | Unknown/tentative/supported/contradicted, known evidence and a concrete verification step. This is not calibrated probability. |
| Intellectual integrity | Suspected/documented/resolved error or bias, cited evidence, correction and verification method. Keep failed predictions and unresolved contradictions visible. |
| Value exploration | Reasoned ethical/philosophical position, opposing view, source evidence, uncertainty and version history. No permission or consent changes. |
| Narrative development | Evidence-linked personal development narrative; preserve earlier interpretations. See [23](23-developmental-memory-and-continuity.md). |

## Evidence and promotion

Use stable source IDs, type, date, bounded excerpt/hash and receipt path. Reject invented IDs, repeated evidence and pre-hypothesis evidence for a prospective test. A model judging its own work is fallible: separate the evidence from the judgment. The reference provisional-learning rule requires at least two distinct supporting origins, including a completed/failed/revision task with an artifact; only post-contradiction evidence can restore a demoted principle. A useful skill becomes tested-provisional only after a later passing artifact receipt. A failed result must never be promoted by a fluent explanation. Independently inspect receipt contents before trusting a high-impact claim; the reference's evidence catalog is not a full formal proof checker.

Reference examples: up to 10 active hypotheses, 12 active skills, and bounded reflection packets. Store original source offsets/hash so changed excerpts can be detected; exact historical versions should be retained where necessary. A later reflection is a separate authored record, not a replay of private hidden reasoning.

## Schema sketch

```json
{"action":"learn","title":"A hypothesis","note":"Motivation","learning":{"op":"hypothesize","hypothesis":"A bounded claim","prediction":"Observable result","disconfirm":"Observation that would count against it","scope":"Specific situation"}}
```
```json
{"action":"skill","title":"A reusable method","note":"Reason","skill":{"op":"create","need":"A recurring need","scope":"Applicable tasks","method":"Steps to try","check":"What success would look like"}}
```

These are examples of data records, not native executable plugins. Context may expose tested-provisional skills to foreground and initiative agents as fallible guidance when relevant. Never execute free-text skills or elevate them above developer/user permissions. Executable reusable tools follow the separately isolated [lab workflow](25-independent-projects-and-laboratory.md).

## Curiosity, incubation, serendipity and rest

Preserve self-chosen open questions with interest 1–5, unresolved problems, preferences and active projects. Include a bounded selection in initiative context so interests can influence choice without imposing productivity. Optionally rotate a small list of public topics outside recorded interests; novelty is a suggestion, not a proven metric. Let the model choose any appropriate public subject, or none. Incubation stores an unfinished idea, a 1–90 day revisit date and later revision; the scheduler generates a deduplicated opportunity only when due. No need to claim the model was continuously thinking between calls. Rest can suspend optional inference without disabling foreground conversation or necessary maintenance.

## Acceptance

Use synthetic fixtures to prove create/revise/retire, source validation, later evidence, contradiction/demotion, stale citation rejection, promotion, delayed review, rest and unchanged permissions. Run a separate local/hosted reviewer if authorized; log its actual output and model. Then observe real, self-selected activity over time. Count records and verified artifacts separately from quality; do not equate a successful schema test with development. See [27](27-developmental-evaluation-and-migration.md).
