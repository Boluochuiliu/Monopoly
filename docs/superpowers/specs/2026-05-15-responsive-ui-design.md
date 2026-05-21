# 响应式界面设计文档

**项目名称**: 大富翁游戏响应式布局改造  
**创建日期**: 2026-05-15  
**状态**: ✅ 已确认，待实现  
**方案选择**: 方案 C - Vue Composable + CSS Transform 混合架构  

---

## 📋 目录

1. [需求背景](#1-需求背景)
2. [用户需求](#2-用户需求)
3. [技术方案](#3-技术方案)
4. [系统架构](#4-系统架构)
5. [核心算法](#5-核心算法)
6. [组件修改详情](#6-组件修改详情)
7. [用户体验设计](#7-用户体验设计)
8. [性能优化策略](#8-性能优化策略)
9. [测试计划](#9-测试计划)
10. [实施清单](#10-实施清单)

---

## 1. 需求背景

### 1.1 当前问题

当前大富翁游戏界面采用固定比例布局：
- **地图区域**: 占据 83% 高度（flex: 0 0 83%）
- **角色面板**: 占据 18% 高度（flex: 0 0 18%），使用 `calc(25% - 10px)` 固定宽度
- **弹窗**: 固定尺寸，未考虑不同屏幕尺寸

**存在的问题**:
1. ❌ 在小屏幕设备上（<1200px宽度），角色面板信息被截断
2. ❌ 地图无法缩放或拖动查看细节
3. ❌ 弹窗在小屏幕上可能超出可视区域
4. ❌ 未支持触摸屏设备的缩放/拖拽手势

### 1.2 目标用户场景

- **桌面端**: 1366×768 到 2560×1440 分辨率
- **笔记本**: 1280×720 到 1920×1080 分辨率  
- **平板**: 768×1024 到 1024×768 分辨率（未来扩展）

---

## 2. 用户需求

### 2.1 核心需求（已确认）

#### ✅ 需求1: 响应式地图显示
- **正常情况**: 地图等比放大/缩小以适应可用空间
- **空间不足时**: 用户可**拖动地图**查看不同区域
- **最大尺寸限制**: 地图不会无限放大（保持清晰度）
- **手动控制**: 支持用户主动**放大和缩小**地图

#### ✅ 需求2: 角色面板自适应
- **大屏幕 (≥1200px)**: 完整显示4个玩家面板（含现金、地产、Buff信息）
- **小屏幕 (<1200px)**: 启用**横向滚动**效果
- **最小舒适宽度**: **1200px**（基于实测：1400px时每面板320px能完整显示Buff）
- **层级关系**: 面板**浮在地图上方**（z-index提升）

#### ✅ 需求3: 弹窗等比缩放
- 所有Modal组件（购买地产、赌场、道具店等）按屏幕比例缩放
- 推荐尺寸: 屏幕宽度的 **60-70%**
- 最大宽度限制: 600-700px（避免过大）

### 2.2 布局结构图

```
┌──────────────────────────────────────────────┐
│              App.vue (100vh)                  │
│                                              │
│  ┌──────────────────────────────────────────┐ │
│  │          GameBoard (地图区域)             │ │
│  │    - 可缩放 (0.5x ~ 2.0x)                │ │
│  │    - 可拖动 (鼠标/触摸)                   │ │
│  │    - 缩放控件 (+/-/重置)                  │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  ┌──────────────────────────────────────────┐ │
│  │  PlayerPanel (角色面板 - 浮在底层)        │ │
│  │  z-index: 10 | height: ~140px            │ │
│  │  最小宽度 < 1200px 时横向滚动              │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  ┌──────────────────────────────────────────┐ │
│  │       Modal (弹窗 - 居中顶层)             │ │
│  │       width: 60-70vw | max-width: 600px  │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 3. 技术方案

### 3.1 方案对比与选择

| 特性 | 方案A: 纯CSS | 方案B: Canvas重绘 | **方案C: Vue Composable ⭐** |
|------|------------|------------------|---------------------------|
| 开发难度 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 性能表现 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 可维护性 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 功能完整度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 代码改动量 | ~200行 | ~1000+行 | **~380行** |

**最终选择**: ✅ **方案C - Vue Composable + CSS Transform**

**选择理由**:
1. 符合Vue 3 Composition API最佳实践
2. 逻辑集中管理，易于测试和维护
3. 利用CSS Transform硬件加速，性能优秀
4. 不需要重写现有组件，改动可控
5. 扩展性好，便于未来添加新功能

### 3.2 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: JavaScript (ES6+)
- **样式**: CSS3 (Transform, Flexbox, Grid)
- **事件**: 原生DOM事件 (Mouse, Wheel, Touch)

---

## 4. 系统架构

### 4.1 文件结构

```
src/
├── composables/
│   └── useResponsiveMap.js          ← 🆕 新增 (~200行)
├── components/
│   ├── GameBoard.vue                ← ✏️ 修改 (~80行新增)
│   ├── PlayerPanel.vue              ← ✏️ 修改 (~30行调整)
│   └── Modal.vue                    ← ✏️ 修改 (~20行调整)
├── App.vue                          ← ✏️ 修改 (~50行调整)
└── main.js                          ← 无需修改
```

### 4.2 组件职责

#### useResponsiveMap.js (Composable)
**职责**: 封装所有地图响应式逻辑
- 状态管理: `scale`, `offsetX`, `offsetY`, `isDragging`
- 自动计算最佳缩放比例
- 处理鼠标滚轮缩放
- 处理鼠标/触摸拖拽
- 边界检测与限制
- 提供公共API: `zoomIn()`, `zoomOut()`, `resetZoom()`
- 生命周期管理: `init()`, `destroy()`

#### GameBoard.vue (地图组件)
**职责**: 渲染地图UI并集成响应式功能
- 引入并初始化 `useResponsiveMap`
- 绑定事件监听器到地图容器
- 应用CSS Transform样式
- 渲染缩放控件UI (+/-/重置按钮)
- 显示首次使用提示

#### PlayerPanel.vue (角色面板)
**职责**: 调整为固定宽度模式
- 移除 `calc(25% - 10px)` 百分比宽度
- 使用固定宽度: `flex: 0 0 300px` (或280px小屏模式)
- 保持原有所有功能和样式不变

#### Modal.vue (弹窗组件)
**职责**: 添加响应式尺寸样式
- 设置相对宽度: `width: 90%`
- 最大宽度限制: `max-width: 600px` (桌面), `none` (移动端)
- 最大高度限制: `max-height: 85vh`
- 超出部分滚动: `overflow-y: auto`

#### App.vue (主容器)
**职责**: 调整整体布局结构
- 使用Flex Column布局
- 地图区域: `flex: 1 1 auto` (弹性占据剩余空间)
- 面板区域: `flex: 0 0 auto` (固定高度140px, z-index: 10)
- 监听窗口resize事件判断是否需要横向滚动

### 4.3 数据流图

```
┌─────────────┐     监听resize      ┌──────────────────┐
│   Window     │ ─────────────────→ │     App.vue      │
│   resize     │                    │ containerWidth   │
└─────────────┘                    └────────┬─────────┘
                                            │
                    ┌────────────────────────┼────────────────────┐
                    │                        │                    │
                    ▼                        ▼                    ▼
           ┌────────────────┐      ┌────────────────┐    ┌────────────────┐
           │  GameBoard.vue │      │ PlayerPanel.vue│    │   Modal.vue    │
           │                │      │                │    │                │
           │ useResponsiveMap│      │ fixed width    │    │ responsive size│
           │      ↓         │      │ overflow-x:auto│    │ 60-70vw width  │
           │  CSS Transform  │      │ min-width:1300px│    │ max-w:600px    │
           └────────────────┘      └────────────────┘    └────────────────┘
                    │
                    ▼
           ┌────────────────────────┐
           │  useResponsiveMap.js   │
           │                        │
           │ scale (ref)            │
           │ offsetX/Y (ref)        │
           │ isDragging (ref)       │
           │ optimalScale (computed)│
           │                        │
           │ zoomIn/Out/Reset()     │
           │ handleWheel/Drag()     │
           │ init()/destroy()       │
           └────────────────────────┘
```

---

## 5. 核心算法

### 5.1 配置常量

```javascript
const CONFIG = {
  MIN_SCALE: 0.5,                       // 最小缩放比例
  MAX_SCALE: 2.0,                       // 最大缩放比例
  SCALE_STEP: 0.1,                      // 缩放步长
  MAP_BASE_WIDTH: 900,                  // 地图基准宽度 (px)
  MAP_BASE_HEIGHT: 700,                 // 地图基准高度 (px)
  WHEEL_ZOOM_SENSITIVITY: 0.001,        // 滚轮灵敏度
  ANIMATION_DURATION: 300,              // 动画时长 (ms)
  MIN_PANELS_WIDTH: 1200                // 面板最小舒适宽度 (px)
}
```

### 5.2 自动适应算法

**目标**: 计算使地图完整显示在容器内的最佳缩放比例

```javascript
const optimalScale = computed(() => {
  if (!containerRef.value) return 1
  
  const containerWidth = containerRef.value.clientWidth
  const containerHeight = containerRef.value.clientHeight
  
  // 分别计算宽度和高度的缩放比例
  const scaleX = containerWidth / CONFIG.MAP_BASE_WIDTH
  const scaleY = containerHeight / CONFIG.MAP_BASE_HEIGHT
  
  // 取较小值确保完整可见，且不超过最大限制
  return Math.min(
    Math.min(scaleX, scaleY),
    CONFIG.MAX_SCALE
  )
})
```

**算法说明**:
1. 获取容器实际渲染尺寸 (`clientWidth/clientHeight`)
2. 计算两个维度的独立缩放比例
3. 选择较小值防止溢出
4. 限制不超过配置的最大缩放值

### 5.3 缩放算法 (Zoom)

#### 5.3.1 滚轮缩放

**特性**: 以鼠标位置为中心点进行缩放（类似Google Maps）

```javascript
function handleWheel(e) {
  e.preventDefault()
  
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
}
```

**数学原理**:
- 变换前鼠标位置: `(mouseX, mouseY)`
- 变换后鼠标位置应保持不变:
  ```
  offsetX_new = mouseX - (mouseX - offsetX_old) * scaleRatio
  ```

#### 5.3.2 按钮缩放

```javascript
function zoomIn() {
  updateScale(scale.value + CONFIG.SCALE_STEP)
}

function zoomOut() {
  updateScale(scale.value - CONFIG.SCALE_STEP)
}

function resetZoom() {
  animateScaleTo(optimalScale.value)
}
```

### 5.4 拖拽算法 (Pan/Drag)

#### 5.4.1 鼠标事件处理

```javascript
// 状态记录
let isDragging = false
let dragStart = { x: 0, y: 0 }

function handleMouseDown(e) {
  isDragging = true
  dragStart = {
    x: e.clientX - offsetX.value,
    y: e.clientY - offsetY.value
  }
}

function handleMouseMove(e) {
  if (!isDragging) return
  
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
  isDragging = false
}
```

#### 5.4.2 边界检测算法

**目标**: 防止地图被拖出可视区域太多

```javascript
function calculateBounds() {
  const container = containerRef.value
  if (!container) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  
  const containerW = container.clientWidth
  const containerH = container.clientHeight
  const mapW = CONFIG.MAP_BASE_WIDTH * scale.value
  const mapH = CONFIG.MAP_BASE_HEIGHT * scale.value
  
  return {
    // 允许左边缘最多移出到容器左边
    minX: Math.min(0, containerW - mapW),
    
    // 允许右边缘最多移出到容器右边（但保留一定边距）
    maxX: Math.max(0, (mapW - containerW) / 2),
    
    // 同理处理垂直方向
    minY: Math.min(0, containerH - mapH),
    maxY: Math.max(0, (mapH - containerH) / 2)
  }
}
```

**边界规则**:
- 当地图大于容器时: 允许在各方向上拖动，但不能完全移出视野
- 当地图小于容器时: 允许在一定范围内居中偏移（±50%超出部分）

### 5.5 触摸屏支持 (Mobile)

#### 5.5.1 单指拖动

复用鼠标拖拽逻辑，将touch事件转换为等效的MouseEvent对象。

#### 5.5.2 双指缩放 (Pinch-to-Zoom)

```javascript
function handleTouchMove(e) {
  if (e.touches.length === 2) {
    e.preventDefault()
    
    // 计算当前双指距离
    const currentDist = getTouchDistance(e.touches)
    const prevDist = touchStartDistance
    
    // 计算缩放比例
    const scaleRatio = currentDist / prevDist
    const newScale = clamp(
      touchStartScale * scaleRatio,
      CONFIG.MIN_SCALE,
      CONFIG.MAX_SCALE
    )
    
    // 以双指中心为缩放中心
    const center = getTouchCenter(e.touches)
    applyZoomAtPoint(newScale, center.x, center.y)
  }
}

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
```

### 5.6 动画系统

使用CSS Transition实现平滑过渡：

```css
.board-container {
  transform-origin: center center;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform; /* GPU加速 */
}

/* 拖拽时禁用动画获得即时响应 */
.board-container.is-dragging {
  transition: none;
}
```

**缓动函数选择**: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` 
- 类似ease-out效果
- 快速启动，缓慢停止
- 适合缩放/平移操作

---

## 6. 组件修改详情

### 6.1 App.vue 修改清单

#### 模板变更
```vue
<main class="game-container">
  <div class="game-play">
    <!-- 地图区域 -->
    <section class="game-board-section">
      <GameBoard ... />
    </section>
    
    <!-- 角色面板 - 新增needs-scroll类 -->
    <section 
      class="players-panel-section"
      :class="{ 'needs-scroll': needsHorizontalScroll }"
    >
      <div class="players-wrapper" ref="playersWrapperRef">
        <div class="players-container">
          <PlayerPanel v-for="..." />
        </div>
      </div>
      
      <!-- 滚动提示 -->
      <div v-if="needsHorizontalScroll" class="scroll-hint">
        ← 左右滑动查看更多 →
      </div>
    </section>
  </div>
</main>
```

#### 脚本变更
```javascript
import { ref, computed, onMounted, onUnmounted } from 'vue'

const playersWrapperRef = ref(null)
const containerWidth = ref(window.innerWidth)

// 判断是否需要横向滚动
const needsHorizontalScroll = computed(() => {
  return containerWidth.value < 1200  // MIN_PANELS_WIDTH
})

function handleResize() {
  containerWidth.value = window.innerWidth
}

onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))
```

#### 样式变更
```css
.game-play {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.game-board-section {
  flex: 1 1 auto;      /* 占据剩余空间 */
  position: relative;
  overflow: hidden;
  min-height: 0;       /* 关键：允许收缩 */
}

.players-panel-section {
  flex: 0 0 auto;      /* 固定高度 */
  position: relative;
  z-index: 10;         /* 在地图之上 */
  height: 140px;       /* 基于实测121.2px + padding */
  background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
}

.players-wrapper {
  width: 100%;
  height: 100%;
  overflow-x: auto;    /* 横向滚动 */
  overflow-y: hidden;
  
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255,215,0,0.5) transparent;
}

.players-container {
  display: flex;
  gap: 15px;
  min-width: 1300px;   /* 确保4个面板完整显示 */
}
```

### 6.2 GameBoard.vue 修改清单

#### 新增模板元素
```vue
<div class="game-board" ref="boardContainerRef">
  <!-- 缩放控件 -->
  <div class="zoom-controls">
    <button @click="responsiveMap.zoomOut()">➖</button>
    <span>{{ Math.round(responsiveMap.scale * 100) }}%</span>
    <button @click="responsiveMap.zoomIn()">➕</button>
    <button @click="responsiveMap.resetZoom()" title="重置">↺</button>
  </div>

  <!-- 地图容器 - 绑定响应式样式和事件 -->
  <div 
    class="board-container"
    :style="mapTransformStyle"
    :class="{ 'is-dragging': responsiveMap.isDragging }"
    @wheel="responsiveMap.handleWheel"
    @mousedown="responsiveMap.handleMouseDown"
    @mousemove="responsiveMap.handleMouseMove"
    @mouseup="responsiveMap.handleMouseUp"
    @mouseleave="responsiveMap.handleMouseUp"
    @touchstart.prevent="responsiveMap.handleTouchStart"
    @touchmove.prevent="responsiveMap.handleTouchMove"
    @touchend="responsiveMap.handleTouchEnd"
  >
    <!-- 原有地图内容保持不变 -->
  </div>

  <!-- 首次使用提示 -->
  <transition name="fade">
    <div v-if="showDragHint" class="drag-hint">
      💡 使用滚轮缩放，拖动查看地图
    </div>
  </transition>
</div>
```

#### 脚本集成
```javascript
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useResponsiveMap } from '../composables/useResponsiveMap'

const boardContainerRef = ref(null)
const responsiveMap = ref(null)
const showDragHint = ref(false)

onMounted(() => {
  if (boardContainerRef.value) {
    responsiveMap.value = useResponsiveMap(boardContainerRef.value)
    responsiveMap.value.init()
    
    // 显示提示（3秒后自动消失）
    setTimeout(() => {
      showDragHint.value = true
      setTimeout(() => showDragHint.value = false, 3000)
    }, 1000)
  }
})

onUnmounted(() => {
  responsiveMap.value?.destroy()
})

// 计算CSS Transform样式
const mapTransformStyle = computed(() => ({
  transform: `translate(${responsiveMap.value.offsetX}px, ${responsiveMap.value.offsetY}px) 
                      scale(${responsiveMap.value.scale})`,
  transformOrigin: 'center center'
}))
```

#### 样式增强
```css
.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
}

.game-board:active {
  cursor: grabbing;
}

.zoom-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 20;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  /* ... 其他样式 ... */
}

.board-container {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 900px;   /* MAP_BASE_WIDTH */
  height: 700px;  /* MAP_BASE_HEIGHT */
  margin-top: -350px;  /* -height/2 */
  margin-left: -450px; /* -width/2 */
  /* Transform由JS动态设置 */
}
```

### 6.3 PlayerPanel.vue 修改清单

**主要变更**: 移除百分比宽度，改用固定宽度

```css
/* 修改前 */
.player-panel {
  width: calc(25% - 10px);  /* ❌ 百分比宽度 */
  min-width: 180px;
}

/* 修改后 */
.player-panel {
  flex: 0 0 300px;  /* ✅ 固定宽度 */
  max-width: 320px;
}

/* 小屏幕适配 */
.players-panel-section.needs-scroll .player-panel {
  flex: 0 0 280px;  /* 稍微缩小 */
}
```

**其他样式保持不变**（头像、资源区、Buff区等）。

### 6.4 Modal.vue 修改清单

**主要变更**: 添加响应式尺寸

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal-content {
  width: 90%;           /* 相对宽度 */
  max-width: 600px;     /* 桌面端最大宽度 */
  max-height: 85vh;     /* 不超过视口85% */
  overflow-y: auto;     /* 内容过多时可滚动 */
  
  animation: modalSlideIn 0.3s ease-out;
}

/* 平板和小屏幕 */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-width: none;
  }
}

/* 大屏幕 */
@media (min-width: 1400px) {
  .modal-content {
    max-width: 700px;
  }
}
```

---

## 7. 用户体验设计

### 7.1 首次使用引导

**触发条件**:
- 用户首次加载游戏页面
- 未执行过缩放或拖动操作

**展示内容**:
- 地图区域右下角显示提示气泡: "💡 使用滚轮缩放，拖动查看地图"
- 3秒后自动淡出消失
- 用户交互后立即隐藏

**实现方式**:
```vue
<transition name="fade">
  <div v-if="showHint" class="drag-hint">
    💡 使用滚轮缩放，拖动查看地图
  </div>
</transition>
```

### 7.2 缩放控件设计

**位置**: 地图容器右上角（不遮挡重要游戏元素）

**组成**:
1. ➖ 缩小按钮
2. 当前缩放百分比显示（只读）
3. ➕ 放大按钮
4. ↺ 重置按钮（恢复最佳缩放）

**视觉样式**:
- 圆形按钮 (40×40px)
- 半透明白色背景 (`rgba(255,255,255,0.9)`)
- 毛玻璃效果 (`backdrop-filter: blur(10px)`)
- 悬停时轻微放大 (`transform: scale(1.1)`)

**交互反馈**:
- 点击按钮即时响应（无延迟）
- 百分比数字实时更新
- 重置按钮有平滑动画过渡到目标缩放

### 7.3 滚动条美化

**角色面板横向滚动条**:
- 高度: 6px（细长型）
- 颜色: 金色半透明 (`rgba(255,215,0,0.5)`)
- 圆角: 3px
- 悬停时加深颜色

**自定义样式**:
```css
.players-wrapper::-webkit-scrollbar {
  height: 6px;
}

.players-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.5);
  border-radius: 3px;

  &:hover {
    background: rgba(255, 215, 0, 0.7);
  }
}
```

### 7.4 键盘快捷键（可选增强）

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + =/+` | 放大 |
| `Ctrl/Cmd + -` | 缩小 |
| `Ctrl/Cmd + 0` | 重置缩放 |
| `← → ↑ ↓` | 微调地图位置 (每次20px) |

**适用场景**: 无障碍访问、高级用户快速操作

### 7.5 光标反馈

| 状态 | 光标样式 |
|------|---------|
| 默认 | `grab` (抓手) |
| 拖拽中 | `grabbing` (抓取中) |
| 悬停按钮 | `pointer` (指针) |
| 加载中 | `wait` (等待) |

---

## 8. 性能优化策略

### 8.1 CSS GPU加速

```css
.board-container {
  will-change: transform;  /* 提示浏览器优化 */
  transform: translateZ(0); /* 强制GPU层 */
}
```

**原理**: 将Transform操作交给GPU合成线程处理，不阻塞主线程。

### 8.2 事件节流/防抖

#### 滚轮事件节流 (Throttle)
```javascript
let lastWheelTime = 0
const WHEEL_INTERVAL = 16  // ~60fps

function throttledHandleWheel(e) {
  const now = performance.now()
  if (now - lastWheelTime < WHEEL_INTERVAL) return
  
  lastWheelTime = now
  handleWheel(e)
}
```

**目的**: 限制滚轮事件触发频率，避免过度渲染。

#### Resize事件防抖 (Debounce)
```javascript
let resizeTimer = null

function debouncedHandleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  
  resizeTimer = setTimeout(() => {
    handleWindowResize()
    resizeTimer = null
  }, 200)  // 200ms延迟
}
```

**目的**: 窗口大小变化稳定后再重新计算，避免频繁重绘。

#### 鼠标移动优化 (RAF)
```javascript
function optimizedHandleMouseMove(e) {
  if (rafId) cancelAnimationFrame(rafId)
  
  rafId = requestAnimationFrame(() => {
    handleMouseMove(e)
    rafId = null
  })
}
```

**目的**: 与浏览器刷新率同步，避免不必要的中间帧渲染。

### 8.3 内存管理

**事件监听器清理**:
```javascript
export function useResponsiveMap(containerRef) {
  function init() {
    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('mousedown', handleMouseDown)
    // ... 其他事件
  }
  
  function destroy() {
    container.removeEventListener('wheel', handleWheel)
    container.removeEventListener('mousedown', handleMouseDown)
    // ... 清理所有监听器
  }
  
  return { init, destroy, ... }
}
```

**重要性**: 防止内存泄漏，特别是在SPA应用中组件频繁挂载/卸载时。

### 8.4 Reactivity优化

**避免不必要的响应式更新**:
```javascript
// ❌ 差：每次mousemove都创建新对象
offsetX.value = e.clientX - dragStart.x

// ✅ 好：批量更新，减少触发次数
function batchUpdate(x, y) {
  offsetX.value = x
  offsetY.value = y
  // Vue会批量处理这些更新
}
```

**使用shallowRef替代ref（如果适用）**:
```javascript
// 对于大型对象，使用shallowRef避免深层响应式转换
const mapState = shallowRef({
  scale: 1,
  offset: { x: 0, y: 0 }
})
```

---

## 9. 测试计划

### 9.1 单元测试 (Unit Tests)

**useResponsiveMap.js**:

| 测试用例 | 输入 | 预期输出 |
|---------|------|---------|
| 初始状态检查 | 默认 | scale=1, offset=(0,0) |
| 边界缩放 - 最小 | 连续调用zoomOut() 15次 | scale=0.5 (不再减小) |
| 边界缩放 - 最大 | 连续调用zoomIn() 15次 | scale=2.0 (不再增大) |
| 重置缩放 | 任意scale | scale=optimalScale |
| 边界检测 | 拖动超出范围 | offset被限制在bounds内 |
| 事件清理 | 调用destroy() | 所有监听器已移除 |

**测试工具**: Vitest (推荐) 或 Jest

### 9.2 集成测试 (Integration Tests)

**场景1: 桌面端大屏 (1920×1080)**
- ✅ 地图完整显示，无需滚动
- ✅ 4个玩家面板完整展示
- ✅ 弹窗居中显示，尺寸适中

**场景2: 笔记本 (1366×768)**
- ✅ 地图可能需要轻微缩小
- ✅ 面板完整显示（接近阈值）
- ✅ 弹窗正常显示

**场景3: 小屏 (1024×768)**
- ✅ 地图明显缩小，可拖动查看
- ✅ 面板出现横向滚动条
- ✅ 弹窗占95%宽度

**场景4: 极小屏 (800×600)**
- ✅ 地图大幅缩小，必须拖动
- ✅ 面板横向滚动明显
- ✅ 弹窗内部可滚动

### 9.3 手动测试清单

#### 地图功能
- [ ] 鼠标滚轮向上 → 放大
- [ ] 鼠标滚轮向下 → 缩小
- [ ] 点击➕按钮 → 放大0.1
- [ ] 点击➖按钮 → 缩小0.1
- [ ] 点击↺按钮 → 重置到最佳比例
- [ ] 鼠标拖动 → 地图跟随移动
- [ ] 拖动到边界 → 不能继续拖出
- [ ] 缩放到最大/最小 → 按钮无反应或到达极限

#### 面板功能
- [ ] ≥1200px宽度 → 无滚动条，4个面板完整显示
- [ ] <1200px宽度 → 出现横向滚动条
- [ ] 横向滚动 → 可以看到所有面板
- [ ] Buff信息 → 在任何情况下不被截断

#### 弹窗功能
- [ ] 打开购买地产弹窗 → 居中显示
- [ ] 小屏幕下弹窗 → 不超出可视区域
- [ ] 内容过多时 → 内部出现滚动条
- [ ] 关闭弹窗 → 正常返回游戏界面

#### 触摸屏（如果有设备）
- [ ] 单指拖动 → 地图移动
- [ ] 双指捏合 → 缩小
- [ ] 双指张开 → 放大

### 9.4 性能测试

**测试指标**:
- **FPS**: 缩放/拖动时保持 ≥55fps
- **内存**: 长时间操作无明显增长
- **CPU占用**: 空闲时 <5%，操作时 <30%

**测试工具**:
- Chrome DevTools Performance面板
- Lighthouse (Performance score >90)
- React Profiler (如适用)

---

## 10. 实施清单

### 10.1 Phase 1: 基础架构 (预计2-3小时)

- [ ] 创建 `src/composables/useResponsiveMap.js`
  - [ ] 定义配置常量和响应式状态
  - [ ] 实现 `optimalScale` 计算属性
  - [ ] 实现基础缩放方法 (`zoomIn`, `zoomOut`, `resetZoom`)
  - [ ] 实现生命周期管理 (`init`, `destroy`)

- [ ] 修改 `src/components/GameBoard.vue`
  - [ ] 引入并初始化 `useResponsiveMap`
  - [ ] 添加缩放控件HTML结构
  - [ ] 绑定基础事件监听器
  - [ ] 应用CSS Transform样式

### 10.2 Phase 2: 交互功能 (预计2-3小时)

- [ ] 完善 `useResponsiveMap.js`
  - [ ] 实现滚轮缩放算法（带鼠标中心点）
  - [ ] 实现鼠标拖拽算法
  - [ ] 实现边界检测函数
  - [ ] 添加事件节流/防抖优化

- [ ] 增强 `GameBoard.vue`
  - [ ] 绑定完整的鼠标事件链
  - [ ] 添加首次使用提示UI
  - [ ] 添加光标样式切换
  - [ ] 测试并调优参数

### 10.3 Phase 3: 面板响应式 (预计1-2小时)

- [ ] 修改 `src/App.vue`
  - [ ] 调整布局为Flex Column
  - [ ] 添加窗口resize监听
  - [ ] 实现 `needsHorizontalScroll` 计算
  - [ ] 更新相关CSS类名绑定

- [ ] 调整 `src/components/PlayerPanel.vue`
  - [ ] 移除百分比宽度
  - [ ] 设置固定宽度 (300px/280px)
  - [ ] 验证Buff信息显示完整

- [ ] 美化滚动条样式
  - [ ] 自定义Webkit滚动条外观
  - [ ] 添加滚动提示文字

### 10.4 Phase 4: 弹窗与收尾 (预计1小时)

- [ ] 修改 `src/components/Modal.vue`
  - [ ] 设置响应式宽度 (90%, max-w: 600px)
  - [ ] 添加媒体查询断点
  - [ ] 确保内容溢出时可滚动

- [ ] 全面测试
  - [ ] 不同分辨率下的视觉效果
  - [ ] 性能指标达标验证
  - [ ] 边界情况测试
  - [ ] 浏览器兼容性检查 (Chrome, Firefox, Edge, Safari)

### 10.5 Phase 5: 可选增强 (额外时间)

- [ ] 添加键盘快捷键支持
- [ ] 实现触摸屏手势完善
- [ ] 添加缩放级别指示器（进度条）
- [ ] 实现用户偏好记忆（localStorage）
- [ ] 编写单元测试和集成测试

---

## 附录 A: 关键代码片段索引

| 功能 | 文件 | 行号范围（预估） |
|------|------|---------------|
| Composable定义 | useResponsiveMap.js | 1-50 |
| 状态与配置 | useResponsiveMap.js | 51-100 |
| 自动缩放算法 | useResponsiveMap.js | 101-150 |
| 滚轮缩放 | useResponsiveMap.js | 151-200 |
| 拖拽算法 | useResponsiveMap.js | 201-260 |
| 边界检测 | useResponsiveMap.js | 261-300 |
| 触摸支持 | useResponsiveMap.js | 301-360 |
| 生命周期 | useResponsiveMap.js | 361-400 |
| GameBoard模板 | GameBoard.vue | 1-100 |
| GameBoard脚本 | GameBoard.vue | 101-200 |
| GameBoard样式 | GameBoard.vue | 201-350 |
| App布局 | App.vue | 1520-1570 |
| Panel样式 | PlayerPanel.vue | 343-370 |
| Modal样式 | Modal.vue | 1-100 |

---

## 附录 B: 浏览器兼容性矩阵

| 特性 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| CSS Transform | ✅ | ✅ | ✅ | ✅ |
| will-change | ✅ | ✅ | ✅ | ✅ |
| backdrop-filter | ✅ | ✅ | ✅ | ✅ |
| scrollbar-width | ✅ | ✅ | ❌ | ✅ |
| Touch Events | ✅ | ✅ | ✅ | ✅ |
| requestAnimationFrame | ✅ | ✅ | ✅ | ✅ |
| Composition API | ✅ | ✅ | ✅ | ✅ |

**最低要求**: 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

---

## 附录 C: 参考资料

1. **MDN Web Docs - CSS Transform**
   https://developer.mozilla.org/en-US/docs/Web/CSS/transform

2. **Google Maps缩放算法分析**
   https://stackoverflow.com/questions/2926174/canvas-zoom-to-cursor-point

3. **Vue 3 Composition API最佳实践**
   https://vuejs.org/guide/extras/composition-api-faq.html

4. **高性能动画指南**
   https://www.php.cn/link?url=aHR0cHM6Ly93d3cucGhwLmNuL2xpbms/dXJsPWFIRjBhSEFpY2w4e

5. **触摸事件规范 (W3C)**
   https://www.w3.org/TR/touch-events/

---

## 文档版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| v1.0 | 2026-05-15 | AI Assistant | 初始版本，完成全部设计方案 |

---

**文档状态**: ✅ 已完成，待用户审阅确认  
**下一步**: 用户确认后进入实现阶段（调用 writing-plans skill）
