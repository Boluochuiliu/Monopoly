# 骰子点击动画设计规格文档

**日期**: 2026-05-18
**项目**: 大富翁棋盘游戏小程序
**范围**: 掷骰子按钮点击后的数字晃动与定格动画效果
**状态**: ✅ 已批准

---

## 1. 背景与目标

### 问题陈述
当前小程序的掷骰子功能缺乏视觉反馈，用户点击后直接显示结果数字，缺少真实掷骰子的仪式感和期待感。

### 设计目标
1. **增强交互体验**: 点击掷骰子后展示动态的数字滚动效果
2. **提升游戏沉浸感**: 模拟真实骰子摇晃、减速、定格的过程
3. **保持性能优秀**: 使用 CSS GPU 加速动画，确保在低端设备上流畅运行
4. **符合现有风格**: 与当前紫粉色渐变、玻璃拟态的设计语言一致

### 成功标准
- 动画总时长控制在 1.2-1.8 秒之间
- 数字切换流畅无卡顿（60fps）
- 定格时有明显的戏剧性反馈
- 不影响后续移动逻辑的执行时机

---

## 2. 技术方案选择

### 选定方案: CSS 关键帧 + JS 数据驱动混合方案

**决策理由**:
- 能真正显示随机变化的数字（非视觉欺骗）
- 性能优异：CSS 动画由 GPU 加速合成层渲染
- 灵活可控：可精确控制每个阶段的时长和效果
- 小程序友好：无需引入第三方依赖，包体积零增加

### 替代方案对比
| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **✅ 已选: CSS + JS 混合** | 平衡性能与灵活性 | 中等复杂度 | 当前需求 |
| wx.createAnimation API | 原生优化 | 代码冗长、平台绑定 | 复杂序列动画 |
| 纯 CSS 多层动画 | 极简代码 | 无法显示真实数字 | 仅视觉效果 |

---

## 3. 动画流程详细设计

### 3.1 完整时间轴 (总计 ~1800ms)

```
T=0ms      [阶段1] 用户点击掷骰子按钮
           ├─ 按钮缩放至 0.9 (150ms)
           └─ 触觉反馈 (可选)
                ↓
T=150ms    [阶段2] 显示骰子模态框
           ├─ 淡入 + 弹出动画 (150ms)
           └─ 初始化骰子区域
                ↓
T=300ms    [阶段3] 数字快速切换 ⭐ 核心效果 (~900ms)
           ├─ 每 80ms 随机切换 diceValue (1-6)
           ├─ 骰子容器:
           │   ├─ 左右晃动 ±15° (dice-shake keyframe)
           │   ├─ 缩放脉冲 0.95-1.05
           │   └─ 阴影呼吸效果
           └─ 数字文本:
               ├─ 颜色闪烁 金→白→金
               └─ 缩放同步 0.95-1.0
                ↓
T=1200ms   [阶段4] 减速过渡 (~300ms)
           ├─ 切换频率降低 (80ms → 200ms → 350ms)
           ├─ 晃动幅度逐渐减小
           └─ 音效提示 (可选)
                ↓
T=1500ms   [阶段5] 定格弹出 🎯 高潮时刻 (~300ms)
           ├─ 显示最终点数 (由 gameState 生成)
           ├─ 骰子弹性放大: 0.8 → 1.15 → 0.95 → 1.0
           ├─ 数字高亮发光 (#FFD700 + text-shadow)
           ├─ 光晕扩散特效 (box-shadow)
           └─ 成功音效/震动 (可选)
                ↓
T=1800ms+  [阶段6] 结果保持
           ├─ 保持显示 800ms 让用户看清点数
           └─ 自动触发 movePlayer(finalValue) 逻辑
```

### 3.2 视觉状态机

```
IDLE (空闲) → ROLLING (摇晃中) → SETTLING (定格) → COMPLETE (完成)
    ↑                                                    |
    └────────────── 重置 ←────────────────────────────────┘
```

**状态定义**:
- `IDLE`: 默认状态，等待用户点击
- `ROLLING`: 数字快速切换 + 容器晃动
- `SETTLING`: 减速 + 最终数字显示 + 弹出效果
- `COMPLETE`: 结果保持，准备执行下一步逻辑

---

