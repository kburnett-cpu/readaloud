#!/usr/bin/env python3
"""
Generate per-word MP3 audio files for ReadAloud stories.

For each story, extracts all unique words across all pages and generates
one MP3 per word, stored at:
    public/stories/{story-id}/words/{word}.mp3

Words are deduplicated per story so "the" on 8 pages = 1 API call.

Usage
-----
    ELEVENLABS_API_KEY=sk-... python generate_word_audio.py --voice-id <id>
    ELEVENLABS_API_KEY=sk-... python generate_word_audio.py --voice-id <id> --story at-the-beach
    python generate_word_audio.py --dry-run
"""

import argparse, json, os, re, sys, time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests is not installed. Run: pip install requests")

STORIES_DIR = Path(__file__).parent / "public" / "stories"
API_BASE    = "https://api.elevenlabs.io/v1"

DEFAULT_MODEL = "eleven_multilingual_v2"

VOICE_SETTINGS = {
    "stability":         0.75,  # higher stability → consistent, clear pronunciation
    "similarity_boost":  0.80,
    "style":             0.10,
    "use_speaker_boost": True,
}


# ── Word helpers ───────────────────────────────────────────────────────────────

def to_filename(word: str) -> str:
    """
    Convert a raw word token to a safe filename stem (no extension).
    "Beach!"  → "beach"
    "it's"    → "its"
    "I"       → "i"
    """
    word = word.strip(".,!?;:\"'()[]{}—–-")
    word = word.lower()
    return re.sub(r"[^a-z0-9]", "", word)


def to_spoken(word: str) -> str:
    """
    Strip surrounding punctuation but keep apostrophes so contractions
    are pronounced correctly: "don't" stays "don't", not "dont".
    """
    return word.strip(".,!?;:\"()[]{}—–-")


def unique_words(story: dict) -> list[tuple[str, str]]:
    """
    Return sorted list of (filename_stem, spoken_form) pairs,
    deduplicated across all pages of the story.
    """
    seen: dict[str, str] = {}
    for page in story["pages"]:
        for raw in page["text"].split():
            stem = to_filename(raw)
            if stem and stem not in seen:
                seen[stem] = to_spoken(raw)
    return sorted(seen.items())


# ── API ────────────────────────────────────────────────────────────────────────

def generate_mp3(api_key: str, voice_id: str, model_id: str, text: str) -> bytes:
    url = f"{API_BASE}/text-to-speech/{voice_id}"
    resp = requests.post(
        url,
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
        json={"text": text, "model_id": model_id, "voice_settings": VOICE_SETTINGS},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.content


# ── Story processing ───────────────────────────────────────────────────────────

def process_story(
    story_dir:    Path,
    api_key:      str,
    voice_id:     str,
    model_id:     str,
    skip_existing: bool = True,
    dry_run:      bool  = False,
) -> None:
    json_path = story_dir / "story.json"
    if not json_path.exists():
        return

    story     = json.load(open(json_path, encoding="utf-8"))
    words     = unique_words(story)
    words_dir = story_dir / "words"

    print(f"\n📖  {story['title']}  — {len(words)} unique words")

    if not dry_run:
        words_dir.mkdir(exist_ok=True)

    generated = skipped = errors = 0

    for stem, spoken in words:
        mp3_path = words_dir / f"{stem}.mp3"

        if skip_existing and mp3_path.exists():
            skipped += 1
            continue

        if dry_run:
            print(f"  would generate: {stem}.mp3  ← '{spoken}'")
            continue

        try:
            data = generate_mp3(api_key, voice_id, model_id, spoken)
            mp3_path.write_bytes(data)
            print(f"  ✓  {stem}.mp3  ({len(data)/1024:.1f} KB)  ← '{spoken}'")
            generated += 1
        except requests.HTTPError as exc:
            print(f"  ✗  {stem}: HTTP {exc.response.status_code} — {exc.response.text[:120]}")
            errors += 1
        except Exception as exc:
            print(f"  ✗  {stem}: {exc}")
            errors += 1

        time.sleep(0.3)

    if not dry_run:
        print(f"  → generated {generated}, skipped {skipped}, errors {errors}")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate per-word MP3 files for ReadAloud stories",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--api-key",  default=os.environ.get("ELEVENLABS_API_KEY", ""))
    parser.add_argument("--voice-id", default=os.environ.get("ELEVENLABS_VOICE_ID", ""))
    parser.add_argument("--model",    default=DEFAULT_MODEL)
    parser.add_argument("--story",    metavar="STORY_ID",
                        help="Process only this story (e.g. at-the-beach)")
    parser.add_argument("--force",    action="store_true",
                        help="Re-generate even if MP3 already exists")
    parser.add_argument("--dry-run",  action="store_true",
                        help="Show what would be generated without API calls")
    args = parser.parse_args()

    if not args.dry_run:
        if not args.api_key:
            sys.exit("Error: set ELEVENLABS_API_KEY or pass --api-key")
        if not args.voice_id:
            sys.exit("Error: set ELEVENLABS_VOICE_ID or pass --voice-id")

    if args.story:
        story_dirs = [STORIES_DIR / args.story]
        if not story_dirs[0].is_dir():
            sys.exit(f"Error: {story_dirs[0]} does not exist")
    else:
        story_dirs = sorted(d for d in STORIES_DIR.iterdir() if d.is_dir())

    for story_dir in story_dirs:
        if (story_dir / "story.json").exists():
            process_story(
                story_dir    = story_dir,
                api_key      = args.api_key,
                voice_id     = args.voice_id,
                model_id     = args.model,
                skip_existing= not args.force,
                dry_run      = args.dry_run,
            )

    print("\n✅  Done")


if __name__ == "__main__":
    main()
