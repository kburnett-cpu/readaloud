import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useBreakpoint from "../hooks/useBreakpoint.js";
import useAudioSync from "../hooks/useAudioSync.js";
import useWordAudio from "../hooks/useWordAudio.js";
import WordHighlighter from "./WordHighlighter.jsx";
import speakWord from "../utils/speakWord.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_DISPLAY = {
  fontSize: 32,
  fontFamily: "Andika",
  lineHeight: 1.75,
  wordSpacing: "0.15em",
  letterSpacing: "0.03em",
};

const LABELS = {
  en: { tapToStart: "Tap anywhere to start", guided: "▶▶", free: "✋" },
  es: { tapToStart: "Toca para comenzar",    guided: "▶▶", free: "✋" },
};

// Returns the character offset of each whitespace-separated token in `text`.
// Used to map SpeechSynthesis boundary charIndex → word array index.
function getCharOffsets(text) {
  const offsets = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text)) !== null) offsets.push(m.index);
  return offsets;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookReader({
  storyId,
  initialPage = 0,
  lang,
  onToggleLang,
  onBookComplete,
  onPageChange,
  onBack,
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [story,         setStory]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(false);
  const [fetchKey,      setFetchKey]      = useState(0);  // increment to retry
  const [pageIndex,     setPageIndex]     = useState(initialPage);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [guided,        setGuided]        = useState(false);
  const [loop,          setLoop]          = useState(false);
  const [animLeaving,   setAnimLeaving]   = useState(false);
  const [animDir,       setAnimDir]       = useState(-1);
  const [ttsWordIndex,  setTtsWordIndex]  = useState(-1);  // word index from TTS boundary events
  const [isSlowPlay,    setIsSlowPlay]    = useState(false);

  // ── Refs (read by stable callbacks to avoid stale closures) ────────────────
  const screenRef          = useRef(null);
  const audioRef           = useRef(null);   // current HTMLAudioElement (null in TTS mode)
  const pageIndexRef       = useRef(0);
  const hasInteractedRef   = useRef(false);
  const storyRef           = useRef(null);
  const loopRef            = useRef(false);
  const guidedRef          = useRef(false);
  const transitionLockRef  = useRef(false);
  const pendingPageRef     = useRef(null);
  const touchStartRef      = useRef(null);
  const loopTimerRef       = useRef(null);
  const guidedTimerRef     = useRef(null);
  const autoPlayTimerRef   = useRef(null);
  // These point to the latest versions of callbacks so stable closures can call them:
  const stopAudioRef       = useRef(null);
  const playAudioRef       = useRef(null);
  const imgCacheRef        = useRef(new Set());
  const navigateRef        = useRef(null);
  const handleEndedRef     = useRef(null);
  const onPageChangeRef    = useRef(onPageChange);
  onPageChangeRef.current  = onPageChange;

  // Keep plain refs in sync every render
  pageIndexRef.current     = pageIndex;
  hasInteractedRef.current = hasInteracted;
  storyRef.current         = story;
  loopRef.current          = loop;
  guidedRef.current        = guided;

  const t = LABELS[lang] || LABELS.en;

  const bp = useBreakpoint();

  const bpStyles = {
    bookWrapper: {
      maxWidth: bp === "desktop" ? 800 : bp === "tablet" ? 620 : 440,
    },
    bookArea: {
      padding: bp === "desktop" ? "0 40px 24px" : bp === "tablet" ? "0 24px 20px" : "0 16px 16px",
    },
    textArea: {
      maxHeight: bp === "desktop" ? 380 : bp === "tablet" ? 320 : 280,
    },
    topBar: {
      padding: bp === "desktop" ? "14px 32px" : bp === "tablet" ? "12px 20px" : "10px 14px",
    },
  };

  // Derived before hooks so useMemo can use them
  const page       = story?.pages[pageIndex];
  const display    = story?.display ?? DEFAULT_DISPLAY;
  const isTTSMode  = !page?.audio;

  // Stable timestamps reference — useAudioSync dep; only changes when page changes
  const timestamps = useMemo(() => page?.timestamps ?? [], [page]);

  // Words array for WordHighlighter — stable between re-renders of same page
  const words = useMemo(
    () => (page ? page.text.split(/\s+/).filter(Boolean) : []),
    [page?.text]
  );

  // ── Fetch story ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(false);
    setPageIndex(initialPage ?? 0);
    setHasInteracted(false);
    transitionLockRef.current = false;

    fetch(`/stories/${storyId}/story.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setStory(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [storyId, fetchKey]); // fetchKey increments on retry

  // ── Audio element setup ─────────────────────────────────────────────────────
  // Must be defined BEFORE useAudioSync so its effect runs first (React runs
  // effects in hook-call order). When this effect runs, audioRef.current is set
  // to the new Audio element; useAudioSync's effect then reads it correctly.
  useEffect(() => {
    if (!story) return;

    const page = story.pages[pageIndex];

    // Clear any pending timers from the previous page
    clearTimeout(loopTimerRef.current);
    clearTimeout(guidedTimerRef.current);
    clearTimeout(autoPlayTimerRef.current);

    // Tear down previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setTtsWordIndex(-1);
    setIsSlowPlay(false);

    if (page?.audio) {
      const audio = new Audio(`/stories/${storyId}/${page.audio}`);
      audio.preload = "auto";

      // Attach ended handler once per audio element — reads latest loop/guided
      // through refs so it's always current even if user toggles mid-playback.
      audio.addEventListener("ended", () => {
        setIsSlowPlay(false);
        handleEndedRef.current?.();
      });

      audioRef.current = audio;
    }

    return () => {
      clearTimeout(loopTimerRef.current);
      clearTimeout(guidedTimerRef.current);
      clearTimeout(autoPlayTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, [storyId, pageIndex, story]); // story dep ensures this runs after fetch completes

  // ── Image preloading ─────────────────────────────────────────────────────────
  // Tier 1: preload adjacent pages in parallel on every page change so the
  // next/previous images are ready before the user taps.
  useEffect(() => {
    if (!story) return;
    const { pages } = story;
    [pageIndex - 1, pageIndex + 1].forEach((i) => {
      if (i < 0 || i >= pages.length) return;
      const url = `/stories/${storyId}/${pages[i].image}`;
      if (imgCacheRef.current.has(url)) return;
      const img = new Image();
      img.onload = img.onerror = () => imgCacheRef.current.add(url);
      img.src = url;
    });
  }, [story, pageIndex, storyId]);

  // Tier 2: sequentially preload all remaining pages in the background so
  // every transition is instant after the initial load. Sequential (not
  // parallel) to avoid saturating bandwidth on slow connections.
  useEffect(() => {
    if (!story) return;
    const { pages } = story;
    let idx = 0;
    let cancelled = false;
    const loadNext = () => {
      if (cancelled || idx >= pages.length) return;
      const url = `/stories/${storyId}/${pages[idx].image}`;
      idx++;
      if (imgCacheRef.current.has(url)) { loadNext(); return; }
      const img = new Image();
      img.onload = img.onerror = () => {
        imgCacheRef.current.add(url);
        loadNext();
      };
      img.src = url;
    };
    loadNext();
    return () => { cancelled = true; };
  }, [story, storyId]);

  // ── useAudioSync — subscribes AFTER the audio element is created above ──────
  const mp3WordIndex = useAudioSync(audioRef, timestamps);

  // ── useWordAudio — dedicated player for word-tap clips ───────────────────────
  // Separate from the main audioRef so word taps don't disturb the page player's
  // currentTime, playbackRate, or event listeners.
  const speakWordClip = useWordAudio();

  // ── Navigation (stable — reads current values through refs) ─────────────────
  const navigate = useCallback(
    (delta) => {
      const story = storyRef.current;
      if (!story || transitionLockRef.current) return;

      const current = pageIndexRef.current;
      const next    = current + delta;

      if (next >= story.pages.length) {
        stopAudioRef.current?.();
        onBookComplete(storyId, {
          title:            story.title,
          accentColor:      story.pages[current]?.accent,
          celebrationStyle: story.celebrationStyle ?? "confetti",
        });
        return;
      }
      if (next < 0) return;

      // Stop audio immediately when the user navigates
      stopAudioRef.current?.();

      transitionLockRef.current = true;
      pendingPageRef.current    = next;
      setAnimDir(delta > 0 ? -1 : 1);
      setAnimLeaving(true);

      setTimeout(() => {
        const nextPage = pendingPageRef.current;
        setPageIndex(nextPage);
        setAnimLeaving(false);
        transitionLockRef.current = false;
        onPageChangeRef.current?.(storyId, nextPage);
      }, 250);
    },
    [storyId, onBookComplete]
  );
  navigateRef.current = navigate;

  // ── Input listeners: touch, mouse click, keyboard ────────────────────────────
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;

    // Prevent the click event (which fires ~300 ms after touchend on mobile)
    // from double-firing navigation that touchend already handled.
    let touchJustHandled = false;

    function onTouchStart(e) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    function onTouchEnd(e) {
      const start = touchStartRef.current;
      if (!start) return;
      touchStartRef.current = null;

      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        setHasInteracted(true);
        touchJustHandled = true;
        setTimeout(() => { touchJustHandled = false; }, 400);
        return;
      }

      const dx  = e.changedTouches[0].clientX - start.x;
      const dy  = e.changedTouches[0].clientY - start.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (adx > ady && adx > 50) {
        navigate(dx < 0 ? 1 : -1);
        touchJustHandled = true;
        setTimeout(() => { touchJustHandled = false; }, 400);
      } else if (adx < 12 && ady < 12) {
        // Tap — skip word spans (tap-to-hear) and floating control buttons
        if (e.target.closest("[data-word]") || e.target.closest("[data-control]")) return;
        const w = window.innerWidth;
        const navigated = start.x < w * 0.3 || start.x > w * 0.7;
        if (navigated) {
          if (start.x < w * 0.3) navigate(-1);
          else                   navigate(1);
          touchJustHandled = true;
          setTimeout(() => { touchJustHandled = false; }, 400);
        }
      }
    }

    // Mouse click — same left/right 30% zones; skipped if touch already handled it
    function onClick(e) {
      if (touchJustHandled) return;
      if (e.target.closest("[data-word]") || e.target.closest("[data-control]")) return;
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        setHasInteracted(true);
        return;
      }
      const w = window.innerWidth;
      if (e.clientX < w * 0.3)      navigate(-1);
      else if (e.clientX > w * 0.7) navigate(1);
    }

    // Keyboard — ArrowLeft / ArrowRight; first press dismisses overlay like first tap
    function onKeyDown(e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        setHasInteracted(true);
        return;
      }
      navigate(e.key === "ArrowLeft" ? -1 : 1);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    el.addEventListener("click",      onClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend",   onTouchEnd);
      el.removeEventListener("click",      onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate]);

  // ── Audio callbacks ──────────────────────────────────────────────────────────

  const stopAudio = useCallback(() => {
    clearTimeout(loopTimerRef.current);
    clearTimeout(guidedTimerRef.current);
    clearTimeout(autoPlayTimerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    setTtsWordIndex(-1);
    setIsSlowPlay(false);
  }, []);
  stopAudioRef.current = stopAudio;

  // Called when a page's audio finishes — drives loop and guided-mode logic.
  // Reads loop/guided/page through refs so it's correct even if user toggled mid-play.
  const handleEnded = useCallback(() => {
    if (loopRef.current) {
      // Loop takes priority over guided mode (spec: "loop takes priority")
      loopTimerRef.current = setTimeout(() => {
        playAudioRef.current?.(0.75);
      }, 1500);
    } else if (guidedRef.current) {
      // On the last page, stop — don't auto-trigger book completion (spec: "stop advancing")
      const story = storyRef.current;
      const isLastPage = pageIndexRef.current >= (story?.pages.length ?? 1) - 1;
      if (isLastPage) return;
      guidedTimerRef.current = setTimeout(() => {
        navigateRef.current?.(1);
      }, 3000);
    }
  }, []);
  handleEndedRef.current = handleEnded;

  const playAudio = useCallback((rate = 1.0) => {
    const story = storyRef.current;
    if (!story) return;

    const page = story.pages[pageIndexRef.current];

    // Stop whatever is currently playing
    stopAudioRef.current?.();
    setIsSlowPlay(rate < 1);

    if (page.audio && audioRef.current) {
      // ── MP3 path ────────────────────────────────────────────────────────
      // Wait for the element to have enough data before calling play(). The
      // old code used a fixed 400ms timer and a silent .catch, which dropped
      // playback whenever the MP3 wasn't buffered yet (slow network, larger
      // files, cold cache). Now: if readyState says we can play, play; else
      // wait for `canplay`. A 2s safety net plays anyway in case the event
      // never fires. AbortError (interrupted play) gets one retry.
      const audio = audioRef.current;
      audio.playbackRate = rate;
      audio.currentTime  = 0;

      let started = false;
      const tryPlay = (isRetry = false) => {
        if (started || audioRef.current !== audio) return;
        started = true;
        audio.play().catch((err) => {
          if (!isRetry && err?.name === "AbortError" && audioRef.current === audio) {
            started = false;
            setTimeout(() => tryPlay(true), 250);
          } else if (err?.name !== "AbortError" && err?.name !== "NotAllowedError") {
            console.warn("[ReadAloud] audio.play() failed:", err);
          }
        });
      };

      if (audio.readyState >= 2) {
        // HAVE_CURRENT_DATA — safe to start
        tryPlay();
      } else {
        const onCanPlay = () => {
          audio.removeEventListener("canplay", onCanPlay);
          clearTimeout(safetyTimer);
          tryPlay();
        };
        const safetyTimer = setTimeout(() => {
          audio.removeEventListener("canplay", onCanPlay);
          tryPlay();
        }, 2000);
        audio.addEventListener("canplay", onCanPlay);
      }

    } else {
      // ── SpeechSynthesis fallback (no audio file yet) ─────────────────────
      if (!("speechSynthesis" in window)) return;

      const charOffsets = getCharOffsets(page.text);
      const utterance   = new SpeechSynthesisUtterance(page.text);

      // TTS rate: 1.0 normally, 0.75 for slow replay (closest TTS equivalent)
      utterance.rate = rate < 1 ? 0.75 : 1.0;
      utterance.lang = "en-US";

      // Word boundary events → drive word highlight index
      utterance.onboundary = (e) => {
        if (e.name !== "word") return;
        const idx = charOffsets.indexOf(e.charIndex);
        if (idx >= 0) setTtsWordIndex(idx);
      };

      utterance.onend = () => {
        setTimeout(() => setTtsWordIndex(-1), 300);
        setIsSlowPlay(false);
        handleEndedRef.current?.();
      };

      // onerror fires when cancel() is called — just clear highlight quietly
      utterance.onerror = (e) => {
        if (e.error !== "interrupted") setTtsWordIndex(-1);
      };

      window.speechSynthesis.speak(utterance);
    }
  }, []);
  playAudioRef.current = playAudio;

  // ── Auto-play 400ms after each page arrives ──────────────────────────────────
  useEffect(() => {
    if (!story || !hasInteracted) return;
    autoPlayTimerRef.current = setTimeout(() => {
      playAudioRef.current?.();
    }, 400);
    return () => clearTimeout(autoPlayTimerRef.current);
  }, [pageIndex, hasInteracted, story]);

  // ── Tap-to-hear individual words ─────────────────────────────────────────────
  // MP3 path: stop the page player, then play just this word's clip on the
  // dedicated word-audio element.  End time is trimmed by half the gap to the
  // next word (max 100 ms) so we stop before bleeding into the following word.
  // TTS fallback is used only when no MP3 exists yet.
  const onWordTap = useCallback((wordIndex) => {
    stopAudioRef.current?.(); // stop page audio before playing the clip

    const page = storyRef.current?.pages[pageIndexRef.current];
    if (!page) return;

    const pageWords = page.text.split(/\s+/).filter(Boolean);
    const raw       = pageWords[wordIndex] ?? "";
    // Normalize to match the filename generated by generate_word_audio.py:
    // strip surrounding punctuation, lowercase, remove non-alphanumeric.
    const stem = raw.toLowerCase().replace(/^[.,!?;:"'()[\]{}—–-]+|[.,!?;:"'()[\]{}—–-]+$/g, "").replace(/[^a-z0-9]/g, "");

    if (page.audio && stem) {
      speakWordClip(`/stories/${storyId}/words/${stem}.mp3`);
    } else {
      // TTS fallback (no MP3 audio for this story yet)
      const word = raw.replace(/[^a-zA-Z0-9'-]/g, "");
      if (word) speakWord(word);
    }
  }, [speakWordClip]);

  // Karaoke index: TTS boundary events or MP3 sync (WordHighlighter overlays tap highlight)
  const activeWordIndex = isTTSMode ? ttsWordIndex : mp3WordIndex;

  const totalPages = story?.pages.length ?? 0;

  // Animate the whole wrapper (book card + floating controls move together)
  const wrapperAnim = animLeaving
    ? { opacity: 0, transform: `translateX(${animDir * 40}px)`, transition: "opacity 0.25s ease, transform 0.25s ease" }
    : { opacity: 1, transform: "translateX(0)",                  transition: "none" };

  // Always render the outer div so screenRef is set before touch effect runs
  return (
    <div
      ref={screenRef}
      style={{ ...styles.screen, background: page ? `linear-gradient(180deg, ${page.bg} 0%, #F5F5F5 100%)` : "#F5F5F5" }}
    >
      {loading ? (
        <Spinner />
      ) : (error || !story || !page) ? (
        <div style={styles.errorWrap}>
          <p style={styles.errorText}>Could not load story.</p>
          <button style={styles.retryBtn} onClick={() => setFetchKey((k) => k + 1)}>
            Try Again
          </button>
          <button style={styles.backBtn} onClick={onBack}>← Library</button>
        </div>
      ) : (
        <>
          {/* ── Top bar ──────────────────────────────────────────────────────── */}
          <div style={{ ...styles.topBar, ...bpStyles.topBar }}>
            <button data-control="true" style={styles.backPill} onClick={onBack} aria-label="Back to library">←</button>
            <div style={styles.titlePill}>{story.title}</div>
            <div style={styles.topBarRight}>
              <button
                data-control="true"
                style={{ ...styles.modePill, background: guided ? page.accent : "rgba(255,255,255,0.75)", color: guided ? "white" : "#2C3E50" }}
                onClick={() => setGuided((g) => !g)}
                aria-label={guided ? "Guided mode on" : "Guided mode off"}
              >
                {guided ? t.guided : t.free}
              </button>
              <button data-control="true" style={styles.langPill} onClick={onToggleLang}>
                {lang === "en" ? "ES" : "EN"}
              </button>
            </div>
          </div>

          {/* ── Progress bar ─────────────────────────────────────────────────── */}
          <ProgressBar total={totalPages} current={pageIndex} accent={page.accent} />

          {/* ── Book area ────────────────────────────────────────────────────── */}
          <div style={{ ...styles.bookArea, ...bpStyles.bookArea }}>
            {/* Hint chevrons — pointer-events: none, visual only */}
            {pageIndex > 0 && (
              <svg style={{ ...styles.chevron, left: 4 }} viewBox="0 0 24 24" fill="none">
                <polyline points="15 18 9 12 15 6" stroke="rgba(0,0,0,0.18)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {pageIndex < totalPages - 1 && (
              <svg style={{ ...styles.chevron, right: 4 }} viewBox="0 0 24 24" fill="none">
                <polyline points="9 18 15 12 9 6" stroke="rgba(0,0,0,0.18)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}

            {/* Book + floating controls wrapped together so they animate as a unit */}
            <div style={{ ...styles.bookWrapper, ...wrapperAnim, ...bpStyles.bookWrapper }}>

              {/* Book card */}
              <div style={styles.bookCard}>
                <div style={styles.spine} />

                <IllustrationArea
                  src={`/stories/${storyId}/${page.image}`}
                  pageKey={page.image ?? pageIndex}
                  bg={page.bg}
                />

                <div style={styles.divider} />

                <div style={{ ...styles.textArea, ...bpStyles.textArea }}>
                  <div
                    style={{
                      fontFamily:    `'${display.fontFamily}', system-ui, sans-serif`,
                      fontSize:      display.fontSize,
                      lineHeight:    display.lineHeight,
                      wordSpacing:   display.wordSpacing,
                      letterSpacing: display.letterSpacing,
                      fontWeight:    400,
                      color:         "#2C3E50",
                      textAlign:     "center",
                    }}
                  >
                    <WordHighlighter
                      words={words}
                      activeWordIndex={activeWordIndex}
                      accentColor={page.accent}
                      speakWord={onWordTap}
                    />
                  </div>
                </div>

                <div style={styles.pageNum}>
                  {pageIndex + 1} / {totalPages}
                </div>

                <div style={styles.edgeRight} />
                <div style={styles.edgeBottom} />
              </div>

              {/* ── Floating controls ──────────────────────────────────────────── */}

              {/* Replay button — 0.75x speed; data-control prevents touch zone nav */}
              <button
                data-control="true"
                style={{ ...styles.replayBtn, borderColor: page.accent, color: page.accent }}
                onClick={() => playAudioRef.current?.(0.75)}
                aria-label="Replay slowly"
              >
                ↻
                {isSlowPlay && <span style={styles.slowBadge}>🐢</span>}
              </button>

              {/* Loop toggle — when ON, replays at 0.75x after 1.5s; data-control prevents touch zone nav */}
              <button
                data-control="true"
                style={{
                  ...styles.loopBtn,
                  background:  loop ? page.accent : "rgba(255,255,255,0.9)",
                  border:      loop ? "none" : "2.5px solid rgba(0,0,0,0.1)",
                  color:       loop ? "white" : "rgba(0,0,0,0.35)",
                  boxShadow:   loop ? "0 3px 12px rgba(0,0,0,0.2)" : "0 3px 12px rgba(0,0,0,0.15)",
                }}
                onClick={() => setLoop((l) => !l)}
                aria-label={loop ? "Loop on" : "Loop off"}
              >
                ♾️
              </button>
            </div>
          </div>

          {/* ── Tap-to-start overlay ─────────────────────────────────────────── */}
          {!hasInteracted && (
            <TapToStart title={story.title} lang={lang} onTap={() => setHasInteracted(true)} />
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IllustrationArea({ src, pageKey, bg }) {
  const [imgError, setImgError] = useState(false);
  // Reset error state when the page changes (new image URL)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setImgError(false); }, [pageKey]);

  return (
    <div style={styles.illustrationWrap}>
      {imgError ? (
        <div style={{ ...styles.illustrationPlaceholder, background: bg ?? "#E3F2FD" }}>
          📖
        </div>
      ) : (
        <img
          src={src}
          alt=""
          style={styles.illustration}
          draggable={false}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

function ProgressBar({ total, current, accent }) {
  return (
    <div style={styles.progressContainer}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={styles.progressSegment}>
          <div style={{ ...styles.progressFill, width: i <= current ? "100%" : "0%", background: accent }} />
        </div>
      ))}
    </div>
  );
}

function TapToStart({ title, lang, onTap }) {
  const hint = lang === "es" ? "Toca para comenzar" : "Tap anywhere to start";
  return (
    <div style={styles.overlay} onTouchEnd={onTap} onClick={onTap}>
      <div style={styles.overlayCard}>
        <div style={styles.overlayEmoji}>📚</div>
        <div style={styles.overlayTitle}>{title}</div>
        <div style={styles.overlayHint}>{hint}</div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={styles.spinnerWrap}>
      <style>{`
        @keyframes spinnerPulse {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%       { transform: scale(1.6); opacity: 0.4; }
        }
      `}</style>
      <div style={styles.spinnerDot} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  screen: {
    height: "100dvh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Nunito', system-ui, sans-serif",
    userSelect: "none",
    WebkitUserSelect: "none",
    overflow: "hidden",
  },

  // Top bar
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", zIndex: 20, gap: 8 },
  backPill: {
    background: "rgba(255,255,255,0.75)", border: "none", borderRadius: 16,
    padding: "6px 12px", fontSize: 16, fontWeight: 700, color: "#2C3E50",
    cursor: "pointer", fontFamily: "'Nunito', system-ui, sans-serif",
    flexShrink: 0, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
  },
  titlePill: {
    background: "rgba(255,255,255,0.75)", borderRadius: 16, padding: "6px 16px",
    fontSize: 14, fontWeight: 800, color: "#2C3E50",
    fontFamily: "'Nunito', system-ui, sans-serif",
    flex: 1, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  topBarRight: { display: "flex", gap: 6, flexShrink: 0 },
  modePill: {
    border: "none", borderRadius: 16, padding: "5px 12px", fontSize: 12,
    fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', system-ui, sans-serif",
    minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
  },
  langPill: {
    background: "rgba(255,255,255,0.75)", border: "none", borderRadius: 16, padding: "5px 12px",
    fontSize: 12, fontWeight: 800, color: "#2C3E50", cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
    minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
  },

  // Progress bar
  progressContainer: { display: "flex", gap: 3, padding: "0 14px 8px" },
  progressSegment:   { flex: 1, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.08)", overflow: "hidden" },
  progressFill:      { height: "100%", borderRadius: 2, transition: "width 0.4s ease, background-color 0.4s ease" },

  // Book area
  bookArea: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 16px 16px", position: "relative", overflow: "hidden",
  },

  // Chevrons
  chevron: {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 24, height: 24, opacity: 0.5, pointerEvents: "none", zIndex: 5,
  },

  // Book + controls wrapper (animated together)
  bookWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: 440,
  },

  // Book card
  bookCard: {
    position: "relative",
    borderRadius: "4px 16px 16px 4px",
    overflow: "hidden",
    boxShadow: "0 12px 50px rgba(0,0,0,0.15), 0 2px 10px rgba(0,0,0,0.08), -4px 0 12px rgba(0,0,0,0.06)",
    background: "linear-gradient(135deg, #FFFEF9 0%, #FFF9F0 40%, #FFFDF7 100%)",
  },
  spine: {
    position: "absolute", left: 0, top: 0, bottom: 0, width: 6, zIndex: 5, pointerEvents: "none",
    background: "linear-gradient(to right, rgba(0,0,0,0.12), rgba(0,0,0,0.04), transparent)",
  },
  illustrationWrap:        { width: "100%", aspectRatio: "16 / 10", overflow: "hidden", borderBottom: "1px solid rgba(0,0,0,0.04)" },
  illustration:            { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  illustrationPlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 },
  divider:          { height: 1, margin: "0 24px", background: "linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent)" },
  textArea:         { padding: "20px 24px 14px", maxHeight: 280, overflowY: "auto", WebkitOverflowScrolling: "touch" },
  pageNum:          { textAlign: "center", fontSize: 12, fontWeight: 700, color: "#BDC3C7", letterSpacing: 1, paddingBottom: 16 },
  edgeRight:        { position: "absolute", right: 0, top: 4, bottom: 4, width: 3, background: "linear-gradient(to left, #D5D5D0, #E8E8E3)", borderRadius: "0 2px 2px 0", pointerEvents: "none" },
  edgeBottom:       { position: "absolute", bottom: 0, left: 8, right: 4, height: 3, background: "linear-gradient(to top, #D5D5D0, #E8E8E3)", borderRadius: "0 0 2px 2px", pointerEvents: "none" },

  // Floating controls — positioned relative to bookWrapper
  replayBtn: {
    position: "absolute", bottom: 14, right: 58, zIndex: 10,
    width: 44, height: 44, borderRadius: "50%",
    border: "2.5px solid", background: "rgba(255,255,255,0.9)",
    fontSize: 22, cursor: "pointer",
    boxShadow: "0 3px 12px rgba(0,0,0,0.15)",
    backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "system-ui",
  },
  slowBadge: {
    position: "absolute", top: -6, right: -6, fontSize: 12, lineHeight: 1,
  },
  loopBtn: {
    position: "absolute", bottom: 14, right: 14, zIndex: 10,
    width: 44, height: 44, borderRadius: "50%",
    fontSize: 20, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "system-ui",
  },

  // Overlay
  overlay: {
    position: "fixed", inset: 0, zIndex: 50,
    background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  overlayCard: {
    background: "white", borderRadius: 24, padding: "36px 40px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center", maxWidth: 300, width: "90%",
  },
  overlayEmoji: { fontSize: 48, marginBottom: 12 },
  overlayTitle: { fontFamily: "'Nunito', system-ui, sans-serif", fontSize: 20, fontWeight: 800, color: "#1B4F72", marginBottom: 10 },
  overlayHint:  { fontFamily: "'Nunito', system-ui, sans-serif", fontSize: 15, fontWeight: 600, color: "#7F8C8D" },

  // Error / loading
  errorWrap:  { minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'Nunito', system-ui, sans-serif" },
  errorText:  { color: "#7F8C8D", fontSize: 15, fontWeight: 600 },
  retryBtn:   { background: "#2E86C1", color: "white", border: "none", borderRadius: 20, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', system-ui, sans-serif" },
  backBtn:    { background: "#1B4F72", color: "white", border: "none", borderRadius: 20, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', system-ui, sans-serif" },
  spinnerWrap:{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" },
  spinnerDot: { width: 12, height: 12, borderRadius: "50%", background: "#2E86C1", animation: "spinnerPulse 1s ease-in-out infinite" },
};
