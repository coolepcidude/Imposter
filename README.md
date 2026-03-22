# 🕵️ Outlier

A pass-the-phone party game for 4–10 players. Most people get the same question. One person gets a slightly different one. Everyone writes their answer, then votes on who they think was the odd one out.

---

## How to Play

**1. Setup** — Enter player names (minimum 4), then tap the settings bar to choose a game mode, number of rounds, question packs, and optional features.

**2. Question phase** — The phone is passed to each player privately. Everyone reads their question and writes their answer without showing anyone else.

**3. Vote phase** — The phone goes around again. Each player sees all the answers and votes for who they think had the different question.

**4. Reveal** — The outlier is dramatically revealed, both questions are shown side by side, and points are awarded.

**5. Repeat** — Play as many rounds as you set, then crown a winner.

---

## Game Modes

| Mode | Description |
|------|-------------|
| 🤷 **Clueless** | The outlier doesn't know they're the outlier. Everyone is equally in the dark. |
| 🕵️ **Undercover** | The outlier knows — they just have to blend in without getting caught. |
| 🎭 **Double Cross** | Two outliers, neither knows the other exists. Voters must identify both. |
| 🔄 **Reverse** | Everyone gets a different word and must write a question it could answer. Two players share the same word — find the matching pair. |

---

## Scoring

### Standard modes (Clueless, Undercover, Double Cross)
- **+1 point** for each player who correctly votes for an outlier
- **+2 points** to an outlier who escapes detection (not the top-voted suspect)

### Reverse mode
- **+1 point** per twin you correctly identify
- **+4 points** to each twin who was *not* in the top-2 most-voted players

### Confidence Betting (optional)
When enabled, each voter also picks a confidence level after choosing their suspect:

| Level | Correct | Wrong |
|-------|---------|-------|
| 🙂 Safe | no change | no change |
| 🔥 Confident | +1 bonus | −1 penalty |
| 🚀 Certain | +2 bonus | −2 penalty |

---

## Optional Features

### 🎲 Random Modifiers
Each player secretly receives their own random rule for the round — completely independent, so two players might have the same rule or everyone might have a different one. Rules include things like *Numbers Only*, *One Word*, *No Vowels*, *Make It Rhyme*, and nine others. The rule is only shown when it's your turn to answer.

### ⏱ Timer Mode
Players must submit before time runs out. Choose from 20 / 30 / 45 / 60 second limits. The phone auto-submits a blank answer if time expires.

### 🎯 Confidence Betting
Vote like you mean it — or play it safe. Set before confirming each vote. High confidence pays off big, but a wrong high-confidence vote costs you points.

---

## Question Packs

| Pack | Questions | Description |
|------|-----------|-------------|
| 🎲 Classic | 52 | Everyday questions about you |
| 👥 About Us | 54 | Questions that feature a player in the room |
| 🤔 Hypothetical | 64 | What would you do if… |
| 💭 Deep Cuts | 64 | Meaningful & introspective |
| 🌶️ Spicy | 62 | Unpopular opinions & hot takes |
| 📼 Nostalgia | 79 | Childhood memories & throwbacks |
| 🔢 Numbers | 57 | All answers are numbers |
| ✏️ Sentences | 89 | Complete the sentence |
| 🔄 Reverse | 20 | Single word prompts for Reverse mode |

Multiple packs can be active at once. Questions are drawn from the combined pool and never repeat until all have been used.

---

## Custom Questions

Open the **Custom Questions** panel from the setup screen to write your own questions. Each question supports up to 10 variants — different phrasings of the same question so players don't realise they're all answering the same thing.

### Save & Load
After writing your questions, tap **Generate Save Code** to produce a compact base64 string. Paste it into the **Load from Code** field on any device to restore your questions instantly — no account or server needed.

---

## Setup

The game runs entirely in the browser — no install, no account, no server required beyond static file hosting.

### File structure

```
index.html           Main entry point
app.js               React UI (requires Babel — loaded as text/babel)
gameEngine.js        Pure game logic — RNG, scoring, round generation
sounds.js            Web Audio synth engine — no sound files needed
style.css            Global styles and keyframe animations
questions/
  Main.JSON          Classic pack
  Players.JSON       About Us pack
  Hypothetical.JSON
  Deep.JSON
  Spicy.JSON
  Nostalgia.JSON
  Numbers.JSON
  Sentences.JSON
  Reverse.JSON
```

### Running locally

```bash
npx serve .
```

Then open `http://localhost:3000` in your browser.

> **Note:** The game uses `fetch()` to load question files, which requires a server context. Opening `index.html` directly as a `file://` URL will show a "not found" error. Use `npx serve .`, VS Code Live Server, or any static host.

### Hosting on GitHub Pages

1. Push all files to a public repository
2. Go to **Settings → Pages → Source → main branch / root**
3. The game will be live at `https://yourusername.github.io/your-repo-name`

---

## Question Format

All question packs use a unified variant format. Each question has up to 10 phrasings — the game engine assigns a different variant to each player, so nobody realises they're answering the same underlying question.

```json
[
  {
    "variants": [
      "What's your comfort food?",
      "What food do you eat when you need cheering up?",
      "What do you reach for after a really rough day?",
      "..."
    ]
  }
]
```

The outlier receives a randomly selected variant that differs from the one given to the rest of the group. Which side is the "outlier variant" is randomised each round.

**Reverse pack format** — each entry is a set of 10 single words. Two players share `variants[0]`; everyone else gets a unique word from the remaining slots.

```json
[
  { "variants": ["Pizza", "Coffee", "Sushi", "Pasta", "Tacos", "Ramen", "Curry", "Burger", "Salad", "Steak"] }
]
```

---

## Tech Stack

- **React 18** (UMD build, no bundler)
- **Babel Standalone** (transpiles JSX in the browser)
- **Web Audio API** (all sounds synthesised — no audio files)
- **Vanilla CSS** (no framework)
- Zero npm dependencies at runtime

---

## Theming

The game supports **dark mode** and **light mode**, toggleable with the ☀️/🌙 button in the top-right corner at all times. The initial mode follows your system preference. The theme is a warm amber / terracotta palette in dark mode and a parchment / cream palette in light mode.

---

## License

CC0 1.0 Universal — see `LICENSE`.
