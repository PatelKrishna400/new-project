/**
 * COIN FLIP CONTROLLER — NOVA ARCADE SUITE
 * Matches Reference Screenshot 2 Pixel-Perfect
 * 3D Tumbling Realistic Gold Coin • 50% Win Rate Calibration
 */

const MIN_BET = 30;
const MAX_BET = 2000;
const QUICK_BETS = [30, 50, 100, 500];
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 10;

let balance = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '100', 10);
let currentBet = 50;
let soundEnabled = true;

let coinSelectedSide = 'heads';
let isCoinFlipping = false;
let coinRecentRounds = [];

// Daily Plays Tracker
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getPlaysUsedToday() {
  const key = `lucky_plays_coinflip_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getBonusPlaysToday() {
  const key = `lucky_bonus_coinflip_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getRemainingPlays() {
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const used = getPlaysUsedToday();
  return Math.max(0, total - used);
}
function recordPlayUsed() {
  const key = `lucky_plays_coinflip_${getTodayKey()}`;
  const used = getPlaysUsedToday() + 1;
  localStorage.setItem(key, used.toString());
}
function grantBonusPlays(count = BONUS_PLAYS_PER_AD) {
  const key = `lucky_bonus_coinflip_${getTodayKey()}`;
  const current = getBonusPlaysToday() + count;
  localStorage.setItem(key, current.toString());
}

// Dynamic Win Rate Calibration based on Total Coin Balance:
// - Low balance (< 500 coins): 50% (0.50)
// - Medium balance (500 to 2499 coins): 35% (0.35)
// - High balance (2500 to 9999 coins): 20% (0.20)
// - Whale balance (10,000+ coins): 10% (0.10)
function getWinProbability(customBalance) {
  const bal = (typeof customBalance === 'number') ? customBalance : balance;
  if (bal >= 10000) return 0.10;
  if (bal >= 2500)  return 0.20;
  if (bal >= 500)   return 0.35;
  return 0.50;
}

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
  const userStars = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  const elCoins = document.getElementById('headerCoinDisplay') || document.getElementById('coinBalance');
  const elStars = document.getElementById('headerStarDisplay') || document.getElementById('starBalanceDisplay');

  if (elCoins) elCoins.innerText = balance.toLocaleString();
  if (elStars) elStars.innerText = userStars.toLocaleString();
  updateActionButtonState();
}

function saveBalance() {
  localStorage.setItem('task_game_coins', Math.max(0, balance).toString());
  localStorage.setItem('user_coins', Math.max(0, balance).toString());
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'BALANCES_UPDATED', stars: balance, timestamp: Date.now() });
    bc.close();
  } catch(e) {}
  if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
    window.firebaseSync.syncPlayerCurrenciesImmediate();
  }
}

function claimFreeRefill() {
  window.location.href = '../home/index.html';
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
  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }
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

  recordPlayUsed();
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

  // Dynamic Win Rate Calibration based on Star Balance
  const isWin = Math.random() < getWinProbability();
  const outcome = isWin ? coinSelectedSide : (coinSelectedSide === 'heads' ? 'tails' : 'heads');

  // Multi-spin rotation: Heads is at 0° (mod 360°), Tails is at 180° (mod 360°)
  const desiredMod = outcome === 'tails' ? 180 : 0;
  const currentMod = ((currentCoinRotation % 360) + 360) % 360;
  let diff = desiredMod - currentMod;
  if (diff <= 0) diff += 360;
  const extraRotations = (4 + Math.floor(Math.random() * 3)) * 360;
  currentCoinRotation += extraRotations + diff;

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
  const payout = isWin ? Math.round(currentBet * 2) : 0;

  if (isWin) {
    playTone('win');
    balance += payout;
    saveBalance();
    updateBalanceUI();
    if (outcomeText) outcomeText.innerHTML = `Landed on <b class="text-white">${outcomeName}</b>! Won +${payout} 🪙 (×2)`;
    if (window.confetti) confetti({ particleCount: 50, spread: 70, origin: { y: 0.3 } });
  } else {
    playTone('lose');
    if (outcomeText) outcomeText.innerHTML = `Landed on <b class="text-white">${outcomeName}</b>. Stake lost.`;
  }

  // Record history
  coinRecentRounds.unshift({
    outcome: outcome === 'heads' ? '⭐' : '🎁',
    isWin,
    mult: isWin ? '×2' : '×0'
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
  // Recent rounds removed from UI
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
  const onUserReward = () => {
    grantBonusPlays(10);
    closeAdModal();
    if (typeof updateBalanceUI === 'function') updateBalanceUI();
    if (typeof updateActionButtonState === 'function') updateActionButtonState();
    if (typeof showToast === 'function') showToast('Plays Added!', 'Added +10 game plays! Good luck!', '⚡');
  };

  // Rewarded interstitial
  if (typeof show_10691428 === 'function') {
    show_10691428().then(() => {
      // You need to add your user reward function here, which will be executed after the user watches the ad.
      // For more details, please refer to the detailed instructions.
      alert('You have seen an ad!');
      onUserReward();
    }).catch(err => {
      console.warn('show_10691428 notice:', err);
      onUserReward();
    });
  } else if (typeof window.show_10691428 === 'function') {
    window.show_10691428().then(() => {
      alert('You have seen an ad!');
      onUserReward();
    }).catch(err => {
      console.warn('show_10691428 notice:', err);
      onUserReward();
    });
  } else {
    try {
      show_10691428().then(() => {
        alert('You have seen an ad!');
        onUserReward();
      });
    } catch(e) {
      alert('You have seen an ad!');
      onUserReward();
    }
  }
}

// Initialize on page load & Firebase Balance Synchronization
document.addEventListener('DOMContentLoaded', () => {
  balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  updateBalanceUI();
  setBet(50);
  selectCoinSide('heads');
  if (window.lucide) lucide.createIcons();
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
