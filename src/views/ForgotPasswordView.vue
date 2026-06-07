<script setup>
import { reactive } from 'vue'

const form = reactive({
  email: ''
})

const state = reactive({
  loading: false,
  error: '',
  success: ''
})

async function submitEmail() {
  state.error = ''
  state.success = ''

  if (!form.email.trim()) {
    state.error = 'Введите email'
    return
  }

  try {
    state.loading = true

    await fetch('http://localhost:3000/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.trim().toLowerCase() })
    })

    state.success = 'Если аккаунт существует, ссылка для восстановления отправлена'
  } catch (e) {
    state.error = 'Ошибка при отправке запроса'
  } finally {
    state.loading = false
  }
}
</script>

<template>
  <div class="container">
    <div class="auth-card" style="max-width: 500px; margin: 40px auto;">
      <h1 class="auth-title">Восстановление пароля</h1>

      <div class="auth-form">
        <label class="label">
          Email
          <input v-model="form.email" type="email" class="input" />
        </label>

        <div v-if="state.error" class="auth-error">{{ state.error }}</div>
        <div v-if="state.success" class="auth-success">{{ state.success }}</div>

        <button class="btn btn-primary auth-btn" @click="submitEmail" :disabled="state.loading">
          {{ state.loading ? 'Отправка...' : 'Отправить ссылку' }}
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