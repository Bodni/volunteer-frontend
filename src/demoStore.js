import { reactive } from 'vue'

export const POINTS_PER_TASK = 10
const LS_KEY = 'demo_db_v2'

// ---------------- DEFAULT DB ----------------
const defaultDB = {
  auth: {
    token: '',
    role: '',
    userId: null,
    userName: '',
    userEmail: '',
  },

  users: [
  { id: 1, name: 'Админ', email: 'admin@demo.ru', password: 'admin', role: 'admin', points: 0, avatar: '' },
  { id: 2, name: 'Никита', email: 'volunteer@demo.ru', password: '123456', role: 'volunteer', points: 0, avatar: '' },
],

  donation: { goal: 50000, raised: 17500, text: 'Сбор на лечение и корм' },

  news: [
    { id: 1, title: 'Привезли корм', date: '2026-02-01', text: 'Спасибо всем, кто помог с закупкой!' },
    { id: 2, title: 'Луна ищет дом', date: '2026-02-02', text: 'Стерилизована, привита, ласковая.' },
  ],

  animals: [
    { id: 11, name: 'Луна', species: 'кошка', age: '1 год', city: 'Москва', status: 'looking_home', desc: 'Ласковая, стерилизована.', photo: '' },
    { id: 12, name: 'Барсик', species: 'кот', age: '2 года', city: 'Москва', status: 'treatment', desc: 'На лечении, нужен уход.', photo: '' },
    { id: 13, name: 'Шарик', species: 'пёс', age: '4 года', city: 'Химки', status: 'adopted', desc: 'Уже пристроен ❤️', photo: '' },
  ],

  volunteers: [
    { id: 2, name: 'Никита', status: 'free' },
    { id: 3, name: 'Амир', status: 'busy' },
  ],

  tasks: [
    { id: 101, title: 'Купить корм', desc: '2 мешка корма, доставить в приют', status: 'open', assignedTo: null, points: POINTS_PER_TASK },
    { id: 102, title: 'Отвезти к ветеринару', desc: 'Барсик, клиника “Вет+”', status: 'in_progress', assignedTo: 3, points: POINTS_PER_TASK },
    { id: 103, title: 'Сфотографировать животных', desc: 'Сделать 10 фото для сайта', status: 'done', assignedTo: 2, points: POINTS_PER_TASK },
  ],

  requests_found: [
    { id: 201, city: 'Москва', address: 'ул. Ленина 10', desc: 'Кот серый, хромает', status: 'new' },
  ],

  requests_adoption: [
    { id: 301, animal: 'Луна', name: 'Иван', phone: '+7...', message: 'Готов взять на передержку', status: 'new' },
  ],
}

// ---------------- LOAD / MIGRATE ----------------
function safeClone(obj) {
  try {
    return structuredClone(obj)
  } catch {
    return JSON.parse(JSON.stringify(obj))
  }
}

function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return safeClone(defaultDB)
    const parsed = JSON.parse(raw)
    const merged = { ...safeClone(defaultDB), ...parsed }
    return migrate(merged)
  } catch {
    return safeClone(defaultDB)
  }
}

function migrate(d) {
  // auth
  d.auth ||= { token: '', role: '', userId: null, userName: '', userEmail: '' }
  d.auth.userId ??= null
  d.auth.userEmail ??= ''

  // users
 if (!Array.isArray(d.users)) d.users = []
d.users.forEach(u => {
  u.points ??= 0
  u.avatar ??= ''
})

  // animals
  if (!Array.isArray(d.animals)) d.animals = []
  d.animals.forEach(a => {
    a.photo ??= ''
  })

  // tasks
  if (!Array.isArray(d.tasks)) d.tasks = []
  d.tasks.forEach(t => {
    t.points ??= POINTS_PER_TASK
    if (!t.status) t.status = 'open'
    if (t.assignedTo === undefined) t.assignedTo = null
  })

  // volunteers
  if (!Array.isArray(d.volunteers)) d.volunteers = []
  syncVolunteersFromUsers(d)

  // requests
  if (!Array.isArray(d.requests_found)) d.requests_found = []
  if (!Array.isArray(d.requests_adoption)) d.requests_adoption = []

  return d
}

