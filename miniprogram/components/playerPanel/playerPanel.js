Component({
  properties: {
    player: {
      type: Object,
      value: {}
    },
    isActive: {
      type: Boolean,
      value: false
    },
    mapTiles: {
      type: Array,
      value: []
    },
    properties: {
      type: Object,
      value: {}
    },
    cashChanges: {
      type: Array,
      value: []
    },
    showSkipTurn: {
      type: Boolean,
      value: false
    },
    showBuffActivation: {
      type: Boolean,
      value: false
    },
    buffActivationInfo: {
      type: String,
      value: ''
    },
    jailFreeRent: {
      type: Array,
      value: []
    },
    freeRent: {
      type: Array,
      value: []
    },
    getTotalPropertyInvestment: {
      type: null,
      value: null
    },
    isCompactMode: {
      type: Boolean,
      value: false
    },
    refreshKey: {
      type: Number,
      value: 0
    }
  },

  data: {
    showTooltip: false,
    tooltipLeft: 0,
    tooltipTop: 0,
    tooltipContent: '',
    activeBuffKey: null
  },

  lifetimes: {
    attached() {
      this._computeData();
    }
  },

  observers: {
    'player, isActive, mapTiles, properties, cashChanges, showSkipTurn, showBuffActivation, buffActivationInfo, jailFreeRent, freeRent, isCompactMode, refreshKey': function() {
      this._computeData();
    }
  },

  methods: {
    _computeData() {
      const player = this.data.player || {};
      
      const hasStatus = !!(player.inJail || player.skipNextTurn || player.bankrupt || player.bankruptWarning);
      
      const propertyCount = this._getPropertyCount();
      
      const formatCash = this._formatNumber(player.cash);
      
      const mortgageableValue = this._getMortgageableValue();
      
      const activeBuffs = this._getActiveBuffs();
      const hasBuffs = activeBuffs.length > 0;
      
      const hasNotifications = this._hasNotifications();
      
      const jailRemainingTurns = this._getJailRemainingTurns();

      this.setData({
        hasStatus,
        propertyCount,
        formatCash,
        mortgageableValue,
        activeBuffs,
        hasBuffs,
        hasNotifications,
        jailRemainingTurns
      });
    },

    _hasNotifications() {
      const d = this.data;
      return (d.cashChanges && d.cashChanges.length > 0)
        || d.showBuffActivation
        || d.showSkipTurn
        || (d.jailFreeRent && d.jailFreeRent.length > 0)
        || (d.freeRent && d.freeRent.length > 0);
    },

    _getPropertyCount() {
      const props = this.data.properties;
      const player = this.data.player || {};
      if (!props) return 0;
      return Object.values(props).filter(p => p && p.owner === player.id).length;
    },

    _formatNumber(num) {
      if (num === undefined || num === null) return '0';
      return num.toString();
    },

    _getJailRemainingTurns() {
      const player = this.data.player || {};
      if (!player.inJail) return 0;
      const maxJailTurns = player.jailType === 'bomb' ? 2 : 1;
      const remainingTurns = maxJailTurns - (player.jailTurns || 0);
      return remainingTurns > 0 ? remainingTurns : 0;
    },

    _getActiveBuffs() {
      const buffs = [];
      const player = this.data.player || {};
      
      if (player.buffs) {
        buffs.push(...player.buffs.filter(buff => {
          if (buff.name === 'hallProtection' && buff.used) {
            return false;
          }
          return true;
        }));
      }

      if (player.fundRebates && player.fundRebates.length > 0) {
        player.fundRebates.forEach(rebate => {
          buffs.push({
            name: 'fundRebate',
            remainingTimes: rebate.remainingTimes,
            value: Math.floor(rebate.amount * 0.4),
            icon: this._getBuffIcon('fundRebate'),
            displayName: this._getBuffDisplayName({ name: 'fundRebate', value: Math.floor(rebate.amount * 0.4) })
          });
        });
      }

      const inventory = player.inventory;
      if (inventory) {
        if (inventory.remoteDice > 0) {
          buffs.push({
            name: 'remoteDice',
            remainingTimes: inventory.remoteDice,
            isItem: true,
            icon: this._getBuffIcon('remoteDice'),
            displayName: this._getBuffDisplayName({ name: 'remoteDice' })
          });
        }
        if (inventory.bomb > 0) {
          buffs.push({
            name: 'bomb',
            remainingTimes: inventory.bomb,
            isItem: true,
            icon: this._getBuffIcon('bomb'),
            displayName: this._getBuffDisplayName({ name: 'bomb' })
          });
        }
        if (inventory.lottery > 0) {
          buffs.push({
            name: 'lottery',
            remainingTimes: inventory.lottery,
            isItem: true,
            icon: this._getBuffIcon('lottery'),
            displayName: this._getBuffDisplayName({ name: 'lottery' })
          });
        }
      }

      return buffs.map(buff => ({
        ...buff,
        icon: buff.icon || this._getBuffIcon(buff.name),
        displayName: buff.displayName || this._getBuffDisplayName(buff)
      }));
    },

    _getUpgradeCost(tile, prop) {
      const level = prop.level || 0;
      const price = tile.price;
      switch (level) {
        case 0: return Math.ceil(price * 0.5);
        case 1: return Math.floor(price * 1.0);
        case 2: return Math.floor(price * 2.0);
        default: return 0;
      }
    },

    _calculateTotalPropertyInvestment(tile, prop) {
      if (this.data.getTotalPropertyInvestment) {
        return this.data.getTotalPropertyInvestment(tile, prop);
      }
      let total = tile.price;
      let level = 0;
      let currentLevelProp = { level: 0 };
      while (level < prop.level) {
        currentLevelProp.level = level;
        total += this._getUpgradeCost(tile, currentLevelProp);
        level++;
      }
      return total;
    },

    _getMortgageableValue() {
      let total = 0;
      const props = this.data.properties;
      const player = this.data.player || {};
      if (!props) return 0;
      for (const [id, prop] of Object.entries(props)) {
        if (prop && prop.owner === player.id) {
          const tile = this.data.mapTiles[parseInt(id) - 1];
          if (tile) {
            total += this._calculateTotalPropertyInvestment(tile, prop);
          } else {
            total += prop.investment || 0;
          }
        }
      }
      return total;
    },

    _getBuffIcon(name) {
      const icons = {
        freeRent: '🆓',
        freeStation: '🎟️',
        bonusSalary: '🎁',
        salaryBoost: '📈',
        salaryHalf: '📉',
        salaryMinus: '➖',
        extraSalary: '➕',
        halfRent: '💸',
        dicePlus: '🎲',
        hallProtection: '🏛️',
        fixedMove: '👣',
        fundRebate: '💰',
        remoteDice: '🎲',
        bomb: '💣',
        lottery: '🎫'
      };
      return icons[name] || '✨';
    },

    _getBuffName(name) {
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
        fixedMove: '固定行走',
        fundRebate: '基金返利',
        remoteDice: '遥控骰子',
        bomb: '炸弹',
        lottery: '彩票'
      };
      return names[name] || name;
    },

    _getBuffDisplayName(buff) {
      if (buff.name === 'extraSalary') {
        return `薪水+${buff.value}`;
      }
      if (buff.name === 'salaryMinus') {
        return `降薪-${buff.value}`;
      }
      if (buff.name === 'fundRebate') {
        return `返利+${buff.value}`;
      }
      return this._getBuffName(buff.name);
    },

    onOpenMortgage() {
      const { isActive, player } = this.data;
      if (isActive && !(player || {}).bankrupt) {
        this.triggerEvent('openmortgage', { player });
      }
    },

    onBuffTap(e) {
      const index = e.currentTarget.dataset.index;
      const buff = this.data.activeBuffs[index];
      if (!buff) return;

      const buffKey = `${buff.name}-${index}`;

      if (this.data.activeBuffKey === buffKey) {
        this.setData({
          showTooltip: false,
          activeBuffKey: null
        });
      } else {
        const query = wx.createSelectorQuery().in(this);
        query.select(`.buff-item[data-index="${index}"]`).boundingClientRect(rect => {
          if (rect) {
            const tooltipContent = `${buff.displayName} - 剩余${buff.remainingTimes}回合`;
            this.setData({
              showTooltip: true,
              tooltipLeft: rect.left + rect.width / 2,
              tooltipTop: rect.top - 20,
              tooltipContent,
              activeBuffKey: buffKey
            });
          }
        }).exec();
      }
    },

    onTooltipTap() {
      this.setData({
        showTooltip: false,
        activeBuffKey: null
      });
    }
  }
});