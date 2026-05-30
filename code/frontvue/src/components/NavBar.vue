<template>
  <nav class="navbar">
    <div class="nav-brand">
      <span class="brand-icon">🎵</span>
      <span class="brand-title">Compositor</span>
    </div>
    
    <div class="nav-tabs">
      <!-- Pestañas estáticas (Editor y Partitura) -->
      <button
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['nav-tab', screen === tab.id ? 'active' : '']"
        @click="$emit('go', tab.id)"
        :aria-label="tab.ariaLabel"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-text">{{ tab.label }}</span>
      </button>


        <div class="select-container">
          <span class="select-icon">▶️</span>
          
          <select 
            :value="screen" 
            @change="onPlayerSelect($event)"
            class="nav-select"
            :class="{ 'active': screen === 'playerPiano' || screen === 'playerBanda' }"
            aria-label="Seleccionar Reproductor"
          >
            <option value="" disabled v-if="screen !== 'playerPiano' && screen !== 'playerBanda'">
              Reproductor
            </option>
            
            <option value="playerPiano">🎹 Modo Piano</option>
            <option value="playerBanda">🎺 Modo Banda</option>
          </select>
        </div>



    </div>
  </nav>
</template>

<script>
export default {
  name: 'NavBar',
  props: {
    screen: { type: String, required: true },
    title: { type: String, default: 'Mi App' }
  },
  // Se declara el nuevo evento 'player-change'
  emits: ['go', 'player-change'],
  
  data() {
    return {
      isDropdownOpen: false,
      tabs: [        
        { id: 'editor', label: 'Editor', icon: '✏️', ariaLabel: 'Ir al Editor' },
        { id: 'partitura', label: 'Partitura', icon: '📄', ariaLabel: 'Ir a la partitura' }
      ]
    };
  },
  methods: {
    toggleDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
    },

  onPlayerSelect(event) {
    const playerType = event.target.value;
    if (playerType) {
      this.$emit('player-change', playerType);
    }
  },


    closeDropdown() {
      this.isDropdownOpen = false;
    },
    selectPlayer(playerType) {
      // Emite el cambio al contenedor padre
      this.$emit('player-change', playerType);
      this.closeDropdown();
    }
  }
};
</script>

<style scoped>
/* Contenedor Principal con efecto Glassmorphism */
.navbar {
  display: flex; 
  align-items: center; 
  justify-content: space-between;
  padding: 0 24px; 
  background: rgba(13, 13, 13, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  flex-shrink: 0; 
  height: 56px; 
  position: relative;
  z-index: 999; 
}

/* Marca / Título */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 40%;
}

.brand-icon {
  font-size: 1.2rem;
}

.brand-title {
  font-size: 14px; 
  font-weight: 600;
  color: #e5e5e5;
  letter-spacing: 0.5px; 
  white-space: nowrap;
  overflow: hidden; 
  text-overflow: ellipsis;
  text-transform: uppercase;
  background: linear-gradient(45deg, #ffffff, #d4af37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Contenedor de pestañas */
.nav-tabs { 
  display: flex; 
  gap: 8px; 
  background: rgba(255, 255, 255, 0.03);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

/* Botón / Pestaña individual */
.nav-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent; 
  border: 1px solid transparent;
  color: #888; 
  padding: 6px 14px; 
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px; 
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer; 
}

.nav-tab:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.nav-tab.active { 
  border-color: rgba(212, 175, 55, 0.4); 
  color: #d4af37; 
  background: rgba(212, 175, 55, 0.1); 
  box-shadow: inset 0 0 8px rgba(212, 175, 55, 0.05);
  font-weight: 600;
}

.tab-icon {
  font-size: 12px;
  opacity: 0.8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.arrow-icon {
  font-size: 9px;
  margin-left: 2px;
  transition: transform 0.2s ease;
}

.arrow-icon.rotated {
  transform: rotate(180deg);
}

/* --- ESTILOS DEL DESPLEGABLE (DROPDOWN) --- */
.dropdown-container {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 100;
  animation: fadeIn 0.15s ease-out;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #b3b3b3;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  color: #ffffff;
  background: rgba(212, 175, 55, 0.15);
}

/* Estado visual para identificar cuál reproductor está activo dentro del menú */
.dropdown-item.selected {
  color: #d4af37;
  background: rgba(212, 175, 55, 0.1);
  font-weight: 600;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Ajustes móviles */
@media (max-width: 480px) {
  .tab-text {
    display: none;
  }
  .nav-tab, .dropdown-item {
    padding: 8px;
    justify-content: center;
  }
  .dropdown-menu {
    min-width: auto;
  }
  .arrow-icon {
    margin-left: 0;
  }
}


.select-container {
  display: flex;
  align-items: center;
  position: relative;
  background: transparent;
}

.select-icon {
  position: absolute;
  left: 12px;
  font-size: 13px;
  pointer-events: none; /* Evita que bloquee los clics en el select */
  opacity: 0.8;
}

.nav-select {
  padding: 6px 14px 6px 32px; /* Espacio extra a la izquierda para el icono */
  font-size: 13px;
  font-weight: 500;
  color: #888;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-appearance: none; /* Oculta la flecha nativa del sistema */
  -moz-appearance: none;
  appearance: none;
}

/* Estilo para simular que hay una flecha al final (opcional) */
.select-container::after {
  content: "▼";
  font-size: 9px;
  color: #888;
  position: absolute;
  right: 10px;
  pointer-events: none;
}

.nav-select:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

/* Se activa si el reproductor actual en "screen" coincide */
.nav-select.active {
  border-color: rgba(212, 175, 55, 0.4); 
  color: #d4af37; 
  background: rgba(212, 175, 55, 0.1); 
  font-weight: 600;
}

/* Estilo para las opciones internas dentro del menú desplegable */
.nav-select option {
  background: #141414;
  color: #b3b3b3;
  padding: 8px;
}


</style>