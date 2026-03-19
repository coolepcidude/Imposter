/* ════════════════════════════════════════════════════
   sounds.js
   Web Audio API sound engine.
   Exposed as the global SoundEngine object.
   All sounds are synthesised — no external files needed.
════════════════════════════════════════════════════ */

const SoundEngine = (() => {
  let ctx     = null;
  let enabled = true;

  /* Lazily create the AudioContext on first use
     (browsers require a user gesture before allowing audio). */
  function getCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {
        enabled = false;
      }
    }
    return ctx;
  }

  /**
   * Play a single synthesised tone.
   * @param {number}  freq  - Frequency in Hz
   * @param {string}  type  - OscillatorType: "sine" | "square" | "sawtooth" | "triangle"
   * @param {number}  dur   - Duration in seconds
   * @param {number}  vol   - Peak gain (0–1)
   * @param {number}  at    - Start offset from now (seconds)
   */
  function tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.25, at = 0 }) {
    if (!enabled) return;
    try {
      const ac   = getCtx();
      if (!ac)   return;
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime + at);
      gain.gain.setValueAtTime(vol, ac.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + at + dur);
      osc.start(ac.currentTime + at);
      osc.stop(ac.currentTime  + at + dur + 0.05);
    } catch (_) { /* silently ignore */ }
  }

  return {
    /* Toggle sound on/off. Returns new enabled state. */
    toggle()    { enabled = !enabled; return enabled; },
    isEnabled() { return enabled; },

    /* UI interactions */
    click() { tone({ freq: 880, dur: 0.06, vol: 0.14 }); },
    vote()  { tone({ freq: 660, dur: 0.09, vol: 0.18 }); },

    /* Answer submitted */
    submit() {
      tone({ freq: 523, dur: 0.10, vol: 0.22 });
      tone({ freq: 784, dur: 0.15, vol: 0.22, at: 0.10 });
    },

    /* Reveal suspense (low drone) */
    suspense() {
      tone({ freq: 150, type: 'sawtooth', dur: 1.8, vol: 0.10 });
      tone({ freq: 153, type: 'sawtooth', dur: 1.8, vol: 0.07, at: 0.08 }); /* slight detune */
    },

    /* Stinger when name is revealed */
    reveal() {
      [330, 440, 550, 660].forEach((f, i) => {
        tone({ freq: f, dur: 0.18, vol: 0.24, at: i * 0.10 });
      });
    },

    /* Group wins */
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        tone({ freq: f, dur: 0.22, vol: 0.26, at: i * 0.11 });
      });
    },

    /* Imposter escapes */
    lose() {
      tone({ freq: 400, dur: 0.20, vol: 0.28 });
      tone({ freq: 300, dur: 0.30, vol: 0.28, at: 0.20 });
      tone({ freq: 200, dur: 0.50, vol: 0.22, at: 0.48 });
    },

    /* Timer ticks (last 5 seconds) */
    tick()      { tone({ freq: 1100, type: 'square', dur: 0.04, vol: 0.11 }); },
    timerWarn() { tone({ freq:  880, type: 'square', dur: 0.06, vol: 0.18 }); },

    /* Timer expired */
    timerEnd()  { tone({ freq: 200, type: 'sawtooth', dur: 0.60, vol: 0.32 }); },
  };
})();
