/**
 * LUCKY DICE GAME LOGIC — NOVA ARCADE SUITE
 * 3D Rolling Cube • 50% Win Rate Calibration • 10 Daily Plays Limit + Watch Ad
 */

const GAME_ID = 'lucky_dice';
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 5;

let balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let currentBet = 20;
let diceStreak = 0;
let isRollingDice = false;
let soundEnabled = true;

// Web Audio API Synthesizer
let synth = null;
let noiseSynth = null;

function initAudio() {
  if (!synth && window.Tone) {
    try {
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 }
      }).toDestination();
      noiseSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
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
  const el = document.getElementById('coinBalance');
  if (el) el.innerText = balance.toLocaleString();
  updateActionButtonState();
}

function saveBalance() {
  localStorage.setItem('task_game_coins', Math.max(0, balance).toString());
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'BALANCES_UPDATED', timestamp: Date.now() });
    bc.close();
  } catch (e) {}
}

function addFreeCoins() {
  playTone('win');
  balance += 200;
  saveBalance();
  updateBalanceUI();
  showToast('Bonus Credited', '+200 Free Coins added to your pouch!', '🎁');
  if (window.confetti) confetti({ particleCount: 35, spread: 60, origin: { y: 0.2 } });
}

// Daily Plays Tracker (10 Free Plays / Day)
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPlaysUsedToday() {
  const key = `lucky_plays_${GAME_ID}_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function getBonusPlaysToday() {
  const key = `lucky_bonus_${GAME_ID}_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function getRemainingPlays() {
  const totalAllowed = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const used = getPlaysUsedToday();
  return Math.max(0, totalAllowed - used);
}

function recordPlayUsed() {
  const key = `lucky_plays_${GAME_ID}_${getTodayKey()}`;
  const used = getPlaysUsedToday() + 1;
  localStorage.setItem(key, used.toString());
  updateDailyPlaysUI();
}

function grantBonusPlays(count = BONUS_PLAYS_PER_AD) {
  const key = `lucky_bonus_${GAME_ID}_${getTodayKey()}`;
  const current = getBonusPlaysToday() + count;
  localStorage.setItem(key, current.toString());
  updateDailyPlaysUI();
}

function updateDailyPlaysUI() {
  const remaining = getRemainingPlays();
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const display = document.getElementById('dailyPlaysDisplay');
  if (display) {
    display.innerText = `${remaining}/${total}`;
    display.style.color = remaining <= 0 ? '#ef4444' : '#38bdf8';
  }
  updateActionButtonState();
}

function checkDailyPlaysClick() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
  } else {
    showToast('Daily Free Plays', `${getRemainingPlays()} free plays remaining today.`, '🎯');
  }
}

// Action Button State
function updateActionButtonState() {
  const btn = document.getElementById('btnRollDice');
  if (!btn) return;

  const remaining = getRemainingPlays();
  if (remaining <= 0) {
    btn.innerText = '▶ Watch Ad to Play (0/10)';
    btn.style.background = 'linear-gradient(135deg, #facc15 0%, #eab308 100%)';
    btn.style.color = '#451a03';
  } else if (balance < currentBet) {
    btn.innerText = 'Buy coins (+200 Free)';
    btn.style.background = 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)';
    btn.style.color = '#07090e';
  } else {
    btn.innerText = 'Roll Dice';
    btn.style.background = 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)';
    btn.style.color = '#07090e';
  }
}

// Bet Chip Selector: 10, 20, 50, 100
function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(1000, Math.max(10, amount));
  const betEl = document.getElementById('currentBetDisplay');
  if (betEl) betEl.innerText = currentBet;
  updateActiveChipUI();
  updateActionButtonState();
}

function halveBet() { setBet(Math.floor(currentBet / 2)); }
function doubleBet() { setBet(currentBet * 2); }

function updateActiveChipUI() {
  document.querySelectorAll('.bet-chip').forEach(btn => {
    const val = parseInt(btn.dataset.val || btn.innerText, 10);
    if (val === currentBet) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Toast
function showToast(title, msg, icon = '🎲') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
}

// 3D Dice Rotations
const DICE_ROTATIONS = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: 0, y: 90 },
  5: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 }
};
const DICE_MULTIPLIERS = { 1: 0, 2: 0.3, 3: 0.6, 4: 1.2, 5: 1.5, 6: 2 };

// Primary Action Click Dispatcher
function handleDiceAction() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }
  if (balance < currentBet) {
    addFreeCoins();
    return;
  }
  rollDiceGame();
}

