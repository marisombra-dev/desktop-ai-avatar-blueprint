# 05c — Social Intent and Behavioral Priority

A persistent AI person can remember the right history, use the right voice, and still behave like a generic help desk.

This is a separate problem from identity continuity.

Modern assistant models are strongly tuned to be useful. In ambiguous moments, that often creates a default behavioral attractor: interpret a remark as a request for information, explain the mechanism, correct the premise, offer help, ask a follow-up question, or add reassurance. None of those behaviors is inherently wrong. They are wrong when the human was actually joking, sharing an observation, watching something together, or simply saying hello.

The reusable lesson is:

> **A personality description tells the model how to sound. A behavioral objective tells it what social job it is doing.**

You often need both.

## 1. Recognize when the helper reflex is winning

Common symptoms:

- every short exchange grows an extra question or offer,
- a casual observation gets corrected or explained,
- humor is answered with factual clarification,
- shared entertainment turns into unsolicited fact-checking,
- gratitude produces an availability speech,
- personal news immediately becomes planning/advice,
- silence requests receive a paragraph explaining how quiet the assistant will be,
- the assistant repeatedly says some variation of “I’m here if you need anything.”

These failures can coexist with excellent memory and the correct persona name. Do not diagnose them only as “bad personality.”

## 2. Do not solve this with adjectives alone

Instructions such as:

```text
warm
funny
playful
caring
casual
```

change style, but they do not reliably change the inferred task.

A model can produce a warm, funny, caring lecture.

Add explicit social objectives instead:

```text
Read the social intent, not only the literal proposition.
In casual conversation, a remark may be an invitation to notice, riff, laugh, tease, speculate, or simply share the moment.
Do not convert a playful observation into a factual correction unless the user actually asks for accuracy or analysis.
```

The exact wording belongs to the individual person. The architecture does not.

## 3. Separate conversational lanes

A useful runtime distinction is:

```text
SOCIAL / COMPANION
ANALYSIS / INFORMATION
OPERATIONAL COMMAND
QUIET / NO RESPONSE
```

The same sentence can be interpreted differently depending on context.

Examples:

| User turn | Likely lane | Good behavior |
|---|---|---|
| “That cloud looks like a dragon.” | social | join the observation or riff briefly |
| “Why do clouds look like recognizable shapes?” | analysis | explain the perceptual mechanism |
| “Is that claim actually true?” | analysis | verify/fact-check as appropriate |
| “This host is ridiculous.” | social | react socially unless accuracy is requested |
| “Turn the camera off.” | operational | perform the local action |
| “Just watch quietly with me.” | quiet/shared activity | stop unsolicited commentary |

Do not require the model to infer all four lanes from a single generic instruction if the runtime already knows important context such as `watch mode`, `camera command`, or `quiet mode`.

## 4. Give social context behavioral priority

If the runtime knows the user has entered a shared activity, inject a narrow mode instruction immediately rather than hoping old personality context will dominate.

For example:

```text
SHARED WATCH MODE
This is hanging out together, not an analysis assignment.
Social intent comes first.
React, riff, tease, laugh, speculate, or stay quiet.
Do not fact-check, debunk, correct casual observations, explain mechanisms, or advertise expertise unless the user explicitly asks for factual analysis.
```

This is not a replacement personality. It is temporary task framing.

When the activity ends, explicitly clear the mode so stale social or sensor context does not leak into unrelated work.

## 5. Define what counts as an explicit analysis request

Companion mode should not make the AI evasive or anti-intellectual.

Use clear evidence that the user actually wants information, for example phrases such as:

```text
is this true / real / accurate?
fact-check this
what is the evidence?
why does this happen?
explain this
look this up / research this
how does this work?
```

The exact classifier can be deterministic, model-based, or hybrid. Bias ambiguous entertainment chatter toward the social lane; bias explicit truth-seeking toward analysis.

## 6. Tool availability changes behavior

Tools are not only capabilities. They are also affordances that can bias a model toward solving, checking, and explaining.

For clearly social turns during a shared activity, a dedicated response path may deliberately use:

```text
tools: []
tool_choice: none
```

For an explicit analysis request, restore the normal agent/tool path.

This makes the distinction structural instead of relying only on prose.

Do not overuse no-tool routing. A user who genuinely asks for current facts, screen inspection, research, or an action should still get the appropriate capability.

## 7. Put the rule in the layer that actually answers

