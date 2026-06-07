import { reactive } from 'vue'

export const toast = reactive({
  show: false,
  message: '',
  type: 'info',
  timer: null,
})

export const confirmModal = reactive({
  show: false,
  message: '',
  resolve: null,
})

export function notify(message, type = 'info') {
  if (toast.timer) {
    clearTimeout(toast.timer)
  }

  toast.message = message
  toast.type = type
  toast.show = true

  toast.timer = setTimeout(() => {
    toast.show = false
  }, 3000)
}

export function askConfirm(message) {
  confirmModal.message = message
  confirmModal.show = true

  return new Promise((resolve) => {
    confirmModal.resolve = resolve
  })
}

export function confirmYes() {
  confirmModal.show = false
  confirmModal.resolve?.(true)
  confirmModal.resolve = null
}

export function confirmNo() {
  confirmModal.show = false
  confirmModal.resolve?.(false)
  confirmModal.resolve = null
}