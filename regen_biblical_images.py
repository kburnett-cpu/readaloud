#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""
Regenerate images for the 5 Biblical books that still have placeholder images.
Reads existing Illustration_Prompts.json, skips any real images (>20KB).
"""

import base64
import json
import signal
import time
from io import BytesIO
from pathlib import Path

GEMINI_API_KEY    = "AIzaSyBWtMtsIec47gsIHLA7QbDheCsnLBlHWzc"
GEMINI_MODEL      = "gemini-3-pro-image-preview"
GEMINI_RESOLUTION = "1K"
GEMINI_ASPECT     = "16:9"
REAL_IMAGE_MIN_BYTES = 20_000

STORIES_DIR = Path(__file__).parent / "public" / "stories"

BOOKS = [
    "jesus-feeds-5000",
    "jesus-heals-blind-man",
    "the-lost-sheep",
    "lazarus-rises",
    "jesus-walks-water",
]


def timeout_handler(signum, frame):
    raise TimeoutError("Gemini API call timed out after 90s")


def generate_one_image(client, prompt: str, output_path: Path, retries: int = 3) -> bool:
    from google.genai import types
    from PIL import Image as PILImage

    for attempt in range(retries):
        try:
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(90)
            try:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["TEXT", "IMAGE"],
                        image_config=types.ImageConfig(
                            image_size=GEMINI_RESOLUTION,
                            aspect_ratio=GEMINI_ASPECT,
                        ),
                    ),
                )
            finally:
                signal.alarm(0)

            for part in response.parts:
                if part.inline_data is not None:
                    image_data = part.inline_data.data
                    if isinstance(image_data, str):
                        image_data = base64.b64decode(image_data)
                    img = PILImage.open(BytesIO(image_data))
                    if img.mode != "RGB":
                        img = img.convert("RGB")
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    img.save(str(output_path), "WEBP", quality=85)
                    return True
            print(f"    Warning: no image in response (attempt {attempt+1})")
        except TimeoutError as e:
            print(f"    Timeout on attempt {attempt+1}: {e}")
        except Exception as e:
            print(f"    Error attempt {attempt+1}: {e}")

        if attempt < retries - 1:
            wait = 15 * (attempt + 1)
            print(f"    Waiting {wait}s before retry...")
            time.sleep(wait)

    return False


def process_book(client, book_id: str):
    book_dir = STORIES_DIR / book_id
    prompts_path = book_dir / "Illustration_Prompts.json"

    if not prompts_path.exists():
        print(f"  SKIP: no Illustration_Prompts.json for {book_id}")
        return

    with open(prompts_path) as f:
        prompts = json.load(f)

    master = prompts["master_style"]
    page_prompts = prompts["page_prompts"]
    n = len(page_prompts)

    print(f"  Generating {n} images for {book_id}...")
    ok = fail = skipped = 0

    for i, page_prompt in enumerate(page_prompts):
        filename = f"page-{i+1:02d}.webp"
        out = book_dir / filename

        if out.exists() and out.stat().st_size > REAL_IMAGE_MIN_BYTES:
            size_kb = out.stat().st_size // 1024
            print(f"    page {i+1:02d}/{n}: skip (real image, {size_kb}KB)")
            ok += 1
            skipped += 1
            continue

        full_prompt = f"{master}\n\n{page_prompt}"
        print(f"    page {i+1:02d}/{n}...", end=" ", flush=True)
        success = generate_one_image(client, full_prompt, out)
        if success:
            size_kb = out.stat().st_size // 1024
            print(f"done ({size_kb}KB)")
            ok += 1
        else:
            print("FAILED")
            fail += 1

        if i < n - 1:
            time.sleep(3)

    # Create cover.jpg from page-01.webp
    from PIL import Image as PILImage
    cover_src = book_dir / "page-01.webp"
    cover_dst = book_dir / "cover.jpg"
    if cover_src.exists() and cover_src.stat().st_size > REAL_IMAGE_MIN_BYTES:
        img = PILImage.open(str(cover_src))
        img.save(str(cover_dst), "JPEG", quality=90)
        print(f"  Created cover.jpg")

    print(f"  Done: {ok} ok ({skipped} skipped), {fail} failed\n")


def main():
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)

    for book_id in BOOKS:
        print(f"\n{'='*60}")
        print(f"Book: {book_id}")
        print('='*60)
        process_book(client, book_id)

    print("All books processed.")


if __name__ == "__main__":
    main()
