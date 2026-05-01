"""
ReadAloud - ElevenLabs Audio Generator
======================================
This script takes a story.json file, sends each page's text to ElevenLabs,
and saves the audio (MP3) + word timestamps back into the story folder.

SETUP:
  1. pip install elevenlabs requests
  2. Get your API key from https://elevenlabs.io/settings/api-keys
  3. Clone your voice at https://elevenlabs.io/voice-cloning
  4. Copy your Voice ID from the voice settings page

USAGE:
  python generate_audio.py stories/the-big-dog/story.json

The script will:
  - Read each page's text from story.json
  - Call ElevenLabs API to generate audio + timestamps
  - Save page-01.mp3, page-02.mp3, etc. in the same folder
  - Update story.json with the timestamp data
"""

import json
import os
import subprocess
import sys
import time
import requests

# ─── CONFIGURATION ───────────────────────────────────────────────
# Load from environment or .env.local
def _load_env_file(path: str = ".env.local") -> None:
    """Load environment variables from .env.local if it exists."""
    from pathlib import Path
    env_path = Path(__file__).parent.parent / path
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                if "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())

_load_env_file()

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "")

# Voice settings - tuned for children's story narration
VOICE_SETTINGS = {
    "stability": 0.65,          # Slightly expressive
    "similarity_boost": 0.80,   # Sound like your voice clone
    "style": 0.45,              # Some storytelling style
    "use_speaker_boost": True
}

MODEL_ID = "eleven_multilingual_v2"  # Best quality model
# ─────────────────────────────────────────────────────────────────


def trim_trailing_silence(audio_path):
    """
    Remove trailing breath sounds and silence from an MP3 using ffmpeg.
    Uses the areverse trick: reverse → strip leading silence → reverse back.
    Threshold -35dB catches breath sounds (not just pure silence).
    """
    tmp_path = audio_path + ".tmp.mp3"
    cmd = [
        "ffmpeg", "-y", "-i", audio_path,
        "-af", "areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-35dB,areverse",
        "-q:a", "2",
        tmp_path
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode == 0:
        os.replace(tmp_path, audio_path)
        print(f"  Trimmed trailing silence: {audio_path}")
    else:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        print(f"  WARNING: ffmpeg trim failed — keeping original audio")


def generate_page_audio(text, output_path):
    """
    Send text to ElevenLabs, get back audio + word-level timestamps.
    Returns list of {word, start, end} dicts.
    """
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/with-timestamps"

    headers = {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }

    data = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": VOICE_SETTINGS,
        "output_format": "mp3_44100_64"
    }

    print(f'  Generating audio for: "{text}"')
    response = requests.post(url, json=data, headers=headers)

    if response.status_code != 200:
        print(f"  ERROR: {response.status_code} - {response.text}")
        return None

    result = response.json()

    # Save the audio file
    import base64
    audio_data = base64.b64decode(result["audio_base64"])

    with open(output_path, "wb") as f:
        f.write(audio_data)

    file_size_kb = os.path.getsize(output_path) / 1024
    print(f"  Saved: {output_path} ({file_size_kb:.0f} KB)")
    trim_trailing_silence(output_path)

    # Extract timestamps - ElevenLabs returns CHARACTER-level data
    # We need to aggregate characters into words
    timestamps = []
    if "alignment" in result:
        alignment = result["alignment"]
        chars = alignment.get("characters", [])
        starts = alignment.get("character_start_times_seconds", [])
        ends = alignment.get("character_end_times_seconds", [])

        # Build words from characters
        current_word = ""
        word_start = None

        for i, char in enumerate(chars):
            if char == " ":
                # Space = end of word
                if current_word:
                    timestamps.append({
                        "word": current_word,
                        "start": round(word_start, 3),
                        "end": round(ends[i - 1], 3)
                    })
                    current_word = ""
                    word_start = None
            else:
                if word_start is None:
                    word_start = starts[i]
                current_word += char

        # Don't forget the last word
        if current_word:
            timestamps.append({
                "word": current_word,
                "start": round(word_start, 3),
                "end": round(ends[len(chars) - 1], 3)
            })

    print(f"  Timestamps: {len(timestamps)} words")
    return timestamps


def process_story(story_json_path):
    """
    Process an entire story - generate audio for every page.
    """
    # Load story.json
    with open(story_json_path, "r") as f:
        story = json.load(f)

    story_dir = os.path.dirname(story_json_path)
    print(f"\n{'='*60}")
    print(f"Processing: {story['title']}")
    print(f"Directory:  {story_dir}")
    print(f"Pages:      {len(story['pages'])}")
    print(f"{'='*60}\n")

    total_chars = 0

    for i, page in enumerate(story["pages"]):
        page_num = i + 1
        print(f"\nPage {page_num}/{len(story['pages'])}:")

        text = page["text"]
        total_chars += len(text)

        # Output paths
        audio_filename = f"page-{page_num:02d}.mp3"
        audio_path = os.path.join(story_dir, audio_filename)

        # Generate audio + timestamps
        timestamps = generate_page_audio(text, audio_path)

        if timestamps:
            # Update the page data
            page["audio"] = audio_filename
            page["timestamps"] = timestamps
        else:
            print(f"  FAILED - skipping page {page_num}")

        # Rate limiting - be nice to the API
        if i < len(story["pages"]) - 1:
            print("  Waiting 1s before next request...")
            time.sleep(1)

    # Save updated story.json with timestamps
    with open(story_json_path, "w") as f:
        json.dump(story, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"DONE!")
    print(f"Total characters sent: {total_chars}")
    print(f"Updated: {story_json_path}")
    print(f"Audio files saved to: {story_dir}/")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_audio.py <path-to-story.json>")
        print("Example: python generate_audio.py stories/the-big-dog/story.json")
        sys.exit(1)

    story_path = sys.argv[1]

    if not os.path.exists(story_path):
        print(f"Error: File not found: {story_path}")
        sys.exit(1)

    if not ELEVENLABS_API_KEY:
        print("ERROR: ELEVENLABS_API_KEY not set")
        print("  Set it in .env.local or as an environment variable")
        sys.exit(1)

    if not VOICE_ID:
        print("ERROR: ELEVENLABS_VOICE_ID not set")
        print("  Set it in .env.local or as an environment variable")
        sys.exit(1)

    process_story(story_path)
