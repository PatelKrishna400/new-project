/**
 * GIFT DROP (PLINKO) LOGIC — NOVA ARCADE SUITE
 * Peg Board Physics • 50% Win Rate Calibration • 10 Plays/Day Limit + Watch Ad
 */

const GAME_ID = 'gift_drop';
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 5;

let balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
let currentBet = 20;
let soundEnabled = true;
let isDroppingPlinko = false;

const PLINKO_BUCKETS = [24, 5, 2, 1.2, 0.7, 0.25, 0.7, 1.2, 2, 5, 24];

// Web Audio API Synthesizer
let synth = null;
function initAudio() {
  if (!synth && window.Tone) {
    try {
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 }
      }).toDestination();
    } catch (e) {}
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
    display.style.color = remaining <= 0 ? '#ef4444' : '#06b6d4';
  }
  updateActionButtonState();
}

function checkDailyPlaysClick() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
  } else {
    showToast('Daily Free Plays', `${getRemainingPlays()} free drops remaining today.`, '🎯');
  }
}

function updateActionButtonState() {
  const btn = document.getElementById('btnDropGift');
  if (!btn) return;
  const remaining = getRemainingPlays();
  if (remaining <= 0) {
    btn.innerText = '▶ Watch Ad to Play (0/10)';
    btn.style.background = 'linear-gradient(135deg, #facc15 0%, #eab308 100%)';
    btn.style.color = '#451a03';
  } else if (balance < currentBet) {
    btn.innerText = 'Buy Stars (+200 Free)';
    btn.style.background = 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)';
    btn.style.color = '#07090e';
  } else {
    btn.innerText = 'Drop Gift';
    btn.style.background = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
    btn.style.color = '#07090e';
  }
}

function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(2000, Math.max(10, amount));
  const betEl = document.getElementById('currentBetDisplay');
  if (betEl) betEl.innerText = currentBet;
  updateActiveChipUI();
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

function showToast(title, msg, icon = '🎁') {
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

// Board Canvas Drawing
function drawPlinkoBoard(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const rows = 8;
  const pegSpacingY = 22;
  const startY = 25;

  ctx.fillStyle = '#38bdf8';
  for (let r = 0; r < rows; r++) {
    const count = r + 3;
    const rowWidth = (count - 1) * 28;
    const startX = (w - rowWidth) / 2;
    for (let c = 0; c < count; c++) {
      ctx.beginPath();
      ctx.arc(startX + c * 28, startY + r * pegSpacingY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw payout buckets
  const bucketCount = PLINKO_BUCKETS.length;
  const bucketWidth = w / bucketCount;
  const bucketY = h - 25;

  PLINKO_BUCKETS.forEach((mult, i) => {
    const bx = i * bucketWidth;
    ctx.fillStyle = mult >= 5 ? '#06b6d4' : (mult >= 1 ? '#1e293b' : '#111827');
    ctx.fillRect(bx + 1, bucketY, bucketWidth - 2, 22);

    ctx.fillStyle = mult >= 5 ? '#020617' : (mult >= 1 ? '#38bdf8' : '#64748b');
    ctx.font = 'bold 9.5px "Plus Jakarta Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(`×${mult}`, bx + bucketWidth / 2, bucketY + 14);
  });
}

// 50% Win Rate Calibrated Gift Drop
function dropPlinkoBall() {
  if (isDroppingPlinko) return;

  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }

  if (balance < currentBet) {
    showToast('Insufficient Stars', 'Claimed free refill stars!', '⭐');
    addFreeCoins();
    return;
  }

  isDroppingPlinko = true;
  recordPlayUsed();
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('plinkoCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

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
  let targetBucket;
  if (isWin) {
    const winBuckets = [0, 1, 2, 3, 7, 8, 9, 10];
    targetBucket = winBuckets[Math.floor(Math.random() * winBuckets.length)];
  } else {
    const loseBuckets = [4, 5, 6];
    targetBucket = loseBuckets[Math.floor(Math.random() * loseBuckets.length)];
  }

  const bucketWidth = w / PLINKO_BUCKETS.length;
  const targetX = targetBucket * bucketWidth + bucketWidth / 2;

  let x = w / 2;
  let y = 10;
  let vy = 1.2;

  function animateDrop() {
    ctx.clearRect(0, 0, w, h);
    drawPlinkoBoard(ctx, w, h);

    vy += 0.28;
    y += vy;

    // Smooth physics path biased towards calibrated target
    const progress = Math.min(1, y / (h - 32));
    x = (w / 2) * (1 - progress) + targetX * progress + (Math.sin(y * 0.22) * 8 * (1 - progress));

    if (Math.random() < 0.26) {
      playTone('tick');
    }

    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁', x, y);

    if (y < h - 28) {
      requestAnimationFrame(animateDrop);
    } else {
      isDroppingPlinko = false;
      const mult = PLINKO_BUCKETS[targetBucket];
      const grossWin = Math.round(currentBet * mult);
      let taxAmount = 0;
      let winAmount = 0;
      if (grossWin > 0) {
        taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
        winAmount = Math.max(0, grossWin - taxAmount);
      }

      balance += winAmount;
      saveBalance();
      updateBalanceUI();

      if (mult >= 5) {
        if (window.confetti) confetti({ particleCount: 100, spread: 75 });
        playTone('jackpot');
        showToast('EDGE SHOT!', `Landed on ×${mult}! Won ${winAmount.toLocaleString()} ⭐ (0.1% tax: -${taxAmount} ⭐)`, '🎁');
      } else if (mult > 0) {
        playTone('win');
        showToast('Gift Landed', `Paid ×${mult} (+${winAmount.toLocaleString()} ⭐, tax: -${taxAmount} ⭐)`, '🎁');
      } else {
        playTone('lose');
        showToast('Low Bucket', `Landed on ×${mult}. Better luck next drop!`, '💨');
      }
    }
  }

  animateDrop();
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
// Watch Ad Modal Controller (Daily Play Limit)
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
  balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  updateBalanceUI();
  updateActiveChipUI();
  updateDailyPlaysUI();

  const canvas = document.getElementById('plinkoCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    drawPlinkoBoard(ctx, canvas.width, canvas.height);
  }

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
