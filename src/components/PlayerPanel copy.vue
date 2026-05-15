<template>
  <div
    class="player-panel"
    :class="[
      {
        active: isActive,
        bankrupt: player.bankrupt,
        'bankruptcy-warning': player.bankruptWarning
      },
      `corner-${cornerIndex % 4}`
    ]"
    :style="{ '--player-color': player.color.primary }"
  >
    <div v-if="player.bankruptWarning" class="bankruptcy-warning-banner">
      ⚠️ 破产预警：还剩 {{ player.liquidationCountdown }} 轮清算
    </div>
    <div class="notifications">
      <div v-if="showCashChange" class="cash-change-notify" :class="cashChangeAmount > 0 ? 'positive' : 'negative'">
        {{ cashChangeAmount > 0 ? '+' : '' }}{{ cashChangeAmount }}
      </div>
      <div v-if="showSkipTurn" class="skip-turn-notify">
        ⏸️ 暂停回合
      </div>
    </div>
    <div class="panel-header">
      <div class="player-avatar" :style="{ backgroundColor: player.color.primary }">
        {{ player.avatar }}
      </div>
      <div class="player-info">
        <div class="player-name">{{ player.name }}</div>
        <div class="player-status">
          <span v-if="player.inJail" class="status-badge jail">🔒 监狱中</span>
          <span v-else-if="player.bankrupt" class="status-badge bankrupt">💀 破产</span>
          <span v-else-if="isActive" class="status-badge active">✨ 行动中</span>
        </div>
      </div>
    </div>

    <div class="panel-body">
      <div class="stat-item cash">
        <div class="stat-icon">💰</div>
        <div class="stat-value">{{ player.cash }}</div>
        <div class="stat-label">现金</div>
      </div>

      <div class="stat-item property">
        <div class="stat-icon">🏠</div>
        <div class="stat-value">{{ propertyCount }}</div>
        <div class="stat-label">地产</div>
      </div>

      <div 
        class="stat-item mortgageable" 
        :class="{ disabled: !isActive || player.bankrupt }"
        @click="isActive && !player.bankrupt && $emit('openMortgage', player)"
      >
        <div class="stat-icon">🏦</div>
        <div class="stat-value">{{ getMortgageableValue() }}</div>
        <div class="stat-label">可置换财产</div>
      </div>

      <div class="stat-item location">
        <div class="stat-icon">📍</div>
        <div class="stat-value location-text">{{ currentTileName }}</div>
        <div class="stat-label">位置</div>
      </div>
    </div>

    <div v-if="player.buffs && player.buffs.length > 0" class="buffs-container">
      <div class="buffs-title">🎯 增益效果</div>
      <div class="buffs-list">
        <div v-for="buff in player.buffs" :key="buff.name" class="buff-item">
          <span class="buff-icon">{{ getBuffIcon(buff.name) }}</span>
          <span class="buff-name">{{ getBuffName(buff.name) }}</span>
          <span class="buff-duration">{{ buff.duration }}</span>
        </div>
      </div>
    </div>

    <div v-if="hasItems" class="inventory-container">
      <div class="inventory-title">🎒 道具背包</div>
      <div class="inventory-list">
        <div v-if="player.inventory?.remoteDice > 0" class="inventory-item">
          <span class="inventory-icon">🎲</span>
          <span class="inventory-name">遥控骰子</span>
          <span class="inventory-count">×{{ player.inventory.remoteDice }}</span>
        </div>
        <div v-if="player.inventory?.bomb > 0" class="inventory-item">
          <span class="inventory-icon">💣</span>
          <span class="inventory-name">炸弹</span>
          <span class="inventory-count">×{{ player.inventory.bomb }}</span>
        </div>
        <div v-if="player.inventory?.lottery > 0" class="inventory-item">
          <span class="inventory-icon">🎫</span>
          <span class="inventory-name">彩票</span>
          <span class="inventory-count">×{{ player.inventory.lottery }}</span>
        </div>
      </div>
      <button v-if="isActive && hasItems && !player.bankrupt" class="btn-use-item" @click="$emit('useItem')">使用道具</button>
    </div>

    <div v-if="showDice && !isRolling" class="dice-button-container">
      <button class="btn-dice" @click="$emit('roll')">🎲 掷骰子</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  player: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  mapTiles: {
    type: Array,
    required: true
  },
  properties: {
    type: Object,
    required: true
  },
  showDice: {
    type: Boolean,
    default: false
  },
  cashChange: {
    type: Number,
    default: 0
  },
  showSkipTurn: {
    type: Boolean,
    default: false
  },
  getTotalPropertyInvestment: {
    type: Function,
    default: null
  },
  cornerIndex: {
    type: Number,
    default: 0
  }
});

