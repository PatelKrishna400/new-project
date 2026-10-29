/**
 * ==========================================================================
 * STAR GAME SUITE — MASTER MULTI-GAME CONTROLLER
 * 7 Arcade Classics • Pixel-Perfect UI/UX Matching Reference Screenshots
 * 50% Win Rate Calibration • 10 Plays/Day Limit + Watch Ad • Free Coins Refill
 * ==========================================================================
 */

const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 10;
const MIN_BET = 30;
const MAX_BET = 2000;
const QUICK_BETS = [30, 50, 100, 500];

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

// Global State
let currentTab = 'dice';
let balance = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '100', 10);
let currentBet = 50;
let soundEnabled = true;

// 1. Lucky Dice State
let diceStreak = 0;
let isRollingDice = false;

// 2. Lucky Scratch State
let isScratchingCard = false;
let scratchPurchased = false;
let scratchPrize = { tier: 'Winner', mult: 1, icon: '🎉' };
let scratchRecentHistory = [];

// 3. Lucky Spin State
let isWheelSpinning = false;
let wheelRotationAngle = 0;

// 4. Plinko State
let isDroppingPlinko = false;

// 5. Coin Flip State
let coinSelectedSide = 'heads';
let isCoinFlipping = false;

// 6. Mines State
let minesBombCount = 5;
let minesGridData = [];
let isMinesActive = false;
let minesRevealedCount = 0;

// 7. Under Over State
let uoDirection = 'under';
let uoThreshold = 50;
let isRollingUO = false;

// Web Audio API Synthesizers via Tone.js
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
    } catch (e) {}
  }
}

function playTone(type) {
  if (!soundEnabled) return;
  try {
    if (window.Tone && Tone.context.state !== 'running') {
      Tone.start();
    }
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
    } else if (type === 'bomb' && noiseSynth) {
      noiseSynth.triggerAttackRelease("8n", undefined, 0.8);
    }
  } catch (e) {}
}

function toggleSound(checked) {
  soundEnabled = checked;
  if (checked) playTone('tick');
}

// Balance Management
function updateBalanceUI() {
  const userStars = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  const elCoins = document.getElementById('headerCoinDisplay') || document.getElementById('coinBalance');
  const elStars = document.getElementById('headerStarDisplay');

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
  } catch (e) {}
  if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
    window.firebaseSync.syncPlayerCurrenciesImmediate();
  } else if (typeof window.saveCurrentProfileToFirestore === 'function') {
    window.saveCurrentProfileToFirestore();
  }
  if (typeof window.updateAllDomBalances === 'function') {
    window.updateAllDomBalances(undefined, balance);
  }
}

function addFreeCoins(amount = 50) {
  playTone('win');
  balance += amount;
  saveBalance();
  updateBalanceUI();
  showToast('Stars Added', `+${amount} stars credited!`, '⭐');
  if (window.confetti) confetti({ particleCount: 35, spread: 60, origin: { y: 0.2 } });
}

// Buy Coins Modal
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
  window.location.href = '../home/index.html';
}

function startWatchingAdFromStore() {}

