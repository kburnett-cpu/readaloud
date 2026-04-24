# ReadAloud - Technical Implementation Spec
## For Claude Code

---

## Overview

ReadAloud is a lightweight, static web app where preschool children at Hope Academy (Dominican Republic) listen to English storybooks being read aloud with synchronized word-by-word highlighting. It runs on budget Android phones via mobile browser.

**This is a fully static app. No backend. No database. No authentication.** Just HTML/CSS/JS + static assets (images, audio, JSON) deployed to Netlify.

---

## Tech Stack

- **Framework:** React (Vite)
- **Styling:** Inline styles or CSS modules (no Tailwind, keep bundle tiny)
- **Hosting:** Netlify (free tier, deploy from GitHub)
- **Audio:** Pre-generated MP3 files from ElevenLabs (stored as static assets)
- **Timestamps:** Pre-generated word-level timestamps stored in story JSON files
- **No backend, no database, no auth**

---

## Project Structure

```
readaloud/
├── public/
│   ├── stories/
│   │   ├── the-big-dog/
│   │   │   ├── story.json
│   │   │   ├── cover.jpg
│   │   │   ├── page-01.png
│   │   │   ├── page-01.mp3
│   │   │   ├── page-02.png
│   │   │   ├── page-02.mp3
│   │   │   └── ... (through page-11)
│   │   ├── counting-to-ten/
│   │   │   ├── story.json
│   │   │   └── ...
│   │   └── ... (more stories)
│   └── library.json
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── Library.jsx
│   │   ├── BookReader.jsx
│   │   ├── Celebration.jsx
│   │   └── WordHighlighter.jsx
│   ├── hooks/
│   │   └── useAudioSync.js
│   └── main.jsx
├── tools/
│   └── generate_audio.py
├── index.html
├── package.json
└── vite.config.js
```

---

## Data Formats

### library.json

An index of all available stories. Lives in `public/library.json`.

```json
{
  "stories": [
    {
      "id": "the-big-dog",
      "title": "The Big Dog",
      "author": "Hope Academy",
      "cover": "stories/the-big-dog/cover.jpg",
      "pages": 11,
      "featured": true,
      "gradeLevel": "PreK",
      "readingLevel": "Pre-A",
      "lexile": "BR100L",
      "tags": ["animals", "friendship"],
      "narrator": "Kirk"
    },
    {
      "id": "counting-to-ten",
      "title": "Counting to Ten",
      "author": "Hope Academy",
      "cover": "stories/counting-to-ten/cover.jpg",
      "pages": 12,
      "featured": false,
      "gradeLevel": "PreK",
      "readingLevel": "Pre-A",
      "lexile": "BR50L",
      "tags": ["numbers", "counting"],
      "narrator": "Kirk"
    }
  ]
}
```

**Field reference:**
- `featured`: marks the "Story of the Week" — shown prominently in the library
- `gradeLevel`: one of `"PreK"`, `"K"`, `"Grade1"`, `"Grade2"`, `"Grade3"`, `"Grade4"`, `"Grade5"`, `"Grade6"`. The Library component currently shows all stories (no filter UI in Phase 1), but these fields MUST be present on every entry so that grade-level filtering can be added in Phase 2 without migrating data.
- `readingLevel`: guided reading level (Pre-A, A, B, C, etc.)
- `lexile`: Lexile measure for the story
- `tags`: array of topic tags for future search/filtering
- `narrator`: who recorded the audio

### story.json

Each story folder contains a `story.json` with metadata, page text, audio filenames, image filenames, and word-level timestamps.

```json
{
  "schemaVersion": 1,
  "id": "the-big-dog",
  "title": "The Big Dog",
  "author": "Hope Academy",
  "narrator": "Kirk",
  "cover": "cover.jpg",
  "gradeLevel": "PreK",
  "readingLevel": "Pre-A",
  "lexile": "BR100L",
  "wordCount": 62,
  "highlightMode": "word",
  "celebrationStyle": "confetti",
  "display": {
    "fontSize": 32,
    "fontFamily": "Andika",
    "lineHeight": 1.75,
    "wordSpacing": "0.15em",
    "letterSpacing": "0.03em"
  },
  "pages": [
    {
      "text": "This is Max.",
      "image": "page-01.png",
      "audio": "page-01.mp3",
      "bg": "#E3F2FD",
      "accent": "#42A5F5",
      "timestamps": [
        { "word": "This", "start": 0.12, "end": 0.38 },
        { "word": "is", "start": 0.42, "end": 0.58 },
        { "word": "Max.", "start": 0.65, "end": 1.10 }
      ]
    },
    {
      "text": "Max is a very big dog.",
      "image": "page-02.png",
      "audio": "page-02.mp3",
      "bg": "#E8F5E9",
      "accent": "#66BB6A",
      "timestamps": [
        { "word": "Max", "start": 0.10, "end": 0.45 },
        { "word": "is", "start": 0.50, "end": 0.62 },
        { "word": "a", "start": 0.66, "end": 0.74 },
        { "word": "very", "start": 0.80, "end": 1.10 },
        { "word": "big", "start": 1.15, "end": 1.45 },
        {
          "word": "dog.",
          "start": 1.50,
          "end": 1.95,
          "syllables": [
            { "text": "d", "start": 1.50, "end": 1.62 },
            { "text": "o", "start": 1.62, "end": 1.75 },
            { "text": "g", "start": 1.75, "end": 1.95 }
          ]
        }
      ]
    }
  ],
  "comprehension": [
    {
      "question": "Where did Sam and Max go?",
      "question_es": "¿Adónde fueron Sam y Max?",
      "choices": ["The park", "The school", "The store"],
      "correct": 0
    }
  ]
}
```

