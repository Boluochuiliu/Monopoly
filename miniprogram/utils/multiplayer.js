const DB_NAME = 'monopoly_rooms';

class Multiplayer {
  constructor() {
    this.db = null;
    this.roomId = null;
    this.isHost = false;
    this.myPlayerId = null;
    this.myPlayerIndex = null;
    this.onStateChange = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onGameStart = null;
    this.watcher = null;
    this.playerName = '';
    this.aiCount = 0;
  }

  init() {
    return new Promise((resolve, reject) => {
      if (!wx.cloud) {
        reject(new Error('微信云开发未初始化'));
        return;
      }
      this.db = wx.cloud.database();
      resolve();
    });
  }

  generateRoomId() {
    const chars = '0123456789ABCDEF';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  }

  async createRoom(playerName, aiCount = 0) {
    this.playerName = playerName;
    this.aiCount = aiCount;
    this.roomId = this.generateRoomId();
    this.isHost = true;

    const roomData = {
      roomId: this.roomId,
      hostName: playerName,
      players: [{
        id: this._generatePlayerId(),
        name: playerName,
        isHost: true,
        ready: false
      }],
      aiCount: aiCount,
      maxPlayers: 4 - aiCount,
      status: 'waiting',
      gameState: null,
      createdAt: Date.now()
    };

    try {
      await this.db.collection(DB_NAME).add({ data: roomData });
      this.myPlayerId = roomData.players[0].id;
      this.myPlayerIndex = 0;
      return { roomId: this.roomId, isHost: true };
    } catch (err) {
      throw new Error('创建房间失败: ' + err.message);
    }
  }

  async joinRoom(roomId, playerName) {
    this.roomId = roomId;
    this.playerName = playerName;
    this.isHost = false;

    try {
      const room = await this.db.collection(DB_NAME).where({ roomId }).get();
      if (room.data.length === 0) {
        throw new Error('房间不存在');
      }

      const roomData = room.data[0];
      if (roomData.status !== 'waiting') {
        throw new Error('房间已开始游戏');
      }
      if (roomData.players.length >= roomData.maxPlayers) {
        throw new Error('房间已满');
      }

      const newPlayer = {
        id: this._generatePlayerId(),
        name: playerName,
        isHost: false,
        ready: false
      };

      await this.db.collection(DB_NAME).doc(roomData._id).update({
        data: {
          players: [...roomData.players, newPlayer]
        }
      });

      this.myPlayerId = newPlayer.id;
      this.myPlayerIndex = roomData.players.length;
      return { roomId, isHost: false };
    } catch (err) {
      throw new Error('加入房间失败: ' + err.message);
    }
  }

  async getRoomInfo() {
    try {
      const room = await this.db.collection(DB_NAME).where({ roomId: this.roomId }).get();
      return room.data[0] || null;
    } catch (err) {
      throw new Error('获取房间信息失败: ' + err.message);
    }
  }

  async setPlayerReady(isReady) {
    const room = await this.getRoomInfo();
    if (!room) return;

    const players = room.players.map(p => 
      p.id === this.myPlayerId ? { ...p, ready: isReady } : p
    );

    await this.db.collection(DB_NAME).doc(room._id).update({
      data: { players }
    });
  }

  async startGame() {
    if (!this.isHost) {
      throw new Error('只有房主可以开始游戏');
    }

    const room = await this.getRoomInfo();
    await this.db.collection(DB_NAME).doc(room._id).update({
      data: { status: 'playing' }
    });
  }

  async syncGameState(state) {
    const room = await this.getRoomInfo();
    if (!room) return;

    await this.db.collection(DB_NAME).doc(room._id).update({
      data: { gameState: state }
    });
  }

  watchRoom(callbacks) {
    this.onStateChange = callbacks.onStateChange;
    this.onPlayerJoin = callbacks.onPlayerJoin;
    this.onPlayerLeave = callbacks.onPlayerLeave;
    this.onGameStart = callbacks.onGameStart;

    this.watcher = this.db.collection(DB_NAME)
      .where({ roomId: this.roomId })
      .watch({
        onChange: (snapshot) => {
          const doc = snapshot.docs[0];
          if (!doc) return;

          const data = doc.data;

          if (data.gameState && this.onStateChange) {
            this.onStateChange(data.gameState);
          }

          if (this.onGameStart && data.status === 'playing') {
            this.onGameStart(data);
          }
        },
        onError: (err) => {
          console.error('监听失败:', err);
        }
      });
  }

  async getPlayerList() {
    const room = await this.getRoomInfo();
    return room ? room.players : [];
  }

  async leaveRoom() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    try {
      const room = await this.getRoomInfo();
      if (!room) return;

      const players = room.players.filter(p => p.id !== this.myPlayerId);
      
      if (players.length === 0) {
        await this.db.collection(DB_NAME).doc(room._id).remove();
      } else {
        const newHost = players.find(p => p.isHost) || players[0];
        await this.db.collection(DB_NAME).doc(room._id).update({
          data: {
            players: players.map(p => ({ ...p, isHost: p.id === newHost.id })),
            hostName: newHost.name
          }
        });
      }
    } catch (err) {
      console.error('离开房间失败:', err);
    }
  }

  isMyTurn(currentPlayerIndex) {
    return currentPlayerIndex === this.myPlayerIndex;
  }

  _generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getMyPlayerIndex() {
    return this.myPlayerIndex;
  }

  getRoomId() {
    return this.roomId;
  }
}

const multiplayer = new Multiplayer();
module.exports = multiplayer;