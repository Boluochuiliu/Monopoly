<template>
  <div class="start-screen">
    <!-- 背景装饰层 -->
    <div class="bg-layer">
      <div class="bg-grid"></div>
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>
      <div class="bg-glow bg-glow-3"></div>
    </div>

    <!-- 桌面版容器 -->
    <div class="start-container-desktop">
      <div class="desktop-brand">
        <div class="brand-icon">🎲</div>
        <h1 class="brand-title">大富翁</h1>
        <p class="brand-subtitle">MONOPOLY</p>
        <div class="brand-divider"></div>
      </div>

      <div class="player-selector">
        <div class="selector-card">
          <div class="selector-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>真人玩家</span>
          </div>
          <div class="stepper">
            <button 
              class="stepper-btn" 
              :class="{ disabled: humanCount <= 1 }"
              @click="decreaseHuman"
            >−</button>
            <span class="stepper-value">{{ humanCount }}</span>
            <button 
              class="stepper-btn" 
              :class="{ disabled: humanCount >= 4 || (humanCount + aiCount) >= 4 }"
              @click="increaseHuman"
            >+</button>
          </div>
        </div>

        <div class="selector-card">
          <div class="selector-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>
            <span>AI 玩家</span>
          </div>
          <div class="stepper">
            <button 
              class="stepper-btn" 
              :class="{ disabled: aiCount <= 0 || (humanCount + aiCount) <= 2 }"
              @click="decreaseAI"
            >−</button>
            <span class="stepper-value">{{ aiCount }}</span>
            <button 
              class="stepper-btn" 
              :class="{ disabled: aiCount >= 3 || (humanCount + aiCount) >= 4 }"
              @click="increaseAI"
            >+</button>
          </div>
        </div>
      </div>

      <div class="total-display">
        <div class="total-info-text">
          <span class="total-label">总玩家数</span>
          <span class="total-count">{{ humanCount + aiCount }}</span>
          <span class="total-hint">/4 人</span>
        </div>
        <div class="total-dots">
          <div 
            v-for="n in 4" 
            :key="n" 
            class="dot"
            :class="{ active: n <= (humanCount + aiCount), human: n <= humanCount }"
          ></div>
        </div>
      </div>

      <div v-if="hasSave" class="continue-section">
        <button class="continue-btn" @click="continueGame">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <span>继续上次游戏</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      <button 
        class="start-btn" 
        :class="{ disabled: isStartDisabled }"
        @click="startGame"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 11h.01M19 11h.01"/></svg>
        <span>开始游戏</span>
      </button>

      <button class="load-btn" @click="showLoadModal = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span>读取存档</span>
      </button>

      <div class="online-section">
        <div class="online-divider">
          <span></span>
          <span class="divider-text">局域网联机</span>
          <span></span>
        </div>
        <div class="online-buttons">
          <button class="online-btn create-btn" @click="showCreateModal = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            <span>创建房间</span>
          </button>
          <button class="online-btn join-btn" @click="showJoinModal = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
            <span>加入房间</span>
          </button>
        </div>
      </div>

      <div class="game-rules">
        <div class="rules-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <span>游戏规则</span>
        </div>
        <ul class="rules-list">
          <li><span class="rule-icon">🎯</span>掷骰子移动角色</li>
          <li><span class="rule-icon">🏠</span>购买升级地产收租金</li>
          <li><span class="rule-icon">🃏</span>抽取机会卡和命运卡</li>
          <li><span class="rule-icon">💰</span>让对手破产即获胜</li>
        </ul>
      </div>
    </div>

    <!-- 移动端横屏容器 -->
    <div class="start-container-mobile">
      <!-- 左侧：品牌展示区 -->
      <div class="brand-section">
        <div class="brand-card">
          <div class="dice-stage">
            <div class="dice-3d">🎲</div>
            <div class="dice-ring"></div>
          </div>
          
          <h1 class="game-title">
            <span class="title-char" v-for="(char, i) in '大富翁'" :key="i" :style="{ animationDelay: `${i * 0.15}s` }">{{ char }}</span>
          </h1>
          
          <p class="game-subtitle">MONOPOLY</p>
          
          <div class="divider-fancy">
            <span></span>
            <span>◆</span>
            <span></span>
          </div>

          <div class="rules-panel">
            <div class="rules-title-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <span>游戏规则</span>
            </div>
            
            <ul class="rules-list">
              <li class="rule-item" v-for="(rule, idx) in gameRules" :key="idx" :style="{ animationDelay: `${0.6 + idx * 0.08}s` }">
                <span class="rule-marker">{{ rule.icon }}</span>
                <span>{{ rule.text }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 右侧：控制操作区 -->
      <div class="control-section">
        <!-- 继续游戏横幅 -->
        <Transition name="slide-down">
          <div v-if="hasSave" class="continue-card" @click="continueGame">
            <div class="continue-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <div class="continue-info">
              <span class="continue-label">继续上次游戏</span>
              <span class="continue-hint">点击立即恢复</span>
            </div>
            <svg class="continue-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </Transition>

        <!-- 玩家配置区 -->
        <div class="player-config">
          <div class="config-header">
            <span class="config-icon">⚙️</span>
            <span>玩家配置</span>
            <span class="config-badge">{{ humanCount + aiCount }}/4</span>
          </div>

          <div class="player-cards-row">
            <!-- 真人玩家卡 -->
            <div class="player-type-card">
              <div class="type-header">
                <div class="avatar-circle avatar-human">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <span class="type-name">真人</span>
              </div>
              
              <div class="count-stepper">
                <button 
                  class="stepper-action"
                  :class="{ inactive: humanCount <= 1 }"
                  @click="decreaseHuman"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14"/></svg>
                </button>
                
                <div class="count-display">
                  <span class="count-num">{{ humanCount }}</span>
                  <span class="count-unit">人</span>
                </div>
                
                <button 
                  class="stepper-action"
                  :class="{ inactive: humanCount >= 4 || (humanCount + aiCount) >= 4 }"
                  @click="increaseHuman"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
            </div>

            <!-- AI 玩家卡 -->
            <div class="player-type-card">
              <div class="type-header">
                <div class="avatar-circle avatar-ai">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                </div>
                <span class="type-name">AI</span>
              </div>
              
              <div class="count-stepper">
                <button 
                  class="stepper-action"
                  :class="{ inactive: aiCount <= 0 || (humanCount + aiCount) <= 2 }"
                  @click="decreaseAI"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14"/></svg>
                </button>
                
                <div class="count-display">
                  <span class="count-num">{{ aiCount }}</span>
                  <span class="count-unit">个</span>
                </div>
                
                <button 
                  class="stepper-action"
                  :class="{ inactive: aiCount >= 3 || (humanCount + aiCount) >= 4 }"
                  @click="increaseAI"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 玩家数量可视化 -->
          <div class="players-visualizer">
            <div 
              v-for="n in 4" 
              :key="n" 
              class="player-dot"
              :class="{ active: n <= (humanCount + aiCount), filled: n <= humanCount }"
            ></div>
          </div>
        </div>

        <!-- 操作按钮组 -->
        <div class="action-buttons">
          <button 
            class="btn-start"
            :class="isStartDisabled ? 'btn-disabled' : ''"
            @click="startGame"
          >
            <span class="btn-shine"></span>
            <svg class="btn-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 11h.01M19 11h.01"/></svg>
            <span class="btn-label">开始游戏</span>
            <svg class="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>

          <button class="btn-secondary" @click="showLoadModal = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>读取存档</span>
          </button>
        </div>
      </div>
    </div>
    
    <SaveLoadModal
      v-if="showLoadModal"
      mode="load"
      @close="showLoadModal = false"
      @confirm="handleLoadGame"
    />

    <Transition name="fade">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-content">
          <div class="modal-icon">🏠</div>
          <h3 class="modal-title">创建房间</h3>
          <div class="modal-field">
            <label class="modal-label">你的昵称</label>
            <input
              v-model="createName"
              class="modal-input"
              placeholder="输入昵称"
              maxlength="8"
              @keyup.enter="handleCreateRoom"
            />
          </div>
          <div v-if="onlineError" class="modal-error">{{ onlineError }}</div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" @click="showCreateModal = false">取消</button>
            <button
              class="modal-btn modal-btn-confirm"
              :class="{ disabled: !createName.trim() || isConnecting }"
              @click="handleCreateRoom"
            >
              {{ isConnecting ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showJoinModal" class="modal-overlay" @click.self="showJoinModal = false">
        <div class="modal-content">
          <div class="modal-icon">🚪</div>
          <h3 class="modal-title">加入房间</h3>
          <div class="modal-field">
            <label class="modal-label">房间号</label>
            <input
              v-model="joinRoomId"
              class="modal-input room-input"
              placeholder="输入6位房间号"
              maxlength="6"
            />
          </div>
          <div class="modal-field">
            <label class="modal-label">你的昵称</label>
            <input
              v-model="joinName"
              class="modal-input"
              placeholder="输入昵称"
              maxlength="8"
              @keyup.enter="handleJoinRoom"
            />
          </div>
          <div v-if="onlineError" class="modal-error">{{ onlineError }}</div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" @click="showJoinModal = false">取消</button>
            <button
              class="modal-btn modal-btn-confirm"
              :class="{ disabled: !joinRoomId.trim() || !joinName.trim() || isConnecting }"
              @click="handleJoinRoom"
            >
              {{ isConnecting ? '连接中...' : '加入' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { hasAutoSave, loadGame } from '../utils/saveManager';
import { useMultiplayer } from '../composables/useMultiplayer';
import SaveLoadModal from './SaveLoadModal.vue';

const emit = defineEmits(['start', 'load', 'createRoom', 'joinRoom']);

const humanCount = ref(2);
const aiCount = ref(2);
const hasSave = ref(false);
const showLoadModal = ref(false);

const showCreateModal = ref(false);
const showJoinModal = ref(false);
const createName = ref('');
const joinRoomId = ref('');
const joinName = ref('');
const onlineError = ref('');
const isConnecting = ref(false);

const multiplayer = useMultiplayer();

const isStartDisabled = computed(() => {
  return (humanCount.value + aiCount.value) < 2 || (humanCount.value + aiCount.value) > 4;
});

const gameRules = [
  { icon: '🎯', text: '掷骰子移动角色' },
  { icon: '🏠', text: '购买升级地产收租金' },
  { icon: '🃏', text: '抽取机会卡和命运卡' },
  { icon: '💰', text: '让对手破产即获胜' }
];

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

async function handleCreateRoom() {
  if (!createName.value.trim() || isConnecting.value) return;
  onlineError.value = '';
  isConnecting.value = true;
  try {
    const roomId = await multiplayer.createRoom(createName.value.trim());
    showCreateModal.value = false;
    isConnecting.value = false;
    emit('createRoom', { multiplayer, roomId, playerName: createName.value.trim() });
  } catch (err) {
    onlineError.value = multiplayer.connectionError.value || '创建失败，请重试';
    isConnecting.value = false;
  }
}

async function handleJoinRoom() {
  if (!joinRoomId.value.trim() || !joinName.value.trim() || isConnecting.value) return;
  onlineError.value = '';
  isConnecting.value = true;
  try {
    const roomId = await multiplayer.joinRoom(joinRoomId.value.trim(), joinName.value.trim());
    showJoinModal.value = false;
    isConnecting.value = false;
    emit('joinRoom', { multiplayer, roomId, playerName: joinName.value.trim() });
  } catch (err) {
    onlineError.value = multiplayer.connectionError.value || '加入失败，请重试';
    isConnecting.value = false;
  }
}

onMounted(() => {
  checkForSave();
});
</script>

<style scoped>
/* ==================== 基础样式与背景 ==================== */
.start-screen {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  padding: clamp(16px, 4vw, 40px);
  position: relative;
  overflow-x: hidden;
}

/* 背景装饰 */
.bg-layer {
  display: none;
}

/* ==================== 桌面版样式 - 响应式设计 ==================== */
.start-container-mobile {
  display: none;
}

.start-screen {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: clamp(16px, 3vh, 40px);
  overflow-y: auto;
}

.start-container-desktop {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 100%);
  backdrop-filter: blur(24px);
  border-radius: clamp(18px, 2.5vw, 28px);
  padding: clamp(18px, 3.5vh, 32px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.35),
    0 10px 30px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  width: 100%;
  max-width: min(400px, 86vw);
  position: relative;
  overflow: visible;
  margin-top: clamp(8px, 4vh, 50px);
}

/* 容器内部光效 */
.start-container-desktop::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.06) 0%, transparent 70%);
  pointer-events: none;
  animation: glow-float 8s ease-in-out infinite;
  z-index: 0;
}

@keyframes glow-float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-20px, 20px); }
}

