import { api } from '../api'

export async function getUsers(params = {}) {
  const { data } = await api.get('/users', { params })
  return data
}

export async function createUser(payload) {
  const { data } = await api.post('/users', payload)
  return data
}

export async function deleteUser(id) {
  const { data } = await api.delete(`/users/${id}`)
  return data
}

export async function resetUserPassword(id, password) {
  const { data } = await api.post(`/users/${id}/reset-password`, { password })
  return data
}

export async function addUserPoints(id, delta) {
  const { data } = await api.post(`/users/${id}/points`, { delta })
  return data
}

export async function updateUserAvatar(id, file) {
  const formData = new FormData()
  formData.append('avatar', file)

  const { data } = await api.post(`/users/${id}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}

export async function getBestVolunteer() {
  const { data } = await api.get('/best-volunteer')
  return data
}

export async function getTopVolunteers() {
  const { data } = await api.get('/top-volunteers')
  return data
}