/**
 * ==========================================================================
 * STAR GAME SUITE — MASTER MULTI-GAME CONTROLLER
 * 7 Arcade Classics • 50% Win Rate Calibration • 10 Plays/Day Limit + Watch Ad
 * ==========================================================================
 */

const DAILY_FREE_PLAYS = 10;
const BONUS_PLAYS_PER_AD = 5;

// Global State
let currentTab = 'lobby';
let balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
let currentBet = 20;
let soundEnabled = true;

// 1. Lucky Dice State
let diceStreak = 0;
let isRollingDice = false;

// 2. Lucky Scratch State
let isScratchingCard = false;
let scratchPurchased = false;
let scratchPrize = { tier: 'Winner', mult: 2, icon: '🎉' };

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

// Balance Management with Cross-Tab Sync
function updateBalanceUI() {
  const el = document.getElementById('coinBalance');
  if (el) el.innerText = balance.toLocaleString();
  updateActionButtonState();
}

function saveBalance() {
  localStorage.setItem('task_game_stars', Math.max(0, balance).toString());
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
  showToast('Bonus Added', '+200 free stars credited to your pouch!', '⭐');
  if (window.confetti) confetti({ particleCount: 35, spread: 60, origin: { y: 0.2 } });
}

// Daily Plays Tracker (10 Free Plays / Day per Game)
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
  updateDailyPlaysUI();
}

function grantBonusPlays(count = BONUS_PLAYS_PER_AD, gameId) {
  const id = gameId || currentTab;
  const key = `lucky_bonus_${id}_${getTodayKey()}`;
  const current = getBonusPlaysToday(id) + count;
  localStorage.setItem(key, current.toString());
  updateDailyPlaysUI();
}

function updateDailyPlaysUI() {
  if (currentTab === 'lobby') return;
  const remaining = getRemainingPlays(currentTab);
  const total = DAILY_FREE_PLAYS + getBonusPlaysToday(currentTab);
  const display = document.getElementById('dailyPlaysDisplay');
  if (display) {
    display.innerText = `Plays: ${remaining}/${total}`;
    display.style.color = remaining <= 0 ? '#ef4444' : '#38bdf8';
  }
  updateActionButtonState();
}

function checkDailyPlaysClick() {
  if (getRemainingPlays(currentTab) <= 0) {
    openAdModal();
  } else {
    showToast('Daily Free Plays', `${getRemainingPlays(currentTab)} free plays remaining in ${GAME_CONFIGS[currentTab]?.title || 'this game'}.`, '🎯');
  }
}

// Action Button State Sync
function updateActionButtonState() {
  const btn = document.getElementById('primaryPlayBtn');
  if (!btn || currentTab === 'lobby') return;
  const cfg = GAME_CONFIGS[currentTab];
  if (!cfg) return;

  const remaining = getRemainingPlays(currentTab);
  if (remaining <= 0) {
    btn.innerText = '▶ Watch Ad to Play (0/10)';
    btn.className = 'w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-lg tracking-wide shadow-lg active:scale-[0.98] transition-all';
  } else if (balance < currentBet) {
    btn.innerText = 'Get Free Refill (+200 ⭐)';
    btn.className = `w-full py-4 rounded-2xl bg-gradient-to-r ${cfg.btnClass} font-black text-lg tracking-wide shadow-lg active:scale-[0.98] transition-all`;
  } else {
    btn.innerText = cfg.btnText;
    btn.className = `w-full py-4 rounded-2xl bg-gradient-to-r ${cfg.btnClass} font-black text-lg tracking-wide shadow-lg active:scale-[0.98] transition-all`;
  }
}

