# 响应式界面改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现大富翁游戏的响应式布局，支持地图缩放/拖动、角色面板自适应、弹窗等比缩放

**Architecture:** 使用 Vue 3 Composition API 创建 `useResponsiveMap` composable 封装所有地图响应式逻辑，通过 CSS Transform 实现高性能缩放/平移，修改现有组件（GameBoard、PlayerPanel、Modal、App）集成响应式功能

**Tech Stack:** Vue 3, Composition API, CSS3 Transform, JavaScript ES6+

**Spec Document:** [2026-05-15-responsive-ui-design.md](../specs/2026-05-15-responsive-ui-design.md)

---

## File Structure Map

```
src/
├── composables/
│   └── useResponsiveMap.js          ← NEW: 地图响应式逻辑 (~200行)
├── components/
│   ├── GameBoard.vue                ← MODIFY: 集成composable + 缩放控件
│   ├── PlayerPanel.vue              ← MODIFY: 固定宽度模式
│   └── Modal.vue                    ← MODIFY: 响应式尺寸
├── App.vue                          ← MODIFY: Flex Column布局 + resize监听
```

---

## Task 1: 创建 useResponsiveMap Composable - 基础架构

**Files:**
- Create: `src/composables/useResponsiveMap.js`

- [ ] **Step 1: 创建文件并定义配置常量**

```javascript
// src/composables/useResponsiveMap.js
import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useResponsiveMap(containerRef) {
  // ========== 配置常量 ==========
  const CONFIG = {
    MIN_SCALE: 0.5,                       // 最小缩放比例
    MAX_SCALE: 2.0,                       // 最大缩放比例
    SCALE_STEP: 0.1,                      // 每次缩放步长
    MAP_BASE_WIDTH: 900,                  // 地图基准宽度 (px)
    MAP_BASE_HEIGHT: 700,                 // 地图基准高度 (px)
    WHEEL_ZOOM_SENSITIVITY: 0.001,        // 滚轮灵敏度
    ANIMATION_DURATION: 300               // 动画时长 (ms)
  }

  // ========== 核心状态 ==========
  const scale = ref(1)                    // 当前缩放比例
  const offsetX = ref(0)                  // X轴偏移量
  const offsetY = ref(0)                  // Y轴偏移量
  const isDragging = ref(false)           // 是否正在拖拽

  return {
    CONFIG,
    scale,
    offsetX,
    offsetY,
    isDragging
  }
}
```

- [ ] **Step 2: 验证基础结构**

在浏览器控制台测试：
```javascript
// 在任意Vue组件中临时测试
import { useResponsiveMap } from './composables/useResponsiveMap'
const container = document.createElement('div')
const map = useResponsiveMap({ value: container })
console.log('CONFIG:', map.CONFIG)
console.log('Initial scale:', map.scale.value)  // 应为 1
console.log('Initial offset:', map.offsetX.value, map.offsetY.value)  // 应为 0, 0
```

Expected: 所有值正确输出，无报错

- [ ] **Step 3: Commit**

```bash
git add src/composables/useResponsiveMap.js
git commit -m "feat: create useResponsiveMap composable with config and state"
```

---

## Task 2: 实现自动缩放算法和边界检测

**Files:**
- Modify: `src/composables/useResponsiveMap.js`

- [ ] **Step 1: 实现 optimalScale 计算属性**

在 `useResponsiveMap.js` 中添加：

```javascript
// ========== 计算属性：最佳缩放比例 ==========
const optimalScale = computed(() => {
  if (!containerRef.value) return 1
  
  const containerWidth = containerRef.value.clientWidth
  const containerHeight = containerRef.value.clientHeight
  
  // 计算宽度和高度的缩放比例
  const scaleX = containerWidth / CONFIG.MAP_BASE_WIDTH
  const scaleY = containerHeight / CONFIG.MAP_BASE_HEIGHT
  
  // 取较小值确保完整可见，且不超过最大限制
  return Math.min(
    Math.min(scaleX, scaleY),
    CONFIG.MAX_SCALE
  )
})

// ========== 计算属性：地图实际尺寸 ==========
const mapActualSize = computed(() => ({
  width: CONFIG.MAP_BASE_WIDTH * scale.value,
  height: CONFIG.MAP_BASE_HEIGHT * scale.value
}))
```

