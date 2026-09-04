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

## 5. Realtime brain routing

Current OpenClaw Talk supports the concept of:

```text
realtime brain: agent-consult
consult routing: force-agent-consult
```

The goal is that normal finalized spoken user turns are routed through the OpenClaw agent even if the realtime provider could answer directly.

Why force it?

Without force-consult, the provider may decide some turns are easy enough to answer itself. Those answers can be perfectly competent but subtly lack:

- current memories,
- relationship tone,
- project continuity,
- agent-specific opinions,
- the same humor.

That inconsistency is especially noticeable in a persistent avatar because the face/voice creates a strong expectation of personhood continuity.

## 6. Tool-call forwarding

For a client-owned realtime transport, provider calls to `openclaw_agent_consult` should be forwarded to Gateway policy.

Conceptually:

```ts
if (toolName === 'openclaw_agent_consult') {
  const started = await gateway.request('talk.client.toolCall', input);
  const runId = started.runId;
  const answer = await waitForRunFinalText(runId);
  sendFunctionCallOutput(callId, { result: answer });
  send({ type: 'response.create' });
}
```

Wait for normal Gateway chat lifecycle events keyed by the returned run id. Do not poll the history blindly and guess which message belongs to the consult.

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
Check whether finalized turns are actually force-consulting the agent.

### Realtime says “Let me check with Lyra”
Your provider-facing delivery instruction is exposing architecture. Tell it that it **is** the same first-person speaker and must not narrate routing.

### Text chat knows something voice does not
Check session ownership and transcript persistence.

### Voice has the right memories but wrong manner
Check whether your realtime layer is adding its own generic coaching/reassurance style after the consulted answer.

### Local sign-off triggers unrelated tool behavior
Move it earlier into local intent interception.

## Exit criteria

- [ ] Desktop session is explicitly owned by the intended OpenClaw agent.
- [ ] Realtime ordinary turns consult the agent reliably.
- [ ] Provider delivery does not expose internal routing.
- [ ] Voice transcripts persist to OpenClaw.
- [ ] Local lifecycle/sensor intents bypass ordinary agent tools.
- [ ] Reopening a realtime call preserves desktop-session conversational continuity.
- [ ] Auxiliary presence/screen prompts stay out of ordinary conversation history.