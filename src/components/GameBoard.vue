<template>
  <div class="game-board" ref="boardContainerRef">
    <!-- 缩放控件 -->
    <div class="zoom-controls">
      <button 
        class="zoom-btn" 
        @click="responsiveMap?.zoomOut()"
        title="缩小"
      >
        ➖
      </button>
      
      <button 
        class="zoom-btn zoom-reset" 
        @click="responsiveMap?.resetZoom()"
        title="重置缩放"
      >
        {{ responsiveMap ? Math.round(responsiveMap.scale.value * 100) : 100 }}%
      </button>
      
      <button 
        class="zoom-btn" 
        @click="responsiveMap?.zoomIn()"
        title="放大"
      >
        ➕
      </button>
      
      <button 
        class="zoom-btn" 
        @click="responsiveMap?.resetZoom()"
        title="重置"
      >
        ↺
      </button>
    </div>

    <Transition name="action-notify">
      <div v-if="actionNotifyText" class="action-notify-bar">
        <span class="action-notify-icon">📢</span>
        <div class="action-notify-content">
          <span class="action-notify-text">{{ actionNotifyText }}</span>
          <span v-if="actionNotifyDetail" class="action-notify-detail">{{ actionNotifyDetail }}</span>
        </div>
      </div>
    </Transition>

    <!-- 地图容器 - 应用响应式样式 -->
    <div 
      class="board-container"
      :style="mapTransformStyle"
      :class="{ 'is-dragging': responsiveMap?.isDragging }"
    >
      <div v-if="auctionSuccessMessage" class="notification-overlay">
        <div class="auction-success-message">
          {{ auctionSuccessMessage }}
        </div>
      </div>

      <div v-if="showDice && currentPlayer" class="dice-center-container" :style="{ '--player-color': currentPlayer.color.primary }">
        <button class="btn-center-dice" @click="$emit('rollDice')">
          <span class="dice-icon">🎲</span>
          <span class="dice-text">掷骰子</span>
        </button>
        <button 
          v-if="hasItems" 
          class="btn-center-item" 
          @click="$emit('useItem')"
        >
          <span class="item-icon">🎒</span>
          <span class="item-text">使用道具</span>
        </button>
        <div class="current-player-indicator">
          <span class="player-name">{{ currentPlayer.name }}</span>
          <span class="turn-badge">行动中</span>
        </div>
        <div class="test-toggle-container">
          <button 
            class="toggle-test-panel" 
            :class="{ active: showTestPanel }"
            @click="$emit('toggleTestPanel')"
          >
            {{ showTestPanel ? '隐藏测试' : '显示测试' }}
          </button>
        </div>
      </div>
      
      <div v-if="placingBomb" class="bomb-overlay">
        <div class="bomb-overlay-content">
          <div class="bomb-icon">💣</div>
          <div class="bomb-title">安放炸弹</div>
          <div class="bomb-message">请点击地图上的格子安放炸弹</div>
          <button class="btn btn-secondary bomb-cancel-btn" @click="$emit('cancelBomb')">取消放置</button>
        </div>
      </div>
      
      <div v-if="selectingPropertyForFree" class="select-property-overlay">
        <div class="select-property-overlay-content">
          <div class="select-property-icon">💰</div>
          <div class="select-property-title">天使投资</div>
          <div class="select-property-message">请点击地图上的空地选择一块地产</div>
        </div>
      </div>
      
      <div class="board-row" v-for="(row, rowIndex) in boardLayout" :key="rowIndex">
        <div
          v-for="tile in row"
          :key="tile?.id || `empty-${rowIndex}-${tile?.id}`"
          class="tile"
          :class="getTileClass(tile)"
          :style="getTileStyle(tile)"
          @click="handleTileClick(tile)"
        >
          <div v-if="tile" class="tile-content">
            <div class="tile-icon" v-if="getTileIcon(tile)">{{ getTileIcon(tile) }}</div>
            <div v-if="tile.type === 'property' && tile.block" class="tile-block">{{ tile.block }}</div>
            <div class="tile-name">{{ tile.name }}</div>
            <div v-if="tile.type === 'property'" class="tile-price">💰{{ tile.price }}</div>
            <div v-if="tile.type === 'property' && getPropertyLevel(tile.id) > 0" class="tile-level">
              <span v-for="n in getPropertyLevel(tile.id)" :key="n" class="star">⭐</span>
            </div>
            <div v-if="bombs[tile.id]" class="tile-bomb">💣</div>
          </div>
        </div>
      </div>
      
      <div class="players-layer">
        <div
          v-for="player in activePlayers"
          :key="player.id"
          class="player-character"
          :class="{ 
            'is-moving': player.isMoving, 
            'current-turn': currentPlayerIndex === player.id,
            'has-hall-buff': hasHallProtection(player),
            'in-jail': player.inJail,
            'skip-turn': player.skipNextTurn
          }"
          :style="getPlayerStyle(player)"
        >
          <div class="skip-turn-indicator" v-if="player.inJail || player.skipNextTurn">
            <span class="skip-icon">{{ player.inJail ? '🔒' : '⏭️' }}</span>
            <span class="skip-text">{{ player.inJail ? '监狱中' : '跳过' }}</span>
          </div>
          <div class="character-body" :style="{ backgroundColor: player.color.primary }">
            <div class="character-face">{{ player.avatar }}</div>
            <div class="character-shadow"></div>
          </div>
          <div class="character-name">{{ player.name }}</div>
        </div>
      </div>
    </div>
    
    <!-- 首次使用提示 -->
    <transition name="fade">
      <div v-if="showDragHint" class="drag-hint">
        💡 使用滚轮缩放，拖动查看地图
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useResponsiveMap } from '../composables/useResponsiveMap'

