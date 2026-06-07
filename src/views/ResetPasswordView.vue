<script setup>
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const form = reactive({
  password: '',
  confirmPassword: ''
})

const state = reactive({
  loading: false,
  error: '',
  success: ''
})

function validatePassword(password) {
  return (
    password.length >= 8 &&
    /[A-ZА-ЯЁ]/.test(password) &&
    /[a-zа-яё]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_\-+=[\]{};:'"\\|,.<>/?]/.test(password)
  )
}

async function resetPassword() {
  state.error = ''
  state.success = ''

  if (!form.password || !form.confirmPassword) {
    state.error = 'Заполните все поля'
    return
  }

  if (form.password !== form.confirmPassword) {
    state.error = 'Пароли не совпадают'
    return
  }

  if (!validatePassword(form.password)) {
    state.error = 'Пароль должен содержать 8+ символов, заглавную, строчную букву, цифру и спецсимвол'
    return
  }

  try {
    state.loading = true

    const res = await fetch('http://localhost:3000/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: route.params.token,
        password: form.password,
        confirmPassword: form.confirmPassword
      })
    })

    const data = await res.json()

    if (!res.ok) {
      state.error = data.message || 'Ошибка сброса пароля'
      return
    }

    state.success = 'Пароль успешно изменён'

    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (e) {
    state.error = 'Ошибка соединения с сервером'
  } finally {
    state.loading = false
  }
}
</script>

<template>
  <div class="container">
    <div class="auth-card" style="max-width: 500px; margin: 40px auto;">
      <h1 class="auth-title">Сброс пароля</h1>

      <div class="auth-form">
        <label class="label">
          Новый пароль
          <input v-model="form.password" type="password" class="input" />
        </label>

        <label class="label">
          Подтверждение пароля
          <input v-model="form.confirmPassword" type="password" class="input" />
        </label>

        <div v-if="state.error" class="auth-error">{{ state.error }}</div>
        <div v-if="state.success" class="auth-success">{{ state.success }}</div>

        <button class="btn btn-primary auth-btn" @click="resetPassword" :disabled="state.loading">
          {{ state.loading ? 'Сохранение...' : 'Сменить пароль' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.auth-error {
  color: #b91c1c;
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.25);
  border-radius: 12px;
  padding: 10px 12px;
}
.auth-success {
  color: #166534;
  background: rgba(34,197,94,.08);
  border: 1px solid rgba(34,197,94,.25);
  border-radius: 12px;
  padding: 10px 12px;
}
.auth-btn {
  width: 100%;
}
</style>