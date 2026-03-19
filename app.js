/* ═══════════════════════════════════════════════
   IMPOSTER — app.js
   Requires: React 18, ReactDOM 18, Babel standalone
   (loaded via Index.HTML)
═══════════════════════════════════════════════ */

const { useState, useRef, useEffect } = React;

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const COLORS = [
  "#FF2D55", "#FF9F0A", "#30D158", "#0A84FF",
  "#BF5AF2", "#FF6B35", "#FFD60A", "#00C7BE",
  "#FF375F", "#5E5CE6",
];

const MODES = [
  {
    id: "clueless",
    emoji: "🤷",
    name: "Clueless",
    color: "#0A84FF",
    tagline: "Nobody knows — not even the imposter",
  },
  {
    id: "undercover",
    emoji: "🕵️",
    name: "Undercover",
    color: "#FF9F0A",
    tagline: "The imposter knows — can they fool everyone?",
  },
  {
    id: "doublecross",
    emoji: "🎭",
    name: "Double Cross",
    color: "#FF2D55",
    tagline: "Two imposters, neither knows the other · 3+ players",
    min: 3,
  },
];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/* ─────────────────────────────────────────
   CONFETTI
───────────────────────────────────────── */
function Confetti({ active }) {
  const ref = useRef();
  const raf = useRef();

  useEffect(() => {
    if (!active) return;
    const c = ref.current;
    const ctx = c.getContext("2d");
    c.width  = window.innerWidth;
    c.height = window.innerHeight;

    let ps = Array.from({ length: 220 }, () => ({
      x:   Math.random() * c.width,
      y:   -14,
      r:   Math.random() * 9 + 3,
      col: COLORS[Math.random() * COLORS.length | 0],
      sp:  Math.random() * 5 + 2,
      spin: Math.random() * 0.18 - 0.09,
      ang: Math.random() * Math.PI * 2,
      wb:  Math.random() * 14,
      wa:  Math.random() * Math.PI * 2,
      ws:  Math.random() * 0.07 + 0.02,
    }));

    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => {
        p.y  += p.sp;
        p.ang += p.spin;
        p.wa  += p.ws;
        ctx.save();
        ctx.translate(p.x + Math.sin(p.wa) * p.wb, p.y);
        ctx.rotate(p.ang);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.8);
        ctx.restore();
      });
      ps = ps.filter(p => p.y < c.height + 20);
      if (ps.length) raf.current = requestAnimationFrame(draw);
    }

    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}
    />
  );
}

