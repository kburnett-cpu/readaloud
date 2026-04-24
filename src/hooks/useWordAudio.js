import { useRef, useEffect, useCallback } from "react";

/**
 * Plays individual word MP3 files using the Web Audio API.
 *
 * Usage:
 *   const speakWord = useWordAudio();
 *   speakWord("/stories/at-the-beach/words/beach.mp3");
 *
 * Each URL is fetched and decoded once, then cached for instant replay.
 * Only one word plays at a time — a new call stops the previous clip.
 */
export default function useWordAudio() {
  const ctxRef    = useRef(null); // AudioContext
  const cacheRef  = useRef({});   // url → AudioBuffer
  const sourceRef = useRef(null); // active AudioBufferSourceNode

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    return () => {
      try { sourceRef.current?.stop(); } catch (_) {}
      sourceRef.current = null;
      ctx.close();
      ctxRef.current = null;
      cacheRef.current = {};
    };
  }, []);

  const speakWord = useCallback((url) => {
    const ctx = ctxRef.current;
    if (!ctx || !url) return;

    // Stop any currently playing clip
    try { sourceRef.current?.stop(); } catch (_) {}
    sourceRef.current = null;

    const play = (buffer) => {
      const run = () => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        sourceRef.current = source;
        source.onended = () => { sourceRef.current = null; };
      };
      if (ctx.state === "suspended") {
        ctx.resume().then(run).catch(() => {});
      } else {
        run();
      }
    };

    const cached = cacheRef.current[url];
    if (cached) {
      play(cached);
      return;
    }

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((ab) => ctxRef.current?.decodeAudioData(ab))
      .then((buffer) => {
        if (!buffer || !ctxRef.current) return;
        cacheRef.current[url] = buffer;
        play(buffer);
      })
      .catch(() => {
        // File missing or decode error — fail silently
      });
  }, []);

  return speakWord;
}
