"""
ReadAloud - Word Audio Generator (ElevenLabs-based)
====================================================
Generates individual word MP3 files directly from ElevenLabs for each unique word
in a story, matching the voice and style of the page narration.

Unlike generate_word_clips.py (which extracts clips using ffmpeg), this approach
generates each word directly from the API, ensuring clean, natural-sounding audio.

SETUP:
  1. pip install elevenlabs requests
  2. Get your API key from https://elevenlabs.io/settings/api-keys
  3. Clone your voice at https://elevenlabs.io/voice-cloning
  4. Copy your Voice ID from the voice settings page

USAGE:
  python generate_word_audio.py stories/jesus-feeds-5000/story.json

The script will:
  - Extract all unique words from story.json
  - Call ElevenLabs API to generate audio for each word
  - Save word-01.mp3, word-02.mp3, etc. in a words/ subdirectory
  - Save a words_index.json mapping word stems to filenames
"""

import json
import os
import re
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
    "stability": 0.65,
    "similarity_boost": 0.80,
    "style": 0.45,
    "use_speaker_boost": True
}

MODEL_ID = "eleven_multilingual_v2"
# ─────────────────────────────────────────────────────────────────


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


def trim_trailing_silence(audio_path):
    """
    Remove trailing breath sounds and silence from an MP3 using ffmpeg.
    """
    tmp_path = audio_path + ".tmp.mp3"
    cmd = [
        "ffmpeg", "-y", "-i", audio_path,
        "-af", "areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-35dB,areverse",
        "-q:a", "2",
        tmp_path
    ]
    result = subprocess.run(cmd, capture_output=True, stderr=subprocess.DEVNULL)
    if result.returncode == 0:
        os.replace(tmp_path, audio_path)
        return True
    else:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return False


def generate_word_audio(word, output_path):
    """
    Send a single word to ElevenLabs and save the MP3.
    Returns True on success.
    """
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

    headers = {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }

    data = {
        "text": word,
        "model_id": MODEL_ID,
        "voice_settings": VOICE_SETTINGS,
        "output_format": "mp3_44100_64"
    }

    try:
        response = requests.post(url, json=data, headers=headers)

        if response.status_code != 200:
            print(f"ERROR: {response.status_code}")
            return False

        result = response.json()

        # Save the audio file
        import base64
        audio_data = base64.b64decode(result["audio_base64"])

        with open(output_path, "wb") as f:
            f.write(audio_data)

        file_size_kb = os.path.getsize(output_path) / 1024
        trim_trailing_silence(output_path)
        return True
    except Exception as e:
        print(f"ERROR: {str(e)[:50]}")
        return False


def process_story(story_json_path):
    """
    Extract all unique words from the story and generate audio for each.
    """
    with open(story_json_path, "r") as f:
        story = json.load(f)

    story_dir = os.path.dirname(story_json_path)
    words_dir = os.path.join(story_dir, "words")
    os.makedirs(words_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"Generating word audio for: {story['title']}")
    print(f"Words dir: {words_dir}")
    print(f"{'='*60}\n")

    # Extract all unique words
    unique_words = set()
    for page in story["pages"]:
        text = page.get("text", "")
        words = text.split()
        for word in words:
            unique_words.add(word)

    unique_words = sorted(list(unique_words))
    print(f"Found {len(unique_words)} unique words\n")

    words_index = {}
    generated = 0
    skipped = 0

    for i, word in enumerate(unique_words):
        stem = make_stem(word)

        if not stem:
            skipped += 1
            continue

        out_path = os.path.join(words_dir, f"{stem}.mp3")

        # Skip if already exists
        if os.path.exists(out_path):
            print(f"  ({i+1}/{len(unique_words)}) '{word}' ({stem}) — already exists")
            words_index[stem] = f"{stem}.mp3"
            skipped += 1
            continue

        print(f"  ({i+1}/{len(unique_words)}) '{word}' ({stem})...", end=" ", flush=True)

        if generate_word_audio(word, out_path):
            file_size_kb = os.path.getsize(out_path) / 1024
            print(f"✓ ({file_size_kb:.1f} KB)")
            words_index[stem] = f"{stem}.mp3"
            generated += 1
        else:
            print("✗ FAILED")

        # Rate limiting - be nice to the API
        if i < len(unique_words) - 1:
            time.sleep(0.5)

    # Save words index
    index_path = os.path.join(words_dir, "index.json")
    with open(index_path, "w") as f:
        json.dump(words_index, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"DONE!")
    print(f"Generated: {generated} word audio files")
    print(f"Skipped:   {skipped} (already exist or invalid)")
    print(f"Total:     {len(words_index)} words available")
    print(f"Index:     {index_path}")
    print(f"Words dir: {words_dir}/")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_word_audio.py <path-to-story.json>")
        print("Example: python generate_word_audio.py public/stories/jesus-feeds-5000/story.json")
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
