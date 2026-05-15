<template>
  <div class="app">
    <Transition name="fade">
      <div v-if="showSaveSuccess" class="save-success-notification">
        ✓ 游戏已保存
      </div>
    </Transition>
    
    <button 
      v-if="gamePhase === 'playing'" 
      class="menu-button"
      @click="showSaveModal = true"
    >
      ⚙️
    </button>
    
    <StartScreen v-if="gamePhase === 'start'" @start="handleStart" @load="handleLoadGame" />
    
    <template v-else>
      <main class="game-container">
        <div v-if="gamePhase === 'ended'" class="game-over-overlay">
          <div class="victory-animation">
            <div class="trophy">🏆</div>
            <h2 class="victory-title">🎉 游戏结束！</h2>
            <p class="victory-message">恭喜 <span class="winner-name">{{ winner?.name }}</span> 获胜！</p>
          </div>
          <div class="game-over-buttons">
            <button class="btn btn-primary" @click="restartGame">重新开始</button>
            <button class="btn btn-secondary" @click="returnToHome">返回主页</button>
          </div>
        </div>
        
        <div class="game-play">
          <section class="game-board-section">
            <GameBoard
              :map-tiles="mapTiles"
              :players="players"
              :properties="properties"
              :current-player-index="currentPlayerIndex"
              :selecting-property-for-free="selectingPropertyForFree"
              :bombs="bombs"
              :placing-bomb="placingBomb"
              :auction-property="auctionState?.isAuctioning ? auctionState?.property : null"
              :property-effect-tile="propertyEffectTile"
              :show-dice="!isRolling && !showDiceResult && !currentPlayer?.inJail"
              :current-player="currentPlayer"
              :auction-success-message="auctionSuccessMessage"
              :has-items="hasItems"
              @select-free-property="selectFreeProperty"
              @place-bomb="placeBomb"
              @cancel-bomb="cancelPlaceBomb"
              @roll-dice="rollDice"
              @use-item="openItemUseModal"
            />
            
            <div v-if="isDiceAnimating || showDiceResult" class="dice-overlay">
              <div class="dice-animation-container">
                <div class="dice-number" :class="{ rolling: isDiceAnimating, stopped: !isDiceAnimating && showDiceResult }">
                  <span class="dice-value">{{ currentDiceValue }}</span>
                </div>
                <div class="dice-label">{{ isDiceAnimating ? '🎲 掷骰子中...' : '🎲 掷出了 ' + currentDiceValue + ' 点！' }}</div>
              </div>
            </div>
          </section>
          
          <section class="players-panel-section">
            <div class="players-container">
              <PlayerPanel
                v-for="(player, index) in players"
                :key="player?.id || index"
                :ref="el => { if (el) playerRefs[index] = el }"
                :player="player"
                :is-active="currentPlayerIndex === index"
                :map-tiles="mapTiles"
                :properties="properties"
                :cash-changes="cashChangeNotify.filter(n => n.playerIndex === index)"
                :show-skip-turn="skipTurnPlayerIndex === index"
                :show-buff-activation="buffActivationNotify.show && buffActivationNotify.playerIndex === index"
                :buff-activation-info="buffActivationNotify.info"
                :get-total-property-investment="getTotalPropertyInvestment"
                @use-item="openItemUseModal"
                @open-mortgage="openMortgageModal"
              />
            </div>
          </section>
          
          <!-- 测试界面 - 设置 showTestPanel 为 true 可以显示 -->
          <div class="test-panel" :class="{ hidden: !showTestPanel }">
            <button class="toggle-test-panel" @click="showTestPanel = !showTestPanel">
              {{ showTestPanel ? '隐藏测试' : '显示测试' }}
            </button>
            <div class="test-dice-section" v-if="showTestPanel">
              <div class="test-dice-title">🎲 测试骰子</div>
              <div class="test-dice-grid">
                <button
                  v-for="num in 9"
                  :key="num"
                  class="btn-test-dice"
                  :class="{ disabled: isRolling || !currentPlayer?.name || currentPlayer?.isAI || currentPlayer?.bankrupt }"
                  @click="rollTestDice(num)"
                >
                  {{ num }}
                </button>
              </div>
              
              <div class="test-cards-section">
                <div class="test-cards-title">🃏 测试卡牌</div>
                <div class="test-cards-buttons">
                  <button class="btn-test-card chance" @click="openTestChanceModal">测试机会牌</button>
                  <button class="btn-test-card fate" @click="openTestFateModal">测试命运牌</button>
                </div>
              </div>
              
              <div class="test-money-section">
                <div class="test-money-title">💰 测试现金</div>
                <div class="test-money-buttons">
                  <button class="btn-test-money minus" @click="adjustCurrentPlayerCash(-100)">-100</button>
                  <button class="btn-test-money minus" @click="adjustCurrentPlayerCash(-500)">-500</button>
                  <button class="btn-test-money minus" @click="adjustCurrentPlayerCash(-1000)">-1000</button>
                  <button class="btn-test-money plus" @click="adjustCurrentPlayerCash(100)">+100</button>
                  <button class="btn-test-money plus" @click="adjustCurrentPlayerCash(500)">+500</button>
                  <button class="btn-test-money plus" @click="adjustCurrentPlayerCash(1000)">+1000</button>
                </div>
              </div>
              
              <div class="test-buff-section">
                <div class="test-buff-title">🎯 测试 Buff</div>
                <div class="test-buff-buttons">
                  <button class="btn-test-buff" @click="addTestBuff('freeRent')">🆓 免租金</button>
                  <button class="btn-test-buff" @click="addTestBuff('bonusSalary')">🎁 年终奖</button>
                  <button class="btn-test-buff" @click="addTestBuff('salaryBoost')">📈 加薪</button>
                  <button class="btn-test-buff" @click="addTestBuff('halfRent')">💸 半价租金</button>
                  <button class="btn-test-buff" @click="addTestBuff('dicePlus')">🎲 骰子+2</button>
                  <button class="btn-test-buff clear" @click="clearAllBuffs">🗑️ 清除所有 Buff</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Modal
        v-if="selectedCard"
        :visible="!!selectedCard"
        :title="selectedCard.type === 'chance' ? '抽到机会卡！' : '抽到命运卡！'"
        @close="handleCloseCard"
      >
        <CardDisplay :card="selectedCard" :card-type="selectedCard.type" />
      </Modal>
      
      <Modal
        :visible="!!propertyModal"
        :title="getPropertyModalTitle()"
        @close="closePropertyModal"
      >
        <template v-if="propertyModal?.type === 'freeProperty'">
          <p>选择一个免费获得的地产：</p>
          <div class="property-list">
            <div
              v-for="[id, prop] in propertyModal.properties"
              :key="id"
              class="property-item"
              @click="getFreeProperty(parseInt(id))"
            >
              {{ mapTiles[parseInt(id) - 1]?.name }}
            </div>
          </div>
        </template>
        <template v-else-if="propertyModal?.type === 'station'">
          <p>支付 {{ STATION_FEE }} 金币传送到另一个车站？</p>
        </template>
        <template v-else-if="propertyModal?.type === 'jail'">
          <p>你进入了监狱！</p>
          <p>是否支付 {{ JAIL_BAIL }} 金币保释金立即出狱？</p>
        </template>
        <template v-else-if="propertyModal?.type === 'fund'">
          <div class="fund-modal">
            <h3 class="fund-title">🏦 社会基金</h3>
            <p class="fund-hint">经过起点时返利 40% ×3次</p>
            <div class="fund-amounts">
              <button
                v-for="amount in FUND_AMOUNTS"
                :key="amount"
                class="fund-btn"
                :class="{ disabled: currentPlayer?.cash < amount }"
                :disabled="currentPlayer?.cash < amount"
                @click="donateToFund(amount)"
              >
                {{ amount }} 金币
                <span class="fund-rebate">返利 {{ Math.floor(amount * 0.4) }}×3</span>
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="property-detail">
            <h3 class="property-name">{{ propertyModal?.tile?.name }}</h3>
            <div class="property-price">
              <span class="price-label">价格</span>
              <span class="price-value">{{ propertyModal?.tile?.price }} 金币</span>
            </div>
            <div class="property-rent">
              <span class="rent-label">租金收益</span>
              <span class="rent-range">{{ Math.ceil(propertyModal?.tile?.price * 0.1) }} - {{ Math.floor(propertyModal?.tile?.price * 1.5) }} 金币</span>
              <span class="rent-hint">（随等级提升）</span>
            </div>
          </div>
        </template>
        <template #footer>
          <button v-if="propertyModal?.type === 'station'" class="btn btn-primary" @click="confirmStationTeleport">传送</button>
          <button v-else-if="propertyModal?.type === 'jail'" class="btn btn-primary" @click="confirmPayBail">缴纳保释金</button>
          <button v-else-if="propertyModal?.tile" class="btn btn-primary" @click="confirmBuyProperty">购买</button>
          <button v-if="propertyModal?.type === 'fund'" class="btn btn-secondary" @click="skipFundDonation">拒绝捐款</button>
          <button v-if="propertyModal?.type !== 'fund'" class="btn btn-secondary" @click="closePropertyModal">取消</button>
        </template>
      </Modal>
      
      <Modal
        :visible="!!upgradeModal"
        :title="upgradeModal?.upgradeAmount ? '免费升级！' : '升级地产'"
        @close="closeUpgradeModal"
      >
        <template v-if="upgradeModal?.upgradeAmount">
          <p>选择一个地产免费升级：</p>
          <div class="property-list">
            <div
              v-for="[id, prop] in getPlayerProperties()"
              :key="id"
              class="property-item"
              :class="{ disabled: prop.level >= 3 }"
              @click="freeUpgradeProperty(parseInt(id))"
            >
              {{ mapTiles[parseInt(id) - 1]?.name }} (Lv.{{ prop.level }})
            </div>
          </div>
        </template>
        <template v-else>
          <p>{{ upgradeModal?.tile?.name }} - 当前等级: Lv.{{ upgradeModal?.prop?.level }}</p>
          <p v-if="upgradeModal?.prop?.level < 3">升级费用: {{ getUpgradeCost() }} 金币</p>
          <p v-else>已达到最高等级！</p>
        </template>
        <template #footer>
          <button v-if="upgradeModal?.tile && upgradeModal?.prop?.level < 3" class="btn btn-primary" @click="confirmUpgradeProperty">升级</button>
          <button class="btn btn-secondary" @click="closeUpgradeModal">取消</button>
        </template>
      </Modal>
      
      <Modal
        :visible="!!testChanceModal"
        title="📋 选择机会牌"
        @close="closeTestChanceModal"
      >
        <div class="card-select-list">
          <div
            v-for="card in chanceCards"
            :key="card.id"
            class="card-select-item"
            @click="applyTestChanceCard(card.id)"
          >
            <span class="card-type" :class="card.type">{{ card.type === 'good' ? '✨' : card.type === 'bad' ? '💀' : '⚪' }}</span>
            <span class="card-title">{{ card.id }}. {{ card.title }}</span>
            <span class="card-desc">{{ card.description }}</span>
          </div>
        </div>
      </Modal>
      
      <Modal
        :visible="!!testFateModal"
        title="🔮 选择命运牌"
        @close="closeTestFateModal"
      >
        <div class="card-select-list">
          <div
            v-for="card in fateCards"
            :key="card.id"
            class="card-select-item"
            @click="applyTestFateCard(card.id)"
          >
            <span class="card-type" :class="card.type">{{ card.type === 'good' ? '✨' : card.type === 'bad' ? '💀' : '⚪' }}</span>
            <span class="card-title">{{ card.id }}. {{ card.title }}</span>
            <span class="card-desc">{{ card.description }}</span>
          </div>
        </div>
      </Modal>
      
      <Modal
        :visible="casinoModal"
        title="🎰 赌场"
        :hide-close-button="true"
        @close="closeCasinoModal"
      >
        <div class="casino-content">
          <div v-if="showWheel && !casinoResult" class="casino-wheel-view">
            <div class="lottery-numbers">
              <div 
                v-for="num in 6" 
                :key="num" 
                class="lottery-number"
                :class="{ selected: isSpinning && selectedNumber === num, highlighted: !isSpinning && selectedNumber === num }"
              >
                {{ num }}
              </div>
            </div>
          </div>
          
          <div v-else-if="casinoResult" class="casino-result-view">
            <div class="result-card">
              <div class="result-icon">{{ casinoResult.win ? '🎉' : '😢' }}</div>
              <div class="result-number">{{ casinoResult.number }}</div>
              <div class="result-text" :class="casinoResult.win ? 'win' : 'lose'">
                {{ casinoResult.win ? '恭喜中奖！' : '很遗憾！' }}
              </div>
              <div class="result-amount">{{ casinoResult.win ? '+' : '-' }}{{ casinoResult.amount }} 金币</div>
              <button class="btn btn-primary" @click="handleCasinoResultClose">确定</button>
            </div>
          </div>
          
          <div v-else class="casino-bet-view">
            <div class="bet-section">
              <label>选择下注金额：</label>
              <div class="bet-buttons">
                <button
                  v-for="amount in [100, 200, 300]"
                  :key="amount"
                  class="btn-bet"
                  :class="{ active: betAmount === amount, disabled: currentPlayer?.cash < amount }"
                  :disabled="currentPlayer?.cash < amount"
                  @click="betAmount = amount"
                >
                  {{ amount }}
                </button>
              </div>
            </div>
            
            <div class="guess-section">
              <p>选择猜单双：</p>
              <div class="btn-group">
                <button class="btn btn-primary" @click="submitCasinoBet('oddEven', 'odd')">猜单</button>
                <button class="btn btn-primary" @click="submitCasinoBet('oddEven', 'even')">猜双</button>
              </div>
            </div>
            
            <div class="guess-section">
              <p>或选择猜数字（1-6）：</p>
              <div class="number-grid">
                <button
                  v-for="num in 6"
                  :key="num"
                  class="btn btn-number"
                  @click="submitCasinoBet('number', num.toString())"
                >
                  {{ num }}
                </button>
              </div>
            </div>
            
            <div class="cancel-section">
              <button class="btn btn-cancel" @click="closeCasinoModal">取消</button>
            </div>
          </div>
        </div>
      </Modal>
      
      <Modal
        :visible="shopModal"
        title="🛒 道具店"
        :hide-close-button="true"
      >
        <div class="shop-content">
          <div class="shop-item" :class="{ selected: selectedShopItem === key }" v-for="(item, key) in shopItems" :key="key" @click="selectShopItem(key)">
            <div class="shop-item-icon">{{ item.icon }}</div>
            <div class="shop-item-info">
              <div class="shop-item-name">{{ item.name }}</div>
              <div class="shop-item-desc">{{ item.description }}</div>
              <div class="shop-item-price">💰 {{ item.price }}</div>
            </div>
          </div>
        </div>
        <template #footer>
          <button class="btn btn-primary" :disabled="!selectedShopItem" @click="confirmBuyShopItem">购买</button>
          <button class="btn btn-secondary" @click="closeShopModal">取消</button>
        </template>
      </Modal>
      
      <Modal
        :visible="!!itemUseModal"
        :title="itemUseModal?.type === 'remoteDice' ? '🎲 选择骰子点数' : itemUseModal?.type === 'bomb' ? '💣 确认安放炸弹' : '🎒 使用道具'"
        @close="closeItemUseModal"
      >
        <template v-if="itemUseModal?.type === 'remoteDice'">
          <p>选择你要掷出的点数：</p>
          <div class="dice-grid">
            <button
              v-for="num in 9"
              :key="num"
              class="btn btn-dice-num"
              @click="confirmRemoteDice(num)"
            >
              {{ num }}
            </button>
          </div>
        </template>
        <template v-else-if="itemUseModal?.type === 'bomb'">
          <p>确定要使用炸弹吗？使用后你将点击地图上的格子安放炸弹。</p>
          <p class="bomb-hint">💡 提示：选择一个格子放置炸弹，其他玩家踩到会被送入监狱！</p>
        </template>
        <template v-else>
          <p>选择要使用的道具：</p>
          <div class="item-list">
            <div 
              v-if="currentPlayer?.inventory?.remoteDice > 0" 
              class="item-item"
              @click="useItem('remoteDice')"
            >
              <span>🎲</span>
              <span>遥控骰子</span>
              <span>×{{ currentPlayer.inventory.remoteDice }}</span>
            </div>
            <div 
              v-if="currentPlayer?.inventory?.bomb > 0" 
              class="item-item"
              @click="useItem('bomb')"
            >
              <span>💣</span>
              <span>炸弹</span>
              <span>×{{ currentPlayer.inventory.bomb }}</span>
            </div>
            <div 
              v-if="currentPlayer?.inventory?.lottery > 0" 
              class="item-item"
              @click="useLottery()"
            >
              <span>🎫</span>
              <span>彩票</span>
              <span>×{{ currentPlayer.inventory.lottery }}</span>
            </div>
          </div>
        </template>
        <template #footer v-if="itemUseModal?.type === 'bomb'">
          <button class="btn btn-primary" @click="startPlaceBomb">确定安放</button>
          <button class="btn btn-secondary" @click="closeItemUseModal">取消</button>
        </template>
      </Modal>
      
      <Modal
        :visible="lotteryModal"
        title="🎫 刮刮乐彩票"
        :hide-close-button="true"
      >
        <LotteryScratch 
          v-if="lotteryResult"
          :patterns="lotteryResult.patterns"
          :prize="lotteryResult.prize"
          @close="closeLotteryModal"
        />
      </Modal>
      
      <Modal
        :visible="auctionModal"
        :title="`🎪 拍卖: ${auctionState?.property?.name || ''}`"
        :hide-close-button="true"
      >
        <div class="auction-content">
          <div class="auction-property">
            <div class="auction-property-name">{{ auctionState?.property?.name }}</div>
            <div class="auction-property-price">原价: {{ auctionState?.property?.price }} 金币</div>
          </div>
          
          <div class="auction-status">
            <div class="auction-bid-info">
              <span class="bid-label">当前出价:</span>
              <span class="bid-amount">{{ auctionState?.currentBid || 0 }} 金币</span>
            </div>
            <div v-if="auctionState?.currentBidder !== null" class="auction-leader">
              当前领先: {{ players.find(p => p.id === auctionState.currentBidder)?.name }}
            </div>
          </div>
          
          <div class="auction-participants">
            <div class="participants-title">参与玩家</div>
            <div class="participants-list">
              <div
                v-for="player in auctionState?.playerOrder"
                :key="player.id"
                class="participant-item"
                :class="{
                  active: auctionState?.currentPlayerIndex !== undefined && 
                    auctionState.playerOrder[auctionState.currentPlayerIndex]?.id === player.id,
                  passed: auctionState?.passedPlayers?.includes(player.id),
                  bankrupt: player.bankrupt,
                  cannotBid: !player.bankrupt && !auctionState?.passedPlayers?.includes(player.id) && 
                    player.cash < (auctionState?.currentBidder === null ? auctionState?.startingPrice : auctionState?.currentBid + 20)
                }"
              >
                <div class="participant-left">
                  <span class="participant-name">{{ player.name }}</span>
                  <span v-if="auctionState?.passedPlayers?.includes(player.id)" class="participant-badge passed-badge">✗</span>
                  <span v-else-if="player.bankrupt" class="participant-badge bankrupt-badge">💀</span>
                  <span v-else-if="!player.bankrupt && !auctionState?.passedPlayers?.includes(player.id) && 
                    player.cash < (auctionState?.currentBidder === null ? auctionState?.startingPrice : auctionState?.currentBid + 20)" 
                    class="participant-badge cannot-bid-badge">✗</span>
                  <span v-else-if="auctionState?.currentPlayerIndex !== undefined && 
                    auctionState.playerOrder[auctionState.currentPlayerIndex]?.id === player.id" 
                    class="participant-badge active-badge">🎯</span>
                </div>
                <div class="participant-center">
                  <span class="participant-cash">💰 {{ player.cash }}</span>
                </div>
                <div class="participant-right">
                  <span v-if="auctionState?.passedPlayers?.includes(player.id)" class="participant-status-text">已放弃</span>
                  <span v-else-if="player.bankrupt" class="participant-status-text">破产</span>
                  <span v-else-if="!player.bankrupt && !auctionState?.passedPlayers?.includes(player.id) && 
                    player.cash < (auctionState?.currentBidder === null ? auctionState?.startingPrice : auctionState?.currentBid + 20)" 
                    class="participant-status-text">资金不足</span>
                  <span v-else-if="auctionState?.currentPlayerIndex !== undefined && 
                    auctionState.playerOrder[auctionState.currentPlayerIndex]?.id === player.id" 
                    class="participant-status-text">竞价中</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="isPlayerTurn()" class="auction-actions">
            <div class="auction-input-section">
              <label>出价金额:</label>
              <input
                type="number"
                v-model.number="auctionBidAmount"
                :min="auctionState?.currentBidder === null ? auctionState?.startingPrice : auctionState?.currentBid + 20"
                :max="auctionState?.playerOrder[auctionState?.currentPlayerIndex]?.cash"
                class="auction-input"
              />
              <div class="auction-input-hint">{{ auctionState?.currentBidder === null ? `起拍价 ${auctionState?.startingPrice} 金币` : '每次加价不得少于 20 金币' }}</div>
            </div>
            
            <div class="auction-buttons">
              <button 
                class="btn btn-primary btn-bid"
                :disabled="!canBid()"
                @click="submitBid"
              >
                出价
              </button>
              <button 
                class="btn btn-success btn-quick-bid"
                :disabled="!canQuickBid()"
                @click="submitQuickBid"
              >
                {{ auctionState?.currentBidder === null ? '一键出价' : '一键加价' }}
              </button>
              <button 
                class="btn btn-secondary btn-pass"
                @click="submitPass"
              >
                放弃
              </button>
            </div>
          </div>
          
          <div v-else-if="auctionState?.isAIProcessing" class="auction-waiting">
            <div class="waiting-text">AI正在考虑出价...</div>
            <div class="waiting-spinner"></div>
          </div>
          
          <div v-else-if="auctionState?.isAuctioning" class="auction-waiting">
            <div class="waiting-text">等待其他玩家出价...</div>
            <div class="waiting-spinner"></div>
          </div>
          
          <div v-else class="auction-result">
            <div v-if="auctionState?.currentBidder !== null" class="result-win">
              <div class="result-icon">🎉</div>
              <div class="result-text">恭喜 {{ players.find(p => p.id === auctionState.currentBidder)?.name }} 拍得地产！</div>
              <div class="result-amount">成交价: {{ auctionState?.currentBid }} 金币</div>
            </div>
            <div v-else class="result-lose">
              <div class="result-icon">⏰</div>
              <div class="result-text">流拍！无人出价</div>
            </div>
          </div>
        </div>
      </Modal>
      
      <Modal
        :visible="mortgageModal"
        title="🏦 地产抵押管理"
        @close="closeMortgageModal"
      >
        <div class="mortgage-content">
          <p v-if="mortgagePlayer">
            {{ mortgagePlayer.name }} 的地产列表
          </p>
          <div v-if="getPlayerPropertiesList(mortgagePlayer?.id)?.length === 0" class="no-properties">
            <p>暂无地产可抵押</p>
          </div>
          <div v-else class="property-list">
            <div 
              v-for="item in getPlayerPropertiesList(mortgagePlayer?.id)" 
              :key="item.id" 
              class="property-item"
            >
              <div class="property-info">
                <div class="property-name">{{ item.tile.name }}</div>
                <div class="property-details">
                  <span>总投入: {{ item.totalInvestment }} 金币</span>
                  <span>Lv.{{ item.prop.level }}</span>
                </div>
                <div class="mortgage-value">抵押可得: {{ item.mortgageValue }} 金币 (70%)</div>
              </div>
              <button 
                class="btn btn-primary" 
                @click="handleMortgage(item.id)"
              >
                抵押
              </button>
            </div>
          </div>
        </div>
        <template #footer>
          <button class="btn btn-secondary" @click="closeMortgageModal">关闭</button>
        </template>
      </Modal>

      <Modal
        :visible="liquidationModal"
        title="⚠️ 强制清算警告"
      >
        <div v-if="liquidationState.player" class="liquidation-content">
          <p class="liquidation-warning">{{ liquidationState.player.name }} 当前现金为 {{ liquidationState.originalCash }}，低于 -500，需要强制清算地产！</p>
          <div class="liquidation-info">
            <p>清算后现金将变为 {{ liquidationState.finalCash }}</p>
          </div>
          <div class="liquidation-properties">
            <p>将被清算的地产：</p>
            <div v-for="item in liquidationState.properties" :key="item.id" class="liquidation-property-item">
              <span>{{ item.tile?.name || `地产${item.id}` }}</span>
              <span>清算价值: {{ item.liquidationValue }} 金币</span>
            </div>
          </div>
        </div>
        <template #footer>
          <button class="btn btn-danger" @click="confirmLiquidation">确认清算</button>
        </template>
      </Modal>
      
      <SaveLoadModal
        v-if="showSaveModal"
        mode="save"
        @close="showSaveModal = false"
        @confirm="handleSaveGame"
      />
      
      <SaveLoadModal
        v-if="showLoadModal"
        mode="load"
        @close="showLoadModal = false"
        @confirm="handleLoadGame"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import GameBoard from './components/GameBoard.vue';