/* 品牌区域 */
.desktop-brand {
  text-align: center;
  margin-bottom: clamp(16px, 3vh, 28px);
  position: relative;
  z-index: 2;
}

.brand-icon {
  font-size: clamp(36px, 6vw, 56px);
  line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35));
  margin-bottom: 8px;
  animation: dice-bounce 3s ease-in-out infinite;
}

@keyframes dice-bounce {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(90deg); }
  50% { transform: translateY(-3px) rotate(180deg); }
  75% { transform: translateY(-8px) rotate(270deg); }
}

.brand-title {
  font-size: clamp(26px, 5vw, 40px);
  font-weight: 900;
  letter-spacing: 4px;
  margin: 0 0 6px !important;
  background: linear-gradient(180deg, #ffffff 0%, #ffd700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
}

.brand-subtitle {
  font-size: clamp(11px, 1.8vw, 15px);
  letter-spacing: 6px;
  color: rgba(255, 215, 0, 0.75) !important;
  font-weight: 600;
  text-transform: uppercase;
  margin: 0 0 12px !important;
}

.brand-divider {
  width: clamp(60px, 10vw, 100px);
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.6), transparent);
  margin: 0 auto;
  border-radius: 2px;
}

/* 玩家选择器 */
.player-selector {
  display: flex;
  gap: clamp(8px, 1.8vw, 16px);
  margin-bottom: clamp(14px, 2.5vh, 22px);
  position: relative;
  z-index: 2;
}

