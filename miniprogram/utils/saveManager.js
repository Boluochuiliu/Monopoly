const GAME_VERSION = '1.0.0';
const AUTO_SAVE_SLOT = 0;
const MAX_SAVE_SLOTS = 4;

function saveGame(slotIndex, gameState) {
  try {
    const saveData = {
      timestamp: Date.now(),
      version: GAME_VERSION,
      data: {
        players: JSON.parse(JSON.stringify(gameState.players)),
        currentPlayerIndex: gameState.currentPlayerIndex,
        round: gameState.round,
        properties: JSON.parse(JSON.stringify(gameState.properties)),
        bombs: JSON.parse(JSON.stringify(gameState.bombs)),
        chanceDeck: [...gameState.chanceDeck],
        fateDeck: [...gameState.fateDeck],
        globalBuffs: JSON.parse(JSON.stringify(gameState.globalBuffs)),
        turnHistory: JSON.parse(JSON.stringify(gameState.turnHistory)),
        auctionState: JSON.parse(JSON.stringify(gameState.auctionState))
      }
    };
    wx.setStorageSync(`monopoly_save_${slotIndex}`, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

function loadGame(slotIndex) {
  try {
    const saveData = wx.getStorageSync(`monopoly_save_${slotIndex}`);
    if (!saveData) return null;

    const parsed = JSON.parse(saveData);

    if (parsed.version !== GAME_VERSION) {
      console.warn('Save file version mismatch');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

function getSaveInfo(slotIndex) {
  try {
    const saveData = wx.getStorageSync(`monopoly_save_${slotIndex}`);
    if (!saveData) return null;

    const parsed = JSON.parse(saveData);
    return {
      timestamp: parsed.timestamp,
      version: parsed.version,
      playerCount: parsed.data.players.length,
      round: parsed.data.round
    };
  } catch (error) {
    console.error('Failed to get save info:', error);
    return null;
  }
}

function deleteSave(slotIndex) {
  wx.removeStorageSync(`monopoly_save_${slotIndex}`);
}

function hasAutoSave() {
  return wx.getStorageSync(`monopoly_save_${AUTO_SAVE_SLOT}`) !== '';
}

function getAllSaveInfo() {
  const saves = [];
  for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
    const info = getSaveInfo(i);
    saves.push({
      slotIndex: i,
      isAuto: i === AUTO_SAVE_SLOT,
      ...(info || {})
    });
  }
  return saves;
}

module.exports = {
  GAME_VERSION,
  AUTO_SAVE_SLOT,
  MAX_SAVE_SLOTS,
  saveGame,
  loadGame,
  getSaveInfo,
  deleteSave,
  hasAutoSave,
  getAllSaveInfo
}