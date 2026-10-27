/**
 * COIN FLIP CONTROLLER — NOVA ARCADE SUITE
 * Matches Reference Screenshot 2 Pixel-Perfect
 * 3D Tumbling Realistic Gold Coin • 50% Win Rate Calibration
 */

const MIN_BET = 30;
const MAX_BET = 2000;
const QUICK_BETS = [30, 50, 100, 500];

let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let currentBet = 50;
let soundEnabled = true;

let coinSelectedSide = 'heads';
let isCoinFlipping = false;
let coinRecentRounds = [];

// Audio synthesizers via Tone.js
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
    } else if (type === 'flip') {
      synth.triggerAttackRelease(["D4", "F#4", "A4"], "16n", undefined, 0.3);
    } else if (type === 'win') {
      synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", undefined, 0.5);
    } else if (type === 'lose') {
      synth.triggerAttackRelease(["Eb4", "D4", "C4"], "8n", undefined, 0.4);
    } else if (type === 'tick') {
      synth.triggerAttackRelease("A5", "64n", undefined, 0.1);
    }
  } catch(e) {}
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
  } catch(e) {}
}

function claimFreeRefill() {
  playTone('win');
  balance += 200;
  saveBalance();
  updateBalanceUI();
  closeBuyCoinsModal();
  if (window.confetti) confetti({ particleCount: 35, spread: 60, origin: { y: 0.2 } });
}

// Side Selection (Heads vs Tails)
function selectCoinSide(side) {
  if (isCoinFlipping) return;
  playTone('click');
  coinSelectedSide = side;

  const btnH = document.getElementById('btnHeads');
  const btnT = document.getElementById('btnTails');

  if (side === 'heads') {
    btnH.className = "p-3 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-500/5 border-2 border-yellow-400/90 text-left shadow-[0_0_16px_rgba(234,179,8,0.2)] transition-all";
    btnT.className = "p-3 rounded-2xl bg-[#141822] border border-[#232a3a] text-left hover:border-gray-500 transition-all";
    btnH.querySelector('h4').className = "font-black text-xs text-yellow-300 leading-tight";
    btnT.querySelector('h4').className = "font-black text-xs text-gray-200 leading-tight";
  } else {
    btnT.className = "p-3 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-500/5 border-2 border-yellow-400/90 text-left shadow-[0_0_16px_rgba(234,179,8,0.2)] transition-all";
    btnH.className = "p-3 rounded-2xl bg-[#141822] border border-[#232a3a] text-left hover:border-gray-500 transition-all";
    btnT.querySelector('h4').className = "font-black text-xs text-yellow-300 leading-tight";
    btnH.querySelector('h4').className = "font-black text-xs text-gray-200 leading-tight";
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
  if (isCoinFlipping) return;
  setBet(Math.max(MIN_BET, Math.round(currentBet / 2)));
}

function doubleBet() {
  if (isCoinFlipping) return;
  setBet(Math.min(MAX_BET, currentBet * 2));
}

function updateActiveChipUI() {
  document.querySelectorAll('.bet-pill-btn').forEach(btn => {
    const val = parseInt(btn.getAttribute('data-val') || '0', 10);
    if (val === currentBet) {
      btn.classList.add('active');
      btn.style.borderColor = '#eab308';
      btn.style.boxShadow = '0 0 16px rgba(234, 179, 8, 0.3)';
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
    }
  });
}

function updateActionButtonState() {
  const btn = document.getElementById('primaryPlayBtn');
  if (!btn) return;

  if (balance < currentBet) {
    btn.innerText = 'Buy coins';
    btn.className = "primary-cta-btn bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-amber-950 shadow-[0_8px_24px_rgba(234,179,8,0.35)]";
  } else {
    btn.innerText = 'Flip Coin';
    btn.className = "primary-cta-btn bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-amber-950 shadow-[0_8px_24px_rgba(234,179,8,0.35)]";
  }
}

function handlePrimaryAction() {
  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }
  flipCoinGame();
}

