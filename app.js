/* ════════════════════════════════════════════════════
   app.js  —  Outlier Party Game
   React UI. Depends on: gameEngine.js, sounds.js
════════════════════════════════════════════════════ */
const { useState, useReducer, useEffect, useRef, useCallback, memo } = React;

/* ──────────────────────────────────────
   CONSTANTS
────────────────────────────────────── */
const COLORS = [
  '#FF6B6B', '#FF9F45', '#FFCB47', '#56CFB2',
  '#4DA6FF', '#C084FC', '#F472B6', '#34D399',
  '#FB923C', '#818CF8',
];

const MODES = [
  { id: 'clueless',    emoji: '🤷', name: 'Clueless',     color: '#4DA6FF', tagline: 'Nobody knows — not even the outlier' },
  { id: 'undercover',  emoji: '🕵️', name: 'Undercover',  color: '#FF9F45', tagline: 'The outlier knows — can they fool everyone?' },
  { id: 'doublecross', emoji: '🎭', name: 'Double Cross', color: '#FF6B6B', tagline: 'Two outliers, neither knows the other · 3+ players', min: 3 },
  { id: 'reverse',     emoji: '🔄', name: 'Reverse',      color: '#56CFB2', tagline: 'You get a word — write a question it answers. Find the pair.' },
];

const MODIFIERS = [
  { id: 'numbers',     emoji: '🔢', label: 'Numbers Only',        rule: 'Your answer must only contain numbers.' },
  { id: 'emojis',      emoji: '😏', label: 'Emojis Only',         rule: 'Your answer must only use emojis. No words.' },
  { id: 'specific',    emoji: '🔬', label: 'Oddly Specific',      rule: 'Be as specific as humanly possible.' },
  { id: 'vague',       emoji: '🌫️', label: 'Stay Vague',          rule: 'Be as vague as possible — no names, no details.' },
  { id: 'oneword',     emoji: '1️⃣',  label: 'One Word',            rule: 'Your entire answer must be exactly one word.' },
  { id: 'threewords',  emoji: '3️⃣',  label: 'Three Words',         rule: 'Your answer must be exactly three words. No more, no less.' },
  { id: 'allcaps',     emoji: '📢', label: 'All Caps',             rule: 'WRITE YOUR ENTIRE ANSWER IN ALL CAPS.' },
  { id: 'question',    emoji: '❓', label: 'Answer in a Question', rule: 'Your answer must be phrased as a question. Jeopardy-style.' },
  { id: 'thirdperson', emoji: '🫵', label: 'Third Person',        rule: 'Refer to yourself in the third person. No "I" or "me".' },
  { id: 'novowels',    emoji: '🚫', label: 'No Vowels',            rule: 'Write your answer without any vowels. Cnsnnnts nly.' },
  { id: 'movietitle',  emoji: '🎬', label: 'Movie Title',          rule: 'Format your answer like a movie title. Capitalise Each Word.' },
  { id: 'rhyme',       emoji: '🎵', label: 'Make It Rhyme',        rule: 'Your answer must rhyme — at least the last two words.' },
];

const QUESTION_PACKS = [
  { id: 'main',         label: 'Classic',      emoji: '🎲', file: 'questions/Main.JSON',        desc: 'Everyday questions about you', count: 52 },
  { id: 'players',      label: 'About Us',     emoji: '👥', file: 'questions/Players.JSON',      desc: 'Questions featuring a player in the room', count: 54, hasPlayer: true },
  { id: 'hypothetical', label: 'Hypothetical', emoji: '🤔', file: 'questions/Hypothetical.JSON', desc: 'What would you do if…', count: 64 },
  { id: 'deep',         label: 'Deep Cuts',    emoji: '💭', file: 'questions/Deep.JSON',         desc: 'Meaningful & introspective', count: 64 },
  { id: 'spicy',        label: 'Spicy',        emoji: '🌶️', file: 'questions/Spicy.JSON',        desc: 'Unpopular opinions & hot takes', count: 62, notice: 'Not NSFW — just unpopular opinions & takes people might disagree with.' },
  { id: 'nostalgia',    label: 'Nostalgia',    emoji: '📼', file: 'questions/Nostalgia.JSON',    desc: 'Childhood memories & throwbacks', count: 79 },
  { id: 'numbers',      label: 'Numbers',      emoji: '🔢', file: 'questions/Numbers.JSON',      desc: 'All answers are numbers', count: 57 },
  { id: 'sentences',    label: 'Sentences',    emoji: '✏️', file: 'questions/Sentences.JSON',    desc: 'Complete the sentence', count: 89 },
  { id: 'reverse',      label: 'Reverse',      emoji: '🔄', file: 'questions/Reverse.JSON',      desc: 'Words to write questions for — best with Reverse mode', count: 20 },
];

const ANSWER_CHAR_LIMIT = 80;
const EMPTY_VARIANTS = Array(10).fill('');

/* ──────────────────────────────────────
   HAPTIC UTILITY
────────────────────────────────────── */
function haptic(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

/* ──────────────────────────────────────
   CANVAS HELPERS
────────────────────────────────────── */
function ctxWrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '', curY = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY); line = word; curY += lineHeight;
    } else { line = test; }
  }
  if (line) { ctx.fillText(line, x, curY); curY += lineHeight; }
  return curY;
}
function ctxRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ──────────────────────────────────────
   INITIAL STATE
────────────────────────────────────── */
const INITIAL_STATE = {
  phase: 'setup', mode: 'clueless', totalRounds: 3,
  timerEnabled: false, timerSeconds: 30,
  players: [
    { id: generateId(), name: '', colorIdx: 0 },
    { id: generateId(), name: '', colorIdx: 1 },
  ],
  nameError: '',
  round: 1, scores: {}, usedIdx: [], questionsCycled: false,
  qOrder: [], curAns: 0, qPair: null, impIdxs: [],
  answers: {}, writing: '', playerVariants: null, playerSubject: null,
  voteOrder: [], curVoter: 0, votes: {},
  roundPts: {}, confetti: false, revealStage: 0, groupWon: false,
  roundModifier: null, lastModifierIdx: -1,
};

/* ──────────────────────────────────────
   REDUCER
────────────────────────────────────── */
function reducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':          return { ...state, mode: action.mode };
    case 'SET_ROUNDS':        return { ...state, totalRounds: action.rounds };
    case 'TOGGLE_TIMER':      return { ...state, timerEnabled: !state.timerEnabled };
    case 'SET_TIMER_SECONDS': return { ...state, timerSeconds: action.seconds };
    case 'ADD_PLAYER': {
      if (state.players.length >= 10) return state;
      const idx = state.players.length;
      return { ...state, players: [...state.players, { id: generateId(), name: '', colorIdx: idx % COLORS.length }] };
    }
    case 'REMOVE_PLAYER': {
      if (state.players.length <= 2) return state;
      const remaining = state.players.filter(p => p.id !== action.id).map((p, i) => ({ ...p, colorIdx: i % COLORS.length }));
      return { ...state, players: remaining, nameError: '' };
    }
    case 'UPDATE_PLAYER_NAME':
      return { ...state, nameError: '', players: state.players.map(p => p.id === action.id ? { ...p, name: action.name } : p) };
    case 'SET_NAME_ERROR': return { ...state, nameError: action.error };
    case 'BEGIN_GAME': {
      const { validPlayers, roundData, modifier, modifierIdx } = action;
      const scores = {};
      validPlayers.forEach(p => { scores[p.name] = 0; });
      return {
        ...state, players: validPlayers, scores,
        usedIdx: roundData.newUsed, round: 1,
        questionsCycled: roundData.isCycling, qPair: roundData.qPair,
        qOrder: roundData.qOrder, impIdxs: roundData.impIdxs,
        playerVariants: roundData.playerVariants, playerSubject: roundData.playerSubject,
        voteOrder: roundData.voteOrder,
        curAns: 0, answers: {}, writing: '', curVoter: 0, votes: {}, roundPts: {},
        confetti: false, groupWon: false, revealStage: 0, nameError: '',
        roundModifier: modifier ?? null, lastModifierIdx: modifierIdx ?? -1,
        phase: 'q_handoff',
      };
    }
    case 'SET_PHASE':    return { ...state, phase: action.phase };
    case 'SET_WRITING':  return { ...state, writing: action.value };
    case 'SUBMIT_ANSWER': {
      const playerIdx = state.qOrder[state.curAns];
      const playerName = state.players[playerIdx]?.name || '…';
      const answer = state.writing.trim() || '…';
      const newAnswers = { ...state.answers, [playerName]: answer };
      const nextAns = state.curAns + 1;
      if (nextAns >= state.players.length) return { ...state, answers: newAnswers, writing: '', phase: 'vote_handoff' };
      return { ...state, answers: newAnswers, writing: '', curAns: nextAns, phase: 'q_handoff' };
    }
    case 'CAST_VOTE': {
      const voterName = state.voteOrder[state.curVoter];
      let newVotes;
      if (state.mode === 'doublecross') {
        const cur = state.votes[voterName] || [];
        let next;
        if (cur.includes(action.suspect)) next = cur.filter(x => x !== action.suspect);
        else if (cur.length < 2) next = [...cur, action.suspect];
        else next = [cur[1], action.suspect];
        newVotes = { ...state.votes, [voterName]: next };
      } else {
        newVotes = { ...state.votes, [voterName]: action.suspect };
      }
      return { ...state, votes: newVotes };
    }
    case 'CONFIRM_VOTE': {
      const nextVoter = state.curVoter + 1;
      if (nextVoter < state.players.length) return { ...state, curVoter: nextVoter, phase: 'vote_handoff' };
      const playerNames = state.players.map(p => p.name);
      const impNames = state.impIdxs.map(i => state.players[i]?.name).filter(Boolean);
      const earned = computeRoundScores(state.votes, impNames, state.mode, playerNames);
      const newScores = {};
      playerNames.forEach(n => { newScores[n] = (state.scores[n] || 0) + (earned[n] || 0); });
      const won = checkGroupWon(state.votes, impNames, state.mode);
      return { ...state, roundPts: earned, scores: newScores, groupWon: won, phase: 'reveal', revealStage: 0 };
    }
    case 'SET_REVEAL_STAGE': return { ...state, revealStage: action.stage };
    case 'SET_CONFETTI':     return { ...state, confetti: action.value };
    case 'NEXT_ROUND': {
      const { roundData, newRound, modifier, modifierIdx } = action;
      return {
        ...state, round: newRound, usedIdx: roundData.newUsed,
        questionsCycled: roundData.isCycling, qPair: roundData.qPair,
        qOrder: roundData.qOrder, impIdxs: roundData.impIdxs,
        playerVariants: roundData.playerVariants, playerSubject: roundData.playerSubject,
        voteOrder: roundData.voteOrder,
        curAns: 0, answers: {}, writing: '', curVoter: 0, votes: {}, roundPts: {},
        confetti: false, groupWon: false, revealStage: 0,
        roundModifier: modifier ?? null, lastModifierIdx: modifierIdx ?? -1,
        phase: 'q_handoff',
      };
    }
    case 'GO_FINAL':   return { ...state, phase: 'final' };
    case 'RESET_TO_SETUP':
      return {
        ...INITIAL_STATE,
        players: state.players.map((p, i) => ({ ...p, colorIdx: i % COLORS.length })),
        mode: state.mode, totalRounds: state.totalRounds,
        timerEnabled: state.timerEnabled, timerSeconds: state.timerSeconds,
      };
    default: return state;
  }
}

