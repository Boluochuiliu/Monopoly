const TILE_SIZE = 150
const GAP = 10

Component({
  properties: {
    mapTiles: {
      type: Array,
      value: []
    },
    players: {
      type: Array,
      value: []
    },
    properties: {
      type: Object,
      value: {}
    },
    currentPlayerIndex: {
      type: Number,
      value: 0
    },
    selectingPropertyForFree: {
      type: Boolean,
      value: false
    },
    bombs: {
      type: Object,
      value: {}
    },
    placingBomb: {
      type: Boolean,
      value: false
    },
    auctionProperty: {
      type: Object,
      value: null
    },
    propertyEffectTile: {
      type: Object,
      value: { tileId: null, effectType: null }
    },
    showDice: {
      type: Boolean,
      value: false
    },
    currentPlayer: {
      type: Object,
      value: null
    },
    auctionSuccessMessage: {
      type: String,
      value: ''
    },
    hasItems: {
      type: Boolean,
      value: false
    }
  },

  data: {
    TILE_SIZE: TILE_SIZE,
    GAP: GAP,
    boardLayout: [],
    activePlayers: []
  },

  observers: {
    'mapTiles, players, properties, currentPlayerIndex, selectingPropertyForFree, bombs, placingBomb, auctionProperty, propertyEffectTile': function () {
      this._updateBoardLayout()
      this._updateActivePlayers()
    }
  },

  lifetimes: {
    attached() {
      this._updateBoardLayout()
      this._updateActivePlayers()
    }
  },

  methods: {
    _updateBoardLayout() {
      const layout = []
      const mapTiles = this.data.mapTiles || []
      for (let row = 0; row < 9; row++) {
        const rowTiles = []
        for (let col = 0; col < 13; col++) {
          const tile = mapTiles.find(t =>
            t.position && t.position.row === row && t.position.col === col
          )
          rowTiles.push(tile || null)
        }
        layout.push(rowTiles)
      }
      this.setData({ boardLayout: layout })
    },

    _updateActivePlayers() {
      const players = this.data.players || []
      const activePlayers = players.filter(p => !p.bankrupt)
      this.setData({ activePlayers })
    },

    getTileIcon(tile) {
      if (!tile) return ''
      const icons = {
        start: '🚀',
        chance: '🎴',
        fate: '🔮',
        station: '🚂',
        jail: '🔒',
        hall: '🏛️',
        casino: '🎰',
        shop: '🛒',
        auction: '⚖️',
        park: '🌳',
        fund: '💰'
      }
      return icons[tile.type] || ''
    },

    getTileClass(tile) {
      if (!tile) return 'empty'

      const classes = [tile.type]

      if (tile.type === 'property') {
        const prop = (this.data.properties || {})[tile.id]
        if (prop && prop.owner !== null) {
          classes.push('owned')
          if (prop.level > 0) {
            classes.push(`upgrade-level-${prop.level}`)
          }
        } else if (this.data.selectingPropertyForFree) {
          classes.push('selectable')
        }

        if (this.data.auctionProperty && this.data.auctionProperty.id === tile.id) {
          classes.push('auctioning')
        }

        if (this.data.propertyEffectTile && this.data.propertyEffectTile.tileId === tile.id) {
          classes.push(`effect-${this.data.propertyEffectTile.effectType}`)
        }
      }

      return classes.join(' ')
    },

    getTileStyle(tile) {
      if (!tile) return ''

      if (tile.type === 'property' && tile.block) {
        const prop = (this.data.properties || {})[tile.id]
        let styleStr = ''

        if (prop && prop.owner !== null) {
          const player = (this.data.players || []).find(p => p.id === prop.owner)
          const playerColor = player ? player.color.primary : '#FFD700'
          styleStr = `background: linear-gradient(135deg, ${playerColor} 0%, ${this._adjustColor(playerColor, -40)} 100%); border-color: #fff; box-shadow: 0 0 ${30}rpx ${playerColor};`
        } else {
          styleStr = 'background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%); border-color: #CCCCCC;'
        }

        return styleStr
      }

      return ''
    },

    _adjustColor(color, amount) {
      const hex = color.replace('#', '')
      const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
      const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
      const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    },

    getPropertyLevel(tileId) {
      const prop = (this.data.properties || {})[tileId]
      return prop ? prop.level : 0
    },

    getPlayerStyle(player) {
      const mapTiles = this.data.mapTiles || []
      const tile = mapTiles[player.position]
      if (!tile || !tile.position) return ''

      const col = tile.position.col
      const row = tile.position.row

      const activePlayers = this.data.activePlayers || []
      const playersOnSameTile = activePlayers.filter(p => p.position === player.position)
      const playerIndex = playersOnSameTile.indexOf(player)
      const totalPlayers = playersOnSameTile.length

      const offsetX = (playerIndex - (totalPlayers - 1) / 2) * 36

      const left = col * (TILE_SIZE + GAP) + TILE_SIZE / 2 - 30 + offsetX
      const top = row * (TILE_SIZE + GAP) + TILE_SIZE / 2 - 40

      return `left: ${left}rpx; top: ${top}rpx; --player-color: ${player.color.primary}; --player-secondary: ${player.color.secondary};`
    },

    hasHallProtection(player) {
      return player.buffs && player.buffs.some(b => b.name === 'hallProtection' && !b.used)
    },

    handleTileClick(e) {
      const tile = e.currentTarget.dataset.tile
      if (!tile) return

      if (this.data.placingBomb) {
        const bombs = this.data.bombs || {}
        if (!bombs[tile.id]) {
          this.triggerEvent('placeBomb', { tileId: tile.id })
        }
        return
      }

      if (this.data.selectingPropertyForFree && tile.type === 'property') {
        const prop = (this.data.properties || {})[tile.id]
        if (prop && prop.owner === null) {
          this.triggerEvent('selectFreeProperty', { tileId: tile.id })
        }
      } else if (tile.type === 'property') {
        const prop = (this.data.properties || {})[tile.id]
        if (prop && prop.owner !== null) {
          console.log(`Property ${tile.name} owned by player ${prop.owner}`)
        }
      }
    },

    onRollDice() {
      this.triggerEvent('rollDice')
    },

    onUseItem() {
      this.triggerEvent('useItem')
    },

    onCancelBomb() {
      this.triggerEvent('cancelBomb')
    },

    generateStars(level) {
      let stars = ''
      for (let i = 0; i < level; i++) {
        stars += '⭐'
      }
      return stars
    }
  }
})