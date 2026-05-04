import { useState } from "react";
import speakWord from "../../utils/speakWord.js";

export default function HeartWords({ data, onBack }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [tapped, setTapped] = useState(new Set());
  const [showComplete, setShowComplete] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const words = data.words;
  const wordData = words[wordIndex];

  function playFullWord(audio) {
    const aud = new Audio(audio);
    const fallback = () => speakWord(wordData.word, { rate: 0.75 });
    aud.onerror = fallback;
    const p = aud.play();
    if (p) p.catch(fallback);
  }

  function playPhoneme(audio, letter) {
    const aud = new Audio(audio);
    const fallback = () => speakWord(letter, { rate: 0.65 });
    aud.onerror = fallback;
    const p = aud.play();
    if (p) p.catch(fallback);
  }

  function handleLetterTap(letterObj, idx) {
    if (showComplete) return;
    const next = new Set(tapped);
    next.add(idx);
    setTapped(next);

    if (letterObj.isHeart) {
      playFullWord(wordData.audio);
    } else if (letterObj.phonemeAudio) {
      playPhoneme(letterObj.phonemeAudio, letterObj.char);
    }

    if (next.size === wordData.letters.length) {
      setTimeout(() => setShowComplete(true), 400);
    }
  }

  function handleNext() {
    const nextIdx = wordIndex + 1;
    if (nextIdx >= words.length) {
      setAllDone(true);
      return;
    }
    setWordIndex(nextIdx);
    setTapped(new Set());
    setShowComplete(false);
  }

  if (allDone) {
    return (
      <div style={styles.screen}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← Back</button>
          <div style={styles.headerTitle}>Heart Words</div>
          <div style={{ width: 70 }} />
        </header>
        <main style={styles.doneScreen}>
          <div style={styles.doneEmoji}>⭐</div>
          <div style={styles.doneMsg}>All done!</div>
          <button
            style={styles.actionBtn}
            onClick={() => { setWordIndex(0); setTapped(new Set()); setShowComplete(false); setAllDone(false); }}
          >
            Play Again
          </button>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.headerTitle}>Heart Words</div>
        <div style={styles.progress}>{wordIndex + 1} / {words.length}</div>
      </header>

      <main style={styles.body}>
        <p style={styles.instruction}>Tap each letter!</p>
        <p style={styles.heartNote}>❤️ letters are special — remember them by heart!</p>

        <div style={styles.lettersRow}>
          {wordData.letters.map((letterObj, idx) => {
            const isTapped = tapped.has(idx);
            let tileStyle = { ...styles.tile };
            if (letterObj.isHeart) {
              tileStyle = { ...tileStyle, ...styles.heartTile, ...(isTapped ? styles.heartTileTapped : {}) };
            } else {
              tileStyle = { ...tileStyle, ...styles.regularTile, ...(isTapped ? styles.regularTileTapped : {}) };
            }
            return (
              <button
                key={idx}
                style={tileStyle}
                onTouchStart={(e) => { e.preventDefault(); handleLetterTap(letterObj, idx); }}
                onClick={() => handleLetterTap(letterObj, idx)}
              >
                <span style={styles.tileChar}>{letterObj.char}</span>
                {letterObj.isHeart && <span style={styles.heartBadge}>❤️</span>}
              </button>
            );
          })}
        </div>

        <div style={styles.hintBox}>
          <p style={styles.hintText}>{wordData.hint}</p>
        </div>

        {showComplete && (
          <div style={styles.completionBanner}>
            <span style={styles.completionCheck}>✅</span>
            <button
              style={styles.actionBtn}
              onTouchStart={(e) => { e.preventDefault(); handleNext(); }}
              onClick={handleNext}
            >
              Next Word →
            </button>
          </div>
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
    padding: "24px 16px 32px",
    maxWidth: 500,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  instruction: { fontSize: 16, fontWeight: 700, color: "#5A6A7A", textAlign: "center", margin: "0 0 4px" },
  heartNote: { fontSize: 12, fontWeight: 600, color: "#C53030", textAlign: "center", margin: "0 0 28px" },
  lettersRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 28,
  },
  tile: {
    position: "relative",
    width: 72,
    height: 80,
    borderRadius: 14,
    border: "2.5px solid transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
  },
  regularTile:       { background: "white",   borderColor: "#CBD5E0" },
  regularTileTapped: { background: "#F0FFF4", borderColor: "#68D391", transform: "scale(0.95)" },
  heartTile:         { background: "#FFF5F5", borderColor: "#FEB2B2" },
  heartTileTapped:   { background: "#FFE4E4", borderColor: "#FC8181", transform: "scale(0.95)" },
  tileChar: {
    fontFamily: "'Andika', 'Nunito', system-ui, sans-serif",
    fontSize: 42,
    fontWeight: 700,
    color: "#1A3A5C",
    lineHeight: 1,
  },
  heartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    fontSize: 14,
    lineHeight: 1,
    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
  },
  hintBox: {
    background: "white",
    borderRadius: 14,
    padding: "14px 18px",
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    marginBottom: 20,
  },
  hintText: { fontSize: 14, fontWeight: 600, color: "#5A6A7A", textAlign: "center", margin: 0, lineHeight: 1.5 },
  completionBanner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  completionCheck: { fontSize: 48 },
  actionBtn: {
    padding: "14px 40px",
    borderRadius: 20,
    border: "none",
    background: "linear-gradient(135deg, #2E86C1, #1B4F72)",
    fontSize: 17,
    fontWeight: 800,
    color: "white",
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
    WebkitTapHighlightColor: "transparent",
    boxShadow: "0 4px 14px rgba(46,134,193,0.35)",
  },
  doneScreen: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 32,
  },
  doneEmoji: { fontSize: 72 },
  doneMsg: { fontSize: 22, fontWeight: 800, color: "#1A3A5C", textAlign: "center" },
};
