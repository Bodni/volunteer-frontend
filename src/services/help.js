import { api } from '../api'

export async function getFoundRequests() {
  const { data } = await api.get('/found-requests')
  return data
}

export async function createFoundRequest(payload) {
  const isFormData = payload instanceof FormData

  const { data } = await api.post('/found-requests', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })

  return data
}

export async function getAdoptionRequests() {
  const { data } = await api.get('/adoption-requests')
  return data
}

export async function createAdoptionRequest(payload) {
  const { data } = await api.post('/adoption-requests', payload)
  return data
}