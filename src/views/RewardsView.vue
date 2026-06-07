<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { me } from '../auth'
import { api } from '../api'
import { createRewardOrder, getRewards } from '../services/rewards'
import { notify, askConfirm } from '../utils/notify'

const currentUser = ref(null)
const rewards = ref([])
const loading = ref(false)
const error = ref('')
const exchangeLoadingId = ref(null)
const category = ref('all')

const rewardPage = ref(1)
const rewardsPerPage = 6

const apiOrigin = new URL(api.defaults.baseURL).origin

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}


const canExchange = computed(() => currentUser.value?.role === 'volunteer')
const canSeeRewards = computed(() =>
  ['admin', 'volunteer'].includes(currentUser.value?.role || '')
)
const points = computed(() => Number(currentUser.value?.points || 0))

const categories = computed(() => {
  const values = asList(rewards.value)
    .map(r => r.category || 'other')
    .filter(Boolean)

  return ['all', ...new Set(values)]
})

const filteredRewards = computed(() => {
  const items = asList(rewards.value)
  if (category.value === 'all') return items
  return items.filter(r => (r.category || 'other') === category.value)
})

const rewardPages = computed(() => {
  return Math.max(1, Math.ceil(filteredRewards.value.length / rewardsPerPage))
})

const paginatedRewards = computed(() => {
  const start = (rewardPage.value - 1) * rewardsPerPage
  return filteredRewards.value.slice(start, start + rewardsPerPage)
})

watch(category, () => {
  rewardPage.value = 1
})

watch(filteredRewards, () => {
  if (rewardPage.value > rewardPages.value) {
    rewardPage.value = rewardPages.value
  }
})

function formatCategory(value) {
  const map = {
    certificates: 'Сертификаты',
    discounts: 'Скидки',
    merch: 'Мерч',
    gifts: 'Подарки',
    other: 'Другое',
  }

  return map[value] || value || 'Другое'
}

