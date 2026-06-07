import { api } from '../api'

export async function getRewards(params = {}) {
  const { data } = await api.get('/rewards', { params })
  return data
}

export async function getReward(id) {
  const { data } = await api.get(`/rewards/${id}`)
  return data
}

export async function createReward(formData) {
  const { data } = await api.post('/rewards', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export async function updateReward(id, formData) {
  const { data } = await api.post(`/rewards/${id}?_method=PUT`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export async function deleteReward(id) {
  const { data } = await api.delete(`/rewards/${id}`)
  return data
}

export async function getRewardOrders(params = {}) {
  const { data } = await api.get('/reward-orders', { params })
  return data
}

export async function createRewardOrder(rewardId) {
  const { data } = await api.post('/reward-orders', {
    reward_id: rewardId,
  })
  return data
}

export async function updateRewardOrder(id, payload) {
  const { data } = await api.put(`/reward-orders/${id}`, payload)
  return data
}