function syncVolunteersFromUsers(d) {
  const volUsers = (d.users || []).filter(u => u.role === 'volunteer')
  volUsers.forEach(u => {
    const exists = d.volunteers.find(v => v.id === u.id)
    if (!exists) d.volunteers.push({ id: u.id, name: u.name, status: 'free' })
  })
}

// ---------------- SAVE ----------------
function saveDB(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d))
}

export const db = reactive(loadDB())

export function commit() {
  saveDB(db)
}

export function isAuthed() {
  return !!db.auth.token
}

export function isAdmin() {
  return db.auth.role === 'admin'
}

export function logoutDemo() {
  db.auth.token = ''
  db.auth.role = ''
  db.auth.userId = null
  db.auth.userName = ''
  db.auth.userEmail = ''
  commit()
}

// ---------------- AUTH ----------------
export function loginWithEmailPassword(email, password) {
  const e = String(email || '').trim().toLowerCase()
  const p = String(password || '')

  const userByEmail = db.users.find(
    x => String(x.email || '').toLowerCase() === e
  )

  if (!userByEmail) {
    return { ok: false, message: 'Неверный email или пароль' }
  }

  if (String(userByEmail.password || '') !== p) {
    return { ok: false, message: 'Неверный email или пароль' }
  }

  db.auth.token = 'demo'
  db.auth.role = userByEmail.role
  db.auth.userId = userByEmail.id
  db.auth.userName = userByEmail.name
  db.auth.userEmail = userByEmail.email
  commit()

  return { ok: true, role: userByEmail.role }
}

// ---------------- USERS (ADMIN) ----------------
export function addUserAdmin({ name, email, password, role }) {
  const n = String(name || '').trim()
  const e = String(email || '').trim().toLowerCase()
  const p = String(password || '').trim()
  const r = role || 'volunteer'

  if (!n || !e || !p) return { ok: false, message: 'Заполните имя, email и пароль' }
  if (!/^\S+@\S+\.\S+$/.test(e)) return { ok: false, message: 'Некорректный email' }
  if (db.users.some(x => String(x.email).toLowerCase() === e)) return { ok: false, message: 'Email уже используется' }

  const user = {
  id: Date.now(),
  name: n,
  email: e,
  password: p,
  role: r,
  points: 0,
  avatar: '',
}

  db.users.push(user)

  if (user.role === 'volunteer') {
    if (!db.volunteers.some(v => v.id === user.id)) {
      db.volunteers.push({ id: user.id, name: user.name, status: 'free' })
    }
  }

  commit()
  return { ok: true, user }
}

export function removeUserAdmin(userId) {
  const u = db.users.find(x => x.id === userId)
  if (!u) return { ok: false, message: 'Пользователь не найден' }
  if (u.role === 'admin') return { ok: false, message: 'Админа удалять нельзя' }

  db.users = db.users.filter(x => x.id !== userId)
  db.volunteers = db.volunteers.filter(v => v.id !== userId)

  db.tasks.forEach(t => {
    if (t.assignedTo === userId) {
      t.assignedTo = null
      t.status = 'open'
    }
  })

  commit()
  return { ok: true }
}

export function resetPasswordAdmin(userId, newPassword) {
  const u = db.users.find(x => x.id === userId)
  if (!u) return { ok: false, message: 'Пользователь не найден' }
  if (u.role === 'admin') return { ok: false, message: 'Админу нельзя менять пароль тут' }

  const p = String(newPassword || '').trim()
  if (!p) return { ok: false, message: 'Пароль пустой' }
  u.password = p
  commit()
  return { ok: true }
}

// ---------------- POINTS / AVATAR ----------------
export function addPointsToUser(userId, delta) {
  const u = db.users.find(x => x.id === userId)
  if (!u) return { ok: false, message: 'Пользователь не найден' }
  const d = Number(delta || 0)
  u.points = Number(u.points || 0) + d
  commit()
  return { ok: true, points: u.points }
}

export function setUserAvatar(userId, dataUrl) {
  const u = db.users.find(x => x.id === userId)
  if (!u) return { ok: false, message: 'Пользователь не найден' }
  u.avatar = String(dataUrl || '')
  commit()
  return { ok: true }
}

export function getBestVolunteer() {
  const vols = db.users.filter(u => u.role === 'volunteer')
  if (!vols.length) return null
  return vols.reduce((best, cur) => (Number(cur.points || 0) > Number(best.points || 0) ? cur : best), vols[0])
}
