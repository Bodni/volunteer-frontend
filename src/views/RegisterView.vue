<script setup>
import { reactive, computed } from 'vue'

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  agree: false,
})

const state = reactive({
  loading: false,
  success: '',
  error: '',
  serverErrors: {},
})

const passwordRules = computed(() => ({
  minLength: form.password.length >= 8,
  hasUpper: /[A-ZА-ЯЁ]/.test(form.password),
  hasLower: /[a-zа-яё]/.test(form.password),
  hasDigit: /\d/.test(form.password),
  hasSpecial: /[!@#$%^&*()_\-+=[\]{};:'"\\|,.<>/?]/.test(form.password),
}))

function validateClient() {
  state.error = ''
  state.serverErrors = {}

  if (!form.name.trim()) {
    state.error = 'Введите имя'
    return false
  }

  const email = form.email.trim().toLowerCase()
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRe.test(email)) {
    state.error = 'Введите корректный email'
    return false
  }

  if (!passwordRules.value.minLength) {
    state.error = 'Пароль должен содержать минимум 8 символов'
    return false
  }

  if (!passwordRules.value.hasUpper) {
    state.error = 'Пароль должен содержать хотя бы одну заглавную букву'
    return false
  }

  if (!passwordRules.value.hasLower) {
    state.error = 'Пароль должен содержать хотя бы одну строчную букву'
    return false
  }

  if (!passwordRules.value.hasDigit) {
    state.error = 'Пароль должен содержать хотя бы одну цифру'
    return false
  }

  if (!passwordRules.value.hasSpecial) {
    state.error = 'Пароль должен содержать хотя бы один специальный символ'
    return false
  }

  if (form.password !== form.confirmPassword) {
    state.error = 'Пароли не совпадают'
    return false
  }

  if (!form.agree) {
    state.error = 'Необходимо согласиться с условиями'
    return false
  }

  return true
}

async function register() {
  if (!validateClient()) return

  state.loading = true
  state.error = ''
  state.success = ''

  try {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      phone: form.phone.trim(),
    }

    // Пример запроса:
    // await api.post('/auth/register', payload)

    await new Promise(resolve => setTimeout(resolve, 800))

    state.success = 'Регистрация выполнена. Теперь можно войти в систему.'
    form.name = ''
    form.email = ''
    form.password = ''
    form.confirmPassword = ''
    form.phone = ''
    form.agree = false
  } catch (e) {
    state.error = e?.response?.data?.message || 'Ошибка регистрации'
    state.serverErrors = e?.response?.data?.errors || {}
  } finally {
    state.loading = false
  }
}
</script>

<template>
  <div class="container">
    <div class="auth-card" style="max-width: 520px; margin: 40px auto;">
      <h1 class="title">Регистрация</h1>
      <p class="subtitle">Создание учётной записи пользователя</p>

      <div class="form">
        <label class="label">
          Имя
          <input class="input" v-model="form.name" maxlength="100" />
        </label>

        <label class="label">
          Email
          <input class="input" v-model="form.email" type="email" maxlength="120" />
        </label>

        <label class="label">
          Телефон
          <input class="input" v-model="form.phone" type="text" maxlength="20" placeholder="+7..." />
        </label>

        <label class="label">
          Пароль
          <input class="input" v-model="form.password" type="password" />
        </label>

        <label class="label">
          Подтверждение пароля
          <input class="input" v-model="form.confirmPassword" type="password" />
        </label>

        <div class="rules">
          <div :class="{ ok: passwordRules.minLength }">Минимум 8 символов</div>
          <div :class="{ ok: passwordRules.hasUpper }">Хотя бы 1 заглавная буква</div>
          <div :class="{ ok: passwordRules.hasLower }">Хотя бы 1 строчная буква</div>
          <div :class="{ ok: passwordRules.hasDigit }">Хотя бы 1 цифра</div>
          <div :class="{ ok: passwordRules.hasSpecial }">Хотя бы 1 спецсимвол</div>
        </div>

        <label style="display:flex; gap:10px; align-items:flex-start;">
          <input type="checkbox" v-model="form.agree" />
          <span>Я согласен на обработку персональных данных</span>
        </label>

        <div v-if="state.error" class="error">{{ state.error }}</div>
        <div v-if="state.success" class="success">{{ state.success }}</div>

        <button class="btn btn-primary" @click="register" :disabled="state.loading">
          {{ state.loading ? 'Регистрация...' : 'Зарегистрироваться' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form { display:flex; flex-direction:column; gap:12px; }
.rules {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  font-size: 14px;
  display:flex;
  flex-direction:column;
  gap:6px;
}
.ok { color: green; font-weight: 700; }
.error {
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.25);
  color: #b91c1c;
  border-radius: 12px;
  padding: 10px 12px;
}
.success {
  background: rgba(34,197,94,.08);
  border: 1px solid rgba(34,197,94,.25);
  color: #166534;
  border-radius: 12px;
  padding: 10px 12px;
}
</style>