<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { getAnimals } from '../services/animals'
import { api } from '../api'

const filter = ref('all')
const animals = ref([])
const loading = ref(false)
const error = ref('')

const page = ref(1)
const perPage = 9
const totalPages = ref(1)

const apiOrigin = new URL(api.defaults.baseURL).origin

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

const pageTitle = computed(() => {
  if (filter.value === 'adopted') return 'Архив пристроенных животных'
  if (filter.value === 'looking_home') return 'Животные ищут дом'
  if (filter.value === 'treatment') return 'Животные на лечении'
  return 'Найди друга и открой его карточку'
})

const pageSubtitle = computed(() => {
  if (filter.value === 'adopted') {
    return 'Здесь находятся животные, которые уже нашли семью. Они скрыты из обычного списка питомцев.'
  }

  return 'На этой странице собраны животные приюта: те, кто ищет дом или проходит лечение. Открой карточку питомца, чтобы узнать подробности и при желании подать заявку.'
})

const paginatedAnimals = computed(() => animals.value)

watch(filter, () => {
  loadAnimals(1)
})

function statusText(status) {
  if (status === 'looking_home') return 'ищет дом'
  if (status === 'treatment') return 'на лечении'
  if (status === 'adopted') return 'пристроен'
  return status || 'без статуса'
}

