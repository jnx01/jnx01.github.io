#!/usr/bin/env python3
# =============================================================================
# One-off asset pipeline: extract hand keypoints from ONE sign-language video.
#
# What it does (modification strategy 03, moment S1):
#   - takes one sample video from the WLPSL dataset (the real dataset built
#     for the SignChatter research)
#   - runs MediaPipe HandLandmarker on each frame — the SAME keypoint
#     extraction the published pipeline used (video -> frames -> keypoints
#     -> LSTM)
#   - keeps a short middle segment (a few seconds = one sign)
#   - normalizes every point to 0..1 and rounds to 3 decimals (small file)
#   - writes ONE compact JSON file the website can animate directly
#
# The website NEVER runs MediaPipe. This script runs once, by hand, and the
# resulting JSON is committed as a static asset. The animation on
# /work/signchatter just draws these real recorded points.
#
# Setup (once, in a virtual environment):
#   python3 -m venv .venv-signs
#   source .venv-signs/bin/activate
#   pip install mediapipe opencv-python
#
# The hand landmarker model is downloaded automatically on first run to
# assets-source/models/hand_landmarker.task
#
# Run with:
#   python scripts/extract-sign-keypoints.py <video-file> [--start 1.0] [--duration 3.0]
#
# Example:
#   python scripts/extract-sign-keypoints.py assets-source/smart.mp4 --start 0.5 --duration 3.0
#
# Output:
#   src/assets/sign-keypoints.json   (committed to the repo, ~tens of KB)
# =============================================================================

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

# MediaPipe's Tasks API crashes on macOS Metal (GPU delegate). Force CPU.
os.environ['MEDIAPIPE_DISABLE_GPU'] = '1'

try:
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, RunningMode
except ImportError:
    sys.exit(
        "Missing packages. Run:\n"
        "  pip install mediapipe opencv-python\n"
        "(see the header of this script for full setup)"
    )

# Where the finished JSON goes. The Astro component imports it from here.
OUT_FILE = Path("src/assets/sign-keypoints.json")

# The MediaPipe hand landmarker model (downloaded once, cached locally).
MODEL_PATH = Path("assets-source/models/hand_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

# How many frames per second of video to keep. 15 fps is smooth enough for a
# gentle loop and keeps the JSON small (a 3s clip = 45 frames).
SAMPLE_FPS = 15

# MediaPipe Hands gives 21 landmarks per hand (wrist + 4 points per finger).
# We keep both hands. Each point is [x, y] normalized to the video frame.
HAND_CONNECTIONS = [
    # thumb
    (0, 1), (1, 2), (2, 3), (3, 4),
    # index finger
    (0, 5), (5, 6), (6, 7), (7, 8),
    # middle finger
    (5, 9), (9, 10), (10, 11), (11, 12),
    # ring finger
    (9, 13), (13, 14), (14, 15), (15, 16),
    # pinky
    (13, 17), (17, 18), (18, 19), (19, 20),
    # palm base
    (0, 17),
]


def download_model() -> None:
    """Download the hand landmarker model if it isn't cached yet."""
    if MODEL_PATH.exists():
        return
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"downloading hand landmarker model to {MODEL_PATH} ...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract hand keypoints from one sign video.")
    parser.add_argument("video", help="path to the sample video (e.g. assets-source/smart.mp4)")
    parser.add_argument("--start", type=float, default=0.5,
                        help="skip this many seconds at the start (default 0.5)")
    parser.add_argument("--duration", type=float, default=3.0,
                        help="how many seconds to keep (default 3.0 — one sign)")
    parser.add_argument("--label", default=None,
                        help="the word being signed (stored in the JSON for the caption)")
    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.exists():
        sys.exit(f"Video not found: {video_path}")

    download_model()

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        sys.exit(f"Could not open video: {video_path}")

    video_fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    # Keep every Nth frame so the output runs at SAMPLE_FPS.
    keep_every = max(1, round(video_fps / SAMPLE_FPS))

    start_frame = int(args.start * video_fps)
    end_frame = int((args.start + args.duration) * video_fps)

    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
        running_mode=RunningMode.VIDEO,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    frames = []          # one entry per kept frame
    frame_index = 0
    kept = 0

    with HandLandmarker.create_from_options(options) as landmarker:
        while True:
            ok, image = capture.read()
            if not ok or frame_index > end_frame:
                break

            if frame_index >= start_frame and frame_index % keep_every == 0:
                # MediaPipe wants RGB; OpenCV reads BGR.
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                timestamp_ms = int(frame_index * 1000 / video_fps)
                results = landmarker.detect_for_video(mp_image, timestamp_ms)

                # Collect up to 2 hands. Each hand: 21 points of [x, y].
                # A missing hand is stored as null so the animation can fade
                # it out instead of jumping to a wrong position.
                detected = []
                if results.hand_landmarks:
                    for hand in results.hand_landmarks[:2]:
                        points = [[round(p.x, 3), round(p.y, 3)] for p in hand]
                        detected.append(points)

                frames.append(detected)
                kept += 1

            frame_index += 1

    capture.release()

    if not frames:
        sys.exit("No frames extracted — check --start/--duration against the video length.")

    # Count frames where at least one hand was seen, as a sanity check.
    frames_with_hands = sum(1 for f in frames if f)
    print(f"kept {kept} frames ({frames_with_hands} with a visible hand)")

    if frames_with_hands < len(frames) * 0.5:
        print("WARNING: a hand was visible in less than half the frames.")
        print("         Consider a different --start/--duration or a different video.")

    # ---- Normalize to the hand's bounding box --------------------------------
    # The raw keypoints are 0..1 across the FULL video frame, but the hand
    # usually occupies a small region. If we draw them as-is, the hand is a
    # tiny smudge. Instead we find the min/max x/y across ALL frames and
    # rescale so the hand fills the 0..1 space — the animation then shows
    # the hand, not the room it was recorded in.
    all_x = [p[0] for f in frames for hand in f for p in hand]
    all_y = [p[1] for f in frames for hand in f for p in hand]
    if all_x and all_y:
        min_x, max_x = min(all_x), max(all_x)
        min_y, max_y = min(all_y), max(all_y)
        range_x = max(max_x - min_x, 0.001)  # avoid division by zero
        range_y = max(max_y - min_y, 0.001)

        normalized = []
        for f in frames:
            norm_frame = []
            for hand in f:
                norm_hand = [
                    [round((p[0] - min_x) / range_x, 3), round((p[1] - min_y) / range_y, 3)]
                    for p in hand
                ]
                norm_frame.append(norm_hand)
            normalized.append(norm_frame)
        frames = normalized
        print(f"normalized to hand bounding box: x [{min_x:.2f}..{max_x:.2f}], y [{min_y:.2f}..{max_y:.2f}]")

    payload = {
        # Plain-language provenance, so anyone reading the repo can verify
        # this is real data, not a drawn animation.
        "source": str(video_path),
        "label": args.label,
        "fps": SAMPLE_FPS,
        "connections": HAND_CONNECTIONS,
        "frames": frames,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(payload, separators=(",", ":")))
    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"wrote {OUT_FILE} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
