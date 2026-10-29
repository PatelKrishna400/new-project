/**
 * PANDEMIC CONTROLLER — TELEGRAM ARCADE SUITE
 * Matches Reference Screenshots 1, 2 & 3 Pixel-Perfect
 * Monopoly City Loop Board, Virus Mascot Token, 3D Rolling Dice, Country Infection, Roll Shop Modal
 */

const DICE_UNICODE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const TOTAL_TILES = 28;

let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let rolls = parseInt(localStorage.getItem('pandemic_rolls') || '33', 10);
let dnaPoints = parseInt(localStorage.getItem('pandemic_dna') || '21', 10);
let barriers = parseInt(localStorage.getItem('pandemic_barriers') || '3', 10);
let countryInfectedPct = parseInt(localStorage.getItem('pandemic_turkey_pct') || '0', 10);
let govTier = parseInt(localStorage.getItem('pandemic_gov_tier') || '1', 10);

let currentMultiplier = 3; // Default x3 selected as in Screenshot 2
let virusTileIndex = 5; // Top-right city entrance
let isRolling = false;
let soundEnabled = true;

// Board Canvas
let canvas, ctx;

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
    if (type === 'dice') {
      synth.triggerAttackRelease(["C4", "G4"], "32n", undefined, 0.25);
    } else if (type === 'step') {
      synth.triggerAttackRelease("E5", "64n", undefined, 0.15);
    } else if (type === 'win') {
      synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", undefined, 0.5);
    } else if (type === 'click') {
      synth.triggerAttackRelease("C5", "32n", undefined, 0.2);
    }
  } catch(e) {}
}

// Balance & Stats Management
function updateAllStatsUI() {
  const userCoins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  const elCoins = document.getElementById('headerCoinDisplay') || document.getElementById('coinBalance');
  const elStars = document.getElementById('headerStarDisplay') || document.getElementById('starBalanceDisplay');

  if (elCoins) elCoins.innerText = userCoins.toLocaleString();
  if (elStars) elStars.innerText = balance.toLocaleString();

  const rollsEl = document.getElementById('rollsCurrentDisplay');
  if (rollsEl) rollsEl.innerText = rolls;

  const dnaEl = document.getElementById('dnaCurrentDisplay');
  if (dnaEl) dnaEl.innerText = dnaPoints;

  const barEl = document.getElementById('barriersDisplay');
  if (barEl) barEl.innerText = barriers;

  const pctEl = document.getElementById('countryInfectedPct');
  if (pctEl) pctEl.innerText = `${countryInfectedPct}% infected`;

  const govDash = [
    document.getElementById('govDash1'),
    document.getElementById('govDash2'),
    document.getElementById('govDash3'),
    document.getElementById('govDash4'),
    document.getElementById('govDash5')
  ];
  govDash.forEach((dash, idx) => {
    if (dash) {
      if (idx < govTier) {
        dash.className = "w-4 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]";
      } else {
        dash.className = "w-4 h-1.5 rounded-full bg-gray-700";
      }
    }
  });

  const infraGovEl = document.getElementById('infraGov');
  if (infraGovEl) infraGovEl.innerText = `${govTier}/5`;
}

function saveStats() {
  localStorage.setItem('task_game_stars', Math.max(0, balance).toString());
  localStorage.setItem('user_stars', Math.max(0, balance).toString());
  localStorage.setItem('pandemic_rolls', rolls.toString());
  localStorage.setItem('pandemic_dna', dnaPoints.toString());
  localStorage.setItem('pandemic_barriers', barriers.toString());
  localStorage.setItem('pandemic_turkey_pct', countryInfectedPct.toString());
  localStorage.setItem('pandemic_gov_tier', govTier.toString());

  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'BALANCES_UPDATED', stars: balance, timestamp: Date.now() });
    bc.close();
  } catch(e) {}
  if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
    window.firebaseSync.syncPlayerCurrenciesImmediate();
  }
}

