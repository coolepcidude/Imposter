/* ════════════════════════════════════════════════════
   app.js
   React UI for Imposter Party Game.
   Depends on globals: React, ReactDOM, Babel,
                       gameEngine.js, sounds.js
════════════════════════════════════════════════════ */

const { useState, useReducer, useEffect, useRef, useCallback, memo } = React;

/* ──────────────────────────────────────
   UI CONSTANTS
────────────────────────────────────── */
const COLORS = [
  '#FF2D55', '#FF9F0A', '#30D158', '#0A84FF',
  '#BF5AF2', '#FF6B35', '#FFD60A', '#00C7BE',
  '#FF375F', '#5E5CE6',
];

const MODES = [
  { id: 'clueless',    emoji: '🤷', name: 'Clueless',     color: '#0A84FF',
    tagline: 'Nobody knows — not even the imposter' },
  { id: 'undercover',  emoji: '🕵️', name: 'Undercover',  color: '#FF9F0A',
    tagline: 'The imposter knows — can they fool everyone?' },
  { id: 'doublecross', emoji: '🎭', name: 'Double Cross', color: '#FF2D55',
    tagline: 'Two imposters, neither knows the other · 3+ players', min: 3 },
];

/* ──────────────────────────────────────
   INITIAL STATE
────────────────────────────────────── */
const INITIAL_STATE = {
  /* Setup */
  phase:        'setup',
  mode:         'clueless',
  totalRounds:  3,
  timerEnabled: false,
  timerSeconds: 30,
  players: [
    { id: generateId(), name: '', colorIdx: 0 },
    { id: generateId(), name: '', colorIdx: 1 },
  ],
  nameError: '',

  /* Per-game */
  round:          1,
  scores:         {},
  usedIdx:        [],
  questionsCycled: false,

  /* Per-round: answering */
  qOrder:  [],
  curAns:  0,
  qPair:   null,
  impIdxs: [],
  answers: {},
  writing: '',

  /* Per-round: voting */
  voteOrder: [],
  curVoter:  0,
  votes:     {},

  /* Reveal */
  roundPts:    {},
  confetti:    false,
  revealStage: 0,   // 0=suspense | 1=name | 2=breakdown | 3=leaderboard+button
  groupWon:    false,
};

/* ──────────────────────────────────────
   REDUCER
   Single source of truth for all game
   state. Pure — no side effects.
────────────────────────────────────── */
function reducer(state, action) {
  switch (action.type) {

    /* ── Setup mutations ── */
    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_ROUNDS':
      return { ...state, totalRounds: action.rounds };

    case 'TOGGLE_TIMER':
      return { ...state, timerEnabled: !state.timerEnabled };

    case 'SET_TIMER_SECONDS':
      return { ...state, timerSeconds: action.seconds };

    case 'ADD_PLAYER': {
      if (state.players.length >= 10) return state;
      const idx = state.players.length;
      return {
        ...state,
        players: [...state.players, { id: generateId(), name: '', colorIdx: idx % COLORS.length }],
      };
    }

    case 'REMOVE_PLAYER': {
      if (state.players.length <= 2) return state;
      const remaining = state.players
        .filter(p => p.id !== action.id)
        .map((p, i) => ({ ...p, colorIdx: i % COLORS.length })); /* re-index colours */
      return { ...state, players: remaining, nameError: '' };
    }

    case 'UPDATE_PLAYER_NAME':
      return {
        ...state,
        nameError: '',
        players: state.players.map(p =>
          p.id === action.id ? { ...p, name: action.name } : p
        ),
      };

    case 'SET_NAME_ERROR':
      return { ...state, nameError: action.error };

    /* ── Game start ── */
    case 'BEGIN_GAME': {
      const { validPlayers, roundData } = action;
      const scores = {};
      validPlayers.forEach(p => { scores[p.name] = 0; });
      return {
        ...state,
        players:         validPlayers,
        scores,
        usedIdx:         roundData.newUsed,
        round:           1,
        questionsCycled: roundData.isCycling,
        qPair:           roundData.qPair,
        qOrder:          roundData.qOrder,
        impIdxs:         roundData.impIdxs,
        voteOrder:       roundData.voteOrder,
        curAns:   0,
        answers:  {},
        writing:  '',
        curVoter: 0,
        votes:    {},
        roundPts: {},
        confetti: false,
        groupWon: false,
        revealStage: 0,
        nameError:   '',
        phase:       'q_handoff',
      };
    }

    /* ── Phase navigation ── */
    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    /* ── Answering ── */
    case 'SET_WRITING':
      return { ...state, writing: action.value };

    case 'SUBMIT_ANSWER': {
      const playerIdx  = state.qOrder[state.curAns];
      const playerName = state.players[playerIdx]?.name || '…';
      const answer     = state.writing.trim() || '…';
      const newAnswers = { ...state.answers, [playerName]: answer };
      const nextAns    = state.curAns + 1;

      if (nextAns >= state.players.length) {
        return { ...state, answers: newAnswers, writing: '', phase: 'vote_handoff' };
      }
      return { ...state, answers: newAnswers, writing: '', curAns: nextAns, phase: 'q_handoff' };
    }

    /* ── Voting ── */
    case 'CAST_VOTE': {
      const voterName = state.voteOrder[state.curVoter];
      let newVotes;
      if (state.mode === 'doublecross') {
        const cur = state.votes[voterName] || [];
        let next;
        if (cur.includes(action.suspect))  next = cur.filter(x => x !== action.suspect);
        else if (cur.length < 2)           next = [...cur, action.suspect];
        else                               next = [cur[1], action.suspect]; /* replace oldest */
        newVotes = { ...state.votes, [voterName]: next };
      } else {
        newVotes = { ...state.votes, [voterName]: action.suspect };
      }
      return { ...state, votes: newVotes };
    }

    case 'CONFIRM_VOTE': {
      const nextVoter = state.curVoter + 1;

      /* More voters remain */
      if (nextVoter < state.players.length) {
        return { ...state, curVoter: nextVoter, phase: 'vote_handoff' };
      }

      /* All voted — compute scores using the centralised engine function */
      const playerNames = state.players.map(p => p.name);
      const impNames    = state.impIdxs.map(i => state.players[i]?.name).filter(Boolean);
      const earned      = computeRoundScores(state.votes, impNames, state.mode, playerNames);
      const newScores   = {};
      playerNames.forEach(n => { newScores[n] = (state.scores[n] || 0) + (earned[n] || 0); });
      /* Compute once here so reveal effect can read from state — no stale closures */
      const won = checkGroupWon(state.votes, impNames, state.mode);

      return {
        ...state,
        roundPts:    earned,
        scores:      newScores,
        groupWon:    won,
        phase:       'reveal',
        revealStage: 0,
      };
    }

    /* ── Reveal drama ── */
    case 'SET_REVEAL_STAGE':
      return { ...state, revealStage: action.stage };

    case 'SET_CONFETTI':
      return { ...state, confetti: action.value };

    /* ── Next round ── */
    case 'NEXT_ROUND': {
      const { roundData, newRound } = action;
      return {
        ...state,
        round:           newRound,
        usedIdx:         roundData.newUsed,
        questionsCycled: roundData.isCycling,
        qPair:           roundData.qPair,
        qOrder:          roundData.qOrder,
        impIdxs:         roundData.impIdxs,
        voteOrder:       roundData.voteOrder,
        curAns:   0,
        answers:  {},
        writing:  '',
        curVoter: 0,
        votes:    {},
        roundPts: {},
        confetti: false,
        groupWon: false,
        revealStage: 0,
        phase:       'q_handoff',
      };
    }

    case 'GO_FINAL':
      return { ...state, phase: 'final' };

    /* Preserve player names / settings when going back to setup */
    case 'RESET_TO_SETUP':
      return {
        ...INITIAL_STATE,
        players:      state.players.map((p, i) => ({ ...p, colorIdx: i % COLORS.length })),
        mode:         state.mode,
        totalRounds:  state.totalRounds,
        timerEnabled: state.timerEnabled,
        timerSeconds: state.timerSeconds,
      };

    default:
      return state;
  }
}

