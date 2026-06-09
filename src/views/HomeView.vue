<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getDonations } from "../services/donations";
import { getNews } from "../services/news";
import { getUsers, getTopVolunteers } from "../services/users";
import { getAnimals } from "../services/animals";
import { getTasks } from "../services/tasks";

const donations = ref([]);
const activeDonationIndex = ref(0);
const animalsTotal = ref(0);
const donation = computed(() => {
  return (
    donations.value[activeDonationIndex.value] || {
      id: null,
      goal: 0,
      raised: 0,
      text: "",
    }
  );
});
const news = ref([]);
const users = ref([]);
const publicTopVolunteers = ref([]);
const loading = ref(true);
const animals = ref([]);
const tasks = ref([]);

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

const newsPage = ref(1);
const newsPerPage = 4;

const aboutItems = [
  {
    title: "Кто мы",
    text: "Мы помогаем приюту находить волонтёров, собирать пожертвования и быстрее пристраивать животных.",
  },
  {
    title: "Что делаем",
    text: "Организуем помощь с кормом, лечением, перевозкой, фотосъёмкой и поиском дома для животных.",
  },
  {
    title: "Как помочь",
    text: "Можно помочь деньгами, откликнуться на задачи, оформить заявку на передержку или рассказать о приюте другим.",
  },
];

onMounted(loadHome);

async function loadHome() {
  loading.value = true;

  const [
    donationsResult,
    newsResult,
    topVolunteersResult,
    animalsResult,
    tasksResult,
   ] = await Promise.allSettled([
    getDonations({ page: 1, per_page: 5 }),
    getNews({ page: 1, per_page: 12 }),
    getTopVolunteers(),
    getAnimals({ page: 1, per_page: 30 }),
    getTasks({ status: "open", page: 1, per_page: 30 }),
  ]);

  if (donationsResult.status === "fulfilled") {
    donations.value = asList(donationsResult.value);
  } else {
    console.error(
      "Не удалось загрузить пожертвования:",
      donationsResult.reason,
    );
    donations.value = [];
  }
  activeDonationIndex.value = 0;

  if (newsResult.status === "fulfilled") {
  news.value = asList(newsResult.value)
    .slice()
    .sort(
      (a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0),
    );

  newsPage.value = 1;
} else {
    console.error("Не удалось загрузить новости:", newsResult.reason);
    news.value = [];
  }

  if (topVolunteersResult.status === "fulfilled") {
    publicTopVolunteers.value = asList(topVolunteersResult.value);
  } else {
    console.error(
      "Не удалось загрузить топ волонтёров:",
      topVolunteersResult.reason,
    );
    publicTopVolunteers.value = [];
  }

 if (animalsResult.status === "fulfilled") {
  const payload = animalsResult.value;

  animals.value = asList(payload);
  animalsTotal.value = Number(payload?.total ?? animals.value.length);
} else {
  console.error("Не удалось загрузить животных:", animalsResult.reason);
  animals.value = [];
  animalsTotal.value = 0;
}

  if (tasksResult.status === "fulfilled") {
    tasks.value = asList(tasksResult.value);
  } else {
    console.error("Не удалось загрузить задачи:", tasksResult.reason);
    tasks.value = [];
  }

  loading.value = false;
}

const progress = computed(() => {
  const goal = Number(donation.value.goal || 0);
  const raised = Number(donation.value.raised || 0);
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((raised / goal) * 100)));
});

function formatRub(n) {
  return Number(n || 0).toLocaleString("ru-RU") + " ₽";
}

const newsPages = computed(() => {
  return Math.max(1, Math.ceil(news.value.length / newsPerPage));
});

const paginatedNews = computed(() => {
  const start = (newsPage.value - 1) * newsPerPage;
  return news.value.slice(start, start + newsPerPage);
});

function nextDonation() {
  if (donations.value.length <= 1) return;
  activeDonationIndex.value =
    (activeDonationIndex.value + 1) % donations.value.length;
}

function prevDonation() {
  if (donations.value.length <= 1) return;
  activeDonationIndex.value =
    (activeDonationIndex.value - 1 + donations.value.length) %
    donations.value.length;
}

function formatNewsDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function newsPreview(text) {
  const s = String(text || "").trim();
  if (s.length <= 110) return s;
  return s.slice(0, 110).trim() + "...";
}
const animalsOnCare = computed(() => animalsTotal.value || animals.value.length)
const needVolunteers = computed(() =>
  tasks.value.filter(t => t.status === 'open').length
)

const urgentDonations = computed(
  () =>
    donations.value.filter((d) => {
      const goal = Number(d.goal || 0);
      const raised = Number(d.raised || 0);

      return goal > 0 && raised < goal;
    }).length,
);
const topVolunteers = computed(() => {
  const source = publicTopVolunteers.value.length
    ? publicTopVolunteers.value
    : users.value.filter((u) => u.role === "volunteer");

  return [...source]
    .map((u) => ({
      id: u.id,
      name: u.name,
      points: Number(u.points || 0),
      avatar: u.avatar || "",
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
});
</script>

<template>
  <div class="container">
    <div class="hero">
      <div>
        <h1 class="hero-title">Платформа волонтёров приюта</h1>
        <p class="hero-sub">
          Помогаем приюту быстрее находить волонтёров, собирать пожертвования и
          пристраивать животных в хорошие руки.
        </p>

        <div class="hero-actions">
          <RouterLink class="btn btn-primary hero-btn" to="/help">
            Помочь приюту
          </RouterLink>

          <RouterLink class="btn hero-btn ghost" to="/login"> Войти</RouterLink>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-num">{{ animalsOnCare }}</div>
            <div class="stat-label">на попечении</div>
          </div>
          <div class="stat">
            <div class="stat-num">{{ needVolunteers }}</div>
            <div class="stat-label">нужно волонтёров</div>
          </div>
          <div class="stat">
            <div class="stat-num">{{ urgentDonations }}</div>
            <div class="stat-label">активных сборов</div>
          </div>
        </div>
      </div>

      <div class="right">
        <div class="donation">
          <div class="don-slider-head">
            <button
              class="slider-btn"
              :disabled="donations.length <= 1"
              @click="prevDonation"
            >
              <span>‹</span>
            </button>

            <div class="don-top">
              <div class="don-title">Пожертвования</div>
              <div class="don-badge">
                {{ activeDonationIndex + 1 }} / {{ donations.length || 1 }}
              </div>
            </div>

            <button
              class="slider-btn"
              :disabled="donations.length <= 1"
              @click="nextDonation"
            >
              <span>›</span>
            </button>
          </div>

          <div class="don-text">
            {{ donation.text || "Сбор помощи приюту" }}
          </div>

          <div class="don-row">
            <div>
              <div class="muted">Собрано</div>
              <div class="money">{{ formatRub(donation.raised) }}</div>
            </div>

            <div class="don-right">
              <div class="muted">Цель</div>
              <div class="money">{{ formatRub(donation.goal) }}</div>
            </div>
          </div>

          <div class="bar">
            <div class="bar-fill" :style="{ width: progress + '%' }"></div>
          </div>

          <div class="don-footer">
            <div class="muted small">{{ progress }}% от цели</div>

            <div v-if="donations.length > 1" class="dots">
              <button
                v-for="(_, idx) in donations"
                :key="idx"
                class="dot"
                :class="{ active: activeDonationIndex === idx }"
                @click="activeDonationIndex = idx"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="block">
      <div class="block-top">
        <h2 class="h2">О нас</h2>
      </div>

      <div class="about-grid">
        <article
          v-for="item in aboutItems"
          :key="item.title"
          class="about-card"
        >
          <h3 class="about-title">{{ item.title }}</h3>
          <p class="about-text">{{ item.text }}</p>
        </article>
      </div>
    </section>

    <section class="block">
      <div class="block-top">
        <h2 class="h2">Новости</h2>
      </div>

      <div v-if="news.length === 0" class="card">
        <div class="muted">Пока нет новостей</div>
      </div>

      <div v-else class="news-grid">
        <RouterLink
          v-for="n in paginatedNews"
          :key="n.id"
          :to="`/news/${n.id}`"
          class="news-card-link"
        >
          <article class="news-card">
            <div class="news-image-wrap">
              <BaseImg
                v-if="n.image"
                :src="n.image"
                :alt="n.title"
                class="news-image"
              />
              <div v-else class="news-image news-image-fallback">НОВОСТЬ</div>
            </div>

            <div class="news-body">
              <div class="news-head">
                <div class="news-title">{{ n.title }}</div>
                <div class="news-date">
                  {{ formatNewsDate(n.published_at || n.date) }}
                </div>
              </div>

              <div class="news-text">
                {{ newsPreview(n.text) }}
              </div>

              <div class="news-open">Открыть новость →</div>
            </div>
          </article>
        </RouterLink>
      </div>

      <div v-if="news.length > newsPerPage" class="pagination">
        <button class="page-btn" :disabled="newsPage === 1" @click="newsPage--">
          ‹
        </button>

        <button
          v-for="num in newsPages"
          :key="num"
          class="page-btn"
          :class="{ active: newsPage === num }"
          @click="newsPage = num"
        >
          {{ num }}
        </button>

        <button
          class="page-btn"
          :disabled="newsPage === newsPages"
          @click="newsPage++"
        >
          ›
        </button>
      </div>
    </section>

    <section class="block">
      <div class="block-top">
        <h2 class="h2">Лучшие волонтёры</h2>
      </div>

      <div class="card">
        <div class="muted small">Топ-3 по очкам за подтверждённые задачи</div>

        <div class="top-list">
          <div v-for="(v, idx) in topVolunteers" :key="v.id" class="top-item">
            <div class="top-left">
              <div class="top-rank">{{ idx + 1 }}</div>
              <div>
                <div class="top-name">{{ v.name }}</div>
                <div class="muted small">
                  Очки: <b>{{ v.points }}</b>
                </div>
              </div>
            </div>
            <div class="badge ok">топ</div>
          </div>

          <div v-if="topVolunteers.length === 0" class="muted small">
            Пока нет волонтёров
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}
@media (min-width: 900px) {
  .hero {
    grid-template-columns: 1.15fr 0.85fr;
  }
}

.hero-title {
  font-size: 40px;
  margin: 0;
  line-height: 1.05;
}
.hero-sub {
  color: var(--muted);
  margin: 12px 0 0;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
}
.hero-btn {
  width: auto;
  padding: 10px 14px;
  border-radius: 12px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  text-decoration: none;
}
.ghost {
  background: #fff;
  border: 1px solid var(--border);
}

.stats {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.stat {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  box-shadow: var(--shadow);
  min-width: 150px;
}
.stat-num {
  font-weight: 900;
  font-size: 22px;
}
.stat-label {
  color: var(--muted);
  font-size: 13px;
  margin-top: 2px;
}

.right {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.donation {
  background: linear-gradient(
    135deg,
    rgba(245, 158, 11, 0.14),
    rgba(34, 197, 94, 0.1)
  );
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}
.don-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.don-title {
  font-weight: 900;
}
.don-badge {
  font-size: 12px;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
}
.don-text {
  margin-top: 8px;
  font-weight: 800;
}
.don-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}
.don-right {
  text-align: right;
}
.money {
  font-weight: 900;
  font-size: 18px;
}
.bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  overflow: hidden;
  margin-top: 10px;
}
.bar-fill {
  height: 100%;
  background: rgba(245, 158, 11, 0.9);
  width: 0%;
}

.block {
  margin-top: 22px;
}
.block-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.h2 {
  margin: 0;
  font-size: 24px;
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 900px) {
  .about-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
.about-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
}
.about-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 900;
}
.about-text {
  margin: 0;
  color: #334155;
  line-height: 1.5;
}

.more-link {
  font-weight: 800;
  text-decoration: none;
  color: #0f172a;
}

.news-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 900px) {
  .news-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.news-card-link {
  text-decoration: none;
  color: inherit;
}
.news-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  height: 100%;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.news-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.09);
}
.news-image-wrap {
  width: 100%;
  height: 190px;
  overflow: hidden;
  background: #eef2f7;
}
.news-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.news-image-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: #64748b;
}
.news-body {
  padding: 14px;
}
.news-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}
.news-title {
  font-weight: 900;
  font-size: 18px;
}
.news-date {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}
.news-text {
  margin-top: 10px;
  color: #111827;
  line-height: 1.5;
}
.news-open {
  margin-top: 12px;
  font-weight: 800;
  color: #d97706;
}

