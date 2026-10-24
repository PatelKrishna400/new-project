/**
 * LUCKY SPIN GAME LOGIC — NOVA ARCADE SUITE
 * 12-Wedges Fortune Wheel • Gold ×5 Jackpot • Coin Sync
 */

let balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let currentBet = 50;
let soundEnabled = true;
let isWheelSpinning = false;
let wheelRotationAngle = 0;

// Wedges Definition
const WHEEL_WEDGES = [
  { label: '×5', mult: 5, color: '#eab308', text: '#000000' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888' },
  { label: '×1', mult: 1, color: '#7c3aed', text: '#ffffff' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888' },
  { label: '×0.5', mult: 0.5, color: '#a78bfa', text: '#000000' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888' },
  { label: '×2', mult: 2, color: '#581c87', text: '#ffffff' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888' },
  { label: '×1', mult: 1, color: '#7c3aed', text: '#ffffff' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888' },
  { label: '×0.5', mult: 0.5, color: '#a78bfa', text: '#000000' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888888' }
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

function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(2000, Math.max(30, amount));
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

function showToast(title, msg, icon = '🎡') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
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

function spinWheelGame() {
  if (isWheelSpinning) return;

  if (balance < currentBet) {
    showToast('Insufficient Coins', 'Tap the + button to claim free refill coins!', '⚠️');
    playTone('lose');
    return;
  }

  isWheelSpinning = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('wheelCanvas');
  const targetIndex = Math.floor(Math.random() * WHEEL_WEDGES.length);
  const sliceDeg = 360 / WHEEL_WEDGES.length;

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
    const wedge = WHEEL_WEDGES[targetIndex];
    const winAmount = Math.round(currentBet * wedge.mult);
    balance += winAmount;
    saveBalance();
    updateBalanceUI();

    if (wedge.mult >= 5) {
      if (window.confetti) confetti({ particleCount: 110, spread: 80 });
      playTone('jackpot');
      showToast('GOLD WEDGE!', `Hit ×5! Payout +${winAmount.toLocaleString()} 🪙`, '👑');
    } else if (wedge.mult > 0) {
      playTone('win');
      showToast(`Landed on ${wedge.label}`, `Multiplier awarded! (+${winAmount.toLocaleString()} 🪙)`, '🎡');
    } else {
      playTone('lose');
      showToast('Bust Wedge', 'No luck on this spin! Stake lost.', '💀');
    }
  }, 3600);
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

// Init
window.addEventListener('DOMContentLoaded', () => {
  balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  updateBalanceUI();
  updateActiveChipUI();
  drawSpinWheel();

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_coins') {
      balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
      updateBalanceUI();
    }
  });

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.onmessage = () => {
      balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
      updateBalanceUI();
    };
  } catch (e) {}
});
