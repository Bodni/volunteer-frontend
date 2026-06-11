<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, commit } from '../demoStore'
import { api } from '../api'
import { getAnimals } from '../services/animals'
import { createFoundRequest, createAdoptionRequest } from '../services/help'
import { getTasks } from '../services/tasks'

import { notify, askConfirm } from '../utils/notify'

const route = useRoute()
const router = useRouter()
const apiOrigin = new URL(api.defaults.baseURL).origin

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

const tab = ref('help')// help | tasks | forms

function applyRouteQuery() {
  if (['help', 'tasks', 'forms'].includes(String(route.query.tab))) {
    tab.value = String(route.query.tab)
  }

  const a = route.query.animal

  if (a && animalOptions.value.includes(String(a))) {
    adoptAnimal.value = String(a)
  } else if (a) {
    notify('На это животное уже нельзя подать заявку', 'info')
    adoptAnimal.value = animalOptions.value[0] || ''
  } else if (!adoptAnimal.value && animalOptions.value.length) {
    adoptAnimal.value = animalOptions.value[0]
  }
}

const tabInfo = computed(() => {
  if (tab.value === 'help') {
    return {
      title: 'Как можно помочь приюту',
      text: 'Здесь собраны реквизиты для пожертвований и краткая инструкция для волонтёров: куда приехать, что взять с собой и как связаться с координатором.',
    }
  }

  if (tab.value === 'tasks') {
    return {
      title: 'Задачи для волонтёров',
      text: 'Выберите подходящую задачу, откройте подробности и возьмите её в работу. После выполнения задачу можно отправить на проверку администратору.',
    }
  }

  if (tab.value === 'forms') {
    return {
      title: 'Заявки в приют',
      text: 'Здесь можно сообщить о найденном животном или оставить заявку на пристройство. После отправки данные попадут в админ-панель, и с вами свяжутся.',
    }
  }

  return {
    title: '',
    text: '',
  }
})

const successModal = ref({
  show: false,
  title: '',
  text: '',
})

function showSuccess(title, text) {
  successModal.value = { show: true, title, text }
}

function closeSuccess() {
  successModal.value.show = false
}