并在 return 中添加：
```javascript
return {
  // ... 已有返回值
  optimalScale,
  mapActualSize
}
```

- [ ] **Step 2: 实现边界检测函数**

添加以下函数：

```javascript
// ========== 边界检测算法 ==========
function calculateBounds() {
  const container = containerRef.value
  if (!container) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  
  const containerW = container.clientWidth
  const containerH = container.clientHeight
  const mapW = CONFIG.MAP_BASE_WIDTH * scale.value
  const mapH = CONFIG.MAP_BASE_HEIGHT * scale.value
  
  return {
    minX: Math.min(0, containerW - mapW),
    maxX: Math.max(0, (mapW - containerW) / 2),
    minY: Math.min(0, containerH - mapH),
    maxY: Math.max(0, (mapH - containerH) / 2)
  }
}

// ========== 辅助工具函数 ==========
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function constrainToBounds() {
  const bounds = calculateBounds()
  offsetX.value = clamp(offsetX.value, bounds.minX, bounds.maxX)
  offsetY.value = clamp(offsetY.value, bounds.minY, bounds.maxY)
}
```

并在 return 中添加：
```javascript
return {
  // ... 已有返回值
  calculateBounds,
  constrainToBounds
}
```

- [ ] **Step 3: 手动验证边界计算**

在浏览器控制台：
```javascript
// 模拟不同容器尺寸
const testContainer = document.querySelector('.game-board-section') || document.body
const map = useResponsiveMap({ value: testContainer })

console.log('Optimal scale:', map.optimalScale.value)
console.log('Bounds:', map.calculateBounds())

// 测试clamp函数
console.log('Clamp(-5, 0, 10):', map.constrainToBounds ? 'method exists' : 'missing')
```

Expected: optimalScale 根据容器大小动态计算，bounds 返回合理的边界值

- [ ] **Step 4: Commit**

```bash
git add src/composables/useResponsiveMap.js
git commit -m "feat: implement auto-scale algorithm and boundary detection"
```

---

## Task 3: 实现滚轮缩放和鼠标拖拽功能

**Files:**
- Modify: `src/composables/useResponsiveMap.js`

- [ ] **Step 1: 实现按钮缩放方法**

```javascript
// ========== 缩放方法 ==========
function zoomIn() {
  updateScale(scale.value + CONFIG.SCALE_STEP)
}

function zoomOut() {
  updateScale(scale.value - CONFIG.SCALE_STEP)
}

function resetZoom() {
  scale.value = optimalScale.value
  offsetX.value = 0
  offsetY.value = 0
}

function updateScale(newScale) {
  const clamped = clamp(newScale, CONFIG.MIN_SCALE, CONFIG.MAX_SCALE)
  
  // 以容器中心为缩放中心
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const scaleRatio = clamped / scale.value
    offsetX.value = centerX - (centerX - offsetX.value) * scaleRatio
    offsetY.value = centerY - (centerY - offsetY.value) * scaleRatio
  }
  
  scale.value = clamped
  constrainToBounds()
}
```

- [ ] **Step 2: 实现滚轮缩放事件处理**

```javascript
// ========== 滚轮缩放 ==========
function handleWheel(e) {
  e.preventDefault()
  
  if (!containerRef.value) return
  
  // 获取鼠标相对于容器的坐标
  const rect = containerRef.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  // 计算新的缩放值
  const delta = -e.deltaY * CONFIG.WHEEL_ZOOM_SENSITIVITY
  const newScale = clamp(
    scale.value + delta,
    CONFIG.MIN_SCALE,
    CONFIG.MAX_SCALE
  )
  
  // 以鼠标位置为中心进行缩放变换
  const scaleRatio = newScale / scale.value
  offsetX.value = mouseX - (mouseX - offsetX.value) * scaleRatio
  offsetY.value = mouseY - (mouseY - offsetY.value) * scaleRatio
  
  scale.value = newScale
  constrainToBounds()
}
```

