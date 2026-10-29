/**
 * LUCKY DICE GAME LOGIC — EXACT MATCH TO SCREENSHOTS 1 & 2
 * 3D Rolling Cube • Multiplier Tiles with Pip Dots • Six Streak • 50% Win Rate Calibration
 */

const MIN_BET = 30;
const MAX_BET = 2000;
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 10;
let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let currentBet = 50;
let diceStreak = 0;
let isRollingDice = false;
let soundEnabled = true;

// Daily Plays Tracker
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getPlaysUsedToday() {
  const key = `lucky_plays_dice_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getBonusPlaysToday() {
  const key = `lucky_bonus_dice_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getRemainingPlays() {
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const used = getPlaysUsedToday();
  return Math.max(0, total - used);
}
function recordPlayUsed() {
  const key = `lucky_plays_dice_${getTodayKey()}`;
  const used = getPlaysUsedToday() + 1;
  localStorage.setItem(key, used.toString());
}
function grantBonusPlays(count = BONUS_PLAYS_PER_AD) {
  const key = `lucky_bonus_dice_${getTodayKey()}`;
  const current = getBonusPlaysToday() + count;
  localStorage.setItem(key, current.toString());
}

// Dynamic Win Rate Calibration based on Total Star Balance:
// - Low to 100 stars (< 100): 50%
// - 100+ stars (100 to 499): 20%
// - 500+ stars (500 to 999): 10%
// - 1000+ stars (1000+): 5%
function getWinProbability(customBalance) {
  const bal = (typeof customBalance === 'number') ? customBalance : balance;
  if (bal >= 1000) return 0.05;
  if (bal >= 500)  return 0.10;
  if (bal >= 100)  return 0.20;
  return 0.50;
}

// Web Audio API Synthesizer
let synth = null;

function initAudio() {
  if (!synth && window.Tone) {
    try {
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 }
      }).toDestination();
    } catch(e) {}
  }
}

function playTone(type) {
  if (!soundEnabled) return;
  try {
    if (window.Tone && Tone.context.state !== 'running') Tone.start();
    initAudio();
    if (!synth) return;

    if (type === 'click') {
      synth.triggerAttackRelease("C5", "32n", undefined, 0.2);
    } else if (type === 'roll') {
      synth.triggerAttackRelease(["E4", "G4", "C5"], "16n", undefined, 0.3);
    } else if (type === 'win') {
      synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", undefined, 0.5);
    } else if (type === 'jackpot') {
      synth.triggerAttackRelease(["G4", "C5", "E5", "G5", "C6"], "4n", undefined, 0.6);
    } else if (type === 'lose') {
      synth.triggerAttackRelease(["Eb4", "D4", "C4"], "8n", undefined, 0.4);
    } else if (type === 'tick') {
      synth.triggerAttackRelease("A5", "64n", undefined, 0.1);
    }
  } catch (e) {}
}

function toggleSound(checked) {
  soundEnabled = checked;
  if (checked) playTone('tick');
}

// Balance Management
function updateBalanceUI() {
  const userCoins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  const elCoins = document.getElementById('headerCoinDisplay') || document.getElementById('coinBalance');
  const elStars = document.getElementById('headerStarDisplay');

  if (elCoins) elCoins.innerText = userCoins.toLocaleString();
  if (elStars) elStars.innerText = balance.toLocaleString();
  updateActionButtonState();
}

function saveBalance() {
  localStorage.setItem('task_game_stars', Math.max(0, balance).toString());
  localStorage.setItem('user_stars', Math.max(0, balance).toString());
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'BALANCES_UPDATED', stars: balance, timestamp: Date.now() });
    bc.close();
  } catch (e) {}
  if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
    window.firebaseSync.syncPlayerCurrenciesImmediate();
  }
}

function addFreeCoins(amount = 50) {
  playTone('win');
  balance += amount;
  saveBalance();
  updateBalanceUI();
  showToast('Stars Credited', `+${amount} free stars added!`, '⭐');
  if (window.confetti) confetti({ particleCount: 35, spread: 60, origin: { y: 0.2 } });
}

function openBuyCoinsModal() {
  playTone('click');
  const overlay = document.getElementById('buyCoinsModalOverlay');
  const sheet = document.getElementById('buyCoinsModalSheet');
  if (overlay && sheet) {
    overlay.classList.remove('hidden');
    setTimeout(() => sheet.classList.add('open'), 10);
  }
}

