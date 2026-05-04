# ReadAloud Book Creation Guide

## Overview

ReadAloud is a student reading app at Hope Academy (Dominican Republic) with guided-mode audio narration, word-level highlighting, and Spanish support.

## Reading Levels & Grade Mapping

| Reading Level | Grade(s) | Words/Page | Sentences/Page | Font Size | Scrolling |
|---|---|---|---|---|---|
| **Pre-A** | PreK | 6–10 | 1 | 32px | No |
| **A** | K | 8–13 | 1 | 28px | No |
| **B** | 1st | 10–15 | 1 | 28px | No |
| **C** | 2nd | 12–20 | 1 | 28px | No |
| **D** | 3rd | 12–20 | 1 | 28px | No |
| **E** | 3rd+ | 12–20 | 1 | 28px | No |
| **F** | 4th–6th | 35–50 | 2–4 | 22px | **Yes** |

## Creating a New Book

Use `create_book.py` (in root directory) to orchestrate the full pipeline:

```bash
uv run create_book.py \
  --title "Book Title" \
  --grade-level {PreK,K,1st,2nd,3rd,4th,5th,6th} \
  --reading-level {Pre-A,A,B,C,D,E,F} \
  --theme "Story description and characters" \
  --tags theme1,theme2,theme3 \
  --pages 12 \
  [--featured] \
  [--image-quality {high,fast}] \
  [--skip-existing]
```

### Steps

The pipeline runs in order:
1. **story** — Claude generates story.json (text + display colors)
2. **prompts** — Claude generates Illustration_Prompts.md
3. **images** — Gemini generates page images (16:9 landscape)
4. **audio** — ElevenLabs generates page narration + word-level audio
5. **words** — Generates per-word MP3 clips for "tap to hear"
6. **library** — Updates library.json with book metadata

To run only certain steps:
```bash
uv run create_book.py --id the-book-slug --steps story,prompts,images
```

## Important: Longer Books (Grade 4+) & Text Scrolling

### For 5th-grade and above (Reading Level F)

**Reading Level F books automatically support scrollable text.** This allows students to read multi-sentence paragraphs on a single page without text being cut off.

**Key constraints for F-level books:**
- Use `--reading-level F` when creating the book
- Include 2–4 sentences per page (not just one)
- Target 35–50 words per page
- Font size is automatically reduced to 22px (vs 28px for earlier levels)
- Text area has a max-height with vertical scrolling enabled
- Students can scroll within the page to read the full text

**Example of proper F-level structure:**
```
Page 1: "Ashley found an old map in her grandmother's cedar chest. 
         It was yellow with faded ink and smelled of ancient paper. 
         The symbols on it sparked a question in her mind: what was hidden in the mountains?"

Page 2: "Her fingers traced the winding path drawn on the map, carefully following 
         the symbols from the valley town upward toward the forested ridges. 
         She noticed a note in the corner, written in careful cursive: 
         'Para quien tenga el corazón valiente.' For whoever has a brave heart."
```

### Grade categorization

All books must be explicitly marked with a grade level. The library filters by `gradeLevel` to help students find age-appropriate books:

- **PreK–3rd grade books:** Usually 10–20 words/page, scrolling **not needed**
- **4th–6th grade books:** Usually 35–50 words/page, scrolling **required**

When a book is created with `--grade-level 5th` (or 4th/6th), the `gradeLevel` field in `story.json` and `library.json` must match exactly:

```json
{
  "title": "The Mapmaker's Secret",
  "gradeLevel": "5th",
  "readingLevel": "F",
  "pages": 16
}
```

## Book Metadata Fields

After creation, each book has a `story.json` in its folder with:

```json
{
  "title": "Book Title",
  "gradeLevel": "3rd",
  "readingLevel": "C",
  "lexile": "200L",
  "tags": ["tag1", "tag2"],
  "pages": 12,
  "display": {
    "fontSize": 28,
    "fontFamily": "Andika",
    "lineHeight": 1.75,
    "wordSpacing": "0.15em",
    "letterSpacing": "0.03em"
  },
  "pages": [
    {
      "text": "Page text here.",
      "image": "page-01.webp",
      "bg": "#FFF8E7",
      "accent": "#D4A574",
      "audio": "page-01.mp3",
      "timestamps": [[0.0, 0.5], [0.5, 1.2]]
    }
    // ... more pages
  ]
}
```