// ==========================================
// GAME CONFIGURATIONS & RULES
// ==========================================
const GAME_CONFIGS = {
  lobby: {
    title: 'All Games',
    color: '#38bdf8',
    btnText: '',
    btnClass: '',
    sheet: {
      title: 'Arcade Suite',
      subtitle: 'Select any game tab to play instantly.',
      step1: 'Pick a game from the lobby cards.',
      step2: 'Adjust your bet chips from 10 up to 1,000 coins.',
      step3: 'Win real multiplier payouts with 50% calibrated win rate.',
      table: [
        { label: 'Available Games', val: '7 Arcade Classics' },
        { label: 'Win Calibration', val: '50% Fair Payouts' },
        { label: 'Daily Free Plays', val: '10 Plays / Day' },
        { label: 'Free Coin Refills', val: '+200 every tap' }
      ]
    }
  },
  dice: {
    title: 'Lucky Dice',
    color: '#38bdf8',
    btnText: 'Roll Dice',
    btnClass: 'from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950',
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
    btnText: 'Buy Card',
    btnClass: 'from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-slate-950',
    sheet: {
      title: 'Lucky Scratch',
      subtitle: 'Buy a card, scratch the foil, reveal the prize.',
      step1: 'Set your bet and tap Buy card. The prize is decided the moment you buy.',
      step2: 'Drag across the foil. Once about 40% is cleared the rest lifts on its own.',
      step3: 'The multiplier under the foil is paid out.',
      table: [
        { label: 'Jackpot', val: '×15' },
        { label: 'Big win', val: '×5' },
        { label: 'Winner', val: '×2' },
        { label: 'Money back', val: '×1' },
        { label: 'Bust', val: '×0' }
      ]
    }
  },
  spin: {
    title: 'Lucky Spin',
    color: '#a855f7',
    btnText: 'Spin Wheel',
    btnClass: 'from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-slate-950',
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
    btnText: 'Drop Gift',
    btnClass: 'from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 text-slate-950',
    sheet: {
      title: 'Gift Drop',
      subtitle: 'Drop gifts down the pegs and chase the edges.',
      step1: 'Set the bet per gift and tap Drop Gift.',
      step2: 'Each gift bounces down 8 rows of pegs into one of eleven buckets.',
      step3: 'Every bucket pays its multiplier on that gift\'s bet. The outer buckets pay the most.',
      table: [
        { label: 'Outer buckets (Edges)', val: '×24' },
        { label: 'Next in (Mid-outer)', val: '×5 · ×2 · ×1.2' },
        { label: 'Middle (Center buckets)', val: '×0.7 · ×0.25 · ×0.7' }
      ]
    }
  },
  coin: {
    title: 'Coin Flip',
    color: '#eab308',
    btnText: 'Flip Coin',
    btnClass: 'from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-amber-950',
    sheet: {
      title: 'Coin Flip',
      subtitle: 'Call heads or tails, flip, double up.',
      step1: 'Pick heads (star) or tails (gift) and set your bet.',
      step2: 'Tap Flip. The coin tumbles and lands on one side.',
      step3: 'Landing on your side pays ×1.9 of the stake; the other side loses it.',
      table: [
        { label: 'Correct call', val: '×1.9' },
        { label: 'Wrong call', val: 'stake lost' }
      ]
    }
  },
  mines: {
    title: 'Gift Hunt',
    color: '#2dd4bf',
    btnText: 'Start Hunt',
    btnClass: 'from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950',
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
    btnText: 'Roll Number',
    btnClass: 'from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 text-lime-950',
    sheet: {
      title: 'Under Over',
      subtitle: 'Set a threshold, pick a side, roll 0–99.',
      step1: 'Drag the threshold anywhere from 2 to 98.',
      step2: 'Choose Under (roll below threshold wins) or Over (roll above wins). Hitting threshold exactly always loses.',
      step3: 'The payout is 0.95 divided by your win chance. Riskier picks pay more, up to ×95.',
      table: [
        { label: 'Under 50', val: '50% · ×1.90' },
        { label: 'Under 25', val: '25% · ×3.80' },
        { label: 'Under 10', val: '10% · ×9.50' },
        { label: 'Under 2 / Over 98', val: '2% · ×47.5' }
      ]
    }
  }
};

// ==========================================
// TAB SWITCHING LOGIC
// ==========================================
function openLobbyTab() {
  switchTab('lobby');
}

function switchTab(tabId) {
  playTone('click');
  currentTab = tabId;
  const config = GAME_CONFIGS[tabId];
  if (!config) return;

  // Header Title & Dot
  const titleEl = document.getElementById('gameTitleNav');
  const dotEl = document.getElementById('gameDot');
  if (titleEl) titleEl.innerText = config.title;
  if (dotEl) dotEl.style.backgroundColor = config.color;

  // Back Button Switcher: Arena button vs Lobby button
  const arenaBtn = document.getElementById('backToArenaBtn');
  const lobbyBtn = document.getElementById('backToLobbyBtn');
  if (tabId === 'lobby') {
    if (arenaBtn) arenaBtn.classList.remove('hidden');
    if (lobbyBtn) lobbyBtn.classList.add('hidden');
  } else {
    if (arenaBtn) arenaBtn.classList.add('hidden');
    if (lobbyBtn) lobbyBtn.classList.remove('hidden');
  }

  // Toggle Game Views
  document.querySelectorAll('.game-view').forEach(view => view.classList.add('hidden'));
  const activeSection = document.getElementById(`game-${tabId}`);
  if (activeSection) activeSection.classList.remove('hidden');

  // Shared Controls container (hide in lobby)
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
    updateDailyPlaysUI();
  }

  // Update Sheet Modal Content
  updateSheetContent(config);

  // Per-game initializers
  if (tabId === 'scratch' && !scratchPurchased) {
    initScratchCard(false);
  } else if (tabId === 'spin') {
    drawSpinWheel();
  } else if (tabId === 'plinko') {
    initPlinko();
  } else if (tabId === 'mines' && minesGridData.length === 0) {
    initMinesGrid();
  } else if (tabId === 'underover') {
    updateUnderOverCalculations();
  }

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
    setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
  } else {
    sheet.classList.add('translate-y-full');
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

  if (title) title.innerText = s.title;
  if (sub) sub.innerText = s.subtitle;
  if (s1) s1.innerText = s.step1;
  if (s2) s2.innerText = s.step2;
  if (s3) s3.innerText = s.step3;
  if (dot) dot.style.backgroundColor = config.color;
  if (gotIt) gotIt.style.backgroundColor = config.color;

  const tableEl = document.getElementById('sheetTable');
  if (tableEl && s.table) {
    tableEl.innerHTML = '';
    s.table.forEach(row => {
      const tr = document.createElement('div');
      tr.className = 'px-4 py-3 flex items-center justify-between text-xs font-semibold';
      tr.innerHTML = `
        <span class="text-gray-300">${row.label}</span>
        <span class="text-white font-extrabold">${row.val}</span>
      `;
      tableEl.appendChild(tr);
    });
  }
}

// Watch Ad Modal Controller (Daily Play Limit)
let isWatchingAd = false;
let adCountdownInterval = null;

function openAdModal() {
  playTone('click');
  const overlay = document.getElementById('adModalOverlay');
  const sheet = document.getElementById('adModalSheet');
  const initialView = document.getElementById('adInitialView');
  const playerView = document.getElementById('adPlayerView');
  if (!sheet || !overlay) return;

  if (initialView) { initialView.classList.remove('hidden'); initialView.style.display = 'block'; }
  if (playerView) { playerView.classList.add('hidden'); playerView.style.display = 'none'; }

  overlay.classList.remove('hidden');
  overlay.style.display = 'block';
  sheet.classList.remove('hidden');
  sheet.style.display = 'block';
}

