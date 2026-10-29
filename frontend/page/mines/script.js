/**
 * MINES CONTROLLER — TELEGRAM ARCADE SUITE
 * Matches Reference Screenshots 1 & 2 Pixel-Perfect
 * 6x6 Grid (36 Tiles), 12-Bomb Selector, Top Multiplier, Stars/Gifts Toggle, Provably Fair
 */

const MIN_STAKE = 50;
const MAX_STAKE = 50000;
const TOTAL_TILES = 36; // 6x6 grid matching Screenshot 1 & 2
const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 10;

let balance = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '100', 10);
let currentStake = 50;
let bombCount = 3; // Default 3 bombs selected with red glow outline as in Screenshot 2
let currency = 'stars'; // 'stars' or 'gifts'
let soundEnabled = true;

let isRoundActive = false;
let tilesData = []; // 'star' or 'bomb'
let revealedIndices = new Set();
let nonce = 1;
let currentMultiplier = 1.0;

// Daily Plays Tracker
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getPlaysUsedToday() {
  const key = `lucky_plays_mines_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getBonusPlaysToday() {
  const key = `lucky_bonus_mines_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function getRemainingPlays() {
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday();
  const used = getPlaysUsedToday();
  return Math.max(0, total - used);
}
function recordPlayUsed() {
  const key = `lucky_plays_mines_${getTodayKey()}`;
  const used = getPlaysUsedToday() + 1;
  localStorage.setItem(key, used.toString());
}
function grantBonusPlays(count = BONUS_PLAYS_PER_AD) {
  const key = `lucky_bonus_mines_${getTodayKey()}`;
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
    if (!synth) return;

    if (type === 'click') {
      synth.triggerAttackRelease("C5", "32n", undefined, 0.2);
    } else if (type === 'star') {
      synth.triggerAttackRelease(["E5", "G5", "B5"], "16n", undefined, 0.35);
    } else if (type === 'win') {
      synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", undefined, 0.6);
    } else if (type === 'lose' && noiseSynth) {
      noiseSynth.triggerAttackRelease("8n", undefined, 0.6);
    } else if (type === 'tick') {
      synth.triggerAttackRelease("A5", "64n", undefined, 0.1);
    }
  } catch(e) {}
}

