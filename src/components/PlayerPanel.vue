<template>
  <div
    ref="panelRef"
    class="player-panel"
    :class="[
      {
        active: isActive,
        bankrupt: player.bankrupt,
        'bankruptcy-warning': player.bankruptWarning,
        'no-buffs': !(activeBuffs && activeBuffs.length > 0),
        'compact-mode': isCompactMode
      }
    ]"
    :style="{ '--player-color': player.color.primary }"
  >
    <div style="display: none">{{ fundRebatesLength }}{{ refreshKey }}</div>
    
    <!-- 通知浮层 - Teleport 到 body 避免被 overflow 裁剪 -->
    <Teleport to="body">
      <div
        v-if="hasNotifications"
        class="notifications-float"
        :style="notifyPosStyle"
      >
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
        <div v-if="showSkipTurn" class="skip-turn-notify">
          <span>{{ player.inJail ? '🔒' : '⏭️' }}</span>
          <span>{{ player.inJail ? '监狱中' : '跳过回合' }}</span>
        </div>
        <div v-for="notify in jailFreeRent" :key="notify.id" class="jail-free-rent-notify">
          <span>🔓</span>
          <span>免租金</span>
        </div>
        <div v-for="notify in freeRent" :key="notify.id" class="free-rent-notify">
          <span>🎫</span>
          <span>免租金</span>
        </div>
      </div>
    </Teleport>

    <!-- ========== 新三列布局 ========== -->
    <div class="panel-content">
      
      <!-- 左列：头像 + 名字 + 状态 (固定宽度) -->
      <div class="col-left">
        <div class="player-avatar" ref="avatarRef" :style="{ backgroundColor: player.color.primary }">
          {{ player.avatar }}
        </div>
        
        <div class="player-name">{{ player.name }}</div>
        
        <div v-if="hasStatus" class="status-bar">
          <span v-if="player.inJail" class="status-tag jail">🔒 监狱 {{ getJailRemainingTurns() }}</span>
          <span v-if="player.skipNextTurn" class="status-tag skip">⏭️ 暂停</span>
          <span v-if="player.bankrupt" class="status-tag bankrupt">💀 破产</span>
          <span v-if="player.bankruptWarning" class="status-tag warning">⚠️ 预警 {{ player.liquidationCountdown }}</span>
        </div>
      </div>

      <!-- 中列：资源信息 (弹性) - 纯图标+数值 -->
      <div class="col-center">
        <div class="resource-item cash">
          <span class="resource-icon">💰</span>
          <span class="resource-value">{{ formatNumber(player.cash) }}</span>
        </div>
        
        <div 
          class="resource-item property" 
          :class="{ disabled: !isActive || player.bankrupt }"
          @click="isActive && !player.bankrupt && $emit('openMortgage', player)"
        >
          <span class="resource-icon">🏠</span>
          <span class="resource-value">×{{ propertyCount }}</span>
        </div>
        
        <div class="resource-item mortgage">
          <span class="resource-icon">💎</span>
          <span class="resource-value">{{ getMortgageableValue() }}</span>
        </div>
      </div>

      <!-- 右列：Buff列表 (仅当有Buff时显示) -->
      <div v-if="activeBuffs && activeBuffs.length > 0" class="col-right">
        <div class="buffs-list">
          <div
            v-for="(buff, index) in activeBuffs"
            :key="buff.name + buff.remainingTimes"
            class="buff-item"
            :ref="el => { if (el) buffItemRefs[`${buff.name}-${index}`] = el }"
            :class="{ 'compact-buff': isCompactMode }"
            @click.stop="showBuffTooltip(`${buff.name}-${index}`, $event)"
          >
            <span class="buff-icon">{{ getBuffIcon(buff.name) }}</span>
            <span class="buff-duration">{{ getBuffRemainingTimes(buff) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 使用Teleport将提示框传送到body，显示在最上层 -->
  <Teleport to="body">
    <div
      v-if="activeTooltip && tooltipPosition"
      class="buff-tooltip-overlay"
      :style="{ 
        left: tooltipPosition.left + 'px', 
        top: tooltipPosition.top + 'px' 
      }"
      @click.stop
    >
      {{ tooltipContent }}
    </div>
  </Teleport>

</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue';

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
  jailFreeRent: {
    type: Array,
    default: () => []
  },
  freeRent: {
    type: Array,
    default: () => []
  },
  getTotalPropertyInvestment: {
    type: Function,
    default: null
  },
  isCompactMode: {
    type: Boolean,
    default: false
  },
  refreshKey: {
    type: Number,
    default: 0
  }
});

