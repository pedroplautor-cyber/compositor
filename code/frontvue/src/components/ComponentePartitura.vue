<template>
  <div class="partitura-screen">
    <div class="title">{{ song && song.title ? song.title : 'Visualizador de Partitura VexFlow' }}</div>
    
    <div class="split-container">
      <div class="column">
        <label class="label">Representación Musical (VexFlow)</label>
        <div class="vexflow-wrapper">
          <div ref="vexflowCanvas" class="canvas-container"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Importación de módulos nativos de VexFlow
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, Accidental, Dot } from 'vexflow';

export default {
  name: 'ComponentePartituraVexFlow',
  props: ['song', 'active'],
  computed: {
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
    // Escuchar el cambio de tamaño de pantalla para mantener la responsividad
    window.addEventListener('resize', this.renderScore);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.renderScore);
  },
  methods: {
    tryRender() {
      setTimeout(() => {
        this.renderScore();
      }, 100);
    },
    
    mapNoteName(name) {
      // Limpiamos números y puntos (Ej: DO4. -> DO)
      const cleanName = name.toUpperCase().replace(/[\d.]/g, '');
      const mapping = {
        'DO': 'c', 'DO#': 'c#',
        'RE': 'd', 'RE#': 'd#',
        'MI': 'e',
        'FA': 'f', 'FA#': 'f#',
        'SOL': 'g', 'SOL#': 'g#',
        'LA': 'a', 'LA#': 'a#',
        'SI': 'b'
      };
      return mapping[cleanName] || 'c';
    },

    parseVoiceText(text, defaultOctave = 4) {
      if (!text) return [];
      
      const notesData = [];
      let currentOctave = defaultOctave;

      // Regex para extraer notas, silencios, acordes y modificadores de octava
      const regex = /(<+|>+|\[[^\]]+\]\d*\.?|[^\s]+)/g;
      const tokens = text.trim().match(regex) || [];

      tokens.forEach(token => {
        if (!token) return;

        if (token.startsWith('<')) {
          currentOctave -= token.length;
          return;
        }
        if (token.startsWith('>')) {
          currentOctave += token.length;
          return;
        }

        let keys = [];
        let duration = '4';
        let isRest = false;

        // Caso: Acordes [...]
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
        // Caso: Silencios _
        else if (token.startsWith('_')) {
          isRest = true;
          keys = [currentOctave >= 4 ? 'b/4' : 'd/3']; 
          
          const durationMatch = token.slice(1).match(/^(\d+)(\.)?/);
          duration = durationMatch ? durationMatch[1] + 'r' : '4r';
          if (durationMatch && durationMatch[2]) duration += 'd';
        } 
        // Caso: Notas individuales (Ej: do4, sol#4.)
        else {
          const match = token.match(/^([A-Za-zñÑ#]+)(\d+)?(\.)?/);
          if (match) {
            const noteName = match[1]; 
            const dur = match[2] || '4';
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

    convertToVexNotes(parsedNotes, clef = 'treble') {
      return parsedNotes.map(item => {
        // Inicializamos la nota estructural pasándole la clave correspondiente
        const note = new StaveNote({
          keys: item.keys,
          duration: item.duration,
          clef: clef 
        });
        
        // Añadir puntillo visual si la duración contiene una 'd'
        if (item.duration.includes('d')) {
          item.keys.forEach((key, index) => {
            note.addModifier(new Dot(), index);
          });
        }

        // Detectar e inyectar alteraciones sostenidas '#' de forma segura
        item.keys.forEach((key, index) => {
          if (key.includes('#')) {
            note.addModifier(new Accidental('#'), index);
          }
        });

        return note;
      });
    },

    renderScore() {
      const container = this.$refs.vexflowCanvas;
      if (!container) return;
      container.innerHTML = ''; // Limpiar renders anteriores

      try {
        const measures = (this.song && Array.isArray(this.song.measures)) ? this.song.measures : [];
        if (measures.length === 0) return;

        // --- CONFIGURACIÓN GEOMÉTRICA DE VEXFLOW ---
        const measuresPerLine = 4;
        const baseWidth = 1200; // Ancho virtual para cálculo proporcional
        const paddingLeft = 40;
        const paddingRight = 50; 
        const availableWidth = baseWidth - paddingLeft - paddingRight;

        const systemHeight = this.hasGrandStaff ? 260 : 140; 
        const titlePadding = 80; 
        const totalLines = Math.ceil(measures.length / measuresPerLine);
        const canvasHeight = titlePadding + (systemHeight * totalLines) + 40;

        // Inicializar el Renderer SVG de VexFlow
        const renderer = new Renderer(container, Renderer.Backends.SVG);
        renderer.resize(baseWidth, canvasHeight);
        const context = renderer.getContext();

        // Hacer responsivo el SVG inyectado
        const svgElement = container.querySelector('svg');
        if (svgElement) {
          svgElement.setAttribute('viewBox', `0 0 ${baseWidth} ${canvasHeight}`);
          svgElement.setAttribute('width', '100%');
          svgElement.style.height = 'auto'; 
          svgElement.style.display = 'block';
        }

        // Render del título de la canción mediante el contexto de VexFlow
        if (this.song && this.song.title) {
          context.save();
          context.setFont('Arial', 24, 'bold');
          context.fillText(this.song.title, baseWidth / 2 - (context.measureText(this.song.title).width / 2), 45);
          context.restore();
        }

        const timeSig = this.song?.timeSignature || '4/4';
        const beats = parseInt(timeSig.split('/')[0]) || 4;
        const beatValue = parseInt(timeSig.split('/')[1]) || 4;

        // --- BUCLE DE RENDERIZADO POR COMPÁS ---
        measures.forEach((measureData, index) => {
          try {
            const lineIndex = Math.floor(index / measuresPerLine);
            const measureInLine = index % measuresPerLine;
            const isFirstOfLine = measureInLine === 0;
            const isLastMeasureOfSong = index === measures.length - 1;

            const totalMeasuresInThisLine = Math.min(
              measuresPerLine, 
              measures.length - (lineIndex * measuresPerLine)
            );

            const measureWidth = availableWidth / totalMeasuresInThisLine;
            const currentX = paddingLeft + (measureInLine * measureWidth);
            const baseY = titlePadding + (lineIndex * systemHeight);
            const finalWidth = isLastMeasureOfSong ? measureWidth - 10 : measureWidth;

            const parts = measureData.text ? measureData.text.split('|') : ['', ''];
            const melodyText = parts[0] || '';
            const harmonyText = parts[1] || '';

            // 1. Pentagrama Superior (Clave de Sol)
            const staveTop = new Stave(currentX, baseY, finalWidth);
            if (isFirstOfLine) {
              staveTop.addClef('treble').addTimeSignature(timeSig);
            }
            if (isLastMeasureOfSong) {
              staveTop.setEndBarline(Stave.BarlineType.END);
            }
            staveTop.setContext(context).draw();

            const parsedTop = this.parseVoiceText(melodyText, 4); 
            const vexNotesTop = this.convertToVexNotes(parsedTop, 'treble');
            const voiceTop = new Voice({ num_beats: beats, beat_value: beatValue }).setStrict(false);
            if (vexNotesTop.length > 0) voiceTop.addTickables(vexNotesTop);

            // 2. Pentagrama Inferior (Clave de Fa - Grand Staff)
            if (this.hasGrandStaff) {
              const staveBottom = new Stave(currentX, baseY + 110, finalWidth);
              if (isFirstOfLine) {
                staveBottom.addClef('bass').addTimeSignature(timeSig);
              }
              if (isLastMeasureOfSong) {
                staveBottom.setEndBarline(Stave.BarlineType.END);
              }
              staveBottom.setContext(context).draw();

              const parsedBottom = !harmonyText.trim() ? this.parseVoiceText('_1', 3) : this.parseVoiceText(harmonyText, 3);
              const vexNotesBottom = this.convertToVexNotes(parsedBottom, 'bass');
              const voiceBottom = new Voice({ num_beats: beats, beat_value: beatValue }).setStrict(false);
              if (vexNotesBottom.length > 0) voiceBottom.addTickables(vexNotesBottom);

              // Formatear y alinear proporcionalmente ambos pentagramas armónicos
              const usedPadding = isFirstOfLine ? 85 : 25;
              const usableWidth = Math.max(50, finalWidth - usedPadding);

              if (vexNotesTop.length > 0 && vexNotesBottom.length > 0) {
                new Formatter().joinVoices([voiceTop, voiceBottom]).format([voiceTop, voiceBottom], usableWidth);
                voiceTop.draw(context, staveTop);
                voiceBottom.draw(context, staveBottom);
              }

              // Dibujar la llave unificadora de Piano (Brace) al principio de la línea
              if (isFirstOfLine) {
                new StaveConnector(staveTop, staveBottom).setType(StaveConnector.type.BRACE).setContext(context).draw();
                new StaveConnector(staveTop, staveBottom).setType(StaveConnector.type.SINGLE).setContext(context).draw();
              }
            } else {
              // Modo Monofónico (Un solo pentagrama)
              const usedPadding = isFirstOfLine ? 65 : 25;
              const usableWidth = Math.max(50, finalWidth - usedPadding);

              if (vexNotesTop.length > 0) {
                new Formatter().joinVoices([voiceTop]).format([voiceTop], usableWidth);
                voiceTop.draw(context, staveTop);
              }
            }
          } catch (lineError) {
            console.error(`Error procesando compás índice ${index}:`, lineError);
          }
        });
      } catch (e) {
        console.error("Error global en renderScore de VexFlow:", e);
      }
    }
  }
}
</script>

<style scoped>
.partitura-screen {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
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
.vexflow-wrapper {
  width: 100%;
  height: 100%;
  background: #ffffff; 
  border-radius: 8px;
  border: 2px solid #4caf50;
  overflow-y: auto; 
  padding: 20px;
  box-sizing: border-box;
}
.canvas-container {
  width: 100%;
  background: #fff;
  display: block;
}
</style>