import PlayerPanel from './components/PlayerPanel.vue';
import GameControls from './components/GameControls.vue';
import Modal from './components/Modal.vue';
import CardDisplay from './components/CardDisplay.vue';
import StartScreen from './components/StartScreen.vue';
import LotteryScratch from './components/LotteryScratch.vue';
import SaveLoadModal from './components/SaveLoadModal.vue';
import { useGameState } from './composables/useGameState';
import { STATION_FEE, JAIL_BAIL, SHOP_ITEMS, chanceCards, fateCards } from './data/gameConfig';
import { saveGame, AUTO_SAVE_SLOT } from './utils/saveManager';
const gameState = useGameState();

const {
  players,
  currentPlayer,
  currentPlayerIndex,
  gamePhase,
  round,
  message,
  diceResult,
  isRolling,
  refreshKey,
  selectedCard,
  casinoModal,
  propertyModal,
  upgradeModal,
  shopModal,
  itemUseModal,
  lotteryModal,
  lotteryResult,
  placingBomb,
  bombs,
  propertyEffectTile,
  selectingPropertyForFree,
  properties,
  mapTiles,
  turnHistory,
  auctionModal,
  auctionState,
  fundModal,
  initPlayers,
  liquidationModal,
  liquidationState,
  addHistory,
  setOnCashChangeCallback,
  setOnSkipTurnCallback,
  setOnBuffActivationCallback,
  setOnAuctionSuccessCallback,
  rollDiceWithValue,
  rollDiceWithRemoteValue,
  movePlayer,
  buyProperty,
  selectFreeProperty,
  upgradeProperty,
  stationTeleport,
  confirmStationTeleport,
  casinoBet,
  payBail,
  endTurn,
  closeCardModal,
  winner,
  triggerCashChange,
  buyShopItem,
  closeLotteryModal,
  useItem,
  confirmRemoteDice,
  startPlaceBomb,
  cancelPlaceBomb,
  placeBomb,
  placeBid,
  passAuction,
  closeAuctionModal,
  mortgageProperty,
  getPlayerPropertiesList,
  mortgageModal,
  testChanceCard,
  testFateCard,
  donateToFund,
  skipFundDonation,
  FUND_AMOUNTS,
  adjustCurrentPlayerCash,
  checkBankruptcyAndLiquidate
} = gameState;

