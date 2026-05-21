export const TILE_TYPES = {
  START: 'start',
  PROPERTY: 'property',
  CHANCE: 'chance',
  FATE: 'fate',
  STATION: 'station',
  JAIL: 'jail',
  HALL: 'hall',
  CASINO: 'casino',
  SHOP: 'shop',
  AUCTION: 'auction',
  PARK: 'park',
  FUND: 'fund'
};

export const BLOCK_COLORS = {
  '渝中区': '#4CAF50',
  '南岸区': '#8BC34A',
  '沙坪坝区': '#FF9800',
  '九龙坡区': '#FFC107',
  '两江新区': '#2196F3',
  '北碚区': '#9C27B0',
  '巴南区': '#00BCD4',
  '大渡口区': '#FF5722'
};

export const INITIAL_CASH = 2000;
export const START_SALARY = 250;
export const STATION_FEE = 50;
export const JAIL_BAIL = 200;
export const HALL_FEE = 200;
export const CASINO_MAX_BET_RATIO = 0.5;
export const MORTGAGE_RATIO = 0.7;
export const LIQUIDATION_RATIO = 0.5;

export const mapTiles = [
  { id: 1, type: TILE_TYPES.START, name: '起点', position: { row: 0, col: 0 }, direction: 'right' },
  { id: 2, type: TILE_TYPES.PROPERTY, name: '解放碑', block: '渝中区', price: 420, position: { row: 0, col: 1 }, direction: 'right' },
  { id: 3, type: TILE_TYPES.FATE, name: '命运', position: { row: 0, col: 2 }, direction: 'right' },
  { id: 4, type: TILE_TYPES.PROPERTY, name: '洪崖洞', block: '渝中区', price: 360, position: { row: 0, col: 3 }, direction: 'right' },
  { id: 5, type: TILE_TYPES.PROPERTY, name: '来福士', block: '渝中区', price: 330, position: { row: 0, col: 4 }, direction: 'right' },
  { id: 6, type: TILE_TYPES.STATION, name: '车站A', position: { row: 0, col: 5 }, direction: 'right' },
  { id: 7, type: TILE_TYPES.PROPERTY, name: '十八梯', block: '渝中区', price: 290, position: { row: 0, col: 6 }, direction: 'right' },
  { id: 8, type: TILE_TYPES.PROPERTY, name: '茶园', block: '南岸区', price: 340, position: { row: 0, col: 7 }, direction: 'right' },
  { id: 9, type: TILE_TYPES.SHOP, name: '道具店', position: { row: 0, col: 8 }, direction: 'right' },
  { id: 10, type: TILE_TYPES.PROPERTY, name: '南滨路', block: '南岸区', price: 380, position: { row: 0, col: 9 }, direction: 'right' },
  { id: 11, type: TILE_TYPES.PROPERTY, name: '南山', block: '南岸区', price: 330, position: { row: 0, col: 10 }, direction: 'right' },
  { id: 12, type: TILE_TYPES.PROPERTY, name: '磁器口', block: '沙坪坝区', price: 360, position: { row: 0, col: 11 }, direction: 'right' },
  { id: 13, type: TILE_TYPES.JAIL, name: '监狱', position: { row: 0, col: 12 }, direction: 'down' },
  { id: 14, type: TILE_TYPES.CHANCE, name: '机会', position: { row: 1, col: 12 }, direction: 'down' },
  { id: 15, type: TILE_TYPES.PROPERTY, name: '大学城', block: '沙坪坝区', price: 350, position: { row: 2, col: 12 }, direction: 'down' },
  { id: 16, type: TILE_TYPES.PARK, name: '公园', position: { row: 3, col: 12 }, direction: 'down' },
  { id: 17, type: TILE_TYPES.PROPERTY, name: '重庆西站', block: '沙坪坝区', price: 340, position: { row: 4, col: 12 }, direction: 'down' },
  { id: 18, type: TILE_TYPES.AUCTION, name: '拍卖行', position: { row: 5, col: 12 }, direction: 'down' },
  { id: 19, type: TILE_TYPES.PROPERTY, name: '半山', block: '九龙坡区', price: 320, position: { row: 6, col: 12 }, direction: 'down' },
  { id: 20, type: TILE_TYPES.PROPERTY, name: '万象城', block: '九龙坡区', price: 380, position: { row: 7, col: 12 }, direction: 'down' },
  { id: 21, type: TILE_TYPES.HALL, name: '市政厅', position: { row: 8, col: 12 }, direction: 'left' },
  { id: 22, type: TILE_TYPES.PROPERTY, name: '欢乐谷', block: '两江新区', price: 410, position: { row: 8, col: 11 }, direction: 'left' },
  { id: 23, type: TILE_TYPES.FUND, name: '基金', position: { row: 8, col: 10 }, direction: 'left' },
  { id: 24, type: TILE_TYPES.PROPERTY, name: '中央公园', block: '两江新区', price: 370, position: { row: 8, col: 9 }, direction: 'left' },
  { id: 25, type: TILE_TYPES.FATE, name: '命运', position: { row: 8, col: 8 }, direction: 'left' },
  { id: 26, type: TILE_TYPES.PROPERTY, name: '光环', block: '两江新区', price: 320, position: { row: 8, col: 7 }, direction: 'left' },
  { id: 27, type: TILE_TYPES.PROPERTY, name: '园博园', block: '两江新区', price: 300, position: { row: 8, col: 6 }, direction: 'left' },
  { id: 28, type: TILE_TYPES.SHOP, name: '道具店', position: { row: 8, col: 5 }, direction: 'left' },
  { id: 29, type: TILE_TYPES.PROPERTY, name: '缙云山', block: '北碚区', price: 390, position: { row: 8, col: 4 }, direction: 'left' },
  { id: 30, type: TILE_TYPES.PROPERTY, name: '北温泉', block: '北碚区', price: 340, position: { row: 8, col: 3 }, direction: 'left' },
  { id: 31, type: TILE_TYPES.STATION, name: '车站B', position: { row: 8, col: 2 }, direction: 'left' },
  { id: 32, type: TILE_TYPES.PROPERTY, name: '金刀峡', block: '北碚区', price: 320, position: { row: 8, col: 1 }, direction: 'left' },
  { id: 33, type: TILE_TYPES.CASINO, name: '赌场', position: { row: 8, col: 0 }, direction: 'up' },
  { id: 34, type: TILE_TYPES.PROPERTY, name: '巴滨路', block: '巴南区', price: 400, position: { row: 7, col: 0 }, direction: 'up' },
  { id: 35, type: TILE_TYPES.PARK, name: '公园', position: { row: 6, col: 0 }, direction: 'up' },
  { id: 36, type: TILE_TYPES.PROPERTY, name: '南温泉', block: '巴南区', price: 340, position: { row: 5, col: 0 }, direction: 'up' },
  { id: 37, type: TILE_TYPES.PROPERTY, name: '鱼洞', block: '巴南区', price: 310, position: { row: 4, col: 0 }, direction: 'up' },
  { id: 38, type: TILE_TYPES.CHANCE, name: '机会', position: { row: 3, col: 0 }, direction: 'up' },
  { id: 39, type: TILE_TYPES.PROPERTY, name: '华生园', block: '大渡口区', price: 370, position: { row: 2, col: 0 }, direction: 'up' },
  { id: 40, type: TILE_TYPES.PROPERTY, name: '白居寺', block: '大渡口区', price: 330, position: { row: 1, col: 0 }, direction: 'up' }
];

