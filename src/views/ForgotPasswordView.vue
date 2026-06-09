<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-header">
        <h1>Восстановление пароля</h1>
        <p>
          Введите email, получите код подтверждения и задайте новый пароль.
        </p>
      </div>

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

        <button class="primary-btn" type="submit" :disabled="codeLoading">
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

        <button class="primary-btn" type="submit" :disabled="resetLoading">
          {{ resetLoading ? 'Сохраняем...' : 'Изменить пароль' }}
        </button>
      </form>

      <RouterLink class="secondary-btn" to="/login">
        Вернуться к авторизации
      </RouterLink>

      <p v-if="message" class="message success">{{ message }}</p>
      <p v-if="error" class="message error">{{ error }}</p>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
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
  padding: 42px 16px;
  background: #f5f7fb;
}

.auth-card {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 28px;
  padding: 32px;
  box-shadow: 0 20px 55px rgba(31, 41, 55, 0.12);
}

.auth-header {
  margin-bottom: 24px;
}

.auth-header h1 {
  margin: 0 0 10px;
  font-size: 30px;
  line-height: 1.2;
  color: #111827;
}

.auth-header p {
  margin: 0;
  color: #6b7280;
  line-height: 1.5;
  font-size: 15px;
}

.auth-form {
  display: grid;
  gap: 15px;
  margin-top: 18px;
}

.auth-form label {
  display: grid;
  gap: 8px;
  font-weight: 700;
  color: #374151;
  font-size: 14px;
}

.auth-form input {
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 16px;
  padding: 13px 15px;
  font-size: 15px;
  outline: none;
  transition: 0.2s ease;
}

.auth-form input:focus {
  border-color: #fb923c;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.14);
}

.primary-btn,
.secondary-btn {
  width: 100%;
  min-height: 46px;
  border-radius: 16px;
  padding: 13px 18px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s ease;
  text-align: center;
  text-decoration: none;
}

.primary-btn {
  border: 0;
  background: #f59e0b;
  color: #000000;
  box-shadow: none;
}

.primary-btn:hover:not(:disabled) {
  background: #f59e0b;
  opacity: 0.9;
  transform: none;
  box-shadow: none;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.secondary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  border: 1px solid #fed7aa;
  background: #fff7ed;
  color: #c2410c;
}

.secondary-btn:hover {
  background: #ffedd5;
  border-color: #fb923c;
}

.message {
  margin-top: 18px;
  padding: 13px 15px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 14px;
  line-height: 1.4;
}

.success {
  background: #ecfdf3;
  color: #027a48;
  border: 1px solid #abefc6;
}

.error {
  background: #fff1f3;
  color: #b42318;
  border: 1px solid #fecdd3;
}

@media (max-width: 520px) {
  .auth-page {
    align-items: flex-start;
    padding: 24px 12px;
  }

  .auth-card {
    border-radius: 22px;
    padding: 24px 18px;
  }

  .auth-header h1 {
    font-size: 25px;
  }

  .auth-header p {
    font-size: 14px;
  }

  .auth-form {
    gap: 13px;
  }

  .auth-form input {
    padding: 12px 13px;
    font-size: 14px;
  }

  .primary-btn,
  .secondary-btn {
    min-height: 44px;
    font-size: 14px;
    border-radius: 14px;
  }
}
</style>