defineEmits(['roll', 'useItem', 'openMortgage']);

const propertyCount = computed(() => {
  if (!props.properties) return 0;
  return Object.values(props.properties).filter(p => p && p.owner === props.player.id).length;
});

const currentTileName = computed(() => {
  const tile = props.mapTiles[props.player.position];
  return tile ? tile.name : '';
});

const hasItems = computed(() => {
  const inv = props.player.inventory;
  return inv && (inv.remoteDice > 0 || inv.bomb > 0 || inv.lottery > 0);
});

const getUpgradeCost = (tile, prop) => {
  const level = prop.level;
  const price = tile.price;
  switch (level) {
    case 0: return Math.ceil(price * 0.5);
    case 1: return Math.floor(price * 1.0);
    case 2: return Math.floor(price * 2.0);
    default: return 0;
  }
};

const calculateTotalPropertyInvestment = (tile, prop) => {
  if (props.getTotalPropertyInvestment) {
    return props.getTotalPropertyInvestment(tile, prop);
  }
  let total = tile.price;
  let level = 0;
  let currentLevelProp = { level: 0 };
  while (level < prop.level) {
    currentLevelProp.level = level;
    total += getUpgradeCost(tile, currentLevelProp);
    level++;
  }
  return total;
};

const getMortgageableValue = () => {
  let total = 0;
  if (!props.properties) return 0;
  for (const [id, prop] of Object.entries(props.properties)) {
    if (prop && prop.owner === props.player.id) {
      const tile = props.mapTiles[parseInt(id) - 1];
      if (tile) {
        total += calculateTotalPropertyInvestment(tile, prop);
      } else {
        total += prop.investment || 0;
      }
    }
  }
  return total;
};

const cashChangeAmount = ref(0);
const showCashChange = ref(false);

watch(() => props.cashChange, (newVal) => {
  if (newVal !== 0) {
    cashChangeAmount.value = newVal;
    showCashChange.value = true;
    setTimeout(() => {
      showCashChange.value = false;
      cashChangeAmount.value = 0;
    }, 4000);
  }
});

const getBuffIcon = (name) => {
  const icons = {
    freeRent: '🆓',
    freeStation: '🎟️',
    bonusSalary: '🎁',
    salaryBoost: '📈',
    salaryHalf: '📉',
    salaryMinus: '➖',
    extraSalary: '➕',
    halfRent: '💸',
    dicePlus: '🎲',
    hallProtection: '🏛️'
  };
  return icons[name] || '✨';
};

const getBuffName = (name) => {
  const names = {
    freeRent: '免租金',
    freeStation: '免费传送',
    bonusSalary: '年终奖',
    salaryBoost: '加薪',
    salaryHalf: '薪水减半',
    salaryMinus: '降薪',
    extraSalary: '额外薪水',
    halfRent: '半价租金',
    dicePlus: '骰子+2',
    hallProtection: '市长凭证'
  };
  return names[name] || name;
};

defineExpose({
  showCashChange: (amount) => {
    cashChangeAmount.value = amount;
    showCashChange.value = true;
    setTimeout(() => {
      showCashChange.value = false;
      cashChangeAmount.value = 0;
    }, 1500);
  }
});
</script>

<style scoped>
.player-panel {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  padding: 12px;
  min-width: 170px;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1), 0 0 20px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: visible;
}

.player-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--player-color);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.player-panel.active {
  border-color: var(--player-color);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2), 0 0 30px rgba(255, 215, 0, 0.3);
  transform: scale(1.05);
}

