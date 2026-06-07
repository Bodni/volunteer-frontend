<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { login as loginApi } from '../auth'

const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})

const state = reactive({
  loading: false,
  error: '',
})

async function handleLogin() {
  state.error = ''
  state.loading = true

  try {
    const data = await loginApi(form.email, form.password)

    if (data?.user?.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/profile')
    }
  } catch (e) {
    state.error =
      e?.response?.data?.message ||
      e?.response?.data?.errors?.email?.[0] ||
      'Ошибка входа'
  } finally {
    state.loading = false
  }
}
</script>

<template>
  <div class="container">
    <div class="auth-card" style="max-width: 520px; margin: 40px auto;">
      <h1 class="auth-title">Вход</h1>

      <div class="auth-form">
        <label class="label">
          Email
          <input class="input" v-model="form.email" type="email" />
        </label>

        <label class="label">
          Пароль
          <input class="input" v-model="form.password" type="password" />
        </label>

        <div v-if="state.error" class="auth-error">{{ state.error }}</div>

        <button class="btn btn-primary auth-btn" @click="handleLogin" :disabled="state.loading">
          {{ state.loading ? 'Проверка...' : 'Войти' }}
        </button>

        <RouterLink to="/forgot-password" style="margin-top: 10px;">
          Забыли пароль?
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap{
  min-height: calc(100vh - 140px);
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 24px 0;
}

.auth-card{
  width: 100%;
  max-width: 520px;
  background:#fff;
  border:1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 22px;
}

.auth-head{ margin-bottom: 14px; }
.auth-title{ margin:0; font-size: 32px; font-weight: 900; }
.auth-sub{ margin-top: 6px; color: var(--muted); font-size: 13px; }

.auth-form{
  display:flex;
  flex-direction:column;
  gap: 12px;
}

.auth-error{
  border: 1px solid rgba(239,68,68,.25);
  background: rgba(239,68,68,.10);
  color: #b91c1c;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 800;
}

.auth-btn{
  margin-top: 4px;
  width: 100%;
}

.auth-demo{
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
</style>