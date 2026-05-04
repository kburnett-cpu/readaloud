import { useState, useEffect } from "react";
import AlphabetSounds from "./learn/AlphabetSounds.jsx";
import SyllableClap from "./learn/SyllableClap.jsx";
import RhymeMatch from "./learn/RhymeMatch.jsx";
import HeartWords from "./learn/HeartWords.jsx";

export default function LearnView({ activityId, lang, onBack }) {
  const [learnData, setLearnData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/learn.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setLearnData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!learnData) return null;

  const shared = { lang, onBack };
  switch (activityId) {
    case "sounds":   return <AlphabetSounds data={learnData.alphabetSounds} {...shared} />;
    case "syllable": return <SyllableClap   data={learnData.syllableClap}   {...shared} />;
    case "rhyme":    return <RhymeMatch     data={learnData.rhymeMatch}     {...shared} />;
    case "hearts":   return <HeartWords     data={learnData.heartWords}     {...shared} />;
    default:         return null;
  }
}

const styles = {
  loadingScreen: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F0F4F8",
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "4px solid #E2E8F0",
    borderTopColor: "#2E86C1",
    animation: "spin 0.8s linear infinite",
  },
};