const rollDiceFn = gameState.rollDice;

const shopItems = SHOP_ITEMS;

const hasItems = computed(() => {
  const inventory = currentPlayer.value?.inventory;
  return inventory && (inventory.remoteDice > 0 || inventory.bomb > 0 || inventory.lottery > 0);
});

const betAmount = ref(100);
const cashChangeNotify = ref([]);
const skipTurnPlayerIndex = ref(-1);
const playerRefs = ref([]);
const isSpinning = ref(false);
const wheelAngle = ref(0);
const casinoResult = ref(null);
const showWheel = ref(false);
const selectedNumber = ref(0);
const selectedShopItem = ref(null);
const auctionBidAmount = ref(0);
const mortgagePlayer = ref(null);
const testChanceModal = ref(false);
const testFateModal = ref(false);
const showTestPanel = ref(false);
const currentDiceValue = ref(1);
const showDiceResult = ref(false);
const isDiceAnimating = ref(false);
const buffActivationNotify = ref({ show: false, info: '', playerIndex: -1 });
const auctionSuccessMessage = ref('');
const showSaveModal = ref(false);
const showLoadModal = ref(false);
const showSaveSuccess = ref(false);
const hasMadeMove = ref(false);
let diceInterval = null;

const { importSaveData } = gameState;

