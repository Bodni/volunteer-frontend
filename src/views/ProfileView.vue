<script setup>
import { computed, ref, onMounted } from 'vue'
import { me as getMe } from '../auth'
import { getTasks, updateTask } from '../services/tasks'
import { updateUserAvatar } from '../services/users'
import { getRewardOrders } from '../services/rewards'
import { api } from '../api'
import { notify, askConfirm } from '../utils/notify'

const me = ref({
  id: null,
  name: 'Волонтёр',
  points: 0,
  avatar: '',
  role: 'volunteer',
})

const tasks = ref([])
const avatarName = ref('')
const rewardOrders = ref([])

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

async function loadProfile() {
  try {
    const meData = await getMe()
    me.value = meData || me.value

    const tasksData = await getTasks({
      assigned_to: me.value.id,
      page: 1,
      per_page: 100,
    })

    tasks.value = asList(tasksData)
  } catch (e) {
    console.error('Не удалось загрузить профиль', e)
    tasks.value = []
  }
}

const volunteerRow = computed(() => ({
  id: me.value.id,
  name: me.value.name,
  status: me.value.volunteer_status || 'free',
}))

const inProgress = computed(() =>
  tasks.value.filter(t => t.assigned_to === me.value.id && t.status === 'in_progress')
)

const pending = computed(() =>
  tasks.value.filter(t => t.assigned_to === me.value.id && t.status === 'done_pending')
)

const done = computed(() =>
  tasks.value.filter(t => t.assigned_to === me.value.id && t.status === 'done')
)

async function submitForReview(taskId) {
  const t = tasks.value.find(x => x.id === taskId)
  if (!t) return
  if (t.assigned_to !== me.value.id) return
  if (t.status !== 'in_progress') return

  try {
    await updateTask(taskId, {
      status: 'done_pending',
      assigned_to: me.value.id,
      points: Number(t.points || 10),
    })

    await loadProfile()
    notify('Отправлено администратору на проверку ✅')
  } catch (e) {
    console.error(e)
    notify('Не удалось отправить задачу на проверку')
  }
}

// ---------------- AVATAR ----------------
async function onAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return

  const max = 1.8 * 1024 * 1024

  if (file.size > max) {
    notify('Файл слишком большой. Максимум 1.8MB', 'error')
    e.target.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    notify('Нужна картинка jpg/png/webp', 'error')
    e.target.value = ''
    return
  }

  try {
    const data = await updateUserAvatar(me.value.id, file)

    if (data?.avatar) {
      me.value.avatar = data.avatar
    } else {
      await loadProfile()
    }

    avatarName.value = file.name
    notify('Фото обновлено', 'success')
  } catch (err) {
    console.error(err)
    notify(err?.response?.data?.message || 'Не удалось обновить фото', 'error')
  } finally {
    e.target.value = ''
  }
}

async function removeAvatar() {
  try {
    await updateUserAvatar(me.value.id, '')
    me.value.avatar = ''
    avatarName.value = ''
  } catch (e) {
    console.error(e)
    notify('Не удалось удалить фото')
  }
}

// ---------------- ACHIEVEMENTS ----------------
const doneCount = computed(() => done.value.length)

const achievements = [
  { key: 'a1', title: 'Новичок', need: 1, icon: '' },
  { key: 'a5', title: 'Помощник', need: 5, icon: '' },
  { key: 'a10', title: 'Игрок', need: 10, icon: '' },
  { key: 'a20', title: 'Легенда', need: 20, icon: '' },
]

const achieved = computed(() => achievements.filter(a => doneCount.value >= a.need))
const nextAch = computed(() => achievements.find(a => doneCount.value < a.need) || null)

const progressPct = computed(() => {
  if (!nextAch.value) return 100
  const prevNeed = achieved.value.length ? achieved.value[achieved.value.length - 1].need : 0
  const span = nextAch.value.need - prevNeed
  const cur = doneCount.value - prevNeed
  return Math.max(0, Math.min(100, Math.round((cur / span) * 100)))
})

async function loadRewardOrders() {
  try {
    const data = await getRewardOrders({ page: 1, per_page: 20 })
    rewardOrders.value = asList(data)
  } catch (e) {
    console.error('Не удалось загрузить обмены наград:', e)
    rewardOrders.value = []
  }
}

function orderStatusText(status) {
  if (status === 'new') return 'Новая'
  if (status === 'pending') return 'На рассмотрении'
  if (status === 'approved') return 'Одобрена'
  if (status === 'rejected') return 'Отклонена'
  if (status === 'completed') return 'Выдана'
  return status || 'Новая'
}

function orderStatusClass(status) {
  if (status === 'approved' || status === 'completed') return 'ok'
  if (status === 'rejected') return 'bad'
  return 'warn'
}

const apiOrigin = new URL(api.defaults.baseURL).origin

