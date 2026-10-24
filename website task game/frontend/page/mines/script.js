/**
 * GIFT HUNT (MINES) LOGIC — NOVA ARCADE SUITE
 * 5×5 Dynamic Minefield • Progressive Cashout Multipliers • Coin Sync
 */

let balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let currentBet = 50;
let soundEnabled = true;
let minesBombCount = 5;
let minesGridData = [];
let isMinesActive = false;
let minesRevealedCount = 0;

// Web Audio API Synthesizer
let synth = null;
let noiseSynth = null;

function initAudio() {
  if (!synth && window.Tone) {
    try {
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 }
      }).toDestination();
      noiseSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
      }).toDestination();
    } catch(e) {}
  }
}

function playTone(type) {
  if (!soundEnabled) return;
  try {
    if (window.Tone && Tone.context.state !== 'running') Tone.start();
    initAudio();

    if (type === 'click' && synth) {
      synth.triggerAttackRelease("C5", "32n", undefined, 0.2);
    } else if (type === 'roll' && synth) {
      synth.triggerAttackRelease(["E4", "G4", "C5"], "16n", undefined, 0.3);
    } else if (type === 'win' && synth) {
      synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", undefined, 0.5);
    } else if (type === 'jackpot' && synth) {
      synth.triggerAttackRelease(["G4", "C5", "E5", "G5", "C6"], "4n", undefined, 0.6);
    } else if (type === 'lose' && synth) {
      synth.triggerAttackRelease(["Eb4", "D4", "C4"], "8n", undefined, 0.4);
    } else if (type === 'bomb' && noiseSynth) {
      noiseSynth.triggerAttackRelease("8n", undefined, 0.8);
    }
  } catch (e) {}
}

function toggleSound(checked) {
  soundEnabled = checked;
  if (checked) playTone('click');
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
  if (isMinesActive) return;
  playTone('click');
  currentBet = Math.min(2000, Math.max(30, amount));
  const betEl = document.getElementById('currentBetDisplay');
  if (betEl) betEl.innerText = currentBet;
  updateActiveChipUI();
}

function halveBet() { if (!isMinesActive) setBet(Math.floor(currentBet / 2)); }
function doubleBet() { if (!isMinesActive) setBet(currentBet * 2); }

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

function showToast(title, msg, icon = '💎') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
}

// 5×5 Mines Grid Logic
function initMinesGrid() {
  const grid = document.getElementById('minesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  minesGridData = [];
  minesRevealedCount = 0;

  for (let i = 0; i < 25; i++) {
    minesGridData.push({ isBomb: false, revealed: false });
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.id = `mine-tile-${i}`;
    tile.className = 'mine-tile';
    tile.onclick = () => tapMinesTile(i);
    grid.appendChild(tile);
  }
}

function onBombCountChange(val) {
  if (isMinesActive) return;
  minesBombCount = parseInt(val, 10);
  initMinesGrid();
}

function startMinesHunt() {
  if (isMinesActive) return;

  if (balance < currentBet) {
    showToast('Insufficient Coins', 'Tap the + button to claim free refill coins!', '⚠️');
    playTone('lose');
    return;
  }

  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  minesBombCount = parseInt(document.getElementById('bombCountSelect').value, 10);
  initMinesGrid();

  // Distribute bombs
  let placedBombs = 0;
  while (placedBombs < minesBombCount) {
    const idx = Math.floor(Math.random() * 25);
    if (!minesGridData[idx].isBomb) {
      minesGridData[idx].isBomb = true;
      placedBombs++;
    }
  }

  isMinesActive = true;
  document.getElementById('btnStartHunt').style.display = 'none';
  const cashBtn = document.getElementById('btnCashout');
  cashBtn.style.display = 'block';
  document.getElementById('cashoutAmountText').innerText = currentBet;
  document.getElementById('currentMultiplierText').innerText = '×1.00';
  document.getElementById('bombCountSelect').disabled = true;

  showToast('Hunt Started', 'Tap safe tiles to multiply coins. Cash out anytime!', '💎');
}

function tapMinesTile(index) {
  if (!isMinesActive) return;
  const tileData = minesGridData[index];
  if (tileData.revealed) return;

  const tileEl = document.getElementById(`mine-tile-${index}`);
  tileData.revealed = true;

  if (tileData.isBomb) {
    playTone('bomb');
    tileEl.className = 'mine-tile revealed-bomb';
    tileEl.innerText = '💣';
    revealAllMines();
    isMinesActive = false;
    showToast('BOMB EXPLODED!', 'Game over, stake lost.', '💥');

    document.getElementById('btnStartHunt').style.display = 'block';
    document.getElementById('btnCashout').style.display = 'none';
    document.getElementById('bombCountSelect').disabled = false;
  } else {
    playTone('win');
    minesRevealedCount++;
    tileEl.className = 'mine-tile revealed-gift';
    tileEl.innerText = '🎁';

    const growthFactor = minesBombCount === 3 ? 1.15 : (minesBombCount === 5 ? 1.32 : 1.75);
    const currentMult = (Math.pow(growthFactor, minesRevealedCount)).toFixed(2);
    document.getElementById('currentMultiplierText').innerText = `×${currentMult}`;

    const currentWin = Math.round(currentBet * currentMult);
    document.getElementById('cashoutAmountText').innerText = currentWin.toLocaleString();
  }
}

function cashoutMines() {
  if (!isMinesActive) return;
  isMinesActive = false;
  const multStr = document.getElementById('currentMultiplierText').innerText.replace('×', '');
  const winAmount = Math.round(currentBet * parseFloat(multStr));
  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  if (window.confetti) confetti({ particleCount: 85, spread: 70 });
  playTone('jackpot');
  showToast('Cashed Out!', `Secured ×${multStr} (+${winAmount.toLocaleString()} 🪙)`, '💰');

  revealAllMines();
  document.getElementById('btnStartHunt').style.display = 'block';
  document.getElementById('btnCashout').style.display = 'none';
  document.getElementById('bombCountSelect').disabled = false;
}

function revealAllMines() {
  minesGridData.forEach((item, idx) => {
    const el = document.getElementById(`mine-tile-${idx}`);
    if (!item.revealed) {
      el.innerText = item.isBomb ? '💣' : '🎁';
      el.style.opacity = '0.5';
    }
  });
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
  initMinesGrid();

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
