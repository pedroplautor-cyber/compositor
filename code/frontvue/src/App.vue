<template>
  <div class="app-shell">
    <NavBar 
      :screen="screen" 
      :title="song.title" 
      @go="navigate" 
      @player-change="handlePlayerChange" 
    />
    
    <div class="screen-container">
      <EditorScreen
        v-show="screen === 'editor'"
        :song="song"
        @update:song="song = $event"
        @play="startPlayback"
      />
      
      <PlayerPiano
        v-show="screen === 'playerPiano'"
        :song="song"
        :active="screen === 'playerPiano'"
        @stop="stopPlayback"
      />
      
      <PlayerBanda
        v-show="screen === 'playerBanda'"
        :song="song"
        :active="screen === 'playerBanda'"
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
import PlayerPiano from './components/PlayerPiano.vue';
import PlayerBanda from './components/PlayerBanda.vue';
import ComponentePartitura from './components/ComponentePartitura.vue';

export default {
  name: 'AppRoot',
  components: { 
    NavBar, 
    EditorScreen, 
    PlayerPiano,
    PlayerBanda,
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
          { id: 1, text: 'do4 re4 mi4 fa4 | [<do <re]2 >mi2'},
        ]
      }
    };
  },
  methods: {
    navigate(id) {
      // Si navega a playerPiano de forma directa, activa la reproducción
      if (id === 'playerPiano' || id === 'playerBanda') { 
        this.screen = id;
        return; 
      }
      this.screen = id;
    },
    // Nuevo método para manejar la selección entre playerPiano y playerBanda
    handlePlayerChange(playerType) {
      if (playerType === 'playerPiano' || playerType === 'playerBanda') {
        this.screen = playerType;
      }
    },
    startPlayback() { 
      // Por defecto va al playerPiano al darle a play desde el editor
      this.screen = 'playerPiano'; 
    },
    stopPlayback() { 
      this.screen = 'editor'; 
    }
  }
};
</script>

<style scoped>
/* Contenedor principal de la aplicación */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Contenedor que envuelve a los componentes hijos/pantallas */
.screen-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

/* Aplica la altura mínima a cualquier componente hijo directo */
.screen-container > * {
  flex-grow: 1;
  min-height: 400px;
  box-sizing: border-box;
}
</style>