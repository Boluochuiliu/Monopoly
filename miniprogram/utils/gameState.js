const {
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
} = require('../data/gameConfig');

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

function createGameState() {
  const state = {
    players: [],
    currentPlayerIndex: 0,
    round: 1,
    message: '',
    diceResult: null,
    isRolling: false,
    refreshKey: 0,
    selectedCard: null,
    casinoModal: false,
    propertyModal: false,
    upgradeModal: false,
    selectingPropertyForFree: false,
    freePropertyPlayerId: null,
    gamePhase: 'playing',
    mortgageModal: false,
    shopModal: false,
    itemUseModal: false,
    lotteryModal: false,
    fundModal: false,
    lotteryResult: null,
    placingBomb: false,
    bombs: {},
    propertyEffectTile: {
      tileId: null,
      effectType: null
    },
    chanceDeck: shuffleArray([...chanceCards]),
    fateDeck: shuffleArray([...fateCards]),
    globalBuffs: [],
    turnHistory: [],
    auctionModal: false,
    auctionState: {
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
    },
    properties: {}
  };

  for (const tile of mapTiles) {
    if (tile.type === 'property') {
      state.properties[tile.id] = {
        owner: null,
        level: 0,
        investment: 0
      };
    }
  }

  let onCashChangeCallback = null;
  let onSkipTurnCallback = null;
  let onBuffActivationCallback = null;
  let onAuctionSuccessCallback = null;
  let onJailFreeRentCallback = null;
  let onFreeRentCallback = null;
  let isEndingTurn = false;

  function getCurrentPlayer() {
    return state.players[state.currentPlayerIndex];
  }

  function getActivePlayers() {
    return state.players.filter(p => !p.bankrupt);
  }

  function isGameOver() {
    return getActivePlayers().length <= 1;
  }

  function getWinner() {
    return isGameOver() && getActivePlayers()[0];
  }

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

  function setOnJailFreeRentCallback(callback) {
    onJailFreeRentCallback = callback;
  }

  function triggerJailFreeRent(playerIndex, ownerName) {
    if (onJailFreeRentCallback) {
      onJailFreeRentCallback(playerIndex, ownerName);
    }
  }

  function setOnFreeRentCallback(callback) {
    onFreeRentCallback = callback;
  }

  function triggerFreeRent(playerIndex) {
    if (onFreeRentCallback) {
      onFreeRentCallback(playerIndex);
    }
  }

  function triggerCashChange(amount, playerIndex = null) {
    if (onCashChangeCallback) {
      const idx = playerIndex !== null ? playerIndex : state.currentPlayerIndex;
      const player = state.players[idx];
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
      const player = state.players[playerIndex];
      const playerName = player?.name;
      onBuffActivationCallback(buffName, playerIndex, playerName);
    }
  }

  function initPlayers(humanCount = 2, aiCount = 2) {
    state.players = [];
    const totalPlayers = humanCount + aiCount;
    for (let i = 0; i < totalPlayers; i++) {
      const isAI = i >= humanCount;
      state.players.push({
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
        state.properties[tile.id] = {
          owner: null,
          level: 0,
          investment: 0
        };
      }
    }

    state.currentPlayerIndex = 0;
    state.round = 1;
    state.message = '游戏开始！玩家1先行动';
    state.diceResult = null;
    state.isRolling = false;
    state.selectedCard = null;
    state.propertyModal = false;
    state.upgradeModal = false;
    state.casinoModal = false;
    state.globalBuffs = [];
    state.turnHistory = [];
    state.chanceDeck = shuffleArray([...chanceCards]);
    state.fateDeck = shuffleArray([...fateCards]);
  }

  function addHistory(text, type = 'normal') {
    const entry = { text, type, player: getCurrentPlayer()?.name };
    state.turnHistory.push(entry);
    if (state.turnHistory.length > 50) {
      state.turnHistory.shift();
    }
  }

  function rollDice() {
    if (state.isRolling) {
      return;
    }

    const player = getCurrentPlayer();

    if (player.bankrupt) {
      endTurn();
      return;
    }

    if (player.skipNextTurn) {
      player.skipNextTurn = false;
      state.message = `${player.name} 跳过回合！`;
      triggerSkipTurn(state.currentPlayerIndex);
      endTurn();
      return;
    }

    state.isRolling = true;

    setTimeout(() => {
      try {
        let result = Math.floor(Math.random() * 9) + 1;

        const currentPlayerRef = getCurrentPlayer();

        const dicePlusBuff = currentPlayerRef.buffs.find(b => b.name === 'dicePlus');

        if (dicePlusBuff) {
          result += dicePlusBuff.value;
          currentPlayerRef.buffs = currentPlayerRef.buffs.filter(b => b.name !== 'dicePlus');
        }

        state.diceResult = result;

        setTimeout(() => {
          movePlayer(result);
        }, 500);
      } finally {
        state.isRolling = false;
      }
    }, 1000);
  }

  function rollDiceWithRemoteValue(value) {
    if (value < 1 || value > 9) return;

    const player = getCurrentPlayer();
    let result = value;

    const dicePlusBuff = player.buffs.find(b => b.name === 'dicePlus');
    if (dicePlusBuff) {
      result += dicePlusBuff.value;
      player.buffs = player.buffs.filter(b => b.name !== 'dicePlus');
    }

    state.diceResult = result;
    state.itemUseModal = false;

    setTimeout(() => {
      movePlayer(result);
    }, 500);
  }

  function rollDiceWithValue(value) {
    if (state.isRolling) return;
    if (value < 1 || value > 9) return;

    state.isRolling = true;

    try {
      const player = getCurrentPlayer();
      const dicePlusBuff = player.buffs.find(b => b.name === 'dicePlus');
      if (dicePlusBuff) {
        value += dicePlusBuff.value;
        player.buffs = player.buffs.filter(b => b.name !== 'dicePlus');
      }

      state.diceResult = value;

      setTimeout(() => {
        movePlayer(value);
      }, 500);
    } finally {
      state.isRolling = false;
    }
  }

  function movePlayer(steps) {
    const player = getCurrentPlayer();

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
      steps = fixedMoveBuff.steps;
      player.buffs = player.buffs.filter(b => b.name !== 'fixedMove');
    }

    if (player.inJail) {
      player.jailTurns++;
      const maxJailTurns = player.jailType === 'bomb' ? 2 : 1;
      const remainingTurns = maxJailTurns - player.jailTurns + 1;
      if (player.jailTurns <= maxJailTurns) {
        state.message = `${player.name} 在监狱中，剩余 ${remainingTurns} 回合`;
        triggerSkipTurn(state.currentPlayerIndex);
        endTurn();
        return;
      } else {
        player.inJail = false;
        player.jailTurns = 0;
        player.jailType = null;
        state.message = `${player.name} 出狱了！`;
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
        state.message = `${player.name} 移动到了 ${currentTile.name}`;

        setTimeout(moveOneStep, 300);
      } else {
        player.isMoving = false;

        const tile = mapTiles[player.position];
        if (!tile) {
          return;
        }

        const tileId = tile.id;
        if (state.bombs[tileId]) {
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
      player.buffs = player.buffs.filter(b => b.name === 'salaryBoost');
    }

    const salaryReductionBuff = state.globalBuffs.find(b => b.name === 'salaryReduction');
    if (salaryReductionBuff) {
      baseSalary = salaryReductionBuff.value;
      salaryReductionBuff.duration--;
      if (salaryReductionBuff.duration <= 0) {
        state.globalBuffs = state.globalBuffs.filter(b => b.name !== 'salaryReduction');
      }
    }

    const salaryHalf = player.buffs.find(b => b.name === 'salaryHalf');
    if (salaryHalf) {
      baseSalary = Math.floor(baseSalary / 2);
      player.buffs = player.buffs.filter(b => b.name === 'salaryHalf');
    }

    let extraSalaryAmount = 0;

    const bonusSalary = player.buffs.find(b => b.name === 'bonusSalary');
    if (bonusSalary) {
      extraSalaryAmount += bonusSalary.value;
      player.buffs = player.buffs.filter(b => b.name === 'bonusSalary');
    }

    const extraSalary = player.buffs.find(b => b.name === 'extraSalary');
    if (extraSalary && extraSalary.remainingTimes > 0) {
      extraSalaryAmount += extraSalary.value;
      extraSalary.remainingTimes--;
      if (extraSalary.remainingTimes <= 0) {
        player.buffs = player.buffs.filter(b => b.name !== 'extraSalary');
      }
    }

    const salaryAddBuff = state.globalBuffs.find(b => b.name === 'salaryAdd');
    if (salaryAddBuff) {
      extraSalaryAmount += salaryAddBuff.value;
      salaryAddBuff.duration--;
      if (salaryAddBuff.duration <= 0) {
        state.globalBuffs = state.globalBuffs.filter(b => b.name !== 'salaryAdd');
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
    state.message += salaryMessage;

    if (player.fundRebates && player.fundRebates.length > 0) {
      for (let i = player.fundRebates.length - 1; i >= 0; i--) {
        const rebate = player.fundRebates[i];
        const rebateAmount = Math.floor(rebate.amount * 0.4);
        player.cash += rebateAmount;
        triggerCashChange(rebateAmount);
        state.message += `，获得基金返利 ${rebateAmount} 金币！`;
        rebate.remainingTimes--;
        if (rebate.remainingTimes <= 0) {
          player.fundRebates.splice(i, 1);
        }
      }
      state.refreshKey++;
    }
  }

  function processTile(tile) {
    const player = getCurrentPlayer();

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
        if (getCurrentPlayer().isAI) {
          const betAmount = Math.floor(getCurrentPlayer().cash * 0.1);
          const guess = Math.random() > 0.5 ? 'odd' : 'even';
          casinoBet(betAmount, 'oddEven', guess);
        } else {
          state.casinoModal = true;
        }
        break;

      case 'shop':
        handleShop();
        break;

      case 'auction':
        handleAuction();
        break;

      case 'park':
        state.message = `${player.name} 在公园休息`;
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
    const prop = state.properties[tile.id];
    const player = getCurrentPlayer();

    if (prop.owner === null) {
      if (player.isAI) {
        if (player.cash >= tile.price) {
          player.cash -= tile.price;
          triggerCashChange(-tile.price);
          prop.owner = player.id;
          prop.investment = tile.price;
          state.message += `，AI购买了 ${tile.name}！`;
          endTurn();
        } else {
          state.message += `，AI现金不足，无法购买`;
          endTurn();
        }
      } else {
        if (player.cash >= tile.price) {
          state.message += `，是否购买？（${tile.price}金币）`;
          state.propertyModal = { tile, prop };
        } else {
          state.message += `，现金不足，无法购买`;
          endTurn();
        }
      }
    } else if (prop.owner !== player.id) {
      const owner = state.players[prop.owner];
      if (owner.inJail) {
        state.message += `，${owner.name} 在监狱中，免收过路费`;
        triggerJailFreeRent(prop.owner, owner.name);
        endTurn();
      } else {
        calculateRent(tile, prop, owner);
      }
    } else {
      state.message += `，这是你的地产`;
      if (prop.level < 3) {
        if (player.isAI) {
          const upgradeCost = getUpgradeCost(tile, prop);
          if (player.cash >= upgradeCost) {
            upgradeProperty(tile);
          } else {
            state.message += `，现金不足，无法升级`;
            endTurn();
          }
        } else {
          const upgradeCost = getUpgradeCost(tile, prop);
          if (player.cash >= upgradeCost) {
            state.upgradeModal = { tile, prop };
          } else {
            state.message += `，现金不足，无法升级`;
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
    const player = getCurrentPlayer();
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
      if (state.properties[tid]?.owner === prop.owner) {
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
      state.message += `，🎉 市政厅祝福生效！免交过路费！`;
      addHistory(`${player.name} 使用了市政厅祝福免交过路费`, 'special');
      triggerBuffActivation('hallProtection', state.currentPlayerIndex);
      endTurn();
      return;
    }

    const freeRent = player.buffs.find(b => b.name === 'freeRent');
    if (freeRent) {
      state.message += `，使用免租金牌免付过路费！`;
      player.buffs = player.buffs.filter(b => b.name !== 'freeRent');
      triggerFreeRent(state.currentPlayerIndex);
      endTurn();
      return;
    }

    const halfRent = player.buffs.find(b => b.name === 'halfRent');
    if (halfRent) {
      finalRent = Math.floor(finalRent / 2);
      state.message += `，使用马路天使过路费减半！`;
      player.buffs = player.buffs.filter(b => b.name !== 'halfRent');
    }

    if (player.mayorCards > 0) {
      for (let i = 0; i < player.mayorCards; i++) {
        player.mayorCards--;
        state.message += `，使用市长许可免付过路费！`;
        endTurn();
        return;
      }
    }

    state.message += `，需支付 ${finalRent} 过路费`;
    payRent(player, owner, finalRent);
  }

  function payRent(payer, receiver, amount) {
    const receiverIndex = state.players.findIndex(p => p.id === receiver.id);

    payer.cash -= amount;
    triggerCashChange(-amount);
    receiver.cash += amount;
    triggerCashChange(amount, receiverIndex);
    state.message += `，${payer.name} 支付 ${amount} 金币给 ${receiver.name}`;

    const bankruptResult = checkBankruptcyAndLiquidate(payer);
    endTurn();
  }

  function drawChanceCard() {
    if (state.chanceDeck.length === 0) {
      state.chanceDeck = shuffleArray([...chanceCards]);
    }
    const card = state.chanceDeck.pop();
    state.selectedCard = { ...card, type: 'chance' };

    if (getCurrentPlayer().isAI) {
      setTimeout(() => {
        closeCardModal();
      }, 2000);
    }
  }

  function drawFateCard() {
    if (state.fateDeck.length === 0) {
      state.fateDeck = shuffleArray([...fateCards]);
    }
    const card = state.fateDeck.pop();
    state.selectedCard = { ...card, type: 'fate' };

    if (getCurrentPlayer().isAI) {
      setTimeout(() => {
        closeCardModal();
      }, 2000);
    }
  }

  function closeCardModal() {
    if (!state.selectedCard) return;

    const card = state.selectedCard;
    state.selectedCard = null;

    applyCardEffect(card);
  }

  function applyCardEffect(card) {
    const player = getCurrentPlayer();

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
        state.message = `${player.name} 传送到了 ${tile.name}`;
        setTimeout(() => processTile(tile), 300);
        break;

      case 'buff':
        const buffToAdd = { ...card.action };
        player.buffs.push(buffToAdd);
        state.message += `，获得${getBuffName(buffToAdd.name)}效果！`;
        endTurn();
        break;

      case 'debuff':
        player.buffs.push({ ...card.action });
        endTurn();
        break;

      case 'globalBuff':
        state.globalBuffs.push({ ...card.action });
        endTurn();
        break;

      case 'globalDebuff':
        state.globalBuffs.push({ ...card.action });
        endTurn();
        break;

      case 'globalCash':
        const globalCashAmount = card.action.amount;
        state.players.forEach((p, index) => {
          if (!p.bankrupt) {
            p.cash += globalCashAmount;
            triggerCashChange(globalCashAmount, index);
          }
        });
        state.message = `🎉 全民分红！所有玩家各获得 ${globalCashAmount} 金币！`;
        endTurn();
        break;

      case 'upgradeProperty':
        const upgradeAmount = card.action.amount;
        const upgradableProps = Object.entries(state.properties)
          .filter(([id, prop]) => prop.owner === player.id && prop.level < 3);

        if (upgradableProps.length === 0) {
          state.message += `，没有可升级的地产`;
          endTurn();
        } else if (upgradableProps.length === 1) {
          const [id, prop] = upgradableProps[0];
          const targetLevel = Math.min(prop.level + upgradeAmount, 3);
          prop.level = targetLevel;
          state.message += `，${mapTiles[parseInt(id) - 1]?.name} 免费升级到 Lv.${targetLevel}`;
          endTurn();
        } else {
          state.upgradeModal = { upgradeAmount };
        }
        break;

      case 'randomUpgradeProperty':
        const randomUpgradeAmount = card.action.amount;
        const randomUpgradableProps = Object.entries(state.properties)
          .filter(([id, prop]) => prop.owner === player.id && prop.level < 3);

        if (randomUpgradableProps.length === 0) {
          state.message += `，没有可升级的地产`;
          endTurn();
        } else {
          const randomIndex = Math.floor(Math.random() * randomUpgradableProps.length);
          const [id, prop] = randomUpgradableProps[randomIndex];
          state.propertyEffectTile.tileId = parseInt(id);
          state.propertyEffectTile.effectType = 'upgrade';
          const targetLevel = Math.min(prop.level + randomUpgradeAmount, 3);
          prop.level = targetLevel;
          state.message += `，${mapTiles[parseInt(id) - 1]?.name} 免费升级到 Lv.${targetLevel}`;
          setTimeout(() => {
            state.propertyEffectTile.tileId = null;
            state.propertyEffectTile.effectType = null;
          }, 2000);
          endTurn();
        }
        break;

      case 'downgradeProperty':
        const playerProps = Object.entries(state.properties)
          .filter(([id, prop]) => prop.owner === player.id && prop.level > 0)
          .sort((a, b) => b[1].level - a[1].level);
        if (playerProps.length > 0) {
          const [id, prop] = playerProps[0];
          state.propertyEffectTile.tileId = parseInt(id);
          state.propertyEffectTile.effectType = 'fire';
          prop.level--;
          state.message += `，${mapTiles[parseInt(id) - 1]?.name} 降一级`;
          setTimeout(() => {
            state.propertyEffectTile.tileId = null;
            state.propertyEffectTile.effectType = null;
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
        state.message += `，立即进入监狱！`;
        endTurn();
        break;

      case 'naturalDisaster':
        const disasterProps = Object.entries(state.properties)
          .filter(([id, prop]) => prop.owner === player.id && prop.level > 0)
          .sort((a, b) => b[1].level - a[1].level);
        const cashPenalty = card.action.cashPenalty || 200;
        if (disasterProps.length > 0) {
          const [id, prop] = disasterProps[0];
          state.propertyEffectTile.tileId = parseInt(id);
          state.propertyEffectTile.effectType = 'disaster';
          prop.level--;
          state.message += `，${mapTiles[parseInt(id) - 1]?.name} 降一级`;
          setTimeout(() => {
            state.propertyEffectTile.tileId = null;
            state.propertyEffectTile.effectType = null;
          }, 2000);
        } else {
          player.cash -= cashPenalty;
          triggerCashChange(-cashPenalty);
          state.message += `，失去 ${cashPenalty} 金币`;
          checkBankruptcyAndLiquidate(player);
        }
        endTurn();
        break;

      case 'freeProperty':
        const unownedProps = Object.fromEntries(
          Object.entries(state.properties).filter(([id, prop]) => prop.owner === null)
        );
        if (Object.keys(unownedProps).length > 0) {
          if (player.isAI) {
            selectAIProperty(player);
          } else {
            state.freePropertyPlayerId = player.id;
            state.selectingPropertyForFree = true;
            state.message += `，请在地图上选择一块空地`;
          }
        } else {
          state.message += `，没有空地可以选择`;
          endTurn();
        }
        break;

      case 'randomMove':
        const otherPlayers = state.players.filter(p => !p.bankrupt && p.id !== player.id);
        if (otherPlayers.length > 0) {
          const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          targetPlayer.buffs.push({
            name: 'fixedMove',
            duration: 1,
            steps: card.action.steps
          });
          state.message = `${player.name} 使用了固定行走，${targetPlayer.name} 下次移动固定行走 ${card.action.steps} 步！`;
        } else {
          state.message = `${player.name} 没有其他玩家可以影响`;
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
    player.bankrupt = true;
    player.bankruptWarning = false;
    player.consecutiveNegativeRounds = 0;
    state.message += `，${player.name} 破产了！`;
    for (const [id, prop] of Object.entries(state.properties)) {
      if (prop.owner === player.id) {
        prop.owner = null;
        prop.level = 0;
        prop.investment = 0;
      }
    }
  }

  function calculatePlayerAssets(player) {
    let totalAssets = player.cash;
    for (const [id, prop] of Object.entries(state.properties)) {
      if (prop.owner === player.id) {
        totalAssets += prop.investment;
      }
    }
    return totalAssets;
  }

  function getPlayerProperties(playerId) {
    const props = [];
    for (const [id, prop] of Object.entries(state.properties)) {
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

  function checkBankruptcyAndLiquidate(player) {
    const cash = player.cash;

    if (cash < -500) {
      player.consecutiveNegativeRounds++;

      if (!player.bankruptWarning && player.liquidationCountdown === undefined) {
        player.bankruptWarning = true;
        player.liquidationCountdown = 2;
        state.message = `${player.name} 现金为 ${cash}，低于 -500，破产预警！`;
        return { handled: true };
      }
    } else {
      if (player.bankruptWarning) {
        player.bankruptWarning = false;
        player.liquidationCountdown = undefined;
        state.message = `${player.name} 现金恢复到 ${cash}，解除破产预警！`;
      }
      player.consecutiveNegativeRounds = 0;
    }
    return { handled: false };
  }

  function processTurnEndForBankruptcy(player) {
    if (!player.bankruptWarning || player.bankrupt) {
      return { shouldStop: false };
    }

    const cash = player.cash;

    if (cash >= -500) {
      player.bankruptWarning = false;
      player.liquidationCountdown = undefined;
      player.consecutiveNegativeRounds = 0;
      state.message = `${player.name} 现金恢复到 ${cash}，解除破产预警！`;
      return { shouldStop: false };
    }

    if (player.consecutiveNegativeRounds >= 2) {
      state.message = `${player.name} 连续两回合现金低于 -500，强制破产！`;
      handleBankrupt(player);
      return { shouldStop: true };
    }

    player.liquidationCountdown--;

    if (player.liquidationCountdown <= 0) {
      state.message = `${player.name} 清算倒计时结束，强制破产！`;
      handleBankrupt(player);
      return { shouldStop: true };
    } else {
      state.message = `${player.name} 现金为 ${cash}，低于 -500，破产预警，还剩 ${player.liquidationCountdown} 轮！`;
      return { shouldStop: false };
    }
  }

  function handleStation(tile) {
    const player = getCurrentPlayer();
    const hasFreeStation = player.buffs?.some(b => b.name === 'freeStation');

    if (player.isAI) {
      if (hasFreeStation || (player.cash >= STATION_FEE && Math.random() > 0.5)) {
        if (hasFreeStation) {
          player.buffs = player.buffs.filter(b => b.name !== 'freeStation');
          state.message += `，AI使用车站月票免费传送！`;
        } else {
          player.cash -= STATION_FEE;
          triggerCashChange(-STATION_FEE);
          state.message += `，AI支付 ${STATION_FEE} 金币传送！`;
        }
        stationTeleport(tile);
      } else {
        state.message += `，AI选择不传送`;
        endTurn();
      }
    } else {
      if (hasFreeStation) {
        state.message += `，是否使用车站月票免费传送到另一个车站？`;
        state.propertyModal = { tile, type: 'station', free: true };
      } else if (player.cash >= STATION_FEE) {
        state.message += `，是否支付 ${STATION_FEE} 金币传送到另一个车站？`;
        state.propertyModal = { tile, type: 'station' };
      } else {
        state.message += `，现金不足，无法传送`;
        endTurn();
      }
    }
  }

  function stationTeleport(tile) {
    const targetStation = tile.id === 6 ? 31 : 6;
    const player = getCurrentPlayer();
    const originalPosition = player.position;

    player.position = targetStation - 1;
    const targetTile = mapTiles[player.position];

    if (tile.id === 31 && targetStation === 6) {
      state.message += `，传送到 ${targetTile.name}，途经起点！`;
      collectSalary(player);
    } else {
      state.message += `，传送到 ${targetTile.name}！`;
    }

    endTurn();
  }

  function handleJail() {
    const player = getCurrentPlayer();

    if (player.isAI) {
      player.inJail = true;
      player.jailTurns = 0;
      state.message = `${player.name} 进入监狱！本回合暂停移动`;
      endTurn();
    } else {
      player.inJail = true;
      player.jailTurns = 0;
      state.message = `${player.name} 进入监狱！`;
      if (player.cash >= JAIL_BAIL) {
        state.propertyModal = { type: 'jail', playerId: player.id };
      } else {
        state.message += `，现金不足，无法缴纳保释金`;
        endTurn();
      }
    }
  }

  function payBail() {
    const player = getCurrentPlayer();
    if (player.cash >= JAIL_BAIL) {
      player.cash -= JAIL_BAIL;
      triggerCashChange(-JAIL_BAIL);
      player.inJail = false;
      player.jailTurns = 0;
      state.message = `${player.name} 缴纳了 ${JAIL_BAIL} 金币保释金，立即出狱！`;
      state.propertyModal = false;
      endTurn();
    } else {
      state.message = `${player.name} 现金不足，无法缴纳保释金！`;
      state.propertyModal = false;
      endTurn();
    }
  }

  function handleHall() {
    const player = getCurrentPlayer();
    const existingBuff = player.buffs.find(b => b.name === 'hallProtection');
    if (existingBuff) {
      existingBuff.duration = 4;
      state.message = `${player.name}在市政厅刷新了免过路费效果，持续时间重置为4回合！`;
    } else {
      player.buffs.push({
        name: 'hallProtection',
        duration: 4,
        used: false
      });
      state.message = `${player.name}获得了市政厅的祝福，4回合内首次进入他人地产免交过路费！`;
    }
    endTurn();
  }

  function handleShop() {
    const player = getCurrentPlayer();
    state.message = `${player.name} 来到了道具店`;
    if (player.isAI) {
      const items = Object.entries(SHOP_ITEMS).filter(([key, item]) => player.cash >= item.price);
      if (items.length > 0) {
        const [selectedKey, selectedItem] = items[Math.floor(Math.random() * items.length)];
        player.cash -= selectedItem.price;
        triggerCashChange(-selectedItem.price);
        state.message += `，购买了 ${selectedItem.name}！`;

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
        state.shopModal = true;
      } else {
        state.message += `，现金不足，无法购买任何物品`;
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
      state.message += ` 彩票中奖获得 ${prize} 金币！`;
    } else {
      state.message += ` 彩票未中奖`;
    }
  }

  function buyShopItem(itemId) {
    const player = getCurrentPlayer();
    const item = SHOP_ITEMS[itemId];

    if (player.cash >= item.price) {
      if (itemId === 'lottery') {
        state.shopModal = false;
        drawLottery(item.price);
      } else {
        player.cash -= item.price;
        triggerCashChange(-item.price);
        state.message = `${player.name} 购买了 ${item.name}！`;
        player.inventory[itemId]++;
        state.shopModal = false;
        endTurn();
      }
    }
  }

  function drawLottery(price) {
    const player = getCurrentPlayer();
    const result = [];
    for (let i = 0; i < 6; i++) {
      result.push(LOTTERY_PATTERNS[Math.floor(Math.random() * LOTTERY_PATTERNS.length)]);
    }

    const fuCount = result.filter(pattern => pattern === '福').length;
    const prize = LOTTERY_PRIZES[fuCount] || 0;

    state.lotteryResult = {
      patterns: result,
      prize,
      price
    };
    state.lotteryModal = true;
  }

  function closeLotteryModal() {
    const player = getCurrentPlayer();
    const prize = state.lotteryResult?.prize || 0;
    const price = state.lotteryResult?.price || 0;

    player.cash -= price;
    triggerCashChange(-price);

    if (prize > 0) {
      player.cash += prize;
      triggerCashChange(prize);
      state.message += `${player.name} 购买彩票花费 ${price} 金币，中奖获得 ${prize} 金币！`;
    } else {
      state.message += `${player.name} 购买彩票花费 ${price} 金币，未中奖！`;
    }

    state.lotteryModal = false;
    state.lotteryResult = null;
    endTurn();
  }

  function useItem(itemId) {
    const player = getCurrentPlayer();

    if (player.inventory[itemId] <= 0) return;

    switch (itemId) {
      case 'remoteDice':
        state.itemUseModal = { type: 'remoteDice' };
        break;
      case 'bomb':
        state.itemUseModal = { type: 'bomb' };
        break;
    }
  }

  function confirmRemoteDice(number) {
    const player = getCurrentPlayer();
    if (!player) {
      return;
    }
    player.inventory.remoteDice--;
    state.diceResult = number;
    state.itemUseModal = false;
    state.message = `${player.name} 使用遥控骰子，前进 ${number} 步！`;
    setTimeout(() => {
      movePlayer(number);
    }, 500);
  }

  function startPlaceBomb() {
    const player = getCurrentPlayer();
    player.inventory.bomb--;
    state.placingBomb = true;
    state.itemUseModal = false;
    state.message = `${player.name} 请点击地图上的格子安放炸弹（点击取消按钮可取消放置）`;
  }

  function cancelPlaceBomb() {
    const player = getCurrentPlayer();
    player.inventory.bomb++;
    state.placingBomb = false;
    state.message = `${player.name} 取消安放炸弹`;
  }

  function placeBomb(tileId) {
    if (state.bombs[tileId]) {
      state.message = '该格子已有炸弹！';
      return;
    }

    state.bombs[tileId] = {
      owner: getCurrentPlayer().id,
      placedAt: Date.now()
    };
    state.placingBomb = false;
    state.message = `炸弹已安放在 ${mapTiles[tileId - 1]?.name}！`;
  }

  function triggerBomb(player, tileId) {
    const bomb = state.bombs[tileId];
    if (!bomb) return;

    delete state.bombs[tileId];

    const tile = mapTiles[tileId - 1];
    if (tile && tile.type === TILE_TYPES.PROPERTY) {
      const property = state.properties[tileId];
      if (property && property.owner && property.owner !== player.id) {
        const owner = state.players.find(p => p.id === property.owner);
        if (owner) {
          const rent = calculateRent(tile, property, owner);

          if (player.cash >= rent) {
            player.cash -= rent;
            owner.cash += rent;
            triggerCashChange(-rent);
            state.message = `${player.name} 踩到炸弹！支付 ${rent} 金币租金给 ${owner.name}，然后被送入监狱！`;
          } else {
            state.message = `${player.name} 踩到炸弹！现金不足支付租金，直接被送入监狱！`;
          }
        } else {
          state.message = `${player.name} 踩到炸弹！被送入监狱，暂停2回合！`;
        }
      } else {
        state.message = `${player.name} 踩到炸弹！被送入监狱，暂停2回合！`;
      }
    } else {
      state.message = `${player.name} 踩到炸弹！被送入监狱，暂停2回合！`;
    }

    player.position = 12;
    player.inJail = true;
    player.jailTurns = 0;
    player.jailType = 'bomb';
    endTurn();
  }

  function handleAuction() {
    const player = getCurrentPlayer();
    state.message = `${player.name} 来到了拍卖行`;

    const unownedProperties = Object.entries(state.properties)
      .filter(([id, prop]) => prop.owner === null)
      .map(([id]) => parseInt(id));

    if (unownedProperties.length === 0) {
      state.message += `，没有可拍卖的地产`;
      endTurn();
      return;
    }

    const randomPropId = unownedProperties[Math.floor(Math.random() * unownedProperties.length)];
    const tile = mapTiles.find(t => t.id === randomPropId);

    if (!tile) {
      state.message += `，找不到地产信息`;
      endTurn();
      return;
    }

    startAuction(tile);
  }

  function startAuction(tile) {
    const startingPrice = Math.ceil(tile.price * 0.5);
    const arrivingPlayer = getCurrentPlayer();

    let playerOrder = [...getActivePlayers()];
    const arrivingIndex = playerOrder.findIndex(p => p.id === arrivingPlayer.id);
    if (arrivingIndex !== -1 && arrivingIndex !== 0) {
      const arriving = playerOrder.splice(arrivingIndex, 1)[0];
      playerOrder.unshift(arriving);
    }

    state.auctionState.property = tile;
    state.auctionState.startingPrice = startingPrice;
    state.auctionState.currentBid = startingPrice;
    state.auctionState.currentBidder = null;
    state.auctionState.bids = [];
    state.auctionState.playerOrder = playerOrder;
    state.auctionState.currentPlayerIndex = 0;
    state.auctionState.passedPlayers = [];
    state.auctionState.biddedPlayers = [];
    state.auctionState.isAuctioning = true;

    state.message = `🎪 拍卖开始！${tile.name}，起拍价 ${startingPrice} 金币`;
    state.auctionModal = true;

    processNextAuctionPlayer();
  }

  function processNextAuctionPlayer() {
    const allPlayers = state.auctionState.playerOrder.filter(p => !p.bankrupt);
    const allPassed = state.auctionState.passedPlayers.length >= allPlayers.length;

    if (allPassed) {
      if (state.auctionState.currentBidder !== null) {
        const winner = state.players.find(p => p.id === state.auctionState.currentBidder);
        state.message = `🎉 ${winner.name} 以 ${state.auctionState.currentBid} 金币拍得 ${state.auctionState.property.name}！`;
      } else {
        state.message = `⏰ ${state.auctionState.property.name} 流拍，无人出价`;
      }
      endAuction();
      return;
    }

    const currentAuctionPlayer = state.auctionState.playerOrder[state.auctionState.currentPlayerIndex];

    if (!currentAuctionPlayer || currentAuctionPlayer.bankrupt) {
      nextAuctionPlayer();
      return;
    }

    if (state.auctionState.passedPlayers.includes(currentAuctionPlayer.id)) {
      nextAuctionPlayer();
      return;
    }

    const minBid = state.auctionState.currentBidder === null ? state.auctionState.startingPrice : state.auctionState.currentBid + 20;
    if (currentAuctionPlayer.cash < minBid) {
      state.message = `${currentAuctionPlayer.name} 资金不足，跳过竞价`;
      state.auctionState.passedPlayers.push(currentAuctionPlayer.id);

      const allPlayers = state.auctionState.playerOrder.filter(p => !p.bankrupt);
      const allPassed = state.auctionState.passedPlayers.length >= allPlayers.length;

      if (allPassed) {
        if (state.auctionState.currentBidder !== null) {
          const winner = state.players.find(p => p.id === state.auctionState.currentBidder);
          state.message = `🎉 ${winner.name} 以 ${state.auctionState.currentBid} 金币拍得 ${state.auctionState.property.name}！`;
        } else {
          state.message = `⏰ ${state.auctionState.property.name} 流拍，无人出价`;
        }
        endAuction();
        return;
      }

      if (state.auctionState.currentBidder !== null) {
        const nonBidderPlayers = allPlayers.filter(p => p.id !== state.auctionState.currentBidder);
        const allNonBiddersPassed = nonBidderPlayers.every(p => state.auctionState.passedPlayers.includes(p.id));

        if (allNonBiddersPassed) {
          const winner = state.players.find(p => p.id === state.auctionState.currentBidder);
          state.message = `🎉 ${winner.name} 以 ${state.auctionState.currentBid} 金币拍得 ${state.auctionState.property.name}！`;
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
    const currentBid = state.auctionState.currentBid;

    const prop = state.properties[state.auctionState.property.id];

    const tilesInBlock = mapTiles.filter(t => t.block === state.auctionState.property.block);
    const totalTilesInBlock = tilesInBlock.length;

    const ownedIds = Object.entries(state.properties)
      .filter(([id, p]) => p.owner === player.id)
      .map(([id]) => parseInt(id));
    const ownedBlocks = new Set();
    const ownedTilesInBlock = [];
    for (const id of ownedIds) {
      const t = mapTiles.find(t => t.id === id);
      if (t && t.block) {
        ownedBlocks.add(t.block);
        if (t.block === state.auctionState.property.block) {
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

    const mentalPrice = Math.floor(state.auctionState.property.price * valueFactor);

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

    const totalAssets = state.players.reduce((sum, p) => sum + (p.bankrupt ? 0 : p.cash), 0);
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

    if (amount < state.auctionState.currentBid + 20 && state.auctionState.currentBidder !== null) {
      state.message = `${player.name} 的出价无效，每次加价不得少于 20 金币！`;
      return;
    }

    if (amount < state.auctionState.startingPrice) {
      state.message = `${player.name} 的出价低于起拍价！`;
      return;
    }

    if (amount > player.cash) {
      state.message = `${player.name} 现金不足！`;
      return;
    }

    state.auctionState.currentBid = amount;
    state.auctionState.currentBidder = player.id;
    state.auctionState.bids.push({ playerId: player.id, amount });

    if (!state.auctionState.biddedPlayers.includes(player.id)) {
      state.auctionState.biddedPlayers.push(player.id);
    }

    state.auctionState.passedPlayers = [];

    state.message = `${player.name} 出价 ${amount} 金币！`;

    const playerIndex = state.auctionState.playerOrder.findIndex(p => p.id === player.id);
    state.auctionState.currentPlayerIndex = playerIndex;

    advanceToNextPlayer();
  }

  function advanceToNextPlayer() {
    const allPlayers = state.auctionState.playerOrder.filter(p => !p.bankrupt);
    const allPassed = state.auctionState.passedPlayers.length >= allPlayers.length;

    if (allPassed) {
      if (state.auctionState.currentBidder !== null) {
        const winner = state.players.find(p => p.id === state.auctionState.currentBidder);
        state.message = `🎉 ${winner.name} 以 ${state.auctionState.currentBid} 金币拍得 ${state.auctionState.property.name}！`;
      } else {
        state.message = `⏰ ${state.auctionState.property.name} 流拍，无人出价`;
      }
      endAuction();
      return;
    }

    nextAuctionPlayer();
  }

  function processAIPlayersBids() {
    state.auctionState.isAIProcessing = true;

    const aiPlayers = state.auctionState.playerOrder.filter(p => p.isAI && !p.bankrupt && !state.auctionState.passedPlayers.includes(p.id));

    if (aiPlayers.length === 0) {
      state.auctionState.isAIProcessing = false;
      checkAuctionEnd();
      return;
    }

    let delay = 0;
    aiPlayers.forEach((aiPlayer, index) => {
      setTimeout(() => {
        if (!state.auctionState.isAuctioning) {
          state.auctionState.isAIProcessing = false;
          return;
        }

        aiMakeBid(aiPlayer);

        if (index === aiPlayers.length - 1) {
          setTimeout(() => {
            state.auctionState.isAIProcessing = false;
            checkAuctionEnd();
          }, 500);
        }
      }, delay);
      delay += 800;
    });
  }

  function checkAuctionEnd() {
    const activePlayers = state.auctionState.playerOrder.filter(p => !p.bankrupt && !state.auctionState.passedPlayers.includes(p.id));

    if (state.auctionState.currentBidder === null) {
      const allPlayers = state.auctionState.playerOrder.filter(p => !p.bankrupt);
      if (state.auctionState.passedPlayers.length >= allPlayers.length) {
        state.message = `⏰ ${state.auctionState.property.name} 流拍，无人出价`;
        endAuction();
      }
      return;
    }

    const allPlayers = state.auctionState.playerOrder.filter(p => !p.bankrupt);
    const allPassed = state.auctionState.passedPlayers.length >= allPlayers.length;

    if (allPassed) {
      const winner = state.players.find(p => p.id === state.auctionState.currentBidder);
      state.message = `🎉 ${winner.name} 以 ${state.auctionState.currentBid} 金币拍得 ${state.auctionState.property.name}！`;
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

    if (!state.auctionState.passedPlayers.includes(player.id)) {
      state.auctionState.passedPlayers.push(player.id);
      state.message = `${player.name} 放弃出价`;
    }

    const allPlayers = state.auctionState.playerOrder.filter(p => !p.bankrupt);
    const allPassed = state.auctionState.passedPlayers.length >= allPlayers.length;

    if (state.auctionState.currentBidder !== null) {
      const nonBidderPlayers = allPlayers.filter(p => p.id !== state.auctionState.currentBidder);
      const allNonBiddersPassed = nonBidderPlayers.every(p => state.auctionState.passedPlayers.includes(p.id));

      if (allNonBiddersPassed) {
        const winner = state.players.find(p => p.id === state.auctionState.currentBidder);
        state.message = `🎉 ${winner.name} 以 ${state.auctionState.currentBid} 金币拍得 ${state.auctionState.property.name}！`;
        endAuction();
        return;
      }
    }

    if (allPassed) {
      if (state.auctionState.currentBidder !== null) {
        const winner = state.players.find(p => p.id === state.auctionState.currentBidder);
        state.message = `🎉 ${winner.name} 以 ${state.auctionState.currentBid} 金币拍得 ${state.auctionState.property.name}！`;
      } else {
        state.message = `⏰ ${state.auctionState.property.name} 流拍，无人出价`;
      }
      endAuction();
      return;
    }

    advanceToNextPlayer();
  }

  function nextAuctionPlayer() {
    state.auctionState.currentPlayerIndex = (state.auctionState.currentPlayerIndex + 1) % state.auctionState.playerOrder.length;

    const passedCount = state.auctionState.playerOrder.filter(p =>
      state.auctionState.passedPlayers.includes(p.id) || p.bankrupt
    ).length;

    if (passedCount >= state.auctionState.playerOrder.length) {
      endAuction();
    } else {
      const currentPlayer = state.auctionState.playerOrder[state.auctionState.currentPlayerIndex];
      if (state.auctionState.passedPlayers.includes(currentPlayer.id) || currentPlayer.bankrupt) {
        nextAuctionPlayer();
      } else {
        processNextAuctionPlayer();
      }
    }
  }

  function endAuction() {
    state.auctionState.isAuctioning = false;

    if (state.auctionState.currentBidder !== null && state.auctionState.bids.length > 0) {
      const winner = state.players.find(p => p.id === state.auctionState.currentBidder);
      const winnerIndex = state.players.findIndex(p => p.id === state.auctionState.currentBidder);
      const prop = state.properties[state.auctionState.property.id];

      if (winner && winner.cash >= state.auctionState.currentBid) {
        winner.cash -= state.auctionState.currentBid;
        triggerCashChange(-state.auctionState.currentBid, winnerIndex);
        prop.owner = winner.id;
        prop.investment = state.auctionState.currentBid;
        prop.level = 0;

        state.message = `🎉 ${winner.name} 以 ${state.auctionState.currentBid} 金币拍得 ${state.auctionState.property.name}！`;

        if (onAuctionSuccessCallback) {
          onAuctionSuccessCallback(winner.name, state.auctionState.property.name);
        }
      }
    } else {
      state.message = `⏰ ${state.auctionState.property.name} 流拍，无人出价`;
    }

    state.auctionModal = false;
    resetAuctionState();
    endTurn();
  }

  function resetAuctionState() {
    state.auctionState.property = null;
    state.auctionState.startingPrice = 0;
    state.auctionState.currentBid = 0;
    state.auctionState.currentBidder = null;
    state.auctionState.bids = [];
    state.auctionState.playerOrder = [];
    state.auctionState.currentPlayerIndex = 0;
    state.auctionState.passedPlayers = [];
    state.auctionState.biddedPlayers = [];
    state.auctionState.isAuctioning = false;
    state.auctionState.isAIProcessing = false;
  }

  function closeAuctionModal() {
    state.auctionModal = false;
    resetAuctionState();
    endTurn();
  }

  const FUND_AMOUNTS = [100, 200, 400, 800];

  function handleFund() {
    const player = getCurrentPlayer();
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
          state.message = `${player.name} 选择不向基金捐款`;
          endTurn();
        }
      } else {
        state.message = `${player.name} 现金不足，无法捐款`;
        endTurn();
      }
    } else {
      state.propertyModal = { type: 'fund' };
    }
  }

  function donateToFund(amount) {
    const player = getCurrentPlayer();
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
      state.refreshKey++;
      state.message = `${player.name} 向基金捐款 ${amount} 金币，获得 3 次返利机会（每次返还 ${Math.floor(amount * 0.4)} 金币）！`;
    } else {
      state.message = `${player.name} 现金不足，无法捐款 ${amount} 金币`;
    }
    state.fundModal = false;
    endTurn();
  }

  function skipFundDonation() {
    const player = getCurrentPlayer();
    state.message = `${player.name} 选择不向基金捐款`;
    state.fundModal = false;
    endTurn();
  }

  function buyProperty(tile) {
    const player = getCurrentPlayer();
    const prop = state.properties[tile.id];

    if (player.bankrupt) {
      state.propertyModal = false;
      endTurn();
      return;
    }

    if (prop.owner !== null) {
      state.message = `${tile.name} 已经被购买了！`;
      state.propertyModal = false;
      endTurn();
      return;
    }

    if (player.cash >= tile.price) {
      player.cash -= tile.price;
      triggerCashChange(-tile.price);
      prop.owner = player.id;
      prop.investment = tile.price;
      state.message = `${player.name} 购买了 ${tile.name}！`;
    } else {
      state.message = `${player.name} 现金不足，无法购买！`;
    }
    state.propertyModal = false;
    endTurn();
  }

  function getFreeProperty(tileId) {
    const player = getCurrentPlayer();
    const tile = mapTiles[tileId - 1];
    const prop = state.properties[tileId];

    prop.owner = player.id;
    prop.investment = 0;
    state.message = `${player.name} 免费获得了 ${tile.name}！`;
    state.propertyModal = false;
    endTurn();
  }

  function upgradeProperty(tile) {
    const prop = state.properties[tile.id];
    const player = getCurrentPlayer();

    if (player.bankrupt) {
      state.upgradeModal = false;
      endTurn();
      return;
    }

    if (prop.level >= 3) {
      state.message = `${tile.name} 已经是最高等级了！`;
      state.upgradeModal = false;
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
      state.message = `${player.name} 将 ${tile.name} 升级到 Lv.${prop.level}！`;
    } else {
      state.message = `现金不足，无法升级！`;
    }
    state.upgradeModal = false;
    endTurn();
  }

  function freeUpgradeProperty(tileId) {
    const prop = state.properties[tileId];
    const tile = mapTiles[tileId - 1];
    const player = getCurrentPlayer();

    prop.level = Math.min(3, prop.level + 1);
    state.message = `${player.name} 将 ${tile.name} 免费升级到 Lv.${prop.level}！`;
    state.upgradeModal = false;
    endTurn();
  }

  function selectFreeProperty(tileId) {
    const prop = state.properties[tileId];
    const tile = mapTiles[tileId - 1];
    const player = state.players.find(p => p.id === state.freePropertyPlayerId);

    if (prop && prop.owner === null && player) {
      prop.owner = player.id;
      prop.investment = 0;
      state.message = `${player.name} 免费获得了 ${tile.name}！`;
      state.selectingPropertyForFree = false;
      state.freePropertyPlayerId = null;
      endTurn();
    }
  }

  function selectAIProperty(player) {
    const ownedIds = Object.entries(state.properties)
      .filter(([id, prop]) => prop.owner === player.id)
      .map(([id]) => parseInt(id));

    const ownedBlocks = new Set();
    for (const id of ownedIds) {
      const tile = mapTiles[id - 1];
      if (tile && tile.block) {
        ownedBlocks.add(tile.block);
      }
    }

    const unownedEntries = Object.entries(state.properties)
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
      state.message += `，没有空地可以选择`;
      endTurn();
      return;
    }

    const maxPrice = Math.max(...candidatesWithTiles.map(x => x.tile.price));
    const mostExpensive = candidatesWithTiles.filter(x => x.tile.price === maxPrice);

    const selected = mostExpensive[Math.floor(Math.random() * mostExpensive.length)];
    const prop = state.properties[selected.id];
    prop.owner = player.id;
    prop.investment = 0;
    state.message += `，${player.name} 免费获得了 ${selected.tile.name}！`;
    endTurn();
  }

  function mortgageProperty(propertyId) {
    const prop = state.properties[propertyId];
    if (!prop || prop.owner === null) return;

    const player = state.players.find(p => p.id === prop.owner);
    if (!player) return;

    const mortgageAmount = Math.floor(prop.investment * MORTGAGE_RATIO);
    player.cash += mortgageAmount;
    triggerCashChange(mortgageAmount);

    prop.owner = null;
    prop.level = 0;
    prop.investment = 0;

    state.message = `${player.name} 抵押了 ${mapTiles[propertyId - 1]?.name || '地产'}，获得 ${mortgageAmount} 金币！`;
  }

  function getPlayerPropertiesList(playerId) {
    const list = [];
    for (const [id, prop] of Object.entries(state.properties)) {
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
      state.selectedCard = { ...card, type: 'chance' };
    }
  }

  function testFateCard(cardId) {
    const card = fateCards.find(c => c.id === cardId);
    if (card) {
      state.selectedCard = { ...card, type: 'fate' };
    }
  }

  function confirmStationTeleport() {
    const player = getCurrentPlayer();
    const isFree = state.propertyModal?.free;

    if (isFree) {
      player.buffs = player.buffs.filter(b => b.name !== 'freeStation');
      state.message += `使用车站月票免费传送！`;
    } else if (player.cash >= STATION_FEE) {
      player.cash -= STATION_FEE;
      triggerCashChange(-STATION_FEE);
      state.message += `支付 ${STATION_FEE} 金币传送！`;
    } else {
      state.message = `现金不足，无法传送！`;
      state.propertyModal = false;
      endTurn();
      return;
    }

    const tile = mapTiles[player.position];
    state.propertyModal = false;
    stationTeleport(tile);
  }

  function casinoBet(betType, betAmount, guess) {
    const player = getCurrentPlayer();
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
    state.casinoModal = false;

    if (netProfit > 0) {
      state.message = `${player.name} 猜对了！掷出 ${actualResult}，赢得 ${netProfit} 金币！`;
    } else {
      state.message = `${player.name} 猜错了！掷出 ${actualResult}，损失 ${-netProfit} 金币`;
    }

    checkBankruptcyAndLiquidate(player);
    endTurn();
  }

  function endTurn() {
    if (isEndingTurn) {
      return;
    }

    if (isGameOver()) {
      state.gamePhase = 'ended';
      if (getWinner()) {
        state.message = `🎉 游戏结束！${getWinner().name} 获胜！`;
      }
      return;
    }

    isEndingTurn = true;

    state.propertyModal = false;
    state.upgradeModal = false;
    state.selectedCard = null;

    let nextIndex = state.currentPlayerIndex;

    do {
      nextIndex = (nextIndex + 1) % state.players.length;
    } while (nextIndex !== state.currentPlayerIndex && state.players[nextIndex].bankrupt);

    const currentPlayerBeforeTurn = getCurrentPlayer();

    const singleUseBuffs = ['dicePlus', 'salaryBoost', 'salaryHalf', 'halfRent', 'freeRent', 'fixedMove', 'freeStation', 'bonusSalary'];

    const filteredBuffs = currentPlayerBeforeTurn.buffs.filter(buff => {
      if (buff.duration !== undefined && buff.duration !== null && !singleUseBuffs.includes(buff.name)) {
        buff.duration--;
        if (buff.duration <= 0) {
          return false;
        }
      }
      return true;
    });

    currentPlayerBeforeTurn.buffs.length = 0;
    currentPlayerBeforeTurn.buffs.push(...filteredBuffs);

    state.currentPlayerIndex = nextIndex;

    if (isGameOver()) {
      state.gamePhase = 'ended';
      if (getWinner()) {
        state.message = `🎉 游戏结束！${getWinner().name} 获胜！`;
      }
      isEndingTurn = false;
      return;
    }

    if (state.currentPlayerIndex === 0) {
      state.round++;
    }

    const newPlayer = getCurrentPlayer();

    if (newPlayer.bankruptWarning) {
      const bankruptcyResult = processTurnEndForBankruptcy(newPlayer);
      if (bankruptcyResult.shouldStop) {
        if (isGameOver()) {
          state.gamePhase = 'ended';
          if (getWinner()) {
            state.message = `🎉 游戏结束！${getWinner().name} 获胜！`;
          }
          isEndingTurn = false;
          return;
        }
        isEndingTurn = false;
        return;
      }
    }

    if (newPlayer.inJail) {
      newPlayer.jailTurns++;
      const maxJailTurns = newPlayer.jailType === 'bomb' ? 2 : 1;
      if (newPlayer.jailTurns > maxJailTurns) {
        newPlayer.inJail = false;
        newPlayer.jailTurns = 0;
        newPlayer.jailType = null;
        state.message = `${newPlayer.name} 出狱了！第 ${state.round} 回合，${newPlayer.name} 的回合`;
      } else {
        const remainingTurns = maxJailTurns - newPlayer.jailTurns + 1;
        state.message = `${newPlayer.name} 在监狱中，剩余 ${remainingTurns} 回合，跳过回合！`;
        triggerSkipTurn(state.currentPlayerIndex);
        setTimeout(() => {
          isEndingTurn = false;
          endTurn();
        }, 1500);
        return;
      }
    } else if (newPlayer.skipNextTurn) {
      newPlayer.skipNextTurn = false;
      state.message = `${newPlayer.name} 跳过回合！`;
      triggerSkipTurn(state.currentPlayerIndex);
      setTimeout(() => {
        isEndingTurn = false;
        endTurn();
      }, 1500);
      return;
    } else {
      state.message = `第 ${state.round} 回合，${getCurrentPlayer().name} 的回合`;
    }

    state.diceResult = null;
    state.isRolling = false;
    isEndingTurn = false;
  }

  function adjustCurrentPlayerCash(amount) {
    if (getCurrentPlayer() && !getCurrentPlayer().bankrupt) {
      getCurrentPlayer().cash += amount;
      triggerCashChange(amount);
      state.message = `${getCurrentPlayer().name} ${amount > 0 ? '获得' : '失去'} ${Math.abs(amount)} 金币，当前现金: ${getCurrentPlayer().cash}`;
      if (amount < 0) {
        checkBankruptcyAndLiquidate(getCurrentPlayer());
        if (getCurrentPlayer().bankrupt) {
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

    state.players = JSON.parse(JSON.stringify(savedPlayers));
    state.currentPlayerIndex = savedIndex;
    state.round = savedRound;

    Object.keys(savedProperties).forEach(id => {
      state.properties[id] = { ...savedProperties[id] };
    });

    Object.keys(savedBombs).forEach(key => {
      state.bombs[key] = { ...savedBombs[key] };
    });

    state.chanceDeck = [...savedChanceDeck];
    state.fateDeck = [...savedFateDeck];
    state.globalBuffs = JSON.parse(JSON.stringify(savedGlobalBuffs));
    state.turnHistory = JSON.parse(JSON.stringify(savedTurnHistory));

    Object.assign(state.auctionState, savedAuctionState);

    state.gamePhase = 'playing';
    state.message = `游戏已加载！第 ${state.round} 回合，${getCurrentPlayer().name} 的回合`;
  }

  return {
    get players() { return state.players; },
    get currentPlayer() { return getCurrentPlayer(); },
    get currentPlayerIndex() { return state.currentPlayerIndex; },
    set currentPlayerIndex(val) { state.currentPlayerIndex = val; },
    get gamePhase() { return state.gamePhase; },
    set gamePhase(val) { state.gamePhase = val; },
    get gameOver() { return isGameOver(); },
    get round() { return state.round; },
    set round(val) { state.round = val; },
    get message() { return state.message; },
    set message(val) { state.message = val; },
    get diceResult() { return state.diceResult; },
    set diceResult(val) { state.diceResult = val; },
    get isRolling() { return state.isRolling; },
    set isRolling(val) { state.isRolling = val; },
    get refreshKey() { return state.refreshKey; },
    set refreshKey(val) { state.refreshKey = val; },
    get selectedCard() { return state.selectedCard; },
    set selectedCard(val) { state.selectedCard = val; },
    get casinoModal() { return state.casinoModal; },
    set casinoModal(val) { state.casinoModal = val; },
    get propertyModal() { return state.propertyModal; },
    set propertyModal(val) { state.propertyModal = val; },
    get upgradeModal() { return state.upgradeModal; },
    set upgradeModal(val) { state.upgradeModal = val; },
    get mortgageModal() { return state.mortgageModal; },
    set mortgageModal(val) { state.mortgageModal = val; },
    get shopModal() { return state.shopModal; },
    set shopModal(val) { state.shopModal = val; },
    get itemUseModal() { return state.itemUseModal; },
    set itemUseModal(val) { state.itemUseModal = val; },
    get lotteryModal() { return state.lotteryModal; },
    set lotteryModal(val) { state.lotteryModal = val; },
    get lotteryResult() { return state.lotteryResult; },
    set lotteryResult(val) { state.lotteryResult = val; },
    get placingBomb() { return state.placingBomb; },
    set placingBomb(val) { state.placingBomb = val; },
    get bombs() { return state.bombs; },
    get propertyEffectTile() { return state.propertyEffectTile; },
    get selectingPropertyForFree() { return state.selectingPropertyForFree; },
    set selectingPropertyForFree(val) { state.selectingPropertyForFree = val; },
    get properties() { return state.properties; },
    get chanceDeck() { return state.chanceDeck; },
    set chanceDeck(val) { state.chanceDeck = val; },
    get fateDeck() { return state.fateDeck; },
    set fateDeck(val) { state.fateDeck = val; },
    get globalBuffs() { return state.globalBuffs; },
    get turnHistory() { return state.turnHistory; },
    get winner() { return getWinner(); },
    get auctionModal() { return state.auctionModal; },
    set auctionModal(val) { state.auctionModal = val; },
    get auctionState() { return state.auctionState; },
    get fundModal() { return state.fundModal; },
    set fundModal(val) { state.fundModal = val; },
    get freePropertyPlayerId() { return state.freePropertyPlayerId; },
    set freePropertyPlayerId(val) { state.freePropertyPlayerId = val; },

    initPlayers,
    addHistory,
    setOnCashChangeCallback,
    setOnSkipTurnCallback,
    setOnBuffActivationCallback,
    setOnAuctionSuccessCallback,
    setOnJailFreeRentCallback,
    setOnFreeRentCallback,
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
    importSaveData,

    getState: () => state,
    getActivePlayers,
    isGameOver,
    getWinner,
    getCurrentPlayer
  };
}

module.exports = {
  createGameState
};
