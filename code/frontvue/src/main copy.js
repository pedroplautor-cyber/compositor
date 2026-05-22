import { createApp } from 'vue';
// Importamos los componentes desde sus respectivos archivos .vue
import NavBar from './components/NavBar.vue';
import EditorScreen from './components/EditorScreen.vue';
import PlaybackScreen from './components/PlaybackScreen.vue';
// Importamos los estilos globales (en lugar de inyectarlos con JS)
import './assets/styles.css'; 

const AppRoot = {
  name: 'AppRoot',
  components: { 
    NavBar, 
    EditorScreen, 
    PlaybackScreen 
  },

  template: `
  <div class="app-shell">
    <NavBar :screen="screen" :title="song.title" @go="navigate" />
    <div class="screen-container">
      <EditorScreen
        v-show="screen === 'editor'"
        :song="song"
        @update:song="song = $event"
        @play="startPlayback"
      />
      <PlaybackScreen
        :song="song"
        :active="screen === 'playback'"
        @stop="stopPlayback"
      />
    </div>
  </div>
  `,

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
          { id: 1, text: 'DO2. DO4 RE4 MI4 | [DO MI SOL]2 _2' },
          { id: 2, text: 'MI4- MI8 MI8 FA4 SOL2 | RE2 SOL2' },
        ]
      }
    };
  },

  methods: {
    navigate(id) {
      if (id === 'playback') { this.startPlayback(); return; }
      this.screen = id;
    },
    startPlayback() { this.screen = 'playback'; },
    stopPlayback() { this.screen = 'editor'; }
  }
};

createApp(AppRoot).mount('#app');