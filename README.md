# 🕵️ Outlier

A pass-the-phone party game for 2–10 players. Most people get the same question. One person gets a slightly different one. Everyone writes their answer, then votes on who they think was the odd one out.

---

## How to Play

**1. Setup** — Choose a game mode, pick how many rounds, add player names, and optionally set a timer.

**2. Question phase** — The phone is passed to each player privately. Everyone reads their question and writes their answer without showing anyone.

**3. Vote phase** — The phone goes around again. Each player sees all the answers and votes for who they think had the different question.

**4. Reveal** — The outlier is dramatically revealed, both questions are shown side by side, and points are awarded.

**5. Repeat** — Play as many rounds as you set, then crown a winner.

---

## Game Modes

| Mode | Description |
|------|-------------|
| 🤷 **Clueless** | The outlier doesn't know they're the outlier. Everyone is equally in the dark. |
| 🕵️ **Undercover** | The outlier knows — they just have to blend in without getting caught. |
| 🎭 **Double Cross** | Two outliers, neither knows the other exists. Voters must identify both. Requires 3+ players. |

---

## Scoring

- **+1 point** for each player who correctly votes for an outlier
- **+2 points** to an outlier who escapes detection (not in the top votes)

---

## Setup

The game runs entirely in the browser — no install, no account, no server required beyond static file hosting.

### Files

```
Index.HTML       Main entry point
app.js           React UI (requires Babel — loaded as text/babel)
gameEngine.js    Pure game logic — RNG, scoring, round generation
sounds.js        Web Audio synth engine — no sound files needed
style.css        All styles and keyframe animations
question.JSON    Question pairs — edit freely to add your own
```

### Running locally

```bash
npx serve .
```

Then open `http://localhost:3000` in your browser.

> **Note:** The game uses `fetch("question.JSON")` to load questions, which requires a server context. Opening `Index.HTML` directly as a `file://` URL will show a "not found" error. Use `npx serve .`, VS Code Live Server, or any static host.

### Hosting on GitHub Pages

1. Push all files to a public repository
2. Go to **Settings → Pages → Source → main branch / root**
3. The game will be live at `https://yourusername.github.io/your-repo-name`

> **Case sensitivity:** GitHub Pages runs on Linux. The file must be named exactly `question.JSON` — not `question.json` or `Question.JSON`.

---

## question.JSON Format

Each entry is a pair of questions that would produce the same *type* of answer (a food, a city, a person) from different angles. The outlier's question is subtly different — not opposite, just a different way of getting to a similar answer.

```json
[
  {
    "a": "Question shown to most players",
    "b": "Question shown to the outlier"
  },
  {
    "a": "What's your go-to takeaway order?",
    "b": "What's the first thing you'd eat after a long flight?"
  }
]
```

Which side becomes the "outlier question" is randomised each round, so `a` and `b` are interchangeable in practice.

---

## Tech Stack

- **React 18** (UMD build, no bundler)
- **Babel Standalone** (transpiles JSX in the browser)
- **Web Audio API** (all sounds synthesised — no audio files)
- **Vanilla CSS** (no framework)
- Zero npm dependencies at runtime