onMounted(() => {
  gamePhase.value = 'start';
});

function handleStart({ humanCount, aiCount }) {
  initPlayers(humanCount, aiCount);
  setupCallbacks();
  hasMadeMove.value = false;
  gamePhase.value = 'playing';
}

function handleLoadGame(saveData) {
  importSaveData(saveData);
  setupCallbacks();
  gamePhase.value = 'playing';
}

function setupCallbacks() {
  setOnCashChangeCallback((amount, playerIndex) => {
    const notificationId = Date.now() + Math.random();
    cashChangeNotify.value.push({ id: notificationId, amount, playerIndex });
    setTimeout(() => {
      cashChangeNotify.value = cashChangeNotify.value.filter(n => n.id !== notificationId);
    }, 3000);
  });
  setOnSkipTurnCallback((playerIndex) => {
    skipTurnPlayerIndex.value = playerIndex;
    setTimeout(() => {
      skipTurnPlayerIndex.value = -1;
    }, 3000);
  });
  setOnBuffActivationCallback((buffName, playerIndex, playerName) => {
    let info = '';
    if (buffName === 'hallProtection') {
      info = '👑 我是市长，谁敢拦我！';
    }
    buffActivationNotify.value = { show: true, info, playerIndex };
    setTimeout(() => {
      buffActivationNotify.value = { show: false, info: '', playerIndex: -1 };
    }, 3000);
  });
  setOnAuctionSuccessCallback((winnerName, propertyName) => {
    auctionSuccessMessage.value = `🎉 恭喜 ${winnerName} 竞拍成功 ${propertyName}！`;
    setTimeout(() => {
      auctionSuccessMessage.value = '';
    }, 4000);
  });
}