function closeAdModal() {
  if (isWatchingAd) return;
  playTone('click');
  const overlay = document.getElementById('adModalOverlay');
  const sheet = document.getElementById('adModalSheet');
  if (sheet) { sheet.classList.add('hidden'); sheet.style.display = 'none'; }
  if (overlay) { overlay.classList.add('hidden'); overlay.style.display = 'none'; }
}

function startWatchingAd() {
  if (isWatchingAd) return;
  isWatchingAd = true;
  playTone('click');

  // Trigger Backend Universal Ad Service
  if (typeof window.openWatchAd === 'function') {
    window.openWatchAd({ game: currentTab, rewardPlays: BONUS_PLAYS_PER_AD });
  }

  const initialView = document.getElementById('adInitialView');
  const playerView = document.getElementById('adPlayerView');
  const timerText = document.getElementById('adTimerText');
  const progressFill = document.getElementById('adProgressFill');

  if (initialView) initialView.classList.add('hidden');
  if (playerView) playerView.classList.remove('hidden');

  let secondsLeft = 5;
  if (timerText) timerText.innerText = `Reward in ${secondsLeft}s...`;
  if (progressFill) progressFill.style.width = '0%';

  const startTime = Date.now();
  const totalDuration = 5000;

  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const pct = Math.min(100, (elapsed / totalDuration) * 100);
    if (progressFill) progressFill.style.width = `${pct}%`;
  }, 50);

  adCountdownInterval = setInterval(() => {
    secondsLeft--;
    playTone('tick');
    if (timerText) timerText.innerText = secondsLeft > 0 ? `Reward in ${secondsLeft}s...` : 'Reward Unlocked! 🎉';

    if (secondsLeft <= 0) {
      clearInterval(adCountdownInterval);
      clearInterval(progressInterval);
      isWatchingAd = false;

      // Credit +5 Bonus Plays to active game
      grantBonusPlays(BONUS_PLAYS_PER_AD, currentTab);
      if (window.confetti) confetti({ particleCount: 80, spread: 70 });
      playTone('jackpot');
      showToast('Reward Earned!', '+5 Extra Plays Unlocked! Keep playing!', '🎉');

      setTimeout(() => {
        closeAdModal();
      }, 700);
    }
  }, 1000);
}

// Bet Controls
function setBet(amount) {
  playTone('tick');
  currentBet = Math.min(2000, Math.max(10, amount));
  const el = document.getElementById('currentBetDisplay');
  if (el) el.innerText = currentBet;
  updateActiveChipUI();
  if (currentTab === 'underover') updateUnderOverCalculations();
}

const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000];

function stepDownBet() {
  if (typeof isWheelSpinning !== 'undefined' && isWheelSpinning) return;
  if (typeof scratchPurchased !== 'undefined' && scratchPurchased) return;
  if (typeof isSpinning !== 'undefined' && isSpinning) return;
  if (typeof isRolling !== 'undefined' && isRolling) return;
  if (typeof isPlaying !== 'undefined' && isPlaying) return;
  if (typeof isFlipping !== 'undefined' && isFlipping) return;

  const lower = BET_STEPS.filter(s => s < currentBet);
  if (lower.length > 0) {
    setBet(lower[lower.length - 1]);
  } else {
    setBet(BET_STEPS[0]);
  }
}

function stepUpBet() {
  if (typeof isWheelSpinning !== 'undefined' && isWheelSpinning) return;
  if (typeof scratchPurchased !== 'undefined' && scratchPurchased) return;
  if (typeof isSpinning !== 'undefined' && isSpinning) return;
  if (typeof isRolling !== 'undefined' && isRolling) return;
  if (typeof isPlaying !== 'undefined' && isPlaying) return;
  if (typeof isFlipping !== 'undefined' && isFlipping) return;

  const higher = BET_STEPS.filter(s => s > currentBet);
  if (higher.length > 0) {
    setBet(higher[0]);
  } else {
    setBet(BET_STEPS[BET_STEPS.length - 1]);
  }
}

function halveBet() { stepDownBet(); }
function doubleBet() { stepUpBet(); }

function updateActiveChipUI() {
  document.querySelectorAll('.bet-chip').forEach(btn => {
    const txt = parseInt(btn.innerText, 10);
    if (txt === currentBet) {
      btn.className = 'bet-chip active-chip py-2 rounded-xl bg-sky-500/20 border-2 border-sky-400 text-xs font-black text-sky-300 transition-all flex items-center justify-center gap-1';
    } else {
      btn.className = 'bet-chip py-2 rounded-xl bg-[#1a1e2b] border border-[#282f44] text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1';
    }
  });
}

// Toast System
function showToast(title, msg, icon = '🪙') {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMessage').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.remove('-translate-y-48', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-48', 'opacity-0');
  }, 2600);
}

