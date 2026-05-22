// ── AUDIO ENGINE ──────────────────────────────────────────────────────────────
const AudioEngine = (() => {

  const KITS = {
    classic: {
      bombo: (ctx, t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(80, t);
        o.frequency.exponentialRampToValueAtTime(0.01, t + 0.18);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.2);
      },
      caja: (ctx, t) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 3000; src.buffer = buf;
        g.gain.setValueAtTime(0.25, t);
        src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
      }
    },
    chip8: {
      bombo: (ctx, t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(120, t); o.frequency.setValueAtTime(80, t + 0.02);
        o.frequency.setValueAtTime(50, t + 0.04); o.frequency.setValueAtTime(28, t + 0.07);
        g.gain.setValueAtTime(0.4, t); g.gain.linearRampToValueAtTime(0, t + 0.12);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.13);
      },
      caja: (ctx, t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(440, t); o.frequency.setValueAtTime(880, t + 0.01);
        o.frequency.setValueAtTime(220, t + 0.02);
        g.gain.setValueAtTime(0.2, t); g.gain.linearRampToValueAtTime(0, t + 0.06);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.07);
      }
    },
    taiko: {
      bombo: (ctx, t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(55, t);
        o.frequency.exponentialRampToValueAtTime(28, t + 0.3);
        g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.4);
      },
      caja: (ctx, t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(180, t);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.16);
      }
    },
    electro: {
      bombo: (ctx, t) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), dist = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i * 2 / 256) - 1; curve[i] = x < 0 ? -1 : 1; }
        dist.curve = curve; o.type = 'sine';
        o.frequency.setValueAtTime(100, t); o.frequency.exponentialRampToValueAtTime(0.01, t + 0.22);
        g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(dist); dist.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.23);
      },
      caja: (ctx, t) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() > 0.5 ? 0.5 : -0.5;
        const src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = buf; g.gain.setValueAtTime(0.3, t); g.gain.linearRampToValueAtTime(0, t + 0.08);
        src.connect(g); g.connect(ctx.destination); src.start(t);
      }
    },
    march: {
      bombo: (ctx, t) => {
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
        o1.type = 'sine'; o2.type = 'triangle';
        o1.frequency.setValueAtTime(50, t); o2.frequency.setValueAtTime(70, t);
        o1.frequency.exponentialRampToValueAtTime(20, t + 0.4);
        o2.frequency.exponentialRampToValueAtTime(20, t + 0.3);
        g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        o1.connect(g); o2.connect(g); g.connect(ctx.destination);
        o1.start(t); o2.start(t); o1.stop(t + 0.5); o2.stop(t + 0.5);
      },
      caja: (ctx, t) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          const env = Math.exp(-i / (ctx.sampleRate * 0.04));
          d[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.5;
        src.buffer = buf; g.gain.setValueAtTime(0.4, t);
        src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
      }
    }
  };

  function createMelodySound(ctx, freq, start, duration, gain, timbre, bandMode) {
    const type = bandMode === 'band' ? 'triangle' : timbre;
    const g = ctx.createGain();
    const actualGain = gain;

    if (type === 'pulse') {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = 'square'; o2.type = 'square';
      o1.frequency.setValueAtTime(freq, start); o2.frequency.setValueAtTime(freq * 1.003, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(actualGain * 0.55, start + 0.01);
      g.gain.setValueAtTime(actualGain * 0.4, start + duration * 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.01);
      o1.connect(g); o2.connect(g); g.connect(ctx.destination);
      o1.start(start); o2.start(start); o1.stop(start + duration); o2.stop(start + duration);
      return;
    }
    if (type === 'chip') {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o.type = 'triangle'; o2.type = 'square';
      o.frequency.setValueAtTime(freq, start); o2.frequency.setValueAtTime(freq * 2, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(actualGain * 0.5, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, start + duration);
      g2.gain.setValueAtTime(actualGain * 0.06, start);
      g2.gain.exponentialRampToValueAtTime(0.001, start + duration);
      o.connect(g); o2.connect(g2); g.connect(ctx.destination); g2.connect(ctx.destination);
      o.start(start); o2.start(start); o.stop(start + duration); o2.stop(start + duration);
      return;
    }
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(actualGain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.01);
    o.connect(g); g.connect(ctx.destination); o.start(start); o.stop(start + duration);
  }

  function triggerPerc(ctx, time, type, kitName) {
    if (!ctx || !KITS[kitName]) return;
    KITS[kitName][type](ctx, time);
  }

  return { createMelodySound, triggerPerc, KITS };
})();

export default AudioEngine;