/* 联机区域 */
.online-section {
  margin-bottom: clamp(14px, 2.5vh, 22px);
  position: relative;
  z-index: 2;
}

.online-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: clamp(10px, 1.5vh, 14px);
}

.online-divider span:first-child,
.online-divider span:last-child {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.divider-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  letter-spacing: 1px;
  white-space: nowrap;
}

.online-buttons {
  display: flex;
  gap: clamp(8px, 1.5vw, 12px);
}

.online-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: clamp(10px, 1.8vw, 14px);
  border-radius: clamp(10px, 1.8vw, 14px);
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.create-btn {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(25, 118, 210, 0.15) 100%);
  border-color: rgba(33, 150, 243, 0.4);
  color: rgba(255, 255, 255, 0.9);
}

.create-btn:hover {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.35) 0%, rgba(25, 118, 210, 0.25) 100%);
  border-color: rgba(33, 150, 243, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.3);
}

.join-btn {
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(123, 31, 162, 0.15) 100%);
  border-color: rgba(156, 39, 176, 0.4);
  color: rgba(255, 255, 255, 0.9);
}

.join-btn:hover {
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.35) 0%, rgba(123, 31, 162, 0.25) 100%);
  border-color: rgba(156, 39, 176, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(156, 39, 176, 0.3);
}

