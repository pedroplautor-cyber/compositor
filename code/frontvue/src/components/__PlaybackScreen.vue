<template>
  <div class="playback-screen" v-if="active">
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>
    <div ref="noteFlash" class="note-flash"></div>

    <!-- HEADER / TITLE -->
    <div class="pb-header">
      <div class="pb-title-wrap">
        <span class="live-badge">LIVE</span>
        <h2 class="pb-title">{{ song.title }}</h2>
      </div>
    </div>

    <!-- IMAGEN o MÚSICOS (Ajustado a estética moderna) -->
    <div v-if="hasCustomImage" class="pb-image-wrap">
      <canvas ref="pbPixelCanvas" class="pb-pixel-canvas"></canvas>
    </div>
    <div v-else class="pb-musicians-bar">
      <div
        v-for="musician in musicians" 
        :key="musician.id"
        :class="['pb-musician', activeMusicianId === musician.id ? 'active' : '']"
      >
        <div class="musician-icon-wrap">
          <span class="musician-emoji">{{ musician.emoji }}</span>
          <div class="pulse-ring" v-if="activeMusicianId === musician.id"></div>
        </div>
        <div class="musician-label">{{ musician.label }}</div>
      </div>
    </div>

    <!-- KARAOKE VIEWPORT -->
    <div class="karaoke-viewport" ref="karaokeViewport">
      <div class="karaoke-scroll" ref="karaokeScroll">
        <div
          v-for="(mdata, mi) in scoreData"
          :key="mi"
          :class="['score-measure-wrap',
            mi < currentMeasure ? 'row-past' : '',
            mi === currentMeasure ? 'row-current' : ''
          ]"
          :ref="el => { if(el) measureRefs[mi] = el; }"
        >
          <div class="score-measure-num">
            <span>{{ String(mi + 1).padStart(2, '0') }}</span>
          </div>
          <div class="score-measure-table" :style="{ gridTemplateColumns: 'repeat(' + mdata.SUBS + ', 1fr)' }">
            <template v-for="(seg, si) in mdata.melSegs" :key="'m' + si">
              <div
                :class="['score-beat-cell',
                  mi === currentMeasure && si === currentMelCell ? 'beat-active' : '',
                  mi < currentMeasure ? 'beat-past' : ''
                ]"
                :style="{ gridColumn: (seg.startCol + 1) + ' / span ' + seg.cols, gridRow: '1' }"
              >
                <div class="score-beat-label" v-if="seg.startCol % 4 === 0">⏱ B{{ Math.round(seg.startCol / 4) + 1 }}</div>
                <div
                  :class="['score-note-chip',
                    seg.note.isRest ? 'rest-chip' : '',
                    mi === currentMeasure && si === currentMelCell && !seg.note.isRest ? 'note-lit' : ''
                  ]"
                  :style="getLitStyle(seg.note, mi === currentMeasure && si === currentMelCell)"
                >
                  {{ getNoteDisplay(seg.note) }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- VISUALIZER (Estilo barras de espectro modernas) -->
    <div class="pb-visualizer">
      <div
        v-for="note in notesList" 
        :key="note"
        class="pb-bar-container"
      >
        <div 
          class="pb-bar"
          :style="vizBars[note] || { height: '4px', background: 'var(--color-border)' }"
        ></div>
      </div>
    </div>

    <!-- CONTROLS (Botones estilizados profesionales) -->
    <div class="pb-controls">
      <button class="pb-btn pb-btn-play" @click="restart">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="btn-icon"><path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" /></svg>
        Reiniciar
      </button>
      <button class="pb-btn pb-btn-stop" @click="$emit('stop')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="btn-icon"><path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" /></svg>
        Detener
      </button>
    </div>
  </div>
</template>

<script>
import Parser from '@/utils/parser.js';
import AudioEngine from '@/utils/audio.js';
import Particles from '@/utils/particles.js';

export default {
  name: 'PlaybackScreen',
  props: ['song', 'active'],
  emits: ['stop'],

  data() {
    return {
      audioCtx: null,
      animTimeouts: [],
      scoreData: [],
      currentMeasure: -1,
      currentMelCell: -1,
      currentHarCell: -1,
      activeMusicianId: null,
      vizBars: {},
      musicians: [],
      measureRefs: {},
      notesList: Parser.NOTES_LIST,
      hasCustomImage: false,
    };
  },

  computed: {
    targetBeats() { 
      return Parser.getTargetBeats(this.song.timeSignature); 
    }
  },

  watch: {
    active(val) {
      if (val) this.$nextTick(() => this.start());
      else this.stop();
    }
  },

  methods: {
    getNoteDisplay(note) {
      if (note.isChord) return note.notes.map(n => n.name).join('·');
      if (note.isRest) return '—';
      return note.name;
    },

    getLitStyle(note, isActive) {
      if (!isActive || note.isRest) return {};
      const rawName = note.isChord ? (note.notes[0] && note.notes[0].name) : note.name;
      const color = Parser.NOTE_COLORS[rawName] || '#6366f1';
      return { 
        color: '#ffffff', 
        background: color, 
        borderColor: color,
        boxShadow: `0 4px 14px ${color}80` 
      };
    },

    buildMusicians() {
      const m = [{ id: 'PERC', emoji: '🥁', label: 'Percusión' }];
      if (this.song.bandMode === 'band') {
        const active = new Set();
        this.song.measures.forEach(row => {
          const [mel] = row.text.split('|');
          Parser.tokenizePart(mel, this.song.bpm).forEach(t => {
            if (!t.isRest) active.add(t.canonName || t.name);
          });
        });
        Parser.NOTES_LIST.forEach(n => {
          if (active.has(n)) m.push({ id: n, emoji: '🎺', label: `Sint. ${n}` });
        });
      } else {
        m.push({ id: 'MELODY', emoji: '🎹', label: 'Melodía Principal' });
      }
      this.musicians = m;
    },

    renderPixelImage() {
      this.hasCustomImage = !!(window._customPixelCanvas || this.song.customImageSrc);
      if (!this.hasCustomImage) return;
      this.$nextTick(() => {
        const src = window._customPixelCanvas;
        const canvas = this.$refs.pbPixelCanvas;
        if (!canvas || !src) return;
        const sw = window.innerWidth;
        const ratio = src.height / src.width;
        canvas.width = src.width; canvas.height = src.height;
        canvas.style.width = sw + 'px';
        canvas.style.height = Math.round(sw * ratio) + 'px';
        const ctx = canvas.getContext('2d');
        if(ctx) ctx.drawImage(src, 0, 0);
      });
    },

    pulsePixelImage(color) {
      const canvas = this.$refs.pbPixelCanvas;
      if (!canvas || !window._customPixelCanvas) return;
      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = color || '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
      setTimeout(() => {
        if (!window._customPixelCanvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(window._customPixelCanvas, 0, 0);
      }, 90);
    },

    initParticles() {
      this.$nextTick(() => {
        const canvas = this.$refs.particleCanvas;
        if (canvas) Particles.init(canvas);
      });
    },

    flashNote(cleanName, color, duration) {
      this.vizBars = { ...this.vizBars, [cleanName]: { height: '100%', background: color, boxShadow: `0 0 8px ${color}` } };
      const t = setTimeout(() => {
        const bars = { ...this.vizBars };
        bars[cleanName] = { height: '4px', background: 'var(--color-border)' };
        this.vizBars = bars;
      }, Math.max(100, duration * 900));
      this.animTimeouts.push(t);
    },

    scrollToMeasure(mi) {
      const scroll = this.$refs.karaokeScroll;
      const viewport = this.$refs.karaokeViewport;
      const row = this.measureRefs[mi];
      if (!row || !scroll || !viewport) return;
      const viewH = viewport.offsetHeight;
      const rowTop = row.offsetTop;
      const rowH = row.offsetHeight;
      const targetScroll = rowTop - viewH * 0.35 + rowH / 2;
      scroll.style.transform = `translateY(-${Math.max(0, targetScroll)}px)`;
    },

    scheduleVisual(note, start, mi, melCi, harCi) {
      if (!this.audioCtx) return;
      const delay = Math.max(0, (start - this.audioCtx.currentTime) * 1000);
      const rawName = note.isChord ? (note.notes[0] && note.notes[0].name) : note.name;
      const cleanName = rawName ? rawName.replace(/[0-9<>._-]/g, '') : '';
      const color = Parser.NOTE_COLORS[cleanName] || '#6366f1';

      const t = setTimeout(() => {
        const fl = this.$refs.noteFlash;
        if (fl) { fl.style.background = color; fl.style.opacity = '0.04'; setTimeout(() => fl.style.opacity = '0', 100); }

        if (cleanName) this.flashNote(cleanName, color, note.duration);

        const mid = this.song.bandMode === 'band' ? cleanName : 'MELODY';
        this.activeMusicianId = mid;
        setTimeout(() => { if (this.activeMusicianId === mid) this.activeMusicianId = null; }, 150);

        if (this.hasCustomImage && !note.isRest) this.pulsePixelImage(color);

        if (mi !== null) {
          this.currentMeasure = mi;
          this.currentMelCell = melCi !== null ? melCi : -1;
          this.currentHarCell = harCi !== null ? harCi : -1;
          this.scrollToMeasure(mi);
        }

        if (!note.isRest) Particles.burst(color, false);
      }, delay);
      this.animTimeouts.push(t);
    },

    start() {
      this.stop();
      this.buildMusicians();
      this.renderPixelImage();
      this.initParticles();
      this.currentMeasure = -1; this.currentMelCell = -1; this.currentHarCell = -1;
      this.measureRefs = {};

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      
      const ctx = this.audioCtx;
      const now = ctx.currentTime + 0.1;
      const bpm = this.song.bpm;
      const bd = 60 / bpm;

      const { melody, harmony } = Parser.parseMeasures(
        this.song.measures.map(m => m.text), bpm
      );

      const scoreData = Parser.buildScoreData(melody, harmony, this.song.timeSignature, bpm);
      this.scoreData = scoreData;

      let timeOffset = 0;

      melody.forEach((mel, mi) => {
        const mdata = scoreData[mi];
        const melCells = mdata ? mdata.melSegs : [];
        const harCells = mdata ? mdata.harSegs : [];

        let melOff = timeOffset;
        mel.forEach((note, ni) => {
          let harCi = -1;
          if (harCells.length > 0 && melCells[ni]) {
            const relCols = melCells[ni].startCol;
            for (let h = 0; h < harCells.length; h++) {
              const hc = harCells[h];
              if (relCols >= hc.startCol && relCols < hc.startCol + hc.cols) { harCi = h; break; }
            }
          }

          this.scheduleVisual(note, now + melOff, mi, ni, harCi);

          if (!note.isRest && note.freq > 0) {
            AudioEngine.createMelodySound(ctx, note.freq, now + melOff, note.duration, 0.15,
              this.song.melodyTimbre, this.song.bandMode);
          } else if (note.isChord) {
            note.notes.forEach(n => {
              if (n && !n.isRest) AudioEngine.createMelodySound(ctx, n.freq, now + melOff, note.duration, 0.12,
                this.song.melodyTimbre, this.song.bandMode);
            });
          }
          melOff += note.duration;
        });

        let harOff = timeOffset;
        const har = harmony[mi] || [];
        har.forEach(note => {
          if (!note.isRest && note.freq > 0) {
            AudioEngine.createMelodySound(ctx, note.freq, now + harOff, note.duration, 0.12,
              this.song.melodyTimbre, this.song.bandMode);
          } else if (note.isChord) {
            note.notes.forEach(n => {
              if (n && !n.isRest) AudioEngine.createMelodySound(ctx, n.freq, now + harOff, note.duration, 0.10,
                this.song.melodyTimbre, this.song.bandMode);
            });
          }
          harOff += note.duration;
        });

        timeOffset += mel.reduce((a, n) => a + n.duration, 0);
      });

      const tb = this.targetBeats;
      for (let i = 0; i < melody.length * tb; i++) {
        const time = now + i * bd;
        AudioEngine.triggerPerc(ctx, time, i % tb === 0 ? 'bombo' : 'caja', this.song.percKit);
        const beatInMeasure = i % tb;
        const delay = Math.max(0, (time - ctx.currentTime) * 1000);
        const t = setTimeout(() => {
          this.activeMusicianId = 'PERC';
          setTimeout(() => { if (this.activeMusicianId === 'PERC') this.activeMusicianId = null; }, 150);
          if (beatInMeasure === 0) {
            Particles.burst('#a1a1aa', true);
            const fl = this.$refs.noteFlash;
            if (fl) { fl.style.background = '#ffffff'; fl.style.opacity = '0.03'; setTimeout(() => fl.style.opacity = '0', 60); }
          }
        }, delay);
        this.animTimeouts.push(t);
      }
    },

    restart() { this.start(); },

    stop() {
      if (this.audioCtx) { this.audioCtx.close(); this.audioCtx = null; }
      this.animTimeouts.forEach(clearTimeout); this.animTimeouts = [];
      Particles.destroy();
      this.currentMeasure = -1; this.currentMelCell = -1; this.currentHarCell = -1;
      this.vizBars = {};
    }
  },

  beforeUnmount() { this.stop(); }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.playback-screen {
  --color-bg: #0b0f19;
  --color-surface: #151b2c;
  --color-surface-hover: #1e263f;
  --color-text: #f3f4f6;
  --color-text-muted: #9ca3af;
  --color-border: #242f49;
  --color-primary: #6366f1;
  --color-danger: #ef4444;

  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: var(--color-bg); 
  color: var(--color-text);
  display: flex; 
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.particle-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.note-flash { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 0.1s; z-index: 2; }

/* HEADER */
.pb-header {
  position: relative; 
  z-index: 10; 
  padding: 16px 20px;
  background: rgba(21, 27, 44, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.pb-title-wrap { display: flex; align-items: center; gap: 10px; justify-content: center; }
.live-badge {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.pb-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

/* MUSICIANS BAR */
.pb-musicians-bar {
  position: relative; 
  z-index: 10; 
  flex-shrink: 0;
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 20px;
  padding: 16px; 
  background: rgba(21, 27, 44, 0.4);
  border-bottom: 1px solid var(--color-border);
}
.pb-musician { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.musician-icon-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.musician-emoji { font-size: 22px; z-index: 2; }
.musician-label { font-size: 11px; font-weight: 500; color: var(--color-text-muted); transition: color 0.2s; }

/* Efecto de pulso moderno cuando el músico toca */
.pb-musician.active .musician-icon-wrap {
  border-color: var(--color-primary);
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
}
.pb-musician.active .musician-label { color: var(--color-text); }
.pulse-ring {
  position: absolute;
  inset: -2px;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: pulse 1s cubic-bezier(0.24, 0, 0.38, 1) infinite;
}
@keyframes pulse {
  0% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

/* PIXEL IMAGE MAP */
.pb-image-wrap {
  position: relative; z-index: 10; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #000; border-bottom: 1px solid var(--color-border);
}
.pb-pixel-canvas { display: block; image-rendering: pixelated; }

/* KARAOKE VIEWPORT */
.karaoke-viewport {
  flex: 1; 
  overflow: hidden; 
  position: relative; 
  z-index: 10;
  padding: 0 16px;
  background: var(--color-bg);
  mask-image: linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%);
}
.karaoke-scroll {
  display: flex; flex-direction: column; gap: 12px;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.score-measure-wrap { display: flex; align-items: stretch; gap: 12px; flex-shrink: 0; }

.score-measure-num { 
  font-size: 12px; 
  font-weight: 600;
  color: var(--color-text-muted); 
  width: 32px; 
  flex-shrink: 0; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.score-measure-table { flex: 1; display: grid; gap: 6px; }

.score-beat-cell {
  border: 1px solid var(--color-border); 
  background: rgba(21, 27, 44, 0.5);
  border-radius: 8px;
  padding: 10px; 
  min-height: 54px; 
  position: relative;
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.score-beat-cell.beat-active { 
  border-color: var(--color-primary) !important; 
  background: rgba(99, 102, 241, 0.08) !important;
  box-shadow: inset 0 0 12px rgba(99, 102, 241, 0.1);
}
.score-beat-label { position: absolute; top: 4px; left: 6px; font-size: 9px; font-weight: 500; color: var(--color-text-muted); opacity: 0.6; }

.score-note-chip {
  font-size: 13px; 
  font-weight: 600;
  padding: 4px 10px; 
  border-radius: 6px;
  background: var(--color-surface-hover); 
  color: var(--color-text); 
  border: 1px solid var(--color-border);
  transition: all 0.15s ease;
  white-space: nowrap; 
  max-width: 90%; 
  overflow: hidden; 
  text-overflow: ellipsis;
}
.score-note-chip.rest-chip { color: var(--color-text-muted); opacity: 0.3; background: transparent; border-color: transparent; font-weight: 400; }

/* Estados de Fila Pasada/Actual */
.row-current .score-measure-num { 
  color: #ffffff; 
  background: var(--color-primary); 
  border-color: var(--color-primary);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
}
.row-past { opacity: 0.35; filter: grayscale(40%); transition: opacity 0.3s; }

/* VISUALIZER */
.pb-visualizer {
  position: relative; z-index: 10; display: flex; gap: 4px; height: 40px;
  align-items: flex-end; justify-content: center; padding: 0 24px; flex-shrink: 0;
  background: var(--color-surface); border-top: 1px solid var(--color-border);
}
.pb-bar-container { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.pb-bar { width: 100%; border-radius: 2px 2px 0 0; transition: height 0.08s, background 0.15s; }

/* CONTROLS */
.pb-controls {
  position: relative; z-index: 10; display: flex;
  gap: 12px; padding: 16px 24px; flex-shrink: 0; 
  background: rgba(21, 27, 44, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
}
.pb-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-icon { width: 18px; height: 18px; }

.pb-btn-play { background: var(--color-primary); color: #fff; }
.pb-btn-play:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
.pb-btn-play:active { transform: translateY(0); }

.pb-btn-stop { background: var(--color-surface-hover); color: var(--color-text); border: 1px solid var(--color-border); }
.pb-btn-stop:hover { background: #242f49; color: #fff; }
</style>