import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type MobileScope =
  | 'presence.read'
  | 'conversation.prompt'
  | 'computer.approve'
  | 'agent.stop'
  | 'haptic.receive';

export interface MobilePairingOffer {
  id: string;
  /** Share only inside the QR URL fragment. Never send in an HTTP query string. */
  secret: string;
  expiresAt: number;
  scopes: MobileScope[];
}

export interface MobileSession {
  id: string;
  scopes: MobileScope[];
  createdAt: number;
  expiresAt: number;
}

interface StoredMobileSession extends MobileSession {
  tokenHash: string;
}

interface CommandReceipt {
  id: string;
  tokenHash: string;
  expiresAt: number;
  outcome?: unknown;
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function normalizeScopes(scopes: readonly MobileScope[]): MobileScope[] {
  return [...new Set(scopes)].sort();
}

/**
 * Local pairing authority inspired by Lume's useful boundaries:
 * short-lived one-use offers, fragment secrets, scoped mobile credentials,
 * hashed-at-rest bearer tokens, and replay-safe command IDs.
 *
 * Transport encryption is still a separate responsibility.
 */
export class MobilePairingGate {
  private readonly offers = new Map<string, MobilePairingOffer>();
  private readonly sessions = new Map<string, StoredMobileSession>();
  private readonly commands = new Map<string, CommandReceipt>();

  createOffer(
    scopes: readonly MobileScope[],
    options: { now?: number; ttlMs?: number } = {},
  ): MobilePairingOffer {
    const now = options.now ?? Date.now();
    const ttlMs = Math.max(30_000, Math.min(10 * 60_000, options.ttlMs ?? 5 * 60_000));
    const offer: MobilePairingOffer = {
      id: randomBytes(12).toString('base64url'),
      secret: randomBytes(32).toString('base64url'),
      expiresAt: now + ttlMs,
      scopes: normalizeScopes(scopes),
    };
    this.offers.set(offer.id, structuredClone(offer));
    return offer;
  }

  pairingUrl(baseUrl: string, offer: MobilePairingOffer): string {
    const url = new URL(baseUrl);
    url.search = '';
    url.hash = `pair=${encodeURIComponent(offer.id)}.${encodeURIComponent(offer.secret)}`;
    return url.toString();
  }

  redeem(
    offerId: string,
    secret: string,
    requestedScopes: readonly MobileScope[],
    options: { now?: number; sessionTtlMs?: number } = {},
  ): { session: MobileSession; token: string } {
    const now = options.now ?? Date.now();
    const offer = this.offers.get(offerId);
    this.offers.delete(offerId); // every redemption attempt consumes the offer
    if (!offer || offer.expiresAt < now || !sameHex(hash(secret), hash(offer.secret))) {
      throw new Error('Pairing offer is invalid or expired.');
    }

    const allowed = new Set(offer.scopes);
    const scopes = normalizeScopes(requestedScopes);
    if (scopes.some((scope) => !allowed.has(scope))) {
      throw new Error('Requested mobile scope was not offered.');
    }

    const token = randomBytes(32).toString('base64url');
    const session: MobileSession = {
      id: randomBytes(16).toString('base64url'),
      scopes,
      createdAt: now,
      expiresAt: now + Math.max(60_000, options.sessionTtlMs ?? 30 * 24 * 60 * 60_000),
    };
    this.sessions.set(session.id, { ...session, tokenHash: hash(token) });
    return { session: structuredClone(session), token };
  }

  authorize(sessionId: string, token: string, scope: MobileScope, now = Date.now()): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt <= now || !session.scopes.includes(scope)) return false;
    return sameHex(hash(token), session.tokenHash);
  }

  revoke(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Admit one state-changing command. Duplicate IDs return the recorded outcome
   * instead of authorizing a second side effect.
   */
  admitCommand(input: {
    sessionId: string;
    token: string;
    scope: MobileScope;
    commandId: string;
    expiresAt: number;
    now?: number;
  }): { admitted: boolean; duplicate: boolean; outcome?: unknown } {
    const now = input.now ?? Date.now();
    this.prune(now);
    if (input.expiresAt <= now || input.expiresAt - now > 5 * 60_000) {
      return { admitted: false, duplicate: false };
    }
    if (!this.authorize(input.sessionId, input.token, input.scope, now)) {
      return { admitted: false, duplicate: false };
    }
    if (!/^[A-Za-z0-9._:-]{8,160}$/.test(input.commandId)) {
      return { admitted: false, duplicate: false };
    }
    const session = this.sessions.get(input.sessionId)!;
    const existing = this.commands.get(input.commandId);
    if (existing) {
      if (!sameHex(existing.tokenHash, session.tokenHash)) {
        return { admitted: false, duplicate: true };
      }
      return {
        admitted: false,
        duplicate: true,
        ...(existing.outcome !== undefined ? { outcome: structuredClone(existing.outcome) } : {}),
      };
    }
    this.commands.set(input.commandId, {
      id: input.commandId,
      tokenHash: session.tokenHash,
      expiresAt: input.expiresAt,
    });
    return { admitted: true, duplicate: false };
  }

  recordCommandOutcome(commandId: string, outcome: unknown): boolean {
    const receipt = this.commands.get(commandId);
    if (!receipt) return false;
    receipt.outcome = structuredClone(outcome);
    return true;
  }

  private prune(now: number): void {
    for (const [id, offer] of this.offers) if (offer.expiresAt <= now) this.offers.delete(id);
    for (const [id, session] of this.sessions) if (session.expiresAt <= now) this.sessions.delete(id);
    for (const [id, command] of this.commands) if (command.expiresAt <= now) this.commands.delete(id);
  }
}