/* ──────────────────────────────────────
   STYLE TOKENS
────────────────────────────────────── */
const T = {
  bg: '#070810', surface: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.14)', text: '#F0F4FF',
  textMid: 'rgba(240,244,255,0.55)', textDim: 'rgba(240,244,255,0.28)',
  r: 16, rl: 22, rx: 28,
};
const S = {
  page: { minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 18px 40px', position: 'relative', overflow: 'hidden' },
  card: { width: '100%', maxWidth: 468 },
  lbl: { color: T.textDim, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', display: 'block', marginBottom: 10, fontWeight: 700 },
  inp: { width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: '13px 16px', color: T.text, fontSize: 15, outline: 'none', fontFamily: 'inherit', transition: 'border-color .18s, box-shadow .18s' },
};
const D = {
  btn: (col, ghost = false, sm = false, dis = false) => ({
    display: 'block', width: '100%', padding: sm ? '11px 16px' : '15px 20px',
    borderRadius: sm ? 13 : 16, border: ghost ? `1.5px solid ${col}50` : 'none',
    background: ghost ? 'transparent' : col === 'grad' ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' : `linear-gradient(135deg, ${col} 0%, ${col}cc 100%)`,
    color: ghost ? col : '#fff', fontSize: sm ? 13 : 15, fontWeight: 800, letterSpacing: 0.3,
    textShadow: ghost ? 'none' : '0 1px 6px rgba(0,0,0,.4)',
    boxShadow: dis || ghost ? 'none' : col === 'grad' ? '0 4px 22px rgba(99,102,241,.45)' : `0 4px 22px ${col}44`,
    opacity: dis ? 0.28 : 1, cursor: dis ? 'not-allowed' : 'pointer',
    transition: 'opacity .15s, transform .12s, box-shadow .2s', fontFamily: 'inherit',
  }),
  avatar: (color, size = 36) => ({
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: color + '18', border: `1.5px solid ${color}55`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: Math.floor(size * 0.38), fontWeight: 800, color,
  }),
  modePill: (color, selected) => ({
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
    borderRadius: T.rl, border: `1px solid ${selected ? color + '55' : T.border}`,
    background: selected ? color + '12' : T.surface,
    boxShadow: selected ? `0 0 0 1px ${color}28, 0 6px 24px ${color}18` : 'none',
    transition: 'all .2s', textAlign: 'left', width: '100%', fontFamily: 'inherit', cursor: 'pointer',
  }),
};

/* ──────────────────────────────────────
   REUSABLE COMPONENTS
────────────────────────────────────── */
const Confetti = memo(function Confetti({ active }) {
  const ref = useRef(); const raf = useRef();
  useEffect(() => {
    if (!active) return;
    const c = ref.current; const ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    let ps = Array.from({ length: 220 }, () => ({
      x: Math.random() * c.width, y: -14, r: Math.random() * 9 + 3,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
      sp: Math.random() * 5 + 2, spin: Math.random() * 0.18 - 0.09,
      ang: Math.random() * Math.PI * 2, wb: Math.random() * 14,
      wa: Math.random() * Math.PI * 2, ws: Math.random() * 0.07 + 0.02,
    }));
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => {
        p.y += p.sp; p.ang += p.spin; p.wa += p.ws;
        ctx.save(); ctx.translate(p.x + Math.sin(p.wa) * p.wb, p.y); ctx.rotate(p.ang);
        ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.8); ctx.restore();
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

const BlobBG = memo(function BlobBG({ accent = '#6366F1' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{ position: 'absolute', top: '-25%', left: '-10%', width: '65vw', height: '65vw', borderRadius: '50%', background: `radial-gradient(circle, ${accent}18 0%, transparent 68%)`, animation: 'drift1 14s ease-in-out infinite', transition: 'background 1.4s' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-8%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 68%)', animation: 'drift2 18s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '45%', right: '5%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 68%)', animation: 'drift3 12s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.018, backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
    </div>
  );
});

const PBar = memo(function PBar({ total, current, accent }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 4, flex: 1, maxWidth: 28, borderRadius: 99, background: i < current ? 'rgba(255,255,255,0.55)' : i === current ? accent : 'rgba(255,255,255,0.1)', boxShadow: i === current ? `0 0 8px ${accent}` : 'none', transition: 'all .35s' }} />
      ))}
    </div>
  );
});

const ScoreRow = memo(function ScoreRow({ name, score, roundPts, rank, color, delay = 0 }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: rank === 1 ? `${color}14` : 'rgba(255,255,255,0.04)', border: `1px solid ${rank === 1 ? color + '55' : T.border}`, borderRadius: T.r, boxShadow: rank === 1 ? `0 0 0 1px ${color}22, 0 6px 24px ${color}28` : 'none', animation: 'stagger .4s ease both', animationDelay: `${delay}ms` }}>
      <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{rank <= 3 ? medals[rank - 1] : rank}</span>
      <div style={D.avatar(color)}>{name[0]?.toUpperCase()}</div>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: rank === 1 ? T.text : T.textMid }}>{name}</span>
      {roundPts > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: '#34D399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.28)', borderRadius: 8, padding: '3px 9px', animation: 'popIn .3s ease both', animationDelay: `${delay + 180}ms` }}>+{roundPts}</span>}
      <span style={{ fontSize: 22, fontWeight: 900, color: rank === 1 ? color : T.textMid }}>{score}</span>
      <span style={{ fontSize: 10, color: T.textDim, marginLeft: 2 }}>pts</span>
    </div>
  );
});

const LockScreen = memo(function LockScreen({ name, color, sub, btnLabel, onReady }) {
  return (
    <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', animation: 'fadeUp .32s ease both' }}>
      <div style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 20px', background: `${color}20`, border: `2px solid ${color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, boxShadow: `0 0 40px ${color}50, 0 0 80px ${color}18`, animation: 'lockBounce 1.8s ease-in-out infinite' }}>🔒</div>
      <p style={{ color: T.textDim, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>{sub || 'Pass the phone to'}</p>
      <h2 style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 6, color, textShadow: `0 0 40px ${color}80` }}>{name}</h2>
      <p style={{ color: T.textDim, fontSize: 13, marginBottom: 30 }}>Make sure nobody else is looking 👀</p>
      <button onClick={onReady} style={D.btn(color)}>{btnLabel}</button>
    </div>
  );
});

const TimerBar = memo(function TimerBar({ timeLeft, total, accent }) {
  const pct = (timeLeft / total) * 100;
  const isWarning = timeLeft <= 5; const isDanger = timeLeft <= 3;
  const barColor = isDanger ? '#FF6B6B' : isWarning ? '#FF9F45' : accent;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: T.textDim, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Time</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: barColor, animation: isWarning ? 'timerPulse .8s ease-in-out infinite' : 'none' }}>{timeLeft}s</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div className="timer-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}99, ${barColor})`, boxShadow: `0 0 8px ${barColor}` }} />
      </div>
    </div>
  );
});

