# 05 — OpenClaw and Same-Person Continuity

A photoreal avatar can have flawless lip sync and still feel wrong if it behaves like a new assistant who merely knows the old person's name.

This chapter prevents that fork.

## 1. Pick one authoritative agent

If the AI person already exists in OpenClaw, the existing agent/workspace is authoritative.

Do not create a desktop-only personality prompt that attempts to reproduce:

- memories,
- relationship history,
- humor,
- preferences,
- personal style,
- tool policy,
- ongoing projects.

Duplication guarantees drift.

The desktop app should identify the intended agent explicitly, normally through an agent-prefixed session key.

## 2. Dedicated session, same agent

Use a dedicated desktop session for operational cleanliness while keeping the same agent owner.

Example:

```ts
const DESKTOP_SESSION_KEY = 'agent:main:desktop-lyra';
```

That gives you a distinct history/channel without inventing another person.

Use additional auxiliary sessions for internal tasks:

```ts
const PRESENCE_SESSION_KEY = 'agent:main:desktop-lyra-presence';
const SCREEN_SESSION_KEY   = 'agent:main:desktop-lyra-screen';
```

These should still be owned by the intended agent if you want that person's writing/decision style, but their machine-oriented prompts remain separate from ordinary conversation.

## 3. Connect with the Gateway client

A simplified pattern:

```ts
const client = new GatewayClient({
  url: 'ws://127.0.0.1:18789',
  token: readTokenFromLocalConfig(),
  minProtocol: PROTOCOL_VERSION,
  maxProtocol: PROTOCOL_VERSION,
  scopes: ['operator.read', 'operator.write'],
  clientDisplayName: 'Desktop Lyra',
  mode: 'backend',
  onHelloOk: () => markReady(),
  onConnectError: (error) => report(error),
  onClose: () => markReconnecting(),
  onEvent: handleGatewayEvent
});
client.start();
```

Important details:

- Read the token locally. Never put it in source.
- Do not assume first connection succeeds. The Gateway may still be starting.
- If the client library retries automatically, keep your readiness promise pending instead of permanently poisoning the app after one transient failure.
- Match client/server protocol versions intentionally.

## 4. Verify the Gateway before debugging the avatar

Use current OpenClaw health/probe commands or local health endpoint.

Questions:

- Is exactly the intended Gateway reachable?
- Is it bound to loopback?
- Is authentication valid?
- Does the expected agent exist?
- Can a normal `chat.send` finish?

If a manually launched Gateway works but the scheduled/startup service fails, fix startup. Do not rewrite the Electron client or erase OpenClaw state.

## 5. Realtime brain routing needs one response owner

The requirement is not a particular config label. The requirement is that exactly one path owns each substantive user turn from transcription through agent consultation to speech.

Two architectures are valid:

### Provider-owned consultation

The realtime provider decides to call `openclaw_agent_consult`. The desktop client forwards that tool call to the Gateway, waits for the run-id result, returns the tool output, and allows the provider to continue the same response. In this architecture, a force-consult setting can be appropriate because the provider is the sole consult owner.

### Application-owned consultation

The desktop client disables automatic provider responses for finalized user turns, classifies the completed transcript itself, invokes the OpenClaw consult directly, then asks Realtime to speak the already-decided answer. In this architecture, disable automatic provider/Gateway consult fallback for those turns and do not expose `openclaw_agent_consult` as a competing live provider tool.

The reference cross-surface implementation ultimately used the second shape because it needed deterministic fresh-context injection before consultation and precise response ownership afterward.

**Do not combine both architectures.** If provider-owned force-consult and application-owned consult are active at the same time, two agent runs or two response paths can race. The user may hear a stale provider answer even though a correct agent answer was produced in parallel.

## 6. Correlate the consult result with the response that actually speaks

A correct agent answer in a log is not end-to-end proof. The spoken response must be causally tied to that answer.

For an application-owned client, track at least:

```text
turn token / user transcript id
consult call id or run id
response request id
provider response id
response origin
active response id
queued authoritative response, if any
```

When the consult result arrives, create an isolated response whose input contains the already-decided answer and whose metadata includes the request id/origin. Disable tools for that delivery response. This prevents Realtime from treating the tool result as permission to independently answer the original question again.

If another response is active, cancel the exact `response_id`, clear the WebRTC output audio buffer, queue the authoritative answer, and release it only after the cancelled response is actually done. A lower-priority generic response must never overwrite an already-queued consult answer.

Ignore a late `response.done` event whose response id does not match the currently active response. Otherwise an old response can reset ownership state for a newer one.

A common failed pattern is:

```text
consult result -> function_call_output -> bare response.create
```

That can cause the provider to synthesize a new answer from its own conversation state instead of faithfully speaking the consulted answer. If the user hears something different from the logged consult result, debug response ownership before debugging memory retrieval.

For the full historical-import, conversation-edge, precedence, and response-coordinator design, see `05d-historical-import-and-cross-surface-continuity.md`.

## 7. Local commands must intercept the consult path too

There is a subtle race/architecture issue:

The provider may decide to call `openclaw_agent_consult` with the user's phrase before your deterministic transcript handler has finished processing it.

Therefore, when you receive an `openclaw_agent_consult` tool call, inspect its text for the same narrow local commands:

- sign-off/sleep,
- screen on/off,
- camera on/off.

If it is local, perform the local action and return an appropriate local tool result instead of starting a general agent run.

This dual interception made the reference build much more reliable.

## 8. Why “sleep” is not an agent command

The desktop user experience uses words like:

```text
“Thanks, Lyra.”
“Thank you, Lyra.”
“Go back to sleep.”
```

