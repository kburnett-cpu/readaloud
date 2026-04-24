#!/usr/bin/env python3
"""
Generate ElevenLabs audio for all ReadAloud story pages.

For each story page this script will:
  1. Call the ElevenLabs text-to-speech API (with-timestamps endpoint)
  2. Save the MP3 file next to the story images
  3. Patch story.json in-place with "audio" filename + "timestamps" array

Usage
-----
    # Process all stories (skips pages that already have audio)
    ELEVENLABS_API_KEY=sk-... python generate_audio.py --voice-id <voice_id>

    # Re-generate even if audio already exists
    ELEVENLABS_API_KEY=sk-... python generate_audio.py --voice-id <voice_id> --force

    # One story only
    ELEVENLABS_API_KEY=sk-... python generate_audio.py --voice-id <voice_id> --story counting-to-ten

    # Preview what would be generated (no API calls)
    python generate_audio.py --dry-run

Environment variables
---------------------
    ELEVENLABS_API_KEY   — required (or pass via --api-key)
    ELEVENLABS_VOICE_ID  — optional default for --voice-id
"""

import argparse
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests is not installed. Run: pip install requests")

# ── Paths ──────────────────────────────────────────────────────────────────────

STORIES_DIR = Path(__file__).parent / "public" / "stories"

# ── ElevenLabs settings ────────────────────────────────────────────────────────

API_BASE      = "https://api.elevenlabs.io/v1"
DEFAULT_MODEL   = "eleven_turbo_v2"   # fast, English-only, cheapest per-char cost
WORD_AUDIO_BREAK_MS = 200             # silence inserted between words in word audio

# Voice settings tuned for clear children's read-aloud.
# stability 0.75: higher than default to reduce random breath/glitch artifacts,
# especially on repeated phrases and mid-sentence punctuation (e.g. "I will! I will!").
DEFAULT_VOICE_SETTINGS = {
    "stability":         0.75,   # high stability → consistent, fewer random artifacts
    "similarity_boost":  0.80,   # high similarity → stays on-voice
    "style":             0.10,   # minimal style → cleaner, more predictable prosody
    "use_speaker_boost": True,
}

# ── SSML helpers ──────────────────────────────────────────────────────────────

def text_to_ssml_with_breaks(text: str, break_ms: int = WORD_AUDIO_BREAK_MS) -> str:
    """
    Wrap plain text in SSML with <break> tags between every word.

    "Colors are all around!" →
    "<speak>Colors<break time='200ms'/>are<break time='200ms'/>all<break time='200ms'/>around!</speak>"

    The breaks create clean silence around each word so that timestamp-based
    slicing in the app is accurate without needing padding hacks.
    Note: use eleven_multilingual_v2 or eleven_turbo_v2_5 for best SSML support.
    """
    words = text.split()
    break_tag = f"<break time='{break_ms}ms'/>"
    # Keep spaces on both sides of the break tag so ElevenLabs' alignment data
    # still contains space characters — our char_alignment_to_words function
    # uses spaces to detect word boundaries.
    return f"<speak>{f' {break_tag} '.join(words)}</speak>"


# ── Timestamp conversion ───────────────────────────────────────────────────────

def char_alignment_to_words(alignment: dict) -> list[dict]:
    """
    Convert ElevenLabs character-level alignment to word-level timestamps.

    ElevenLabs returns:
        alignment.characters                    — list of single chars (incl. spaces)
        alignment.character_start_times_seconds — parallel list of start times
        alignment.character_end_times_seconds   — parallel list of end times

    Returns a list of dicts: {"word": str, "start": float, "end": float}
    Rounds start/end to 3 decimal places to match the-big-dog schema style.
    """
    chars  = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends   = alignment["character_end_times_seconds"]

    words      = []
    buf_chars  = []
    word_start = None
    word_end   = None

    for ch, s, e in zip(chars, starts, ends):
        if ch in (" ", "\n", "\t", ""):
            if buf_chars:
                words.append({
                    "word":  "".join(buf_chars),
                    "start": round(word_start, 3),
                    "end":   round(word_end,   3),
                })
                buf_chars  = []
                word_start = None
                word_end   = None
        else:
            if word_start is None:
                word_start = s
            word_end = e
            buf_chars.append(ch)

    # Flush any trailing word (no trailing space in text)
    if buf_chars:
        words.append({
            "word":  "".join(buf_chars),
            "start": round(word_start, 3),
            "end":   round(word_end,   3),
        })

    return words


