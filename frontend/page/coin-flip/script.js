/**
 * COIN FLIP LOGIC — NOVA ARCADE SUITE
 * 3D Coin Rotation • Star vs Gift • ×1.9 Double Win • Coin Sync
 */

let balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let currentBet = 50;
let soundEnabled = true;
let coinSelectedSide = 'heads';
let isCoinFlipping = false;

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

function selectCoinSide(side) {
  playTone('tick');
  coinSelectedSide = side;
  const btnHeads = document.getElementById('btnHeads');
  const btnTails = document.getElementById('btnTails');

  if (side === 'heads') {
    btnHeads.classList.add('active');
    btnTails.classList.remove('active');
  } else {
    btnTails.classList.add('active');
    btnHeads.classList.remove('active');
  }
}

function showToast(title, msg, icon = '🪙') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
}

// Flip Game Execution
function flipCoinGame() {
  if (isCoinFlipping) return;

  if (balance < currentBet) {
    showToast('Insufficient Coins', 'Tap the + button to claim free refill coins!', '⚠️');
    playTone('lose');
    return;
  }

  isCoinFlipping = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const coinEl = document.getElementById('coinElement');
  const symbolEl = document.getElementById('coinSymbol');
  const outcome = Math.random() < 0.5 ? 'heads' : 'tails';

  coinEl.style.transform = 'rotateY(1800deg) scale(1.15)';

  let flipCount = 0;
  const flipTimer = setInterval(() => {
    symbolEl.innerText = flipCount % 2 === 0 ? '⭐' : '🎁';
    playTone('tick');
    flipCount++;
  }, 100);

  setTimeout(() => {
    clearInterval(flipTimer);
    coinEl.style.transform = 'rotateY(0deg) scale(1)';
    symbolEl.innerText = outcome === 'heads' ? '⭐' : '🎁';
    isCoinFlipping = false;

    if (outcome === coinSelectedSide) {
      const winAmount = Math.round(currentBet * 1.9);
      balance += winAmount;
      saveBalance();
      updateBalanceUI();
      if (window.confetti) confetti({ particleCount: 70, spread: 65 });
      playTone('win');
      showToast('Correct Call!', `${outcome.toUpperCase()} landed! Paid ×1.9 (+${winAmount.toLocaleString()} 🪙)`, '🪙');
    } else {
      playTone('lose');
      showToast('Wrong Call', `Coin landed on ${outcome.toUpperCase()}. Stake lost!`, '💨');
    }
  }, 1300);
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