**Schema field reference:**

| Field | Required | Purpose |
|-------|----------|---------|
| `schemaVersion` | YES | Integer version number. Allows BookReader to handle differences between story formats across grade levels without breaking old content. Current version: `1`. |
| `gradeLevel` | YES | `"PreK"`, `"K"`, `"Grade1"` through `"Grade6"`. Determines default behavior for audio, highlighting, and celebration. |
| `readingLevel` | YES | Guided reading level (Pre-A, A, B, C, etc.) |
| `lexile` | YES | Lexile measure (e.g., "BR100L" for beginning reader) |
| `wordCount` | YES | Total words in the story. Useful for analytics and difficulty sorting. |
| `highlightMode` | YES | How words highlight during audio playback. One of: `"word"` (Pre-K/K — word-by-word karaoke, current behavior), `"sentence"` (Grade 1 — whole sentence highlights), `"phrase"` (Grade 2 — phrase-level chunks), `"none"` (Grade 3+ — no auto-highlight, on-demand only). **Phase 1 only implements `"word"` mode.** The BookReader should read this field and fall back to `"word"` if the mode is unrecognized. |
| `celebrationStyle` | NO | `"confetti"` (default — emoji stars, confetti animation, "Great job!") or `"achievement"` (older grades — clean badge/stamp, more mature tone). If absent, defaults to `"confetti"`. **Phase 1 only implements `"confetti"`.** Celebration.jsx should check this field and fall through to confetti if unrecognized. |
| `display` | NO | Optional font/sizing overrides. If absent, BookReader uses defaults: `{ fontSize: 32, fontFamily: "Andika", lineHeight: 1.75, wordSpacing: "0.15em", letterSpacing: "0.03em" }`. Higher-grade stories can override, e.g. `{ fontSize: 20, fontFamily: "Nunito", lineHeight: 1.6, wordSpacing: "0.08em", letterSpacing: "0.01em" }`. **BookReader MUST read these values at runtime, not hardcode them.** |
| `comprehension` | NO | Optional array of post-reading comprehension questions. If absent (all Pre-K stories), skip comprehension entirely. If present, show after the Celebration screen. **Phase 1 does NOT build a ComprehensionScreen component.** But the field must be accepted without breaking the reader. |
| `syllables` (per word) | NO | Optional sub-array on individual timestamp entries. Phase 2 feature — see Word Highlighting section. |

**Note:** All Pre-K stories at launch will have identical values for `highlightMode` ("word"), `celebrationStyle` ("confetti"), and `display` (Andika 32px). This is expected. The fields exist so that when Grade 1+ content is added, the BookReader handles it without code changes — just different JSON values.

---

## Screens & UX

There are 3 screens: **Library**, **Book Reader**, and **Celebration**.

### Screen 1: Library

- **URL:** `/` (root)
- Grid of book covers, 2 columns on mobile
- Each card shows: cover image, title
- The story with `featured: true` gets a star badge: "⭐ This Week" / "⭐ Esta Semana"
- **Completed books** show a ⭐ badge on their cover (separate from the "This Week" badge). Completion state is stored in `localStorage` under key `readaloud_completed` as a JSON array of story IDs, e.g. `["the-big-dog", "counting-to-ten"]`. If a story's ID is in the array, show the completion star.
- Tap a cover to open the Book Reader
- Header: "ReadAloud" with Hope Academy branding
- Language toggle (EN/ES) in top right — controls UI labels only, story text is always English
- Bilingual: button labels, instructions in both languages based on toggle

### Screen 2: Book Reader

**Layout (top to bottom):**
1. Top bar: title of current story (in English, always) + guided mode toggle + language toggle
2. Progress bar: horizontal segmented bar (like Instagram Stories) showing current page position
3. Book: illustration on top, text below (Andika font, 32px), page number at bottom
4. Floating controls: ↻ slow replay button (bottom-right of book, offset left) + ♾️ loop toggle (bottom-right of book)

