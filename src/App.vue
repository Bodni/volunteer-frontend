<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { logout, me } from "./auth";
import { notify } from "./utils/notify";
import AppPopups from "./components/AppPopups.vue";
import logo from "./assets/logo.png";
import footerLogo from "./assets/footer-logo.png";

const mobileMenuOpen = ref(false);

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}
const router = useRouter();
const route = useRoute();

const authUser = ref(null);
const token = ref("");
const role = ref("");

function syncAuthFromStorage() {
  token.value = localStorage.getItem("token") || "";
  role.value = localStorage.getItem("role") || "";
}

const isAuthed = computed(() => !!token.value);
const effectiveRole = computed(() => authUser.value?.role || role.value || "");
const isAdmin = computed(() => effectiveRole.value === "admin");
const canSeePoints = computed(() =>
  ["admin", "volunteer"].includes(effectiveRole.value),
);
const canSeeRewards = computed(() =>
  ["admin", "volunteer"].includes(effectiveRole.value),
);
const userPoints = computed(() => Number(authUser.value?.points || 0));

async function loadMe() {
  syncAuthFromStorage();

  if (!token.value) {
    authUser.value = null;
    return;
  }

  try {
    authUser.value = await me();

    if (authUser.value?.role) {
      role.value = authUser.value.role;
      localStorage.setItem("role", authUser.value.role);
    }
  } catch (e) {
    authUser.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    syncAuthFromStorage();
  }
}

async function handleLogout() {
  await logout();
  authUser.value = null;
  syncAuthFromStorage();
  router.push("/login");
}

function roleLabel(value) {
  if (value === "admin") return "Администратор";
  if (value === "volunteer") return "Волонтёр";
  return "Пользователь";
}

onMounted(loadMe);

watch(
  () => route.fullPath,
  async () => {
    closeMobileMenu();
    await loadMe();
  },
);
</script>

<template>
  <div class="app-shell">
    <header class="header">
      <div class="container header-inner">
        <RouterLink to="/" class="brand">
          <img :src="logo" alt="Логотип" class="brand-icon-img" />

          <div class="brand-text">
            <div class="brand-title">Помощь животным</div>
            <div class="brand-subtitle">Платформа волонтёров</div>
          </div>
        </RouterLink>
        <button
          class="burger-btn"
          type="button"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav class="nav" :class="{ open: mobileMenuOpen }">
          <RouterLink to="/" class="nav-link" @click="closeMobileMenu"
            >Главная</RouterLink
          >
          <RouterLink to="/animals" class="nav-link" @click="closeMobileMenu"
            >Животные</RouterLink
          >
          <RouterLink to="/help" class="nav-link" @click="closeMobileMenu"
            >Помощь</RouterLink
          >
          <RouterLink
            v-if="canSeeRewards"
            to="/rewards"
            class="nav-link"
            @click="closeMobileMenu"
            >Награды</RouterLink
          >
          <RouterLink
            v-if="isAuthed"
            to="/profile"
            class="nav-link"
            @click="closeMobileMenu"
            >Профиль</RouterLink
          >
          <RouterLink
            v-if="isAuthed && isAdmin"
            to="/admin"
            class="nav-link"
            @click="closeMobileMenu"
            >Админка</RouterLink
          >
        </nav>

        <div class="nav-actions" :class="{ open: mobileMenuOpen }">
          <template v-if="isAuthed">
            <div v-if="authUser" class="user">
              <div class="user-info">
                <div class="user-name">{{ authUser.name }}</div>
                <div class="user-role" :data-role="authUser.role">
                  {{ roleLabel(authUser.role) }}
                </div>
              </div>
            </div>

            <div v-if="canSeePoints" class="points-badge">
              Баллы: {{ userPoints }}
            </div>

            <button class="btn btn-primary" @click="handleLogout">Выйти</button>
          </template>
        </div>
      </div>
    </header>

    <main class="page-content">
      <RouterView />
    </main>
    <AppPopups />
  </div>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-col">
        <div class="footer-brand">
          <img :src="footerLogo" alt="Помощь животным" class="footer-logo" />

          <div>
            <div class="footer-title">Помощь животным</div>
            <div class="footer-subtitle">Платформа волонтёров</div>
          </div>
        </div>

        <div class="footer-text">
          Мы помогаем приюту находить волонтёров, собирать пожертвования и
          быстрее пристраивать животных в хорошие руки.
        </div>

        <div class="footer-copy">© 2026 Помощь животным</div>
      </div>

      <div class="footer-col">
        <div class="footer-heading">Навигация</div>

        <RouterLink to="/" class="footer-link">Главная</RouterLink>
        <RouterLink to="/animals" class="footer-link">Животные</RouterLink>
        <RouterLink to="/help" class="footer-link">Помощь</RouterLink>
      </div>

      <div class="footer-col">
        <div class="footer-heading">Нас поддерживают</div>

        <div class="partners">
          <div class="partner">VetCare+</div>
          <div class="partner">ДоброМаркет</div>
          <div class="partner">PetFood Line</div>
          <div class="partner">Лапа Логистик</div>
          <div class="partner">Пушистый Мир</div>
          <div class="partner">Animal Print</div>
        </div>
      </div>

      <div class="footer-col">
        <div class="footer-heading">Контакты</div>

        <div class="footer-contact">📍 Москва</div>
        <div class="footer-contact">📞 +7 (999) 123-45-67</div>
        <div class="footer-contact">✉️ help@animals.ru</div>

        <div class="socials">
          <a
            href="https://vk.com/"
            class="social"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ВКонтакте"
          >
            <img src="/icons/vk.svg" alt="VK" class="social-icon" />
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f5f7fb;
}

