/**
 * LUCKY SPIN GAME LOGIC — NOVA ARCADE SUITE
 * 12-Wedges Fortune Wheel • 50% Win Rate • 10 Daily Free Plays + Watch Ad System
 */

const GAME_ID = 'lucky_spin';
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 5;

let balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
let currentBet = 20;
let soundEnabled = true;
let isWheelSpinning = false;
let wheelRotationAngle = 0;

// Wedges Definition (12 Wedges matching Image 5)
// 0: Gold ×5
// 1: Bust ×0
// 2: Violet ×1 (stake back)
// 3: Bust ×0
// 4: Lavender ×0.5
// 5: Bust ×0
// 6: Deep violet ×2
// 7: Bust ×0
// 8: Violet ×1 (stake back)
// 9: Bust ×0
// 10: Lavender ×0.5
// 11: Bust ×0
const WHEEL_WEDGES = [
  { label: '×5', mult: 5, color: '#eab308', text: '#000000', name: 'Gold wedge' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888', name: 'Bust' },
  { label: '×1', mult: 1, color: '#7c3aed', text: '#ffffff', name: 'Violet' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888', name: 'Bust' },
  { label: '×0.5', mult: 0.5, color: '#a78bfa', text: '#000000', name: 'Lavender' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888', name: 'Bust' },
  { label: '×2', mult: 2, color: '#581c87', text: '#ffffff', name: 'Deep violet' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888', name: 'Bust' },
  { label: '×1', mult: 1, color: '#7c3aed', text: '#ffffff', name: 'Violet' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888', name: 'Bust' },
  { label: '×0.5', mult: 0.5, color: '#a78bfa', text: '#000000', name: 'Lavender' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888', name: 'Bust' }
];

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
}

function saveBalance() {
  localStorage.setItem('task_game_stars', Math.max(0, balance).toString());
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
  updateActionButtonState();
  showToast('Bonus Credited', '+200 Free Stars added to your pouch!', '⭐');
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
    display.style.color = remaining <= 0 ? '#ef4444' : '#c084fc';
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
  const btn = document.getElementById('btnSpinWheel');
  if (!btn) return;

  const remaining = getRemainingPlays();
  if (remaining <= 0) {
    btn.innerText = '▶ Watch Ad to Play (0/10)';
    btn.style.background = 'linear-gradient(135deg, #facc15 0%, #eab308 100%)';
    btn.style.color = '#451a03';
  } else if (balance < currentBet) {
    btn.innerText = 'Buy stars (+200 Free)';
    btn.style.background = 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)';
    btn.style.color = '#ffffff';
  } else {
    btn.innerText = 'Spin Wheel';
    btn.style.background = 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)';
    btn.style.color = '#ffffff';
  }
}

// Bet Chip Selector: 10, 20, 50, 100
function setBet(amount) {
  if (isWheelSpinning) return;
  playTone('tick');
  currentBet = Math.min(2000, Math.max(10, amount));
  const betEl = document.getElementById('currentBetDisplay');
  if (betEl) betEl.innerText = currentBet;
  updateActiveChipUI();
  updateActionButtonState();
}

const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000];

function stepDownBet() {
  if (typeof isWheelSpinning !== 'undefined' && isWheelSpinning) return;
  if (typeof scratchPurchased !== 'undefined' && scratchPurchased) return;
  if (typeof isSpinning !== 'undefined' && isSpinning) return;
  if (typeof isRolling !== 'undefined' && isRolling) return;
  if (typeof isPlaying !== 'undefined' && isPlaying) return;
  if (typeof isFlipping !== 'undefined' && isFlipping) return;

  const lower = BET_STEPS.filter(s => s < currentBet);
  if (lower.length > 0) {
    setBet(lower[lower.length - 1]);
  } else {
    setBet(BET_STEPS[0]);
  }
}

function stepUpBet() {
  if (typeof isWheelSpinning !== 'undefined' && isWheelSpinning) return;
  if (typeof scratchPurchased !== 'undefined' && scratchPurchased) return;
  if (typeof isSpinning !== 'undefined' && isSpinning) return;
  if (typeof isRolling !== 'undefined' && isRolling) return;
  if (typeof isPlaying !== 'undefined' && isPlaying) return;
  if (typeof isFlipping !== 'undefined' && isFlipping) return;

  const higher = BET_STEPS.filter(s => s > currentBet);
  if (higher.length > 0) {
    setBet(higher[0]);
  } else {
    setBet(BET_STEPS[BET_STEPS.length - 1]);
  }
}

function halveBet() { stepDownBet(); }
function doubleBet() { stepUpBet(); }

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

function showToast(title, msg, icon = '🎡') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  const tTitle = document.getElementById('toastTitle');
  const tMsg = document.getElementById('toastMsg');
  const tIcon = document.getElementById('toastIcon');
  if (tTitle) tTitle.innerText = title;
  if (tMsg) tMsg.innerText = msg;
  if (tIcon && icon) tIcon.innerText = icon;

  toast.style.display = 'flex';
  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 2600);
}

