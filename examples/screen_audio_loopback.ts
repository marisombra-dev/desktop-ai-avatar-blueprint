// Sanitized Windows/Electron pattern for tying system audio to Screen privacy.
// This is intentionally split into main-process and renderer concepts in one file.
// Adapt it to your own IPC/preload types rather than importing this file directly.

import { desktopCapturer, screen, session } from 'electron';

export function installScreenAudioLoopback(isScreenOn: () => boolean): void {
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    const frameUrl = request.frame?.url ?? '';
    const trusted = request.securityOrigin.startsWith('file://')
      || request.securityOrigin.startsWith('http://localhost:')
      || frameUrl.startsWith('file://')
      || frameUrl.startsWith('http://localhost:');

    if (!trusted || !isScreenOn()) {
      callback({});
      return;
    }

    const display = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 0, height: 0 },
      fetchWindowIcons: false,
    });
    const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0];
    callback(source ? { video: source, audio: 'loopback' } : {});
  }, { useSystemPicker: false });
}
function float32ToPcm16Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }

  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export type ScreenAudioBridge = {
  pushPcm: (input: { dataBase64: string; sampleRate: number }) => Promise<void>;
};

export type ScreenAudioCapture = {
  stop: () => Promise<void>;
};

export async function startScreenAudioCapture(
  bridge: ScreenAudioBridge,
  shouldSuppress: () => boolean,
): Promise<ScreenAudioCapture> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error('Windows did not provide a system-audio loopback track.');
  }

  // Visual screen frames are captured separately with desktopCapturer.
  stream.getVideoTracks().forEach((track) => track.stop());

  const context = new AudioContext();
  if (context.state === 'suspended') await context.resume();
  const source = context.createMediaStreamSource(new MediaStream([audioTrack]));

  // ScriptProcessorNode is a simple known-good pattern. Prefer AudioWorklet in new code.
  const processor = context.createScriptProcessor(4096, 1, 1);
  const sink = context.createGain();
  sink.gain.value = 0;

  processor.onaudioprocess = (event) => {
    if (shouldSuppress()) return; // e.g. assistant is currently speaking
    const samples = event.inputBuffer.getChannelData(0);
    if (!samples.length) return;
    const dataBase64 = float32ToPcm16Base64(samples);
    void bridge.pushPcm({ dataBase64, sampleRate: context.sampleRate }).catch(() => undefined);
  };

  source.connect(processor);
  processor.connect(sink);
  sink.connect(context.destination);

  return {
    stop: async () => {
      processor.onaudioprocess = null;
      source.disconnect();
      processor.disconnect();
      sink.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      await context.close().catch(() => undefined);
    },
  };
}