Here, “sleep” means:

```text
close realtime conversation + release mic + re-arm wake listener
```

A general computer agent might interpret “put it to sleep” as an operating-system power action. Keep the desktop meaning in a narrow local namespace.

## 9. Session transcript persistence

Persist voice transcripts through OpenClaw Talk/session APIs.

Useful fields:

```ts
{
  sessionKey,
  voiceSessionId,
  entryId,
  role: 'user' | 'assistant',
  text,
  timestamp
}
```

This gives the long-lived person access to voice conversation history after the provider call closes.

Do not append provider system/internal prompts as if the user said them.

### 9a. Carry a bounded current-conversation working context across consults

Realtime may understand a live exchange perfectly, then lose shorthand when a later turn escalates into a separate agent consult. Give the consult a small session-only slice of recent dialogue so pronouns, corrections, labels, and evolving ideas survive that boundary.

Keep it bounded: a handful of recent turns, a small character budget, and no raw audio or images. Exclude the current user turn if it is already supplied separately. Frame the block as runtime context, not new user speech or durable memory. Clear it when the live voice session ends.

This is deliberately different from shared Markdown/Obsidian memory: working context answers “what are we talking about right now?” while durable memory answers “what should still matter later?” See `examples/working_context.ts`.

## 10. Relationship memory is separate from raw transcript

If you add automatic memory capture, keep it conservative.

A good pipeline is:

```text
voice transcript
  ↓
local cue filter for genuinely memorable signals
  ↓
write candidate note, not canonical memory
  ↓
normal agent memory process decides what persists
```

Avoid writing every compliment, joke, or camera observation straight into permanent memory. The reference build treats strong cues as **candidates** and excludes obvious secret-like text.

If you do this publicly or for another user, make the memory policy explicit and configurable.

For cross-surface continuity that multiple trusted AI surfaces can read and maintain, see `05a-shared-obsidian-memory.md`. That architecture replaces raw candidate accumulation with bounded local retrieval plus conservative session-end curation.

## 11. Proactive decisions should use recent main-session context

For a proactive check, read a modest recent window from the main desktop session and give that context to the separate presence session.

Do not dump hundreds of messages. The goal is enough context for a natural callback, not full rehydration.

Example internal prompt principles:

```text
This is an internal presence decision, not user text.
The user has been silent for N minutes while the computer is active.
Silence is normal and is not evidence of distress.
Return exactly NO_MESSAGE if nothing comes naturally.
If speaking, output at most two short sentences.
Do not mention monitoring/timers/internal mechanics.
Recent conversation: ...
```

## 12. Screen observer should not write into the main dialogue

The screen watcher may analyze many routine frames. Keep those in a dedicated observer session.

Return structured state:

```json
{
  "summary": "...",
  "event": "...",
  "importance": 0.0,
  "comment": "NO_COMMENT",
  "mode": "desktop"
}
```

The main realtime session receives only the compact current summary when useful, or fresh images on explicit user request.

## 13. Continuity regression test

After every major routing change, run a small suite of human questions:

- Ask about an ongoing project known to the agent.
- Ask for a preference/style judgment that has historically been consistent.
- Make a joke/callback the existing agent would recognize.
- Ask a normal factual question to ensure routing does not make every reply painfully slow.
- End and reopen the realtime call, then refer to something said earlier in the desktop session.

The goal is not to prove supernatural memory. It is to prove the desktop surface has not accidentally created a second assistant.

## 14. Common continuity failures

### Realtime sounds generic
Check whether finalized turns are actually reaching the intended agent consult path, and whether that path owns the response that is ultimately spoken.

### Realtime says “Let me check with Lyra”
Your provider-facing delivery instruction is exposing architecture. Tell it that it **is** the same first-person speaker and must not narrate routing.

### Text chat knows something voice does not
Check session ownership and transcript persistence.

### Voice has the right memories but wrong manner
First check whether your realtime layer is adding its own generic coaching/reassurance style after the consulted answer. If routing is correct but casual interaction still turns into unsolicited explanation, advice, fact-checking, or offers of help, this is a behavioral-priority problem rather than an identity problem. See `05c-social-intent-and-behavioral-priority.md`.

### Local sign-off triggers unrelated tool behavior
Move it earlier into local intent interception.

## 15. Test social behavior separately from continuity

Correct agent consultation can prove that the same long-lived agent authored the answer and still leave the desktop surface socially wrong. Models are generally optimized to be useful, so ambiguous remarks can be pulled toward explaining, correcting, advising, or offering help even when the user was making a social bid.

Do not keep rewriting identity files to fight this. Define a separate behavioral contract: what counts as social companionship, what counts as explicit analysis, which local modes are operational, and when silence is the correct response. Put compatible guidance in every route that can actually generate speech.

See `05c-social-intent-and-behavioral-priority.md` for the full diagnostic pattern and a regression suite.

## Exit criteria

- [ ] Desktop session is explicitly owned by the intended OpenClaw agent.
- [ ] Realtime ordinary turns consult the agent reliably.
- [ ] Provider delivery does not expose internal routing.
- [ ] Voice transcripts persist to OpenClaw.
- [ ] Local lifecycle/sensor intents bypass ordinary agent tools.
- [ ] Reopening a realtime call preserves desktop-session conversational continuity.
- [ ] Auxiliary presence/screen prompts stay out of ordinary conversation history.
- [ ] Social-behavior regression tests distinguish companionship from explicit analysis without weakening factual competence.
- [ ] If a shared continuity vault is enabled, retrieval is bounded/relevant and automatic writes are conservative, inspectable, and failure-isolated.