const props = defineProps({
  mapTiles: {
    type: Array,
    required: true
  },
  players: {
    type: Array,
    required: true
  },
  properties: {
    type: Object,
    required: true
  },
  currentPlayerIndex: {
    type: Number,
    required: true
  },
  selectingPropertyForFree: {
    type: Boolean,
    default: false
  },
  bombs: {
    type: Object,
    default: () => ({})
  },
  placingBomb: {
    type: Boolean,
    default: false
  },
  auctionProperty: {
    type: Object,
    default: null
  },
  propertyEffectTile: {
    type: Object,
    default: () => ({ tileId: null, effectType: null })
  },
  showDice: {
    type: Boolean,
    default: false
  },
  currentPlayer: {
    type: Object,
    default: null
  },
  auctionSuccessMessage: {
    type: String,
    default: ''
  },
  hasItems: {
    type: Boolean,
    default: false
  },
  showTestPanel: {
    type: Boolean,
    default: false
  },
  actionNotifyText: {
    type: String,
    default: ''
  },
  actionNotifyDetail: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['selectFreeProperty', 'placeBomb', 'cancelBomb', 'rollDice', 'useItem', 'toggleTestPanel'])

const boardRef = ref(null)
const TILE_SIZE = 75
const GAP = 5

// ========== 新增：响应式地图 ==========
const boardContainerRef = ref(null)
const responsiveMap = ref(null)
const showDragHint = ref(false)

onMounted(() => {
  if (boardContainerRef.value) {
    responsiveMap.value = useResponsiveMap(boardContainerRef)
    responsiveMap.value.init()
    
    // 显示提示（3秒后自动消失）
    setTimeout(() => {
      showDragHint.value = true
      setTimeout(() => {
        showDragHint.value = false
      }, 3000)
    }, 1000)
  }
})

onUnmounted(() => {
  if (responsiveMap.value) {
    responsiveMap.value.destroy()
  }
})

// 计算CSS Transform样式
const mapTransformStyle = computed(() => {
  if (!responsiveMap.value) return {}
  
  return {
    transform: `translate(${responsiveMap.value.offsetX}px, ${responsiveMap.value.offsetY}px) 
                      scale(${responsiveMap.value.scale})`,
    transformOrigin: 'center center',
    transition: responsiveMap.value.isDragging.value 
      ? 'none' 
      : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  }
})

const boardLayout = computed(() => {
  const layout = []
  for (let row = 0; row < 9; row++) {
    const rowTiles = []
    for (let col = 0; col < 13; col++) {
      const tile = props.mapTiles.find(t => 
        t.position.row === row && t.position.col === col
      )
      rowTiles.push(tile || null)
    }
    layout.push(rowTiles)
  }
  return layout
})

const activePlayers = computed(() => {
  return props.players.filter(p => !p.bankrupt)
})

function getTileIcon(tile) {
  if (!tile) return null
  const icons = {
    start: '🚀',
    chance: '🎴',
    fate: '🔮',
    station: '🚂',
    jail: '🔒',
    hall: '🏛️',
    casino: '🎰',
    shop: '🛒',
    auction: '⚖️',
    park: '🌳',
    fund: '💰'
  }
  return icons[tile.type] || null
}

function getTileClass(tile) {
  if (!tile) return 'empty'
  
  const classes = [tile.type]
  
  if (tile.type === 'property') {
    const prop = props.properties[tile.id]
    if (prop && prop.owner !== null) {
      classes.push('owned')
      if (prop.level > 0) {
        classes.push(`upgrade-level-${prop.level}`)
      }
    } else if (props.selectingPropertyForFree) {
      classes.push('selectable')
    }
    
    if (props.auctionProperty && props.auctionProperty.id === tile.id) {
      classes.push('auctioning')
    }
    
    if (props.propertyEffectTile.tileId === tile.id) {
      classes.push(`effect-${props.propertyEffectTile.effectType}`)
    }
  }
  
  return classes
}

function getTileStyle(tile) {
  if (!tile) return {}
  
  if (tile.type === 'property' && tile.block) {
    const prop = props.properties[tile.id]
    
    if (prop && prop.owner !== null) {
      const player = props.players.find(p => p.id === prop.owner)
      const playerColor = player ? player.color.primary : '#FFD700'
      return {
        background: `linear-gradient(135deg, ${playerColor} 0%, ${adjustColor(playerColor, -40)} 100%)`,
        borderColor: '#fff',
        boxShadow: `0 0 15px ${playerColor}`
      }
    }
    
    return {
      background: 'linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)',
      borderColor: '#CCCCCC'
    }
  }
  
  return {}
}

function adjustColor(color, amount) {
  const hex = color.replace('#', '')
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function getPropertyLevel(tileId) {
  const prop = props.properties[tileId]
  return prop ? prop.level : 0
}

function getPlayerStyle(player) {
  const tile = props.mapTiles[player.position]
  if (!tile) return {}
  
  const col = tile.position.col
  const row = tile.position.row
  
  const playersOnSameTile = activePlayers.value.filter(p => p.position === player.position)
  const playerIndex = playersOnSameTile.indexOf(player)
  const totalPlayers = playersOnSameTile.length
  
  const offsetX = (playerIndex - (totalPlayers - 1) / 2) * 18
  
  const left = col * (TILE_SIZE + GAP) + TILE_SIZE / 2 - 15 + offsetX
  const top = row * (TILE_SIZE + GAP) + TILE_SIZE / 2 - 20
  
  return {
    left: `${left}px`,
    top: `${top}px`,
    '--player-color': player.color.primary,
    '--player-secondary': player.color.secondary
  }
}

function hasHallProtection(player) {
  return player.buffs && player.buffs.some(b => b.name === 'hallProtection' && !b.used);
}

function handleTileClick(tile) {
  if (props.placingBomb && tile) {
    if (!props.bombs[tile.id]) {
      emit('placeBomb', tile.id)
    }
    return
  }
  
  if (props.selectingPropertyForFree && tile && tile.type === 'property') {
    const prop = props.properties[tile.id]
    if (prop && prop.owner === null) {
      emit('selectFreeProperty', tile.id)
    }
  } else if (tile && tile.type === 'property') {
    const prop = props.properties[tile.id]
    if (prop && prop.owner !== null) {
      console.log(`Property ${tile.name} owned by player ${prop.owner}`)
    }
  }
}

defineExpose({
  zoomIn() { responsiveMap.value?.zoomIn() },
  zoomOut() { responsiveMap.value?.zoomOut() },
  resetZoom() { responsiveMap.value?.resetZoom() },
  getScale() { return responsiveMap.value?.scale?.value ?? 1 }
})
</script>

<style scoped>
.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);
}