// 50% Win Rate Calibrated Dice Roll
function rollDiceGame() {
  if (isRollingDice) return;

  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }

  if (balance < currentBet) {
    showToast('Insufficient Coins', 'Claimed free refill coins!', '🎁');
    addFreeCoins();
    return;
  }

  isRollingDice = true;
  recordPlayUsed();
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const cube = document.getElementById('cube');

  // Exact 50% Win Rate Calibration:
  // 50% Win: Faces 4 (x1.2), 5 (x1.5), 6 (x2.0)
  // 50% Loss: Faces 1 (x0), 2 (x0.3), 3 (x0.6)
  const isWin = Math.random() < 0.50;
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

    if (rolledFace === 6) {
      diceStreak++;
    } else {
      diceStreak = 0;
    }
    updateStreakUI();

    let wonAmount = Math.round(currentBet * baseMult);
    if (diceStreak === 3) {
      wonAmount = Math.round(currentBet * 7); // Jackpot x7
      diceStreak = 0;
      updateStreakUI();
      if (window.confetti) confetti({ particleCount: 120, spread: 80 });
      playTone('jackpot');
      showToast('JACKPOT!', `Three Sixes in a row! Paid ×7 (+${wonAmount} 🪙)`, '🔥');
    } else if (baseMult > 1) {
      playTone('win');
      showToast('Winner!', `Rolled a ${rolledFace}! Paid ×${baseMult} (+${wonAmount} 🪙)`, '🎉');
    } else if (baseMult > 0) {
      playTone('win');
      showToast('Face ' + rolledFace, `Paid ×${baseMult} (+${wonAmount} 🪙)`, '🎲');
    } else {
      playTone('lose');
      showToast('Rolled a One', 'Face 1 pays ×0. Better luck next roll!', '💀');
    }

    balance += wonAmount;
    saveBalance();
    updateBalanceUI();
  }, 1200);
}

function updateStreakUI() {
  const dots = document.getElementById('streakDots')?.children;
  if (!dots) return;
  for (let i = 0; i < 3; i++) {
    if (i < diceStreak) {
      dots[i].classList.add('active');
    } else {
      dots[i].classList.remove('active');
    }
  }
}

// Rules Sheet Modal (Exact match to Image 1)
function toggleInfoModal() {
  playTone('click');
  const sheet = document.getElementById('infoModalSheet');
  const overlay = document.getElementById('infoModalOverlay');
  if (!sheet || !overlay) return;

  const isOpen = sheet.classList.contains('open');
  if (isOpen) {
    sheet.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 280);
  } else {
    overlay.style.display = 'block';
    setTimeout(() => { sheet.classList.add('open'); }, 10);
  }
}

// Watch Ad Modal System (Daily Play Limit)
let isWatchingAd = false;
let adCountdownInterval = null;

function openAdModal() {
  playTone('click');
  const overlay = document.getElementById('adModalOverlay');
  const sheet = document.getElementById('adModalSheet');
  const initialView = document.getElementById('adInitialView');
  const playerView = document.getElementById('adPlayerView');
  if (!sheet || !overlay) return;

  if (initialView) initialView.style.display = 'block';
  if (playerView) playerView.style.display = 'none';

  overlay.style.display = 'block';
  sheet.classList.add('show');
}

function closeAdModal() {
  if (isWatchingAd) return; // Prevent early close while watching
  playTone('click');
  const overlay = document.getElementById('adModalOverlay');
  const sheet = document.getElementById('adModalSheet');
  if (sheet) sheet.classList.remove('show');
  if (overlay) setTimeout(() => { overlay.style.display = 'none'; }, 250);
}

function startWatchingAd() {
  if (isWatchingAd) return;
  isWatchingAd = true;
  playTone('click');

  // Trigger backend ad service to open ad in new tab and record metrics
  if (typeof window.openWatchAd === 'function') {
    window.openWatchAd({ game: GAME_ID, rewardPlays: BONUS_PLAYS_PER_AD });
  }

  const initialView = document.getElementById('adInitialView');
  const playerView = document.getElementById('adPlayerView');
  const timerText = document.getElementById('adTimerText');
  const progressFill = document.getElementById('adProgressFill');

  if (initialView) initialView.style.display = 'none';
  if (playerView) playerView.style.display = 'block';

  let secondsLeft = 5;
  if (timerText) timerText.innerText = `Reward in ${secondsLeft}s...`;
  if (progressFill) progressFill.style.width = '0%';

  const startTime = Date.now();
  const totalDuration = 5000;

  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const pct = Math.min(100, (elapsed / totalDuration) * 100);
    if (progressFill) progressFill.style.width = `${pct}%`;
  }, 50);

  adCountdownInterval = setInterval(() => {
    secondsLeft--;
    playTone('tick');
    if (timerText) timerText.innerText = secondsLeft > 0 ? `Reward in ${secondsLeft}s...` : 'Reward Unlocked! 🎉';

    if (secondsLeft <= 0) {
      clearInterval(adCountdownInterval);
      clearInterval(progressInterval);
      isWatchingAd = false;

      // Credit +5 Bonus Plays
      grantBonusPlays(BONUS_PLAYS_PER_AD);
      if (window.confetti) confetti({ particleCount: 75, spread: 70 });
      playTone('jackpot');
      showToast('Reward Earned!', '+5 Extra Plays Unlocked! Keep playing!', '🎉');

      setTimeout(() => {
        closeAdModal();
      }, 700);
    }
  }, 1000);
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  updateBalanceUI();
  updateActiveChipUI();
  updateDailyPlaysUI();

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_coins') {
      balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
      updateBalanceUI();
    }
  });

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.onmessage = () => {
      balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
      updateBalanceUI();
    };
  } catch (e) {}
});
