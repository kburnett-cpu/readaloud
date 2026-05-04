import { useState } from "react";
import speakWord from "../../utils/speakWord.js";

export default function AlphabetSounds({ data, onBack }) {
  const [active, setActive] = useState(null); // uppercase letter string

  function handleTap(letterData) {
    const { letter, audio, exampleWord } = letterData;
    setActive(letter);
    setTimeout(() => setActive((a) => (a === letter ? null : a)), 1600);

    const aud = new Audio(audio);
    const fallback = () => speakWord(exampleWord, { rate: 0.75 });
    aud.onerror = fallback;
    const p = aud.play();
    if (p) p.catch(fallback);
  }

  const activeLetter = active ? data.letters.find((l) => l.letter === active) : null;

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.headerTitle}>Alphabet Sounds</div>
        <div style={{ width: 70 }} />
      </header>

      <main style={styles.body}>
        <div style={styles.grid}>
          {data.letters.map((ld) => (
            <button
              key={ld.letter}
              style={{
                ...styles.tile,
                ...(ld.isVowel ? styles.vowelTile : styles.consonantTile),
                ...(active === ld.letter ? styles.activeTile : {}),
              }}
              onTouchStart={(e) => { e.preventDefault(); handleTap(ld); }}
              onClick={() => handleTap(ld)}
            >
              <span style={styles.tileLetterPair}>
                {ld.letter}{ld.letter.toLowerCase()}
              </span>
              <span style={styles.tilePhoneme}>{ld.phoneme}</span>
            </button>
          ))}
        </div>

        {activeLetter ? (
          <div style={styles.exampleBubble}>
            <span style={styles.exampleBold}>{activeLetter.exampleWord}</span>
            <span style={styles.exampleMeta}> — as in {activeLetter.letter.toUpperCase()}</span>
          </div>
        ) : (
          <div style={styles.examplePlaceholder} />
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
  body: {
    flex: 1,
    padding: "16px 12px 24px",
    maxWidth: 500,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 8,
  },
  tile: {
    borderRadius: 10,
    border: "2px solid transparent",
    padding: "8px 4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  vowelTile: {
    background: "#FFF3E0",
    borderColor: "#FFCC80",
  },
  consonantTile: {
    background: "#E3F2FD",
    borderColor: "#90CAF9",
  },
  activeTile: {
    transform: "scale(1.12)",
    boxShadow: "0 0 0 3px #FFE066, 0 4px 14px rgba(0,0,0,0.18)",
    zIndex: 2,
  },
  tileLetterPair: {
    fontFamily: "'Andika', 'Nunito', system-ui, sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: "#1A3A5C",
    lineHeight: 1.1,
  },
  tilePhoneme: {
    fontSize: 10,
    fontWeight: 600,
    color: "#5A6A7A",
    fontFamily: "'Nunito', system-ui, sans-serif",
  },
  exampleBubble: {
    marginTop: 20,
    background: "white",
    borderRadius: 16,
    padding: "14px 20px",
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.09)",
  },
  exampleBold: {
    fontFamily: "'Andika', 'Nunito', system-ui, sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: "#1A3A5C",
    textTransform: "capitalize",
  },
  exampleMeta: {
    fontSize: 14,
    fontWeight: 600,
    color: "#7F8C8D",
    fontFamily: "'Nunito', system-ui, sans-serif",
  },
  examplePlaceholder: {
    marginTop: 20,
    height: 56,
  },
};
