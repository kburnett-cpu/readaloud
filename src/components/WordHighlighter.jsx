import { useState } from "react";

// Default word: transparent bg + transparent border-bottom keeps layout identical
// to the active state (no height/spacing shift when highlight switches on).
const defaultStyle = {
  display: "inline",
  padding: "3px 2px",
  background: "transparent",
  color: "#2C3E50",
  fontWeight: 400,
  borderBottom: "3px solid transparent",
  borderRadius: "2px",
  transition: "all 0.18s ease",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

function activeStyle(accentColor) {
  return {
    display: "inline",
    padding: "3px 6px",
    background: "#FFEAA7",
    color: "#1B4F72",
    fontWeight: 700,
    borderBottom: `3px solid ${accentColor}`,
    borderRadius: "5px",
    boxShadow: "0 2px 8px rgba(255,234,167,0.6)",
    transition: "all 0.18s ease",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };
}

const STRIP_PUNCT = /[^a-zA-Z0-9'-]/g;

// Props:
//   words              – string[] from page.text.split(/\s+/)
//   activeWordIndex    – karaoke index from TTS/audio sync (-1 = none)
//   accentColor        – page.accent, used for karaoke underline
//   speakWord(index)   – called with the word's array index when tapped; BookReader
//                        resolves that index to an MP3 clip or TTS utterance
export default function WordHighlighter({
  words,
  activeWordIndex,
  accentColor,
  speakWord,
}) {
  // tapIndex is owned here so the 500ms highlight is self-contained and doesn't
  // require extra state in the parent.
  const [tapIndex, setTapIndex] = useState(-1);

  if (!words || words.length === 0) return null;

  function handleTap(e, i) {
    e.stopPropagation();
    const word = words[i].replace(STRIP_PUNCT, "");
    if (!word) return;

    // Light up the tapped word for 500ms, then restore karaoke tracking.
    // The functional-update guard prevents a stale timer from clearing a
    // newer tap that landed before the 500ms expired.
    setTapIndex(i);
    setTimeout(() => setTapIndex((cur) => (cur === i ? -1 : cur)), 500);

    speakWord?.(i);
  }

  // Tap-to-hear highlight takes priority over the karaoke/audio-sync highlight.
  const displayIndex = tapIndex >= 0 ? tapIndex : activeWordIndex;

  return (
    <span>
      {words.map((word, i) => (
        // Outer span carries data-word so the native touch handler in BookReader
        // can detect a word tap and skip zone-based navigation.
        <span key={i} data-word="true">
          <span
            style={i === displayIndex ? activeStyle(accentColor) : defaultStyle}
            onClick={(e) => handleTap(e, i)}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
