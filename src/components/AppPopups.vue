<script setup>
import {
  toast,
  confirmModal,
  confirmYes,
  confirmNo,
} from '../utils/notify'
</script>

<template>
  <div
    v-if="toast.show"
    class="toast"
    :class="toast.type"
  >
    {{ toast.message }}
  </div>

  <div v-if="confirmModal.show" class="modal-overlay">
    <div class="confirm-card">
      <h3>Подтверждение</h3>

      <p>{{ confirmModal.message }}</p>

      <div class="confirm-actions">
        <button class="btn ghost" @click="confirmNo">
          Отмена
        </button>

        <button class="btn danger" @click="confirmYes">
          Подтвердить
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 99999;

  padding: 14px 18px;
  border-radius: 14px;

  background: #111827;
  color: white;

  font-weight: 700;

  box-shadow: 0 12px 30px rgba(0,0,0,.25);
}

.toast.success {
  background: #16a34a;
}

.toast.error {
  background: #dc2626;
}

.toast.info {
  background: #2563eb;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 99998;

  background: rgba(0,0,0,.45);

  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-card {
  width: 100%;
  max-width: 420px;

  background: white;
  border-radius: 20px;

  padding: 20px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  margin-top: 20px;
}
</style>