function autoSave() {
  if (gamePhase.value === 'playing') {
    saveGame(AUTO_SAVE_SLOT, gameState);
  }
}

function handleSaveGame(slotIndex) {
  saveGame(slotIndex, gameState);
  showSaveModal.value = false;
  showSaveSuccessNotification();
}

function showSaveSuccessNotification() {
  showSaveSuccess.value = true;
  setTimeout(() => {
    showSaveSuccess.value = false;
  }, 2000);
}

function restartGame() {
  gamePhase.value = 'start';
}

function startDiceAnimation(shouldMove = false) {
  const finalDiceValue = Math.floor(Math.random() * 9) + 1;
  showDiceResult.value = false;
  isDiceAnimating.value = true;
  currentDiceValue.value = 1;
  let count = 0;
  const maxCount = 15;
  if (diceInterval) {
    clearInterval(diceInterval);
  }
  diceInterval = setInterval(() => {
    currentDiceValue.value = Math.floor(Math.random() * 9) + 1;
    count++;
    if (count >= maxCount) {
      clearInterval(diceInterval);
      diceInterval = null;
      isDiceAnimating.value = false;
      currentDiceValue.value = finalDiceValue;
      diceResult.value = finalDiceValue;
      showDiceResult.value = true;
      
      setTimeout(() => {
        showDiceResult.value = false;
        if (shouldMove) {
          rollDiceWithValue(finalDiceValue);
        }
      }, 1000);
    }
  }, 50);
}

function returnToHome() {
  gamePhase.value = 'start';
}

function openItemUseModal() {
  itemUseModal.value = { type: 'select' };
}

function openMortgageModal(player) {
  mortgagePlayer.value = player;
  mortgageModal.value = true;
}

function closeMortgageModal() {
  mortgageModal.value = false;
  mortgagePlayer.value = null;
}

function confirmLiquidation() {
  if (liquidationState.onConfirm) {
    liquidationState.onConfirm();
  }
}

function handleMortgage(propertyId) {
  if (mortgagePlayer.value) {
    mortgageProperty(propertyId);
  }
}

function closeItemUseModal() {
  itemUseModal.value = false;
}

function closeShopModal() {
  shopModal.value = false;
  selectedShopItem.value = null;
  endTurn();
}

function selectShopItem(key) {
  const item = shopItems[key];
  if (currentPlayer.value && currentPlayer.value.cash >= item.price) {
    selectedShopItem.value = key;
  }
}

function confirmBuyShopItem() {
  if (selectedShopItem.value) {
    buyShopItem(selectedShopItem.value);
    selectedShopItem.value = null;
  }
}

function useLottery() {
  currentPlayer.value.inventory.lottery--;
  buyShopItem('lottery');
}

function getPropertyModalTitle() {
  if (propertyModal.value?.type === 'freeProperty') return '免费获得地产！';
  if (propertyModal.value?.type === 'station') return '车站传送';
  if (propertyModal.value?.type === 'jail') return '🏛️ 监狱';
  return '购买地产';
}

function closePropertyModal() {
  const type = propertyModal.value?.type;
  propertyModal.value = false;
  if (type === 'jail') {
    endTurn();
  } else {
    endTurn();
  }
}

function confirmPayBail() {
  payBail();
}

function handleCloseCard() {
  closeCardModal();
}

function confirmBuyProperty() {
  if (propertyModal.value?.tile) {
    buyProperty(propertyModal.value.tile);
  }
  propertyModal.value = false;
}

function confirmUpgradeProperty() {
  if (upgradeModal.value?.tile) {
    upgradeProperty(upgradeModal.value.tile);
  }
  upgradeModal.value = false;
}

function closeUpgradeModal() {
  upgradeModal.value = false;
  endTurn();
}

function closeCasinoModal() {
  if (casinoResult.value) {
    const result = casinoResult.value;
    if (result.win) {
      currentPlayer.value.cash += result.amount;
      triggerCashChange(result.amount);
    } else {
      currentPlayer.value.cash -= result.amount;
      triggerCashChange(-result.amount);
      if (currentPlayer.value.cash < 0) {
        checkBankruptcyAndLiquidate(currentPlayer.value);
      }
    }
  }
  casinoModal.value = false;
  casinoResult.value = null;
  isSpinning.value = false;
  
  endTurn();
}

function getPlayerProperties() {
  return Object.entries(properties).filter(([id, prop]) => 
    prop.owner === currentPlayer.value.id
  );
}

function getUpgradeCost() {
  if (!upgradeModal.value?.tile || !upgradeModal.value?.prop) return 0;
  const level = upgradeModal.value.prop.level;
  const price = upgradeModal.value.tile.price;
  switch (level) {
    case 0: return Math.ceil(price * 0.5);
    case 1: return Math.floor(price * 1.0);
    case 2: return Math.floor(price * 2.0);
    default: return 0;
  }
}

function freeUpgradeProperty(id) {
  const prop = properties[id];
  if (prop && prop.level < 3) {
    const upgradeAmount = upgradeModal.value?.upgradeAmount || 1;
    prop.level = Math.min(3, prop.level + upgradeAmount);
    message.value = `${mapTiles[id - 1]?.name} 免费升级到 Lv.${prop.level}！`;
    upgradeModal.value = false;
    selectedCard.value = null;
    endTurn();
  }
}

function getFreeProperty(id) {
  const prop = properties[id];
  if (prop && prop.owner === null) {
    prop.owner = currentPlayer.value.id;
    prop.investment = mapTiles[id - 1]?.price || 0;
    message.value = `免费获得 ${mapTiles[id - 1]?.name}！`;
    propertyModal.value = false;
    selectedCard.value = null;
    endTurn();
  }
}

function submitBet(type, guess) {
  if (betAmount.value > 0 && currentPlayer.value?.cash >= betAmount.value) {
    casinoBet(betAmount.value, type, guess);
  }
}