// Primary Action Dispatcher
function handlePrimaryAction() {
  if (getRemainingPlays(currentTab) <= 0) {
    openAdModal();
    return;
  }

  if (balance < currentBet) {
    addFreeCoins();
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

  // Dynamic Win Rate Calibration:
  // Total star balance >= 10,000 -> 10% win probability
  // Total star balance >= 5,000  -> 20% win probability
  // Below 5,000 stars            -> 50% win probability
  let winProbability = 0.50;
  if (balance >= 10000) {
    winProbability = 0.10;
  } else if (balance >= 5000) {
    winProbability = 0.20;
  }
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

    // 0.1% Tax Cut on Winnings (min 1 star if gross > 0)
    let wonAmount = 0;
    let taxAmount = 0;
    if (grossWin > 0) {
      taxAmount = Math.max(1, Math.round(grossWin * 0.001));
      wonAmount = Math.max(0, grossWin - taxAmount);
    }

    if (grossWin >= Math.round(currentBet * 7)) {
      if (window.confetti) confetti({ particleCount: 100, spread: 80 });
      playTone('jackpot');
      showToast('JACKPOT!', `Three Sixes! Paid +${wonAmount} ⭐ (0.1% tax: -${taxAmount} ⭐)`, '🔥');
    } else if (baseMult > 1) {
      playTone('win');
      showToast('Winner!', `Rolled a ${rolledFace}! Won +${wonAmount} ⭐ (0.1% tax: -${taxAmount} ⭐)`, '🎉');
    } else if (baseMult > 0) {
      playTone('win');
      showToast('Face ' + rolledFace, `Paid ×${baseMult} (+${wonAmount} ⭐, tax: -${taxAmount} ⭐)`, '🎲');
    } else {
      playTone('lose');
      showToast('Rolled a One', 'Face 1 pays ×0. Better luck next roll!', '💀');
    }

    balance += wonAmount;
    saveBalance();
    updateBalanceUI();
  }, 1200);
}

function updateDiceStreakUI() {
  const container = document.getElementById('diceStreakIndicators');
  if (!container) return;
  const indicators = container.children;
  for (let i = 0; i < 3; i++) {
    if (i < diceStreak) {
      indicators[i].className = 'w-6 h-3 rounded-md bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]';
    } else {
      indicators[i].className = 'w-6 h-3 rounded-md bg-[#252c3f]';
    }
  }
}