- [ ] **Step 3: 实现鼠标拖拽事件处理**

```javascript
// ========== 鼠标拖拽 ==========
let dragStart = { x: 0, y: 0 }

function handleMouseDown(e) {
  isDragging.value = true
  dragStart = {
    x: e.clientX - offsetX.value,
    y: e.clientY - offsetY.value
  }
}

function handleMouseMove(e) {
  if (!isDragging.value) return
  
  // 计算新偏移量
  let newX = e.clientX - dragStart.x
  let newY = e.clientY - dragStart.y
  
  // 应用边界限制
  const bounds = calculateBounds()
  newX = clamp(newX, bounds.minX, bounds.maxX)
  newY = clamp(newY, bounds.minY, bounds.maxY)
  
  offsetX.value = newX
  offsetY.value = newY
}

function handleMouseUp() {
  isDragging.value = false
}

function handleMouseLeave() {
  isDragging.value = false
}
```

- [ ] **Step 4: 实现触摸屏支持**

```javascript
// ========== 触摸屏支持 ==========
let touchStartDistance = 0
let touchStartScale = 1

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchCenter(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  }
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    // 单指拖动
    isDragging.value = true
    dragStart = {
      x: e.touches[0].clientX - offsetX.value,
      y: e.touches[0].clientY - offsetY.value
    }
  } else if (e.touches.length === 2) {
    // 双指缩放
    touchStartDistance = getTouchDistance(e.touches)
    touchStartScale = scale.value
  }
}

function handleTouchMove(e) {
  e.preventDefault()
  
  if (e.touches.length === 1 && isDragging.value) {
    let newX = e.touches[0].clientX - dragStart.x
    let newY = e.touches[0].clientY - dragStart.y
    
    const bounds = calculateBounds()
    newX = clamp(newX, bounds.minX, bounds.maxX)
    newY = clamp(newY, bounds.minY, bounds.maxY)
    
    offsetX.value = newX
    offsetY.value = newY
  } else if (e.touches.length === 2) {
    const currentDist = getTouchDistance(e.touches)
    const scaleRatio = currentDist / touchStartDistance
    const newScale = clamp(
      touchStartScale * scaleRatio,
      CONFIG.MIN_SCALE,
      CONFIG.MAX_SCALE
    )
    
    const center = getTouchCenter(e.touches)
    const ratio = newScale / scale.value
    offsetX.value = center.x - (center.x - offsetX.value) * ratio
    offsetY.value = center.y - (center.y - offsetY.value) * ratio
    
    scale.value = newScale
  }
}

function handleTouchEnd() {
  isDragging.value = false
}
```

- [ ] **Step 5: 实现生命周期管理**

```javascript
// ========== 生命周期管理 ==========
function init() {
  if (!containerRef.value) return
  
  // 初始化到最佳缩放
  resetZoom()
  
  // 绑定鼠标事件
  containerRef.value.addEventListener('wheel', handleWheel, { passive: false })
  containerRef.value.addEventListener('mousedown', handleMouseDown)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('mouseleave', handleMouseLeave)
  
  // 绑定触摸事件
  containerRef.value.addEventListener('touchstart', handleTouchStart, { passive: false })
  containerRef.value.addEventListener('touchmove', handleTouchMove, { passive: false })
  containerRef.value.addEventListener('touchend', handleTouchEnd)
}

function destroy() {
  if (!containerRef.value) return
  
  // 清理所有事件监听器
  containerRef.value.removeEventListener('wheel', handleWheel)
  containerRef.value.removeEventListener('mousedown', handleMouseDown)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('mouseleave', handleMouseLeave)
  
  containerRef.value.removeEventListener('touchstart', handleTouchStart)
  containerRef.value.removeEventListener('touchmove', handleTouchMove)
  containerRef.value.removeEventListener('touchend', handleTouchEnd)
}
```

