import { useMemo } from "react";

const LABELS = {
  en: {
    great:     "Great job!",
    finished:  (title) => `You finished ${title}!`,
    readAgain: "Read Again",
    moreBooks: "More Books",
  },
  es: {
    great:     "¡Muy bien!",
    finished:  (title) => `¡Terminaste ${title}!`,
    readAgain: "Leer otra vez",
    moreBooks: "Más libros",
  },
};

// 12-color palette — bright but not garish on a low-DPI phone screen
const CONFETTI_COLORS = [
  "#FF6B6B", "#FFE66D", "#4ECDC4", "#45B7D1",
  "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#F8C471", "#82E0AA",
];

const PIECE_COUNT = 24;

// Props:
//   storyTitle       – displayed in the subtitle
//   accentColor      – drives the background gradient (last page's accent)
//   celebrationStyle – "confetti" | "achievement" from story.json
//                      Phase 1 only implements "confetti"; any unrecognized value
//                      falls through to confetti.
//   lang             – "en" | "es"
//   onReadAgain()    – resets to page 1 of same story
//   onMoreBooks()    – returns to Library
export default function Celebration({
  storyTitle       = "",
  accentColor      = "#42A5F5",
  celebrationStyle = "confetti",
  lang,
  onReadAgain,
  onMoreBooks,
}) {
  const t = LABELS[lang] || LABELS.en;

  // Stable randomised confetti — useMemo so rerenders don't reshuffle pieces
  const pieces = useMemo(() =>
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id:       i,
      left:     `${Math.floor(Math.random() * 96)}%`,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay:    `${(Math.random() * 2.5).toFixed(2)}s`,
      duration: `${(3 + Math.random() * 1.5).toFixed(2)}s`,
      size:     `${8 + Math.floor(Math.random() * 8)}px`,
      // Alternate squares and circles for visual variety
      radius:   i % 3 === 0 ? "50%" : "3px",
    })),
  []);

  return (
    <div
      style={{
        ...styles.overlay,
        background: `linear-gradient(135deg, ${accentColor}F0 0%, ${accentColor}B0 100%)`,
      }}
    >
      {/* @keyframes injected here — React removes this node on unmount */}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {/* Confetti pieces — pointer-events: none so they don't block the buttons */}
      {pieces.map((p) => (
        <div
          key={p.id}
          aria-hidden="true"
          style={{
            position:      "absolute",
            left:          p.left,
            top:           0,
            width:         p.size,
            height:        p.size,
            background:    p.color,
            borderRadius:  p.radius,
            animation:     `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
            pointerEvents: "none",
            willChange:    "transform, opacity",
          }}
        />
      ))}

      {/* Centre card */}
      <div style={styles.card}>
        <div style={styles.star} aria-hidden="true">🌟</div>
        <div style={styles.great}>{t.great}</div>
        <div style={styles.subtitle}>{t.finished(storyTitle)}</div>

        <div style={styles.btnRow}>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={onMoreBooks}>
            {t.moreBooks}
          </button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={onReadAgain}>
            {t.readAgain}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position:       "fixed",
    inset:          0,
    zIndex:         100,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
    fontFamily:     "'Nunito', system-ui, sans-serif",
  },

  card: {
    position:             "relative",
    zIndex:               2,
    background:           "rgba(255,255,255,0.18)",
    backdropFilter:       "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    borderRadius:         28,
    padding:              "40px 32px 32px",
    textAlign:            "center",
    maxWidth:             320,
    width:                "88%",
    boxShadow:            "0 20px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.35)",
  },

  star: {
    fontSize:     64,
    lineHeight:   1,
    marginBottom: 12,
  },

  great: {
    fontSize:     32,
    fontWeight:   900,
    color:        "white",
    lineHeight:   1.2,
    marginBottom: 8,
    textShadow:   "0 2px 10px rgba(0,0,0,0.18)",
  },

  subtitle: {
    fontSize:     16,
    fontWeight:   600,
    color:        "rgba(255,255,255,0.88)",
    lineHeight:   1.45,
    marginBottom: 28,
  },

  btnRow: {
    display:        "flex",
    gap:            12,
    justifyContent: "center",
  },

  btn: {
    flex:        1,
    borderRadius: 24,
    padding:     "12px 16px",
    fontSize:    14,
    fontWeight:  800,
    border:      "none",
    cursor:      "pointer",
    fontFamily:  "'Nunito', system-ui, sans-serif",
    lineHeight:  1,
    minHeight:   44,
  },

  btnPrimary: {
    background: "white",
    color:      "#1B4F72",
    boxShadow:  "0 4px 16px rgba(0,0,0,0.15)",
  },

  btnSecondary: {
    background: "rgba(255,255,255,0.2)",
    color:      "white",
    border:     "2px solid rgba(255,255,255,0.55)",
  },
};