// Multiplier Controls (x1, x2, x3)
function setRollMultiplier(val) {
  if (val > 3) {
    alert("This multiplier unlocks as your roll stock increases!");
    return;
  }
  playTone('click');
  currentMultiplier = val;

  document.querySelectorAll('.roll-mult-chip').forEach(btn => {
    const m = parseInt(btn.getAttribute('data-mult') || '1', 10);
    if (m === currentMultiplier) {
      btn.className = "roll-mult-chip active";
    } else if (m <= 3) {
      btn.className = "roll-mult-chip";
    }
  });

  const rollBtn = document.getElementById('rollDiceBtn');
  if (rollBtn) rollBtn.innerText = `ROLL X${currentMultiplier}`;
}

// Monopoly Tile Grid Coordinates (28 Tiles around city perimeter)
function getTilePositions(w, h) {
  const positions = [];
  const padX = 14;
  const padY = 12;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  // 8 on top, 6 on right, 8 on bottom, 6 on left = 28 tiles
  const topCount = 8;
  const sideCount = 6;

  // Top edge (left to right)
  for (let i = 0; i < topCount; i++) {
    positions.push({
      x: padX + (innerW / (topCount - 1)) * i,
      y: padY,
      type: (i === 0 || i === topCount - 1) ? 'corner' : (i % 2 === 0 ? 'dna' : 'attack')
    });
  }

  // Right edge (top to bottom)
  for (let i = 1; i < sideCount; i++) {
    positions.push({
      x: padX + innerW,
      y: padY + (innerH / (sideCount)) * i,
      type: i === 2 ? 'raid' : 'barrier'
    });
  }

  // Bottom edge (right to left)
  for (let i = topCount - 1; i >= 0; i--) {
    positions.push({
      x: padX + (innerW / (topCount - 1)) * i,
      y: padY + innerH,
      type: (i === 0 || i === topCount - 1) ? 'corner' : (i % 2 === 0 ? 'dna' : 'mystery')
    });
  }

  // Left edge (bottom to top)
  for (let i = sideCount - 1; i > 0; i--) {
    positions.push({
      x: padX,
      y: padY + (innerH / (sideCount)) * i,
      type: i === 3 ? 'raid' : 'dna'
    });
  }

  return positions;
}

// City Center & Tile Renderer
function drawPandemicBoard() {
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // 1. Draw City Center Background
  ctx.save();
  ctx.fillStyle = '#06160f';
  ctx.fillRect(25, 25, w - 50, h - 50);

  // Draw Roads / Grids inside city
  ctx.strokeStyle = '#122e20';
  ctx.lineWidth = 3;
  ctx.strokeRect(38, 38, w - 76, h - 76);

  // Hospital Building with Helipad H
  ctx.fillStyle = '#10281c';
  ctx.fillRect(w / 2 - 25, 45, 50, 40);
  ctx.strokeStyle = '#166534';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(w / 2 - 25, 45, 50, 40);
  // Helipad circle
  ctx.beginPath();
  ctx.arc(w / 2, 65, 12, 0, Math.PI * 2);
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', w / 2, 65);

  // Harbor & Containers on Left
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(45, 60, 18, 9);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(45, 72, 18, 9);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(45, 84, 18, 9);

  // Research Dome on Right
  ctx.beginPath();
  ctx.arc(w - 70, 75, 18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.stroke();

  // Government Building with Pillars at Bottom Center
  ctx.fillStyle = '#162b21';
  ctx.fillRect(w / 2 - 45, h - 95, 90, 36);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 1;
  ctx.strokeRect(w / 2 - 45, h - 95, 90, 36);
  // Pillars
  ctx.fillStyle = '#4ade80';
  for (let p = 0; p < 5; p++) {
    ctx.fillRect(w / 2 - 38 + p * 16, h - 90, 4, 24);
  }

  ctx.restore();

  // 2. Draw Outer Loop Tiles
  const tiles = getTilePositions(w, h);
  const tileSize = 20;

  tiles.forEach((tile, index) => {
    ctx.save();
    ctx.translate(tile.x, tile.y);

    // Tile Box
    let fill = '#0a1d13';
    let stroke = '#1d4d33';
    let icon = '🧬';

    if (tile.type === 'corner') {
      fill = '#192b15';
      stroke = '#84cc16';
      icon = '🇹🇷';
    } else if (tile.type === 'attack') {
      fill = '#2b1016';
      stroke = '#f43f5e';
      icon = '💥';
    } else if (tile.type === 'raid') {
      fill = '#2b210e';
      stroke = '#f59e0b';
      icon = '💰';
    } else if (tile.type === 'barrier') {
      fill = '#0e1e2b';
      stroke = '#0ea5e9';
      icon = '🛡️';
    } else if (tile.type === 'mystery') {
      fill = '#20102b';
      stroke = '#c084fc';
      icon = '⭐';
    }

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, 4);
    ctx.fill();
    ctx.stroke();

    // Icon on tile
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);

    ctx.restore();
  });

  // 3. Draw Virus Mascot Token
  if (tiles[virusTileIndex]) {
    const curTile = tiles[virusTileIndex];
    ctx.save();
    ctx.translate(curTile.x, curTile.y);
    ctx.shadowColor = 'rgba(74, 222, 128, 0.9)';
    ctx.shadowBlur = 12;

    // Mascot token
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦠', 0, -4);

    ctx.restore();
  }
}