.header {
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.container {
  width: min(1100px, calc(100% - 32px));
  margin: 0 auto;
}

.header-inner {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 10px 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #0f172a;
  min-width: 210px;
}

.brand-icon-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  object-position: left center;
  border-radius: 12px;
}

.brand-title {
  font-size: 17px;
  font-weight: 900;
  line-height: 1.05;
}

.brand-subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: #64748b;
}

.nav {
  display: flex;
  gap: 18px;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
}

.nav-link {
  position: relative;
  font-weight: 600;
  color: #334155;
  padding: 6px 2px;
  transition: 0.2s;
  text-decoration: none;
}

.nav-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -6px;
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, #f59e0b, #fb923c);
  border-radius: 2px;
  transition: 0.3s ease;
}

.nav-link:hover {
  color: #111827;
}

.nav-link:hover::after {
  width: 100%;
}

.nav-link.router-link-active {
  color: #111827;
}

.nav-link.router-link-active::after {
  width: 100%;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 20px;
  flex-shrink: 0;
}

.user {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.user-name {
  font-weight: 700;
  font-size: 14px;
  line-height: 1.2;
}

.user-role {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 700;
}

.user-role[data-role="admin"] {
  background: rgba(59, 130, 246, 0.15);
  color: #2563eb;
}

.user-role[data-role="volunteer"] {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.points-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  font-weight: 800;
  font-size: 14px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  white-space: nowrap;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 800;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: #f59e0b;
  color: #111827;
  border-radius: 14px;
  padding: 10px 20px;
  font-weight: 800;
  transition: 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  background: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(245, 158, 11, 0.3);
}

.page-content {
  padding-top: 22px;
}

@media (max-width: 980px) {
  .header-inner {
    flex-wrap: wrap;
  }

  .nav {
    order: 3;
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .nav-actions {
    margin-left: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}

.site-footer {
  margin-top: 50px;
  background: #0f172a;
  color: #e5e7eb;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.footer-inner {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  padding: 34px 0 40px;
}

@media (min-width: 900px) {
  .footer-inner {
    grid-template-columns: 1.4fr 0.8fr 1.2fr 1fr;
  }
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
}

.footer-title {
  font-weight: 900;
  color: #fff;
}

.footer-sub {
  font-size: 12px;
  color: #94a3b8;
}

.footer-text {
  margin-top: 10px;
  color: #94a3b8;
  line-height: 1.6;
  max-width: 320px;
}

.footer-copy {
  margin-top: 14px;
  font-size: 12px;
  color: #64748b;
}

.footer-heading {
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #f8fafc;
  margin-bottom: 6px;
}

.footer-link {
  text-decoration: none;
  color: #ffffff;
  font-weight: 600;
  transition: 0.2s;
}

.footer-link:hover {
  color: #f59e0b;
}

.partners {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.partner {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px;
  text-align: center;
  font-weight: 700;
  font-size: 13px;
  transition: 0.2s;
}

.partner:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.footer-contact {
  color: #ffffff;
  line-height: 1.6;
}

.socials {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.social {
  width: 46px;
  height: 46px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  text-decoration: none;
  transition: 0.2s ease;
}

.social:hover {
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-2px);
}

.social-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.footer-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
  display: block;
}

.footer-title {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
}

.footer-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

/* =========================
   RESPONSIVE HEADER
   ========================= */

.site-footer {
  margin-top: 60px;
  background: #000;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
@media (max-width: 980px) {
  .header-inner {
    min-height: auto;
    padding: 12px 0;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
  }

  .brand {
    min-width: 0;
  }

  .brand-title {
    font-size: 15px;
    white-space: nowrap;
  }

  .brand-sub {
    font-size: 11px;
  }

  .nav {
    grid-column: 1 / -1;
    order: 3;
    width: 100%;
    display: flex;
    gap: 10px;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding: 4px 0 8px;
    justify-content: flex-start;
  }

  .nav-link {
    flex: 0 0 auto;
    font-size: 14px;
    padding: 8px 2px;
  }

  .nav-actions {
    margin-left: 0;
    justify-content: flex-end;
    gap: 8px;
  }

  .user {
    padding: 5px 8px;
  }

  .user-name {
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .points-badge {
    min-height: 34px;
    padding: 7px 10px;
    font-size: 13px;
  }

  .nav-actions .btn-primary {
    min-height: 36px;
    padding: 8px 14px;
  }
}

@media (max-width: 640px) {
  .header-inner {
    grid-template-columns: 1fr;
  }

  .brand {
    justify-content: flex-start;
  }

  .nav-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .user-info {
    flex-direction: row;
    align-items: center;
  }

  .user-name {
    max-width: 150px;
  }

  .nav {
    padding-bottom: 6px;
  }
}

@media (max-width: 420px) {
  .brand-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }

  .brand-title {
    font-size: 14px;
  }

  .brand-sub {
    font-size: 10px;
  }

  .nav-link {
    font-size: 13px;
  }

  .points-badge {
    width: auto;
  }

  .nav-actions .btn-primary {
    width: auto;
  }
}

/* =========================
   RESPONSIVE FOOTER
   ========================= */

@media (max-width: 768px) {
  .site-footer {
    margin-top: 34px;
  }

  .footer-inner {
    padding: 28px 0 32px;
    gap: 22px;
  }

  .footer-text {
    max-width: none;
  }

  .partners {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 420px) {
  .partners {
    grid-template-columns: 1fr;
  }

  .socials {
    flex-wrap: wrap;
  }
}

@media (max-width: 390px) {
  .header-inner {
    gap: 10px;
    padding: 10px 0;
  }

  .brand {
    gap: 8px;
  }

  .brand-icon {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    font-size: 14px;
  }

  .brand-title {
    font-size: 13px;
    line-height: 1.1;
  }

  .brand-sub {
    font-size: 10px;
  }

  .nav {
    gap: 12px;
    padding: 4px 0 6px;
  }

  .nav-link {
    font-size: 13px;
    padding: 7px 0;
  }

  .nav-actions {
    gap: 7px;
  }

  .user {
    min-height: 36px;
    padding: 5px 8px;
    border-radius: 13px;
  }

  .user-name {
    max-width: 120px;
    font-size: 13px;
  }

  .role-chip {
    font-size: 10px;
    padding: 3px 7px;
  }

  .points-badge {
    min-height: 34px;
    padding: 7px 9px;
    font-size: 12px;
    border-radius: 13px;
  }

  .nav-actions .btn-primary {
    min-height: 34px;
    padding: 7px 12px;
    border-radius: 12px;
    font-size: 13px;
  }
}

.burger-btn {
  display: none;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
}

.burger-btn span {
  width: 20px;
  height: 2px;
  border-radius: 999px;
  background: #0f172a;
}

@media (max-width: 760px) {
  .header-inner {
    grid-template-columns: 1fr auto;
  }

  .burger-btn {
    display: inline-flex;
  }

  .nav,
  .nav-actions {
    display: none;
  }

  .nav.open {
    display: flex;
    grid-column: 1 / -1;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 12px 0;
    border-top: 1px solid rgba(148, 163, 184, 0.25);
  }

  .nav.open .nav-link {
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
  }

  .nav.open .nav-link::after {
    display: none;
  }

  .nav-actions {
    grid-column: 1 / -1;
  }

  .nav-actions.open {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
</style>
