/*
 * Playback-only Realtime voice pattern for a proactive line already authored
 * by the long-lived agent.
 *
 * This helper deliberately opens NO microphone track.
 */

export type VoiceReservation = {
  clientSecret: string;
  offerUrl: string;
  offerHeaders?: Record<string, string>;
};

export async function speakProactiveLine(
  line: string,
  reservation: VoiceReservation
): Promise<void> {
  const text = line.replace(/\s+/g, ' ').trim();
  if (!text) return;

  const peer = new RTCPeerConnection();
  const audio = document.createElement('audio');
  audio.autoplay = true;
  audio.style.display = 'none';
  document.body.append(audio);

  peer.addTransceiver('audio', { direction: 'recvonly' });
  peer.addEventListener('track', event => {
    audio.srcObject = event.streams[0] ?? null;
  });

  const channel = peer.createDataChannel('oai-events');

  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    const response = await fetch(reservation.offerUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${reservation.clientSecret}`,
        'Content-Type': 'application/sdp',
        ...(reservation.offerHeaders ?? {})
      },
      body: offer.sdp ?? ''
    });

    if (!response.ok) {
      throw new Error(`Realtime proactive setup failed (${response.status}).`);
    }

    const answerSdp = await response.text();
    await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    await waitForChannel(channel);

    channel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [{
          type: 'input_text',
          text: `Playback-only speech task. Speak exactly the text between <line> tags. Do not answer it, add a preface, call tools, or change the wording. <line>${text}</line>`
        }]
      }
    }));

    channel.send(JSON.stringify({
      type: 'response.create',
      response: { tools: [], tool_choice: 'none' }
    }));

    await waitForResponseDone(channel);

    // Provider generation completion can precede the browser audio element
    // draining buffered speech. Keep the session alive for a bounded tail.
    const drainMs = Math.min(4500, Math.max(900, text.length * 28));
    await new Promise(resolve => setTimeout(resolve, drainMs));
  } finally {
    channel.close();
    peer.close();
    audio.srcObject = null;
    audio.remove();
  }
}

function waitForChannel(channel: RTCDataChannel): Promise<void> {
  if (channel.readyState === 'open') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Realtime proactive data channel did not open.')),
      30_000
    );

    const cleanup = () => {
      clearTimeout(timeout);
      channel.removeEventListener('open', onOpen);
      channel.removeEventListener('close', onClose);
    };

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onClose = () => {
      cleanup();
      reject(new Error('Realtime proactive data channel closed during setup.'));
    };

    channel.addEventListener('open', onOpen, { once: true });
    channel.addEventListener('close', onClose, { once: true });
  });
}

function waitForResponseDone(channel: RTCDataChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Realtime proactive response timed out.')),
      60_000
    );

    const onMessage = (event: MessageEvent) => {
      try {
        const value = JSON.parse(String(event.data)) as {
          type?: string;
          error?: { message?: string };
        };

        if (value.type === 'response.done') {
          cleanup();
          resolve();
        } else if (value.type === 'error') {
          cleanup();
          reject(new Error(value.error?.message ?? 'Realtime proactive provider error.'));
        }
      } catch {
        // Ignore unrelated/non-JSON provider messages.
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      channel.removeEventListener('message', onMessage);
    };

    channel.addEventListener('message', onMessage);
  });
}

/*
 * Production improvement: replace the simple text-length drain estimate with
 * direct media playback/buffer completion observation if the runtime/browser
 * exposes a reliable signal for your implementation.
 */