.game-board:active {
  cursor: grabbing;
}

/* 缩放控件 */
.zoom-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 20;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.zoom-btn:active {
  transform: scale(0.95);
}

.zoom-reset {
  font-size: 12px;
  pointer-events: none;
  background: rgba(255, 215, 0, 0.9);
  color: #1a1a2e;
}

/* 地图容器 */
.board-container {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1040px;
  height: 720px;
  margin-top: -360px;
  margin-left: -520px;
  transform-origin: center center;
  will-change: transform;
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.board-container.is-dragging {
  transition: none;
}

/* 拖拽提示 */
.drag-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  pointer-events: none;
  backdrop-filter: blur(10px);
  z-index: 15;
}

.notification-overlay {
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.auction-success-message {
  padding: 20px 40px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 30%, #FF8C00 60%, #FFD700 100%);
  background-size: 200% 200%;
  border-radius: 24px;
  color: #1a1a2e;
  font-weight: 800;
  font-size: 24px;
  box-shadow: 
    0 10px 40px rgba(255, 215, 0, 0.6),
    0 0 60px rgba(255, 215, 0, 0.4),
    0 0 100px rgba(255, 215, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  animation: 
    auction-success-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
    auction-success-glow 2s ease-in-out infinite,
    auction-success-shimmer 3s linear infinite;
  white-space: nowrap;
  border: 3px solid rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  text-shadow: 0 2px 4px rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

.auction-success-message::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%);
  animation: auction-success-shine 2s ease-in-out infinite;
}

.auction-success-message::after {
  content: '🎉';
  position: absolute;
  top: -10px;
  right: -10px;
  font-size: 32px;
  animation: party-popper 0.5s ease-out;
}

@keyframes auction-success-pop {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(50px) rotate(-10deg);
  }
  30% {
    transform: scale(1.15) translateY(-10px) rotate(5deg);
  }
  50% {
    transform: scale(0.95) translateY(0) rotate(-2deg);
  }
  70% {
    transform: scale(1.02) translateY(-2px) rotate(1deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0) rotate(0deg);
  }
}

@keyframes auction-success-glow {
  0%, 100% {
    box-shadow: 
      0 10px 40px rgba(255, 215, 0, 0.6),
      0 0 60px rgba(255, 215, 0, 0.4),
      0 0 100px rgba(255, 215, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow: 
      0 15px 50px rgba(255, 215, 0, 0.8),
      0 0 80px rgba(255, 215, 0, 0.6),
      0 0 120px rgba(255, 215, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      inset 0 -1px 0 rgba(0, 0, 0, 0.15);
  }
}

@keyframes auction-success-shimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes auction-success-shine {
  0% {
    left: -100%;
  }
  50%, 100% {
    left: 100%;
  }
}

@keyframes party-popper {
  0% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.5) rotate(180deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(360deg);
  }
}

.dice-center-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 50;
}

.action-notify-bar {
  position: absolute;
  top: calc(50% - 110px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.92) 0%, rgba(20, 20, 40, 0.92) 100%);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 2px solid rgba(255, 215, 0, 0.5);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 215, 0, 0.2);
  max-width: 340px;
  overflow: hidden;
  pointer-events: none;
}

.action-notify-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.action-notify-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.action-notify-text {
  font-size: 13px;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-notify-detail {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-notify-enter-active {
  transition: all 0.4s ease-out;
}

.action-notify-leave-active {
  transition: all 0.3s ease-in;
}

.action-notify-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-15px);
}

.action-notify-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.btn-center-dice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 28px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border: 3px solid var(--player-color, rgba(255, 255, 255, 0.5));
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2), 0 0 20px var(--player-color, rgba(255, 255, 255, 0.3));
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.btn-center-dice:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: var(--player-color, rgba(255, 255, 255, 0.7));
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25), 0 0 30px var(--player-color, rgba(255, 255, 255, 0.4));
  transform: translateY(-2px);
}