// Daily Plays Tracker
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPlaysUsedToday(gameId) {
  const id = gameId || currentTab;
  const key = `lucky_plays_${id}_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function getBonusPlaysToday(gameId) {
  const id = gameId || currentTab;
  const key = `lucky_bonus_${id}_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function getRemainingPlays(gameId) {
  const id = gameId || currentTab;
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday(id);
  const used = getPlaysUsedToday(id);
  return Math.max(0, total - used);
}

function recordPlayUsed(gameId) {
  const id = gameId || currentTab;
  const key = `lucky_plays_${id}_${getTodayKey()}`;
  const used = getPlaysUsedToday(id) + 1;
  localStorage.setItem(key, used.toString());
}

function grantBonusPlays(count = BONUS_PLAYS_PER_AD, gameId) {
  const id = gameId || currentTab;
  const key = `lucky_bonus_${id}_${getTodayKey()}`;
  const current = getBonusPlaysToday(id) + count;
  localStorage.setItem(key, current.toString());
}

// Action Button State
function updateActionButtonState() {
  const btn = document.getElementById('primaryPlayBtn');
  if (!btn || currentTab === 'lobby') return;
  const cfg = GAME_CONFIGS[currentTab];
  if (!cfg) return;

  const remaining = getRemainingPlays(currentTab);
  if (remaining <= 0) {
    btn.innerText = cfg.actionVerb;
    btn.className = 'primary-cta-btn bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950';
  } else if (balance < currentBet) {
    btn.innerText = 'Buy coins';
    btn.className = `primary-cta-btn bg-gradient-to-r ${cfg.btnClass}`;
  } else {
    btn.innerText = cfg.actionVerb;
    btn.className = `primary-cta-btn bg-gradient-to-r ${cfg.btnClass}`;
  }
}

// Game Configurations
const GAME_CONFIGS = {
  lobby: {
    title: 'Star Game',
    color: '#38bdf8',
    themeClass: 'theme-dice',
    actionVerb: '',
    btnClass: '',
    sheet: {
      title: 'Star Game Arcade',
      subtitle: 'Pick any game from the arcade lobby to play.',
      step1: 'Choose an arcade game from the lobby cards.',
      step2: 'Set your bet chips and adjust with 1/2 or 2x steppers.',
      step3: 'Win real multiplier payouts with 50% calibrated win rate.',
      table: [
        { label: 'Available Games', val: '7 Arcade Classics' },
        { label: 'Win Calibration', val: '50% Fair Payouts' },
        { label: 'Streak Bonus', val: 'Up to ×7 Jackpot' },
        { label: 'Tasks Reward', val: 'Earn in Tasks' }
      ]
    }
  },
  dice: {
    title: 'Lucky Dice',
    color: '#38bdf8',
    themeClass: 'theme-dice',
    actionVerb: 'Roll',
    btnClass: 'from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.35)]',
    sheet: {
      title: 'Lucky Dice',
      subtitle: 'Roll high. Three sixes in a row pay ×7.',
      step1: 'Set your bet and tap Roll.',
      step2: 'Each face pays a fixed multiplier. The higher the face, the better.',
      step3: 'Roll three sixes in a row at the same bet for the ×7 jackpot. Changing the bet resets the streak.',
      table: [
        { label: 'Six', val: '×2' },
        { label: 'Five', val: '×1.5' },
        { label: 'Four', val: '×1.2' },
        { label: 'Three', val: '×0.6' },
        { label: 'Two', val: '×0.3' },
        { label: 'One', val: '×0' },
        { label: 'Three sixes in a row', val: '×7' }
      ]
    }
  },
  scratch: {
    title: 'Lucky Scratch',
    color: '#fb7185',
    themeClass: 'theme-scratch',
    actionVerb: 'Buy card',
    btnClass: 'from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-[0_8px_24px_rgba(244,63,94,0.35)]',
    sheet: {
      title: 'Lucky Scratch',
      subtitle: 'Buy a card, scratch the foil, reveal the prize.',
      step1: 'Set your bet and tap Buy card. The prize is decided the moment you buy.',
      step2: 'Drag across the foil. Once about 40% is cleared the rest lifts on its own.',
      step3: 'The multiplier under the foil is paid out.',
      table: [
        { label: 'Jackpot', val: '×5' },
        { label: 'Super win', val: '×2' },
        { label: 'Winner', val: '×1' },
        { label: 'Mini win', val: '×0.5' },
        { label: 'Lucky star', val: '×0.3' },
        { label: 'Bronze win', val: '×0.2' },
        { label: 'Lucky drop', val: '×0.1' }
      ]
    }
  },
  spin: {
    title: 'Lucky Spin',
    color: '#a855f7',
    themeClass: 'theme-spin',
    actionVerb: 'Spin',
    btnClass: 'from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-[0_8px_24px_rgba(168,85,247,0.35)]',
    sheet: {
      title: 'Lucky Spin',
      subtitle: 'Twelve wedges, one gold 5×.',
      step1: 'Set your bet and tap Spin.',
      step2: 'The wheel turns and eases onto one wedge under the pointer.',
      step3: 'The wedge multiplier is paid out; bust wedges lose the stake.',
      table: [
        { label: 'Gold wedge', val: '×5' },
        { label: 'Deep violet', val: '×2' },
        { label: 'Violet (×2 wedges)', val: '×1 · stake back' },
        { label: 'Lavender (×2 wedges)', val: '×0.5' },
        { label: 'Bust (×6 wedges)', val: '×0' }
      ]
    }
  },
  plinko: {
    title: 'Gift Drop',
    color: '#06b6d4',
    themeClass: 'theme-plinko',
    actionVerb: 'Drop gift',
    btnClass: 'from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 text-slate-950 shadow-[0_8px_24px_rgba(6,182,212,0.35)]',
    sheet: {
      title: 'Gift Drop',
      subtitle: 'Drop gifts down the pegs and chase the edges.',
      step1: 'Set the bet per gift and how many gifts to drop (1 to 50). Total stake = bet × gifts.',
      step2: 'Each gift bounces down ten rows of pegs into one of eleven buckets.',
      step3: 'Every bucket pays its multiplier on that gift\'s bet. The outer buckets pay the most.',
      table: [
        { label: 'Outer buckets', val: '×5' },
        { label: 'Next in', val: '×2 • ×1 • ×0.5' },
        { label: 'Middle', val: '×0.3 • ×0.2 • ×0.1' }
      ]
    }
  },
  coin: {
    title: 'Coin Flip',
    color: '#eab308',
    themeClass: 'theme-coin',
    actionVerb: 'Flip coin',
    btnClass: 'from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-amber-950 shadow-[0_8px_24px_rgba(234,179,8,0.35)]',
    sheet: {
      title: 'Coin Flip',
      subtitle: 'Call heads or tails, flip, double up.',
      step1: 'Pick heads (star) or tails (gift) and set your bet.',
      step2: 'Tap Flip. The coin tumbles and lands on one side.',
      step3: 'Landing on your side pays ×2 of the stake; the other side loses it.',
      table: [
        { label: 'Correct call', val: '×2' },
        { label: 'Wrong call', val: 'stake lost' }
      ]
    }
  },
  mines: {
    title: 'Gift Hunt',
    color: '#2dd4bf',
    themeClass: 'theme-mines',
    actionVerb: 'Start hunt',
    btnClass: 'from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 shadow-[0_8px_24px_rgba(45,212,191,0.35)]',
    sheet: {
      title: 'Gift Hunt',
      subtitle: 'Reveal gifts, dodge bombs, cash out anytime.',
      step1: 'Choose how many bombs hide on the 25-tile board (3, 5 or 10) and start the hunt.',
      step2: 'Tap tiles. Every gift you reveal raises the multiplier shown under the board.',
      step3: 'Cash out whenever you like to lock in the current multiplier. Revealing a bomb ends the round and loses the stake.',
      table: [
        { label: 'More bombs', val: 'faster multiplier growth' },
        { label: 'Fewer bombs', val: 'safer, slower growth' }
      ]
    }
  },
  underover: {
    title: 'Under Over',
    color: '#84cc16',
    themeClass: 'theme-underover',
    actionVerb: 'Roll number',
    btnClass: 'from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 text-lime-950 shadow-[0_8px_24px_rgba(132,204,22,0.35)]',
    sheet: {
      title: 'Under Over',
      subtitle: 'Set a threshold, pick a side, roll 0–99.',
      step1: 'Drag the threshold anywhere from 1 to 99.',
      step2: 'Choose Under (roll below the threshold wins) or Over (roll above wins). Hitting the threshold exactly always loses.',
      step3: 'The payout is 0.95 divided by your win chance. Riskier picks pay more, up to ×95.',
      table: [
        { label: 'Under 50', val: '50% • ×1.90' },
        { label: 'Under 25', val: '25% • ×3.80' },
        { label: 'Under 10', val: '10% • ×9.50' },
        { label: 'Under 1 / Over 98', val: '1% • ×95' }
      ]
    }
  }
};

// Navigation
function handleNavigationBack() {
  playTone('click');
  window.location.href = '../games/index.html?tab=star';
}

function switchTab(tabId) {
  if (tabId === 'lobby') {
    window.location.href = '../games/index.html?tab=star';
    return;
  }
  playTone('click');
  currentTab = tabId;
  const config = GAME_CONFIGS[tabId];
  if (!config) return;

  // Header Title & Dot
  const titleEl = document.getElementById('gameTitleNav');
  const dotEl = document.getElementById('gameDot');
  if (titleEl) titleEl.innerText = config.title;
  if (dotEl) {
    dotEl.style.backgroundColor = config.color;
    dotEl.style.boxShadow = `0 0 10px ${config.color}`;
  }

  // Update theme class on main container
  const appFrame = document.getElementById('appMainFrame');
  if (appFrame) {
    appFrame.className = `app-frame ${config.themeClass || ''}`;
  }

  // Toggle Game Views
  document.querySelectorAll('.game-view').forEach(view => view.classList.add('hidden'));
  const activeSection = document.getElementById(`game-${tabId}`);
  if (activeSection) activeSection.classList.remove('hidden');

  // Shared Controls container
  const controlsContainer = document.getElementById('sharedControlsContainer');
  const playBtn = document.getElementById('primaryPlayBtn');
  const cashoutBtn = document.getElementById('cashoutBtn');

  if (tabId === 'lobby') {
    if (controlsContainer) controlsContainer.classList.add('hidden');
  } else {
    if (controlsContainer) controlsContainer.classList.remove('hidden');
    if (tabId === 'mines' && isMinesActive) {
      if (playBtn) playBtn.classList.add('hidden');
      if (cashoutBtn) cashoutBtn.classList.remove('hidden');
    } else {
      if (playBtn) playBtn.classList.remove('hidden');
      if (cashoutBtn) cashoutBtn.classList.add('hidden');
      updateActionButtonState();
    }
  }

  // Update Sheet Modal Content
  updateSheetContent(config);
  updateActiveChipUI();

  // Per-game initializers
  if (tabId === 'scratch' && !scratchPurchased) {
    initScratchCard(false);
    setTimeout(() => {
      const prizeCard = document.getElementById('scratchPrizeCard');
      if (prizeCard) prizeCard.style.opacity = '1';
      const canvas = document.getElementById('scratchCanvas');
      if (canvas) canvas.style.transition = 'opacity 0.45s ease';
    }, 100);
  } else if (tabId === 'spin') {
    drawSpinWheel();
  } else if (tabId === 'plinko') {
    initPlinko();
  } else if (tabId === 'mines' && minesGridData.length === 0) {
    initMinesGrid();
  } else if (tabId === 'underover') {
    updateUnderOverCalculations();
  }

    window.addEventListener('balance:changed', () => {
    balance = parseInt(localStorage.getItem('task_game_stars') || '10', 10);
    updateBalanceUI();
  });

  window.addEventListener('balance:synced', () => {
    balance = parseInt(localStorage.getItem('task_game_stars') || '10', 10);
    updateBalanceUI();
  });

  if (window.lucide) lucide.createIcons();
}

// Rules Sheet Modal Controller
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

function updateSheetContent(config) {
  const s = config.sheet;
  if (!s) return;
  const title = document.getElementById('sheetTitle');
  const sub = document.getElementById('sheetSubtitle');
  const s1 = document.getElementById('sheetStep1');
  const s2 = document.getElementById('sheetStep2');
  const s3 = document.getElementById('sheetStep3');
  const dot = document.getElementById('sheetDot');
  const gotIt = document.getElementById('sheetGotItBtn');
  const toggleTrack = document.getElementById('soundToggleTrack');

  if (title) title.innerText = s.title;
  if (sub) sub.innerText = s.subtitle;
  if (s1) s1.innerText = s.step1;
  if (s2) s2.innerText = s.step2;
  if (s3) s3.innerText = s.step3;
  if (dot) {
    dot.style.backgroundColor = config.color;
    dot.style.boxShadow = `0 0 10px ${config.color}`;
  }
  if (gotIt) {
    gotIt.style.backgroundColor = config.color;
    gotIt.style.color = (config.color === '#eab308' || config.color === '#84cc16' || config.color === '#38bdf8' || config.color === '#2dd4bf') ? '#0b0e15' : '#ffffff';
  }
  if (toggleTrack && soundEnabled) {
    toggleTrack.style.backgroundColor = config.color;
  }

  // Numbered step badges
  ['sheetStep1Badge', 'sheetStep2Badge', 'sheetStep3Badge'].forEach(badgeId => {
    const b = document.getElementById(badgeId);
    if (b) {
      b.style.borderColor = `${config.color}40`;
      b.style.backgroundColor = `${config.color}20`;
      b.style.color = config.color;
    }
  });

  const tableEl = document.getElementById('sheetTable');
  if (tableEl && s.table) {
    tableEl.innerHTML = '';
    s.table.forEach(row => {
      const tr = document.createElement('div');
      tr.className = 'px-4 py-2.5 flex items-center justify-between text-xs font-semibold';
      tr.innerHTML = `
        <span class="text-gray-300 font-medium">${row.label}</span>
        <span class="text-white font-black">${row.val}</span>
      `;
      tableEl.appendChild(tr);
    });
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
  if (currentTab === 'underover') updateUnderOverCalculations();
}

function halveBet() {
  if (isRollingDice || isWheelSpinning || scratchPurchased || isCoinFlipping || isRollingUO) return;
  setBet(Math.max(MIN_BET, Math.round(currentBet / 2)));
}

function doubleBet() {
  if (isRollingDice || isWheelSpinning || scratchPurchased || isCoinFlipping || isRollingUO) return;
  setBet(Math.min(MAX_BET, currentBet * 2));
}

function updateActiveChipUI() {
  const cfg = GAME_CONFIGS[currentTab] || GAME_CONFIGS.dice;
  document.querySelectorAll('.bet-pill-btn').forEach(btn => {
    const val = parseInt(btn.getAttribute('data-val') || '0', 10);
    if (val === currentBet) {
      btn.classList.add('active');
      btn.style.borderColor = cfg.color;
      btn.style.boxShadow = `0 0 16px ${cfg.color}35`;
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
    }
  });
}

// Toast System
function showToast(title, msg, icon = '⭐') {
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

// Primary Action Dispatcher
function handlePrimaryAction() {
  if (getRemainingPlays(currentTab) <= 0) {
    openAdModal();
    return;
  }

  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }

  if (currentTab === 'dice') {
    rollDiceGame();
  } else if (currentTab === 'scratch') {
    buyScratchCard();
  } else if (currentTab === 'spin') {
    spinWheelGame();
  } else if (currentTab === 'plinko') {
    dropPlinkoBall();
  } else if (currentTab === 'coin') {
    flipCoinGame();
  } else if (currentTab === 'mines') {
    startMinesHunt();
  } else if (currentTab === 'underover') {
    rollUnderOverGame();
  }
}

// ==========================================
// 1. LUCKY DICE (50% WIN RATE CALIBRATED)
// ==========================================
const DICE_ROTATIONS = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: 0, y: 90 },
  5: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 }
};
const DICE_MULTIPLIERS = { 1: 0, 2: 0.3, 3: 0.6, 4: 1.2, 5: 1.5, 6: 2 };

