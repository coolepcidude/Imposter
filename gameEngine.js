/* ════════════════════════════════════════════════════
   gameEngine.js
   Pure game logic — no React, no DOM.
   All functions are exposed as globals so app.js can
   call them without a bundler.
════════════════════════════════════════════════════ */

/* ──────────────────────────────────────
   SEEDABLE RNG
────────────────────────────────────── */
function createRNG(seed) {
  let t = seed;
  return function rng() {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}

let _rng = createRNG(Date.now());

function resetRNG(seed) {
  _rng = createRNG(seed !== undefined ? seed : Date.now());
}

function getRNG() {
  return _rng;
}

/* ──────────────────────────────────────
   UTILITIES
────────────────────────────────────── */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function shuffleRNG(arr) {
  const r   = [...arr];
  const rng = getRNG();
  for (let i = r.length - 1; i > 0; i--) {
    const j  = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/* ──────────────────────────────────────
   VOTE LOGIC
────────────────────────────────────── */
function getVoteTally(votes) {
  const tally = {};
  Object.values(votes).forEach(v => {
    if (Array.isArray(v)) {
      v.forEach(x => { tally[x] = (tally[x] || 0) + 1; });
    } else if (v) {
      tally[v] = (tally[v] || 0) + 1;
    }
  });
  return tally;
}

/**
 * Returns true if the group caught at least one imposter.
 *
 * clueless / undercover : top-voted player is THE imposter.
 * doublecross           : both imposters are in top-2 most voted.
 * reverse               : both twins are in top-2 most voted.
 */
function checkGroupWon(votes, impNames, mode) {
  const tally  = getVoteTally(votes);
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  if (mode === 'doublecross' || mode === 'reverse') {
    const top2 = sorted.slice(0, 2).map(e => e[0]);
    return mode === 'reverse'
      ? impNames.every(n => top2.includes(n))   /* must catch BOTH twins */
      : impNames.some(n => top2.includes(n));    /* catch at least one imposter */
  }
  return impNames.includes(sorted[0]?.[0]);
}

/**
 * Compute how many points each player earns this round.
 */
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
    const top2  = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(e => e[0]);
    impNames.forEach(imp => {
      if (!top2.includes(imp)) earned[imp] = (earned[imp] || 0) + 2;
    });

  } else if (mode === 'reverse') {
    /* +1 for any voter who correctly names a twin */
    playerNames.forEach(voter => {
      if (impNames.includes(votes[voter])) earned[voter]++;
    });
    const tally = getVoteTally(votes);
    const top2  = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(e => e[0]);
    /* +2 each twin who escapes the top-2 */
    impNames.forEach(imp => {
      if (!top2.includes(imp)) earned[imp] = (earned[imp] || 0) + 2;
    });

  } else {
    const imp = impNames[0];
    playerNames.forEach(voter => {
      if (votes[voter] === imp) earned[voter]++;
    });
    const tally = getVoteTally(votes);
    const top   = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (imp && top !== imp) earned[imp] = (earned[imp] || 0) + 2;
  }

  return earned;
}

/* ──────────────────────────────────────
   ROUND CREATION
────────────────────────────────────── */

/**
 * Standard round (clueless / undercover / doublecross).
 *
 * @param {object[]} players   - Array of { id, name, colorIdx }
 * @param {string}   mode      - "clueless" | "undercover" | "doublecross"
 * @param {object[]} questions - Array of { a, b } pairs
 * @param {number[]} used      - Already-used question indices
 * @returns {object}           - Round data spread into state
 */
function createStandardRound({ players, mode, questions, used }) {
  const rng = getRNG();
  const pc  = players.length;

  /* Pick question */
  const avail     = questions.map((_, i) => i).filter(i => !used.includes(i));
  const isCycling = avail.length === 0;
  const pool      = isCycling ? questions.map((_, i) => i) : avail;
  const pick      = pool[Math.floor(rng() * pool.length)];
  const newUsed   = isCycling ? [pick] : [...used, pick];

  /* Randomise which side is "main" */
  const raw     = questions[pick];
  const swapped = rng() < 0.5;
  const qPair   = swapped ? { a: raw.b, b: raw.a } : { a: raw.a, b: raw.b };

  /* Shuffle answer order */
  const qOrder = shuffleRNG(players.map((_, i) => i));

  /* Pick imposter(s) */
  let impIdxs;
  if (mode === 'doublecross' && pc >= 3) {
    const i1 = Math.floor(rng() * pc);
    let   i2 = Math.floor(rng() * (pc - 1));
    if (i2 >= i1) i2++;
    impIdxs = [i1, i2];
  } else {
    impIdxs = [Math.floor(rng() * pc)];
  }

  /* Shuffle vote order */
  const voteOrder = shuffleRNG(players.map(p => p.name));

  /* Pick a player subject for [Player] substitution */
  const playerSubject = players[Math.floor(rng() * pc)].name;

  return {
    qPair,
    qOrder,
    impIdxs,
    voteOrder,
    newUsed,
    isCycling,
    playerVariants: null,
    playerSubject,
  };
}

/**
 * Reverse round — two players share the same question variant;
 * every other player gets a unique variant.
 *
 * @param {object[]} players   - Array of { id, name, colorIdx }
 * @param {object[]} questions - Array of { variants: string[] } (≥ pc−1 variants each)
 * @param {number[]} used      - Already-used question indices
 */
function createReverseRound({ players, questions, used }) {
  const rng = getRNG();
  const pc  = players.length;

  if (!questions || questions.length === 0) {
    /* Fallback: return empty-ish data rather than crashing */
    return {
      qPair:          { a: '(no reverse questions loaded)', b: '(no reverse questions loaded)' },
      qOrder:         players.map((_, i) => i),
      impIdxs:        [0, 1],
      voteOrder:      players.map(p => p.name),
      newUsed:        used,
      isCycling:      false,
      playerVariants: null,
      playerSubject:  players[0]?.name || '',
    };
  }

  /* Pick question */
  const avail     = questions.map((_, i) => i).filter(i => !used.includes(i));
  const isCycling = avail.length === 0;
  const pool      = isCycling ? questions.map((_, i) => i) : avail;
  const pick      = pool[Math.floor(rng() * pool.length)];
  const newUsed   = isCycling ? [pick] : [...used, pick];

  const variants = questions[pick].variants;

  /* Pick 2 twin indices */
  const i1 = Math.floor(rng() * pc);
  let   i2 = Math.floor(rng() * (pc - 1));
  if (i2 >= i1) i2++;
  const twinIdxs = [i1, i2];

  /* Assign variants */
  const shuffled       = shuffleRNG(players.map((_, i) => i));
  const playerVariants = {};
  let   variantOffset  = 1;

  shuffled.forEach(idx => {
    const name = players[idx].name;
    if (twinIdxs.includes(idx)) {
      playerVariants[name] = variants[0];                              /* shared */
    } else {
      playerVariants[name] = variants[variantOffset] ?? variants[0];  /* unique */
      variantOffset++;
    }
  });

  const qOrder     = shuffleRNG(players.map((_, i) => i));
  const voteOrder  = shuffleRNG(players.map(p => p.name));
  const playerSubject = players[Math.floor(rng() * pc)].name;

  return {
    qPair:          { a: variants[0], b: variants[0] }, /* shared q used in reveal */
    qOrder,
    impIdxs:        twinIdxs,
    voteOrder,
    newUsed,
    isCycling,
    playerVariants,
    playerSubject,
  };
}

/**
 * Unified entry point — dispatches to the right creator based on mode.
 */
function createRound({ players, mode, questions, reverseQuestions, used }) {
  if (mode === 'reverse') {
    return createReverseRound({ players, questions: reverseQuestions, used });
  }
  return createStandardRound({ players, mode, questions, used });
}
