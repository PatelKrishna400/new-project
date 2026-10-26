/**
 * LUCKY SCRATCH GAME LOGIC — NOVA ARCADE SUITE
 * Canvas Foil Touch/Mouse Scratch • 50% Calibrated Win Rate • 10 Daily Plays Limit + Watch Ad
 */

const GAME_ID = 'lucky_scratch';
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 5;

let balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
let currentBet = 20;
let soundEnabled = true;
let isScratchingCard = false;
let scratchPurchased = false;
let scratchPrize = { tier: 'Winner', mult: 2, icon: '🎉' };
let recentRounds = [];

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
    display.style.color = remaining <= 0 ? '#ef4444' : '#fb7185';
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
  const btn = document.getElementById('btnBuyCard');
  if (!btn) return;

  const remaining = getRemainingPlays();
  if (remaining <= 0) {
    btn.innerText = '▶ Watch Ad to Play (0/10)';
    btn.style.background = 'linear-gradient(135deg, #facc15 0%, #eab308 100%)';
    btn.style.color = '#451a03';
  } else if (scratchPurchased) {
    btn.innerText = 'Scratch Foil to Reveal';
    btn.style.background = 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)';
    btn.style.color = '#ffffff';
  } else if (balance < currentBet) {
    btn.innerText = 'Buy stars (+200 Free)';
    btn.style.background = 'linear-gradient(135deg, #fb7185 0%, #be123c 100%)';
    btn.style.color = '#ffffff';
  } else {
    btn.innerText = 'Buy card';
    btn.style.background = 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)';
    btn.style.color = '#07090e';
  }
}

// Bet Chip Selector: 10, 20, 50, 100
function setBet(amount) {
  if (scratchPurchased) return;
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

// Toast
function showToast(title, msg, icon = '✨') {
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

// Canvas Foil Logic
function initScratchCanvas(purchased = false) {
  const canvas = document.getElementById('scratchCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.globalCompositeOperation = 'source-over';
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#f43f5e');
  grad.addColorStop(0.5, '#e11d48');
  grad.addColorStop(1, '#9f1239');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Decorative dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  for (let i = 25; i < w; i += 45) {
    for (let j = 25; j < h; j += 45) {
      ctx.beginPath();
      ctx.arc(i, j, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Label text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Plus Jakarta Sans"';
  ctx.textAlign = 'center';
  ctx.fillText(purchased ? 'SCRATCH TO REVEAL' : 'TAP BUY CARD TO PLAY', w / 2, h / 2 + 6);

  if (purchased) {
    enableScratching(canvas, ctx);
  }
}

function handleScratchAction() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }
  if (balance < currentBet) {
    addFreeCoins();
    return;
  }
  if (!scratchPurchased) {
    buyScratchCard();
  }
}

// Buy Scratch Card with 50% Win Rate Calibration
function buyScratchCard() {
  if (scratchPurchased) return;

  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }

  if (balance < currentBet) {
    showToast('Insufficient Stars', 'Claimed free refill stars!', '⭐');
    addFreeCoins();
    return;
  }

  recordPlayUsed();
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  scratchPurchased = true;
  playTone('roll');

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
  if (isWin) {
    const winRoll = Math.random();
    if (winRoll < 0.08) {
      scratchPrize = { tier: 'Jackpot', mult: 15, icon: '👑' };
    } else if (winRoll < 0.28) {
      scratchPrize = { tier: 'Big win', mult: 5, icon: '💎' };
    } else if (winRoll < 0.65) {
      scratchPrize = { tier: 'Winner', mult: 2, icon: '🎉' };
    } else {
      scratchPrize = { tier: 'Money back', mult: 1, icon: '⭐' };
    }
  } else {
    scratchPrize = { tier: 'Bust', mult: 0, icon: '💨' };
  }

  document.getElementById('prizeIcon').innerText = scratchPrize.icon;
  document.getElementById('prizeMultiplier').innerText = `×${scratchPrize.mult}`;
  document.getElementById('prizeTier').innerText = scratchPrize.tier;
  const winCoin = Math.round(currentBet * scratchPrize.mult);
  document.getElementById('prizeWinCoins').innerText = winCoin > 0 ? `+${winCoin.toLocaleString()} Stars` : '0 Stars';

  initScratchCanvas(true);
  updateActionButtonState();
  showToast('Card Purchased', 'Drag across foil to reveal your prize!', '🎫');
}

function enableScratching(canvas, ctx) {
  let isDown = false;
  let scratchedCount = 0;

  function scratchPoint(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    scratchedCount++;
    if (scratchedCount % 8 === 0) playTone('tick');

    if (scratchedCount >= 38) {
      revealFullPrize(canvas, ctx);
    }
  }

  canvas.onmousedown = (e) => {
    isDown = true;
    const rect = canvas.getBoundingClientRect();
    scratchPoint((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
  };
  window.onmouseup = () => { isDown = false; };
  canvas.onmousemove = (e) => {
    if (!isDown) return;
    const rect = canvas.getBoundingClientRect();
    scratchPoint((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
  };

  canvas.ontouchstart = (e) => {
    isDown = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    scratchPoint((touch.clientX - rect.left) * (canvas.width / rect.width), (touch.clientY - rect.top) * (canvas.height / rect.height));
  };
  canvas.ontouchend = () => { isDown = false; };
  canvas.ontouchmove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    scratchPoint((touch.clientX - rect.left) * (canvas.width / rect.width), (touch.clientY - rect.top) * (canvas.height / rect.height));
  };
}

function revealFullPrize(canvas, ctx) {
  canvas.onmousedown = null;
  canvas.onmousemove = null;
  canvas.ontouchstart = null;
  canvas.ontouchmove = null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const grossWin = Math.round(currentBet * scratchPrize.mult);
  let taxAmount = 0;
  let winAmount = 0;
  if (grossWin > 0) {
    taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
    winAmount = Math.max(0, grossWin - taxAmount);
  }

  if (scratchPrize.mult >= 5) {
    if (window.confetti) confetti({ particleCount: 110, spread: 80 });
    playTone('jackpot');
    showToast('BIG WIN!', `${scratchPrize.tier}! Won ${winAmount.toLocaleString()} ⭐ (0.1% tax: -${taxAmount} ⭐)`, scratchPrize.icon);
  } else if (scratchPrize.mult > 0) {
    playTone('win');
    showToast(scratchPrize.tier, `Awarded ${winAmount.toLocaleString()} ⭐ (0.1% tax: -${taxAmount} ⭐)`, scratchPrize.icon);
  } else {
    playTone('lose');
    showToast('Bust Card', 'No prize this time! Try another card.', '💨');
  }

  // Record Recent Round History
  recordRecentRound(scratchPrize.tier, scratchPrize.mult, winAmount);

  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  setTimeout(() => {
    scratchPurchased = false;
    initScratchCanvas(false);
    updateActionButtonState();
  }, 3200);
}

function recordRecentRound(tier, mult, wonAmount) {
  const roundText = mult > 0 ? `${tier} (×${mult}) · +${wonAmount.toLocaleString()} ⭐` : `${tier} (×0) · 0 ⭐`;
  recentRounds.unshift(roundText);
  if (recentRounds.length > 3) recentRounds.pop();

  const body = document.getElementById('recentRoundsBody');
  if (body) {
    body.innerHTML = recentRounds.map((r, i) => `<div style="padding:0.2rem 0; color:${i === 0 ? '#ffffff' : '#94a3b8'}; font-weight:${i === 0 ? '800' : '600'};">${r}</div>`).join('');
  }
}

// Rules Sheet Modal (Exact match to Image 4)
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
  initScratchCanvas(false);

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
