/**
 * LUCKY SPIN GAME LOGIC — EXACT MATCH TO SCREENSHOT 3
 * 12-Wedge Fortune Wheel (Gold x5, Deep Violet x2, Violet x1, Lavender x0.5, Bust x0)
 * 50% Win Rate Calibration
 */

const MIN_BET = 30;
const MAX_BET = 2000;
let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let currentBet = 50;
let isWheelSpinning = false;
let wheelRotationAngle = 0;
let soundEnabled = true;

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
    btn.className = 'primary-cta-btn bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-[0_8px_24px_rgba(168,85,247,0.35)]';
  } else {
    btn.innerText = 'Spin';
    btn.className = 'primary-cta-btn bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-[0_8px_24px_rgba(168,85,247,0.35)]';
  }
}

// Bet Controls
function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(MAX_BET, Math.max(MIN_BET, amount));
  const el = document.getElementById('currentBetDisplay');
  if (el) el.innerText = currentBet;
  updateActiveChipUI();
  updateActionButtonState();
}

function halveBet() {
  if (isWheelSpinning) return;
  setBet(Math.max(MIN_BET, Math.round(currentBet / 2)));
}

function doubleBet() {
  if (isWheelSpinning) return;
  setBet(Math.min(MAX_BET, currentBet * 2));
}

function updateActiveChipUI() {
  document.querySelectorAll('.bet-pill-btn').forEach(btn => {
    const val = parseInt(btn.getAttribute('data-val') || '0', 10);
    if (val === currentBet) {
      btn.classList.add('active');
      btn.style.borderColor = '#a855f7';
      btn.style.boxShadow = '0 0 16px rgba(168, 85, 247, 0.3)';
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
    }
  });
}

// Rules Sheet Modal Controller (Screenshot 3 Match)
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
function showToast(title, msg, icon = '🎡') {
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

// Spin Action Handling
function handleSpinAction() {
  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }
  spinWheelGame();
}

// 12 Wedges (Screenshot 2 & 4 Match: 1 Gold 5x, 1 Deep Violet 2x, 2 Light Purple 1x, 2 Lavender 0.5x, 6 BUST)
const WHEEL_WEDGES = [
  { label: '5×', mult: 5, color: '#eab308', text: '#000' },
  { label: 'BUST', mult: 0, color: '#161922', text: '#94a3b8' },
  { label: '0.5×', mult: 0.5, color: '#f3e8ff', text: '#3b0764' },
  { label: 'BUST', mult: 0, color: '#161922', text: '#94a3b8' },
  { label: '1×', mult: 1, color: '#c084fc', text: '#1e1b4b' },
  { label: 'BUST', mult: 0, color: '#161922', text: '#94a3b8' },
  { label: '2×', mult: 2, color: '#581c87', text: '#ffffff' },
  { label: 'BUST', mult: 0, color: '#161922', text: '#94a3b8' },
  { label: '0.5×', mult: 0.5, color: '#f3e8ff', text: '#3b0764' },
  { label: 'BUST', mult: 0, color: '#161922', text: '#94a3b8' },
  { label: '1×', mult: 1, color: '#c084fc', text: '#1e1b4b' },
  { label: 'BUST', mult: 0, color: '#161922', text: '#94a3b8' }
];

function drawSpinWheel() {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 12;
  const numWedges = WHEEL_WEDGES.length;
  const sliceAngle = (2 * Math.PI) / numWedges;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Outer glowing ring with perimeter dots (Screenshot 2 & 4 Match)
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
  ctx.fillStyle = '#1e1730';
  ctx.fill();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#a855f7';
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Outer ring rim lights
  for (let d = 0; d < 12; d++) {
    const dAngle = d * sliceAngle + sliceAngle / 2;
    const dotX = cx + (cx - 7) * Math.cos(dAngle);
    const dotY = cy + (cx - 7) * Math.sin(dAngle);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e9d5ff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#c084fc';
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw 12 Wedges
  WHEEL_WEDGES.forEach((wedge, i) => {
    const start = i * sliceAngle - Math.PI / 2;
    const end = start + sliceAngle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.fillStyle = wedge.color;
    ctx.fill();
    ctx.strokeStyle = '#2b1a45';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = wedge.text;
    ctx.font = '900 12px "Plus Jakarta Sans"';
    ctx.fillText(wedge.label, radius - 14, 4);
    ctx.restore();
  });

  // Center 3D spherical hub (Screenshot 2 & 4 Match)
  const hubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 18);
  hubGrad.addColorStop(0, '#e9d5ff');
  hubGrad.addColorStop(0.5, '#c084fc');
  hubGrad.addColorStop(1, '#581c87');
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#a855f7';
  ctx.fill();
  ctx.shadowBlur = 0;
}

function spinWheelGame() {
  if (isWheelSpinning) return;
  isWheelSpinning = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('wheelCanvas');
  const numWedges = WHEEL_WEDGES.length;
  const sliceDeg = 360 / numWedges;

  let winProbability = 0.50;
  if (balance >= 10000) winProbability = 0.10;
  else if (balance >= 5000) winProbability = 0.20;

  const isWin = Math.random() < winProbability;
  let targetIdx;
  if (isWin) {
    const winIndices = [0, 2, 4, 6, 8, 10];
    targetIdx = winIndices[Math.floor(Math.random() * winIndices.length)];
  } else {
    const loseIndices = [1, 3, 5, 7, 9, 11];
    targetIdx = loseIndices[Math.floor(Math.random() * loseIndices.length)];
  }

  const turns = 5 + Math.floor(Math.random() * 3);
  const targetWedgeAngle = 270 - (targetIdx * sliceDeg + sliceDeg / 2);
  const finalAngle = turns * 360 + targetWedgeAngle;

  wheelRotationAngle += finalAngle;
  canvas.style.transition = 'transform 3.2s cubic-bezier(0.15, 0.9, 0.2, 1)';
  canvas.style.transform = `rotate(${wheelRotationAngle}deg)`;

  const tickInterval = setInterval(() => {
    playTone('tick');
  }, 120);

  setTimeout(() => {
    clearInterval(tickInterval);
    isWheelSpinning = false;
    const landed = WHEEL_WEDGES[targetIdx];
    const grossWin = Math.round(currentBet * landed.mult);
    const wonAmount = grossWin;

    balance += wonAmount;
    saveBalance();
    updateBalanceUI();

    if (landed.mult >= 5) {
      if (window.confetti) confetti({ particleCount: 90, spread: 80 });
      playTone('jackpot');
      showToast('GOLD WEDGE!', `Landed ×5! Won +${wonAmount} 🪙`, '👑');
    } else if (landed.mult > 0) {
      playTone('win');
      showToast('Wedge Hit!', `Landed ${landed.label}! Won +${wonAmount} 🪙`, '🎡');
    } else {
      playTone('lose');
      showToast('Bust Wedge', 'Landed ×0. Better luck next spin!', '💨');
    }
  }, 3300);
}

// DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  const storedStars = localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars');
  balance = parseInt(storedStars || '10', 10);

  updateBalanceUI();
  setBet(50);
  drawSpinWheel();

  if (window.lucide) lucide.createIcons();
});
