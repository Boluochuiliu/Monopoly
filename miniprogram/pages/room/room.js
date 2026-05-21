const multiplayer = require('../../utils/multiplayer');

Page({
  data: {
    roomId: '',
    players: [],
    playerCount: 0,
    maxPlayers: 4,
    aiCount: 0,
    isHost: false,
    myPlayerId: '',
    isReady: false,
    canStart: false
  },

  onLoad(options) {
    this.roomId = options.roomId;
    this.isHost = options.isHost === 'true';
    this.myPlayerId = options.playerId;
    this.aiCount = parseInt(options.aiCount) || 0;

    this.setData({
      roomId: this.roomId,
      isHost: this.isHost,
      myPlayerId: this.myPlayerId,
      aiCount: this.aiCount,
      maxPlayers: 4 - this.aiCount
    });

    this.initMultiplayer();
  },

  async initMultiplayer() {
    try {
      await multiplayer.init();
      multiplayer.roomId = this.roomId;
      multiplayer.myPlayerId = this.myPlayerId;
      
      this.watchRoom();
      this.refreshPlayerList();
    } catch (err) {
      wx.showToast({ title: '初始化失败', icon: 'none' });
      console.error(err);
    }
  },

  async refreshPlayerList() {
    try {
      const players = await multiplayer.getPlayerList();
      const isReady = players.find(p => p.id === this.myPlayerId)?.ready || false;
      
      this.setData({
        players,
        playerCount: players.length,
        isReady
      });

      this.checkCanStart();
    } catch (err) {
      console.error('刷新玩家列表失败:', err);
    }
  },

  watchRoom() {
    multiplayer.watchRoom({
      onStateChange: () => {},
      onGameStart: (data) => {
        this.onGameStart(data);
      }
    });
  },

  checkCanStart() {
    const { players, isHost } = this.data;
    const allReady = players.every(p => p.ready);
    const hasEnoughPlayers = players.length >= 2;
    
    this.setData({
      canStart: isHost && allReady && hasEnoughPlayers
    });
  },

  toggleReady() {
    const newReady = !this.data.isReady;
    this.setData({ isReady: newReady });
    multiplayer.setPlayerReady(newReady);
  },

  async startGame() {
    try {
      await multiplayer.startGame();
    } catch (err) {
      wx.showToast({ title: '开始游戏失败', icon: 'none' });
    }
  },

  onGameStart(data) {
    const playerNames = data.players.map(p => p.name);
    const humanCount = data.players.length;
    const aiCount = this.data.aiCount;

    wx.navigateTo({
      url: `/pages/game/game?humanCount=${humanCount}&aiCount=${aiCount}&playerNames=${encodeURIComponent(JSON.stringify(playerNames))}&roomId=${this.roomId}&playerId=${this.myPlayerId}&isHost=${this.isHost}`
    });
  },

  shareRoom() {
    wx.showShareMenu({
      withShareTicket: true
    });
    wx.showToast({ title: '请点击右上角分享', icon: 'none' });
  },

  goBack() {
    multiplayer.leaveRoom();
    wx.navigateBack();
  },

  onUnload() {
    multiplayer.leaveRoom();
  }
});