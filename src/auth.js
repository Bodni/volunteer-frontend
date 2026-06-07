import { api } from './api'

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)

  if (data.token) localStorage.setItem('token', data.token)
  if (data.user?.role) localStorage.setItem('role', data.user.role)

  return data
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })

  if (data.token) localStorage.setItem('token', data.token)
  if (data.user?.role) localStorage.setItem('role', data.user.role)

  return data
}

export async function forgotPassword(email) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token, password, confirmPassword, email) {
  const { data } = await api.post('/auth/reset-password', {
    token,
    password,
    confirmPassword,
    email,
  })
  return data
}

export async function me() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
  }
}