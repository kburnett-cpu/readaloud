import { useState, useEffect } from "react";

const LABELS = {
  en: {
    appName: "ReadAloud",
    school: "Hope Academy",
    thisWeek: "⭐ This Week",
    loading: "Loading books…",
    error: "Could not load books.",
    tapHint: "Tap a book to start reading",
  },
  es: {
    appName: "ReadAloud",
    school: "Hope Academy",
    thisWeek: "⭐ Esta Semana",
    loading: "Cargando libros…",
    error: "No se pudieron cargar los libros.",
    tapHint: "Toca un libro para leer",
  },
};

export default function Library({ onSelectStory, completedStories = [], lang, onToggleLang }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const t = LABELS[lang] || LABELS.en;

  useEffect(() => {
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
  }, []);

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

      {/* ── Body ───────────────────────────────────────────── */}
      <main style={styles.body}>
        {loading && <p style={styles.message}>{t.loading}</p>}
        {error && <p style={styles.message}>{t.error}</p>}

        {!loading && !error && (
          <>
            <p style={styles.hint}>{t.tapHint}</p>
            <div style={styles.grid}>
              {stories.map((story) => (
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
  // Deterministic pastel from title
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

  // Body
  body: {
    flex: 1,
    padding: "16px 12px 24px",
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
    padding: "8px 10px 10px",
    textAlign: "center",
    lineHeight: 1.3,
  },
};
