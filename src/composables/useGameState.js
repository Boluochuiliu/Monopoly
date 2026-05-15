import { ref, computed, reactive } from 'vue';
import {
  TILE_TYPES,
  mapTiles,
  chanceCards,
  fateCards,
  PLAYER_COLORS,
  PLAYER_AVATARS,
  BLOCKS,
  INITIAL_CASH,
  START_SALARY,
  STATION_FEE,
  JAIL_BAIL,
  HALL_FEE,
  SHOP_ITEMS,
  LOTTERY_PATTERNS,
  LOTTERY_PRIZES,
  MORTGAGE_RATIO
} from '../data/gameConfig';

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getBuffName(name) {
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
    fixedMove: '固定行走'
  };
  return names[name] || name;
}

export function useGameState() {
  const players = ref([]);
  const currentPlayerIndex = ref(0);
  const round = ref(1);
  const message = ref('');
  const diceResult = ref(null);
  const isRolling = ref(false);
  const refreshKey = ref(0);
  const selectedCard = ref(null);
  const casinoModal = ref(false);
  const propertyModal = ref(false);
  const upgradeModal = ref(false);
  const selectingPropertyForFree = ref(false);
  const freePropertyPlayerId = ref(null);
  const gamePhase = ref('playing');
  const mortgageModal = ref(false);
  const shopModal = ref(false);
  const itemUseModal = ref(false);
  const lotteryModal = ref(false);
  const fundModal = ref(false);
  const lotteryResult = ref(null);
  const liquidationModal = ref(false);
  const liquidationState = reactive({
    player: null,
    properties: [],
    totalCash: 0,
    onConfirm: null
  });
  const placingBomb = ref(false);
  const bombs = reactive({});
  const propertyEffectTile = reactive({
    tileId: null,
    effectType: null 
  });
  const chanceDeck = ref(shuffleArray([...chanceCards]));
  const fateDeck = ref(shuffleArray([...fateCards]));
  const globalBuffs = ref([]);
  const turnHistory = ref([]);
  const auctionModal = ref(false);
  const auctionState = reactive({
    property: null,
    startingPrice: 0,
    currentBid: 0,
    currentBidder: null,
    bids: [],
    playerOrder: [],
    currentPlayerIndex: 0,
    passedPlayers: [],
    biddedPlayers: [],
    isAuctioning: false,
    isAIProcessing: false
  });
  let onCashChangeCallback = null;
  let onSkipTurnCallback = null;
  let onBuffActivationCallback = null;
  let onAuctionSuccessCallback = null;
  let isEndingTurn = false;
  
  function setOnCashChangeCallback(callback) {
    onCashChangeCallback = callback;
  }
  
  function setOnSkipTurnCallback(callback) {
    onSkipTurnCallback = callback;
  }
  
  function setOnBuffActivationCallback(callback) {
    onBuffActivationCallback = callback;
  }
  
  function setOnAuctionSuccessCallback(callback) {
    onAuctionSuccessCallback = callback;
  }
  
  function triggerCashChange(amount, playerIndex = null) {
    if (onCashChangeCallback) {
      const idx = playerIndex !== null ? playerIndex : currentPlayerIndex.value;
      const player = players.value[idx];
      const playerName = player?.name;
      onCashChangeCallback(amount, idx, playerName);
    }
  }
  
  function triggerSkipTurn(playerIndex) {
    if (onSkipTurnCallback) {
      onSkipTurnCallback(playerIndex);
    }
  }
  
  function triggerBuffActivation(buffName, playerIndex) {
    if (onBuffActivationCallback) {
      const player = players.value[playerIndex];
      const playerName = player?.name;
      onBuffActivationCallback(buffName, playerIndex, playerName);
    }
  }
  
  const properties = reactive({});
  for (const tile of mapTiles) {
    if (tile.type === 'property') {
      properties[tile.id] = {
        owner: null,
        level: 0,
        investment: 0
      };
    }
  }

  const currentPlayer = computed(() => players.value[currentPlayerIndex.value]);
  const activePlayers = computed(() => {
    const active = players.value.filter(p => !p.bankrupt);
    console.log('[DEBUG] activePlayers count:', active.length);
    return active;
  });
  const gameOver = computed(() => {
    const over = activePlayers.value.length <= 1;
    console.log('[DEBUG] gameOver:', over, 'activePlayers:', activePlayers.value.length);
    return over;
  });
  const winner = computed(() => {
    const w = gameOver.value && activePlayers.value[0];
    console.log('[DEBUG] winner:', w?.name);
    return w;
  });

  function initPlayers(humanCount = 2, aiCount = 2) {
    players.value = [];
    const totalPlayers = humanCount + aiCount;
    for (let i = 0; i < totalPlayers; i++) {
      const isAI = i >= humanCount;
      players.value.push({
        id: i,
        name: isAI ? `🤖 AI${i - humanCount + 1}` : `玩家${i + 1}`,
        avatar: PLAYER_AVATARS[i],
        cash: INITIAL_CASH,
        position: 0,
        inJail: false,
        jailTurns: 0,
        skipNextTurn: false,
        mayorCards: 0,
        buffs: [],
        fundRebates: [],
        inventory: {
          remoteDice: 0,
          bomb: 0,
          lottery: 0
        },
        bankrupt: false,
        bankruptWarning: false,
        consecutiveNegativeRounds: 0,
        color: PLAYER_COLORS[i],
        isAI,
        isMoving: false
      });
    }
    
    for (const tile of mapTiles) {
      if (tile.type === 'property') {
        properties[tile.id] = {
          owner: null,
          level: 0,
          investment: 0
        };
      }
    }
    
    currentPlayerIndex.value = 0;
    round.value = 1;
    message.value = '游戏开始！玩家1先行动';
    diceResult.value = null;
    isRolling.value = false;
    selectedCard.value = null;
    propertyModal.value = false;
    upgradeModal.value = false;
    casinoModal.value = false;
    globalBuffs.value = [];
    turnHistory.value = [];
    chanceDeck.value = shuffleArray([...chanceCards]);
    fateDeck.value = shuffleArray([...fateCards]);
  }

  function addHistory(text, type = 'normal') {
    const entry = { text, type, player: currentPlayer.value?.name };
    turnHistory.value.push(entry);
    if (turnHistory.value.length > 50) {
      turnHistory.value.shift();
    }
  }

  const remoteDiceValue = ref(null);

  function rollDice() {
    console.log('[DEBUG] rollDice called');
    console.log('[DEBUG] - isRolling:', isRolling.value);
    console.log('[DEBUG] - currentPlayer:', currentPlayer.value?.name);
    console.log('[DEBUG] - currentPlayer.buffs:', currentPlayer.value?.buffs);
    
    if (isRolling.value) {
      console.log('[DEBUG] rollDice returning early - already rolling');
      return;
    }
    
    const player = currentPlayer.value;
    
    if (player.bankrupt) {
      console.log('[DEBUG] rollDice - current player is bankrupt, calling endTurn');
      endTurn();
      return;
    }
    
    if (player.skipNextTurn) {
      player.skipNextTurn = false;
      message.value = `${player.name} 跳过回合！`;
      console.log('[DEBUG] rollDice - player skipping turn, calling endTurn');
      endTurn();
      return;
    }
    
    isRolling.value = true;
    console.log('[DEBUG] rollDice - starting roll, isRolling:', isRolling.value);
    
    setTimeout(() => {
      try {
        let result = Math.floor(Math.random() * 9) + 1;
        console.log('[DEBUG] rollDice - initial dice result:', result);
        
        const currentPlayerRef = currentPlayer.value;
        console.log('[DEBUG] rollDice - currentPlayer at timeout:', currentPlayerRef.name);
        console.log('[DEBUG] rollDice - currentPlayer.buffs at timeout:', currentPlayerRef.buffs);
        
        const dicePlusBuff = currentPlayerRef.buffs.find(b => b.name === 'dicePlus');
        console.log('[DEBUG] rollDice - dicePlusBuff found:', dicePlusBuff);
        
        if (dicePlusBuff) {
          result += dicePlusBuff.value;
          currentPlayerRef.buffs = currentPlayerRef.buffs.filter(b => b.name !== 'dicePlus');
          console.log('[DEBUG] rollDice - dicePlus applied! result:', result);
          console.log('[DEBUG] rollDice - buffs after removal:', currentPlayerRef.buffs);
        } else {
          console.log('[DEBUG] rollDice - NO dicePlus buff found!');
        }
        
        diceResult.value = result;
        console.log('[DEBUG] rollDice - final diceResult:', diceResult.value);
        
        setTimeout(() => {
          movePlayer(result);
        }, 500);
      } finally {
        isRolling.value = false;
      }
    }, 1000);
  }

  function rollDiceWithRemoteValue(value) {
    if (value < 1 || value > 9) return;
    
    const player = currentPlayer.value;
    let result = value;
    
    const dicePlusBuff = player.buffs.find(b => b.name === 'dicePlus');
    if (dicePlusBuff) {
      result += dicePlusBuff.value;
      player.buffs = player.buffs.filter(b => b.name !== 'dicePlus');
    }
    
    diceResult.value = result;
    itemUseModal.value = false;
    
    setTimeout(() => {
      movePlayer(result);
    }, 500);
  }

  // 测试用：指定骰子点数
  function rollDiceWithValue(value) {
    if (isRolling.value) return;
    if (value < 1 || value > 9) return;
    
    isRolling.value = true;
    
    try {
      const player = currentPlayer.value;
      const dicePlusBuff = player.buffs.find(b => b.name === 'dicePlus');
      if (dicePlusBuff) {
        value += dicePlusBuff.value;
        player.buffs = player.buffs.filter(b => b.name !== 'dicePlus');
      }
      
      diceResult.value = value;
      
      setTimeout(() => {
        movePlayer(value);
      }, 500);
    } finally {
      isRolling.value = false;
    }
  }

  function movePlayer(steps) {
    const player = currentPlayer.value;
    console.log('[DEBUG] movePlayer called with steps:', steps, 'player:', player.name, 'player.buffs:', player.buffs);

    if (player.bankrupt) {
      endTurn();
      return;
    }

    if (player.skipNextTurn) {
      player.skipNextTurn = false;
      endTurn();
      return;
    }

    const fixedMoveBuff = player.buffs.find(b => b.name === 'fixedMove');
    if (fixedMoveBuff) {
      console.log('[DEBUG] movePlayer - fixedMove buff found, overriding steps from', steps, 'to', fixedMoveBuff.steps);
      steps = fixedMoveBuff.steps;
      player.buffs = player.buffs.filter(b => b.name !== 'fixedMove');
    }

    if (player.inJail) {
      player.jailTurns++;
      const maxJailTurns = player.jailType === 'bomb' ? 2 : 1;
      const remainingTurns = maxJailTurns - player.jailTurns + 1;
      if (player.jailTurns <= maxJailTurns) {
        message.value = `${player.name} 在监狱中，剩余 ${remainingTurns} 回合`;
        endTurn();
        return;
      } else {
        player.inJail = false;
        player.jailTurns = 0;
        player.jailType = null; // 清除入狱类型标记
        message.value = `${player.name} 出狱了！`;
      }
    }
    
    player.isMoving = true;
    
    let currentStep = 0;
    let crossedStart = false;
    
    const moveOneStep = () => {
      if (currentStep < steps) {
        player.position = (player.position + 1) % 40;
        
        if (player.position === 0) {
          crossedStart = true;
          collectSalary(player);
        }
        
        currentStep++;
        
        const currentTile = mapTiles[player.position];
        message.value = `${player.name} 移动到了 ${currentTile.name}`;
        
        setTimeout(moveOneStep, 300);
      } else {
        player.isMoving = false;
        
        const tile = mapTiles[player.position];
        if (!tile) {
          console.error(`Tile not found at position ${player.position}`);
          return;
        }
        
        const tileId = tile.id;
        if (bombs[tileId]) {
          setTimeout(() => {
            triggerBomb(player, tileId);
          }, 300);
        } else {
          setTimeout(() => {
            processTile(tile);
          }, 300);
        }
      }
    };
    
    setTimeout(moveOneStep, 500);
  }

  function collectSalary(player) {
    let baseSalary = START_SALARY;
    
    const salaryBoost = player.buffs.find(b => b.name === 'salaryBoost');
    if (salaryBoost) {
      baseSalary = salaryBoost.value;
      player.buffs = player.buffs.filter(b => b.name !== 'salaryBoost');
    }
    
    const salaryReductionBuff = globalBuffs.value.find(b => b.name === 'salaryReduction');
    if (salaryReductionBuff) {
      baseSalary = salaryReductionBuff.value;
      salaryReductionBuff.duration--;
      if (salaryReductionBuff.duration <= 0) {
        globalBuffs.value = globalBuffs.value.filter(b => b.name !== 'salaryReduction');
      }
    }
    
    const salaryHalf = player.buffs.find(b => b.name === 'salaryHalf');
    if (salaryHalf) {
      baseSalary = Math.floor(baseSalary / 2);
      player.buffs = player.buffs.filter(b => b.name !== 'salaryHalf');
    }
    
    let extraSalaryAmount = 0;
    
    const bonusSalary = player.buffs.find(b => b.name === 'bonusSalary');
    if (bonusSalary) {
      extraSalaryAmount += bonusSalary.value;
      player.buffs = player.buffs.filter(b => b.name !== 'bonusSalary');
    }
    
    const extraSalary = player.buffs.find(b => b.name === 'extraSalary');
    if (extraSalary && extraSalary.remainingTimes > 0) {
      extraSalaryAmount += extraSalary.value;
      extraSalary.remainingTimes--;
      if (extraSalary.remainingTimes <= 0) {
        player.buffs = player.buffs.filter(b => b.name !== 'extraSalary');
      }
    }

    const salaryAddBuff = globalBuffs.value.find(b => b.name === 'salaryAdd');
    if (salaryAddBuff) {
      extraSalaryAmount += salaryAddBuff.value;
      salaryAddBuff.duration--;
      if (salaryAddBuff.duration <= 0) {
        globalBuffs.value = globalBuffs.value.filter(b => b.name !== 'salaryAdd');
      }
    }

    const salaryMinus = player.buffs.find(b => b.name === 'salaryMinus');
    if (salaryMinus && salaryMinus.remainingTimes > 0) {
      extraSalaryAmount -= salaryMinus.value;
      salaryMinus.remainingTimes--;
      if (salaryMinus.remainingTimes <= 0) {
        player.buffs = player.buffs.filter(b => b.name !== 'salaryMinus');
      }
    }
    
    const totalSalary = baseSalary + extraSalaryAmount;
    const finalSalary = Math.max(0, totalSalary);
    
    player.cash += finalSalary;
    triggerCashChange(finalSalary);
    
    let salaryMessage = `，获得 ${baseSalary} 薪水`;
    if (extraSalaryAmount > 0) {
      salaryMessage += `，额外 +${extraSalaryAmount}`;
    } else if (extraSalaryAmount < 0) {
      salaryMessage += `，额外 ${extraSalaryAmount}`;
    }
    salaryMessage += '！';
    message.value += salaryMessage;
    
    if (player.fundRebates && player.fundRebates.length > 0) {
      for (let i = player.fundRebates.length - 1; i >= 0; i--) {
        const rebate = player.fundRebates[i];
        const rebateAmount = Math.floor(rebate.amount * 0.4);
        player.cash += rebateAmount;
        triggerCashChange(rebateAmount);
        message.value += `，获得社会基金返利 ${rebateAmount} 金币！`;
        rebate.remainingTimes--;
        if (rebate.remainingTimes <= 0) {
          player.fundRebates.splice(i, 1);
        }
      }
      refreshKey.value++;
    }
  }

  function processTile(tile) {
    const player = currentPlayer.value;
    
    switch (tile.type) {
      case 'start':
        endTurn();
        break;
        
      case 'property':
        handleProperty(tile);
        break;
        
      case 'chance':
        drawChanceCard();
        break;
        
      case 'fate':
        drawFateCard();
        break;
        
      case 'station':
        handleStation(tile);
        break;
        
      case 'jail':
        handleJail();
        break;
        
      case 'hall':
        handleHall();
        break;
        
      case 'casino':
        if (currentPlayer.value.isAI) {
          const betAmount = Math.floor(currentPlayer.value.cash * 0.1);
          const guess = Math.random() > 0.5 ? 'odd' : 'even';
          casinoBet(betAmount, 'oddEven', guess);
        } else {
          casinoModal.value = true;
        }
        break;
        
      case 'shop':
        handleShop();
        break;
        
      case 'auction':
        handleAuction();
        break;
        
      case 'park':
        message.value = `${player.name} 在公园休息`;
        endTurn();
        break;
        
      case 'fund':
        handleFund();
        break;
        
      default:
        endTurn();
    }
  }

  function handleProperty(tile) {
    const prop = properties[tile.id];
    const player = currentPlayer.value;
    
    if (prop.owner === null) {
      if (player.isAI) {
        if (player.cash >= tile.price) {
          player.cash -= tile.price;
          triggerCashChange(-tile.price);
          prop.owner = player.id;
          prop.investment = tile.price;
          message.value += `，AI购买了 ${tile.name}！`;
          endTurn();
        } else {
          message.value += `，AI现金不足，无法购买`;
          endTurn();
        }
      } else {
        if (player.cash >= tile.price) {
          message.value += `，是否购买？（${tile.price}金币）`;
          propertyModal.value = { tile, prop };
        } else {
          message.value += `，现金不足，无法购买`;
          endTurn();
        }
      }
    } else if (prop.owner !== player.id) {
      const owner = players.value[prop.owner];
      if (owner.inJail) {
        message.value += `，${owner.name} 在监狱中，免收过路费`;
        endTurn();
      } else {
        calculateRent(tile, prop, owner);
      }
    } else {
      message.value += `，这是你的地产`;
      if (prop.level < 3) {
        if (player.isAI) {
          const upgradeCost = getUpgradeCost(tile, prop);
          if (player.cash >= upgradeCost) {
            upgradeProperty(tile);
          } else {
            message.value += `，现金不足，无法升级`;
            endTurn();
          }
        } else {
          const upgradeCost = getUpgradeCost(tile, prop);
          if (player.cash >= upgradeCost) {
            upgradeModal.value = { tile, prop };
          } else {
            message.value += `，现金不足，无法升级`;
            endTurn();
          }
        }
      } else {
        endTurn();
      }
    }
  }
  
  function getUpgradeCost(tile, prop) {
    const level = prop.level;
    const price = tile.price;
    switch (level) {
      case 0: return Math.ceil(price * 0.5);
      case 1: return Math.floor(price * 1.0);
      case 2: return Math.floor(price * 2.0);
      default: return 0;
    }
  }

  function getTotalPropertyInvestment(tile, prop) {
    let total = tile.price;
    let level = 0;
    let currentLevelProp = { level: 0 };
    while (level < prop.level) {
      currentLevelProp.level = level;
      total += getUpgradeCost(tile, currentLevelProp);
      level++;
    }
    return total;
  }

  function calculateRent(tile, prop, owner) {
    const player = currentPlayer.value;
    let baseRent = 0;
    
    switch (prop.level) {
      case 0: baseRent = Math.ceil(tile.price * 0.1); break;
      case 1: baseRent = Math.floor(tile.price * 0.3); break;
      case 2: baseRent = Math.floor(tile.price * 0.7); break;
      case 3: baseRent = Math.floor(tile.price * 1.5); break;
    }
    
    const blockTiles = BLOCKS[tile.block];
    let ownedCount = 0;
    for (const tid of blockTiles) {
      if (properties[tid]?.owner === prop.owner) {
        ownedCount++;
      }
    }
    
    let multiplier = 1;
    switch (ownedCount) {
      case 2: multiplier = 1.5; break;
      case 3: multiplier = 2.0; break;
      case 4: multiplier = 2.5; break;
    }
    
    let finalRent = Math.floor(baseRent * multiplier);
    
    const hallProtection = player.buffs.find(b => b.name === 'hallProtection');
    if (hallProtection && !hallProtection.used) {
      hallProtection.used = true;
      message.value += `，🎉 市政厅祝福生效！免交过路费！`;
      addHistory(`${player.name} 使用了市政厅祝福免交过路费`, 'special');
      triggerBuffActivation('hallProtection', currentPlayerIndex.value);
      endTurn();
      return;
    }
    
    const freeRent = player.buffs.find(b => b.name === 'freeRent');
    if (freeRent) {
      message.value += `，使用免租金牌免付过路费！`;
      player.buffs = player.buffs.filter(b => b.name !== 'freeRent');
      endTurn();
      return;
    }
    
    const halfRent = player.buffs.find(b => b.name === 'halfRent');
    if (halfRent) {
      finalRent = Math.floor(finalRent / 2);
      message.value += `，使用马路天使过路费减半！`;
      player.buffs = player.buffs.filter(b => b.name !== 'halfRent');
    }
    
    if (player.mayorCards > 0) {
      for (let i = 0; i < player.mayorCards; i++) {
        player.mayorCards--;
        message.value += `，使用市长许可免付过路费！`;
        endTurn();
        return;
      }
    }
    
    message.value += `，需支付 ${finalRent} 过路费`;
    payRent(player, owner, finalRent);
  }

  function payRent(payer, receiver, amount) {
    const receiverIndex = players.value.findIndex(p => p.id === receiver.id);
    
    payer.cash -= amount;
    triggerCashChange(-amount);
    receiver.cash += amount;
    triggerCashChange(amount, receiverIndex);
    message.value += `，${payer.name} 支付 ${amount} 金币给 ${receiver.name}`;
    
    const bankruptResult = checkBankruptcyAndLiquidate(payer);
    endTurn(); // 不管处理了什么，都应该结束回合
  }

  function drawChanceCard() {
    if (chanceDeck.value.length === 0) {
      chanceDeck.value = shuffleArray([...chanceCards]);
    }
    const card = chanceDeck.value.pop();
    selectedCard.value = { ...card, type: 'chance' };
    
    if (currentPlayer.value.isAI) {
      setTimeout(() => {
        closeCardModal();
      }, 2000);
    }
  }

  function drawFateCard() {
    if (fateDeck.value.length === 0) {
      fateDeck.value = shuffleArray([...fateCards]);
    }
    const card = fateDeck.value.pop();
    selectedCard.value = { ...card, type: 'fate' };
    
    if (currentPlayer.value.isAI) {
      setTimeout(() => {
        closeCardModal();
      }, 2000);
    }
  }

  function closeCardModal() {
    if (!selectedCard.value) return;
    
    const card = selectedCard.value;
    selectedCard.value = null;
    
    applyCardEffect(card);
  }

  function applyCardEffect(card) {
    const player = currentPlayer.value;
    
    switch (card.action.type) {
      case 'cash':
        player.cash += card.action.amount;
        triggerCashChange(card.action.amount);
        if (card.action.amount < 0) {
          checkBankruptcyAndLiquidate(player);
        }
        endTurn();
        break;
        
      case 'move':
        movePlayer(card.action.steps);
        break;
        
      case 'teleport':
        player.position = card.action.tileId - 1;
        if (card.action.collectSalary) {
          collectSalary(player);
        }
        const tile = mapTiles[player.position];
        message.value = `${player.name} 传送到了 ${tile.name}`;
        setTimeout(() => processTile(tile), 300);
        break;
        
      case 'buff':
        const buffToAdd = { ...card.action };
        console.log('[DEBUG] Adding buff:', buffToAdd, 'to player:', player.name, 'player id:', player.id);
        console.log('[DEBUG] Before push, player.buffs:', player.buffs);
        player.buffs.push(buffToAdd);
        console.log('[DEBUG] After push, player.buffs.length:', player.buffs.length);
        console.log('[DEBUG] After push, player.buffs:', player.buffs);
        console.log('[DEBUG] players.value[', player.id, '].buffs:', players.value[player.id].buffs);
        message.value += `，获得${getBuffName(buffToAdd.name)}效果！`;
        endTurn();
        break;
        
      case 'debuff':
        player.buffs.push({ ...card.action });
        endTurn();
        break;
        
      case 'globalBuff':
        globalBuffs.value.push({ ...card.action });
        endTurn();
        break;
        
      case 'globalDebuff':
        globalBuffs.value.push({ ...card.action });
        endTurn();
        break;
        
      case 'globalCash':
        const globalCashAmount = card.action.amount;
        players.value.forEach((p, index) => {
          if (!p.bankrupt) {
            p.cash += globalCashAmount;
            triggerCashChange(globalCashAmount, index);
          }
        });
        message.value = `🎉 全民分红！所有玩家各获得 ${globalCashAmount} 金币！`;
        endTurn();
        break;
        
      case 'upgradeProperty':
        const upgradeAmount = card.action.amount;
        const upgradableProps = Object.entries(properties)
          .filter(([id, prop]) => prop.owner === player.id && prop.level < 3);
        
        if (upgradableProps.length === 0) {
          message.value += `，没有可升级的地产`;
          endTurn();
        } else if (upgradableProps.length === 1) {
          const [id, prop] = upgradableProps[0];
          const targetLevel = Math.min(prop.level + upgradeAmount, 3);
          prop.level = targetLevel;
          message.value += `，${mapTiles[parseInt(id) - 1]?.name} 免费升级到 Lv.${targetLevel}`;
          endTurn();
        } else {
          upgradeModal.value = { upgradeAmount };
        }
        break;

      case 'randomUpgradeProperty':
        const randomUpgradeAmount = card.action.amount;
        const randomUpgradableProps = Object.entries(properties)
          .filter(([id, prop]) => prop.owner === player.id && prop.level < 3);
        
        if (randomUpgradableProps.length === 0) {
          message.value += `，没有可升级的地产`;
          endTurn();
        } else {
          const randomIndex = Math.floor(Math.random() * randomUpgradableProps.length);
          const [id, prop] = randomUpgradableProps[randomIndex];
          propertyEffectTile.tileId = parseInt(id);
          propertyEffectTile.effectType = 'upgrade';
          const targetLevel = Math.min(prop.level + randomUpgradeAmount, 3);
          prop.level = targetLevel;
          message.value += `，${mapTiles[parseInt(id) - 1]?.name} 免费升级到 Lv.${targetLevel}`;
          setTimeout(() => {
            propertyEffectTile.tileId = null;
            propertyEffectTile.effectType = null;
          }, 2000);
          endTurn();
        }
        break;
        
      case 'downgradeProperty':
        const playerProps = Object.entries(properties)
          .filter(([id, prop]) => prop.owner === player.id && prop.level > 0)
          .sort((a, b) => b[1].level - a[1].level);
        if (playerProps.length > 0) {
          const [id, prop] = playerProps[0];
          propertyEffectTile.tileId = parseInt(id);
          propertyEffectTile.effectType = 'fire';
          prop.level--;
          message.value += `，${mapTiles[parseInt(id) - 1]?.name} 降一级`;
          setTimeout(() => {
            propertyEffectTile.tileId = null;
            propertyEffectTile.effectType = null;
          }, 2000);
        }
        endTurn();
        break;
        
      case 'skipTurn':
        player.skipNextTurn = true;
        endTurn();
        break;
        
      case 'goToJail':
        player.position = 12;
        player.inJail = true;
        player.jailTurns = 0;
        message.value += `，立即进入监狱！`;
        endTurn();
        break;
        
      case 'naturalDisaster':
        const disasterProps = Object.entries(properties)
          .filter(([id, prop]) => prop.owner === player.id && prop.level > 0)
          .sort((a, b) => b[1].level - a[1].level);
        const cashPenalty = card.action.cashPenalty || 200;
        if (disasterProps.length > 0) {
          const [id, prop] = disasterProps[0];
          propertyEffectTile.tileId = parseInt(id);
          propertyEffectTile.effectType = 'disaster';
          prop.level--;
          message.value += `，${mapTiles[parseInt(id) - 1]?.name} 降一级`;
          setTimeout(() => {
            propertyEffectTile.tileId = null;
            propertyEffectTile.effectType = null;
          }, 2000);
        } else {
          player.cash -= cashPenalty;
          triggerCashChange(-cashPenalty);
          message.value += `，失去 ${cashPenalty} 金币`;
          checkBankruptcyAndLiquidate(player);
        }
        endTurn();
        break;
        
      case 'freeProperty':
        const unownedProps = Object.fromEntries(
          Object.entries(properties).filter(([id, prop]) => prop.owner === null)
        );
        if (Object.keys(unownedProps).length > 0) {
          if (player.isAI) {
            selectAIProperty(player);
          } else {
            freePropertyPlayerId.value = player.id;
            selectingPropertyForFree.value = true;
            message.value += `，请在地图上选择一块空地`;
          }
        } else {
          message.value += `，没有空地可以选择`;
          endTurn();
        }
        break;

      case 'randomMove':
        const otherPlayers = players.value.filter(p => !p.bankrupt && p.id !== player.id);
        if (otherPlayers.length > 0) {
          const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          targetPlayer.buffs.push({
            name: 'fixedMove',
            duration: 1,
            steps: card.action.steps
          });
          message.value = `${player.name} 使用了固定行走，${targetPlayer.name} 下次移动固定行走 ${card.action.steps} 步！`;
        } else {
          message.value = `${player.name} 没有其他玩家可以影响`;
        }
        endTurn();
        break;

      default:
        endTurn();
    }

    if (card.extra?.type === 'skipTurn' && card.action.type !== 'skipTurn') {
      player.skipNextTurn = true;
    }
  }

  function handleBankrupt(player) {
    console.log('[DEBUG] handleBankrupt called for player:', player.name, 'currentPlayerIndex:', currentPlayerIndex.value);
    player.bankrupt = true;
    player.bankruptWarning = false;
    player.consecutiveNegativeRounds = 0;
    message.value += `，${player.name} 破产了！`;
    console.log('[DEBUG] Player', player.name, 'marked as bankrupt');
    for (const [id, prop] of Object.entries(properties)) {
      if (prop.owner === player.id) {
        prop.owner = null;
        prop.level = 0;
        prop.investment = 0;
      }
    }
  }

  function calculatePlayerAssets(player) {
    let totalAssets = player.cash;
    for (const [id, prop] of Object.entries(properties)) {
      if (prop.owner === player.id) {
        totalAssets += prop.investment;
      }
    }
    return totalAssets;
  }

  function getPlayerProperties(playerId) {
    const props = [];
    for (const [id, prop] of Object.entries(properties)) {
      if (prop.owner === playerId) {
        const tile = mapTiles[parseInt(id) - 1];
        props.push({
          id: parseInt(id),
          tile,
          prop,
          liquidationValue: Math.floor(prop.investment * 0.5)
        });
      }
    }
    return props;
  }

  function prepareLiquidation(player) {
    const cash = player.cash;
    if (cash >= -500) {
      return { prepared: false, remainingCash: cash };
    }

    const playerProps = getPlayerProperties(player.id);
    if (playerProps.length === 0) {
      handleBankrupt(player);
      return { prepared: true, immediate: true, remainingCash: 0 };
    }

    const shuffled = [...playerProps].sort(() => Math.random() - 0.5);
    let currentCash = cash;
    const toLiquidate = [];

    for (const item of shuffled) {
      if (currentCash >= -500) break;
      currentCash += item.liquidationValue;
      toLiquidate.push(item);
    }

    liquidationState.player = player;
    liquidationState.properties = toLiquidate;
    liquidationState.originalCash = cash; // 保存原始现金
    liquidationState.finalCash = currentCash; // 清算后现金
    liquidationState.onConfirm = () => {
      for (const item of toLiquidate) {
        const prop = properties[item.id];
        prop.owner = null;
        prop.level = 0;
        prop.investment = 0;
      }
      player.cash = currentCash;
      message.value += `，强制清算 ${toLiquidate.length} 处地产，获得 ${toLiquidate.reduce((sum, p) => sum + p.liquidationValue, 0)} 金币！`;
      liquidationModal.value = false;
      
      // 检查清算后现金是否仍然低于-500，如果是则直接破产
      if (player.cash < -500) {
        message.value += `，清算后现金仍为 ${player.cash}，低于 -500，强制破产！`;
        handleBankrupt(player);
      }
      
      setTimeout(() => {
        endTurn();
      }, 500);
    };

    return { prepared: true, immediate: false };
  }

  function checkBankruptcyAndLiquidate(player) {
    const cash = player.cash;

    // Emergency Liquidation: cash < -1000, immediately liquidate
    if (cash < -1000) {
      message.value = `${player.name} 现金低于 -1000！紧急清算！`;
      const result = prepareLiquidation(player);
      if (result.immediate) {
        message.value += `，无地产可清算，强制破产！`;
        handleBankrupt(player);
      } else if (result.prepared) {
        liquidationModal.value = true;
      }
      return { handled: true };
    }

    // Check bankruptcy warning state
    if (cash < -500) {
      // Player just entered warning zone
      if (!player.bankruptWarning && player.liquidationCountdown === undefined) {
        player.bankruptWarning = true;
        player.liquidationCountdown = 2; // Start with 2 rounds countdown
        message.value = `${player.name} 现金为 ${cash}，低于 -500，破产预警，还有两轮清算！`;
        return { handled: true };
      }
      // Player already in warning, but countdown should only decrease at turn end
      // Don't do anything here, countdown decreases in processTurnEndForBankruptcy
    } else {
      // Cash >= -500, clear warning if exists
      if (player.bankruptWarning) {
        player.bankruptWarning = false;
        player.liquidationCountdown = undefined;
        message.value = `${player.name} 现金恢复到 ${cash}，解除破产预警！`;
      }
    }
    return { handled: false };
  }

  function processTurnEndForBankruptcy(player) {
    if (!player.bankruptWarning || player.bankrupt) {
      return { shouldStop: false };
    }

    const cash = player.cash;

    // If cash recovered, clear warning
    if (cash >= -500) {
      player.bankruptWarning = false;
      player.liquidationCountdown = undefined;
      message.value = `${player.name} 现金恢复到 ${cash}，解除破产预警！`;
      return { shouldStop: false };
    }

    // Decrease countdown by 1
    player.liquidationCountdown--;

    if (player.liquidationCountdown <= 0) {
      // Countdown reached 0, start liquidation
      message.value = `${player.name} 清算倒计时结束，现金为 ${cash}，开始强制清算！`;
      const result = prepareLiquidation(player);
      if (result.immediate) {
        message.value += `，无地产可清算，强制破产！`;
        handleBankrupt(player);
      } else if (result.prepared) {
        liquidationModal.value = true;
      }
      return { shouldStop: true };
    } else {
      // 只在倒计时还没到0时才显示回合消息
      message.value = `第 ${round.value} 回合，${player.name} 的回合，现金为 ${cash}，低于 -500，破产预警，还剩 ${player.liquidationCountdown} 轮清算！`;
      return { shouldStop: false };
    }
  }

  function handleStation(tile) {
    const player = currentPlayer.value;
    const hasFreeStation = player.buffs?.some(b => b.name === 'freeStation');
    
    if (player.isAI) {
      if (hasFreeStation || (player.cash >= STATION_FEE && Math.random() > 0.5)) {
        if (hasFreeStation) {
          player.buffs = player.buffs.filter(b => b.name !== 'freeStation');
          message.value += `，AI使用车站月票免费传送！`;
        } else {
          player.cash -= STATION_FEE;
          triggerCashChange(-STATION_FEE);
          message.value += `，AI支付 ${STATION_FEE} 金币传送！`;
        }
        stationTeleport(tile);
      } else {
        message.value += `，AI选择不传送`;
        endTurn();
      }
    } else {
      if (hasFreeStation) {
        message.value += `，是否使用车站月票免费传送到另一个车站？`;
        propertyModal.value = { tile, type: 'station', free: true };
      } else if (player.cash >= STATION_FEE) {
        message.value += `，是否支付 ${STATION_FEE} 金币传送到另一个车站？`;
        propertyModal.value = { tile, type: 'station' };
      } else {
        message.value += `，现金不足，无法传送`;
        endTurn();
      }
    }
  }

  function stationTeleport(tile) {
    const targetStation = tile.id === 6 ? 31 : 6;
    const player = currentPlayer.value;
    const originalPosition = player.position;
    
    player.position = targetStation - 1;
    const targetTile = mapTiles[player.position];
    
    if (tile.id === 31 && targetStation === 6) {
      message.value += `，传送到 ${targetTile.name}，途经起点！`;
      collectSalary(player);
    } else {
      message.value += `，传送到 ${targetTile.name}！`;
    }
    
    endTurn();
  }

  function handleJail() {
    const player = currentPlayer.value;
    
    if (player.isAI) {
      player.inJail = true;
      player.jailTurns = 0;
      message.value = `${player.name} 进入监狱！本回合暂停移动`;
      endTurn();
    } else {
      player.inJail = true;
      player.jailTurns = 0;
      message.value = `${player.name} 进入监狱！`;
      if (player.cash >= JAIL_BAIL) {
        propertyModal.value = { type: 'jail', playerId: player.id };
      } else {
        message.value += `，现金不足，无法缴纳保释金`;
        endTurn();
      }
    }
  }
  
  function payBail() {
    const player = currentPlayer.value;
    if (player.cash >= JAIL_BAIL) {
      player.cash -= JAIL_BAIL;
      triggerCashChange(-JAIL_BAIL);
      player.inJail = false;
      player.jailTurns = 0;
      message.value = `${player.name} 缴纳了 ${JAIL_BAIL} 金币保释金，立即出狱！`;
      propertyModal.value = false;
      endTurn();
    } else {
      message.value = `${player.name} 现金不足，无法缴纳保释金！`;
      propertyModal.value = false;
      endTurn();
    }
  }

  function handleHall() {
    const player = currentPlayer.value;
    const existingBuff = player.buffs.find(b => b.name === 'hallProtection');
    if (existingBuff) {
      existingBuff.duration = 4;
      message.value = `${player.name}在市政厅刷新了免过路费效果，持续时间重置为4回合！`;
    } else {
      player.buffs.push({
        name: 'hallProtection',
        duration: 4,
        used: false
      });
      message.value = `${player.name}获得了市政厅的祝福，4回合内首次进入他人地产免交过路费！`;
    }
    endTurn();
  }

  function handleShop() {
    const player = currentPlayer.value;
    message.value = `${player.name} 来到了道具店`;
    if (player.isAI) {
      const items = Object.entries(SHOP_ITEMS).filter(([key, item]) => player.cash >= item.price);
      if (items.length > 0) {
        const [selectedKey, selectedItem] = items[Math.floor(Math.random() * items.length)];
        player.cash -= selectedItem.price;
        triggerCashChange(-selectedItem.price);
        message.value += `，购买了 ${selectedItem.name}！`;
        
        if (selectedKey === 'lottery') {
          aiDrawLottery(player);
        } else {
          player.inventory[selectedKey]++;
        }
      }
      endTurn();
    } else {
      const affordableItems = Object.entries(SHOP_ITEMS).filter(([key, item]) => player.cash >= item.price);
      if (affordableItems.length > 0) {
        shopModal.value = true;
      } else {
        message.value += `，现金不足，无法购买任何物品`;
        endTurn();
      }
    }
  }
  
  function aiDrawLottery(player) {
    const result = [];
    for (let i = 0; i < 6; i++) {
      result.push(LOTTERY_PATTERNS[Math.floor(Math.random() * LOTTERY_PATTERNS.length)]);
    }
    
    const fuCount = result.filter(pattern => pattern === '福').length;
    const prize = LOTTERY_PRIZES[fuCount] || 0;
    
    if (prize > 0) {
      player.cash += prize;
      triggerCashChange(prize);
      message.value += ` 彩票中奖获得 ${prize} 金币！`;
    } else {
      message.value += ` 彩票未中奖`;
    }
  }

  function buyShopItem(itemId) {
    const player = currentPlayer.value;
    const item = SHOP_ITEMS[itemId];
    
    if (player.cash >= item.price) {
      if (itemId === 'lottery') {
        shopModal.value = false;
        drawLottery(item.price);
      } else {
        player.cash -= item.price;
        triggerCashChange(-item.price);
        message.value = `${player.name} 购买了 ${item.name}！`;
        player.inventory[itemId]++;
        shopModal.value = false;
        endTurn();
      }
    }
  }

  function drawLottery(price) {
    const player = currentPlayer.value;
    const result = [];
    for (let i = 0; i < 6; i++) {
      result.push(LOTTERY_PATTERNS[Math.floor(Math.random() * LOTTERY_PATTERNS.length)]);
    }
    
    const fuCount = result.filter(pattern => pattern === '福').length;
    const prize = LOTTERY_PRIZES[fuCount] || 0;
    
    lotteryResult.value = {
      patterns: result,
      prize,
      price
    };
    lotteryModal.value = true;
  }

  function closeLotteryModal() {
    const player = currentPlayer.value;
    const prize = lotteryResult.value?.prize || 0;
    const price = lotteryResult.value?.price || 0;
    
    player.cash -= price;
    triggerCashChange(-price);
    
    if (prize > 0) {
      player.cash += prize;
      triggerCashChange(prize);
      message.value += `${player.name} 购买彩票花费 ${price} 金币，中奖获得 ${prize} 金币！`;
    } else {
      message.value += `${player.name} 购买彩票花费 ${price} 金币，未中奖！`;
    }
    
    lotteryModal.value = false;
    lotteryResult.value = null;
    endTurn();
  }

  function useItem(itemId) {
    const player = currentPlayer.value;
    
    if (player.inventory[itemId] <= 0) return;
    
    switch (itemId) {
      case 'remoteDice':
        itemUseModal.value = { type: 'remoteDice' };
        break;
      case 'bomb':
        itemUseModal.value = { type: 'bomb' };
        break;
    }
  }
  
  function confirmRemoteDice(number) {
    const player = currentPlayer.value;
    if (!player) {
      console.error('当前玩家未定义');
      return;
    }
    player.inventory.remoteDice--;
    diceResult.value = number;
    itemUseModal.value = false;
    message.value = `${player.name} 使用遥控骰子，前进 ${number} 步！`;
    setTimeout(() => {
      movePlayer(number);
    }, 500);
  }
  
  function startPlaceBomb() {
    const player = currentPlayer.value;
    player.inventory.bomb--;
    placingBomb.value = true;
    itemUseModal.value = false;
    message.value = `${player.name} 请点击地图上的格子安放炸弹（点击取消按钮可取消放置）`;
  }

  function cancelPlaceBomb() {
    const player = currentPlayer.value;
    player.inventory.bomb++;
    placingBomb.value = false;
    message.value = `${player.name} 取消安放炸弹`;
  }

  function placeBomb(tileId) {
    if (bombs[tileId]) {
      message.value = '该格子已有炸弹！';
      return;
    }
    
    bombs[tileId] = {
      owner: currentPlayer.value.id,
      placedAt: Date.now()
    };
    placingBomb.value = false;
    message.value = `炸弹已安放在 ${mapTiles[tileId - 1]?.name}！`;
  }

  function triggerBomb(player, tileId) {
    const bomb = bombs[tileId];
    if (!bomb) return;
    
    delete bombs[tileId];
    
    const tile = mapTiles[tileId - 1];
    if (tile && tile.type === TILE_TYPES.PROPERTY) {
      const property = properties[tileId];
      if (property && property.owner && property.owner !== player.id) {
        const owner = players.value.find(p => p.id === property.owner);
        if (owner) {
          const rent = calculateRent(tile, property, owner);
          
          if (player.cash >= rent) {
            player.cash -= rent;
            owner.cash += rent;
            triggerCashChange(-rent);
            message.value = `${player.name} 踩到炸弹！支付 ${rent} 金币租金给 ${owner.name}，然后被送入监狱！`;
          } else {
            message.value = `${player.name} 踩到炸弹！现金不足支付租金，直接被送入监狱！`;
          }
        } else {
          message.value = `${player.name} 踩到炸弹！被送入监狱，暂停2回合！`;
        }
      } else {
        message.value = `${player.name} 踩到炸弹！被送入监狱，暂停2回合！`;
      }
    } else {
      message.value = `${player.name} 踩到炸弹！被送入监狱，暂停2回合！`;
    }
    
    player.position = 12;
    player.inJail = true;
    player.jailTurns = 0;
    player.jailType = 'bomb'; // 标记为炸弹入狱
    endTurn();
  }

  function handleAuction() {
    const player = currentPlayer.value;
    message.value = `${player.name} 来到了拍卖行`;
    
    const unownedProperties = Object.entries(properties)
      .filter(([id, prop]) => prop.owner === null)
      .map(([id]) => parseInt(id));
    
    if (unownedProperties.length === 0) {
      message.value += `，没有可拍卖的地产`;
      endTurn();
      return;
    }
    
    const randomPropId = unownedProperties[Math.floor(Math.random() * unownedProperties.length)];
    const tile = mapTiles.find(t => t.id === randomPropId);
    
    if (!tile) {
      message.value += `，找不到地产信息`;
      endTurn();
      return;
    }
    
    startAuction(tile);
  }
  
  function startAuction(tile) {
    const startingPrice = Math.ceil(tile.price * 0.5);
    const arrivingPlayer = currentPlayer.value;
    
    let playerOrder = [...activePlayers.value];
    const arrivingIndex = playerOrder.findIndex(p => p.id === arrivingPlayer.id);
    if (arrivingIndex !== -1 && arrivingIndex !== 0) {
      const arriving = playerOrder.splice(arrivingIndex, 1)[0];
      playerOrder.unshift(arriving);
    }
    
    auctionState.property = tile;
    auctionState.startingPrice = startingPrice;
    auctionState.currentBid = startingPrice;
    auctionState.currentBidder = null;
    auctionState.bids = [];
    auctionState.playerOrder = playerOrder;
    auctionState.currentPlayerIndex = 0;
    auctionState.passedPlayers = [];
    auctionState.biddedPlayers = [];
    auctionState.isAuctioning = true;
    
    message.value = `🎪 拍卖开始！${tile.name}，起拍价 ${startingPrice} 金币`;
    auctionModal.value = true;
    
    processNextAuctionPlayer();
  }
  
  function processNextAuctionPlayer() {
    const allPlayers = auctionState.playerOrder.filter(p => !p.bankrupt);
    const allPassed = auctionState.passedPlayers.length >= allPlayers.length;
    
    if (allPassed) {
      if (auctionState.currentBidder !== null) {
        const winner = players.value.find(p => p.id === auctionState.currentBidder);
        message.value = `🎉 ${winner.name} 以 ${auctionState.currentBid} 金币拍得 ${auctionState.property.name}！`;
      } else {
        message.value = `⏰ ${auctionState.property.name} 流拍，无人出价`;
      }
      endAuction();
      return;
    }
    
    const currentAuctionPlayer = auctionState.playerOrder[auctionState.currentPlayerIndex];
    
    if (!currentAuctionPlayer || currentAuctionPlayer.bankrupt) {
      nextAuctionPlayer();
      return;
    }
    
    if (auctionState.passedPlayers.includes(currentAuctionPlayer.id)) {
      nextAuctionPlayer();
      return;
    }
    
    const minBid = auctionState.currentBidder === null ? auctionState.startingPrice : auctionState.currentBid + 20;
    if (currentAuctionPlayer.cash < minBid) {
      message.value = `${currentAuctionPlayer.name} 资金不足，跳过竞价`;
      auctionState.passedPlayers.push(currentAuctionPlayer.id);
      
      const allPlayers = auctionState.playerOrder.filter(p => !p.bankrupt);
      const allPassed = auctionState.passedPlayers.length >= allPlayers.length;
      
      if (allPassed) {
        if (auctionState.currentBidder !== null) {
          const winner = players.value.find(p => p.id === auctionState.currentBidder);
          message.value = `🎉 ${winner.name} 以 ${auctionState.currentBid} 金币拍得 ${auctionState.property.name}！`;
        } else {
          message.value = `⏰ ${auctionState.property.name} 流拍，无人出价`;
        }
        endAuction();
        return;
      }
      
      if (auctionState.currentBidder !== null) {
        const nonBidderPlayers = allPlayers.filter(p => p.id !== auctionState.currentBidder);
        const allNonBiddersPassed = nonBidderPlayers.every(p => auctionState.passedPlayers.includes(p.id));
        
        if (allNonBiddersPassed) {
          const winner = players.value.find(p => p.id === auctionState.currentBidder);
          message.value = `🎉 ${winner.name} 以 ${auctionState.currentBid} 金币拍得 ${auctionState.property.name}！`;
          endAuction();
          return;
        }
      }
      
      nextAuctionPlayer();
      return;
    }
    
    if (currentAuctionPlayer.isAI) {
      setTimeout(() => {
        aiMakeBid(currentAuctionPlayer);
      }, 1500);
    }
  }
  
  function aiMakeBid(player) {
    const maxBid = player.cash;
    const currentBid = auctionState.currentBid;
    
    const prop = properties[auctionState.property.id];
    
    const tilesInBlock = mapTiles.filter(t => t.block === auctionState.property.block);
    const totalTilesInBlock = tilesInBlock.length;
    
    const ownedIds = Object.entries(properties)
      .filter(([id, p]) => p.owner === player.id)
      .map(([id]) => parseInt(id));
    const ownedBlocks = new Set();
    const ownedTilesInBlock = [];
    for (const id of ownedIds) {
      const t = mapTiles.find(t => t.id === id);
      if (t && t.block) {
        ownedBlocks.add(t.block);
        if (t.block === auctionState.property.block) {
          ownedTilesInBlock.push(t.id);
        }
      }
    }
    
    let valueFactor;
    if (totalTilesInBlock === 2) {
      if (ownedTilesInBlock.length === 0) valueFactor = 0.6;
      else if (ownedTilesInBlock.length === 1) valueFactor = 0.9;
      else if (ownedTilesInBlock.length === 2) valueFactor = 1.2;
    } else {
      if (ownedTilesInBlock.length === 0) valueFactor = 0.6;
      else if (ownedTilesInBlock.length === 1) valueFactor = 0.8;
      else if (ownedTilesInBlock.length === 2) valueFactor = 1.0;
      else if (ownedTilesInBlock.length >= 3) valueFactor = 1.2;
    }
    
    const isLastTileForMonopoly = totalTilesInBlock - ownedTilesInBlock.length === 1;
    if (isLastTileForMonopoly) {
      valueFactor += 0.1;
    }
    
    const mentalPrice = Math.floor(auctionState.property.price * valueFactor);
    
    if (maxBid <= currentBid + 200) {
      passAuction(player);
      return;
    }
    
    if (currentBid >= mentalPrice) {
      if (maxBid - currentBid < 200) {
        passAuction(player);
        return;
      }
    }
    
    let passProbability = 0.5;
    
    if (isLastTileForMonopoly) {
      passProbability = 0.3;
    }
    
    const totalAssets = players.value.reduce((sum, p) => sum + (p.bankrupt ? 0 : p.cash), 0);
    if (player.cash > totalAssets * 0.3) {
      passProbability = 0.4;
    }
    
    const P = currentBid / mentalPrice;
    
    if (P > 1.0 && Math.random() < passProbability) {
      passAuction(player);
      return;
    }
    
    const nextBid = currentBid + 20;
    
    if (nextBid <= mentalPrice) {
      placeBid(player, nextBid);
    } else {
      if (P > 1.0 && Math.random() < passProbability) {
        passAuction(player);
        return;
      }
      placeBid(player, nextBid);
    }
  }
  
  function placeBid(player, amount) {
    if (player.bankrupt) {
      return;
    }
    
    if (amount < auctionState.currentBid + 20 && auctionState.currentBidder !== null) {
      message.value = `${player.name} 的出价无效，每次加价不得少于 20 金币！`;
      return;
    }
    
    if (amount < auctionState.startingPrice) {
      message.value = `${player.name} 的出价低于起拍价！`;
      return;
    }
    
    if (amount > player.cash) {
      message.value = `${player.name} 现金不足！`;
      return;
    }
    
    auctionState.currentBid = amount;
    auctionState.currentBidder = player.id;
    auctionState.bids.push({ playerId: player.id, amount });
    
    if (!auctionState.biddedPlayers.includes(player.id)) {
      auctionState.biddedPlayers.push(player.id);
    }
    
    auctionState.passedPlayers = [];
    
    message.value = `${player.name} 出价 ${amount} 金币！`;
    
    const playerIndex = auctionState.playerOrder.findIndex(p => p.id === player.id);
    auctionState.currentPlayerIndex = playerIndex;
    
    advanceToNextPlayer();
  }
  
  function advanceToNextPlayer() {
    const allPlayers = auctionState.playerOrder.filter(p => !p.bankrupt);
    const allPassed = auctionState.passedPlayers.length >= allPlayers.length;
    
    if (allPassed) {
      if (auctionState.currentBidder !== null) {
        const winner = players.value.find(p => p.id === auctionState.currentBidder);
        message.value = `🎉 ${winner.name} 以 ${auctionState.currentBid} 金币拍得 ${auctionState.property.name}！`;
      } else {
        message.value = `⏰ ${auctionState.property.name} 流拍，无人出价`;
      }
      endAuction();
      return;
    }
    
    nextAuctionPlayer();
  }
  
  function processAIPlayersBids() {
    auctionState.isAIProcessing = true;
    
    const aiPlayers = auctionState.playerOrder.filter(p => p.isAI && !p.bankrupt && !auctionState.passedPlayers.includes(p.id));
    
    if (aiPlayers.length === 0) {
      auctionState.isAIProcessing = false;
      checkAuctionEnd();
      return;
    }
    
    let delay = 0;
    aiPlayers.forEach((aiPlayer, index) => {
      setTimeout(() => {
        if (!auctionState.isAuctioning) {
          auctionState.isAIProcessing = false;
          return;
        }
        
        aiMakeBid(aiPlayer);
        
        if (index === aiPlayers.length - 1) {
          setTimeout(() => {
            auctionState.isAIProcessing = false;
            checkAuctionEnd();
          }, 500);
        }
      }, delay);
      delay += 800;
    });
  }
  
  function checkAuctionEnd() {
    const activePlayers = auctionState.playerOrder.filter(p => !p.bankrupt && !auctionState.passedPlayers.includes(p.id));
    
    if (auctionState.currentBidder === null) {
      const allPlayers = auctionState.playerOrder.filter(p => !p.bankrupt);
      if (auctionState.passedPlayers.length >= allPlayers.length) {
        message.value = `⏰ ${auctionState.property.name} 流拍，无人出价`;
        endAuction();
      }
      return;
    }
    
    const allPlayers = auctionState.playerOrder.filter(p => !p.bankrupt);
    const allPassed = auctionState.passedPlayers.length >= allPlayers.length;
    
    if (allPassed) {
      const winner = players.value.find(p => p.id === auctionState.currentBidder);
      message.value = `🎉 ${winner.name} 以 ${auctionState.currentBid} 金币拍得 ${auctionState.property.name}！`;
      endAuction();
      return;
    }
    
    if (activePlayers.every(p => p.isAI)) {
      endAuction();
    }
  }
  
  function passAuction(player) {
    if (player.bankrupt) {
      return;
    }
    
    if (!auctionState.passedPlayers.includes(player.id)) {
      auctionState.passedPlayers.push(player.id);
      message.value = `${player.name} 放弃出价`;
    }
    
    const allPlayers = auctionState.playerOrder.filter(p => !p.bankrupt);
    const allPassed = auctionState.passedPlayers.length >= allPlayers.length;
    
    if (auctionState.currentBidder !== null) {
      const nonBidderPlayers = allPlayers.filter(p => p.id !== auctionState.currentBidder);
      const allNonBiddersPassed = nonBidderPlayers.every(p => auctionState.passedPlayers.includes(p.id));
      
      if (allNonBiddersPassed) {
        const winner = players.value.find(p => p.id === auctionState.currentBidder);
        message.value = `🎉 ${winner.name} 以 ${auctionState.currentBid} 金币拍得 ${auctionState.property.name}！`;
        endAuction();
        return;
      }
    }
    
    if (allPassed) {
      if (auctionState.currentBidder !== null) {
        const winner = players.value.find(p => p.id === auctionState.currentBidder);
        message.value = `🎉 ${winner.name} 以 ${auctionState.currentBid} 金币拍得 ${auctionState.property.name}！`;
      } else {
        message.value = `⏰ ${auctionState.property.name} 流拍，无人出价`;
      }
      endAuction();
      return;
    }
    
    advanceToNextPlayer();
  }
  
  function nextAuctionPlayer() {
    auctionState.currentPlayerIndex = (auctionState.currentPlayerIndex + 1) % auctionState.playerOrder.length;
    
    const passedCount = auctionState.playerOrder.filter(p => 
      auctionState.passedPlayers.includes(p.id) || p.bankrupt
    ).length;
    
    if (passedCount >= auctionState.playerOrder.length) {
      endAuction();
    } else {
      const currentPlayer = auctionState.playerOrder[auctionState.currentPlayerIndex];
      if (auctionState.passedPlayers.includes(currentPlayer.id) || currentPlayer.bankrupt) {
        nextAuctionPlayer();
      } else {
        processNextAuctionPlayer();
      }
    }
  }
  
  function endAuction() {
    auctionState.isAuctioning = false;
    
    if (auctionState.currentBidder !== null && auctionState.bids.length > 0) {
      const winner = players.value.find(p => p.id === auctionState.currentBidder);
      const winnerIndex = players.value.findIndex(p => p.id === auctionState.currentBidder);
      const prop = properties[auctionState.property.id];
      
      if (winner && winner.cash >= auctionState.currentBid) {
        winner.cash -= auctionState.currentBid;
        triggerCashChange(-auctionState.currentBid, winnerIndex);
        prop.owner = winner.id;
        prop.investment = auctionState.currentBid;
        prop.level = 0;
        
        message.value = `🎉 ${winner.name} 以 ${auctionState.currentBid} 金币拍得 ${auctionState.property.name}！`;
        
        if (onAuctionSuccessCallback) {
          onAuctionSuccessCallback(winner.name, auctionState.property.name);
        }
      }
    } else {
      message.value = `⏰ ${auctionState.property.name} 流拍，无人出价`;
    }
    
    auctionModal.value = false;
    resetAuctionState();
    endTurn();
  }
  
  function resetAuctionState() {
    auctionState.property = null;
    auctionState.startingPrice = 0;
    auctionState.currentBid = 0;
    auctionState.currentBidder = null;
    auctionState.bids = [];
    auctionState.playerOrder = [];
    auctionState.currentPlayerIndex = 0;
    auctionState.passedPlayers = [];
    auctionState.biddedPlayers = [];
    auctionState.isAuctioning = false;
    auctionState.isAIProcessing = false;
  }
  
  function closeAuctionModal() {
    auctionModal.value = false;
    resetAuctionState();
    endTurn();
  }

  const FUND_AMOUNTS = [100, 200, 400, 800];

  function handleFund() {
    const player = currentPlayer.value;
    if (player.isAI) {
      const availableAmounts = FUND_AMOUNTS.filter(amount => player.cash >= amount);
      if (availableAmounts.length > 0) {
        const roll = Math.random();
        let selectedAmount;
        if (roll < 0.3) {
          selectedAmount = availableAmounts[Math.floor(Math.random() * availableAmounts.length)];
        } else {
          selectedAmount = null;
        }
        if (selectedAmount) {
          donateToFund(selectedAmount);
        } else {
          message.value = `${player.name} 选择不向社会基金捐款`;
          endTurn();
        }
      } else {
        message.value = `${player.name} 现金不足，无法捐款`;
        endTurn();
      }
    } else {
      propertyModal.value = { type: 'fund' };
    }
  }

  function donateToFund(amount) {
    const player = currentPlayer.value;
    if (player.cash >= amount) {
      player.cash -= amount;
      triggerCashChange(-amount);
      if (!player.fundRebates) {
        player.fundRebates = [];
      }
      player.fundRebates.push({
        amount: amount,
        remainingTimes: 3
      });
      console.log('[DEBUG] donateToFund - fundRebates pushed:', player.fundRebates);
      refreshKey.value++;
      console.log('[DEBUG] donateToFund - refreshKey incremented:', refreshKey.value);
      message.value = `${player.name} 向社会基金捐款 ${amount} 金币，获得 3 次返利机会（每次返还 ${Math.floor(amount * 0.4)} 金币）！`;
    } else {
      message.value = `${player.name} 现金不足，无法捐款 ${amount} 金币`;
    }
    fundModal.value = false;
    endTurn();
  }

  function skipFundDonation() {
    const player = currentPlayer.value;
    message.value = `${player.name} 选择不向社会基金捐款`;
    fundModal.value = false;
    endTurn();
  }

  function buyProperty(tile) {
    const player = currentPlayer.value;
    const prop = properties[tile.id];
    
    if (player.bankrupt) {
      propertyModal.value = false;
      endTurn();
      return;
    }
    
    if (prop.owner !== null) {
      message.value = `${tile.name} 已经被购买了！`;
      propertyModal.value = false;
      endTurn();
      return;
    }
    
    if (player.cash >= tile.price) {
      player.cash -= tile.price;
      triggerCashChange(-tile.price);
      prop.owner = player.id;
      prop.investment = tile.price;
      message.value = `${player.name} 购买了 ${tile.name}！`;
    } else {
      message.value = `${player.name} 现金不足，无法购买！`;
    }
    propertyModal.value = false;
    endTurn();
  }

  function getFreeProperty(tileId) {
    const player = currentPlayer.value;
    const tile = mapTiles[tileId - 1];
    const prop = properties[tileId];
    
    prop.owner = player.id;
    prop.investment = 0;
    message.value = `${player.name} 免费获得了 ${tile.name}！`;
    propertyModal.value = false;
    endTurn();
  }

  function upgradeProperty(tile) {
    const prop = properties[tile.id];
    const player = currentPlayer.value;
    
    if (player.bankrupt) {
      upgradeModal.value = false;
      endTurn();
      return;
    }
    
    if (prop.level >= 3) {
      message.value = `${tile.name} 已经是最高等级了！`;
      upgradeModal.value = false;
      endTurn();
      return;
    }
    
    let cost = 0;
    switch (prop.level) {
      case 0: cost = Math.ceil(tile.price * 0.5); break;
      case 1: cost = Math.floor(tile.price * 1.0); break;
      case 2: cost = Math.floor(tile.price * 2.0); break;
    }
    
    if (player.cash >= cost) {
      player.cash -= cost;
      triggerCashChange(-cost);
      prop.level++;
      prop.investment += cost;
      message.value = `${player.name} 将 ${tile.name} 升级到 Lv.${prop.level}！`;
    } else {
      message.value = `现金不足，无法升级！`;
    }
    upgradeModal.value = false;
    endTurn();
  }

  function freeUpgradeProperty(tileId) {
    const prop = properties[tileId];
    const tile = mapTiles[tileId - 1];
    const player = currentPlayer.value;
    
    prop.level = Math.min(3, prop.level + 1);
    message.value = `${player.name} 将 ${tile.name} 免费升级到 Lv.${prop.level}！`;
    upgradeModal.value = false;
    endTurn();
  }

  function selectFreeProperty(tileId) {
    const prop = properties[tileId];
    const tile = mapTiles[tileId - 1];
    const player = players.value.find(p => p.id === freePropertyPlayerId.value);
    
    if (prop && prop.owner === null && player) {
      prop.owner = player.id;
      prop.investment = 0;
      message.value = `${player.name} 免费获得了 ${tile.name}！`;
      selectingPropertyForFree.value = false;
      freePropertyPlayerId.value = null;
      endTurn();
    }
  }

  function selectAIProperty(player) {
    const ownedIds = Object.entries(properties)
      .filter(([id, prop]) => prop.owner === player.id)
      .map(([id]) => parseInt(id));

    const ownedBlocks = new Set();
    for (const id of ownedIds) {
      const tile = mapTiles[id - 1];
      if (tile && tile.block) {
        ownedBlocks.add(tile.block);
      }
    }

    const unownedEntries = Object.entries(properties)
      .filter(([id, prop]) => prop.owner === null);

    let candidates = unownedEntries;
    if (ownedBlocks.size > 0) {
      const sameBlock = unownedEntries.filter(([id]) => {
        const tile = mapTiles[parseInt(id) - 1];
        return tile && tile.block && ownedBlocks.has(tile.block);
      });
      if (sameBlock.length > 0) {
        candidates = sameBlock;
      }
    }

    const candidatesWithTiles = candidates.map(([id]) => {
      const tile = mapTiles[parseInt(id) - 1];
      return { id: parseInt(id), tile };
    }).filter(x => x.tile !== undefined);

    if (candidatesWithTiles.length === 0) {
      message.value += `，没有空地可以选择`;
      endTurn();
      return;
    }

    const maxPrice = Math.max(...candidatesWithTiles.map(x => x.tile.price));
    const mostExpensive = candidatesWithTiles.filter(x => x.tile.price === maxPrice);

    const selected = mostExpensive[Math.floor(Math.random() * mostExpensive.length)];
    const prop = properties[selected.id];
    prop.owner = player.id;
    prop.investment = 0;
    message.value += `，${player.name} 免费获得了 ${selected.tile.name}！`;
    endTurn();
  }

  function mortgageProperty(propertyId) {
    const prop = properties[propertyId];
    if (!prop || prop.owner === null) return;

    const player = players.value.find(p => p.id === prop.owner);
    if (!player) return;

    const mortgageAmount = Math.floor(prop.investment * MORTGAGE_RATIO);
    player.cash += mortgageAmount;
    triggerCashChange(mortgageAmount);

    prop.owner = null;
    prop.level = 0;
    prop.investment = 0;

    message.value = `${player.name} 抵押了 ${mapTiles[propertyId - 1]?.name || '地产'}，获得 ${mortgageAmount} 金币！`;
  }

  function getPlayerPropertiesList(playerId) {
    const list = [];
    for (const [id, prop] of Object.entries(properties)) {
      if (prop.owner === playerId) {
        const tile = mapTiles.find(t => t.id === parseInt(id));
        if (tile) {
          list.push({
            id: parseInt(id),
            tile,
            prop,
            totalInvestment: getTotalPropertyInvestment(tile, prop),
            mortgageValue: Math.floor(getTotalPropertyInvestment(tile, prop) * MORTGAGE_RATIO)
          });
        }
      }
    }
    return list;
  }

  function testChanceCard(cardId) {
    const card = chanceCards.find(c => c.id === cardId);
    if (card) {
      selectedCard.value = { ...card, type: 'chance' };
    }
  }

  function testFateCard(cardId) {
    const card = fateCards.find(c => c.id === cardId);
    if (card) {
      selectedCard.value = { ...card, type: 'fate' };
    }
  }

  function confirmStationTeleport() {
    const player = currentPlayer.value;
    const isFree = propertyModal.value?.free;
    
    if (isFree) {
      player.buffs = player.buffs.filter(b => b.name !== 'freeStation');
      message.value += `使用车站月票免费传送！`;
    } else if (player.cash >= STATION_FEE) {
      player.cash -= STATION_FEE;
      triggerCashChange(-STATION_FEE);
      message.value += `支付 ${STATION_FEE} 金币传送！`;
    } else {
      message.value = `现金不足，无法传送！`;
      propertyModal.value = false;
      endTurn();
      return;
    }
    
    const tile = mapTiles[player.position];
    propertyModal.value = false;
    stationTeleport(tile);
  }

  function casinoBet(betType, betAmount, guess) {
    const player = currentPlayer.value;
    const actualResult = Math.floor(Math.random() * 9) + 1;
    const isOdd = actualResult % 2 === 1;
    
    let win = false;
    let netProfit = 0;
    
    if (betType === 'oddEven') {
      const guessOdd = guess === 'odd';
      win = guessOdd === isOdd;
      netProfit = win ? betAmount : -betAmount;
    } else if (betType === 'number') {
      win = parseInt(guess) === actualResult;
      netProfit = win ? betAmount * 5 : -betAmount;
    }
    
    player.cash += netProfit;
    triggerCashChange(netProfit);
    casinoModal.value = false;
    
    if (netProfit > 0) {
      message.value = `${player.name} 猜对了！掷出 ${actualResult}，赢得 ${netProfit} 金币！`;
    } else {
      message.value = `${player.name} 猜错了！掷出 ${actualResult}，损失 ${-netProfit} 金币`;
    }
    
    checkBankruptcyAndLiquidate(player);
    endTurn();
  }

  function endTurn() {
    console.log('[DEBUG] endTurn called, isEndingTurn:', isEndingTurn, 'gameOver:', gameOver.value, 'currentPlayerIndex:', currentPlayerIndex.value);
    
    if (isEndingTurn) {
      console.log('[DEBUG] endTurn returning early, isEndingTurn:', isEndingTurn);
      return;
    }
    
    if (gameOver.value) {
      console.log('[DEBUG] Game over detected in endTurn!');
      gamePhase.value = 'ended';
      if (winner.value) {
        message.value = `🎉 游戏结束！${winner.value.name} 获胜！`;
      }
      console.log('[DEBUG] endTurn finished (game over)');
      return;
    }
    
    isEndingTurn = true;
    
    propertyModal.value = false;
    upgradeModal.value = false;
    selectedCard.value = null;
    
    let nextIndex = currentPlayerIndex.value;
    console.log('[DEBUG] Looking for next player, starting from index:', nextIndex);
    
    do {
      nextIndex = (nextIndex + 1) % players.value.length;
      console.log('[DEBUG] Checking player index:', nextIndex, 'bankrupt:', players.value[nextIndex].bankrupt);
    } while (nextIndex !== currentPlayerIndex.value && players.value[nextIndex].bankrupt);
    
    console.log('[DEBUG] Found next player index:', nextIndex);
    
    const currentPlayerBeforeTurn = currentPlayer.value;
    console.log('[DEBUG] endTurn - Before buff processing, player:', currentPlayerBeforeTurn.name, 'buffs:', currentPlayerBeforeTurn.buffs);
    
    const singleUseBuffs = ['dicePlus', 'salaryBoost', 'salaryHalf', 'halfRent', 'freeRent', 'fixedMove', 'freeStation', 'bonusSalary'];
    console.log('[DEBUG] endTurn - singleUseBuffs:', singleUseBuffs);
    
    const filteredBuffs = currentPlayerBeforeTurn.buffs.filter(buff => {
      console.log('[DEBUG] endTurn - Checking buff:', buff.name, 'duration:', buff.duration, 'isSingleUse:', singleUseBuffs.includes(buff.name));
      if (buff.duration !== undefined && buff.duration !== null && !singleUseBuffs.includes(buff.name)) {
        buff.duration--;
        if (buff.duration <= 0) {
          return false;
        }
      }
      return true;
    });
    
    console.log('[DEBUG] endTurn - filteredBuffs:', filteredBuffs);
    
    currentPlayerBeforeTurn.buffs.length = 0;
    currentPlayerBeforeTurn.buffs.push(...filteredBuffs);
    
    console.log('[DEBUG] endTurn - After buff processing, player:', currentPlayerBeforeTurn.name, 'buffs:', currentPlayerBeforeTurn.buffs);
    
    currentPlayerIndex.value = nextIndex;
    
    console.log('[DEBUG] After setting currentPlayerIndex:', currentPlayerIndex.value, 'gameOver:', gameOver.value);
    
    if (gameOver.value) {
      console.log('[DEBUG] Game over detected!');
      gamePhase.value = 'ended';
      if (winner.value) {
        message.value = `🎉 游戏结束！${winner.value.name} 获胜！`;
      }
      isEndingTurn = false;
      console.log('[DEBUG] endTurn finished (game over)');
      return;
    }
    
    if (currentPlayerIndex.value === 0) {
      round.value++;
    }
    
    const newPlayer = currentPlayer.value;
    console.log('[DEBUG] New current player:', newPlayer.name, 'bankrupt:', newPlayer.bankrupt, 'inJail:', newPlayer.inJail, 'skipNextTurn:', newPlayer.skipNextTurn);
    
    if (newPlayer.bankruptWarning) {
      console.log('[DEBUG] Player has bankruptcy warning');
      const bankruptcyResult = processTurnEndForBankruptcy(newPlayer);
      if (bankruptcyResult.shouldStop) {
        // 如果需要停止（开始清算或破产），就不继续让玩家行动
        isEndingTurn = false;
        return;
      }
    }
    
    if (newPlayer.inJail) {
      console.log('[DEBUG] Player in jail, jailTurns:', newPlayer.jailTurns);
      newPlayer.jailTurns++;
      const maxJailTurns = newPlayer.jailType === 'bomb' ? 2 : 1;
      if (newPlayer.jailTurns > maxJailTurns) {
        newPlayer.inJail = false;
        newPlayer.jailTurns = 0;
        newPlayer.jailType = null; // 清除入狱类型标记
        message.value = `${newPlayer.name} 出狱了！第 ${round.value} 回合，${newPlayer.name} 的回合`;
      } else {
        const remainingTurns = maxJailTurns - newPlayer.jailTurns + 1;
        message.value = `${newPlayer.name} 在监狱中，剩余 ${remainingTurns} 回合，跳过回合！`;
        triggerSkipTurn(currentPlayerIndex.value);
        console.log('[DEBUG] Setting timeout to skip turn');
        setTimeout(() => {
          isEndingTurn = false;
          console.log('[DEBUG] Timeout callback, calling endTurn');
          endTurn();
        }, 1500);
        return;
      }
    } else if (newPlayer.skipNextTurn) {
      console.log('[DEBUG] Player needs to skip turn');
      newPlayer.skipNextTurn = false;
      message.value = `${newPlayer.name} 跳过回合！`;
      triggerSkipTurn(currentPlayerIndex.value);
      setTimeout(() => {
        isEndingTurn = false;
        endTurn();
      }, 1500);
      return;
    } else {
      message.value = `第 ${round.value} 回合，${currentPlayer.value.name} 的回合`;
    }
    
    diceResult.value = null;
    isRolling.value = false;
    isEndingTurn = false;
    console.log('[DEBUG] endTurn finished successfully, currentPlayerIndex:', currentPlayerIndex.value, 'isRolling:', isRolling.value, 'isEndingTurn:', isEndingTurn);
  }

  function adjustCurrentPlayerCash(amount) {
    if (currentPlayer.value && !currentPlayer.value.bankrupt) {
      currentPlayer.value.cash += amount;
      triggerCashChange(amount);
      message.value = `${currentPlayer.value.name} ${amount > 0 ? '获得' : '失去'} ${Math.abs(amount)} 金币，当前现金: ${currentPlayer.value.cash}`;
      if (amount < 0) {
        checkBankruptcyAndLiquidate(currentPlayer.value);
        // 如果玩家破产了，调用endTurn切换到下一个玩家
        if (currentPlayer.value.bankrupt) {
          console.log('[DEBUG] adjustCurrentPlayerCash - player bankrupt, calling endTurn');
          setTimeout(() => {
            endTurn();
          }, 500);
        }
      }
    }
  }

  function importSaveData(saveData) {
    const { players: savedPlayers, currentPlayerIndex: savedIndex, round: savedRound, 
            properties: savedProperties, bombs: savedBombs, chanceDeck: savedChanceDeck, 
            fateDeck: savedFateDeck, globalBuffs: savedGlobalBuffs, turnHistory: savedTurnHistory, 
            auctionState: savedAuctionState } = saveData.data;
    
    players.value = JSON.parse(JSON.stringify(savedPlayers));
    currentPlayerIndex.value = savedIndex;
    round.value = savedRound;
    
    Object.keys(savedProperties).forEach(id => {
      properties[id] = { ...savedProperties[id] };
    });
    
    Object.keys(savedBombs).forEach(key => {
      bombs[key] = { ...savedBombs[key] };
    });
    
    chanceDeck.value = [...savedChanceDeck];
    fateDeck.value = [...savedFateDeck];
    globalBuffs.value = JSON.parse(JSON.stringify(savedGlobalBuffs));
    turnHistory.value = JSON.parse(JSON.stringify(savedTurnHistory));
    
    Object.assign(auctionState, savedAuctionState);
    
    gamePhase.value = 'playing';
    message.value = `游戏已加载！第 ${round.value} 回合，${currentPlayer.value.name} 的回合`;
  }

  return {
    players,
    currentPlayer,
    currentPlayerIndex,
    gamePhase,
    gameOver,
    round,
    message,
    diceResult,
    isRolling,
    refreshKey,
    selectedCard,
    casinoModal,
    propertyModal,
    upgradeModal,
    mortgageModal,
    shopModal,
    itemUseModal,
    lotteryModal,
    lotteryResult,
    liquidationModal,
    liquidationState,
    placingBomb,
    bombs,
    propertyEffectTile,
    selectingPropertyForFree,
    properties,
    chanceDeck,
    fateDeck,
    globalBuffs,
    turnHistory,
    winner,
    auctionModal,
    auctionState,
    fundModal,
    initPlayers,
    addHistory,
    setOnCashChangeCallback,
    setOnSkipTurnCallback,
    setOnBuffActivationCallback,
    setOnAuctionSuccessCallback,
    rollDice,
    rollDiceWithValue,
    rollDiceWithRemoteValue,
    movePlayer,
    buyProperty,
    getFreeProperty,
    selectFreeProperty,
    upgradeProperty,
    freeUpgradeProperty,
    stationTeleport,
    confirmStationTeleport,
    casinoBet,
    payBail,
    closeCardModal,
    endTurn,
    mapTiles,
    triggerCashChange,
    buyShopItem,
    closeLotteryModal,
    useItem,
    confirmRemoteDice,
    startPlaceBomb,
    cancelPlaceBomb,
    placeBomb,
    placeBid,
    passAuction,
    closeAuctionModal,
    mortgageProperty,
    getPlayerPropertiesList,
    getTotalPropertyInvestment,
    testChanceCard,
    testFateCard,
    donateToFund,
    adjustCurrentPlayerCash,
    skipFundDonation,
    FUND_AMOUNTS,
    processTurnEndForBankruptcy,
    checkBankruptcyAndLiquidate,
    importSaveData
  };
}