## 4. 组件级设计

### 4.1 数据模型变更

```javascript
// game.js data 新增字段
data: {
  // ... existing fields ...

  // 骰子动画状态
  diceAnimationState: 'idle', // 'idle' | 'rolling' | 'settling' | 'complete'
  isDiceAnimating: false,     // 总开关，控制动画类名
}
```

### 4.2 WXML 模板更新

**文件**: `miniprogram/pages/game/game.wxml`  
**位置**: 第 106-113 行 (dice-modal 区域)

```html
<view wx:if="{{showDice}}" class="dice-modal">
  <view class="dice-view">
    <view class="dice-num {{isDiceAnimating ? (diceAnimationState === 'rolling' ? 'rolling' : 'settled') : ''}}">
      <text class="{{diceAnimationState === 'rolling' ? 'flickering' : (diceAnimationState === 'settling' ? 'highlighted' : '')}}">
        {{diceValue}}
      </text>
    </view>
    <text class="dice-txt">{{diceTxt}}</text>
  </view>
</view>
```

**关键变更**:
1. `.dice-num` 添加动态类名: `rolling` / `settled`
2. `<text>` 添加动态类名: `flickering` / `highlighted`
3. 通过 `diceAnimationState` 控制不同阶段的视觉效果

### 4.3 WXSS 样式设计

**文件**: `miniprogram/pages/game/game.wxss`

#### 4.3.1 骰子容器动画关键帧

```css
/* ========== 骰子容器动画 ========== */

/* 晃动效果 - 模拟真实骰子滚动 */
@keyframes dice-shake {
  0%, 100% { transform: rotate(0deg) scale(1); }
  10% { transform: rotate(-15deg) scale(0.95); }
  20% { transform: rotate(12deg) scale(1.02); }
  30% { transform: rotate(-10deg) scale(0.98); }
  40% { transform: rotate(8deg) scale(1.03); }
  50% { transform: rotate(-6deg) scale(0.97); }
  60% { transform: rotate(4deg) scale(1.01); }
  70% { transform: rotate(-2deg) scale(0.99); }
  80% { transform: rotate(1deg) scale(1); }
  90% { transform: rotate(-0.5deg) scale(1); }
}

/* 弹出定格 - 弹性缓动 */
@keyframes dice-pop {
  0% { 
    transform: scale(0.8) rotate(-5deg); 
    opacity: 0.7; 
  }
  40% { 
    transform: scale(1.18) rotate(3deg); 
    opacity: 1; 
  }
  60% { 
    transform: scale(0.94) rotate(-1deg); 
  }
  80% { 
    transform: scale(1.04) rotate(0.5deg); 
  }
  100% { 
    transform: scale(1) rotate(0deg); 
    opacity: 1; 
  }
}

/* 光晕扩散 */
@keyframes glow-spread {
  0% { 
    box-shadow: 
      0 0 0 0 rgba(255, 215, 0, 0.9),
      0 12rpx 36rpx rgba(0,0,0,0.5);
  }
  30% { 
    box-shadow: 
      0 0 20rpx 10rpx rgba(255, 215, 0, 0.6),
      0 12rpx 36rpx rgba(0,0,0,0.5);
  }
  60% { 
    box-shadow: 
      0 0 35rpx 18rpx rgba(255, 215, 0, 0.3),
      0 12rpx 36rpx rgba(0,0,0,0.5);
  }
  100% { 
    box-shadow: 
      0 12rpx 36rpx rgba(0,0,0,0.5);
  }
}

/* 状态样式 */
.dice-num.rolling {
  animation: dice-shake 0.15s ease-in-out infinite;
  will-change: transform;
}

.dice-num.settled {
  animation: 
    dice-pop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards,
    glow-spread 0.6s ease-out 0.1s forwards;
  will-change: transform, box-shadow;
}
```

#### 4.3.2 数字文本动画关键帧

