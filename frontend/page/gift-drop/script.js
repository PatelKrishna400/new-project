/**
 * GIFT DROP (PLINKO) LOGIC — NOVA ARCADE SUITE
 * Peg Board Physics • 11 Payout Buckets • Outer ×24 Edges • Coin Sync
 */

let balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let currentBet = 50;
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

function showToast(title, msg, icon = '🎁') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
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

function dropPlinkoBall() {
  if (isDroppingPlinko) return;

  if (balance < currentBet) {
    showToast('Insufficient Coins', 'Tap the + button to claim free refill coins!', '⚠️');
    playTone('lose');
    return;
  }

  isDroppingPlinko = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('plinkoCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  let x = w / 2;
  let y = 10;
  let vx = (Math.random() - 0.5) * 1.5;
  let vy = 1.2;

  function animateDrop() {
    ctx.clearRect(0, 0, w, h);
    drawPlinkoBoard(ctx, w, h);

    vy += 0.28;
    x += vx;
    y += vy;

    // Deflection off pegs
    if (Math.random() < 0.26) {
      vx += (Math.random() - 0.5) * 2;
      playTone('tick');
    }

    // Keep inside boundaries
    if (x < 15) { x = 15; vx = Math.abs(vx); }
    if (x > w - 15) { x = w - 15; vx = -Math.abs(vx); }

    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁', x, y);

    if (y < h - 28) {
      requestAnimationFrame(animateDrop);
    } else {
      isDroppingPlinko = false;
      const bucketWidth = w / PLINKO_BUCKETS.length;
      const bucketIndex = Math.min(PLINKO_BUCKETS.length - 1, Math.max(0, Math.floor(x / bucketWidth)));
      const mult = PLINKO_BUCKETS[bucketIndex];
      const winAmount = Math.round(currentBet * mult);
      balance += winAmount;
      saveBalance();
      updateBalanceUI();

      if (mult >= 5) {
        if (window.confetti) confetti({ particleCount: 100, spread: 75 });
        playTone('jackpot');
        showToast('EDGE SHOT!', `Landed on ×${mult}! Won ${winAmount.toLocaleString()} 🪙`, '🎁');
      } else if (mult > 0) {
        playTone('win');
        showToast('Gift Landed', `Paid ×${mult} (+${winAmount.toLocaleString()} 🪙)`, '🎁');
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

  const canvas = document.getElementById('plinkoCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    drawPlinkoBoard(ctx, canvas.width, canvas.height);
  }

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
