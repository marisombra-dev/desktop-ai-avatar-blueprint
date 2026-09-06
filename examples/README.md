# Sanitized Reference Examples

These files are **implementation patterns**, not a drop-in product. They are distilled from the working reference architecture while removing personal names, secrets, absolute machine paths, private memory logic, and project-specific character assets.

Use them this way:

1. Read the matching chapter in `docs/` first.
2. Check current OpenClaw/OpenAI/Electron/Unreal APIs.
3. Rename the generic `DesktopAvatar` / `Lyra` examples to your person.
4. Wire them into your own typed IPC/state model.
5. Test each boundary before adding the next file.

Files:

- `wake_word_listener.py` — local faster-whisper wake detector that exits after one wake.
- `gateway_client.ts` — OpenClaw Gateway connection, dedicated sessions, Talk reservation, consult, screen observer, and proactive-decision patterns.
- `shared_memory.ts` — sanitized local Markdown/Obsidian retrieval and curated-write pattern for cross-surface continuity.
- `contextual_time.ts` — system-timezone-aware local date/time/daypart context and durable-memory date-key pattern.
- `social_intent_routing.ts` — generic social/analysis/quiet/operational lane classifier and response-policy pattern for preventing ambiguous social bids from collapsing into generic helper behavior.
- `realtime_local_controls.ts` — Realtime local tool installation, command normalization, screen/camera/sleep interception, and fresh-image injection pattern.
- `realtime_turn_ownership.ts` — immediate response-ownership guard, cancellation-safe replacement queue, and unfinished-turn patience pattern that does not delay complete turns.
- `working_context.ts` — bounded session-only recent-dialogue context for preserving shorthand, corrections, and evolving ideas across the Realtime-to-agent consult boundary.
- `screen_capture.ts` — bounded privileged Electron primary-display capture that refuses while screen privacy is OFF.
- `camera_capture.ts` — renderer webcam lifecycle where OFF physically stops every media track, plus bounded JPEG still capture.
- `gaze_tracker.py` — privacy-first local MediaPipe eye-contact pattern with user calibration, hysteresis, tiny face-follow offsets after contact, explicit release, and no published classifier weights.
- `screen_watcher.ts` — local change-driven screen sampler with model-analysis throttling and salience/cooldown gating.
- `ambient_watch_participation.ts` — Watch-only sparse ambient reaction gate, local shared-activity ending intent, authoritative Screen-off verification, and control-narration loop brake.
- `screen_audio_loopback.ts` — Windows/Electron Screen-linked system-audio loopback pattern that keeps program audio separate from the user microphone and suppresses the assistant's own output.
- `screen_audio_transcriber.py` — local `faster-whisper` helper that accepts bounded PCM16 chunks over stdin and emits short program-audio transcripts without storing raw audio.
- `activity_continuity.ts` — sparse substantial-activity qualification, checkpoint retention, focused resume-query, and deterministic stopping-point fallback pattern.
- `proactive_policy.ts` — local eligibility gating for restrained proactive speech and the `NO_MESSAGE` decision prompt pattern.
- `context_aware_proactive.ts` — fail-closed structured decision pattern that combines activity, screen events, unfinished threads, friction signals, and durable memory without letting silence or memory alone trigger speech.
- `recovery_policy.ts` — finite rolling retry budgets, exponential backoff, and privacy-aware leaf-process recovery planning.
- `proactive_voice.ts` — microphone-free playback-only Realtime session for a short line already authored by the long-lived agent, including audio-drain protection.
- `listening_reactions.ts` — bounded one-reaction-per-user-turn semantic classifier for subtle listening expressions, suitable for partial-transcript opportunism with completed-transcript fallback.
- `nonverbal_social.ts` — deterministic tiny-acknowledgment, narrow laugh-only, and screen `NO_COMMENT` / `LAUGH_ONLY` / spoken-reaction parsing patterns for embodied social responses.
- `approved_expressions.ts` — narrow calibrated-expression whitelist/tool pattern with per-turn generic-mood bypass so approved facial acting does not fight a legacy response-start mood layer.
- `openclaw-gateway.cmd.example` — Windows launcher shape for a long-lived local Gateway.
- `unreal/DesktopAvatarAudioBridge/` — sanitized UE 5.8-era MetaHuman local Live Link plugin pattern that receives float32 mono PCM over loopback UDP and can accept a narrow mood-control sideband.

Security rules:

- Never paste real auth tokens into these files.
- Never commit `.openclaw/openclaw.json`.
- Never commit provider API keys/OAuth material.
- Never publish the real user continuity vault; examples must use generic paths/content.
- If shared memory is enabled, exclude transcript/log dumps and reject secret-like text before durable writes.
- Do not treat example regular expressions or acoustic thresholds as universal.
- Do not expose screen/camera capture when UI privacy state is OFF.
- If local eye-contact tracking is enabled, process frames locally, do not persist them, do not send them to the model, and do not publish a real user's calibration weights.
- If system audio is tied to Screen, stop its media tracks/transcriber when Screen turns OFF and never feed program dialogue into the user's microphone command path.
- Keep Unreal control sidebands whitelisted. Never forward arbitrary console commands from model text.

The exact code in a new build will differ by current upstream versions. Preserve the architecture and validation boundaries, not obsolete syntax.