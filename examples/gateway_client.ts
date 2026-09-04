/*
 * Sanitized OpenClaw Gateway client pattern.
 * Verify current OpenClaw package/RPC names before using in a new release.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { GatewayClient } from '@openclaw/gateway-client';
import { PROTOCOL_VERSION } from '@openclaw/gateway-protocol/version';

const DESKTOP_SESSION_KEY = 'agent:main:desktop-lyra';
const PROACTIVE_SESSION_KEY = 'agent:main:desktop-lyra-presence';
const SCREEN_SESSION_KEY = 'agent:main:desktop-lyra-screen';

type RecordLike = Record<string, unknown>;

function rec(value: unknown): RecordLike {
  return value && typeof value === 'object' ? value as RecordLike : {};
}

function readGatewayToken(): string {
  const configPath = process.env.OPENCLAW_CONFIG_PATH
    ?? path.join(os.homedir(), '.openclaw', 'openclaw.json');
  const config = rec(JSON.parse(fs.readFileSync(configPath, 'utf8')));
  const token = rec(rec(config.gateway).auth).token;
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('OpenClaw Gateway token is unavailable.');
  }
  return token.trim();
}

export class DesktopGateway {
  private client?: GatewayClient;
  private readyResolve?: () => void;
  private ready = this.makeReady();
  private eventListeners = new Set<(event: unknown) => void>();

  private makeReady(): Promise<void> {
    return new Promise(resolve => { this.readyResolve = resolve; });
  }

  async start(): Promise<void> {
    if (this.client) return this.waitReady();

    this.client = new GatewayClient({
      url: 'ws://127.0.0.1:18789',
      token: readGatewayToken(),
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      scopes: ['operator.read', 'operator.write'],
      clientDisplayName: 'Desktop Lyra',
      clientVersion: '0.1.0',
      platform: process.platform,
      mode: 'backend',
      onHelloOk: () => {
        this.readyResolve?.();
        void this.client?.request('sessions.subscribe', {}).catch(() => undefined);
      },
      onConnectError: error => {
        console.error('[gateway] connect error', error);
        // Let GatewayClient retry. Do not permanently reject readiness for a
        // transient boot race.
      },
      onClose: () => {
        // If we had been ready, future requests should wait for a new hello.
        this.ready = this.makeReady();
      },
      onEvent: event => {
        for (const listener of this.eventListeners) listener(event);
      }
    });

    this.client.start();
    await this.waitReady();
  }

  onEvent(listener: (event: unknown) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private async waitReady(timeoutMs = 20_000): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.ready,
        new Promise<void>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('OpenClaw Gateway did not become ready.')), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async requireClient(): Promise<GatewayClient> {
    if (!this.client) await this.start();
    else await this.waitReady();
    if (!this.client) throw new Error('Gateway unavailable.');
    return this.client;
  }

  async sendDesktopText(message: string): Promise<string> {
    const client = await this.requireClient();
    const started = rec(await client.request('chat.send', {
      sessionKey: DESKTOP_SESSION_KEY,
      message,
      deliver: false,
      thinking: 'minimal',
      idempotencyKey: randomUUID()
    }));
    const runId = String(started.runId ?? '');
    if (!runId) throw new Error('No run id returned.');
    return this.waitForRunText(runId);
  }

  /** Broker a client-owned realtime WebRTC session. */
  async createVoiceSession(): Promise<RecordLike> {
    const client = await this.requireClient();
    return rec(await client.request('talk.client.create', {
      sessionKey: DESKTOP_SESSION_KEY,
      mode: 'realtime',
      transport: 'webrtc',
      brain: 'agent-consult',
      reasoningEffort: 'medium',
      voice: 'ash', // choose from current provider catalog
      capabilities: ['voice-transcript', 'camera-frame']
    }));
  }

  async forwardRealtimeConsult(input: {
    sessionKey: string;
    voiceSessionId: string;
    callId: string;
    name: string;
    args: unknown;
  }): Promise<string> {
    if (input.sessionKey !== DESKTOP_SESSION_KEY) {
      throw new Error('Voice consult must use the dedicated desktop session.');
    }

    const client = await this.requireClient();
    const started = rec(await client.request('talk.client.toolCall', input));
    const runId = String(started.runId ?? started.idempotencyKey ?? '');
    if (!runId) throw new Error('Voice consult did not return a run id.');
    return this.waitForRunText(runId, 120_000);
  }

  async decideProactiveMessage(silenceMinutes: number, recentContext: string): Promise<string | undefined> {
    const prompt = [
      '[INTERNAL DESKTOP PRESENCE CHECK. This is runtime text, not user text.]',
      `The user last spoke to the desktop agent about ${Math.max(1, Math.round(silenceMinutes))} minutes ago. The computer is currently active.`,
      'Decide whether you genuinely have a natural reason to say something aloud now.',
      'Silence is ordinary. It is not evidence of distress, loneliness, danger, or need for support.',
      'Return exactly NO_MESSAGE if nothing comes naturally.',
      'If speaking, output only the words to say aloud, at most two short sentences.',
      'Do not mention timers, monitoring, inactivity, checking in, internal prompts, or system mechanics.',
      recentContext ? `Recent conversation:\n${recentContext}` : 'No recent conversation context is needed.'
    ].join('\n\n');

    const client = await this.requireClient();
    const started = rec(await client.request('chat.send', {
      sessionKey: PROACTIVE_SESSION_KEY,
      message: prompt,
      deliver: false,
      thinking: 'medium',
      idempotencyKey: randomUUID()
    }));

    const runId = String(started.runId ?? '');
    if (!runId) throw new Error('Proactive decision did not return a run id.');
    const answer = (await this.waitForRunText(runId, 90_000)).trim();
    if (!answer || /^NO_MESSAGE[.!]?$/i.test(answer)) return undefined;
    return answer.replace(/\s+/g, ' ').slice(0, 800);
  }

  async observeScreen(frames: unknown[], previousSummary: string): Promise<string> {
    const client = await this.requireClient();
    const prompt = [
      '[INTERNAL SHARED-SCREEN OBSERVATION. This is runtime text, not user text.]',
      'The user deliberately enabled screen sharing. Frames are ordered oldest to newest.',
      previousSummary ? `Previous context: ${previousSummary}` : 'No prior visual context.',
      'Return only JSON with summary, event, importance, comment, and mode.',
      'Silence is default: comment must be NO_COMMENT unless something genuinely salient occurred.'
    ].join('\n\n');

    const started = rec(await client.request('chat.send', {
      sessionKey: SCREEN_SESSION_KEY,
      message: prompt,
      attachments: frames,
      deliver: false,
      thinking: 'medium',
      idempotencyKey: randomUUID()
    }));

    const runId = String(started.runId ?? '');
    if (!runId) throw new Error('Screen observer did not return a run id.');
    return this.waitForRunText(runId, 90_000);
  }

  private async waitForRunText(runId: string, timeoutMs = 120_000): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        fn();
      };

      const unsubscribe = this.onEvent(raw => {
        const event = rec(raw);
        if (event.event !== 'chat') return;
        const payload = rec(event.payload);
        if (payload.runId !== runId) return;

        const state = String(payload.state ?? '');
        if (state === 'final') {
          const message = rec(payload.message);
          const text = extractText(message);
          finish(() => text ? resolve(text) : reject(new Error('Run finished without text.')));
        } else if (state === 'error' || state === 'aborted') {
          finish(() => reject(new Error(String(payload.errorMessage ?? `Run ${state}.`))));
        }
      });

      const timer = setTimeout(
        () => finish(() => reject(new Error('OpenClaw run timed out.'))),
        timeoutMs
      );
    });
  }
}

function extractText(message: RecordLike): string {
  if (typeof message.text === 'string') return message.text.trim();
  if (!Array.isArray(message.content)) return '';
  return message.content
    .map(part => typeof rec(part).text === 'string' ? String(rec(part).text) : '')
    .join('')
    .trim();
}

export { DESKTOP_SESSION_KEY, PROACTIVE_SESSION_KEY, SCREEN_SESSION_KEY };