/* ─────────────────────────────────────────
   ANIMATED BACKGROUND BLOBS
───────────────────────────────────────── */
function BlobBG({ accent = "#FF2D55" }) {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{
        position: "absolute", top: "-20%", left: "-10%",
        width: "70vw", height: "70vw", borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
        animation: "drift1 13s ease-in-out infinite",
        transition: "background 1.2s",
      }} />
      <div style={{
        position: "absolute", bottom: "-15%", right: "-10%",
        width: "65vw", height: "65vw", borderRadius: "50%",
        background: "radial-gradient(circle, #0A84FF1e 0%, transparent 70%)",
        animation: "drift2 16s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", top: "40%", right: "5%",
        width: "40vw", height: "40vw", borderRadius: "50%",
        background: "radial-gradient(circle, #BF5AF218 0%, transparent 70%)",
        animation: "drift3 11s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", inset: 0, opacity: 0.022,
        backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
        backgroundSize: "38px 38px",
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────── */
function PBar({ total, current, accent }) {
  return (
    <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 5, flex: 1, maxWidth: 30, borderRadius: 99,
          background: i < current ? "#ffffff65" : i === current ? accent : "#ffffff18",
          boxShadow: i === current ? `0 0 10px ${accent}, 0 0 20px ${accent}55` : "none",
          transition: "all 0.4s",
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   SCORE ROW
───────────────────────────────────────── */
function ScoreRow({ name, score, roundPts, rank, color, delay = 0 }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 16px",
      background: rank === 1 ? `linear-gradient(135deg, ${color}28, ${color}10)` : "#ffffff0a",
      border: `1.5px solid ${rank === 1 ? color + "70" : "#ffffff18"}`,
      borderRadius: 15,
      boxShadow: rank === 1 ? `0 0 26px ${color}35` : "none",
      animation: "stagger 0.4s ease both",
      animationDelay: `${delay}ms`,
    }}>
      <span style={{ fontSize: 22, width: 30, textAlign: "center", flexShrink: 0 }}>
        {rank <= 3 ? medals[rank - 1] : rank}
      </span>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: color + "28", border: `2px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 900, color,
        boxShadow: `0 0 12px ${color}55`,
      }}>
        {name[0]?.toUpperCase()}
      </div>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: rank === 1 ? "#fff" : "#ffffffcc" }}>
        {name}
      </span>
      {roundPts > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 900, color: "#30D158",
          background: "#30D15820", border: "1px solid #30D15850",
          borderRadius: 8, padding: "3px 9px",
          animation: "popIn 0.3s ease both",
          animationDelay: `${delay + 180}ms`,
        }}>
          +{roundPts}
        </span>
      )}
      <span style={{ fontSize: 24, fontWeight: 900, color: rank === 1 ? color : "#ffffffaa" }}>
        {score}
      </span>
      <span style={{ fontSize: 10, color: "#ffffff40", marginLeft: 2 }}>pts</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   LOCK / HANDOFF SCREEN
───────────────────────────────────────── */
function LockScreen({ name, color, sub, btnLabel, onReady }) {
  return (
    <div style={{ maxWidth: 440, width: "100%", textAlign: "center", animation: "fadeUp 0.32s ease both" }}>
      <div style={{
        width: 88, height: 88, borderRadius: "50%", margin: "0 auto 18px",
        background: `linear-gradient(135deg, ${color}40, ${color}15)`,
        border: `3px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 42,
        boxShadow: `0 0 50px ${color}65, 0 0 90px ${color}22`,
        animation: "lockBounce 1.6s ease-in-out infinite",
      }}>
        🔒
      </div>
      <p style={{
        color: "#ffffff50", fontSize: 10, letterSpacing: 4,
        textTransform: "uppercase", fontWeight: 800, marginBottom: 8,
      }}>
        {sub || "Pass the phone to"}
      </p>
      <h2 style={{
        fontSize: 48, fontWeight: 900, letterSpacing: "-2px", marginBottom: 5,
        color, textShadow: `0 0 40px ${color}, 0 0 80px ${color}55`,
      }}>
        {name}
      </h2>
      <p style={{ color: "#ffffff35", fontSize: 13, marginBottom: 30 }}>
        Make sure nobody else is looking 👀
      </p>
      <button onClick={onReady} style={{
        display: "block", width: "100%", padding: "16px", borderRadius: 16, border: "none",
        background: `linear-gradient(135deg, ${color}, ${color}bb)`,
        color: "#fff", fontSize: 16, fontWeight: 900, letterSpacing: 0.5,
        boxShadow: `0 6px 30px ${color}65`,
      }}>
        {btnLabel}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN APP
───────────────────────────────────────── */
function App() {

  /* ── Questions (loaded from question.JSON) ── */
  const [qs,       setQs]       = useState([]);
  const [qLoading, setQLoading] = useState(true);
  const [qError,   setQError]   = useState(false);

  useEffect(() => {
    fetch("question.JSON")
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(d => { setQs(d); setQLoading(false); })
      .catch(() => { setQError(true); setQLoading(false); });
  }, []);

  /* ── Game settings ── */
  const [phase,       setPhase]       = useState("setup");
  const [mode,        setMode]        = useState("clueless");
  const [totalRounds, setTotalRounds] = useState(3);
  const [playerNames, setPlayerNames] = useState(["", ""]);

  /* ── Per-game persistent ── */
  const [round,   setRound]   = useState(1);
  const [scores,  setScores]  = useState({});
  const [usedIdx, setUsedIdx] = useState([]);

  /* ── Per-round: question phase ── */
  const [qOrder,   setQOrder]   = useState([]);   // shuffled valid[] indices
  const [curAns,   setCurAns]   = useState(0);    // position in qOrder
  const [qPair,    setQPair]    = useState(null); // { a: mainQ, b: imposterQ }
  const [impIdxs,  setImpIdxs]  = useState([]);   // indices into valid[]
  const [shown,    setShown]    = useState(false);
  const [answers,  setAnswers]  = useState({});
  const [writing,  setWriting]  = useState("");

  /* ── Per-round: vote phase ── */
  const [voteOrder,  setVoteOrder]  = useState([]);  // player names, shuffled
  const [curVoter,   setCurVoter]   = useState(0);
  const [voteReady,  setVoteReady]  = useState(false);
  const [votes,      setVotes]      = useState({});

  /* ── Reveal ── */
  const [roundPts, setRoundPts] = useState({});
  const [confetti, setConfetti] = useState(false);

  /* ── Derived values ── */
  const valid    = playerNames.filter(n => n.trim());
  const pc       = valid.length;
  const mInfo    = MODES.find(m => m.id === mode) || MODES[0];
  const impNames = impIdxs.map(i => valid[i]).filter(Boolean);

  const curAnsPlayerIdx = qOrder[curAns];
  const curAnsName      = valid[curAnsPlayerIdx];
  const curIsImp        = impIdxs.includes(curAnsPlayerIdx);
  const curQ            = qPair ? (curIsImp ? qPair.b : qPair.a) : "";
  const ansAccent       = COLORS[curAns % COLORS.length];

  const voterName      = voteOrder[curVoter];
  const voteAccent     = COLORS[valid.indexOf(voterName) % COLORS.length];
  const curVoterPicks  = votes[voterName] || (mode === "doublecross" ? [] : null);

  /* ── Inline style atoms (dynamic, so kept in JS) ── */
  const lbl = {
    color: "#ffffff75", fontSize: 10, letterSpacing: 3,
    textTransform: "uppercase", display: "block",
    marginBottom: 8, fontWeight: 800,
  };
  const inp = {
    width: "100%", background: "#ffffff0e",
    border: "1.5px solid #ffffff22", borderRadius: 12,
    padding: "13px 15px", color: "#fff", fontSize: 15,
    outline: "none", fontFamily: "inherit",
  };
  const card = { width: "100%", maxWidth: 460 };
  const hr   = {
    height: 1,
    background: "linear-gradient(90deg, transparent, #ffffff28, transparent)",
    margin: "18px 0",
  };

  /* ── Reusable styled button ── */
  function PBtn({ col, ghost, sm, dis, onClick, children }) {
    return (
      <button onClick={onClick} disabled={dis} style={{
        display: "block", width: "100%",
        padding: sm ? "12px 16px" : "15px 20px",
        borderRadius: 15,
        border: ghost ? `2px solid ${col}40` : "none",
        background: ghost ? "transparent"
          : col === "grad" ? "linear-gradient(135deg, #FF2D55, #FF9F0A, #FFD60A)"
          : `linear-gradient(135deg, ${col}, ${col}cc)`,
        color: "#fff", fontSize: sm ? 13 : 15, fontWeight: 900, letterSpacing: 0.4,
        textShadow: ghost ? "none" : "0 1px 5px rgba(0,0,0,.5)",
        boxShadow: dis ? "none" : ghost ? "none"
          : `0 4px 26px ${col === "grad" ? "#FF2D5560" : col + "55"}`,
        opacity: dis ? 0.24 : 1,
        cursor: dis ? "not-allowed" : "pointer",
      }}>
        {children}
      </button>
    );
  }

  /* ─────────────────────────────────────────
     GAME FLOW
  ───────────────────────────────────────── */
  function beginGame() {
    const s = {};
    valid.forEach(n => { s[n] = 0; });
    setScores(s);
    setUsedIdx([]);
    setRound(1);
    doRound(1, s, []);
  }

  function doRound(r, sc, used) {
    if (!qs.length) return;

    // Pick an unused question
    const avail = qs.map((_, i) => i).filter(i => !used.includes(i));
    const pool  = avail.length ? avail : qs.map((_, i) => i);
    const pick  = pool[Math.random() * pool.length | 0];
    const newUsed = [...used, pick].slice(-qs.length);
    setUsedIdx(newUsed);

    // Randomly swap which side is "main" vs "imposter"
    const raw = qs[pick];
    const sw  = Math.random() < 0.5;
    setQPair(sw ? { a: raw.b, b: raw.a } : { a: raw.a, b: raw.b });

    // Shuffle player answering order
    const order = shuffle(valid.map((_, i) => i));

    // Pick imposter(s) depending on mode
    let imps;
    if (mode === "doublecross" && pc >= 3) {
      const i1 = Math.random() * pc | 0;
      let   i2 = Math.random() * (pc - 1) | 0;
      if (i2 >= i1) i2++;
      imps = [i1, i2];
    } else {
      imps = [Math.random() * pc | 0];
    }

    setImpIdxs(imps);
    setQOrder(order);
    setCurAns(0);
    setShown(false);
    setAnswers({});
    setWriting("");
    setVoteOrder(shuffle([...valid]));
    setCurVoter(0);
    setVoteReady(false);
    setVotes({});
    setRoundPts({});
    setConfetti(false);
    setPhase("q_handoff");
  }

  function submitAnswer() {
    const name = valid[qOrder[curAns]];
    setAnswers(a => ({ ...a, [name]: writing.trim() || "…" }));
    setWriting("");
    setShown(false);
    if (curAns + 1 >= pc) {
      setPhase("vote_handoff");
    } else {
      setCurAns(i => i + 1);
      setPhase("q_handoff");
    }
  }

  function castVote(suspect) {
    if (mode === "doublecross") {
      setVotes(v => {
        const cur = v[voterName] || [];
        let next;
        if (cur.includes(suspect))      next = cur.filter(x => x !== suspect);
        else if (cur.length < 2)        next = [...cur, suspect];
        else                            next = [cur[1], suspect];
        return { ...v, [voterName]: next };
      });
    } else {
      setVotes(v => ({ ...v, [voterName]: suspect }));
    }
  }

  function confirmVote() {
    if (curVoter + 1 >= pc) {
      doReveal();
    } else {
      setCurVoter(i => i + 1);
      setVoteReady(false);
      setPhase("vote_handoff");
    }
  }

  function doReveal() {
    const earned = {};
    valid.forEach(n => { earned[n] = 0; });

    if (mode === "doublecross") {
      // +1 per correctly identified imposter
      valid.forEach(voter => {
        (votes[voter] || []).forEach(p => {
          if (impNames.includes(p)) earned[voter]++;
        });
      });
      // +2 to each imposter who escaped the top-2 vote
      const t = {};
      valid.forEach(n => { t[n] = 0; });
      Object.values(votes).forEach(arr => {
        (arr || []).forEach(v => { t[v] = (t[v] || 0) + 1; });
      });
      const top2 = Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
      impNames.forEach(imp => {
        if (!top2.includes(imp)) earned[imp] = (earned[imp] || 0) + 2;
      });
    } else {
      // +1 per player who correctly voted for the imposter
      const imp = impNames[0];
      valid.forEach(v => { if (votes[v] === imp) earned[v]++; });
      // +2 to imposter if they escaped
      const t = {};
      valid.forEach(n => { t[n] = 0; });
      Object.values(votes).forEach(v => { if (v) t[v] = (t[v] || 0) + 1; });
      const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (imp && top !== imp) earned[imp] = (earned[imp] || 0) + 2;
    }

    setRoundPts(earned);
    const newScores = {};
    valid.forEach(n => { newScores[n] = (scores[n] || 0) + (earned[n] || 0); });
    setScores(newScores);
    if (groupWonFn(votes)) setTimeout(() => setConfetti(true), 900);
    setPhase("reveal");
  }

  function groupWonFn(v) {
    if (mode === "doublecross") {
      const t = {};
      valid.forEach(n => { t[n] = 0; });
      Object.values(v).forEach(arr => {
        (arr || []).forEach(x => { t[x] = (t[x] || 0) + 1; });
      });
      const top2 = Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
      return impNames.some(n => top2.includes(n));
    } else {
      const t = {};
      valid.forEach(n => { t[n] = 0; });
      Object.values(v).forEach(x => { if (x) t[x] = (t[x] || 0) + 1; });
      return impNames.includes(Object.entries(t).sort((a, b) => b[1] - a[1])[0]?.[0]);
    }
  }

  const groupWon = groupWonFn(votes);

  function nextRound() {
    setConfetti(false);
    if (round >= totalRounds) { setPhase("final"); return; }
    const nr = round + 1;
    setRound(nr);
    doRound(nr, scores, usedIdx);
  }

  const canStart = valid.length >= 2 && (mode !== "doublecross" || valid.length >= 3) && qs.length > 0;

  const accentColor = ["q_handoff", "question"].includes(phase)     ? ansAccent
                    : ["vote_handoff", "vote_cast"].includes(phase)  ? voteAccent
                    : mInfo.color;

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div style={{
      minHeight: "100vh", background: "#0c0c1b",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 18px", position: "relative", overflow: "hidden",
    }}>
      <BlobBG accent={accentColor} />
      <Confetti active={confetti} />

      {/* ── LOADING ── */}
      {qLoading && (
        <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease" }}>
          <div style={{ fontSize: 48, display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</div>
          <p style={{ color: "#ffffff70", marginTop: 12 }}>Loading questions…</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {!qLoading && qError && (
        <div style={{ maxWidth: 420, width: "100%", animation: "fadeUp 0.4s ease" }}>
          <div style={{
            textAlign: "center", background: "#FF2D5514",
            border: "2px solid #FF2D5560", borderRadius: 20, padding: "28px 24px",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#FF2D55", marginBottom: 10 }}>
              question.JSON not found
            </h2>
            <p style={{ color: "#ffffffaa", fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>
              Make sure <code style={{ background: "#ffffff18", padding: "2px 8px", borderRadius: 6, color: "#FFD60A" }}>question.JSON</code> is
              in the same folder as <code style={{ background: "#ffffff18", padding: "2px 8px", borderRadius: 6, color: "#FFD60A" }}>Index.HTML</code>,
              then serve it via GitHub Pages or a local server.
            </p>
            <div style={{ background: "#ffffff0a", border: "1px solid #ffffff18", borderRadius: 14, padding: "16px", textAlign: "left" }}>
              <p style={{ color: "#FFD60A", fontWeight: 800, marginBottom: 8, fontSize: 13 }}>question.JSON format:</p>
              <pre style={{ color: "#ffffffcc", fontSize: 12, lineHeight: 1.7, overflowX: "auto" }}>{`[
  {
    "a": "Question for most players",
    "b": "Question for the imposter"
  }
]`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ════ SETUP ════ */}
      {!qLoading && !qError && phase === "setup" && (
        <div style={{ ...card, animation: "fadeUp 0.35s ease both" }}>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              fontSize: 64, display: "inline-block", marginBottom: 4,
              filter: "drop-shadow(0 0 28px #FF2D5599) drop-shadow(0 0 70px #FF9F0A44)",
              animation: "bounce 2.5s ease-in-out infinite",
            }}>🕵️</div>
            <h1 style={{
              fontSize: 58, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1,
              background: "linear-gradient(135deg, #FF2D55 0%, #FF9F0A 55%, #FFD60A 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              animation: "shimmer 4s linear infinite",
            }}>IMPOSTER</h1>
            <p style={{ color: "#ffffff38", fontSize: 10, letterSpacing: 6, textTransform: "uppercase", marginTop: 6, fontWeight: 800 }}>
              Party Game · 2–10 Players
            </p>
          </div>

          {/* Mode picker */}
          <p style={lbl}>Game Mode</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {MODES.map(m => {
              const sel = mode === m.id;
              return (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 16,
                  border: `2px solid ${sel ? m.color : m.color + "22"}`,
                  background: sel ? `linear-gradient(135deg, ${m.color}22, ${m.color}08)` : "#ffffff07",
                  boxShadow: sel ? `0 0 28px ${m.color}38, inset 0 0 20px ${m.color}08` : "none",
                  transition: "all 0.22s", textAlign: "left", width: "100%", fontFamily: "inherit",
                }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: sel ? m.color : "#fff" }}>{m.name}</span>
                      {m.min && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: m.color,
                          background: m.color + "20", border: `1px solid ${m.color}50`,
                          borderRadius: 6, padding: "2px 7px", textTransform: "uppercase",
                        }}>3+ players</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "#ffffff50", lineHeight: 1.4 }}>{m.tagline}</span>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: sel ? m.color : "#ffffff12",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 900, color: "#fff",
                    boxShadow: sel ? `0 0 14px ${m.color}` : "none",
                    transition: "all 0.2s",
                  }}>{sel ? "✓" : ""}</div>
                </button>
              );
            })}
          </div>

          {/* Rounds */}
          <p style={lbl}>Rounds</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[3, 5, 7, 10].map(n => {
              const sel = totalRounds === n;
              return (
                <button key={n} onClick={() => setTotalRounds(n)} style={{
                  flex: 1, padding: "13px 4px", borderRadius: 12, fontWeight: 900, fontSize: 16,
                  border: `2px solid ${sel ? "#BF5AF2" : "#ffffff18"}`,
                  background: sel ? "linear-gradient(135deg, #BF5AF230, #BF5AF210)" : "#ffffff08",
                  color: sel ? "#BF5AF2" : "#ffffff55",
                  boxShadow: sel ? "0 0 20px #BF5AF248" : "none",
                  transition: "all 0.2s", fontFamily: "inherit",
                }}>{n}</button>
              );
            })}
          </div>

          {/* Players */}
          <p style={lbl}>Players</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
            {playerNames.map((name, i) => {
              const col = COLORS[i % COLORS.length];
              return (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: col + "25", border: `2px solid ${col}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 900, color: col,
                    boxShadow: `0 0 12px ${col}45`,
                  }}>{i + 1}</div>
                  <input
                    value={name}
                    onChange={e => { const n = [...playerNames]; n[i] = e.target.value; setPlayerNames(n); }}
                    placeholder={`Player ${i + 1}`}
                    style={inp}
                    onFocus={e => { e.target.style.borderColor = col; e.target.style.background = col + "18"; }}
                    onBlur={e  => { e.target.style.borderColor = "#ffffff22"; e.target.style.background = "#ffffff0e"; }}
                  />
                  {playerNames.length > 2 && (
                    <button
                      onClick={() => setPlayerNames(p => p.filter((_, j) => j !== i))}
                      style={{ background: "none", border: "none", color: "#ffffff40", fontSize: 24, padding: "0 4px", lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 9, marginBottom: 12 }}>
            {playerNames.length < 10 && (
              <button
                onClick={() => setPlayerNames(p => [...p, ""])}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  border: "2px solid #ffffff22", background: "transparent",
                  color: "#ffffff65", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                }}
              >+ Add Player</button>
            )}
            <PBtn col="grad" dis={!canStart} onClick={beginGame}>START GAME →</PBtn>
          </div>

          {mode === "doublecross" && valid.length < 3 && (
            <p style={{ color: "#FF2D55bb", fontSize: 12, textAlign: "center", fontWeight: 700, animation: "pulse 1.5s infinite" }}>
              ⚠️ Double Cross needs at least 3 players
            </p>
          )}
        </div>
      )}

      {/* ════ QUESTION HANDOFF ════ */}
      {phase === "q_handoff" && (
        <LockScreen
          name={curAnsName} color={ansAccent}
          sub={`Round ${round} of ${totalRounds} · Question Phase`}
          btnLabel="Show My Question →"
          onReady={() => setPhase("question")}
        />
      )}

      {/* ════ QUESTION ════ */}
      {phase === "question" && (
        <div style={{ ...card, textAlign: "center", animation: "slideR 0.3s ease both" }}>

          {/* Mode + round pill */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <div style={{
              background: `linear-gradient(135deg, ${mInfo.color}28, ${mInfo.color}10)`,
              border: `1.5px solid ${mInfo.color}55`, borderRadius: 20,
              padding: "5px 14px", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 12 }}>{mInfo.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: mInfo.color, letterSpacing: 2, textTransform: "uppercase" }}>
                {mInfo.name} · Round {round}/{totalRounds}
              </span>
            </div>
          </div>

          <PBar total={pc} current={curAns} accent={ansAccent} />

          <p style={{ ...lbl, textAlign: "center" }}>Answering</p>
          <h2 style={{
            fontSize: 44, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-1.5px",
            color: ansAccent, textShadow: `0 0 40px ${ansAccent}, 0 0 80px ${ansAccent}50`,
          }}>{curAnsName}</h2>
          <p style={{ color: "#ffffff40", fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
            {curAns + 1} of {pc}
          </p>

          {/* Imposter banner (Undercover / Double Cross only) */}
          {curIsImp && mode !== "clueless" && (
            <div style={{
              background: "linear-gradient(135deg, #FF2D5522, #FF2D550a)",
              border: "2px solid #FF2D55", borderRadius: 16,
              padding: "13px 16px", marginBottom: 14,
              boxShadow: "0 0 38px #FF2D5548",
              animation: "popIn 0.35s ease both",
            }}>
              <p style={{ fontSize: 17, fontWeight: 900, margin: "0 0 4px", color: "#FF2D55" }}>
                🎭 You are the imposter!
              </p>
              <p style={{ fontSize: 12, color: "#ffffff70", margin: 0, lineHeight: 1.5 }}>
                {mode === "doublecross"
                  ? "There's one other imposter out there — but you don't know who. Blend in!"
                  : "Blend in with your answer. Don't get caught!"}
              </p>
            </div>
          )}

          {/* Question card */}
          <div style={{
            background: `linear-gradient(135deg, ${ansAccent}20, ${ansAccent}08)`,
            border: `2px solid ${ansAccent}`, borderRadius: 20,
            padding: "22px 18px", marginBottom: 16,
            boxShadow: `0 0 40px ${ansAccent}35, inset 0 0 30px ${ansAccent}08`,
          }}>
            <p style={{ ...lbl, textAlign: "center", color: ansAccent + "bb", marginBottom: 10 }}>
              Your question
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, color: "#fff", margin: 0 }}>
              {curQ}
            </p>
          </div>

          <div style={{ textAlign: "left", marginBottom: 14 }}>
            <label style={lbl}>Your answer</label>
            <textarea
              value={writing}
              onChange={e => setWriting(e.target.value)}
              placeholder="Type your answer…"
              rows={3}
              style={{
                ...inp,
                border: `2px solid ${ansAccent}60`,
                lineHeight: 1.6,
                boxShadow: `0 0 18px ${ansAccent}22`,
              }}
            />
          </div>

          <PBtn col={ansAccent} onClick={submitAnswer}>
            {curAns + 1 < pc ? "Done — pass the phone →" : "All answered — start voting!"}
          </PBtn>
        </div>
      )}

      {/* ════ VOTE HANDOFF ════ */}
      {phase === "vote_handoff" && (
        <LockScreen
          name={voterName} color={voteAccent}
          sub={`Voting · ${curVoter + 1} of ${pc}`}
          btnLabel="Show Answers & Vote →"
          onReady={() => setPhase("vote_cast")}
        />
      )}

      {/* ════ VOTE CAST ════ */}
      {phase === "vote_cast" && (
        <div style={{ ...card, animation: "slideR 0.3s ease both" }}>

          {/* Voter badge */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <div style={{
                background: `linear-gradient(135deg, ${voteAccent}30, ${voteAccent}10)`,
                border: `2px solid ${voteAccent}`, borderRadius: 20,
                padding: "7px 16px", display: "flex", alignItems: "center", gap: 8,
                boxShadow: `0 0 22px ${voteAccent}38`,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: voteAccent + "30", border: `2px solid ${voteAccent}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 900, color: voteAccent,
                }}>{voterName?.[0]?.toUpperCase()}</div>
                <span style={{ fontSize: 14, fontWeight: 800, color: voteAccent }}>{voterName}'s vote</span>
                <span style={{ fontSize: 10, color: voteAccent + "80", letterSpacing: 1 }}>
                  ({curVoter + 1}/{pc})
                </span>
              </div>
            </div>
            <p style={{ color: "#ffffff55", fontSize: 13, fontWeight: 600 }}>
              {mode === "doublecross"
                ? "Tap to pick your 2 suspects — both could be imposters!"
                : "Tap who you think has the different question"}
            </p>
          </div>

          {/* Answer list */}
          <p style={lbl}>Everyone's Answers</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {valid.map((name, i) => {
              const col    = COLORS[i % COLORS.length];
              const picks  = mode === "doublecross" ? (curVoterPicks || []) : (curVoterPicks ? [curVoterPicks] : []);
              const picked = picks.includes(name);
              const isSelf = name === voterName;
              return (
                <div
                  key={name}
                  onClick={() => { if (!isSelf) castVote(name); }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "13px 15px", borderRadius: 16,
                    cursor: isSelf ? "default" : "pointer",
                    background: picked
                      ? `linear-gradient(135deg, ${col}28, ${col}10)`
                      : "linear-gradient(135deg, #ffffff0e, #ffffff05)",
                    border: `2px solid ${picked ? col : isSelf ? "#ffffff0d" : "#ffffff18"}`,
                    boxShadow: picked ? `0 0 24px ${col}55` : "none",
                    transition: "all 0.18s",
                    opacity: isSelf ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: col + "28", border: `2px solid ${col}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 900, color: col,
                    boxShadow: picked ? `0 0 16px ${col}70` : `0 0 8px ${col}30`,
                  }}>{name[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: picked ? col : col + "cc" }}>
                      {name}{isSelf ? " (you)" : ""}
                    </p>
                    <p style={{
                      margin: "3px 0 0", fontSize: 14,
                      color: isSelf ? "#ffffff40" : "#ffffffd0",
                      fontStyle: isSelf ? "italic" : "normal",
                    }}>
                      {answers[name] || "…"}
                    </p>
                  </div>
                  {!isSelf && (
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0, alignSelf: "center",
                      background: picked ? col : "#ffffff12",
                      border: `2px solid ${picked ? col : "#ffffff22"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 900,
                      boxShadow: picked ? `0 0 14px ${col}` : "none",
                      transition: "all 0.18s",
                    }}>{picked ? "✓" : ""}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Double Cross reminder */}
          {mode === "doublecross" && (curVoterPicks || []).length < 2 && (
            <div style={{
              background: "#FF9F0A18", border: "1px solid #FF9F0A45",
              borderRadius: 10, padding: "8px 14px", marginBottom: 12,
              textAlign: "center", fontSize: 12, color: "#FF9F0A",
              fontWeight: 800, animation: "pulse 1.5s infinite",
            }}>
              Select {2 - (curVoterPicks || []).length} more
              suspect{(curVoterPicks || []).length === 1 ? "" : "s"}
            </div>
          )}

          <PBtn
            col={voteAccent}
            dis={mode === "doublecross" ? (curVoterPicks || []).length !== 2 : curVoterPicks == null}
            onClick={confirmVote}
          >
            {curVoter + 1 < pc ? "Confirm Vote — pass the phone →" : "Confirm Vote — see results!"}
          </PBtn>
        </div>
      )}

      {/* ════ REVEAL ════ */}
      {phase === "reveal" && (() => {
        const t = {};
        valid.forEach(n => { t[n] = 0; });
        if (mode === "doublecross") {
          Object.values(votes).forEach(arr => { (arr || []).forEach(v => { t[v] = (t[v] || 0) + 1; }); });
        } else {
          Object.values(votes).forEach(v => { if (v) t[v] = (t[v] || 0) + 1; });
        }

        return (
          <div style={{ ...card, animation: "fadeUp 0.35s ease both" }}>

            <p style={{ ...lbl, textAlign: "center", marginBottom: 14 }}>
              Round {round} of {totalRounds} · Results
            </p>

            {/* Win / Lose banner */}
            <div style={{
              background: groupWon
                ? "linear-gradient(135deg, #30D15822, #30D15808)"
                : "linear-gradient(135deg, #FF2D5522, #FF2D5508)",
              border: `2px solid ${groupWon ? "#30D158" : "#FF2D55"}`,
              borderRadius: 22, padding: "24px 20px", textAlign: "center", marginBottom: 18,
              boxShadow: `0 0 60px ${groupWon ? "#30D15840" : "#FF2D5540"}`,
              animation: "popIn 0.5s ease both",
            }}>
              <div style={{ fontSize: 54, marginBottom: 8, animation: groupWon ? "bounce 0.8s ease-in-out infinite" : "none" }}>
                {groupWon ? "🎉" : "😈"}
              </div>
              <p style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#ffffff50", fontWeight: 800, marginBottom: 8 }}>
                {impNames.length > 1 ? "The imposters were" : "The imposter was"}
              </p>
              <h2 style={{
                fontSize: impNames.length > 1 ? 30 : 44, fontWeight: 900,
                margin: "0 0 12px", letterSpacing: "-1px",
                color: groupWon ? "#30D158" : "#FF2D55",
                textShadow: `0 0 60px ${groupWon ? "#30D158aa" : "#FF2D55aa"}`,
                animation: "revealName 0.7s ease both, glow 2s ease-in-out 1s infinite",
              }}>
                {impNames.join(" & ")}
              </h2>

              <div style={{ background: "#ffffff0c", borderRadius: 12, padding: "12px 14px", marginBottom: 10, textAlign: "left" }}>
                <p style={{ fontSize: 9, color: "#ffffff45", letterSpacing: 3, textTransform: "uppercase", fontWeight: 800, marginBottom: 5 }}>
                  Their question was
                </p>
                <p style={{ fontSize: 14, fontStyle: "italic", color: "#ffffffcc", lineHeight: 1.5 }}>
                  "{qPair?.b}"
                </p>
              </div>
              <p style={{ fontSize: 11, color: "#ffffff45", marginBottom: 3 }}>Everyone else got:</p>
              <p style={{ fontSize: 13, fontStyle: "italic", color: "#ffffff70" }}>"{qPair?.a}"</p>

              <p style={{ fontSize: 22, fontWeight: 900, marginTop: 16, color: groupWon ? "#30D158" : "#FF2D55" }}>
                {groupWon ? "Group wins! 🎊" : "Imposter escapes! 😂"}
              </p>
            </div>

            {/* Vote breakdown */}
            <p style={lbl}>Who voted for whom</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
              {valid.map((voter, i) => {
                const vFor = mode === "doublecross"
                  ? (votes[voter] || []).join(" & ") || "—"
                  : votes[voter] || "—";
                const correct = mode === "doublecross"
                  ? (votes[voter] || []).some(v => impNames.includes(v))
                  : impNames.includes(votes[voter]);
                return (
                  <div key={voter} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: correct ? "#30D15814" : "#ffffff08",
                    border: `1.5px solid ${correct ? "#30D15848" : "#ffffff12"}`,
                    borderRadius: 12,
                    animation: "stagger 0.35s ease both",
                    animationDelay: `${i * 55}ms`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: COLORS[i % COLORS.length] + "25",
                      border: `1.5px solid ${COLORS[i % COLORS.length]}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900, color: COLORS[i % COLORS.length],
                    }}>{voter[0]?.toUpperCase()}</div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#ffffffcc" }}>{voter}</span>
                    <span style={{ fontSize: 12, color: "#ffffff45" }}>→</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: correct ? "#30D158" : "#ffffffcc" }}>{vFor}</span>
                    <span style={{ fontSize: 16 }}>{correct ? "✅" : "❌"}</span>
                  </div>
                );
              })}
            </div>

            <div style={hr} />

            {/* Leaderboard */}
            <p style={{ ...lbl, marginBottom: 12 }}>Leaderboard after Round {round}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
              {Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([name, pts], i) => (
                <ScoreRow
                  key={name} name={name} score={pts} rank={i + 1}
                  roundPts={roundPts[name] || 0}
                  color={COLORS[valid.indexOf(name) % COLORS.length]}
                  delay={i * 65}
                />
              ))}
            </div>

            <PBtn col={round >= totalRounds ? "#30D158" : "#0A84FF"} onClick={nextRound}>
              {round >= totalRounds ? "🏆 Final Results →" : "Next Round →"}
            </PBtn>
          </div>
        );
      })()}

      {/* ════ FINAL ════ */}
      {phase === "final" && (() => {
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const winner = sorted[0]?.[0];
        const wCol   = COLORS[valid.indexOf(winner) % COLORS.length];
        return (
          <div style={{ ...card, animation: "fadeUp 0.4s ease both" }}>

            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{
                fontSize: 70, display: "inline-block", marginBottom: 4,
                filter: "drop-shadow(0 0 32px #FFD60Aaa)",
                animation: "crown 2s ease-in-out infinite",
              }}>🏆</div>
              <h1 style={{
                fontSize: 46, fontWeight: 900, letterSpacing: "-2px",
                background: "linear-gradient(135deg, #FFD60A, #FF9F0A, #FF6B35)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Final Results</h1>
              <p style={{ color: "#ffffff40", fontSize: 11, marginTop: 6, letterSpacing: 3, textTransform: "uppercase" }}>
                {totalRounds} round{totalRounds !== 1 ? "s" : ""} complete
              </p>
            </div>

            {/* Winner callout */}
            <div style={{
              background: `linear-gradient(135deg, ${wCol}28, ${wCol}10)`,
              border: `2px solid ${wCol}`, borderRadius: 22, padding: "22px",
              textAlign: "center", marginBottom: 18,
              boxShadow: `0 0 55px ${wCol}48`,
              animation: "popIn 0.5s ease both",
            }}>
              <p style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: wCol + "88", fontWeight: 800, marginBottom: 8 }}>
                Winner
              </p>
              <div style={{
                width: 62, height: 62, borderRadius: "50%", margin: "0 auto 10px",
                background: wCol + "30", border: `3px solid ${wCol}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 900, color: wCol,
                boxShadow: `0 0 28px ${wCol}70`,
              }}>{winner?.[0]?.toUpperCase()}</div>
              <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1px" }}>{winner} 👑</h2>
              <p style={{ fontSize: 28, fontWeight: 900, color: wCol, marginTop: 6 }}>
                {sorted[0]?.[1]} pt{sorted[0]?.[1] !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Full standings */}
            <p style={lbl}>Full Standings</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 22 }}>
              {sorted.map(([name, pts], i) => (
                <ScoreRow
                  key={name} name={name} score={pts} rank={i + 1}
                  roundPts={0}
                  color={COLORS[valid.indexOf(name) % COLORS.length]}
                  delay={i * 80}
                />
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <PBtn col="grad" onClick={() => { setConfetti(false); beginGame(); }}>
                Play Again (Same Players) →
              </PBtn>
              <button
                onClick={() => { setConfetti(false); setPhase("setup"); }}
                style={{
                  display: "block", width: "100%", padding: "12px", borderRadius: 14,
                  border: "2px solid #ffffff22", background: "transparent",
                  color: "#ffffff60", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                }}
              >
                Change Settings
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─────────────────────────────────────────
   MOUNT
───────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