- [ ] **Step 6: 更新 return 语句**

完整的 return 对象：

```javascript
return {
  // 配置与状态
  CONFIG,
  scale,
  offsetX,
  offsetY,
  isDragging,
  
  // 计算属性
  optimalScale,
  mapActualSize,
  
  // 公共方法
  zoomIn,
  zoomOut,
  resetZoom,
  
  // 事件处理器
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  
  // 工具方法
  calculateBounds,
  constrainToBounds,
  
  // 生命周期
  init,
  destroy
}
```

- [ ] **Step 7: Commit**

```bash
git add src/composables/useResponsiveMap.js
git commit -m "feat: implement zoom, drag, touch support with lifecycle management"
```

---

## Task 4: 修改 GameBoard.vue 集成响应式地图

**Files:**
- Modify: `src/components/GameBoard.vue`

- [ ] **Step 1: 在 script 部分导入并初始化 composable**

在 `<script setup>` 部分顶部添加：

```javascript
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useResponsiveMap } from '../composables/useResponsiveMap'

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
```

- [ ] **Step 2: 在 template 中添加缩放控件和事件绑定**

将现有的 `<div class="game-board">` 修改为：

```vue
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

  <!-- 地图容器 - 应用响应式样式和事件 -->
  <div 
    class="board-container"
    :style="mapTransformStyle"
    :class="{ 'is-dragging': responsiveMap?.isDragging }"
  >
    <!-- 原有的 board-row 内容保持不变 -->
    <div class="board-row" v-for="(row, rowIndex) in boardLayout" :key="rowIndex">
      <!-- ... 原有tile渲染逻辑完全保留 ... -->
    </div>
    
    <!-- 玩家角色层 -->
    <div class="players-layer">
      <!-- ... 原有玩家渲染逻辑完全保留 ... -->
    </div>
  </div>
  
  <!-- 首次使用提示 -->
  <transition name="fade">
    <div v-if="showDragHint" class="drag-hint">
      💡 使用滚轮缩放，拖动查看地图
    </div>
  </transition>
</div>
```

⚠️ **重要**: 不要删除原有的任何游戏逻辑代码（骰子、炸弹、选择地产等overlay），只需在外层容器上添加响应式功能。

- [ ] **Step 3: 添加响应式相关CSS样式**

在 `<style scoped>` 部分添加或修改：

```css
.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;        /* 关键：隐藏超出部分 */
  cursor: grab;            /* 默认抓手光标 */
  background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);
}

.game-board:active {
  cursor: grabbing;       /* 拖拽时光标变化 */
}

/* 缩放控件 */
.zoom-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 20;             /* 在地图之上 */
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
  pointer-events: none;   /* 只显示当前比例，不可点击 */
  background: rgba(255, 215, 0, 0.9);
  color: #1a1a2e;
}

/* 地图容器 - 关键样式 */
.board-container {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 900px;           /* MAP_BASE_WIDTH */
  height: 700px;          /* MAP_BASE_HEIGHT */
  margin-top: -350px;     /* -height/2 居中 */
  margin-left: -450px;    /* -width/2 居中 */
  transform-origin: center center;
  will-change: transform;  /* GPU加速优化 */
  user-select: none;      /* 防止拖拽时选中文本 */
}

.board-container.is-dragging {
  transition: none;        /* 拖拽时禁用动画获得即时响应 */
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
```

- [ ] **Step 4: 测试基本功能**

启动开发服务器 (`npm run dev`) 并验证：
1. ✅ 页面加载后地图正常显示
2. ✅ 右上角出现缩放控件（➖ 百分比 ➕ ↺）
3. ✅ 点击➕/➖能放大/缩小地图
4. ✅ 点击↺能重置到原始大小
5. ✅ 鼠标滚轮能缩放地图（以鼠标位置为中心）
6. ✅ 能拖拽地图移动查看不同区域
7. ✅ 出现"💡 使用滚轮缩放"提示（3秒后消失）

