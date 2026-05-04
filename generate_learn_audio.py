#!/usr/bin/env python3
"""
Generate audio files for the ReadAloud Early Literacy activities.

Modes
-----
  --mode phonemes    26 isolated phoneme sounds  → public/learn/phonemes/{a-z}.mp3
  --mode heartwords  6 heart word full-word audio → public/learn/heartwords/{word}.mp3
  --mode syllable    12 bilingual word audio       → public/learn/syllable/{word}-{lang}.mp3
  --mode rhyme       18 rhyme word audio           → public/learn/rhyme/{word}.mp3
  --mode all         all of the above

Usage
-----
  ELEVENLABS_API_KEY=sk-... uv run generate_learn_audio.py --voice-id <id> --mode all
  ELEVENLABS_API_KEY=sk-... uv run generate_learn_audio.py --voice-id <id> --mode phonemes
"""

import argparse, json, os, sys, time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests is not installed. Run: pip install requests")

PUBLIC_DIR  = Path(__file__).parent / "public" / "learn"
API_BASE    = "https://api.elevenlabs.io/v1"
DEFAULT_MODEL = "eleven_multilingual_v2"

VOICE_SETTINGS = {
    "stability":         0.80,
    "similarity_boost":  0.80,
    "style":             0.05,
    "use_speaker_boost": True,
}

# ElevenLabs TTS text for each phoneme.
# For continuants, repeat the sound; for stops, add minimal schwa.
PHONEME_TEXTS = {
    "a": "aaa",          # short /æ/ as in apple
    "b": "buh",          # stop
    "c": "kkk",          # /k/ as in cat
    "d": "duh",          # stop
    "e": "eee",          # short /ɛ/ as in egg
    "f": "fff",          # continuant
    "g": "guh",          # stop
    "h": "hhh",          # continuant
    "i": "iii",          # short /ɪ/ as in itch
    "j": "juh",          # affricate
    "k": "kkk",          # stop
    "l": "lll",          # continuant
    "m": "mmm",          # continuant
    "n": "nnn",          # continuant
    "o": "ooo",          # short /ɒ/ as in octopus
    "p": "puh",          # stop
    "q": "kwuh",         # /kw/ cluster
    "r": "rrr",          # continuant
    "s": "sss",          # continuant
    "t": "tuh",          # stop
    "u": "uuu",          # short /ʌ/ as in umbrella
    "v": "vvv",          # continuant
    "w": "www",          # continuant
    "x": "ksss",         # /ks/ cluster
    "y": "yyy",          # continuant
    "z": "zzz",          # continuant
}

HEART_WORDS = ["the", "said", "was", "have", "give", "come"]

SYLLABLE_WORDS = {
    "cat":       "cat",
    "dog":       "dog",
    "butterfly": "butterfly",
    "house":     "house",
    "sun":       "sun",
    "mango":     "mango",
    "beach":     "beach",
    "turtle":    "turtle",
    "school":    "school",
    "family":    "family",
    "flower":    "flower",
    "book":      "book",
}

RHYME_WORDS = ["cat", "hat", "dog", "sun", "fish", "fun", "tree", "bee", "ball",
               "ring", "star", "king", "cake", "lake", "bird", "night", "rain", "light"]


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


