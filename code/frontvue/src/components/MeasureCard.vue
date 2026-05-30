<template>
  <div class="measures-list-wrapper" v-if="localSong && localSong.measures">
    <div class="measures-grid">
      <div 
        v-for="(measure, index) in localSong.measures"
        :key="measure.id || index"
        :class="['measure-row-container', getMeasureStatus(measure.text)]"
        @dragover.prevent
        @drop="handleDrop(index)"
      >
        <div class="measure-top-bar">
          <div 
            class="drag-handle" 
            title="Arrastrar para reordenar"
            :draggable="true"
            @dragstart="handleDragStart(index)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>          
            </svg>
          </div>
          <div class="measure-meta">
            <span class="measure-num">Compás {{ index + 1 }}</span>
            <span class="beat-counter">{{ getBeatDisplay(measure.text) }}</span>
          </div>
          <div class="block-order-btns ext-measure-btns">
            <button @click.stop="moveMeasureBlock(index, -1)" :disabled="index === 0" title="Mover izquierda">‹</button>
            <button @click.stop="moveMeasureBlock(index, 1)" :disabled="index === localSong.measures.length - 1" title="Mover derecha">›</button>
          </div>
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
            placeholder="Introduce notas..."
          />
        </div>

        <div class="measure-actions-horizontal">
          <button class="mini-btn play-btn" @click="$emit('play', { text: measure.text, index })" title="Escuchar compás">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>

          <button class="mini-btn add-btn" @click="insertAfter(index)" title="Insertar compás abajo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <button class="mini-btn duplicate-btn" @click="duplicateMeasure(index)" title="Duplicar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="1" ry="1"></rect>
              <path d="M5 15H4a1 1  0 0 1-1-1V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"></path>
            </svg>
          </button>
          
          <button class="mini-btn del-btn" @click="removeMeasure(index)" title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
            </svg>
          </button>
        </div>
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
      localSong: this.cloneSong(this.song),
      draggedIndex: null
    };
  },

  watch: {
    song: {
      deep: true,
      handler(newSong) {
        this.localSong = this.cloneSong(newSong);
      }
    }
  },

  methods: {
    cloneSong(songObj) {
      return JSON.parse(JSON.stringify(songObj));
    },

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
      this.moveMeasureToIndex(this.draggedIndex, targetIndex);
    },

    moveMeasureBlock(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.localSong.measures.length) return;
      this.moveMeasureToIndex(index, targetIndex);
    },

    moveMeasureToIndex(origin, target) {
      const [draggedItem] = this.localSong.measures.splice(origin, 1);
      this.localSong.measures.splice(target, 0, draggedItem);
      this.draggedIndex = null;
      this.emit();
    }
  }
};
</script>

<style scoped>
.measures-list-wrapper { width: 100%; }

.measures-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.measure-row-container { 
  display: flex; 
  flex-direction: column; 
  gap: 10px; 
  background: #ffffff; 
  border: 1px solid #e2e8f0; 
  border-radius: 8px; 
  padding: 12px; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.02); 
  transition: all 0.15s ease; 
  box-sizing: border-box;
}
.measure-row-container:hover { border-color: #cbd5e1; background: #f8fafc; }

.measure-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.drag-handle { color: #94a3b8; cursor: grab; display: flex; align-items: center; padding: 4px 2px; }
.drag-handle:active { cursor: grabbing; }
.measure-meta { display: flex; align-items: center; gap: 6px; flex-grow: 1; margin-left: 4px; }
.measure-num { font-size: 0.85rem; font-weight: 700; color: #64748b; font-variant-numeric: tabular-nums; }
.beat-counter { font-size: 0.75rem; background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 600; }

.input-wrapper { width: 100%; }
.measure-input-line { 
  width: 100%; 
  border: 1px solid #e2e8f0; 
  background: #f8fafc; 
  border-radius: 6px;
  font-family: 'Courier New', 'Courier', monospace; 
  font-size: 1rem; 
  font-weight: 600; 
  color: #334155; 
  outline: none; 
  padding: 10px 8px; 
  box-sizing: border-box;
}
.measure-input-line:focus {
  border-color: #94a3b8;
  background: #ffffff;
}
.measure-input-line::placeholder { color: #cbd5e1; font-weight: 400; }

.measure-actions-horizontal { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 8px; 
  width: 100%;
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
}
.mini-btn { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  flex: 1; 
  height: 38px; 
  border: 1px solid #e2e8f0; 
  border-radius: 6px; 
  background: #ffffff; 
  color: #64748b; 
  cursor: pointer; 
  transition: all 0.1s ease; 
}
.mini-btn:hover { background: #e2e8f0; color: #1e293b; }
.play-btn:hover { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
.add-btn:hover { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
.duplicate-btn:hover { background: #f1f5f9; color: #0f172a; }
.del-btn:hover { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

.measure-row-container.error { border-left: 4px solid #ef4444; }
.measure-row-container.correct { border-left: 4px solid #22c55e; }
.measure-row-container.playing { border-left: 4px solid #3b82f6; background: #f0f7ff; }

.add-new-container { display: flex; justify-content: center; margin-top: 14px; margin-bottom: 14px; }
.add-new-btn { display: flex; align-items: center; gap: 6px; background: #f1f5f9; border: 1px dashed #cbd5e1; padding: 10px 20px; border-radius: 6px; color: #475569; font-size: 0.9rem; font-weight: 600; cursor: pointer; width: 100%; justify-content: center; }

.ext-measure-btns button { background: #f1f5f9; color: #64748b; border: none; font-size: 0.8rem; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 4px; cursor: pointer; font-weight: bold; }
.ext-measure-btns button:hover:not(:disabled) { background: #e2e8f0; color: #1e293b; }
.ext-measure-btns button:disabled { opacity: 0.3; cursor: not-allowed; }

@media (max-width: 768px) {
  .measures-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .measures-grid {
    grid-template-columns: 1fr;
  }
}
</style>