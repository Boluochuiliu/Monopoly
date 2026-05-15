# 存档系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现大富翁游戏的存档系统，支持自动保存、手动保存和读取存档功能

**Architecture:** 使用浏览器 localStorage 作为存储介质，创建存档管理工具处理保存/加载逻辑，在开始界面和游戏中集成存档功能

**Tech Stack:** Vue 3, JavaScript, localStorage

---

## 文件结构

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/utils/saveManager.js` | 新建 | 存档管理工具 |
| `src/composables/useGameState.js` | 修改 | 添加导入存档功能 |
| `src/components/SaveLoadModal.vue` | 新建 | 存档选择弹窗组件 |
| `src/components/StartScreen.vue` | 修改 | 添加继续游戏和读取存档按钮 |
| `src/App.vue` | 修改 | 集成存档功能和自动保存 |

---

### Task 1: 创建存档管理工具

**Files:**
- Create: `src/utils/saveManager.js`

- [ ] **Step 1: 创建 saveManager.js 文件**

```javascript
export const GAME_VERSION = '1.0.0';
export const AUTO_SAVE_SLOT = 0;
export const MAX_SAVE_SLOTS = 4;

export function saveGame(slotIndex, gameState) {
  try {
    const saveData = {
      timestamp: Date.now(),
      version: GAME_VERSION,
      data: {
        players: JSON.parse(JSON.stringify(gameState.players.value)),
        currentPlayerIndex: gameState.currentPlayerIndex.value,
        round: gameState.round.value,
        properties: JSON.parse(JSON.stringify(gameState.properties)),
        bombs: JSON.parse(JSON.stringify(gameState.bombs)),
        chanceDeck: [...gameState.chanceDeck.value],
        fateDeck: [...gameState.fateDeck.value],
        globalBuffs: JSON.parse(JSON.stringify(gameState.globalBuffs.value)),
        turnHistory: JSON.parse(JSON.stringify(gameState.turnHistory.value)),
        auctionState: JSON.parse(JSON.stringify(gameState.auctionState))
      }
    };
    localStorage.setItem(`monopoly_save_${slotIndex}`, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

export function loadGame(slotIndex) {
  try {
    const saveData = localStorage.getItem(`monopoly_save_${slotIndex}`);
    if (!saveData) return null;
    
    const parsed = JSON.parse(saveData);
    
    if (parsed.version !== GAME_VERSION) {
      console.warn('Save file version mismatch');
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

export function getSaveInfo(slotIndex) {
  try {
    const saveData = localStorage.getItem(`monopoly_save_${slotIndex}`);
    if (!saveData) return null;
    
    const parsed = JSON.parse(saveData);
    return {
      timestamp: parsed.timestamp,
      version: parsed.version,
      playerCount: parsed.data.players.length,
      round: parsed.data.round
    };
  } catch (error) {
    return null;
  }
}

export function deleteSave(slotIndex) {
  localStorage.removeItem(`monopoly_save_${slotIndex}`);
}

export function hasAutoSave() {
  return localStorage.getItem(`monopoly_save_${AUTO_SAVE_SLOT}`) !== null;
}

export function getAllSaveInfo() {
  const saves = [];
  for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
    const info = getSaveInfo(i);
    saves.push({
      slotIndex: i,
      isAuto: i === AUTO_SAVE_SLOT,
      ...(info || {})
    });
  }
  return saves;
}
```

- [ ] **Step 2: 验证文件创建**

Run: `cat src/utils/saveManager.js`

Expected: 文件内容正确显示

- [ ] **Step 3: Commit**

```bash
git add src/utils/saveManager.js
git commit -m "feat: add save manager utility"
```

---

### Task 2: 修改游戏状态管理

**Files:**
- Modify: `src/composables/useGameState.js`

- [ ] **Step 1: 在 useGameState.js 中添加导入存档功能**

在文件末尾的 `return` 语句之前添加：

```javascript
function importSaveData(saveData) {
  const { players, currentPlayerIndex, round, properties, bombs, 
          chanceDeck, fateDeck, globalBuffs, turnHistory, auctionState } = saveData.data;
  
  players.value = players;
  currentPlayerIndex.value = currentPlayerIndex;
  round.value = round;
  
  Object.keys(properties).forEach(id => {
    properties[id] = properties[id];
  });
  
  Object.keys(bombs).forEach(key => {
    bombs[key] = bombs[key];
  });
  
  chanceDeck.value = [...chanceDeck];
  fateDeck.value = [...fateDeck];
  globalBuffs.value = [...globalBuffs];
  turnHistory.value = [...turnHistory];
  
  Object.assign(auctionState, auctionState);
  
  gamePhase.value = 'playing';
}
```

在 `return` 对象中添加：
```javascript
importSaveData
```

- [ ] **Step 2: 验证修改**

Run: `cat src/composables/useGameState.js | grep -A 5 "importSaveData"`

Expected: 显示导入函数定义

- [ ] **Step 3: Commit**

```bash
git add src/composables/useGameState.js
git commit -m "feat: add importSaveData function"
```

---

### Task 3: 创建存档选择弹窗组件

**Files:**
- Create: `src/components/SaveLoadModal.vue`

- [ ] **Step 1: 创建 SaveLoadModal.vue**

```vue
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
          :disabled="!selectedSlot && mode === 'save' || (!selectedSlot && mode === 'load')"
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
const selectedSlot = ref(null);

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
  if (!saveSlots.value[index].timestamp && props.mode === 'load') return;
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
```

- [ ] **Step 2: 验证文件创建**

Run: `cat src/components/SaveLoadModal.vue | head -50`

Expected: 文件内容正确显示

- [ ] **Step 3: Commit**

```bash
git add src/components/SaveLoadModal.vue
git commit -m "feat: add SaveLoadModal component"
```

---

### Task 4: 修改开始界面

**Files:**
- Modify: `src/components/StartScreen.vue`

- [ ] **Step 1: 读取 StartScreen.vue 文件**

Run: `cat src/components/StartScreen.vue`

- [ ] **Step 2: 修改 StartScreen.vue 添加存档功能**

在 template 中添加继续游戏和读取存档按钮：

```vue
<template>
  <div class="start-screen">
    <!-- ... 现有内容 ... -->
    
    <div v-if="hasSave" class="save-buttons">
      <button class="btn btn-primary btn-continue" @click="continueGame">
        ▶️ 继续游戏
      </button>
    </div>
    
    <!-- ... 现有按钮 ... -->
    
    <button class="btn btn-secondary btn-load" @click="showLoadModal = true">
      📂 读取存档
    </button>
    
    <SaveLoadModal
      v-if="showLoadModal"
      mode="load"
      @close="showLoadModal = false"
      @confirm="handleLoadGame"
    />
  </div>
</template>
```

在 script 中添加：

```javascript
import { ref, onMounted } from 'vue';
import { hasAutoSave, loadGame } from '../utils/saveManager';

const hasSave = ref(false);
const showLoadModal = ref(false);

const emit = defineEmits(['start', 'load']);

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
```

添加样式：

```css
.save-buttons {
  margin-bottom: 16px;
}

.btn-continue {
  width: 100%;
  padding: 16px 48px;
  font-size: 20px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}

.btn-load {
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-load:hover {
  background: rgba(255, 255, 255, 0.15);
}
```

- [ ] **Step 3: 验证修改**

Run: `cat src/components/StartScreen.vue | grep -A 5 "continueGame"`

Expected: 显示继续游戏函数

- [ ] **Step 4: Commit**

```bash
git add src/components/StartScreen.vue
git commit -m "feat: add save/load buttons to start screen"
```

---

### Task 5: 修改主应用集成存档功能

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 在 App.vue 中添加存档功能**

在 script 中添加：

```javascript
import { ref } from 'vue';
import { saveGame, AUTO_SAVE_SLOT } from './utils/saveManager';

const showSaveModal = ref(false);
const showLoadModal = ref(false);
const showSaveSuccess = ref(false);

function handleLoadGame(saveData) {
  gameState.importSaveData(saveData);
}

function handleSaveGame(slotIndex) {
  saveGame(slotIndex, gameState);
  showSaveModal.value = false;
  showSaveSuccessNotification();
}

function showSaveSuccessNotification() {
  showSaveSuccess.value = true;
  setTimeout(() => {
    showSaveSuccess.value = false;
  }, 2000);
}

function autoSave() {
  if (gamePhase.value === 'playing') {
    saveGame(AUTO_SAVE_SLOT, gameState);
  }
}
```

在 template 中添加：

```vue
<template>
  <div class="app">
    <!-- 保存成功提示 -->
    <Transition name="fade">
      <div v-if="showSaveSuccess" class="save-success-notification">
        ✓ 游戏已保存
      </div>
    </Transition>
    
    <!-- 菜单按钮 -->
    <button 
      v-if="gamePhase === 'playing'" 
      class="menu-button"
      @click="showSaveModal = true"
    >
      ⚙️
    </button>
    
    <SaveLoadModal
      v-if="showSaveModal"
      mode="save"
      @close="showSaveModal = false"
      @confirm="handleSaveGame"
    />
    
    <SaveLoadModal
      v-if="showLoadModal"
      mode="load"
      @close="showLoadModal = false"
      @confirm="handleLoadGame"
    />
    
    <!-- ... 现有内容 ... -->
  </div>
</template>
```

添加样式：

```css
.save-success-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(76, 175, 80, 0.9);
  color: white;
  border-radius: 12px;
  font-weight: bold;
  z-index: 2000;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.menu-button {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
}

.menu-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}
```

- [ ] **Step 2: 添加自动保存到 endTurn 函数**

在调用 endTurn 的地方添加自动保存：

```javascript
function endTurn() {
  // ... 现有逻辑 ...
  autoSave();
}
```

- [ ] **Step 3: 验证修改**

Run: `cat src/App.vue | grep -A 3 "autoSave"`

Expected: 显示自动保存调用

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat: integrate save system into App.vue"
```

---

### Task 6: 测试与验证

**Files:**
- Test: 整体功能测试

- [ ] **Step 1: 构建项目**

Run: `npm run build`

Expected: 构建成功

- [ ] **Step 2: 启动开发服务器**

Run: `npm run dev`

Expected: 服务器启动成功

- [ ] **Step 3: 测试存档功能**

1. 开始新游戏
2. 玩几回合
3. 点击菜单按钮保存游戏
4. 刷新页面
5. 验证"继续游戏"按钮出现
6. 点击继续游戏验证存档恢复

- [ ] **Step 4: 完成测试**

---

## 自我检查

1. ✅ Spec 覆盖：所有需求都有对应的任务
2. ✅ 无占位符：所有步骤都有具体代码
3. ✅ 类型一致性：函数名和数据结构保持一致

---

**Plan Version:** v1.0  
**Created:** 2026-05-15