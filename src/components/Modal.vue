<template>
  <div v-if="visible" class="modal-overlay" :class="{ 'clickable': !disableOverlayClose }" @click.self="handleOverlayClick">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button v-if="!hideCloseButton" class="btn-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  hideCloseButton: {
    type: Boolean,
    default: false
  },
  disableOverlayClose: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

function handleOverlayClick() {
  if (props.disableOverlayClose) {
    return;
  }
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 20px;
  box-sizing: border-box;
  animation: fadeIn 0.3s ease;
}

.modal-overlay.clickable {
  cursor: pointer;
}

.modal-overlay:not(.clickable) {
  cursor: default;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.95));
  border-radius: 20px;
  border: 2px solid rgba(255, 215, 0, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  color: white;
  font-size: 20px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: color 0.3s ease;
}

.btn-close:hover {
  color: white;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 平板和小屏幕适配 (≤768px) */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-width: none;
    margin: 10px;
    max-height: 90vh;
    border-radius: 16px;
  }

  .modal-overlay {
    padding: 10px;
  }
}

/* 大屏幕适配 (≥1400px) */
@media (min-width: 1400px) {
  .modal-content {
    max-width: 700px;
  }
}

/* 手机端横屏适配 */
@media (max-height: 500px) {
  .modal-overlay {
    padding: 8px;
  }

  .modal-content {
    width: auto !important;
    max-width: 380px !important;
    max-height: 88vh !important;
    border-radius: 14px !important;
  }

  .modal-header {
    padding: 10px 14px !important;
  }

  .modal-header h3 {
    font-size: 16px !important;
  }

  .btn-close {
    font-size: 20px !important;
  }

  .modal-body {
    padding: 12px 14px !important;
  }

  .modal-footer {
    padding: 10px 14px !important;
    gap: 8px !important;
  }
}
</style>
