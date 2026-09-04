"""Sanitized local program-audio transcriber for Screen-linked Windows loopback.

Input lines on stdin:
    PCM|<sample_rate>|<base64 little-endian mono PCM16>
    STOP

Output lines on stdout:
    READY
    TEXT|<recognized program dialogue>

Raw audio is not written to disk.
"""

import base64
import re
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

TARGET_RATE = 16000
WINDOW_SECONDS = 7.0
MIN_FLUSH_SECONDS = 1.25
ENERGY_FLOOR = 0.0015

model = WhisperModel(
    'tiny',
    device='cpu',
    compute_type='int8',
    download_root=str(Path.home() / '.cache' / 'huggingface' / 'hub'),
    local_files_only=True,
)
buffer = np.zeros(0, dtype=np.float32)
buffer_rate = 0
last_text = ''


def resample(samples: np.ndarray, source_rate: int) -> np.ndarray:
    if source_rate == TARGET_RATE:
        return samples.astype(np.float32, copy=False)
    if len(samples) < 2:
        return np.zeros(0, dtype=np.float32)

    target_len = max(1, int(round(len(samples) * TARGET_RATE / source_rate)))
    old_x = np.linspace(0.0, 1.0, num=len(samples), endpoint=False)
    new_x = np.linspace(0.0, 1.0, num=target_len, endpoint=False)
    return np.interp(new_x, old_x, samples).astype(np.float32)


def transcribe_chunk(samples: np.ndarray, source_rate: int) -> None:
    global last_text
    audio = resample(samples, source_rate)
    if len(audio) < TARGET_RATE:
        return

    rms = float(np.sqrt(np.mean(audio * audio)))
    if rms < ENERGY_FLOOR:
        return

    segments, _ = model.transcribe(
        audio,
        language='en',
        beam_size=2,
        vad_filter=True,
        condition_on_previous_text=False,
        no_speech_threshold=0.60,
    )
    text = ' '.join(segment.text.strip() for segment in segments).strip()
    text = re.sub(r'\s+', ' ', text)
    if not text or text == last_text:
        return

    last_text = text
    print('TEXT|' + text[:2000], flush=True)


def flush_remaining() -> None:
    global buffer
    if buffer_rate and len(buffer) >= int(buffer_rate * MIN_FLUSH_SECONDS):
        transcribe_chunk(buffer, buffer_rate)
    buffer = np.zeros(0, dtype=np.float32)


print('READY', flush=True)

for raw in sys.stdin:
    line = raw.strip()
    if not line:
        continue
    if line == 'STOP':
        flush_remaining()
        break
    if not line.startswith('PCM|'):
        continue

    try:
        _, rate_text, payload = line.split('|', 2)
        rate = int(rate_text)
        pcm = np.frombuffer(base64.b64decode(payload), dtype='<i2').astype(np.float32) / 32768.0
    except Exception:
        continue
    if rate < 8000 or rate > 192000 or not len(pcm):
        continue

    if buffer_rate and rate != buffer_rate:
        flush_remaining()
    buffer_rate = rate
    buffer = np.concatenate((buffer, pcm))

    window_samples = int(buffer_rate * WINDOW_SECONDS)
    while len(buffer) >= window_samples:
        chunk = buffer[:window_samples]
        buffer = buffer[window_samples:]
        transcribe_chunk(chunk, buffer_rate)
