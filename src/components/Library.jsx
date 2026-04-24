import { useState, useEffect } from "react";

const LABELS = {
  en: {
    appName: "ReadAloud",
    school: "Hope Academy",
    thisWeek: "⭐ This Week",
    loading: "Loading books…",
    error: "Could not load books.",
    tapHint: "Tap a book to start reading",
    tryAgain: "Try Again",
    all: "All",
    continueReading: "Continue Reading",
    page: "Page",
    of: "of",
  },
  es: {
    appName: "ReadAloud",
    school: "Hope Academy",
    thisWeek: "⭐ Esta Semana",
    loading: "Cargando libros…",
    error: "No se pudieron cargar los libros.",
    tapHint: "Toca un libro para leer",
    tryAgain: "Intentar de nuevo",
    all: "Todos",
    continueReading: "Continuar Leyendo",
    page: "Página",
    of: "de",
  },
};

// Grade filter options — label maps to gradeLevel values in library.json
const GRADE_FILTERS = [
  { key: "all",  label: { en: "All",     es: "Todos"   } },
  { key: "PreK", label: { en: "PreK",    es: "Prek"    } },
  { key: "K",    label: { en: "Kinder",  es: "Kinder"  } },
  { key: "1st",  label: { en: "Grade 1", es: "Grado 1" } },
  { key: "2nd",  label: { en: "Grade 2", es: "Grado 2" } },
  { key: "3rd",  label: { en: "Grade 3", es: "Grado 3" } },
];

