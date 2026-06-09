<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "../auth";

const router = useRouter();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");

function getErrorMessage(e, fallback = "Произошла ошибка") {
  const data = e?.response?.data;

  if (data?.errors) {
    const firstError = Object.values(data.errors)?.[0]?.[0];

    if (firstError) {
      return translateLoginError(firstError);
    }
  }

  if (data?.message) {
    return translateLoginError(data.message);
  }

  return fallback;
}

function translateLoginError(message) {
  const translations = {
    "The email field is required.": "Поле email обязательно для заполнения.",
    "The password field is required.":
      "Поле пароля обязательно для заполнения.",
    "The email must be a valid email address.": "Введите корректный email.",
    "These credentials do not match our records.": "Неверный email или пароль.",
    "Invalid credentials": "Неверный email или пароль.",
    "Unauthenticated.": "Необходимо авторизоваться.",
  };

  return translations[message] || message;
}

async function handleLogin() {
  error.value = "";

  const cleanEmail = email.value.trim();

  if (!cleanEmail || !password.value) {
    error.value = "Заполните email и пароль";
    return;
  }

  loading.value = true;

  try {
    await login(cleanEmail, password.value);
    router.push("/profile");
  } catch (e) {
    console.error(e);
    error.value = getErrorMessage(e, "Неверный email или пароль");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="container">
    <div class="auth-card" style="max-width: 520px; margin: 40px auto">
      <h1 class="auth-title">Вход</h1>

      <form class="auth-form" @submit.prevent="handleLogin">
        <label class="label">
          Email
          <input class="input" v-model="email" type="email" />
        </label>

        <label class="label">
          Пароль

          <div class="password-field">
            <input
              class="input password-input"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
            />

            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? "Скрыть" : "Показать" }}
            </button>
          </div>
        </label>

        <div v-if="error" class="auth-error">{{ error }}</div>

        <button
          class="btn btn-primary auth-btn"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? "Проверка..." : "Войти" }}
        </button>

        <RouterLink to="/forgot-password" style="margin-top: 10px">
          Забыли пароль?
        </RouterLink>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.auth-card {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 22px;
}

.auth-head {
  margin-bottom: 14px;
}
.auth-title {
  margin: 0;
  font-size: 32px;
  font-weight: 900;
}
.auth-sub {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-error {
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 800;
}

.auth-btn {
  margin-top: 4px;
  width: 100%;
}

.auth-demo {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.password-field {
  position: relative;
  width: 100%;
}

.password-input {
  padding-right: 105px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #f59e0b;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  padding: 6px 8px;
}

.password-toggle:hover {
  color: #d97706;
}
@media (max-width: 520px) {
  .password-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .password-input {
    padding-right: 14px;
  }

  .password-toggle {
    position: static;
    transform: none;
    width: 100%;
    border: 1px solid #f59e0b;
    border-radius: 12px;
    background: #fff7ed;
    color: #111827;
    padding: 10px 12px;
    text-align: center;
  }

  .password-toggle:hover {
    background: #ffedd5;
    color: #111827;
  }
}
</style>
