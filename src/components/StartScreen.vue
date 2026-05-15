<template>
  <div class="start-screen">
    <div class="start-container">
      <div class="start-header">
        <h1>🎯 大富翁游戏</h1>
        <p class="subtitle">选择玩家配置开始游戏</p>
      </div>
      
      <div v-if="hasSave" class="save-buttons">
        <button class="continue-btn" @click="continueGame">
          ▶️ 继续游戏
        </button>
      </div>
      
      <div class="player-selector">
        <div class="selector-group">
          <label class="selector-label">👤 真人玩家</label>
          <div class="stepper">
            <button 
              class="stepper-btn" 
              :class="{ disabled: humanCount <= 1 }"
              @click="decreaseHuman"
            >
              -
            </button>
            <span class="stepper-value">{{ humanCount }}</span>
            <button 
              class="stepper-btn" 
              :class="{ disabled: humanCount >= 4 || (humanCount + aiCount) >= 4 }"
              @click="increaseHuman"
            >
              +
            </button>
          </div>
        </div>
        
        <div class="selector-group">
          <label class="selector-label">🤖 AI玩家</label>
          <div class="stepper">
            <button 
              class="stepper-btn" 
              :class="{ disabled: aiCount <= 0 || (humanCount + aiCount) <= 2 }"
              @click="decreaseAI"
            >
              -
            </button>
            <span class="stepper-value">{{ aiCount }}</span>
            <button 
              class="stepper-btn" 
              :class="{ disabled: aiCount >= 3 || (humanCount + aiCount) >= 4 }"
              @click="increaseAI"
            >
              +
            </button>
          </div>
        </div>
      </div>
      
      <div class="total-players">
        <span class="total-label">总玩家数:</span>
        <span class="total-value">{{ humanCount + aiCount }}</span>
        <span class="total-info">(最少2人，最多4人)</span>
      </div>
      
      <button 
        class="start-btn" 
        :class="{ disabled: (humanCount + aiCount) < 2 || (humanCount + aiCount) > 4 }"
        @click="startGame"
      >
        🎮 开始游戏
      </button>
      
      <button class="load-btn" @click="showLoadModal = true">
        📂 读取存档
      </button>
      
      <div class="game-rules">
        <h3>📜 游戏规则</h3>
        <ul>
          <li>🏃 掷骰子移动角色</li>
          <li>🏠 购买和升级地产收取租金</li>
          <li>🎴 抽到机会卡和命运卡</li>
          <li>💸 让对手破产获胜</li>
        </ul>
      </div>
    </div>
    
    <SaveLoadModal
      v-if="showLoadModal"
      mode="load"
      @close="showLoadModal = false"
      @confirm="handleLoadGame"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { hasAutoSave, loadGame } from '../utils/saveManager';
import SaveLoadModal from './SaveLoadModal.vue';

const emit = defineEmits(['start', 'load']);

const humanCount = ref(2);
const aiCount = ref(2);
const hasSave = ref(false);
const showLoadModal = ref(false);

function decreaseHuman() {
  if (humanCount.value > 1 && (humanCount.value + aiCount.value) > 2) {
    humanCount.value--;
  }
}

function increaseHuman() {
  if (humanCount.value < 4 && (humanCount.value + aiCount.value) < 4) {
    humanCount.value++;
  }
}

function decreaseAI() {
  if (aiCount.value > 0 && (humanCount.value + aiCount.value) > 2) {
    aiCount.value--;
  }
}

function increaseAI() {
  if (aiCount.value < 3 && (humanCount.value + aiCount.value) < 4) {
    aiCount.value++;
  }
}

function startGame() {
  if (humanCount.value + aiCount.value >= 2 && humanCount.value + aiCount.value <= 4) {
    emit('start', { humanCount: humanCount.value, aiCount: aiCount.value });
  }
}

function checkForSave() {
  hasSave.value = hasAutoSave();
}

function continueGame() {
  const saveData = loadGame(0);
  if (saveData) {
    emit('load', saveData);
  }
}

function handleLoadGame(slotIndex) {
  const saveData = loadGame(slotIndex);
  if (saveData) {
    emit('load', saveData);
    showLoadModal.value = false;
  }
}

onMounted(() => {
  checkForSave();
});
</script>

<style scoped>
.start-screen {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  padding: 20px;
}

.start-container {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 450px;
  width: 100%;
}

.start-header {
  text-align: center;
  margin-bottom: 40px;
}

.start-header h1 {
  color: white;
  font-size: 36px;
  margin: 0 0 10px 0;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4);
}

.subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin: 0;
}

.player-selector {
  display: flex;
  justify-content: space-around;
  gap: 20px;
  margin-bottom: 30px;
}

.selector-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.selector-label {
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stepper-btn {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.stepper-btn:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.stepper-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper-value {
  font-size: 32px;
  font-weight: bold;
  color: white;
  min-width: 40px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.total-players {
  text-align: center;
  margin-bottom: 30px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.total-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
}

.total-value {
  font-size: 28px;
  font-weight: bold;
  color: #FFD700;
  margin: 0 10px;
}

.total-info {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.save-buttons {
  margin-bottom: 20px;
}

.continue-btn {
  width: 100%;
  padding: 18px;
  border-radius: 16px;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a2e;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px rgba(255, 215, 0, 0.4);
  margin-bottom: 15px;
}

.continue-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(255, 215, 0, 0.5);
}

.start-btn {
  width: 100%;
  padding: 18px;
  border-radius: 16px;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px rgba(76, 175, 80, 0.4);
  margin-bottom: 15px;
}

.start-btn:hover:not(.disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(76, 175, 80, 0.5);
}

.start-btn.disabled {
  background: rgba(100, 100, 100, 0.5);
  cursor: not-allowed;
  box-shadow: none;
}

.load-btn {
  width: 100%;
  padding: 15px;
  border-radius: 16px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transition: all 0.3s ease;
  margin-bottom: 30px;
}

.load-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.game-rules {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
}

.game-rules h3 {
  color: #FFD700;
  margin: 0 0 15px 0;
  font-size: 16px;
}

.game-rules ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.game-rules li {
  color: rgba(255, 255, 255, 0.9);
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.game-rules li:last-child {
  border-bottom: none;
}
</style>