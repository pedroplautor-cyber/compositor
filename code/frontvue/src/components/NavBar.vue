<template>
  <nav class="navbar">
    <div class="nav-brand">
      <span class="brand-icon">🎵</span>
      <span class="brand-title">Compositor</span>
    </div>
    
    <div class="nav-tabs">
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

      <div 
        class="dropdown-container"
        @mouseleave="closeDropdown"
      >
        <button 
          :class="['nav-tab', isDropdownOpen ? 'active' : '']"
          @click="toggleDropdown"
          aria-haspopup="true"
          :aria-expanded="isDropdownOpen"
        >
          <span class="tab-icon">🛠️</span>
          <span class="tab-text">Herramientas</span>
          <span class="arrow-icon" :class="{ 'rotated': isDropdownOpen }">▼</span>
        </button>

        <div v-if="isDropdownOpen" class="dropdown-menu">
          <button 
            class="dropdown-item" 
            @click="selectTool('partitura')"
          >
            <span class="tab-icon">📄</span>
            <span class="tab-text">Ver partitura</span>
          </button>
          <button 
            class="dropdown-item" 
            @click="selectTool('transponer')"
          >
            <span class="tab-icon">🔄</span>
            <span class="tab-text">Transponer</span>
          </button>
          <button 
            class="dropdown-item" 
            @click="selectTool('limpiar')"
          >
            <span class="tab-icon">🗑️</span>
            <span class="tab-text">Limpiar Lienzo</span>
          </button>
        </div>
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
  emits: ['go', 'tool-action'],
  
  data() {
    return {
      isDropdownOpen: false,
      tabs: [        
        { id: 'editor', label: 'Editor', icon: '✏️', ariaLabel: 'Ir al Editor' },
        { id: 'partitura', label: 'Partitura', icon: '📄', ariaLabel: 'Ir a la partitura' },
        { id: 'playback', label: 'Play', icon: '▶️', ariaLabel: 'Ir a Reproducción' }
      ]
    };
  },
  methods: {
    toggleDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
    },
    closeDropdown() {
      this.isDropdownOpen = false;
    },
    selectTool(actionId) {
      this.$emit('tool-action', actionId);
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

/* Unificado con la estética del .nav-tab original */
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

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Ajustes móviles (Afecta automáticamente a los ítems del dropdown gracias al cambio de clase) */
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
</style>