.online-btn:active {
  transform: translateY(0) scale(0.97);
}

/* 模态弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: linear-gradient(145deg, rgba(40, 40, 60, 0.95) 0%, rgba(25, 25, 45, 0.98) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: clamp(24px, 4vw, 32px);
  width: 100%;
  max-width: 380px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
}

.modal-icon {
  text-align: center;
  font-size: 36px;
  margin-bottom: 8px;
}

.modal-title {
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  color: white;
  margin: 0 0 20px;
  letter-spacing: 1px;
}

.modal-field {
  margin-bottom: 14px;
}

.modal-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.modal-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: white;
  font-size: 15px;
  font-weight: 600;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.15);
}

.modal-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.room-input {
  font-family: 'Courier New', monospace;
  letter-spacing: 4px;
  text-transform: uppercase;
  text-align: center;
  font-size: 20px;
}

.modal-error {
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.15);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  color: #ff8a80;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 14px;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.modal-btn-cancel {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
}

.modal-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.modal-btn-confirm {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.modal-btn-confirm:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
}

.modal-btn-confirm:active:not(.disabled) {
  transform: translateY(0) scale(0.98);
}

.modal-btn-confirm.disabled {
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.5), rgba(70, 70, 70, 0.4));
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.6;
}

.selector-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 1.5vw, 12px);
  padding: clamp(12px, 2vw, 16px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: clamp(10px, 1.8vw, 14px);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.selector-card:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: clamp(14px, 2.2vw, 18px);
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.selector-header svg {
  opacity: 0.85;
}

.stepper {
  display: flex;
  align-items: center;
  gap: clamp(12px, 2vw, 18px);
}

.stepper-btn {
  width: clamp(34px, 5.5vw, 42px);
  height: clamp(34px, 5.5vw, 42px);
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: clamp(16px, 2.8vw, 22px);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  justify-content: center;
  align-items: center;
}

.stepper-btn:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.55);
  transform: scale(1.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.stepper-btn:active:not(.disabled) {
  transform: scale(0.95);
}

.stepper-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: scale(0.95);
}

.stepper-value {
  font-size: clamp(22px, 4vw, 30px);
  font-weight: 800;
  color: white;
  min-width: clamp(28px, 5vw, 40px);
  text-align: center;
  text-shadow: 0 3px 6px rgba(0, 0, 0, 0.35);
  font-variant-numeric: tabular-nums;
}

/* 总玩家显示 */
.total-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(10px, 1.8vw, 14px) clamp(12px, 2.2vw, 18px);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 170, 0, 0.08) 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: clamp(8px, 1.5vw, 12px);
  margin-bottom: clamp(14px, 2.5vh, 20px);
  position: relative;
  z-index: 2;
}

.total-info-text {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.total-label {
  font-size: clamp(13px, 2vw, 16px);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.total-count {
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
  font-variant-numeric: tabular-nums;
}

.total-hint {
  font-size: clamp(11px, 1.8vw, 14px);
  color: rgba(255, 215, 0, 0.6);
  font-weight: 500;
}

.total-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: clamp(12px, 2vw, 16px);
  height: clamp(12px, 2vw, 16px);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dot.active {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.35);
  transform: scale(1.1);
}

.dot.human {
  background: linear-gradient(135deg, #66bb6a, #43a047);
  border-color: rgba(76, 175, 80, 0.5);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.3);
}

/* 继续游戏按钮 */
.continue-section {
  margin-bottom: clamp(10px, 2vh, 16px);
  position: relative;
  z-index: 2;
}

.continue-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: clamp(12px, 2vw, 16px);
  border-radius: clamp(10px, 1.8vw, 14px);
  font-size: clamp(13px, 2.2vw, 16px);
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
  color: #1a1a2e;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
  position: relative;
  overflow: hidden;
}

