<template>
  <div class="playback-screen" v-if="active">
    <div class="pb-header">
      <div class="pb-title-wrap">
        <span class="live-badge">LIVE</span>
        <h2 class="pb-title">{{ song.title }}</h2>
      </div>
    </div>

    <div v-if="currentSectionLabel" class="current-section-banner">
      Sección Actual: <strong>{{ currentSectionLabel }}</strong>
    </div>

    <div class="karaoke-band-container">
      
      <div class="karaoke-timeline" ref="timelineContainer">
        <div class="activation-line"></div>
        <div class="scrolling-notes" :style="{ transform: `translateX(${-currentXOffset}px)` }">
          <div 
            v-for="(note, index) in renderedNotes" 
            :key="index"
            class="karaoke-note-block"
            :class="{ 'is-active': activeMidiNotes.has(note.midi) }"
            :style="{
              left: note.x + 'px',
              width: note.width + 'px',
              backgroundColor: note.color
            }"
          >
            <span class="note-name">{{ note.name }}</span>
          </div>
        </div>
      </div>

      <div class="band-stage">
        <div 
          v-for="musician in musicians" 
          :key="musician.noteName"
          class="musician-wrapper"
          :class="{ 'jump': isMusicianActive(musician.midiValues) }"
        >
          <div class="musician-avatar" :style="{ backgroundColor: musician.color }">
            {{ musician.avatar }}
          </div>
          <div class="musician-info">
            <span class="musician-note">{{ musician.noteName }}</span>
            <span class="musician-instrument">{{ musician.instrument }}</span>
          </div>
        </div>
      </div>

    </div>

    <div class="pb-controls">
      <button class="pb-btn pb-btn-play" @click="restart">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
          <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
        </svg>
        Reiniciar BANDA
      </button>
      <button class="pb-btn pb-btn-stop" @click="$emit('stop')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
          <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" />
        </svg>
        Detener BANDA
      </button>
    </div>
  </div>
</template>

<script>
import Parser from '@/utils/parser.js';
import AudioEngine from '@/utils/audio.js';

