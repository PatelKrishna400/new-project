/**
 * LUCKY SCRATCH GAME LOGIC — EXACT MATCH TO SCREENSHOTS 4 & 5
 * Satin Rose Card with Diamond Stars Watermark • Foil Scratching • Recent Rounds • 50% Win Rate Calibration
 */

const MIN_BET = 30;
const MAX_BET = 2000;
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 10;
let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let currentBet = 50;
let scratchPurchased = false;
let scratchPrize = { tier: 'Winner', mult: 1, icon: '🎉' };
let soundEnabled = true;
let scratchRecentHistory = [];

// Daily Plays Tracker
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getPlaysUsedToday() {
  const key = `lucky_plays_scratch_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getBonusPlaysToday() {
  const key = `lucky_bonus_scratch_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getRemainingPlays() {
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const used = getPlaysUsedToday();
  return Math.max(0, total - used);
}
function recordPlayUsed() {
  const key = `lucky_plays_scratch_${getTodayKey()}`;
  const used = getPlaysUsedToday() + 1;
  localStorage.setItem(key, used.toString());
}
function grantBonusPlays(count = BONUS_PLAYS_PER_AD) {
  const key = `lucky_bonus_scratch_${getTodayKey()}`;
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
    btn.className = 'primary-cta-btn bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-[0_8px_24px_rgba(244,63,94,0.35)]';
  } else {
    btn.innerText = 'Buy card';
    btn.className = 'primary-cta-btn bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-[0_8px_24px_rgba(244,63,94,0.35)]';
  }
}

// Bet Controls (Screenshot 5 Match)
function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(MAX_BET, Math.max(MIN_BET, amount));
  const el = document.getElementById('currentBetDisplay');
  if (el) el.innerText = currentBet;
  updateActiveChipUI();
  updateActionButtonState();
}

function halveBet() {
  if (scratchPurchased) return;
  setBet(Math.max(MIN_BET, Math.round(currentBet / 2)));
}

function doubleBet() {
  if (scratchPurchased) return;
  setBet(Math.min(MAX_BET, currentBet * 2));
}

function updateActiveChipUI() {
  document.querySelectorAll('.bet-pill-btn').forEach(btn => {
    const val = parseInt(btn.getAttribute('data-val') || '0', 10);
    if (val === currentBet) {
      btn.classList.add('active');
      btn.style.borderColor = '#fb7185';
      btn.style.boxShadow = '0 0 16px rgba(251, 113, 133, 0.3)';
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
    }
  });
}

// Rules Sheet Modal Controller (Screenshot 4 Match)
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
function showToast(title, msg, icon = '✨') {
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

// Scratch Action Handling
function handleScratchAction() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }
  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }
  buyScratchCard();
}

