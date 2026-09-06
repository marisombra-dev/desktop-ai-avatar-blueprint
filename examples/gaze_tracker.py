"""Sanitized local eye-contact tracker pattern.

This example intentionally contains no real user's calibration weights.
It processes webcam frames locally, emits only a small numerical gaze target, and may publish a low-rate boolean desk-presence heartbeat on stdout so another process does not need to open the same webcam.

Dependencies: mediapipe, opencv-python, numpy
Model: MediaPipe Face Landmarker task model supplied separately.
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import time
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

UDP_ADDR = ("127.0.0.1", 19781)

# Illustrative starting values. Tune only after end-to-end validation.
ENTER_MARGIN = 0.60
EXIT_MARGIN = -0.15
ENTER_SECONDS = 0.55
EXIT_SECONDS = 0.45
SEND_INTERVAL = 0.12
PRESENCE_ENTER_SECONDS = 0.35
PRESENCE_EXIT_SECONDS = 1.00
PRESENCE_HEARTBEAT_SECONDS = 3.0
GAZE_STRENGTH = 0.22
BASE_H = 0.0
BASE_V = 0.0
FOLLOW_H = 2.0
FOLLOW_V = 2.0
MAX_FOLLOW_H = 0.18
MAX_FOLLOW_V = 0.12

# MediaPipe Face Landmarker indices used by this pattern.
RIGHT_OUTER, RIGHT_INNER = 33, 133
RIGHT_TOP, RIGHT_BOTTOM, RIGHT_IRIS = 159, 145, 468
LEFT_OUTER, LEFT_INNER = 263, 362
LEFT_TOP, LEFT_BOTTOM, LEFT_IRIS = 386, 374, 473
LEFT_CHEEK, RIGHT_CHEEK, FOREHEAD, CHIN = 234, 454, 10, 152


def point2(landmarks, index: int) -> np.ndarray:
    p = landmarks[index]
    return np.array([p.x, p.y], dtype=np.float64)


def projection(point: np.ndarray, start: np.ndarray, end: np.ndarray) -> float:
    axis = end - start
    denom = float(np.dot(axis, axis))
    if denom < 1e-9:
        return 0.5
    return float(np.dot(point - start, axis) / denom)


def extract_geometry(landmarks) -> dict[str, float]:
    ro, ri = point2(landmarks, RIGHT_OUTER), point2(landmarks, RIGHT_INNER)
    rt, rb, rir = point2(landmarks, RIGHT_TOP), point2(landmarks, RIGHT_BOTTOM), point2(landmarks, RIGHT_IRIS)
    lo, li = point2(landmarks, LEFT_OUTER), point2(landmarks, LEFT_INNER)
    lt, lb, lir = point2(landmarks, LEFT_TOP), point2(landmarks, LEFT_BOTTOM), point2(landmarks, LEFT_IRIS)

    right_h = projection(rir, ro, ri)
    left_h = projection(lir, lo, li)
    right_v = projection(rir, rt, rb)
    left_v = projection(lir, lt, lb)

    # Important: the eyes have opposite local anatomical orientation.
    # Flip the left-eye horizontal value into the same global orientation.
    left_h_global = 1.0 - left_h

    cheek_l = point2(landmarks, LEFT_CHEEK)
    cheek_r = point2(landmarks, RIGHT_CHEEK)
    forehead = point2(landmarks, FOREHEAD)
    chin = point2(landmarks, CHIN)
    face_center = (cheek_l + cheek_r + forehead + chin) * 0.25

    return {
        "right_h": right_h,
        "left_h_global": left_h_global,
        "right_v": right_v,
        "left_v": left_v,
        # These are used only for tiny follow motion AFTER contact is established.
        "face_x": float(face_center[0]),
        "face_y": float(face_center[1]),
    }


def head_pose(matrix) -> tuple[float, float]:
    rotation = np.asarray(matrix, dtype=np.float64)[:3, :3]
    yaw = float(np.arctan2(rotation[0, 2], rotation[2, 2]))
    pitch = float(np.arctan2(-rotation[1, 2], np.hypot(rotation[1, 0], rotation[1, 1])))
    return yaw, pitch


def feature_vector(geometry: dict[str, float], matrix, names: list[str]) -> np.ndarray:
    yaw, pitch = head_pose(matrix)
    values = {
        **geometry,
        "head_yaw": yaw,
        "head_pitch": pitch,
    }
    return np.asarray([values[name] for name in names], dtype=np.float64)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def send_gaze(sock: socket.socket, horizontal: float, vertical: float, strength: float) -> None:
    payload = f"DECTRL|GAZE|{horizontal:.4f}|{vertical:.4f}|{strength:.4f}".encode("ascii")
    sock.sendto(payload, UDP_ADDR)


def open_camera(index: int):
    camera = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    if not camera.isOpened():
        camera.release()
        camera = cv2.VideoCapture(index)
    if not camera.isOpened():
        raise RuntimeError("Could not open webcam")
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    return camera


def load_calibration(path: Path) -> tuple[list[str], np.ndarray, float]:
    data = json.loads(path.read_text(encoding="utf-8"))
    names = list(data["feature_names"])
    weights = np.asarray(data["classifier"]["weights"], dtype=np.float64)
    threshold = float(data["classifier"]["threshold"])
    if len(names) != len(weights):
        raise ValueError("feature_names and classifier weights must have the same length")
    return names, weights, threshold


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--calibration", required=True, type=Path)
    parser.add_argument("--model", type=Path, default=None)
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--presence-events", action="store_true")
    args = parser.parse_args()

    model = args.model or Path(os.environ.get("DESKTOP_AVATAR_GAZE_MODEL", "gaze_face_landmarker.task"))
    feature_names, weights, threshold = load_calibration(args.calibration)

    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_facial_transformation_matrixes=True,
    )

    camera = open_camera(args.camera)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    contact = False
    enter_since = None
    exit_since = None
    anchor_x = anchor_y = None
    smooth_x = smooth_y = None
    last_send = 0.0
    presence_state = None
    presence_candidate = None
    presence_candidate_since = None
    last_presence_emit = 0.0
    started = time.monotonic()

    try:
        with mp.tasks.vision.FaceLandmarker.create_from_options(options) as landmarker:
            while True:
                ok, frame = camera.read()
                if not ok:
                    time.sleep(0.03)
                    continue

                now = time.monotonic()
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = landmarker.detect_for_video(image, int((now - started) * 1000))
                face_ok = bool(result.face_landmarks and result.facial_transformation_matrixes)
                margin = -999.0
                geometry = None

                if face_ok:
                    geometry = extract_geometry(result.face_landmarks[0])
                    vector = feature_vector(geometry, result.facial_transformation_matrixes[0], feature_names)
                    margin = float(vector @ weights - threshold)

                    fx, fy = geometry["face_x"], geometry["face_y"]
                    smooth_x = fx if smooth_x is None else smooth_x * 0.82 + fx * 0.18
                    smooth_y = fy if smooth_y is None else smooth_y * 0.82 + fy * 0.18

                if args.presence_events:
                    candidate = bool(face_ok)
                    if presence_candidate != candidate:
                        presence_candidate = candidate
                        presence_candidate_since = now
                    required = PRESENCE_ENTER_SECONDS if candidate else PRESENCE_EXIT_SECONDS
                    if presence_candidate_since is not None and now - presence_candidate_since >= required and presence_state != candidate:
                        presence_state = candidate
                        last_presence_emit = now
                        print(json.dumps({"event": "desk_presence", "present": presence_state}), flush=True)
                    elif presence_state is not None and now - last_presence_emit >= PRESENCE_HEARTBEAT_SECONDS:
                        last_presence_emit = now
                        print(json.dumps({"event": "desk_presence", "present": presence_state}), flush=True)

                if not contact:
                    if face_ok and margin >= ENTER_MARGIN:
                        enter_since = enter_since or now
                        if now - enter_since >= ENTER_SECONDS:
                            contact = True
                            exit_since = None
                            anchor_x, anchor_y = smooth_x, smooth_y
                    else:
                        enter_since = None
                else:
                    if (not face_ok) or margin <= EXIT_MARGIN:
                        exit_since = exit_since or now
                        if now - exit_since >= EXIT_SECONDS:
                            contact = False
                            enter_since = None
                            anchor_x = anchor_y = None
                            send_gaze(sock, 0.0, 0.0, 0.0)
                    else:
                        exit_since = None

                if contact and geometry is not None and now - last_send >= SEND_INTERVAL:
                    dx = 0.0 if anchor_x is None else float(smooth_x - anchor_x)
                    dy = 0.0 if anchor_y is None else float(smooth_y - anchor_y)
                    horizontal = BASE_H - clamp(dx * FOLLOW_H, -MAX_FOLLOW_H, MAX_FOLLOW_H)
                    vertical = BASE_V - clamp(dy * FOLLOW_V, -MAX_FOLLOW_V, MAX_FOLLOW_V)
                    send_gaze(sock, horizontal, vertical, GAZE_STRENGTH)
                    last_send = now

                time.sleep(0.015)
    finally:
        # Fail back to normal idle gaze, even on Ctrl-C or an exception.
        try:
            send_gaze(sock, 0.0, 0.0, 0.0)
        finally:
            camera.release()
            sock.close()


if __name__ == "__main__":
    main()
