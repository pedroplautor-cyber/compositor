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

    <div class="piano-visualizer-container" ref="visualizerContainer">
      <canvas ref="pianoCanvas"></canvas>
    </div>

    <div class="pb-controls">
      <button class="pb-btn pb-btn-play" @click="restart">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
          <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
        </svg>
        Reiniciar
      </button>
      <button class="pb-btn pb-btn-stop" @click="$emit('stop')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
          <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" />
        </svg>
        Detener
      </button>
    </div>
  </div>
</template>

<script>
import Parser from '@/utils/parser.js';
import AudioEngine from '@/utils/audio.js';

export default {
  name: 'PlaybackScreen',
  props: ['song', 'active'],
  emits: ['stop'],

  data() {
    return {
      audioCtx: null,
      audioStartTime: 0, 
      animationFrameId: null,
      notesTimeline: [], 
      activeNotes: new Set(), 
      currentSectionLabel: '', 

      // CONFIGURACIÓN PARA 5 OCTAVAS (C2 a B6)
      startMidi: 36,  // C2
      endMidi: 95,    // B6
      totalNotes: 60, // 5 octavas * 12 notas
      
      whiteNotesInOctave: [0, 2, 4, 5, 7, 9, 11], 
      blackNotesInOctave: [1, 3, 6, 8, 10]   
    };
  },

  watch: {
    active(val) {
      if (val) {
        // Doble ráfaga de ticks para asegurar que el DOM del v-if esté 100% renderizado con sus estilos CSS finales
        this.$nextTick(() => {
          setTimeout(() => {
            this.start();
          }, 50);
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

    isBlackKey(midiNumber) {
      const noteInOctave = midiNumber % 12;
      return this.blackNotesInOctave.includes(noteInOctave);
    },

    async __start() {
      this.stop();

      if (!this.song || !this.song.timeline || this.song.timeline.length === 0) {
        this.notesTimeline = [];
        this.currentSectionLabel = '';
        return; 
      }

      // 1. Inicialización segura del AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      const ctx = this.audioCtx;

      // SOLUCIÓN AL AUTOPLAY: Si el contexto nace suspendido (común en arranques automáticos), intentamos despertarlo
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(err => console.log("AudioContext en espera de interacción de usuario:", err));
      }
      
      const lookAheadDelay = 0.5; // Bajado a 0.5 para reducir latencia inicial percibida
      this.audioStartTime = ctx.currentTime + lookAheadDelay; 

      const bpm = this.song.bpm || 120;
      
      let targetMeasuresText = [];
      let blockMetadataMap = []; 

      this.song.timeline.forEach((block) => {
        const matchedMeasure = this.song.measures?.find(m => m.id === block.measureId);
        if (matchedMeasure) {
          targetMeasuresText.push(matchedMeasure.text);
          blockMetadataMap.push({
            label: block.label || '',
            color: block.color || null
          });
        }
      });

      if (targetMeasuresText.length === 0) return;

      const { melody, harmony } = Parser.parseMeasures(targetMeasuresText, bpm);
      this.notesTimeline = [];
      
      // 2. Procesar Melodía Principal
      let melodyTimeOffset = 0;
      if (melody && melody.length > 0) {
        melody.forEach((measure, measureIndex) => {
          if (!measure || !Array.isArray(measure)) return;

          const currentBlockMeta = blockMetadataMap[measureIndex] || { label: '', color: null };
          let currentMeasureStart = melodyTimeOffset;
          
          let totalMeasureDuration = 0;
          measure.forEach((note) => {
            if (note && typeof note.duration === 'number') {
              totalMeasureDuration += note.duration;
            }
          });
          let currentMeasureEnd = currentMeasureStart + totalMeasureDuration;

          measure.forEach((note) => {
            if (!note) return;
            
            const noteStartAudioTime = this.audioStartTime + melodyTimeOffset;
            const notesArray = note.isChord ? note.notes : [note];

            notesArray.forEach(n => {
              if (n && !n.isRest && n.freq > 0) {
                let midi = this.freqToMidi(n.freq);
                if (midi) {
                  while (midi < this.startMidi) midi += 12;
                  while (midi > this.endMidi) midi -= 12;

                  const cleanName = n.name ? n.name.replace(/[0-9<>._-]/g, '') : 'C';
                  const color = currentBlockMeta.color || (Parser.NOTE_COLORS ? Parser.NOTE_COLORS[cleanName] : '#4ade80');

                  this.notesTimeline.push({
                    midi,
                    start: melodyTimeOffset, 
                    duration: note.duration || 0,
                    color: color,
                    label: currentBlockMeta.label, 
                    measureStart: currentMeasureStart,
                    measureEnd: currentMeasureEnd
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

      // 3. Procesar Armonía Estructural
      let harTimeOffset = 0;
      if (harmony && harmony.length > 0) {
        harmony.forEach((measure, measureIndex) => {
          if (!measure || !Array.isArray(measure)) return;

          const currentBlockMeta = blockMetadataMap[measureIndex] || { label: '', color: null };
          
          measure.forEach((note) => {
            if (!note) return;

            const noteStartAudioTime = this.audioStartTime + harTimeOffset;
            const notesArray = note.isChord ? note.notes : [note];

            notesArray.forEach(n => {
              if (n && !n.isRest && n.freq > 0) {
                let midi = this.freqToMidi(n.freq);
                if (midi) {
                  while (midi < this.startMidi) midi += 12;
                  while (midi > this.endMidi) midi -= 12;

                  const color = currentBlockMeta.color || '#2563eb';

                  this.notesTimeline.push({
                    midi,
                    start: harTimeOffset,
                    duration: note.duration || 0,
                    color: color,
                    label: currentBlockMeta.label
                  });
                }
                AudioEngine.createMelodySound(ctx, n.freq, noteStartAudioTime, note.duration || 0, 0.10,
                  this.song.melodyTimbre, this.song.bandMode);
              }
            });
            harTimeOffset += (note.duration || 0);
          });
        });
      }

      // Asegurar redimensionamiento inicial del Canvas
      this.resizeCanvas();
      window.addEventListener('resize', this.resizeCanvas);
      this.animate();
    },


    start() {

      //alert(JSON.stringify(this.song))

      this.stop();

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      const ctx = this.audioCtx;
      
      const lookAheadDelay = 1.0; 
      this.audioStartTime = ctx.currentTime + lookAheadDelay; 

      
      const bpm = this.song.bpm;
      const { melody, harmony } = Parser.parseMeasures(
        this.song.measures.map(m => m.text), bpm
      );
      

      
      /*
        {"title":"DEMO TÉCNICA","bpm":100,"timeSignature":"4/4","bandMode":"duet","melodyTimbre":"triangle","percKit":"classic","customImageSrc":null,
        "measures":[{"id":1,"text":"do4 re4 mi4 fa4 | [<do <re]2 >mi2"}],
        "timeline":[{"measureId":"1","label":"","color":"#f87171"}]}

      */

      /*
      const bpm = this.song.bpm;

      // 1. Reconstruimos el orden de los compases según el timeline
      const orderedMeasureTexts = this.song.timeline.map(timelineItem => {
        // Buscamos el compás en 'measures' que coincida con el 'measureId' del timeline
        // Nota: Convertimos a String por si acaso los IDs difieren en tipo (número vs string)
        const measure = this.song.measures.find(m => String(m.id) === String(timelineItem.measureId));
        
        // Si existe, devolvemos su texto; si no, devolvemos un compás vacío (o un string vacío)
        return measure ? measure.text : "";
      });

      // 2. Pasamos el array ordenado según el timeline al Parser
      const { melody, harmony } = Parser.parseMeasures(orderedMeasureTexts, bpm);


      this.notesTimeline = [];
      */

      // 1. Melodía Principal
      let melodyTimeOffset = 0;
      melody.forEach((measure) => {
        measure.forEach((note) => {
          const noteStartAudioTime = this.audioStartTime + melodyTimeOffset;
          const notesArray = note.isChord ? note.notes : [note];

          notesArray.forEach(n => {
            if (n && !n.isRest && n.freq > 0) {
              let midi = this.freqToMidi(n.freq);
              if (midi) {
                while (midi < this.startMidi) midi += 12;
                while (midi > this.endMidi) midi -= 12;

                const cleanName = n.name ? n.name.replace(/[0-9<>._-]/g, '') : 'C';
                const color = Parser.NOTE_COLORS[cleanName] || '#4ade80';

                this.notesTimeline.push({
                  midi,
                  start: melodyTimeOffset, 
                  duration: note.duration,
                  color: color
                });
              }
              AudioEngine.createMelodySound(ctx, n.freq, noteStartAudioTime, note.duration, 0.15,
                this.song.melodyTimbre, this.song.bandMode);
            }
          });
          melodyTimeOffset += note.duration;
        });
      });

      // 2. Armonía
      let harTimeOffset = 0;
      if (harmony && harmony.length > 0) {
        harmony.forEach((measure) => {
          measure.forEach((note) => {
            const noteStartAudioTime = this.audioStartTime + harTimeOffset;
            const notesArray = note.isChord ? note.notes : [note];

            notesArray.forEach(n => {
              if (n && !n.isRest && n.freq > 0) {
                let midi = this.freqToMidi(n.freq);
                if (midi) {
                  while (midi < this.startMidi) midi += 12;
                  while (midi > this.endMidi) midi -= 12;

                  this.notesTimeline.push({
                    midi,
                    start: harTimeOffset,
                    duration: note.duration,
                    color: '#2563eb' 
                  });
                }
                AudioEngine.createMelodySound(ctx, n.freq, noteStartAudioTime, note.duration, 0.10,
                  this.song.melodyTimbre, this.song.bandMode);
              }
            });
            harTimeOffset += note.duration;
          });
        });
      }

      this.resizeCanvas();
      window.addEventListener('resize', this.resizeCanvas);
      this.animate();
    },



    resizeCanvas() {
      const canvas = this.$refs.pianoCanvas;
      const container = this.$refs.visualizerContainer;
      if (!canvas || !container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Prevenir asignaciones de tamaño 0 si los contenedores aún colapsan en el DOM
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
      }
    },

    animate() {
      if (!this.audioCtx) return;
      this.renderPianoWaterfall();
      this.animationFrameId = requestAnimationFrame(this.animate);
    },

    renderPianoWaterfall() {
      const canvas = this.$refs.pianoCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      const pianoHeight = H * 0.22; 
      const waterfallHeight = H - pianoHeight;
      
      const totalWhiteKeys = 35; 
      const whiteKeyWidth = W / totalWhiteKeys;
      const blackKeyWidth = whiteKeyWidth * 0.58;
      const blackKeyHeight = pianoHeight * 0.65;

      const songCurrentTime = this.audioCtx.currentTime - this.audioStartTime;
      const visibleTimeWindow = 2.5; 
      const speed = waterfallHeight / visibleTimeWindow; 

      this.activeNotes.clear();
      let activeSection = '';

      this.notesTimeline.forEach(note => {
        if (songCurrentTime >= note.start && songCurrentTime <= (note.start + note.duration)) {
          this.activeNotes.add(note.midi);
          if (note.label) {
            activeSection = note.label;
          }
        }
      });

      this.currentSectionLabel = activeSection;

      // Helper optimizado de cálculo posicional
      const getXPositionOfMidi = (midi) => {
        let whiteKeyIndex = 0;
        for (let m = this.startMidi; m < midi; m++) {
          if (!this.isBlackKey(m)) whiteKeyIndex++;
        }
        if (this.isBlackKey(midi)) {
          return (whiteKeyIndex * whiteKeyWidth) - (blackKeyWidth / 2);
        } else {
          return whiteKeyIndex * whiteKeyWidth;
        }
      };

      // 1. Renderizar bloques de la cascada
      this.notesTimeline.forEach(note => {
        const noteBottomY = waterfallHeight - (note.start - songCurrentTime) * speed;
        const noteTopY = noteBottomY - (note.duration * speed);
        let noteHeight = noteBottomY - noteTopY;

        if (noteHeight < 4) noteHeight = 4;

        if (noteBottomY > 0 && noteTopY < waterfallHeight) {
          const x = getXPositionOfMidi(note.midi);
          const w = this.isBlackKey(note.midi) ? blackKeyWidth : whiteKeyWidth - 2;

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W, waterfallHeight);
          ctx.clip();

          const isActive = this.activeNotes.has(note.midi);
          if (isActive) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = note.color;
          }

          this.drawNoteBlock(ctx, x + 1, noteTopY, w, noteHeight, 3, note.color);
          ctx.restore();
        }
      });

      // Separador visual entre cascada y piano
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, waterfallHeight - 4, W, 4);

      // 2. Renderizar teclas blancas
      let currentWhiteIdx = 0;
      for (let m = this.startMidi; m <= this.endMidi; m++) {
        if (!this.isBlackKey(m)) {
          const x = currentWhiteIdx * whiteKeyWidth;
          const isActive = this.activeNotes.has(m);

          ctx.fillStyle = isActive ? '#4ade80' : '#ffffff';
          ctx.fillRect(x, waterfallHeight, whiteKeyWidth - 1, pianoHeight);
          
          ctx.fillStyle = isActive ? '#16a34a' : '#e5e7eb';
          ctx.fillRect(x, waterfallHeight + pianoHeight - 6, whiteKeyWidth - 1, 6);

          currentWhiteIdx++;
        }
      }

      // 3. Renderizar teclas negras
      currentWhiteIdx = 0;
      for (let m = this.startMidi; m <= this.endMidi; m++) {
        if (this.isBlackKey(m)) {
          const x = (currentWhiteIdx * whiteKeyWidth) - (blackKeyWidth / 2);
          const isActive = this.activeNotes.has(m);

          ctx.fillStyle = isActive ? '#22c55e' : '#111827';
          ctx.fillRect(x, waterfallHeight, blackKeyWidth, blackKeyHeight);
          
          if (!isActive) {
            ctx.fillStyle = '#374151';
            ctx.fillRect(x, waterfallHeight, blackKeyWidth, 4);
          }
        } else {
          currentWhiteIdx++;
        }
      }
    },

    drawNoteBlock(ctx, x, y, width, height, radius, baseColor) {
      if (height < radius * 2) radius = height / 2;

      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      
      ctx.fillStyle = baseColor;
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.stroke();
    },

    // Al hacer click explícito en reiniciar, el navegador garantiza que el sonido funcione sí o sí
    async restart() { 
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      this.start(); 
    },

    stop() {
      if (this.audioCtx) {
        try { this.audioCtx.close(); } catch(e) {console.log("error")}
        this.audioCtx = null; 
      }
      if (this.animationFrameId) { 
        cancelAnimationFrame(this.animationFrameId); 
        this.animationFrameId = null; 
      }
      window.removeEventListener('resize', this.resizeCanvas);
      this.activeNotes.clear();
      this.currentSectionLabel = '';
    }
  },

  beforeUnmount() { this.stop(); }
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

.piano-visualizer-container {
  flex: 1;
  position: relative;
  width: 100%;
  background: #04060a; 
}
.piano-visualizer-container canvas {
  display: block;
  width: 100%;
  height: 100%;
}

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