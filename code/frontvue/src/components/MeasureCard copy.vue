<template>
  <div class="measures-list-wrapper" v-if="localSong && localSong.measures">
    <div 
      v-for="(measure, index) in localSong.measures"
      :key="measure.id || index"
      :class="['measure-row-container', getMeasureStatus(measure.text)]"
      :draggable="true"
      @dragstart="handleDragStart(index)"
      @dragover.prevent
      @drop="handleDrop(index)"
    >
      <div class="drag-handle" title="Arrastrar para reordenar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>          
        </svg>
      </div>

      <div class="measure-meta">
        <span class="measure-num">{{ index + 1 }}</span>
        <span class="beat-counter">{{ getBeatDisplay(measure.text) }}</span>
      </div>

      <div class="input-wrapper">
        <input
          type="text"
          class="measure-input-line"
          :value="measure.text"
          @input="updateMeasureText(index, $event.target.value)"
          spellcheck="false"
          autocorrect="off"
          autocapitalize="characters"
          placeholder="Introduce notas (ej. C4 D4 E4)..."
        />
      </div>

      <div class="measure-actions-horizontal">
        <button class="mini-btn play-btn" @click="$emit('play', { text: measure.text, index })" title="Escuchar compás">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>

        <button class="mini-btn add-btn" @click="insertAfter(index)" title="Insertar compás abajo">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        <button class="mini-btn duplicate-btn" @click="duplicateMeasure(index)" title="Duplicar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="1" ry="1"></rect>
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"></path>
          </svg>
        </button>
        
        <button class="mini-btn del-btn" @click="removeMeasure(index)" title="Eliminar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="add-new-container">
      <button class="add-new-btn" @click="addNewMeasure" title="Añadir nuevo compás al final">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Añadir compás
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MeasureList',
  
  props: {
    song: { type: Object, required: true },
    getMeasureStatus: { type: Function, required: true },
    getBeatDisplay: { type: Function, required: true }
  },

  emits: ['update:song', 'play'],

  data() {
    return {
      localSong: JSON.parse(JSON.stringify(this.song)),
      draggedIndex: null
    };
  },

  watch: {
    song: {
      deep: true,
      handler(newSong) {
        this.localSong = JSON.parse(JSON.stringify(newSong));
      }
    }
  },

  methods: {
    emit() {
      this.$emit('update:song', JSON.parse(JSON.stringify(this.localSong)));
    },

    createBlankMeasure() {
      return {
        id: 'm-' + Math.random().toString(36).substr(2, 9),
        text: ''
      };
    },

    updateMeasureText(index, text) {
      this.localSong.measures[index].text = text;
      this.emit();
    },

    addNewMeasure() {
      this.localSong.measures.push(this.createBlankMeasure());
      this.emit();
    },

    insertAfter(index) {
      this.localSong.measures.splice(index + 1, 0, this.createBlankMeasure());
      this.emit();
    },

    duplicateMeasure(index) {
      const clone = { 
        ...this.localSong.measures[index], 
        id: 'm-' + Math.random().toString(36).substr(2, 9) 
      };
      this.localSong.measures.splice(index + 1, 0, clone);
      this.emit();
    },

    removeMeasure(index) {
      this.localSong.measures.splice(index, 1);
      this.emit();
    },
    
    handleDragStart(index) {
      this.draggedIndex = index;
    },

    handleDrop(targetIndex) {
      if (this.draggedIndex === null || this.draggedIndex === targetIndex) return;
      
      const [draggedItem] = this.localSong.measures.splice(this.draggedIndex, 1);
      this.localSong.measures.splice(targetIndex, 0, draggedItem);
      
      this.draggedIndex = null;
      this.emit();
    }
  }
};
</script>

<style scoped>
/* Tu CSS se mantiene exactamente igual */
.measures-list-wrapper { width: 100%; }
.measure-row-container { display: flex; align-items: center; gap: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; margin-bottom: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.15s ease; }
.measure-row-container:hover { border-color: #cbd5e1; background: #f8fafc; }
.drag-handle { color: #94a3b8; cursor: grab; display: flex; align-items: center; padding: 4px 2px; }
.drag-handle:active { cursor: grabbing; }
.measure-meta { display: flex; align-items: center; gap: 6px; min-width: 85px; }
.measure-num { font-size: 0.8rem; font-weight: 700; color: #64748b; font-variant-numeric: tabular-nums; }
.beat-counter { font-size: 0.7rem; background: #e2e8f0; color: #475569; padding: 1px 5px; border-radius: 4px; font-weight: 600; }
.input-wrapper { flex-grow: 1; }
.measure-input-line { width: 100%; border: none; background: transparent; font-family: 'Courier New', Courier, monospace; font-size: 0.95rem; font-weight: 600; color: #334155; outline: none; padding: 4px 0; }
.measure-input-line::placeholder { color: #cbd5e1; font-weight: 400; }
.measure-actions-horizontal { display: flex; align-items: center; gap: 4px; }
.mini-btn { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: none; border-radius: 6px; background: transparent; color: #64748b; cursor: pointer; transition: all 0.1s ease; }
.mini-btn:hover { background: #e2e8f0; color: #1e293b; }
.play-btn:hover { background: #dcfce7; color: #15803d; }
.add-btn:hover { background: #dbeafe; color: #1d4ed8; }
.duplicate-btn:hover { background: #f1f5f9; color: #0f172a; }
.del-btn:hover { background: #fee2e2; color: #b91c1c; }
.measure-row-container.error { border-left: 3px solid #ef4444; }
.measure-row-container.correct { border-left: 3px solid #22c55e; }
.measure-row-container.playing { border-left: 3px solid #3b82f6; background: #f0f7ff; }
.add-new-container { display: flex; justify-content: center; margin-top: 12px; margin-bottom: 8px; }
.add-new-btn { display: flex; align-items: center; gap: 6px; background: #f1f5f9; border: 1px dashed #cbd5e1; padding: 8px 16px; border-radius: 6px; color: #475569; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
.add-new-btn:hover { background: #e2e8f0; border-color: #94a3b8; color: #0f172a; }
</style>