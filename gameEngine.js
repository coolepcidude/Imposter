/* ════════════════════════════════════════════════════
   gameEngine.js  —  Outlier Party Game
   Pure game logic. No React, no DOM.
════════════════════════════════════════════════════ */

function createRNG(seed) {
  let t = seed;
  return function rng() {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}
let _rng = createRNG(Date.now());
function resetRNG(seed) { _rng = createRNG(seed !== undefined ? seed : Date.now()); }
function getRNG() { return _rng; }

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function shuffleRNG(arr) {
  const r = [...arr]; const rng = getRNG();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function getVoteTally(votes) {
  const tally = {};
  Object.values(votes).forEach(v => {
    if (Array.isArray(v)) v.forEach(x => { tally[x] = (tally[x] || 0) + 1; });
    else if (v) tally[v] = (tally[v] || 0) + 1;
  });
  return tally;
}

function checkGroupWon(votes, impNames, mode) {
  const tally = getVoteTally(votes);
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const top2 = sorted.slice(0, 2).map(e => e[0]);
  if (mode === 'doublecross') return impNames.some(n => top2.includes(n));
  if (mode === 'reverse') return impNames.every(n => top2.includes(n));
  return impNames.includes(sorted[0]?.[0]);
}

function computeRoundScores(votes, impNames, mode, playerNames) {
  const earned = {};
  playerNames.forEach(n => { earned[n] = 0; });

  if (mode === 'doublecross') {
    playerNames.forEach(voter => {
      (votes[voter] || []).forEach(pick => {
        if (impNames.includes(pick)) earned[voter]++;
      });
    });
    const tally = getVoteTally(votes);
    const top2 = Object.entries(tally).sort((a,b) => b[1]-a[1]).slice(0,2).map(e => e[0]);
    impNames.forEach(imp => {
      if (!top2.includes(imp)) earned[imp] = (earned[imp] || 0) + 2;
    });

  } else if (mode === 'reverse') {
    /* Voters pick 2 suspects — +1 per twin correctly identified */
    playerNames.forEach(voter => {
      const picks = Array.isArray(votes[voter]) ? votes[voter] : (votes[voter] ? [votes[voter]] : []);
      picks.forEach(pick => {
        if (impNames.includes(pick)) earned[voter] = (earned[voter] || 0) + 1;
      });
    });
    /* Each twin individually gets +4 if they're NOT in the top-2 most voted */
    const tally = getVoteTally(votes);
    const top2 = Object.entries(tally).sort((a,b) => b[1]-a[1]).slice(0,2).map(e => e[0]);
    impNames.forEach(imp => {
      if (!top2.includes(imp)) earned[imp] = (earned[imp] || 0) + 4;
    });

  } else {
    const imp = impNames[0];
    playerNames.forEach(voter => {
      if (votes[voter] === imp) earned[voter]++;
    });
    const tally = getVoteTally(votes);
    const top = Object.entries(tally).sort((a,b) => b[1]-a[1])[0]?.[0];
    if (imp && top !== imp) earned[imp] = (earned[imp] || 0) + 2;
  }
  return earned;
}

function pickQuestion(questions, used, rng) {
  const avail = questions.map((_,i) => i).filter(i => !used.includes(i));
  const isCycling = avail.length === 0;
  const pool = isCycling ? questions.map((_,i) => i) : avail;
  const pick = pool[Math.floor(rng() * pool.length)];
  const newUsed = isCycling ? [pick] : [...used, pick];
  return { pick, newUsed, isCycling };
}

function createStandardRound({ players, mode, questions, used }) {
  const rng = getRNG(); const pc = players.length;
  const { pick, newUsed, isCycling } = pickQuestion(questions, used, rng);
  const variants = questions[pick].variants; const vLen = variants.length;
  const groupIdx = Math.floor(rng() * vLen);
  let outlierIdx = Math.floor(rng() * (vLen - 1));
  if (outlierIdx >= groupIdx) outlierIdx++;
  const qPair = { a: variants[groupIdx], b: variants[outlierIdx] };
  const qOrder = shuffleRNG(players.map((_,i) => i));
  let impIdxs;
  if (mode === 'doublecross' && pc >= 4) {
    const i1 = Math.floor(rng() * pc);
    let i2 = Math.floor(rng() * (pc - 1));
    if (i2 >= i1) i2++;
    impIdxs = [i1, i2];
  } else {
    impIdxs = [Math.floor(rng() * pc)];
  }
  const voteOrder = shuffleRNG(players.map(p => p.name));
  const playerSubject = players[Math.floor(rng() * pc)].name;
  return { qPair, qOrder, impIdxs, voteOrder, newUsed, isCycling, playerVariants: null, playerSubject };
}

function createReverseRound({ players, questions, used }) {
  const rng = getRNG(); const pc = players.length;
  if (!questions || questions.length === 0) {
    return {
      qPair: { a: '(no questions loaded)', b: '(no questions loaded)' },
      qOrder: players.map((_,i) => i), impIdxs: [0,1],
      voteOrder: players.map(p => p.name), newUsed: used,
      isCycling: false, playerVariants: null, playerSubject: players[0]?.name || '',
    };
  }
  const { pick, newUsed, isCycling } = pickQuestion(questions, used, rng);
  const variants = questions[pick].variants;
  const i1 = Math.floor(rng() * pc);
  let i2 = Math.floor(rng() * (pc - 1));
  if (i2 >= i1) i2++;
  const twinIdxs = [i1, i2];
  const shuffled = shuffleRNG(players.map((_,i) => i));
  const playerVariants = {};
  let variantOffset = 1;
  shuffled.forEach(idx => {
    const name = players[idx].name;
    if (twinIdxs.includes(idx)) {
      playerVariants[name] = variants[0];
    } else {
      playerVariants[name] = variants[variantOffset] ?? variants[0];
      variantOffset++;
    }
  });
  const qOrder = shuffleRNG(players.map((_,i) => i));
  const voteOrder = shuffleRNG(players.map(p => p.name));
  const playerSubject = players[Math.floor(rng() * pc)].name;
  return {
    qPair: { a: variants[0], b: variants[0] }, qOrder, impIdxs: twinIdxs,
    voteOrder, newUsed, isCycling, playerVariants, playerSubject,
  };
}

function createRound({ players, mode, questions, used }) {
  if (mode === 'reverse') return createReverseRound({ players, questions, used });
  return createStandardRound({ players, mode, questions, used });
}
