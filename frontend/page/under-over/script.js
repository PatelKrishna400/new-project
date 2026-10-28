/**
 * UNDER OVER CONTROLLER — NOVA ARCADE SUITE
 * Matches Reference Screenshots 1 & 4 Pixel-Perfect
 * Real-time Threshold Slider, Direction Choice, 50% Win Rate Calibration
 */

const MIN_BET = 30;
const MAX_BET = 2000;
const QUICK_BETS = [30, 50, 100, 500];
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 10;

let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let currentBet = 50;
let soundEnabled = true;

let uoDirection = 'under';
let uoThreshold = 50;
let isRollingUO = false;
let uoRecentRounds = [];

// Daily Plays Tracker
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getPlaysUsedToday() {
  const key = `lucky_plays_underover_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getBonusPlaysToday() {
  const key = `lucky_bonus_underover_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getRemainingPlays() {
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const used = getPlaysUsedToday();
  return Math.max(0, total - used);
}
function recordPlayUsed() {
  const key = `lucky_plays_underover_${getTodayKey()}`;
  const used = getPlaysUsedToday() + 1;
  localStorage.setItem(key, used.toString());
}
function grantBonusPlays(count = BONUS_PLAYS_PER_AD) {
  const key = `lucky_bonus_underover_${getTodayKey()}`;
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

// Audio synthesizers via Tone.js
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
    } else if (type === 'lose') {
      synth.triggerAttackRelease(["Eb4", "D4", "C4"], "8n", undefined, 0.4);
    } else if (type === 'tick') {
      synth.triggerAttackRelease("A5", "64n", undefined, 0.1);
    }
  } catch(e) {}
}

function toggleSound(checked) {
  soundEnabled = checked;
  if (checked) playTone('tick');
}

// Balance Management
function updateBalanceUI() {
  const userCoins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  const elCoins = document.getElementById('headerCoinDisplay') || document.getElementById('coinBalance');
  const elStars = document.getElementById('headerStarDisplay') || document.getElementById('starBalanceDisplay');

  if (elCoins) elCoins.innerText = userCoins.toLocaleString();
  if (elStars) elStars.innerText = balance.toLocaleString();
  updateActionButtonState();
}

function saveBalance() {
  localStorage.setItem('task_game_stars', Math.max(0, balance).toString());
  localStorage.setItem('user_stars', Math.max(0, balance).toString());
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'BALANCES_UPDATED', timestamp: Date.now() });
    bc.close();
  } catch(e) {}
}

function claimFreeRefill() {
  window.location.href = '../home/index.html';
}

// Direction & Threshold Math
function setUnderOverMode(mode) {
  if (isRollingUO) return;
  playTone('click');
  uoDirection = mode;

  const btnUnder = document.getElementById('btnUOunder');
  const btnOver = document.getElementById('btnUOover');
  const fill = document.getElementById('uoProgressFill');

  if (mode === 'under') {
    btnUnder.className = "py-3 px-3 rounded-xl bg-lime-500/10 border-2 border-lime-500 text-lime-400 font-black text-sm transition-all shadow-[0_0_16px_rgba(132,204,22,0.25)]";
    btnOver.className = "py-3 px-3 rounded-xl bg-[#171c28] border border-[#232c3f] text-gray-400 font-black text-sm transition-all hover:text-white";
    if (fill) fill.classList.remove('over-mode');
  } else {
    btnOver.className = "py-3 px-3 rounded-xl bg-lime-500/10 border-2 border-lime-500 text-lime-400 font-black text-sm transition-all shadow-[0_0_16px_rgba(132,204,22,0.25)]";
    btnUnder.className = "py-3 px-3 rounded-xl bg-[#171c28] border border-[#232c3f] text-gray-400 font-black text-sm transition-all hover:text-white";
    if (fill) fill.classList.add('over-mode');
  }

  updateUnderOverCalculations();
}

function onThresholdChange(val) {
  uoThreshold = parseInt(val, 10);
  playTone('tick');
  updateUnderOverCalculations();
}

