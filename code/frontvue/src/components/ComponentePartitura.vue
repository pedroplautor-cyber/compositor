<template>
  <div class="partitura-screen">
    <div class="title">{{ song && song.title ? song.title : 'Visualizador de Partitura' }}</div>
    
    <div class="split-container">
      <div class="column">
        <label class="label">Datos de la Canción (JSON)</label>
        <textarea 
          class="song-textarea" 
          readonly 
          :value="formattedSong"
        ></textarea>
      </div>
      
      <div class="column">
        <label class="label">Representación Musical</label>
        <div class="vexflow-wrapper">
          <div ref="vexflowCanvas" class="canvas-container" :style="{ minHeight: hasGrandStaff ? '260px' : '140px' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';

export default {
  name: 'ComponentePartitura',
  props: ['song', 'active'],
  computed: {
    formattedSong() {
      return JSON.stringify(this.song, null, 2);
    },
    // Condición: Verifica si al menos un compás requiere pentagrama doble (|)
    hasGrandStaff() {
      if (!this.song || !Array.isArray(this.song.measures)) return false;
      return this.song.measures.some(measure => measure.text && measure.text.includes('|'));
    }
  },
  watch: {
    active(isNowActive) {
      if (isNowActive) {
        this.tryRender();
      }
    },
    song: {
      deep: true,
      handler() {
        if (this.active) {
          this.tryRender();
        }
      }
    }
  },
  mounted() {
    if (this.active) {
      this.tryRender();
    }
  },
  methods: {
    tryRender() {
      setTimeout(() => {
        this.renderScore();
      }, 100);
    },
    
    mapNoteName(name) {
      const mapping = {
        'DO': 'c', 'DO#': 'c#',
        'RE': 'd', 'RE#': 'd#',
        'MI': 'e',
        'FA': 'f', 'FA#': 'f#',
        'SOL': 'g', 'SOL#': 'g#',
        'LA': 'a', 'LA#': 'a#',
        'SI': 'b'
      };
      return mapping[name] || 'c';
    },

    parseVoiceText(text, defaultOctave) {
      if (!text) return [];
      
      const notesData = [];
      let currentOctave = defaultOctave;

      // Tokenizador que respeta bloques de acordes [...], modificadores múltiples >>, << y notas sueltas
      const regex = /(<+|>+|\[[^\]]+\]\d*\.?|[^\s]+)/g;
      const tokens = text.trim().match(regex) || [];

      tokens.forEach(token => {
        if (!token) return;

        // CORRECCIÓN: Soporte para cambios acumulativos directos (>> aumenta 2, < resta 1, etc.)
        if (token.startsWith('<')) {
          currentOctave -= token.length;
          return; // Saltamos al siguiente token ya que este solo modifica la octava
        }
        if (token.startsWith('>')) {
          currentOctave += token.length;
          return; // Saltamos al siguiente token
        }

        let keys = [];
        let duration = '4';
        let isRest = false;

        // 1. Acordes: [DO MI SOL]2
        if (token.startsWith('[')) {
          const closingIndex = token.indexOf(']');
          if (closingIndex !== -1) {
            const chordContent = token.slice(1, closingIndex);
            const restOfToken = token.slice(closingIndex + 1);
            
            const rawNotes = chordContent.trim().split(/\s+/);
            keys = rawNotes.map(n => `${this.mapNoteName(n)}/${currentOctave}`);
            
            const durationMatch = restOfToken.match(/^(\d+)(\.)?/);
            if (durationMatch) {
              duration = durationMatch[1] + (durationMatch[2] ? 'd' : '');
            }
          }
        } 
        // 2. Silencios: _2
        else if (token.startsWith('_')) {
          isRest = true;
          // Si estamos en clave de Fa ponemos el silencio en D/3, si es clave de Sol en B/4
          keys = [defaultOctave === 3 ? 'd/3' : 'b/4']; 
          const durationMatch = token.slice(1).match(/^(\d+)(\.)?/);
          duration = durationMatch ? durationMatch[1] + 'r' : '4r';
          if (durationMatch && durationMatch[2]) duration += 'd';
        } 
        // 3. Nota simple: DO2
        else {
          const match = token.match(/^([A-Z]+#?)(\d+)(\.)?/);
          if (match) {
            const noteName = match[1];
            const dur = match[2];
            const hasDot = match[3];
            
            keys = [`${this.mapNoteName(noteName)}/${currentOctave}`];
            duration = dur + (hasDot ? 'd' : '');
          }
        }

        if (keys.length > 0) {
          notesData.push({ keys, duration, isRest });
        }
      });

      return notesData;
    },

    convertToVexNotes(parsedNotes) {
      return parsedNotes.map(item => {
        const note = new StaveNote({
          keys: item.keys,
          duration: item.duration
        });
        if (item.duration.includes('d')) {
          note.addDotToAll();
        }
        return note;
      });
    },

    renderScore() {
      const container = this.$refs.vexflowCanvas;
      if (!container) return;
      container.innerHTML = '';

      try {
        const measuresCount = (this.song && this.song.measures) ? this.song.measures.length : 1;
        const staveWidth = 320;
        const totalWidth = 70 + (staveWidth * measuresCount);
        
        // El alto del lienzo cambia dependiendo de si renderizamos un pentagrama único o doble
        const canvasHeight = this.hasGrandStaff ? 260 : 140;

        const renderer = new Renderer(container, Renderer.Backends.SVG);
        renderer.resize(totalWidth, canvasHeight);
        const context = renderer.getContext();

        let currentX = 10;
        const timeSig = this.song?.timeSignature || '4/4';
        const beats = parseInt(timeSig.split('/')[0]) || 4;
        const beatValue = parseInt(timeSig.split('/')[1]) || 4;

        if (this.song && Array.isArray(this.song.measures)) {
          this.song.measures.forEach((measureData, index) => {
            
            const parts = measureData.text.split('|');
            const rightHandText = parts[0] || '';
            const leftHandText = parts[1] || '';

            // --- PENTAGRAMA SUPERIOR (Clave de Sol) ---
            const staveTop = new Stave(currentX, 20, staveWidth);
            if (index === 0) {
              staveTop.addClef('treble').addTimeSignature(timeSig);
            }
            staveTop.setContext(context).draw();

            const parsedTop = this.parseVoiceText(rightHandText, 4); // Octava base 4
            const vexNotesTop = this.convertToVexNotes(parsedTop);
            
            const voiceTop = new Voice({ num_beats: beats, beat_value: beatValue });
            voiceTop.setStrict(false);
            voiceTop.addTickables(vexNotesTop);

            // Si hay sistema de doble pentagrama en la canción, calculamos e imprimimos abajo
            if (this.hasGrandStaff) {
              // --- PENTAGRAMA INFERIOR (CORRECCIÓN: Clave de Fa) ---
              const staveBottom = new Stave(currentX, 130, staveWidth);
              if (index === 0) {
                staveBottom.addClef('bass').addTimeSignature(timeSig);
              }
              staveBottom.setContext(context).draw();

              // Octava base 3 por defecto para encajar la armonía de forma óptima en el registro de clave de Fa
              const parsedBottom = this.parseVoiceText(leftHandText, 3); 
              const vexNotesBottom = this.convertToVexNotes(parsedBottom);

              const voiceBottom = new Voice({ num_beats: beats, beat_value: beatValue });
              voiceBottom.setStrict(false);
              voiceBottom.addTickables(vexNotesBottom);

              // Formateo y alineación vertical conjunta
              const formatter = new Formatter();
              formatter.joinVoices([voiceTop, voiceBottom]);
              formatter.format([voiceTop, voiceBottom], staveWidth - 50);

              voiceTop.draw(context, staveTop);
              voiceBottom.draw(context, staveBottom);
            } else {
              // Si es melódico simple (sin '|'), solo formateamos y pintamos la voz superior
              const formatter = new Formatter();
              formatter.joinVoices([voiceTop]);
              formatter.format([voiceTop], staveWidth - 50);
              
              voiceTop.draw(context, staveTop);
            }

            currentX += staveWidth;
          });
        }
      } catch (e) {
        console.error("Error en VexFlow:", e);
      }
    }
  }
}
</script>

<style scoped>
.partitura-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  background: #141414;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 10;
}

.title {
  color: #d4af37;
  font-size: 18px;
  font-weight: 600;
}

.split-container {
  display: flex;
  gap: 24px;
  flex: 1;
  width: 100%;
  height: calc(100% - 40px);
}

.column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  height: 100%;
}

.label {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
}

.song-textarea {
  width: 100%;
  height: 100%;
  background-color: #ffffff !important;
  color: #1a1a1a !important;
  font-family: monospace;
  font-size: 13px;
  padding: 16px;
  border: 2px solid #d4af37;
  border-radius: 8px;
  resize: none;
  box-sizing: border-box;
}

.vexflow-wrapper {
  width: 100%;
  height: 100%;
  background: #ffffff; 
  border-radius: 8px;
  border: 2px solid #4caf50;
  display: flex;
  align-items: center;
  overflow-x: auto; 
  padding: 10px;
  box-sizing: border-box;
}

.canvas-container {
  background: #fff;
  transition: min-height 0.2s ease;
}
</style>