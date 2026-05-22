<template>
  <nav class="navbar">
    <div class="nav-brand">🎵 {{ title }}</div>
    <div class="nav-tabs">
      <button
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['nav-tab', screen === tab.id ? 'active' : '']"
        @click="$emit('go', tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'NavBar',
  props: ['screen', 'title'],
  emits: ['go'],
  
  data() {
    return {
      tabs: [
        { id: 'editor', label: '✏️' },
        { id: 'playback', label: '▶️' }
      ]
    };
  }
};
</script>

<style scoped>
.navbar {
  display: flex; 
  align-items: center; 
  justify-content: space-between;
  padding: 8px 12px; 
  background: #0d0d0d;
  border-bottom: 2px solid #d4af37;
  flex-shrink: 0; 
  height: 44px;
}

.nav-brand {
  font-size: 8px; 
  color: #d4af37;
  letter-spacing: 1px; 
  white-space: nowrap;
  overflow: hidden; 
  text-overflow: ellipsis;
  max-width: 180px;
}

.nav-tabs { 
  display: flex; 
  gap: 6px; 
}

.nav-tab {
  background: transparent; 
  border: 2px solid #333;
  color: #555; 
  padding: 5px 10px; 
  font-size: 14px;
  border-radius: 4px; 
  transition: all 0.15s;
  cursor: pointer; /* Añadido por buena práctica para inputs interactivos */
}

.nav-tab.active { 
  border-color: #d4af37; 
  color: #d4af37; 
  background: #1a1500; 
}
</style>