/* Electron MAIN process bounded primary-display capture pattern. */

import { desktopCapturer, screen } from 'electron';

export type ScreenFrame = {
  data: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
};

export async function capturePrimaryScreenFrame(
  screenAuthorized: boolean
): Promise<ScreenFrame> {
  if (!screenAuthorized) {
    throw new Error('Screen sharing is off.');
  }

  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 800, height: 450 },
    fetchWindowIcons: false
  });

  const source = sources.find(item => item.display_id === String(display.id))
    ?? sources[0];

  if (!source || source.thumbnail.isEmpty()) {
    throw new Error('Desktop avatar could not capture the screen.');
  }

  // Try higher-quality encodes first, then shrink until the payload is small.
  const attempts = [
    { width: 720, quality: 58 },
    { width: 600, quality: 48 },
    { width: 480, quality: 40 }
  ];

  let image = source.thumbnail;
  let bytes = Buffer.alloc(0);

  for (const attempt of attempts) {
    image = source.thumbnail.resize({ width: attempt.width });
    bytes = image.toJPEG(attempt.quality);
    if (bytes.length <= 44_000) break;
  }

  if (!bytes.length) throw new Error('Screen JPEG encode failed.');

  const size = image.getSize();
  return {
    data: bytes.toString('base64'),
    mimeType: 'image/jpeg',
    width: size.width,
    height: size.height
  };
}

/*
 * Important: the privileged capture function itself checks authorization.
 * Do not rely on a renderer button being OFF while leaving this function
 * callable without a privacy-state gate.
 */
