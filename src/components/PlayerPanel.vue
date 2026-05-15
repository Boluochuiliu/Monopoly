<template>
  <div
    class="player-panel"
    :class="[
      {
        active: isActive,
        bankrupt: player.bankrupt,
        'bankruptcy-warning': player.bankruptWarning,
        'no-buffs': !(activeBuffs && activeBuffs.length > 0)
      }
    ]"
    :style="{ '--player-color': player.color.primary }"
  >
    <div style="display: none">{{ fundRebatesLength }}{{ refreshKey }}</div>
    <div v-if="player.bankruptWarning" class="bankruptcy-warning-banner">
      ⚠️ 破产预警：还剩 {{ player.liquidationCountdown }} 轮清算
    </div>
    <div class="panel-content">
      <div class="character-section">
        <div class="player-avatar" :style="{ backgroundColor: player.color.primary }">
          {{ player.avatar }}
          <div class="notifications">
            <div 
              v-for="change in cashChanges" 
              :key="change.id" 
              class="cash-change-notify" 
              :class="change.amount > 0 ? 'positive' : 'negative'"
            >
              {{ change.amount > 0 ? '+' : '' }}{{ change.amount }}
            </div>
            <div v-if="showBuffActivation && buffActivationInfo" class="buff-activation-notify">
              {{ buffActivationInfo }}
            </div>
          </div>
        </div>
        <div class="player-name">{{ player.name }}</div>
      </div>

      <div class="resources-section">
        <div class="resource-item cash">
          <div class="resource-row">
            <span class="resource-icon">💰</span>
            <span class="resource-value">{{ player.cash }}</span>
          </div>
          <div class="resource-label">现金</div>
        </div>
        <div 
          class="resource-item property" 
          :class="{ disabled: !isActive || player.bankrupt }"
          @click="isActive && !player.bankrupt && $emit('openMortgage', player)"
        >
          <div class="resource-row">
            <span>🏠×{{ propertyCount }}</span>
          </div>
          <div class="resource-row">
            <span class="resource-label-inline">可置换财产</span>
            <span class="resource-value">{{ getMortgageableValue() }}</span>
          </div>
        </div>
      </div>

      <div v-if="activeBuffs && activeBuffs.length > 0" class="buffs-section">
        <div class="buffs-list">
          <div v-for="buff in activeBuffs" :key="buff.name + buff.remainingTimes" class="buff-item">
            <span class="buff-icon">{{ getBuffIcon(buff.name) }}</span>
            <span class="buff-name">{{ getBuffDisplayName(buff) }}</span>
            <span class="buff-duration">{{ getBuffRemainingTimes(buff) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue';

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
  cashChanges: {
    type: Array,
    default: () => []
  },
  showSkipTurn: {
    type: Boolean,
    default: false
  },
  showBuffActivation: {
    type: Boolean,
    default: false
  },
  buffActivationInfo: {
    type: String,
    default: ''
  },
  getTotalPropertyInvestment: {
    type: Function,
    default: null
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

const fundRebatesLength = computed(() => {
  return props.player?.fundRebates?.length || 0;
});

watch(() => props.refreshKey, (newKey, oldKey) => {
  console.log('[DEBUG] watch refreshKey changed:', oldKey, '->', newKey);
  console.log('[DEBUG] watch refreshKey - fundRebates:', props.player?.fundRebates);
});

const activeBuffs = computed(() => {
  const buffs = [];
  
  console.log('[DEBUG] activeBuffs - player:', props.player?.name, 'buffs:', props.player?.buffs, 'fundRebates:', props.player?.fundRebates);
  
  if (props.player.buffs) {
    buffs.push(...props.player.buffs.filter(buff => {
      if (buff.name === 'hallProtection' && buff.used) {
        return false;
      }
      return true;
    }));
  }
  
  console.log('[DEBUG] activeBuffs computed - refreshKey:', props.refreshKey);
  
  if (props.player.fundRebates && props.player.fundRebates.length > 0) {
    console.log('[DEBUG] activeBuffs - fundRebates found:', props.player.fundRebates);
    props.player.fundRebates.forEach(rebate => {
      buffs.push({
        name: 'fundRebate',
        remainingTimes: rebate.remainingTimes,
        value: Math.floor(rebate.amount * 0.4)
      });
    });
  }
  
  const inventory = props.player.inventory;
  if (inventory) {
    if (inventory.remoteDice > 0) {
      buffs.push({
        name: 'remoteDice',
        remainingTimes: inventory.remoteDice,
        isItem: true
      });
    }
    if (inventory.bomb > 0) {
      buffs.push({
        name: 'bomb',
        remainingTimes: inventory.bomb,
        isItem: true
      });
    }
    if (inventory.lottery > 0) {
      buffs.push({
        name: 'lottery',
        remainingTimes: inventory.lottery,
        isItem: true
      });
    }
  }
  
  console.log('[DEBUG] activeBuffs - final buffs:', buffs);
  return buffs;
});

const getBuffRemainingTimes = (buff) => {
  if (buff.remainingTimes !== undefined) {
    return `${buff.remainingTimes}次`;
  }
  return buff.duration;
};

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
    hallProtection: '🏛️',
    fixedMove: '👣',
    fundRebate: '💰',
    remoteDice: '🎲',
    bomb: '💣',
    lottery: '🎫'
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
    hallProtection: '市长凭证',
    fixedMove: '固定行走',
    fundRebate: '基金返利',
    remoteDice: '遥控骰子',
    bomb: '炸弹',
    lottery: '彩票'
  };
  return names[name] || name;
};

const getBuffDisplayName = (buff) => {
  if (buff.name === 'extraSalary') {
    return `薪水+${buff.value}`;
  }
  if (buff.name === 'salaryMinus') {
    return `降薪-${buff.value}`;
  }
  if (buff.name === 'fundRebate') {
    return `返利+${buff.value}`;
  }
  return getBuffName(buff.name);
};


</script>

<style scoped>
.player-panel {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 12px 15px;
  min-width: 180px;
  width: calc(25% - 10px);
  height: 100%;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08), 0 0 10px rgba(0, 0, 0, 0.05);
  position: relative;
  display: flex;
  flex-direction: column;
}

