# Sanitized Reference Examples

These files are **implementation patterns**, not a drop-in product. They are distilled from the working reference architecture while removing personal names, secrets, absolute machine paths, private memory logic, and project-specific Unreal assets.

Use them this way:

1. Read the matching chapter in `docs/` first.
2. Check current OpenClaw/OpenAI/Electron APIs.
3. Rename the generic `DesktopAvatar` / `Lyra` examples to your person.
4. Wire them into your own typed IPC/state model.
5. Test each boundary before adding the next file.

Files:

- `wake_word_listener.py` — local faster-whisper wake detector that exits after one wake.
- `realtime_local_controls.ts` — Realtime local tool installation, command normalization, screen/camera/sleep interception, and fresh-image injection pattern.
- `screen_watcher.ts` — local change-driven screen sampler with model-analysis throttling.
- `gateway_client.ts` — OpenClaw Gateway connection / dedicated-session / realtime Talk patterns.
- `proactive_policy.ts` — local eligibility gating for restrained proactive speech.
- `openclaw-gateway.cmd.example` — Windows launcher shape for a long-lived local Gateway.

Security rules:

- Never paste real auth tokens into these files.
- Never commit `.openclaw/openclaw.json`.
- Never commit provider API keys/OAuth material.
- Do not treat example regular expressions or thresholds as universal.
- Do not expose screen/camera capture when UI privacy state is OFF.

The exact code in a new build will differ by current upstream versions. Preserve the architecture, not obsolete syntax.