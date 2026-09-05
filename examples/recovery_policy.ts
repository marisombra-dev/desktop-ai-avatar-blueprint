export type RecoverySubsystem =
  | 'avatar-runtime'
  | 'overlay-sync'
  | 'wake-word'
  | 'screen-audio'
  | 'gateway';

export interface RecoveryPolicy {
  maxAttempts: number;
  windowMs: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface RecoveryPlan {
  allowed: boolean;
  attempt: number;
  delayMs: number;
  recentAttempts: number[];
}

export const policies: Record<RecoverySubsystem, RecoveryPolicy> = {
  'avatar-runtime': { maxAttempts: 3, windowMs: 300_000, baseDelayMs: 1_500, maxDelayMs: 8_000 },
  'overlay-sync': { maxAttempts: 3, windowMs: 300_000, baseDelayMs: 1_000, maxDelayMs: 6_000 },
  'wake-word': { maxAttempts: 4, windowMs: 120_000, baseDelayMs: 1_000, maxDelayMs: 6_000 },
  'screen-audio': { maxAttempts: 3, windowMs: 120_000, baseDelayMs: 750, maxDelayMs: 5_000 },
  gateway: { maxAttempts: 3, windowMs: 600_000, baseDelayMs: 3_000, maxDelayMs: 30_000 },
};

export function planRecovery(
  attempts: number[],
  now: number,
  policy: RecoveryPolicy,
): RecoveryPlan {
  const recentAttempts = attempts.filter((at) => now - at < policy.windowMs);
  const attempt = recentAttempts.length + 1;
  const delayMs = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * 2 ** Math.max(0, attempt - 1),
  );
  return {
    allowed: attempt <= policy.maxAttempts,
    attempt,
    delayMs,
    recentAttempts,
  };
}

export function shouldRestartScreenAudio(screenAuthorized: boolean): boolean {
  return screenAuthorized;
}
