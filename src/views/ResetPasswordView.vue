<template>
  <main class="auth-page">
    <section class="auth-card">
      <h1>Восстановление пароля</h1>

      <p class="auth-text">
        Введите email, получите код подтверждения и задайте новый пароль.
      </p>

      <form class="auth-form" @submit.prevent="sendCode">
        <label>
          Email
          <input
            v-model.trim="email"
            type="email"
            required
            placeholder="Введите email"
          />
        </label>

        <button type="submit" :disabled="codeLoading">
          {{ codeLoading ? 'Отправляем...' : 'Получить код' }}
        </button>
      </form>

      <form class="auth-form" @submit.prevent="changePassword">
        <label>
          Код из письма
          <input
            v-model.trim="code"
            type="text"
            required
            maxlength="6"
            placeholder="Например 123456"
          />
        </label>

        <label>
          Новый пароль
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            placeholder="Минимум 8 символов"
          />
        </label>

        <label>
          Повторите пароль
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            placeholder="Повторите пароль"
          />
        </label>

        <button type="submit" :disabled="resetLoading">
          {{ resetLoading ? 'Сохраняем...' : 'Изменить пароль' }}
        </button>
      </form>

      <p v-if="message" class="message success">{{ message }}</p>
      <p v-if="error" class="message error">{{ error }}</p>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { forgotPassword, resetPassword } from '../auth'

const email = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')

const codeLoading = ref(false)
const resetLoading = ref(false)

const message = ref('')
const error = ref('')

async function sendCode() {
  message.value = ''
  error.value = ''

  if (!email.value) {
    error.value = 'Введите email'
    return
  }

  codeLoading.value = true

  try {
    const data = await forgotPassword(email.value)

    message.value = data.message || 'Код отправлен на email'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Не удалось отправить код'
  } finally {
    codeLoading.value = false
  }
}

async function changePassword() {
  message.value = ''
  error.value = ''

  if (!email.value || !code.value || !password.value || !confirmPassword.value) {
    error.value = 'Заполните все поля'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Пароли не совпадают'
    return
  }

  resetLoading.value = true

  try {
    const data = await resetPassword(
      email.value,
      code.value,
      password.value,
      confirmPassword.value
    )

    message.value = data.message || 'Пароль успешно изменён'

    code.value = ''
    password.value = ''
    confirmPassword.value = ''
  } catch (e) {
    error.value = e?.response?.data?.message || 'Не удалось изменить пароль'
  } finally {
    resetLoading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.auth-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 18px 45px rgba(31, 41, 55, 0.12);
}

.auth-card h1 {
  margin: 0 0 12px;
  font-size: 28px;
}

.auth-text {
  margin: 0 0 22px;
  color: #6b7280;
  line-height: 1.5;
}

.auth-form {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.auth-form label {
  display: grid;
  gap: 7px;
  font-weight: 700;
  color: #374151;
}

.auth-form input {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 15px;
  outline: none;
}

.auth-form input:focus {
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
}

.auth-form button {
  border: 0;
  border-radius: 14px;
  padding: 12px 16px;
  background: #f97316;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.auth-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  font-weight: 700;
}

.success {
  background: #ecfdf3;
  color: #027a48;
}

.error {
  background: #fff1f3;
  color: #b42318;
}
</style>