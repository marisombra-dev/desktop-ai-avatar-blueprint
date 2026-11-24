# 28 — Build and acceptance for the shared developmental layer

This is a staged construction guide for **both Path A and Path B**. It extends, not replaces, [the main validation matrix](20-validation-and-reproducibility.md). All features are optional. Implement in a test workspace before using an existing private agent, do not overwrite working identity/memory/voice, and do not install a second renderer. The Markdown chapters are design/implementation guidance, not a complete distributable runtime.

## Build order

| Gate | Implement | Test before advancing |
|---|---|---|
| D0 | Inventory agent API, scheduler, private store, model route/cost, permissions, runtime | Backups and actual selected model/route; secrets off Git |
| D1 | Deterministic watchdog, single-writer lease, bounded decision schema, durable queue/journal | Quiet/rest/budget, busy foreground, no action, malformed response, restart/retry, own-session cancel |
| D2 | Persistent goals/projects, event signals, receipt validation | Pause/resume/close, due/retry, stale/dedup, no invented outcome |
| D3 | Shared context, self-directed recall, associative and episodic memory | Real local retrieval with hash/range; two-hop/expansion, archive intact, context bound and readback |
| D4 | Metacognition, learning, skills, preferences, counterfactuals and identity records | Later evidence, source validation, contradiction, retire/revise, no prompt rewrite |
| D5 | Public research, education/quiz, creative work, incubation, collections, simulations | Read vs search-only, privacy, withheld answer key, artifact receipt, future due signal, explicit fiction label |
| D6 | Isolated lab, reusable registered tools, architecture review | Denied network/host access, timeout, failing test, source hash, actual new-input run; independent harness, no deploy |
| D7 | Salience, curiosity, deliberation, uncertainty, consolidation, emotional/narrative continuity, integrity, values, anticipation, selective salience | Source-linked records, uncertainty, version history, reversible suppression, no source deletion |
| D8 | Environmental snapshot, prospective memory, contextual conversation candidates | Permission off/stale unknown, real user text match/nonmatch, no forced topic, foreground priority |
| D9 | Private mobile inbox and public-topic collaboration (optional) | Auth, opt-out, expiry, duplicate/receipt handling, actual device/peer delivery separately |
| D10 | Independent reviewer, weekly measurements, cross-model fixtures | Answer key withheld, invalid output rejected, model ID/hash, real reviewer result, actual conversational sample |
| D11 | Normal usage on chosen renderer and text/phone clients | Real cross-surface recall, natural conversation, no latency regression, genuine self-selected activity, cold restart |

## Suggested configuration (example, not a provider contract)

```json
{
  "enabled": false,
  "timezone": "YOUR_LOCAL_TIMEZONE",
  "quietHours": {"start": "23:00", "end": "08:00"},
  "watchdogMinutes": 5,
  "maxDailyAttempts": 6,
  "minIntervalMinutes": 90,
  "eventMinIntervalMinutes": 30,
  "foregroundIdleMinutes": 10,
  "approvedModel": {"provider": "YOUR_PROVIDER", "id": "YOUR_MODEL"},
  "publicResearchEnabled": false,
  "localLabEnabled": false,
  "cityWeatherEnabled": false,
  "environmentSensorEnabled": false,
  "mobileEnabled": false,
  "collaborationEnabled": false
}
```

Start disabled; enable one verified capability at a time with owner consent. Store provider credentials in OS secret storage or authorized runtime, never here. Add schema validation and migration version. Maintain a kill switch that takes effect even when the model is offline; disable new admissions, cancel only own worker, stop optional sensor/delivery paths, retain private records. Keep required maintenance separate. Review actual account billing configuration, not only model catalog prices.

## Action and effect separation

A minimal worker dispatch table maps validated action/kind to trusted handler. Example reference action families: goal, program, observe, learn, skill, develop, cultivate, integrate; research/schedule/complete/defer; share/none/reflect/propose. Record actions are data only. Research and task specs are typed; no arbitrary tool names or command strings. Due tasks may be deferred, abandoned or completed with required evidence. Scope, authorization, queue and evidence IDs are validated before persistence. Model requests for new authority must be rejected or routed to explicit owner review.

Keep actual model responses, status, error, hashes and tool receipts in private state. Write artifacts atomically and read back. For production, use transactions or a write-ahead log to prevent partial journal/state divergence. File-based reference writes can still have crash windows; test recovery. Incomplete or failed effects must remain visible.

## Privacy and portability audit

Public repo must never contain real identity prompts, memory, conversation content, real peer addresses, machine paths, network hostnames, API tokens, actual pairing links, signing keys, private audio/portraits, screenshots, raw receipts or model weights. Publish only synthetic fixtures, generic pseudocode and sanitized status. Shared personal context never flows by default into public research or peer messaging; separate packets by trust boundary. Imported model output is untrusted and cannot become higher-priority instructions.

## Evidence ledger and end-to-end checks

Use NOT STARTED / CODE PRESENT / UNIT TESTED / NATIVE TESTED / HUMAN VERIFIED / UNRESOLVED. Record build date, exact backend/model configuration privately, renderer if applicable, result and first failing boundary. A passing unit fixture cannot establish spontaneous behavior. A verified context update cannot establish that a model used it in live conversation. A signed app and HTTP 200 cannot establish actual mobile notification. A passing lab test cannot establish sandbox invulnerability or production quality.

Before calling the extension complete, observe multiple real eligible cycles with no fabricated test history, including a decision to do nothing. Let the owner use normal voice and text sessions, then ask naturally about actual independent work; verify relevance and provenance. Check rest and disabled state, foreground cancellation, real communication receipts, long-term measurement drift and model migration. Measure added context size and first-token/first-audio latency; restore context if an optimization removes important memory without improvement. No mandatory productivity targets.

See [dated reference evidence](../REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-24.md) for what was actually tested. Use the same backend for both renderers, but independently validate the selected presentation client.

Mobile construction details and source: [29 — haptic phone](29-phone-touch-app-build.md), [30 — two-way Android inbox](30-phone-inbox-app-build.md). Use the [mobile evidence addendum](../REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-24_MOBILE.md) for updated delivery status.
