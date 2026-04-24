import { useState, useEffect, useRef } from "react";

// Spec-exact implementation.
// audioRef.current must be an HTMLAudioElement (set before this hook's effect runs).
// timestamps is an array of { word, start, end } objects from story.json.
// Returns the index of the currently-playing word, or -1.
export default function useAudioSync(audioRef, timestamps) {
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const rafRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !timestamps.length) return;

    const sync = () => {
      const currentTime = audio.currentTime;
      let found = -1;
      for (let i = 0; i < timestamps.length; i++) {
        if (
          currentTime >= timestamps[i].start - 0.05 &&
          currentTime <= timestamps[i].end + 0.08
        ) {
          found = i;
          break;
        }
      }
      setActiveWordIndex(found);
      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(sync);
      }
    };

    const onPlay = () => {
      rafRef.current = requestAnimationFrame(sync);
    };
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
  }, [audioRef, timestamps]); // audioRef identity is stable; timestamps changes on page navigation

  return activeWordIndex;
}