// Reset Board View
function resetBoardView() {
  playTone('click');
  virusTileIndex = 5;
  drawPandemicBoard();
}

// Roll Dice & Move Virus Token
function rollPandemicDice() {
  if (isRolling) return;
  if (rolls < currentMultiplier) {
    openRollShopModal();
    return;
  }

  isRolling = true;
  rolls -= currentMultiplier;
  saveStats();
  updateAllStatsUI();

  playTone('dice');

  const die1 = document.getElementById('die1Face');
  const die2 = document.getElementById('die2Face');
  die1.classList.add('rolling');
  die2.classList.add('rolling');

  setTimeout(() => {
    die1.classList.remove('rolling');
    die2.classList.remove('rolling');

    const v1 = Math.floor(Math.random() * 6);
    const v2 = Math.floor(Math.random() * 6);
    die1.innerText = DICE_UNICODE[v1];
    die2.innerText = DICE_UNICODE[v2];

    const totalSteps = (v1 + 1) + (v2 + 1);
    animateVirusSteps(totalSteps);
  }, 450);
}

function animateVirusSteps(remainingSteps) {
  if (remainingSteps <= 0) {
    isRolling = false;
    resolveTileLanded();
    return;
  }

  virusTileIndex = (virusTileIndex + 1) % TOTAL_TILES;
  playTone('step');
  drawPandemicBoard();

  setTimeout(() => {
    animateVirusSteps(remainingSteps - 1);
  }, 120);
}

function resolveTileLanded() {
  const tiles = getTilePositions(canvas.width, canvas.height);
  const landed = tiles[virusTileIndex];

  // Grant rewards based on tile
  if (landed.type === 'dna' || landed.type === 'mystery') {
    const gained = (10 + Math.floor(Math.random() * 15)) * currentMultiplier;
    dnaPoints += gained;
    showNotification(`+${gained} DNA COLLECTED!`);
  } else if (landed.type === 'corner') {
    const gainedRolls = 8 * currentMultiplier;
    rolls += gainedRolls;
    playTone('win');
    showNotification(`COUNTRY INFECTED! +${gainedRolls} ROLLS`);
    if (window.confetti) confetti({ particleCount: 45, spread: 60, origin: { y: 0.4 } });
  } else if (landed.type === 'raid' || landed.type === 'attack') {
    const gainedDna = 25 * currentMultiplier;
    dnaPoints += gainedDna;
    showNotification(`LAB RAIDED! +${gainedDna} DNA`);
  } else if (landed.type === 'barrier') {
    barriers = Math.min(3, barriers + 1);
    showNotification(`BARRIER RECHARGED!`);
  }

  // Increase country infection progress
  countryInfectedPct = Math.min(100, countryInfectedPct + Math.floor(Math.random() * 4) + 1);

  saveStats();
  updateAllStatsUI();
}

