<template>
  <div class="editor-screen">

    <!-- MENÚ HORIZONTAL SUPERIOR -->
    <nav class="top-navbar">
      <div class="nav-menu">
        <!-- Opción Fichero con Submenú desplegable -->
        <div class="nav-item has-dropdown">
          <button class="nav-btn">
            Fichero <span class="arrow-down">▼</span>
          </button>
          <div class="dropdown-menu">
            <button class="dropdown-item" @click="exportTxt">Exportar TXT</button>
            <button class="dropdown-item" @click="copyClipboard">Copiar al Portapapeles</button>
            <button class="dropdown-item" @click="$refs.importInput.click()">Importar TXT</button>
            <button class="dropdown-item midi-item" @click="exportMidi">Exportar MIDI</button>
            <button class="dropdown-item midi-item" @click="exportPartitura">Exportar Partitura</button>
          </div>
        </div>

        <!-- Opción Ajustes Generales (Popup) -->
        <div class="nav-item">
          <button class="nav-btn" :class="{ 'active-btn': showSettings }" @click="showSettings = true">
            Ajustes
          </button>
        </div>

        <!-- Opción Instrumentos (Popup) -->
        <div class="nav-item">
          <button class="nav-btn" :class="{ 'active-btn': showTimbres }" @click="showTimbres = true">
            Instrumentos
          </button>
        </div>

        <div class="nav-item">
          <button class="nav-btn" :class="{ 'active-btn': showTimbres }" @click="createRandomMusic">
            Canción aleatoria
          </button>
        </div>


        <!-- Opción Ayuda (Popup) -->
        <div class="nav-item">
          <button class="nav-btn" :class="{ 'active-btn': showHelp }" @click="showHelp = true">
            Ayuda
          </button>
        </div>
      </div>
      <input ref="importInput" type="file" style="display:none" @change="importTxt">
    </nav>

    <!-- TITLE -->
    <div class="title-container">
      <input class="song-title-input" v-model="localSong.title" placeholder="Título de la canción" @input="emit">
    </div>


    <!-- STATUS BAR -->
    <div class="status-bar-wrapper" v-if="statusMsg">
      <div class="status-bar">{{ statusMsg }}</div>
    </div>

    <!-- COMPASES
    <MeasureCard
      v-for="(measure, i) in localSong.measures"
      :key="measure.id"
      :measure="measure"
      :index="i"
      :get-measure-status="getMeasureStatus"
      :get-beat-display="getBeatDisplay"
      @play="playMeasure"
      @remove="removeMeasure"
      @update:text="actualizarTextoCompas(measure, $event)" 
    />-->


    <MeasureCard
      :song="localSong"
      @update:song="localSong = $event; emit();" 
      @play="playSingleMeasure"
      :get-measure-status="getMeasureStatus"
      :get-beat-display="getBeatDisplay"
    />




    <!-- POPUP: AJUSTES GENERALES -->
    <transition name="fade">
      <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
        <div class="help-popup-card">
          <div class="help-popup-header">
            <h3>Ajustes Generales</h3>
            <button class="close-popup-btn" @click="showSettings = false">✕</button>
          </div>
          <div class="help-popup-body">
            <div class="bpm-block">
              <div class="setting-header">
                <span class="setting-label">Tempo</span>
                <span class="bpm-value">{{ localSong.bpm }} <small>BPM</small></span>
              </div>
              <div class="slider-wrapper">
                <input type="range" min="40" max="200" v-model.number="localSong.bpm" @input="validateAll(); emit()">
              </div>
            </div>
            <div class="selects-col" style="margin-top: 12px;">
              <span class="timbre-label">Métrica y Modo</span>
              <div class="custom-select-wrapper">
                <select v-model="localSong.timeSignature" @change="validateAll(); emit()">
                  <option value="4/4">4/4</option>
                  <option value="3/4">3/4</option>
                  <option value="2/4">2/4</option>
                  <option value="6/8">6/8</option>
                </select>
              </div>
              <div class="custom-select-wrapper">
                <select v-model="localSong.bandMode" @change="emit()">
                  <option value="duet">Dueto</option>
                  <option value="band">Banda</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- POPUP: INSTRUMENTACIÓN Y TIMBRES -->
    <transition name="fade">
      <div v-if="showTimbres" class="modal-overlay" @click.self="showTimbres = false">
        <div class="help-popup-card">
          <div class="help-popup-header">
            <h3>Instrumentación y Timbres</h3>
            <button class="close-popup-btn" @click="showTimbres = false">✕</button>
          </div>
          <div class="help-popup-body">
            <div class="timbre-grid-vertical">
              <div v-if="localSong.bandMode === 'duet'" class="select-group">
                <span class="timbre-label">Melodía</span>
                <div class="custom-select-wrapper">
                  <select v-model="localSong.melodyTimbre" @change="emit()">
                    <option value="triangle">Triangle</option>
                    <option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option>
                    <option value="sine">Sine</option>
                    <option value="pulse">Pulse 8-Bit</option>
                    <option value="chip">Chip Lead</option>
                  </select>
                </div>
              </div>
              <div class="select-group">
                <span class="timbre-label">Percusión</span>
                <div class="custom-select-wrapper">
                  <select v-model="localSong.percKit" @change="emit()">
                    <option value="classic">Classic 808</option>
                    <option value="chip8">Chip 8-Bit</option>
                    <option value="taiko">Taiko Drum</option>
                    <option value="electro">Electro</option>
                    <option value="march">March Cofrade</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- POPUP: GUÍA DE NOTACIÓN -->
    <transition name="fade">
      <div v-if="showHelp" class="modal-overlay" @click.self="showHelp = false">
        <div class="help-popup-card">
          <div class="help-popup-header">
            <h3>Guía de Notación</h3>
            <button class="close-popup-btn" @click="showHelp = false">✕</button>
          </div>
          <div class="help-popup-body">
            <div class="help-row"><span class="hk">DO RE MI FA SOL LA SI</span> <span class="sep">•</span> Sostenidos: <span class="hk">DO# RE# FA# SOL# LA#</span></div>
            <div class="help-row"><span class="hk">_</span> = silencio <span class="sep">•</span> <span class="hk">&lt;</span> baja octava <span class="sep">•</span> <span class="hk">&gt;</span> sube octava</div>
            <div class="help-row">Duraciones: <span class="hk">1</span>=redonda <span class="hk">2</span>=blanca <span class="hk">4</span>=negra <span class="hk">8</span>=corchea <span class="hk">16</span>=semicorchea</div>
            <div class="help-row"><span class="hk">.</span>=puntillo <span class="sep">•</span> <span class="hk">[DO MI SOL]2</span>=acorde <span class="sep">•</span> <span class="hk">(DO RE MI)</span>=tresillo</div>
            <div class="help-row">Armonía con <span class="hk">|</span>: <span class="hk">DO RE | SOL SOL</span></div>
          </div>
        </div>
      </div>
    </transition>

    <div class="sticky-bottom-action">
      <div class="player-selector-wrap">
        <select v-model="playerType" class="select-player-type">
          <option value="piano">Piano</option>
          <option value="banda">Banda</option>
          <option value="himno">Himno</option>
        </select>
      </div>

      <button class="btn-play-main" @click="$emit('play', playerType)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M8 5v14l11-7z"/>
        </svg>
        Reproducir
      </button>
    </div>

  </div>
