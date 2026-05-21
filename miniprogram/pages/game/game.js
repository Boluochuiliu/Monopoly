const { createGameState } = require('../../utils/gameState');
const { STATION_FEE, JAIL_BAIL, SHOP_ITEMS, chanceCards, fateCards, BLOCK_COLORS } = require('../../data/gameConfig');

const gameState = createGameState();

Page({
  data: {
    gamePhase: 'start',
    players: [],
    currentPlayer: null,
    currentPlayerIndex: 0,
    currentPlayerName: '',
    currentPlayerColor: '#999',
    turnBgColor: '#E53935',
    ownerColors: {},
    bombsList: [],
    mapTiles: gameState.mapTiles,
    properties: {},
    bombs: {},
    
    isRolling: false,
    showDiceResult: false,
    isDiceAnimating: false,
    currentDiceValue: 1,
    
    showDice: false,
    diceRolling: false,
    diceValue: 1,
    diceTxt: '',
    
    showCard: false,
    cardTitle: '🎯 机会卡',
    cardIconStyle: '',
    cardIcon: '✨',
    cardName: '',
    cardDesc: '',
    
    showProperty: false,
    propertyTitle: '购买地产',
    propertyIsRent: false,
    propertyName: '',
    propertyLabel: '售价',
    propertyAmount: 0,
    
    showUpgrade: false,
    
    showShop: false,
    showInventory: false,
    showBuffModal: false,
    buffDesc: '',
    
    showAuction: false,
    auctionBid: 0,
    auctionLeaderName: '',
    auctionPropertyName: '',
    auctionPropertyPrice: 0,
    isMyTurnToBid: false,
    minBidStep: 20,
    currentAuctionPlayer: -1,
    auctionPlayers: [],
    auctionTimeLeft: 0,
    
    showTeleportModal: false,
    teleportTargets: [],
    
    showGameOver: false,
    winnerName: '',
    
    myProps: [],
    hasMyProps: false,
    
    saves: [],
    upgradableProps: [],
    selectedUpgrade: false,
    
    // 联机相关
    isOnline: false,
    isHost: false,
    myPlayerIndex: 0,
    roomId: '',
    isMyTurn: false,
    syncStatus: 'ready'
  },

  onLoad(options) {
    this.roomId = options.roomId;
    this.isHost = options.isHost === 'true';
    this.myPlayerId = options.playerId;
    
    if (options.playerNames) {
      this.playerNames = JSON.parse(decodeURIComponent(options.playerNames));
    }
    
    if (options.humanCount && options.aiCount) {
      this.isOnline = !!options.roomId;
      this.handleStart(parseInt(options.humanCount), parseInt(options.aiCount));
    }
  },

  onShow() {
    this.updateData();
  },

  handleStart(humanCount, aiCount) {
    gameState.initPlayers(humanCount, aiCount);
    
    if (this.playerNames && this.playerNames.length > 0) {
      gameState.players.forEach((p, index) => {
        if (this.playerNames[index]) {
          p.name = this.playerNames[index];
        }
      });
    }
    
    this.setupCallbacks();
    gameState.gamePhase = 'playing';
    
    if (this.isOnline) {
      this.initMultiplayer();
    }
    
    this.updateData();
  },

  async initMultiplayer() {
    try {
      const multiplayer = require('../../utils/multiplayer');
      await multiplayer.init();
      
      multiplayer.roomId = this.roomId;
      multiplayer.myPlayerId = this.myPlayerId;
      multiplayer.myPlayerIndex = this.getMyPlayerIndex();
      
      multiplayer.watchRoom({
        onStateChange: (state) => {
          this.onRemoteState(state);
        },
        onGameStart: () => {},
        onPlayerJoin: () => {},
        onPlayerLeave: () => {}
      });
      
      this.setData({ syncStatus: 'connected' });
    } catch (err) {
      console.error('初始化联机失败:', err);
    }
  },

  getMyPlayerIndex() {
    const state = gameState.getState();
    for (let i = 0; i < state.players.length; i++) {
      if (state.players[i].name === this.playerNames[0]) {
        return i;
      }
    }
    return 0;
  },

  onRemoteState(state) {
    try {
      gameState.importSaveData(state);
      this.updateData();
    } catch (err) {
      console.error('导入远程状态失败:', err);
    }
  },

  async syncState() {
    if (!this.isOnline) return;
    
    try {
      const multiplayer = require('../../utils/multiplayer');
      const state = gameState.getState();
      await multiplayer.syncGameState(state);
    } catch (err) {
      console.error('同步状态失败:', err);
    }
  },

  isCurrentPlayer() {
    const state = gameState.getState();
    return state.currentPlayerIndex === this.myPlayerIndex;
  },

  setupCallbacks() {
    gameState.setOnCashChangeCallback((amount, playerIndex, playerName) => {
      console.log(`[CashChange] ${playerName}: ${amount > 0 ? '+' : ''}${amount}`);
    });

    gameState.setOnSkipTurnCallback((playerIndex) => {
      console.log(`[SkipTurn] Player ${playerIndex}`);
    });

    gameState.setOnBuffActivationCallback((buffName, playerIndex, playerName) => {
      console.log(`[BuffActivation] ${playerName}: ${buffName}`);
    });

    gameState.setOnAuctionSuccessCallback((winnerName, propertyName) => {
      console.log(`[AuctionSuccess] ${winnerName} won ${propertyName}`);
    });

    gameState.setOnJailFreeRentCallback((playerIndex, ownerName) => {
      console.log(`[JailFreeRent] Player ${playerIndex}, Owner: ${ownerName}`);
    });

    gameState.setOnFreeRentCallback((playerIndex) => {
      console.log(`[FreeRent] Player ${playerIndex}`);
    });
  },

  updateData() {
    var self = this;
    const state = gameState.getState();
    
    const currentPlayer = state.players[state.currentPlayerIndex];
    const currentPlayerName = currentPlayer ? currentPlayer.name : '';
    const currentPlayerColor = currentPlayer ? currentPlayer.color : '#999';

    const playerBgColors = ['#E53935', '#1E88E5', '#43A047', '#FB8C00'];
    const turnBgColor = playerBgColors[state.currentPlayerIndex] || '#E53935';
    
    const ownerColors = {};
    for (var id in state.properties) {
      if (state.properties[id].owner) {
        var owner = state.players.find(function(p) { return p.id === state.properties[id].owner; });
        ownerColors[id] = owner ? owner.color : '#999';
      }
    }
    
    const bombSet = {};
    for (var bid in state.bombs) {
      if (state.bombs[bid]) bombSet[bid] = true;
    }
    
    const playerColorMap = {};
    for (var pi = 0; pi < state.players.length; pi++) {
      var p = state.players[pi];
      playerColorMap[p.id] = p.color ? p.color.primary : '#999';
    }

    const chessPieces = ['♜', '♞', '♝', '♛'];

    const playersMap = {};
    for (var pi2 = 0; pi2 < state.players.length; pi2++) {
      var p2 = state.players[pi2];
      playersMap[p2.id] = {
        id: p2.id,
        name: p2.name,
        avatar: chessPieces[pi2 % chessPieces.length],
        color: (p2.color && p2.color.primary) || '#999',
        isMoving: p2.isMoving || false,
        inJail: p2.inJail || false,
        skipNextTurn: p2.skipNextTurn || false,
        bankrupt: p2.bankrupt || false
      };
    }
    
    const processedMapTiles = gameState.mapTiles.map(function(tile) {
      var t = {};
      for (var k in tile) { t[k] = tile[k]; }
      t.hasBomb = !!bombSet[tile.id];
      t.playerIds = [];
      for (var j = 0; j < state.players.length; j++) {
        if (state.players[j].position === tile.id - 1) {
          t.playerIds.push(state.players[j].id);
        }
      }
      t.playerCount = t.playerIds.length;
      t.tileStyle = tile.type === 'property' ? 'background: ' + tile.color + ';' : '';
      t.showPrice = tile.type === 'property' && !!tile.price;
      if (tile.type === 'property' && tile.block) {
        t.blockTag = tile.block.substring(0, 4);
        t.blockColor = (gameState.BLOCK_COLORS && gameState.BLOCK_COLORS[tile.block]) || '#999';
      } else {
        t.blockTag = '';
        t.blockColor = '';
      }
      var propData = state.properties[tile.id];
      t.hasOwner = !!(propData && propData.owner);
      t.ownerColor = ownerColors[tile.id] || '#999';
      t.showLevel = !!(propData && propData.level > 0);
      t.level = propData ? propData.level : 0;
      var posRow = tile.position ? tile.position.row + 1 : 1;
      var posCol = tile.position ? tile.position.col + 1 : 1;
      t.gridStyle = 'grid-row: ' + posRow + '; grid-column: ' + posCol + ';';
      return t;
    });
    
    const processedPlayers = state.players.map(function(p, index) {
      var pp = {};
      for (var k in p) { pp[k] = p[k]; }
      pp.avatar = chessPieces[index % chessPieces.length];
      var propCount = 0;
      for (var pid in state.properties) {
        if (state.properties[pid].owner === p.id) propCount++;
      }
      pp.propertyCount = propCount;
      var itemCount = 0;
      if (p.inventory) {
        itemCount = (p.inventory.remoteDice || 0) + (p.inventory.bomb || 0) + (p.inventory.lottery || 0);
      }
      pp.itemCount = itemCount;
      pp.hasBuffs = !!(p.activeBuffs && p.activeBuffs.length > 0);
      pp.buffsList = [];
      if (p.activeBuffs && p.activeBuffs.length > 0) {
        pp.buffsList = p.activeBuffs.map(function(b) {
          return { icon: b.icon || '✨', name: b.name || b.displayName || '', turns: b.remainingTimes || b.turns || 0 };
        });
      }
      return pp;
    });
    
    var auctionBid = 0;
    var auctionLeaderName = '';
    var auctionProperty = null;
    var auctionPlayers = [];
    var isMyTurnToBid = false;
    var minBidStep = 20;
    var auctionPropertyName = '';
    var auctionPropertyPrice = 0;
    var currentAuctionPlayer = -1;
    
    if (state.auctionState && state.auctionState.isAuctioning) {
      auctionBid = state.auctionState.currentBid;
      minBidStep = state.auctionState.minBidStep;
      auctionProperty = state.auctionState.tile;
      auctionPropertyName = auctionProperty ? auctionProperty.name : '';
      auctionPropertyPrice = auctionProperty ? auctionProperty.price : 0;
      currentAuctionPlayer = state.auctionState.currentPlayerIndex;
      
      auctionPlayers = (state.auctionState.playerOrder || []).map(function(ap, aidx) {
        return {
          id: ap.id,
          icon: ap.icon || '',
          name: ap.name || '',
          money: ap.cash || 0,
          passed: state.auctionState.passedPlayers ? state.auctionState.passedPlayers.indexOf(ap.id) >= 0 : false,
          bankrupt: !!ap.bankrupt,
          isCurrentBidder: aidx === currentAuctionPlayer
        };
      });
      
      if (state.auctionState.currentBidder) {
        var leader = state.players.find(function(p) { return p.id === state.auctionState.currentBidder; });
        auctionLeaderName = leader ? leader.name : '';
      }

      var isFirstBid = (state.auctionState.currentBidder === null);
      
      var cap = state.auctionState.playerOrder[currentAuctionPlayer];
      if (cap && !cap.isAI && !cap.bankrupt) {
        if (!state.auctionState.passedPlayers || state.auctionState.passedPlayers.indexOf(cap.id) < 0) {
          if (gameState.currentPlayer && gameState.currentPlayer.id === cap.id) {
            isMyTurnToBid = true;
          }
        }
      }
    }
    
    var myProps = [];
    var hasMyProps = false;
    if (gameState.currentPlayer) {
      for (var pid in state.properties) {
        if (state.properties[pid].owner === gameState.currentPlayer.id) {
          var propTile = gameState.mapTiles.find(function(t) { return t.id === parseInt(pid); });
          if (propTile) {
            myProps.push({
              id: pid,
              name: propTile.name,
              level: state.properties[pid].level || 0,
              price: propTile.price || 0,
              color: propTile.color || '#999',
              canUpgrade: (state.properties[pid].level || 0) < 5
            });
          }
        }
      }
      hasMyProps = myProps.length > 0;
    }
    
    var upgradableProps = [];
    for (var mid in state.properties) {
      if (state.properties[mid].owner === gameState.currentPlayer?.id) {
        if ((state.properties[mid].level || 0) < 5) {
          var mt = gameState.mapTiles.find(function(t) { return t.id === parseInt(mid); });
          if (mt) {
            upgradableProps.push({ id: mid, name: mt.name, level: state.properties[mid].level || 0 });
          }
        }
      }
    }
    
    var bombsList = [];
    for (var bid in state.bombs) {
      var bt = gameState.mapTiles.find(function(t) { return t.id === parseInt(bid); });
      if (bt && state.bombs[bid]) {
        bombsList.push({ id: bid, name: bt.name });
      }
    }
    
    var showGameOver = false;
    var winnerName = '';
    if (state.gamePhase === 'gameOver') {
      showGameOver = true;
      winnerName = state.winner?.name || '';
    }
    
    var isMyTurn = this.isOnline ? this.isCurrentPlayer() : true;
    
    this.setData({
      players: processedPlayers,
      currentPlayer: currentPlayer,
      currentPlayerIndex: state.currentPlayerIndex,
      currentPlayerName: currentPlayerName,
      currentPlayerColor: currentPlayerColor,
      turnBgColor: turnBgColor,
      mapTiles: processedMapTiles,
      properties: state.properties,
      bombs: state.bombs,
      bombsList: bombsList,
      ownerColors: ownerColors,
      playersMap: playersMap,
      gamePhase: state.gamePhase,
      
      showAuction: state.auctionState?.isAuctioning || false,
      auctionBid: auctionBid,
      auctionLeaderName: auctionLeaderName,
      auctionPropertyName: auctionPropertyName,
      auctionPropertyPrice: auctionPropertyPrice,
      isMyTurnToBid: isMyTurnToBid,
      minBidStep: minBidStep,
      currentAuctionPlayer: currentAuctionPlayer,
      auctionPlayers: auctionPlayers,
      
      showProperty: !!state.propertyModal,
      showShop: !!state.shopModal,
      showInventory: !!state.inventoryModal,
      showBuffModal: !!state.buffModal,
      
      myProps: myProps,
      hasMyProps: hasMyProps,
      upgradableProps: upgradableProps,
      
      showGameOver: showGameOver,
      winnerName: winnerName,
      
      isMyTurn: isMyTurn
    });
  },

  rollDice() {
    if (this.data.isDiceAnimating || this.data.isRolling) return;
    if (this.isOnline && !this.data.isMyTurn) {
      wx.showToast({ title: '等待其他玩家...', icon: 'none' });
      return;
    }

    this.setData({
      isRolling: true,
      showDice: true,
      diceAnimationState: 'rolling',
      isDiceAnimating: true,
      diceTxt: '正在掷骰子...'
    });

    this.startDiceRollingAnimation();
  },

  startDiceRollingAnimation() {
    const totalDuration = 900;
    const initialInterval = 80;
    let elapsed = 0;

    const rollTimer = setInterval(() => {
      elapsed += initialInterval;

      const randomNum = Math.floor(Math.random() * 9) + 1;
      this.setData({ diceValue: randomNum });

      if (elapsed >= totalDuration) {
        clearInterval(rollTimer);
        this.transitionToSettlingPhase();
      }
    }, initialInterval);
  },

  transitionToSettlingPhase() {
    let interval = 180;
    let iteration = 0;
    const maxIterations = 3;

    const settleTimer = setInterval(() => {
      iteration++;
      const randomNum = Math.floor(Math.random() * 9) + 1;
      this.setData({ diceValue: randomNum });

      if (iteration >= maxIterations) {
        clearInterval(settleTimer);
        this.finalizeDiceRoll();
      } else {
        interval += 60;
      }
    }, interval);
  },

  finalizeDiceRoll() {
    const finalDiceValue = Math.floor(Math.random() * 6) + 1;
    this.setData({
      diceValue: finalDiceValue,
      isDiceAnimating: false,
      diceTxt: `掷出了 ${finalDiceValue} 点`,
      diceAnimationState: 'settled'
    });

    setTimeout(() => {
      gameState.rollDiceWithValue(finalDiceValue);
      this.updateData();
      
      if (this.isOnline) {
        this.syncState();
      }
    }, 500);
  },

  closePropertyModal() {
    const type = gameState.propertyModal?.type;
    gameState.propertyModal = false;
    
    if (type === 'jail' || type !== 'fund') {
      gameState.endTurn();
    }
    
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  confirmBuyProperty() {
    if (gameState.propertyModal?.tile) {
      gameState.buyProperty(gameState.propertyModal.tile);
    }
    gameState.propertyModal = false;
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  confirmPayBail() {
    gameState.payBail();
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  confirmStationTeleport() {
    gameState.confirmStationTeleport();
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  getFreeProperty(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    gameState.getFreeProperty(id);
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  donateToFund(e) {
    const amount = parseInt(e.currentTarget.dataset.amount);
    gameState.donateToFund(amount);
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  skipFundDonation() {
    gameState.skipFundDonation();
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  closeUpgradeModal() {
    gameState.upgradeModal = false;
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  upgradeProperty(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    gameState.upgradeProperty(id);
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  endTurn() {
    if (this.isOnline && !this.data.isMyTurn) {
      wx.showToast({ title: '等待其他玩家...', icon: 'none' });
      return;
    }
    
    gameState.endTurn();
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  useItem(e) {
    const itemType = e.currentTarget.dataset.type;
    gameState.useItem(itemType);
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  placeBomb(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    gameState.placeBomb(id);
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  confirmBid(e) {
    const amount = parseInt(e.currentTarget.dataset.amount);
    gameState.placeBid(amount);
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  passAuction() {
    gameState.passAuction();
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  closeCardModal() {
    gameState.cardModal = false;
    this.setData({ showCard: false });
  },

  showCardModal(title, icon, name, desc) {
    this.setData({
      showCard: true,
      cardTitle: title,
      cardIcon: icon,
      cardName: name,
      cardDesc: desc
    });
  },

  openShop() {
    gameState.shopModal = true;
    this.setData({ showShop: true });
  },

  closeShop() {
    gameState.shopModal = false;
    this.setData({ showShop: false });
  },

  buyItem(e) {
    const itemType = e.currentTarget.dataset.type;
    gameState.buyItem(itemType);
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  openInventory() {
    gameState.inventoryModal = true;
    this.setData({ showInventory: true });
  },

  closeInventory() {
    gameState.inventoryModal = false;
    this.setData({ showInventory: false });
  },

  openTeleportModal() {
    const state = gameState.getState();
    const targets = [];
    
    for (var pid in state.properties) {
      if (state.properties[pid].owner === gameState.currentPlayer?.id) {
        var tile = gameState.mapTiles.find(function(t) { return t.id === parseInt(pid); });
        if (tile) {
          targets.push({ id: tile.id, name: tile.name });
        }
      }
    }
    
    this.setData({
      showTeleportModal: true,
      teleportTargets: targets
    });
  },

  closeTeleportModal() {
    this.setData({ showTeleportModal: false });
  },

  teleportTo(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    gameState.teleportTo(id);
    this.setData({ showTeleportModal: false });
    setTimeout(() => {
      this.updateData();
      if (this.isOnline) {
        this.syncState();
      }
    }, 300);
  },

  restartGame() {
    wx.navigateBack();
  },

  goHome() {
    wx.navigateTo({ url: '/pages/index/index' });
  }
});