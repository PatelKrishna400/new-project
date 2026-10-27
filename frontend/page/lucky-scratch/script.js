/**
 * LUCKY SCRATCH GAME LOGIC — EXACT MATCH TO SCREENSHOTS 4 & 5
 * Satin Rose Card with Diamond Stars Watermark • Foil Scratching • Recent Rounds • 50% Win Rate Calibration
 */

const MIN_BET = 30;
const MAX_BET = 2000;
let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let currentBet = 50;
let scratchPurchased = false;
let scratchPrize = { tier: 'Winner', mult: 2, icon: '🎉' };
let soundEnabled = true;
let scratchRecentHistory = [];

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
  localStorage.setItem('user_stars', Math.max(0, balance).toString());
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'BALANCES_UPDATED', timestamp: Date.now() });
    bc.close();
  } catch (e) {}
}

function addFreeCoins(amount = 200) {
  playTone('win');
  balance += amount;
  saveBalance();
  updateBalanceUI();
  showToast('Coins Credited', `+${amount} free coins added!`, '🪙');
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
  addFreeCoins(200);
  closeBuyCoinsModal();
}

function updateActionButtonState() {
  const btn = document.getElementById('primaryPlayBtn');
  if (!btn) return;

  if (balance < currentBet) {
    btn.innerText = 'Buy coins';
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
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  scratchPurchased = true;
  playTone('roll');

  let winProbability = 0.50;
  if (balance >= 10000) winProbability = 0.10;
  else if (balance >= 5000) winProbability = 0.20;

  const isWin = Math.random() < winProbability;
  if (isWin) {
    const winRoll = Math.random();
    if (winRoll < 0.08) {
      scratchPrize = { tier: 'Jackpot', mult: 15, icon: '👑' };
    } else if (winRoll < 0.40) {
      scratchPrize = { tier: 'Big Win', mult: 5, icon: '💎' };
    } else if (winRoll < 0.80) {
      scratchPrize = { tier: 'Winner', mult: 2, icon: '🎉' };
    } else {
      scratchPrize = { tier: 'Money Back', mult: 1, icon: '⭐' };
    }
  } else {
    scratchPrize = { tier: 'Bust', mult: 0, icon: '💨' };
  }

  document.getElementById('scratchIcon').innerText = scratchPrize.icon;
  document.getElementById('scratchMultiplierLabel').innerText = `×${scratchPrize.mult}`;
  document.getElementById('scratchTierLabel').innerText = scratchPrize.tier;
  const winCoin = Math.round(currentBet * scratchPrize.mult);
  document.getElementById('scratchWinAmountText').innerText = scratchPrize.mult > 0 ? `+${winCoin} Coins` : `0 Coins`;

  initScratchCard(true);
  const btn = document.getElementById('primaryPlayBtn');
  if (btn) {
    btn.innerText = 'Scratch Card Above';
    btn.disabled = true;
  }
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
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} 🪙`, scratchPrize.icon);
  } else if (scratchPrize.mult > 0) {
    playTone('win');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} 🪙`, scratchPrize.icon);
  } else {
    playTone('lose');
    showToast('Bust', 'No prize under foil. Better luck next time!', '💨');
  }

  const playBtn = document.getElementById('primaryPlayBtn');
  if (playBtn) {
    playBtn.innerText = 'Buy card';
    playBtn.disabled = false;
  }
}

function addScratchRecentRound(prize, win) {
  scratchRecentHistory.unshift({ tier: prize.tier, mult: prize.mult, win, icon: prize.icon });
  if (scratchRecentHistory.length > 5) scratchRecentHistory.pop();

  const container = document.getElementById('scratchRecentRounds');
  if (!container) return;

  container.innerHTML = `
    <div class="flex items-center gap-1.5 flex-wrap">
      ${scratchRecentHistory.map(r => `
        <span class="recent-round-badge">
          <span>${r.icon}</span>
          <span>×${r.mult}</span>
          <span class="${r.mult > 0 ? 'text-amber-400' : 'text-gray-400'}">${r.mult > 0 ? '+' + r.win : 'Bust'}</span>
        </span>
      `).join('')}
    </div>
  `;
}

// DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  const storedStars = localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars');
  balance = parseInt(storedStars || '10', 10);

  updateBalanceUI();
  setBet(50);
  initScratchCard(false);

  if (window.lucide) lucide.createIcons();
});
