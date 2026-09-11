// Blueprint example: route a single Screen privacy/control state to the visual
// source that matches the current presentation mode.
//
// Close View -> the user's desktop display.
// Wide View  -> the avatar's own Unreal/living-environment window.
//
// The continuous watcher and one-shot describe/look path should call the same
// capture function so they cannot silently observe different worlds.

import { desktopCapturer, screen } from 'electron';
import type { NativeImage } from 'electron';

type PresentationMode = 'close' | 'wide';
let presentationMode: PresentationMode = 'close';
let captureGeneration = 0;

export function setPresentationMode(mode: PresentationMode): void {
  if (mode === presentationMode) return;
  presentationMode = mode;
  captureGeneration += 1; // watcher can use this to invalidate stale comparison/history state
}

export function getCaptureGeneration(): number {
  return captureGeneration;
}

async function captureCloseView(): Promise<NativeImage> {
  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 800, height: 450 },
    fetchWindowIcons: false,
  });
  const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0];
  if (!source || source.thumbnail.isEmpty()) throw new Error('Desktop capture unavailable.');
  return source.thumbnail;
}

async function captureWideView(): Promise<NativeImage> {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1280, height: 720 },
    fetchWindowIcons: false,
  });

  // Use a stable title/class/process discriminator from your own runtime rather
  // than a user-visible label that may change. Keep the matcher narrow enough
  // that it cannot accidentally select the Electron controls window.
  const source = sources.find((item) => /DesktopAvatar.*Development|Living Environment/i.test(item.name));
  if (!source || source.thumbnail.isEmpty()) throw new Error('Wide View capture unavailable.');
  return source.thumbnail;
}

export async function captureCurrentVisualWorld(): Promise<NativeImage> {
  return presentationMode === 'wide' ? captureWideView() : captureCloseView();
}

// When presentationMode changes, also clear model-facing stale context. For
// example, send a system note equivalent to:
//
//   "The visual world changed from Close View to Wide View. Earlier screen
//    summaries belong to the previous view and are no longer current."
//
// Semantic control guidance should likewise remain explicit:
//   Camera = the human user's webcam / physical surroundings.
//   Screen in Close View = the human user's desktop.
//   Screen in Wide View = the avatar's own Unreal room/window.
//
// That prevents "look out your window" from being misrouted to the webcam.
