Component({
  properties: {
    mode: {
      type: String,
      value: 'save'
    }
  },

  data: {
    saveSlots: [],
    selectedSlot: null
  },

  lifetimes: {
    attached() {
      this.setData({
        selectedSlot: this.properties.mode === 'save' ? 1 : null
      });
      this.refreshSaves();
    }
  },

  observers: {
    'mode': function(val) {
      this.setData({
        selectedSlot: val === 'save' ? 1 : null
      });
    }
  },

  methods: {
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return year + '/' + month + '/' + day + ' ' + hour + ':' + minute;
    },

    selectSlot(e) {
      const index = e.currentTarget.dataset.index;
      if (!this.data.saveSlots[index]?.timestamp && this.properties.mode === 'load') return;
      this.setData({ selectedSlot: index });
    },

    confirmAction() {
      if (this.data.selectedSlot !== null) {
        this.triggerEvent('confirm', { slotIndex: this.data.selectedSlot });
      }
    },

    onClose() {
      this.triggerEvent('close');
    },

    preventBubble() {},

    refreshSaves() {
      try {
        const saveInfo = wx.getStorageSync('gameSaveInfo') || [];
        const formatted = saveInfo.map(item => ({
          ...item,
          formattedTime: this.formatTime(item.timestamp)
        }));
        this.setData({ saveSlots: formatted });
      } catch (e) {
        this.setData({ saveSlots: [] });
      }
    }
  }
});
