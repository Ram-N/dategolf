<template>
  <nav class="game-nav">
    <RouterLink to="/dategolf" class="nav-link">DateGolf</RouterLink>
    <RouterLink to="/datepick" class="nav-link">DatePick</RouterLink>
  </nav>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<style scoped>
.game-nav {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.5rem 1rem;
  background: #09090b;
  border-bottom: 1px solid #27272a;
}

.nav-link {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #71717a;
  text-decoration: none;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  transition: color 0.15s, background 0.15s;
}

.nav-link:hover {
  color: #fff;
}

.nav-link.router-link-active {
  color: #fff;
  background: #27272a;
}
</style>
