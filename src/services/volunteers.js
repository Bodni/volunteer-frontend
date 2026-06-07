import { api } from '../api'

export async function getVolunteers() {
  const { data } = await api.get('/volunteers')
  return data
}