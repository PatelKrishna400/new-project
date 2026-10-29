/**
 * PLINKO (INFECTION EDITION) CONTROLLER — TELEGRAM ARCADE SUITE
 * Matches Reference Screenshot 4 Pixel-Perfect
 * 10 Peg Rows, 13 Bins (5 to 0.1 to 5), Infection 0/66 Progress, Multi-Drop (x1, x3, x5, x10)
 */

const BINS_MULTIPLIERS = [5, 2, 1, 0.5, 0.3, 0.2, 0.1, 0.2, 0.3, 0.5, 1, 2, 5];
const PEG_ROWS = 10;
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 10;

let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let currentBet = 10; // Default 10 ⭐
let dropMultiplier = 1; // 1, 3, 5, 10
let infectionPoints = parseInt(localStorage.getItem('plinko_infection_pts') || '0', 10);
let soundEnabled = true;

// Daily Plays Tracker
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getPlaysUsedToday() {
  const key = `lucky_plays_plinko_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getBonusPlaysToday() {
  const key = `lucky_bonus_plinko_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getRemainingPlays() {
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const used = getPlaysUsedToday();
  return Math.max(0, total - used);
}
function recordPlayUsed() {
  const key = `lucky_plays_plinko_${getTodayKey()}`;
  const used = getPlaysUsedToday() + 1;
  localStorage.setItem(key, used.toString());
}
function grantBonusPlays(count = BONUS_PLAYS_PER_AD) {
  const key = `lucky_bonus_plinko_${getTodayKey()}`;
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

// Active balls in flight
let activeBalls = [];
let canvas, ctx;
let animationFrameId = null;

// Audio synthesizers via Tone.js
let synth = null;
function initAudio() {
  if (!synth && window.Tone) {
    try {
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.08, sustain: 0.04, release: 0.15 }
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

    if (type === 'bounce') {
      synth.triggerAttackRelease("D5", "64n", undefined, 0.15);
    } else if (type === 'bucket') {
      synth.triggerAttackRelease(["G4", "C5", "E5"], "16n", undefined, 0.3);
    } else if (type === 'bigwin') {
      synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", undefined, 0.5);
    } else if (type === 'click') {
      synth.triggerAttackRelease("C5", "32n", undefined, 0.2);
    }
  } catch(e) {}
}

function togglePlinkoSound() {
  soundEnabled = !soundEnabled;
  playTone('click');
  const icon = document.getElementById('soundIcon');
  if (icon) {
    icon.setAttribute('data-lucide', soundEnabled ? 'volume-2' : 'volume-x');
    if (window.lucide) lucide.createIcons();
  }
}

// Balance Management
function updateBalanceUI() {
  const userCoins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  const elCoins = document.getElementById('headerCoinDisplay') || document.getElementById('coinBalance');
  const elStars = document.getElementById('headerStarDisplay') || document.getElementById('starBalanceDisplay');

  if (elCoins) elCoins.innerText = userCoins.toLocaleString();
  if (elStars) elStars.innerText = balance.toLocaleString();

  const totalCost = currentBet * dropMultiplier;
  const subtext = document.getElementById('dropCostSubtext');
  if (subtext) subtext.innerText = `${dropMultiplier} × ${currentBet} ⭐`;

  const dropBtn = document.getElementById('dropActionBtn');
  if (dropBtn) {
    if (balance < totalCost) {
      dropBtn.querySelector('span.text-xl').innerText = "BUY STARS";
    } else {
      dropBtn.querySelector('span.text-xl').innerText = "DROP";
    }
  }
}

function saveBalance() {
  localStorage.setItem('task_game_stars', Math.max(0, balance).toString());
  localStorage.setItem('user_stars', Math.max(0, balance).toString());
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'BALANCES_UPDATED', stars: balance, timestamp: Date.now() });
    bc.close();
  } catch(e) {}
  if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
    window.firebaseSync.syncPlayerCurrenciesImmediate();
  }
}