function getMediaUrl(path) {
  const value = String(path || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) return `http:${value}`
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${apiOrigin}${normalized}`
}

// ----------- HELP (QR + реквизиты + инфо) -----------
const requisites = {
  bank: 'АО "Помощь банк"',
  card: '2200 1234 5678 9999',
  phone: '+7 (999) 999-99-99',
  recipient: 'Помощь животным',
  comment: 'Пожертвование на помощь животным',
}

// ----------- TASKS (пока из demoStore) -----------
const filter = ref('all') // all | open | in_progress | done | mine
const search = ref('')

const taskPage = ref(1)
const tasksPerPage = 6

const authed = computed(() => !!localStorage.getItem('token'))

const currentVolunteer = computed(() => {
  const name = db.auth.userName || 'Никита'
  return db.volunteers.find(v => v.name === name) || { id: 1, name, status: 'free' }
})

const filteredTasks = computed(() => {
  const taskItems = asList(tasks.value)
  let items = taskItems.length ? [...taskItems] : [...db.tasks]

  const q = search.value.trim().toLowerCase()
  if (q) {
    items = items.filter(t =>
      `${t.title} ${t.description || t.desc || ''}`.toLowerCase().includes(q)
    )
  }

  if (filter.value === 'open') items = items.filter(t => t.status === 'open')
  if (filter.value === 'in_progress') items = items.filter(t => t.status === 'in_progress')
  if (filter.value === 'done') items = items.filter(t => t.status === 'done')
  if (filter.value === 'mine') {
    items = items.filter(t => (t.assignedTo || t.assigned_to) === currentVolunteer.value.id)
  }

  return items
})

const taskPages = computed(() => {
  return Math.max(1, Math.ceil(filteredTasks.value.length / tasksPerPage))
})

const paginatedTasks = computed(() => {
  const start = (taskPage.value - 1) * tasksPerPage
  return filteredTasks.value.slice(start, start + tasksPerPage)
})

watch([filter, search], () => {
  taskPage.value = 1
})

function statusText(s) {
  if (s === 'open') return 'открыта'
  if (s === 'in_progress') return 'в работе'
  if (s === 'done') return 'выполнена'
  if (s === 'done_pending') return 'на проверке'
  return s
}

function openTask(taskId) {
  if (!authed.value) {
    notify('Нужно войти, чтобы взять задачу', 'error')
    return
  }

  const t = db.tasks.find(x => x.id === taskId)
  if (!t || t.status !== 'open') return

  t.status = 'in_progress'
  t.assignedTo = currentVolunteer.value.id

  const v = db.volunteers.find(x => x.id === currentVolunteer.value.id)
  if (v) v.status = 'busy'

  commit()
  notify('Задача назначена вам', 'success')
}

function markDone(taskId) {
  if (!authed.value) {
    notify('Нужно войти', 'error')
    return
  }

  const t = db.tasks.find(x => x.id === taskId)
  if (!t || t.assignedTo !== currentVolunteer.value.id) return

  t.status = 'done_pending'
  commit()
  notify('Отправлено на подтверждение администратору', 'success')
}

// ----------- FORMS (Laravel API) -----------
const foundCity = ref('')
const foundAddress = ref('')
const foundDesc = ref('')
const foundLoading = ref(false)

async function sendFound() {
  if (!foundCity.value.trim() || !foundAddress.value.trim() || !foundDesc.value.trim()) {
    notify('Заполни город, адрес и описание')
    return
  }

  foundLoading.value = true

  try {
    const formData = new FormData()
    formData.append('city', foundCity.value.trim())
    formData.append('address', foundAddress.value.trim())
    formData.append('description', foundDesc.value.trim())

    if (foundPhotoFile.value) {
      formData.append('photo', foundPhotoFile.value)
    }

    await createFoundRequest(formData)

    foundCity.value = ''
    foundAddress.value = ''
    foundDesc.value = ''
    foundPhotoFile.value = null

    if (foundPhotoInput.value) {
      foundPhotoInput.value.value = ''
    }

    showSuccess('Заявка отправлена', 'Спасибо! Информация о найденном животном отправлена администратору.')
  } catch (e) {
    console.error(e)
    notify('Не удалось отправить заявку')
  } finally {
    foundLoading.value = false
  }
}

// заявка “хочу забрать”
const adoptAnimal = ref('')
const adoptName = ref('')
const adoptPhone = ref('')
const adoptMessage = ref('')
const adoptLoading = ref(false)

const animals = ref([])

const animalOptions = computed(() => {
  return asList(animals.value)
    .filter(a => a && a.status !== 'adopted')
    .map(a => a.name)
    .filter(Boolean)
})

onMounted(async () => {
  try {
    animals.value = asList(await getAnimals({
  status: 'all',
  page: 1,
  per_page: 1000,
}))
  } catch (e) {
    console.error('Не удалось загрузить животных для формы', e)
  }

  const a = route.query.animal

applyRouteQuery()
  try {
  tasks.value = asList(await getTasks())
} catch (e) {
  console.error('Не удалось загрузить задачи', e)
}
})

async function sendAdopt() {
  const animalName = adoptAnimal.value.trim()

  if (!animalName || !adoptName.value.trim() || !adoptPhone.value.trim()) {
    notify('Заполни: животное, имя, телефон')
    return
  }

  if (!animalOptions.value.includes(animalName)) {
    notify('На это животное уже нельзя подать заявку', 'error')
    return
  }

  adoptLoading.value = true

  try {
    await createAdoptionRequest({
      animal_name: animalName,
      name: adoptName.value.trim(),
      phone: adoptPhone.value.trim(),
      message: adoptMessage.value.trim(),
    })

    adoptName.value = ''
    adoptPhone.value = ''
    adoptMessage.value = ''

    showSuccess(
      'Заявка отправлена',
      'Спасибо! Мы получили вашу заявку и скоро свяжемся с вами.'
    )
  } catch (e) {
    console.error(e)
    notify(e?.response?.data?.message || 'Не удалось отправить заявку')
  } finally {
    adoptLoading.value = false
  }
}

const foundPhotoFile = ref(null)
const foundPhotoInput = ref(null)

function handleFoundPhotoChange(event) {
  foundPhotoFile.value = event.target.files?.[0] || null
}

const tasks = ref([])
</script>

<template>
  <div class="container">
    <div class="top">
      <div>
        <h1 class="h1">Помочь</h1>
      </div>

      <div class="tabs">
  <button class="tab" :class="{ active: tab === 'help' }" @click="tab = 'help'">
    Помощь
  </button>

  <button
    v-if="authed"
    class="tab"
    :class="{ active: tab === 'tasks' }"
    @click="tab = 'tasks'"
  >
    Задачи
  </button>

  <button class="tab" :class="{ active: tab === 'forms' }" @click="tab = 'forms'">
    Заявки
  </button>
</div>
    </div>

    <div class="tab-intro">
  <div class="intro-eyebrow">
    {{ tab === 'help' ? 'Помощь приюту' : tab === 'tasks' ? 'Волонтёрские задачи' : 'Обращения и заявки' }}
  </div>

  <h2 class="intro-title">{{ tabInfo.title }}</h2>
  <p class="intro-text">{{ tabInfo.text }}</p>
</div>

    <div v-if="tab === 'help'" class="grid">
      <div class="card">
        <div class="card-title">Пожертвование</div>
        <div class="muted small" style="margin-top: 6px;">Реквизиты</div>

        <div class="qr">
          <div class="qr-box">QR</div>
          <div class="qr-text">
            <div class="strong">{{ requisites.recipient }}</div>
            <div class="muted small">{{ requisites.comment }}</div>
          </div>
        </div>

        <div class="kv">
          <div class="row-kv"><span class="k">Банк</span><span class="v">{{ requisites.bank }}</span></div>
          <div class="row-kv"><span class="k">Карта</span><span class="v mono">{{ requisites.card }}</span></div>
          <div class="row-kv"><span class="k">Телефон</span><span class="v mono">{{ requisites.phone }}</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Инструкция для волонтёра</div>
        <div class="muted small" style="margin-top: 6px;">Куда подъехать, что сделать, как связаться.</div>

        <div class="info-list">
          <div class="info-item">
            <div class="badge info">Адрес</div>
            <div class="strong">Москва, ул. Примерная, 12</div>
            <div class="muted small">Вход со двора, дверь с табличкой “Приют”.</div>
          </div>

          <div class="info-item">
            <div class="badge warn">Важно</div>
            <div class="strong">Перед визитом позвонить координатору</div>
            <div class="muted small">Тел.: +7 (000) 000-00-00</div>
          </div>

          <div class="info-item">
            <div class="badge ok">Что нужно</div>
            <div class="strong">Перчатки, переноска (если есть)</div>
            <div class="muted small">Корм и лекарства — по задачам на вкладке “Задачи”.</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="tab === 'tasks'" class="tasks-panel">
      <div class="bar-top">
        <div>
          <h2 class="section-title">Задачи волонтёров</h2>
          <div class="muted small">Выберите задачу, откройте подробности и возьмите её в работу.</div>
        </div>

        <div class="filters">
          <input class="input" v-model="search" placeholder="Поиск по задачам..." />

          <select class="input" v-model="filter">
            <option value="all">Все</option>
            <option value="open">Открытые</option>
            <option value="in_progress">В работе</option>
            <option value="done">Выполненные</option>
            <option value="mine">Мои</option>
          </select>
        </div>
      </div>

      <div v-if="filteredTasks.length === 0" class="card empty-state">
        Задач пока нет.
      </div>

      <div v-else class="tasks">
  <article v-for="t in paginatedTasks" :key="t.id" class="task task-card">
    <div class="task-media">
      <BaseImg
        v-if="getMediaUrl(t.photo)"
        class="task-photo"
        :src="getMediaUrl(t.photo)"
        :alt="t.title"
      />

      <div v-else class="task-photo task-photo-empty">
        <div class="empty-icon">📋</div>
        <div class="empty-text">Фото задачи пока не добавлено</div>
      </div>
    </div>

    <div class="task-content">
      <div class="task-top">
        <div class="strong task-title">{{ t.title }}</div>

        <span
          class="badge"
          :class="{
            info: t.status === 'open',
            warn: t.status === 'in_progress',
            ok: t.status === 'done' || t.status === 'done_pending',
          }"
        >
          {{ statusText(t.status) }}
        </span>
      </div>

      <div class="muted small task-desc">
        {{ t.description || t.desc || 'Описание задачи пока не добавлено.' }}
      </div>

      <div class="task-bottom">
        <RouterLink class="task-detail-link" :to="`/tasks/${t.id}`">
          Подробнее
        </RouterLink>

        <div class="muted small task-assigned">
          Назначено:
          {{
            t.assigned_user?.name
              || db.volunteers.find(v => v.id === (t.assignedTo || t.assigned_to))?.name
              || '—'
          }}
        </div>
      </div>
    </div> 
  </article>
      </div>
      <div v-if="filteredTasks.length > tasksPerPage" class="pagination">
  <button class="page-btn" :disabled="taskPage === 1" @click="taskPage--">
    ‹
  </button>

  <button
    v-for="num in taskPages"
    :key="num"
    class="page-btn"
    :class="{ active: taskPage === num }"
    @click="taskPage = num"
  >
    {{ num }}
  </button>

  <button class="page-btn" :disabled="taskPage === taskPages" @click="taskPage++">
    ›
  </button>
</div>
    </div>

    <div v-if="tab === 'forms'" class="forms forms-equal">
      <div class="card">
        <div class="card-title">Нашли животное</div>

        <div class="form form-equal-inner">
          <label class="label">Город
            <input class="input" v-model="foundCity" placeholder="Москва" />
          </label>

          <label class="label">Адрес / ориентир
            <input class="input" v-model="foundAddress" placeholder="ул. Ленина, 10" />
          </label>

          <label class="label">Описание
            <textarea class="input" v-model="foundDesc" rows="4" placeholder="Кот серый, хромает..."></textarea>
          </label>

          <label class="label">Фото найденного животного
            <input
              ref="foundPhotoInput"
              class="input"
              type="file"
              accept="image/*"
              @change="handleFoundPhotoChange"
            />
          </label>

          <button class="btn btn-primary form-submit-btn" @click="sendFound" :disabled="foundLoading">
            {{ foundLoading ? 'Отправка...' : 'Отправить' }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Хочу забрать животное</div>

        <div class="form form-equal-inner">
          <label class="label">Животное
            <select class="input" v-model="adoptAnimal">
              <option v-for="a in animalOptions" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>

          <label class="label">Ваше имя
            <input class="input" v-model="adoptName" placeholder="Иван" />
          </label>

          <label class="label">Телефон
            <input class="input" v-model="adoptPhone" placeholder="+7..." />
          </label>

          <label class="label">Комментарий
            <textarea class="input" v-model="adoptMessage" rows="4" placeholder="Готов забрать, есть опыт..."></textarea>
          </label>

          <button class="btn btn-primary form-submit-btn" @click="sendAdopt" :disabled="adoptLoading">
            {{ adoptLoading ? 'Отправка...' : 'Отправить' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="successModal.show" class="modal-backdrop" @click.self="closeSuccess">
      <div class="success-modal">
        <div class="success-icon">✓</div>
        <h3>{{ successModal.title }}</h3>
        <p>{{ successModal.text }}</p>
        <button class="btn btn-primary modal-btn" @click="closeSuccess">Хорошо</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
  margin-bottom:12px;
}

.h1{
  margin:0;
  font-size:28px;
}

.section-title{
  margin:0;
  font-size:22px;
  font-weight:900;
}

.muted{
  color: var(--muted);
}

.small{
  font-size:12px;
}

.tabs{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.tab{
  border:1px solid var(--border);
  background:#fff;
  border-radius:12px;
  padding:8px 12px;
  font-weight:900;
  cursor:pointer;
}

.tab.active{
  border-color: rgba(245,158,11,.55);
  box-shadow: 0 0 0 4px rgba(245,158,11,.12);
}

.grid{
  display:grid;
  grid-template-columns:1fr;
  gap:12px;
}

@media (min-width: 900px){
  .grid{
    grid-template-columns:1fr 1fr;
  }
}

.card{
  background:#fff;
  border:1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding:14px;
}

.empty-state{
  color:var(--muted);
  font-weight:800;
}

.card-title{
  font-weight:900;
  margin-bottom:6px;
}

.qr{
  display:flex;
  gap:12px;
  margin-top:12px;
  align-items:center;
}

.qr-box{
  width:86px;
  height:86px;
  border-radius:14px;
  border:1px dashed var(--border);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  color: var(--muted);
  background: rgba(15,23,42,.03);
}

.qr-text{
  display:flex;
  flex-direction:column;
  gap:2px;
}

.kv{
  margin-top:12px;
  border:1px solid var(--border);
  border-radius:14px;
  overflow:hidden;
}

.row-kv{
  display:flex;
  justify-content:space-between;
  gap:10px;
  padding:10px 12px;
  border-top:1px solid var(--border);
}

.row-kv:first-child{
  border-top:none;
}

.k{
  color: var(--muted);
  font-size:13px;
}

.v{
  font-weight:800;
}

.mono{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.info-list{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin-top:12px;
}

.info-item{
  border:1px solid var(--border);
  border-radius:14px;
  padding:12px;
  background: rgba(15,23,42,.02);
}

.badge{
  display:inline-block;
  padding:4px 8px;
  border-radius:999px;
  font-size:12px;
  font-weight:900;
}

.badge.info{
  background: rgba(59,130,246,.14);
}

.badge.warn{
  background: rgba(245,158,11,.18);
}

.badge.ok{
  background: rgba(34,197,94,.16);
}

.bar-top{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  gap:12px;
  flex-wrap:wrap;
  margin-bottom:12px;
}

.filters{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.filters .input{
  min-width: 240px;
}

.tasks {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

@media (min-width: 900px) {
  .tasks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.task{
  background:#fff;
  border:1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding:14px;
}

.task-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:6px;
}

.strong{
  font-weight:900;
}

.task-actions{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-top:10px;
  flex-wrap:wrap;
}

.task-image-wrap{
  margin:10px 0;
  height:180px;
  border-radius:16px;
  overflow:hidden;
  background:rgba(15,23,42,.04);
}

.task-image{
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
}

.forms{
  display:grid;
  grid-template-columns:1fr;
  gap:12px;
}

@media (min-width: 900px){
  .forms{
    grid-template-columns:1fr 1fr;
  }
}

.form{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin-top:10px;
}


.task-detail-link{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:max-content;
  margin-top:12px;
  padding:9px 14px;
  border-radius:12px;
  background:#fff;
  border:1px solid var(--border);
  color:#0f172a;
  font-weight:900;
  text-decoration:none;
  transition:.18s ease;
}

.task-detail-link:hover{
  background:#fff7ed;
  border-color:rgba(245,158,11,.35);
  transform:translateY(-1px);
  text-decoration:none;
}

.forms-equal{
  align-items:stretch;
}

.forms-equal .card{
  height:100%;
  display:flex;
  flex-direction:column;
}

.form-equal-inner{
  height:100%;
  display:flex;
  flex-direction:column;
}

.form-submit-btn{
  width:100%;
  margin-top:auto;
  min-height:44px;
}

.modal-backdrop{
  position:fixed;
  inset:0;
  z-index:2000;
  background:rgba(15,23,42,.45);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
}

.success-modal{
  width:100%;
  max-width:420px;
  background:#fff;
  border-radius:24px;
  padding:24px;
  text-align:center;
  box-shadow:0 24px 60px rgba(15,23,42,.25);
  animation:modalIn .18s ease;
}

.success-icon{
  width:54px;
  height:54px;
  margin:0 auto 14px;
  border-radius:999px;
  background:rgba(34,197,94,.14);
  color:#15803d;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:28px;
  font-weight:900;
}

.success-modal h3{
  margin:0;
  font-size:22px;
}

.success-modal p{
  margin:10px 0 0;
  color:#64748b;
  line-height:1.6;
}

.modal-btn{
  width:auto;
  min-width:160px;
  margin-top:18px;
}

@keyframes modalIn{
  from{
    opacity:0;
    transform:translateY(10px) scale(.98);
  }
  to{
    opacity:1;
    transform:translateY(0) scale(1);
  }
}

.unified-task-card{
  display:flex;
  flex-direction:column;
  gap:14px;
  height:100%;
  padding:16px;
  border:1px solid #dbe3ef;
  border-radius:22px;
  background:#fff;
  box-shadow:0 8px 24px rgba(15, 23, 42, 0.04);
  transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}

.unified-task-card:hover{
  transform:translateY(-2px);
  box-shadow:0 14px 30px rgba(15, 23, 42, 0.08);
  border-color:#cfd8e6;
}

.task-card-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
}

.task-card-title{
  margin:0;
  font-size:28px;
  font-weight:900;
  line-height:1.15;
  color:#0f172a;
  word-break:break-word;
}

.task-status{
  flex-shrink:0;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:32px;
  padding:6px 12px;
  border-radius:999px;
  font-size:13px;
  font-weight:900;
  text-transform:lowercase;
}

.status-open{
  background:#dbeafe;
  color:#1d4ed8;
}

.status-progress{
  background:#fef3c7;
  color:#b45309;
}

.status-review{
  background:#dcfce7;
  color:#166534;
}

.status-done{
  background:#dcfce7;
  color:#166534;
}

.tasks{
  display:grid;
  grid-template-columns:1fr;
  gap:16px;
}

@media (min-width: 900px){
  .tasks{
    grid-template-columns:1fr 1fr;
  }
}

.task-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow);
  overflow: hidden;
  padding: 0;
  min-height: 430px;
  display: flex;
  flex-direction: column;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}

.task-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 34px rgba(15, 23, 42, .10);
  border-color: rgba(245, 158, 11, .28);
}

.task-media {
  width: 100%;
  height: 260px;
  overflow: hidden;
  background: #fff7ed;
  border-bottom: 1px solid var(--border);
}

.task-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 40%;
  display: block;
}

.task-photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
  color: #d97706;
  text-align: center;
  padding: 20px;
}

.empty-icon {
  font-size: 34px;
  line-height: 1;
}

.empty-text {
  font-size: 14px;
  font-weight: 900;
}

.task-content {
  padding: 18px 20px 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 12px;
}

.task-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
}

.task-title {
  font-size: 20px;
  line-height: 1.25;
  font-weight: 900;
  color: #0f172a;
  word-break: break-word;
}

.task-desc {
  color: #334155;
  font-size: 15px;
  line-height: 1.55;
  min-height: 48px;
}

.task-bottom {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 8px;
}

.task-detail-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 11px 18px;
  border-radius: 14px;
  background: #ff9f0a;
  border: 1px solid #ff9f0a;
  color: #111827;
  font-weight: 900;
  text-decoration: none;
  transition: .18s ease;
}

.task-detail-link:hover {
  background: #f59e0b;
  border-color: #f59e0b;
  transform: translateY(-1px);
  text-decoration: none;
}

.task-assigned {
  white-space: nowrap;
  color: #64748b;
}

.tab-intro{
  margin: 0 0 16px;
  padding: 18px 20px;
  border-radius: 22px;
  background:
    radial-gradient(circle at top left, rgba(245,158,11,.16), transparent 34%),
    linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.intro-eyebrow{
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #d97706;
}

.intro-title{
  margin: 6px 0 0;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.1;
  color: #0f172a;
}

.intro-text{
  max-width: 820px;
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.65;
}

/* =========================
   HELP RESPONSIVE
   ========================= */

@media (max-width: 900px){
  .top{
    flex-direction:column;
    align-items:flex-start;
    gap:14px;
  }

  .tabs{
    width:100%;
    overflow-x:auto;
    display:flex;
    flex-wrap:nowrap;
    justify-content:flex-start;
    padding-bottom:6px;
  }

  .tab{
    flex:0 0 auto;
  }

  .grid,
  .forms,
  .forms-equal{
    grid-template-columns:1fr;
  }

  .tasks{
    grid-template-columns:1fr;
  }

  .help-hero-title{
    font-size:clamp(30px, 8vw, 44px);
  }
}

@media (max-width: 560px){
  .card{
    padding:16px;
  }

  .form{
    gap:12px;
  }

  .task-card{
    border-radius:18px;
  }

  .task-media{
    height:160px;
  }

  .task-bottom{
    align-items:flex-start;
    flex-direction:column;
  }

  .task-detail-link{
    width:100%;
  }
}

@media (max-width: 390px){
  .page{
    padding-top:22px;
  }

  .top{
    gap:12px;
  }

  .h1{
    font-size:30px;
  }

  .tabs{
    gap:8px;
    overflow-x:auto;
    padding-bottom:6px;
  }

  .tab{
    flex:0 0 auto;
    min-height:38px;
    padding:8px 14px;
    border-radius:13px;
    font-size:13px;
  }

  .help-hero{
    margin:6px 0 18px;
  }

  .help-hero-eyebrow{
    font-size:11px;
  }

  .help-hero-title{
    font-size:32px;
    line-height:1.08;
  }

  .help-hero-text{
    font-size:15px;
    line-height:1.6;
  }

  .grid,
  .forms,
  .forms-equal,
  .tasks{
    grid-template-columns:1fr;
    gap:12px;
  }

  .card{
    padding:16px;
    border-radius:18px;
  }

  .card-title{
    font-size:18px;
  }

  .form{
    gap:12px;
  }

  .input{
    min-height:42px;
    border-radius:12px;
  }

  .task-card{
    border-radius:18px;
  }

  .task-media{
    height:155px;
  }

  .task-content{
    padding:14px;
  }

  .task-top{
    flex-direction:column;
    align-items:flex-start;
  }

  .task-bottom{
    flex-direction:column;
    align-items:stretch;
  }

  .task-detail-link{
    width:100%;
  }
}

/* Единое отображение фотографий задач */
.task-media{
  width:100%;
  height:200px;
  overflow:hidden;
  background:#f8fafc;
  border-bottom:1px solid var(--border);
}

.task-photo{
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:center;
  display:block;
}

.task-photo-empty{
  width:100%;
  height:100%;
}

@media (max-width: 900px){
  .task-media{
    height:210px;
  }
}

@media (max-width: 390px){
  .task-media{
    height:180px;
  }
}


.tasks-grid,
.tasks-list,
.tasks {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 20px !important;
}

.task-card {
  min-height: 520px !important;
  padding: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

.task-card img,
.task-card .task-photo,
.task-card .task-image,
.task-card .task-img {
  width: 100% !important;
  height: 320px !important;
  min-height: 320px !important;
  max-height: 320px !important;
  object-fit: cover !important;
  object-position: center 35% !important;
  display: block !important;
  border-radius: 0 !important;
}

.task-media,
.task-image-wrap,
.task-photo-wrap {
  width: 100% !important;
  height: 320px !important;
  min-height: 320px !important;
  max-height: 320px !important;
  overflow: hidden !important;
  border-radius: 0 !important;
  background: #fff7ed !important;
}

.task-content,
.task-body {
  padding: 22px 24px !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}

.task-title {
  font-size: 22px !important;
  line-height: 1.25 !important;
}

.task-desc,
.task-description {
  font-size: 16px !important;
  line-height: 1.55 !important;
}

.task-detail-link,
.task-card .btn {
  margin-top: auto !important;
}

@media (max-width: 760px) {
  .tasks-grid,
  .tasks-list,
  .tasks {
    grid-template-columns: 1fr !important;
  }

  .task-card img,
  .task-card .task-photo,
  .task-card .task-image,
  .task-card .task-img,
  .task-media,
  .task-image-wrap,
  .task-photo-wrap {
    height: 260px !important;
    min-height: 260px !important;
    max-height: 260px !important;
  }

  .task-card {
    min-height: auto !important;
  }
}
</style>