def write_mp3(path: Path, data: bytes, dry_run: bool) -> None:
    if dry_run:
        print(f"  [dry-run] would write {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def run_phonemes(api_key, voice_id, model_id, skip_existing, dry_run):
    print("\n🔤  Generating phoneme sounds…")
    out_dir = PUBLIC_DIR / "phonemes"
    generated = skipped = errors = 0
    for letter, text in PHONEME_TEXTS.items():
        path = out_dir / f"{letter}.mp3"
        if skip_existing and path.exists():
            skipped += 1
            continue
        print(f"  {letter.upper()} → \"{text}\"")
        if not dry_run:
            try:
                mp3 = generate_mp3(api_key, voice_id, model_id, text)
                write_mp3(path, mp3, dry_run)
                generated += 1
                time.sleep(0.3)
            except Exception as e:
                print(f"    ERROR: {e}")
                errors += 1
        else:
            write_mp3(path, b"", dry_run)
            generated += 1
    print(f"  ✓ {generated} generated, {skipped} skipped, {errors} errors")


def run_heartwords(api_key, voice_id, model_id, skip_existing, dry_run):
    print("\n❤️   Generating heart word audio…")
    out_dir = PUBLIC_DIR / "heartwords"
    generated = skipped = errors = 0
    for word in HEART_WORDS:
        path = out_dir / f"{word}.mp3"
        if skip_existing and path.exists():
            skipped += 1
            continue
        print(f"  {word}")
        if not dry_run:
            try:
                mp3 = generate_mp3(api_key, voice_id, model_id, word)
                write_mp3(path, mp3, dry_run)
                generated += 1
                time.sleep(0.3)
            except Exception as e:
                print(f"    ERROR: {e}")
                errors += 1
        else:
            write_mp3(path, b"", dry_run)
            generated += 1
    print(f"  ✓ {generated} generated, {skipped} skipped, {errors} errors")


def run_syllable(api_key, voice_id, model_id, skip_existing, dry_run):
    print("\n👏  Generating syllable word audio…")
    out_dir = PUBLIC_DIR / "syllable"
    generated = skipped = errors = 0
    for stem, text in SYLLABLE_WORDS.items():
        path = out_dir / f"{stem}.mp3"
        if skip_existing and path.exists():
            skipped += 1
            continue
        print(f"  {stem} → \"{text}\"")
        if not dry_run:
            try:
                mp3 = generate_mp3(api_key, voice_id, model_id, text)
                write_mp3(path, mp3, dry_run)
                generated += 1
                time.sleep(0.3)
            except Exception as e:
                print(f"    ERROR: {e}")
                errors += 1
        else:
            write_mp3(path, b"", dry_run)
            generated += 1
    print(f"  ✓ {generated} generated, {skipped} skipped, {errors} errors")


def run_rhyme(api_key, voice_id, model_id, skip_existing, dry_run):
    print("\n🎵  Generating rhyme word audio…")
    out_dir = PUBLIC_DIR / "rhyme"
    generated = skipped = errors = 0
    for word in RHYME_WORDS:
        path = out_dir / f"{word}.mp3"
        if skip_existing and path.exists():
            skipped += 1
            continue
        print(f"  {word}")
        if not dry_run:
            try:
                mp3 = generate_mp3(api_key, voice_id, model_id, word)
                write_mp3(path, mp3, dry_run)
                generated += 1
                time.sleep(0.3)
            except Exception as e:
                print(f"    ERROR: {e}")
                errors += 1
        else:
            write_mp3(path, b"", dry_run)
            generated += 1
    print(f"  ✓ {generated} generated, {skipped} skipped, {errors} errors")


def main():
    parser = argparse.ArgumentParser(description="Generate ReadAloud Early Literacy audio files")
    parser.add_argument("--voice-id", default=os.getenv("ELEVENLABS_VOICE_ID", ""), help="ElevenLabs voice ID")
    parser.add_argument("--model",    default=DEFAULT_MODEL, help="ElevenLabs model ID")
    parser.add_argument("--mode",     default="all", choices=["phonemes", "heartwords", "syllable", "rhyme", "all"])
    parser.add_argument("--skip-existing", action="store_true", default=True, help="Skip files that already exist")
    parser.add_argument("--no-skip",  dest="skip_existing", action="store_false")
    parser.add_argument("--dry-run",  action="store_true")
    args = parser.parse_args()

    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key and not args.dry_run:
        sys.exit("Set ELEVENLABS_API_KEY environment variable")
    if not args.voice_id and not args.dry_run:
        sys.exit("Provide --voice-id or set ELEVENLABS_VOICE_ID environment variable")

    fns = {
        "phonemes":   run_phonemes,
        "heartwords": run_heartwords,
        "syllable":   run_syllable,
        "rhyme":      run_rhyme,
    }

    if args.mode == "all":
        for fn in fns.values():
            fn(api_key, args.voice_id, args.model, args.skip_existing, args.dry_run)
    else:
        fns[args.mode](api_key, args.voice_id, args.model, args.skip_existing, args.dry_run)

    print("\n✅  Done.")


if __name__ == "__main__":
    main()