// Coin Flip Action with 3D Tumbling
let currentCoinRotation = 0;

function flipCoinGame() {
  if (isCoinFlipping) return;
  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }

  isCoinFlipping = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('flip');

  const btn = document.getElementById('primaryPlayBtn');
  const coinDisc = document.getElementById('coinDisc');
  const outcomeText = document.getElementById('coinOutcomeText');

  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerText = 'Flipping...';
  }
  if (outcomeText) outcomeText.innerText = 'Coin is tumbling in mid-air...';

  // 50% Win Rate Calibration
  const isWin = Math.random() < 0.5;
  const outcome = isWin ? coinSelectedSide : (coinSelectedSide === 'heads' ? 'tails' : 'heads');

  // Multi-spin rotation
  const extraRotations = (4 + Math.floor(Math.random() * 3)) * 360;
  currentCoinRotation += extraRotations;
  if (outcome === 'tails') {
    currentCoinRotation += 180;
  }

  if (coinDisc) {
    coinDisc.style.transform = `rotateY(${currentCoinRotation}deg)`;
  }

  setTimeout(() => {
    finishCoinFlip(outcome, isWin);
  }, 1400);
}

function finishCoinFlip(outcome, isWin) {
  const outcomeText = document.getElementById('coinOutcomeText');
  const btn = document.getElementById('primaryPlayBtn');

  const outcomeName = outcome === 'heads' ? 'Heads (Star ⭐)' : 'Tails (Gift 🎁)';
  const payout = Math.floor(currentBet * 1.9);

  if (isWin) {
    playTone('win');
    balance += payout;
    saveBalance();
    updateBalanceUI();
    if (outcomeText) outcomeText.innerHTML = `Landed on <b class="text-white">${outcomeName}</b>! Won +${payout} 🪙 (×1.9)`;
    if (window.confetti) confetti({ particleCount: 50, spread: 70, origin: { y: 0.3 } });
  } else {
    playTone('lose');
    if (outcomeText) outcomeText.innerHTML = `Landed on <b class="text-white">${outcomeName}</b>. Stake lost.`;
  }

  // Record history
  coinRecentRounds.unshift({
    outcome: outcome === 'heads' ? '⭐' : '🎁',
    isWin,
    mult: isWin ? '×1.9' : '×0'
  });
  if (coinRecentRounds.length > 8) coinRecentRounds.pop();
  renderRecentRounds();

  setTimeout(() => {
    isCoinFlipping = false;
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
    updateActionButtonState();
  }, 1200);
}

function renderRecentRounds() {
  const container = document.getElementById('coinRecentRounds');
  if (!container) return;

  if (coinRecentRounds.length === 0) {
    container.innerHTML = 'No rounds yet. Place your first bet.';
    return;
  }

  container.innerHTML = '';
  coinRecentRounds.forEach(r => {
    const pill = document.createElement('span');
    pill.className = `px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${r.isWin ? 'bg-amber-500/20 text-yellow-300 border border-yellow-400/30' : 'bg-[#181d28] text-gray-400 border border-[#263145]'}`;
    pill.innerHTML = `<span>${r.outcome}</span> <span>${r.mult}</span>`;
    container.appendChild(pill);
  });
}

// Modals
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

function openBuyCoinsModal() {
  playTone('click');
  const sheet = document.getElementById('buyCoinsModalSheet');
  const overlay = document.getElementById('buyCoinsModalOverlay');
  if (!sheet || !overlay) return;
  overlay.classList.remove('hidden');
  setTimeout(() => sheet.classList.add('open'), 10);
}

function closeBuyCoinsModal() {
  playTone('click');
  const sheet = document.getElementById('buyCoinsModalSheet');
  const overlay = document.getElementById('buyCoinsModalOverlay');
  if (!sheet || !overlay) return;
  sheet.classList.remove('open');
  setTimeout(() => overlay.classList.add('hidden'), 280);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateBalanceUI();
  setBet(50);
  selectCoinSide('heads');
  if (window.lucide) lucide.createIcons();
});
