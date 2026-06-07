<script setup>
import { computed } from 'vue'
import { db, logoutDemo } from '../demoStore'
import AppPopups from './components/AppPopups.vue'

const authed = computed(() => !!db.auth.token)
const isAdmin = computed(() => db.auth.role === 'admin')

function logout() {
  logoutDemo()
  location.href = '/'
}

</script>

<template>
  <header class="hdr">
    <div class="container hdr-row">
      <RouterLink to="/" class="brand">
        <div class="brand-badge">🐾</div>
        <div>
          <div class="brand-title">Помощь животным</div>
          <div class="brand-sub">Платформа волонтёров</div>
        </div>
      </RouterLink>

      <nav class="nav">
  <RouterLink to="/" class="nav-link">Главная</RouterLink>
  <RouterLink to="/animals" class="nav-link">Животные</RouterLink>
  <RouterLink to="/help" class="nav-link">Помочь</RouterLink>

  <RouterLink v-if="authed" to="/profile" class="nav-link">Профиль</RouterLink>
  <RouterLink v-if="authed && isAdmin" to="/admin" class="nav-link">Админка</RouterLink>

  <span v-if="authed" class="user-pill">
    {{ db.auth.userName }} • {{ db.auth.role }}
  </span>

  <button v-if="authed" class="btn btn-primary mini" @click="logout">
    Выйти
  </button>
</nav>
    </div>
  </header>
</template>

<style scoped>
.hdr{ background:#fff; border-bottom:1px solid var(--border); }
.hdr-row{ height:64px; display:flex; align-items:center; justify-content:space-between; gap:14px; }
.brand{ display:flex; align-items:center; gap:10px; text-decoration:none; }
.brand-badge{
  width:36px; height:36px; border-radius:12px;
  background:rgba(245,158,11,.18);
  display:flex; align-items:center; justify-content:center; font-weight:900;
}
.brand-title{ font-weight:900; line-height:1; }
.brand-sub{ font-size:12px; color:var(--muted); margin-top:2px; }

.nav{ display:flex; align-items:center; gap:12px; font-weight:800; flex-wrap:wrap; justify-content:flex-end; }
.nav-link{ text-decoration:none; }
.nav-link.router-link-active{ text-decoration:underline; }

.user-pill{
  font-weight:800;
  font-size:12px;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid var(--border);
  color:var(--muted);
}

.mini{ width:auto; padding:8px 12px; border-radius:12px; }
</style>
