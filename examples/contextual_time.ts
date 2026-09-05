export function resolvedSystemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  } catch {
    return 'local';
  }
}

function zoneOptions(timeZone: string): Intl.DateTimeFormatOptions {
  return timeZone === 'local' ? {} : { timeZone };
}

function hourInZone(date: Date, timeZone: string): number {
  try {
    const text = new Intl.DateTimeFormat('en-US', {
      ...zoneOptions(timeZone), hour: '2-digit', hourCycle: 'h23',
    }).format(date);
    const hour = Number.parseInt(text, 10);
    return Number.isFinite(hour) ? hour : date.getHours();
  } catch {
    return date.getHours();
  }
}
export function localDateKey(
  date = new Date(),
  timeZone = resolvedSystemTimeZone(),
): string {
  return new Intl.DateTimeFormat('en-CA', {
    ...zoneOptions(timeZone),
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function daypartForHour(hour: number): string {
  if (hour < 5) return 'late night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'late evening';
}

export function localDaypart(
  date = new Date(),
  timeZone = resolvedSystemTimeZone(),
): string {
  return daypartForHour(hourInZone(date, timeZone));
}

export function timeOfDayGreetingMatches(
  text: string,
  date = new Date(),
  timeZone = resolvedSystemTimeZone(),
): boolean {
  const normalized = text.toLowerCase();
  const mentionsMorning = /\bgood morning\b/.test(normalized);
  const mentionsAfternoon = /\bgood afternoon\b/.test(normalized);
  const mentionsEvening = /\bgood evening\b/.test(normalized);
  if (!mentionsMorning && !mentionsAfternoon && !mentionsEvening) return true;
  const part = localDaypart(date, timeZone);
  if (mentionsMorning) return part === 'morning';
  if (mentionsAfternoon) return part === 'afternoon';
  return part === 'evening' || part === 'late evening';
}

export function buildLocalTimeContext(
  date = new Date(),
  timeZone = resolvedSystemTimeZone(),
): string {
  const opts = zoneOptions(timeZone);
  const localDate = new Intl.DateTimeFormat('en-US', {
    ...opts, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
  const localTime = new Intl.DateTimeFormat('en-US', {
    ...opts, hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);

  return [
    '[INTERNAL LOCAL TIME CONTEXT. Authoritative runtime-provided fact, not new user speech.]',
    `Local date: ${localDate}.`,
    `Local time: ${localTime}.`,
    `System timezone: ${timeZone}. Current daypart: ${localDaypart(date, timeZone)}.`,
    'Treat the date, time, timezone, and daypart above as authoritative. Never contradict them with an incompatible time-of-day greeting or relative-time claim.',
    'Use this to interpret today, tonight, tomorrow, yesterday, and later naturally.',
    'Do not mention the clock/date unless relevant. Never invent reminders or deadlines from time alone.',
    '[END LOCAL TIME CONTEXT]',
  ].join('\n');
}