.continue-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.continue-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5);
}

.continue-btn:hover::before {
  left: 150%;
}

.continue-btn:active {
  transform: translateY(-1px) scale(0.98);
}

/* 开始按钮 */
.start-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: clamp(14px, 2.5vw, 18px);
  border-radius: clamp(12px, 2vw, 16px);
  font-size: clamp(14px, 2.5vw, 18px);
  font-weight: 750;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #43a047 0%, #2e7d32 50%, #1b5e20 100%);
  color: white;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 8px 24px rgba(46, 125, 50, 0.4);
  margin-bottom: clamp(8px, 1.5vh, 12px);
  position: relative;
  z-index: 2;
  letter-spacing: 2px;
}

.start-btn svg {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.start-btn:hover:not(.disabled) {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(46, 125, 50, 0.5);
}

.start-btn:active:not(.disabled) {
  transform: translateY(-2px) scale(0.98);
}

.start-btn.disabled {
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.5), rgba(70, 70, 70, 0.4));
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.65;
}

/* 读取存档按钮 */
.load-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: clamp(10px, 1.8vw, 14px);
  border-radius: clamp(10px, 1.8vw, 14px);
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.3s ease;
  margin-bottom: clamp(14px, 2.5vh, 22px);
  position: relative;
  z-index: 2;
}

.load-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.load-btn:active {
  transform: translateY(0) scale(0.98);
}

/* 游戏规则 */
.game-rules {
  background: rgba(0, 0, 0, 0.15);
  border-radius: clamp(10px, 1.8vw, 14px);
  padding: clamp(12px, 2vw, 16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 2;
}

.rules-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ffd700;
  font-size: clamp(12px, 2vw, 15px);
  font-weight: 700;
  margin-bottom: clamp(10px, 2vh, 14px);
  letter-spacing: 1px;
}

.rules-header svg {
  opacity: 0.85;
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.2vw, 10px);
}

.rules-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(12px, 1.8vw, 14px);
  padding: 0;
  line-height: 1.4;
}

.rule-icon {
  font-size: clamp(16px, 2.5vw, 19px);
  flex-shrink: 0;
}

/* ==================== 响应式断点优化 - 网页端适配 ==================== */

/* 超大屏幕优化 (≥1920px) - 全高沉浸式体验 */
@media (min-width: 1920px) {
  .start-screen {
    padding: 24px;
    align-items: center;
  }

  .start-container-desktop {
    max-width: 400px;
    padding: 36px 32px;
  }

  .brand-icon {
    font-size: 52px;
  }

  .brand-title {
    font-size: 36px;
    letter-spacing: 7px;
  }

  .brand-subtitle {
    font-size: 13px;
    letter-spacing: 5px;
  }

  .selector-card {
    padding: 13px 16px;
  }

  .selector-header {
    font-size: 13px;
    margin-bottom: 8px;
  }

  .stepper-btn {
    width: 42px;
    height: 42px;
    font-size: 20px;
  }

  .stepper-value {
    font-size: 30px;
  }

  .total-display {
    padding: 12px 16px;
    margin-bottom: 14px;
  }

  .total-label {
    font-size: 13px;
  }

  .total-count {
    font-size: 28px;
  }

  .total-hint {
    font-size: 11px;
  }

  .total-dots {
    gap: 10px;
  }

  .dot {
    width: 12px;
    height: 12px;
  }

  .continue-section {
    margin-bottom: 12px;
  }

  .continue-btn {
    padding: 11px 18px;
    font-size: 13px;
  }

  .start-btn {
    padding: 13px 22px;
    font-size: 15px;
  }

  .load-btn {
    padding: 9px 18px;
    font-size: 12px;
  }

  .game-rules {
    padding: 13px 16px;
  }

  .rules-header {
    font-size: 12px;
    margin-bottom: 10px;
  }

  .rules-list li {
    font-size: 12px;
    padding: 4px 0;
  }

  .rule-icon {
    font-size: 15px;
  }
}

/* 大屏幕优化 (1600px - 1919px) */
@media (max-width: 1919px) and (min-width: 1600px) {
  .start-container-desktop {
    max-width: 380px;
    padding: 32px 28px;
  }

  .brand-icon {
    font-size: 46px;
  }

  .brand-title {
    font-size: 32px;
    letter-spacing: 6px;
  }

  .stepper-value {
    font-size: 26px;
  }

  .total-count {
    font-size: 24px;
  }

  .start-btn {
    padding: 12px 20px;
    font-size: 14px;
  }
}