.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 14px;
}

.top-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.top-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.02);
}
.top-left {
  display: flex;
  gap: 10px;
  align-items: center;
}
.top-rank {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  border: 1px solid var(--border);
  background: #fff;
}
.top-name {
  font-weight: 900;
}

.muted {
  color: var(--muted);
}
.small {
  font-size: 12px;
}

.don-slider-head {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  gap: 10px;
  align-items: center;
}

.slider-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.85);
  color: #0f172a;
  font-size: 24px;
  font-weight: 900;
  line-height: 1;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  transition: 0.18s ease;
}

.slider-btn:hover:not(:disabled) {
  background: #fff;
  transform: translateY(-1px);
}

.slider-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.don-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.18);
  cursor: pointer;
  transition: 0.18s ease;
}

.dot.active {
  width: 20px;
  background: #f59e0b;
}

.slider-btn span {
  display: block;
  transform: translateY(-1px);
}

.all-news-btn {
  border: none;
  background: transparent;
  color: #0f172a;
  font-weight: 900;
  cursor: pointer;
  padding: 0;
  font-size: 15px;
}

.all-news-btn:hover {
  color: #d97706;
  text-decoration: underline;
}

.hero-btn {
  position: relative;
  overflow: hidden;
  transform: translateY(0);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.hero-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -120%;
  width: 80%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent,
    rgba(255, 255, 255, 0.45),
    transparent
  );
  transform: skewX(-20deg);
  transition: 0.45s ease;
}