function closeBuyCoinsModal() {
  playTone('click');
  const overlay = document.getElementById('buyCoinsModalOverlay');
  const sheet = document.getElementById('buyCoinsModalSheet');
  if (overlay && sheet) {
    sheet.classList.remove('open');
    setTimeout(() => overlay.classList.add('hidden'), 280);
  }
}

function claimFreeRefill() {
  window.location.href = '../home/index.html';
}

function updateActionButtonState() {
  const btn = document.getElementById('primaryPlayBtn');
  if (!btn) return;

  if (balance < currentBet) {
    btn.innerText = 'Buy stars';
    btn.className = 'primary-cta-btn bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.35)]';
  } else {
    btn.innerText = 'Roll';
    btn.className = 'primary-cta-btn bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.35)]';
  }
}

// Bet Controls (Screenshot 2 Match)
function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(MAX_BET, Math.max(MIN_BET, amount));
  const el = document.getElementById('currentBetDisplay');
  if (el) el.innerText = currentBet;
  updateActiveChipUI();
  updateActionButtonState();
}

function halveBet() {
  if (isRollingDice) return;
  setBet(Math.max(MIN_BET, Math.round(currentBet / 2)));
}

function doubleBet() {
  if (isRollingDice) return;
  setBet(Math.min(MAX_BET, currentBet * 2));
}

function updateActiveChipUI() {
  document.querySelectorAll('.bet-pill-btn').forEach(btn => {
    const val = parseInt(btn.getAttribute('data-val') || '0', 10);
    if (val === currentBet) {
      btn.classList.add('active');
      btn.style.borderColor = '#38bdf8';
      btn.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.3)';
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
    }
  });
}

// Rules Sheet Modal Controller (Screenshot 1 Match)
function toggleInfoModal() {
  playTone('click');
  const sheet = document.getElementById('infoModalSheet');
  const overlay = document.getElementById('infoModalOverlay');
  if (!sheet || !overlay) return;

  const isHidden = overlay.classList.contains('hidden');
  if (isHidden) {
    overlay.classList.remove('hidden');
    setTimeout(() => sheet.classList.add('open'), 10);
  } else {
    sheet.classList.remove('open');
    setTimeout(() => overlay.classList.add('hidden'), 280);
  }
}

// Toast System
function showToast(title, msg, icon = '🎲') {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMessage').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.style.display = 'flex';
  toast.classList.remove('-translate-y-48', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-48', 'opacity-0');
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 2600);
}

// Dice Action Handling
function handleDiceAction() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }
  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }
  rollDiceGame();
}

const DICE_ROTATIONS = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: 0, y: 90 },
  5: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 }
};
const DICE_MULTIPLIERS = { 1: 0, 2: 0.3, 3: 0.6, 4: 1.2, 5: 1.5, 6: 2 };