export const chanceCards = [
  { id: 1, type: 'good', title: '银行分红', description: '获得 100', action: { type: 'cash', amount: 100 } },
  { id: 2, type: 'good', title: '拾金不昧', description: '获得 80', action: { type: 'cash', amount: 80 } },
  { id: 3, type: 'good', title: '退税', description: '获得 120', action: { type: 'cash', amount: 120 } },
  { id: 4, type: 'good', title: '固定行走', description: '随机一名玩家下次固定行走三步', action: { type: 'randomMove', target: 'random', steps: 3 } },
  { id: 5, type: 'good', title: '直达起点', description: '立即移动到起点并领取薪水', action: { type: 'teleport', tileId: 1, collectSalary: true } },
  { id: 6, type: 'good', title: '免租金牌', description: '下次你付过路费时免付', action: { type: 'buff', name: 'freeRent', duration: 1 } },
  { id: 7, type: 'good', title: '车站月票', description: '下次使用车站传送免费一次', action: { type: 'buff', name: 'freeStation', duration: 1 } },
  { id: 8, type: 'good', title: '年终奖', description: '下次经过起点时，额外多得 150', action: { type: 'buff', name: 'bonusSalary', duration: 1, value: 150 } },
  { id: 9, type: 'good', title: '加薪通知', description: '接下来 1 次经过起点时，薪水按 300 计算', action: { type: 'buff', name: 'salaryBoost', duration: 1, value: 300 } },
  { id: 10, type: 'good', title: '维修补贴', description: '任选自己一块地产免费升一级', action: { type: 'upgradeProperty', amount: 1 } },
  { id: 11, type: 'good', title: '拆迁补偿', description: '获得 150', action: { type: 'cash', amount: 150 } },
  { id: 12, type: 'good', title: '马路天使', description: '下次你向他人付过路费时，费用减半', action: { type: 'buff', name: 'halfRent', duration: 1 } },
  { id: 13, type: 'neutral', title: '原地休息', description: '本回合不移动，不触发当前格效果', action: { type: 'skipTurn' } },
  { id: 14, type: 'neutral', title: '加速前进', description: '下次掷骰子时，结果额外 +2', action: { type: 'buff', name: 'dicePlus', duration: 1, value: 2 } },
  { id: 15, type: 'bad', title: '乱丢垃圾罚款', description: '失去 50', action: { type: 'cash', amount: -50 } },
  { id: 16, type: 'bad', title: '薪水预扣', description: '下次经过起点时，薪水减半', action: { type: 'debuff', name: 'salaryHalf', duration: 1 } }
];