function getImageUrl(path) {
  const value = String(path || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `http:${value}`
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${apiOrigin}${normalized}`
}
onMounted(() => {
  loadProfile()
  loadRewardOrders()
})
</script>

<template>
  <div class="container">
    <div class="top">
      <div>
        <h1 class="h1">Профиль</h1>
        <div class="muted">Очки, достижения и ваши задачи</div>
      </div>

      <div class="pill">
        <div class="row">
          <div class="ava">
            <img v-if="getImageUrl(me.avatar)" :src="getImageUrl(me.avatar)" alt="avatar" />
            <div v-else class="ava-ph"></div>
          </div>

          <div>
            <div class="strong">{{ me.name }}</div>
            <div class="muted small">
              {{ me.role }} • статус: <b>{{ volunteerRow.status }}</b>
            </div>
            <div class="points">
               Очки: <b>{{ me.points || 0 }}</b>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AVATAR -->
    <div class="card">
      <div class="card-title">Фото профиля</div>

      <label class="label">
        Загрузить
        <input class="input" type="file" accept="image/*" @change="onAvatarChange" />
      </label>

      <div class="muted small" style="margin-top:6px;">
        {{ avatarName ? `Файл: ${avatarName}` : (me.avatar ? 'Фото загружено' : 'Фото не загружено') }}
      </div>

      <button v-if="me.avatar" class="btn ghost" style="width:auto; margin-top:10px;" @click="removeAvatar">
        Удалить фото
      </button>
    </div>

    <!-- ACHIEVEMENTS -->
    <div class="card">
      <div class="card-title">Достижения</div>

      <div class="ach-grid">
        <div
          v-for="a in achievements"
          :key="a.key"
          class="ach"
          :class="{ on: doneCount >= a.need }"
        >
          <div class="ach-ic">{{ a.icon }}</div>
          <div class="ach-t">
            <div class="strong">{{ a.title }}</div>
            <div class="muted small">{{ a.need }} задач</div>
          </div>
        </div>
      </div>

      <div class="bar" style="margin-top:10px;">
        <div class="bar-fill" :style="{ width: progressPct + '%' }"></div>
      </div>

      <div class="muted small" style="margin-top:6px;">
        Выполнено: <b>{{ doneCount }}</b>
        <span v-if="nextAch"> • до следующего: <b>{{ nextAch.need - doneCount }}</b></span>
        <span v-else> • все достижения получены </span>
      </div>
    </div>

    <div class="card">
  <div class="card-title">Мои обмены</div>

  <div v-if="rewardOrders.length === 0" class="empty">
    Пока нет обменов. Выберите награду на странице “Награды”.
  </div>

  <div v-else class="reward-orders-list">
    <div
      v-for="order in rewardOrders"
      :key="order.id"
      class="reward-order-item"
    >
      <div class="reward-order-image">
        <img
          v-if="getImageUrl(order.reward?.image)"
          :src="getImageUrl(order.reward?.image)"
          :alt="order.reward?.title || 'Награда'"
        />

        <div v-else class="reward-order-placeholder">
          🎁
        </div>
      </div>

      <div class="reward-order-body">
        <div class="reward-order-top">
          <div>
            <div class="strong">
              {{ order.reward?.title || 'Награда' }}
            </div>

            <div class="muted small">
              {{ order.reward?.partner_name || 'Партнёр' }}
            </div>
          </div>

          <span class="badge" :class="orderStatusClass(order.status)">
            {{ orderStatusText(order.status) }}
          </span>
        </div>

        <div class="muted small reward-order-desc">
          {{ order.reward?.description || 'Описание награды отсутствует.' }}
        </div>

        <div class="reward-order-meta">
          <span>
            Цена:
            <b>{{ order.reward?.price_points || 0 }}</b>
            баллов
          </span>

          <span v-if="order.created_at">
            Дата: {{ new Date(order.created_at).toLocaleDateString('ru-RU') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</div>

    <!-- TASKS -->
    <div class="grid">
      <div class="card">
        <div class="card-title">В работе</div>

        <div v-if="inProgress.length === 0" class="empty">
          Пока нет задач в работе. Возьмите задачу на странице “Помочь”.
        </div>

        <div v-else class="list">
          <div v-for="t in inProgress" :key="t.id" class="item">
            <div class="item-top">
              <div class="strong">{{ t.title }}</div>
              <span class="badge warn">в работе</span>
            </div>
            <div class="muted small">{{ t.description }}</div>

            <div class="actions">
              <button class="btn btn-primary mini" @click="submitForReview(t.id)">
                Отправить на проверку
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">На проверке</div>

        <div v-if="pending.length === 0" class="empty">
          Нет задач на проверке.
        </div>

        <div v-else class="list">
          <div v-for="t in pending" :key="t.id" class="item">
            <div class="item-top">
              <div class="strong">{{ t.title }}</div>
              <span class="badge warn">на проверке</span>
            </div>
            <div class="muted small">{{ t.description }}</div>
            <div class="muted small" style="margin-top:6px;">
              Очки за задачу: <b>{{ t.points || 10 }}</b>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Подтверждено (выполнено)</div>

        <div v-if="done.length === 0" class="empty">
          Пока нет подтверждённых выполненных задач.
        </div>

        <div v-else class="list">
          <div v-for="t in done" :key="t.id" class="item">
            <div class="item-top">
              <div class="strong">{{ t.title }}</div>
              <span class="badge ok">выполнено</span>
            </div>
            <div class="muted small">{{ t.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.h1{margin:0;font-size:28px;}
.muted{color:var(--muted);}
.small{font-size:12px;}
.strong{font-weight:900;}

.pill{
  background:#fff;border:1px solid var(--border);border-radius:16px;padding:12px;
  box-shadow:var(--shadow);min-width:260px;
}
.row{display:flex;gap:12px;align-items:center;}
.points{margin-top:6px;}

.ava{width:54px;height:54px;border-radius:16px;overflow:hidden;border:1px solid var(--border);background:rgba(15,23,42,.03);display:flex;align-items:center;justify-content:center;}
.ava img{width:100%;height:100%;object-fit:cover;}
.ava-ph{font-size:22px;color:var(--muted);}

.grid{display:grid;grid-template-columns:1fr;gap:12px;}
@media (min-width: 900px){.grid{grid-template-columns:1fr 1fr;}}

.card{background:#fff;border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:14px;}
.card-title{font-weight:900;margin-bottom:10px;}

.empty{border:1px dashed var(--border);border-radius:14px;padding:12px;color:var(--muted);background:rgba(15,23,42,.02);}
.list{display:flex;flex-direction:column;gap:10px;}
.item{border:1px solid var(--border);border-radius:14px;padding:12px;background:rgba(15,23,42,.02);}
.item-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;}

.badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:900;}
.warn{background:rgba(245,158,11,.18);}
.ok{background:rgba(34,197,94,.16);}

.actions{margin-top:10px;display:flex;justify-content:flex-end;}
.mini{width:auto;padding:8px 12px;border-radius:12px;}

.ach-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media (min-width: 900px){.ach-grid{grid-template-columns:1fr 1fr 1fr 1fr;}}
.ach{border:1px solid var(--border);border-radius:14px;padding:10px;display:flex;gap:10px;align-items:center;background:rgba(15,23,42,.02);opacity:.65;}
.ach.on{opacity:1;border-color:rgba(34,197,94,.45);box-shadow:0 0 0 4px rgba(34,197,94,.10);}
.ach-ic{font-size:22px;}
.bar{height:10px;border-radius:999px;border:1px solid var(--border);background:rgba(15,23,42,.03);overflow:hidden;}
.bar-fill{height:100%;background:rgba(245,158,11,.65);}

.note{margin-top:12px;color:var(--muted);font-size:12px;}
@media (max-width: 900px){
  .profile-grid,
  .grid{
    grid-template-columns:1fr;
  }

  .profile-card,
  .card{
    width:100%;
  }
}

@media (max-width: 390px){
  .profile-page,
  .page{
    padding-top:20px;
    padding-bottom:28px;
  }

  .profile-card,
  .card{
    padding:16px;
    border-radius:20px;
  }

  .profile-head,
  .profile-header{
    flex-direction:column;
    align-items:flex-start;
    gap:14px;
  }

  .avatar,
  .profile-avatar{
    width:76px;
    height:76px;
    border-radius:22px;
  }

  .profile-name,
  .h1,
  .title{
    font-size:28px;
    line-height:1.1;
  }

  .profile-info,
  .info-list{
    gap:10px;
  }

  .info-row,
  .profile-row{
    flex-direction:column;
    align-items:flex-start;
    gap:4px;
  }

  .actions,
  .profile-actions{
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
  }

  .actions .btn,
  .profile-actions .btn{
    width:100%;
  }

  .input{
    min-height:42px;
  }
}

.reward-orders-list{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.reward-order-item{
  display:grid;
  grid-template-columns:120px minmax(0, 1fr);
  gap:14px;
  padding:12px;
  border:1px solid var(--border);
  border-radius:16px;
  background:rgba(15,23,42,.02);
}

.reward-order-image{
  width:120px;
  height:96px;
  border-radius:14px;
  overflow:hidden;
  background:#f8fafc;
  border:1px solid var(--border);
}

.reward-order-image img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

.reward-order-placeholder{
  width:100%;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:34px;
}

.reward-order-body{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:8px;
}

.reward-order-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
}

.reward-order-desc{
  line-height:1.5;
}

.reward-order-meta{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  color:var(--muted);
  font-size:12px;
}

.bad{
  background:rgba(239,68,68,.14);
  color:#b91c1c;
}

@media (max-width: 560px){
  .reward-order-item{
    grid-template-columns:1fr;
  }

  .reward-order-image{
    width:100%;
    height:180px;
  }

  .reward-order-top{
    flex-direction:column;
  }
}
</style>
