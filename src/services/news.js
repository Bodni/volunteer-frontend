import { api } from '../api'

export async function getNews(params = {}) {
  const { data } = await api.get('/news', { params })
  return data
}

export async function getNewsItem(id) {
  const { data } = await api.get(`/news/${id}`)
  return data
}

export async function createNews(payload) {
  const isFormData = payload instanceof FormData

  const { data } = await api.post('/news', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })

  return data
}

export async function updateNews(id, payload) {
  const isFormData = payload instanceof FormData

  if (isFormData) {
    const { data } = await api.post(`/news/${id}?_method=PUT`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const { data } = await api.put(`/news/${id}`, payload)
  return data
}

export async function deleteNews(id) {
  const { data } = await api.delete(`/news/${id}`)
  return data
}