Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    hideCloseButton: {
      type: Boolean,
      value: false
    },
    disableOverlayClose: {
      type: Boolean,
      value: false
    }
  },

  data: {
    hasFooter: false
  },

  lifetimes: {
    attached() {
      const slots = this.getRelationNodes('slot');
      this.setData({
        hasFooter: true
      });
    }
  },

  methods: {
    handleOverlayClick() {
      if (this.properties.disableOverlayClose) return;
      this.triggerEvent('close');
    },

    onClose() {
      this.triggerEvent('close');
    },

    preventBubble() {}
  }
});
