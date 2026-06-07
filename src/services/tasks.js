import { api } from '../api'

export async function getTasks(params = {}) {
  const { data } = await api.get('/tasks', { params })
  return data
}

export async function getTask(id) {
  const { data } = await api.get(`/tasks/${id}`)
  return data
}

export async function createTask(payload) {
  const isFormData = payload instanceof FormData

  const { data } = await api.post('/tasks', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })

  return data
}

export async function updateTask(id, payload) {
  const isFormData = payload instanceof FormData

  if (isFormData) {
    const { data } = await api.post(`/tasks/${id}?_method=PUT`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const { data } = await api.put(`/tasks/${id}`, payload)
  return data
}