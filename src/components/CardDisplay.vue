<template>
  <div class="card-display">
    <div class="card-wrapper" :class="cardType">
      <div class="card-type-label">{{ cardType === 'chance' ? '机会' : '命运' }}</div>
      <div class="card-icon">{{ cardType === 'chance' ? '🎲' : '🌟' }}</div>
      <h4 class="card-title">{{ card.title }}</h4>
      <p class="card-description">{{ card.description }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  card: {
    type: Object,
    required: true
  },
  cardType: {
    type: String,
    required: true
  }
});
</script>

<style scoped>
.card-display {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.card-wrapper {
  width: 280px;
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  animation: flipIn 0.6s ease;
}

@keyframes flipIn {
  from { transform: rotateY(90deg); opacity: 0; }
  to { transform: rotateY(0); opacity: 1; }
}

.card-wrapper.chance {
  background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
}

.card-wrapper.fate {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
}

.card-type-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 24px;
  color: white;
  margin: 0 0 12px 0;
}

.card-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

@media (max-height: 500px) {
  .card-display {
    padding: 16px;
  }

  .card-wrapper {
    width: 200px !important;
    padding: 16px !important;
    border-radius: 12px !important;
  }

  .card-type-label {
    font-size: 10px !important;
    margin-bottom: 8px !important;
    letter-spacing: 1px !important;
  }

  .card-icon {
    font-size: 32px !important;
    margin-bottom: 10px !important;
  }

  .card-title {
    font-size: 17px !important;
    margin-bottom: 8px !important;
  }

  .card-description {
    font-size: 11px !important;
    line-height: 1.5 !important;
  }
}
</style>
