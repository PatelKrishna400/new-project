/**
 * COIN FLIP LOGIC — NOVA ARCADE SUITE
 * 3D Coin Rotation • 50% Win Rate Calibration • 10 Plays/Day Limit + Watch Ad
 */

const GAME_ID = 'coin_flip';
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 5;

let balance = parseInt(localStorage.getItem('task_game_coins') || '500', 10);
let currentBet = 20;
let soundEnabled = true;
let coinSelectedSide = 'heads';
let isCoinFlipping = false;

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
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const used = getPlaysUsedToday();
  return Math.max(0, total - used);
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
    display.style.color = remaining <= 0 ? '#ef4444' : '#eab308';
  }
  updateActionButtonState();
}

function checkDailyPlaysClick() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
  } else {
    showToast('Daily Free Plays', `${getRemainingPlays()} free flips remaining today.`, '🎯');
  }
}

function updateActionButtonState() {
  const btn = document.getElementById('btnFlipCoin');
  if (!btn) return;
  const remaining = getRemainingPlays();
  if (remaining <= 0) {
    btn.innerText = '▶ Watch Ad to Play (0/10)';
    btn.style.background = 'linear-gradient(135deg, #facc15 0%, #eab308 100%)';
    btn.style.color = '#451a03';
  } else if (balance < currentBet) {
    btn.innerText = 'Buy Coins (+200 Free)';
    btn.style.background = 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)';
    btn.style.color = '#07090e';
  } else {
    btn.innerText = 'Flip Coin';
    btn.style.background = 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)';
    btn.style.color = '#07090e';
  }
}

function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(1000, Math.max(10, amount));
  const betEl = document.getElementById('currentBetDisplay');
  if (betEl) betEl.innerText = currentBet;
  updateActiveChipUI();
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

function showToast(title, msg, icon = '🪙') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
}

function selectCoinSide(side) {
  playTone('tick');
  coinSelectedSide = side;
  const btnH = document.getElementById('btnHeads');
  const btnT = document.getElementById('btnTails');
  if (btnH) btnH.className = side === 'heads' ? 'coin-pick-btn active' : 'coin-pick-btn';
  if (btnT) btnT.className = side === 'tails' ? 'coin-pick-btn active' : 'coin-pick-btn';
}

// 50% Win Rate Calibrated Coin Flip
function flipCoinGame() {
  if (isCoinFlipping) return;

  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }

  if (balance < currentBet) {
    showToast('Insufficient Coins', 'Claimed free refill coins!', '🎁');
    addFreeCoins();
    return;
  }

  isCoinFlipping = true;
  recordPlayUsed();
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const coinEl = document.getElementById('coinElement');
  const symbolEl = document.getElementById('coinSymbol');

  // Exact 50% Win Rate Calibration:
  const isWin = Math.random() < 0.50;
  const outcome = isWin ? coinSelectedSide : (coinSelectedSide === 'heads' ? 'tails' : 'heads');

  if (coinEl) {
    coinEl.style.transform = 'rotateY(1800deg) scale(1.15)';
  }

  let flipCount = 0;
  const flipTimer = setInterval(() => {
    if (symbolEl) symbolEl.innerText = flipCount % 2 === 0 ? '⭐' : '🎁';
    playTone('tick');
    flipCount++;
  }, 100);

  setTimeout(() => {
    clearInterval(flipTimer);
    if (coinEl) coinEl.style.transform = 'rotateY(0deg) scale(1)';
    if (symbolEl) symbolEl.innerText = outcome === 'heads' ? '⭐' : '🎁';
    isCoinFlipping = false;

    if (outcome === coinSelectedSide) {
      const winAmount = Math.round(currentBet * 1.9);
      balance += winAmount;
      saveBalance();
      updateBalanceUI();
      if (window.confetti) confetti({ particleCount: 65, spread: 60 });
      playTone('win');
      showToast('Correct Call!', `${outcome.toUpperCase()} landed! Paid ×1.9 (+${winAmount} 🪙)`, '🪙');
    } else {
      playTone('lose');
      showToast('Wrong Call', `Coin landed on ${outcome.toUpperCase()}. Stake lost!`, '💨');
    }
  }, 1300);
}

// Rules Sheet Modal
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
  if (isWatchingAd) return;
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

  // Trigger Backend Universal Ad Service
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

// Init
window.addEventListener('DOMContentLoaded', () => {
  balance = parseInt(localStorage.getItem('task_game_coins') || '500', 10);
  updateBalanceUI();
  updateActiveChipUI();
  updateDailyPlaysUI();

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_coins') {
      balance = parseInt(localStorage.getItem('task_game_coins') || '500', 10);
      updateBalanceUI();
    }
  });

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.onmessage = () => {
      balance = parseInt(localStorage.getItem('task_game_coins') || '500', 10);
      updateBalanceUI();
    };
  } catch (e) {}
});