/* ──────────────────────────────────────
   STATIC STYLE OBJECTS
   Defined outside components so they
   are never re-created on render.
────────────────────────────────────── */
const S = {
  page: {
    minHeight:      '100vh',
    background:     '#0c0c1b',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '24px 18px',
    position:       'relative',
    overflow:       'hidden',
  },
  card:  { width: '100%', maxWidth: 460 },
  lbl: {
    color:          '#ffffff75',
    fontSize:       10,
    letterSpacing:  3,
    textTransform:  'uppercase',
    display:        'block',
    marginBottom:   8,
    fontWeight:     800,
  },
  inp: {
    width:       '100%',
    background:  '#ffffff0e',
    border:      '1.5px solid #ffffff22',
    borderRadius: 12,
    padding:     '13px 15px',
    color:       '#fff',
    fontSize:    15,
    outline:     'none',
    fontFamily:  'inherit',
  },
  hr: {
    height:     1,
    background: 'linear-gradient(90deg, transparent, #ffffff28, transparent)',
    margin:     '18px 0',
  },
  ghostBtn: {
    display:      'block',
    width:        '100%',
    padding:      '12px',
    borderRadius: 14,
    border:       '2px solid #ffffff22',
    background:   'transparent',
    color:        '#ffffff60',
    fontSize:     13,
    fontWeight:   700,
    fontFamily:   'inherit',
    cursor:       'pointer',
  },
};

/* Dynamic style helpers (depend on runtime colour values) */
const D = {
  btn: (col, ghost = false, sm = false, dis = false) => ({
    display:      'block',
    width:        '100%',
    padding:      sm ? '12px 16px' : '15px 20px',
    borderRadius: 15,
    border:       ghost ? `2px solid ${col}40` : 'none',
    background:   ghost      ? 'transparent'
                : col === 'grad'
                    ? 'linear-gradient(135deg, #FF2D55, #FF9F0A, #FFD60A)'
                    : `linear-gradient(135deg, ${col}, ${col}cc)`,
    color:        '#fff',
    fontSize:     sm ? 13 : 15,
    fontWeight:   900,
    letterSpacing: 0.4,
    textShadow:   ghost ? 'none' : '0 1px 5px rgba(0,0,0,.5)',
    boxShadow:    dis || ghost ? 'none' : `0 4px 26px ${col === 'grad' ? '#FF2D5560' : col + '55'}`,
    opacity:      dis ? 0.24 : 1,
    cursor:       dis ? 'not-allowed' : 'pointer',
  }),

  avatar: (color, size = 36) => ({
    width:        size,
    height:       size,
    borderRadius: '50%',
    flexShrink:   0,
    background:   color + '28',
    border:       `2px solid ${color}`,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    fontSize:     Math.floor(size * 0.38),
    fontWeight:   900,
    color,
    boxShadow:    `0 0 12px ${color}55`,
  }),

  modePill: (color, selected) => ({
    display:    'flex',
    alignItems: 'center',
    gap:        14,
    padding:    '14px 16px',
    borderRadius: 16,
    border:     `2px solid ${selected ? color : color + '22'}`,
    background: selected ? `linear-gradient(135deg, ${color}22, ${color}08)` : '#ffffff07',
    boxShadow:  selected ? `0 0 28px ${color}38, inset 0 0 20px ${color}08` : 'none',
    transition: 'all .22s',
    textAlign:  'left',
    width:      '100%',
    fontFamily: 'inherit',
    cursor:     'pointer',
  }),
};

/* ──────────────────────────────────────
   MEMOIZED COMPONENTS
   React.memo prevents re-renders when
   props have not changed. Critical for
   keeping animations smooth during the
   1-second timer ticks.
────────────────────────────────────── */