function showNotification(text) {
  const el = document.getElementById('infectionNotification');
  if (el) {
    el.innerText = text;
    el.classList.remove('hidden');
  }
}

// Upgrade Infrastructure (Government +156 🧪)
function upgradeInfrastructure() {
  if (dnaPoints < 156) {
    alert("You need 156 DNA points to infect this tier! Keep rolling the board to collect DNA.");
    return;
  }

  playTone('win');
  dnaPoints -= 156;
  govTier = Math.min(5, govTier + 1);
  rolls += 15; // bonus reward!

  if (window.confetti) {
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  }

  saveStats();
  updateAllStatsUI();
  showNotification("GOVERNMENT INFECTED! +15 ROLLS");
}

// Live Mutation Countdown (00:19:07)
let mutationSeconds = 19 * 60 + 7;
function updateMutationTimer() {
  if (mutationSeconds > 0) mutationSeconds--;
  const m = String(Math.floor(mutationSeconds / 60)).padStart(2, '0');
  const s = String(mutationSeconds % 60).padStart(2, '0');
  const timer = document.getElementById('mutationCountdown');
  if (timer) timer.innerText = `00:${m}:${s}`;
}

// Roll Shop Modal (Screenshot 1 Match)
function openRollShopModal() {
  playTone('click');
  document.getElementById('rollShopOverlay').classList.remove('hidden');
  const sheet = document.getElementById('rollShopSheet');
  sheet.classList.add('open');
  sheet.classList.add('active');
}
function closeRollShopModal() {
  document.getElementById('rollShopOverlay').classList.add('hidden');
  const sheet = document.getElementById('rollShopSheet');
  sheet.classList.remove('open');
  sheet.classList.remove('active');
}

function buyRolls(count, cost) {
  if (balance < cost) {
    alert(`You need ${cost} ⭐ to purchase this pack! Claim free stars from daily bonuses.`);
    return;
  }

  playTone('win');
  balance -= cost;
  rolls += count;
  saveStats();
  updateAllStatsUI();
  closeRollShopModal();

  if (window.confetti) {
    confetti({ particleCount: 60, spread: 80, origin: { y: 0.4 } });
  }
  showNotification(`+${count} ROLLS PURCHASED!`);
}

function openPandemicRules() {
  playTone('click');
  alert("PANDEMIC BOARD RULES:\n• Roll the dice to move your virus mascot around the city.\n• Land on DNA tiles to harvest points.\n• Land on flags to infect countries and claim free rolls!\n• Use DNA to upgrade government tiers.");
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  canvas = document.getElementById('boardCanvas');
  if (canvas) {
    ctx = canvas.getContext('2d');
    canvas.width = 370;
    canvas.height = 230;
    drawPandemicBoard();
  }

  balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  updateAllStatsUI();
  setInterval(updateMutationTimer, 1000);

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_stars' || e.key === 'user_stars') {
      balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
      updateAllStatsUI();
    }
  });

  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.onmessage = () => {
      balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
      updateAllStatsUI();
    };
  } catch(e) {}
});

window.addEventListener('balance:changed', (e) => {
  if (e.detail && typeof e.detail.stars === 'number') {
    balance = e.detail.stars;
    updateAllStatsUI();
  }
});

window.addEventListener('balance:synced', (e) => {
  if (e.detail && typeof e.detail.stars === 'number') {
    balance = e.detail.stars;
    updateAllStatsUI();
  }
});