- [ ] **Step 5: Commit**

```bash
git add src/components/GameBoard.vue
git commit -m "feat: integrate responsive map into GameBoard with zoom controls"
```

---

## Task 5: 修改 App.vue 和 PlayerPanel.vue 实现面板响应式

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/PlayerPanel.vue`

### Part A: App.vue 布局调整

- [ ] **Step 1: 修改 template 结构**

找到 `.game-play` 部分，调整为：

```vue
<main class="game-container">
  <div v-if="gamePhase === 'ended'" class="game-over-overlay">
    <!-- 保持原有内容不变 -->
  </div>
  
  <div class="game-play">
    <!-- 地图区域 - 弹性占据剩余空间 -->
    <section class="game-board-section">
      <GameBoard
        :map-tiles="mapTiles"
        :players="players"
        :properties="properties"
        :current-player-index="currentPlayerIndex"
        :selecting-property-for-free="selectingPropertyForFree"
        :bombs="bombs"
        :placing-bomb="placingBomb"
        :auction-property="auctionState?.isAuctioning ? auctionState?.property : null"
        :property-effect-tile="propertyEffectTile"
        :show-dice="!isRolling && !showDiceResult && !currentPlayer?.inJail"
        :current-player="currentPlayer"
        :auction-success-message="auctionSuccessMessage"
        :has-items="hasItems"
        @select-free-property="selectFreeProperty"
        @place-bomb="placeBomb"
        @cancel-bomb="cancelPlaceBomb"
        @roll-dice="rollDice"
        @use-item="openItemUseModal"
      />
      
      <!-- 骰子动画overlay保持原位 -->
      <div v-if="isDiceAnimating || showDiceResult" class="dice-overlay">
        <!-- 保持原有内容不变 -->
      </div>
    </section>
    
    <!-- 角色面板区域 - 固定在底部浮层 -->
    <section 
      class="players-panel-section"
      :class="{ 'needs-scroll': needsHorizontalScroll }"
    >
      <div class="players-wrapper">
        <div class="players-container">
          <PlayerPanel
            v-for="(player, index) in players"
            :key="player?.id || index"
            :ref="el => { if (el) playerRefs[index] = el }"
            :player="player"
            :is-active="currentPlayerIndex === index"
            :map-tiles="mapTiles"
            :properties="properties"
            :cash-changes="cashChangeNotify.filter(n => n.playerIndex === index)"
            :show-skip-turn="skipTurnPlayerIndex === index"
            :show-buff-activation="buffActivationNotify.show && buffActivationNotify.playerIndex === index"
            :buff-activation-info="buffActivationNotify.info"
            :jail-free-rent="jailFreeRentNotify.filter(n => n.playerIndex === index)"
            :free-rent="freeRentNotify.filter(n => n.playerIndex === index)"
            :get-total-property-investment="getTotalPropertyInvestment"
            @use-item="openItemUseModal"
            @open-mortgage="openMortgageModal"
          />
        </div>
      </div>
      
      <!-- 滚动提示 -->
      <transition name="fade">
        <div v-if="needsHorizontalScroll" class="scroll-hint">
          ← 左右滑动查看更多玩家 →
        </div>
      </transition>
    </section>
  </div>
</main>
```

- [ ] **Step 2: 添加响应式逻辑到 script**

在 `<script setup>` 部分添加：

```javascript
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ========== 新增：面板响应式 ==========
const containerWidth = ref(window.innerWidth)

// 最小舒适宽度阈值（基于实测数据）
const MIN_PANELS_WIDTH = 1200

const needsHorizontalScroll = computed(() => {
  return containerWidth.value < MIN_PANELS_WIDTH
})

