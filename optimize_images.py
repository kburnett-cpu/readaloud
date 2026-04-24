#!/usr/bin/env python3
"""
Optimize story page images for web/mobile delivery.
- Converts PNG → WebP (far smaller file sizes)
- Resizes to max 1024px wide (retains aspect ratio)
- Updates story.json to reference .webp instead of .png
- Saves originals to a backup folder before overwriting
- Prints a before/after size summary
"""

import json
import os
import shutil
from pathlib import Path
from PIL import Image

STORIES_DIR = Path(__file__).parent / "public" / "stories"
BACKUP_DIR = Path(__file__).parent / "public" / "stories_backup_originals"
MAX_WIDTH = 1024
WEBP_QUALITY = 85  # 0-100; 85 is a good balance of quality vs size

total_before = 0
total_after = 0
converted = 0

for story_dir in sorted(STORIES_DIR.iterdir()):
    if not story_dir.is_dir():
        continue

    pngs = sorted(story_dir.glob("page-*.png"))
    if not pngs:
        continue

    print(f"\n{story_dir.name}")

    for png_path in pngs:
        # Back up original
        backup_story = BACKUP_DIR / story_dir.name
        backup_story.mkdir(parents=True, exist_ok=True)
        shutil.copy2(png_path, backup_story / png_path.name)

        size_before = png_path.stat().st_size
        total_before += size_before

        with Image.open(png_path) as img:
            # Convert to RGB (drops alpha channel — not needed for story pages)
            img = img.convert("RGB")

            # Resize if wider than MAX_WIDTH
            if img.width > MAX_WIDTH:
                new_height = int(img.height * MAX_WIDTH / img.width)
                img = img.resize((MAX_WIDTH, new_height), Image.LANCZOS)

            # Save as WebP alongside the PNG first, then remove PNG
            webp_path = png_path.with_suffix(".webp")
            img.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)

        size_after = webp_path.stat().st_size
        total_after += size_after

        # Remove the original PNG
        png_path.unlink()

        pct = (1 - size_after / size_before) * 100
        print(f"  {png_path.name} → {webp_path.name}  "
              f"{size_before/1024/1024:.1f}MB → {size_after/1024:.0f}KB  ({pct:.0f}% smaller)")
        converted += 1

    # Update story.json to reference .webp instead of .png
    story_json = story_dir / "story.json"
    if story_json.exists():
        shutil.copy2(story_json, BACKUP_DIR / story_dir.name / "story.json")
        text = story_json.read_text(encoding="utf-8")
        updated = text.replace('.png"', '.webp"')
        if updated != text:
            story_json.write_text(updated, encoding="utf-8")
            print(f"  story.json updated (.png → .webp)")

print(f"\n{'='*60}")
print(f"Converted {converted} images")
print(f"Total before: {total_before/1024/1024:.1f} MB")
print(f"Total after:  {total_after/1024/1024:.1f} MB")
print(f"Space saved:  {(total_before-total_after)/1024/1024:.1f} MB  "
      f"({(1-total_after/total_before)*100:.0f}% reduction)")
print(f"\nOriginals backed up to: {BACKUP_DIR}")
