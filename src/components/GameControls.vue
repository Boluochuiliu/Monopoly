<template>
  <div class="game-controls">
    <div class="controls-container">
      <div class="dice-section">
        <div class="dice-wrapper">
          <div class="dice-container" :class="{ rolling: isRolling, moving: isMoving }">
            <div v-if="diceResult" class="dice-result">
              <span class="dice-value">{{ diceResult }}</span>
            </div>
            <div v-else-if="isMoving" class="dice-placeholder moving-text">🚶</div>
            <div v-else class="dice-placeholder">🎲</div>
          </div>
          <div class="dice-shadow"></div>
        </div>
        
        <button
          class="btn btn-dice"
          :class="{ disabled: isRolling || isMoving || !canRoll }"
          :disabled="isRolling || isMoving || !canRoll"
          @click="$emit('roll')"
        >
          <span class="btn-icon">
            <span v-if="isRolling">🎲</span>
            <span v-else-if="isMoving">🚶</span>
            <span v-else>🎲</span>
          </span>
          <span class="btn-text">
            <span v-if="isRolling">掷骰中...</span>
            <span v-else-if="isMoving">移动中...</span>
            <span v-else>掷骰子</span>
          </span>
        </button>
      </div>
      
      <div class="info-section">
        <div class="info-card">
          <div class="info-icon">🎯</div>
          <div class="info-content">
            <div class="info-label">回合</div>
            <div class="info-value">{{ round }}</div>
          </div>
        </div>
        
        <div class="info-card">
          <div class="info-icon">👤</div>
          <div class="info-content">
            <div class="info-label">当前玩家</div>
            <div class="info-value player-name">{{ currentPlayer?.name || '-' }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="message-section">
      <div class="message-box">
        <div class="message-icon">💬</div>
        <p class="message-text">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  diceResult: {
    type: Number,
    default: null
  },
  isRolling: {
    type: Boolean,
    default: false
  },
  isMoving: {
    type: Boolean,
    default: false
  },
  canRoll: {
    type: Boolean,
    default: true
  },
  message: {
    type: String,
    default: ''
  },
  round: {
    type: Number,
    default: 1
  },
  currentPlayer: {
    type: Object,
    default: null
  }
});

defineEmits(['roll']);
</script>

<style scoped>
.game-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 24px;
  backdrop-filter: blur(15px);
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.controls-container {
  display: flex;
  align-items: center;
  gap: 32px;
}

.dice-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.dice-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
}

.dice-container {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 4px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 2;
}

.dice-container.rolling {
  animation: roll-dice 0.6s ease-in-out infinite;
}

.dice-container.moving {
  animation: pulse-move 1s ease-in-out infinite;
}

@keyframes roll-dice {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(90deg) scale(1.1);
  }
  50% {
    transform: rotate(180deg) scale(1.15);
  }
  75% {
    transform: rotate(270deg) scale(1.1);
  }
}

@keyframes pulse-move {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  }
}

.moving-text {
  animation: walk 0.6s ease-in-out infinite;
}

@keyframes walk {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

.dice-shadow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  filter: blur(4px);
}

.dice-placeholder {
  font-size: 48px;
  animation: float 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.dice-result {
  display: flex;
  justify-content: center;
  align-items: center;
}

.dice-value {
  font-size: 56px;
  font-weight: bold;
  color: #1a1a2e;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.btn {
  padding: 14px 28px;
  border-radius: 16px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.btn:hover::before {
  left: 100%;
}

.btn-dice {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a2e;
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
  border: 3px solid rgba(255, 255, 255, 0.5);
}

.btn-dice:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 28px rgba(255, 215, 0, 0.5);
}

.btn-dice:active:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
}

.btn-dice:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2));
}

.btn-text {
  font-size: 18px;
}

.info-section {
  display: flex;
  gap: 16px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.info-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.4);
}

.info-icon {
  font-size: 28px;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-value {
  font-size: 20px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.info-value.player-name {
  font-size: 16px;
}

.message-section {
  width: 100%;
  max-width: 800px;
}

.message-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
  border-radius: 16px;
  padding: 16px 20px;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.message-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

.message-text {
  color: white;
  font-size: 15px;
  margin: 0;
  line-height: 1.6;
  flex: 1;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
