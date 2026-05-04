import { useState } from "react";
import speakWord from "../../utils/speakWord.js";

export default function RhymeMatch({ data, onBack }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState([]);
  const [phase, setPhase] = useState("picking"); // "picking" | "success" | "wrong" | "done"
  const rounds = data.rounds;

  function handleCardTap(idx) {
    if (phase !== "picking") return;
    const round = rounds[roundIndex];
    speakWord(round.cards[idx].word, { rate: 0.8 });

    if (selected.length === 0) {
      setSelected([idx]);
      return;
    }
    if (selected[0] === idx) {
      setSelected([]);
      return;
    }

    const pair = [selected[0], idx].sort((a, b) => a - b);
    const correct = JSON.stringify(pair) === JSON.stringify([...round.rhymePair].sort());
    setSelected(pair);

    if (correct) {
      setPhase("success");
      setTimeout(() => {
        if (roundIndex + 1 >= rounds.length) {
          setPhase("done");
        } else {
          setRoundIndex((r) => r + 1);
          setSelected([]);
          setPhase("picking");
        }
      }, 1400);
    } else {
      setPhase("wrong");
      setTimeout(() => {
        setSelected([]);
        setPhase("picking");
      }, 1000);
    }
  }

  if (phase === "done") {
    return (
      <div style={styles.screen}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← Back</button>
          <div style={styles.headerTitle}>Rhyme Match</div>
          <div style={{ width: 70 }} />
        </header>
        <main style={styles.doneScreen}>
          <div style={styles.doneEmoji}>🌟</div>
          <div style={styles.doneMsg}>All done! Great work!</div>
          <button
            style={styles.restartBtn}
            onClick={() => { setRoundIndex(0); setSelected([]); setPhase("picking"); }}
          >
            Play Again
          </button>
        </main>
      </div>
    );
  }

  const round = rounds[roundIndex];

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.headerTitle}>Rhyme Match</div>
        <div style={styles.progress}>{roundIndex + 1} / {rounds.length}</div>
      </header>

      <main style={styles.body}>
        <p style={styles.instruction}>Tap the two words that rhyme!</p>

        <div style={styles.cardsRow}>
          {round.cards.map((card, i) => {
            const isSelected = selected.includes(i);
            let cardStyle = { ...styles.card };
            if (phase === "success" && isSelected) {
              cardStyle = { ...cardStyle, ...styles.cardSuccess };
            } else if (phase === "wrong" && isSelected) {
              cardStyle = { ...cardStyle, ...styles.cardWrong };
            } else if (isSelected) {
              cardStyle = { ...cardStyle, ...styles.cardSelected };
            }
            return (
              <button
                key={i}
                style={cardStyle}
                onTouchStart={(e) => { e.preventDefault(); handleCardTap(i); }}
                onClick={() => handleCardTap(i)}
              >
                <span style={styles.cardEmoji}>{card.emoji}</span>
                <span style={styles.cardWord}>{card.word}</span>
              </button>
            );
          })}
        </div>

        {phase === "success" && (
          <div style={{ ...styles.feedbackBanner, ...styles.bannerSuccess }}>They rhyme! 🎉</div>
        )}
        {phase === "wrong" && (
          <div style={{ ...styles.feedbackBanner, ...styles.bannerWrong }}>Those don't rhyme — try again!</div>
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
  instruction: {
    fontSize: 15,
    fontWeight: 700,
    color: "#5A6A7A",
    textAlign: "center",
    marginBottom: 28,
  },
  cardsRow: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    flex: "1 1 0",
    maxWidth: 150,
    aspectRatio: "1 / 1",
    borderRadius: 18,
    border: "2.5px solid #CBD5E0",
    background: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  cardSelected: {
    borderColor: "#2E86C1",
    transform: "scale(1.05)",
    boxShadow: "0 0 0 3px rgba(46,134,193,0.25), 0 4px 14px rgba(0,0,0,0.12)",
  },
  cardSuccess: {
    borderColor: "#27AE60",
    background: "#F0FFF4",
    transform: "scale(1.06)",
    boxShadow: "0 0 0 3px rgba(39,174,96,0.3), 0 4px 14px rgba(0,0,0,0.12)",
  },
  cardWrong: {
    borderColor: "#E53E3E",
    background: "#FFF5F5",
    transform: "scale(0.96)",
  },
  cardEmoji: { fontSize: 44, lineHeight: 1, userSelect: "none" },
  cardWord: {
    fontFamily: "'Andika', 'Nunito', system-ui, sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: "#1A3A5C",
    textAlign: "center",
  },
  feedbackBanner: {
    marginTop: 24,
    borderRadius: 14,
    padding: "12px 20px",
    fontSize: 16,
    fontWeight: 800,
    textAlign: "center",
    width: "100%",
    boxSizing: "border-box",
  },
  bannerSuccess: { background: "#F0FFF4", color: "#276749", border: "2px solid #9AE6B4" },
  bannerWrong:   { background: "#FFF5F5", color: "#C53030", border: "2px solid #FEB2B2" },
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
  restartBtn: {
    padding: "14px 36px",
    borderRadius: 20,
    border: "none",
    background: "linear-gradient(135deg, #2E86C1, #1B4F72)",
    fontSize: 17,
    fontWeight: 800,
    color: "white",
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
    WebkitTapHighlightColor: "transparent",
  },
};