function initScratchCard(purchased = false) {
  const canvas = document.getElementById('scratchCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  canvas.style.transition = 'none';
  canvas.style.opacity = '1';
  ctx.globalCompositeOperation = 'source-over';

  // Satin Rose-Pink Gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#f43f5e');
  grad.addColorStop(0.5, '#db2777');
  grad.addColorStop(1, '#9d174d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Delicate Star Diamond Pattern (Screenshot 5)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let i = 25; i < w; i += 40) {
    for (let j = 20; j < h; j += 40) {
      ctx.beginPath();
      ctx.moveTo(i, j - 4);
      ctx.lineTo(i + 3, j);
      ctx.lineTo(i, j + 4);
      ctx.lineTo(i - 3, j);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Frosted Center Pill: "LUCKY SCRATCH"
  const pillW = 220;
  const pillH = 46;
  const pillX = (w - pillW) / 2;
  const pillY = (h - pillH) / 2 - 10;
  const radius = 23;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, radius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();
  ctx.restore();

  // "LUCKY SCRATCH" Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px "Plus Jakarta Sans"';
  ctx.textAlign = 'center';
  ctx.fillText('LUCKY SCRATCH', w / 2, pillY + 29);

  // Subtitle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '600 12px "Plus Jakarta Sans"';
  ctx.fillText(purchased ? 'Scratch the foil to reveal' : 'Buy a card to play', w / 2, pillY + 68);

  if (purchased) {
    enableScratching(canvas, ctx);
  }
}

function buyScratchCard() {
  if (scratchPurchased) return;
  recordPlayUsed();
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  scratchPurchased = true;
  playTone('roll');

  const winProbability = getWinProbability();
  const isHighWin = Math.random() < winProbability;
  if (isHighWin) {
    const winRoll = Math.random();
    if (winRoll < 0.15) {
      scratchPrize = { tier: 'Jackpot', mult: 5, icon: '👑' };
    } else if (winRoll < 0.50) {
      scratchPrize = { tier: 'Super Win', mult: 2, icon: '💎' };
    } else {
      scratchPrize = { tier: 'Winner', mult: 1, icon: '🎉' };
    }
  } else {
    const lowRoll = Math.random();
    if (lowRoll < 0.25) {
      scratchPrize = { tier: 'Mini Win', mult: 0.5, icon: '⭐' };
    } else if (lowRoll < 0.55) {
      scratchPrize = { tier: 'Lucky Star', mult: 0.3, icon: '🍀' };
    } else if (lowRoll < 0.80) {
      scratchPrize = { tier: 'Bronze Win', mult: 0.2, icon: '🥉' };
    } else {
      scratchPrize = { tier: 'Lucky Drop', mult: 0.1, icon: '⭐' };
    }
  }

  // 1. FIRST: Hide any previously revealed winning price so it cannot be seen
  const prizeCard = document.getElementById('scratchPrizeCard');
  if (prizeCard) {
    prizeCard.style.opacity = '0';
  }

  // 2. FIRST: Load the fresh scratch card foil page cover immediately
  const canvas = document.getElementById('scratchCanvas');
  if (canvas) {
    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
  }
  initScratchCard(true);

  // Subtle fresh card load bounce effect
  const cardWrap = document.querySelector('.scratch-card-canvas-wrap');
  if (cardWrap) {
    cardWrap.style.transform = 'scale(0.97)';
    cardWrap.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
      cardWrap.style.transform = 'scale(1)';
    }, 160);
  }

  const btn = document.getElementById('primaryPlayBtn');
  if (btn) {
    btn.innerText = 'Scratch Card Above';
    btn.disabled = true;
  }

  // 3. THEN AFTER: The scratch card page / foil is loaded, load the below winning prize!
  setTimeout(() => {
    document.getElementById('scratchIcon').innerText = scratchPrize.icon;
    document.getElementById('scratchMultiplierLabel').innerText = `×${scratchPrize.mult}`;
    document.getElementById('scratchTierLabel').innerText = scratchPrize.tier;
    const winStars = Math.round(currentBet * scratchPrize.mult);
    document.getElementById('scratchWinAmountText').innerText = scratchPrize.mult > 0 ? `+${winStars} ⭐` : `0 ⭐`;

    // Make the prize active underneath the opaque foil
    if (prizeCard) {
      prizeCard.style.opacity = '1';
    }
    if (canvas) {
      canvas.style.transition = 'opacity 0.45s ease';
    }
  }, 120);
}

function enableScratching(canvas, ctx) {
  let isDrawing = false;
  let scratchedCount = 0;

  function scratchAt(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
    playTone('tick');

    scratchedCount++;
    if (scratchedCount > 24) {
      revealScratchFinish(canvas, ctx);
    }
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  canvas.onmousedown = (e) => { isDrawing = true; const p = getPos(e); scratchAt(p.x, p.y); };
  window.onmouseup = () => { isDrawing = false; };
  canvas.onmousemove = (e) => { if (isDrawing) { const p = getPos(e); scratchAt(p.x, p.y); } };

  canvas.ontouchstart = (e) => { isDrawing = true; const p = getPos(e); scratchAt(p.x, p.y); };
  window.ontouchend = () => { isDrawing = false; };
  canvas.ontouchmove = (e) => { if (isDrawing) { const p = getPos(e); scratchAt(p.x, p.y); } };
}

function revealScratchFinish(canvas, ctx) {
  canvas.onmousedown = canvas.onmousemove = canvas.ontouchstart = canvas.ontouchmove = null;
  canvas.style.opacity = '0';
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 400);

  scratchPurchased = false;
  const grossWin = Math.round(currentBet * scratchPrize.mult);
  let taxAmount = 0;
  let winAmount = 0;
  if (grossWin > 0) {
    taxAmount = Math.max(1, Math.round(grossWin * 0.001));
    winAmount = Math.max(0, grossWin - taxAmount);
  }
  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  // Record in recent rounds (Screenshot 5 Match)
  addScratchRecentRound(scratchPrize, winAmount);

  if (scratchPrize.mult >= 5) {
    if (window.confetti) confetti({ particleCount: 80, spread: 70 });
    playTone('jackpot');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} ⭐`, scratchPrize.icon);
  } else if (scratchPrize.mult >= 1) {
    playTone('win');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} ⭐`, scratchPrize.icon);
  } else {
    playTone('win');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} ⭐`, scratchPrize.icon);
  }

  const playBtn = document.getElementById('primaryPlayBtn');
  if (playBtn) {
    playBtn.innerText = 'Buy card';
    playBtn.disabled = false;
  }
}

function addScratchRecentRound(prize, win) {
  // Recent rounds removed from UI
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

  // 1. First load the scratch page / foil cover
  initScratchCard(false);

  // 2. Then after foil is covering, safely load winning prize underneath
  setTimeout(() => {
    const prizeCard = document.getElementById('scratchPrizeCard');
    if (prizeCard) prizeCard.style.opacity = '1';
    const canvas = document.getElementById('scratchCanvas');
    if (canvas) canvas.style.transition = 'opacity 0.45s ease';
  }, 100);

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