function rollDiceGame() {
  if (isRollingDice) return;
  isRollingDice = true;
  recordPlayUsed();
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const cube = document.getElementById('cube');
  cube.classList.remove('face-pose-3');

  const winProbability = getWinProbability();
  const isWin = Math.random() < winProbability;
  let rolledFace;
  if (isWin) {
    const winFaces = [4, 5, 6];
    rolledFace = winFaces[Math.floor(Math.random() * winFaces.length)];
  } else {
    const loseFaces = [1, 2, 3];
    rolledFace = loseFaces[Math.floor(Math.random() * loseFaces.length)];
  }

  const randomExtraTurnsX = (Math.floor(Math.random() * 3) + 2) * 360;
  const randomExtraTurnsY = (Math.floor(Math.random() * 3) + 2) * 360;
  const targetRotation = DICE_ROTATIONS[rolledFace];

  cube.style.transform = `rotateX(${randomExtraTurnsX + targetRotation.x}deg) rotateY(${randomExtraTurnsY + targetRotation.y}deg)`;

  setTimeout(() => {
    isRollingDice = false;
    const baseMult = DICE_MULTIPLIERS[rolledFace];

    // Highlight rolled multiplier tile
    highlightDiceMultiplierTile(rolledFace);

    if (rolledFace === 6) {
      diceStreak++;
    } else {
      diceStreak = 0;
    }
    updateDiceStreakUI();

    let grossWin = Math.round(currentBet * baseMult);
    if (diceStreak === 3) {
      grossWin = Math.round(currentBet * 7); // Jackpot x7
      diceStreak = 0;
      updateDiceStreakUI();
    }

    let wonAmount = 0;
    let taxAmount = 0;
    if (grossWin > 0) {
      taxAmount = Math.max(1, Math.round(grossWin * 0.001));
      wonAmount = Math.max(0, grossWin - taxAmount);
    }

    if (grossWin >= Math.round(currentBet * 7)) {
      if (window.confetti) confetti({ particleCount: 100, spread: 80 });
      playTone('jackpot');
      showToast('JACKPOT!', `Three Sixes in a row! Paid +${wonAmount} ⭐`, '🔥');
    } else if (baseMult > 1) {
      playTone('win');
      showToast('Winner!', `Rolled a ${rolledFace}! Won +${wonAmount} ⭐`, '🎉');
    } else if (baseMult > 0) {
      playTone('win');
      showToast('Face ' + rolledFace, `Paid ×${baseMult} (+${wonAmount} ⭐)`, '🎲');
    } else {
      playTone('lose');
      showToast('Rolled a One', 'Face 1 pays ×0. Better luck next roll!', '💀');
    }

    balance += wonAmount;
    saveBalance();
    updateBalanceUI();
  }, 1250);
}

function highlightDiceMultiplierTile(faceNum) {
  for (let i = 1; i <= 6; i++) {
    const tile = document.getElementById(`multTile${i}`);
    if (!tile) continue;
    if (i === faceNum) {
      tile.style.borderColor = '#38bdf8';
      tile.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
      tile.style.boxShadow = '0 0 14px rgba(56, 189, 248, 0.4)';
    } else {
      tile.style.borderColor = 'transparent';
      tile.style.backgroundColor = '#171c2a';
      tile.style.boxShadow = 'none';
    }
  }
}

function updateDiceStreakUI() {
  const container = document.getElementById('diceStreakIndicators');
  if (!container) return;
  const indicators = container.children;
  for (let i = 0; i < 3; i++) {
    if (i < diceStreak) {
      indicators[i].classList.add('active');
    } else {
      indicators[i].classList.remove('active');
    }
  }
}

// Modal Helpers
function openBuyCoinsModal() {
  playTone('click');
  document.getElementById('buyCoinsModalOverlay').classList.remove('hidden');
  document.getElementById('buyCoinsModalSheet').classList.add('open');
}
function closeBuyCoinsModal() {
  document.getElementById('buyCoinsModalOverlay').classList.add('hidden');
  document.getElementById('buyCoinsModalSheet').classList.remove('open');
}

function openAdModal() {
  playTone('click');
  const overlay = document.getElementById('adModalOverlay');
  const sheet = document.getElementById('adModalSheet');
  if (overlay && sheet) {
    overlay.classList.remove('hidden');
    setTimeout(() => sheet.classList.add('open'), 10);
  }
}
function closeAdModal() {
  const overlay = document.getElementById('adModalOverlay');
  const sheet = document.getElementById('adModalSheet');
  if (overlay && sheet) {
    sheet.classList.remove('open');
    setTimeout(() => overlay.classList.add('hidden'), 280);
  }
}
function watchAdForMorePlays() {
  window.open('https://otieuche.com/4/8893420', '_blank');
  grantBonusPlays(10);
  closeAdModal();
  updateBalanceUI();
  showToast('Plays Added!', 'Added +10 game plays! Good luck!', '⚡');
}

// DOM Ready & Firebase Balance Synchronization
window.addEventListener('DOMContentLoaded', () => {
  const storedStars = localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars');
  balance = parseInt(storedStars || '0', 10);

  updateBalanceUI();
  setBet(50);

  if (window.lucide) lucide.createIcons();
});

window.addEventListener('balance:changed', (e) => {
  if (e.detail && typeof e.detail.stars === 'number') {
    balance = e.detail.stars;
    updateBalanceUI();
  }
});

window.addEventListener('balance:synced', (e) => {
  if (e.detail && typeof e.detail.stars === 'number') {
    balance = e.detail.stars;
    updateBalanceUI();
  }
});