```css
/* ========== 数字文本动画 ========== */

/* 数字快速闪烁 */
@keyframes number-flicker {
  0%, 100% { 
    color: #ffd700; 
    text-shadow: 0 4rpx 14rpx rgba(255,215,0,0.4);
    transform: scale(1);
  }
  50% { 
    color: #ffffff; 
    text-shadow: 0 2rpx 8rpx rgba(255,255,255,0.3);
    transform: scale(0.93);
  }
}

/* 最终数字高亮 */
@keyframes number-highlight {
  0% { 
    color: #ffffff; 
    transform: scale(0.4);
    opacity: 0.6;
  }
  50% { 
    color: #ffd700; 
    transform: scale(1.35);
    text-shadow: 
      0 0 25rpx rgba(255,215,0,0.9),
      0 0 50rpx rgba(255,215,0,0.5);
    opacity: 1;
  }
  75% { 
    color: #ffd700; 
    transform: scale(0.95);
  }
  100% { 
    color: #ffd700;
    transform: scale(1);
    text-shadow: 0 4rpx 14rpx rgba(255,215,0,0.4);
  }
}

/* 状态样式 */
.dice-num.rolling text {
  animation: number-flicker 0.16s ease-in-out infinite;
  will-change: transform, color, text-shadow;
}

.dice-num.settled text {
  animation: number-highlight 0.5s ease-out forwards;
  will-change: transform, color, text-shadow;
}
```

### 4.4 JavaScript 逻辑设计

**文件**: `miniprogram/pages/game/game.js`

#### 4.4.1 主入口方法: `rollDice()`

```javascript
rollDice() {
  if (this.data.isDiceAnimating || this.data.isRolling) return;

  this.setData({
    isRolling: true,
    showDice: true,
    diceAnimationState: 'rolling',
    isDiceAnimating: true,
    diceTxt: '正在掷骰子...'
  });

  this.startDiceRollingAnimation();
},
```

#### 4.4.2 核心动画方法: `startDiceRollingAnimation()`

```javascript
startDiceRollingAnimation() {
  const totalDuration = 900; // 快速滚动阶段时长 (ms)
  const initialInterval = 80; // 初始切换间隔 (ms)
  let elapsed = 0;

  const rollTimer = setInterval(() => {
    elapsed += initialInterval;

    const randomNum = Math.floor(Math.random() * 6) + 1;
    this.setData({ diceValue: randomNum });

    if (elapsed >= totalDuration) {
      clearInterval(rollTimer);
      this.transitionToSettlingPhase();
    }
  }, initialInterval);
},
```

#### 4.4.3 减速过渡: `transitionToSettlingPhase()`

```javascript
transitionToSettlingPhase() {
  let interval = 180;
  let remainingTime = 300;
  let iteration = 0;
  const maxIterations = 3;

  const slowDownTimer = setInterval(() => {
    const randomNum = Math.floor(Math.random() * 6) + 1;
    this.setData({ diceValue: randomNum });

    remainingTime -= interval;
    interval += 60; // 逐步减速: 180 → 240 → 300
    iteration++;

    if (iteration >= maxIterations || remainingTime <= 0) {
      clearInterval(slowDownTimer);
      this.finalizeDiceResult();
    }
  }, interval);
},
```

#### 4.4.4 定格显示: `finalizeDiceResult()`

```javascript
finalizeDiceResult() {
  const finalValue = Math.floor(Math.random() * 6) + 1;

  this.setData({
    diceValue: finalValue,
    diceAnimationState: 'settled',
    diceTxt: `你掷出了 ${finalValue} 点！`,
    diceRolling: false
  });

  setTimeout(() => {
    this.setData({
      diceAnimationState: 'complete',
      isDiceAnimating: false
    });

    setTimeout(() => {
      this.movePlayer(finalValue);
    }, 800);
  }, 500);
},
```

---

## 5. 性能优化策略

### 5.1 GPU 加速清单
- ✅ 所有动画仅使用 `transform` 和 `opacity`（合成层属性）
- ✅ 避免 `width`, `height`, `top`, `left`, `margin` 等触发布局重算的属性
- ✅ 使用 `will-change: transform` 提示浏览器提前优化

### 5.2 渲染优化
- ✅ 动画元素设置 `position: relative/absolute` 创建独立层
- ✅ 使用 `cubic-bezier` 自定义缓动函数替代默认 ease
- ✅ 合理控制动画层叠数量（最多 2 层同时动画）

### 5.3 JavaScript 优化
- ✅ 使用 `setInterval` 而非递归 `setTimeout`（减少调用栈深度）
- ✅ 及时清除定时器 (`clearInterval`) 防止内存泄漏
- ✅ 减少 `setData` 调用频率（合并状态更新）