.btn-center-dice:active {
  transform: translateY(0);
}

.dice-icon {
  font-size: 36px;
  animation: dice-bounce 2s ease-in-out infinite;
}

@keyframes dice-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.btn-center-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(156, 39, 176, 0.25);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(156, 39, 176, 0.5);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(156, 39, 176, 0.2);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.btn-center-item:hover {
  background: rgba(156, 39, 176, 0.35);
  border-color: rgba(156, 39, 176, 0.7);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.btn-center-item:active {
  transform: scale(0.98);
}

.item-icon {
  font-size: 14px;
}

.item-text {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.dice-text {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4);
}

.current-player-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: var(--player-color, rgba(255, 215, 0, 0.25));
  opacity: 0.85;
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  box-shadow: 0 2px 8px var(--player-color, rgba(255, 215, 0, 0.3));
}

.current-player-indicator .player-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.current-player-indicator .turn-badge {
  font-size: 10px;
  font-weight: 600;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.2);
  padding: 3px 8px;
  border-radius: 8px;
}

.test-toggle-container {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.toggle-test-panel {
  padding: 6px 14px;
  font-size: 11px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.7);
  background: linear-gradient(135deg, rgba(74, 85, 104, 0.6) 0%, rgba(45, 55, 72, 0.6) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.toggle-test-panel:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  color: white;
}

.toggle-test-panel.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.7) 0%, rgba(118, 75, 162, 0.7) 100%);
  border-color: rgba(102, 126, 234, 0.5);
  color: white;
}

.board-row {
  display: flex;
  gap: 5px;
}

.tile {
  width: 75px;
  height: 75px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 3px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.15);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.tile:hover {
  transform: scale(1.06) translateY(-3px);
  z-index: 10;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
}

.tile.empty {
  background: transparent;
  border: none;
  cursor: default;
  box-shadow: none;
}

.tile.start {
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, transparent 50%),
    linear-gradient(225deg, rgba(255, 215, 0, 0.3) 0%, transparent 50%),
    linear-gradient(135deg, #FFF8E1 0%, #FFECB3 30%, #FFD54F 60%, #FFC107 100%);
  border: 4px solid #FFA000;
  background-size: 100% 100%, 100% 100%, 100% 100%;
}

.tile.start::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 8px,
    rgba(255, 255, 255, 0.2) 8px,
    rgba(255, 255, 255, 0.2) 10px
  );
  border-radius: 10px;
  pointer-events: none;
}

.tile.property {
  background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%);
}

.tile.property.owned {
  border-color: #FFD700;
}

.tile.property.selectable {
  animation: selectable-pulse 1s ease-in-out infinite;
  border-color: #FFD700;
  border-width: 3px;
  border-style: solid;
  cursor: pointer;
  z-index: 20;
}

@keyframes selectable-pulse {
  0%, 100% {
    box-shadow: 
      0 0 15px rgba(255, 215, 0, 0.6),
      0 0 30px rgba(255, 215, 0, 0.4),
      0 0 45px rgba(255, 215, 0, 0.2);
    transform: scale(1);
    border-color: #FFD700;
  }
  50% {
    box-shadow: 
      0 0 25px rgba(255, 215, 0, 1),
      0 0 50px rgba(255, 215, 0, 0.7),
      0 0 75px rgba(255, 215, 0, 0.4);
    transform: scale(1.08);
    border-color: #FFEB3B;
  }
}

