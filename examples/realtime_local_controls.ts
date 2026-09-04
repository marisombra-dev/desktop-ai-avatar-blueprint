/*
 * Sanitized pattern for local Realtime controls.
 *
 * This is intentionally framework-agnostic glue. Adapt event names/shapes to the
 * current OpenAI Realtime API and your current OpenClaw Talk integration.
 */

type SensorKind = 'screen' | 'camera';

type ImageFrame = {
  data: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
};

type Callbacks = {
  setScreen(enabled: boolean): Promise<boolean>;
  setCamera(enabled: boolean): Promise<boolean>;
  sleep(): Promise<void>;
  captureScreen(): Promise<ImageFrame>;
  captureCamera(): ImageFrame;
};

type LocalCommand =
  | { kind: 'sleep' }
  | { kind: 'screen' | 'camera'; enabled: boolean };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function normalizeCommand(text: string, wakeName = 'lyra'): string {
  const name = wakeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(new RegExp(`^(?:(?:hey|hi)\\s+)?${name}\\s*`), '')
    .replace(new RegExp(`\\s+${name}$`), '')
    .replace(/^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?/, '')
    .trim();
}

function classifyLocalCommand(text: string, wakeName = 'lyra'): LocalCommand | undefined {
  const addressed = new RegExp(`\\b${wakeName}\\b`, 'i').test(text);
  const command = normalizeCommand(text, wakeName);

  if (
    (addressed && /^(?:(?:ok|okay|alright)\s+)?(?:thanks|thank you)(?:\s+(?:so much|very much|a lot))?$/.test(command))
    || /^(?:go back to sleep|end (?:the )?(?:voice )?(?:session|conversation))$/.test(command)
  ) return { kind: 'sleep' };

  const screenOff = /^(?:(?:stop|quit)\s+(?:watching|looking at)\s+(?:(?:my|the)\s+)?screen|(?:turn|switch)\s+(?:the\s+)?screen(?:\s+(?:sharing|awareness))?\s+off|screen(?:\s+(?:sharing|awareness))?\s+off)$/.test(command);
  if (screenOff) return { kind: 'screen', enabled: false };

  const screenOn = /^(?:(?:look at|watch|see)\s+(?:this|(?:(?:my|the)\s+)?screen)(?:\s+for a while)?|(?:turn|switch)\s+(?:the\s+)?screen(?:\s+(?:sharing|awareness))?\s+on|screen(?:\s+(?:sharing|awareness))?\s+on|watch me play(?:\s+for a while)?)$/.test(command);
  if (screenOn) return { kind: 'screen', enabled: true };

  const cameraOff = /^(?:(?:turn|switch)\s+(?:the\s+)?camera\s+off|camera\s+off|(?:stop|quit)\s+(?:using\s+)?(?:the\s+)?camera|stop looking at me)$/.test(command);
  if (cameraOff) return { kind: 'camera', enabled: false };

  const cameraOn = /^(?:(?:turn|switch)\s+(?:the\s+)?camera\s+on|camera\s+on|(?:use|enable)\s+(?:the\s+)?camera|look at me|see me)$/.test(command);
  if (cameraOn) return { kind: 'camera', enabled: true };

  return undefined;
}

export class RealtimeLocalControls {
  private toolsInstalled = false;
  private responseActive = false;
  private screenEnabled = false;
  private cameraEnabled = false;

  constructor(
    private readonly send: (event: unknown) => void,
    private readonly callbacks: Callbacks,
    private readonly wakeName = 'lyra'
  ) {}

