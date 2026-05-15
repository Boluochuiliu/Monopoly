export const GAME_VERSION = '1.0.0';
export const AUTO_SAVE_SLOT = 0;
export const MAX_SAVE_SLOTS = 4;

export function saveGame(slotIndex, gameState) {
  try {
    const saveData = {
      timestamp: Date.now(),
      version: GAME_VERSION,
      data: {
        players: JSON.parse(JSON.stringify(gameState.players.value)),
        currentPlayerIndex: gameState.currentPlayerIndex.value,
        round: gameState.round.value,
        properties: JSON.parse(JSON.stringify(gameState.properties)),
        bombs: JSON.parse(JSON.stringify(gameState.bombs)),
        chanceDeck: [...gameState.chanceDeck.value],
        fateDeck: [...gameState.fateDeck.value],
        globalBuffs: JSON.parse(JSON.stringify(gameState.globalBuffs.value)),
        turnHistory: JSON.parse(JSON.stringify(gameState.turnHistory.value)),
        auctionState: JSON.parse(JSON.stringify(gameState.auctionState))
      }
    };
    localStorage.setItem(`monopoly_save_${slotIndex}`, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

export function loadGame(slotIndex) {
  try {
    const saveData = localStorage.getItem(`monopoly_save_${slotIndex}`);
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

export function getSaveInfo(slotIndex) {
  try {
    const saveData = localStorage.getItem(`monopoly_save_${slotIndex}`);
    if (!saveData) return null;
    
    const parsed = JSON.parse(saveData);
    return {
      timestamp: parsed.timestamp,
      version: parsed.version,
      playerCount: parsed.data.players.length,
      round: parsed.data.round
    };
  } catch (error) {
    return null;
  }
}

export function deleteSave(slotIndex) {
  localStorage.removeItem(`monopoly_save_${slotIndex}`);
}

export function hasAutoSave() {
  return localStorage.getItem(`monopoly_save_${AUTO_SAVE_SLOT}`) !== null;
}

export function getAllSaveInfo() {
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