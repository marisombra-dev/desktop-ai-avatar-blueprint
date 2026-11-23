# 19 — Agent backends, voice transport, memory, model replacement and measured latency

This chapter supersedes any impression that all builds require OpenClaw plus OpenAI Realtime. The original reference **used** that route, and Path A can still use it. A November 2026 reference uses **OpenCode-managed conversations, local multilingual Whisper ASR and ElevenLabs voice output**, with an independently replaceable neural face. The whole design must allow either agent backend and TTS provider without changing identity or renderer.

## 1. The agent is not the avatar or TTS provider

Use a backend interface with persistent session ID, tool policy, stream, cancel, history and instruction/memory connectors:

~~~ts
interface ConversationBackend {
  start(): Promise<void>;
  continueTurn(sessionKey:string, userText:string, options:{signal:AbortSignal}):
    AsyncIterable<{kind:'text'|'tool'|'status'; value:unknown}>;
  history(sessionKey:string, limit:number): Promise<ReadonlyArray<{role:string;text:string}>>;
  stopTurn(sessionKey:string): Promise<void>;
  health(): Promise<{ready:boolean; model:string}>;
}
~~~

The model must author the conversational response; the speech engine voices the cleaned approved text, and the face shows optional silent visual intentions. Tool execution belongs to the established agent permission system, not the portrait's web view, mic stream or speech provider.

### Backend A: OpenClaw

Docs/01, 04, 05–05e, 06, 11 and earlier examples record an original OpenClaw Gateway implementation. Route substantive turns through the established long-lived agent and retain distinct observer/proactive sessions. Do not mistake the realtime vocal front end for a replacement agent identity. Reconcile versions using upstream docs; earlier recorded Gateway ports/providers are examples, not universal defaults.

### Backend B: OpenCode

The inspected later reference uses an OpenCode native API for persistent desktop conversation, with a dedicated main session, optional internal sessions and explicit model selection. A private session mapping preserves ID across restarts. When switching models, keep the prior history as an immutable archive and carry a bounded set of confirmed recent user/assistant turns into the new model's initial context. Do not silently discard older history when a session cannot be reached. A stale/inaccessible session is an error to diagnose, not permission to start over.

The inspected selector supports a hosted model trial and alternate local/temporary model routes. At this dated snapshot the default points to a **Muse Spark 1.3 contributor/Go audition** via OpenCode; alternate routes include **Gemma 4 multimodal QAT** locally and an older **HY4 Flash free** option. Those are changeable operational choices, not the public blueprint's fixed dependencies or a guarantee that the models will remain available. Earlier local tests found the local model could answer well but had severe latency or hallucination tradeoffs; verify a concrete replacement before deleting a working model route.

**Model transition rules:** explicitly choose model and provider; verify real native API response identifies that exact model, protect tool permission parity, preserve identity and current history, run a scripted voice conversation, and compare answer truthfulness, tone, first-token delay and context fidelity. Do not auto-switch to a different personality/model without disclosure. If a requested provider is unavailable, produce an understandable error or enqueue a durable task according to explicit policy; never invent an answer or imply the unavailable backend performed an action.

## 2. Voice: local capture → ASR → model → TTS → actual playback

~~~text
microphone owner
  → VAD + buffered preroll + optional semantic endpoint predictor
  → local Whisper transcription (EN/ES as configured)
  → bounded main agent context + one model answer stream
  → sanitize text and optional silent visual tags
  → TTS provider and decoded audio
  → one playback clock / barge-in and cancel
  → actual audio also feeds face motion
~~~

Use one microphone owner during listening/voice. Wake-word recognizer, always-on microphone and active conversation must not simultaneously compete for exclusive hardware. Explicit mic-off must shut actual capture, not only the UI toggle.

The inspected voice gate keeps about 350 ms pre-roll and uses 600 ms normal silence endpointing, with optional 500 ms semantic endpoint only at very high completion confidence (roughly 0.98) and enough stable speech. During speech it issues reusable ASR previews, including around 400 ms pause boundaries, but the last final ASR request must not be forced to wait behind a backlog of redundant previews. Treat 600/500 and sensitivity thresholds as tuned examples, not a blanket guarantee across microphones, accents or languages.

Earlier CPU recognition was migrated to multilingual Whisper GPU acceleration with CPU recovery. Evaluate ASR based on **user understanding**, including English/Spanish code-switching and noise. Do not assume speech recognition mistakes are model hallucinations; keep original speech transcriptions private and permit clarification when ambiguous.

### ElevenLabs route

The later reference uses a privately configured ElevenLabs voice with a v4 Turbo dialogue WebSocket adapter and optional HTTP fallback. The credential and voice ID stay in private environment/config, never in the repository. The v4 adapter as inspected accumulates returned base64 audio chunks and resolves a complete MP3 contract; a network stream alone does **not** prove that the desktop begins audible playback before the complete utterance. Measure actual playback rather than “first byte received.”

