import { useState, useEffect, useRef } from "react";
import useWordAudio from "../hooks/useWordAudio.js";

const PASSWORD = "hope2026";
const AUTH_KEY = "readaloud_classroom_auth";

const LABELS = {
  en: {
    title: "Classrooms",
    back: "← Back",
    passwordPrompt: "Enter password",
    enter: "Enter",
    wrongPassword: "Incorrect password.",
    pickClassroom: "Pick your classroom",
    spelling: "Spelling",
    story: "Story",
    tapWord: "Tap a word to hear it",
    loading: "Loading…",
    error: "Could not load classrooms.",
    signOut: "Sign out",
  },
  es: {
    title: "Salones de Clase",
    back: "← Atrás",
    passwordPrompt: "Ingresa la contraseña",
    enter: "Entrar",
    wrongPassword: "Contraseña incorrecta.",
    pickClassroom: "Elige tu salón",
    spelling: "Ortografía",
    story: "Cuento",
    tapWord: "Toca una palabra para escucharla",
    loading: "Cargando…",
    error: "No se pudieron cargar los salones.",
    signOut: "Cerrar sesión",
  },
};

export default function Classroom({ lang, onBack, onSelectStory }) {
  const [authed, setAuthed] = useState(() => {
    try { return localStorage.getItem(AUTH_KEY) === "1"; } catch { return false; }
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeClassroomId, setActiveClassroomId] = useState(null);

  const t = LABELS[lang] || LABELS.en;

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    setError(false);
    fetch("/classroom.json")
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [authed]);

  if (!authed) {
    return <PasswordGate t={t} onBack={onBack} onSuccess={() => setAuthed(true)} />;
  }

  function handleSignOut() {
    try { localStorage.removeItem(AUTH_KEY); } catch {}
    setAuthed(false);
    setActiveClassroomId(null);
  }

  const activeClassroom =
    data?.classrooms?.find((c) => c.id === activeClassroomId) ?? null;

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.headerBtn} onClick={activeClassroom ? () => setActiveClassroomId(null) : onBack}>
          {t.back}
        </button>
        <div style={styles.headerTitle}>
          {activeClassroom ? activeClassroom.name : t.title}
        </div>
        <button style={styles.headerBtn} onClick={handleSignOut}>{t.signOut}</button>
      </header>

      <main style={styles.body}>
        {loading && <p style={styles.message}>{t.loading}</p>}
        {error && <p style={styles.message}>{t.error}</p>}

        {!loading && !error && data && !activeClassroom && (
          <ClassroomPicker
            t={t}
            classrooms={data.classrooms || []}
            onPick={setActiveClassroomId}
          />
        )}

        {!loading && !error && activeClassroom && (
          <ClassroomContent
            t={t}
            classroom={activeClassroom}
            onSelectStory={onSelectStory}
          />
        )}
      </main>
    </div>
  );
}

function PasswordGate({ t, onBack, onSuccess }) {
  const [value, setValue] = useState("");
  const [showError, setShowError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(e) {
    e.preventDefault();
    if (value.trim().toLowerCase() === PASSWORD) {
      try { localStorage.setItem(AUTH_KEY, "1"); } catch {}
      onSuccess();
    } else {
      setShowError(true);
      setValue("");
      inputRef.current?.focus();
    }
  }

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.headerBtn} onClick={onBack}>{t.back}</button>
        <div style={styles.headerTitle}>{t.title}</div>
        <div style={{ width: 60 }} />
      </header>

      <main style={{ ...styles.body, alignItems: "center", justifyContent: "center", display: "flex" }}>
        <form onSubmit={submit} style={styles.gateCard}>
          <div style={styles.gateLabel}>{t.passwordPrompt}</div>
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setShowError(false); }}
            style={styles.gateInput}
            autoComplete="off"
          />
          {showError && <div style={styles.gateError}>{t.wrongPassword}</div>}
          <button type="submit" style={styles.gateBtn}>{t.enter}</button>
        </form>
      </main>
    </div>
  );
}