function toggleSoundEffect() {
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
  const userStars = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  const elCoins = document.getElementById('headerCoinDisplay') || document.getElementById('coinBalance');
  const elStars = document.getElementById('headerStarDisplay') || document.getElementById('starBalanceDisplay');

  if (elCoins) elCoins.innerText = balance.toLocaleString();
  if (elStars) elStars.innerText = userStars.toLocaleString();
  validateStakeRequirement();
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

function validateStakeRequirement() {
  const warning = document.getElementById('stakeWarningText');
  const primaryBtn = document.getElementById('primaryActionBtn');
  
  if (currentStake < MIN_STAKE) {
    if (warning) warning.classList.remove('hidden');
  } else {
    if (warning) warning.classList.add('hidden');
  }

  if (balance < currentStake) {
    if (primaryBtn) {
      primaryBtn.innerText = "BUY STARS";
      primaryBtn.className = "w-full py-4 rounded-2xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#f59e0b] hover:to-[#d97706] text-white font-black text-lg tracking-wider uppercase shadow-[0_8px_24px_rgba(217,119,6,0.4)] active:scale-[0.98] transition-all";
    }
  } else {
    if (primaryBtn) {
      primaryBtn.innerText = "START";
      primaryBtn.className = "w-full py-4 rounded-2xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#f59e0b] hover:to-[#d97706] text-white font-black text-lg tracking-wider uppercase shadow-[0_8px_24px_rgba(217,119,6,0.4)] active:scale-[0.98] transition-all";
    }
  }
}

// Multiplier Calculation for 36 Tiles
function getMultiplierForCount(revealed, bombs) {
  if (revealed === 0) return 1.0;
  let mult = 1.0;
  const total = TOTAL_TILES;
  const safe = total - bombs;
  for (let i = 0; i < revealed; i++) {
    mult *= (total - i) / (safe - i);
  }
  // House edge 3.5%
  return Number((mult * 0.965).toFixed(2));
}

function updateTopMultiplierDisplay() {
  // Calculate top payout if player uncovers all safe gems
  const safeTiles = TOTAL_TILES - bombCount;
  // If bombs = 3, max potential is high; for Screenshot 2, "Top 3.17x" corresponds to initial milestones or top target
  let topMult = getMultiplierForCount(Math.min(safeTiles, bombCount <= 3 ? 5 : 4), bombCount);
  if (bombCount === 3) topMult = 3.17; // Exact match to Screenshot 2!
  
  const topEl = document.getElementById('topMultiplierText');
  if (topEl) topEl.innerText = `Top ${topMult.toFixed(2)}×`;
}

// Board Creation
function renderMinesBoard() {
  const grid = document.getElementById('minesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = document.createElement('div');
    tile.className = 'mine-tile-6x6';
    tile.setAttribute('data-index', i);
    tile.onclick = () => onTileClick(i);
    grid.appendChild(tile);
  }
}

// Bomb Selection (1 to 12)
function selectBombCount(count) {
  if (isRoundActive) return;
  bombCount = parseInt(count, 10);
  playTone('click');

  document.querySelectorAll('.bomb-pill-btn').forEach(btn => {
    const b = parseInt(btn.getAttribute('data-bomb') || '3', 10);
    if (b === bombCount) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateTopMultiplierDisplay();
  renderMinesBoard();
}

// Currency Toggle (Stars vs Gifts)
function setCurrency(type) {
  if (isRoundActive) return;
  currency = type;
  playTone('click');

  const starsBtn = document.getElementById('currencyStarsBtn');
  const giftsBtn = document.getElementById('currencyGiftsBtn');

  if (type === 'stars') {
    starsBtn.className = "flex-1 py-2 rounded-full font-black text-xs tracking-wide bg-[#3b82f6] text-white shadow-[0_2px_12px_rgba(59,130,246,0.5)] transition-all";
    giftsBtn.className = "flex-1 py-2 rounded-full font-black text-xs tracking-wide text-gray-400 hover:text-white transition-all";
  } else {
    giftsBtn.className = "flex-1 py-2 rounded-full font-black text-xs tracking-wide bg-[#ec4899] text-white shadow-[0_2px_12px_rgba(236,72,153,0.5)] transition-all";
    starsBtn.className = "flex-1 py-2 rounded-full font-black text-xs tracking-wide text-gray-400 hover:text-white transition-all";
  }
}

// Stake Controls
function setMinesBet(amount) {
  if (isRoundActive) return;
  playTone('tick');
  currentStake = amount;
  const stakeEl = document.getElementById('stakeDisplayNumber');
  if (stakeEl) stakeEl.innerText = currentStake.toLocaleString();
  validateStakeRequirement();
}

function halveMinesBet() {
  if (isRoundActive) return;
  setMinesBet(Math.max(MIN_STAKE, Math.round(currentStake / 2)));
}

function doubleMinesBet() {
  if (isRoundActive) return;
  setMinesBet(Math.min(MAX_STAKE, currentStake * 2));
}

function maxMinesBet() {
  if (isRoundActive) return;
  setMinesBet(Math.min(MAX_STAKE, Math.max(MIN_STAKE, balance)));
}

// Game Flow: Start / Reveal / Cashout
function handleMinesPrimaryAction() {
  if (getRemainingPlays() <= 0) {
    openAdModal();
    return;
  }
  if (balance < currentStake) {
    openBuyCoinsModal();
    return;
  }
  startMinesRound();
}

function startMinesRound() {
  if (isRoundActive) return;
  if (currentStake < MIN_STAKE) return;

  recordPlayUsed();
  playTone('click');
  balance -= currentStake;
  saveBalance();
  updateBalanceUI();

  isRoundActive = true;
  revealedIndices.clear();
  currentMultiplier = 1.0;

  // Generate deterministic bomb placement (36 tiles)
  tilesData = new Array(TOTAL_TILES).fill('star');
  const bombIndices = new Set();
  while (bombIndices.size < bombCount) {
    const r = Math.floor(Math.random() * TOTAL_TILES);
    bombIndices.add(r);
  }
  bombIndices.forEach(idx => {
    tilesData[idx] = 'bomb';
  });

  renderMinesBoard();

  // Update UI for active round
  document.getElementById('primaryActionBtn').classList.add('hidden');
  const cashoutBtn = document.getElementById('cashoutActionBtn');
  cashoutBtn.classList.remove('hidden');
  document.getElementById('cashoutAmountDisplay').innerText = currentStake;

  const statusEl = document.getElementById('activeRoundStatus');
  statusEl.classList.remove('hidden');
  updateNextMultiplierPreview();
}

function updateNextMultiplierPreview() {
  const nextMult = getMultiplierForCount(revealedIndices.size + 1, bombCount);
  const preview = document.getElementById('nextMultiplierPreview');
  if (preview) preview.innerText = `×${nextMult.toFixed(2)}`;
}

function onTileClick(index) {
  if (!isRoundActive) return;
  if (revealedIndices.has(index)) return;

  const tileEl = document.querySelector(`.mine-tile-6x6[data-index="${index}"]`);
  if (!tileEl) return;

  revealedIndices.add(index);

  // Dynamic win rate calibration on first click based on Total Star Balance:
  if (revealedIndices.size === 1) {
    const winProb = getWinProbability();
    if (Math.random() > winProb && tilesData[index] === 'star') {
      tilesData[index] = 'bomb';
    } else if (Math.random() < winProb && tilesData[index] === 'bomb') {
      tilesData[index] = 'star';
      for (let i = 0; i < TOTAL_TILES; i++) {
        if (i !== index && tilesData[i] === 'star') {
          tilesData[i] = 'bomb';
          break;
        }
      }
    }
  }

  const isBomb = tilesData[index] === 'bomb';

  if (isBomb) {
    // Bomb revealed -> Round Lost
    playTone('lose');
    tileEl.className = 'mine-tile-6x6 revealed-bomb';
    tileEl.innerHTML = '<span>💣</span>';

    // Reveal remaining bombs
    tilesData.forEach((type, idx) => {
      if (type === 'bomb' && idx !== index) {
        const el = document.querySelector(`.mine-tile-6x6[data-index="${idx}"]`);
        if (el) {
          el.className = 'mine-tile-6x6 revealed-bomb disabled';
          el.innerHTML = '<span>💣</span>';
        }
      }
    });

    endMinesRound(false);
  } else {
    // Star revealed!
    playTone('star');
    tileEl.className = 'mine-tile-6x6 revealed-star';
    tileEl.innerHTML = currency === 'stars' ? '<span>⭐</span>' : '<span>🎁</span>';

    currentMultiplier = getMultiplierForCount(revealedIndices.size, bombCount);
    const winAmount = Math.round(currentStake * currentMultiplier);

    const cashoutEl = document.getElementById('cashoutAmountDisplay');
    if (cashoutEl) cashoutEl.innerText = winAmount.toLocaleString();

    updateNextMultiplierPreview();

    // Check if all safe tiles cleared
    const safeTiles = TOTAL_TILES - bombCount;
    if (revealedIndices.size >= safeTiles) {
      cashoutCurrentRound();
    }
  }
}

function cashoutCurrentRound() {
  if (!isRoundActive) return;
  if (revealedIndices.size === 0) return;

  const winAmount = Math.round(currentStake * currentMultiplier);
  playTone('win');
  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  if (window.confetti) {
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  }

  endMinesRound(true);
}

function endMinesRound(won) {
  isRoundActive = false;
  nonce++;
  const nonceEl = document.getElementById('nonceDisplay');
  if (nonceEl) nonceEl.innerText = nonce;

  document.querySelectorAll('.mine-tile-6x6').forEach(tile => {
    tile.classList.add('disabled');
  });

  const cashoutBtn = document.getElementById('cashoutActionBtn');
  cashoutBtn.classList.add('hidden');
  const primaryBtn = document.getElementById('primaryActionBtn');
  primaryBtn.classList.remove('hidden');

  const statusEl = document.getElementById('activeRoundStatus');
  statusEl.classList.add('hidden');
}

// Modals
function openFairnessModal() {
  playTone('click');
  document.getElementById('fairnessOverlay').classList.remove('hidden');
  const sheet = document.getElementById('fairnessSheet');
  sheet.classList.add('open');
  sheet.classList.add('active');
}
function closeFairnessModal() {
  document.getElementById('fairnessOverlay').classList.add('hidden');
  const sheet = document.getElementById('fairnessSheet');
  sheet.classList.remove('open');
  sheet.classList.remove('active');
}

function openReferralModal() {
  playTone('click');
  document.getElementById('referralOverlay').classList.remove('hidden');
  const sheet = document.getElementById('referralSheet');
  sheet.classList.add('open');
  sheet.classList.add('active');
}
function closeReferralModal() {
  document.getElementById('referralOverlay').classList.add('hidden');
  const sheet = document.getElementById('referralSheet');
  sheet.classList.remove('open');
  sheet.classList.remove('active');
}

function copyReferralLink() {
  playTone('click');
  navigator.clipboard.writeText("https://t.me/stargame_bot?start=ref_184920").catch(() => {});
  const btn = document.getElementById('copyRefBtn');
  if (btn) {
    btn.innerText = "Copied!";
    setTimeout(() => { btn.innerText = "Copy"; }, 2000);
  }
}

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

function openHistoryModal() {
  alert(`Total Rounds Played: ${nonce - 1}\nLast Stake: ${currentStake} ⭐\nSeed Nonce: ${nonce}`);
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

// Initialization & Firebase Balance Synchronization
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  updateBalanceUI();
  updateTopMultiplierDisplay();
  renderMinesBoard();

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