</template>

<script>
import Parser from '@/utils/parser.js';
import AudioEngine from '@/utils/audio.js';
import MidiExport from '@/utils/midi.js';
import { PartituraExport }  from '@/utils/partitura.js';
import MeasureCard from './MeasureCard.vue';

export default {
  name: 'EditorScreen',
  props: ['song'],
  emits: ['update:song', 'play'],
  components: {MeasureCard},

  data() {
    return {
      localSong: JSON.parse(JSON.stringify(this.song)),
      showHelp: false,
      showSettings: false,
      showTimbres: false,
      hasImage: false,
      pixelRes: '8',
      statusMsg: '',
      statusTimer: null,
      playerType: 'piano',
    };
  },

  watch: {
    song: {
      deep: true,
      handler(val) {
        if (JSON.stringify(val.measures) !== JSON.stringify(this.localSong.measures)) {
          this.localSong = JSON.parse(JSON.stringify(val));
        }
      }
    }
  },

  methods: {

createRandomMusic() {
    // 1. Bancos de datos para generar contenido musical variado estilo tu formato
    const notas = ['DO4', 'RE4', 'MI4', 'FA4', 'SOL4', 'LA4', 'SI4', 'DO5'];
    const alteraciones = ['', '#', 'b'];
    const figuras = ['2', '4', '8', '.'];
    const acordes = ['[DO MI SOL]', '[FA LA DO]', '[SOL SI RE]', '[MI SOL SI]'];

    const measures = [];

    // 2. Generar exactamente 4 compases
    for (let i = 1; i <= 4; i++) {
      const eventosParteA = [];
      const eventosParteB = [];

      // Generamos 2 o 3 eventos para la primera mitad del compás (antes del '|')
      const numEventosA = Math.floor(Math.random() * 2) + 2;
      for (let j = 0; j < numEventosA; j++) {
        // Decidir aleatoriamente si es nota, acorde o silencio
        const tipo = Math.random();
        if (tipo < 0.6) {
          // Nota simple (ej: RE#4)
          const nota = notas[Math.floor(Math.random() * notas.length)];
          const alt = alteraciones[Math.floor(Math.random() * alteraciones.length)];
          // Insertamos la alteración antes del número de octava
          const notaFormateada = nota.replace(/\d/, match => alt + match);
          eventosParteA.push(notaFormateada);
        } else if (tipo < 0.85) {
          // Acorde con duración (ej: [DO MI SOL]2)
          const acorde = acordes[Math.floor(Math.random() * acordes.length)];
          const figura = figuras[Math.floor(Math.random() * figuras.length)];
          eventosParteA.push(`${acorde}${figura}`);
        } else {
          // Silencio (ej: _2)
          const figura = figuras[Math.floor(Math.random() * figuras.length)];
          eventosParteA.push(`_${figura}`);
        }
      }

      // Generamos 2 o 3 eventos para la segunda mitad del compás (después del '|')
      const numEventosB = Math.floor(Math.random() * 2) + 2;
      for (let k = 0; k < numEventosB; k++) {
        const nota = notas[Math.floor(Math.random() * notas.length)];
        const figura = figuras[Math.floor(Math.random() * figuras.length)];
        eventosParteB.push(`${nota}${figura}`);
      }

      // Unimos todo usando el separador '|' de tu formato
      const textoCompas = `${eventosParteA.join(' ')} | ${eventosParteB.join(' ')}`;

      measures.push({
        id: i, // ID numérico secuencial como tu ejemplo
        text: textoCompas
      });
    }

    // 3. Construir el objeto con la estructura estricta requerida
    const randomSong = {
      title: "MELODÍA ALEATORIA",
      bpm: 100,
      timeSignature: "4/4",
      bandMode: "duet",
      melodyTimbre: "triangle",
      percKit: "classic",
      customImageSrc: null,
      measures: measures
    };

    // 4. Asignar la canción al estado del padre
    this.localSong = randomSong;
  },


playSingleMeasure(measureData) {
    // measureData contiene { text: "C4 D4 E4", index: 0 }
    const textoDelCompas = measureData.text;
    
    // AQUÍ: Llama a tu motor de sonido (Tone.js, AudioContext, etc.)
    // pasándole SOLAMENTE 'textoDelCompas', en lugar de toda la canción.
    this.playMeasure(textoDelCompas); 
  },


  actualizarTextoCompas(measure, nuevoTexto) {
      // 1. Modifica los datos locales del padre (localSong)
      measure.text = nuevoTexto;
      
      // 2. Notifica al componente superior (el abuelo) enviando la información actualizada
      // Cambia 'change' por el nombre del evento que escuche tu componente global si es distinto
      //this.$emit('change', this.localSong); 
      this.$emit('update:song', JSON.parse(JSON.stringify(this.localSong)));
      
      // NOTA: Si antes tenías exactamente @input="emit()", lo equivalente en Options API es:
      // this.$emit('input');
    },


    emit() {
      //alert("Emito: " + JSON.stringify(this.localSong) )
      this.$emit('update:song', JSON.parse(JSON.stringify(this.localSong)));
    },

    getTargetBeats() {
      return Parser.getTargetBeats(this.localSong.timeSignature);
    },

    countBeats(text) {
      return Parser.countBeats(text, this.localSong.bpm);
    },

    getBeatDisplay(text) {
      const total = this.countBeats(text);
      const target = this.getTargetBeats();
      return `${total.toFixed(2).replace('.00', '')} / ${target}`;
    },

    getMeasureStatus(text) {
      const total = this.countBeats(text);
      const target = this.getTargetBeats();
      if (Math.abs(total - target) < 0.01) return 'complete';
      if (total > target + 0.01) return 'overflow';
      return '';
    },

    validateAll() {
      // Conservado para compatibilidad reactiva del proyecto original
    },

    addMeasure(content = '') {
      this.localSong.measures.push({ id: Date.now() + Math.random(), text: content });
      this.emit();
      this.$nextTick(() => {
        const list = this.$refs.measuresList;
        if (list) list.scrollTop = list.scrollHeight;
      });
    },

    removeMeasure(i) {
      this.localSong.measures.splice(i, 1);
      this.emit();
    },

    // CORRECCIÓN: Llama al mismo evento maestro nativo del reproductor global para sonar exactamente igual
    playAllMeasures() {
      if (!this.localSong.measures.length) return;
      this.$emit('play');
      this.showStatus('▶ Lanzando reproducción maestra');
    },

    // Reproducción individual de un único compás aislado
    playMeasure(text) {
      if (window._audioCtx) { window._audioCtx.close(); window._audioCtx = null; }
      window._audioCtx = new AudioContext();
      const ctx = window._audioCtx;
      const now = ctx.currentTime + 0.1;
      
      const [m, h] = text.split('|');
      const mel = Parser.applyTies(Parser.tokenizePart(m || '', this.localSong.bpm));
      let off = 0;
      
      mel.forEach(n => {
        if (!n.isRest && n.freq > 0) {
          AudioEngine.createMelodySound(ctx, n.freq, now + off, n.duration, 0.15, this.localSong.melodyTimbre, this.localSong.bandMode);
        } else if (n.isChord) {
          n.notes.forEach(cn => {
            if (cn && !cn.isRest) AudioEngine.createMelodySound(ctx, cn.freq, now + off, n.duration, 0.12, this.localSong.melodyTimbre, this.localSong.bandMode);
          });
        }
        off += n.duration;
      });

      if (h) {
        let hoff = 0;
        Parser.applyTies(Parser.tokenizePart(h, this.localSong.bpm)).forEach(n => {
          if (!n.isRest && n.freq > 0) AudioEngine.createMelodySound(ctx, n.freq, now + hoff, n.duration, 0.12, this.localSong.melodyTimbre, this.localSong.bandMode);
          hoff += n.duration;
        });
      }

      const tb = this.getTargetBeats();
      for (let i = 0; i < tb; i++) {
        AudioEngine.triggerPerc(ctx, now + i * (60 / this.localSong.bpm), i === 0 ? 'bombo' : 'caja', this.localSong.percKit);
      }
    },

    triggerFileInput() { this.$refs.imageInput.click(); },

    loadImage(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        this.localSong.customImageSrc = ev.target.result;
        this.applyPixelArt(ev.target.result);
        this.emit();
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },

    applyPixelArt(src) {
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const blockSize = parseInt(this.pixelRes) || 8;
        const canvas = this.$refs.previewCanvas;
        if (!canvas) return;
        const pCtx = canvas.getContext('2d');
        const PW = canvas.width, PH = canvas.height;
        const tmpW = Math.max(2, Math.floor(PW / blockSize));
        const tmpH = Math.max(2, Math.floor(PH / blockSize));
        const tmp = document.createElement('canvas');
        tmp.width = tmpW; tmp.height = tmpH;
        const tCtx = tmp.getContext('2d');
        tCtx.drawImage(img, 0, 0, tmpW, tmpH);
        pCtx.imageSmoothingEnabled = false;
        pCtx.clearRect(0, 0, PW, PH);
        pCtx.drawImage(tmp, 0, 0, PW, PH);

        const PBW = 256, PBH = 128;
        const pbTmpW = Math.max(2, Math.floor(PBW / blockSize));
        const pbTmpH = Math.max(2, Math.floor(PBH / blockSize));
        const pbTmp = document.createElement('canvas');
        pbTmp.width = pbTmpW; pbTmp.height = pbTmpH;
        pbTmp.getContext('2d').drawImage(img, 0, 0, pbTmpW, pbTmpH);
        const cpCanvas = document.createElement('canvas');
        cpCanvas.width = PBW; cpCanvas.height = PBH;
        const cpCtx = cpCanvas.createElement('2d');
        cpCtx.imageSmoothingEnabled = false;
        cpCtx.drawImage(pbTmp, 0, 0, PBW, PBH);
        window._customPixelCanvas = cpCanvas;
        this.hasImage = true;
      };
      img.src = src;
    },

    reapplyPixelArt() {
      if (this.localSong.customImageSrc) this.applyPixelArt(this.localSong.customImageSrc);
    },

    clearImage() {
      this.localSong.customImageSrc = null;
      window._customPixelCanvas = null;
      this.hasImage = false;
      const canvas = this.$refs.previewCanvas;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      this.emit();
    },


exportTxt() {
      // 1. Cabecera con datos básicos de la canción
      let c = `${this.localSong.title}|BPM:${this.localSong.bpm}|TS:${this.localSong.timeSignature}\n`;
      
      // 2. Nueva línea de metadato: Guardamos el timeline completo serializado en una sola línea especial (empezando con #TIMELINE:)
      const timelineData = this.localSong.timeline ? JSON.stringify(this.localSong.timeline) : '[]';
      c += `#TIMELINE:${timelineData}\n`;
      
      // 3. Guardamos los compases únicos con su ID para poder re-vincular el timeline al importar
      this.localSong.measures.forEach(m => {
        c += `${m.id}|${m.text}\n`;
      });
      
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([c], { type: 'text/plain' }));
      a.download = `${this.localSong.title}.txt`; 
      a.click();
    },

    copyClipboard() {
      // Reutiliza exactamente la misma lógica estructurada del exportTxt para que el portapapeles sea compatible
      let c = `${this.localSong.title}|BPM:${this.localSong.bpm}|TS:${this.localSong.timeSignature}\n`;
      const timelineData = this.localSong.timeline ? JSON.stringify(this.localSong.timeline) : '[]';
      c += `#TIMELINE:${timelineData}\n`;
      
      this.localSong.measures.forEach(m => {
        c += `${m.id}|${m.text}\n`;
      });
      
      navigator.clipboard.writeText(c).then(() => this.showStatus('✔ Copiado al portapapeles con estructura'));
    },

    importTxt(e) {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = ev => {
        const lines = ev.target.result.split('\n');
        const h = lines[0].split('|');
        
        if (h.length >= 3) {
          this.localSong.title = h[0];
          this.localSong.bpm = parseFloat(h[1].split(':')[1]);
          this.localSong.timeSignature = h[2].split(':')[1];
        }
        
        this.localSong.measures = [];
        this.localSong.timeline = [];
        
        // Procesamos el resto de líneas
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Detectar la línea del patrón/timeline
          if (line.startsWith('#TIMELINE:')) {
            try {
              const jsonStr = line.replace('#TIMELINE:', '');
              this.localSong.timeline = JSON.parse(jsonStr);
            } catch (err) {
              this.localSong.timeline = [];
            }
          } else {
            // Es una línea de compás. Intentamos separar ID y Texto
            const parts = line.split('|');
            if (parts.length >= 2) {
              this.localSong.measures.push({
                id: parts[0], // Recupera su ID original para mantener los vínculos del timeline intactos
                text: parts.slice(1).join('|') // Por si el texto del compás contenía barras por alguna razón
              });
            } else if (parts.length === 1) {
              // Fallback por si importas un TXT antiguo que no tenía IDs guardados
              this.localSong.measures.push({
                id: 'm-' + Math.random().toString(36).substr(2, 9),
                text: parts[0]
              });
            }
          }
        }
        
        this.emit();
      };
      r.readAsText(file);
    },

    exportMidi() {
      // --- CONSTRUCCIÓN DEL FLUJO DE COMPASES SEGÚN EL PATRÓN (TIMELINE) ---
      let targetMeasuresText = [];

      if (this.localSong.timeline && this.localSong.timeline.length > 0) {
        // Recorremos el timeline para ordenar y repetir los textos de los compases adecuadamente
        this.localSong.timeline.forEach(block => {
          const matchedMeasure = this.localSong.measures.find(m => m.id === block.measureId);
          if (matchedMeasure) {
            targetMeasuresText.push(matchedMeasure.text);
          }
        });
      }

      // Fallback: Si el timeline está vacío, exportamos la lista de compases lineal por defecto
      if (targetMeasuresText.length === 0) {
        targetMeasuresText = this.localSong.measures.map(m => m.text);
      }

      // El Parser ahora procesa la cadena ordenada/repetida final generada por el patrón
      const { melody, harmony } = Parser.parseMeasures(targetMeasuresText, this.localSong.bpm);
      
      const bytes = MidiExport.exportToMidi({
        title: this.localSong.title,
        bpm: this.localSong.bpm,
        timeSignature: this.localSong.timeSignature,
        measureMelody: melody,
        measureHarmony: harmony,
        includeHarmony: true,
        separateChannels: false
      });
      
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
      a.download = `${this.localSong.title}.mid`; 
      a.click();
      this.showStatus('✔ MIDI exportado siguiendo el patrón');
    },


    exportPartitura() {
      try {
        const { melody, harmony } = Parser.parseMeasures(
          this.localSong.measures.map(m => m.text),
          this.localSong.bpm
        );

        // Generamos el contenido del PDF
        const pdfData = PartituraExport.exportToPartitura({
          title: this.localSong.title,
          bpm: this.localSong.bpm,
          timeSignature: this.localSong.timeSignature,
          measureMelody: melody,
          measureHarmony: harmony,
          includeHarmony: true,
          separateChannels: false
        });

        // Creamos el Blob con el tipo MIME correcto para PDF
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        // Creamos el elemento de descarga invisible
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.localSong.title || 'partitura'}.pdf`; 
        
        // Añadimos al documento, hacemos click y limpiamos la memoria
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showStatus('✔ Partitura PDF exportada');
      } catch (error) {
        console.error("Error al exportar PDF:", error);
        this.showStatus('❌ Error al exportar PDF');
      }
    },



    showStatus(msg) {
      this.statusMsg = msg;
      clearTimeout(this.statusTimer);
      this.statusTimer = setTimeout(() => this.statusMsg = '', 2000);
    }
  },

  mounted() {
    if (this.localSong.customImageSrc) {
      this.$nextTick(() => this.applyPixelArt(this.localSong.customImageSrc));
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.editor-screen {
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 100px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #09090b;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #f4f4f5;
  -webkit-font-smoothing: antialiased;
}

/* MENÚ HORIZONTAL SUPERIOR */
.top-navbar {
  background: #141416;
  border: 1px solid #232326;
  border-radius: 12px;
  padding: 6px 12px;
}
.nav-menu {
  display: flex;
  gap: 4px;
}
.nav-item {
  position: relative;
}
.nav-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.nav-btn:hover, .active-btn {
  color: #ffffff;
  background: #27272a;
}
.arrow-down {
  font-size: 8px;
  color: #71717a;
}

/* SUBMENÚ DESPLEGABLE */
.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: #1c1c1f;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 6px;
  min-width: 180px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
  z-index: 100;
  margin-top: 4px;
}
.has-dropdown:hover .dropdown-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dropdown-item {
  background: transparent;
  border: none;
  color: #e4e4e7;
  padding: 10px 12px;
  font-size: 13px;
  text-align: left;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  white-space: nowrap;
}
.dropdown-item:hover {
  background: #27272a;
  color: #ffffff;
}
.midi-item {
  color: #f59e0b;
}
.midi-item:hover {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

/* TITLE */
.title-container {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 4px;
}
.song-title-input {
  width: 100%;
  background: transparent;
  border: none;
  color: #ffffff;
  padding: 12px;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  outline: none;
  letter-spacing: -0.02em;
}

/* SECTIONS */
.editor-section {
  background: #141416;
  border: 1px solid #232326;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
}
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #a1a1aa;
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* CONTROLES DE REPRODUCCIÓN INTERNA */
.btn-full-play {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
  padding: 12px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-full-play:active {
  background: rgba(16, 185, 129, 0.25);
}

/* MODALES / POPUPS (ESTILOS GENERALES) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.help-popup-card {
  background: #111113;
  border: 1px solid #27272a;
  border-radius: 16px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  animation: scaleUp 0.15s ease-out;
}
@keyframes scaleUp {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.help-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #232326;
  background: #141416;
}
.help-popup-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.close-popup-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}
.close-popup-btn:hover {
  color: #ffffff;
}
.help-popup-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* INTERIOR POPUP AJUSTES */
.bpm-block {
  display: flex;
  flex-direction: column;
  background: #1c1c1f;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #27272a;
}
.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.setting-label {
  font-size: 12px;
  color: #a1a1aa;
}
.bpm-value {
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
  font-family: 'JetBrains Mono', monospace;
}
.bpm-value small {
  font-size: 10px;
  color: #71717a;
}
.slider-wrapper {
  display: flex;
  align-items: center;
  height: 24px;
}
input[type=range] {
  width: 100%;
  height: 6px;
  background: #27272a;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  accent-color: #10b981;
}
.selects-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* INTERIOR POPUP TIMBRES */
.timbre-grid-vertical {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.select-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.timbre-label {
  font-size: 11px;
  font-weight: 600;
  color: #71717a;
  text-transform: uppercase;
}

/* CUSTOM DESIGNS FOR SELECTS */
.custom-select-wrapper {
  position: relative;
  background: #1c1c1f;
  border: 1px solid #27272a;
  border-radius: 10px;
}
.custom-select-wrapper::after {
  content: '▼';
  font-size: 9px;
  color: #a1a1aa;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
select {
  background: transparent;
  color: #f4f4f5;
  border: none;
  padding: 12px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
  outline: none;
  appearance: none;
  cursor: pointer;
}

/* NOTATION ROWS (HELP) */
.help-row {
  font-size: 11px;
  color: #a1a1aa;
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
}
.hk {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}
.sep {
  color: #3f3f46;
  margin: 0 4px;
}

/* STATUS */
.status-bar-wrapper {
  display: flex;
  justify-content: center;
}
.status-bar {
  background: #27272a;
  border: 1px solid #3f3f46;
  color: #f4f4f5;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  padding: 6px 16px;
}

/* COMPASES */
.measures-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}
.measure-card {
  background: #1c1c1f;
  border: 1px solid #27272a;
  border-left: 4px solid #3f3f46;
  padding: 12px;
  border-radius: 10px;
}
.measure-card.complete { border-left-color: #10b981; }
.measure-card.overflow { border-left-color: #ef4444; }
.measure-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.measure-num {
  font-size: 11px;
  font-weight: 700;
  color: #71717a;
}
.beat-counter {
  font-size: 12px;
  color: #a1a1aa;
  font-family: 'JetBrains Mono', monospace;
}
.measure-actions {
  display: flex;
  gap: 6px;
}
.action-btn {
  background: #27272a;
  border: none;
  color: #a1a1aa;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.measure-input {
  width: 100%;
  background: #141416;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  padding: 10px;
  resize: none;
  text-transform: uppercase;
  outline: none;
  box-sizing: border-box;
}
.btn-add-measure {
  width: 100%;
  margin-top: 12px;
  background: transparent;
  color: #10b981;
  border: 1px dashed rgba(16, 185, 129, 0.4);
  padding: 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* GLOBAL FOOTER ACTION */
.sticky-bottom-action {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding-top: 10px;
  background: linear-gradient(transparent, #09090b 20%);
}
.btn-play-main {
  width: 100%;
  background: #10b981;
  color: #ffffff;
  border: none;
  padding: 16px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* TRANSITIONS */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}



.sticky-bottom-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: #111726; /* Sincronizado con var(--color-surface) */
  border-top: 1px solid #1e293b;
}

.player-selector-wrap {
  flex: 0 0 180px; /* Ancho fijo para el desplegable */
}

.select-player-type {
  width: 100%;
  padding: 12px;
  background-color: #1e293b;
  color: #f3f4f6;
  border: 1px solid #334155;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;
}

.select-player-type:focus {
  border-color: #6366f1; /* Color primario índigo */
}

.btn-play-main {
  flex: 1; /* El botón de reproducción toma el resto del espacio disponible */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  background: #6366f1;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-play-main:hover {
  background: #4f46e5;
  transform: translateY(-1px);
}

</style>