.tile.chance {
  background: 
    radial-gradient(circle at 0% 0%, rgba(255, 128, 171, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 182, 193, 0.2) 0%, transparent 40%),
    linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 50%, #EEEEEE 100%);
  border: 3px solid #FF80AB;
  box-shadow: 
    0 0 15px rgba(255, 128, 171, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  background-size: 100% 100%, 100% 100%, 100% 100%;
}

.tile.fate {
  background: 
    radial-gradient(circle at 100% 100%, rgba(123, 31, 162, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 20% 20%, rgba(156, 39, 176, 0.2) 0%, transparent 40%),
    linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 50%, #EEEEEE 100%);
  border: 3px solid #7B1FA2;
  box-shadow: 
    0 0 15px rgba(123, 31, 162, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  background-size: 100% 100%, 100% 100%, 100% 100%;
}

.tile.station {
  background: 
    linear-gradient(135deg, #FAFFFF 0%, #F0FCFD 30%, #E0F7FA 60%, #B2EBF2 100%);
  border: 3px solid #80DEEA;
  box-shadow: 
    0 0 15px rgba(0, 172, 193, 0.25),
    0 5px 12px rgba(0, 0, 0, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.9),
    inset 0 -1px 2px rgba(0, 172, 193, 0.1);
}

.tile.station::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 6px;
  right: 6px;
  height: 3px;
  background: repeating-linear-gradient(
    90deg,
    rgba(0, 172, 193, 0.6) 0px,
    rgba(0, 172, 193, 0.6) 5px,
    transparent 5px,
    transparent 9px
  );
  transform: translateY(-50%);
  border-radius: 1.5px;
  pointer-events: none;
}

.tile.jail {
  background: 
    repeating-linear-gradient(
      0deg,
      rgba(158, 158, 158, 0.3) 0px,
      rgba(158, 158, 158, 0.3) 4px,
      rgba(255, 255, 255, 0.1) 4px,
      rgba(255, 255, 255, 0.1) 8px
    ),
    linear-gradient(135deg, #EFEFEF 0%, #DEDEDE 30%, #E8E8E8 70%, #E0E0E0 100%);
  border: 3px solid #757575;
  box-shadow: 
    0 0 18px rgba(117, 117, 117, 0.35),
    0 5px 12px rgba(0, 0, 0, 0.12),
    inset 0 2px 4px rgba(255, 255, 255, 0.7),
    inset 0 -2px 4px rgba(117, 117, 117, 0.15);
  background-size: 100% 100%, 100% 100%;
}

.tile.jail::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
    linear-gradient(225deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  border-radius: 11px;
  pointer-events: none;
}

.tile.hall {
  background: 
    linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, transparent 50%),
    linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 50%, #FAFAFA 100%);
  border: 3px solid #BDBDBD;
  box-shadow: 
    0 5px 10px rgba(0, 0, 0, 0.15),
    0 10px 25px rgba(0, 0, 0, 0.1),
    inset 0 2px 3px rgba(255, 255, 255, 0.8);
  background-size: 100% 100%, 100% 100%;
}

.tile.hall .tile-icon {
  filter: 
    drop-shadow(0 3px 4px rgba(0, 0, 0, 0.5))
    drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

.tile.casino {
  background: 
    radial-gradient(circle at 50% 50%, rgba(244, 67, 54, 0.25) 0%, transparent 60%),
    radial-gradient(circle at 20% 80%, rgba(233, 30, 99, 0.15) 0%, transparent 40%),
    linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 50%, #EEEEEE 100%);
  border: 3px solid #F44336;
  box-shadow: 
    0 0 15px rgba(244, 67, 54, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  background-size: 100% 100%, 100% 100%, 100% 100%;
}

.tile.shop {
  background: 
    linear-gradient(135deg, #EFEBE9 0%, #D7CCC8 30%, #BCAAA4 60%, #A1887F 100%);
  border: 3px solid #8D6E63;
  box-shadow: 
    0 0 18px rgba(141, 110, 99, 0.4),
    0 5px 12px rgba(0, 0, 0, 0.12),
    inset 0 2px 4px rgba(255, 255, 255, 0.85),
    inset 0 -1px 2px rgba(161, 136, 127, 0.2);
}

.tile.shop::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  background-image: 
    linear-gradient(45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.35) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.35) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
  border-radius: 8px;
  pointer-events: none;
}

.tile.auction {
  background: 
    linear-gradient(135deg, #EFEBE9 0%, #D7CCC8 25%, #BCAAA4 50%, #A1887F 75%, #8D6E63 100%);
  border: 3px solid #5D4037;
  box-shadow: 
    0 0 18px rgba(93, 64, 55, 0.4),
    0 5px 12px rgba(0, 0, 0, 0.15),
    inset 0 2px 4px rgba(255, 255, 255, 0.6),
    inset 0 -2px 4px rgba(93, 64, 55, 0.2);
}

.tile.auction::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  height: 4px;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgba(255, 255, 255, 0.5) 30%,
    rgba(255, 255, 255, 0.7) 50%,
    rgba(255, 255, 255, 0.5) 70%,
    transparent 100%);
  border-radius: 6px 6px 0 0;
  pointer-events: none;
}

.tile.property.auctioning {
  animation: auction-glow 1s ease-in-out infinite;
  border-color: #FFD700;
  border-width: 5px;
  border-style: solid;
  box-shadow: 
    0 0 25px rgba(255, 215, 0, 1),
    0 0 50px rgba(255, 200, 0, 0.8),
    0 0 75px rgba(255, 180, 0, 0.6),
    0 0 100px rgba(255, 150, 0, 0.4);
  z-index: 50;
}

@keyframes auction-glow {
  0%, 100% {
    box-shadow: 
      0 0 25px rgba(255, 215, 0, 1),
      0 0 50px rgba(255, 200, 0, 0.8),
      0 0 75px rgba(255, 180, 0, 0.6),
      0 0 100px rgba(255, 150, 0, 0.4);
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    box-shadow: 
      0 0 40px rgba(255, 255, 100, 1),
      0 0 80px rgba(255, 230, 50, 0.9),
      0 0 120px rgba(255, 200, 0, 0.7),
      0 0 160px rgba(255, 150, 0, 0.5);
    transform: scale(1.1);
    filter: brightness(1.2);
  }
}

.tile.property.effect-upgrade {
  animation: upgrade-glow 0.5s ease-in-out infinite;
  z-index: 50;
}

@keyframes upgrade-glow {
  0%, 100% {
    box-shadow: 
      0 0 15px rgba(0, 255, 100, 1),
      0 0 30px rgba(0, 255, 100, 0.8),
      0 0 45px rgba(0, 200, 80, 0.6);
    transform: scale(1);
  }
  50% {
    box-shadow: 
      0 0 25px rgba(0, 255, 150, 1),
      0 0 50px rgba(0, 255, 150, 0.9),
      0 0 75px rgba(0, 200, 100, 0.7);
    transform: scale(1.08);
  }
}

.tile.property.effect-fire {
  animation: fire-glow 0.3s ease-in-out infinite;
  z-index: 50;
}

@keyframes fire-glow {
  0%, 100% {
    box-shadow: 
      0 0 15px rgba(255, 100, 50, 1),
      0 0 30px rgba(255, 80, 30, 0.8),
      0 0 45px rgba(200, 50, 20, 0.6);
    transform: scale(1) rotate(0deg);
  }
  25% {
    box-shadow: 
      0 0 20px rgba(255, 150, 50, 1),
      0 0 40px rgba(255, 100, 30, 0.9),
      0 0 60px rgba(200, 60, 20, 0.7);
    transform: scale(1.05) rotate(-2deg);
  }
  50% {
    box-shadow: 
      0 0 25px rgba(255, 200, 100, 1),
      0 0 50px rgba(255, 150, 50, 0.9),
      0 0 75px rgba(200, 100, 30, 0.7);
    transform: scale(1.1) rotate(0deg);
  }
  75% {
    box-shadow: 
      0 0 20px rgba(255, 150, 50, 1),
      0 0 40px rgba(255, 100, 30, 0.9),
      0 0 60px rgba(200, 60, 20, 0.7);
    transform: scale(1.05) rotate(2deg);
  }
}

.tile.property.effect-disaster {
  animation: disaster-shake 0.5s ease-in-out infinite;
  z-index: 50;
}

@keyframes disaster-shake {
  0%, 100% {
    box-shadow: 
      0 0 15px rgba(150, 150, 150, 1),
      0 0 30px rgba(120, 120, 120, 0.8),
      0 0 45px rgba(100, 100, 100, 0.6);
    transform: translateX(0) translateY(0) rotate(0deg);
  }
  10% {
    transform: translateX(-3px) translateY(-2px) rotate(-1deg);
  }
  20% {
    transform: translateX(3px) translateY(2px) rotate(1deg);
  }
  30% {
    transform: translateX(-2px) translateY(-1px) rotate(-0.5deg);
  }
  40% {
    transform: translateX(2px) translateY(1px) rotate(0.5deg);
  }
  50% {
    box-shadow: 
      0 0 25px rgba(200, 200, 200, 1),
      0 0 50px rgba(150, 150, 150, 0.9),
      0 0 75px rgba(120, 120, 120, 0.7);
    transform: translateX(-1px) translateY(-1px) rotate(-0.3deg);
  }
  60% {
    transform: translateX(1px) translateY(1px) rotate(0.3deg);
  }
  70% {
    transform: translateX(-2px) translateY(-1px) rotate(-0.5deg);
  }
  80% {
    transform: translateX(2px) translateY(1px) rotate(0.5deg);
  }
  90% {
    transform: translateX(-1px) translateY(-1px) rotate(-0.3deg);
  }
}

.tile.park {
  background: 
    radial-gradient(circle at 0% 100%, rgba(76, 175, 80, 0.3) 0%, transparent 40%),
    radial-gradient(circle at 100% 0%, rgba(76, 175, 80, 0.25) 0%, transparent 35%),
    linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 50%, #EEEEEE 100%);
  border: 3px solid #4CAF50;
  box-shadow: 
    0 0 15px rgba(76, 175, 80, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  background-size: 100% 100%, 100% 100%, 100% 100%;
}

.tile.fund {
  background: 
    radial-gradient(circle at 50% 30%, rgba(255, 215, 0, 0.35) 0%, transparent 50%),
    linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 50%, #EEEEEE 100%);
  border: 3px solid #FFC107;
  box-shadow: 
    0 0 15px rgba(255, 193, 7, 0.3),
    0 5px 12px rgba(0, 0, 0, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.9);
}

.tile.fund::before {
  content: '';
  position: absolute;
  top: 6px;
  left: 8px;
  right: 8px;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgba(255, 215, 0, 0.35) 30%,
    rgba(255, 215, 0, 0.5) 50%,
    rgba(255, 215, 0, 0.35) 70%,
    transparent 100%);
  border-radius: 2px;
  pointer-events: none;
}

.tile-content {
  text-align: center;
  padding: 6px;
  width: 100%;
  position: relative;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.tile-icon {
  font-size: 22px;
  margin-bottom: 3px;
  filter: 
    drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4))
    drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

.tile.shop .tile-icon {
  font-size: 22px;
  filter: 
    drop-shadow(0 3px 4px rgba(0, 0, 0, 0.5))
    drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

.tile-block {
  font-size: 9px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.7),
    0 0 2px rgba(0, 0, 0, 0.5);
  background: rgba(0, 0, 0, 0.25);
  padding: 3px 8px;
  border-radius: 8px;
  margin-bottom: 2px;
  letter-spacing: 0.5px;
}

.tile-name {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.5),
    0 0 2px rgba(0, 0, 0, 0.3);
  word-break: break-all;
  line-height: 1.3;
  letter-spacing: 0.3px;
}

.tile-price {
  font-size: 11px;
  color: #FFD700;
  margin-top: 3px;
  font-weight: 700;
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.6),
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 0 3px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
}

.tile-level {
  display: flex;
  justify-content: center;
  gap: 2px;
  margin-top: 3px;
}

.star {
  font-size: 10px;
}

.tile-bomb {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 16px;
  animation: bomb-pulse 1s infinite;
}

@keyframes bomb-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.tile.placing-bomb {
  cursor: crosshair;
}

.tile.placing-bomb:not(.has-bomb):hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(255, 87, 34, 0.6);
}

