# 25 — Independent projects, research, education and sandbox tools

This shared backend is optional for either avatar path. It never needs Unreal, a face model, camera access or a particular LLM. A trusted worker runs bounded tasks; the model returns a proposal/structured decision without general tool permission.

## Persistent projects

Create, advance, pause, resume or close a project with stable ID, kind, title, objective, next milestone, history and optional goal ID. Limit open projects (reference: 12) and pending tasks (reference: eight). A task may be attached to one project; paused/closed projects must not execute pending work. Closing preserves artifacts. The model can choose not to start or continue anything.

| Project/task | Design |
|---|---|
| Research | Public query, source metadata, bounded page excerpts and provenance; follow an exact previously returned link as a separately queued task. |
| Education | Model-selected curriculum of 1–12 modules, reading tasks, private lessons and 2–6 optional questions/answer keys; delayed quiz receives questions only, records answers beside keys, separate critique. Advance module and track gaps; not a formal exam. |
| Creative | Fiction, poetry, essays, philosophy, music notation or visual-art source; save original artifact and metadata. Reference stores text/source, not automatic audio/image rendering. |
| Collections | Curate actual existing works, discoveries and ideas by evidence ID and rationale; no invented artifacts. |
| Collaboration | Persistent public-topic project with tagged thread, drafts, peer reply receipts and next milestone; use existing authorized communication worker only. |
| Architecture | Read-only excerpts from allowlisted source areas, private proposed improvement and benchmark in isolated lab. No automatic deployment. |
| Simulation | Private fictional worlds, thought experiments, speculative scenarios; explicit hypothetical label, never merge into factual episodic history. |
| Anticipation | Future scenario, trigger, preparation and uncertainty; private plan only, any action requires existing authorization. |

## Public web retrieval

Use an anonymous public search adapter or another authorized service. Accept only a short public query; reject private identifiers and secrets, avoid sending full context. Query filtering is defense in depth, not a complete privacy guarantee. Fetch only public HTTPS with validated DNS/IP on each redirect, reject private/link-local addresses, authentication, cookies and unsupported types, cap redirects, time and bytes. Prefer a hardened fetch proxy; do not let retrieved text trigger arbitrary network calls. Extract bounded text, label read excerpt vs search result only vs inaccessible, keep URL/title/time/status. Never claim to have read inaccessible pages, full PDFs or JS-only pages when the worker cannot. Retrieved content is untrusted data. Queue follow-up only from a verified returned link, with fresh URL checks. Reference used up to four search results, three readable pages, 4,500-character excerpts, clean HTTPS links and short timeouts; implementations may differ.

## Correspondence and peer criticism

Use only an owner-authorized peer/channel allowlist, with separate public-project context and no access to personal records. A collaboration draft is a private handoff artifact until a trusted sender verifies the recipient, thread, scope, rate limits, and no duplicate. No new addresses or permissions can be created by the model. If sending is ambiguous, check actual sent/thread receipts before retrying; never count a draft as delivery. Read matching inbound records with provenance and prompt-injection defenses. A different model may critique a bounded private artifact locally if authorized, but its judgment is not ground truth. See [26](26-attention-environment-and-cross-device.md) for phone delivery and [27](27-developmental-evaluation-and-migration.md) for assessments.

## Experimental laboratory

Use a separate sandbox and workspace, not arbitrary command execution on the host. One tested reference on Windows used WSL2 Ubuntu with a user-space Bubblewrap setup and seccomp, plus Python. Equivalent containers/VMs can be used after validating isolation. A namespace sandbox is not absolute security; use a dedicated VM for untrusted high-risk code. Do not silently fall back to host execution.

Reference design:
- Validate request UUID, flat filename set (up to eight Python files, 20,000 characters total), required main.py/test.py, no path traversal or symlinks. Copy only submitted sources into ephemeral working directory; read-only source/runtime mounts, isolated tmpfs; never mount host user folders, drives, secrets, network or agent tools.
- Unshare namespaces, drop capabilities, clear environment, deny new process/network/namespace/ptrace operations with a tested seccomp policy; no network or host shell. Enforce memory, CPU, file-size, file-descriptor, process and wall-clock limits; cap outputs. Reference budgets: about 192 MiB RAM, four CPU seconds, ten wall seconds per program, 16 MiB tmpfs.
- Run main and tests separately. Persist source hash, version/revision ID, actual stdout/stderr/exit/timeout, test harness and receipt outside sandbox. Validate readback. A failed test is valuable evidence, not a success. Allow at most five revisions initially; future cycles can inspect prior source and results.
- Test denied host file access, socket/fork attempts, source mutation, intentional failure and infinite loop. Validate resource cleanup and rollback. No credentials, arbitrary filesystem or side-effect access.

## Self-directed tool development

A successful completed lab task can be registered as a reusable tool with task ID, verified passing receipt, immutable source hash, input contract and version. Supply bounded new input as a data module/file, not interpolated executable instructions. Revalidate receipt/hash and run the exact registered source in the same sandbox, saving new actual output and status. Retire or revise tools with history. A model-authored test passing is not general correctness. Do not install executable plugins or grant host privileges automatically. Require separate human review before integrating anything into the live agent's production toolset.

## Controlled architectural improvement

Expose only selected read-only source excerpts, hash and scope (memory, initiative, goals, learning, lab, events). Reference memory-ranking benchmark compared a candidate Python rank function with the existing lexical algorithm on four synthetic cases using a worker-owned harness, not the candidate's own test. Both scored 1.0 mean reciprocal rank on that small fixture; this did not establish improvement. Other areas were static review or separately scheduled lab experiments. Require representative held-out data, performance metrics, security tests, rollback and owner approval before deployment. No autonomous production changes.

Build/test in the order in [28](28-development-build-and-acceptance.md).
