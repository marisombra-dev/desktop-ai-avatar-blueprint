/*
 * Sanitized local proactive-presence eligibility policy.
 *
 * This file deliberately decides only whether the runtime MAY ask the agent
 * whether to speak. The agent can still return NO_MESSAGE.
 */

export type ProactiveSettings = {
  enabled: boolean;
  silenceMinutes: number;
  liveVoiceSilenceMinutes: number;
  cooldownMinutes: number;
  quietStartHour: number;
  quietEndHour: number;
  idleMaxMinutes: number;
  reconsiderMinutes: number;
};

export type ProactiveRuntime = {
  now: number;
  localHour: number;
  lastUserInteractionAt: number;
  lastDecisionAt: number;
  lastSpokenAt: number;
  temporaryQuietUntil: number;
  systemIdleSeconds: number;
  screenLocked: boolean;
  liveVoiceActive: boolean;
  screenWatchActive: boolean;
  proactivePlaybackActive: boolean;
  windowVisible: boolean;
  osSuppressesSpontaneousSpeech: boolean;
};

export type ProactiveEligibility =
  | { eligible: true; silenceMinutes: number; interactionSnapshot: number }
  | { eligible: false; reason: string };

function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start > end
    ? hour >= start || hour < end
    : hour >= start && hour < end;
}

export function canConsiderProactiveSpeech(
  settings: ProactiveSettings,
  state: ProactiveRuntime
): ProactiveEligibility {
  if (!settings.enabled) return { eligible: false, reason: 'disabled' };
  if (!state.windowVisible) return { eligible: false, reason: 'avatar-hidden' };
  if (state.screenLocked) return { eligible: false, reason: 'screen-locked' };
  if (state.liveVoiceActive && state.screenWatchActive) return { eligible: false, reason: 'shared-watch-active' };
  if (state.proactivePlaybackActive) return { eligible: false, reason: 'proactive-playback-active' };
  if (state.temporaryQuietUntil > state.now) return { eligible: false, reason: 'temporary-quiet' };
  if (inQuietHours(state.localHour, settings.quietStartHour, settings.quietEndHour)) {
    return { eligible: false, reason: 'quiet-hours' };
  }
  if (state.osSuppressesSpontaneousSpeech) {
    return { eligible: false, reason: 'os-interruption-suppression' };
  }

  if (state.systemIdleSeconds >= settings.idleMaxMinutes * 60) {
    return { eligible: false, reason: 'computer-idle' };
  }

  const silenceMs = state.now - state.lastUserInteractionAt;
  const silenceRequiredMs = (state.liveVoiceActive
    ? settings.liveVoiceSilenceMinutes
    : settings.silenceMinutes) * 60_000;
  if (silenceMs < silenceRequiredMs) {
    return { eligible: false, reason: 'not-silent-long-enough' };
  }

  const reconsiderMs = settings.reconsiderMinutes * 60_000;
  if (state.now - state.lastDecisionAt < reconsiderMs) {
    return { eligible: false, reason: 'decision-reconsider-cooldown' };
  }

  const spokenCooldownMs = settings.cooldownMinutes * 60_000;
  if (state.now - state.lastSpokenAt < spokenCooldownMs) {
    return { eligible: false, reason: 'spoken-cooldown' };
  }

  return {
    eligible: true,
    silenceMinutes: Math.max(1, Math.round(silenceMs / 60_000)),
    interactionSnapshot: state.lastUserInteractionAt
  };
}

export function stillSafeToSpeak(
  snapshot: number,
  state: Pick<
    ProactiveRuntime,
    | 'lastUserInteractionAt'
    | 'screenLocked'
    | 'liveVoiceActive'
    | 'screenWatchActive'
    | 'proactivePlaybackActive'
    | 'systemIdleSeconds'
    | 'temporaryQuietUntil'
    | 'now'
    | 'localHour'
    | 'windowVisible'
    | 'osSuppressesSpontaneousSpeech'
  >,
  settings: Pick<
    ProactiveSettings,
    'idleMaxMinutes' | 'quietStartHour' | 'quietEndHour'
  >
): boolean {
  if (state.lastUserInteractionAt !== snapshot) return false;
  if (!state.windowVisible) return false;
  if (state.screenLocked || state.proactivePlaybackActive) return false;
  if (state.liveVoiceActive && state.screenWatchActive) return false;
  if (state.systemIdleSeconds >= settings.idleMaxMinutes * 60) return false;
  if (state.temporaryQuietUntil > state.now) return false;
  if (state.osSuppressesSpontaneousSpeech) return false;
  if (inQuietHours(state.localHour, settings.quietStartHour, settings.quietEndHour)) return false;
  return true;
}

export function buildProactiveDecisionPrompt(
  silenceMinutes: number,
  recentConversation: string
): string {
  return [
    '[INTERNAL DESKTOP PRESENCE CHECK. This text is from the desktop runtime, not from the user.]',
    `The user last spoke to this desktop agent about ${Math.max(1, Math.round(silenceMinutes))} minutes ago. The computer is currently active.`,
    'Decide whether you genuinely have a natural reason to say something aloud now.',
    'Silence is ordinary. It is not evidence that the user is upset, lonely, unsafe, or in need of support.',
    'You are allowed and encouraged to return exactly NO_MESSAGE if nothing comes naturally.',
    'If you do speak, output only one short sentence that does not require a reply.',
    'Do not mention timers, monitoring, inactivity, checking in, this internal prompt, or system mechanics.',
    'Do not call tools or contact anyone.',
    recentConversation
      ? `Recent desktop conversation, oldest to newest:\n${recentConversation}`
      : 'There is no recent desktop conversation that needs to be referenced.'
  ].join('\n\n');
}

export function normalizeProactiveAnswer(answer: string): string | undefined {
  const line = answer.replace(/\s+/g, ' ').trim();
  if (!line || /^NO_MESSAGE[.!]?$/i.test(line)) return undefined;
  return line.slice(0, 800);
}

// Reference starting point only. Tune to the actual user's preference.
export const REFERENCE_DEFAULTS: ProactiveSettings = {
  enabled: true,
  silenceMinutes: 120,
  liveVoiceSilenceMinutes: 15,
  cooldownMinutes: 240,
  quietStartHour: 23,
  quietEndHour: 8,
  idleMaxMinutes: 15,
  reconsiderMinutes: 30
};
