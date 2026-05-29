```vue
<template>
  <div class="measures-list-wrapper" v-if="localSong && localSong.measures">

    <!-- LISTA DE COMPASES -->
    <div 
      v-for="(measure, index) in localSong.measures"
      :key="measure.id || index"
      :class="['measure-row-container', getMeasureStatus(measure.text)]"
      draggable="true"
      @dragstart="handleDragStart(index)"
      @dragover.prevent
      @drop="handleDrop(index)"
    >
      <div class="drag-handle">
        ⋮⋮
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
          placeholder="Introduce notas..."
        />
      </div>

      <div class="measure-actions-horizontal">
        <button class="mini-btn" @click="$emit('play', { text: measure.text, index })">
          ▶
        </button>

        <button class="mini-btn" @click="insertAfter(index)">
          +
        </button>

        <button class="mini-btn" @click="duplicateMeasure(index)">
          ⧉
        </button>

        <button class="mini-btn del-btn" @click="removeMeasure(index)">
          ✕
        </button>
      </div>
    </div>

    <!-- ADD MEASURE -->
    <div class="add-new-container">
      <button class="add-new-btn" @click="addNewMeasure">
        Añadir compás
      </button>
    </div>

    <!-- ========================= -->
    <!-- GRID DE ARRANGEMENT -->
    <!-- ========================= -->

    <div class="arrangement-wrapper">

      <div class="arrangement-header">
        <h3>Estructura de la canción</h3>

        <button class="add-pattern-btn" @click="addArrangementBlock">
          + Añadir bloque
        </button>
      </div>

      <div class="arrangement-grid">

        <div
          v-for="(block, index) in localSong.arrangement"
          :key="index"
          class="arrangement-block"
          :style="{ backgroundColor: block.color || '#cbd5e1' }"
        >
          <!-- COMPÁS -->
          <select
            v-model.number="block.measureIndex"
            @change="emit"
            class="arrangement-select"
          >
            <option
              v-for="(measure, mIndex) in localSong.measures"
              :key="measure.id"
              :value="mIndex"
            >
              Compás {{ mIndex + 1 }}
            </option>
          </select>

          <!-- NOMBRE SECCIÓN -->
          <input
            type="text"
            v-model="block.section"
            @input="emit"
            placeholder="Sección"
            class="section-input"
          />

          <!-- COLOR -->
          <input
            type="color"
            v-model="block.color"
            @input="emit"
            class="color-input"
          />

          <!-- REMOVE -->
          <button
            class="remove-block-btn"
            @click="removeArrangementBlock(index)"
          >
            ✕
          </button>
        </div>

      </div>

      <!-- PREVIEW -->
      <div class="arrangement-preview">
        <span
          v-for="(block, index) in localSong.arrangement"
          :key="'preview-' + index"
          class="preview-item"
          :style="{ backgroundColor: block.color || '#cbd5e1' }"
        >
          {{ block.measureIndex + 1 }}
        </span>
      </div>

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
      localSong: this.normalizeSong(this.song),
      draggedIndex: null
    };
  },

  watch: {
    song: {
      deep: true,
      handler(newSong) {
        this.localSong = this.normalizeSong(newSong);
      }
    }
  },

  methods: {

    normalizeSong(song) {
      const clone = JSON.parse(JSON.stringify(song));

      if (!clone.arrangement) {
        clone.arrangement = clone.measures.map((m, index) => ({
          measureIndex: index,
          section: '',
          color: '#cbd5e1'
        }));
      }

      return clone;
    },

    emit() {
      this.$emit(
        'update:song',
        JSON.parse(JSON.stringify(this.localSong))
      );
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

      this.localSong.arrangement.push({
        measureIndex: this.localSong.measures.length - 1,
        section: '',
        color: '#cbd5e1'
      });

      this.emit();
    },

    insertAfter(index) {
      this.localSong.measures.splice(
        index + 1,
        0,
        this.createBlankMeasure()
      );

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

      this.localSong.arrangement =
        this.localSong.arrangement.filter(
          b => b.measureIndex !== index
        );

      this.emit();
    },

    handleDragStart(index) {
      this.draggedIndex = index;
    },

    handleDrop(targetIndex) {
      if (
        this.draggedIndex === null ||
        this.draggedIndex === targetIndex
      ) return;

      const [draggedItem] =
        this.localSong.measures.splice(this.draggedIndex, 1);

      this.localSong.measures.splice(targetIndex, 0, draggedItem);

      this.draggedIndex = null;

      this.emit();
    },

    // ====================
    // ARRANGEMENT
    // ====================

    addArrangementBlock() {
      this.localSong.arrangement.push({
        measureIndex: 0,
        section: '',
        color: '#cbd5e1'
      });

      this.emit();
    },

    removeArrangementBlock(index) {
      this.localSong.arrangement.splice(index, 1);
      this.emit();
    }
  }
};
</script>

<style scoped>

.arrangement-wrapper {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid #e2e8f0;
}

.arrangement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.arrangement-header h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #334155;
}

.add-pattern-btn {
  border: none;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.arrangement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.arrangement-block {
  position: relative;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.arrangement-select,
.section-input {
  border: none;
  border-radius: 6px;
  padding: 6px;
  background: rgba(255,255,255,0.85);
  font-weight: 600;
}

.color-input {
  width: 100%;
  height: 34px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.remove-block-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  background: rgba(255,255,255,0.8);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
}

.arrangement-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 18px;
}

.preview-item {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
}

</style>
```
