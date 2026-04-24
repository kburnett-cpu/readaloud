#!/usr/bin/env python3
"""
Resize and convert story images to WebP for fast mobile loading.

Source PNGs are 2624×1632 (~7 MB each).
Output WebPs are 880×550 at quality 82 (~80–150 KB each) — crisp on 2× retina
at the 440 px max-width the book card uses.

Saves compressed files alongside the originals as page-XX.webp.
Does NOT delete the originals (run with --replace to overwrite in-place,
keeping the .png filename but writing WebP bytes — useful if you want to
avoid changing story.json image references).

Usage
-----
    python compress_images.py            # dry run — shows what would change
    python compress_images.py --write    # write .webp files next to originals
    python compress_images.py --replace  # overwrite .png files with WebP bytes
                                         # (filename stays .png, content is WebP)
    python compress_images.py --story counting-to-ten --write
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow not installed. Run: pip install Pillow")

STORIES_DIR = Path(__file__).parent / "public" / "stories"

# Target dimensions — matches 16:10 aspect ratio at 2× the 440 px card width
TARGET_W = 880
TARGET_H = 550
WEBP_QUALITY = 82   # 80–85 is the sweet spot: visually lossless, small file


def compress_image(src: Path, mode: str, dry_run: bool) -> None:
    """Resize src image and write compressed output."""
    if mode == "replace":
        dst = src          # overwrite in-place (WebP bytes, .png extension)
    else:
        dst = src.with_suffix(".webp")

    with Image.open(src) as img:
        orig_w, orig_h = img.size
        orig_kb = src.stat().st_size // 1024

        # Resize with high-quality Lanczos downsampling
        img_resized = img.resize((TARGET_W, TARGET_H), Image.LANCZOS)

        # Drop alpha channel for JPEG-mode WebP (smaller); keep for RGBA sources
        # that actually use transparency. Most illustrations are opaque.
        if img_resized.mode == "RGBA":
            # Check if any pixel is actually transparent
            extrema = img_resized.split()[3].getextrema()
            if extrema[0] == 255:  # all pixels fully opaque
                img_resized = img_resized.convert("RGB")

        if dry_run:
            print(f"  {src.name}  {orig_w}×{orig_h} {orig_kb} KB  →  {TARGET_W}×{TARGET_H} webp (would write {dst.name})")
            return

        img_resized.save(dst, "WEBP", quality=WEBP_QUALITY, method=6)
        new_kb = dst.stat().st_size // 1024
        saved = orig_kb - new_kb
        print(f"  {src.name}  {orig_kb} KB  →  {new_kb} KB  (saved {saved} KB)  →  {dst.name}")


def process_story(story_dir: Path, mode: str, dry_run: bool) -> None:
    images = sorted(story_dir.glob("*.png")) + sorted(story_dir.glob("*.jpg")) + sorted(story_dir.glob("*.jpeg"))
    if not images:
        return
    print(f"\n📖  {story_dir.name}")
    for img_path in images:
        try:
            compress_image(img_path, mode, dry_run)
        except Exception as exc:
            print(f"  ✗ {img_path.name}: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compress story images to WebP")
    parser.add_argument("--story", metavar="STORY_ID", help="Process only this story")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--write",   action="store_true", help="Write .webp files alongside originals")
    group.add_argument("--replace", action="store_true", help="Overwrite originals with WebP bytes (keeps .png filenames)")
    args = parser.parse_args()

    dry_run = not args.write and not args.replace
    mode    = "replace" if args.replace else "webp"

    if dry_run:
        print("Dry run — showing what would be compressed (pass --write or --replace to apply)\n")

    if args.story:
        dirs = [STORIES_DIR / args.story]
    else:
        dirs = sorted(d for d in STORIES_DIR.iterdir() if d.is_dir())

    total_before = 0
    total_after  = 0

    for story_dir in dirs:
        process_story(story_dir, mode, dry_run)

    if not dry_run:
        # Summary
        before = sum(f.stat().st_size for f in STORIES_DIR.rglob("*.png")) + \
                 sum(f.stat().st_size for f in STORIES_DIR.rglob("*.jpg"))
        after  = sum(f.stat().st_size for f in STORIES_DIR.rglob("*.webp")) + \
                 sum(f.stat().st_size for f in STORIES_DIR.rglob("*.png"))  # originals still there if --write
        print(f"\n✅  Done")
    else:
        print(f"\n(run with --replace to apply)")


if __name__ == "__main__":
    main()