export default function Library({ onSelectStory, completedStories = [], readingProgress = {}, lang, onToggleLang }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");

  const t = LABELS[lang] || LABELS.en;

  function fetchLibrary() {
    setLoading(true);
    setError(false);
    fetch("/library.json")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data) => {
        setStories(data.stories || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Find the first in-progress book (has saved page > 0, not completed)
  const continueStory = stories.find(
    (s) => readingProgress[s.id] > 0 && !completedStories.includes(s.id)
  ) ?? null;

  // Filter grid stories by grade (exclude the continue-reading book from grid)
  const filteredStories = stories.filter((s) => {
    if (gradeFilter !== "all" && s.gradeLevel !== gradeFilter) return false;
    return true;
  });

  return (
    <div style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerTitle}>{t.appName}</div>
          <div style={styles.headerSub}>{t.school}</div>
        </div>
        <button
          style={styles.langToggle}
          onClick={onToggleLang}
          aria-label="Toggle language"
        >
          {lang === "en" ? "ES" : "EN"}
        </button>
      </header>

      {/* ── Grade filter tabs ───────────────────────────────── */}
      {!loading && !error && (
        <div style={styles.filterBar}>
          {GRADE_FILTERS.map((f) => (
            <button
              key={f.key}
              style={{
                ...styles.filterTab,
                ...(gradeFilter === f.key ? styles.filterTabActive : {}),
              }}
              onClick={() => setGradeFilter(f.key)}
            >
              {f.label[lang] || f.label.en}
            </button>
          ))}
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────── */}
      <main style={styles.body}>
        {loading && <p style={styles.message}>{t.loading}</p>}

        {error && (
          <div style={styles.errorWrap}>
            <p style={styles.message}>{t.error}</p>
            <button style={styles.retryBtn} onClick={fetchLibrary}>
              {t.tryAgain}
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Continue Reading banner ─────────────────── */}
            {continueStory && (
              <div style={styles.continueSection}>
                <div style={styles.continueLabel}>{t.continueReading}</div>
                <div
                  style={styles.continueCard}
                  onClick={() => onSelectStory(continueStory.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onSelectStory(continueStory.id)}
                >
                  <ContinueCover story={continueStory} />
                  <div style={styles.continueInfo}>
                    <div style={styles.continueTitle}>{continueStory.title}</div>
                    <div style={styles.continuePage}>
                      {t.page} {readingProgress[continueStory.id] + 1} {t.of} {continueStory.pages}
                    </div>
                    <div style={styles.continueProgress}>
                      <div
                        style={{
                          ...styles.continueProgressFill,
                          width: `${Math.round(((readingProgress[continueStory.id] + 1) / continueStory.pages) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div style={styles.continueArrow}>▶</div>
                </div>
              </div>
            )}

            <p style={styles.hint}>{t.tapHint}</p>
            <div style={styles.grid}>
              {filteredStories.map((story) => (
                <BookCard
                  key={story.id}
                  story={story}
                  lang={lang}
                  thisWeekLabel={t.thisWeek}
                  isCompleted={completedStories.includes(story.id)}
                  onSelect={() => onSelectStory(story.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function BookCard({ story, thisWeekLabel, isCompleted, onSelect }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div style={styles.card} onClick={onSelect} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}>
      {/* Cover image area */}
      <div style={styles.coverWrap}>
        {!imgError ? (
          <img
            src={`/${story.cover}`}
            alt={story.title}
            style={styles.coverImg}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <CoverPlaceholder title={story.title} />
        )}

        {/* "This Week" badge — top-right */}
        {story.featured && (
          <div style={styles.featuredBadge}>{thisWeekLabel}</div>
        )}

        {/* Completion badge — top-left */}
        {isCompleted && (
          <div style={styles.completionBadge} aria-label="Completed">⭐</div>
        )}
      </div>

      {/* Title */}
      <div style={styles.cardTitle}>{story.title}</div>


    </div>
  );
}

function CoverPlaceholder({ title }) {
  const hue = [...title].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        ...styles.placeholder,
        background: `linear-gradient(135deg, hsl(${hue},55%,78%) 0%, hsl(${(hue + 40) % 360},55%,68%) 100%)`,
      }}
    >
      <span style={styles.placeholderEmoji}>📖</span>
    </div>
  );
}

function ContinueCover({ story }) {
  const [imgError, setImgError] = useState(false);
  if (!imgError) {
    return (
      <img
        src={`/${story.cover}`}
        alt={story.title}
        style={styles.continueCoverImg}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }
  const hue = [...story.title].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return (
    <div style={{ ...styles.continueCoverImg, background: `linear-gradient(135deg, hsl(${hue},55%,78%), hsl(${(hue + 40) % 360},55%,68%))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
      📖
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  screen: {
    minHeight: "100dvh",
    background: "#F0F4F8",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Nunito', system-ui, sans-serif",
  },

  // Header
  header: {
    background: "linear-gradient(135deg, #1B4F72 0%, #2E86C1 60%, #5DADE2 100%)",
    padding: "16px 16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
    position: "sticky",
    top: 0,
    zIndex: 30,
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: "white",
    lineHeight: 1.1,
    letterSpacing: "-0.5px",
  },
  headerSub: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  langToggle: {
    background: "rgba(255,255,255,0.2)",
    border: "1.5px solid rgba(255,255,255,0.5)",
    borderRadius: 16,
    padding: "5px 14px",
    fontSize: 12,
    fontWeight: 800,
    color: "white",
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
    letterSpacing: "0.5px",
  },

  // Filter tabs
  filterBar: {
    display: "flex",
    gap: 8,
    padding: "10px 12px 0",
    maxWidth: 500,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  filterTab: {
    flex: 1,
    padding: "7px 4px",
    borderRadius: 20,
    border: "1.5px solid #CBD5E0",
    background: "white",
    fontSize: 13,
    fontWeight: 700,
    color: "#5A6A7A",
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
    transition: "all 0.15s ease",
  },
  filterTabActive: {
    background: "#2E86C1",
    borderColor: "#2E86C1",
    color: "white",
  },

  // Body
  body: {
    flex: 1,
    padding: "12px 12px 24px",
    maxWidth: 500,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  hint: {
    fontSize: 12,
    fontWeight: 600,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 14,
    letterSpacing: "0.2px",
  },
  message: {
    textAlign: "center",
    color: "#7F8C8D",
    marginTop: 40,
    fontSize: 15,
    fontWeight: 600,
  },
  errorWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    marginTop: 40,
  },
  retryBtn: {
    background: "#2E86C1",
    color: "white",
    border: "none",
    borderRadius: 20,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
  },

  // Continue Reading
  continueSection: {
    marginBottom: 16,
  },
  continueLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#5A6A7A",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  continueCard: {
    background: "white",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.09)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 10,
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  },
  continueCoverImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
  },
  continueInfo: {
    flex: 1,
    minWidth: 0,
  },
  continueTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#2C3E50",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginBottom: 3,
  },
  continuePage: {
    fontSize: 12,
    fontWeight: 600,
    color: "#7F8C8D",
    marginBottom: 5,
  },
  continueProgress: {
    height: 4,
    borderRadius: 2,
    background: "#E2E8F0",
    overflow: "hidden",
  },
  continueProgressFill: {
    height: "100%",
    borderRadius: 2,
    background: "#2E86C1",
    transition: "width 0.3s ease",
  },
  continueArrow: {
    fontSize: 14,
    color: "#2E86C1",
    flexShrink: 0,
    fontWeight: 800,
  },

  // Grid
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  // Card
  card: {
    background: "white",
    borderRadius: 12,
    overflow: "visible",
    boxShadow: "0 2px 10px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    position: "relative",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  },
  coverWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "3 / 4",
    borderRadius: "12px 12px 0 0",
    overflow: "hidden",
    background: "#E8EDF2",
  },
  coverImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderEmoji: {
    fontSize: 48,
    opacity: 0.85,
  },

  // "This Week" badge — top-right of cover
  featuredBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    background: "rgba(27,79,114,0.92)",
    color: "white",
    fontSize: 10,
    fontWeight: 800,
    fontFamily: "'Nunito', system-ui, sans-serif",
    padding: "3px 8px",
    borderRadius: 10,
    letterSpacing: "0.3px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",
  },

  // Completion badge — top-left of cover
  completionBadge: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#27AE60",
    border: "2px solid white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    lineHeight: 1,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#2C3E50",
    padding: "8px 10px 4px",
    textAlign: "center",
    lineHeight: 1.3,
  },

  // Reading level badge below title
  levelBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#7F8C8D",
    background: "#F0F4F8",
    border: "1px solid #CBD5E0",
    borderRadius: 8,
    padding: "2px 7px",
    margin: "0 auto 8px",
    display: "table",
    letterSpacing: "0.3px",
  },
};