function rollDiceGame() {
  if (isRollingDice) return;
  isRollingDice = true;
  recordPlayUsed('dice');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const cube = document.getElementById('cube');
  cube.classList.remove('face-pose-3');

  // Dynamic Win Rate Calibration:
  const winProbability = getWinProbability();
  const isWin = Math.random() < winProbability;
  let rolledFace;
  if (isWin) {
    const winFaces = [4, 5, 6];
    rolledFace = winFaces[Math.floor(Math.random() * winFaces.length)];
  } else {
    const loseFaces = [1, 2, 3];
    rolledFace = loseFaces[Math.floor(Math.random() * loseFaces.length)];
  }

  const randomExtraTurnsX = (Math.floor(Math.random() * 3) + 2) * 360;
  const randomExtraTurnsY = (Math.floor(Math.random() * 3) + 2) * 360;
  const targetRotation = DICE_ROTATIONS[rolledFace];

  cube.style.transform = `rotateX(${randomExtraTurnsX + targetRotation.x}deg) rotateY(${randomExtraTurnsY + targetRotation.y}deg)`;

  setTimeout(() => {
    isRollingDice = false;
    const baseMult = DICE_MULTIPLIERS[rolledFace];

    // Highlight rolled multiplier tile
    highlightDiceMultiplierTile(rolledFace);

    if (rolledFace === 6) {
      diceStreak++;
    } else {
      diceStreak = 0;
    }
    updateDiceStreakUI();

    let grossWin = Math.round(currentBet * baseMult);
    if (diceStreak === 3) {
      grossWin = Math.round(currentBet * 7); // Jackpot x7
      diceStreak = 0;
      updateDiceStreakUI();
    }

    let wonAmount = 0;
    let taxAmount = 0;
    if (grossWin > 0) {
      taxAmount = Math.max(1, Math.round(grossWin * 0.001));
      wonAmount = Math.max(0, grossWin - taxAmount);
    }

    if (grossWin >= Math.round(currentBet * 7)) {
      if (window.confetti) confetti({ particleCount: 100, spread: 80 });
      playTone('jackpot');
      showToast('JACKPOT!', `Three Sixes! Paid +${wonAmount} 🪙`, '🔥');
    } else if (baseMult > 1) {
      playTone('win');
      showToast('Winner!', `Rolled a ${rolledFace}! Won +${wonAmount} 🪙`, '🎉');
    } else if (baseMult > 0) {
      playTone('win');
      showToast('Face ' + rolledFace, `Paid ×${baseMult} (+${wonAmount} 🪙)`, '🎲');
    } else {
      playTone('lose');
      showToast('Rolled a One', 'Face 1 pays ×0. Better luck next roll!', '💀');
    }

    balance += wonAmount;
    saveBalance();
    updateBalanceUI();
  }, 1250);
}