Protect the spoken text from special tags, debug stage directions, raw markdown tokens, emoji names and false model/tool success claims. Keep natural English/Spanish speech and intact content. Voice speed, stability, pronunciation and identity likeness are user-approved settings; do not overwrite voice configuration to optimize animation.

A voice transport is optional and replaceable. If streaming PCM from TTS directly is later introduced, ensure the face engine's necessary lookahead, speech segmentation, proper flush and interruption semantics still match the actual playback clock.

## 3. Context and memory are multiple data planes

The agent should have separately managed:

1. Private canonical identity/personality instructions and user-approved behavioral priorities.
2. Durable curated memory (optionally Markdown/Obsidian), searchable and source-aware; do not flood with raw transcripts.
3. Bounded active conversation working context, with confirmed latest turns and references to longer history.
4. Near-term cross-surface message edges from text chat, desktop voice and any mobile client. A new surface must not pretend its own session contains all other conversations.
5. Optional historical archive containing private full conversations. It is not published or automatically inserted into every prompt.
6. Task ledger and scheduled-work status, separate from human dialogue and durable personal memory.

**Continuity precedence:** explicit present user input and fresh verified events > recent confirmed conversation > curated durable memory > historical summaries. Tool results remain evidence, not model authority; don't allow private memory archives or untrusted content to inject new instructions.

The inspected runtime repaired an overfull native conversation using bounded continuation, explicit history links and no-output overflow recovery. Correct compaction preserves identity, material recent context, tool permissions, and a path to intact prior history. Do not remove recent conversation to reduce latency without measuring benefit and explicit consideration of the continuity cost.

Cross-surface text/voice continuity is a distinct acceptance test: ask an ordinary new question referencing a recent text conversation, then vice versa. Passing access to Obsidian alone is not evidence of this gate.

Scheduled tasks should use a durable ledger with claims, postcondition receipts, retry policy and a chosen worker model; if the selected model disappears, either route to an explicitly authorized fallback with the same permissions or queue transparently. Avoid silently dropping or duplicating tasks. See docs/11b for idempotence and verified postconditions.

## 4. Instrument latency rather than “feeling faster”

At minimum, log timestamps (not user speech) for:

| Stage | Measurement |
|---|---|
| microphone | first phonation, final speech sample, VAD endpoint |
| ASR | first draft, final recognized text ready |
| model | request start, first token, final response, tool wait |
| TTS | request start, first chunk, complete audio |
| face | first ready motion prefix, first decoded frame, buffer ready |
| playback | audible start, first displayed mouth frame, segment gap, interruption completion |

Use turn IDs, generation IDs, monotonic clocks and explicit source (live vs cached fixture). A cached face clip benchmark **does not include** new ASR, new model text or new TTS. Avoid presenting an 8-second prepared-audio improvement as overall conversation latency.

The reference measurements from Nov 21 found HY4 first text often around **4–7 seconds** in observed unoptimized turns, while TTS and face startup added their own smaller delays. Local tool-presentation/context experiments improved some warm first-token samples, but the user still reported objectionable overall latency. The face window optimization measured prepared-audio startup roughly **2.16→1.48 seconds** on an 8-second fixture and **6.88→1.54 seconds** on a long stress fixture, with no meaningful short-greeting benefit. These are isolated measurements, not the live perceived delay. Earlier full face bench and later reaction-enabled settings give different first-frame timings; record exact configuration and compare like-for-like.

Keep the approved portrait quality, expression calibration, voice and identity stable when changing one latency component. Benchmark ASR, model, TTS, face separately. A model that is faster but hallucinates more or loses natural dialogue is not a successful substitute.

## 5. Failure isolation

- “He can't hear me”: check mic device/ownership → VAD → ASR → final text → agent turn → TTS. Extreme latency can resemble silence.
- “He speaks but face is frozen”: inspect active renderer controller/session, renderer health, face:true acknowledgment, queued frames and displayed audio-clock index. Do not rewrite prompts.
- “He says he smiled but didn't”: verify command selection, dispatched face event, native deformation output and visible pixels. Do not infer success from text.
- “Phone disconnected after being away”: separate phone pairing state from desktop mic state and from desk-presence evidence.
- “Context vanished after optimization”: compare actual recent turns and context entries before/after; restore the omitted context when latency did not improve.
- “Model unavailable”: preserve saved session, request errors and tool continuity; never silently switch or fabricate results.
- “Stage directions audible”: fix text sanitizer/sideband parser before changing the entire conversational model.

Security and privacy: docs/10; architecture: docs/01; full validation: docs/20.
