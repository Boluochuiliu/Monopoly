Page({
  data: {
    humanCount: 2,
    aiCount: 0,
    roomIdInput: '',
    playerName: '',
    showRoomIdInput: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('playerName');
    if (userInfo) {
      this.setData({ playerName: userInfo });
    }
  },

  async createRoom() {
    const { playerName, aiCount } = this.data;
    if (!playerName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    try {
      await this.initCloud();
      const multiplayer = require('../../utils/multiplayer');
      await multiplayer.init();
      
      const result = await multiplayer.createRoom(playerName.trim(), aiCount);
      
      wx.navigateTo({
        url: `/pages/room/room?roomId=${result.roomId}&isHost=${result.isHost}&playerId=${multiplayer.myPlayerId}&aiCount=${aiCount}`
      });
    } catch (err) {
      wx.showToast({ title: '创建房间失败', icon: 'none' });
      console.error(err);
    }
  },

  async joinRoom() {
    const { roomIdInput, playerName } = this.data;
    if (!roomIdInput.trim()) {
      wx.showToast({ title: '请输入房间号', icon: 'none' });
      return;
    }
    if (!playerName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    try {
      await this.initCloud();
      const multiplayer = require('../../utils/multiplayer');
      await multiplayer.init();
      
      const result = await multiplayer.joinRoom(roomIdInput.trim().toUpperCase(), playerName.trim());
      
      wx.navigateTo({
        url: `/pages/room/room?roomId=${result.roomId}&isHost=${result.isHost}&playerId=${multiplayer.myPlayerId}&aiCount=0`
      });
    } catch (err) {
      wx.showToast({ title: err.message, icon: 'none' });
      console.error(err);
    }
  },

  async initCloud() {
    return new Promise((resolve) => {
      if (wx.cloud) {
        if (!wx.cloud.isInitialized()) {
          wx.cloud.init({
            env: 'your-env-id',
            traceUser: true
          });
        }
        resolve();
      } else {
        wx.showToast({ title: '请更新微信版本', icon: 'none' });
        resolve();
      }
    });
  },

  onNameInput(e) {
    this.setData({ playerName: e.detail.value });
    wx.setStorageSync('playerName', e.detail.value);
  },

  onRoomIdInput(e) {
    this.setData({ roomIdInput: e.detail.value });
  },

  toggleRoomIdInput() {
    this.setData({ showRoomIdInput: !this.data.showRoomIdInput });
  },

  decreaseAI() {
    if (this.data.aiCount > 0) {
      this.setData({ aiCount: this.data.aiCount - 1 });
    }
  },

  increaseAI() {
    if (this.data.aiCount < 2) {
      this.setData({ aiCount: this.data.aiCount + 1 });
    }
  },

  startLocalGame() {
    const { playerName } = this.data;
    if (!playerName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/game/game?humanCount=1&aiCount=1&playerNames=${encodeURIComponent(JSON.stringify([playerName.trim(), '🤖 AI1']))}`
    });
  }
});