/* Particle confetti canvas */
const Confetti = memo(function Confetti({ active }) {
  const ref = useRef();
  const raf = useRef();

  useEffect(() => {
    if (!active) return;
    const c   = ref.current;
    const ctx = c.getContext('2d');
    c.width   = window.innerWidth;
    c.height  = window.innerHeight;

    let ps = Array.from({ length: 220 }, () => ({
      x:   Math.random() * c.width,
      y:   -14,
      r:   Math.random() * 9 + 3,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
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
        p.y   += p.sp;
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
      if (ps.length > 0) raf.current = requestAnimationFrame(draw);
    }

    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [active]);

  if (!active) return null;
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} />;
});

/* Animated gradient background blobs */
const BlobBG = memo(function BlobBG({ accent = '#FF2D55' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '70vw', height: '70vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
        animation: 'drift1 13s ease-in-out infinite',
        transition: 'background 1.2s',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-10%',
        width: '65vw', height: '65vw', borderRadius: '50%',
        background: 'radial-gradient(circle, #0A84FF1e 0%, transparent 70%)',
        animation: 'drift2 16s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '5%',
        width: '40vw', height: '40vw', borderRadius: '50%',
        background: 'radial-gradient(circle, #BF5AF218 0%, transparent 70%)',
        animation: 'drift3 11s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.022,
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '38px 38px',
      }} />
    </div>
  );
});

/* Segmented progress bar */
const PBar = memo(function PBar({ total, current, accent }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 5, flex: 1, maxWidth: 30, borderRadius: 99,
          background: i < current ? '#ffffff65' : i === current ? accent : '#ffffff18',
          boxShadow:  i === current ? `0 0 10px ${accent}, 0 0 20px ${accent}55` : 'none',
          transition: 'all .4s',
        }} />
      ))}
    </div>
  );
});

/* Leaderboard row */
const ScoreRow = memo(function ScoreRow({ name, score, roundPts, rank, color, delay = 0 }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
      background:   rank === 1 ? `linear-gradient(135deg, ${color}28, ${color}10)` : '#ffffff0a',
      border:       `1.5px solid ${rank === 1 ? color + '70' : '#ffffff18'}`,
      borderRadius: 15,
      boxShadow:    rank === 1 ? `0 0 26px ${color}35` : 'none',
      animation:    'stagger .4s ease both',
      animationDelay: `${delay}ms`,
    }}>
      <span style={{ fontSize: 22, width: 30, textAlign: 'center', flexShrink: 0 }}>
        {rank <= 3 ? medals[rank - 1] : rank}
      </span>
      <div style={D.avatar(color)}>{name[0]?.toUpperCase()}</div>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: rank === 1 ? '#fff' : '#ffffffcc' }}>
        {name}
      </span>
      {roundPts > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 900, color: '#30D158',
          background: '#30D15820', border: '1px solid #30D15850',
          borderRadius: 8, padding: '3px 9px',
          animation: 'popIn .3s ease both', animationDelay: `${delay + 180}ms`,
        }}>
          +{roundPts}
        </span>
      )}
      <span style={{ fontSize: 24, fontWeight: 900, color: rank === 1 ? color : '#ffffffaa' }}>{score}</span>
      <span style={{ fontSize: 10, color: '#ffffff40', marginLeft: 2 }}>pts</span>
    </div>
  );
});

/* Handoff / lock screen shown between players */
const LockScreen = memo(function LockScreen({ name, color, sub, btnLabel, onReady }) {
  return (
    <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', animation: 'fadeUp .32s ease both' }}>
      <div style={{
        width: 88, height: 88, borderRadius: '50%', margin: '0 auto 18px',
        background: `linear-gradient(135deg, ${color}40, ${color}15)`,
        border:     `3px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42,
        boxShadow:  `0 0 50px ${color}65, 0 0 90px ${color}22`,
        animation:  'lockBounce 1.6s ease-in-out infinite',
      }}>🔒</div>
      <p style={{ color: '#ffffff50', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>
        {sub || 'Pass the phone to'}
      </p>
      <h2 style={{
        fontSize: 48, fontWeight: 900, letterSpacing: '-2px', marginBottom: 5,
        color, textShadow: `0 0 40px ${color}, 0 0 80px ${color}55`,
      }}>{name}</h2>
      <p style={{ color: '#ffffff35', fontSize: 13, marginBottom: 30 }}>
        Make sure nobody else is looking 👀
      </p>
      <button onClick={onReady} style={D.btn(color)}>{btnLabel}</button>
    </div>
  );
});

/* Countdown timer bar */
const TimerBar = memo(function TimerBar({ timeLeft, total, accent }) {
  const pct       = (timeLeft / total) * 100;
  const isWarning = timeLeft <= 5;
  const isDanger  = timeLeft <= 3;
  const barColor  = isDanger ? '#FF2D55' : isWarning ? '#FF9F0A' : accent;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#ffffff50', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800 }}>Time</span>
        <span style={{
          fontSize: 20, fontWeight: 900, color: barColor,
          animation: isWarning ? 'timerPulse .8s ease-in-out infinite' : 'none',
        }}>{timeLeft}s</span>
      </div>
      <div style={{ height: 6, background: '#ffffff15', borderRadius: 99, overflow: 'hidden' }}>
        <div className="timer-bar-fill" style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`,
          boxShadow:  `0 0 8px ${barColor}`,
        }} />
      </div>
    </div>
  );
});

/* Generic styled button — outside App so React never re-creates the component class */
const PBtn = memo(function PBtn({ col, ghost, sm, dis, onClick, children }) {
  return (
    <button onClick={onClick} disabled={dis} style={D.btn(col, ghost, sm, dis)}>
      {children}
    </button>
  );
});