const PBtn = memo(function PBtn({ col, ghost, sm, dis, onClick, children }) {
  return <button onClick={onClick} disabled={dis} style={D.btn(col, ghost, sm, dis)}>{children}</button>;
});

const ModifierBanner = memo(function ModifierBanner({ modifier }) {
  if (!modifier) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 12, background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.35)', marginBottom: 14, animation: 'popIn .3s ease both' }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{modifier.emoji}</span>
      <div>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#C084FC', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block' }}>{modifier.label}</span>
        <span style={{ fontSize: 13, color: 'rgba(192,132,252,0.85)', marginTop: 2, display: 'block', lineHeight: 1.4 }}>{modifier.rule}</span>
      </div>
    </div>
  );
});

/* ── Round Summary Card ── */
const RoundSummaryCard = memo(function RoundSummaryCard({ round, totalRounds, groupWon, impNames, qPair, answers, players, mode }) {
  const canvasRef = useRef(null);
  const isReverse = mode === 'reverse';
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !qPair) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 600; const PAD = 30;
    const answerRows = Math.ceil(players.length / 2);
    const H = Math.max(460, 310 + impNames.length * 44 + answerRows * 30 + 50);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    const impColor = groupWon ? '#34D399' : '#FF6B6B';
    const ACCENT = '#818CF8'; const TEXT = '#F0F4FF';
    const MID = 'rgba(240,244,255,0.55)'; const DIM = 'rgba(240,244,255,0.28)';
    ctx.fillStyle = '#0B0D1B'; ctx.fillRect(0, 0, W, H);
    const grd = ctx.createRadialGradient(W * 0.18, H * 0.22, 0, W * 0.18, H * 0.22, W * 0.65);
    grd.addColorStop(0, 'rgba(99,102,241,0.13)'); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctxRoundRect(ctx, 0.5, 0.5, W - 1, H - 1, 18); ctx.stroke();
    let y = PAD + 14;
    ctx.font = '800 20px system-ui, -apple-system, sans-serif'; ctx.fillStyle = ACCENT;
    ctx.fillText('OUTLIER', PAD, y);
    const roundStr = `Round ${round} of ${totalRounds}`;
    ctx.font = '700 11px system-ui, -apple-system, sans-serif'; ctx.fillStyle = DIM;
    ctx.fillText(roundStr, W - PAD - ctx.measureText(roundStr).width, y);
    const modeNames = { clueless: 'Clueless', undercover: 'Undercover', doublecross: 'Double Cross', reverse: 'Reverse' };
    ctx.font = '600 10px system-ui, -apple-system, sans-serif'; ctx.fillStyle = 'rgba(240,244,255,0.2)';
    ctx.fillText(modeNames[mode] || mode, PAD, y + 17); y += 38;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); y += 18;
    ctx.font = '700 9px system-ui, -apple-system, sans-serif'; ctx.fillStyle = DIM;
    ctx.fillText(isReverse ? 'THE MATCHING PAIR' : impNames.length > 1 ? 'THE OUTLIERS' : 'THE OUTLIER', PAD, y); y += 20;
    ctx.font = '800 24px system-ui, -apple-system, sans-serif'; ctx.fillStyle = impColor;
    ctx.fillText(impNames.join(' & '), PAD, y);
    const outLabel = isReverse ? (groupWon ? 'IDENTIFIED' : 'ESCAPED') : (groupWon ? 'CAUGHT' : 'ESCAPED');
    ctx.font = '800 10px system-ui, -apple-system, sans-serif';
    const bW = ctx.measureText(outLabel).width + 18, bH = 22, bX = W - PAD - bW, bY = y - 18;
    ctx.fillStyle = groupWon ? 'rgba(52,211,153,0.14)' : 'rgba(255,107,107,0.14)';
    ctxRoundRect(ctx, bX, bY, bW, bH, 6); ctx.fill();
    ctx.strokeStyle = groupWon ? 'rgba(52,211,153,0.45)' : 'rgba(255,107,107,0.45)'; ctx.lineWidth = 1;
    ctxRoundRect(ctx, bX, bY, bW, bH, 6); ctx.stroke();
    ctx.fillStyle = impColor; ctx.fillText(outLabel, bX + 9, bY + 15); y += 14;
    ctx.font = '600 9px system-ui, -apple-system, sans-serif'; ctx.fillStyle = DIM;
    ctx.fillText(isReverse ? 'THEIR SHARED WORD' : 'THEIR QUESTION', PAD, y); y += 16;
    ctx.font = 'italic 12px system-ui, -apple-system, sans-serif'; ctx.fillStyle = MID;
    y = ctxWrapText(ctx, `"${qPair.b}"`, PAD + 4, y, W - PAD * 2 - 8, 18); y += 4;
    impNames.forEach(name => {
      const ans = answers[name];
      if (!ans || ans === '…') return;
      ctx.font = '700 9px system-ui, -apple-system, sans-serif'; ctx.fillStyle = DIM;
      ctx.fillText(`${name.toUpperCase()}'S ANSWER`, PAD, y); y += 16;
      ctx.font = '700 13px system-ui, -apple-system, sans-serif'; ctx.fillStyle = impColor;
      y = ctxWrapText(ctx, `"${ans.length > 60 ? ans.slice(0, 60) + '…' : ans}"`, PAD + 4, y, W - PAD * 2 - 8, 18); y += 6;
    });
    y += 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); y += 16;
    if (!isReverse) {
      ctx.font = '700 9px system-ui, -apple-system, sans-serif'; ctx.fillStyle = DIM;
      ctx.fillText('EVERYONE ELSE GOT', PAD, y); y += 16;
      ctx.font = 'italic 12px system-ui, -apple-system, sans-serif'; ctx.fillStyle = MID;
      y = ctxWrapText(ctx, `"${qPair.a}"`, PAD + 4, y, W - PAD * 2 - 8, 18); y += 10;
    }
    ctx.font = '700 9px system-ui, -apple-system, sans-serif'; ctx.fillStyle = DIM;
    ctx.fillText('ALL ANSWERS', PAD, y); y += 14;
    const col1X = PAD, col2X = W / 2 + 6;
    let col = 0, baseY = y;
    players.forEach(p => {
      const isImp = impNames.includes(p.name);
      const ans = answers[p.name] || '…';
      const xPos = col % 2 === 0 ? col1X : col2X;
      const rowY = baseY + Math.floor(col / 2) * 30;
      const dotColor = isImp ? impColor : COLORS[p.colorIdx % COLORS.length];
      ctx.beginPath(); ctx.arc(xPos + 5, rowY - 3, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor; ctx.fill();
      ctx.font = '700 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isImp ? impColor : TEXT;
      ctx.fillText(p.name, xPos + 15, rowY);
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isImp ? `${impColor}bb` : MID;
      ctx.fillText(`"${ans.length > 22 ? ans.slice(0, 22) + '…' : ans}"`, xPos + 15, rowY + 14);
      col++;
    });
    y = baseY + Math.ceil(players.length / 2) * 30 + 10;
    ctx.font = '600 9px system-ui, -apple-system, sans-serif'; ctx.fillStyle = 'rgba(240,244,255,0.13)';
    ctx.fillText('outlier · pass-the-phone party game', PAD, H - 14);
  }, [round, totalRounds, groupWon, impNames, qPair, answers, players, mode]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    haptic([30, 20, 50]); SoundEngine.click();
    const a = document.createElement('a');
    a.download = `outlier-round-${round}.png`; a.href = canvas.toDataURL('image/png'); a.click();
  }, [round]);

  return (
    <div style={{ marginBottom: 18 }}>
      <p style={S.lbl}>Round Card</p>
      <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 14, display: 'block', border: `1px solid ${T.border}` }} />
      <button onClick={handleDownload} style={{ ...D.btn('#818CF8', true, true), marginTop: 10 }}>↓ Save as Image</button>
    </div>
  );
});

/* ──────────────────────────────────────
   SETUP SUB-PAGES
────────────────────────────────────── */

