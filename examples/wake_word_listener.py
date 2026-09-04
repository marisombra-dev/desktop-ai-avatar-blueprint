"""Local wake listener pattern.

Install: pip install faster-whisper sounddevice numpy

This process owns the microphone only while realtime voice is asleep. On one
accepted wake it prints a machine-readable line and exits, releasing the mic.
Tune thresholds for the target microphone/room.
"""

import queue
import re
import sys
import time
from pathlib import Path

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel

WAKE_NAME = "lyra"
SAMPLE_RATE = 16000
BLOCK_SIZE = 1600
WINDOW_SAMPLES = int(SAMPLE_RATE * 2.4)
CHECK_INTERVAL = 0.55
ENERGY_THRESHOLD = 0.0120
MIN_AVG_LOGPROB = -1.15
MAX_NO_SPEECH = 0.40
LOG_PATH = Path(__file__).with_name("wake-word.log")


def log(message: str) -> None:
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}\n")


model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8",
    # After initial installation/cache, prefer local-only operation.
    local_files_only=True,
)

audio_queue: queue.Queue[np.ndarray] = queue.Queue()


def audio_callback(indata, _frames, _time_info, status) -> None:
    if status:
        log(f"AUDIO_STATUS {status}")
    audio_queue.put(indata[:, 0].copy())


buffer = np.zeros(0, dtype=np.float32)
next_check = time.monotonic() + 1.0
input_device = sd.default.device[0]
log(f"START device={input_device} name={sd.query_devices(input_device)['name']}")

# Accept only the wake name, optionally preceded by hey/hi. Repeated wake-name
# phrases are tolerated because ASR can duplicate short utterances.
wake_re = re.compile(
    rf"(?:(?:hey |hi )?{re.escape(WAKE_NAME)})(?: (?:(?:hey |hi )?{re.escape(WAKE_NAME)}))*"
)

with sd.InputStream(
    device=input_device,
    samplerate=SAMPLE_RATE,
    channels=1,
    dtype="float32",
    blocksize=BLOCK_SIZE,
    callback=audio_callback,
):
    print("READY", flush=True)

    while True:
        block = audio_queue.get()
        buffer = np.concatenate((buffer, block))[-WINDOW_SAMPLES:]
        now = time.monotonic()
        if now < next_check or len(buffer) < SAMPLE_RATE:
            continue
        next_check = now + CHECK_INTERVAL

        rms = float(np.sqrt(np.mean(buffer * buffer)))
        if rms < ENERGY_THRESHOLD:
            continue

        segments_iter, _ = model.transcribe(
            buffer.copy(),
            language="en",
            beam_size=3,
            vad_filter=True,
            condition_on_previous_text=False,
            no_speech_threshold=0.50,
            log_prob_threshold=-1.2,
        )
        segments = list(segments_iter)
        if not segments:
            continue

        text = " ".join(segment.text.strip() for segment in segments).strip()
        if not text:
            continue

        durations = [max(0.05, float(s.end - s.start)) for s in segments]
        total_duration = sum(durations)
        avg_logprob = sum(float(s.avg_logprob) * d for s, d in zip(segments, durations)) / total_duration
        no_speech = sum(float(s.no_speech_prob) * d for s, d in zip(segments, durations)) / total_duration

        normalized = re.sub(r"[^a-z ]+", " ", text.lower())
        normalized = re.sub(r"\s+", " ", normalized).strip()
        wake_shape = bool(wake_re.fullmatch(normalized))

        log(f"HEARD rms={rms:.6f} lp={avg_logprob:.3f} ns={no_speech:.3f} text={text!r}")

        good = (
            wake_shape
            and rms >= ENERGY_THRESHOLD
            and avg_logprob >= MIN_AVG_LOGPROB
            and no_speech <= MAX_NO_SPEECH
        )
        if not good:
            continue

        log(f"WAKE text={text!r}")
        print(f"WAKE|1.0|{text}", flush=True)
        # Intentional. Exiting releases the microphone before WebRTC starts.
        sys.exit(0)