// Wheel Canvas Rendering
function drawSpinWheel() {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 6;
  const numWedges = WHEEL_WEDGES.length;
  const sliceAngle = (2 * Math.PI) / numWedges;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  WHEEL_WEDGES.forEach((wedge, i) => {
    const start = i * sliceAngle;
    const end = start + sliceAngle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.fillStyle = wedge.color;
    ctx.fill();
    ctx.strokeStyle = '#2d1f43';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = wedge.text;
    ctx.font = 'bold 12px "Plus Jakarta Sans"';
    ctx.fillText(wedge.label, radius - 14, 4);
    ctx.restore();
  });

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#0f0c18';
  ctx.fill();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function handleSpinAction() {
  if (isWheelSpinning) return;

  // Check Daily Play Limit first
  const remaining = getRemainingPlays();
  if (remaining <= 0) {
    openAdModal();
    return;
  }

  // Check coin balance
  if (balance < currentBet) {
    addFreeCoins();
    return;
  }

  spinWheelGame();
}

// 50% Win Rate Fortune Wheel Algorithm
function spinWheelGame() {
  if (isWheelSpinning) return;

  isWheelSpinning = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  recordPlayUsed();
  playTone('roll');

  const btn = document.getElementById('btnSpinWheel');
  if (btn) btn.disabled = true;

  // Dynamic Win Rate Calibration:
  // Total star balance >= 10,000 -> 10% win probability
  // Total star balance >= 5,000  -> 20% win probability
  // Below 5,000 stars            -> 50% win probability
  let winProbability = 0.50;
  if (balance >= 10000) {
    winProbability = 0.10;
  } else if (balance >= 5000) {
    winProbability = 0.20;
  }
  const isWin = Math.random() < winProbability;
  let targetIndex;

  if (isWin) {
    // Pick from winning wedges: 0 (×5), 6 (×2), 2 or 8 (×1), 4 or 10 (×0.5)
    const winPick = Math.random();
    if (winPick < 0.08) {
      targetIndex = 0; // ×5 jackpot
    } else if (winPick < 0.35) {
      targetIndex = 6; // ×2 deep violet
    } else if (winPick < 0.70) {
      targetIndex = Math.random() < 0.5 ? 2 : 8; // ×1 violet stake back
    } else {
      targetIndex = Math.random() < 0.5 ? 4 : 10; // ×0.5 lavender
    }
  } else {
    // Pick from bust wedges (×0): 1, 3, 5, 7, 9, 11
    const bustWedges = [1, 3, 5, 7, 9, 11];
    targetIndex = bustWedges[Math.floor(Math.random() * bustWedges.length)];
  }

  const canvas = document.getElementById('wheelCanvas');
  const sliceDeg = 360 / WHEEL_WEDGES.length;

  // Pointer is at 270 degrees (top center). Calculate rotation angle to align wedge under pointer
  const targetDegInWheel = targetIndex * sliceDeg + sliceDeg / 2;
  const fullRotations = (Math.floor(Math.random() * 4) + 4) * 360;
  const finalAngle = fullRotations + (270 - targetDegInWheel);

  wheelRotationAngle += finalAngle;
  canvas.style.transform = `rotate(${wheelRotationAngle}deg)`;

  let ticks = 0;
  const tickInterval = setInterval(() => {
    playTone('tick');
    ticks++;
    if (ticks > 16) clearInterval(tickInterval);
  }, 180);

  setTimeout(() => {
    clearInterval(tickInterval);
    isWheelSpinning = false;
    if (btn) btn.disabled = false;

    const wedge = WHEEL_WEDGES[targetIndex];
    const grossWin = Math.round(currentBet * wedge.mult);
    let taxAmount = 0;
    let winAmount = 0;
    if (grossWin > 0) {
      taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
      winAmount = Math.max(0, grossWin - taxAmount);
    }

    balance += winAmount;
    saveBalance();
    updateBalanceUI();
    updateActionButtonState();

    if (wedge.mult >= 5) {
      if (window.confetti) confetti({ particleCount: 110, spread: 80 });
      playTone('jackpot');
      showToast('GOLD WEDGE!', `Hit ×5! Payout +${winAmount.toLocaleString()} ⭐ (0.1% tax: -${taxAmount} ⭐)`, '👑');
    } else if (wedge.mult > 0) {
      playTone('win');
      showToast(`Landed on ${wedge.name} (${wedge.label})`, `Multiplier awarded! (+${winAmount.toLocaleString()} ⭐, tax: -${taxAmount} ⭐)`, '🎡');
    } else {
      playTone('lose');
      showToast('Bust Wedge', 'No luck on this spin! Stake lost.', '💀');
    }
  }, 3600);
}

// Rules Sheet Modal (Exact match to Image 5)
function toggleInfoModal() {
  playTone('click');
  const sheet = document.getElementById('infoModalSheet');
  const overlay = document.getElementById('infoModalOverlay');
  if (!sheet || !overlay) return;

  const isOpen = sheet.classList.contains('open');
  if (isOpen) {
    sheet.classList.remove('open');
    setTimeout(() => {
      overlay.style.display = 'none';
      sheet.style.display = 'none';
    }, 280);
  } else {
    overlay.style.display = 'block';
    sheet.style.display = 'block';
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
  sheet.style.display = 'block';
  setTimeout(() => { sheet.classList.add('show'); }, 10);
}

function closeAdModal() {
  if (isWatchingAd) return;
  playTone('click');
  const overlay = document.getElementById('adModalOverlay');
  const sheet = document.getElementById('adModalSheet');
  if (sheet) {
    sheet.classList.remove('show');
    setTimeout(() => { sheet.style.display = 'none'; }, 250);
  }
  if (overlay) setTimeout(() => { overlay.style.display = 'none'; }, 250);
}, 250);
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
  balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  updateBalanceUI();
  updateActiveChipUI();
  updateDailyPlaysUI();
  drawSpinWheel();

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_stars') {
      balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
      updateBalanceUI();
    }
  });

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.onmessage = () => {
      balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
      updateBalanceUI();
    };
  } catch (e) {}
});