**Navigation — social media style + guided mode:**
- Swipe left → next page
- Swipe right → previous page
- Tap right 30% of screen → next page
- Tap left 30% of screen → previous page
- NO arrow buttons, NO bottom navigation bar
- Page transition: quick slide animation (250ms, translateX)

**Two navigation modes — toggled via a small icon in the top bar:**

1. **Free mode (default):** Pages only advance when the user taps or swipes. After audio finishes, the page stays. This is for kids browsing on their own or parents controlling the pace.

2. **Guided mode:** After the page audio finishes, wait 3 seconds, then auto-advance to the next page. The next page auto-plays its audio. This creates a hands-free, lean-back experience — the parent presses play and the whole book reads itself start to finish. On the last page, guided mode stops (does not loop back to page 1).

- **Toggle icon:** A small button in the top bar, next to the language toggle. Show ▶▶ (auto) when guided mode is ON, show ✋ (manual) when free mode is ON.
- **Guided mode respects loop mode:** If auto-repeat (♾️) is ON, guided mode waits for loop to be toggled OFF before advancing. Loop takes priority.
- **User can still manually navigate** in guided mode — swiping/tapping always works regardless of mode.

**Audio — auto-play:**
- Audio plays automatically when arriving on each page (400ms delay after page appears) at normal speed (1.0x)
- Browser requirement: user must interact with the page once before audio can play. Show a "Tap to start" overlay on first load. After first tap, it goes away and audio auto-plays from then on.
- The ↻ replay button replays the current page audio at 0.75x speed (`audio.playbackRate = 0.75`). Word highlighting still syncs correctly because it reads `audio.currentTime`.
- The ♾️ loop toggle, when ON, auto-replays the page after a 1.5s pause. First play is 1.0x, loop replays are 0.75x.
- **Tap-to-hear:** Tapping any individual word stops page audio and speaks that word in isolation via browser SpeechSynthesis