.hero-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
  text-decoration: none;
}

.hero-btn:hover::before {
  left: 130%;
}

.hero-btn:active {
  transform: translateY(-1px) scale(0.98);
}

.hero-actions {
  animation: heroActionsIn 0.45s ease both;
}

@keyframes heroActionsIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =========================
   HOME RESPONSIVE
   ========================= */

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .hero-title {
    font-size: clamp(34px, 9vw, 48px);
  }

  .hero-sub {
    max-width: none;
  }

  .right {
    width: 100%;
  }

  .donation {
    width: 100%;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stat {
    min-width: 0;
  }

  .about-grid,
  .news-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .hero-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-btn {
    width: 100%;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .stat {
    width: 100%;
  }

  .don-slider-head {
    grid-template-columns: 34px 1fr 34px;
    gap: 8px;
  }

  .slider-btn {
    width: 34px;
    height: 34px;
  }

  .don-row {
    gap: 12px;
  }

  .money {
    font-size: 17px;
  }

  .news-card {
    overflow: hidden;
  }
}

@media (max-width: 390px) {
  .hero {
    padding-top: 24px;
    gap: 22px;
  }

  .hero-title {
    font-size: 34px;
    line-height: 1.08;
    letter-spacing: -0.03em;
  }

  .hero-sub {
    font-size: 15px;
    line-height: 1.55;
  }

  .hero-actions {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .hero-btn {
    width: 100%;
    min-height: 46px;
    border-radius: 14px;
  }

  .stats {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stat {
    padding: 14px;
    border-radius: 16px;
  }

  .stat-num {
    font-size: 24px;
  }

  .donation {
    padding: 16px;
    border-radius: 20px;
  }

  .don-slider-head {
    grid-template-columns: 34px 1fr 34px;
    gap: 8px;
  }

  .slider-btn {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    font-size: 22px;
  }

  .don-title {
    font-size: 15px;
  }

  .don-text {
    font-size: 14px;
    line-height: 1.4;
  }

  .don-row {
    margin-top: 14px;
  }

  .money {
    font-size: 18px;
  }

  .about-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .about-card {
    padding: 16px;
    border-radius: 18px;
  }

  .news-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .news-card {
    border-radius: 18px;
  }

  .news-image,
  .news-photo {
    height: 190px;
  }

  .section-title {
    font-size: 24px;
  }
}
</style>