# ── API call ───────────────────────────────────────────────────────────────────

def generate_page_audio(
    api_key: str,
    voice_id: str,
    model_id: str,
    text: str,
    voice_settings: dict,
    seed: int | None = None,
) -> tuple[bytes, list[dict]]:
    """
    Call ElevenLabs /text-to-speech/{voice_id}/with-timestamps.

    Returns (mp3_bytes, word_timestamps_list).
    Raises requests.HTTPError on API errors.

    seed: integer for deterministic generation. Same seed + same text = identical
    audio every time. If a page has a breath artifact, try a different seed.
    """
    url = f"{API_BASE}/text-to-speech/{voice_id}/with-timestamps"
    headers = {
        "xi-api-key":   api_key,
        "Content-Type": "application/json",
        "Accept":       "application/json",
    }
    payload = {
        "text":           text,
        "model_id":       model_id,
        "voice_settings": voice_settings,
    }
    if seed is not None:
        payload["seed"] = seed

    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()

    data        = resp.json()
    audio_bytes = base64.b64decode(data["audio_base64"])

    # Prefer normalized_alignment (handles punctuation-adjacent chars better)
    alignment   = data.get("normalized_alignment") or data["alignment"]
    timestamps  = char_alignment_to_words(alignment)

    return audio_bytes, timestamps


# ── Story processing ───────────────────────────────────────────────────────────

