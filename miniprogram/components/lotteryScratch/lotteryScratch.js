Component({
  properties: {
    patterns: {
      type: Array,
      value: []
    },
    prize: {
      type: Number,
      value: 0
    }
  },

  data: {
    isRevealed: false,
    isScratching: false,
    canvasWidth: 320,
    canvasHeight: 220
  },

  lifetimes: {
    attached() {
      this.initCanvas();
    }
  },

  observers: {
    'patterns': function() {
      this.setData({ isRevealed: false });
      this.initCanvas();
    }
  },

  methods: {
    initCanvas() {
      const query = this.createSelectorQuery();
      query.select('#scratchCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return;
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;

          canvas.width = this.data.canvasWidth * dpr;
          canvas.height = this.data.canvasHeight * dpr;
          ctx.scale(dpr, dpr);

          const gradient = ctx.createLinearGradient(0, 0, this.data.canvasWidth, this.data.canvasHeight);
          gradient.addColorStop(0, '#C8C8C8');
          gradient.addColorStop(0.5, '#B8B8B8');
          gradient.addColorStop(1, '#C8C8C8');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);

          ctx.fillStyle = '#999';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👆 刮开查看', this.data.canvasWidth / 2, this.data.canvasHeight / 2);

          ctx.globalCompositeOperation = 'destination-out';
          this._ctx = ctx;
          this._canvas = canvas;
        });
    },

    onTouchStart(e) {
      this.setData({ isScratching: true });
      this.doScratch(e.touches[0]);
    },

    onTouchMove(e) {
      if (!this.data.isScratching) return;
      this.doScratch(e.touches[0]);
    },

    onTouchEnd() {
      this.setData({ isScratching: false });
    },

    doScratch(touch) {
      if (!this._ctx) return;

      const query = this.createSelectorQuery();
      query.select('.scratch-card').boundingClientRect((rect) => {
        if (!rect) return;
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (x >= 0 && x <= this.data.canvasWidth && y >= 0 && y <= this.data.canvasHeight) {
          this._ctx.beginPath();
          this._ctx.arc(x, y, 20, 0, Math.PI * 2);
          this._ctx.fill();

          this.checkRevealed();
        }
      }).exec();
    },

    checkRevealed() {
      if (this.data.isRevealed || !this._ctx) return;

      const imageData = this._ctx.getImageData(0, 0, this.data.canvasWidth, this.data.canvasHeight);
      const pixels = imageData.data;
      let transparentPixels = 0;

      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 128) {
          transparentPixels++;
        }
      }

      const totalPixels = pixels.length / 4;
      const scratchPercent = (transparentPixels / totalPixels) * 100;

      if (scratchPercent > 80) {
        this.setData({ isRevealed: true });
      }
    },

    onClose() {
      this.triggerEvent('close');
    }
  }
});