function highlightDiceMultiplierTile(faceNum) {
  for (let i = 1; i <= 6; i++) {
    const tile = document.getElementById(`multTile${i}`);
    if (!tile) continue;
    if (i === faceNum) {
      tile.style.borderColor = '#38bdf8';
      tile.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
      tile.style.boxShadow = '0 0 14px rgba(56, 189, 248, 0.4)';
    } else {
      tile.style.borderColor = 'transparent';
      tile.style.backgroundColor = '#171c2a';
      tile.style.boxShadow = 'none';
    }
  }
}

function updateDiceStreakUI() {
  const container = document.getElementById('diceStreakIndicators');
  if (!container) return;
  const indicators = container.children;
  for (let i = 0; i < 3; i++) {
    if (i < diceStreak) {
      indicators[i].classList.add('active');
    } else {
      indicators[i].classList.remove('active');
    }
  }
}

// ==========================================
// 2. LUCKY SCRATCH (Screenshot 5 Match)
// ==========================================
function initScratchCard(purchased = false) {
  const canvas = document.getElementById('scratchCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  canvas.style.transition = 'none';
  canvas.style.opacity = '1';
  ctx.globalCompositeOperation = 'source-over';

  // Satin Rose-Pink Gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#f43f5e');
  grad.addColorStop(0.5, '#db2777');
  grad.addColorStop(1, '#9d174d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Delicate Star Diamond Pattern (Screenshot 5)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let i = 25; i < w; i += 40) {
    for (let j = 20; j < h; j += 40) {
      ctx.beginPath();
      // Draw 4-point diamond star
      ctx.moveTo(i, j - 4);
      ctx.lineTo(i + 3, j);
      ctx.lineTo(i, j + 4);
      ctx.lineTo(i - 3, j);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Frosted Center Pill: "LUCKY SCRATCH"
  const pillW = 220;
  const pillH = 46;
  const pillX = (w - pillW) / 2;
  const pillY = (h - pillH) / 2 - 10;
  const radius = 23;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, radius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();
  ctx.restore();

  // "LUCKY SCRATCH" Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px "Plus Jakarta Sans"';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1px';
  ctx.fillText('LUCKY SCRATCH', w / 2, pillY + 29);

  // Subtitle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '600 12px "Plus Jakarta Sans"';
  ctx.fillText(purchased ? 'Scratch the foil to reveal' : 'Buy a card to play', w / 2, pillY + 68);

  if (purchased) {
    enableScratching(canvas, ctx);
  }
}

function buyScratchCard() {
  if (scratchPurchased) return;
  recordPlayUsed('scratch');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  scratchPurchased = true;
  playTone('roll');

  const winProbability = getWinProbability();
  const isHighWin = Math.random() < winProbability;
  if (isHighWin) {
    const winRoll = Math.random();
    if (winRoll < 0.15) {
      scratchPrize = { tier: 'Jackpot', mult: 5, icon: '👑' };
    } else if (winRoll < 0.50) {
      scratchPrize = { tier: 'Super Win', mult: 2, icon: '💎' };
    } else {
      scratchPrize = { tier: 'Winner', mult: 1, icon: '🎉' };
    }
  } else {
    const lowRoll = Math.random();
    if (lowRoll < 0.25) {
      scratchPrize = { tier: 'Mini Win', mult: 0.5, icon: '⭐' };
    } else if (lowRoll < 0.55) {
      scratchPrize = { tier: 'Lucky Star', mult: 0.3, icon: '🍀' };
    } else if (lowRoll < 0.80) {
      scratchPrize = { tier: 'Bronze Win', mult: 0.2, icon: '🥉' };
    } else {
      scratchPrize = { tier: 'Lucky Drop', mult: 0.1, icon: '⭐' };
    }
  }

  // 1. FIRST: Hide any previously revealed winning price so it cannot be seen
  const prizeCard = document.getElementById('scratchPrizeCard');
  if (prizeCard) {
    prizeCard.style.opacity = '0';
  }

  // 2. FIRST: Load the fresh scratch card foil page cover immediately
  const canvas = document.getElementById('scratchCanvas');
  if (canvas) {
    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
  }
  initScratchCard(true);

  // Subtle fresh card load bounce effect
  const cardWrap = document.querySelector('.scratch-card-canvas-wrap');
  if (cardWrap) {
    cardWrap.style.transform = 'scale(0.97)';
    cardWrap.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
      cardWrap.style.transform = 'scale(1)';
    }, 160);
  }

  const btn = document.getElementById('primaryPlayBtn');
  if (btn) {
    btn.innerText = 'Scratch Card Above';
    btn.disabled = true;
  }

  // 3. THEN AFTER: The scratch card page / foil is loaded, load the below winning prize!
  setTimeout(() => {
    document.getElementById('scratchIcon').innerText = scratchPrize.icon;
    document.getElementById('scratchMultiplierLabel').innerText = `×${scratchPrize.mult}`;
    document.getElementById('scratchTierLabel').innerText = scratchPrize.tier;
    const winStars = Math.round(currentBet * scratchPrize.mult);
    document.getElementById('scratchWinAmountText').innerText = scratchPrize.mult > 0 ? `+${winStars} ⭐` : `0 ⭐`;

    // Make the prize active underneath the opaque foil
    if (prizeCard) {
      prizeCard.style.opacity = '1';
    }
    if (canvas) {
      canvas.style.transition = 'opacity 0.45s ease';
    }
  }, 120);
}

function enableScratching(canvas, ctx) {
  let isDrawing = false;
  let scratchedCount = 0;

  function scratchAt(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
    playTone('tick');

    scratchedCount++;
    if (scratchedCount > 24) {
      revealScratchFinish(canvas, ctx);
    }
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  canvas.onmousedown = (e) => { isDrawing = true; const p = getPos(e); scratchAt(p.x, p.y); };
  window.onmouseup = () => { isDrawing = false; };
  canvas.onmousemove = (e) => { if (isDrawing) { const p = getPos(e); scratchAt(p.x, p.y); } };

  canvas.ontouchstart = (e) => { isDrawing = true; const p = getPos(e); scratchAt(p.x, p.y); };
  window.ontouchend = () => { isDrawing = false; };
  canvas.ontouchmove = (e) => { if (isDrawing) { const p = getPos(e); scratchAt(p.x, p.y); } };
}

function revealScratchFinish(canvas, ctx) {
  canvas.onmousedown = canvas.onmousemove = canvas.ontouchstart = canvas.ontouchmove = null;
  canvas.style.opacity = '0';
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 400);

  scratchPurchased = false;
  const grossWin = Math.round(currentBet * scratchPrize.mult);
  let taxAmount = 0;
  let winAmount = 0;
  if (grossWin > 0) {
    taxAmount = Math.max(1, Math.round(grossWin * 0.001));
    winAmount = Math.max(0, grossWin - taxAmount);
  }
  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  // Record in recent rounds
  addScratchRecentRound(scratchPrize, winAmount);

  if (scratchPrize.mult >= 5) {
    if (window.confetti) confetti({ particleCount: 80, spread: 70 });
    playTone('jackpot');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} ⭐`, scratchPrize.icon);
  } else if (scratchPrize.mult >= 1) {
    playTone('win');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} ⭐`, scratchPrize.icon);
  } else {
    playTone('win');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} ⭐`, scratchPrize.icon);
  }

  const playBtn = document.getElementById('primaryPlayBtn');
  if (playBtn) {
    playBtn.innerText = 'Buy card';
    playBtn.disabled = false;
  }
}

function addScratchRecentRound(prize, win) {
  // Recent rounds removed from UI
}

// ==========================================
// 3. LUCKY SPIN (Screenshot 3 Match)
// ==========================================
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

// Helper: precisely determine which wedge is under the top pointer (12 o'clock / 270°)
function getWedgeUnderPointer(rotationDeg) {
  const normR = ((rotationDeg % 360) + 360) % 360;
  const canvasAngle = ((270 - normR) % 360 + 360) % 360;
  const shiftedAngle = (canvasAngle + 90) % 360;
  return Math.floor(shiftedAngle / 30);
}

function spinWheelGame() {
  if (isWheelSpinning) return;
  isWheelSpinning = true;
  recordPlayUsed('spin');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('wheelCanvas');
  const numWedges = WHEEL_WEDGES.length;
  const sliceDeg = 360 / numWedges;

  const winProbability = getWinProbability();
  const isWin = Math.random() < winProbability;
  let targetIdx;
  if (isWin) {
    // 0: 5×, 2: 0.5×, 4: 1×, 6: 2×, 8: 0.5×, 10: 1×
    const winIndices = [0, 2, 4, 6, 8, 10];
    targetIdx = winIndices[Math.floor(Math.random() * winIndices.length)];
  } else {
    // 1: BUST, 3: BUST, 5: BUST, 7: BUST, 9: BUST, 11: BUST
    const loseIndices = [1, 3, 5, 7, 9, 11];
    targetIdx = loseIndices[Math.floor(Math.random() * loseIndices.length)];
  }

  // Canvas wedge i center is at: start + slice/2 = (i * 30° - 90°) + 15° = i * 30° - 75°.
  // Pointer is at top (12 o'clock, 270° / -90°).
  // Clockwise rotation R satisfies: center(i) + R ≡ 270° (mod 360°)
  // => R ≡ 270° - (i * 30° - 75°) = 345° - i * 30° (mod 360°).
  const desiredMod = ((345 - targetIdx * sliceDeg) % 360 + 360) % 360;
  const currentMod = ((wheelRotationAngle % 360) + 360) % 360;
  let diff = desiredMod - currentMod;
  if (diff <= 0) diff += 360;

  const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
  // Subtle natural jitter (+/- 5°) safely within the 30° wedge boundaries
  const naturalJitter = (Math.random() - 0.5) * 8;

  wheelRotationAngle += extraSpins + diff + naturalJitter;
  canvas.style.transition = 'transform 3.2s cubic-bezier(0.15, 0.9, 0.2, 1)';
  canvas.style.transform = `rotate(${wheelRotationAngle}deg)`;

  const tickInterval = setInterval(() => {
    playTone('tick');
  }, 120);

  setTimeout(() => {
    clearInterval(tickInterval);
    isWheelSpinning = false;

    // Resolve landing directly from pointer position to guarantee 100% precision
    const landedIdx = getWedgeUnderPointer(wheelRotationAngle);
    const landed = WHEEL_WEDGES[landedIdx];
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

// ==========================================
// 4. PLINKO / GIFT DROP
// ==========================================
function initPlinko() {
  const canvas = document.getElementById('plinkoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background grid
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pegs
  ctx.fillStyle = '#38bdf8';
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const pegCount = r + 3;
    const spacing = canvas.width / (pegCount + 1);
    for (let c = 1; c <= pegCount; c++) {
      ctx.beginPath();
      ctx.arc(c * spacing, 24 + r * 22, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Buckets: 5, 2, 1, 0.5, 0.3, 0.2, 0.1, 0.2, 0.3, 0.5, 1, 2, 5
  const mults = ['5×', '2×', '1×', '0.5×', '0.3×', '0.2×', '0.1×', '0.2×', '0.3×', '0.5×', '1×', '2×', '5×'];
  const bW = canvas.width / mults.length;
  mults.forEach((m, i) => {
    ctx.fillStyle = (i === 0 || i === mults.length - 1) ? '#06b6d4' : (i < 3 || i > 9) ? '#38bdf8' : '#64748b';
    ctx.font = '800 8px "Plus Jakarta Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(m, i * bW + bW / 2, canvas.height - 8);
  });
}

function dropPlinkoBall() {
  if (isDroppingPlinko) return;
  isDroppingPlinko = true;
  recordPlayUsed('plinko');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('plinkoCanvas');
  const ctx = canvas.getContext('2d');
  let x = canvas.width / 2;
  let y = 10;
  let row = 0;

  const dropInterval = setInterval(() => {
    y += 18;
    x += (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 8);
    x = Math.max(15, Math.min(canvas.width - 15, x));
    initPlinko();

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
    playTone('tick');

    row++;
    if (y >= canvas.height - 30) {
      clearInterval(dropInterval);
      isDroppingPlinko = false;

      const bucketIdx = Math.floor(x / (canvas.width / 13));
      const mults = [5, 2, 1, 0.5, 0.3, 0.2, 0.1, 0.2, 0.3, 0.5, 1, 2, 5];
      const mult = mults[Math.min(12, Math.max(0, bucketIdx))];
      const winAmount = Math.round(currentBet * mult);

      balance += winAmount;
      saveBalance();
      updateBalanceUI();

      if (mult >= 5) {
        if (window.confetti) confetti({ particleCount: 80, spread: 70 });
        playTone('jackpot');
        showToast('Outer Edge!', `Landed in ×${mult}! Won ${winAmount} ⭐`, '🎁');
      } else {
        playTone('win');
        showToast('Bucket Hit', `Paid ×${mult} (${winAmount} ⭐)`, '🎁');
      }
    }
  }, 80);
}

// ==========================================
// 5. COIN FLIP
// ==========================================
function selectCoinSide(side) {
  playTone('tick');
  coinSelectedSide = side;
  const bH = document.getElementById('btnHeads');
  const bT = document.getElementById('btnTails');
  if (side === 'heads') {
    bH.className = 'coin-pick-btn py-3 px-4 rounded-2xl bg-amber-500/20 border-2 border-yellow-400 flex items-center justify-center gap-2 font-black text-xs text-yellow-300 transition-all';
    bT.className = 'coin-pick-btn py-3 px-4 rounded-2xl bg-[#141822] border border-[#232a3a] flex items-center justify-center gap-2 font-black text-xs text-gray-400 transition-all';
  } else {
    bT.className = 'coin-pick-btn py-3 px-4 rounded-2xl bg-amber-500/20 border-2 border-yellow-400 flex items-center justify-center gap-2 font-black text-xs text-yellow-300 transition-all';
    bH.className = 'coin-pick-btn py-3 px-4 rounded-2xl bg-[#141822] border border-[#232a3a] flex items-center justify-center gap-2 font-black text-xs text-gray-400 transition-all';
  }
}

function flipCoinGame() {
  if (isCoinFlipping) return;
  isCoinFlipping = true;
  recordPlayUsed('coin');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const coin = document.getElementById('coinElement');
  const symbol = document.getElementById('coinFaceSymbol');
  const outcomeText = document.getElementById('coinOutcomeText');

  const winProbability = getWinProbability();
  const isWin = Math.random() < winProbability;
  const landedSide = isWin ? coinSelectedSide : (coinSelectedSide === 'heads' ? 'tails' : 'heads');

  coin.style.transform = 'rotateY(1800deg) scale(1.15)';
  const tickInterval = setInterval(() => playTone('tick'), 90);

  setTimeout(() => {
    clearInterval(tickInterval);
    isCoinFlipping = false;
    coin.style.transform = 'rotateY(0deg) scale(1)';
    symbol.innerText = landedSide === 'heads' ? '⭐' : '🎁';

    if (isWin) {
      const winAmount = Math.round(currentBet * 2);
      balance += winAmount;
      saveBalance();
      updateBalanceUI();
      if (window.confetti) confetti({ particleCount: 70, spread: 60 });
      playTone('win');
      showToast('Double Up!', `Called ${landedSide.toUpperCase()} correctly! Won +${winAmount} ⭐`, '⭐');
      if (outcomeText) outcomeText.innerText = `Landed on ${landedSide.toUpperCase()}! You won +${winAmount} ⭐ (×2)!`;
    } else {
      playTone('lose');
      showToast('Missed Call', `Landed on ${landedSide.toUpperCase()}. Stake lost.`, '❌');
      if (outcomeText) outcomeText.innerText = `Landed on ${landedSide.toUpperCase()}. Better luck next flip!`;
    }
  }, 1100);
}

// ==========================================
// 6. MINES / GIFT HUNT
// ==========================================
function initMinesGrid() {
  const grid = document.getElementById('minesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  minesGridData = [];

  for (let i = 0; i < 25; i++) {
    minesGridData.push({ isBomb: false, revealed: false });
    const btn = document.createElement('button');
    btn.className = 'w-full aspect-square rounded-xl bg-[#141d22] border border-[#23353e] hover:border-teal-400 flex items-center justify-center text-lg font-black transition-all active:scale-95';
    btn.id = `mineTile_${i}`;
    btn.onclick = () => onMineTileClick(i);
    grid.appendChild(btn);
  }
}

function resetMinesGame() {
  const sel = document.getElementById('minesBombCountSelect');
  if (sel) minesBombCount = parseInt(sel.value, 10);
  isMinesActive = false;
  minesRevealedCount = 0;
  initMinesGrid();

  const mEl = document.getElementById('minesCurrentMultiplier');
  if (mEl) mEl.innerText = '×1.00';

  const playBtn = document.getElementById('primaryPlayBtn');
  const cashoutBtn = document.getElementById('cashoutBtn');
  if (playBtn) { playBtn.classList.remove('hidden'); playBtn.innerText = 'Start hunt'; }
  if (cashoutBtn) cashoutBtn.classList.add('hidden');
}

function startMinesHunt() {
  if (balance < currentBet) {
    openBuyCoinsModal();
    return;
  }
  recordPlayUsed('mines');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  isMinesActive = true;
  minesRevealedCount = 0;
  initMinesGrid();

  // Distribute bombs
  let placed = 0;
  while (placed < minesBombCount) {
    const idx = Math.floor(Math.random() * 25);
    if (!minesGridData[idx].isBomb) {
      minesGridData[idx].isBomb = true;
      placed++;
    }
  }

  const playBtn = document.getElementById('primaryPlayBtn');
  const cashoutBtn = document.getElementById('cashoutBtn');
  if (playBtn) playBtn.classList.add('hidden');
  if (cashoutBtn) {
    cashoutBtn.classList.remove('hidden');
    document.getElementById('cashoutAmountText').innerText = currentBet;
  }
}

function onMineTileClick(idx) {
  if (!isMinesActive) return;
  const tileData = minesGridData[idx];
  if (tileData.revealed) return;
  tileData.revealed = true;

  const btn = document.getElementById(`mineTile_${idx}`);
  if (!btn) return;

  if (tileData.isBomb) {
    btn.innerText = '💣';
    btn.className = 'w-full aspect-square rounded-xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-lg';
    playTone('bomb');
    showToast('BOOM!', 'Hit a bomb! Hunt ended.', '💥');
    revealAllMines();
    isMinesActive = false;

    const playBtn = document.getElementById('primaryPlayBtn');
    const cashoutBtn = document.getElementById('cashoutBtn');
    if (playBtn) { playBtn.classList.remove('hidden'); playBtn.innerText = 'Start hunt'; }
    if (cashoutBtn) cashoutBtn.classList.add('hidden');
  } else {
    btn.innerText = '💎';
    btn.className = 'w-full aspect-square rounded-xl bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center text-lg';
    playTone('win');
    minesRevealedCount++;

    const mult = (1 + minesRevealedCount * (minesBombCount * 0.08)).toFixed(2);
    document.getElementById('minesCurrentMultiplier').innerText = `×${mult}`;
    const cashAmount = Math.round(currentBet * parseFloat(mult));
    document.getElementById('cashoutAmountText').innerText = cashAmount;
  }
}

function cashoutMines() {
  if (!isMinesActive || minesRevealedCount === 0) return;
  isMinesActive = false;

  const mult = parseFloat((1 + minesRevealedCount * (minesBombCount * 0.08)).toFixed(2));
  const winAmount = Math.round(currentBet * mult);
  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  if (window.confetti) confetti({ particleCount: 70, spread: 60 });
  playTone('jackpot');
  showToast('Cashed Out!', `Secured ×${mult} (+${winAmount} ⭐)!`, '💰');

  revealAllMines();
  const playBtn = document.getElementById('primaryPlayBtn');
  const cashoutBtn = document.getElementById('cashoutBtn');
  if (playBtn) { playBtn.classList.remove('hidden'); playBtn.innerText = 'Start hunt'; }
  if (cashoutBtn) cashoutBtn.classList.add('hidden');
}

function revealAllMines() {
  minesGridData.forEach((tile, i) => {
    const btn = document.getElementById(`mineTile_${i}`);
    if (btn && !tile.revealed) {
      btn.innerText = tile.isBomb ? '💣' : '💎';
      btn.style.opacity = '0.5';
    }
  });
}

// ==========================================
// 7. UNDER OVER
// ==========================================
function setUnderOverMode(mode) {
  playTone('tick');
  uoDirection = mode;
  const btnUnder = document.getElementById('btnUOunder');
  const btnOver = document.getElementById('btnUOover');
  const fill = document.getElementById('uoProgressFill');

  if (mode === 'under') {
    if (btnUnder) btnUnder.className = 'py-3 px-3 rounded-xl bg-lime-500/10 border-2 border-lime-500 text-lime-400 font-black text-sm transition-all shadow-[0_0_16px_rgba(132,204,22,0.25)]';
    if (btnOver) btnOver.className = 'py-3 px-3 rounded-xl bg-[#171c28] border border-[#232c3f] text-gray-400 font-black text-sm transition-all hover:text-white';
    if (fill) fill.classList.remove('over-mode');
  } else {
    if (btnOver) btnOver.className = 'py-3 px-3 rounded-xl bg-lime-500/10 border-2 border-lime-500 text-lime-400 font-black text-sm transition-all shadow-[0_0_16px_rgba(132,204,22,0.25)]';
    if (btnUnder) btnUnder.className = 'py-3 px-3 rounded-xl bg-[#171c28] border border-[#232c3f] text-gray-400 font-black text-sm transition-all hover:text-white';
    if (fill) fill.classList.add('over-mode');
  }
  updateUnderOverCalculations();
}

function onThresholdChange(val) {
  uoThreshold = parseInt(val, 10);
  playTone('tick');
  updateUnderOverCalculations();
}

function updateUnderOverCalculations() {
  const lblThresholdUnder = document.getElementById('lblThresholdUnder');
  const lblThresholdOver = document.getElementById('lblThresholdOver');
  const sliderValueText = document.getElementById('sliderValueText');
  const centerLabel = document.getElementById('uoThresholdCenterLabel');
  const needle = document.getElementById('uoNeedle');
  const fill = document.getElementById('uoProgressFill');
  const sliderFill = document.getElementById('sliderFillBar');
  const slider = document.getElementById('uoSlider');

  if (lblThresholdUnder) lblThresholdUnder.innerText = uoThreshold;
  if (lblThresholdOver) lblThresholdOver.innerText = uoThreshold;
  if (sliderValueText) sliderValueText.innerText = uoThreshold;
  if (centerLabel) centerLabel.innerText = uoDirection === 'under' ? `Under ${uoThreshold}` : `Over ${uoThreshold}`;
  if (slider) slider.value = uoThreshold;

  const pct = (uoThreshold / 99) * 100;
  if (needle) needle.style.left = `${pct}%`;
  if (sliderFill) sliderFill.style.width = `${pct}%`;

  if (fill) {
    if (uoDirection === 'under') {
      fill.style.width = `${pct}%`;
      fill.style.left = '0';
      fill.style.right = 'auto';
    } else {
      fill.style.width = `${100 - pct}%`;
      fill.style.left = 'auto';
      fill.style.right = '0';
    }
  }

  let winChance = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
  winChance = Math.max(1, Math.min(98, winChance));

  const payout = (95 / winChance).toFixed(2);
  const toWin = Math.floor(currentBet * Number(payout));

  const cText = document.getElementById('uoWinChanceText');
  const mText = document.getElementById('uoMultiplierText');
  const wText = document.getElementById('uoToWinText');
  const payoutPill = document.getElementById('uoPayoutPill');

  if (cText) cText.innerText = `${winChance}%`;
  if (mText) mText.innerText = `×${payout}`;
  if (wText) wText.innerText = toWin.toLocaleString();
  if (payoutPill) payoutPill.innerText = `×${payout}`;
}

function rollUnderOverGame() {
  if (isRollingUO) return;
  isRollingUO = true;
  recordPlayUsed('underover');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const dLeft = document.getElementById('uoDigitLeft');
  const dRight = document.getElementById('uoDigitRight');
  const marker = document.getElementById('uoRollMarker');

  if (dLeft) dLeft.className = "text-6xl font-black text-white tracking-tighter select-none";
  if (dRight) dRight.className = "text-6xl font-black text-white tracking-tighter select-none";
  if (marker) marker.style.display = 'flex';

  const winProbability = getWinProbability();
  const isWin = Math.random() < winProbability;
  let finalNumber;
  if (isWin) {
    if (uoDirection === 'under') {
      finalNumber = Math.floor(Math.random() * uoThreshold);
    } else {
      finalNumber = uoThreshold + 1 + Math.floor(Math.random() * (99 - uoThreshold));
    }
  } else {
    if (uoDirection === 'under') {
      finalNumber = uoThreshold + Math.floor(Math.random() * (100 - uoThreshold));
    } else {
      finalNumber = Math.floor(Math.random() * (uoThreshold + 1));
    }
  }
  finalNumber = Math.max(0, Math.min(99, finalNumber));

  let ticks = 0;
  const maxTicks = 16;
  const timer = setInterval(() => {
    ticks++;
    const randomDisplay = Math.floor(Math.random() * 100);
    const pct = (randomDisplay / 99) * 100;
    if (marker) {
      marker.style.left = `${pct}%`;
      marker.innerText = randomDisplay;
    }
    const dStr = String(randomDisplay).padStart(2, '0');
    if (dLeft) dLeft.innerText = dStr[0];
    if (dRight) dRight.innerText = dStr[1];

    playTone('tick');

    if (ticks >= maxTicks) {
      clearInterval(timer);
      isRollingUO = false;

      const finalPct = (finalNumber / 99) * 100;
      if (marker) {
        marker.style.left = `${finalPct}%`;
        marker.innerText = finalNumber;
      }
      const finalStr = String(finalNumber).padStart(2, '0');
      if (dLeft) dLeft.innerText = finalStr[0];
      if (dRight) dRight.innerText = finalStr[1];

      let winChance = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
      const payout = parseFloat((95 / Math.max(1, winChance)).toFixed(2));

      if (isWin) {
        if (dLeft) dLeft.className = "text-6xl font-black text-lime-400 tracking-tighter select-none drop-shadow-[0_0_12px_rgba(163,230,53,0.8)]";
        if (dRight) dRight.className = "text-6xl font-black text-lime-400 tracking-tighter select-none drop-shadow-[0_0_12px_rgba(163,230,53,0.8)]";
        const winAmount = Math.round(currentBet * payout);
        balance += winAmount;
        saveBalance();
        updateBalanceUI();
        if (window.confetti) confetti({ particleCount: 70, spread: 60 });
        playTone('win');
        showToast('Target Hit!', `Rolled ${finalNumber}! Won ${winAmount} ⭐ (×${payout})`, '🎯');
      } else {
        if (dLeft) dLeft.className = "text-6xl font-black text-rose-400 tracking-tighter select-none";
        if (dRight) dRight.className = "text-6xl font-black text-rose-400 tracking-tighter select-none";
        playTone('lose');
        showToast('Missed!', `Rolled ${finalNumber}. Condition not met.`, '❌');
      }
    }
  }, 50);
}

// ==========================================
// WATCH AD POPUP
// ==========================================
let isWatchingAd = false;
let adCountdownInterval = null;

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

// ==========================================
// INITIALIZATION ON DOM READY
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  const storedStars = localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars');
  balance = parseInt(storedStars || '10', 10);
  
  // Check URL param ?game=dice / scratch / spin
  const urlParams = new URLSearchParams(window.location.search);
  const targetGame = urlParams.get('game') || 'dice';
  
  updateBalanceUI();
  setBet(50);
  switchTab(targetGame);

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_stars' || e.key === 'user_stars') {
      balance = parseInt(localStorage.getItem('task_game_stars') || '10', 10);
      updateBalanceUI();
    }
  });

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.onmessage = (e) => {
      if (e.data && (e.data.type === 'BALANCES_UPDATED' || e.data.type === 'STARS_UPDATED')) {
        balance = parseInt(localStorage.getItem('task_game_stars') || '10', 10);
        updateBalanceUI();
      }
    };
  } catch (e) {}

  if (window.lucide) lucide.createIcons();
});