def process_story(
    story_dir:    Path,
    api_key:      str,
    voice_id:     str,
    model_id:     str,
    voice_settings: dict,
    skip_existing: bool = True,
    dry_run:      bool  = False,
    word_audio:   bool  = False,
    seed:         int | None = None,
) -> None:
    story_json_path = story_dir / "story.json"
    if not story_json_path.exists():
        print(f"  [skip] {story_dir.name}: no story.json")
        return

    with open(story_json_path, encoding="utf-8") as f:
        story = json.load(f)

    print(f"\n📖  {story['title']}  ({story_dir.name})")

    changed = False

    for i, page in enumerate(story["pages"]):
        page_num       = f"{i + 1:02d}"
        audio_filename = f"page-{page_num}.mp3"
        audio_path     = story_dir / audio_filename
        text           = page["text"]
        # Apply per-page pronunciation overrides (whole-word, case-insensitive).
        # ttsOverrides: {"read": "reed"} sends "reed" to ElevenLabs while the
        # displayed text stays "read".  Use this for heteronyms that TTS gets wrong.
        tts_text = text
        for display_word, spoken_word in page.get("ttsOverrides", {}).items():
            tts_text = re.sub(
                rf"\b{re.escape(display_word)}\b", spoken_word, tts_text, flags=re.IGNORECASE
            )
        label          = text[:55] + ("…" if len(text) > 55 else "")

        # ── Page audio ───────────────────────────────────────────────────────
        if skip_existing and audio_path.exists() and page.get("audio"):
            print(f"  page {page_num}  [skip]  {label}")
        else:
            print(f"  page {page_num}  {label}")
            if dry_run:
                print(f"            → would write {audio_filename}")
            else:
                try:
                    audio_bytes, timestamps = generate_page_audio(
                        api_key, voice_id, model_id, tts_text, voice_settings, seed=seed
                    )
                    audio_path.write_bytes(audio_bytes)
                    page["audio"]      = audio_filename
                    page["timestamps"] = timestamps
                    changed = True
                    kb       = len(audio_bytes) / 1024
                    duration = timestamps[-1]["end"] if timestamps else 0
                    print(f"            ✓ {kb:.1f} KB  {duration:.2f}s  {len(timestamps)} words")
                    time.sleep(0.4)
                except requests.HTTPError as exc:
                    print(f"            ✗ API error {exc.response.status_code}: {exc.response.text[:200]}")
                    continue
                except Exception as exc:
                    print(f"            ✗ {exc}")
                    continue

        # ── Word audio (SSML with inter-word breaks) — only when requested ───
        if word_audio:
            word_audio_filename = f"page-{page_num}-words.mp3"
            word_audio_path     = story_dir / word_audio_filename
            word_skip = (
                skip_existing
                and word_audio_path.exists()
                and page.get("wordAudio")
            )
            if word_skip:
                print(f"            word audio [skip]")
            elif dry_run:
                print(f"            → would write {word_audio_filename}")
            else:
                print(f"            generating word audio …")
                try:
                    ssml = text_to_ssml_with_breaks(text)
                    w_bytes, w_timestamps = generate_page_audio(
                        api_key, voice_id, model_id, ssml, voice_settings
                    )
                    word_audio_path.write_bytes(w_bytes)
                    page["wordAudio"]      = word_audio_filename
                    page["wordTimestamps"] = w_timestamps
                    changed = True
                    w_kb = len(w_bytes) / 1024
                    print(f"            ✓ word audio {w_kb:.1f} KB")
                except Exception as exc:
                    print(f"            ✗ word audio failed: {exc}")
                time.sleep(0.4)

    if changed and not dry_run:
        with open(story_json_path, "w", encoding="utf-8") as f:
            json.dump(story, f, indent=2, ensure_ascii=False)
        print(f"  → story.json updated")
    elif not changed and not dry_run:
        print(f"  → no changes (all pages already have audio)")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate ElevenLabs audio for all ReadAloud story pages",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("ELEVENLABS_API_KEY", ""),
        help="ElevenLabs API key (default: $ELEVENLABS_API_KEY)",
    )
    parser.add_argument(
        "--voice-id",
        default=os.environ.get("ELEVENLABS_VOICE_ID", ""),
        help="ElevenLabs voice ID (default: $ELEVENLABS_VOICE_ID)",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"ElevenLabs model ID (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--story",
        metavar="STORY_ID",
        help="Process only this story (e.g. counting-to-ten). Omit for all stories.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-generate audio even if the file already exists",
    )
    parser.add_argument(
        "--word-audio",
        action="store_true",
        help=(
            "Also generate a separate page-NN-words.mp3 per page using SSML breaks "
            "between words. Used for precise word-tap playback in the app. "
            "Recommended model: eleven_multilingual_v2 or eleven_turbo_v2_5."
        ),
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help=(
            "Integer seed for deterministic generation. Same seed + same text = "
            "identical audio every time. If a page has a breath artifact or glitch, "
            "re-run with a different seed (e.g. --seed 1, --seed 2) until it's clean."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without making any API calls",
    )
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

    total = sum(
        len(json.load(open(d / "story.json"))["pages"])
        for d in story_dirs
        if (d / "story.json").exists()
    )
    print(f"Stories: {len(story_dirs)}   Total pages: {total}")
    if args.dry_run:
        print("(dry run — no API calls will be made)\n")

    for story_dir in story_dirs:
        process_story(
            story_dir     = story_dir,
            api_key       = args.api_key,
            voice_id      = args.voice_id,
            model_id      = args.model,
            voice_settings= DEFAULT_VOICE_SETTINGS,
            skip_existing = not args.force,
            dry_run       = args.dry_run,
            word_audio    = args.word_audio,
            seed          = args.seed,
        )

    print("\n✅  Done")


if __name__ == "__main__":
    main()