/* 主流大屏幕 (1440px - 1599px) */
@media (max-width: 1599px) and (min-width: 1440px) {
  .start-container-desktop {
    max-width: 360px;
    padding: 28px 24px;
  }

  .brand-title {
    letter-spacing: 5px;
  }

  .stepper-value {
    font-size: 24px;
  }

  .total-count {
    font-size: 22px;
  }
}

/* 标准桌面屏幕 (1280px - 1439px) */
@media (max-width: 1439px) and (min-width: 1280px) {
  .start-container-desktop {
    max-width: 340px;
    padding: 24px 20px;
  }

  .brand-icon {
    font-size: 40px;
  }

  .brand-title {
    font-size: 28px;
    letter-spacing: 4px;
  }

  .stepper-value {
    font-size: 22px;
  }

  .total-count {
    font-size: 20px;
  }

  .start-btn {
    padding: 11px 18px;
    font-size: 13px;
  }

  .load-btn {
    padding: 8px 16px;
    font-size: 11px;
  }
}

/* 中等桌面屏幕 (1200px - 1279px) */
@media (max-width: 1279px) and (min-width: 1200px) {
  .start-container-desktop {
    max-width: 320px;
    padding: 22px 18px;
  }

  .brand-title {
    letter-spacing: 4px;
  }

  .stepper-value {
    font-size: 20px;
  }

  .total-count {
    font-size: 18px;
  }
}

/* 中等屏幕适配 (992px - 1199px) */
@media (max-width: 1199px) and (min-width: 992px) {
  .start-container-desktop {
    max-width: 300px;
    padding: 20px 16px;
  }

  .brand-icon {
    font-size: 36px;
  }

  .brand-title {
    font-size: 24px;
    letter-spacing: 3px;
  }

  .selector-card {
    padding: 10px 12px;
  }

  .stepper-value {
    font-size: 20px;
  }

  .total-count {
    font-size: 18px;
  }

  .start-btn {
    padding: 10px 16px;
    font-size: 12px;
  }
}