.ownership-badge {
  position: absolute;
  top: -3px;
  left: -3px;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
  font-weight: bold;
  color: #1a1a2e;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  border: 2px solid white;
}

.players-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}

.player-character {
  position: absolute;
  width: 30px;
  height: 40px;
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: auto;
  z-index: 50;
}

.player-character.is-moving {
  animation: bounce 0.6s ease-in-out;
}

.player-character.current-turn .character-body {
  animation: pulse 1.5s ease-in-out infinite;
}

.player-character.has-hall-buff .character-body {
  animation: hall-glow 1.5s ease-in-out infinite;
}

@keyframes hall-glow {
  0%, 100% {
    box-shadow: 0 0 10px 5px rgba(77, 208, 225, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 25px 15px rgba(77, 208, 225, 0.8), 0 4px 8px rgba(0, 0, 0, 0.3);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-15px) scale(1.1);
  }
  50% {
    transform: translateY(-20px) scale(1.15);
  }
  75% {
    transform: translateY(-10px) scale(1.05);
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(255, 255, 255, 0.3);
  }
}

.character-body {
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 45% 45%;
  position: relative;
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
}

.character-face {
  font-size: 16px;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

.character-shadow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 6px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
}

.character-name {
  position: absolute;
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 7px;
  font-weight: bold;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  padding: 1px 4px;
  border-radius: 6px;
  white-space: nowrap;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.skip-turn-indicator {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(255, 193, 7, 0.5);
  animation: skip-turn-bounce 1.5s ease-in-out infinite;
  z-index: 10;
  white-space: nowrap;
}

.player-character.in-jail .skip-turn-indicator {
  background: linear-gradient(135deg, #78909c 0%, #546e7a 100%);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(120, 144, 156, 0.5);
}

.skip-icon {
  font-size: 14px;
  animation: skip-icon-pulse 1s ease-in-out infinite;
}

.skip-text {
  font-size: 9px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

@keyframes skip-turn-bounce {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-5px);
  }
}

@keyframes skip-icon-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.player-character.in-jail .character-body {
  animation: jail-pulse 1.5s ease-in-out infinite;
}

@keyframes jail-pulse {
  0%, 100% {
    box-shadow: 
      0 4px 8px rgba(0, 0, 0, 0.3),
      0 0 15px rgba(120, 144, 156, 0.4);
  }
  50% {
    box-shadow: 
      0 4px 8px rgba(0, 0, 0, 0.3),
      0 0 25px rgba(120, 144, 156, 0.7);
  }
}

.board-container .bomb-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  pointer-events: none;
}