function ClassroomPicker({ t, classrooms, onPick }) {
  return (
    <>
      <p style={styles.hint}>{t.pickClassroom}</p>
      <div style={styles.classroomList}>
        {classrooms.map((c) => (
          <button
            key={c.id}
            style={{ ...styles.classroomCard, borderLeftColor: c.color || "#2E86C1" }}
            onClick={() => onPick(c.id)}
          >
            <div style={styles.classroomCardName}>{c.name}</div>
            <div style={styles.classroomCardMeta}>
              {(c.weeks || []).length} {(c.weeks || []).length === 1 ? "week" : "weeks"}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function ClassroomContent({ t, classroom, onSelectStory }) {
  const weeks = classroom.weeks || [];
  return (
    <div style={styles.weeksWrap}>
      {weeks.map((week) => (
        <section key={week.id} style={styles.weekSection}>
          <div style={styles.weekLabel}>{week.label}</div>
          <div style={styles.itemsWrap}>
            {(week.items || []).map((item, idx) => (
              <ContentItem
                key={idx}
                t={t}
                item={item}
                accent={classroom.color}
                onSelectStory={onSelectStory}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ContentItem({ t, item, accent, onSelectStory }) {
  if (item.type === "story") {
    return (
      <button
        style={{ ...styles.itemCard, borderLeftColor: accent || "#2E86C1" }}
        onClick={() => onSelectStory(item.storyId)}
      >
        <div style={styles.itemKind}>{t.story}</div>
        <div style={styles.itemTitle}>{item.title}</div>
        <div style={styles.itemArrow}>▶</div>
      </button>
    );
  }

  if (item.type === "spelling") {
    return <SpellingList t={t} item={item} accent={accent} />;
  }

  return null;
}

function SpellingList({ t, item, accent }) {
  const speakWord = useWordAudio();
  const [activeIdx, setActiveIdx] = useState(null);

  function handleTap(idx, audio) {
    setActiveIdx(idx);
    speakWord(audio);
    setTimeout(() => setActiveIdx((cur) => (cur === idx ? null : cur)), 700);
  }

  return (
    <div style={{ ...styles.itemCard, borderLeftColor: accent || "#2E86C1", display: "block", textAlign: "left" }}>
      <div style={styles.itemKind}>{t.spelling}</div>
      <div style={{ ...styles.itemTitle, marginBottom: 8 }}>{item.title}</div>
      <div style={styles.spellingHint}>{t.tapWord}</div>
      <div style={styles.wordGrid}>
        {(item.words || []).map((w, idx) => (
          <button
            key={idx}
            style={{
              ...styles.wordChip,
              ...(activeIdx === idx ? styles.wordChipActive : {}),
            }}
            onClick={() => handleTap(idx, w.audio)}
          >
            {w.text}
          </button>
        ))}
      </div>
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
    gap: 8,
  },
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
    whiteSpace: "nowrap",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "white",
    flex: 1,
    textAlign: "center",
    letterSpacing: "-0.3px",
  },

  body: {
    flex: 1,
    padding: "16px 12px 24px",
    maxWidth: 500,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  hint: {
    fontSize: 13,
    fontWeight: 600,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 14,
  },
  message: {
    textAlign: "center",
    color: "#5A6A7A",
    fontSize: 15,
    marginTop: 24,
  },

  // Password gate
  gateCard: {
    background: "white",
    borderRadius: 16,
    padding: "24px 20px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: 320,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  gateLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#2C3E50",
    textAlign: "center",
  },
  gateInput: {
    padding: "12px 14px",
    fontSize: 18,
    border: "1.5px solid #CBD5E0",
    borderRadius: 10,
    fontFamily: "'Nunito', system-ui, sans-serif",
    outline: "none",
    textAlign: "center",
    letterSpacing: "0.3em",
  },
  gateError: {
    color: "#C0392B",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center",
  },
  gateBtn: {
    background: "#2E86C1",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "12px",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "'Nunito', system-ui, sans-serif",
  },

  // Classroom picker
  classroomList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  classroomCard: {
    background: "white",
    border: "none",
    borderLeft: "6px solid #2E86C1",
    borderRadius: 12,
    padding: "14px 16px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    fontFamily: "'Nunito', system-ui, sans-serif",
  },
  classroomCardName: {
    fontSize: 17,
    fontWeight: 800,
    color: "#2C3E50",
  },
  classroomCardMeta: {
    fontSize: 12,
    fontWeight: 600,
    color: "#7F8C8D",
    marginTop: 2,
  },

  // Weeks
  weeksWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  weekSection: {},
  weekLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#5A6A7A",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 8,
    paddingLeft: 4,
  },
  itemsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  itemCard: {
    background: "white",
    border: "none",
    borderLeft: "6px solid #2E86C1",
    borderRadius: 12,
    padding: "12px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    fontFamily: "'Nunito', system-ui, sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    width: "100%",
    gap: 12,
  },
  itemKind: {
    fontSize: 10,
    fontWeight: 800,
    color: "#7F8C8D",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#2C3E50",
    flex: 1,
  },
  itemArrow: {
    fontSize: 14,
    color: "#2E86C1",
  },

  // Spelling
  spellingHint: {
    fontSize: 12,
    color: "#7F8C8D",
    marginBottom: 10,
  },
  wordGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  wordChip: {
    background: "#F0F4F8",
    border: "1.5px solid #CBD5E0",
    borderRadius: 18,
    padding: "8px 14px",
    fontSize: 18,
    fontWeight: 700,
    color: "#2C3E50",
    cursor: "pointer",
    fontFamily: "'Andika', 'Nunito', system-ui, sans-serif",
    transition: "all 0.15s ease",
  },
  wordChipActive: {
    background: "#2E86C1",
    color: "white",
    borderColor: "#2E86C1",
    transform: "scale(1.06)",
  },
};