// ==========================================
// 2. LUCKY SCRATCH (50% WIN RATE CALIBRATED)
// ==========================================
function initScratchCard(purchased = false) {
  const canvas = document.getElementById('scratchCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.globalCompositeOperation = 'source-over';
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#f43f5e');
  grad.addColorStop(0.5, '#e11d48');
  grad.addColorStop(1, '#9f1239');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  for (let i = 25; i < w; i += 45) {
    for (let j = 25; j < h; j += 45) {
      ctx.beginPath();
      ctx.arc(i, j, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Plus Jakarta Sans"';
  ctx.textAlign = 'center';
  ctx.fillText(purchased ? 'SCRATCH TO REVEAL' : 'BUY A CARD TO PLAY', w / 2, h / 2 + 5);

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

  // Dynamic Win Rate Calibration:
  // Total star balance >= 10,000 -> 10% win probability
  // Total star balance >= 5,000  -> 20% win probability
  // Below 5,000 stars            -> 50% win probability
  let winProbability = 0.50;
  if (balance >= 10000) {
    winProbability = 0.10;
  } else if (balance >= 5000) {
    winProbability = 0.20;
  }
  const isWin = Math.random() < winProbability;
  if (isWin) {
    const winRoll = Math.random();
    if (winRoll < 0.08) {
      scratchPrize = { tier: 'Jackpot', mult: 15, icon: '👑' };
    } else if (winRoll < 0.40) {
      scratchPrize = { tier: 'Big Win', mult: 5, icon: '💎' };
    } else if (winRoll < 0.80) {
      scratchPrize = { tier: 'Winner', mult: 2, icon: '🎉' };
    } else {
      scratchPrize = { tier: 'Money Back', mult: 1, icon: '⭐' };
    }
  } else {
    scratchPrize = { tier: 'Bust', mult: 0, icon: '💨' };
  }

  document.getElementById('scratchIcon').innerText = scratchPrize.icon;
  document.getElementById('scratchMultiplierLabel').innerText = `×${scratchPrize.mult}`;
  document.getElementById('scratchTierLabel').innerText = scratchPrize.tier;
  const winCoin = Math.round(currentBet * scratchPrize.mult);
  document.getElementById('scratchWinAmountText').innerText = scratchPrize.mult > 0 ? `+${winCoin} Stars` : `0 Stars`;

  initScratchCard(true);
  const btn = document.getElementById('primaryPlayBtn');
  if (btn) {
    btn.innerText = 'Scratch Card Above';
    btn.disabled = true;
  }
}

function enableScratching(canvas, ctx) {
  let isDrawing = false;
  let scratchedPixels = 0;

  function scratchAt(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    playTone('tick');

    scratchedPixels++;
    if (scratchedPixels > 25) {
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  scratchPurchased = false;
  const grossWin = Math.round(currentBet * scratchPrize.mult);
  let taxAmount = 0;
  let winAmount = 0;
  if (grossWin > 0) {
    taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
    winAmount = Math.max(0, grossWin - taxAmount);
  }
  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  if (scratchPrize.mult >= 5) {
    if (window.confetti) confetti({ particleCount: 80, spread: 70 });
    playTone('jackpot');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} ⭐ (0.1% tax: -${taxAmount} ⭐)`, scratchPrize.icon);
  } else if (scratchPrize.mult > 0) {
    playTone('win');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount} ⭐ (0.1% tax: -${taxAmount} ⭐)`, scratchPrize.icon);
  } else {
    playTone('lose');
    showToast('Bust', 'No prize under foil. Better luck next time!', '💨');
  }

  const playBtn = document.getElementById('primaryPlayBtn');
  if (playBtn) {
    playBtn.innerText = 'Buy Card';
    playBtn.disabled = false;
  }
}

// ==========================================
// 3. LUCKY SPIN (50% WIN RATE CALIBRATED)
// ==========================================
const WHEEL_WEDGES = [
  { label: '×5', mult: 5, color: '#eab308', text: '#000' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888' },
  { label: '×1', mult: 1, color: '#7c3aed', text: '#fff' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888' },
  { label: '×0.5', mult: 0.5, color: '#a78bfa', text: '#000' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888' },
  { label: '×2', mult: 2, color: '#581c87', text: '#fff' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888' },
  { label: '×1', mult: 1, color: '#7c3aed', text: '#fff' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888' },
  { label: '×0.5', mult: 0.5, color: '#a78bfa', text: '#000' },
  { label: '×0', mult: 0, color: '#1f1a2e', text: '#888' }
];

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
  isWheelSpinning = true;
  recordPlayUsed('spin');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('wheelCanvas');

  // Dynamic Win Rate Calibration:
  // Total star balance >= 10,000 -> 10% win probability
  // Total star balance >= 5,000  -> 20% win probability
  // Below 5,000 stars            -> 50% win probability
  let winProbability = 0.50;
  if (balance >= 10000) {
    winProbability = 0.10;
  } else if (balance >= 5000) {
    winProbability = 0.20;
  }
  const isWin = Math.random() < winProbability;
  let targetIndex;
  if (isWin) {
    const winWedges = [0, 2, 6, 8];
    targetIndex = winWedges[Math.floor(Math.random() * winWedges.length)];
  } else {
    const loseWedges = [1, 3, 4, 5, 7, 9, 10, 11];
    targetIndex = loseWedges[Math.floor(Math.random() * loseWedges.length)];
  }

  const sliceDeg = 360 / WHEEL_WEDGES.length;
  const targetDegInWheel = targetIndex * sliceDeg + sliceDeg / 2;
  const fullRotations = (Math.floor(Math.random() * 4) + 4) * 360;
  const finalAngle = fullRotations + (270 - targetDegInWheel);

  wheelRotationAngle += finalAngle;
  canvas.style.transition = 'transform 3.5s cubic-bezier(0.15, 0.9, 0.25, 1)';
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
    const grossWin = Math.round(currentBet * wedge.mult);
    let taxAmount = 0;
    let winAmount = 0;
    if (grossWin > 0) {
      taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
      winAmount = Math.max(0, grossWin - taxAmount);
    }

    balance += winAmount;
    saveBalance();
    updateBalanceUI();

    if (wedge.mult >= 5) {
      if (window.confetti) confetti({ particleCount: 100, spread: 75 });
      playTone('jackpot');
      showToast('GOLD WEDGE!', `Hit ×5! Payout +${winAmount} ⭐ (0.1% tax: -${taxAmount} ⭐)`, '👑');
    } else if (wedge.mult > 0) {
      playTone('win');
      showToast(`Landed on ${wedge.label}`, `Won +${winAmount} ⭐ (0.1% tax: -${taxAmount} ⭐)`, '🎡');
    } else {
      playTone('lose');
      showToast('Bust Wedge', 'No luck on this spin! Stake lost.', '💀');
    }
  }, 3600);
}

// ==========================================
// 4. GIFT DROP (PLINKO — 50% WIN RATE CALIBRATED)
// ==========================================
const PLINKO_BUCKETS = [24, 5, 2, 1.2, 0.7, 0.25, 0.7, 1.2, 2, 5, 24];

function initPlinko() {
  const canvas = document.getElementById('plinkoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  drawPlinkoBoard(ctx, canvas.width, canvas.height);
}

function drawPlinkoBoard(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const rows = 8;
  const pegSpacingY = 20;
  const startY = 25;

  ctx.fillStyle = '#38bdf8';
  for (let r = 0; r < rows; r++) {
    const count = r + 3;
    const rowWidth = (count - 1) * 26;
    const startX = (w - rowWidth) / 2;
    for (let c = 0; c < count; c++) {
      ctx.beginPath();
      ctx.arc(startX + c * 26, startY + r * pegSpacingY, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const bucketCount = PLINKO_BUCKETS.length;
  const bucketWidth = w / bucketCount;
  const bucketY = h - 22;

  PLINKO_BUCKETS.forEach((mult, i) => {
    const bx = i * bucketWidth;
    ctx.fillStyle = mult >= 5 ? '#06b6d4' : (mult >= 1 ? '#1e293b' : '#111827');
    ctx.fillRect(bx + 1, bucketY, bucketWidth - 2, 20);

    ctx.fillStyle = mult >= 5 ? '#020617' : (mult >= 1 ? '#38bdf8' : '#64748b');
    ctx.font = 'bold 9px "Plus Jakarta Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(`×${mult}`, bx + bucketWidth / 2, bucketY + 13);
  });
}

function dropPlinkoBall() {
  if (isDroppingPlinko) return;
  recordPlayUsed('plinko');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('plinkoCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Dynamic Win Rate Calibration:
  // Total star balance >= 10,000 -> 10% win probability
  // Total star balance >= 5,000  -> 20% win probability
  // Below 5,000 stars            -> 50% win probability
  let winProbability = 0.50;
  if (balance >= 10000) {
    winProbability = 0.10;
  } else if (balance >= 5000) {
    winProbability = 0.20;
  }
  const isWin = Math.random() < winProbability;
  let targetBucket;
  if (isWin) {
    const winBuckets = [0, 1, 2, 3, 7, 8, 9, 10];
    targetBucket = winBuckets[Math.floor(Math.random() * winBuckets.length)];
  } else {
    const loseBuckets = [4, 5, 6];
    targetBucket = loseBuckets[Math.floor(Math.random() * loseBuckets.length)];
  }

  const bucketWidth = w / PLINKO_BUCKETS.length;
  const targetX = targetBucket * bucketWidth + bucketWidth / 2;

  let x = w / 2;
  let y = 10;
  let vy = 1.2;
  isDroppingPlinko = true;

  function animateDrop() {
    ctx.clearRect(0, 0, w, h);
    drawPlinkoBoard(ctx, w, h);

    vy += 0.28;
    y += vy;

    // Smoothly bias x towards target bucket
    const progress = Math.min(1, y / (h - 30));
    x = (w / 2) * (1 - progress) + targetX * progress + (Math.sin(y * 0.2) * 8 * (1 - progress));

    if (Math.random() < 0.25) {
      playTone('tick');
    }

    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁', x, y);

    if (y < h - 28) {
      requestAnimationFrame(animateDrop);
    } else {
      isDroppingPlinko = false;
      const mult = PLINKO_BUCKETS[targetBucket];
      const grossWin = Math.round(currentBet * mult);
      let taxAmount = 0;
      let winAmount = 0;
      if (grossWin > 0) {
        taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
        winAmount = Math.max(0, grossWin - taxAmount);
      }

      balance += winAmount;
      saveBalance();
      updateBalanceUI();

      if (mult >= 5) {
        if (window.confetti) confetti({ particleCount: 90, spread: 70 });
        playTone('jackpot');
        showToast('EDGE SHOT!', `Landed on ×${mult}! Won ${winAmount} ⭐ (0.1% tax: -${taxAmount} ⭐)`, '🎁');
      } else if (mult > 0) {
        playTone('win');
        showToast('Gift Landed', `Paid ×${mult} (+${winAmount} ⭐, tax: -${taxAmount} ⭐)`, '🎁');
      } else {
        playTone('lose');
      }
    }
  }

  animateDrop();
}

// ==========================================
// 5. COIN FLIP (50% WIN RATE CALIBRATED)
// ==========================================
function selectCoinSide(side) {
  playTone('tick');
  coinSelectedSide = side;
  const btnH = document.getElementById('btnHeads');
  const btnT = document.getElementById('btnTails');

  if (btnH) {
    btnH.className = side === 'heads'
      ? 'coin-pick-btn py-3 px-4 rounded-2xl bg-amber-500/20 border-2 border-yellow-400 flex items-center justify-center gap-2 font-bold text-sm text-yellow-300 transition-all'
      : 'coin-pick-btn py-3 px-4 rounded-2xl bg-[#191d29] border border-[#2b3145] flex items-center justify-center gap-2 font-bold text-sm text-gray-400 transition-all';
  }
  if (btnT) {
    btnT.className = side === 'tails'
      ? 'coin-pick-btn py-3 px-4 rounded-2xl bg-amber-500/20 border-2 border-yellow-400 flex items-center justify-center gap-2 font-bold text-sm text-yellow-300 transition-all'
      : 'coin-pick-btn py-3 px-4 rounded-2xl bg-[#191d29] border border-[#2b3145] flex items-center justify-center gap-2 font-bold text-sm text-gray-400 transition-all';
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

  const coinEl = document.getElementById('coinElement');
  const symbolEl = document.getElementById('coinFaceSymbol');

  // Dynamic Win Rate Calibration:
  // Total star balance >= 10,000 -> 10% win probability
  // Total star balance >= 5,000  -> 20% win probability
  // Below 5,000 stars            -> 50% win probability
  let winProbability = 0.50;
  if (balance >= 10000) {
    winProbability = 0.10;
  } else if (balance >= 5000) {
    winProbability = 0.20;
  }
  const isWin = Math.random() < winProbability;
  const outcome = isWin ? coinSelectedSide : (coinSelectedSide === 'heads' ? 'tails' : 'heads');

  if (coinEl) coinEl.style.transform = 'rotateY(1800deg) scale(1.15)';

  let flipCount = 0;
  const flipTimer = setInterval(() => {
    if (symbolEl) symbolEl.innerText = flipCount % 2 === 0 ? '⭐' : '🎁';
    playTone('tick');
    flipCount++;
  }, 100);

  setTimeout(() => {
    clearInterval(flipTimer);
    if (coinEl) coinEl.style.transform = 'rotateY(0deg) scale(1)';
    if (symbolEl) symbolEl.innerText = outcome === 'heads' ? '⭐' : '🎁';
    isCoinFlipping = false;

    if (outcome === coinSelectedSide) {
      const grossWin = Math.round(currentBet * 1.9);
      const taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
      const winAmount = Math.max(0, grossWin - taxAmount);

      balance += winAmount;
      saveBalance();
      updateBalanceUI();
      if (window.confetti) confetti({ particleCount: 60, spread: 60 });
      playTone('win');
      showToast('Correct Call!', `${outcome.toUpperCase()} landed! Paid ×1.9 (+${winAmount} ⭐, 0.1% tax: -${taxAmount} ⭐)`, '⭐');
    } else {
      playTone('lose');
      showToast('Wrong Call', `Coin was ${outcome.toUpperCase()}. Stake lost!`, '💨');
    }
  }, 1300);
}

// ==========================================
// 6. GIFT HUNT (MINES — 50% WIN RATE CALIBRATED)
// ==========================================
function initMinesGrid() {
  const grid = document.getElementById('minesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  minesGridData = [];
  minesRevealedCount = 0;

  for (let i = 0; i < 25; i++) {
    minesGridData.push({ isBomb: false, revealed: false });
    const tile = document.createElement('button');
    tile.id = `mine-tile-${i}`;
    tile.className = 'w-13 h-13 aspect-square rounded-xl bg-[#152329] border border-[#213a44] hover:bg-[#1c2e36] flex items-center justify-center text-xl font-bold transition-all';
    tile.onclick = () => tapMinesTile(i);
    grid.appendChild(tile);
  }
}

function resetMinesGame() {
  minesBombCount = parseInt(document.getElementById('minesBombCountSelect').value, 10);
  isMinesActive = false;
  initMinesGrid();
  const mult = document.getElementById('minesCurrentMultiplier');
  if (mult) mult.innerText = '×1.00';
  document.getElementById('primaryPlayBtn')?.classList.remove('hidden');
  document.getElementById('cashoutBtn')?.classList.add('hidden');
}

function startMinesHunt() {
  recordPlayUsed('mines');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  minesBombCount = parseInt(document.getElementById('minesBombCountSelect').value, 10);
  initMinesGrid();

  let placedBombs = 0;
  while (placedBombs < minesBombCount) {
    const idx = Math.floor(Math.random() * 25);
    if (!minesGridData[idx].isBomb) {
      minesGridData[idx].isBomb = true;
      placedBombs++;
    }
  }

  isMinesActive = true;
  document.getElementById('primaryPlayBtn')?.classList.add('hidden');
  const cashBtn = document.getElementById('cashoutBtn');
  if (cashBtn) cashBtn.classList.remove('hidden');
  const cashAmount = document.getElementById('cashoutAmountText');
  if (cashAmount) cashAmount.innerText = currentBet;
  showToast('Hunt Started', 'Tap safe tiles to multiply coins. Cash out anytime!', '💎');
}

function tapMinesTile(index) {
  if (!isMinesActive) return;
  const tileData = minesGridData[index];
  if (tileData.revealed) return;

  // Dynamic Win Rate Calibration:
  // Total star balance >= 10,000 -> 10% survival probability
  // Total star balance >= 5,000  -> 20% survival probability
  // Below 5,000 stars            -> default game board odds
  if (balance >= 5000) {
    const survivalRate = (balance >= 10000) ? 0.10 : 0.20;
    const isSafe = Math.random() < survivalRate;
    if (!isSafe && !tileData.isBomb) {
      tileData.isBomb = true; // Trigger bomb
    } else if (isSafe && tileData.isBomb) {
      tileData.isBomb = false; // Lucky safe pick
    }
  }

  const tileEl = document.getElementById(`mine-tile-${index}`);
  tileData.revealed = true;

  if (tileData.isBomb) {
    playTone('bomb');
    tileEl.className = 'w-13 h-13 aspect-square rounded-xl bg-rose-600/30 border border-rose-500 flex items-center justify-center text-2xl';
    tileEl.innerText = '💣';
    revealAllMines();
    isMinesActive = false;
    showToast('BOMB EXPLODED!', 'Game over, stake lost.', '💥');
    document.getElementById('primaryPlayBtn')?.classList.remove('hidden');
    document.getElementById('cashoutBtn')?.classList.add('hidden');
  } else {
    playTone('win');
    minesRevealedCount++;
    tileEl.className = 'w-13 h-13 aspect-square rounded-xl bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center text-2xl animate-pulse';
    tileEl.innerText = '🎁';

    const growthFactor = minesBombCount === 3 ? 1.15 : (minesBombCount === 5 ? 1.32 : 1.75);
    const currentMult = (Math.pow(growthFactor, minesRevealedCount)).toFixed(2);
    const multDisplay = document.getElementById('minesCurrentMultiplier');
    if (multDisplay) multDisplay.innerText = `×${currentMult}`;

    const grossCurrentWin = Math.round(currentBet * currentMult);
    const currentTax = Math.max(1, Math.round(grossCurrentWin * 0.001));
    const currentWin = Math.max(0, grossCurrentWin - currentTax);
    const cashText = document.getElementById('cashoutAmountText');
    if (cashText) cashText.innerText = currentWin;
  }
}

function cashoutMines() {
  if (!isMinesActive) return;
  isMinesActive = false;
  const multDisplay = document.getElementById('minesCurrentMultiplier');
  const multStr = multDisplay ? multDisplay.innerText.replace('×', '') : '1.0';
  const grossWin = Math.round(currentBet * parseFloat(multStr));
  let taxAmount = 0;
  let winAmount = 0;
  if (grossWin > 0) {
    taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
    winAmount = Math.max(0, grossWin - taxAmount);
  }

  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  if (window.confetti) confetti({ particleCount: 75, spread: 65 });
  playTone('jackpot');
  showToast('Cashed Out!', `Secured ×${multStr} (+${winAmount} ⭐, 0.1% tax: -${taxAmount} ⭐)`, '⭐');

  revealAllMines();
  document.getElementById('primaryPlayBtn')?.classList.remove('hidden');
  document.getElementById('cashoutBtn')?.classList.add('hidden');
}

function revealAllMines() {
  minesGridData.forEach((item, idx) => {
    const el = document.getElementById(`mine-tile-${idx}`);
    if (el && !item.revealed) {
      el.innerText = item.isBomb ? '💣' : '🎁';
      el.className = item.isBomb
        ? 'w-13 h-13 aspect-square rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center text-lg'
        : 'w-13 h-13 aspect-square rounded-xl bg-teal-950/40 text-teal-300 flex items-center justify-center text-lg';
    }
  });
}

// ==========================================
// 7. UNDER OVER (50% WIN RATE CALIBRATED)
// ==========================================
function setUnderOverMode(mode) {
  playTone('tick');
  uoDirection = mode;
  const btnUnder = document.getElementById('btnUOunder');
  const btnOver = document.getElementById('btnUOover');

  if (mode === 'under') {
    if (btnUnder) btnUnder.className = 'py-2.5 px-3 rounded-2xl bg-lime-500/20 border-2 border-lime-500 text-lime-300 font-bold text-xs flex items-center justify-center gap-1 transition-all';
    if (btnOver) btnOver.className = 'py-2.5 px-3 rounded-2xl bg-[#171c26] border border-[#273042] text-gray-400 font-bold text-xs flex items-center justify-center gap-1 transition-all';
  } else {
    if (btnOver) btnOver.className = 'py-2.5 px-3 rounded-2xl bg-lime-500/20 border-2 border-lime-500 text-lime-300 font-bold text-xs flex items-center justify-center gap-1 transition-all';
    if (btnUnder) btnUnder.className = 'py-2.5 px-3 rounded-2xl bg-[#171c26] border border-[#273042] text-gray-400 font-bold text-xs flex items-center justify-center gap-1 transition-all';
  }
  updateUnderOverCalculations();
}

function onThresholdChange(val) {
  uoThreshold = parseInt(val, 10);
  const sText = document.getElementById('sliderValueText');
  const uLabel = document.getElementById('uoThresholdUnderLabel');
  const oLabel = document.getElementById('uoThresholdOverLabel');
  const barLabel = document.getElementById('underOverBarLabel');
  const fillBar = document.getElementById('underOverFillBar');

  if (sText) sText.innerText = uoThreshold;
  if (uLabel) uLabel.innerText = uoThreshold;
  if (oLabel) oLabel.innerText = uoThreshold;
  if (barLabel) barLabel.innerText = `Target: ${uoThreshold}`;
  if (fillBar) fillBar.style.width = `${uoThreshold}%`;
  updateUnderOverCalculations();
}

function updateUnderOverCalculations() {
  let winChance = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
  winChance = Math.max(1, Math.min(98, winChance));

  const payout = (95 / winChance).toFixed(2);
  const toWin = Math.round(currentBet * payout);

  const cText = document.getElementById('uoWinChanceText');
  const mText = document.getElementById('uoMultiplierText');
  const wText = document.getElementById('uoToWinText');

  if (cText) cText.innerText = `${winChance}%`;
  if (mText) mText.innerText = `×${payout}`;
  if (wText) wText.innerText = `${toWin} ⭐`;
}

function rollUnderOverGame() {
  if (isRollingUO) return;
  isRollingUO = true;
  recordPlayUsed('underover');
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const numEl = document.getElementById('underOverResultNum');
  let counter = 0;
  const rollInterval = setInterval(() => {
    if (numEl) numEl.innerText = Math.floor(Math.random() * 100);
    playTone('tick');
    counter++;
  }, 70);

  // Dynamic Win Rate Calibration:
  // Total star balance >= 10,000 -> 10% win probability
  // Total star balance >= 5,000  -> 20% win probability
  // Below 5,000 stars            -> 50% win probability
  let winProbability = 0.50;
  if (balance >= 10000) {
    winProbability = 0.10;
  } else if (balance >= 5000) {
    winProbability = 0.20;
  }
  const isWin = Math.random() < winProbability;
  let finalNumber;
  if (isWin) {
    if (uoDirection === 'under') {
      finalNumber = Math.floor(Math.random() * uoThreshold); // Strictly < threshold
    } else {
      finalNumber = uoThreshold + 1 + Math.floor(Math.random() * (99 - uoThreshold)); // Strictly > threshold
    }
  } else {
    if (uoDirection === 'under') {
      finalNumber = uoThreshold + Math.floor(Math.random() * (100 - uoThreshold)); // >= threshold
    } else {
      finalNumber = Math.floor(Math.random() * (uoThreshold + 1)); // <= threshold
    }
  }

  setTimeout(() => {
    clearInterval(rollInterval);
    isRollingUO = false;
    if (numEl) numEl.innerText = finalNumber;

    let winChance = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
    const payout = parseFloat((95 / Math.max(1, winChance)).toFixed(2));

    if (isWin) {
      const grossWin = Math.round(currentBet * payout);
      const taxAmount = Math.max(1, Math.round(grossWin * 0.001)); // 0.1% tax
      const winAmount = Math.max(0, grossWin - taxAmount);

      balance += winAmount;
      saveBalance();
      updateBalanceUI();
      if (window.confetti) confetti({ particleCount: 70, spread: 60 });
      playTone('win');
      showToast('Target Hit!', `Rolled ${finalNumber}! Won ${winAmount} ⭐ (×${payout}, 0.1% tax: -${taxAmount} ⭐)`, '🎯');
    } else {
      playTone('lose');
      showToast('Missed!', `Rolled ${finalNumber}. Condition not met.`, '❌');
    }
  }, 1100);
}

// ==========================================
// INITIALIZATION ON DOM READY
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  updateBalanceUI();
  updateActiveChipUI();
  switchTab('lobby');

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_stars') {
      balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
      updateBalanceUI();
    }
  });

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.onmessage = (e) => {
      if (e.data && (e.data.type === 'BALANCES_UPDATED' || e.data.type === 'STARS_UPDATED')) {
        balance = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
        updateBalanceUI();
      }
    };
  } catch (e) {}

  if (window.lucide) lucide.createIcons();
});
