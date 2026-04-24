"""
ReadAloud - Word Clip Extractor
================================
Extracts individual word MP3 clips from page audio files using the
word-level timestamps stored in story.json. Saves them to a words/
subdirectory so the app can play them when a user taps a word.

The stem (filename) matches the logic in BookReader.jsx:
  lowercase → strip leading/trailing punctuation → remove non-alphanumeric

USAGE:
  python generate_word_clips.py stories/the-big-storm/story.json

Requires ffmpeg to be installed and on PATH.
"""

import json
import os
import re
import subprocess
import sys


def make_stem(word):
    """
    Normalize a word to its filename stem, matching BookReader.jsx logic:
      raw.toLowerCase()
         .replace(/^[.,!?;:"'()[]{}—–-]+|[.,!?;:"'()[]{}—–-]+$/g, "")
         .replace(/[^a-z0-9]/g, "")
    """
    s = word.lower()
    s = re.sub(r"^[.,!?;:\"'()\[\]{}—–\-]+|[.,!?;:\"'()\[\]{}—–\-]+$", "", s)
    s = re.sub(r"[^a-z0-9]", "", s)
    return s


def extract_clip(page_mp3, start_sec, end_sec, out_path, pad=0.04):
    """
    Extract [start_sec, end_sec] from page_mp3 into out_path using ffmpeg.
    Adds a small pad on each side so the clip doesn't sound clipped.
    """
    t_start = max(0.0, start_sec - pad)
    t_end   = end_sec + pad

    cmd = [
        "ffmpeg", "-y",
        "-i", page_mp3,
        "-ss", str(t_start),
        "-to", str(t_end),
        "-q:a", "2",
        out_path,
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0


def process_story(story_json_path):
    with open(story_json_path, "r") as f:
        story = json.load(f)

    story_dir = os.path.dirname(story_json_path)
    words_dir = os.path.join(story_dir, "words")
    os.makedirs(words_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"Processing: {story['title']}")
    print(f"Words dir:  {words_dir}")
    print(f"{'='*60}\n")

    seen_stems = set()   # don't overwrite a word we already saved
    total = 0
    skipped = 0

    for i, page in enumerate(story["pages"]):
        page_num  = i + 1
        audio_file = page.get("audio")
        timestamps = page.get("timestamps", [])

        if not audio_file or not timestamps:
            print(f"  Page {page_num}: no audio/timestamps — skipping")
            continue

        page_mp3 = os.path.join(story_dir, audio_file)
        if not os.path.exists(page_mp3):
            print(f"  Page {page_num}: {audio_file} not found — skipping")
            continue

        print(f"  Page {page_num}: extracting {len(timestamps)} words from {audio_file}")

        for ts in timestamps:
            word  = ts.get("word", "")
            start = ts.get("start", 0.0)
            end   = ts.get("end",   0.0)
            stem  = make_stem(word)

            if not stem:
                continue

            if stem in seen_stems:
                skipped += 1
                continue

            out_path = os.path.join(words_dir, f"{stem}.mp3")
            if extract_clip(page_mp3, start, end, out_path):
                seen_stems.add(stem)
                total += 1
            else:
                print(f"    WARNING: ffmpeg failed for '{word}' ({stem})")

    print(f"\n{'='*60}")
    print(f"DONE! Extracted {total} unique word clips ({skipped} duplicates skipped).")
    print(f"Saved to: {words_dir}/")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_word_clips.py <path-to-story.json>")
        print("Example: python generate_word_clips.py stories/the-big-storm/story.json")
        sys.exit(1)

    story_path = sys.argv[1]

    if not os.path.exists(story_path):
        print(f"Error: File not found: {story_path}")
        sys.exit(1)

    process_story(story_path)
