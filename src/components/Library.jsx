import { useState, useEffect } from "react";
import useBreakpoint from "../hooks/useBreakpoint.js";

const LABELS = {
  en: {
    appName: "ReadAloud",
    school: "Hope Academy",
    thisWeek: "⭐ This Week",
    loading: "Loading books…",
    error: "Could not load books.",
    tryAgain: "Try Again",
    all: "All",
    continueReading: "Continue Reading",
    page: "Page",
    of: "of",
    classroom: "Class",
    earlyLiteracy: "✨ Early Literacy",
    books: "📚 Books",
  },
  es: {
    appName: "ReadAloud",
    school: "Hope Academy",
    thisWeek: "⭐ Esta Semana",
    loading: "Cargando libros…",
    error: "No se pudieron cargar los libros.",
    tryAgain: "Intentar de nuevo",
    all: "Todos",
    continueReading: "Continuar Leyendo",
    page: "Página",
    of: "de",
    classroom: "Clase",
    earlyLiteracy: "✨ Primeras Letras",
    books: "📚 Libros",
  },
};

const GRADE_FILTERS = [
  { key: "all",  label: { en: "All",     es: "Todos"   } },
  { key: "PreK", label: { en: "PreK",    es: "Prek"    } },
  { key: "K",    label: { en: "Kinder",  es: "Kinder"  } },
  { key: "1st",  label: { en: "Grade 1", es: "Grado 1" } },
  { key: "2nd",  label: { en: "Grade 2", es: "Grado 2" } },
  { key: "3rd",  label: { en: "Grade 3", es: "Grado 3" } },
  { key: "4th",  label: { en: "Grade 4", es: "Grado 4" } },
  { key: "5th",  label: { en: "Grade 5", es: "Grado 5" } },
  { key: "6th",  label: { en: "Grade 6", es: "Grado 6" } },
];

const ACTIVITIES = [
  {
    id: "sounds",
    emoji: "🔤",
    label: "Sounds",
    sub:   "A–Z phonics",
    bg: "linear-gradient(135deg, #FFF3E0, #FFE0B2)",
    border: "#FFCC80",
  },
  {
    id: "syllable",
    emoji: "👏",
    label: "Syllables",
    sub:   "Clap the beats",
    bg: "linear-gradient(135deg, #E0F7FA, #B2EBF2)",
    border: "#80DEEA",
  },
  {
    id: "rhyme",
    emoji: "🎵",
    label: "Rhymes",
    sub:   "Find the match",
    bg: "linear-gradient(135deg, #F3E5F5, #E1BEE7)",
    border: "#CE93D8",
  },
  {
    id: "hearts",
    emoji: "❤️",
    label: "Heart Words",
    sub:   "Tricky words",
    bg: "linear-gradient(135deg, #FCE4EC, #F8BBD9)",
    border: "#F48FB1",
  },
];

