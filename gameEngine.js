/* ════════════════════════════════════════════════════
   gameEngine.js
   Pure game logic — no React, no DOM.
   All functions are exposed as globals so app.js can
   call them without a bundler.
════════════════════════════════════════════════════ */

/* ──────────────────────────────────────
   SEEDABLE RNG
   Replaces scattered Math.random() calls.
   Call resetRNG() before a new game to get
   reproducible round sequences.
────────────────────────────────────── */
function createRNG(seed) {
  let t = seed;
  return function rng() {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}

let _rng = createRNG(Date.now());

/** Reset the module-level RNG (call before starting a new game). */
function resetRNG(seed) {
  _rng = createRNG(seed !== undefined ? seed : Date.now());
}

/** Grab the current RNG (used internally by createRound). */
function getRNG() {
  return _rng;
}

/* ──────────────────────────────────────
   UTILITIES
────────────────────────────────────── */

/** Generate a short unique ID for player objects. */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Fisher-Yates shuffle using the shared RNG. */
function shuffleRNG(arr) {
  const r = [...arr];
  const rng = getRNG();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/* ──────────────────────────────────────
   VOTE LOGIC
   Centralised — used by reducer AND
   reveal render so there's one source
   of truth.
────────────────────────────────────── */

/**
 * Build a tally { playerName: voteCount } from the votes map.
 * Handles both single-vote (clueless/undercover) and
 * dual-vote (doublecross) formats.
 */
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
 * - clueless / undercover: top-voted player must be THE imposter.
 * - doublecross: at least one imposter in the top-2 most voted.
 */
function checkGroupWon(votes, impNames, mode) {
  const tally  = getVoteTally(votes);
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (mode === 'doublecross') {
    const top2 = sorted.slice(0, 2).map(e => e[0]);
    return impNames.some(n => top2.includes(n));
  }
  return impNames.includes(sorted[0]?.[0]);
}

/**
 * Compute how many points each player earns this round.
 *
 * Correct vote (any mode):   +1 per correctly identified imposter
 * Escaped imposter bonus:    +2 if the imposter was not in the top-voted
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
   Single function that produces
   everything needed to start a round.
────────────────────────────────────── */

/**
 * @param {object[]} players   - Array of player objects { id, name, colorIdx }
 * @param {string}   mode      - "clueless" | "undercover" | "doublecross"
 * @param {object[]} questions - Array of { a, b } question pairs
 * @param {number[]} used      - Indices of already-used questions
 * @returns {object}           - Round data ready to be spread into state
 */
function createRound({ players, mode, questions, used }) {
  const rng = getRNG();
  const pc  = players.length;

  /* ── Pick a question ── */
  const avail      = questions.map((_, i) => i).filter(i => !used.includes(i));
  const isCycling  = avail.length === 0;
  const pool       = isCycling ? questions.map((_, i) => i) : avail;
  const pick       = pool[Math.floor(rng() * pool.length)];
  const newUsed    = isCycling ? [pick] : [...used, pick];

  /* ── Randomly decide which side is "main" and which is "imposter" ── */
  const raw    = questions[pick];
  const swapped = rng() < 0.5;
  const qPair  = swapped ? { a: raw.b, b: raw.a } : { a: raw.a, b: raw.b };

  /* ── Shuffle answer order ── */
  const qOrder = shuffleRNG(players.map((_, i) => i));

  /* ── Pick imposter(s) ── */
  let impIdxs;
  if (mode === 'doublecross' && pc >= 3) {
    const i1 = Math.floor(rng() * pc);
    let   i2 = Math.floor(rng() * (pc - 1));
    if (i2 >= i1) i2++;
    impIdxs = [i1, i2];
  } else {
    impIdxs = [Math.floor(rng() * pc)];
  }

  /* ── Shuffle vote order ── */
  const voteOrder = shuffleRNG(players.map(p => p.name));

  return { qPair, qOrder, impIdxs, voteOrder, newUsed, isCycling };
}