function handleResize() {
  containerWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
```

- [ ] **Step 3: 更新 CSS 样式**

找到 `.game-play`, `.game-board-section`, `.players-panel-section` 相关样式，替换为：

```css
.game-play {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.game-board-section {
  flex: 1 1 auto;              /* 弹性占据剩余空间 */
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 10px;
  overflow: hidden;            /* 隐藏超出部分 */
  min-height: 0;               /* 关键：允许flex子项收缩 */
}

.players-panel-section {
  flex: 0 0 auto;              /* 固定高度 */
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 25px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 2px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  height: 140px;               /* 基于实测121.2px + padding */
  box-sizing: border-box;
  position: relative;
  z-index: 10;                 /* 在地图之上 */
}

.players-wrapper {
  width: 100%;
  height: 100%;
  overflow-x: auto;            /* 允许横向滚动 */
  overflow-y: hidden;
  
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 215, 0, 0.5) transparent;
}

.players-wrapper::-webkit-scrollbar {
  height: 6px;
}

.players-wrapper::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.players-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.5);
  border-radius: 3px;
}

.players-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 215, 0, 0.7);
}

.players-container {
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  width: 100%;
  gap: 15px;
  padding: 0;
  min-width: 1300px;           /* 确保4个面板完整显示 */
  height: 100%;
}

