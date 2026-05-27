<template>
  <div class="partitura-screen">
    <div class="title">{{ song && song.title ? song.title : 'Visualizador de Partitura' }}</div>
    
    <div class="split-container">
      <!--
      <div class="column">
        <label class="label">Datos de la Canción (JSON)</label>
        <textarea 
          class="song-textarea" 
          readonly 
          :value="formattedSong"
        ></textarea>
      </div>
      -->

      <div class="column">
        <label class="label">Representación Musical</label>
        <div class="vexflow-wrapper">
          <div ref="vexflowCanvas" class="canvas-container" :style="{ minHeight: hasGrandStaff ? '280px' : '140px' }"></div>
        </div>
      </div>

    </div>

  </div>
</template>

<script>
// Importamos StaveConnector para hacer la llave de Piano
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, Accidental, Dot } from 'vexflow';

export default {
  name: 'ComponentePartitura',
  props: ['song', 'active'],
  computed: {
    formattedSong() {
      return JSON.stringify(this.song, null, 2);
    },
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

    this.renderScore();
    
    // Escuchar el cambio de tamaño de pantalla
    window.addEventListener('resize', this.renderScore);
  },

  beforeUnmount() { // O destroyed() si usas Vue 2
    // Limpiar el evento para evitar fugas de memoria
    window.removeEventListener('resize', this.renderScore);
  },


  methods: {
    tryRender() {
      setTimeout(() => {
        this.renderScore();
      }, 100);
    },
    
mapNoteName(name) {
  // Eliminamos números y puntos para quedarnos solo con la nota y su alteración (Ej: DO o DO#)
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

  console.log(defaultOctave)

  
  if (!text) return [];
  
  const notesData = [];
  let currentOctave = defaultOctave;

  // Regex que extrae limpiamente notas, silencios, acordes o modificadores de octava
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
    // Caso: Notas individuales (Ej: do2., SOL#4, DO1)
    else {
      // Esta expresión separa las letras(+ocasional #), de los números(duración) y el punto(puntillo)
      const match = token.match(/^([A-Za-zñÑ#]+)(\d+)?(\.)?/);
      
      if (match) {
        const noteName = match[1]; 
        const dur = match[2] || '4'; // Si no hay número, por defecto es negra (4)
        const hasDot = match[3];
        
        keys = [`${this.mapNoteName(noteName)}/${currentOctave}`];
        duration = dur + (hasDot ? 'd' : '');
      }
    }

    if (keys.length > 0) {
      notesData.push({ keys, duration, isRest });
    }
  });
  

const notesData2 = [
  {
    "comment": "Caso 1: Nota simple con alteración (Sostenido) y duración Negra",
    "keys": ["c#/4"],
    "duration": "4",
    "isRest": false
  },
  {
    "comment": "Caso 2: Nota simple con duración Blanca y Puntillo (notación 'd')",
    "keys": ["d/4"],
    "duration": "2d",
    "isRest": false
  },
  {
    "comment": "Caso 3: Silencio con duración de Corchea (notación 'r')",
    "keys": ["b/4"],
    "duration": "8r",
    "isRest": true
  },
  {
    "comment": "Caso 4: Acorde de tres notas simultáneas (Mi Mayor) con duración Blanca. Una de ellas tiene un Sostenido.",
    "keys": ["e/4", "g#/4", "b/4"],
    "duration": "2",
    "isRest": false
  }
]
  console.log(notesData2)
  return notesData;
},



  convertToVexNotes(parsedNotes, clef = 'treble') {
    return parsedNotes.map(item => {
      // CORRECCIÓN CLAVE: Pasamos la propiedad 'clef' para que VexFlow 
      // calcule correctamente las líneas según sea Sol ('treble') o Fa ('bass')
      const note = new StaveNote({
        keys: item.keys,
        duration: item.duration,
        clef: clef 
      });
      
      // Añadir puntillo visual usando la clase Dot nativa
      if (item.duration.includes('d')) {
        item.keys.forEach((key, index) => {
          note.addModifier(new Dot(), index);
        });
      }

      // Aplicar la alteración '#' de forma segura
      item.keys.forEach((key, index) => {
        if (key.includes('#')) {
          note.addModifier(new Accidental('#'), index);
        }
      });

      return note;
    });
  },

  __renderScore() {
    const container = this.$refs.vexflowCanvas;
    if (!container) return;
    container.innerHTML = '';

    try {
      const measuresCount = (this.song && this.song.measures) ? this.song.measures.length : 1;
      const staveWidth = 320;
      const initialPadding = 80; 
      const totalWidth = initialPadding + (staveWidth * measuresCount);
      const canvasHeight = this.hasGrandStaff ? 280 : 140;

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(totalWidth, canvasHeight);
      const context = renderer.getContext();

      let currentX = 20; 
      const timeSig = this.song?.timeSignature || '4/4';
      const beats = parseInt(timeSig.split('/')[0]) || 4;
      const beatValue = parseInt(timeSig.split('/')[1]) || 4;

      if (this.song && Array.isArray(this.song.measures)) {
        this.song.measures.forEach((measureData, index) => {
          
          const parts = measureData.text.split('|');
          const melodyText = parts[0] || '';
          const harmonyText = parts[1] || '';

          const currentMeasureWidth = index === 0 ? staveWidth + 50 : staveWidth;

          // --- PENTAGRAMA SUPERIOR (Melodía - Clave de Sol) ---
          const staveTop = new Stave(currentX, 30, currentMeasureWidth);
          if (index === 0) {
            staveTop.addClef('treble').addTimeSignature(timeSig);
          }
          staveTop.setContext(context).draw();

          const parsedTop = this.parseVoiceText(melodyText, 4); 
          // Genera notas explícitas para Clave de Sol ('treble')
          const vexNotesTop = this.convertToVexNotes(parsedTop, 'treble');
          
          const voiceTop = new Voice({ num_beats: beats, beat_value: beatValue });
          voiceTop.setStrict(false);
          voiceTop.addTickables(vexNotesTop);

          // --- PENTAGRAMA INFERIOR (Armonía - Clave de Fa) ---
          if (this.hasGrandStaff) {
            const staveBottom = new Stave(currentX, 150, currentMeasureWidth);
            if (index === 0) {
              staveBottom.addClef('bass').addTimeSignature(timeSig);
            }
            staveBottom.setContext(context).draw();

            let parsedBottom = [];
            if (!harmonyText.trim()) {
              parsedBottom = this.parseVoiceText('_1', 4); // Silencio por defecto en octava 3
            } else {
              // Bajamos la octava por defecto inicial a 3 para que las notas sin modificador
              // se correspondan armónicamente con la tesitura natural de la clave de Fa
              parsedBottom = this.parseVoiceText(harmonyText, 4); 
            }

            // CORRECCIÓN CRÍTICA: Se le pasa 'bass' explícitamente como segundo parámetro
            const vexNotesBottom = this.convertToVexNotes(parsedBottom, 'bass');
            
            const voiceBottom = new Voice({ num_beats: beats, beat_value: beatValue });
            voiceBottom.setStrict(false);
            voiceBottom.addTickables(vexNotesBottom);

            // Unir y formatear ambos pentagramas
            const formatter = new Formatter();
            formatter.joinVoices([voiceTop, voiceBottom]);
            formatter.format([voiceTop, voiceBottom], currentMeasureWidth - (index === 0 ? 80 : 20));

            // Añadir corchete de Piano (Brace)
            if (index === 0) {
              new StaveConnector(staveTop, staveBottom).setType(StaveConnector.type.BRACE).setContext(context).draw();
              new StaveConnector(staveTop, staveBottom).setType(StaveConnector.type.SINGLE).setContext(context).draw();
            }

            voiceTop.draw(context, staveTop);
            voiceBottom.draw(context, staveBottom); 
          } else {
            const formatter = new Formatter();
            formatter.joinVoices([voiceTop]);
            formatter.format([voiceTop], currentMeasureWidth - (index === 0 ? 60 : 20));
            voiceTop.draw(context, staveTop);
          }

          currentX += currentMeasureWidth;
        });
      }
    } catch (e) {
      console.error("Error en el renderizado de VexFlow:", e);
    }
  },



renderScore() {
  const container = this.$refs.vexflowCanvas;
  if (!container) return;
  container.innerHTML = '';

  try {
    const measures = (this.song && Array.isArray(this.song.measures)) ? this.song.measures : [];
    if (measures.length === 0) return;

    // --- CONFIGURACIÓN GEOMÉTRICA ---
    const measuresPerLine = 4;
    const baseWidth = 1200; 
    const paddingLeft = 40;
    const paddingRight = 50; 
    const availableWidth = baseWidth - paddingLeft - paddingRight;

    const systemHeight = this.hasGrandStaff ? 260 : 150; 
    const titlePadding = 80; 
    const totalLines = Math.ceil(measures.length / measuresPerLine);
    const canvasHeight = titlePadding + (systemHeight * totalLines) + 40;

    // --- RENDERER ---
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(baseWidth, canvasHeight);
    const context = renderer.getContext();

    // Ajustar el contenedor SVG para que sea visible y responda al tamaño
    const svgElement = container.querySelector('svg');
    if (svgElement) {
      svgElement.setAttribute('viewBox', `0 0 ${baseWidth} ${canvasHeight}`);
      svgElement.setAttribute('width', '100%');
      svgElement.style.height = 'auto'; 
      svgElement.style.display = 'block';
    }

    // --- TÍTULO ---
    if (this.song && this.song.title) {
      context.save();
      context.setFont("Arial", 28, "bold");
      context.fillText(this.song.title, (baseWidth / 2), 45, { align: "center" });
      context.restore();
    }

    const timeSig = this.song?.timeSignature || '4/4';
    const beats = parseInt(timeSig.split('/')[0]) || 4;
    const beatValue = parseInt(timeSig.split('/')[1]) || 4;

    // --- BUCLE DE COMPASES ---
    measures.forEach((measureData, index) => {
      // Ponemos un try/catch interno por si el error está en los datos de este compás específico
      try {
        const lineIndex = Math.floor(index / measuresPerLine);
        const measureInLine = index % measuresPerLine;
        const isFirstOfLine = measureInLine === 0;
        const isLastMeasureOfSong = index === measures.length - 1;

        // Averiguar cuántos compases reales van en ESTA línea
        const totalMeasuresInThisLine = Math.min(
          measuresPerLine, 
          measures.length - (lineIndex * measuresPerLine)
        );

        // El ancho se divide estrictamente entre los compases de esta línea
        const measureWidth = availableWidth / totalMeasuresInThisLine;
        
        // Coordenadas exactas
        const currentX = paddingLeft + (measureInLine * measureWidth);
        const baseY = titlePadding + (lineIndex * systemHeight);

        // Margen estético para la barra final
        const finalWidth = isLastMeasureOfSong ? measureWidth - 10 : measureWidth;

        // Parseo de textos
        const parts = measureData.text ? measureData.text.split('|') : ['', ''];
        const melodyText = parts[0] || '';
        const harmonyText = parts[1] || '';

        // 1. Dibujar Pentagrama Superior
        const staveTop = new Stave(currentX, baseY, finalWidth);
        if (isFirstOfLine) {
          staveTop.addClef('treble').addTimeSignature(timeSig);
        }
        if (isLastMeasureOfSong) {
          staveTop.setEndBarline(Stave.BarlineType.END);
        }
        staveTop.setContext(context).draw();

        // Notas superiores
        const parsedTop = this.parseVoiceText(melodyText, 4); 
        const vexNotesTop = this.convertToVexNotes(parsedTop, 'treble');
        const voiceTop = new Voice({ num_beats: beats, beat_value: beatValue }).setStrict(false);
        if (vexNotesTop && vexNotesTop.length > 0) {
          voiceTop.addTickables(vexNotesTop);
        }

        // 2. Dibujar Pentagrama Inferior (si existe)
        if (this.hasGrandStaff) {
          const staveBottom = new Stave(currentX, baseY + 110, finalWidth);
          if (isFirstOfLine) {
            staveBottom.addClef('bass').addTimeSignature(timeSig);
          }
          if (isLastMeasureOfSong) {
            staveBottom.setEndBarline(Stave.BarlineType.END);
          }
          staveBottom.setContext(context).draw();

          const parsedBottom = !harmonyText.trim() ? this.parseVoiceText('_1', 4) : this.parseVoiceText(harmonyText, 4);
          const vexNotesBottom = this.convertToVexNotes(parsedBottom, 'bass');
          const voiceBottom = new Voice({ num_beats: beats, beat_value: beatValue }).setStrict(false);
          if (vexNotesBottom && vexNotesBottom.length > 0) {
            voiceBottom.addTickables(vexNotesBottom);
          }

          // Formatear espacio de notas
          const usedPadding = isFirstOfLine ? 85 : 25;
          const usableWidth = Math.max(50, finalWidth - usedPadding);

          if (vexNotesTop.length > 0 && vexNotesBottom.length > 0) {
            new Formatter().joinVoices([voiceTop, voiceBottom]).format([voiceTop, voiceBottom], usableWidth);
            voiceTop.draw(context, staveTop);
            voiceBottom.draw(context, staveBottom);
          }

          if (isFirstOfLine) {
            new StaveConnector(staveTop, staveBottom).setType(StaveConnector.type.BRACE).setContext(context).draw();
            new StaveConnector(staveTop, staveBottom).setType(StaveConnector.type.SINGLE).setContext(context).draw();
          }

        } else {
          // Modo un solo pentagrama
          const usedPadding = isFirstOfLine ? 65 : 25;
          const usableWidth = Math.max(50, finalWidth - usedPadding);

          if (vexNotesTop.length > 0) {
            new Formatter().joinVoices([voiceTop]).format([voiceTop], usableWidth);
            voiceTop.draw(context, staveTop);
          }
        }

      } catch (lineError) {
        console.error(`Error procesando el compás en índice ${index}:`, lineError);
      }
    });

  } catch (e) {
    console.error("Error global en renderScore:", e);
  }
}


  }
}
</script>

<style scoped>

.vexflow-wrapper {
  width: 100%;
  overflow-x: hidden; /* Evita scrolls horizontales raros */
}

.canvas-container {
  width: 100%;
  display: block;
}

/* Asegura que el SVG interno de VexFlow ocupe todo el ancho disponible */
.canvas-container svg {
  width: 100% !important;
  height: auto !important;
}


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