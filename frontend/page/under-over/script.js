/**
 * UNDER OVER LOGIC — NOVA ARCADE SUITE
 * Dynamic Slider Threshold • Under vs Over Modes • Multipliers up to ×95 • Coin Sync
 */

let balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let currentBet = 50;
let soundEnabled = true;
let uoDirection = 'under';
let uoThreshold = 50;
let isRollingUO = false;

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
  updateCalculations();
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

function showToast(title, msg, icon = '🟢') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
}

// Under vs Over Mode
function setUnderOverMode(mode) {
  playTone('tick');
  uoDirection = mode;
  const btnUnder = document.getElementById('btnUnder');
  const btnOver = document.getElementById('btnOver');

  if (mode === 'under') {
    btnUnder.classList.add('active');
    btnOver.classList.remove('active');
  } else {
    btnOver.classList.add('active');
    btnUnder.classList.remove('active');
  }
  updateCalculations();
}

function onThresholdChange(val) {
  uoThreshold = parseInt(val, 10);
  document.getElementById('sliderValueText').innerText = uoThreshold;
  document.getElementById('lblThresholdUnder').innerText = uoThreshold;
  document.getElementById('lblThresholdOver').innerText = uoThreshold;
  document.getElementById('barTargetLabel').innerText = `Target: ${uoThreshold}`;
  document.getElementById('barFill').style.width = `${uoThreshold}%`;
  updateCalculations();
}

function updateCalculations() {
  let winChance = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
  winChance = Math.max(1, Math.min(98, winChance));

  const payout = (95 / winChance).toFixed(2);
  const toWin = Math.round(currentBet * payout);

  document.getElementById('winChanceBadge').innerText = `${winChance}%`;
  document.getElementById('payoutBadge').innerText = `×${payout}`;
  document.getElementById('toWinBadge').innerText = `${toWin.toLocaleString()} 🪙`;
}

function rollUnderOverGame() {
  if (isRollingUO) return;

  if (balance < currentBet) {
    showToast('Insufficient Coins', 'Tap the + button to claim free refill coins!', '⚠️');
    playTone('lose');
    return;
  }

  isRollingUO = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const numEl = document.getElementById('bigNumberDisplay');
  let counter = 0;
  const rollInterval = setInterval(() => {
    numEl.innerText = Math.floor(Math.random() * 100);
    playTone('tick');
    counter++;
  }, 70);

  setTimeout(() => {
    clearInterval(rollInterval);
    isRollingUO = false;
    const finalNumber = Math.floor(Math.random() * 100);
    numEl.innerText = finalNumber;

    let won = false;
    if (uoDirection === 'under' && finalNumber < uoThreshold) won = true;
    if (uoDirection === 'over' && finalNumber > uoThreshold) won = true;

    let winChance = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
    const payout = parseFloat((95 / Math.max(1, winChance)).toFixed(2));

    if (won) {
      const winAmount = Math.round(currentBet * payout);
      balance += winAmount;
      saveBalance();
      updateBalanceUI();
      if (payout >= 5 && window.confetti) {
        confetti({ particleCount: 85, spread: 70 });
      }
      playTone('win');
      showToast('Target Hit!', `Rolled ${finalNumber}! Won ${winAmount.toLocaleString()} 🪙 (×${payout})`, '🎯');
    } else {
      playTone('lose');
      showToast('Missed Condition', `Rolled ${finalNumber}. Condition not met.`, '❌');
    }
  }, 1100);
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
  updateCalculations();

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