.scroll-hint {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  animation: pulse 2s infinite;
  pointer-events: none;
  white-space: nowrap;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Part B: PlayerPanel.vue 宽度调整

- [ ] **Step 4: 修改 PlayerPanel 的宽度样式**

在 `src/components/PlayerPanel.vue` 的 `<style scoped>` 部分，找到 `.player-panel` 样式块，修改为：

```css
.player-panel {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 12px 15px;
  /* 移除原来的 width: calc(25% - 10px); */
  flex: 0 0 300px;            /* ✅ 改为固定宽度 */
  max-width: 320px;
  height: 100%;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08), 0 0 10px rgba(0, 0, 0, 0.05);
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 小屏幕适配 */
.players-panel-section.needs-scroll .player-panel {
  flex: 0 0 280px;            /* 稍微缩小以适应更多屏幕 */
  max-width: 280px;
}
```

- [ ] **Step 5: 测试面板响应式**

验证以下场景：
1. ✅ 屏幕宽度 ≥1200px：4个面板完整显示，无滚动条
2. ✅ 屏幕宽度 <1200px：出现横向滚动条
3. ✅ 横向滚动可以查看所有4个面板
4. ✅ Buff信息在任何情况下不被截断
5. ✅ 出现"← 左右滑动查看更多 →"提示（仅小屏幕）

- [ ] **Step 6: Commit**

```bash
git add src/App.vue src/components/PlayerPanel.vue
git commit -m "feat: implement responsive layout for panels with horizontal scroll"
```

---

## Task 6: 修改 Modal.vue 实现弹窗响应式

**Files:**
- Modify: `src/components/Modal.vue`

- [ ] **Step 1: 查看 Modal 当前结构**

先读取 Modal.vue 文件了解当前结构：
- 找到 `.modal-overlay` 和 `.modal-content` 类名
- 了解当前的固定尺寸设置

- [ ] **Step 2: 添加响应式尺寸样式**

在 Modal.vue 的 `<style>` 部分（可能是scoped或全局），添加或修改：

```css
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
  z-index: 9999;
  padding: 20px;                /* 新增：留出边距防止贴边 */
  box-sizing: border-box;
}

.modal-content {
  /* 移除或注释掉固定的 width/height */
  width: 90%;                   /* 相对宽度 */
  max-width: 600px;             /* 桌面端最大宽度 */
  max-height: 85vh;             /* 不超过视口85% */
  overflow-y: auto;             /* 内容过多时可滚动 */
  
  /* 保持其他原有样式（背景、圆角、阴影等） */
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.95));
  border-radius: 20px;
  border: 2px solid rgba(255, 215, 0, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 平板和小屏幕适配 */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-width: none;
    margin: 10px;
    max-height: 90vh;
  }
  
  .modal-overlay {
    padding: 10px;
  }
}

/* 大屏幕适配 */
@media (min-width: 1400px) {
  .modal-content {
    max-width: 700px;         /* 大屏幕稍微放大 */
  }
}
```

- [ ] **Step 3: 测试弹窗在不同分辨率下的表现**

触发以下弹窗进行测试：
1. ✅ 购买地产弹窗（点击空地）
2. ✅ 赌场弹窗（经过赌场格）
3. ✅ 道具店弹窗（使用道具按钮）
4. ✅ 机会/命运牌弹窗

验证要点：
- 弹窗居中显示
- 不超出可视区域
- 内容过多时可内部滚动
- 关闭后正常返回游戏

- [ ] **Step 4: Commit**

```bash
git add src/components/Modal.vue
git commit -m "feat: make modals responsive with viewport-relative sizing"
```

---

## Task 7: 全面测试与优化（可选增强）

**Files:**
- Multiple files for testing and optimization

- [ ] **Step 1: 性能测试**

使用 Chrome DevTools Performance 面板：
1. 打开游戏页面
2. 连续执行缩放/拖动操作10秒
3. 录制性能数据
4. 检查FPS是否保持 ≥55
5. 检查是否有内存泄漏

- [ ] **Step 2: 跨浏览器兼容性测试**

测试以下浏览器：
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+ (如果有Mac/iOS设备)

重点检查：
- CSS Transform支持
- will-change属性
- Touch Events
- 滚动条自定义样式

- [ ] **Step 3: 边界情况测试**

测试场景列表：
- [ ] 极小屏幕 (800×600)
- [ ] 超大屏幕 (2560×1440)
- [ ] 窗口resize时的表现
- [ ] 快速连续点击缩放按钮
- [ ] 同时按住鼠标拖动+滚轮
- [ ] 触摸屏双指快速捏合

- [ ] **Step 4: 最终Commit（如有修复）**

```bash
git add -A
git commit -m "fix: address edge cases and optimize performance"
```

---

## Self-Review Checklist

✅ **Spec Coverage:**
- [x] 需求1: 地图可缩放/拖动 → Task 1-4
- [x] 需求2: 角色面板自适应（≥1200px完整/<1200px横向滚动）→ Task 5
- [x] 需求3: 弹窗等比缩放 → Task 6
- [x] 最大尺寸限制 → Task 2 (MAX_SCALE: 2.0)
- [x] 用户手动缩放 → Task 3 (zoomIn/Out buttons + wheel)
- [x] 面板浮在地图上层 → Task 5 (z-index: 10)

✅ **Placeholder Scan:**
- [x] 无TBD/TODO标记
- [x] 所有步骤包含实际代码
- [x] 无模糊描述（如"适当调整"）

✅ **Type Consistency:**
- [x] 函数命名一致 (zoomIn/zoomOut/resetZoom)
- [x] 变量命名一致 (scale, offsetX, offsetY)
- [x] CONFIG常量引用一致

✅ **DRY & YAGNI:**
- [x] 无重复代码（工具函数clamp复用）
- [x] 仅实现必要功能（无过度设计）

---

## Execution Summary

**Total Tasks:** 7个主要任务  
**Estimated Time:** 6-9小时（含测试）  
**Lines of Code:** ~380行新增/修改  
**Files Changed:** 5个文件（1新增 + 4修改）

**Implementation Order:**
1. ⭐ Task 1-3: Core logic (useResponsiveMap composable)
2. ⭐ Task 4: UI integration (GameBoard)
3. ⭐ Task 5: Layout adjustment (App + PlayerPanel)
4. ⭐ Task 6: Modal responsiveness
5. 🔧 Task 7: Testing & polish (optional)

**Risk Areas:**
- 地图拖拽时的边界检测需要仔细调参
- 触摸屏事件在不同设备上的行为可能需要微调
- 现有组件的事件绑定可能存在冲突需注意

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-15-responsive-ui-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
