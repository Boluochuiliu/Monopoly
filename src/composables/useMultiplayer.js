import { ref, reactive } from 'vue'
import Peer from 'peerjs'

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

export function useMultiplayer() {
  const isHost = ref(false)
  const isConnected = ref(false)
  const roomId = ref('')
  const myName = ref('')
  const myPeerId = ref('')
  const players = reactive([])
  const connectionError = ref('')
  const gameStarted = ref(false)

  let peer = null
  const connections = new Map()

  let onStateSync = null
  let onGameStart = null
  let onMessage = null
  let onClientAction = null
  let onDiceResultCallback = null
  let onAuctionEventCallback = null
  let onCashChangeCallback = null
  let onActionNotifyCallback = null

  function onStateSyncCallback(cb) { onStateSync = cb }
  function onGameStartCallback(cb) { onGameStart = cb }
  function onMessageCallback(cb) { onMessage = cb }
  function onClientActionCallback(cb) { onClientAction = cb }
  function onDiceResult(cb) { onDiceResultCallback = cb }
  function onAuctionEvent(cb) { onAuctionEventCallback = cb }
  function onCashChange(cb) { onCashChangeCallback = cb }
  function onActionNotify(cb) { onActionNotifyCallback = cb }

  function forwardToOtherClients(senderPeer, data) {
    connections.forEach((otherConn) => {
      if (otherConn.open && otherConn.peer !== senderPeer) {
        otherConn.send(data)
      }
    })
  }

  function createRoom(playerName) {
    return new Promise((resolve, reject) => {
      const id = 'monopoly-' + generateRoomId()
      roomId.value = id.replace('monopoly-', '')
      myName.value = playerName
      isHost.value = true

      peer = new Peer(id)

      peer.on('open', (peerId) => {
        myPeerId.value = peerId
        players.push({ id: peerId, name: playerName, isHost: true })
        isConnected.value = true
        connectionError.value = ''
        resolve(roomId.value)
      })

      peer.on('connection', (conn) => {
        handleIncomingConnection(conn)
      })

      peer.on('error', (err) => {
        connectionError.value = err.type === 'unavailable-id' ? '房间号冲突，请重试' : err.message
        reject(err)
      })
    })
  }

  function joinRoom(inputRoomId, playerName) {
    return new Promise((resolve, reject) => {
      const targetId = 'monopoly-' + inputRoomId.toUpperCase()
      roomId.value = inputRoomId.toUpperCase()
      myName.value = playerName
      isHost.value = false

      peer = new Peer()

      peer.on('open', (peerId) => {
        myPeerId.value = peerId

        const conn = peer.connect(targetId, { reliable: true })

        conn.on('open', () => {
          conn.send({
            type: 'join',
            data: { id: peerId, name: playerName }
          })
          connections.set(peerId, conn)
          isConnected.value = true
          connectionError.value = ''
          resolve(roomId.value)
        })

        conn.on('data', (data) => {
          handleHostMessage(data)
        })

        conn.on('close', () => {
          connections.delete(peerId)
        })

        conn.on('error', (err) => {
          connectionError.value = '连接失败: ' + err.message
          reject(err)
        })
      })

      peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
          connectionError.value = '房间不存在或已关闭'
        } else {
          connectionError.value = err.message
        }
        reject(err)
      })
    })
  }

  function handleIncomingConnection(conn) {
    conn.on('open', () => {
      connections.set(conn.peer, conn)
    })

    conn.on('data', (data) => {
      if (data.type === 'join') {
        const newPlayer = { id: data.data.id, name: data.data.name, isHost: false }
        const exists = players.find(p => p.id === newPlayer.id)
        if (!exists && players.length < 4) {
          players.push(newPlayer)
        }
        broadcastToClients({
          type: 'playerList',
          data: [...players]
        })
        conn.send({
          type: 'playerList',
          data: [...players]
        })
      } else if (data.type === 'action') {
        handleClientAction(conn.peer, data.action, data.data)
      } else if (data.type === 'diceResult') {
        if (onDiceResultCallback) {
          onDiceResultCallback(data.value, data.playerIndex)
        }
        forwardToOtherClients(conn.peer, { type: 'diceResult', value: data.value, playerIndex: data.playerIndex })
      } else if (data.type === 'auctionEvent') {
        if (onAuctionEventCallback) {
          onAuctionEventCallback(data.eventType, data.data)
        }
        forwardToOtherClients(conn.peer, { type: 'auctionEvent', eventType: data.eventType, data: data.data })
      } else if (data.type === 'clientStateSync') {
        if (onStateSync) {
          onStateSync(data.data)
        }
        forwardToOtherClients(conn.peer, { type: 'stateSync', data: data.data })
      } else if (data.type === 'cashChange') {
        if (onCashChangeCallback) {
          onCashChangeCallback(data.amount, data.playerIndex)
        }
        forwardToOtherClients(conn.peer, { type: 'cashChange', amount: data.amount, playerIndex: data.playerIndex })
      } else if (data.type === 'actionNotify') {
        if (onActionNotifyCallback) {
          onActionNotifyCallback(data.text, data.playerIndex, data.detail || '')
        }
        forwardToOtherClients(conn.peer, { type: 'actionNotify', text: data.text, playerIndex: data.playerIndex, detail: data.detail || '' })
      }
    })

    conn.on('close', () => {
      connections.delete(conn.peer)
      const idx = players.findIndex(p => p.id === conn.peer)
      if (idx !== -1) {
        players.splice(idx, 1)
        broadcastToClients({
          type: 'playerList',
          data: [...players]
        })
      }
    })
  }

  function handleHostMessage(data) {
    console.log('[联机调试] 客户端收到消息 type:', data.type);
    if (data.type === 'playerList') {
      players.splice(0, players.length, ...data.data)
    } else if (data.type === 'stateSync') {
      if (onStateSync) {
        onStateSync(data.data)
      }
    } else if (data.type === 'gameStart') {
      gameStarted.value = true
      console.log('[联机调试] 收到 gameStart, data:', data);
      if (onGameStart) {
        onGameStart({ playerNames: data.data?.playerNames, gameState: data.gameState })
      } else {
        console.log('[联机调试] 错误: onGameStart 回调未设置!');
      }
    } else if (data.type === 'message') {
      if (onMessage) {
        onMessage(data.data)
      }
    } else if (data.type === 'diceResult') {
      if (onDiceResultCallback) {
        onDiceResultCallback(data.value, data.playerIndex)
      }
    } else if (data.type === 'auctionEvent') {
      if (onAuctionEventCallback) {
        onAuctionEventCallback(data.eventType, data.data)
      }
    } else if (data.type === 'cashChange') {
      if (onCashChangeCallback) {
        onCashChangeCallback(data.amount, data.playerIndex)
      }
    } else if (data.type === 'actionNotify') {
      if (onActionNotifyCallback) {
        onActionNotifyCallback(data.text, data.playerIndex, data.detail || '')
      }
    }
  }

  function handleClientAction(peerId, action, data) {
    if (onClientAction) {
      onClientAction(peerId, action, data)
    }
  }

  function broadcastToClients(data) {
    connections.forEach((conn) => {
      if (conn.open) {
        conn.send(data)
      }
    })
  }

  function sendAction(action, data) {
    if (isHost.value) return
    const hostConn = connections.values().next().value
    if (hostConn && hostConn.open) {
      hostConn.send({ type: 'action', action, data })
    }
  }

  function broadcastDiceResult(value, playerIndex) {
    const msg = { type: 'diceResult', value, playerIndex }
    if (isHost.value) {
      broadcastToClients(msg)
    } else {
      const hostConn = connections.values().next().value
      if (hostConn && hostConn.open) {
        hostConn.send(msg)
      }
    }
  }

  function sendStateToHost(state) {
    if (isHost.value) return
    const hostConn = connections.values().next().value
    if (hostConn && hostConn.open) {
      hostConn.send({ type: 'clientStateSync', data: state })
    }
  }

  function broadcastAuctionEvent(eventType, data) {
    if (!isHost.value) return
    broadcastToClients({ type: 'auctionEvent', eventType, data })
  }

  function broadcastCashChange(amount, playerIndex) {
    if (!isHost.value) return
    broadcastToClients({ type: 'cashChange', amount, playerIndex })
  }

  function sendCashChangeToHost(amount, playerIndex) {
    if (isHost.value) return
    const hostConn = connections.values().next().value
    if (hostConn && hostConn.open) {
      hostConn.send({ type: 'cashChange', amount, playerIndex })
    }
  }

  function broadcastActionNotify(text, playerIndex, detail = '') {
    if (!isHost.value) return
    broadcastToClients({ type: 'actionNotify', text, playerIndex, detail })
  }

  function sendActionNotifyToHost(text, playerIndex, detail = '') {
    if (isHost.value) return
    const hostConn = connections.values().next().value
    if (hostConn && hostConn.open) {
      hostConn.send({ type: 'actionNotify', text, playerIndex, detail })
    }
  }

  function syncState(state) {
    if (!isHost.value) return
    broadcastToClients({ type: 'stateSync', data: state })
  }

  function startGame(gameConfig, gameState) {
    if (!isHost.value) return
    gameStarted.value = true
    broadcastToClients({ type: 'gameStart', data: gameConfig, gameState })
  }

  function sendMessage(msg) {
    if (isHost.value) {
      broadcastToClients({ type: 'message', data: msg })
    } else {
      const hostConn = connections.values().next().value
      if (hostConn && hostConn.open) {
        hostConn.send({ type: 'message', data: msg })
      }
    }
  }

  function disconnect() {
    connections.forEach((conn) => {
      conn.close()
    })
    connections.clear()
    if (peer) {
      peer.destroy()
      peer = null
    }
    isConnected.value = false
    gameStarted.value = false
    players.splice(0, players.length)
    roomId.value = ''
    myName.value = ''
    myPeerId.value = ''
    isHost.value = false
    connectionError.value = ''
  }

  return {
    isHost,
    isConnected,
    roomId,
    myName,
    myPeerId,
    players,
    connectionError,
    gameStarted,
    createRoom,
    joinRoom,
    sendAction,
    syncState,
    startGame,
    sendMessage,
    disconnect,
    broadcastDiceResult,
    sendStateToHost,
    broadcastAuctionEvent,
    broadcastCashChange,
    sendCashChangeToHost,
    broadcastActionNotify,
    sendActionNotifyToHost,
    onStateSyncCallback,
    onGameStartCallback,
    onMessageCallback,
    onClientActionCallback,
    onDiceResult,
    onAuctionEvent,
    onCashChange,
    onActionNotify
  }
}