.player-panel.no-buffs {
  max-width: 220px;
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

.panel-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  flex: 1;
  width: 100%;
}

.resources-section {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 4px;
  flex: 0 0 auto;
  width: max-content;
  min-width: 95px;
  max-width: 140px;
}

.buffs-section {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 3px;
  flex: 0 0 150px;
  min-width: 130px;
  max-width: 160px;
  max-height: 100%;
}

.player-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
  position: relative;
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
  text-align: center;
}

.player-name {
  font-size: 13px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
  margin-bottom: 3px;
}

.player-status {
  display: flex;
  gap: 4px;
}

.status-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: bold;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.status-badge.jail {
  background: linear-gradient(135deg, #78909c 0%, #546e7a 100%);
  color: white;
}

.status-badge.bankrupt {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  color: white;
}

.status-badge.active {
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  width: 100%;
  height: 45px;
  gap: 1px;
  white-space: nowrap;
  justify-self: stretch;
}

.resource-item.cash {
  gap: 1px;
}

.resource-item:hover {
  transform: translateY(-1.5px);
  border-color: rgba(255, 255, 255, 0.3);
}

.resource-item.property {
  cursor: pointer;
  color: #fff;
}

.resource-item.property:hover:not(.disabled) {
  border-color: #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.resource-item.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.resource-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.property .resource-row:last-child {
  justify-content: space-between;
  width: 100%;
}

.resource-icon {
  font-size: 16px;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
}

.resource-value {
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.resource-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
}

.resource-label-inline {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.buffs-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 94px;
  overflow-y: auto;
  padding-right: 4px;
}

.buffs-list::-webkit-scrollbar {
  width: 4px;
}

.buffs-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.buffs-list::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.5);
  border-radius: 2px;
}

.buffs-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 215, 0, 0.7);
}

.buff-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.1) 100%);
  border-radius: 4px;
  border: 1px solid rgba(255, 215, 0, 0.2);
  min-width: 100%;
}

.buff-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.buff-name {
  flex: 1;
  font-size: 10px;
  color: white;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.buff-duration {
  font-size: 8px;
  color: #ffd700;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}





.cash-change-notify {
  font-size: 18px;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 12px;
  white-space: nowrap;
  animation: cash-float 4s ease-out forwards;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.cash-change-notify.positive {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
  border: 2px solid #81c784;
}

.cash-change-notify.negative {
  background: linear-gradient(135deg, #f44336 0%, #e57373 100%);
  color: white;
  border: 2px solid #ef5350;
}

@keyframes cash-float {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  20% {
    transform: translateY(-8px) scale(1.05);
  }
  75% {
    opacity: 1;
    transform: translateY(-8px);
  }
  90% {
    opacity: 0;
    transform: translateY(-40px);
  }
  100% {
    opacity: 0;
    transform: translateY(-40px);
  }
}

.character-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  margin-right: 8px;
}

.notifications {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  z-index: 9999;
}

.skip-turn-notify {
  font-size: 16px;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 12px;
  white-space: nowrap;
  background: linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%);
  color: #1a1a2e;
  border: 2px solid #ffd700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: cash-float 4s ease-out forwards;
}

.buff-activation-notify {
  font-size: 16px;
  font-weight: bold;
  padding: 10px 18px;
  border-radius: 12px;
  white-space: nowrap;
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
  border: 2px solid #81c784;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: buff-activate 3s ease-out forwards;
  min-width: 180px;
  text-align: center;
}

@keyframes buff-activate {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateY(0) scale(1.1);
  }
  25% {
    transform: translateY(-5px) scale(1);
  }
  40% {
    transform: translateY(-10px) scale(1.05);
  }
  70% {
    opacity: 1;
    transform: translateY(-10px);
  }
  90% {
    opacity: 0;
    transform: translateY(-30px);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px);
  }
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