export const fateCards = [
  { id: 1, type: 'good', title: '投资翻倍', description: '获得 300', action: { type: 'cash', amount: 300 } },
  { id: 2, type: 'good', title: '彩票中奖', description: '获得 250', action: { type: 'cash', amount: 250 } },
  { id: 3, type: 'good', title: '遗产继承', description: '获得 350', action: { type: 'cash', amount: 350 } },
  { id: 4, type: 'good', title: '免费翻新', description: '随机一块自己的地产免费升两级', action: { type: 'randomUpgradeProperty', amount: 2 } },
  { id: 5, type: 'good', title: '经济振兴计划', description: '接下来两位经过起点的玩家薪水+50', action: { type: 'globalBuff', name: 'salaryAdd', duration: 2, value: 50 } },
  { id: 6, type: 'good', title: '晋升调薪', description: '自己接下来 2 次经过起点时，每次额外 +100', action: { type: 'buff', name: 'extraSalary', remainingTimes: 2, value: 100 } },
  { id: 7, type: 'good', title: '天使投资', description: '任选一块无主地产免费获得', action: { type: 'freeProperty' } },
  { id: 8, type: 'good', title: '全民分红', description: '所有玩家各获得 200', action: { type: 'globalCash', amount: 200 } },
  { id: 9, type: 'bad', title: '投资诈骗', description: '失去 300', action: { type: 'cash', amount: -300 } },
  { id: 10, type: 'bad', title: '税务稽查', description: '失去 250', action: { type: 'cash', amount: -250 } },
  { id: 11, type: 'bad', title: '房屋失火', description: '自己一块地产降一级', action: { type: 'downgradeProperty', amount: 1 } },
  { id: 12, type: 'bad', title: '舍财免灾', description: '失去 150，且下一回合暂停移动', action: { type: 'cash', amount: -150 }, extra: { type: 'skipTurn' } },
  { id: 13, type: 'bad', title: '通货膨胀危机', description: '接下来两位经过起点的玩家，薪水变为 100', action: { type: 'globalDebuff', name: 'salaryReduction', duration: 2, value: 100 } },
  { id: 14, type: 'bad', title: '降职处分', description: '自己接下来 2 次经过起点时，每次 -100', action: { type: 'debuff', name: 'salaryMinus', remainingTimes: 2, value: 100 } },
  { id: 15, type: 'bad', title: '直接入狱', description: '立即进入监狱，必须坐满一轮', action: { type: 'goToJail' } },
  { id: 16, type: 'bad', title: '天灾', description: '自己最高等级地产降一级；若没有任何房产则失去 200', action: { type: 'naturalDisaster', cashPenalty: 200 } }
];

export const PLAYER_COLORS = [
  { primary: '#E53935', secondary: '#FFCDD2' },
  { primary: '#1E88E5', secondary: '#BBDEFB' },
  { primary: '#43A047', secondary: '#C8E6C9' },
  { primary: '#FB8C00', secondary: '#FFE0B2' }
];

export const PLAYER_AVATARS = ['👨', '👩', '👴', '👵'];

export const SHOP_ITEMS = {
  remoteDice: {
    id: 'remoteDice',
    name: '遥控骰子',
    icon: '🎲',
    price: 150,
    description: '立即使用，选择1~9任意点数行走'
  },
  bomb: {
    id: 'bomb',
    name: '炸弹',
    icon: '💣',
    price: 50,
    description: '选择一个地图格埋设炸弹，走到该格触发'
  },
  lottery: {
    id: 'lottery',
    name: '彩票',
    icon: '🎫',
    price: 100,
    description: '立即刮奖，根据相同图案数量获得奖金'
  }
};

export const LOTTERY_PATTERNS = ['⭐', '❤️', '🔵', '🟩', '🔷', '福'];

export const LOTTERY_PRIZES = {
  1: 100,
  2: 200,
  3: 400,
  4: 800,
  5: 1600,
  6: 3200
};

export const BLOCKS = {
  '渝中区': [2, 4, 5, 7],
  '南岸区': [8, 10, 11],
  '沙坪坝区': [12, 15, 17],
  '九龙坡区': [19, 20],
  '两江新区': [22, 24, 26, 27],
  '北碚区': [29, 30, 32],
  '巴南区': [34, 36, 37],
  '大渡口区': [39, 40]
};
