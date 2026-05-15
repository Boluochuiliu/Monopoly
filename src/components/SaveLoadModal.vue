<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2 class="modal-title">
        {{ mode === 'save' ? '💾 保存游戏' : '📂 读取存档' }}
      </h2>
      
      <div class="save-slots">
        <div
          v-for="save in saveSlots"
          :key="save.slotIndex"
          class="save-slot"
          :class="{ active: selectedSlot === save.slotIndex, disabled: !save.timestamp && mode === 'load' }"
          @click="selectSlot(save.slotIndex)"
        >
          <div class="slot-header">
            <span class="slot-name">{{ save.isAuto ? '自动存档' : `存档 ${save.slotIndex}` }}</span>
            <span v-if="save.isAuto" class="auto-badge">自动</span>
          </div>
          <div v-if="save.timestamp" class="slot-info">
            <div class="slot-time">{{ formatTime(save.timestamp) }}</div>
            <div class="slot-details">
              {{ save.playerCount }} 玩家 · 第 {{ save.round }} 回合
            </div>
          </div>
          <div v-else class="slot-empty">空存档位</div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button
          class="btn btn-primary"
          :disabled="selectedSlot === null && mode === 'save' || (selectedSlot === null && mode === 'load')"
          @click="confirmAction"
        >
          {{ mode === 'save' ? '保存' : '读取' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAllSaveInfo } from '../utils/saveManager';

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['save', 'load'].includes(value)
  }
});

const emit = defineEmits(['close', 'confirm']);

const saveSlots = ref([]);
const selectedSlot = ref(props.mode === 'save' ? 1 : null);

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function selectSlot(index) {
  if (!saveSlots.value[index]?.timestamp && props.mode === 'load') return;
  selectedSlot.value = index;
}

function confirmAction() {
  if (selectedSlot.value !== null) {
    emit('confirm', selectedSlot.value);
  }
}

function refreshSaves() {
  saveSlots.value = getAllSaveInfo();
}

onMounted(() => {
  refreshSaves();
});
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
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%);
  border-radius: 24px;
  padding: 32px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-title {
  font-size: 24px;
  font-weight: bold;
  color: white;
  text-align: center;
  margin: 0 0 24px 0;
}

.save-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.save-slot {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.save-slot:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.save-slot.active {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.1);
}

.save-slot.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.slot-name {
  font-weight: 600;
  color: white;
}

.auto-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
  border-radius: 8px;
}

.slot-info {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.slot-time {
  margin-bottom: 4px;
}

.slot-details {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.slot-empty {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 12px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a2e;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>