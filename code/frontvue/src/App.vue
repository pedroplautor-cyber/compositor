<template>
  <div class="app-shell">
    <NavBar 
      :screen="screen" 
      :title="song.title" 
      @go="navigate" 
      @tool-action="handleToolAction" 
    />
    
    <div class="screen-container">
      <EditorScreen
        v-show="screen === 'editor'"
        :song="song"
        @update:song="song = $event"
        @play="startPlayback"
      />
      
      <PlaybackScreen
        v-show="screen === 'playback'"
        :song="song"
        :active="screen === 'playback'"
        @stop="stopPlayback"
      />
      
      <ComponentePartitura
        v-show="screen === 'partitura'"
        :song="song"
        :active="screen === 'partitura'"
        @stop="stopPlayback"
      />
    </div>
  </div>
</template>

<script>
import NavBar from './components/NavBar.vue';
import EditorScreen from './components/EditorScreen.vue';
import PlaybackScreen from './components/PlaybackScreen.vue';
import ComponentePartitura from './components/ComponentePartitura.vue';

export default {
  name: 'AppRoot',
  components: { 
    NavBar, 
    EditorScreen, 
    PlaybackScreen,
    ComponentePartitura
  },
  data() {
    return {
      screen: 'editor',
      song: {
        title: 'DEMO TÉCNICA',
        bpm: 100,
        timeSignature: '4/4',
        bandMode: 'duet',
        melodyTimbre: 'triangle',
        percKit: 'classic',
        customImageSrc: null,
        measures: [
          { id: 1, text: 'DO2 DO4 RE4 | [DO MI SOL]2 _2' },
          { id: 2, text: 'MI4 FA4 SOL2 | RE2 SOL2' },
        ]
      }
    };
  },
  methods: {
    navigate(id) {
      if (id === 'playback') { this.startPlayback(); return; }
      this.screen = id;
    },
    handleToolAction(actionId) {
      if (actionId === 'partitura') {
        this.screen = 'partitura';
      }
    },
    startPlayback() { this.screen = 'playback'; },
    stopPlayback() { this.screen = 'editor'; }
  }
};
</script>

<style scoped>
/* Contenedor principal de la aplicación */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* Ocupa al menos el 100% de la pantalla */
}

/* Contenedor que envuelve a los componentes hijos/pantallas */
.screen-container {
  flex-grow: 1; /* Ocupa todo el espacio restante debajo del NavBar */
  display: flex;
  flex-direction: column;
}

/* Aplica la altura mínima a cualquier componente hijo directo dentro del contenedor */
.screen-container > * {
  flex-grow: 1;
  min-height: 400px; /* 👈 MODIFICA ESTE VALOR con la altura mínima que desees (ej: 400px, 60vh, etc.) */
  box-sizing: border-box;
}
</style>