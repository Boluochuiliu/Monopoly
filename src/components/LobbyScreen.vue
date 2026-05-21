<template>
  <div class="lobby-screen">
    <div class="bg-layer">
      <div class="bg-grid"></div>
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>
    </div>

    <div class="lobby-container">
      <div class="lobby-header">
        <div class="lobby-icon">🏠</div>
        <h2 class="lobby-title">游戏大厅</h2>
      </div>

      <div class="room-info">
        <div class="room-label">房间号</div>
        <div class="room-code">
          <span class="code-text">{{ roomId }}</span>
          <button class="copy-btn" @click="copyRoomId" :class="{ copied: justCopied }">
            {{ justCopied ? '✓' : '📋' }}
          </button>
        </div>
        <div class="room-hint">将房间号分享给好友即可加入</div>
      </div>

      <div class="players-section">
        <div class="section-header">
          <span class="section-icon">👥</span>
          <span class="section-title">玩家列表</span>
          <span class="player-count">{{ players.length }}/4</span>
        </div>

        <div class="player-list">
          <div
            v-for="(player, index) in players"
            :key="player.id"
            class="player-item"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="player-avatar" :style="{ background: avatarColors[index] }">
              {{ player.isHost ? '👑' : avatarIcons[index] }}
            </div>
            <div class="player-info">
              <span class="player-name">{{ player.name }}</span>
              <span v-if="player.isHost" class="host-badge">主机</span>
              <span v-else-if="player.id === myPeerId" class="me-badge">我</span>
            </div>
            <div v-if="player.isHost" class="host-crown">👑</div>
          </div>

          <div v-for="n in (4 - players.length)" :key="'empty-' + n" class="player-item empty">
            <div class="player-avatar empty-avatar">?</div>
            <div class="player-info">
              <span class="player-name empty-name">等待加入...</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="connectionError" class="error-message">
        ⚠️ {{ connectionError }}
      </div>

      <div class="lobby-actions">
        <button
          v-if="isHost"
          class="start-game-btn"
          :class="{ disabled: players.length < 2 }"
          @click="handleStartGame"
        >
          <span class="btn-shine"></span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <span>{{ players.length < 2 ? '等待玩家加入...' : '开始游戏' }}</span>
        </button>

        <div v-else class="waiting-hint">
          <div class="waiting-spinner"></div>
          <span>等待主机开始游戏...</span>
        </div>

        <button class="leave-btn" @click="handleLeave">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          <span>离开房间</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  roomId: { type: String, required: true },
  players: { type: Array, required: true },
  isHost: { type: Boolean, required: true },
  myPeerId: { type: String, required: true },
  connectionError: { type: String, default: '' }
})

const emit = defineEmits(['startGame', 'leave'])

const justCopied = ref(false)

const avatarColors = [
  'linear-gradient(135deg, #E53935, #C62828)',
  'linear-gradient(135deg, #1E88E5, #1565C0)',
  'linear-gradient(135deg, #43A047, #2E7D32)',
  'linear-gradient(135deg, #FB8C00, #E65100)'
]

const avatarIcons = ['👨', '👩', '👴', '👵']

function copyRoomId() {
  navigator.clipboard.writeText(props.roomId).then(() => {
    justCopied.value = true
    setTimeout(() => { justCopied.value = false }, 1500)
  })
}

function handleStartGame() {
  if (props.players.length >= 2) {
    emit('startGame')
  }
}

function handleLeave() {
  emit('leave')
}
</script>

<style scoped>
.lobby-screen {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  padding: clamp(16px, 4vw, 40px);
  position: relative;
  overflow: hidden;
}

.bg-layer {
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

.lobby-container {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 100%);
  backdrop-filter: blur(24px);
  border-radius: clamp(18px, 2.5vw, 28px);
  padding: clamp(24px, 4vh, 36px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.35),
    0 10px 30px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  width: 100%;
  max-width: min(420px, 90vw);
  position: relative;
  z-index: 1;
}

.lobby-header {
  text-align: center;
  margin-bottom: clamp(16px, 3vh, 24px);
}

.lobby-icon {
  font-size: 40px;
  margin-bottom: 8px;
  animation: bounce-gentle 2s ease-in-out infinite;
}

@keyframes bounce-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.lobby-title {
  font-size: clamp(22px, 4vw, 28px);
  font-weight: 800;
  color: white;
  margin: 0;
  letter-spacing: 2px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.room-info {
  text-align: center;
  padding: clamp(14px, 2.5vh, 20px);
  background: rgba(0, 0, 0, 0.15);
  border-radius: 14px;
  margin-bottom: clamp(16px, 3vh, 24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.room-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.room-code {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.code-text {
  font-size: clamp(28px, 5vw, 36px);
  font-weight: 900;
  color: #ffd700;
  letter-spacing: 6px;
  text-shadow: 0 2px 12px rgba(255, 215, 0, 0.4);
  font-family: 'Courier New', monospace;
}

.copy-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.copy-btn.copied {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
}

.room-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 8px;
}

.players-section {
  margin-bottom: clamp(16px, 3vh, 24px);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}

.player-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
  padding: 2px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 215, 0, 0.25);
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  transition: all 0.3s ease;
  animation: slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

@keyframes slide-in {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.player-item.empty {
  opacity: 0.35;
  border-style: dashed;
}

.player-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.empty-avatar {
  background: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.3);
}

.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.player-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.empty-name {
  color: rgba(255, 255, 255, 0.35) !important;
  font-style: italic;
}

.host-badge {
  font-size: 10px;
  font-weight: 700;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 215, 0, 0.25);
}

.me-badge {
  font-size: 10px;
  font-weight: 700;
  color: #81c784;
  background: rgba(76, 175, 80, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(76, 175, 80, 0.25);
}

.host-crown {
  font-size: 16px;
  animation: crown-float 2s ease-in-out infinite;
}

@keyframes crown-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.error-message {
  padding: 10px 14px;
  background: rgba(244, 67, 54, 0.15);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 10px;
  color: #ff8a80;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
  text-align: center;
}

.lobby-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.start-game-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: clamp(14px, 2.5vw, 18px);
  border-radius: 14px;
  font-size: clamp(14px, 2.5vw, 18px);
  font-weight: 750;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #43a047 0%, #2e7d32 50%, #1b5e20 100%);
  color: white;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 8px 24px rgba(46, 125, 50, 0.4);
  position: relative;
  overflow: hidden;
  letter-spacing: 2px;
}

.start-game-btn .btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transition: left 0.5s ease;
}

.start-game-btn:hover:not(.disabled) .btn-shine {
  left: 150%;
}

.start-game-btn:hover:not(.disabled) {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(46, 125, 50, 0.5);
}

.start-game-btn:active:not(.disabled) {
  transform: translateY(-1px) scale(0.98);
}

.start-game-btn.disabled {
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.5), rgba(70, 70, 70, 0.4));
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.65;
}

.start-game-btn.disabled .btn-shine {
  display: none;
}

.waiting-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: clamp(14px, 2.5vw, 18px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 600;
}

.waiting-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #ffd700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.leave-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: clamp(10px, 1.8vw, 14px);
  border-radius: 12px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
}

.leave-btn:hover {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.3);
  color: #ff8a80;
  transform: translateY(-2px);
}

.leave-btn:active {
  transform: translateY(0) scale(0.98);
}
</style>