function submitCasinoBet(type, guess) {
  if (isSpinning.value || casinoResult.value) return;
  
  if (betAmount.value > 0 && currentPlayer.value?.cash >= betAmount.value) {
    const resultNumber = Math.floor(Math.random() * 6) + 1;
    
    isSpinning.value = true;
    showWheel.value = true;
    casinoResult.value = null;
    selectedNumber.value = 0;
    
    let currentIndex = 0;
    let speed = 80;
    const slowDownThreshold = 20;
    let count = 0;
    
    const rollInterval = setInterval(() => {
      currentIndex = (currentIndex % 6) + 1;
      selectedNumber.value = currentIndex;
      count++;
      
      if (count > slowDownThreshold) {
        speed += 20;
        clearInterval(rollInterval);
        setTimeout(() => {
          startSlowRoll(resultNumber, type, guess);
        }, speed);
      }
    }, speed);
    
    function startSlowRoll(targetNumber, gameType, userGuess) {
      let current = selectedNumber.value;
      let steps = 0;
      const maxSteps = 12;
      
      const slowRollInterval = setInterval(() => {
        current = (current % 6) + 1;
        selectedNumber.value = current;
        steps++;
        
        if (steps >= maxSteps && current === targetNumber) {
          clearInterval(slowRollInterval);
          isSpinning.value = false;
          selectedNumber.value = targetNumber;
          
          setTimeout(() => {
            let win = false;
            let winAmount = betAmount.value;
            
            if (gameType === 'oddEven') {
              const isOdd = targetNumber % 2 === 1;
              win = (userGuess === 'odd' && isOdd) || (userGuess === 'even' && !isOdd);
              if (win) {
                winAmount = betAmount.value * 2;
              }
            } else if (gameType === 'number') {
              win = targetNumber.toString() === userGuess;
              if (win) {
                winAmount = betAmount.value * 6;
              }
            }
            
            const finalResult = {
              number: targetNumber,
              win,
              amount: win ? winAmount : betAmount.value
            };
            
            casinoResult.value = finalResult;
          }, 1000);
        }
      }, 150);
    }
  }
}

function handleCasinoResultClose() {
  const result = casinoResult.value;
  if (result) {
    if (result.win) {
      currentPlayer.value.cash += result.amount;
      triggerCashChange(result.amount);
    } else {
      currentPlayer.value.cash -= result.amount;
      triggerCashChange(-result.amount);
      if (currentPlayer.value.cash < 0) {
        checkBankruptcyAndLiquidate(currentPlayer.value);
      }
    }
  }
  
  casinoModal.value = false;
  casinoResult.value = null;
  isSpinning.value = false;
  showWheel.value = false;
  
  endTurn();
}

function rollDice() {
  if (currentPlayer.value?.inJail) {
    endTurn();
    return;
  }
  hasMadeMove.value = true;
  startDiceAnimation(true);
}

function isPlayerTurn() {
  if (!auctionState?.playerOrder || auctionState.playerOrder.length === 0) return false;
  if (!auctionState.isAuctioning || auctionState.isAIProcessing) return false;
  
  const currentAuctionPlayer = auctionState.playerOrder[auctionState.currentPlayerIndex];
  
  if (!currentAuctionPlayer || currentAuctionPlayer.isAI || currentAuctionPlayer.bankrupt) {
    return false;
  }
  
  if (auctionState.passedPlayers.includes(currentAuctionPlayer.id)) {
    return false;
  }
  
  return true;
}

function canBid() {
  const auctionPlayer = auctionState?.playerOrder[auctionState?.currentPlayerIndex];
  if (!auctionBidAmount.value || !auctionPlayer || auctionPlayer.bankrupt) return false;
  
  let minBid;
  if (auctionState.currentBidder === null) {
    minBid = auctionState.startingPrice;
  } else {
    minBid = auctionState.currentBid + 20;
  }
  
  return auctionBidAmount.value >= minBid && auctionBidAmount.value <= auctionPlayer.cash;
}

function canQuickBid() {
  const auctionPlayer = auctionState?.playerOrder[auctionState?.currentPlayerIndex];
  if (!auctionPlayer || auctionPlayer.bankrupt) return false;
  
  let quickBidAmount;
  if (auctionState.currentBidder === null) {
    quickBidAmount = auctionState.startingPrice;
  } else {
    quickBidAmount = auctionState.currentBid + 20;
  }
  
  return quickBidAmount <= auctionPlayer.cash;
}

function submitQuickBid() {
  const auctionPlayer = auctionState?.playerOrder[auctionState?.currentPlayerIndex];
  if (!canQuickBid() || !auctionPlayer) return;
  
  let quickBidAmount;
  if (auctionState.currentBidder === null) {
    quickBidAmount = auctionState.startingPrice;
  } else {
    quickBidAmount = auctionState.currentBid + 20;
  }
  
  placeBid(auctionPlayer, quickBidAmount);
  auctionBidAmount.value = 0;
}

function submitBid() {
  const auctionPlayer = auctionState?.playerOrder[auctionState?.currentPlayerIndex];
  if (!canBid() || !auctionPlayer) return;
  placeBid(auctionPlayer, auctionBidAmount.value);
  auctionBidAmount.value = 0;
}

function submitPass() {
  const auctionPlayer = auctionState?.playerOrder[auctionState?.currentPlayerIndex];
  if (!auctionPlayer || auctionPlayer.bankrupt) return;
  passAuction(auctionPlayer);
}

function rollTestDice(value) {
  if (isRolling.value) return;
  if (currentPlayer.value?.inJail) {
    endTurn();
    return;
  }
  rollDiceWithValue(value);
}

function openTestChanceModal() {
  testChanceModal.value = true;
}

function closeTestChanceModal() {
  testChanceModal.value = false;
}

function applyTestChanceCard(cardId) {
  testChanceModal.value = false;
  testChanceCard(cardId);
}

function openTestFateModal() {
  testFateModal.value = true;
}

function closeTestFateModal() {
  testFateModal.value = false;
}

function applyTestFateCard(cardId) {
  testFateModal.value = false;
  testFateCard(cardId);
}

function addTestBuff(buffName) {
  if (!currentPlayer.value) return;
  if (!currentPlayer.value.buffs) {
    currentPlayer.value.buffs = [];
  }
  const existingBuff = currentPlayer.value.buffs.find(b => b.name === buffName);
  if (existingBuff) {
    existingBuff.duration += 3;
  } else {
    currentPlayer.value.buffs.push({
      name: buffName,
      duration: 3
    });
  }
}

function clearAllBuffs() {
  if (!currentPlayer.value) return;
  currentPlayer.value.buffs = [];
}

watch(currentPlayerIndex, () => {
  if (currentPlayer.value?.isAI && gamePhase.value === 'playing') {
    setTimeout(() => {
      if (!currentPlayer.value?.bankrupt && !currentPlayer.value?.inJail) {
        rollDiceFn();
      } else {
        endTurn();
      }
    }, 1000);
  }
});

watch(currentPlayerIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex && gamePhase.value === 'playing' && hasMadeMove.value) {
    autoSave();
  }
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100vh;
}

.property-detail {
  color: white;
  text-align: center;
}

.property-name {
  font-size: 20px;
  font-weight: bold;
  margin: 0 0 16px 0;
  color: #FFD700;
}

.property-price {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 215, 0, 0.15);
  border-radius: 8px;
  margin-bottom: 12px;
}