function getRewardImage(image) {
  const value = String(image || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `http:${value}`
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${apiOrigin}${normalized}`
}

function canBuy(reward) {
  return canExchange.value && reward.stock > 0 && points.value >= Number(reward.price_points || 0)
}

async function loadAll() {
  loading.value = true
  error.value = ''

  try {
    const [user, rewardsData] = await Promise.all([
      me(),
      getRewards(),
    ])

    currentUser.value = user
    rewards.value = asList(rewardsData)
  } catch (e) {
    console.error(e)
    error.value = e?.response?.data?.message || 'Не удалось загрузить награды'
  } finally {
    loading.value = false
  }
}

async function handleExchange(reward) {
  if (!canExchange.value) {
    notify('Обменивать баллы может только волонтёр', 'error')
    return
  }

  const confirmed = await askConfirm(
    `Обменять "${reward.title}" за ${reward.price_points} баллов?`
  )

  if (!confirmed) return

  exchangeLoadingId.value = reward.id

  try {
    await createRewardOrder(reward.id)
    await loadAll()

    notify('Заявка на награду отправлена', 'success')
  } catch (e) {
    console.error(e)

    notify(e?.response?.data?.message || 'Не удалось обменять баллы', 'error')
  } finally {
    exchangeLoadingId.value = null
  }
}

onMounted(loadAll)
</script>

<template>
  <section class="container rewards-page">
    <div v-if="loading" class="state-card">Загрузка наград...</div>
    <div v-else-if="error" class="state-card error">{{ error }}</div>

    <template v-else-if="canSeeRewards">
      <div class="hero">
        <div>
          <div class="eyebrow">Партнёрские награды</div>
          <h1 class="title">Магазин наград за баллы</h1>
          <p class="subtitle">
            Волонтёры могут обменивать накопленные баллы на подарки и предложения от партнёров.
          </p>
        </div>

        <div class="balance-card">
          <div class="balance-label">
            {{ canExchange ? 'Ваш баланс' : 'Баланс аккаунта' }}
          </div>
          <div class="balance-value">{{ points }}</div>
          <div class="balance-sub">баллов</div>
        </div>
      </div>

      <div class="toolbar">
        <div class="chips">
          <button
            v-for="item in categories"
            :key="item"
            class="chip"
            :class="{ active: category === item }"
            @click="category = item"
          >
            {{ item === 'all' ? 'Все' : formatCategory(item) }}
          </button>
        </div>
      </div>

      <div v-if="filteredRewards.length === 0" class="state-card">
        Пока наград нет.
      </div>

      <div v-else class="grid">
        <article v-for="reward in paginatedRewards" :key="reward.id" class="reward-card">
          <div class="reward-media">
            <img
              v-if="getRewardImage(reward.image)"
              :src="getRewardImage(reward.image)"
              :alt="reward.title"
              class="reward-image"
            />
            <div v-else class="reward-image reward-image-fallback">🎁</div>
          </div>

          <div class="reward-body">
            <div class="reward-top">
              <div>
                <div class="partner">{{ reward.partner_name || 'Партнёр' }}</div>
                <h2 class="reward-title">{{ reward.title }}</h2>
              </div>

              <span class="price-badge">{{ reward.price_points }} б.</span>
            </div>

            <div class="meta-row">
              <span class="category-badge">{{ formatCategory(reward.category) }}</span>
              <span class="stock" :class="{ danger: reward.stock <= 0 }">
                {{ reward.stock > 0 ? `Осталось: ${reward.stock}` : 'Нет в наличии' }}
              </span>
            </div>

            <p class="desc">
              {{ reward.description || 'Описание награды пока не добавлено.' }}
            </p>

            <button
              v-if="canExchange"
              class="action-btn"
              :class="canBuy(reward) ? 'action-btn-primary' : 'action-btn-disabled'"
              :disabled="!canBuy(reward) || exchangeLoadingId === reward.id"
              @click="handleExchange(reward)"
            >
              <span v-if="exchangeLoadingId === reward.id">Обмен...</span>
              <span v-else-if="reward.stock <= 0">Нет в наличии</span>
              <span v-else-if="points < Number(reward.price_points || 0)">Недостаточно баллов</span>
              <span v-else>Обменять</span>
            </button>

            <div v-else class="admin-note">
              Администратор может просматривать каталог, но не обменивает баллы.
            </div>
          </div>
        </article>
      </div>
      <div v-if="filteredRewards.length > rewardsPerPage" class="pagination">
  <button class="page-btn" :disabled="rewardPage === 1" @click="rewardPage--">
    ‹
  </button>

  <button
    v-for="num in rewardPages"
    :key="num"
    class="page-btn"
    :class="{ active: rewardPage === num }"
    @click="rewardPage = num"
  >
    {{ num }}
  </button>

  <button class="page-btn" :disabled="rewardPage === rewardPages" @click="rewardPage++">
    ›
  </button>
</div>
    </template>
  </section>
</template>

<style scoped>
.rewards-page{
  padding-top:28px;
  padding-bottom:36px;
}

.hero{
  display:flex;
  justify-content:space-between;
  gap:20px;
  align-items:stretch;
  flex-wrap:wrap;
  margin-bottom:20px;
}

.eyebrow{
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:#d97706;
}

.title{
  margin:8px 0 0;
  font-size:clamp(30px, 4vw, 42px);
  line-height:1.05;
}

.subtitle{
  margin:10px 0 0;
  max-width:740px;
  color:#64748b;
  line-height:1.6;
}

.balance-card{
  min-width:220px;
  padding:18px 20px;
  border-radius:24px;
  background:linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  color:#111827;
  box-shadow:0 16px 32px rgba(245, 158, 11, 0.22);
}

.balance-label{
  font-size:13px;
  font-weight:800;
  opacity:.85;
}

.balance-value{
  margin-top:8px;
  font-size:42px;
  font-weight:900;
  line-height:1;
}

.balance-sub{
  margin-top:6px;
  font-size:14px;
  font-weight:700;
}

.toolbar{
  margin-bottom:18px;
}

.chips{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.chip{
  border:none;
  padding:10px 14px;
  border-radius:999px;
  background:#fff;
  border:1px solid #e2e8f0;
  color:#0f172a;
  font-weight:800;
  cursor:pointer;
  transition:.18s ease;
}

.chip.active{
  background:#f59e0b;
  border-color:#f59e0b;
}

.grid{
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:18px;
}

.reward-card{
  overflow:hidden;
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:24px;
  box-shadow:0 10px 30px rgba(15, 23, 42, 0.06);
  transition:transform .22s ease, box-shadow .22s ease;
}

.reward-card:hover{
  transform:translateY(-4px);
  box-shadow:0 18px 36px rgba(15, 23, 42, 0.11);
}

.reward-media{
  overflow:hidden;
}

.reward-image{
  width:100%;
  height:220px;
  display:block;
  object-fit:cover;
  background:linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.04));
}

.reward-image-fallback{
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:60px;
}

.reward-body{
  padding:16px;
}

.reward-top{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:flex-start;
}

.partner{
  font-size:13px;
  font-weight:800;
  color:#d97706;
}

.reward-title{
  margin:6px 0 0;
  font-size:22px;
  line-height:1.15;
}

.price-badge{
  white-space:nowrap;
  padding:8px 10px;
  border-radius:999px;
  background:rgba(245, 158, 11, 0.12);
  color:#b45309;
  font-size:13px;
  font-weight:900;
}

.meta-row{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:14px;
}

.category-badge,
.stock{
  padding:7px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
  background:#f8fafc;
  color:#475569;
  border:1px solid #e2e8f0;
}

.stock.danger{
  background:#fff1f2;
  color:#b91c1c;
  border-color:rgba(239,68,68,.2);
}

.desc{
  margin:14px 0 0;
  color:#0f172a;
  line-height:1.6;
  min-height:72px;
}

.action-btn{
  width:100%;
  min-height:46px;
  margin-top:18px;
  border:none;
  border-radius:14px;
  padding:10px 14px;
  font-size:14px;
  font-weight:800;
  cursor:pointer;
  transition:.18s ease;
}

.action-btn-primary{
  background:linear-gradient(135deg, #f59e0b 0%, #f7b733 100%);
  color:#111827;
  box-shadow:0 8px 18px rgba(245, 158, 11, 0.22);
}

.action-btn-primary:hover{
  transform:translateY(-2px);
}

.action-btn-disabled{
  background:#e5e7eb;
  color:#6b7280;
  cursor:not-allowed;
}

.admin-note{
  margin-top:18px;
  font-size:13px;
  color:#64748b;
  line-height:1.5;
}

.state-card{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:18px;
  padding:16px;
  box-shadow:0 10px 30px rgba(15, 23, 42, 0.06);
}

.state-card.error{
  color:#b91c1c;
  border-color:rgba(185, 28, 28, 0.2);
  background:rgba(254, 242, 242, 0.9);
}

@media (max-width: 1024px){
  .grid{
    grid-template-columns:repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px){
  .grid{
    grid-template-columns:1fr;
  }

  .balance-card{
    width:100%;
  }
}

@media (max-width: 390px){
  .page,
  .rewards-page{
    padding-top:22px;
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

  .rewards-grid,
  .grid,
  .cards{
    grid-template-columns:1fr;
    gap:12px;
  }

  .reward-card{
    border-radius:20px;
  }

  .reward-image,
  .reward-photo{
    height:200px;
  }

  .reward-body{
    padding:14px;
  }

  .reward-actions{
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
  }

  .reward-actions .btn{
    width:100%;
  }
}

/* Единое отображение фотографий наград */
.reward-media{
  width:100%;
  height:220px;
  overflow:hidden;
  background:linear-gradient(180deg, rgba(245,158,11,.08), rgba(15,23,42,.04));
}

.reward-image{
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:center;
  display:block;
}

.reward-image-fallback{
  width:100%;
  height:100%;
}

@media (max-width: 680px){
  .reward-media{
    height:230px;
  }
}

@media (max-width: 390px){
  .reward-media{
    height:200px;
  }
}


.pagination{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  margin-top:24px;
  width:100%;
}

.page-btn{
  width:46px;
  height:46px;
  border:none;
  border-radius:14px;
  background:#fff;
  color:#0f172a;
  font-weight:900;
  box-shadow:0 8px 22px rgba(15,23,42,.08);
  cursor:pointer;
}

.page-btn.active{
  background:#f59e0b;
  color:#111827;
}

.page-btn:disabled{
  opacity:.45;
  cursor:not-allowed;
}

@media (max-width: 390px){
  .pagination{
    gap:7px;
    margin-top:18px;
  }

  .page-btn{
    width:40px;
    height:40px;
    border-radius:12px;
  }
}
</style>