/* ── Settings Page ── */
const SettingsPage = memo(function SettingsPage({ state, dispatch, activePacks, togglePack, modifiersEnabled, setModifiersEnabled, customCount, onBack }) {
  const mInfo = MODES.find(m => m.id === state.mode) || MODES[0];
  return (
    <div style={{ ...S.card, animation: 'fadeUp .28s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: '50%', border: `1px solid ${T.border}`, background: T.surface, color: T.textMid, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>←</button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>Settings</h2>
          <p style={{ color: T.textDim, fontSize: 12, margin: 0 }}>Mode, rounds, packs & more</p>
        </div>
      </div>

      {/* Mode */}
      <p style={S.lbl}>Game Mode</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {MODES.map(m => {
          const sel = state.mode === m.id;
          return (
            <button key={m.id} onClick={() => { SoundEngine.click(); haptic(20); dispatch({ type: 'SET_MODE', mode: m.id }); }} style={D.modePill(m.color, sel)}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{m.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: sel ? m.color : T.text }}>{m.name}</span>
                  {m.min && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: m.color, background: m.color + '18', border: `1px solid ${m.color}40`, borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase' }}>3+</span>}
                </div>
                <span style={{ fontSize: 12, color: T.textDim, lineHeight: 1.4 }}>{m.tagline}</span>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: sel ? m.color : 'rgba(255,255,255,0.07)', border: `1.5px solid ${sel ? m.color : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', boxShadow: sel ? `0 0 10px ${m.color}` : 'none', transition: 'all .18s' }}>{sel ? '✓' : ''}</div>
            </button>
          );
        })}
      </div>

      {/* Rounds */}
      <p style={S.lbl}>Rounds</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[3, 5, 7, 10].map(n => {
          const sel = state.totalRounds === n;
          return (
            <button key={n} onClick={() => { SoundEngine.click(); haptic(15); dispatch({ type: 'SET_ROUNDS', rounds: n }); }} style={{ flex: 1, padding: '13px 4px', borderRadius: 12, fontWeight: 900, fontSize: 16, border: `1px solid ${sel ? '#C084FC55' : T.border}`, background: sel ? 'rgba(192,132,252,0.12)' : T.surface, color: sel ? '#C084FC' : T.textMid, boxShadow: sel ? '0 0 0 1px rgba(192,132,252,0.2)' : 'none', transition: 'all .18s', fontFamily: 'inherit', cursor: 'pointer' }}>{n}</button>
          );
        })}
      </div>

      {/* Timer */}
      <p style={S.lbl}>Timer</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: T.r, marginBottom: 18, background: state.timerEnabled ? 'rgba(255,159,69,0.08)' : T.surface, border: `1px solid ${state.timerEnabled ? 'rgba(255,159,69,0.3)' : T.border}`, transition: 'all .2s' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: state.timerEnabled ? '#FF9F45' : T.text }}>⏱ Timer Mode</span>
          <span style={{ display: 'block', fontSize: 11, color: T.textDim, marginTop: 2 }}>{state.timerEnabled ? `${state.timerSeconds}s per question` : 'Players answer at their own pace'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {state.timerEnabled && (
            <div style={{ display: 'flex', gap: 4 }}>
              {[20, 30, 45, 60].map(s => {
                const sel = state.timerSeconds === s;
                return <button key={s} onClick={() => dispatch({ type: 'SET_TIMER_SECONDS', seconds: s })} style={{ padding: '4px 7px', borderRadius: 7, fontSize: 11, fontWeight: 800, border: `1px solid ${sel ? '#FF9F45' : T.border}`, background: sel ? 'rgba(255,159,69,0.18)' : 'transparent', color: sel ? '#FF9F45' : T.textMid, fontFamily: 'inherit', cursor: 'pointer' }}>{s}s</button>;
              })}
            </div>
          )}
          <button className="toggle-track" onClick={() => { haptic(20); dispatch({ type: 'TOGGLE_TIMER' }); }} style={{ background: state.timerEnabled ? '#FF9F45' : 'rgba(255,255,255,0.12)' }}>
            <div className="toggle-thumb" style={{ left: state.timerEnabled ? 21 : 3 }} />
          </button>
        </div>
      </div>

      {/* Modifiers */}
      <p style={S.lbl}>Modifiers</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: T.r, marginBottom: 22, background: modifiersEnabled ? 'rgba(192,132,252,0.08)' : T.surface, border: `1px solid ${modifiersEnabled ? 'rgba(192,132,252,0.3)' : T.border}`, transition: 'all .2s' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: modifiersEnabled ? '#C084FC' : T.text }}>🎲 Random Modifiers</span>
          <span style={{ display: 'block', fontSize: 11, color: T.textDim, marginTop: 2 }}>{modifiersEnabled ? 'A surprise rule added every round' : 'One surprise rule for everyone each round'}</span>
        </div>
        <button className="toggle-track" onClick={() => { haptic(20); setModifiersEnabled(v => !v); }} style={{ background: modifiersEnabled ? '#C084FC' : 'rgba(255,255,255,0.12)', flexShrink: 0 }}>
          <div className="toggle-thumb" style={{ left: modifiersEnabled ? 21 : 3 }} />
        </button>
      </div>

      {/* Question Packs */}
      <p style={S.lbl}>Question Packs</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
        {QUESTION_PACKS.map(pack => {
          const active = activePacks.includes(pack.id);
          const isOnlyOne = activePacks.length === 1 && active;
          return (
            <React.Fragment key={pack.id}>
              <button onClick={() => { if (!isOnlyOne) { haptic(15); togglePack(pack.id); } }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderRadius: pack.notice && active ? `${T.r}px ${T.r}px 0 0` : T.r, border: `1px solid ${active ? 'rgba(77,166,255,0.35)' : T.border}`, borderBottom: pack.notice && active ? 'none' : undefined, background: active ? 'rgba(77,166,255,0.08)' : T.surface, textAlign: 'left', width: '100%', fontFamily: 'inherit', cursor: isOnlyOne ? 'default' : 'pointer', opacity: isOnlyOne ? 0.7 : 1, transition: 'all .18s' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{pack.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: active ? '#4DA6FF' : T.text, marginBottom: 2 }}>{pack.label}</div>
                  <div style={{ fontSize: 11, color: T.textDim }}>{pack.desc} · <span style={{ color: active ? '#4DA6FF88' : T.textDim }}>{pack.count} questions</span></div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: active ? '#4DA6FF' : 'rgba(255,255,255,0.07)', border: `1.5px solid ${active ? '#4DA6FF' : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', transition: 'all .18s' }}>{active ? '✓' : ''}</div>
              </button>
              {pack.notice && active && (
                <div style={{ padding: '7px 13px', borderRadius: `0 0 ${T.r}px ${T.r}px`, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(77,166,255,0.35)', borderTop: 'none', fontSize: 11, color: 'rgba(251,191,36,0.8)', fontWeight: 600, lineHeight: 1.45 }}>⚠️ {pack.notice}</div>
              )}
            </React.Fragment>
          );
        })}

        {/* Custom pack toggle */}
        {customCount > 0 && (() => {
          const active = activePacks.includes('custom');
          const isOnlyOne = activePacks.length === 1 && active;
          return (
            <button onClick={() => { if (!isOnlyOne) { haptic(15); togglePack('custom'); } }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderRadius: T.r, border: `1px solid ${active ? 'rgba(192,132,252,0.35)' : T.border}`, background: active ? 'rgba(192,132,252,0.08)' : T.surface, textAlign: 'left', width: '100%', fontFamily: 'inherit', cursor: isOnlyOne ? 'default' : 'pointer', opacity: isOnlyOne ? 0.7 : 1, transition: 'all .18s' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>✏️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: active ? '#C084FC' : T.text, marginBottom: 2 }}>Custom</div>
                <div style={{ fontSize: 11, color: T.textDim }}>{customCount} question{customCount !== 1 ? 's' : ''} written by you</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: active ? '#C084FC' : 'rgba(255,255,255,0.07)', border: `1.5px solid ${active ? '#C084FC' : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', transition: 'all .18s' }}>{active ? '✓' : ''}</div>
            </button>
          );
        })()}
      </div>

      {state.mode === 'reverse' && (
        <div style={{ padding: '10px 14px', borderRadius: T.r, border: '1px solid rgba(86,207,178,0.3)', background: 'rgba(86,207,178,0.06)', fontSize: 12, color: 'rgba(86,207,178,0.85)', fontWeight: 600, marginBottom: 14 }}>
          🔄 Each player sees a word and writes a question it could answer. Two players share the same word — find the pair.
        </div>
      )}

      <button onClick={onBack} style={{ ...D.btn('grad'), marginTop: 8 }}>← Back to Players</button>
    </div>
  );
});

/* ── Custom Questions Page ── */
const CustomQuestionsPage = memo(function CustomQuestionsPage({ customQuestions, setCustomQuestions, activePacks, setActivePacks, onBack }) {
  const [draftVariants, setDraftVariants] = useState(EMPTY_VARIANTS);
  const [loadCode, setLoadCode] = useState('');
  const [savedCode, setSavedCode] = useState('');
  const [loadError, setLoadError] = useState('');
  const [copied, setCopied] = useState(false);

  const filled = draftVariants.filter(v => v.trim()).length;
  const canAdd = filled >= 2;

  const handleVariantChange = useCallback((i, val) => {
    setDraftVariants(prev => { const n = [...prev]; n[i] = val; return n; });
  }, []);

  const handleAddQuestion = useCallback(() => {
    if (!canAdd) return;
    haptic(30); SoundEngine.click();
    const variants = draftVariants.map(v => v.trim()).filter(Boolean);
    setCustomQuestions(prev => {
      const next = [...prev, { variants }];
      setActivePacks(ap => ap.includes('custom') ? ap : [...ap, 'custom']);
      return next;
    });
    setDraftVariants(EMPTY_VARIANTS);
  }, [canAdd, draftVariants, setCustomQuestions, setActivePacks]);

  const handleDeleteQuestion = useCallback((idx) => {
    haptic(20); SoundEngine.click();
    setCustomQuestions(prev => prev.filter((_, i) => i !== idx));
  }, [setCustomQuestions]);

  const handleSaveCode = useCallback(() => {
    if (customQuestions.length === 0) return;
    haptic(30); SoundEngine.click();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(customQuestions))));
    setSavedCode(code);
  }, [customQuestions]);

  const handleCopyCode = useCallback(() => {
    if (!savedCode) return;
    navigator.clipboard.writeText(savedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [savedCode]);

  const handleLoadCode = useCallback(() => {
    if (!loadCode.trim()) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(loadCode.trim()))));
      if (!Array.isArray(decoded) || decoded.length === 0) throw new Error();
      const valid = decoded.filter(q => q.variants && Array.isArray(q.variants) && q.variants.length >= 2);
      if (valid.length === 0) throw new Error();
      haptic([30, 20, 50]); SoundEngine.click();
      setCustomQuestions(valid);
      setActivePacks(ap => ap.includes('custom') ? ap : [...ap, 'custom']);
      setLoadCode('');
      setLoadError('');
    } catch {
      setLoadError('Invalid code — please check and try again.');
    }
  }, [loadCode, setCustomQuestions, setActivePacks]);

  return (
    <div style={{ ...S.card, animation: 'fadeUp .28s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: '50%', border: `1px solid ${T.border}`, background: T.surface, color: T.textMid, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>←</button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>Custom Questions</h2>
          <p style={{ color: T.textDim, fontSize: 12, margin: 0 }}>{customQuestions.length} question{customQuestions.length !== 1 ? 's' : ''} saved</p>
        </div>
      </div>

      {/* Add new question */}
      <div style={{ background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.2)', borderRadius: T.rl, padding: '18px 16px', marginBottom: 20 }}>
        <p style={{ ...S.lbl, color: 'rgba(192,132,252,0.7)', marginBottom: 14 }}>New question — write up to 10 variants</p>
        <p style={{ fontSize: 11, color: T.textDim, marginBottom: 14, lineHeight: 1.55 }}>
          Each variant is a different phrasing of the same question. Players in the group each see a different variant — so nobody realises they're all answering the same thing. Fill in at least 2.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {EMPTY_VARIANTS.map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: draftVariants[i].trim() ? '#C084FC' : T.textDim, width: 22, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <input
                value={draftVariants[i]}
                onChange={e => handleVariantChange(i, e.target.value)}
                placeholder={i < 2 ? `Variant ${i + 1} (required)` : `Variant ${i + 1} (optional)`}
                style={{ ...S.inp, fontSize: 13, padding: '10px 13px', borderColor: i < 2 && !draftVariants[i].trim() ? 'rgba(192,132,252,0.15)' : T.border }}
                onFocus={e => { e.target.style.borderColor = '#C084FC'; e.target.style.boxShadow = '0 0 0 3px rgba(192,132,252,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: T.textDim }}>{filled} variant{filled !== 1 ? 's' : ''} filled</span>
        </div>
        <button onClick={handleAddQuestion} disabled={!canAdd} style={D.btn('#C084FC', false, true, !canAdd)}>+ Add Question</button>
      </div>

      {/* Saved questions list */}
      {customQuestions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={S.lbl}>Saved Questions ({customQuestions.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {customQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 13 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: T.text, margin: '0 0 4px', lineHeight: 1.5, fontWeight: 600 }}>{q.variants[0]}</p>
                  <p style={{ fontSize: 11, color: T.textDim, margin: 0, fontStyle: 'italic' }}>{q.variants.length} variant{q.variants.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => handleDeleteQuestion(i)} style={{ background: 'none', border: 'none', color: T.textDim, fontSize: 20, cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0, marginTop: 2 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save / Load code */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 20, marginBottom: 20 }}>
        <p style={S.lbl}>Save & Load</p>
        <p style={{ fontSize: 12, color: T.textDim, marginBottom: 14, lineHeight: 1.6 }}>
          Generate a code to save your questions and reload them next time — no account needed.
        </p>

        {customQuestions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={handleSaveCode} style={{ ...D.btn('#34D399', false, true), marginBottom: savedCode ? 10 : 0 }}>Generate Save Code</button>
            {savedCode && (
              <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 10, color: '#34D399', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Your Code</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <code style={{ flex: 1, fontSize: 10, color: T.textMid, wordBreak: 'break-all', lineHeight: 1.6, background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 8, display: 'block' }}>{savedCode.slice(0, 120)}{savedCode.length > 120 ? '…' : ''}</code>
                </div>
                <button onClick={handleCopyCode} style={{ ...D.btn('#34D399', true, true), marginTop: 10 }}>
                  {copied ? '✓ Copied!' : '⎘ Copy Full Code'}
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <label style={{ fontSize: 10, color: T.textDim, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Load from Code</label>
          <textarea
            value={loadCode}
            onChange={e => { setLoadCode(e.target.value); setLoadError(''); }}
            placeholder="Paste your save code here…"
            rows={3}
            style={{ ...S.inp, fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}
          />
          {loadError && <p style={{ color: '#FF6B6B', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{loadError}</p>}
          <button onClick={handleLoadCode} disabled={!loadCode.trim()} style={D.btn('#4DA6FF', false, true, !loadCode.trim())}>Load Questions from Code</button>
        </div>
      </div>

      <button onClick={onBack} style={{ ...D.btn('grad') }}>← Back to Players</button>
    </div>
  );
});

/* ──────────────────────────────────────
   MAIN APP
────────────────────────────────────── */
function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  /* ── Setup navigation ── */
  const [setupPage, setSetupPage] = useState('players'); // 'players' | 'settings' | 'custom'

  /* ── Questions ── */
  const [activePacks, setActivePacks] = useState(['main']);
  const [qs, setQs] = useState([]);
  const [qLoading, setQLoading] = useState(true);
  const [qError, setQError] = useState(false);

  /* ── Custom questions ── */
  const [customQuestions, setCustomQuestions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('outlier_custom_qs') || '[]'); }
    catch { return []; }
  });

  /* ── Misc ── */
  const [modifiersEnabled, setModifiersEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [soundOn, setSoundOn] = useState(true);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);

  /* ── Persist custom questions ── */
  useEffect(() => {
    localStorage.setItem('outlier_custom_qs', JSON.stringify(customQuestions));
    if (customQuestions.length === 0) {
      setActivePacks(prev => {
        if (!prev.includes('custom')) return prev;
        const without = prev.filter(id => id !== 'custom');
        return without.length > 0 ? without : ['main'];
      });
    }
  }, [customQuestions]);

  /* ── Load questions ── */
  useEffect(() => {
    setQLoading(true); setQError(false);
    const filePacks = QUESTION_PACKS.filter(p => activePacks.includes(p.id));
    Promise.all(filePacks.map(p => fetch(p.file).then(r => r.ok ? r.json() : []).catch(() => []))).then(results => {
      const fromFiles = results.flat();
      const custom = activePacks.includes('custom') ? customQuestions : [];
      const combined = [...fromFiles, ...custom];
      if (combined.length === 0) { setQError(true); } else { setQs(combined); setQError(false); }
      setQLoading(false);
    }).catch(() => { setQError(true); setQLoading(false); });
  }, [activePacks, customQuestions]);

  /* ── Timer ── */
  useEffect(() => {
    clearInterval(timerRef.current); submittedRef.current = false;
    if (state.phase !== 'question' || !state.timerEnabled) return;
    setTimeLeft(state.timerSeconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1;
        if (next <= 0) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true; SoundEngine.timerEnd(); haptic([150, 80, 80]);
            dispatch({ type: 'SUBMIT_ANSWER' });
          }
          return 0;
        }
        if (next <= 3) { SoundEngine.timerWarn(); haptic(40); }
        else if (next <= 5) { SoundEngine.tick(); haptic(20); }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [state.phase, state.curAns, state.timerEnabled]);

  /* ── Reveal drama ── */
  useEffect(() => {
    if (state.phase !== 'reveal') return;
    if (state.revealStage === 0) {
      SoundEngine.suspense();
      const t = setTimeout(() => dispatch({ type: 'SET_REVEAL_STAGE', stage: 1 }), 1900);
      return () => clearTimeout(t);
    }
    if (state.revealStage === 1) {
      SoundEngine.reveal(); haptic([80, 40, 80, 40, 200]);
      setTimeout(() => {
        if (state.groupWon) { SoundEngine.win(); haptic([50,30,50,30,50,30,150]); dispatch({ type: 'SET_CONFETTI', value: true }); }
        else { SoundEngine.lose(); haptic([200, 100, 100]); }
      }, 500);
      const t = setTimeout(() => dispatch({ type: 'SET_REVEAL_STAGE', stage: 2 }), 2300);
      return () => clearTimeout(t);
    }
    if (state.revealStage === 2) {
      const t = setTimeout(() => dispatch({ type: 'SET_REVEAL_STAGE', stage: 3 }), 900);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.revealStage, state.groupWon]);

  /* ── Modifier picker ── */
  const pickModifier = useCallback((lastIdx) => {
    const pool = MODIFIERS.map((_, i) => i).filter(i => i !== lastIdx);
    const idx = pool[Math.floor(Math.random() * pool.length)];
    return { modifier: MODIFIERS[idx], modifierIdx: idx };
  }, []);

  /* ── Derived ── */
  const validPlayers = state.players.filter(p => p.name.trim());
  const pc = validPlayers.length;
  const mInfo = MODES.find(m => m.id === state.mode) || MODES[0];
  const curAnsPlayer = state.players[state.qOrder[state.curAns]];
  const curAnsName = curAnsPlayer?.name || '';
  const curIsImp = state.impIdxs.includes(state.qOrder[state.curAns]);
  const curAnsColor = COLORS[curAnsPlayer?.colorIdx ?? (state.curAns % COLORS.length)];
  let curQ = '';
  if (state.playerVariants) curQ = state.playerVariants[curAnsName] || '';
  else if (state.qPair) curQ = curIsImp ? state.qPair.b : state.qPair.a;
  if (state.playerSubject) curQ = curQ.replace(/\[Player\]/g, state.playerSubject);
  const voterName = state.voteOrder[state.curVoter];
  const voterPlayer = state.players.find(p => p.name === voterName);
  const voteAccent = COLORS[(voterPlayer?.colorIdx ?? 0) % COLORS.length];
  const curVoterPicks = state.votes[voterName] || (state.mode === 'doublecross' ? [] : null);
  const impNames = state.impIdxs.map(i => state.players[i]?.name).filter(Boolean);
  const groupWon = state.groupWon;
  const isReverse = state.mode === 'reverse';
  const accentColor =
    ['q_handoff', 'question'].includes(state.phase) ? curAnsColor :
    ['vote_handoff', 'vote_cast'].includes(state.phase) ? voteAccent : mInfo.color;
  const canStart = validPlayers.length >= 2
    && (state.mode !== 'doublecross' || validPlayers.length >= 3)
    && qs.length > 0;
  const charCount = state.writing.length;
  const charColor = charCount >= ANSWER_CHAR_LIMIT ? '#FF6B6B' : charCount >= Math.floor(ANSWER_CHAR_LIMIT * 0.85) ? '#FF9F45' : T.textDim;

  /* ── Handlers ── */
  const togglePack = useCallback((id) => {
    setActivePacks(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]);
  }, []);

  const handleBeginGame = useCallback(() => {
    const valid = state.players.filter(p => p.name.trim());
    if (valid.length < 2) return;
    if (state.mode === 'doublecross' && valid.length < 3) return;
    const lower = valid.map(p => p.name.trim().toLowerCase());
    if (lower.length !== new Set(lower).size) {
      dispatch({ type: 'SET_NAME_ERROR', error: '⚠️ Two players have the same name — each name must be unique.' });
      return;
    }
    haptic([40, 20, 80]); resetRNG();
    const roundData = createRound({ players: valid, mode: state.mode, questions: qs, used: [] });
    const { modifier, modifierIdx } = modifiersEnabled ? pickModifier(-1) : { modifier: null, modifierIdx: -1 };
    dispatch({ type: 'BEGIN_GAME', validPlayers: valid, roundData, modifier, modifierIdx });
    SoundEngine.click();
  }, [state.players, state.mode, qs, modifiersEnabled, pickModifier]);

  const handleSubmitAnswer = useCallback(() => {
    submittedRef.current = true; clearInterval(timerRef.current);
    haptic([40, 30, 40]); SoundEngine.submit();
    dispatch({ type: 'SUBMIT_ANSWER' });
  }, []);

  const handleCastVote = useCallback((suspect) => { haptic(25); SoundEngine.vote(); dispatch({ type: 'CAST_VOTE', suspect }); }, []);
  const handleConfirmVote = useCallback(() => { haptic(35); SoundEngine.click(); dispatch({ type: 'CONFIRM_VOTE' }); }, []);
  const handleNextRound = useCallback(() => {
    haptic(30); SoundEngine.click();
    if (state.round >= state.totalRounds) { dispatch({ type: 'GO_FINAL' }); return; }
    const roundData = createRound({ players: state.players, mode: state.mode, questions: qs, used: state.usedIdx });
    const { modifier, modifierIdx } = modifiersEnabled ? pickModifier(state.lastModifierIdx) : { modifier: null, modifierIdx: -1 };
    dispatch({ type: 'NEXT_ROUND', roundData, newRound: state.round + 1, modifier, modifierIdx });
  }, [state.round, state.totalRounds, state.players, state.mode, state.usedIdx, qs, modifiersEnabled, state.lastModifierIdx, pickModifier]);

  const handleToggleSound = useCallback(() => { const next = SoundEngine.toggle(); setSoundOn(next); haptic(20); }, []);
  const handleShowQuestion = useCallback(() => { haptic(30); SoundEngine.click(); dispatch({ type: 'SET_PHASE', phase: 'question' }); }, []);
  const handleShowVote = useCallback(() => { haptic(30); SoundEngine.click(); dispatch({ type: 'SET_PHASE', phase: 'vote_cast' }); }, []);

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div style={S.page}>
      <BlobBG accent={accentColor} />
      <Confetti active={state.confetti} />

      {state.phase !== 'setup' && (
        <button onClick={handleToggleSound} style={{ position: 'fixed', top: 14, right: 14, zIndex: 100, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, color: soundOn ? T.text : T.textDim, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      )}

      {/* ════ LOADING ════ */}
      {qLoading && (
        <div style={{ textAlign: 'center', animation: 'fadeIn .5s ease' }}>
          <div style={{ fontSize: 44, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</div>
          <p style={{ color: T.textMid, marginTop: 12 }}>Loading questions…</p>
        </div>
      )}

      {/* ════ ERROR ════ */}
      {!qLoading && qError && state.phase === 'setup' && (
        <div style={{ maxWidth: 420, width: '100%', animation: 'fadeUp .4s ease' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,107,107,0.06)', border: '1.5px solid rgba(255,107,107,0.35)', borderRadius: T.rx, padding: '28px 24px' }}>
            <div style={{ fontSize: 46, marginBottom: 12 }}>📂</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#FF6B6B', marginBottom: 10 }}>Question files not found</h2>
            <p style={{ color: T.textMid, fontSize: 14, lineHeight: 1.7 }}>Make sure the <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 6, color: '#FFCB47' }}>questions/</code> folder is alongside <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 6, color: '#FFCB47' }}>index.html</code>.</p>
          </div>
        </div>
      )}

      {/* ════ SETUP — PLAYERS ════ */}
      {!qLoading && state.phase === 'setup' && setupPage === 'players' && (
        <div style={{ ...S.card, animation: 'fadeUp .35s ease both' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 56, display: 'inline-block', marginBottom: 2, filter: 'drop-shadow(0 0 22px rgba(99,102,241,0.5))', animation: 'bounce 3s ease-in-out infinite' }}>🕵️</div>
            <h1 className="title-gradient" style={{ fontSize: 54, fontWeight: 900, letterSpacing: '-2.5px', lineHeight: 1, margin: 0 }}>OUTLIER</h1>
            <p style={{ color: T.textDim, fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', marginTop: 8, fontWeight: 700 }}>Party Game · 2–10 Players</p>
          </div>

          {/* Current settings summary */}
          <button onClick={() => { haptic(15); SoundEngine.click(); setSetupPage('settings'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', borderRadius: T.r, border: `1px solid ${T.border}`, background: T.surface, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', marginBottom: 10, transition: 'all .18s' }}>
            <span style={{ fontSize: 20 }}>{mInfo.emoji}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: mInfo.color, display: 'block' }}>{mInfo.name} · {state.totalRounds} rounds{state.timerEnabled ? ` · ${state.timerSeconds}s timer` : ''}{modifiersEnabled ? ' · Modifiers on' : ''}</span>
              <span style={{ fontSize: 11, color: T.textDim }}>{activePacks.length} pack{activePacks.length !== 1 ? 's' : ''} selected · Tap to change settings</span>
            </div>
            <span style={{ color: T.textDim, fontSize: 16 }}>⚙</span>
          </button>

          {/* Custom questions button */}
          <button onClick={() => { haptic(15); SoundEngine.click(); setSetupPage('custom'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', borderRadius: T.r, border: `1px solid ${customQuestions.length > 0 ? 'rgba(192,132,252,0.3)' : T.border}`, background: customQuestions.length > 0 ? 'rgba(192,132,252,0.06)' : T.surface, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', marginBottom: 22, transition: 'all .18s' }}>
            <span style={{ fontSize: 20 }}>✏️</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: customQuestions.length > 0 ? '#C084FC' : T.text, display: 'block' }}>Custom Questions</span>
              <span style={{ fontSize: 11, color: T.textDim }}>{customQuestions.length > 0 ? `${customQuestions.length} question${customQuestions.length !== 1 ? 's' : ''} saved` : 'Write your own questions'}</span>
            </div>
            <span style={{ color: T.textDim, fontSize: 16 }}>→</span>
          </button>

          {/* Players */}
          <p style={S.lbl}>Players</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
            {state.players.map((player, i) => {
              const col = COLORS[player.colorIdx];
              return (
                <div key={player.id} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: col + '18', border: `1.5px solid ${col}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: col }}>{i + 1}</div>
                  <input value={player.name} onChange={e => dispatch({ type: 'UPDATE_PLAYER_NAME', id: player.id, name: e.target.value })} placeholder={`Player ${i + 1}`} style={S.inp} onFocus={e => { e.target.style.borderColor = col; e.target.style.boxShadow = `0 0 0 3px ${col}18`; }} onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }} />
                  {state.players.length > 2 && <button onClick={() => dispatch({ type: 'REMOVE_PLAYER', id: player.id })} style={{ background: 'none', border: 'none', color: T.textDim, fontSize: 22, padding: '0 4px', lineHeight: 1, cursor: 'pointer' }}>×</button>}
                </div>
              );
            })}
          </div>

          {state.nameError && <p style={{ color: 'rgba(255,107,107,0.85)', fontSize: 12, textAlign: 'center', fontWeight: 700, marginBottom: 12, animation: 'fadeIn .3s ease' }}>{state.nameError}</p>}

          <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
            {state.players.length < 10 && (
              <button onClick={() => dispatch({ type: 'ADD_PLAYER' })} style={{ flex: 1, padding: '12px', borderRadius: 13, border: `1px solid ${T.border}`, background: T.surface, color: T.textMid, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>+ Add Player</button>
            )}
            <button onClick={handleBeginGame} disabled={!canStart} style={{ ...D.btn('grad', false, false, !canStart), flex: 2 }}>START GAME →</button>
          </div>

          {state.mode === 'doublecross' && validPlayers.length < 3 && (
            <p style={{ color: 'rgba(255,107,107,0.8)', fontSize: 12, textAlign: 'center', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>⚠️ Double Cross needs at least 3 players</p>
          )}
          {qs.length === 0 && !qLoading && !qError && (
            <p style={{ color: 'rgba(255,159,69,0.8)', fontSize: 12, textAlign: 'center', fontWeight: 700 }}>⚠️ Select at least one question pack to play</p>
          )}
        </div>
      )}

      {/* ════ SETUP — SETTINGS ════ */}
      {!qLoading && state.phase === 'setup' && setupPage === 'settings' && (
        <SettingsPage
          state={state} dispatch={dispatch}
          activePacks={activePacks} togglePack={togglePack}
          modifiersEnabled={modifiersEnabled} setModifiersEnabled={setModifiersEnabled}
          customCount={customQuestions.length}
          onBack={() => setSetupPage('players')}
        />
      )}

      {/* ════ SETUP — CUSTOM QUESTIONS ════ */}
      {!qLoading && state.phase === 'setup' && setupPage === 'custom' && (
        <CustomQuestionsPage
          customQuestions={customQuestions} setCustomQuestions={setCustomQuestions}
          activePacks={activePacks} setActivePacks={setActivePacks}
          onBack={() => setSetupPage('players')}
        />
      )}

      {/* ════ QUESTION HANDOFF ════ */}
      {state.phase === 'q_handoff' && (
        <LockScreen name={curAnsName} color={curAnsColor} sub={`Round ${state.round} of ${state.totalRounds} · Question Phase`} btnLabel="Show My Question →" onReady={handleShowQuestion} />
      )}

      {/* ════ QUESTION ════ */}
      {state.phase === 'question' && (
        <div style={{ ...S.card, textAlign: 'center', animation: 'slideR .3s ease both' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{ background: `${mInfo.color}18`, border: `1px solid ${mInfo.color}40`, borderRadius: 99, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>{mInfo.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: mInfo.color, letterSpacing: 2, textTransform: 'uppercase' }}>{mInfo.name} · Round {state.round}/{state.totalRounds}</span>
            </div>
          </div>
          <PBar total={pc} current={state.curAns} accent={curAnsColor} />
          <p style={{ ...S.lbl, textAlign: 'center' }}>Answering</p>
          <h2 style={{ fontSize: 42, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-1.5px', color: curAnsColor, textShadow: `0 0 30px ${curAnsColor}70` }}>{curAnsName}</h2>
          <p style={{ color: T.textDim, fontSize: 13, marginBottom: 18, fontWeight: 600 }}>{state.curAns + 1} of {pc}</p>
          {state.timerEnabled && <TimerBar timeLeft={timeLeft} total={state.timerSeconds} accent={curAnsColor} />}
          {state.roundModifier && <ModifierBanner modifier={state.roundModifier} />}
          {curIsImp && state.mode !== 'clueless' && state.mode !== 'reverse' && (
            <div style={{ background: 'rgba(255,107,107,0.08)', border: '1.5px solid rgba(255,107,107,0.5)', borderRadius: T.r, padding: '13px 16px', marginBottom: 14, boxShadow: '0 0 30px rgba(255,107,107,0.2)', animation: 'popIn .35s ease both' }}>
              <p style={{ fontSize: 16, fontWeight: 900, margin: '0 0 4px', color: '#FF6B6B' }}>🎭 You are the outlier!</p>
              <p style={{ fontSize: 12, color: T.textMid, margin: 0, lineHeight: 1.5 }}>{state.mode === 'doublecross' ? "There's one other outlier — but you don't know who. Blend in!" : "Blend in with your answer. Don't get caught!"}</p>
            </div>
          )}
          {isReverse && (
            <div style={{ background: 'rgba(86,207,178,0.07)', border: '1px solid rgba(86,207,178,0.3)', borderRadius: T.r, padding: '10px 14px', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'rgba(86,207,178,0.8)', margin: 0, fontWeight: 600 }}>🔄 Write a question that your word could be the answer to. Two players have the same word — don't give it away!</p>
            </div>
          )}
          <div style={{ background: `${curAnsColor}14`, border: `1.5px solid ${curAnsColor}45`, borderRadius: T.rl, padding: '22px 18px', marginBottom: 16, boxShadow: `0 0 30px ${curAnsColor}20` }}>
            <p style={{ ...S.lbl, textAlign: 'center', color: curAnsColor + 'cc', marginBottom: 10 }}>{isReverse ? 'Your word' : 'Your question'}</p>
            <p style={{ fontSize: isReverse ? 36 : 19, fontWeight: isReverse ? 900 : 700, lineHeight: 1.55, color: T.text, margin: 0, letterSpacing: isReverse ? '-1px' : 'normal' }}>{curQ}</p>
          </div>
          <div style={{ textAlign: 'left', marginBottom: 14 }}>
            <label style={S.lbl}>{isReverse ? 'Your question' : 'Your answer'}</label>
            <textarea value={state.writing} onChange={e => dispatch({ type: 'SET_WRITING', value: e.target.value.slice(0, ANSWER_CHAR_LIMIT) })} placeholder={isReverse ? 'Write a question your word could answer…' : 'Type your answer…'} rows={3} maxLength={ANSWER_CHAR_LIMIT} style={{ ...S.inp, border: `1.5px solid ${curAnsColor}50`, lineHeight: 1.6, boxShadow: `0 0 0 3px ${curAnsColor}10` }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: charColor, transition: 'color .2s' }}>{charCount} / {ANSWER_CHAR_LIMIT}</span>
            </div>
          </div>
          <PBtn col={curAnsColor} onClick={handleSubmitAnswer}>
            {state.curAns + 1 < pc ? 'Done — pass the phone →' : 'All answered — start voting!'}
          </PBtn>
        </div>
      )}

      {/* ════ VOTE HANDOFF ════ */}
      {state.phase === 'vote_handoff' && (
        <LockScreen name={voterName} color={voteAccent} sub={`Voting · ${state.curVoter + 1} of ${pc}`} btnLabel="Show Answers & Vote →" onReady={handleShowVote} />
      )}

      {/* ════ VOTE CAST ════ */}
      {state.phase === 'vote_cast' && (
        <div style={{ ...S.card, animation: 'slideR .3s ease both' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{ background: `${voteAccent}20`, border: `1.5px solid ${voteAccent}55`, borderRadius: 99, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 0 20px ${voteAccent}25` }}>
                <div style={D.avatar(voteAccent, 26)}>{voterName?.[0]?.toUpperCase()}</div>
                <span style={{ fontSize: 14, fontWeight: 800, color: voteAccent }}>{voterName}'s vote</span>
                <span style={{ fontSize: 10, color: voteAccent + '70', letterSpacing: 1 }}>({state.curVoter + 1}/{pc})</span>
              </div>
            </div>
            <p style={{ color: T.textMid, fontSize: 13, fontWeight: 600 }}>
              {state.mode === 'doublecross' ? 'Pick your 2 suspects — both could be outliers!' : isReverse ? 'Whose question sounds like it answers the same word as someone else?' : 'Tap who you think had the different question'}
            </p>
          </div>
          <p style={S.lbl}>{isReverse ? "Everyone's Questions" : "Everyone's Answers"}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {state.players.map(player => {
              const col = COLORS[player.colorIdx];
              const picks = state.mode === 'doublecross' ? (curVoterPicks || []) : (curVoterPicks ? [curVoterPicks] : []);
              const picked = picks.includes(player.name);
              const isSelf = player.name === voterName;
              return (
                <div key={player.id} onClick={() => { if (!isSelf) handleCastVote(player.name); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 15px', borderRadius: T.r, cursor: isSelf ? 'default' : 'pointer', background: picked ? `${col}14` : 'rgba(255,255,255,0.03)', border: `1px solid ${picked ? col + '55' : T.border}`, boxShadow: picked ? `0 0 0 1px ${col}20, 0 6px 20px ${col}20` : 'none', transition: 'all .18s', opacity: isSelf ? 0.45 : 1 }}>
                  <div style={D.avatar(col)}>{player.name[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: picked ? col : T.textMid }}>{player.name}{isSelf ? ' (you)' : ''}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 14, color: isSelf ? T.textDim : T.text, fontStyle: isSelf ? 'italic' : 'normal' }}>{state.answers[player.name] || '…'}</p>
                  </div>
                  {!isSelf && <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, alignSelf: 'center', background: picked ? col : 'rgba(255,255,255,0.07)', border: `1.5px solid ${picked ? col : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', boxShadow: picked ? `0 0 10px ${col}` : 'none', transition: 'all .18s' }}>{picked ? '✓' : ''}</div>}
                </div>
              );
            })}
          </div>
          {state.mode === 'doublecross' && (curVoterPicks || []).length < 2 && (
            <div style={{ background: 'rgba(255,159,69,0.08)', border: '1px solid rgba(255,159,69,0.3)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, textAlign: 'center', fontSize: 12, color: '#FF9F45', fontWeight: 800, animation: 'pulse 1.5s infinite' }}>
              Select {2 - (curVoterPicks || []).length} more suspect{(curVoterPicks || []).length === 1 ? '' : 's'}
            </div>
          )}
          <PBtn col={voteAccent} dis={state.mode === 'doublecross' ? (curVoterPicks || []).length !== 2 : curVoterPicks == null} onClick={handleConfirmVote}>
            {state.curVoter + 1 < pc ? 'Confirm Vote — pass the phone →' : 'Confirm Vote — see results!'}
          </PBtn>
        </div>
      )}

      {/* ════ REVEAL ════ */}
      {state.phase === 'reveal' && (
        <div style={{ ...S.card, animation: 'fadeUp .35s ease both' }}>
          {state.revealStage === 0 && (
            <div style={{ textAlign: 'center', padding: '44px 20px', animation: 'fadeIn .4s ease' }}>
              <div style={{ fontSize: 68, marginBottom: 20, display: 'inline-block', animation: 'spin 2.2s linear infinite' }}>🎭</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: T.textMid, marginBottom: 8 }}>{isReverse ? 'Revealing the matching pair…' : impNames.length > 1 ? 'Revealing the outliers…' : 'Revealing the outlier…'}</h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', animation: `pulse 1s ease-in-out ${i * 0.33}s infinite` }} />)}
              </div>
            </div>
          )}
          {state.revealStage >= 1 && (
            <div style={{ background: groupWon ? 'rgba(52,211,153,0.07)' : 'rgba(255,107,107,0.07)', border: `1.5px solid ${groupWon ? 'rgba(52,211,153,0.4)' : 'rgba(255,107,107,0.4)'}`, borderRadius: T.rx, padding: '24px 20px', textAlign: 'center', marginBottom: 16, boxShadow: `0 0 50px ${groupWon ? 'rgba(52,211,153,0.2)' : 'rgba(255,107,107,0.2)'}`, animation: 'popIn .5s ease both' }}>
              <div style={{ fontSize: 50, marginBottom: 10, animation: groupWon ? 'bounce .9s ease-in-out infinite' : 'none' }}>{groupWon ? '🎉' : '😈'}</div>
              <p style={{ fontSize: 10, letterSpacing: 3.5, textTransform: 'uppercase', color: T.textDim, fontWeight: 700, marginBottom: 8 }}>{isReverse ? 'The matching pair was' : impNames.length > 1 ? 'The outliers were' : 'The outlier was'}</p>
              <h2 style={{ fontSize: impNames.length > 1 ? 30 : 42, fontWeight: 900, margin: '0 0 14px', letterSpacing: '-1px', color: groupWon ? '#34D399' : '#FF6B6B', textShadow: `0 0 50px ${groupWon ? '#34D39988' : '#FF6B6B88'}`, animation: 'revealName .7s ease both' }}>{impNames.join(' & ')}</h2>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, textAlign: 'left', border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 9, color: T.textDim, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginBottom: 5 }}>{isReverse ? 'Their shared word was' : 'Their question was'}</p>
                <p style={{ fontSize: isReverse ? 28 : 13, fontWeight: isReverse ? 900 : 400, fontStyle: isReverse ? 'normal' : 'italic', color: isReverse ? '#56CFB2' : T.textMid, lineHeight: 1.55, letterSpacing: isReverse ? '-0.5px' : 'normal' }}>{isReverse ? state.qPair?.b : `"${state.qPair?.b}"`}</p>
              </div>
              {!isReverse && (
                <>
                  <p style={{ fontSize: 11, color: T.textDim, marginBottom: 3 }}>Everyone else got:</p>
                  <p style={{ fontSize: 13, fontStyle: 'italic', color: T.textMid }}>"{state.qPair?.a}"</p>
                </>
              )}
              <p style={{ fontSize: 20, fontWeight: 900, marginTop: 16, color: groupWon ? '#34D399' : '#FF6B6B' }}>
                {isReverse ? (groupWon ? 'Pair identified! 🎊' : 'Twins escaped! 😂') : (groupWon ? 'Group wins! 🎊' : 'Outlier escapes! 😂')}
              </p>
            </div>
          )}
          {state.revealStage >= 2 && (
            <div style={{ animation: 'fadeUp .4s ease both' }}>
              <p style={S.lbl}>Who voted for whom</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {state.players.map((player, i) => {
                  const vFor = state.mode === 'doublecross' ? (state.votes[player.name] || []).join(' & ') || '—' : state.votes[player.name] || '—';
                  const correct = state.mode === 'doublecross' ? (state.votes[player.name] || []).some(v => impNames.includes(v)) : impNames.includes(state.votes[player.name]);
                  const col = COLORS[player.colorIdx];
                  return (
                    <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: correct ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${correct ? 'rgba(52,211,153,0.3)' : T.border}`, borderRadius: 12, animation: 'stagger .35s ease both', animationDelay: `${i * 50}ms` }}>
                      <div style={D.avatar(col, 28)}>{player.name[0]?.toUpperCase()}</div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.textMid }}>{player.name}</span>
                      <span style={{ fontSize: 12, color: T.textDim }}>→</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: correct ? '#34D399' : T.textMid }}>{vFor}</span>
                      <span style={{ fontSize: 16 }}>{correct ? '✅' : '❌'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {state.revealStage >= 3 && (
            <div style={{ animation: 'fadeUp .4s ease both' }}>
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '20px 0' }} />
              {state.questionsCycled && <p style={{ color: 'rgba(255,159,69,0.65)', fontSize: 11, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' }}>🔄 All questions used — cycling back through the deck</p>}
              <RoundSummaryCard round={state.round} totalRounds={state.totalRounds} groupWon={groupWon} impNames={impNames} qPair={state.qPair} answers={state.answers} players={state.players} mode={state.mode} />
              <p style={{ ...S.lbl, marginBottom: 12 }}>Leaderboard · Round {state.round}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                {Object.entries(state.scores).sort((a, b) => b[1] - a[1]).map(([name, pts], i) => {
                  const player = state.players.find(p => p.name === name);
                  return <ScoreRow key={name} name={name} score={pts} rank={i + 1} roundPts={state.roundPts[name] || 0} color={COLORS[(player?.colorIdx ?? i) % COLORS.length]} delay={i * 65} />;
                })}
              </div>
              <PBtn col={state.round >= state.totalRounds ? '#34D399' : '#4DA6FF'} onClick={handleNextRound}>
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
        const wCol = COLORS[(wPlayer?.colorIdx ?? 0) % COLORS.length];
        return (
          <div style={{ ...S.card, animation: 'fadeUp .4s ease both' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 66, display: 'inline-block', marginBottom: 4, filter: 'drop-shadow(0 0 28px rgba(255,203,71,0.6))', animation: 'crown 2.2s ease-in-out infinite' }}>🏆</div>
              <h1 className="title-gradient" style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>Final Results</h1>
              <p style={{ color: T.textDim, fontSize: 10, marginTop: 6, letterSpacing: 3, textTransform: 'uppercase' }}>{state.totalRounds} round{state.totalRounds !== 1 ? 's' : ''} complete</p>
            </div>
            <div style={{ background: `${wCol}14`, border: `1.5px solid ${wCol}55`, borderRadius: T.rx, padding: '22px', textAlign: 'center', marginBottom: 20, boxShadow: `0 0 0 1px ${wCol}20, 0 8px 40px ${wCol}30`, animation: 'popIn .5s ease both' }}>
              <p style={{ fontSize: 10, letterSpacing: 3.5, textTransform: 'uppercase', color: wCol + '80', fontWeight: 700, marginBottom: 8 }}>Winner</p>
              <div style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 10px', background: wCol + '25', border: `2px solid ${wCol}70`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: wCol }}>{winner?.[0]?.toUpperCase()}</div>
              <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-1px' }}>{winner} 👑</h2>
              <p style={{ fontSize: 26, fontWeight: 900, color: wCol, marginTop: 4 }}>{sorted[0]?.[1]} pt{sorted[0]?.[1] !== 1 ? 's' : ''}</p>
            </div>
            <p style={S.lbl}>Full Standings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
              {sorted.map(([name, pts], i) => {
                const player = state.players.find(p => p.name === name);
                return <ScoreRow key={name} name={name} score={pts} rank={i + 1} roundPts={0} color={COLORS[(player?.colorIdx ?? i) % COLORS.length]} delay={i * 80} />;
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button onClick={handleBeginGame} style={D.btn('grad')}>Play Again (Same Players) →</button>
              <button onClick={() => { haptic(20); SoundEngine.click(); dispatch({ type: 'RESET_TO_SETUP' }); setSetupPage('players'); }} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 14, border: `1px solid ${T.border}`, background: 'transparent', color: T.textMid, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Change Settings</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
