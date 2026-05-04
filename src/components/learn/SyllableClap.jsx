import { useState, useRef, useEffect } from "react";
import speakWord from "../../utils/speakWord.js";

export default function SyllableClap({ data, onBack }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [clapCount, setClapCount] = useState(0);
  const [phase, setPhase] = useState("clapping"); // "clapping" | "feedback"
  const timerRef = useRef(null);
  const words = data.words;
  const word = words[wordIndex];

  useEffect(() => {
    const aud = new Audio(word.audio);
    const fallback = () => speakWord(word.text, { rate: 0.75 });
    aud.onerror = fallback;
    const p = aud.play();
    if (p) p.catch(fallback);
  }, [wordIndex]);

  function handleClap() {
    if (phase !== "clapping") return;
    const next = clapCount + 1;
    setClapCount(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase("feedback"), 650);
  }

  function handleNext() {
    clearTimeout(timerRef.current);
    setClapCount(0);
    setPhase("clapping");
    setWordIndex((i) => (i + 1) % words.length);
  }

  const isCorrect = clapCount === word.syllables;

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.headerTitle}>Syllable Clap</div>
        <div style={styles.progress}>{wordIndex + 1} / {words.length}</div>
      </header>

      <main style={styles.body}>
        <div style={styles.wordCard}>
          <div style={styles.wordEmoji}>{word.emoji}</div>
          <div style={styles.wordText}>{word.text}</div>
          <div style={styles.instruction}>Clap once for each syllable!</div>
        </div>

        <div style={styles.tokensRow}>
          {clapCount === 0 && <div style={styles.tokenPlaceholder}>—</div>}
          {Array.from({ length: clapCount }).map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.token,
                ...(phase === "feedback"
                  ? isCorrect ? styles.tokenCorrect : styles.tokenWrong
                  : styles.tokenPending),
              }}
            >
              👏
            </div>
          ))}
        </div>

        {phase === "feedback" && (
          <div style={{ ...styles.feedback, ...(isCorrect ? styles.feedbackCorrect : styles.feedbackWrong) }}>
            <div style={styles.feedbackEmoji}>{isCorrect ? "✅" : "❌"}</div>
            <div style={styles.feedbackMsg}>{isCorrect ? "Great job!" : "Nice try!"}</div>
            <div style={styles.feedbackBreak}>
              It sounds like: <strong>{word.syllableBreak}</strong>
              {" "}({word.syllables} {word.syllables === 1 ? "syllable" : "syllables"})
            </div>
          </div>
        )}

        <div style={styles.spacer} />

        {phase === "clapping" ? (
          <button
            style={styles.clapBtn}
            onTouchStart={(e) => { e.preventDefault(); handleClap(); }}
            onClick={handleClap}
          >
            👏 Clap!
          </button>
        ) : (
          <button
            style={styles.nextBtn}
            onTouchStart={(e) => { e.preventDefault(); handleNext(); }}
            onClick={handleNext}
          >
            Next Word →
          </button>
        )}
      </main>
    </div>
  );
}

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
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
    position: "sticky",
    top: 0,
    zIndex: 30,
  },
  backBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "1.5px solid rgba(255,255,255,0.5)",
    borderRadius: 16,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 800,
    color: "white",
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
    WebkitTapHighlightColor: "transparent",
    minWidth: 70,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: "white",
    letterSpacing: "-0.3px",
    textAlign: "center",
  },
  progress: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.85)",
    minWidth: 70,
    textAlign: "right",
  },
  body: {
    flex: 1,
    padding: "20px 16px 32px",
    maxWidth: 500,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  wordCard: {
    background: "white",
    borderRadius: 20,
    padding: "28px 20px 20px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
    marginBottom: 24,
  },
  wordEmoji: { fontSize: 72, lineHeight: 1, userSelect: "none" },
  wordText: {
    fontFamily: "'Andika', 'Nunito', system-ui, sans-serif",
    fontSize: 32,
    fontWeight: 700,
    color: "#1A3A5C",
    textAlign: "center",
  },
  instruction: { fontSize: 13, fontWeight: 600, color: "#7F8C8D", textAlign: "center" },
  tokensRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    minHeight: 56,
    alignItems: "center",
    marginBottom: 16,
  },
  tokenPlaceholder: { fontSize: 20, color: "#CBD5E0", fontWeight: 700 },
  token: {
    fontSize: 32,
    width: 52,
    height: 52,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tokenPending: { background: "#EDF2F7" },
  tokenCorrect: { background: "#C6F6D5" },
  tokenWrong:   { background: "#FED7D7" },
  feedback: {
    width: "100%",
    borderRadius: 16,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  feedbackCorrect: { background: "#F0FFF4", border: "2px solid #9AE6B4" },
  feedbackWrong:   { background: "#FFF5F5", border: "2px solid #FEB2B2" },
  feedbackEmoji: { fontSize: 32 },
  feedbackMsg: { fontSize: 18, fontWeight: 800, color: "#2C3E50" },
  feedbackBreak: { fontSize: 14, fontWeight: 600, color: "#5A6A7A", textAlign: "center" },
  spacer: { flex: 1 },
  clapBtn: {
    width: "100%",
    padding: "20px",
    borderRadius: 20,
    border: "none",
    background: "linear-gradient(135deg, #F6AD55, #ED8936)",
    fontSize: 24,
    fontWeight: 800,
    color: "white",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(237,137,54,0.4)",
    fontFamily: "'Nunito', system-ui, sans-serif",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  },
  nextBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: 20,
    border: "none",
    background: "linear-gradient(135deg, #2E86C1, #1B4F72)",
    fontSize: 18,
    fontWeight: 800,
    color: "white",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(46,134,193,0.35)",
    fontFamily: "'Nunito', system-ui, sans-serif",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  },
};