.price-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.price-value {
  font-size: 24px;
  font-weight: bold;
  color: #FFD700;
}

.property-rent {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(76, 175, 80, 0.15);
  border-radius: 8px;
}

.rent-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.rent-range {
  font-size: 18px;
  font-weight: bold;
  color: #4CAF50;
}

.rent-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.fund-modal {
  color: white;
  text-align: center;
}

.fund-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 8px 0;
  color: #4CAF50;
}

.fund-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 12px 0;
}

.fund-amounts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fund-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.fund-btn:hover:not(.disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3);
}

.fund-btn.disabled {
  background: #4a5568;
  cursor: not-allowed;
  opacity: 0.6;
}

.fund-rebate {
  font-size: 11px;
  font-weight: normal;
  opacity: 0.7;
  margin-left: 6px;
  color: #C8E6C9;
}

.app::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.app-header {
  text-align: center;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.app-header h1 {
  color: white;
  margin: 0;
  font-size: 40px;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4);
  font-weight: bold;
  letter-spacing: 2px;
  animation: title-float 3s ease-in-out infinite;
}

@keyframes title-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.game-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

.game-play {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.game-board-section {
  flex: 0 0 83%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 10px;
  overflow: hidden;
}

.players-panel-section {
  flex: 0 0 18%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 25px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 2px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.players-container {
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  width: 100%;
  max-width: 100%;
  gap: 15px;
  padding: 0;
}

.players-container .player-panel {
  flex: 1;
  min-width: 180px;
  max-width: 320px;
  animation: slideInFromBottom 0.6s ease-out;
}

.players-container .player-panel.no-buffs {
  max-width: 220px;
}

@keyframes slideInFromBottom {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.dice-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.bomb-hint {
  font-size: 12px;
  color: rgba(255, 215, 0, 0.8);
  background: rgba(255, 215, 0, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 8px;
}

.dice-animation-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  animation: fadeInScale 0.3s ease-out;
}

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.dice-number {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 10px 40px rgba(255, 215, 0, 0.5), 0 0 60px rgba(255, 165, 0, 0.3);
  border: 4px solid rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.dice-number.rolling {
  animation: dice-shake 0.1s ease-in-out infinite;
}

.dice-number.stopped {
  animation: dice-bounce-land 0.5s ease-out;
}

@keyframes dice-shake {
  0%, 100% {
    transform: translateX(0) rotate(0deg) scale(1);
  }
  25% {
    transform: translateX(-8px) rotate(-3deg) scale(1.02);
  }
  75% {
    transform: translateX(8px) rotate(3deg) scale(0.98);
  }
}

@keyframes dice-bounce-land {
  0% {
    transform: scale(1.3);
    opacity: 0.8;
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.dice-value {
  font-size: 72px;
  font-weight: bold;
  color: #1a1a2e;
  text-shadow: 3px 3px 6px rgba(255, 255, 255, 0.6);
  transition: all 0.06s ease;
}

.dice-number.rolling .dice-value {
  animation: dice-number-bounce 0.1s ease-in-out infinite;
}

@keyframes dice-number-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

.dice-label {
  font-size: 24px;
  color: white;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.btn-dice-confirm {
  padding: 15px 40px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  margin-top: 10px;
}

.btn-dice-confirm:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.5);
}

.btn-dice-confirm:active {
  transform: translateY(-1px);
}

.game-footer {
  padding: 20px;
  position: relative;
  z-index: 1;
}

.game-over-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  text-align: center;
}

.victory-animation {
  animation: fadeInUp 1s ease-out;
}

.trophy {
  font-size: 120px;
  animation: bounce 2s ease-in-out infinite, rotate 3s linear infinite;
  margin-bottom: 20px;
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5));
}

.victory-title {
  font-size: 48px;
  margin-bottom: 16px;
  animation: pulse-glow 1.5s ease-in-out infinite;
  text-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
}

.victory-message {
  font-size: 24px;
  margin-bottom: 30px;
}

.winner-name {
  color: #FFD700;
  font-weight: bold;
  font-size: 32px;
  animation: winner-pulse 1s ease-in-out infinite;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
}

.game-over-buttons {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  animation: fadeInUp 1s ease-out 0.5s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

@keyframes rotate {
  from {
    transform: rotateY(0deg);
  }
  to {
    transform: rotateY(360deg);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    text-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
  }
  50% {
    text-shadow: 0 0 60px rgba(255, 215, 0, 1), 0 0 100px rgba(255, 215, 0, 0.5);
  }
}

@keyframes winner-pulse {
  0%, 100% {
    transform: scale(1);
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  }
  50% {
    transform: scale(1.1);
    text-shadow: 0 0 40px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.5);
  }
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a2e;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.menu-button {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
}

.save-success-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(76, 175, 80, 0.9);
  color: white;
  border-radius: 12px;
  font-weight: bold;
  z-index: 2000;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-success {
  background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
  color: white;
}

.btn-success:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.property-item {
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: background 0.3s ease;
}

.property-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.property-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.casino-content {
  color: white;
  text-align: center;
}

.casino-wheel-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.lottery-numbers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.lottery-number {
  width: 70px;
  height: 70px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%);
  border: 2px solid rgba(255, 215, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  color: #FFD700;
  transition: all 0.3s ease;
  cursor: pointer;
}

.lottery-number:hover {
  transform: scale(1.05);
  border-color: #FFD700;
}

.lottery-number.selected {
  animation: pulse 0.3s ease;
  border-color: #4CAF50;
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
}

.lottery-number.highlighted {
  transform: scale(1.2);
  border-color: #FFD700;
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.4);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 165, 0, 0.3) 100%);
  animation: winPulse 0.5s ease infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes winPulse {
  0%, 100% {
    box-shadow: 0 0 25px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.4);
  }
  50% {
    box-shadow: 0 0 40px rgba(255, 215, 0, 1), 0 0 70px rgba(255, 215, 0, 0.6);
  }
}

.casino-result-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.result-card {
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 215, 0, 0.3);
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.result-card .result-number {
  font-size: 72px;
  color: #FFD700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  margin-bottom: 16px;
}

.result-card .result-text {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 12px;
}

.result-card .result-text.win {
  color: #4CAF50;
}

.result-card .result-text.lose {
  color: #f44336;
}

.result-card .result-amount {
  font-size: 32px;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 24px;
}

.casino-bet-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}



.result-number {
  font-size: 48px;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 10px;
}

.result-text {
  font-size: 20px;
  margin-bottom: 10px;
}

.result-text.win {
  color: #4CAF50;
}

.result-text.lose {
  color: #f44336;
}

.result-amount {
  font-size: 24px;
  font-weight: bold;
}

.bet-section {
  margin-bottom: 0;
}

.bet-section label {
  display: block;
  margin-bottom: 8px;
}

.bet-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-bet {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  border: 2px solid #FFD700;
  background: rgba(255, 215, 0, 0.1);
  color: #FFD700;
  transition: all 0.3s ease;
}

.btn-bet:hover:not(.disabled) {
  background: rgba(255, 215, 0, 0.3);
}

.btn-bet.active {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a2e;
}

.btn-bet.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #666;
  color: #666;
}

.guess-section {
  margin-bottom: 24px;
}

.guess-section p {
  margin-bottom: 12px;
}