export default {
  name: 'PlayerBanda',
  props: {
    song: { type: Object, required: true },
    active: { type: Boolean, required: true }
  },
  emits: ['stop'],

  data() {
    return {
      audioCtx: null,
      audioStartTime: 0, 
      animationFrameId: null,
      notesTimeline: [], // Guardará ÚNICAMENTE la melodía principal
      activeMidiNotes: new Set(), 
      currentSectionLabel: '', 
      
      currentXOffset: 0,
      pixelsPerSecond: 160, // Velocidad del scroll horizontal
      renderedNotes: [],

      startMidi: 36,  // C2
      endMidi: 95,    // B6
      
      // Banda configurada con los nombres de las notas en castellano
      musicians: [
        { noteName: 'Do', instrument: '🎹 Piano', avatar: '🐱', color: '#ef4444', midiValues: [36, 48, 60, 72, 84] },
        { noteName: 'Re', instrument: '🎸 Bajo', avatar: '🐶', color: '#f97316', midiValues: [38, 50, 62, 74, 86] },
        { noteName: 'Mi', instrument: '🥁 Batería', avatar: '🦊', color: '#eab308', midiValues: [40, 52, 64, 76, 88] },
        { noteName: 'Fa', instrument: '🎷 Saxo', avatar: '🐸', color: '#22c55e', midiValues: [41, 53, 65, 77, 89] },
        { noteName: 'Sol', instrument: '🎺 Trompeta', avatar: '🦁', color: '#06b6d4', midiValues: [43, 55, 67, 79, 91] },
        { noteName: 'La', instrument: '🎸 Guitarra', avatar: '🐵', color: '#3b82f6', midiValues: [45, 57, 69, 81, 93] },
        { noteName: 'Si', instrument: '🎻 Violín', avatar: '🦄', color: '#a855f7', midiValues: [47, 59, 71, 83, 95] }
      ]
    };
  },

  watch: {
    active(val) {
      if (val) {
        this.$nextTick(() => {
          setTimeout(() => this.start(), 50);
        });
      } else {
        this.stop();
      }
    }
  },

  methods: {
    freqToMidi(freq) {
      if (!freq || freq <= 0) return null;
      return Math.round(69 + 12 * Math.log2(freq / 440));
    },

    // Convierte el valor MIDI a nomenclatura musical en español
    midiToSpanishNote(midi) {
      const names = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
      return names[midi % 12];
    },

    isMusicianActive(midiValues) {
      // Al contener activeMidiNotes solo la melodía, los músicos solo saltarán con ella
      return midiValues.some(midi => this.activeMidiNotes.has(midi));
    },

    start() {
      this.stop();
      if (!this.song || !this.song.measures) return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      const ctx = this.audioCtx;
      
      const lookAheadDelay = 1.0; 
      this.audioStartTime = ctx.currentTime + lookAheadDelay; 

      const bpm = this.song.bpm || 120;
      const { melody, harmony } = Parser.parseMeasures(
        this.song.measures.map(m => m.text), 
        bpm
      );
      
      this.notesTimeline = [];

      // 1. Procesar Melodía Principal (VA AL AUDIO Y AL KARAOKE VISUAL)
      let melodyTimeOffset = 0;
      if (melody) {
        melody.forEach((measure) => {
          if (!measure) return;
          measure.forEach((note) => {
            const noteStartAudioTime = this.audioStartTime + melodyTimeOffset;
            const notesArray = note.isChord ? note.notes : [note];

            notesArray.forEach(n => {
              if (n && !n.isRest && n.freq > 0) {
                let midi = this.freqToMidi(n.freq);
                if (midi) {
                  while (midi < this.startMidi) midi += 12;
                  while (midi > this.endMidi) midi -= 12;

                  const spanishName = this.midiToSpanishNote(midi);
                  // Usar el parser original para limpiar alteraciones si requiere color plano
                  const cleanColorKey = spanishName.replace('#', '');
                  const color = Parser.NOTE_COLORS?.[cleanColorKey] || '#4ade80';

                  // Insertamos en el timeline visual porque es MELODÍA
                  this.notesTimeline.push({
                    midi,
                    name: spanishName,
                    start: melodyTimeOffset, 
                    duration: note.duration || 0,
                    color: color,
                    label: note.label || ''
                  });
                }
                AudioEngine.createMelodySound(ctx, n.freq, noteStartAudioTime, note.duration || 0, 0.15,
                  this.song.melodyTimbre, this.song.bandMode);
              }
            });
            melodyTimeOffset += (note.duration || 0);
          });
        });
      }

      // 2. Procesar Armonía (SÓLO VA AL AUDIO ENGINE - NO APARECE EN EL KARAOKE)
      let harTimeOffset = 0;
      if (harmony) {
        harmony.forEach((measure) => {
          if (!measure) return;
          measure.forEach((note) => {
            const noteStartAudioTime = this.audioStartTime + harTimeOffset;
            const notesArray = note.isChord ? note.notes : [note];

            notesArray.forEach(n => {
              if (n && !n.isRest && n.freq > 0) {
                // Genera el sonido en segundo plano para enriquecer la reproducción
                AudioEngine.createMelodySound(ctx, n.freq, noteStartAudioTime, note.duration || 0, 0.10,
                  this.song.melodyTimbre, this.song.bandMode);
              }
            });
            harTimeOffset += (note.duration || 0);
          });
        });
      }

      this.calculateKaraokePositions();
      this.animate();
    },

    calculateKaraokePositions() {
      const activationLinePadding = 80; 
      this.renderedNotes = this.notesTimeline.map(note => {
        return {
          ...note,
          x: activationLinePadding + (note.start * this.pixelsPerSecond),
          width: Math.max(note.duration * this.pixelsPerSecond, 40) // Ajuste de tamaño para nombres más largos (Sol#, Do#)
        };
      });
    },

    animate() {
      if (!this.audioCtx) return;

      const songCurrentTime = this.audioCtx.currentTime - this.audioStartTime;
      this.currentXOffset = Math.max(0, songCurrentTime * this.pixelsPerSecond);

      this.activeMidiNotes.clear();
      let activeSection = '';

      // Evaluamos el estado activo únicamente de lo que hay en notesTimeline (Melodía)
      this.notesTimeline.forEach(note => {
        if (songCurrentTime >= note.start && songCurrentTime <= (note.start + note.duration)) {
          this.activeMidiNotes.add(note.midi);
          if (note.label) activeSection = note.label;
        }
      });

      if (activeSection) {
        this.currentSectionLabel = activeSection;
      }

      this.animationFrameId = requestAnimationFrame(this.animate);
    },

    async restart() { 
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume().catch(() => {});
      }
      this.start(); 
    },

    stop() {
      if (this.audioCtx) {
        try { this.audioCtx.close(); } catch { /**/ }
        this.audioCtx = null; 
      }
      if (this.animationFrameId) { 
        cancelAnimationFrame(this.animationFrameId); 
        this.animationFrameId = null; 
      }
      this.activeMidiNotes.clear();
      this.currentSectionLabel = '';
      this.currentXOffset = 0;
    }
  },

  beforeUnmount() { 
    this.stop(); 
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.playback-screen {
  --color-bg: #090d16;
  --color-surface: #111726;
  --color-text: #f3f4f6;
  --color-border: #1e293b;
  --color-primary: #6366f1;
  --color-danger: #ef4444;

  position: relative;
  width: 100%;
  height: 100%;
  min-height: 550px;
  background: var(--color-bg); 
  color: var(--color-text);
  display: flex; 
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  font-family: 'Inter', sans-serif;
}

.pb-header {
  padding: 14px 20px;
  background: rgba(17, 23, 38, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
  z-index: 5;
}
.pb-title-wrap { display: flex; align-items: center; gap: 10px; justify-content: center; }
.live-badge {
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-danger);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.pb-title { font-size: 15px; font-weight: 600; margin: 0; }

.current-section-banner {
  background: #1e293b;
  color: #f8fafc;
  font-size: 0.8rem;
  text-align: center;
  padding: 6px 12px;
  border-bottom: 1px solid var(--color-border);
  letter-spacing: 0.5px;
  z-index: 4;
}
.current-section-banner strong {
  color: #6366f1;
  text-transform: uppercase;
}

.karaoke-band-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px 0;
  background: linear-gradient(180deg, #070a12 0%, #0f1422 100%);
}

/* KAKAOPE HORIZONTAL */
.karaoke-timeline {
  position: relative;
  width: 100%;
  height: 80px;
  background: rgba(0, 0, 0, 0.5);
  border-top: 2px solid #1e293b;
  border-bottom: 2px solid #1e293b;
  overflow: hidden;
}

.activation-line {
  position: absolute;
  left: 80px; 
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: #f43f5e;
  box-shadow: 0 0 12px #f43f5e;
  z-index: 3;
}

.scrolling-notes {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  will-change: transform;
}

.karaoke-note-block {
  position: absolute;
  top: 15px;
  height: 50px;
  border-radius: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  box-shadow: inset 0 -4px 0 rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  border: 1px solid rgba(255,255,255,0.1);
}

.karaoke-note-block.is-active {
  transform: scaleY(1.12);
  box-shadow: 0 0 20px currentColor;
  border-color: #fff;
}

.note-name {
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

/* ESCENARIO DE LA BANDA */
.band-stage {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  padding: 20px 40px;
  flex: 1;
  min-height: 180px;
}

.musician-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: transform 0.1s ease;
}

.musician-wrapper.jump {
  animation: mini-jump 0.14s ease-in-out infinite alternate;
}

.musician-avatar {
  width: 65px;
  height: 65px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.2);
  border: 3px solid #1e293b;
  transition: border-color 0.2s;
}

.musician-wrapper.jump .musician-avatar {
  border-color: #6366f1;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.6);
}

.musician-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(17, 23, 38, 0.7);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid #1e293b;
}

.musician-note {
  font-weight: 700;
  font-size: 14px;
  color: #fff;
}

.musician-instrument {
  font-size: 11px;
  color: #94a3b8;
}

@keyframes mini-jump {
  0% { transform: translateY(0); }
  100% { transform: translateY(-30px); }
}

/* CONTROLES */
.pb-controls {
  display: flex;
  gap: 12px; 
  padding: 16px 24px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 5;
}
.pb-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border:  none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-icon { width: 18px; height: 18px; }
.pb-btn-play { background: var(--color-primary); color: #fff; }
.pb-btn-play:hover { background: #4f46e5; transform: translateY(-1px); }
.pb-btn-stop { background: #1e293b; color: var(--color-text); }
.pb-btn-stop:hover { background: #334155; }
</style>