## Image Generation

Images are 16:9 landscape (1920×1080 or 1024×576). Gemini generates using prompts that describe:
- Character appearance (warm brown skin, specific clothing colors, hairstyles)
- Setting details (Caribbean neighborhood, rainforest, beach, etc.)
- Emotional tone matching the page
- **Important:** Prompts should NOT mention text, captions, or words to avoid AI-generated text artifacts

## Audio Generation

Uses ElevenLabs with per-word timestamps for "tap to hear" interaction.

- **Page audio:** 1 MP3 per page (e.g., `page-01.mp3`)
- **Word audio:** Normalized stem filename (e.g., `words/exploring.mp3` for the word "Exploring")
- Timestamps array syncs word highlights to audio playback

## Library Updates

After a book is created, `library.json` is updated with:

```json
{
  "stories": [
    {
      "id": "book-slug",
      "title": "Book Title",
      "gradeLevel": "3rd",
      "readingLevel": "C",
      "pages": 12,
      "cover": "stories/book-slug/cover.jpg",
      "featured": false
    }
  ]
}
```

The **grade filter** at the top of the library uses `gradeLevel` to show books by:
- All
- PreK
- K
- 1st through 6th grade

## Characters & Continuity

### Named Students

These are real Hope Academy students and should appear consistently across books:
- **Ashley** — curious, brave, thoughtful
- **Marcos** — enthusiastic, supportive
- **Axel** — humorous, kind-hearted
- **Lucianna** — organized, observant, skilled note-taker
- **Clifford** — gentle, tall, responsible
- **Nashla** — natural leader, compassionate

Other characters (teachers, families, community) can be introduced as needed but should stay within a Caribbean/Dominican context unless the theme specifies otherwise.

### Consistent Styling

- **Character appearance:** Warm brown skin, dark hair, appropriate clothing for setting/season
- **Setting:** Caribbean Dominican neighborhoods, tropical environments, family homes
- **Emotional tone:** Warm, joyful, inclusive, age-appropriate

## Backend Code Notes

### `/home/kabur/readaloud/create_book.py`

Main orchestration script:
- `font_size_for_level()` — Returns font size for reading level (32 for Pre-A, 22 for F, 28 default)
- `lexile_for_level()` — Returns Lexile score estimate
- `STORY_SYSTEM` / `STORY_USER` — Prompts for Claude story generation
- Each step is a function that can be run independently

### `/home/kabur/readaloud/src/components/BookReader.jsx`

Page rendering component:
- Line 578–598: Text area now supports scrolling for longer books
- Line 91–92: `display` object from story.json controls font size
- `textArea` style (line 795) has `maxHeight: 280` with `overflowY: "auto"`

### `/home/kabur/readaloud/src/components/Library.jsx`

Library view with grade filters:
- Lines 35–44: `GRADE_FILTERS` array (includes PreK–6th)
- Line 48: `gradeFilter` state tracks selected grade
- Line 81: Filters stories by `story.gradeLevel`

## Workflow Checklist

- [ ] Write theme/story idea
- [ ] Choose grade level (PreK–6th) and reading level (Pre-A–F)
- [ ] Run `create_book.py` with all steps
- [ ] Review generated story for length, tone, vocabulary
- [ ] Review images for glitches, text artifacts, consistency
- [ ] Check audio playback and word-level sync
- [ ] Verify `library.json` entry has correct `gradeLevel`
- [ ] Test on mobile/iPad, especially for grade 4+ books (scrolling)
- [ ] Deploy to Netlify: `npm run build`, upload `/dist`

## Common Issues

**Text doesn't fit on screen for grade 4+ books:**
- Ensure reading level is F and gradeLevel is 4th/5th/6th
- BookReader.jsx textArea should have scrolling enabled (it does by default as of this update)
- Test on iPad in portrait orientation

**Images have AI-generated text artifacts:**
- Rewrite prompts to remove any mention of text, captions, words, labels
- Use purely visual language: "show the expression on her face," not "show text above"

**Word audio clips don't work:**
- Verify word stems match filenames (lowercase, no punctuation)
- Check that story.json has `audio` field populated for the page
- Ensure ElevenLabs API key is set in environment