function updateUnderOverCalculations() {
  const lblThresholdUnder = document.getElementById('lblThresholdUnder');
  const lblThresholdOver = document.getElementById('lblThresholdOver');
  const sliderValueText = document.getElementById('sliderValueText');
  const centerLabel = document.getElementById('uoThresholdCenterLabel');
  const needle = document.getElementById('uoNeedle');
  const fill = document.getElementById('uoProgressFill');
  const sliderFill = document.getElementById('sliderFillBar');
  const slider = document.getElementById('uoSlider');

  if (lblThresholdUnder) lblThresholdUnder.innerText = uoThreshold;
  if (lblThresholdOver) lblThresholdOver.innerText = uoThreshold;
  if (sliderValueText) sliderValueText.innerText = uoThreshold;
  if (centerLabel) centerLabel.innerText = uoDirection === 'under' ? `Under ${uoThreshold}` : `Over ${uoThreshold}`;
  if (slider) slider.value = uoThreshold;

  // Visual needle and bar percentages
  const pct = (uoThreshold / 99) * 100;
  if (needle) needle.style.left = `${pct}%`;
  if (sliderFill) sliderFill.style.width = `${pct}%`;

  if (fill) {
    if (uoDirection === 'under') {
      fill.style.width = `${pct}%`;
      fill.style.left = '0';
      fill.style.right = 'auto';
    } else {
      fill.style.width = `${100 - pct}%`;
      fill.style.left = 'auto';
      fill.style.right = '0';
    }
  }

  // Payout formula: Payout = 0.95 / Win Chance
  // Win chance: for under threshold T (range 0..99), outcomes 0..(T-1) win => T outcomes out of 100
  // For over threshold T, outcomes (T+1)..99 win => (99 - T) outcomes out of 100
  let winChancePct = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
  winChancePct = Math.max(1, Math.min(98, winChancePct));

  const multiplier = Number((95 / winChancePct).toFixed(2));
  const toWin = Math.floor(currentBet * multiplier);

  const wcEl = document.getElementById('uoWinChanceText');
  const multEl = document.getElementById('uoMultiplierText');
  const toWinEl = document.getElementById('uoToWinText');
  const payoutPill = document.getElementById('uoPayoutPill');

  if (wcEl) wcEl.innerText = `${winChancePct}%`;
  if (multEl) multEl.innerText = `×${multiplier.toFixed(2)}`;
  if (toWinEl) toWinEl.innerText = toWin.toLocaleString();
  if (payoutPill) payoutPill.innerText = `×${multiplier.toFixed(2)}`;
}

// Bet Controls
function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(MAX_BET, Math.max(MIN_BET, amount));
  const el = document.getElementById('currentBetDisplay');
  if (el) el.innerText = currentBet;
  updateActiveChipUI();
  updateActionButtonState();
  updateUnderOverCalculations();
}

function halveBet() {
  if (isRollingUO) return;
  setBet(Math.max(MIN_BET, Math.round(currentBet / 2)));
}

function doubleBet() {
  if (isRollingUO) return;
  setBet(Math.min(MAX_BET, currentBet * 2));
}

function updateActiveChipUI() {
  document.querySelectorAll('.bet-pill-btn').forEach(btn => {
    const val = parseInt(btn.getAttribute('data-val') || '0', 10);
    if (val === currentBet) {
      btn.classList.add('active');
      btn.style.borderColor = '#84cc16';
      btn.style.boxShadow = '0 0 16px rgba(132, 204, 22, 0.3)';
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
    }
  });
}

function updateActionButtonState() {
  const btn = document.getElementById('primaryPlayBtn');
  if (!btn) return;

  if (balance < currentBet) {
    btn.innerText = 'Buy coins';
    btn.className = "primary-cta-btn bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 text-lime-950 shadow-[0_8px_24px_rgba(132,204,22,0.35)]";
  } else {
    btn.innerText = 'Roll';
    btn.className = "primary-cta-btn bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 text-lime-950 shadow-[0_8px_24px_rgba(132,204,22,0.35)]";
  }
}

function handlePrimaryAction() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }
  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }
  rollUnderOver();
}