defineEmits(['roll', 'useItem', 'openMortgage']);

const panelRef = ref(null);
const avatarRef = ref(null);
const notifyPosStyle = ref({ display: 'none' });
let posRAF = null;

const hasNotifications = computed(() => {
  return (props.cashChanges && props.cashChanges.length > 0)
    || props.showBuffActivation
    || props.showSkipTurn
    || (props.jailFreeRent && props.jailFreeRent.length > 0)
    || (props.freeRent && props.freeRent.length > 0);
});

function updateNotifyPosition() {
  const target = avatarRef.value || panelRef.value;
  if (!target) {
    notifyPosStyle.value = { display: 'none' };
    return;
  }
  const rect = target.getBoundingClientRect();
  notifyPosStyle.value = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 4}px`,
    transform: 'translate(-50%, -100%)',
    zIndex: 99999,
    pointerEvents: 'none'
  };
}

function startPosLoop() {
  if (posRAF) return;
  function loop() {
    updateNotifyPosition();
    posRAF = requestAnimationFrame(loop);
  }
  posRAF = requestAnimationFrame(loop);
}

function stopPosLoop() {
  if (posRAF) {
    cancelAnimationFrame(posRAF);
    posRAF = null;
  }
}

watch(hasNotifications, (val) => {
  if (val) {
    updateNotifyPosition();
    startPosLoop();
  } else {
    stopPosLoop();
  }
}, { immediate: true });

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

// 新增：判断是否有状态需要显示
const hasStatus = computed(() => {
  return props.player.inJail || props.player.skipNextTurn || 
         props.player.bankrupt || props.player.bankruptWarning;
});

// 新增：跟踪当前激活的提示框
const activeTooltip = ref(null);
const tooltipPosition = ref(null);
const tooltipContent = ref('');
const buffItemRefs = ref({});

// 显示Buff提示框
const showBuffTooltip = (buffKey, event) => {
  // 如果点击的是已经显示的提示框，则关闭它
  if (activeTooltip.value === buffKey) {
    activeTooltip.value = null;
    tooltipPosition.value = null;
    tooltipContent.value = '';
  } else {
    activeTooltip.value = buffKey;

    // 获取当前点击的Buff信息
    const [buffName, index] = buffKey.split('-');
    const buffIndex = parseInt(index);
    
    // 使用computed属性activeBuffs而不是props.activeBuffs
    const buff = activeBuffs.value?.[buffIndex];
    
    console.log('[DEBUG] showBuffTooltip:', {
      buffKey,
      buffName,
      index,
      buffIndex,
      buff,
      activeBuffs: activeBuffs.value
    });
    
    if (buff) {
      // 设置提示框内容
      tooltipContent.value = `${getBuffDisplayName(buff)} - 剩余${getBuffRemainingTimes(buff)}回合`;
      
      // 计算提示框位置（在点击元素上方）
      const targetElement = event.currentTarget;
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        
        // 计算提示框应该在的位置（居中于目标元素上方）
        tooltipPosition.value = {
          left: rect.left + rect.width / 2,
          top: rect.top - 10 // 在目标元素上方10px
        };

        console.log('[DEBUG] tooltipPosition:', tooltipPosition.value);
        console.log('[DEBUG] tooltipContent:', tooltipContent.value);
      }
    } else {
      console.warn('[DEBUG] Buff not found for index:', buffIndex);
    }
  }
};

// 关闭所有提示框（点击其他地方时调用）
const hideAllTooltips = () => {
  activeTooltip.value = null;
  tooltipPosition.value = null;
  tooltipContent.value = '';
};

// 监听点击事件，点击其他地方时关闭提示框
onMounted(() => {
  document.addEventListener('click', hideAllTooltips);
});

onUnmounted(() => {
  document.removeEventListener('click', hideAllTooltips);
  stopPosLoop();
});

// 新增：格式化数字（添加千位分隔符）
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toString();  // 不添加千位分隔符
};

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
    return buff.remainingTimes;
  }
  return buff.duration;
};

const getJailRemainingTurns = () => {
  if (!props.player.inJail) return 0;
  const maxJailTurns = props.player.jailType === 'bomb' ? 2 : 1;
  const remainingTurns = maxJailTurns - props.player.jailTurns;
  return remainingTurns > 0 ? remainingTurns : 0;
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
  padding: 8px 10px;             /* 减小padding减少留白 */
  width: var(--panel-width, 270px); /* 减少默认宽度 */
  flex: 0 0 auto;              /* 不伸缩，保持设定宽度 */
  max-width: none;
  min-width: 240px;            /* 减少最小宽度 */
  height: 100%;
  transition: width 0.3s ease;  /* 宽度变化时平滑过渡 */
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08), 0 0 10px rgba(0, 0, 0, 0.05);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;             /* 防止内容超出面板 */
}

/* ========== 无Buff时：两列布局，更窄的面板 ========== */
.player-panel.no-buffs {
  width: 220px !important;       /* 无Buff时固定宽度，减少留白 */
  min-width: 220px !important;
}

/* 当需要滚动时，面板保持最小宽度 */
.players-panel-section.needs-scroll .player-panel.no-buffs {
  width: 180px;                 /* 减少宽度 */
  min-width: 180px;
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
  align-items: stretch;       /* 三列等高 */
  gap: 6px;                    /* 减小列间距 */
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: visible;           /* 允许内容显示，防止裁剪 */
  position: relative;          /* 确保子元素层级正确 */
}

/* ========== 左列：头像 + 名字 + 状态 (固定宽度) ========== */
.col-left {
  display: flex;
  flex-direction: column;     /* 垂直排列 */
  align-items: center;        /* 水平居中 */
  justify-content: center;   /* 垂直居中 */
  gap: 4px;
  flex: 0 0 auto;             /* 不伸缩，固定宽度 */
  width: 60px;                /* 固定宽度 */
  min-width: 60px;
  max-width: 60px;
  position: relative;         /* 确保层级正确 */
  z-index: 3;                 /* 最高层级确保不被遮挡 */
}

.col-left .player-avatar {
  width: 40px;
  height: 40px;
  font-size: 20px;
}

.col-left .player-name {
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
}

/* 状态栏 - 紧凑显示 */
.col-left .status-bar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.col-left .status-tag {
  font-size: 8px;
  padding: 2px 4px;
  border-radius: 4px;
}

/* ========== 中列：资源信息 (弹性) ========== */
.col-center {
  display: flex;
  flex-direction: column;     /* 垂直排列3个资源项 */
  justify-content: space-between; /* 均匀分布，确保三个都显示且不超出 */
  align-items: stretch;       /* 等宽 */
  gap: 2px;                   /* 减小间距防止超出 */
  flex: 0 0 auto;              /* 不伸缩，固定宽度 */
  width: 80px;                 /* 固定宽度为80px */
  min-width: 80px;
  max-width: 80px;
  height: 100%;               /* 占满面板高度 */
  padding: 0;                 /* 无额外padding */
  box-sizing: border-box;
  overflow: hidden;           /* 防止内容超出 */
  position: relative;         /* 确保层级正确 */
  z-index: 2;                 /* 提高层级避免被遮挡 */
}

/* 资源项 - 新样式：图标在左，数值在右（左对齐） */
.col-center .resource-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;   /* 左对齐：图标在左边，数值在右边 */
  gap: 6px;                      /* 减小图标和数值之间的间距 */
  padding: 3px 6px;              /* 减小padding节省空间 */
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 6px;            /* 圆角 */
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
  cursor: default;
  position: relative;
  flex: none;                   /* 不伸缩，固定高度 */
  height: 30px;                 /* 固定高度 - 与Buff项完全一致 */
  min-height: 24px;             /* 最小高度确保显示 */
  max-height: 36px;             /* 最大高度限制 */
  width: 100%;                  /* 占满容器宽度 */
  box-sizing: border-box;       /* 包含padding和border */
}

.col-center .resource-item:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.col-center .resource-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.col-center .resource-value {
  font-size: 12px;             /* 适当字体大小 */
  font-weight: bold;
  color: #FFD700;
  font-family: 'Courier New', monospace; /* 等宽数字 */
  white-space: nowrap;         /* 防止换行 */
  overflow: visible;           /* 允许显示 */
  flex: 1;                     /* 占据剩余空间 */
  min-width: 50px;             /* 确保最小宽度能显示5位数 */
}

.col-center .resource-item.cash:hover { border-color: rgba(76, 175, 80, 0.5); }
.col-center .resource-item.property { cursor: pointer; }
.col-center .resource-item.property:not(.disabled):hover { border-color: rgba(33, 150, 243, 0.5); }
.col-center .resource-item.property.disabled { opacity: 0.5; cursor: not-allowed; }
.col-center .resource-item.mortgage { cursor: default; }

/* 无Buff时，中列可以更宽，资源项左对齐 */
.player-panel.no-buffs .col-center {
  justify-content: space-evenly; /* 更均匀分布 */
  align-items: stretch;          /* 等宽拉伸 */
}

/* 无Buff时，资源项可以稍微宽一些，保持左对齐 */
.player-panel.no-buffs .col-center .resource-item {
  width: 100%;
  max-width: none;               /* 移除最大宽度限制 */
}

/* ========== 右列：Buff列表 (仅当有Buff时显示) ========== */
.col-right {
  display: flex;
  flex-direction: column;     /* 垂直排列Buff */
  align-items: stretch;
  justify-content: flex-start; /* 从顶部开始排列 */
  gap: 0;                      /* 移除gap，让buffs-list控制间距 */
  flex: 1;                     /* 占据剩余空间 */
  min-width: 70px;             /* 减小最小宽度 */
  max-width: 100px;            /* 减小最大宽度限制 */
  height: 100%;                /* 占满高度 */
  padding: 0;                  /* 无额外padding */
  overflow-x: hidden;          /* 禁止左右滚动 */
  overflow-y: visible;         /* 允许垂直溢出（由buffs-list控制） */
  position: relative;          /* 确保不遮挡其他元素 */
  z-index: 1;                  /* 降低层级避免遮挡 */
}

/* Buff列表容器 - 在.col-right内 */
.buffs-list {
  display: flex;
  flex-direction: column;     /* 垂直排列Buff项 */
  align-items: stretch;
  gap: 2px;                    /* Buff项之间的间距 - 与中间列资源项的gap完全一致 */
  height: 100%;                /* 占满父容器高度 */
  overflow-x: hidden;          /* 禁止左右滚动 */
  overflow-y: auto;            /* 允许垂直滚动（当Buff多时显示滚轮） */
  padding-right: 3px;          /* 为滚动条留出空间 */
}

/* 移除滚动条相关样式（不再需要） */

/* ========== Buff项样式 - 完整模式 ========== */

/* ========== 头像样式 (在.col-left内) ========== */
.player-avatar {
  width: 40px;                 /* 适应左列 */
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
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

/* ========== 玩家名字 (在.col-left内) ========== */
.player-name {
  font-size: 12px;             /* 适应左列较小宽度 */
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
  margin-bottom: 2px;           /* 减小间距 */
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 状态栏 (在.col-left内) ========== */
.status-bar {
  display: flex;
  flex-direction: column;
  align-items: center;        /* 居中显示 */
  gap: 2px;
  margin-top: 2px;
}

.status-tag {
  font-size: 8px;               /* 更小字体适应左列 */
  font-weight: bold;
  padding: 1px 4px;             /* 更紧凑 */
  border-radius: 4px;
  white-space: nowrap;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

.status-tag.jail {
  background: linear-gradient(135deg, #78909c 0%, #546e7a 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(120, 144, 156, 0.4);
}

.status-tag.skip {
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
  color: #1a1a2e;
  box-shadow: 0 2px 6px rgba(255, 193, 7, 0.4);
}

.status-tag.bankrupt {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(229, 57, 53, 0.4);
}

.status-tag.warning {
  background: linear-gradient(135deg, #ff9800 0%, #f44336 100%);
  color: white;
  animation: blink-warning 1s ease-in-out infinite;
  box-shadow: 0 2px 6px rgba(244, 67, 54, 0.4);
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
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 6px 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  width: 100%;
  min-height: 28px;
  white-space: nowrap;
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
  flex-shrink: 0;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
}

.resource-value {
  font-size: 12px;
  font-weight: bold;
  color: #FFD700;
  font-family: 'Courier New', monospace;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  overflow: visible;
  flex: 1;
  min-width: 50px;
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
  gap: 2px;                     /* 与中间列资源项的gap完全一致 */
  max-height: 140px;           /* 限制最大高度，超出显示滚动条 */
  overflow-x: hidden;          /* 禁止左右滚动 */
  overflow-y: auto;            /* 允许上下滚动（当buff多时） */
  padding-right: 4px;          /* 为滚动条留出空间 */
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
  gap: 6px;                     /* 与资源项相同的间距 */
  padding: 3px 6px;             /* 与资源项相同的padding */
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.1) 100%);
  border-radius: 6px;            /* 与资源项相同的圆角 */
  border: 1px solid rgba(255, 215, 0, 0.2);
  position: relative;          /* 为tooltip定位 */
  cursor: pointer;             /* 提示可点击 */
  transition: all 0.2s ease;    /* 与资源项相同的过渡时间 */
  overflow: visible;           /* 允许提示框显示 */
  flex: none;                  /* 不伸缩，固定高度 */
  height: 30px;                /* 固定高度 - 与资源项一致（24-36px的中间值） */
  min-height: 24px;             /* 最小高度 - 与资源项相同 */
  max-height: 36px;             /* 最大高度限制 - 与资源项相同 */
}

.buff-item:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.35) 0%, rgba(255, 165, 0, 0.2) 100%);
  border-color: rgba(255, 215, 0, 0.6);
}

.buff-icon {
  font-size: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.buff-item:hover .buff-icon {
  transform: scale(1.15);
  background: rgba(255, 215, 0, 0.3);
}

.buff-name {
  font-size: 10px;
  color: white;
  font-weight: bold;
  overflow: hidden;              /* 隐藏溢出文字 */
  text-overflow: ellipsis;      /* 显示省略号 */
  white-space: nowrap;          /* 不换行 */
  flex: 1 1 auto;               /* 弹性收缩 */
  min-width: 30px;              /* 最小宽度，确保能看到省略号 */
  max-width: 80px;              /* 最大宽度限制 */
  transition: all 0.2s ease;
}

.buff-duration {
  font-size: 9px;
  color: #ffd700;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  font-weight: bold;
  transition: all 0.2s ease;
}

/* ========== 紧凑模式：当面板宽度 < 260px 时只显示图标+次数 ========== */
.player-panel.compact-mode .buff-name {
  display: none !important;   /* 默认强制隐藏名称 */
}

.player-panel.compact-mode .buff-duration {
  display: inline-block !important; /* 强制显示次数 */
  margin-left: 2px;
}

/* 紧凑模式下图标+次数 */
.player-panel.compact-mode .buff-item,
.player-panel.compact-mode .buff-item.compact-buff {
  justify-content: flex-start;     /* 左对齐 */
  padding: 3px 6px;
  gap: 4px;
  width: auto;
  min-width: unset;
}

/* 紧凑模式下增加Buff列宽度 */
.player-panel.compact-mode .col-right {
  min-width: 75px;             /* 从70px增加到75px (+5px) */
  max-width: 105px;            /* 从100px增加到105px (+5px) */
}

/* 需要滚动时增加Buff列宽度 */
.players-panel-section.needs-scroll .player-panel .col-right {
  min-width: 78px;             /* 增加最小宽度 (+8px) */
  max-width: 108px;            /* 增加最大宽度 (+8px) */
}

/* 需要滚动且紧凑模式时进一步增加Buff列宽度 */
.players-panel-section.needs-scroll .player-panel.compact-mode .col-right {
  min-width: 82px;             /* 进一步增加 (+12px) */
  max-width: 112px;            /* 进一步增加 (+12px) */
}

.player-panel.compact-mode .buff-icon {
  font-size: 16px;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

/* ========== 点击显示的上方提示框样式（最上层） ========== */
.buff-tooltip-overlay {
  position: fixed;             /* 固定定位，相对于视口 */
  left: 50%;                   /* 水平居中（由JS动态设置） */
  top: 50%;                    /* 垂直位置（由JS动态设置） */
  transform: translate(-50%, -100%); /* 居中并向上偏移 */
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.98), rgba(20, 20, 40, 0.98));
  color: #FFD700;              /* 金色文字 */
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: normal;
  white-space: nowrap;
  pointer-events: auto;        /* 允许点击 */
  z-index: 99999;              /* 超高z-index，确保在最上层 */
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3);
  border: 2px solid rgba(255, 215, 0, 0.7);
  animation: tooltipFadeInFixed 0.25s ease-out;
  max-width: 400px;            /* 最大宽度限制 */
  text-align: center;
}

/* 提示框小三角（指向下方） */
.buff-tooltip-overlay::after {
  content: '';
  position: absolute;
  bottom: -10px;               /* 三角在底部 */
  left: 50%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-top-color: rgba(30, 30, 50, 0.98);
  filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.3));
}

/* 提示框淡入动画（固定定位版本） */
@keyframes tooltipFadeInFixed {
  from {
    opacity: 0;
    transform: translate(-50%, -90%); /* 从稍下方开始 */
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%); /* 到最终位置 */
  }
}

/* 紧凑模式下资源项也稍微缩小 */
.player-panel.compact-mode .resource-item {
  padding: 0 6px;
  gap: 6px;
}

.player-panel.compact-mode .resource-item .resource-icon {
  font-size: 14px;
}

.player-panel.compact-mode .resource-item .resource-value {
  font-size: 10px;
  min-width: 40px;
}

/* 移除Tooltip样式 - 现在使用点击展开显示完整内容 */





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
  gap: 4px;                    /* 减小间距 */
  flex: 0 0 auto;
  margin-right: 8px;
  min-width: 50px;             /* 设置最小宽度 */
}

.notifications-float {
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
}

.skip-turn-notify {
  font-size: 14px;
  font-weight: bold;
  padding: 8px 14px;
  border-radius: 10px;
  white-space: nowrap;
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
  color: #1a1a2e;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 193, 7, 0.5);
  animation: cash-float 4s ease-out forwards;
  display: flex;
  align-items: center;
  gap: 6px;
}

.jail-free-rent-notify {
  font-size: 14px;
  font-weight: bold;
  padding: 8px 14px;
  border-radius: 10px;
  white-space: nowrap;
  background: linear-gradient(135deg, #78909c 0%, #546e7a 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(120, 144, 156, 0.5);
  animation: cash-float 4s ease-out forwards;
  display: flex;
  align-items: center;
  gap: 6px;
}

.free-rent-notify {
  font-size: 14px;
  font-weight: bold;
  padding: 8px 14px;
  border-radius: 10px;
  white-space: nowrap;
  background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(76, 175, 80, 0.5);
  animation: cash-float 4s ease-out forwards;
  display: flex;
  align-items: center;
  gap: 6px;
}

.skip-turn-notify.in-jail {
  background: linear-gradient(135deg, #78909c 0%, #546e7a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(120, 144, 156, 0.5);
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

@media (max-height: 500px) {
  .player-panel {
    width: 100% !important;
    min-width: unset !important;
    max-width: none !important;
    padding: 4px 6px !important;
  }

  .player-panel.no-buffs {
    width: 100% !important;
    min-width: unset !important;
  }

  .panel-content {
    gap: 3px !important;
  }

  .col-left {
    width: 42px !important;
    min-width: 42px !important;
    max-width: 42px !important;
    gap: 2px !important;
  }

  .col-left .player-avatar {
    width: 28px !important;
    height: 28px !important;
    font-size: 14px !important;
  }

  .col-left .player-name {
    font-size: 9px !important;
    max-width: 42px !important;
  }

  .col-center {
    flex: 1 !important;
    min-width: unset !important;
    max-width: unset !important;
  }

  .col-center .resource-item {
    height: 22px !important;
    padding: 1px 5px !important;
    gap: 3px !important;
  }

  .col-center .resource-icon {
    font-size: 12px !important;
  }

  .col-center .resource-value {
    font-size: 9px !important;
    min-width: unset !important;
  }

  .col-right {
    flex: 0 0 auto !important;
    min-width: unset !important;
    max-width: unset !important;
  }

  .buff-item {
    height: 20px !important;
    padding: 1px 4px !important;
    gap: 2px !important;
  }

  .buff-icon {
    font-size: 10px !important;
    width: 14px !important;
    height: 14px !important;
  }

  .buff-duration {
    font-size: 7px !important;
    padding: 0 2px !important;
  }

  .player-panel.active {
    transform: scale(1.01);
  }

  .status-tag {
    font-size: 7px !important;
    padding: 1px 2px !important;
  }

  /* 通知提示框缩小 - 左侧定位 */
  .notifications-float {
    gap: 2px !important;
  }

  .cash-change-notify {
    font-size: 11px !important;
    padding: 3px 6px !important;
    border-radius: 5px !important;
    border-width: 1px !important;
  }

  .skip-turn-notify,
  .jail-free-rent-notify,
  .free-rent-notify {
    font-size: 9px !important;
    padding: 3px 6px !important;
    border-radius: 5px !important;
    gap: 2px !important;
    border-width: 1px !important;
  }

  .buff-activation-notify {
    font-size: 9px !important;
    padding: 3px 6px !important;
    border-radius: 5px !important;
    min-width: unset !important;
    border-width: 1px !important;
  }
}

/* ==================== 网页端桌面屏幕适配 ==================== */

/* 超大屏幕 (≥1920px) */
@media (min-width: 1920px) {
  .player-panel {
    width: var(--panel-width, 320px);
    min-width: 280px;
  }

  .player-panel.no-buffs {
    width: 260px !important;
    min-width: 260px !important;
  }

  .col-left .player-avatar {
    width: 52px;
    height: 52px;
    font-size: 24px;
  }

  .col-left .player-name {
    font-size: 16px;
  }

  .col-center .resource-item {
    height: 34px;
    padding: 4px 12px;
    gap: 8px;
  }

  .col-center .resource-icon {
    font-size: 20px;
  }

  .col-center .resource-value {
    font-size: 18px;
  }

  .status-tag {
    font-size: 12px;
    padding: 4px 8px;
  }

  .buff-item {
    height: 32px;
    padding: 4px 10px;
    gap: 6px;
  }

  .buff-icon {
    font-size: 18px;
    width: 22px;
    height: 22px;
  }

  .buff-duration {
    font-size: 12px;
  }
}

/* 大屏幕 (1600px - 1919px) */
@media (max-width: 1919px) and (min-width: 1600px) {
  .player-panel {
    width: var(--panel-width, 300px);
    min-width: 260px;
  }

  .player-panel.no-buffs {
    width: 240px !important;
    min-width: 240px !important;
  }

  .col-left .player-avatar {
    width: 48px;
    height: 48px;
    font-size: 22px;
  }

  .col-left .player-name {
    font-size: 15px;
  }

  .col-center .resource-item {
    height: 32px;
    padding: 3px 10px;
    gap: 6px;
  }

  .col-center .resource-icon {
    font-size: 18px;
  }

  .col-center .resource-value {
    font-size: 16px;
  }

  .status-tag {
    font-size: 11px;
    padding: 3px 7px;
  }

  .buff-item {
    height: 30px;
    padding: 3px 8px;
    gap: 5px;
  }

  .buff-icon {
    font-size: 16px;
    width: 20px;
    height: 20px;
  }

  .buff-duration {
    font-size: 11px;
  }
}

/* 主流大屏幕 (1440px - 1599px) */
@media (max-width: 1599px) and (min-width: 1440px) {
  .player-panel {
    width: var(--panel-width, 280px);
    min-width: 240px;
  }

  .player-panel.no-buffs {
    width: 220px !important;
    min-width: 220px !important;
  }

  .col-left .player-avatar {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .col-left .player-name {
    font-size: 14px;
  }

  .col-center .resource-item {
    height: 30px;
    padding: 3px 8px;
    gap: 5px;
  }

  .col-center .resource-icon {
    font-size: 16px;
  }

  .col-center .resource-value {
    font-size: 15px;
  }

  .status-tag {
    font-size: 10px;
    padding: 2px 6px;
  }

  .buff-item {
    height: 28px;
    padding: 2px 7px;
    gap: 4px;
  }

  .buff-icon {
    font-size: 14px;
    width: 18px;
    height: 18px;
  }

  .buff-duration {
    font-size: 10px;
  }
}

/* 标准桌面屏幕 (1280px - 1439px) */
@media (max-width: 1439px) and (min-width: 1280px) {
  .player-panel {
    width: var(--panel-width, 260px);
    min-width: 220px;
  }

  .player-panel.no-buffs {
    width: 200px !important;
    min-width: 200px !important;
  }

  .col-left .player-avatar {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .col-left .player-name {
    font-size: 13px;
  }

  .col-center .resource-item {
    height: 28px;
    padding: 2px 6px;
    gap: 4px;
  }

  .col-center .resource-icon {
    font-size: 15px;
  }

  .col-center .resource-value {
    font-size: 14px;
  }

  .status-tag {
    font-size: 10px;
    padding: 2px 5px;
  }

  .buff-item {
    height: 26px;
    padding: 2px 6px;
    gap: 3px;
  }

  .buff-icon {
    font-size: 13px;
    width: 16px;
    height: 16px;
  }

  .buff-duration {
    font-size: 9px;
  }
}

/* 中等桌面屏幕 (1024px - 1279px) */
@media (max-width: 1279px) and (min-width: 1024px) {
  .player-panel {
    width: var(--panel-width, 240px);
    min-width: 200px;
  }

  .player-panel.no-buffs {
    width: 180px !important;
    min-width: 180px !important;
  }

  .col-left .player-avatar {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .col-left .player-name {
    font-size: 12px;
  }

  .col-center .resource-item {
    height: 26px;
    padding: 2px 5px;
    gap: 3px;
  }

  .col-center .resource-icon {
    font-size: 14px;
  }

  .col-center .resource-value {
    font-size: 13px;
  }

  .buff-item {
    height: 24px;
    padding: 2px 5px;
    gap: 2px;
  }

  .buff-icon {
    font-size: 12px;
    width: 14px;
    height: 14px;
  }

  .buff-duration {
    font-size: 9px;
  }
}
</style>