function getAnimalImage(photo) {
  const value = String(photo || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `http:${value}`
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${apiOrigin}${normalized}`
}

async function loadAnimals(targetPage = 1) {
  loading.value = true
  error.value = ''

  try {
    const params = {
      page: targetPage,
      per_page: perPage,
    }

    if (filter.value !== 'all') {
      params.status = filter.value
    }

    const response = await getAnimals(params)

    animals.value = asList(response)
    page.value = response.current_page || targetPage
    totalPages.value = response.last_page || 1
  } catch (e) {
    console.error(e)
    error.value = 'Не удалось загрузить животных'
  } finally {
    loading.value = false
  }
}

function goToPage(num) {
  if (num < 1 || num > totalPages.value) return
  loadAnimals(num)
}

onMounted(() => loadAnimals(1))
</script>

<template>
  <section class="container animals-page">
    <div class="hero">
      <div>
        <div class="eyebrow">Питомцы приюта</div>
        <h1 class="title">{{ pageTitle }}</h1><p class="subtitle">{{ pageSubtitle }}</p>

      </div>

      <label class="filter-box">
        <span class="filter-label">Фильтр</span>
        <select class="input" v-model="filter">
          <option value="all">Все</option>
          <option value="looking_home">Ищут дом</option>
          <option value="treatment">На лечении</option>
          <option value="adopted">Пристроены</option>
        </select>
      </label>
    </div>

    <div v-if="loading" class="state-card">Загрузка животных...</div>
    <div v-else-if="error" class="state-card error">{{ error }}</div>

    <div v-else class="grid">
      <article  v-for="a in paginatedAnimals" :key="a.id" class="card">
        <RouterLink :to="`/animals/${a.id}`" class="media-link">
          <BaseImg
            v-if="getAnimalImage(a.photo)"
            :src="getAnimalImage(a.photo)"
            :alt="a.name"
            class="photo"
          />
          <div v-else class="photo photo-fallback">🐾</div>
        </RouterLink>

        <div class="card-body">
          <div class="card-top">
            <div>
              <h2 class="name">{{ a.name }}</h2>
              <div class="meta">{{ a.species }} • {{ a.age }} • {{ a.city }}</div>
            </div>

            <span
              class="badge"
              :class="{
                info: a.status === 'looking_home',
                warn: a.status === 'treatment',
                ok: a.status === 'adopted',
              }"
            >
              {{ statusText(a.status) }}
            </span>
          </div>

          <p class="desc">
            {{ a.description || 'Описание для этого животного пока не добавлено.' }}
          </p>

          <div class="actions">
  <RouterLink class="action-btn action-btn-primary" :to="`/animals/${a.id}`">
    Смотреть карточку
  </RouterLink>

  <RouterLink
  v-if="a.status !== 'adopted'"
  class="action-btn action-btn-secondary"
  :to="`/help?tab=forms&animal=${encodeURIComponent(a.name)}`"
>
  Подать заявку
</RouterLink>

<span v-else class="action-btn action-btn-disabled">
  Уже пристроен
</span>
</div>
        </div>
      </article>
    </div>

    <div v-if="totalPages > 1" class="pagination">
  <button class="page-btn" :disabled="page === 1" @click="goToPage(page - 1)">
    ‹
  </button>

  <button
    v-for="num in totalPages"
    :key="num"
    class="page-btn"
    :class="{ active: page === num }"
    @click="goToPage(num)"
  >
    {{ num }}
  </button>

  <button class="page-btn" :disabled="page === totalPages" @click="goToPage(page + 1)">
    ›
  </button>
</div>
  </section>
</template>

<style scoped>
.animals-page {
  padding-top: 28px;
  padding-bottom: 36px;
}

.hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.eyebrow {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary-dark);
}

.title {
  margin: 8px 0 0;
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1.05;
}

.subtitle {
  max-width: 760px;
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.filter-box {
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--muted);
}

.state-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.state-card.error {
  color: #b91c1c;
  border-color: rgba(185, 28, 28, 0.2);
  background: rgba(254, 242, 242, 0.9);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.card {
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: var(--shadow);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  border-color: rgba(245, 158, 11, 0.18);
}

.media-link {
  display: block;
  text-decoration: none;
  overflow: hidden;
}

.photo {
  width: 100%;
  height: 230px;
  object-fit: cover;
  display: block;
  object-position: center center;
  border-radius: 24px 24px 0 0;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.04));
  transition: transform 0.35s ease;
}

.photo-fallback {
  border-radius: 18px;
}

.card:hover .photo {
  transform: scale(1.04);
}

.photo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
}

.card-body {
  padding: 16px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.name {
  margin: 0;
  font-size: 24px;
  line-height: 1.05;
}

.meta {
  margin-top: 8px;
  color: var(--muted);
  font-size: 14px;
}

.desc {
  margin: 14px 0 0;
  color: #0f172a;
  line-height: 1.6;
  min-height: 72px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.action-btn {
  position: relative;
  overflow: hidden;
  flex: 1;
  min-height: 46px;
  padding: 10px 14px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.action-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -140%;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255, 255, 255, 0.12) 45%,
    rgba(255, 255, 255, 0.28) 50%,
    transparent 55%
  );
  transition: left 0.5s ease;
}

.action-btn:hover::before {
  left: 150%;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn:active {
  transform: translateY(0) scale(0.985);
}

.action-btn-primary {
  background: linear-gradient(135deg, #f59e0b 0%, #f7b733 100%);
  color: #111827;
  box-shadow: 0 8px 18px rgba(245, 158, 11, 0.22);
}

.action-btn-primary:hover {
  box-shadow: 0 12px 22px rgba(245, 158, 11, 0.28);
}

.action-btn-secondary {
  background: #fff;
  color: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
}

.action-btn-secondary:hover {
  background: #fffaf2;
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.badge.info {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.badge.warn {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.badge.ok {
  background: rgba(34, 197, 94, 0.16);
  color: #15803d;
}

.ghost {
  background: #fff;
  border: 1px solid var(--border);
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}

/* =========================
   ANIMALS RESPONSIVE
   ========================= */

@media (max-width: 900px){
  .page-head,
  .animals-head,
  .top{
    grid-template-columns:1fr;
    gap:16px;
  }

  .animals-grid,
  .cards,
  .grid{
    grid-template-columns:1fr 1fr;
  }
}

@media (max-width: 620px){
  .animals-grid,
  .cards,
  .grid{
    grid-template-columns:1fr;
  }

  .title,
  .page-title{
    font-size:clamp(32px, 9vw, 44px);
  }

  .animal-card{
    border-radius:20px;
  }

  .animal-photo,
  .card-photo{
    height:220px;
  }

  .actions{
    display:grid;
    grid-template-columns:1fr;
  }

  .actions .btn,
  .actions a{
    width:100%;
  }
}

@media (max-width: 390px){
  .page,
  .animals-page{
    padding-top:22px;
  }

  .eyebrow{
    font-size:11px;
  }

  .title,
  .page-title{
    font-size:34px;
    line-height:1.08;
  }

  .subtitle,
  .page-subtitle{
    font-size:15px;
    line-height:1.6;
  }

  .animals-grid,
  .cards,
  .grid{
    grid-template-columns:1fr;
    gap:12px;
  }

  .animal-card{
    border-radius:20px;
  }

  .animal-photo,
  .card-photo{
    height:210px;
  }

  .animal-body,
  .card-body{
    padding:14px;
  }

  .animal-actions,
  .actions{
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
  }

  .animal-actions .btn,
  .actions .btn,
  .animal-actions a,
  .actions a{
    width:100%;
  }
}

/* Единое отображение фотографий животных */
.animal-media{
  width:100%;
  height:230px;
  overflow:hidden;
  border-radius:22px 22px 0 0;
  background:linear-gradient(180deg, rgba(245,158,11,.08), rgba(15,23,42,.04));
}

.animal-image{
  width:100% !important;
  height:100% !important;
  object-fit:cover !important;
  object-position:center top !important;
  display:block !important;
}

.animal-image-fallback{
  width:100%;
  height:100%;
}

.action-btn-disabled {
  background: #e5e7eb;
  color: #6b7280;
  border: 1px solid #d1d5db;
  cursor: not-allowed;
  box-shadow: none;
}

.action-btn-disabled:hover {
  transform: none;
  box-shadow: none;
}

@media (max-width: 680px){
  .animal-media{
    height:240px;
  }
}

@media (max-width: 390px){
  .animal-media{
    height:220px;
  }
}

@media (max-width: 680px) {
  .animals-page {
    padding-left: 12px;
    padding-right: 12px;
  }

  .hero {
    align-items: stretch;
  }

  .filter-box {
    width: 100%;
    min-width: 0;
  }

  .photo {
    height: 220px;
    border-radius: 22px 22px 0 0;
  }

  .card-body {
    padding: 14px;
  }

  .card-top {
    align-items: flex-start;
  }
}

@media (max-width: 420px) {
  .photo {
    height: 200px;
  }

  .name {
    font-size: 22px;
  }

  .badge {
    font-size: 11px;
    padding: 6px 8px;
  }
}
</style>