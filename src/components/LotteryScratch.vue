<template>
  <div class="lottery-scratch-container">
    <div class="scratch-card">
      <div class="pattern-grid">
        <div 
          v-for="(pattern, index) in patterns" 
          :key="index" 
          class="pattern-cell"
        >
          {{ pattern }}
        </div>
      </div>
      <canvas 
        ref="scratchCanvas"
        class="scratch-layer"
        @mousedown="startScratch"
        @mousemove="doScratch"
        @mouseup="endScratch"
        @mouseleave="endScratch"
        @touchstart.prevent="startScratchTouch"
        @touchmove.prevent="doScratchTouch"
        @touchend.prevent="endScratch"
      ></canvas>
    </div>
    
    <div class="lottery-prize-display" v-if="isRevealed">
      <div class="prize-text" :class="{ win: prize > 0 }">
        {{ prize > 0 ? `🎉 恭喜获得 ${prize} 金币！` : '😢 谢谢参与，下次好运！' }}
      </div>
    </div>
    
    <button v-if="isRevealed" class="btn-lottery-close" :class="{ win: prize > 0 }" @click="$emit('close')">
      {{ prize > 0 ? '🎉 领取奖励' : '😢 确定' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  patterns: {
    type: Array,
    required: true
  },
  prize: {
    type: Number,
    default: 0
  }
});

defineEmits(['close']);

const canvasWidth = 320;
const canvasHeight = 220;
const scratchCanvas = ref(null);
let scratchCtx = null;
const isScratching = ref(false);
const isRevealed = ref(false);

onMounted(() => {
  nextTick(() => {
    initCanvas();
  });
  
  window.addEventListener('mouseup', handleGlobalMouseUp);
  window.addEventListener('touchend', handleGlobalTouchEnd);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', handleGlobalMouseUp);
  window.removeEventListener('touchend', handleGlobalTouchEnd);
});

watch(() => props.patterns, () => {
  isRevealed.value = false;
  nextTick(() => {
    initCanvas();
  });
});

function initCanvas() {
  const canvas = scratchCanvas.value;
  if (!canvas) return;
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  scratchCtx = canvas.getContext('2d');
  
  scratchCtx.fillStyle = '#C0C0C0';
  scratchCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  const gradient = scratchCtx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  gradient.addColorStop(0, '#C8C8C8');
  gradient.addColorStop(0.5, '#B8B8B8');
  gradient.addColorStop(1, '#C8C8C8');
  scratchCtx.fillStyle = gradient;
  scratchCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  scratchCtx.fillStyle = '#999';
  scratchCtx.font = 'bold 24px Arial';
  scratchCtx.textAlign = 'center';
  scratchCtx.textBaseline = 'middle';
  scratchCtx.fillText('👆 刮开查看', canvasWidth / 2, canvasHeight / 2);
  
  scratchCtx.globalCompositeOperation = 'destination-out';
}

function startScratch(e) {
  isScratching.value = true;
  doScratch(e);
}

function doScratch(e) {
  if (!isScratching.value || !scratchCtx) return;
  
  const canvas = scratchCanvas.value;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight) {
    scratchCtx.beginPath();
    scratchCtx.arc(x, y, 20, 0, Math.PI * 2);
    scratchCtx.fill();
    
    checkRevealed();
  }
}

function startScratchTouch(e) {
  isScratching.value = true;
  const touch = e.touches[0];
  doScratch({ clientX: touch.clientX, clientY: touch.clientY });
}

function doScratchTouch(e) {
  if (!isScratching.value) return;
  const touch = e.touches[0];
  doScratch({ clientX: touch.clientX, clientY: touch.clientY });
}

function endScratch() {
}

function handleGlobalMouseUp() {
  isScratching.value = false;
}

function handleGlobalTouchEnd() {
  isScratching.value = false;
}

function checkRevealed() {
  if (!scratchCtx || isRevealed.value) return;
  
  const imageData = scratchCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  const pixels = imageData.data;
  let transparentPixels = 0;
  
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 128) {
      transparentPixels++;
    }
  }
  
  const totalPixels = pixels.length / 4;
  const scratchPercent = (transparentPixels / totalPixels) * 100;
  
  if (scratchPercent > 80) {
    isRevealed.value = true;
  }
}
</script>

<style scoped>
.lottery-scratch-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.scratch-card {
  position: relative;
  width: 320px;
  height: 220px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.pattern-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 4px;
  padding: 10px;
  box-sizing: border-box;
  z-index: 0;
}

.pattern-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 56px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.scratch-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  z-index: 10;
}

.lottery-prize-display {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.prize-text {
  font-size: 22px;
  font-weight: bold;
  color: #888;
  text-align: center;
}

.prize-text.win {
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.btn-lottery-close {
  padding: 14px 40px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-lottery-close:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.btn-lottery-close:active {
  transform: translateY(0);
}

.btn-lottery-close.win {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #8B4513;
  animation: bounce 0.6s ease infinite alternate;
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-5px); }
}
</style>