/* ──────────────────────────────────────
   MAIN APP COMPONENT
────────────────────────────────────── */
function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  /* Questions loaded from question.JSON */
  const [qs,       setQs]       = useState([]);
  const [qLoading, setQLoading] = useState(true);
  const [qError,   setQError]   = useState(false);

  /* Timer lives outside the reducer to avoid hammering it every second */
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef    = useRef(null);
  const submittedRef = useRef(false); /* prevents double-submit when timer fires */

  /* Sound toggle */
  const [soundOn, setSoundOn] = useState(true);

  /* ── Load question.JSON ── */
  useEffect(() => {
    fetch('question.JSON')
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d  => { setQs(d); setQLoading(false); })
      .catch(() => { setQError(true); setQLoading(false); });
  }, []);

  /* ── Countdown timer ── */
  useEffect(() => {
    clearInterval(timerRef.current);
    submittedRef.current = false;
    if (state.phase !== 'question' || !state.timerEnabled) return;

    setTimeLeft(state.timerSeconds);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1;
        if (next <= 0) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true;
            SoundEngine.timerEnd();
            dispatch({ type: 'SUBMIT_ANSWER' });
          }
          return 0;
        }
        if (next <= 3)       SoundEngine.timerWarn();
        else if (next <= 5)  SoundEngine.tick();
        return next;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [state.phase, state.curAns, state.timerEnabled]);

  /* ── Reveal drama (staged automatic progression) ── */
  useEffect(() => {
    if (state.phase !== 'reveal') return;

    if (state.revealStage === 0) {
      SoundEngine.suspense();
      const t = setTimeout(() => dispatch({ type: 'SET_REVEAL_STAGE', stage: 1 }), 1800);
      return () => clearTimeout(t);
    }

    if (state.revealStage === 1) {
      SoundEngine.reveal();
      /* groupWon was computed in the reducer when voting finished — no stale closure risk */
      setTimeout(() => {
        if (state.groupWon) {
          SoundEngine.win();
          dispatch({ type: 'SET_CONFETTI', value: true });
        } else {
          SoundEngine.lose();
        }
      }, 500);
      const t = setTimeout(() => dispatch({ type: 'SET_REVEAL_STAGE', stage: 2 }), 2200);
      return () => clearTimeout(t);
    }

    if (state.revealStage === 2) {
      const t = setTimeout(() => dispatch({ type: 'SET_REVEAL_STAGE', stage: 3 }), 900);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.revealStage, state.groupWon]);

  /* ── Derived values ── */
  const validPlayers = state.players.filter(p => p.name.trim());
  const pc           = validPlayers.length;
  const mInfo        = MODES.find(m => m.id === state.mode) || MODES[0];

  /* Answering phase */
  const curAnsPlayer = state.players[state.qOrder[state.curAns]];
  const curAnsName   = curAnsPlayer?.name || '';
  const curIsImp     = state.impIdxs.includes(state.qOrder[state.curAns]);
  const curQ         = state.qPair ? (curIsImp ? state.qPair.b : state.qPair.a) : '';
  const ansAccent    = COLORS[state.curAns % COLORS.length];

  /* Voting phase */
  const voterName     = state.voteOrder[state.curVoter];
  const voterPlayer   = state.players.find(p => p.name === voterName);
  const voteAccent    = COLORS[(voterPlayer?.colorIdx || 0) % COLORS.length];
  const curVoterPicks = state.votes[voterName] || (state.mode === 'doublecross' ? [] : null);

  /* Reveal phase */
  const impNames = state.impIdxs.map(i => state.players[i]?.name).filter(Boolean);
  const groupWon = state.groupWon;

  /* Accent colour for background blob */
  const accentColor =
    ['q_handoff', 'question'].includes(state.phase)    ? ansAccent  :
    ['vote_handoff', 'vote_cast'].includes(state.phase) ? voteAccent :
    mInfo.color;

  const canStart =
    validPlayers.length >= 2 &&
    (state.mode !== 'doublecross' || validPlayers.length >= 3) &&
    qs.length > 0;

  /* ── Handlers ── */
  const handleBeginGame = useCallback(() => {
    const valid = state.players.filter(p => p.name.trim());
    if (valid.length < 2) return;
    if (state.mode === 'doublecross' && valid.length < 3) return;
    if (qs.length === 0) return;

    /* Duplicate name check */
    const lower = valid.map(p => p.name.trim().toLowerCase());
    if (lower.length !== new Set(lower).size) {
      dispatch({ type: 'SET_NAME_ERROR', error: '⚠️ Two players have the same name — each name must be unique.' });
      return;
    }

    resetRNG(); /* seed the module-level RNG in gameEngine.js */
    const roundData = createRound({ players: valid, mode: state.mode, questions: qs, used: [] });
    dispatch({ type: 'BEGIN_GAME', validPlayers: valid, roundData });
    SoundEngine.click();
  }, [state.players, state.mode, qs]);

  const handleSubmitAnswer = useCallback(() => {
    submittedRef.current = true;
    clearInterval(timerRef.current);
    SoundEngine.submit();
    dispatch({ type: 'SUBMIT_ANSWER' });
  }, []);

  const handleCastVote = useCallback((suspect) => {
    SoundEngine.vote();
    dispatch({ type: 'CAST_VOTE', suspect });
  }, []);

  const handleConfirmVote = useCallback(() => {
    SoundEngine.click();
    dispatch({ type: 'CONFIRM_VOTE' });
  }, []);

  const handleNextRound = useCallback(() => {
    SoundEngine.click();
    if (state.round >= state.totalRounds) {
      dispatch({ type: 'GO_FINAL' });
      return;
    }
    const roundData = createRound({
      players:   state.players,
      mode:      state.mode,
      questions: qs,
      used:      state.usedIdx,
    });
    dispatch({ type: 'NEXT_ROUND', roundData, newRound: state.round + 1 });
  }, [state.round, state.totalRounds, state.players, state.mode, state.usedIdx, qs]);

  const handleToggleSound = useCallback(() => {
    const next = SoundEngine.toggle();
    setSoundOn(next);
  }, []);

  /* These two were previously inline useCallback calls inside JSX — a Rules of Hooks violation.
     Hooks must always be called at the top level of a component, never inside render returns. */
  const handleShowQuestion = useCallback(() => {
    SoundEngine.click();
    dispatch({ type: 'SET_PHASE', phase: 'question' });
  }, []);

  const handleShowVote = useCallback(() => {
    SoundEngine.click();
    dispatch({ type: 'SET_PHASE', phase: 'vote_cast' });
  }, []);

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <div style={S.page}>
      <BlobBG accent={accentColor} />
      <Confetti active={state.confetti} />

      {/* Floating sound toggle (visible during gameplay) */}
      {state.phase !== 'setup' && (
        <button onClick={handleToggleSound} style={{
          position: 'fixed', top: 16, right: 16, zIndex: 100,
          width: 38, height: 38, borderRadius: '50%',
          background: '#ffffff10', border: '1px solid #ffffff20',
          color: soundOn ? '#fff' : '#ffffff35', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{soundOn ? '🔊' : '🔇'}</button>
      )}

      {/* ════ LOADING ════ */}
      {qLoading && (
        <div style={{ textAlign: 'center', animation: 'fadeIn .5s ease' }}>
          <div style={{ fontSize: 48, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</div>
          <p style={{ color: '#ffffff70', marginTop: 12 }}>Loading questions…</p>
        </div>
      )}

      {/* ════ ERROR ════ */}
      {!qLoading && qError && (
        <div style={{ maxWidth: 420, width: '100%', animation: 'fadeUp .4s ease' }}>
          <div style={{ textAlign: 'center', background: '#FF2D5514', border: '2px solid #FF2D5560', borderRadius: 20, padding: '28px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FF2D55', marginBottom: 10 }}>question.JSON not found</h2>
            <p style={{ color: '#ffffffaa', fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>
              Make sure <code style={{ background: '#ffffff18', padding: '2px 8px', borderRadius: 6, color: '#FFD60A' }}>question.JSON</code> is
              in the same folder as <code style={{ background: '#ffffff18', padding: '2px 8px', borderRadius: 6, color: '#FFD60A' }}>Index.HTML</code>.
            </p>
            <div style={{ background: '#ffffff0a', border: '1px solid #ffffff18', borderRadius: 14, padding: '16px', textAlign: 'left' }}>
              <p style={{ color: '#FFD60A', fontWeight: 800, marginBottom: 8, fontSize: 13 }}>question.JSON format:</p>
              <pre style={{ color: '#ffffffcc', fontSize: 12, lineHeight: 1.7, overflowX: 'auto' }}>{`[\n  {\n    "a": "Question for most players",\n    "b": "Question for the imposter"\n  }\n]`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ════ SETUP ════ */}
      {!qLoading && !qError && state.phase === 'setup' && (
        <div style={{ ...S.card, animation: 'fadeUp .35s ease both' }}>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              fontSize: 64, display: 'inline-block', marginBottom: 4,
              filter: 'drop-shadow(0 0 28px #FF2D5599) drop-shadow(0 0 70px #FF9F0A44)',
              animation: 'bounce 2.5s ease-in-out infinite',
            }}>🕵️</div>
            <h1 style={{
              fontSize: 58, fontWeight: 900, letterSpacing: '-3px', lineHeight: 1,
              background: 'linear-gradient(135deg, #FF2D55 0%, #FF9F0A 55%, #FFD60A 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'shimmer 4s linear infinite',
            }}>IMPOSTER</h1>
            <p style={{ color: '#ffffff38', fontSize: 10, letterSpacing: 6, textTransform: 'uppercase', marginTop: 6, fontWeight: 800 }}>
              Party Game · 2–10 Players
            </p>
          </div>

          {/* Mode */}
          <p style={S.lbl}>Game Mode</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {MODES.map(m => {
              const sel = state.mode === m.id;
              return (
                <button key={m.id} onClick={() => { SoundEngine.click(); dispatch({ type: 'SET_MODE', mode: m.id }); }} style={D.modePill(m.color, sel)}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: sel ? m.color : '#fff' }}>{m.name}</span>
                      {m.min && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: m.color,
                          background: m.color + '20', border: `1px solid ${m.color}50`,
                          borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase',
                        }}>3+ players</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: '#ffffff50', lineHeight: 1.4 }}>{m.tagline}</span>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: sel ? m.color : '#ffffff12',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color: '#fff',
                    boxShadow: sel ? `0 0 14px ${m.color}` : 'none', transition: 'all .2s',
                  }}>{sel ? '✓' : ''}</div>
                </button>
              );
            })}
          </div>

          {/* Rounds */}
          <p style={S.lbl}>Rounds</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[3, 5, 7, 10].map(n => {
              const sel = state.totalRounds === n;
              return (
                <button key={n} onClick={() => { SoundEngine.click(); dispatch({ type: 'SET_ROUNDS', rounds: n }); }} style={{
                  flex: 1, padding: '13px 4px', borderRadius: 12, fontWeight: 900, fontSize: 16,
                  border:     `2px solid ${sel ? '#BF5AF2' : '#ffffff18'}`,
                  background: sel ? 'linear-gradient(135deg, #BF5AF230, #BF5AF210)' : '#ffffff08',
                  color:      sel ? '#BF5AF2' : '#ffffff55',
                  boxShadow:  sel ? '0 0 20px #BF5AF248' : 'none',
                  transition: 'all .2s', fontFamily: 'inherit', cursor: 'pointer',
                }}>{n}</button>
              );
            })}
          </div>

          {/* Timer toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 14, marginBottom: 20,
            background:  state.timerEnabled ? '#FF9F0A14' : '#ffffff08',
            border:      `1.5px solid ${state.timerEnabled ? '#FF9F0A50' : '#ffffff18'}`,
            transition:  'all .2s',
          }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 14, color: state.timerEnabled ? '#FF9F0A' : '#ffffffcc' }}>
                ⏱ Timer Mode
              </span>
              <span style={{ display: 'block', fontSize: 11, color: '#ffffff50', marginTop: 2 }}>
                {state.timerEnabled ? `${state.timerSeconds}s per question` : 'Players answer at their own pace'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {state.timerEnabled && (
                <div style={{ display: 'flex', gap: 5 }}>
                  {[20, 30, 45, 60].map(s => {
                    const sel = state.timerSeconds === s;
                    return (
                      <button key={s} onClick={() => dispatch({ type: 'SET_TIMER_SECONDS', seconds: s })} style={{
                        padding: '4px 7px', borderRadius: 7, fontSize: 11, fontWeight: 800,
                        border:     `1.5px solid ${sel ? '#FF9F0A' : '#ffffff25'}`,
                        background: sel ? '#FF9F0A25' : 'transparent',
                        color:      sel ? '#FF9F0A' : '#ffffff55',
                        fontFamily: 'inherit', cursor: 'pointer',
                      }}>{s}s</button>
                    );
                  })}
                </div>
              )}
              {/* Toggle switch */}
              <button className="toggle-track"
                onClick={() => dispatch({ type: 'TOGGLE_TIMER' })}
                style={{ background: state.timerEnabled ? '#FF9F0A' : '#ffffff25' }}>
                <div className="toggle-thumb" style={{ left: state.timerEnabled ? 21 : 3 }} />
              </button>
            </div>
          </div>

          {/* Players */}
          <p style={S.lbl}>Players</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
            {state.players.map((player, i) => {
              const col = COLORS[player.colorIdx];
              return (
                <div key={player.id} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: col + '25', border: `2px solid ${col}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color: col, boxShadow: `0 0 12px ${col}45`,
                  }}>{i + 1}</div>
                  <input
                    value={player.name}
                    onChange={e => dispatch({ type: 'UPDATE_PLAYER_NAME', id: player.id, name: e.target.value })}
                    placeholder={`Player ${i + 1}`} style={S.inp}
                    onFocus={e => { e.target.style.borderColor = col;         e.target.style.background = col + '18'; }}
                    onBlur={e  => { e.target.style.borderColor = '#ffffff22'; e.target.style.background = '#ffffff0e'; }}
                  />
                  {state.players.length > 2 && (
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_PLAYER', id: player.id })}
                      style={{ background: 'none', border: 'none', color: '#ffffff40', fontSize: 24, padding: '0 4px', lineHeight: 1, cursor: 'pointer' }}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>

          {state.nameError && (
            <p style={{ color: '#FF2D55cc', fontSize: 12, textAlign: 'center', fontWeight: 700, marginBottom: 10, animation: 'fadeIn .3s ease' }}>
              {state.nameError}
            </p>
          )}

          <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
            {state.players.length < 10 && (
              <button
                onClick={() => dispatch({ type: 'ADD_PLAYER' })}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '2px solid #ffffff22', background: 'transparent', color: '#ffffff65', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
              >+ Add Player</button>
            )}
            <button onClick={handleBeginGame} disabled={!canStart} style={{ ...D.btn('grad', false, false, !canStart), flex: 2 }}>
              START GAME →
            </button>
          </div>

          {state.mode === 'doublecross' && validPlayers.length < 3 && (
            <p style={{ color: '#FF2D55bb', fontSize: 12, textAlign: 'center', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
              ⚠️ Double Cross needs at least 3 players
            </p>
          )}
        </div>
      )}

      {/* ════ QUESTION HANDOFF ════ */}
      {state.phase === 'q_handoff' && (
        <LockScreen
          name={curAnsName} color={ansAccent}
          sub={`Round ${state.round} of ${state.totalRounds} · Question Phase`}
          btnLabel="Show My Question →"
          onReady={handleShowQuestion}
        />
      )}

      {/* ════ QUESTION ════ */}
      {state.phase === 'question' && (
        <div style={{ ...S.card, textAlign: 'center', animation: 'slideR .3s ease both' }}>

          {/* Mode + round pill */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{
              background: `linear-gradient(135deg, ${mInfo.color}28, ${mInfo.color}10)`,
              border: `1.5px solid ${mInfo.color}55`, borderRadius: 20,
              padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 12 }}>{mInfo.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: mInfo.color, letterSpacing: 2, textTransform: 'uppercase' }}>
                {mInfo.name} · Round {state.round}/{state.totalRounds}
              </span>
            </div>
          </div>

          <PBar total={pc} current={state.curAns} accent={ansAccent} />

          <p style={{ ...S.lbl, textAlign: 'center' }}>Answering</p>
          <h2 style={{
            fontSize: 44, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-1.5px',
            color: ansAccent, textShadow: `0 0 40px ${ansAccent}, 0 0 80px ${ansAccent}50`,
          }}>{curAnsName}</h2>
          <p style={{ color: '#ffffff40', fontSize: 13, marginBottom: 18, fontWeight: 600 }}>
            {state.curAns + 1} of {pc}
          </p>

          {/* Timer bar */}
          {state.timerEnabled && <TimerBar timeLeft={timeLeft} total={state.timerSeconds} accent={ansAccent} />}

          {/* Imposter alert (Undercover / Double Cross only) */}
          {curIsImp && state.mode !== 'clueless' && (
            <div style={{
              background: 'linear-gradient(135deg, #FF2D5522, #FF2D550a)',
              border: '2px solid #FF2D55', borderRadius: 16, padding: '13px 16px', marginBottom: 14,
              boxShadow: '0 0 38px #FF2D5548', animation: 'popIn .35s ease both',
            }}>
              <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 4px', color: '#FF2D55' }}>🎭 You are the imposter!</p>
              <p style={{ fontSize: 12, color: '#ffffff70', margin: 0, lineHeight: 1.5 }}>
                {state.mode === 'doublecross'
                  ? "There's one other imposter — but you don't know who. Blend in!"
                  : "Blend in with your answer. Don't get caught!"}
              </p>
            </div>
          )}

          {/* Question card */}
          <div style={{
            background: `linear-gradient(135deg, ${ansAccent}20, ${ansAccent}08)`,
            border: `2px solid ${ansAccent}`, borderRadius: 20, padding: '22px 18px', marginBottom: 16,
            boxShadow: `0 0 40px ${ansAccent}35, inset 0 0 30px ${ansAccent}08`,
          }}>
            <p style={{ ...S.lbl, textAlign: 'center', color: ansAccent + 'bb', marginBottom: 10 }}>Your question</p>
            <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, color: '#fff', margin: 0 }}>{curQ}</p>
          </div>

          <div style={{ textAlign: 'left', marginBottom: 14 }}>
            <label style={S.lbl}>Your answer</label>
            <textarea
              value={state.writing}
              onChange={e => dispatch({ type: 'SET_WRITING', value: e.target.value })}
              placeholder="Type your answer…" rows={3}
              style={{ ...S.inp, border: `2px solid ${ansAccent}60`, lineHeight: 1.6, boxShadow: `0 0 18px ${ansAccent}22` }}
            />
          </div>

          <PBtn col={ansAccent} onClick={handleSubmitAnswer}>
            {state.curAns + 1 < pc ? 'Done — pass the phone →' : 'All answered — start voting!'}
          </PBtn>
        </div>
      )}

      {/* ════ VOTE HANDOFF ════ */}
      {state.phase === 'vote_handoff' && (
        <LockScreen
          name={voterName} color={voteAccent}
          sub={`Voting · ${state.curVoter + 1} of ${pc}`}
          btnLabel="Show Answers & Vote →"
          onReady={handleShowVote}
        />
      )}

      {/* ════ VOTE CAST ════ */}
      {state.phase === 'vote_cast' && (
        <div style={{ ...S.card, animation: 'slideR .3s ease both' }}>

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{
                background: `linear-gradient(135deg, ${voteAccent}30, ${voteAccent}10)`,
                border: `2px solid ${voteAccent}`, borderRadius: 20,
                padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: `0 0 22px ${voteAccent}38`,
              }}>
                <div style={{ ...D.avatar(voteAccent, 26), fontSize: 11 }}>{voterName?.[0]?.toUpperCase()}</div>
                <span style={{ fontSize: 14, fontWeight: 800, color: voteAccent }}>{voterName}'s vote</span>
                <span style={{ fontSize: 10, color: voteAccent + '80', letterSpacing: 1 }}>({state.curVoter + 1}/{pc})</span>
              </div>
            </div>
            <p style={{ color: '#ffffff55', fontSize: 13, fontWeight: 600 }}>
              {state.mode === 'doublecross'
                ? 'Tap to pick your 2 suspects — both could be imposters!'
                : 'Tap who you think has the different question'}
            </p>
          </div>

          <p style={S.lbl}>Everyone's Answers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {state.players.map((player) => {
              const col    = COLORS[player.colorIdx];
              const picks  = state.mode === 'doublecross' ? (curVoterPicks || []) : (curVoterPicks ? [curVoterPicks] : []);
              const picked = picks.includes(player.name);
              const isSelf = player.name === voterName;
              return (
                <div key={player.id} onClick={() => { if (!isSelf) handleCastVote(player.name); }} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 15px', borderRadius: 16,
                  cursor:     isSelf ? 'default' : 'pointer',
                  background: picked ? `linear-gradient(135deg, ${col}28, ${col}10)` : 'linear-gradient(135deg, #ffffff0e, #ffffff05)',
                  border:     `2px solid ${picked ? col : isSelf ? '#ffffff0d' : '#ffffff18'}`,
                  boxShadow:  picked ? `0 0 24px ${col}55` : 'none',
                  transition: 'all .18s', opacity: isSelf ? 0.5 : 1,
                }}>
                  <div style={{ ...D.avatar(col), boxShadow: picked ? `0 0 16px ${col}70` : `0 0 8px ${col}30` }}>
                    {player.name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: picked ? col : col + 'cc' }}>
                      {player.name}{isSelf ? ' (you)' : ''}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 14, color: isSelf ? '#ffffff40' : '#ffffffd0', fontStyle: isSelf ? 'italic' : 'normal' }}>
                      {state.answers[player.name] || '…'}
                    </p>
                  </div>
                  {!isSelf && (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0, alignSelf: 'center',
                      background: picked ? col : '#ffffff12', border: `2px solid ${picked ? col : '#ffffff22'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 900, boxShadow: picked ? `0 0 14px ${col}` : 'none', transition: 'all .18s',
                    }}>{picked ? '✓' : ''}</div>
                  )}
                </div>
              );
            })}
          </div>

          {state.mode === 'doublecross' && (curVoterPicks || []).length < 2 && (
            <div style={{
              background: '#FF9F0A18', border: '1px solid #FF9F0A45', borderRadius: 10,
              padding: '8px 14px', marginBottom: 12, textAlign: 'center',
              fontSize: 12, color: '#FF9F0A', fontWeight: 800, animation: 'pulse 1.5s infinite',
            }}>
              Select {2 - (curVoterPicks || []).length} more suspect{(curVoterPicks || []).length === 1 ? '' : 's'}
            </div>
          )}

          <PBtn col={voteAccent}
            dis={state.mode === 'doublecross' ? (curVoterPicks || []).length !== 2 : curVoterPicks == null}
            onClick={handleConfirmVote}>
            {state.curVoter + 1 < pc ? 'Confirm Vote — pass the phone →' : 'Confirm Vote — see results!'}
          </PBtn>
        </div>
      )}

      {/* ════ REVEAL ════ */}
      {state.phase === 'reveal' && (
        <div style={{ ...S.card, animation: 'fadeUp .35s ease both' }}>

          {/* Stage 0 — Suspense spinner */}
          {state.revealStage === 0 && (
            <div style={{ textAlign: 'center', padding: '44px 20px', animation: 'fadeIn .4s ease' }}>
              <div style={{ fontSize: 72, marginBottom: 20, display: 'inline-block', animation: 'spin 2s linear infinite' }}>🎭</div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: '#ffffff80', marginBottom: 8 }}>
                {impNames.length > 1 ? 'Revealing the imposters…' : 'Revealing the imposter…'}
              </h2>
              <p style={{ color: '#ffffff40', fontSize: 14 }}>
                {impNames.length > 1 ? 'Two people had a different question…' : 'One person had a different question…'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#ffffff40',
                    animation: `pulse 1s ease-in-out ${i * 0.33}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Stage 1+ — Win/lose banner with name */}
          {state.revealStage >= 1 && (
            <div style={{
              background: groupWon
                ? 'linear-gradient(135deg, #30D15822, #30D15808)'
                : 'linear-gradient(135deg, #FF2D5522, #FF2D5508)',
              border:       `2px solid ${groupWon ? '#30D158' : '#FF2D55'}`,
              borderRadius: 22, padding: '24px 20px', textAlign: 'center', marginBottom: 16,
              boxShadow:    `0 0 60px ${groupWon ? '#30D15840' : '#FF2D5540'}`,
              animation:    'popIn .5s ease both',
            }}>
              <div style={{ fontSize: 52, marginBottom: 8, animation: groupWon ? 'bounce .8s ease-in-out infinite' : 'none' }}>
                {groupWon ? '🎉' : '😈'}
              </div>
              <p style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: '#ffffff50', fontWeight: 800, marginBottom: 8 }}>
                {impNames.length > 1 ? 'The imposters were' : 'The imposter was'}
              </p>
              <h2 style={{
                fontSize: impNames.length > 1 ? 30 : 44, fontWeight: 900,
                margin: '0 0 12px', letterSpacing: '-1px',
                color: groupWon ? '#30D158' : '#FF2D55',
                textShadow: `0 0 60px ${groupWon ? '#30D158aa' : '#FF2D55aa'}`,
                animation: 'revealName .7s ease both, glow 2s ease-in-out 1s infinite',
              }}>
                {impNames.join(' & ')}
              </h2>
              <div style={{ background: '#ffffff0c', borderRadius: 12, padding: '12px 14px', marginBottom: 10, textAlign: 'left' }}>
                <p style={{ fontSize: 9, color: '#ffffff45', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 800, marginBottom: 5 }}>Their question was</p>
                <p style={{ fontSize: 14, fontStyle: 'italic', color: '#ffffffcc', lineHeight: 1.5 }}>"{state.qPair?.b}"</p>
              </div>
              <p style={{ fontSize: 11, color: '#ffffff45', marginBottom: 3 }}>Everyone else got:</p>
              <p style={{ fontSize: 13, fontStyle: 'italic', color: '#ffffff70' }}>"{state.qPair?.a}"</p>
              <p style={{ fontSize: 22, fontWeight: 900, marginTop: 16, color: groupWon ? '#30D158' : '#FF2D55' }}>
                {groupWon ? 'Group wins! 🎊' : 'Imposter escapes! 😂'}
              </p>
            </div>
          )}

          {/* Stage 2+ — Vote breakdown */}
          {state.revealStage >= 2 && (
            <div style={{ animation: 'fadeUp .4s ease both' }}>
              <p style={S.lbl}>Who voted for whom</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {state.players.map((player, i) => {
                  const vFor = state.mode === 'doublecross'
                    ? (state.votes[player.name] || []).join(' & ') || '—'
                    : state.votes[player.name] || '—';
                  const correct = state.mode === 'doublecross'
                    ? (state.votes[player.name] || []).some(v => impNames.includes(v))
                    : impNames.includes(state.votes[player.name]);
                  const col = COLORS[player.colorIdx];
                  return (
                    <div key={player.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      background:   correct ? '#30D15814' : '#ffffff08',
                      border:       `1.5px solid ${correct ? '#30D15848' : '#ffffff12'}`,
                      borderRadius: 12,
                      animation:    'stagger .35s ease both',
                      animationDelay: `${i * 55}ms`,
                    }}>
                      <div style={{ ...D.avatar(col, 28), fontSize: 11 }}>{player.name[0]?.toUpperCase()}</div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#ffffffcc' }}>{player.name}</span>
                      <span style={{ fontSize: 12, color: '#ffffff45' }}>→</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: correct ? '#30D158' : '#ffffffcc' }}>{vFor}</span>
                      <span style={{ fontSize: 16 }}>{correct ? '✅' : '❌'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stage 3 — Leaderboard + next button */}
          {state.revealStage >= 3 && (
            <div style={{ animation: 'fadeUp .4s ease both' }}>
              <div style={S.hr} />
              {state.questionsCycled && (
                <p style={{ color: '#FF9F0A80', fontSize: 11, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' }}>
                  🔄 All questions used — cycling back through the deck
                </p>
              )}
              <p style={{ ...S.lbl, marginBottom: 12 }}>Leaderboard · Round {state.round}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                {Object.entries(state.scores).sort((a, b) => b[1] - a[1]).map(([name, pts], i) => {
                  const player = state.players.find(p => p.name === name);
                  return (
                    <ScoreRow key={name} name={name} score={pts} rank={i + 1}
                      roundPts={state.roundPts[name] || 0}
                      color={COLORS[(player?.colorIdx ?? i) % COLORS.length]}
                      delay={i * 65}
                    />
                  );
                })}
              </div>
              <PBtn col={state.round >= state.totalRounds ? '#30D158' : '#0A84FF'} onClick={handleNextRound}>
                {state.round >= state.totalRounds ? '🏆 Final Results →' : 'Next Round →'}
              </PBtn>
            </div>
          )}
        </div>
      )}

      {/* ════ FINAL ════ */}
      {state.phase === 'final' && (() => {
        const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
        const winner = sorted[0]?.[0];
        const wPlayer = state.players.find(p => p.name === winner);
        const wCol   = COLORS[(wPlayer?.colorIdx ?? 0) % COLORS.length];
        return (
          <div style={{ ...S.card, animation: 'fadeUp .4s ease both' }}>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{
                fontSize: 70, display: 'inline-block', marginBottom: 4,
                filter: 'drop-shadow(0 0 32px #FFD60Aaa)',
                animation: 'crown 2s ease-in-out infinite',
              }}>🏆</div>
              <h1 style={{
                fontSize: 46, fontWeight: 900, letterSpacing: '-2px',
                background: 'linear-gradient(135deg, #FFD60A, #FF9F0A, #FF6B35)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Final Results</h1>
              <p style={{ color: '#ffffff40', fontSize: 11, marginTop: 6, letterSpacing: 3, textTransform: 'uppercase' }}>
                {state.totalRounds} round{state.totalRounds !== 1 ? 's' : ''} complete
              </p>
            </div>

            {/* Winner callout */}
            <div style={{
              background: `linear-gradient(135deg, ${wCol}28, ${wCol}10)`,
              border: `2px solid ${wCol}`, borderRadius: 22, padding: '22px',
              textAlign: 'center', marginBottom: 18,
              boxShadow: `0 0 55px ${wCol}48`, animation: 'popIn .5s ease both',
            }}>
              <p style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: wCol + '88', fontWeight: 800, marginBottom: 8 }}>Winner</p>
              <div style={{
                width: 62, height: 62, borderRadius: '50%', margin: '0 auto 10px',
                background: wCol + '30', border: `3px solid ${wCol}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 900, color: wCol, boxShadow: `0 0 28px ${wCol}70`,
              }}>{winner?.[0]?.toUpperCase()}</div>
              <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px' }}>{winner} 👑</h2>
              <p style={{ fontSize: 28, fontWeight: 900, color: wCol, marginTop: 6 }}>
                {sorted[0]?.[1]} pt{sorted[0]?.[1] !== 1 ? 's' : ''}
              </p>
            </div>

            <p style={S.lbl}>Full Standings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
              {sorted.map(([name, pts], i) => {
                const player = state.players.find(p => p.name === name);
                return (
                  <ScoreRow key={name} name={name} score={pts} rank={i + 1}
                    roundPts={0}
                    color={COLORS[(player?.colorIdx ?? i) % COLORS.length]}
                    delay={i * 80}
                  />
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button onClick={handleBeginGame} style={D.btn('grad')}>Play Again (Same Players) →</button>
              <button onClick={() => { SoundEngine.click(); dispatch({ type: 'RESET_TO_SETUP' }); }} style={S.ghostBtn}>
                Change Settings
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── Mount ── */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
