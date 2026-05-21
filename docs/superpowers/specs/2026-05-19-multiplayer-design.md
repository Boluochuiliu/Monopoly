# 局域网联机功能设计

## 概述

为大富翁网页游戏添加局域网联机功能，使用 PeerJS (WebRTC) 实现点对点直连，无需后端服务器，静态网站部署即可使用。

## 技术选型

- **PeerJS** - WebRTC 封装库，提供免费云信令服务器
- **主机-客户端架构** - 一个玩家作为主机管理游戏状态，其他玩家作为客户端

## 架构

```
玩家A (主机)                    玩家B/C/D (客户端)
┌──────────────┐               ┌──────────────┐
│  StartScreen │               │  StartScreen │
│ ┌──────────┐ │   WebRTC      │ ┌──────────┐ │
│ │创建房间  │ │◄─────────────►│ │加入房间  │ │
│ └──────────┘ │   P2P 直连    │ └──────────┘ │
│              │               │              │
│  GameBoard   │               │  GameBoard   │
│  (状态权威)  │──同步状态───►│  (接收状态)  │
│              │◄──发送操作───│              │
└──────────────┘               └──────────────┘
```

## 数据同步

### 主机 → 客户端（状态广播）

```javascript
{
  type: 'stateSync',
  data: {
    players: [...],
    currentPlayerIndex: 0,
    properties: {...},
    round: 1,
    message: '...',
    // 完整游戏状态
  }
}
```

### 客户端 → 主机（操作请求）

```javascript
{
  type: 'action',
  action: 'rollDice' | 'buyProperty' | 'upgradeProperty' | 'skipTurn' | ...,
  data: { /* 操作参数 */ }
}
```

### 关键规则

- 只有主机运行游戏逻辑（useGameState）
- 客户端只负责 UI 渲染和发送操作请求
- 每次状态变化，主机广播完整状态给所有客户端
- 客户端收到状态后直接替换本地状态

## UI 设计

### StartScreen 新增按钮

在现有「开始游戏」和「读取存档」按钮下方，新增两个并排按钮：
- 「创建房间」- 输入昵称后生成 6 位房间号
- 「加入房间」- 输入房间号 + 昵称

### LobbyScreen 等待大厅

- 显示房间号（可复制）
- 显示已加入的玩家列表
- 主机有「开始游戏」按钮
- 客户端等待主机开始

## 游戏流程

```
原流程：StartScreen → Playing
新流程：StartScreen → 创建/加入房间 → LobbyScreen → Playing（联机模式）
       或：StartScreen → Playing（单机模式，不变）
```

## 新增文件

```
src/
├── composables/
│   └── useMultiplayer.js    ← 联机核心逻辑
├── components/
│   ├── StartScreen.vue       ← 修改：添加按钮
│   ├── LobbyScreen.vue       ← 新增：等待大厅
│   └── ...
```

## 修改文件

- `src/components/StartScreen.vue` - 添加创建/加入房间按钮
- `src/App.vue` - 添加联机游戏流程支持
- `package.json` - 添加 peerjs 依赖

## 依赖

- `peerjs` - WebRTC 封装库（新增）

## 限制

- 主机断线则全房间断线
- 局域网内使用，外网需要 STUN/TURN 服务器
- 最多 4 人联机