**Word highlighting:**
- As audio plays, individual words highlight one by one
- Highlighting uses a `requestAnimationFrame` loop comparing `audio.currentTime` against the timestamp array from story.json
- Highlight style: soft yellow background (#FFEAA7) PLUS a karaoke underline (3px solid border-bottom in the page's accent color), slightly bolder weight, subtle box shadow
- Transition: 180ms ease for smooth highlight movement
- When audio ends, highlighting clears after 300ms
- Tapping any word speaks it in isolation (see Tap-to-hear above)

**Book design:**
- Book card has: left spine shadow, right page-edge texture, bottom page-edge texture, warm paper background (#FFFEF9 → #FFF9F0)
- Rounded corners: 4px on spine side, 16px on open side
- Illustration: top section, aspect ratio 16:10, object-fit cover
- Text: below illustration, centered, Andika font at 32px, word-spacing 0.15em, letter-spacing 0.03em, line-height 1.75
- Page number: "3 / 11" style, small, gray, centered below text

### Screen 3: Celebration (End-of-Book)

Shown automatically after the last page's audio finishes (or when user swipes forward past the last page).

**Layout:**
- Full screen overlay on top of the reader
- Background: page's accent color with slight transparency, or a warm gradient
- Confetti animation: lightweight CSS-only confetti (use multiple small `<div>` elements with `@keyframes` for falling/rotating animation — NO external confetti libraries to keep bundle small). 20-30 colored squares/circles falling from top, randomized horizontal positions, 3-4 second animation.
- Center content:
  - Large star emoji: 🌟 (64px)
  - Main text: "Great job!" / "¡Muy bien!" (Nunito, 32px, font-weight 900, white)
  - Subtitle: "You finished {story title}!" / "¡Terminaste {story title}!" (Nunito, 16px, font-weight 600, rgba(255,255,255,0.85))
  - Two buttons below (pill-shaped, side by side):
    - "Read Again" / "Leer otra vez" → resets to page 1 of same story
    - "More Books" / "Más libros" → returns to Library screen

**Completion tracking:**
- When the celebration screen appears, save the story ID to `localStorage`:
```javascript
const completed = JSON.parse(localStorage.getItem("readaloud_completed") || "[]");
if (!completed.includes(storyId)) {
  completed.push(storyId);
  localStorage.setItem("readaloud_completed", JSON.stringify(completed));
}
```
- The Library screen reads this array on mount and shows a ⭐ completion badge on any book whose ID is in the list.

**Completion badge (Library screen):**
- position: absolute, top -4px, left -4px (opposite corner from the "This Week" badge)
- A green circle (28px diameter) with a white ⭐ inside
- background: #27AE60, border: 2px solid white, border-radius 50%
- box-shadow: `0 2px 6px rgba(0,0,0,0.15)`

---

## Component Specifications

### App.jsx

- Manages routing between Library, BookReader, and Celebration
- Simple useState for currentView, selectedStoryId
- Fetches library.json on mount
- Reads `localStorage` for completed story IDs, passes to Library

### Library.jsx

- Fetches and displays library.json
- 2-column grid of book cards
- Props: `onSelectStory(storyId)`, `completedStories` (array of IDs)
- Shows completion ⭐ badge on covers where `completedStories.includes(story.id)`
- Handles language toggle state

### BookReader.jsx

- Fetches `stories/{storyId}/story.json` on mount
- Manages: current page, show/hide state for transitions, has-interacted state, navigation mode (free/guided), loop mode (on/off)
- Handles swipe (touchstart/touchend with 50px threshold) and tap (left 30% / right 30%)
- Renders: progress bar, book card, replay button, loop toggle, mode toggle, tap-to-start overlay
- Audio element: `new Audio(audioSrc)` — loads the page's MP3 from `stories/{storyId}/page-XX.mp3`
- Auto-plays audio 400ms after page transition completes (at 1.0x speed)
- Replay button: replays current page at `audio.playbackRate = 0.75`
- Loop mode: on audio end, if loop is ON, wait 1.5s then replay at 0.75x. If loop is OFF and guided mode is ON, wait 3s then advance page.
- **End of book:** When user advances past the last page (or last page audio ends in guided mode), trigger `onBookComplete(storyId)` callback
- Passes audio element + timestamps + onWordTap handler to WordHighlighter

### Celebration.jsx

- Props: `storyTitle`, `lang`, `onReadAgain`, `onBackToLibrary`
- Renders: confetti animation, congratulation message, two action buttons
- Confetti: CSS-only animation with 20-30 small colored divs using `@keyframes`. Each piece has a random `animation-delay`, `left` position, and rotation. Animation lasts 3-4 seconds.
- Saves story completion to `localStorage` on mount (fires once)

### WordHighlighter.jsx

- Receives: words array, timestamps array, audio element ref, activeWordIndex, onWordTap callback
- Renders each word as a tappable `<span>` with conditional highlight + karaoke underline styling
- `onWordTap(wordIndex)`: stops current page audio, speaks the tapped word in isolation using SpeechSynthesisUtterance (rate 0.8, lang en-US), briefly highlights that word for 500ms
- Handles optional `syllables` array in timestamps without breaking (ignore in Phase 1, render whole word)

### useAudioSync.js (custom hook)

```javascript
function useAudioSync(audioRef, timestamps) {
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const rafRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !timestamps.length) return;

    const sync = () => {
      const currentTime = audio.currentTime;
      let found = -1;
      for (let i = 0; i < timestamps.length; i++) {
        if (currentTime >= timestamps[i].start - 0.05 &&
            currentTime <= timestamps[i].end + 0.08) {
          found = i;
          break;
        }
      }
      setActiveWordIndex(found);
      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(sync);
      }
    };

    const onPlay = () => { rafRef.current = requestAnimationFrame(sync); };
    const onEnd = () => {
      cancelAnimationFrame(rafRef.current);
      setTimeout(() => setActiveWordIndex(-1), 300);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onEnd);

    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onEnd);
    };
  }, [audioRef, timestamps]);

  return activeWordIndex;
}
```

---

## Performance Requirements

This app runs on budget Android phones (1-2GB RAM, slow processors, 3G/4G data).

- **Total JS bundle:** < 100KB gzipped
- **Initial load:** < 3 seconds on 3G
- **Per-story load:** < 2 seconds (preload next page's audio)
- **Audio files:** 64kbps MP3, typically 2-8 KB per page
- **Images:** PNG or WebP, ~50-100KB each, max 400px width needed
- **Fonts:** Load Andika + Nunito from Google Fonts with `display=swap`
- **No heavy libraries** — no animation libraries, no state management libs, no UI frameworks
- **Lazy load images:** Only load the current page's image + preload next page

---

## Complete Visual Design System

### Typography

- **Story text font:** Andika from Google Fonts — designed by SIL specifically for early readers. Uses "print-style" single-story `a` and `g` letterforms that match how children are taught to write, unlike Nunito/Nunito Sans which use typographic double-story forms.
  - Load via: `<link href="https://fonts.googleapis.com/css2?family=Andika:wght@400;700&display=swap">`
  - Fallback stack: `'Andika', system-ui, sans-serif`
- **UI font:** Nunito from Google Fonts — used for all non-story UI elements (buttons, labels, headers, page numbers)
  - Load via: `<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&display=swap">`
  - Fallback stack: `'Nunito', system-ui, sans-serif`

**Story text styling:**
- font-family: Andika
- font-size: 32px
- font-weight: 400 (Andika's normal weight is already clear and bold-looking)
- line-height: 1.75
- word-spacing: 0.15em (extra space between words helps pre-readers distinguish word boundaries)
- letter-spacing: 0.03em (subtle extra breathing room between letters)
- color: #2C3E50
- text-align: center

**Highlighted word (story text):** font-weight 700, color #1B4F72

**UI text sizes (all Nunito):**
- Book title (in top bar): 14px, font-weight 800, color #2C3E50
- Page number: 12px, font-weight 700, color #BDC3C7, letter-spacing 1px, centered
- Library book titles: 13px, font-weight 700, color #2C3E50
- Library header: 26px, font-weight 800, white
- Tap-to-start title: 24px, font-weight 900, color #1B4F72
- Tap-to-start subtitle: 15px, font-weight 600, color #7F8C8D
- Swipe hint text: 12px, font-weight 600, color rgba(0,0,0,0.3)

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Primary Blue | #1B4F72 | App branding, headings, highlighted word text |
| Accent Blue | #2E86C1 | Library header gradient, links |
| Light Blue | #5DADE2 | Library header gradient end |
| Dark Text | #2C3E50 | Body text, story text, labels |
| Muted Gray | #7F8C8D | Subtitles, secondary text |
| Light Gray | #BDC3C7 | Page numbers, hints |
| Highlight Yellow | #FFEAA7 | Word highlight background |
| Paper White | #FFFEF9 | Book page background start |
| Paper Cream | #FFF9F0 | Book page background end |
| Page Edge | #D5D5D0 → #E8E8E3 | Right and bottom page-edge gradients |

Each story page also has its own background color and accent color defined in story.json (used for the screen background gradient and progress bar fill).

### Book Design (Reader Screen)

**Book card container:**
- max-width: 440px, width: 100%
- border-radius: 4px 16px 16px 4px (tighter on spine side, rounded on open side)
- box-shadow: `0 12px 50px rgba(0,0,0,0.15), 0 2px 10px rgba(0,0,0,0.08), -4px 0 12px rgba(0,0,0,0.06)`
- overflow: hidden
- transition: opacity 0.25s ease, transform 0.25s ease

**Spine (left edge):**
- position: absolute, left: 0, top: 0, bottom: 0, width: 6px
- background: `linear-gradient(to right, rgba(0,0,0,0.12), rgba(0,0,0,0.04), transparent)`
- z-index: 5

**Page edge - right side:**
- position: absolute, right: 0, top: 4px, bottom: 4px, width: 3px
- background: `linear-gradient(to left, #D5D5D0, #E8E8E3)`
- border-radius: 0 2px 2px 0

**Page edge - bottom:**
- position: absolute, bottom: 0, left: 8px, right: 4px, height: 3px
- background: `linear-gradient(to top, #D5D5D0, #E8E8E3)`
- border-radius: 0 0 2px 2px

**Inner page:**
- background: `linear-gradient(135deg, #FFFEF9 0%, #FFF9F0 40%, #FFFDF7 100%)`
- border-radius matches outer card

**Illustration area:**
- width: 100%, aspect-ratio: 16/10
- overflow: hidden
- border-bottom: 1px solid rgba(0,0,0,0.04)
- Image: width 100%, height 100%, object-fit cover

**Divider between illustration and text:**
- height: 1px, margin: 0 24px
- background: `linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent)`

**Text area:**
- padding: 20px 24px 14px

### Word Highlighting

- **Default word:** display inline, padding 3px 2px, background transparent, color #2C3E50, font-weight 400 (Andika normal), border-bottom 3px solid transparent
- **Active/highlighted word:** background #FFEAA7, border-radius 5px, padding 3px 6px, color #1B4F72, font-weight 700, box-shadow `0 2px 8px rgba(255,234,167,0.6)`, PLUS a karaoke underline: `border-bottom: 3px solid {page accent color}`. The underline gives a secondary visual cue that is easier for young children to track than background color alone.
- **Transition:** all 0.18s ease (smooth highlight movement between words)
- **Clear timing:** highlight resets to -1 (no active word) 300ms after audio ends

**Tap-to-hear individual words:**
- Every word `<span>` has an `onWordTap(wordIndex)` handler
- When a child taps any word at any time (even when audio is not playing), that single word is spoken aloud in isolation
- Implementation: create a short `SpeechSynthesisUtterance` for just that word with `rate: 0.8`, `lang: "en-US"`. In Phase 2, this could use ElevenLabs per-word audio clips for voice consistency.
- While the isolated word plays, highlight that word briefly (500ms)
- This does NOT interrupt full-page audio if it's currently playing — stop page audio first, then speak the tapped word

**Phase 2 — Syllable-level mode:**
- For phonetically-aware 3-5 year olds, support breaking words into syllable/phoneme chunks during highlight. Example: when "dog" is highlighted, show `d-o-g` visually with each letter highlighted in sequence.
- To support this future feature, the data model in story.json should allow an optional `syllables` array per timestamp entry:
```json
{
  "word": "dog",
  "start": 1.50,
  "end": 1.95,
  "syllables": [
    { "text": "d", "start": 1.50, "end": 1.62 },
    { "text": "o", "start": 1.62, "end": 1.75 },
    { "text": "g", "start": 1.75, "end": 1.95 }
  ]
}
```
- The `syllables` field is OPTIONAL. If absent, the word highlights as a whole unit (current behavior). If present and syllable mode is enabled, each sub-segment highlights in sequence.
- Do NOT build the syllable highlighting UI in Phase 1. Just ensure the data model and WordHighlighter component can accept the field without breaking.

### Progress Bar (Stories-style)

- Container: display flex, gap 3px, padding 0 14px 8px
- Each segment: flex 1, height 3px, border-radius 2px, background rgba(0,0,0,0.08)
- Fill: height 100%, border-radius 2px, transitions `width 0.4s ease, background-color 0.4s ease`
- Completed segments: filled 100% with the page's accent color
- Current segment: filled 100% with accent color
- Future segments: 0% fill

### Replay Button (floating) — with Slow Mode

- position: absolute, bottom 14px, right 58px, z-index 10
- width: 44px, height: 44px, border-radius 50%
- border: 2.5px solid (page's accent color)
- color: page's accent color
- background: rgba(255,255,255,0.9)
- font-size: 22px, displays ↻ character
- box-shadow: `0 3px 12px rgba(0,0,0,0.15)`
- backdrop-filter: blur(4px)
- **Behavior:** Tapping replays the current page audio at 0.75x speed. Set `audio.playbackRate = 0.75` before playing. This slower speed helps kids follow along more easily. The word-highlight sync loop automatically adjusts because it reads `audio.currentTime` which accounts for playback rate.
- **Visual indicator:** When slow replay is active, show a small "🐢" or "0.75x" label briefly near the button so the user knows it's slower.

### Auto-Repeat Toggle (Loop Mode)

- position: absolute, bottom 14px, right 14px, z-index 10
- width: 44px, height: 44px, border-radius 50%
- Displays ♾️ (infinity) icon or 🔁 icon
- **Two states:**
  - **OFF (default):** background rgba(255,255,255,0.9), border 2.5px solid rgba(0,0,0,0.1), muted color
  - **ON:** background page's accent color, border none, color white, box-shadow `0 3px 12px rgba(0,0,0,0.2)`
- **Behavior when ON:** When the current page's audio finishes, wait 1.5 seconds, then replay the same page audio automatically. Repeats indefinitely until: (a) user toggles loop OFF, or (b) user navigates to a different page.
- **Replay speed in loop mode:** First play is 1.0x speed. Subsequent replays in loop mode are 0.75x speed (slower repetitions help retention).
- **Use case:** A child wants to hear "Max catches the ball! Good boy, Max!" five times before moving on. The parent taps the loop icon and hands the phone to the child. The page reads itself over and over.

### Top Bar

- display: flex, align-items center, justify-content space-between
- padding: 10px 14px
- z-index: 20

**Title pill:**
- font-family: Nunito
- font-size 14px, font-weight 800, color #2C3E50
- background: rgba(255,255,255,0.75), padding 6px 16px, border-radius 16px

**Guided mode toggle pill:**
- background: rgba(255,255,255,0.75), padding 5px 12px, border-radius 16px
- font-size 12px, font-weight 800, cursor pointer
- **Free mode (default):** shows ✋ icon, color #2C3E50
- **Guided mode active:** shows ▶▶ icon, background page's accent color, color white
- Positioned between title and language toggle

**Language toggle pill:**
- background: rgba(255,255,255,0.75), padding 5px 12px, border-radius 16px
- font-size 12px, font-weight 800, color #2C3E50

### Tap-to-Start Overlay

- Covers full screen: position absolute, inset 0, z-index 50
- Background: rgba(0,0,0,0.3), backdrop-filter blur(6px)
- Centered card: background white, border-radius 24px, padding 36px 40px
- box-shadow: `0 20px 60px rgba(0,0,0,0.3)`
- Contains: 📚 emoji (48px), story title, "Tap anywhere to start" / "Toca para comenzar"
- Disappears permanently on first tap/touch anywhere

### Page Transition Animation

- Outgoing page: opacity fades to 0, slides 40px in the swipe direction (translateX(-40px) for forward, translateX(40px) for back)
- Duration: 250ms
- After 250ms: page state updates, new page appears at opacity 1, translateX(0)
- No page-flip or 3D rotation — just a clean slide like Instagram Stories

### Navigation Hint Arrows

- Positioned: absolute, left 4px or right 4px, vertically centered (top 50%, translateY(-50%))
- SVG chevron: 24x24px, stroke rgba(0,0,0,0.12), strokeWidth 2.5
- pointer-events: none (they're visual-only, the tap zones handle interaction)
- opacity: 0.5
- Left arrow hidden on first page, right arrow hidden on last page

### Library Screen

**Header:**
- background: `linear-gradient(135deg, #1B4F72, #2E86C1)`
- padding: 32px 20px 28px, border-radius: 0 0 24px 24px
- Title: "Our Library" / "Nuestra Biblioteca" + 📚, white, 26px, font-weight 800
- Subtitle: "Tap a book to start reading!" / "¡Toca un libro para empezar a leer!", rgba(255,255,255,0.8), 15px

**Language toggle (on library):**
- position absolute, top 16px, right 16px
- background rgba(255,255,255,0.2), color white, padding 5px 14px, border-radius 20px
- font-size 13px, font-weight 800, border 1px solid rgba(255,255,255,0.3)

**Book grid:**
- display grid, grid-template-columns repeat(2, 1fr), gap 16px
- padding 24px 16px, max-width 500px, margin 0 auto

**Book card:**
- background white, border-radius 16px, padding 12px, text-align center
- box-shadow: `0 2px 12px rgba(0,0,0,0.06)`
- Cover image container: width 100%, aspect-ratio 3/4, border-radius 12px, overflow hidden

**Featured badge (Story of the Week):**
- position absolute, top -6px, right -6px
- background: `linear-gradient(135deg, #FFEAA7, #FDCB6E)`
- color #7D6608, font-size 10px, font-weight 800
- padding 4px 10px, border-radius 12px
- box-shadow: `0 2px 8px rgba(253,203,110,0.5)`

### Screen Background

- The reader screen background is a gradient that changes per page:
  - `linear-gradient(180deg, {page.bg} 0%, #F5F5F5 100%)`
  - Each page defines its own `bg` color in story.json (soft pastels like #E3F2FD, #E8F5E9, #FFF3E0, #EFEBE9, #E8EAF6)
- Library screen background: #F7F9FB (light gray)

### Responsive / Mobile

- **Target devices:** 5-6 inch budget Android phones (360px-414px width)
- **Touch targets:** minimum 44x44px for all interactive elements
- **No scrolling within the reader** — the entire book + controls fit in the viewport
- **user-select: none** on the reader to prevent accidental text selection while swiping
- **Mobile-first design** — no desktop breakpoints needed for MVP

---

## Language Toggle

- Toggle between EN and ES
- Only affects UI labels (buttons, instructions, headers)
- Story text is ALWAYS in English (that's the point — teaching English)
- Default language: Spanish (ES) since parents speak Spanish
- Store preference in localStorage key `readaloud_lang` if available, otherwise default to ES

---

## localStorage Usage

The app uses `localStorage` for two lightweight persistence features. No database needed.

| Key | Format | Purpose |
|-----|--------|---------|
| `readaloud_lang` | `"en"` or `"es"` | Remembers language preference |
| `readaloud_completed` | `["the-big-dog", "counting-to-ten"]` | Array of completed story IDs |

- Always wrap `localStorage` access in try/catch — some browsers/modes block it
- If `localStorage` is unavailable, both features degrade gracefully (language defaults to ES, no completion badges shown)
- Keep the schema minimal — when student profiles are added in Phase 2, this data migrates to a database and localStorage is no longer needed

---

## Adding New Stories (Admin Workflow)

To add a new story, the admin:

1. Creates a new folder in `public/stories/{story-id}/`
2. Adds a `story.json` with page text and image filenames (no audio yet)
3. Adds cover image and page images
4. Runs `python tools/generate_audio.py public/stories/{story-id}/story.json`
   - This calls ElevenLabs API for each page
   - Generates MP3 files
   - Updates story.json with audio filenames and timestamps
5. Updates `public/library.json` to include the new story
6. Commits to GitHub → Netlify auto-deploys

---

## Deployment

1. Create GitHub repository
2. Connect to Netlify (free tier)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Netlify provides HTTPS automatically
6. Optional: custom domain (e.g., readaloud.hopeacademy.org)

---

## What NOT to build in Phase 1

- No user accounts or authentication
- No database or backend/API server
- No offline/PWA support
- No analytics
- No teacher dashboard
- No student tracking (beyond localStorage completion)
- No syllable-level highlighting UI (data model supports it — see timestamps `syllables` field)
- No per-word ElevenLabs audio clips for tap-to-hear (use browser SpeechSynthesis for now)
- No search or filtering in library
- No animations beyond page slide transitions and the celebration confetti

---

## Phase 2 Roadmap — Architectural Decisions to Protect

These features are NOT built in Phase 1, but Claude Code should make architectural choices that do not block them. This section exists so the build avoids painting itself into a corner.

### Syllable-Level Highlighting
- **What:** When a word is highlighted, break it into sub-segments (phonemes or syllables) and highlight each in sequence. `dog` → `d-o-g`.
- **Protect now:** The `timestamps` array already supports an optional `syllables` sub-array per word entry. WordHighlighter should accept this field without breaking. The rendering logic should check `if (timestamp.syllables && syllableModeEnabled)` and fall through to whole-word highlight if not.
- **Phase 2 work:** Build the syllable rendering UI, add a toggle for syllable mode, generate syllable-level timestamps in the audio generation script.

### Per-Word ElevenLabs Audio (for tap-to-hear)
- **What:** Replace browser SpeechSynthesis with pre-generated ElevenLabs clips for each word, so the voice matches the narrator.
- **Protect now:** The `onWordTap` handler should be abstracted so the audio source can be swapped. Don't deeply couple it to SpeechSynthesis. A simple approach: `onWordTap` calls a `speakWord(word)` function that can be swapped from SpeechSynthesis to a pre-loaded audio clip later.
- **Phase 2 work:** Extend generate_audio.py to also produce individual word clips. Add a `wordAudio` map to story.json.

### Teacher Dashboard
- **What:** Teacher logs in, assigns stories to the class, sees which students listened and how often.
- **Protect now:** Keep the app's data flow one-directional (JSON files → UI). Don't scatter state management across components. When a backend is added later, the data fetching layer (currently `fetch('library.json')`) can be swapped to API calls without rewriting components.
- **Phase 2 work:** Add Supabase or similar. Add teacher auth, student profiles, assignment model, listening analytics.

### Student Profiles & Tracking
- **What:** Individual child logins (simple: name + avatar pick), per-student listening history, progress tracking.
- **Protect now:** The current `localStorage` completion tracking uses a simple array of story IDs. When student profiles are added, this migrates to a database keyed by student ID. Don't build any complex localStorage schema — keep it minimal so migration is easy.
- **Phase 2 work:** Supabase auth, student table, listening_events table, progress UI.

### Offline / PWA Support
- **What:** Service worker caches loaded stories so they work without internet.
- **Protect now:** All story assets (JSON, images, audio) are in predictable, static file paths (`/stories/{id}/page-XX.mp3`). This is already PWA-friendly. Don't use dynamic URLs or blob storage that would complicate service worker caching.
- **Phase 2 work:** Add service worker with Workbox, cache strategy for story folders.

### Analytics
- **What:** Track which stories are listened to, how often, completion rates.
- **Protect now:** Key user events (story opened, page played, book completed) should be easy to hook into. The celebration screen already fires a completion event. In Phase 2, add an `analytics.track(event, data)` call at these points.
- **Phase 2 work:** Integrate Plausible (self-hosted) or simple Supabase event logging.

### Vocabulary Builder
- **What:** After a story, show 3-5 key vocabulary words with images, pronunciation, and Spanish translation.
- **Protect now:** The story.json schema can be extended with a `vocabulary` array without breaking existing stories. Don't hardcode assumptions about story.json having only the current fields.
- **Phase 2 work:** Add `vocabulary` field to story.json, build VocabularyScreen component shown between celebration and library.

### Multi-Class Support
- **What:** Separate class codes, multiple teachers, grade-level libraries.
- **Protect now:** library.json is a flat list of stories. Adding a `gradeLevel` or `classId` filter field later is trivial. Don't build nested routing or complex state management that assumes a single class.
- **Phase 2 work:** Add filtering to library.json, class-specific featured stories, teacher assignment integration.

---

## Implementation Order

1. **Project setup:** Vite + React, folder structure, deploy empty app to Netlify
2. **Library screen:** Fetch library.json, render book grid, language toggle, completion badges from localStorage
3. **Book Reader shell:** Fetch story.json, render book with Andika font text and images, swipe/tap navigation, progress bar
4. **Audio + highlighting:** Load MP3 per page, auto-play, useAudioSync hook, word highlighting with karaoke underline
5. **Tap-to-hear:** Add onWordTap handler to each word span, SpeechSynthesis for individual words
6. **Replay + Loop:** Slow replay button (0.75x), auto-repeat loop toggle
7. **Guided mode:** Auto-advance toggle, 3-second delay between pages
8. **Celebration screen:** Confetti animation, completion message, localStorage tracking, action buttons
9. **Polish:** Tap-to-start overlay, transitions, responsive testing
10. **Content:** Add all story assets (images, run audio generation script)
11. **Test on real devices:** Borrow 2-3 parent phones, test performance

---

## Reference: The Prototype

The prototype we built (ReadAloud_v5.jsx) is a working reference for look, feel, and behavior. Use it as the visual spec. The production build should match it closely but with:
- Real audio files (MP3) instead of browser speech synthesis
- Real timestamps from ElevenLabs instead of calculated ones
- Separate components instead of one monolithic file
- Story data loaded from JSON files instead of hardcoded
- Multiple stories via the Library screen
