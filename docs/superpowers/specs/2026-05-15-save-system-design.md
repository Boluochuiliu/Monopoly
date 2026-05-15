# 存档系统设计文档

## 1. 需求概述

基于用户需求分析，存档系统需要满足以下核心功能：

| 需求点 | 描述 | 来源 |
|--------|------|------|
| 中途退出继续 | 玩家退出游戏后能继续之前的进度 | 用户选择A |
| 多存档槽 | 支持保存多个游戏进度 | 用户选择B |
| 自动保存 | 每回合结束自动保存 | 用户选择C |
| 手动保存 | 游戏中随时可手动保存 | 用户选择C |
| 开始界面集成 | 检测存档并提供继续按钮 | 用户选择A |

## 2. 技术方案

### 2.1 存储方式

- **方案**：浏览器 localStorage
- **容量**：约5MB（足够存储大量存档）
- **隔离性**：每个浏览器独立存储，数据隐私安全

### 2.2 数据结构

```javascript
// 存档数据格式
{
  timestamp: 1699999999999,    // 保存时间戳（毫秒）
  version: "1.0.0",           // 游戏版本号
  data: {
    players: Array,            // 玩家数组（含现金、位置、buff、道具等）
    currentPlayerIndex: Number, // 当前玩家索引
    round: Number,             // 当前回合数
    properties: Object,        // 地产状态 { id: { owner, level, investment } }
    bombs: Object,             // 炸弹位置 { tileId: { owner, placedAt } }
    chanceDeck: Array,         // 机会牌堆
    fateDeck: Array,           // 命运牌堆
    globalBuffs: Array,        // 全局buff效果
    turnHistory: Array         // 回合历史记录
  }
}
```

### 2.3 文件结构

```
src/
├── utils/
│   └── saveManager.js      # 存档管理工具（新增）
├── composables/
│   └── useGameState.js     # 游戏状态管理（修改）
├── components/
│   ├── StartScreen.vue     # 开始界面（修改）
│   └── SaveLoadModal.vue   # 存档选择弹窗（新增）
└── App.vue                 # 主应用（修改）
```

## 3. 功能设计

### 3.1 存档槽管理

| 存档槽 | 用途 | 自动保存 |
|--------|------|----------|
| 自动存档 (slot 0) | 系统自动保存 | 是 |
| 存档1 (slot 1) | 用户手动保存 | 否 |
| 存档2 (slot 2) | 用户手动保存 | 否 |
| 存档3 (slot 3) | 用户手动保存 | 否 |

### 3.2 UI交互流程

**开始界面流程：**
1. 检测是否存在自动存档
2. 存在时显示"继续游戏"按钮
3. 点击"读取存档"打开存档选择弹窗
4. 选择存档后确认加载

**游戏中流程：**
1. 点击菜单按钮打开选项面板
2. 选择"保存游戏"或"读取存档"
3. 保存时选择存档槽并确认覆盖
4. 读取时选择存档槽并确认（会中断当前游戏）

### 3.3 自动保存机制

- **触发时机**：每回合结束时自动保存到 slot 0
- **保存内容**：完整游戏状态
- **用户反馈**：保存成功时显示短暂提示

## 4. API设计

### 4.1 saveManager.js 接口

| 函数名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| `saveGame(slotIndex, gameState)` | 保存游戏到指定槽 | slotIndex: number, gameState: object | boolean |
| `loadGame(slotIndex)` | 从指定槽加载存档 | slotIndex: number | object \| null |
| `getSaveInfo(slotIndex)` | 获取存档基本信息 | slotIndex: number | object \| null |
| `deleteSave(slotIndex)` | 删除指定存档 | slotIndex: number | void |
| `hasAutoSave()` | 检查是否存在自动存档 | 无 | boolean |

### 4.2 useGameState.js 接口

| 函数名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| `importSaveData(saveData)` | 导入存档数据到游戏状态 | saveData: object | void |

## 5. 安全性与兼容性

### 5.1 版本检查

```javascript
// 加载时检查版本兼容性
if (saveData.version !== currentVersion) {
  // 提示存档版本不兼容
  return null;
}
```

### 5.2 数据验证

- 加载前验证数据结构完整性
- 缺失字段使用默认值填充
- 异常数据自动跳过

## 6. UI设计要点

### 6.1 存档选择弹窗

```
┌─────────────────────────────┐
│        选择存档              │
├─────────────────────────────┤
│  [存档1]                     │
│  2024-01-15 14:30           │
│  4玩家 · 第12回合           │
├─────────────────────────────┤
│  [存档2]                     │
│  2024-01-14 10:15           │
│  2玩家 · 第5回合            │
├─────────────────────────────┤
│  [存档3]                     │
│  空存档位                   │
├─────────────────────────────┤
│  [取消]    [确认]            │
└─────────────────────────────┘
```

### 6.2 保存成功提示

- 位置：屏幕顶部居中
- 样式：半透明背景 + 动画淡入淡出
- 内容："✓ 游戏已保存"

## 7. 实现步骤

1. 创建 `src/utils/saveManager.js`
2. 修改 `src/composables/useGameState.js` 添加导入功能
3. 创建 `src/components/SaveLoadModal.vue`
4. 修改 `src/components/StartScreen.vue` 添加存档相关按钮
5. 修改 `src/App.vue` 集成存档功能
6. 添加自动保存逻辑

---

**文档版本**: v1.0  
**创建日期**: 2026-05-15  
**适用项目**: 大富翁游戏