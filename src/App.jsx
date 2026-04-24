import { useState, useEffect } from "react";
import Library from "./components/Library.jsx";
import BookReader from "./components/BookReader.jsx";
import Celebration from "./components/Celebration.jsx";

const COMPLETED_KEY = "readaloud_completed";
const LANG_KEY      = "readaloud_lang";
const PROGRESS_KEY  = "readaloud_progress";  // { [storyId]: pageIndex }

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — degrade gracefully */
  }
}

export default function App() {
  // Default language: ES per spec (parents speak Spanish)
  const [lang, setLang] = useState(() => readLS(LANG_KEY, "es"));
  const [completedStories, setCompletedStories] = useState(() =>
    readLS(COMPLETED_KEY, [])
  );
  const [readingProgress, setReadingProgress] = useState(() =>
    readLS(PROGRESS_KEY, {})
  );
  const [view, setView] = useState("library"); // "library" | "reader" | "celebration"
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  // Holds { storyId, title, accentColor, celebrationStyle } while on celebration screen
  const [celebrationData, setCelebrationData] = useState(null);

  // Persist lang preference
  useEffect(() => {
    writeLS(LANG_KEY, lang);
  }, [lang]);

  function handleSelectStory(storyId) {
    setSelectedStoryId(storyId);
    setView("reader");
  }

  function handlePageChange(storyId, pageIndex) {
    setReadingProgress((prev) => {
      const next = { ...prev, [storyId]: pageIndex };
      writeLS(PROGRESS_KEY, next);
      return next;
    });
  }

  function handleToggleLang() {
    setLang((l) => (l === "en" ? "es" : "en"));
  }

  // Called by BookReader when the user passes the last page.
  // info = { title, accentColor, celebrationStyle } from story.json
  function handleBookComplete(storyId, info = {}) {
    // Save completion and clear reading progress for this story
    setCompletedStories((prev) => {
      if (prev.includes(storyId)) return prev;
      const next = [...prev, storyId];
      writeLS(COMPLETED_KEY, next);
      return next;
    });
    setReadingProgress((prev) => {
      if (!prev[storyId]) return prev;
      const next = { ...prev };
      delete next[storyId];
      writeLS(PROGRESS_KEY, next);
      return next;
    });
    setCelebrationData({ storyId, ...info });
    setView("celebration");
  }

  if (view === "celebration" && celebrationData) {
    return (
      <Celebration
        storyTitle={celebrationData.title ?? ""}
        accentColor={celebrationData.accentColor}
        celebrationStyle={celebrationData.celebrationStyle}
        lang={lang}
        onReadAgain={() => {
          // BookReader will remount with the same storyId — resets to page 1 naturally
          setSelectedStoryId(celebrationData.storyId);
          setView("reader");
        }}
        onMoreBooks={() => {
          setCelebrationData(null);
          setView("library");
        }}
      />
    );
  }

  if (view === "reader" && selectedStoryId) {
    return (
      <BookReader
        storyId={selectedStoryId}
        initialPage={readingProgress[selectedStoryId] ?? 0}
        lang={lang}
        onToggleLang={handleToggleLang}
        onBookComplete={handleBookComplete}
        onPageChange={handlePageChange}
        onBack={() => setView("library")}
      />
    );
  }

  return (
    <Library
      onSelectStory={handleSelectStory}
      completedStories={completedStories}
      readingProgress={readingProgress}
      lang={lang}
      onToggleLang={handleToggleLang}
    />
  );
}
