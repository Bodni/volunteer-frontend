<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { me } from '../auth'
import { getTask, updateTask } from '../services/tasks'

const route = useRoute()

const task = ref(null)
const currentUser = ref(null)
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const localToast = ref({
  show: false,
  message: '',
  type: 'success',
})

function showToast(message, type = 'success') {
  localToast.value = {
    show: true,
    message,
    type,
  }

  setTimeout(() => {
    localToast.value.show = false
  }, 3000)
}

const apiOrigin = new URL(api.defaults.baseURL).origin

const photoUrl = computed(() => {
  const value = String(task.value?.photo || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `http:${value}`
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${apiOrigin}${normalized}`
})

const canTakeTask = computed(() => {
  return task.value?.status === 'open'
})

const canMarkDone = computed(() => {
  return task.value?.status === 'in_progress'
})

function statusText(status) {
  if (status === 'open') return 'Открыта'
  if (status === 'in_progress') return 'В работе'
  if (status === 'done_pending' || status === 'review') return 'На проверке'
  if (status === 'done') return 'Выполнена'
  return status || 'Без статуса'
}

async function loadTask() {
  loading.value = true
  error.value = ''

  try {
    const [taskData, userData] = await Promise.all([
      getTask(route.params.id),
      me().catch(() => null),
    ])

    task.value = taskData
    currentUser.value = userData
  } catch (e) {
    console.error(e)
    error.value = e?.response?.data?.message || 'Не удалось загрузить задачу'
  } finally {
    loading.value = false
  }
}

async function handleTakeTask() {
  if (!task.value) return

  actionLoading.value = true

  try {
    const payload = {
      status: 'in_progress',
    }

    if (currentUser.value?.id) {
      payload.assigned_to = currentUser.value.id
    }

    task.value = await updateTask(task.value.id, payload)

    showToast('Задача назначена вам', 'success')
  } catch (e) {
    console.error(e)
    showToast(e?.response?.data?.message || 'Не удалось взять задачу', 'error')
  } finally {
    actionLoading.value = false
  }
}

async function handleMarkDone() {
  if (!task.value) return

  actionLoading.value = true

  try {
    task.value = await updateTask(task.value.id, {
      status: 'done_pending',
    })

    showToast('Задача отправлена на проверку ✅')
  } catch (e) {
    console.error(e)
    showToast(e?.response?.data?.message || 'Не удалось отметить задачу выполненной', 'error')
  } finally {
    actionLoading.value = false
  }
}

onMounted(loadTask)
watch(() => route.params.id, loadTask)
</script>

<template>
  <section class="container task-detail-page">
    
    <RouterLink to="/help" class="back-link">← Назад к задачам</RouterLink>

    <div v-if="loading" class="state-card">Загрузка задачи...</div>
    <div v-else-if="error" class="state-card error">{{ error }}</div>

    <article v-else-if="task" class="task-card">
      <div class="task-media">
        <BaseImg v-if="photoUrl" :src="photoUrl" :alt="task.title" class="task-photo" />
        <div v-else class="task-photo fallback">📋</div>
      </div>

      <div class="task-body">
        <div class="eyebrow">Задача волонтёра</div>
        <h1>{{ task.title }}</h1>

        <div class="meta">
          <span
            class="badge"
            :class="{
              open: task.status === 'open',
              progress: task.status === 'in_progress',
              review: task.status === 'done_pending' || task.status === 'review',
              done: task.status === 'done',
            }"
          >
            {{ statusText(task.status) }}
          </span>

          <span class="chip">{{ task.points || 10 }} баллов</span>
        </div>

        <p class="desc">
          {{ task.description || task.desc || 'Описание задачи пока не добавлено.' }}
        </p>

        <div class="task-actions">
          <button
            v-if="canTakeTask"
            class="action-btn action-btn-primary"
            :disabled="actionLoading"
            @click="handleTakeTask"
          >
            {{ actionLoading ? 'Берём задачу...' : 'Взять задачу' }}
          </button>

          <button
            v-else-if="canMarkDone"
            class="action-btn action-btn-primary"
            :disabled="actionLoading"
            @click="handleMarkDone"
          >
            {{ actionLoading ? 'Отправляем...' : 'Отметить выполненной' }}
          </button>

          <div v-else class="task-status-note">
            {{ task.status === 'done' ? 'Задача уже выполнена.' : 'Задача сейчас недоступна для действия.' }}
          </div>
        </div>

        <div class="info-box">
          <strong>Что делать дальше?</strong>

          <span v-if="task.status === 'open'">
            Нажмите “Взять задачу”, если готовы выполнить её. После этого задача перейдёт в работу.
          </span>

          <span v-else-if="task.status === 'in_progress'">
            Когда закончите задачу, нажмите “Отметить выполненной”. Администратор проверит выполнение и начислит баллы.
          </span>

          <span v-else-if="task.status === 'done_pending' || task.status === 'review'">
            Задача отправлена на проверку. Дождитесь подтверждения администратора.
          </span>

          <span v-else>
            По этой задаче действие сейчас не требуется.
          </span>
          
        </div>
      </div>
    </article><div
  v-if="localToast.show"
  class="local-toast"
  :class="localToast.type"
>
  {{ localToast.message }}
</div>
  </section>
</template>

<style scoped>
.task-detail-page{
  padding-top:28px;
  padding-bottom:36px;
}

.back-link{
  display:inline-flex;
  margin-bottom:18px;
  color:#64748b;
  font-weight:800;
  text-decoration:none;
}

.back-link:hover{
  color:#0f172a;
}

.task-card{
  display:grid;
  grid-template-columns:minmax(280px, 420px) 1fr;
  gap:24px;
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:28px;
  padding:22px;
  box-shadow:0 10px 30px rgba(15,23,42,.06);
}

.task-media{
  min-height:360px;
}

.task-photo{
  width:100%;
  height:100%;
  min-height:360px;
  object-fit:cover;
  border-radius:22px;
  display:block;
  background:linear-gradient(180deg, rgba(245,158,11,.08), rgba(15,23,42,.04));
}

.fallback{
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:70px;
}

.eyebrow{
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:#d97706;
}

.task-body h1{
  margin:10px 0 0;
  font-size:clamp(32px, 4vw, 44px);
  line-height:1.05;
}

.meta{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:18px;
}

.badge,
.chip{
  padding:8px 12px;
  border-radius:999px;
  font-size:13px;
  font-weight:900;
}

.badge.open{
  background:rgba(59,130,246,.12);
  color:#1d4ed8;
}

.badge.progress{
  background:rgba(245,158,11,.16);
  color:#b45309;
}

.badge.review{
  background:rgba(168,85,247,.12);
  color:#7e22ce;
}

.badge.done{
  background:rgba(34,197,94,.14);
  color:#15803d;
}

.chip{
  background:rgba(245,158,11,.14);
  color:#b45309;
}

.desc{
  margin-top:18px;
  line-height:1.7;
  color:#0f172a;
}

.task-actions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  margin-top:22px;
}

.action-btn{
  min-height:46px;
  padding:10px 18px;
  border:none;
  border-radius:14px;
  font-size:14px;
  font-weight:900;
  cursor:pointer;
  transition:.18s ease;
}

.action-btn-primary{
  background:linear-gradient(135deg, #f59e0b 0%, #f7b733 100%);
  color:#111827;
  box-shadow:0 8px 18px rgba(245,158,11,.22);
}

.action-btn-primary:hover:not(:disabled){
  transform:translateY(-2px);
  box-shadow:0 12px 22px rgba(245,158,11,.28);
}

.action-btn:disabled{
  opacity:.7;
  cursor:not-allowed;
}

.task-status-note{
  padding:12px 14px;
  border-radius:14px;
  background:#f8fafc;
  border:1px solid #e2e8f0;
  color:#64748b;
  font-weight:800;
}

.info-box{
  margin-top:22px;
  padding:16px;
  border-radius:18px;
  background:#f8fafc;
  border:1px solid #e2e8f0;
  display:flex;
  flex-direction:column;
  gap:8px;
  color:#475569;
}

.state-card{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:18px;
  padding:16px;
}

.error{
  color:#b91c1c;
}
.local-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 99999;
  padding: 14px 18px;
  border-radius: 16px;
  background: #2563eb;
  color: #fff;
  font-weight: 800;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
}

.local-toast.success {
  background: #16a34a;
}

.local-toast.error {
  background: #dc2626;
}

@media (max-width: 900px){
  .task-card{
    grid-template-columns:1fr;
  }

  .task-media,
  .task-photo{
    min-height:280px;
  }
}

@media (max-width: 900px){
  .task-card{
    grid-template-columns:1fr;
    gap:18px;
  }

  .task-media,
  .task-photo{
    min-height:260px;
  }
}

@media (max-width: 390px){
  .task-detail-page{
    padding-top:20px;
    padding-bottom:28px;
  }

  .back-link{
    margin-bottom:14px;
    font-size:14px;
  }

  .task-card{
    padding:14px;
    border-radius:20px;
    gap:16px;
  }

  .task-media,
  .task-photo{
    min-height:220px;
    border-radius:16px;
  }

  .task-body h1{
    font-size:32px;
    line-height:1.08;
  }

  .meta{
    gap:8px;
  }

  .badge,
  .chip{
    font-size:12px;
    padding:7px 10px;
  }

  .desc{
    font-size:15px;
    line-height:1.6;
  }

  .task-actions{
    display:grid;
    grid-template-columns:1fr;
  }

  .action-btn{
    width:100%;
  }

  .info-box{
    padding:14px;
    border-radius:16px;
  }
}  
</style>