.board-container .bomb-overlay-content {
  background: linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 50%, #161616 100%);
  border: 2px solid #ff4444;
  border-radius: 20px;
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  box-shadow: 
    0 0 30px rgba(255, 68, 68, 0.3),
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: bombPopup 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: auto;
}

.board-container .bomb-icon {
  font-size: 52px;
  animation: bombPulse 0.8s ease-in-out infinite;
  filter: drop-shadow(0 0 15px rgba(255, 68, 68, 0.8));
}

.board-container .bomb-title {
  font-size: 22px;
  font-weight: 800;
  color: #ff6b6b;
  text-shadow: 0 2px 10px rgba(255, 107, 107, 0.5);
  letter-spacing: 1px;
}

.board-container .bomb-message {
  font-size: 14px;
  color: #e0e0e0;
  text-align: center;
  line-height: 1.5;
  padding: 0 10px;
}

.board-container .bomb-cancel-btn {
  margin-top: 8px;
  padding: 10px 30px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #4a4a4a 0%, #333333 100%);
  border: 1px solid #555555;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.board-container .bomb-cancel-btn:hover {
  background: linear-gradient(135deg, #555555 0%, #444444 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
}

.board-container .bomb-cancel-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.board-container .select-property-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  pointer-events: none;
}

.board-container .select-property-overlay-content {
  background: linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 50%, #161616 100%);
  border: 2px solid #FFD700;
  border-radius: 20px;
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  box-shadow: 
    0 0 30px rgba(255, 215, 0, 0.3),
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: selectPropertyPopup 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: auto;
}

.board-container .select-property-icon {
  font-size: 52px;
  animation: selectPropertyPulse 0.8s ease-in-out infinite;
  filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
}

.board-container .select-property-title {
  font-size: 22px;
  font-weight: 800;
  color: #FFD700;
  text-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
  letter-spacing: 1px;
}

.board-container .select-property-message {
  font-size: 14px;
  color: #e0e0e0;
  text-align: center;
  line-height: 1.5;
  padding: 0 10px;
}

