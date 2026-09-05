# Instructions for AI Coding Assistants

This repository is meant to be consumed by an AI helping a human build a persistent desktop embodiment of an existing AI person.

Before changing the target machine or creating code, read:

1. `START_HERE_FOR_AI.md`
2. `README.md`
3. `docs/00-electron-desktop-shell.md`
4. `docs/01-architecture.md`
5. the remaining `docs/` chapters in numeric order
6. `SOURCES.md`
7. `examples/README.md`

## Non-negotiable rules

- Inventory the target machine and existing agent before installing/replacing anything.
- Preserve the existing AI person's identity, memory, and workspace unless the human explicitly asks for changes.
- Never expose or commit secrets, personal memory files, private transcripts, reference photographs, screen captures, or webcam frames.
- If a shared Markdown/Obsidian continuity vault is enabled, never publish the real vault; keep retrieval bounded and durable writes conservative.
- Use current upstream docs when a version-sensitive API differs from the reference implementation.
- Work through the stage gates in `docs/12-build-order-checklist.md`.
- Do not debug multiple layers at once.
- Keep screen/camera/sleep as narrow local controls.
- Keep substantive conversation routed through the existing long-lived agent.
- Make camera/screen OFF physically enforceable, not merely a UI state.
- Keep proactive speech conservative and make silence an explicit successful outcome.
- Back up approved MetaHuman/animation assets before experimental changes.
- Do not tune mannerisms until the capability stack is stable.

## Expected first response to the human

After reading the repository, inspect what you can inspect automatically and produce this report without secret values:

```text
Target AI person:
Wake name:
OS:
GPU / VRAM:
Unreal version + install path:
MetaHuman support/plugins:
Monolith present/version:
OpenClaw version:
Gateway health/address:
Existing OpenClaw agent/session:
Node/npm:
Python:
Microphone(s):
Speaker/output:
Webcam(s):
Loopback audio available:
Proposed Electron project path:
Proposed Unreal project path:
Current stage gate:
Blockers:
Next single action:
```

Ask the human only for missing subjective decisions such as the canonical face reference or preferred voice. Do not ask them to manually find information that can be inspected from the machine.

## Definition of progress

A stage is complete only when its observable test passes. Source code existing on disk is not proof.

When a failure occurs, report:

```text
Last proven boundary:
First failing boundary:
Exact error/message:
What was tested independently:
Smallest next diagnostic:
```

Then perform that diagnostic before proposing an architectural rewrite.