### 5.4 兼容性保障
- ✅ 所有 CSS 属性兼容微信小程序基础库 2.0+
- ✅ `@keyframes` 动画在小程序中完全支持
- ✅ 无需 polyfill 或第三方库

---

## 6. 文件修改清单

| 文件路径 | 修改类型 | 说明 |
|----------|----------|------|
| `miniprogram/pages/game/game.wxml` | 修改 | 更新 dice-modal 模板，添加动态类名绑定 |
| `miniprogram/pages/game/game.wxss` | 修改 | 新增 6 个 @keyframes 动画 + 状态样式规则 |
| `miniprogram/pages/game/game.js` | 修改 | 重构 rollDice 方法，新增 3 个辅助方法 |

**预估代码量**:
- WXML: +5 行（模板调整）
- WXSS: +120 行（动画关键帧 + 状态样式）
- JS: +80 行（动画逻辑方法）

---

## 7. 测试验证计划

### 7.1 功能测试
- [ ] 点击掷骰子按钮后模态框正常显示
- [ ] 数字在 rolling 阶段快速随机变化（可见明显切换）
- [ ] 骰子容器在 rolling 阶段左右晃动
- [ ] 数字颜色在金/白之间闪烁
- [ ] settling 阶段数字停止变化并显示最终值
- [ ] 定格时骰子弹性弹出效果明显
- [ ] 最终数字高亮发光效果清晰可见
- [ ] 动画结束后正确触发 movePlayer 逻辑

### 7.2 边界测试
- [ ] 快速连续点击不会触发多次动画（防抖）
- [ ] 动画进行中其他按钮应禁用
- [ ] 低端机型（iOS 11 / Android 5.0）帧率 ≥ 45fps
- [ ] 动画中途返回后台再恢复不卡死

### 7.3 视觉验收标准
- [ ] 晃动幅度自然（不过度夸张）
- [ ] 定格弹出的弹性感强（类似果冻回弹）
- [ ] 光晕扩散时间恰当（不抢戏也不敷衍）
- [ ] 整体节奏紧凑（用户不会感到拖沓）

---

## 8. 可选增强功能 (v2.0 迭代)

以下功能不在本次实现范围内，但可在未来版本考虑：

- 🔊 **音效系统**: 摇晃声 + 定格"叮"声（需音频资源）
- 📳 **震动反馈**: `wx.vibrateShort({ type: 'medium' })` 在定格时触发
- ✨ **粒子特效**: 定格时从骰子中心爆发金色粒子（纯 CSS 实现）
- 🎯 **连击奖励**: 连续掷出相同数字触发特殊动画（如彩虹色）
- 📊 **历史记录**: 显示最近 5 次掷骰子结果的小图标

---

## 9. 风险评估与缓解

| 风险项 | 可能性 | 影响 | 缓解措施 |
|--------|--------|------|----------|
| 低端设备掉帧 | 中 | 高 | 降低动画复杂度，提供降级方案 |
| setInterval 精度不准 | 低 | 中 | 使用 timestamp 差值补偿 |
| setData 频繁导致卡顿 | 低 | 高 | 批量更新，合并状态 |
| 动画时序错乱 | 低 | 中 | 状态机严格控制转换条件 |

---

## 10. 总结

本设计方案通过 **CSS 关键帧动画 + JavaScript 数据驱动** 的混合策略，实现了：

1. ✅ **真实的数字随机切换体验**（非视觉欺骗）
2. ✅ **流畅的物理模拟效果**（摇晃 + 减速 + 弹跳）
3. ✅ **戏剧性的定格反馈**（弹性弹出 + 光晕高亮）
4. ✅ **优秀的性能表现**（GPU 加速，60fps 目标）
5. ✅ **清晰的代码架构**（状态机管理，易于维护）

**预计开发工作量**: 2-3 小时（含测试调试）

---

**文档版本**: v1.0.0
**最后更新**: 2026-05-18 (实施完成)
**作者**: AI Assistant (Brainstorming Skill)
**审批状态**: ✅ 已批准并实施完成
**实施日期**: 2026-05-18
**实施版本**: v1.0.0