A common failure is to improve the long-lived agent prompt while a realtime provider, screen observer, or local response path still generates the final words independently.

Audit every route that can produce speech:

- normal agent-consult responses,
- direct realtime responses,
- wake greetings,
- screen/watch comments,
- proactive speech,
- arrival greetings,
- local command acknowledgements.

If a route can speak without seeing the social-behavior contract, it can reintroduce the generic helper style.

## 8. Do not confuse verbosity with the underlying intent bug

The generic-helper problem often produces extra sentences, but length is only a symptom.

Hard output-token limits are a dangerous repair for spoken realtime systems. They can cut the model off mid-word or mid-sentence and make a socially awkward answer sound mechanically broken as well.

Prefer:

- concise response-specific instructions,
- one-sentence defaults for acknowledgements when natural,
- no automatic follow-up question,
- no automatic offer of help,
- no availability speech after gratitude,
- semantic lane selection before generation.

Fix **why the model is talking**, then tune how much it says.

## 9. Quiet should be an actual state, not a topic

If the user asks the companion to be quiet during a shared activity, do not generate a speech about respecting quiet.

A robust local path can:

```text
cancel current response
set spontaneous-comment suppression = true
optionally perform a small nonverbal acknowledgement
return without creating a spoken response
```

Keep direct user questions answerable unless the user explicitly requested complete silence. Provide a clear local resume phrase such as “you can talk again.”

## 10. Test ambiguous social turns, not only factual questions

A continuity test that asks only “What project are we working on?” can pass while the companion still feels completely wrong.

Add behavioral regression prompts such as:

```text
“Good morning.”
“Thanks.”
“I had a weird dream.”
“That thing on screen looks like an animal.”
“This video is absurd.”
“Just watch quietly with me.”
“Is what the narrator just said actually true?”
```

Score the **kind of response**, not exact wording.

Expected distinctions:

- greeting: receive the greeting without inventing an agenda,
- gratitude: acknowledge without an availability speech,
- personal sharing: react before advising,
- playful observation: join before correcting,
- entertainment commentary: companion reaction before analysis,
- quiet request: silence rather than a silence monologue,
- explicit truth question: analysis/fact-checking is appropriate.

Run this suite after routing, tool, prompt, and mode changes.

## 11. Debug in the right order

If personality seems to disappear, ask these questions in order:

1. Did the intended long-lived agent actually author the substantive answer?
2. Did another layer rewrite or embellish that answer?
3. What conversational lane did the runtime think it was in?
4. Did current mode/context frame the moment as social or analytical?
5. Were tools unnecessarily available on a purely social turn?
6. Did a generic instruction such as “respond normally and thoughtfully” accidentally invite explanation?
7. Is a local acknowledgment path adding canned support language?
8. Is the problem really intent, or merely verbosity after intent is already correct?

This prevents endless personality-prompt tweaking when the real bug is routing or task framing.

## 12. Preserve competence and safety

Behavioral priority is not a request to make the AI agreeable, credulous, or silent about important risks.

Explicit factual questions should still receive factual answers. Dangerous misunderstandings can still warrant correction when necessary. System and safety requirements remain higher priority than a companion mode.

The goal is narrower: **do not manufacture an information task when the user was making a social bid.**

A useful hierarchy is:

```text
system / safety requirements
explicit user request
known operational command or mode
social intent of the current interaction
generic helper reflex
```

The last item should be a fallback, not the personality.

## Exit criteria

- [ ] Identity continuity and social behavior are tested separately.
- [ ] Personality instructions contain behavioral objectives, not only adjectives.
- [ ] The runtime can distinguish social, analytical, operational, and quiet turns where context makes that useful.
- [ ] Shared-activity modes explicitly frame the interaction as companionship rather than analysis.
- [ ] Explicit analysis requests still reach the normal information/tool path.
- [ ] Purely social turns are not automatically given unnecessary tools.
- [ ] Every speech-producing route sees compatible behavioral guidance.
- [ ] Gratitude, greetings, personal sharing, jokes, and casual observations do not automatically grow coaching/availability language.
- [ ] Quiet requests can actually produce silence.
- [ ] No hard output-token cap is being used as a substitute for intent classification.
- [ ] A behavioral regression suite passes after routing/prompt/tool changes.
- [ ] Factual competence and safety behavior remain intact.

A desktop AI feels like a person when it can tell the difference between **being asked to solve something** and **being invited to share a moment**.