// Roll Action with Smooth Number Tumble
function rollUnderOver() {
  if (isRollingUO) return;
  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }

  recordPlayUsed();
  isRollingUO = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const btn = document.getElementById('primaryPlayBtn');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerText = 'Rolling...';
  }

  // Reset digit card colors
  const dLeft = document.getElementById('uoDigitLeft');
  const dRight = document.getElementById('uoDigitRight');
  if (dLeft) dLeft.className = "text-6xl font-black text-white tracking-tighter select-none";
  if (dRight) dRight.className = "text-6xl font-black text-white tracking-tighter select-none";

  // Calibrate win rate dynamically based on Star Balance
  const forceWin = Math.random() < getWinProbability();
  let rolledNumber;

  if (uoDirection === 'under') {
    if (forceWin) {
      rolledNumber = Math.floor(Math.random() * uoThreshold);
    } else {
      rolledNumber = uoThreshold + Math.floor(Math.random() * (100 - uoThreshold));
    }
  } else {
    if (forceWin) {
      rolledNumber = (uoThreshold + 1) + Math.floor(Math.random() * (99 - uoThreshold));
    } else {
      rolledNumber = Math.floor(Math.random() * (uoThreshold + 1));
    }
  }
  rolledNumber = Math.max(0, Math.min(99, rolledNumber));

  const marker = document.getElementById('uoRollMarker');
  if (marker) marker.style.display = 'flex';

  // Tumble numbers
  let ticks = 0;
  const maxTicks = 16;
  const timer = setInterval(() => {
    ticks++;
    const randomDisplay = Math.floor(Math.random() * 100);
    const pct = (randomDisplay / 99) * 100;
    if (marker) {
      marker.style.left = `${pct}%`;
      marker.innerText = randomDisplay;
    }
    const dStr = String(randomDisplay).padStart(2, '0');
    if (dLeft) dLeft.innerText = dStr[0];
    if (dRight) dRight.innerText = dStr[1];

    playTone('tick');

    if (ticks >= maxTicks) {
      clearInterval(timer);
      finishUnderOverRoll(rolledNumber);
    }
  }, 50);
}

function finishUnderOverRoll(rolledNumber) {
  const marker = document.getElementById('uoRollMarker');
  const btn = document.getElementById('primaryPlayBtn');
  const dLeft = document.getElementById('uoDigitLeft');
  const dRight = document.getElementById('uoDigitRight');

  const finalPct = (rolledNumber / 99) * 100;
  if (marker) {
    marker.style.left = `${finalPct}%`;
    marker.innerText = rolledNumber;
  }

  const dStr = String(rolledNumber).padStart(2, '0');
  if (dLeft) dLeft.innerText = dStr[0];
  if (dRight) dRight.innerText = dStr[1];

  const isWin = uoDirection === 'under' ? (rolledNumber < uoThreshold) : (rolledNumber > uoThreshold);

  let winChancePct = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
  winChancePct = Math.max(1, Math.min(98, winChancePct));
  const multiplier = Number((95 / winChancePct).toFixed(2));
  const winPayout = Math.floor(currentBet * multiplier);

  if (isWin) {
    if (dLeft) dLeft.className = "text-6xl font-black text-lime-400 tracking-tighter select-none drop-shadow-[0_0_12px_rgba(163,230,53,0.8)]";
    if (dRight) dRight.className = "text-6xl font-black text-lime-400 tracking-tighter select-none drop-shadow-[0_0_12px_rgba(163,230,53,0.8)]";
    playTone('win');
    balance += winPayout;
    saveBalance();
    updateBalanceUI();
    if (window.confetti) confetti({ particleCount: 50, spread: 70, origin: { y: 0.3 } });
  } else {
    if (dLeft) dLeft.className = "text-6xl font-black text-rose-400 tracking-tighter select-none";
    if (dRight) dRight.className = "text-6xl font-black text-rose-400 tracking-tighter select-none";
    playTone('lose');
  }

  // Record round
  uoRecentRounds.unshift({
    num: rolledNumber,
    isWin,
    mult: isWin ? multiplier : 0
  });
  if (uoRecentRounds.length > 8) uoRecentRounds.pop();
  renderRecentRounds();

  setTimeout(() => {
    isRollingUO = false;
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
    updateActionButtonState();
  }, 1200);
}

function renderRecentRounds() {
  // Recent rounds removed from UI
}

// Modals
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

function openBuyCoinsModal() {
  playTone('click');
  const sheet = document.getElementById('buyCoinsModalSheet');
  const overlay = document.getElementById('buyCoinsModalOverlay');
  if (!sheet || !overlay) return;
  overlay.classList.remove('hidden');
  setTimeout(() => sheet.classList.add('open'), 10);
}

function closeBuyCoinsModal() {
  playTone('click');
  const sheet = document.getElementById('buyCoinsModalSheet');
  const overlay = document.getElementById('buyCoinsModalOverlay');
  if (!sheet || !overlay) return;
  sheet.classList.remove('open');
  setTimeout(() => overlay.classList.add('hidden'), 280);
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
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateBalanceUI();
  setBet(50);
  setUnderOverMode('under');
  if (window.lucide) lucide.createIcons();
});