// Infection Progress (0/66)
function updateInfectionUI() {
  const text = document.getElementById('infectionText');
  const bar = document.getElementById('infectionBar');
  if (text) text.innerText = `${infectionPoints}/66`;
  if (bar) bar.style.width = `${Math.min(100, (infectionPoints / 66) * 100)}%`;
  localStorage.setItem('plinko_infection_pts', infectionPoints.toString());
}

function addInfectionPoints(pts) {
  infectionPoints += pts;
  if (infectionPoints >= 66) {
    infectionPoints = 0;
    triggerRainBonus();
  }
  updateInfectionUI();
}

function triggerRainBonus() {
  playTone('bigwin');
  if (window.confetti) {
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.3 } });
  }
  // Drop 10 free balls!
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      spawnBall(0); // free
    }, i * 160);
  }
}

function pokeMascot() {
  playTone('click');
  addInfectionPoints(1);
}

// Bet Controls
function setPlinkoBet(val) {
  playTone('click');
  currentBet = val;
  document.querySelectorAll('.plinko-bet-chip').forEach(btn => {
    const b = parseInt(btn.getAttribute('data-bet') || '10', 10);
    if (b === currentBet) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  updateBalanceUI();
}

function setDropCount(count) {
  playTone('click');
  dropMultiplier = count;
  document.querySelectorAll('.drop-count-btn').forEach(btn => {
    const c = parseInt(btn.getAttribute('data-count') || '1', 10);
    if (c === dropMultiplier) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  updateBalanceUI();
}

// Plinko Peg Physics Simulation
function getPegPositions(w, h) {
  const pegs = [];
  const startY = 32;
  const endY = h - 35;
  const rowHeight = (endY - startY) / (PEG_ROWS - 1);
  const centerX = w / 2;

  for (let r = 0; r < PEG_ROWS; r++) {
    const count = r + 3; // rows 0 to 9 have 3 to 12 pegs
    const rowWidth = (w - 50) * ((r + 2) / (PEG_ROWS + 1));
    const spacing = rowWidth / (count - 1);
    const startX = centerX - rowWidth / 2;
    const y = startY + r * rowHeight;

    for (let c = 0; c < count; c++) {
      pegs.push({
        x: startX + c * spacing,
        y: y,
        r: 3.2
      });
    }
  }
  return pegs;
}

function handlePlinkoDrop() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }
  const totalCost = currentBet * dropMultiplier;
  if (balance < totalCost) {
    openBuyCoinsModal();
    return;
  }

  recordPlayUsed();
  playTone('click');
  balance -= totalCost;
  saveBalance();
  updateBalanceUI();
  addInfectionPoints(dropMultiplier);

  // Drop balls with stagger
  for (let i = 0; i < dropMultiplier; i++) {
    setTimeout(() => {
      spawnBall(currentBet);
    }, i * 140);
  }
}

function spawnBall(stake) {
  const w = canvas.width;
  const startX = w / 2 + (Math.random() - 0.5) * 8;
  activeBalls.push({
    x: startX,
    y: 12,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 1.8,
    radius: 4.5,
    color: '#4ade80',
    stake: stake
  });
}

function animatePlinko() {
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Draw Glowing Neon Chute Trapezoid Outline (Screenshot 4 Match)
  ctx.save();
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(74, 222, 128, 0.6)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 35, 16);
  ctx.lineTo(w / 2 + 35, 16);
  ctx.lineTo(w - 12, h - 10);
  ctx.lineTo(12, h - 10);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Draw Pegs with Ambient White Glow
  const pegs = getPegPositions(w, h);
  pegs.forEach(peg => {
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 4;
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Update & Render Balls
  const gravity = 0.22;
  const bounceDamping = 0.55;

  for (let i = activeBalls.length - 1; i >= 0; i--) {
    const ball = activeBalls[i];
    ball.vy += gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Peg collision
    pegs.forEach(peg => {
      const dx = ball.x - peg.x;
      const dy = ball.y - peg.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.radius + peg.r;

      if (dist < minDist) {
        // Resolve overlap
        const angle = Math.atan2(dy, dx);
        ball.x = peg.x + Math.cos(angle) * minDist;
        ball.y = peg.y + Math.sin(angle) * minDist;

        // Bounce velocity with random nudge
        const speed = Math.hypot(ball.vx, ball.vy);
        const nudge = (Math.random() - 0.5) * 0.8;
        ball.vx = (Math.cos(angle) + nudge) * speed * bounceDamping;
        ball.vy = Math.sin(angle) * speed * bounceDamping;

        if (Math.abs(ball.vy) < 0.8) ball.vy = 1.2;

        playTone('bounce');
      }
    });

    // Wall collision (keep inside trapezoid)
    if (ball.x < 18) {
      ball.x = 18;
      ball.vx = Math.abs(ball.vx) * 0.7;
    } else if (ball.x > w - 18) {
      ball.x = w - 18;
      ball.vx = -Math.abs(ball.vx) * 0.7;
    }

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.shadowColor = 'rgba(74, 222, 128, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Check bottom entry into 13 bins
    if (ball.y >= h - 18) {
      const binWidth = (w - 24) / 13;
      let binIndex = Math.min(12, Math.max(0, Math.floor((ball.x - 12) / binWidth)));

      const winProbability = getWinProbability();
      const isProfitable = (BINS_MULTIPLIERS[binIndex] >= 1);
      if (isProfitable && Math.random() > winProbability) {
        binIndex = 5 + Math.floor(Math.random() * 3);
      } else if (!isProfitable && Math.random() < winProbability) {
        const outerBins = [1, 2, 10, 11];
        binIndex = outerBins[Math.floor(Math.random() * outerBins.length)];
      }

      resolveBinHit(binIndex, ball.stake);
      activeBalls.splice(i, 1);
    }
  }

  animationFrameId = requestAnimationFrame(animatePlinko);
}

function resolveBinHit(binIndex, stake) {
  const mult = BINS_MULTIPLIERS[binIndex];
  const win = Math.round(stake * mult);

  if (win > 0) {
    balance += win;
    saveBalance();
    updateBalanceUI();
  }

  // Trigger Bin UI Animation (hit pulse)
  const binEl = document.querySelector(`.bin-chip[data-bin="${binIndex}"]`);
  if (binEl) {
    binEl.classList.add('hit');
    setTimeout(() => {
      binEl.classList.remove('hit');
    }, 280);
  }

  if (mult >= 5) {
    playTone('bigwin');
    if (window.confetti) {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    }
  } else {
    playTone('bucket');
  }
}

// Modal Helpers
function openBuyCoinsModal() {
  playTone('click');
  document.getElementById('buyCoinsModalOverlay').classList.remove('hidden');
  const sheet = document.getElementById('buyCoinsModalSheet');
  sheet.classList.add('open');
  sheet.classList.add('active');
}
function closeBuyCoinsModal() {
  document.getElementById('buyCoinsModalOverlay').classList.add('hidden');
  const sheet = document.getElementById('buyCoinsModalSheet');
  sheet.classList.remove('open');
  sheet.classList.remove('active');
}

function claimFreeRefill() {
  window.location.href = '../home/index.html';
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

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  canvas = document.getElementById('plinkoCanvas');
  if (canvas) {
    ctx = canvas.getContext('2d');
    canvas.width = 370;
    canvas.height = 290;
    animatePlinko();
  }

  balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  updateBalanceUI();
  updateInfectionUI();

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_stars' || e.key === 'user_stars') {
      balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
      updateBalanceUI();
    }
  });

  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.onmessage = () => {
      balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
      updateBalanceUI();
    };
  } catch(e) {}
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