@keyframes selectPropertyPopup {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(20px);
  }
  60% {
    transform: scale(1.05) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes selectPropertyPulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
  }
  50% {
    transform: scale(1.1);
    filter: drop-shadow(0 0 25px rgba(255, 215, 0, 1));
  }
}

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes bombPopup {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(20px);
  }
  60% {
    transform: scale(1.05) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes bombPulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 15px rgba(255, 68, 68, 0.8));
  }
  50% {
    transform: scale(1.1);
    filter: drop-shadow(0 0 25px rgba(255, 68, 68, 1));
  }
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-height: 500px) {
  .zoom-controls {
    display: none !important;
  }

  .test-toggle-container {
    margin-top: 2px !important;
  }

  .toggle-test-panel {
    padding: 4px 10px;
    font-size: 10px;
  }

  /* 地图内提示框等比缩小 */
  .bomb-overlay-content,
  .select-property-overlay-content {
    padding: 16px 20px !important;
    border-radius: 14px !important;
    gap: 8px !important;
  }

  .bomb-icon,
  .select-property-icon {
    font-size: 32px !important;
  }

  .bomb-title,
  .select-property-title {
    font-size: 15px !important;
  }

  .bomb-message,
  .select-property-message {
    font-size: 11px !important;
    padding: 0 6px !important;
  }

  .bomb-cancel-btn {
    margin-top: 4px !important;
    padding: 7px 20px !important;
    font-size: 11px !important;
    border-radius: 8px !important;
  }

  /* 掷骰子按钮 */
  .dice-center-container {
    gap: 6px !important;
  }

  .btn-center-dice {
    padding: 10px 18px !important;
    border-radius: 12px !important;
    border-width: 2px !important;
  }

  .dice-icon {
    font-size: 24px !important;
  }

  .dice-text {
    font-size: 11px !important;
  }

  .btn-center-item {
    padding: 4px 10px !important;
    border-radius: 10px !important;
    gap: 4px !important;
  }

  .item-icon,
  .item-text {
    font-size: 10px !important;
  }

  /* 当前玩家指示器 */
  .current-player-indicator {
    padding: 4px 10px !important;
    border-radius: 10px !important;
  }

  .current-player-indicator .player-name {
    font-size: 10px !important;
  }

  .current-player-indicator .turn-badge {
    font-size: 8px !important;
    padding: 2px 5px !important;
    border-radius: 5px !important;
  }

  /* 拍卖成功通知 */
  .auction-success-message {
    font-size: 13px !important;
    padding: 8px 16px !important;
    border-radius: 10px !important;
  }
}

/* ==================== 网页端桌面屏幕适配 ==================== */

/* 超大屏幕 (≥1920px) */
@media (min-width: 1920px) {
  .zoom-controls {
    top: 24px;
    right: 24px;
    gap: 12px;
  }

  .zoom-btn {
    width: 52px;
    height: 52px;
    font-size: 24px;
  }

  .zoom-reset {
    font-size: 14px;
  }

  .dice-center-container {
    gap: 20px;
  }

  .btn-center-dice {
    padding: 20px 36px;
    border-radius: 18px;
    border-width: 3px;
  }

  .dice-icon {
    font-size: 40px;
  }

  .dice-text {
    font-size: 18px;
  }

  .btn-center-item {
    padding: 12px 20px;
    border-radius: 14px;
    gap: 10px;
  }

  .item-icon,
  .item-text {
    font-size: 16px;
  }

  .current-player-indicator {
    padding: 10px 20px;
    border-radius: 14px;
  }

  .current-player-indicator .player-name {
    font-size: 16px;
  }

  .current-player-indicator .turn-badge {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 8px;
  }
}

/* 大屏幕 (1600px - 1919px) */
@media (max-width: 1919px) and (min-width: 1600px) {
  .zoom-controls {
    top: 20px;
    right: 20px;
    gap: 10px;
  }

  .zoom-btn {
    width: 48px;
    height: 48px;
    font-size: 22px;
  }

  .zoom-reset {
    font-size: 13px;
  }

  .dice-center-container {
    gap: 18px;
  }

  .btn-center-dice {
    padding: 18px 32px;
    border-radius: 16px;
  }

  .dice-icon {
    font-size: 36px;
  }

  .dice-text {
    font-size: 16px;
  }

  .btn-center-item {
    padding: 10px 18px;
    border-radius: 12px;
    gap: 8px;
  }

  .item-icon,
  .item-text {
    font-size: 15px;
  }

  .current-player-indicator {
    padding: 8px 16px;
    border-radius: 12px;
  }

  .current-player-indicator .player-name {
    font-size: 14px;
  }

  .current-player-indicator .turn-badge {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 6px;
  }
}

/* 主流大屏幕 (1440px - 1599px) */
@media (max-width: 1599px) and (min-width: 1440px) {
  .zoom-controls {
    top: 18px;
    right: 18px;
    gap: 9px;
  }

  .zoom-btn {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .zoom-reset {
    font-size: 12px;
  }

  .dice-center-container {
    gap: 16px;
  }

  .btn-center-dice {
    padding: 16px 28px;
    border-radius: 14px;
  }

  .dice-icon {
    font-size: 32px;
  }

  .dice-text {
    font-size: 15px;
  }

  .btn-center-item {
    padding: 9px 16px;
    border-radius: 12px;
    gap: 7px;
  }

  .item-icon,
  .item-text {
    font-size: 14px;
  }

  .current-player-indicator {
    padding: 7px 14px;
    border-radius: 12px;
  }

  .current-player-indicator .player-name {
    font-size: 13px;
  }

  .current-player-indicator .turn-badge {
    font-size: 10px;
    padding: 3px 7px;
    border-radius: 6px;
  }
}

/* 标准桌面屏幕 (1280px - 1439px) */
@media (max-width: 1439px) and (min-width: 1280px) {
  .zoom-controls {
    top: 16px;
    right: 16px;
    gap: 8px;
  }

  .zoom-btn {
    width: 42px;
    height: 42px;
    font-size: 18px;
  }

  .dice-center-container {
    gap: 14px;
  }

  .btn-center-dice {
    padding: 14px 24px;
    border-radius: 12px;
  }

  .dice-icon {
    font-size: 28px;
  }

  .dice-text {
    font-size: 14px;
  }

  .btn-center-item {
    padding: 8px 14px;
    border-radius: 10px;
    gap: 6px;
  }

  .item-icon,
  .item-text {
    font-size: 13px;
  }

  .current-player-indicator {
    padding: 6px 12px;
    border-radius: 10px;
  }

  .current-player-indicator .player-name {
    font-size: 12px;
  }

  .current-player-indicator .turn-badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 5px;
  }
}
</style>
