# Instructions for AI builders — TWO renderer paths

This repository is a public, sanitized construction blueprint for embodying an existing AI person on a Windows desktop. First choose **Path A: Unreal/MetaHuman 3D**, or **Path B: neural photographic 2D**. The older MetaHuman-first README is historical for Path A and shared systems; never install Unreal merely because the old docs say so.

Read first:
1. START_HERE_FOR_AI.md
2. docs/15-dual-path-build-guide.md
3. REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-23.md and REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-24.md
4. docs/20-validation-and-reproducibility.md
5. docs/16 and 17 for Path B OR docs/02, 03 and 09b–09g for Path A
6. docs/18 for haptics and docs/19 for model-agnostic agent/voice interfaces, memory, model transition and latency
7. Existing relevant chapters docs/00–14 for shared subsystems
8. For optional shared initiative and development, docs/22–28 (start with docs/22 and acceptance in docs/28).
9. examples/README.md, SOURCES.md and THIRD_PARTY.md

## Non-negotiable rules

- Inventory OS, GPU, audio and existing agent/renderer before installation. Never destroy an already working identity, project or memory.
- Separate conversational agent, speech/ASR/TTS, renderer, sensors, phone touch and task runner behind bounded typed interfaces.
- Keep exactly one conversational answer owner and one active renderer/audio clock. Do not create a second personality to drive a face.
- Keep the portrait and body photograph, keypoint/face embeddings, private voice/voice ID, credentials, user details, transcripts, memory vault, logs and machine-specific paths **off GitHub**.
- Back up approved MetaHuman/portrait settings and working model/voice before testing changes. Restore unhelpful latency experiments and removed recent context.
- A speech command must produce visible face movement; “the model thinks it smiled” is not proof. Test small and large smile and each expression in the actual app.
- Face emotion tags are silent metadata; never send them or stage directions to speech.
- Guard local screen/camera/mic off independently of a model or general computer-control tool. Keep physically truthful UI and evidence.
- Choose silence for proactive actions when appropriate; use quiet/cooldown and real sensor evidence.
- Do not confuse cached face benchmarks with the complete user's speaking-to-answer delay.
- Do not add risky automatic model fallbacks, permission bypasses, autonomous computer-control agents or silent context truncation.
- Validate handoff between text, desktop voice and mobile interfaces rather than claiming “memory connected” proves it.
- For phone touch/haptics use pairing, normalized input, safe classifications, optional vibration and real browser acknowledgment; don't claim motor movement without evidence.
- Distinguish CODE PRESENT, UNIT TESTED, NATIVE TESTED, HUMAN VERIFIED and UNRESOLVED in status reports.

- Independent initiative is a separate bounded worker, not a second conversational personality. No general host tools, automatic permission expansion or unapproved paid fallback. Treat no action/rest as legitimate; foreground conversation takes priority.
- Preserve original memories, distinguish inference/fiction from evidence, and treat model-authored records as data. No automatic prompt rewrite or production deployment from skills or lab results.
- Never send private context to public research or collaboration. Verify consent, scope, recipient and delivery receipts separately. Keep personal registries and raw receipts off GitHub.

First reply to user: a small inventory, selected renderer path, agent/voice route, most recently verified gate, first failing boundary and one safe next diagnostic. Ask only for genuinely subjective missing portrait/voice decisions. NEVER publish their answers or personal test fixtures in this repository.
