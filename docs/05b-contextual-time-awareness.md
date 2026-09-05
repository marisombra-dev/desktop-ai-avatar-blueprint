# Contextual local-time awareness

A persistent desktop AI should know what **today**, **tomorrow**, **this morning**, and **later** mean without forcing the user to restate the date and time.

The reference build supplies a tiny runtime-generated time block to ordinary agent consults, proactive decisions, return greetings, and memory curation.

The core rules are:

> **Use the computer's actual local clock and timezone, but do not turn the assistant into a talking clock.**
>
> **Treat runtime date/time/daypart as authoritative facts, not suggestions the model may contradict.**

This is local context, not a new model call and not a calendar system.

## 1. Resolve the system timezone dynamically

Do not hardcode the machine's current country or city. A desktop companion may travel with the user.

In Node/Electron, the runtime can normally resolve the operating-system timezone through `Intl.DateTimeFormat().resolvedOptions().timeZone`.

The reference build previously had one memory-date helper fixed to a specific timezone. That worked until the computer moved. The helper now follows the system timezone instead.
## 2. Build one bounded factual context block

The injected block should contain only facts the runtime can know reliably:

```text
[INTERNAL LOCAL TIME CONTEXT]
Local date: Saturday, September 5, 2026.
Local time: 9:13 AM EDT.
System timezone: America/New_York. Current daypart: morning.
Treat the date, time, timezone, and daypart above as authoritative. Never contradict them with an incompatible time-of-day greeting or relative-time claim.
Use this to interpret relative time naturally.
Do not mention the clock/date unless relevant.
[END LOCAL TIME CONTEXT]
```

Useful fields are:

- weekday and full local date,
- local clock time,
- resolved system timezone,
- broad daypart such as morning / afternoon / evening / late night.

Avoid injecting a giant locale profile or location guess. Time context should stay factual and small.
## 3. Put time context at the decision boundaries that need it

The same small block can be reused in several places:

- **ordinary voice consults** so relative-time language is grounded,
- **proactive speech decisions** so “later today” or “after dinner” can become timely for the right reason,
- **desk-return greetings** so an unfinished thread can resume with the right temporal frame,
- **memory curation** so “tomorrow” or “yesterday” can be interpreted when a durable note is written.

Do not make time context itself a reason to speak proactively.

For example, knowing that it is 10:30 PM does not justify saying “you should go to bed” unless the user has established that preference or asked for that kind of help.

Likewise, never invent appointments, reminders, or deadlines from local-time context alone.

## 4. Add a deterministic guard for time-of-day greetings

Prompt context is necessary but not sufficient. A model can still improvise a phrase such as `Good morning` while the authoritative runtime block says `Current daypart: afternoon`.

For user-visible greetings, validate explicit time-of-day wording before playback. If `good morning`, `good afternoon`, or `good evening` contradicts the current runtime daypart, reject that wording and use a neutral fallback such as `Hey, welcome back.`

This is not a replacement for model reasoning. It is a small factual invariant: the model may choose style, but it cannot overrule the clock. See `examples/contextual_time.ts` for a sanitized helper.

## 5. Use dynamic timezone dates for durable memory

If shared memory entries are date-stamped, generate that date from the same resolved system timezone.

Do not let conversation use one timezone while the memory writer silently uses another. That creates subtle errors around midnight and becomes especially confusing after travel.

A compact helper can expose both:

```ts
resolvedSystemTimeZone()
localDateKey()
buildLocalTimeContext()
```

The date-key helper is useful for Markdown headings such as:

```text
## 2026-09-05 — Shared activity recap
```

See `examples/contextual_time.ts` for a sanitized implementation pattern.

## 6. Validate against both Windows and Node/Electron

Before trusting the feature, compare what the operating system reports with what the JavaScript runtime resolves.

A good smoke test records:

- the Windows local timestamp,
- the Windows timezone identifier,
- the Node/Electron IANA timezone,
- one formatted local date/time string.

The names may differ across platforms. On Windows, the OS may expose a Windows timezone name while Node resolves the equivalent IANA zone. What matters is that the actual local date/time agrees.

Also test a date near midnight in a second timezone so the durable-memory date helper cannot accidentally use the host process's default assumptions.
## Exit criteria

- [ ] Ordinary consults receive the actual current local date/time/timezone.
- [ ] Relative-time language such as today/tomorrow/yesterday is grounded by runtime facts.
- [ ] Proactive/arrival decisions receive time context but time alone cannot trigger speech.
- [ ] Explicit time-of-day greetings are checked against the authoritative runtime daypart before playback.
- [ ] Memory curation receives the same temporal frame.
- [ ] Durable memory dates follow the system timezone instead of a hardcoded location.
- [ ] Moving/changing the computer timezone updates behavior without editing source code.
- [ ] The assistant does not mention the clock/date unless it is relevant.

**Reference status:** dynamic local-time context, timezone-aware memory dates, authoritative daypart instructions, a deterministic time-of-day greeting guard, TypeScript, production build, and runtime restart were verified in the September 5, 2026 reference build.