.player-panel.active::before {
  opacity: 1;
}

.player-panel.bankrupt {
  opacity: 0.4;
  filter: grayscale(0.8);
  transform: scale(0.95);
}

.player-panel.bankruptcy-warning {
  animation: pulse-warning 1.5s ease-in-out infinite;
}

.bankruptcy-warning-banner {
  background: linear-gradient(135deg, #ff9800 0%, #f44336 100%);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 10px;
  animation: blink-warning 1s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
}

@keyframes pulse-warning {
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.8);
  }
}

@keyframes blink-warning {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.player-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 22px;
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

.player-panel.active .player-avatar {
  animation: bounce-avatar 1s ease-in-out infinite;
}

@keyframes bounce-avatar {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.player-info {
  flex: 1;
}

.player-name {
  font-size: 15px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: 4px;
}

.player-status {
  display: flex;
  gap: 4px;
}

.status-badge {
  font-size: 9px;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: bold;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.2);
}

.status-badge.jail {
  background: linear-gradient(135deg, #78909C 0%, #546E7A 100%);
  color: white;
}

.status-badge.bankrupt {
  background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
  color: white;
}

.status-badge.active {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a2e;
  animation: pulse-badge 1.5s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  50% {
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.5);
  }
}

.panel-body {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 5px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-1.5px);
  border-color: rgba(255, 255, 255, 0.3);
}

.stat-item.mortgageable {
  cursor: pointer;
}

.stat-item.mortgageable:hover {
  border-color: #FFD700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.stat-item.mortgageable.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.stat-item.mortgageable.disabled:hover {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.stat-icon {
  font-size: 16px;
  margin-bottom: 3px;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

.stat-value {
  font-size: 13px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.stat-value.location-text {
  font-size: 9px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
}

.buffs-container {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 2px dashed rgba(255, 255, 255, 0.2);
}

.buffs-title {
  font-size: 12px;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 8px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.buffs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.buff-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.buff-icon {
  font-size: 14px;
}

.buff-name {
  flex: 1;
  font-size: 11px;
  color: white;
  font-weight: bold;
}

.buff-duration {
  font-size: 10px;
  color: #FFD700;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 6px;
}

.inventory-container {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 2px dashed rgba(255, 255, 255, 0.2);
}

.inventory-title {
  font-size: 12px;
  font-weight: bold;
  color: #4CAF50;
  margin-bottom: 8px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.inventory-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inventory-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(69, 160, 73, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.inventory-icon {
  font-size: 14px;
}

.inventory-name {
  flex: 1;
  font-size: 11px;
  color: white;
  font-weight: bold;
}

.inventory-count {
  font-size: 10px;
  color: #4CAF50;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 6px;
}

.btn-use-item {
  width: 100%;
  margin-top: 10px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #7E57C2 0%, #5E35B1 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
}

.btn-use-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(126, 87, 194, 0.4);
}

.dice-button-container {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.btn-dice {
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn-dice:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.btn-dice:active {
  transform: translateY(0);
}

.cash-change-notify {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 12px;
  white-space: nowrap;
  z-index: 10;
  animation: cash-float 4s ease-out forwards;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.cash-change-notify.positive {
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  color: white;
  border: 2px solid #81C784;
}

.cash-change-notify.negative {
  background: linear-gradient(135deg, #f44336 0%, #e57373 100%);
  color: white;
  border: 2px solid #ef5350;
}

@keyframes cash-float {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(10px) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  20% {
    transform: translateX(-50%) translateY(-5px) scale(1.05);
  }
  75% {
    opacity: 1;
    transform: translateX(-50%) translateY(-5px);
  }
  90% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}

.notifications {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.skip-turn-notify {
  font-size: 16px;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 12px;
  white-space: nowrap;
  background: linear-gradient(135deg, #FFC107 0%, #FFEB3B 100%);
  color: #1a1a2e;
  border: 2px solid #FFD700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: cash-float 4s ease-out forwards;
}

.stat-value.cash-change {
  animation: cash-pulse 0.3s ease-in-out;
}

@keyframes cash-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