/* 小屏幕/平板竖屏 (768px - 991px) */
@media (max-width: 991px) and (min-width: 769px) {
  .start-container-desktop {
    max-width: 280px;
    padding: 18px 14px;
  }

  .player-selector {
    flex-direction: row;
    gap: 8px;
  }

  .selector-card {
    flex: 1;
    padding: 9px 10px;
  }

  .selector-header {
    font-size: 11px;
  }

  .stepper-btn {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .stepper-value {
    font-size: 18px;
  }

  .total-count {
    font-size: 16px;
  }
}

/* 小屏幕/平板竖屏 (≤768px) */
@media (max-width: 768px) {
  .start-container-desktop {
    max-width: 100%;
    border-radius: 14px;
  }

  .player-selector {
    flex-direction: row;
  }

  .selector-card {
    flex: 1;
  }
}

/* 超小屏幕 (<480px) */
@media (max-width: 480px) {
  .start-screen {
    padding: 12px;
    align-items: flex-start;
    padding-top: clamp(30px, 6vh, 50px);
  }

  .start-container-desktop {
    border-radius: 18px;
    padding: 24px 20px;
  }

  .desktop-brand {
    margin-bottom: 24px;
  }

  .brand-icon {
    font-size: 48px;
  }

  .brand-title {
    font-size: 28px;
    letter-spacing: 4px;
  }

  .player-selector {
    gap: 12px;
    margin-bottom: 20px;
  }

  .selector-card {
    padding: 14px 12px;
    gap: 10px;
  }

  .selector-header {
    font-size: 13px;
  }

  .stepper {
    gap: 14px;
  }

  .stepper-btn {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .stepper-value {
    font-size: 26px;
  }

  .total-display {
    padding: 12px 16px;
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .total-count {
    font-size: 22px;
  }

  .start-btn {
    padding: 14px;
    font-size: 15px;
  }

  .load-btn {
    padding: 11px;
    font-size: 13px;
  }

  .game-rules {
    padding: 16px;
  }

  .rules-list li {
    font-size: 12px;
  }
}

/* ==================== 移动端横屏专属设计 ==================== */
@media (max-height: 500px) {
  .start-screen {
    padding: 0;
    overflow: hidden;
  }

  /* 隐藏桌面版 */
  .start-container-desktop {
    display: none !important;
  }

  /* 显示移动端 */
  .start-container-mobile {
    display: flex !important;
    flex-direction: row !important;
    width: 100% !important;
    height: 100vh !important;
    box-sizing: border-box !important;
    align-items: stretch !important;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }

  /* 背景层 */
  .bg-layer {
    display: block !important;
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
  }

  .bg-glow-1 {
    top: -15%;
    left: -10%;
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(102, 126, 234, 0.6), transparent 70%);
  }

  .bg-glow-2 {
    bottom: -20%;
    right: 25%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(240, 147, 251, 0.5), transparent 70%);
  }

  .bg-glow-3 {
    top: 30%;
    right: -5%;
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(118, 75, 162, 0.5), transparent 70%);
  }

  /* 左侧品牌区 */
  .brand-section {
    flex: 0 0 32% !important;
    display: flex !important;
    padding: 20px 16px !important;
  }

  .brand-card {
    display: flex !important;
    flex-direction: column !important;
    width: 100%;
    background: linear-gradient(165deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.35) 60%, rgba(240, 147, 251, 0.2) 100%);
    backdrop-filter: blur(28px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 20px 16px;
    position: relative;
    overflow: hidden;
  }

  .brand-card::before {
    content: '';
    position: absolute;
    top: -40px;
    right: -40px;
    width: 140px;
    height: 140px;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 65%);
    border-radius: 50%;
    pointer-events: none;
  }

  .brand-card::after {
    content: '';
    position: absolute;
    bottom: -20px;
    left: -20px;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, rgba(76, 175, 80, 0.07) 0%, transparent 65%);
    border-radius: 50%;
    pointer-events: none;
  }

  .dice-stage {
    display: flex !important;
    justify-content: center;
    align-items: center;
    position: relative;
    margin-bottom: 14px;
  }

  .dice-3d {
    font-size: 42px;
    line-height: 1;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35));
    animation: dice-spin 4s ease-in-out infinite;
    position: relative;
    z-index: 2;
  }

  @keyframes dice-spin {
    0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
    25% { transform: translateY(-8px) rotate(90deg) scale(1.08); }
    50% { transform: translateY(-2px) rotate(180deg) scale(1); }
    75% { transform: translateY(-6px) rotate(270deg) scale(1.06); }
  }

  .dice-ring {
    display: block !important;
    position: absolute;
    width: 64px;
    height: 64px;
    border: 2px solid rgba(255, 215, 0, 0.2);
    border-radius: 50%;
    animation: ring-pulse 3s ease-in-out infinite;
  }

  @keyframes ring-pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.15); opacity: 0.2; }
  }

  .game-title {
    text-align: center;
    margin: 0 0 4px !important;
    display: flex !important;
    justify-content: center;
    gap: 4px;
  }

  .title-char {
    display: inline-block;
    font-size: 28px;
    font-weight: 900;
    background: linear-gradient(180deg, #ffffff 0%, #ffd700 95%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
    animation: char-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }

  @keyframes char-bounce {
    from { transform: translateY(-20px) scale(0); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }

  .game-subtitle {
    text-align: center;
    font-size: 10px;
    letter-spacing: 6px;
    color: rgba(255, 215, 0, 0.65) !important;
    font-weight: 600;
    text-transform: uppercase;
    margin: 0 0 12px !important;
  }

  .divider-fancy {
    display: flex !important;
    align-items: center;
    gap: 8px;
    justify-content: center;
    margin-bottom: 14px;
  }

  .divider-fancy span:first-child,
  .divider-fancy span:last-child {
    flex: 1;
    max-width: 45px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.35), transparent);
  }

  .divider-fancy span:nth-child(2) {
    color: rgba(255, 215, 0, 0.45);
    font-size: 8px;
  }

  .rules-panel {
    display: flex !important;
    flex-direction: column !important;
    flex: 1;
    background: rgba(0, 0, 0, 0.15) !important;
    border-radius: 12px !important;
    padding: 10px 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.06);
    position: relative;
    z-index: 1;
  }

  .rules-title-row {
    display: flex !important;
    align-items: center;
    gap: 5px;
    color: rgba(255, 215, 0, 0.8);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .rules-title-row svg {
    opacity: 0.85;
  }

  .rules-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .rule-item {
    display: flex !important;
    align-items: center;
    gap: 7px;
    padding: 4px 0;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.35;
    animation: rule-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }

  @keyframes rule-slide-in {
    from { transform: translateX(-12px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  .rule-marker {
    font-size: 11px;
    flex-shrink: 0;
    width: 16px;
    text-align: center;
  }

  /* 右侧控制区 */
  .control-section {
    flex: 1 1 68% !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 18px 22px !important;
    gap: 12px;
    overflow-y: auto;
    position: relative;
  }

  .continue-card {
    display: flex !important;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 170, 0, 0.1) 100%);
    border: 1px solid rgba(255, 215, 0, 0.25);
    border-radius: 13px;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }

  .continue-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }

  .continue-card:hover::before {
    transform: translateX(100%);
  }

  .continue-card:active {
    transform: scale(0.97);
  }

  .continue-icon-wrap {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #ffd700, #ffa500);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a1a2e;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
  }

  .continue-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .continue-label {
    font-size: 13px;
    font-weight: 650;
    color: rgba(255, 215, 0, 0.92);
  }

  .continue-hint {
    font-size: 10px;
    color: rgba(255, 215, 0, 0.55);
  }

  .continue-arrow {
    color: rgba(255, 215, 0, 0.6);
    flex-shrink: 0;
  }

  .player-config {
    display: flex !important;
    flex-direction: column !important;
    gap: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 14px 16px;
  }

  .config-header {
    display: flex !important;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.88);
    letter-spacing: 0.5px;
  }

  .config-icon {
    font-size: 14px;
  }

  .config-badge {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 18px;
    padding: 0 7px;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 170, 0, 0.15));
    border: 1px solid rgba(255, 215, 0, 0.25);
    border-radius: 9px;
    font-size: 10px;
    font-weight: 800;
    color: #ffd700;
    margin-left: auto;
  }

  .player-cards-row {
    display: flex !important;
    gap: 10px;
  }

  .player-type-card {
    flex: 1;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px;
    padding: 10px 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    transition: all 0.25s ease;
  }

  .player-type-card:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .type-header {
    display: flex !important;
    align-items: center;
    gap: 6px;
    justify-content: center;
  }

  .avatar-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-human {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(56, 142, 60, 0.2));
    color: #81c784;
  }

  .avatar-ai {
    background: linear-gradient(135deg, rgba(156, 39, 176, 0.3), rgba(123, 31, 162, 0.2));
    color: #ce93d8;
  }

  .type-name {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.82);
  }

  .count-stepper {
    display: flex !important;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .stepper-action {
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .stepper-action:hover:not(.inactive) {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.28);
    color: white;
  }

  .stepper-action:active:not(.inactive) {
    transform: scale(0.9);
  }

  .stepper-action.inactive {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .count-display {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    min-width: 32px;
  }

  .count-num {
    font-size: 22px;
    font-weight: 800;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  }

  .count-unit {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 500;
  }

  .players-visualizer {
    display: flex !important;
    justify-content: center;
    gap: 8px;
    padding-top: 4px;
  }

  .player-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .player-dot.active {
    background: linear-gradient(135deg, #ffd700, #ffa500);
    border-color: rgba(255, 215, 0, 0.4);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.25);
    animation: dot-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }

  .player-dot.filled {
    background: linear-gradient(135deg, #66bb6a, #43a047);
    border-color: rgba(76, 175, 80, 0.4);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.2);
  }

  .player-dot.active:nth-child(1) { animation-delay: 0s; }
  .player-dot.active:nth-child(2) { animation-delay: 0.07s; }
  .player-dot.active:nth-child(3) { animation-delay: 0.14s; }
  .player-dot.active:nth-child(4) { animation-delay: 0.21s; }

  @keyframes dot-pop {
    from { transform: scale(0) rotate(-180deg); opacity: 0; }
    to { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  .action-buttons {
    display: flex !important;
    flex-direction: column !important;
    gap: 8px;
    margin-top: auto;
  }

  .btn-start {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 10px;
    padding: 14px 20px !important;
    border-radius: 14px !important;
    font-size: 16px !important;
    font-weight: 750 !important;
    letter-spacing: 2px !important;
    cursor: pointer;
    border: none;
    background: linear-gradient(135deg, #43a047 0%, #2e7d32 50%, #1b5e20 100%) !important;
    color: white;
    box-shadow: 
      0 4px 18px rgba(46, 125, 50, 0.38),
      inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    position: relative;
    overflow: hidden;
    transition: all 0.28s ease !important;
  }

  .btn-shine {
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    transition: left 0.5s ease;
  }

  .btn-start:not(.btn-disabled):hover .btn-shine {
    left: 150%;
  }

  .btn-start:not(.btn-disabled):active {
    transform: scale(0.97) !important;
    box-shadow: 0 2px 10px rgba(46, 125, 50, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  }

  .btn-icon-svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }

  .btn-arrow {
    transition: transform 0.25s ease;
  }

  .btn-start:not(.btn-disabled):hover .btn-arrow {
    transform: translateX(3px);
  }

  .btn-start.btn-disabled {
    background: linear-gradient(135deg, rgba(70, 70, 70, 0.4), rgba(45, 45, 45, 0.3)) !important;
    box-shadow: none !important;
    border-color: rgba(255, 255, 255, 0.04) !important;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .btn-start.btn-disabled .btn-shine {
    display: none;
  }

  .btn-secondary {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px;
    padding: 10px !important;
    border-radius: 11px !important;
    font-size: 12px !important;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    background: rgba(255, 255, 255, 0.04) !important;
    color: rgba(255, 255, 255, 0.5) !important;
    transition: all 0.25s ease !important;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.18) !important;
    color: rgba(255, 255, 255, 0.7) !important;
  }

  .btn-secondary:active {
    transform: scale(0.97);
  }

  .slide-down-enter-active {
    animation: slide-down-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .slide-down-leave-active {
    animation: slide-down-in 0.3s ease reverse;
  }

  @keyframes slide-down-in {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
}
</style>