.btn-group {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.btn-number {
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s ease;
}

.btn-number:hover {
  background: rgba(255, 255, 255, 0.2);
}

.cancel-section {
  margin-top: 20px;
  text-align: center;
}

.btn-cancel {
  padding: 12px 36px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

.test-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
}

.toggle-test-panel {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.toggle-test-panel:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.test-panel.hidden .toggle-test-panel {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

.test-dice-section {
  margin-top: 10px;
  width: 280px;
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  padding: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.test-dice-title {
  font-size: 14px;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 12px;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.test-dice-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 6px;
}

.btn-test-dice {
  padding: 10px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-test-dice:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
}

.btn-test-dice.disabled {
  background: rgba(100, 100, 100, 0.5);
  cursor: not-allowed;
  opacity: 0.5;
}

.test-cards-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.test-cards-title {
  font-size: 14px;
  font-weight: bold;
  color: #E0E0E0;
  margin-bottom: 12px;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.test-cards-buttons {
  display: flex;
  gap: 8px;
}

.btn-test-card {
  flex: 1;
  padding: 10px;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-test-card.chance {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
}

.btn-test-card.fate {
  background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
}

.btn-test-card:hover {
  transform: translateY(-2px);
}

.test-buff-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed rgba(255, 255, 255, 0.2);
}

.test-buff-title {
  font-size: 14px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 10px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.test-buff-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.btn-test-buff {
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 165, 0, 0.2) 100%);
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-test-buff:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(255, 165, 0, 0.4) 100%);
  transform: translateY(-1px);
}

.btn-test-buff.clear {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.3) 0%, rgba(229, 57, 45, 0.2) 100%);
  border-color: rgba(244, 67, 54, 0.5);
}

.btn-test-buff.clear:hover {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.5) 0%, rgba(229, 57, 45, 0.4) 100%);
}

.card-select-list {
  max-height: 400px;
  overflow-y: auto;
}

.card-select-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.card-select-item:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%);
  border-color: rgba(255, 255, 255, 0.3);
}

.card-type {
  font-size: 20px;
}

.card-title {
  font-weight: bold;
  color: #FFFFFF;
  flex: 1;
}

.card-desc {
  color: #AAAAAA;
  font-size: 12px;
  flex: 2;
}

.shop-content {
  display: flex;
  flex-direction: row;
  gap: 16px;
  justify-content: center;
  padding: 10px 0;
}

.shop-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
}

.shop-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.shop-item.selected {
  transform: translateY(-4px);
  border-color: #FFD700;
  box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.15) 100%);
}

.shop-item-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.shop-item-info {
  text-align: center;
}

.shop-item-name {
  font-size: 14px;
  font-weight: bold;
  color: white;
  margin-bottom: 4px;
}

.shop-item-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  max-width: 120px;
}

.shop-item-price {
  font-size: 14px;
  font-weight: bold;
  color: #FFD700;
}

.lottery-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.scratch-card-container {
  position: relative;
  width: 300px;
  height: 150px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.scratch-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  z-index: 2;
}

.scratch-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  transition: opacity 0.5s ease;
}

.scratch-overlay.revealed {
  opacity: 0;
  pointer-events: none;
}

.scratch-text {
  font-size: 28px;
  font-weight: bold;
  color: #666;
  text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.5);
}

.lottery-patterns-reveal {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  z-index: 0;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lottery-patterns-display {
  display: flex;
  gap: 8px;
}

.lottery-pattern-reveal {
  font-size: 32px;
  animation: popIn 0.3s ease;
}

@keyframes popIn {
  0% { transform: scale(0); }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.lottery-prize {
  font-size: 18px;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  animation: pulse 1s infinite;
}

.lottery-prize.no-prize {
  color: #888;
  animation: none;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
}

.item-item:hover {
  transform: translateX(4px);
  border-color: #7E57C2;
  box-shadow: 0 4px 12px rgba(126, 87, 194, 0.3);
}

.item-item span:first-child {
  font-size: 28px;
}

.item-item span:nth-child(2) {
  flex: 1;
  font-size: 14px;
  font-weight: bold;
  color: white;
}

.item-item span:last-child {
  font-size: 12px;
  color: #7E57C2;
  background: rgba(126, 87, 194, 0.2);
  padding: 4px 8px;
  border-radius: 8px;
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 8px;
}

.btn-dice-num {
  padding: 16px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn-dice-num:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(76, 175, 80, 0.4);
}

.btn-dice-num:active {
  transform: translateY(0);
}

.auction-content {
  color: white;
}

.auction-property {
  text-align: center;
  padding: 10px 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.auction-property-name {
  font-size: 18px;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 2px;
}

.auction-property-price {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.auction-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 10px;
}

.auction-bid-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.bid-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.bid-amount {
  font-size: 22px;
  font-weight: bold;
  color: #FFD700;
}

.auction-leader {
  font-size: 12px;
  color: #4CAF50;
  font-weight: 500;
}

.auction-participants {
  margin-bottom: 10px;
}

.participants-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 6px;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participant-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.participant-item.active {
  background: rgba(255, 215, 0, 0.15);
  border-color: rgba(255, 215, 0, 0.4);
}

.participant-item.passed,
.participant-item.bankrupt,
.participant-item.cannotBid {
  opacity: 0.6;
}

.participant-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-badge {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
}

.active-badge {
  background: rgba(255, 215, 0, 0.3);
  color: #FFD700;
  animation: pulse 1s infinite;
}

.passed-badge,
.cannot-bid-badge {
  background: rgba(255, 99, 71, 0.3);
  color: #FF6347;
}

.bankrupt-badge {
  background: rgba(128, 128, 128, 0.3);
  color: #888;
}

.participant-center {
  flex: 1;
  text-align: center;
}

.participant-cash {
  font-size: 13px;
  font-weight: bold;
  color: #FFD700;
}

.participant-right {
  flex: 1;
  text-align: right;
}

.participant-status-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
}

.active-indicator {
  background: rgba(255, 215, 0, 0.3);
  color: #FFD700;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.auction-actions {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.auction-input-section {
  margin-bottom: 10px;
}

.auction-input-section label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 6px;
}

.auction-input {
  width: 100%;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 14px;
  text-align: center;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}

.auction-input:focus {
  outline: none;
  border-color: #FFD700;
}

.auction-input-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  margin-top: 4px;
}

.auction-buttons {
  display: flex;
  gap: 12px;
}

.btn-bid {
  flex: 2;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
}

.btn-bid:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.btn-pass {
  flex: 1;
  background: linear-gradient(135deg, #f44336 0%, #da190b 100%);
  color: white;
}

.btn-pass:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
}

.auction-waiting {
  text-align: center;
  padding: 32px;
}

.waiting-text {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
}

.waiting-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #FFD700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auction-result {
  text-align: center;
  padding: 32px;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.result-text {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.result-win .result-text {
  color: #4CAF50;
}

.result-lose .result-text {
  color: #f44336;
}

.result-amount {
  font-size: 16px;
  color: #FFD700;
  font-weight: bold;
}

.mortgage-content {
  color: white;
}

.mortgage-content .property-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.mortgage-content .property-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.mortgage-content .property-info {
  flex: 1;
}

.mortgage-content .property-name {
  font-size: 18px;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 8px;
}

.mortgage-content .property-details {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.mortgage-content .mortgage-value {
  font-size: 14px;
  color: #4CAF50;
  font-weight: bold;
}

.no-properties {
  text-align: center;
  padding: 32px;
  color: rgba(255, 255, 255, 0.6);
}
</style>