/* Electron RENDERER webcam lifecycle and bounded still-capture pattern. */

export type CameraFrame = {
  data: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
};

export class CameraCapture {
  private stream?: MediaStream;
  private video?: HTMLVideoElement;
  private canvas?: HTMLCanvasElement;

  get enabled(): boolean {
    return Boolean(this.stream && this.video && this.canvas);
  }

  async start(): Promise<void> {
    if (this.enabled) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    });

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.style.display = 'none';
    video.srcObject = stream;
    document.body.append(video);

    try {
      await video.play();
    } catch (error) {
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      video.remove();
      throw error;
    }

    this.stream = stream;
    this.video = video;
    this.canvas = document.createElement('canvas');
  }

  stop(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;

    if (this.video) {
      this.video.srcObject = null;
      this.video.remove();
    }

    this.video = undefined;
    this.canvas = undefined;
  }

  captureFrame(): CameraFrame {
    const video = this.video;
    const canvas = this.canvas;

    if (!this.enabled || !video || !canvas || video.readyState < 2) {
      throw new Error('Camera is not ready.');
    }

    const sourceWidth = video.videoWidth || 640;
    const sourceHeight = video.videoHeight || 480;
    const scale = Math.min(1, 640 / sourceWidth, 480 / sourceHeight);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Camera canvas is unavailable.');

    context.drawImage(video, 0, 0, width, height);
    const url = canvas.toDataURL('image/jpeg', 0.78);
    const comma = url.indexOf(',');
    if (comma < 0) throw new Error('Camera JPEG encode failed.');

    return {
      data: url.slice(comma + 1),
      mimeType: 'image/jpeg',
      width,
      height
    };
  }
}

/*
 * Call stop() from BOTH the Camera OFF action and the complete realtime-session
 * teardown path. UI state is not enough: every MediaStreamTrack must actually
 * be stopped so the hardware camera is physically released.
 */
