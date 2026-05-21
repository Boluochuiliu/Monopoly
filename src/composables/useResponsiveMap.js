// src/composables/useResponsiveMap.js
import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useResponsiveMap(containerRef) {
  // ========== 配置常量 ==========
  const CONFIG = {
    MIN_SCALE: 0.5,                       // 最小缩放比例
    MAX_SCALE: 2.0,                       // 最大缩放比例
    SCALE_STEP: 0.1,                      // 每次缩放步长
    MAP_BASE_WIDTH: 1040,                 // 地图基准宽度 (px) - 更新为实际尺寸
    MAP_BASE_HEIGHT: 720,                 // 地图基准高度 (px) - 更新为实际尺寸
    WHEEL_ZOOM_SENSITIVITY: 0.001,        // 滚轮灵敏度
    ANIMATION_DURATION: 300               // 动画时长 (ms)
  }

  // ========== 核心状态 ==========
  const scale = ref(1)                    // 当前缩放比例
  const offsetX = ref(0)                  // X轴偏移量
  const offsetY = ref(0)                  // Y轴偏移量
  const isDragging = ref(false)           // 是否正在拖拽

  // ========== 计算属性：最佳缩放比例 ==========
const optimalScale = computed(() => {
  if (!containerRef.value) return 1

  const containerWidth = containerRef.value.clientWidth
  const containerHeight = containerRef.value.clientHeight

  const scaleX = containerWidth / CONFIG.MAP_BASE_WIDTH
  const scaleY = containerHeight / CONFIG.MAP_BASE_HEIGHT

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
}