  /** Call this from the provider's session.created event. */
  installTools(sessionValue: unknown): void {
    if (this.toolsInstalled) return;
    const session = asRecord(sessionValue);
    const existing = Array.isArray(session.tools) ? session.tools : [];

    const localTools = [
      {
        type: 'function',
        name: 'desktop_screen_control',
        description: 'Turn the locally shared screen awareness on or off.',
        parameters: {
          type: 'object',
          properties: { enabled: { type: 'boolean' } },
          required: ['enabled'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'desktop_camera_control',
        description: 'Turn the local webcam awareness on or off.',
        parameters: {
          type: 'object',
          properties: { enabled: { type: 'boolean' } },
          required: ['enabled'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'desktop_sleep',
        description: 'End this desktop voice conversation and return to wake listening.',
        parameters: { type: 'object', properties: {}, additionalProperties: false }
      }
    ];

    const names = new Set(localTools.map(t => t.name));
    const merged = existing
      .filter(tool => !names.has(String(asRecord(tool).name ?? '')))
      .concat(localTools);

    // Current Realtime API requires the session type in this update.
    this.send({
      type: 'session.update',
      session: {
        type: typeof session.type === 'string' ? session.type : 'realtime',
        tools: merged
      }
    });

    this.toolsInstalled = true;
  }

  /** Call when the provider says response.created / response.done / cancelled. */
  setResponseActive(active: boolean): void {
    this.responseActive = active;
  }

  setScreenEnabled(enabled: boolean): void {
    const wasEnabled = this.screenEnabled;
    this.screenEnabled = enabled;
    if (wasEnabled && !enabled) {
      this.sendContext('[SHARED SCREEN ENDED. Do not treat earlier screen information as current.]');
    }
  }

  setCameraEnabled(enabled: boolean): void {
    const wasEnabled = this.cameraEnabled;
    this.cameraEnabled = enabled;
    if (wasEnabled && !enabled) {
      this.sendContext('[CAMERA ENDED. Do not treat earlier webcam information as current.]');
    }
  }

  /** Call from conversation.item.input_audio_transcription.completed. */
  async handleCompletedTranscript(text: string): Promise<boolean> {
    const command = classifyLocalCommand(text, this.wakeName);
    if (!command) return false;
    await this.execute(command, text);
    return true;
  }

  /** Also call this before forwarding an openclaw_agent_consult tool call. */
  async interceptConsult(callId: string, text: string): Promise<boolean> {
    const command = classifyLocalCommand(text, this.wakeName);
    if (!command) return false;

    if (command.kind === 'sleep') {
      this.sendFunctionOutput(callId, { result: 'Desktop voice session is ending locally.' });
      await this.callbacks.sleep();
      return true;
    }

    const ok = command.kind === 'screen'
      ? await this.callbacks.setScreen(command.enabled)
      : await this.callbacks.setCamera(command.enabled);

    this.sendFunctionOutput(callId, {
      localControl: true,
      ok,
      sensor: command.kind,
      enabled: command.enabled
    });

    if (ok && command.enabled) {
      await this.respondWithCurrentView(command.kind, text);
    } else {
      this.send({ type: 'response.create' });
    }
    return true;
  }

  async handleLocalToolCall(callId: string, name: string, args: Record<string, unknown>): Promise<boolean> {
    if (name === 'desktop_sleep') {
      this.sendFunctionOutput(callId, { ok: true, sleeping: true });
      await this.callbacks.sleep();
      return true;
    }

    if (name !== 'desktop_screen_control' && name !== 'desktop_camera_control') return false;

    const enabled = args.enabled === true;
    const kind: SensorKind = name === 'desktop_screen_control' ? 'screen' : 'camera';
    const ok = kind === 'screen'
      ? await this.callbacks.setScreen(enabled)
      : await this.callbacks.setCamera(enabled);

    this.sendFunctionOutput(callId, { ok, enabled });

    if (ok && enabled) await this.respondWithCurrentView(kind, `Look at the ${kind}.`);
    else this.send({ type: 'response.create' });

    return true;
  }

  private async execute(command: LocalCommand, spokenText: string): Promise<void> {
    if (command.kind === 'sleep') {
      this.cancelCurrentResponse();
      await this.callbacks.sleep();
      return;
    }

    const ok = command.kind === 'screen'
      ? await this.callbacks.setScreen(command.enabled)
      : await this.callbacks.setCamera(command.enabled);
    if (!ok) return;

    if (command.kind === 'screen') this.setScreenEnabled(command.enabled);
    else this.setCameraEnabled(command.enabled);

    if (command.enabled) {
      await this.respondWithCurrentView(command.kind, spokenText);
    } else {
      this.cancelCurrentResponse();
      this.sendContext(`${command.kind} awareness is now OFF. Acknowledge briefly and do not use older visual context as current.`);
      this.send({ type: 'response.create' });
    }
  }

  private cancelCurrentResponse(): void {
    if (!this.responseActive) return;
    this.send({ type: 'response.cancel' });
    this.responseActive = false;
  }

  private async respondWithCurrentView(kind: SensorKind, spokenText: string): Promise<void> {
    const hadResponse = this.responseActive;
    this.cancelCurrentResponse();
    if (hadResponse) await new Promise(resolve => setTimeout(resolve, 120));

    const content: Array<Record<string, unknown>> = [{
      type: 'input_text',
      text: `The user just said: "${spokenText}". The requested ${kind} is ON now. Inspect the fresh visual information below and respond naturally to the actual request.`
    }];

    if (kind === 'camera') {
      const frame = this.callbacks.captureCamera();
      content.push({ type: 'input_text', text: 'Webcam view:' });
      content.push({ type: 'input_image', image_url: dataUrl(frame) });
    } else {
      for (let i = 0; i < 3; i += 1) {
        const frame = await this.callbacks.captureScreen();
        content.push({ type: 'input_text', text: `Screen frame ${i + 1} of 3:` });
        content.push({ type: 'input_image', image_url: dataUrl(frame) });
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 350));
      }
    }

    this.send({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content }
    });
    this.send({ type: 'response.create' });
  }

  private sendContext(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [{ type: 'input_text', text }]
      }
    });
  }

  private sendFunctionOutput(callId: string, output: unknown): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output)
      }
    });
  }
}

function dataUrl(frame: ImageFrame): string {
  return `data:${frame.mimeType};base64,${frame.data}`;
}