export default function Library({ onSelectStory, completedStories = [], readingProgress = {}, lang, onToggleLang, onOpenClassroom, onOpenActivity }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");

  const bp = useBreakpoint();

  const bpStyles = {
    body: {
      maxWidth:  bp === "desktop" ? 1100 : bp === "tablet" ? 720 : 500,
      padding:   bp === "desktop" ? "24px 32px 48px" : bp === "tablet" ? "16px 20px 32px" : "16px 12px 32px",
    },
    grid: {
      gridTemplateColumns:
        bp === "desktop" ? "1fr 1fr 1fr 1fr"
        : bp === "tablet" ? "1fr 1fr 1fr"
        : "1fr 1fr",
    },
    activityGrid: {
      gridTemplateColumns:
        bp === "desktop" || bp === "tablet" ? "1fr 1fr 1fr 1fr" : "1fr 1fr",
    },
    header: {
      padding: bp === "desktop" ? "16px 40px" : bp === "tablet" ? "14px 24px" : "12px 16px",
    },
    headerTitle: {
      fontSize: bp === "desktop" ? 32 : bp === "tablet" ? 28 : 26,
    },
  };

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

  const continueStory = stories.find(
    (s) => readingProgress[s.id] > 0 && !completedStories.includes(s.id)
  ) ?? null;

  const filteredStories = stories.filter((s) => {
    if (gradeFilter !== "all" && s.gradeLevel !== gradeFilter) return false;
    return true;
  });

  return (
    <div style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{ ...styles.header, ...bpStyles.header }}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerTitle, ...bpStyles.headerTitle }}>{t.appName}</div>
          <div style={styles.headerSub}>{t.school}</div>
        </div>
        <div style={styles.headerActions}>
          {onOpenClassroom && (
            <button style={styles.headerBtn} onClick={onOpenClassroom} aria-label="Classroom">
              {t.classroom}
            </button>
          )}
          <button style={styles.headerBtn} onClick={onToggleLang} aria-label="Toggle language">
            {lang === "en" ? "ES" : "EN"}
          </button>
        </div>
      </header>

      {/* ── Scrollable body ────────────────────────────────── */}
      <main style={{ ...styles.body, ...bpStyles.body }}>

        {/* ── Continue Reading ──────────────────────────────── */}
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

        {/* ── Early Literacy Section ────────────────────────── */}
        {onOpenActivity && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>{t.earlyLiteracy}</span>
            </div>
            <div style={{ ...styles.activityGrid, ...bpStyles.activityGrid }}>
              {ACTIVITIES.map((act) => (
                <ActivityCard
                  key={act.id}
                  activity={act}
                  onTap={() => onOpenActivity(act.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Books Section ─────────────────────────────────── */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>{t.books}</span>
          </div>

          {/* Grade filter tabs */}
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
            <div style={{ ...styles.grid, ...bpStyles.grid }}>
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
          )}
        </section>

      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActivityCard({ activity, onTap }) {
  return (
    <button
      style={{ ...styles.activityCard, background: activity.bg, borderColor: activity.border }}
      onTouchStart={(e) => { e.preventDefault(); onTap(); }}
      onClick={onTap}
      aria-label={activity.label}
    >
      <span style={styles.activityEmoji}>{activity.emoji}</span>
      <span style={styles.activityLabel}>{activity.label}</span>
      <span style={styles.activitySub}>{activity.sub}</span>
    </button>
  );
}

function BookCard({ story, thisWeekLabel, isCompleted, onSelect }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div style={styles.card} onClick={onSelect} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}>
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
        {story.featured && (
          <div style={styles.featuredBadge}>{thisWeekLabel}</div>
        )}
        {isCompleted && (
          <div style={styles.completionBadge} aria-label="Completed">⭐</div>
        )}
      </div>
      <div style={styles.cardTitle}>{story.title}</div>
    </div>
  );
}

function CoverPlaceholder({ title }) {
  const hue = [...title].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return (
    <div style={{ ...styles.placeholder, background: `linear-gradient(135deg, hsl(${hue},55%,78%) 0%, hsl(${(hue + 40) % 360},55%,68%) 100%)` }}>
      <span style={styles.placeholderEmoji}>📖</span>
    </div>
  );
}

function ContinueCover({ story }) {
  const [imgError, setImgError] = useState(false);
  if (!imgError) {
    return (
      <img src={`/${story.cover}`} alt={story.title} style={styles.continueCoverImg}
        onError={() => setImgError(true)} loading="lazy" />
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
  headerLeft: { display: "flex", flexDirection: "column", gap: 1 },
  headerTitle: { fontSize: 26, fontWeight: 800, color: "white", lineHeight: 1.1, letterSpacing: "-0.5px" },
  headerSub: { fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.5px", textTransform: "uppercase" },
  headerActions: { display: "flex", alignItems: "center", gap: 8 },
  headerBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "1.5px solid rgba(255,255,255,0.5)",
    borderRadius: 16,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 800,
    color: "white",
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
    letterSpacing: "0.5px",
    WebkitTapHighlightColor: "transparent",
  },

  body: {
    flex: 1,
    padding: "16px 12px 32px",
    maxWidth: 500,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  // Section layout
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "2px solid #E2E8F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#2C3E50",
    letterSpacing: "-0.2px",
  },

  // Activity cards
  activityGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  activityCard: {
    borderRadius: 16,
    border: "2px solid transparent",
    padding: "18px 12px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    aspectRatio: "1 / 1",
  },
  activityEmoji: {
    fontSize: 38,
    lineHeight: 1,
    userSelect: "none",
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: 800,
    color: "#2C3E50",
    textAlign: "center",
    lineHeight: 1.2,
  },
  activitySub: {
    fontSize: 11,
    fontWeight: 600,
    color: "#7F8C8D",
    textAlign: "center",
  },

  // Filter tabs (inside Books section)
  filterBar: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 4,
    marginBottom: 14,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    WebkitOverflowScrolling: "touch",
  },
  filterTab: {
    flexShrink: 0,
    padding: "7px 12px",
    borderRadius: 20,
    border: "1.5px solid #CBD5E0",
    background: "white",
    fontSize: 13,
    fontWeight: 700,
    color: "#5A6A7A",
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
    transition: "all 0.15s ease",
    WebkitTapHighlightColor: "transparent",
  },
  filterTabActive: {
    background: "#2E86C1",
    borderColor: "#2E86C1",
    color: "white",
  },

  message: { textAlign: "center", color: "#7F8C8D", marginTop: 32, fontSize: 15, fontWeight: 600 },
  errorWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 32 },
  retryBtn: {
    background: "#2E86C1", color: "white", border: "none", borderRadius: 20,
    padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
  },

  // Continue Reading
  continueSection: { marginBottom: 20 },
  continueLabel: {
    fontSize: 11, fontWeight: 800, color: "#5A6A7A",
    letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8,
  },
  continueCard: {
    background: "white", borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.09)",
    display: "flex", alignItems: "center", gap: 12, padding: 10,
    cursor: "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent",
  },
  continueCoverImg: { width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 },
  continueInfo: { flex: 1, minWidth: 0 },
  continueTitle: { fontSize: 14, fontWeight: 700, color: "#2C3E50", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 },
  continuePage: { fontSize: 12, fontWeight: 600, color: "#7F8C8D", marginBottom: 5 },
  continueProgress: { height: 4, borderRadius: 2, background: "#E2E8F0", overflow: "hidden" },
  continueProgressFill: { height: "100%", borderRadius: 2, background: "#2E86C1", transition: "width 0.3s ease" },
  continueArrow: { fontSize: 14, color: "#2E86C1", flexShrink: 0, fontWeight: 800 },

  // Book grid
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  card: {
    background: "white", borderRadius: 12, overflow: "visible",
    boxShadow: "0 2px 10px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.06)",
    cursor: "pointer", position: "relative", userSelect: "none", WebkitTapHighlightColor: "transparent",
  },
  coverWrap: { position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: "12px 12px 0 0", overflow: "hidden", background: "#E8EDF2" },
  coverImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  placeholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  placeholderEmoji: { fontSize: 48, opacity: 0.85 },
  featuredBadge: {
    position: "absolute", top: 7, right: 7,
    background: "rgba(27,79,114,0.92)", color: "white",
    fontSize: 10, fontWeight: 800, fontFamily: "'Nunito', system-ui, sans-serif",
    padding: "3px 8px", borderRadius: 10, letterSpacing: "0.3px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)", whiteSpace: "nowrap",
  },
  completionBadge: {
    position: "absolute", top: -4, left: -4, width: 28, height: 28,
    borderRadius: "50%", background: "#27AE60", border: "2px solid white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, lineHeight: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#2C3E50", padding: "8px 10px 10px", textAlign: "center", lineHeight: 1.3 },
};
