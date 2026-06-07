import { api } from '../api'

export async function getAnimals(params = {}) {
  const { data } = await api.get('/animals', { params })
  return data
}

export async function getAnimal(id) {
  const { data } = await api.get(`/animals/${id}`)
  return data
}