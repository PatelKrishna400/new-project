/**
 * LUCKY ARCADE SUITE — MASTER SUITE JAVASCRIPT
 * Full multi-game controller: Lobby + 7 Classic Games
 */

let currentTab = 'lobby';
let balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let currentBet = 50;
let soundEnabled = true;

// 1. Dice State
let diceStreak = 0;
let isRollingDice = false;

// 2. Scratch State
let isScratchingCard = false;
let scratchPurchased = false;
let scratchPrize = { tier: 'Winner', mult: 2, icon: '🎉' };

// 3. Spin State
let isWheelSpinning = false;
let wheelRotationAngle = 0;

// 4. Plinko State
let isDroppingPlinko = false;

// 5. Coin State
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

// Web Audio API Synthesizers
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
    } else if (type === 'tick' && synth) {
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
  if (currentTab === 'mines' && isMinesActive) return;
  playTone('tick');
  currentBet = Math.min(2000, Math.max(30, amount));
  const betEl = document.getElementById('currentBetDisplay');
  if (betEl) betEl.innerText = currentBet;
  updateActiveChipUI();
  if (currentTab === 'underover') updateUnderOverCalculations();
}

function halveBet() { if (!(currentTab === 'mines' && isMinesActive)) setBet(Math.floor(currentBet / 2)); }
function doubleBet() { if (!(currentTab === 'mines' && isMinesActive)) setBet(currentBet * 2); }

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

function showToast(title, msg, icon = '🪙') {
  const toast = document.getElementById('toastBar');
  if (!toast) return;
  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMsg').innerText = msg;
  document.getElementById('toastIcon').innerText = icon;

  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
}

// Game Configs for Rules Modal & Theming
const GAME_CONFIGS = {
  lobby: {
    title: 'All Games',
    color: '#38bdf8',
    btnText: '',
    sheet: {
      title: 'Arcade Suite',
      subtitle: 'Select any game card to play instantly.',
      step1: 'Pick a game from the lobby cards.',
      step2: 'Adjust your bet chips from 30 up to 2,000 coins.',
      step3: 'Win real coin multipliers synced across all pages.',
      table: [
        { label: 'Available Games', val: '7 Arcade Classics' },
        { label: 'Highest Multiplier', val: '×95 (Under Over)' },
        { label: 'Free Coin Refills', val: '+200 every tap' }
      ]
    }
  },
  dice: {
    title: 'Lucky Dice',
    color: '#38bdf8',
    btnText: 'Roll Dice',
    btnStyle: 'background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%); color:#07090e;',
    sheet: {
      title: 'Lucky Dice',
      subtitle: 'Roll high. Three sixes in a row pay ×7.',
      step1: 'Set your bet chips and tap Roll Dice.',
      step2: 'Each face pays a fixed multiplier. The higher the face, the better.',
      step3: 'Roll three sixes in a row at the same bet for the ×7 jackpot streak.',
      table: [
        { label: 'Six ⚅', val: '×2' },
        { label: 'Five ⚄', val: '×1.5' },
        { label: 'Four ⚃', val: '×1.2' },
        { label: 'Three ⚂', val: '×0.6' },
        { label: 'Two ⚁', val: '×0.3' },
        { label: 'One ⚀', val: '×0' },
        { label: 'Three 6s in a row', val: '×7' }
      ]
    }
  },
  scratch: {
    title: 'Lucky Scratch',
    color: '#fb7185',
    btnText: 'Buy Card',
    btnStyle: 'background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%); color:#ffffff;',
    sheet: {
      title: 'Lucky Scratch',
      subtitle: 'Buy a card, scratch the foil, reveal the prize.',
      step1: 'Set your bet and tap Buy Card. The prize is generated immediately.',
      step2: 'Drag across the foil with mouse or finger to uncover.',
      step3: 'The multiplier under the foil is awarded to your pouch!',
      table: [
        { label: 'Jackpot 👑', val: '×15' },
        { label: 'Big Win 💎', val: '×5' },
        { label: 'Winner 🎉', val: '×2' },
        { label: 'Money back 🪙', val: '×1' },
        { label: 'Bust 💨', val: '×0' }
      ]
    }
  },
  spin: {
    title: 'Lucky Spin',
    color: '#a855f7',
    btnText: 'Spin Wheel',
    btnStyle: 'background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color:#ffffff;',
    sheet: {
      title: 'Lucky Spin',
      subtitle: 'Twelve wedges, one gold 5×.',
      step1: 'Set your bet chips and tap Spin Wheel.',
      step2: 'The wheel rotates and eases onto one wedge under the pointer.',
      step3: 'The winning multiplier is awarded. Bust wedges lose the stake.',
      table: [
        { label: 'Gold wedge 👑', val: '×5' },
        { label: 'Deep violet 💎', val: '×2' },
        { label: 'Violet (2 wedges)', val: '×1 · stake back' },
        { label: 'Lavender (2 wedges)', val: '×0.5' },
        { label: 'Bust (6 wedges)', val: '×0' }
      ]
    }
  },
  plinko: {
    title: 'Gift Drop',
    color: '#06b6d4',
    btnText: 'Drop Gift',
    btnStyle: 'background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color:#07090e;',
    sheet: {
      title: 'Gift Drop',
      subtitle: 'Drop gifts down pegs and chase the outer edges.',
      step1: 'Set the bet per gift and tap Drop Gift.',
      step2: 'Each gift bounces down 8 peg rows into 1 of 11 buckets.',
      step3: 'The outer edge buckets pay highest (up to ×24!).',
      table: [
        { label: 'Outer Edges 🎁', val: '×24' },
        { label: 'Mid-Outer', val: '×5 · ×2' },
        { label: 'Mid-Inner', val: '×1.2 · ×0.7' },
        { label: 'Center Core', val: '×0.25' }
      ]
    }
  },
  coin: {
    title: 'Coin Flip',
    color: '#eab308',
    btnText: 'Flip Coin',
    btnStyle: 'background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); color:#451a03;',
    sheet: {
      title: 'Coin Flip',
      subtitle: 'Call Heads or Tails, flip, double up.',
      step1: 'Choose Heads (Star ⭐) or Tails (Gift 🎁) and set your stake.',
      step2: 'Tap Flip Coin. The coin tumbles in 3D and lands.',
      step3: 'Landing on your side pays ×1.9 of the stake!',
      table: [
        { label: 'Correct Call', val: '×1.90' },
        { label: 'Wrong Call', val: 'Stake lost' }
      ]
    }
  },
  mines: {
    title: 'Gift Hunt',
    color: '#2dd4bf',
    btnText: 'Start Hunt',
    btnStyle: 'background: linear-gradient(135deg, #2dd4bf 0%, #059669 100%); color:#022c22;',
    sheet: {
      title: 'Gift Hunt',
      subtitle: 'Reveal gifts, dodge bombs, cash out anytime.',
      step1: 'Choose bomb count (3, 5, or 10 bombs) and tap Start Hunt.',
      step2: 'Tap tiles to uncover hidden gifts 🎁. Each gift raises multiplier.',
      step3: 'Cash out anytime to bank coins. Revealing a bomb ends the round.',
      table: [
        { label: '10 Bombs', val: 'Fastest multiplier surge' },
        { label: '5 Bombs', val: 'Balanced challenge' },
        { label: '3 Bombs', val: 'Steady, safe growth' }
      ]
    }
  },
  underover: {
    title: 'Under Over',
    color: '#84cc16',
    btnText: 'Roll Number',
    btnStyle: 'background: linear-gradient(135deg, #a3e635 0%, #65a30d 100%); color:#1a2e05;',
    sheet: {
      title: 'Under Over',
      subtitle: 'Set a threshold, pick a side, roll 0–99.',
      step1: 'Drag the threshold slider from 2 to 98.',
      step2: 'Choose Under or Over mode.',
      step3: 'Riskier conditions pay up to ×95!',
      table: [
        { label: 'Under 50', val: '50% · ×1.90' },
        { label: 'Under 25', val: '25% · ×3.80' },
        { label: 'Under 10', val: '10% · ×9.50' },
        { label: 'Under 2 / Over 98', val: '1% · ×95' }
      ]
    }
  }
};

// Tab Switching
function switchTab(tabId) {
  playTone('click');
  currentTab = tabId;
  const config = GAME_CONFIGS[tabId];

  // Header Nav Updates
  document.getElementById('navTitle').innerText = config.title;
  const dot = document.getElementById('statusDot');
  if (dot) dot.style.backgroundColor = config.color;

  const btnBackLobby = document.getElementById('btnBackLobby');
  if (tabId === 'lobby') {
    btnBackLobby.style.display = 'none';
  } else {
    btnBackLobby.style.display = 'flex';
  }

  // Views Toggle
  document.querySelectorAll('.game-view').forEach(v => v.classList.remove('active'));
  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) activeView.classList.add('active');

  // Shared Controls Container (hidden in lobby)
  const controlsCard = document.getElementById('sharedControlsCard');
  const playBtn = document.getElementById('primaryPlayBtn');
  const cashBtn = document.getElementById('btnCashout');

  if (tabId === 'lobby') {
    controlsCard.style.display = 'none';
  } else {
    controlsCard.style.display = 'flex';
    if (tabId === 'mines' && isMinesActive) {
      playBtn.style.display = 'none';
      cashBtn.style.display = 'block';
    } else {
      playBtn.style.display = 'block';
      cashBtn.style.display = 'none';
      playBtn.innerText = config.btnText;
      playBtn.style.cssText = config.btnStyle;
    }
  }

  updateSheetContent(config);

  // Tab specific init
  if (tabId === 'scratch' && !scratchPurchased) initScratchCard(false);
  else if (tabId === 'spin') drawSpinWheel();
  else if (tabId === 'plinko') initPlinko();
  else if (tabId === 'mines' && minesGridData.length === 0) initMinesGrid();
  else if (tabId === 'underover') updateUnderOverCalculations();
}

function openLobbyTab() {
  switchTab('lobby');
}

// Update Rules Sheet
function updateSheetContent(config) {
  const s = config.sheet;
  document.getElementById('sheetTitle').innerText = s.title;
  document.getElementById('sheetSubtitle').innerText = s.subtitle;
  document.getElementById('sheetStep1').innerText = s.step1;
  document.getElementById('sheetStep2').innerText = s.step2;
  document.getElementById('sheetStep3').innerText = s.step3;
  document.getElementById('sheetDot').style.backgroundColor = config.color;
  document.getElementById('btnSheetDismiss').style.backgroundColor = config.color;

  const tableEl = document.getElementById('sheetTable');
  tableEl.innerHTML = '';
  s.table.forEach(row => {
    const tr = document.createElement('div');
    tr.className = 'sheet-table-row';
    tr.innerHTML = `<span>${row.label}</span><span>${row.val}</span>`;
    tableEl.appendChild(tr);
  });
}

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

// Master Play Button Handler
function handlePrimaryAction() {
  if (balance < currentBet) {
    showToast('Insufficient Coins', 'Tap the + button to claim free refill coins!', '⚠️');
    playTone('lose');
    return;
  }

  if (currentTab === 'dice') rollDiceGame();
  else if (currentTab === 'scratch') buyScratchCard();
  else if (currentTab === 'spin') spinWheelGame();
  else if (currentTab === 'plinko') dropPlinkoBall();
  else if (currentTab === 'coin') flipCoinGame();
  else if (currentTab === 'mines') startMinesHunt();
  else if (currentTab === 'underover') rollUnderOverGame();
}

// -------------------------------------------------------------
// 1. LUCKY DICE
// -------------------------------------------------------------
const DICE_ROTATIONS = { 1: { x: 0, y: 0 }, 6: { x: 0, y: 180 }, 2: { x: 0, y: 90 }, 5: { x: 0, y: -90 }, 3: { x: -90, y: 0 }, 4: { x: 90, y: 0 } };
const DICE_MULTIPLIERS = { 1: 0, 2: 0.3, 3: 0.6, 4: 1.2, 5: 1.5, 6: 2 };

function rollDiceGame() {
  if (isRollingDice) return;
  isRollingDice = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const cube = document.getElementById('cube');
  const rolledFace = Math.floor(Math.random() * 6) + 1;
  const rx = (Math.floor(Math.random() * 3) + 2) * 360;
  const ry = (Math.floor(Math.random() * 3) + 2) * 360;
  const rot = DICE_ROTATIONS[rolledFace];

  cube.style.transform = `rotateX(${rx + rot.x}deg) rotateY(${ry + rot.y}deg)`;

  setTimeout(() => {
    isRollingDice = false;
    const baseMult = DICE_MULTIPLIERS[rolledFace];
    if (rolledFace === 6) diceStreak++;
    else diceStreak = 0;
    updateDiceStreakUI();

    let won = Math.round(currentBet * baseMult);
    if (diceStreak === 3) {
      won = Math.round(currentBet * 7);
      diceStreak = 0;
      updateDiceStreakUI();
      if (window.confetti) confetti({ particleCount: 110, spread: 80 });
      playTone('jackpot');
      showToast('JACKPOT!', `Three Sixes in a row! Paid ×7 (+${won.toLocaleString()} 🪙)`, '🔥');
    } else if (baseMult > 1) {
      playTone('win');
      showToast('Winner!', `Rolled a ${rolledFace}! Paid ×${baseMult} (+${won.toLocaleString()} 🪙)`, '🎉');
    } else if (baseMult > 0) {
      playTone('win');
      showToast('Face ' + rolledFace, `Paid ×${baseMult} (+${won.toLocaleString()} 🪙)`, '🎲');
    } else {
      playTone('lose');
      showToast('Rolled a One', 'Face 1 pays ×0. Better luck next roll!', '💀');
    }

    balance += won;
    saveBalance();
    updateBalanceUI();
  }, 1200);
}

function updateDiceStreakUI() {
  const dots = document.getElementById('diceStreakDots')?.children;
  if (!dots) return;
  for (let i = 0; i < 3; i++) {
    dots[i].style.background = i < diceStreak ? '#38bdf8' : '#252e42';
    dots[i].style.boxShadow = i < diceStreak ? '0 0 10px #38bdf8' : 'none';
  }
}

// -------------------------------------------------------------
// 2. LUCKY SCRATCH
// -------------------------------------------------------------
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
  ctx.font = 'bold 18px "Plus Jakarta Sans"';
  ctx.textAlign = 'center';
  ctx.fillText(purchased ? 'SCRATCH TO REVEAL' : 'BUY A CARD TO PLAY', w / 2, h / 2 + 6);

  if (purchased) enableScratching(canvas, ctx);
}

function buyScratchCard() {
  if (scratchPurchased) return;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  scratchPurchased = true;
  playTone('roll');

  const rand = Math.random();
  if (rand < 0.05) scratchPrize = { tier: 'Jackpot', mult: 15, icon: '👑' };
  else if (rand < 0.22) scratchPrize = { tier: 'Big Win', mult: 5, icon: '💎' };
  else if (rand < 0.52) scratchPrize = { tier: 'Winner', mult: 2, icon: '🎉' };
  else if (rand < 0.78) scratchPrize = { tier: 'Money Back', mult: 1, icon: '🪙' };
  else scratchPrize = { tier: 'Bust', mult: 0, icon: '💨' };

  document.getElementById('scratchIcon').innerText = scratchPrize.icon;
  document.getElementById('scratchMultiplierLabel').innerText = `×${scratchPrize.mult}`;
  document.getElementById('scratchTierLabel').innerText = scratchPrize.tier;
  const winCoin = Math.round(currentBet * scratchPrize.mult);
  document.getElementById('scratchWinAmountText').innerText = scratchPrize.mult > 0 ? `+${winCoin.toLocaleString()} Coins` : `0 Coins`;

  initScratchCard(true);
  const btn = document.getElementById('primaryPlayBtn');
  btn.innerText = 'Scratch Card Above';
  btn.disabled = true;
}

function enableScratching(canvas, ctx) {
  let isDrawing = false;
  let scratched = 0;

  function scratchAt(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    playTone('tick');
    scratched++;
    if (scratched > 24) revealScratchFinish(canvas, ctx);
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * (canvas.width / rect.width), y: (cy - rect.top) * (canvas.height / rect.height) };
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

  const winAmount = Math.round(currentBet * scratchPrize.mult);
  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  if (scratchPrize.mult >= 5) {
    if (window.confetti) confetti({ particleCount: 90, spread: 75 });
    playTone('jackpot');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount.toLocaleString()} 🪙`, scratchPrize.icon);
  } else if (scratchPrize.mult > 0) {
    playTone('win');
    showToast(scratchPrize.tier, `Uncovered ×${scratchPrize.mult}! Won ${winAmount.toLocaleString()} 🪙`, scratchPrize.icon);
  } else {
    playTone('lose');
    showToast('Bust', 'No prize under foil. Better luck next time!', '💨');
  }

  const btn = document.getElementById('primaryPlayBtn');
  btn.innerText = 'Buy Card';
  btn.disabled = false;
}

// -------------------------------------------------------------
// 3. LUCKY SPIN
// -------------------------------------------------------------
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

function drawSpinWheel() {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 6;
  const slice = (2 * Math.PI) / WHEEL_WEDGES.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  WHEEL_WEDGES.forEach((w, i) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, i * slice, (i + 1) * slice);
    ctx.fillStyle = w.color;
    ctx.fill();
    ctx.strokeStyle = '#2d1f43';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(i * slice + slice / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = w.text;
    ctx.font = 'bold 12px "Plus Jakarta Sans"';
    ctx.fillText(w.label, radius - 14, 4);
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
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const canvas = document.getElementById('wheelCanvas');
  const targetIdx = Math.floor(Math.random() * WHEEL_WEDGES.length);
  const sliceDeg = 360 / WHEEL_WEDGES.length;
  const targetDeg = targetIdx * sliceDeg + sliceDeg / 2;
  const fullSpins = (Math.floor(Math.random() * 4) + 4) * 360;
  const finalDeg = fullSpins + (270 - targetDeg);

  wheelRotationAngle += finalDeg;
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
    const wedge = WHEEL_WEDGES[targetIdx];
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

// -------------------------------------------------------------
// 4. GIFT DROP (PLINKO)
// -------------------------------------------------------------
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

    if (Math.random() < 0.25) {
      vx += (Math.random() - 0.5) * 2;
      playTone('tick');
    }

    if (x < 15) { x = 15; vx = Math.abs(vx); }
    if (x > w - 15) { x = w - 15; vx = -Math.abs(vx); }

    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁', x, y);

    if (y < h - 28) {
      requestAnimationFrame(animateDrop);
    } else {
      isDroppingPlinko = false;
      const bucketIndex = Math.min(PLINKO_BUCKETS.length - 1, Math.max(0, Math.floor(x / (w / PLINKO_BUCKETS.length))));
      const mult = PLINKO_BUCKETS[bucketIndex];
      const winAmount = Math.round(currentBet * mult);
      balance += winAmount;
      saveBalance();
      updateBalanceUI();

      if (mult >= 5) {
        if (window.confetti) confetti({ particleCount: 90, spread: 70 });
        playTone('jackpot');
        showToast('EDGE SHOT!', `Landed on ×${mult}! Won ${winAmount.toLocaleString()} 🪙`, '🎁');
      } else if (mult > 0) {
        playTone('win');
        showToast('Gift Landed', `Paid ×${mult} (${winAmount.toLocaleString()} 🪙)`, '🎁');
      } else {
        playTone('lose');
      }
    }
  }

  animateDrop();
}

// -------------------------------------------------------------
// 5. COIN FLIP
// -------------------------------------------------------------
function selectCoinSide(side) {
  playTone('tick');
  coinSelectedSide = side;
  const btnHeads = document.getElementById('btnHeads');
  const btnTails = document.getElementById('btnTails');
  if (side === 'heads') {
    btnHeads.style.background = 'rgba(234, 179, 8, 0.2)';
    btnHeads.style.borderColor = '#eab308';
    btnHeads.style.color = '#fde047';
    btnTails.style.background = '#191d29';
    btnTails.style.borderColor = '#2b3145';
    btnTails.style.color = '#94a3b8';
  } else {
    btnTails.style.background = 'rgba(234, 179, 8, 0.2)';
    btnTails.style.borderColor = '#eab308';
    btnTails.style.color = '#fde047';
    btnHeads.style.background = '#191d29';
    btnHeads.style.borderColor = '#2b3145';
    btnHeads.style.color = '#94a3b8';
  }
}

function flipCoinGame() {
  if (isCoinFlipping) return;
  isCoinFlipping = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const coinEl = document.getElementById('coinElement');
  const symbolEl = document.getElementById('coinFaceSymbol');
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
      if (window.confetti) confetti({ particleCount: 60, spread: 60 });
      playTone('win');
      showToast('Correct Call!', `${outcome.toUpperCase()} landed! Paid ×1.9 (+${winAmount.toLocaleString()} 🪙)`, '🪙');
    } else {
      playTone('lose');
      showToast('Wrong Call', `Coin was ${outcome.toUpperCase()}. Stake lost!`, '💨');
    }
  }, 1300);
}

// -------------------------------------------------------------
// 6. GIFT HUNT (MINES)
// -------------------------------------------------------------
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

function resetMinesGame() {
  minesBombCount = parseInt(document.getElementById('minesBombCountSelect').value, 10);
  isMinesActive = false;
  initMinesGrid();
  document.getElementById('minesCurrentMultiplier').innerText = '×1.00';
  document.getElementById('primaryPlayBtn').style.display = 'block';
  document.getElementById('btnCashout').style.display = 'none';
}

function startMinesHunt() {
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  minesBombCount = parseInt(document.getElementById('minesBombCountSelect').value, 10);
  initMinesGrid();

  let placed = 0;
  while (placed < minesBombCount) {
    const idx = Math.floor(Math.random() * 25);
    if (!minesGridData[idx].isBomb) {
      minesGridData[idx].isBomb = true;
      placed++;
    }
  }

  isMinesActive = true;
  document.getElementById('primaryPlayBtn').style.display = 'none';
  const cashBtn = document.getElementById('btnCashout');
  cashBtn.style.display = 'block';
  document.getElementById('cashoutAmountText').innerText = currentBet.toLocaleString();
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
    document.getElementById('primaryPlayBtn').style.display = 'block';
    document.getElementById('btnCashout').style.display = 'none';
  } else {
    playTone('win');
    minesRevealedCount++;
    tileEl.className = 'mine-tile revealed-gift';
    tileEl.innerText = '🎁';

    const growth = minesBombCount === 3 ? 1.15 : (minesBombCount === 5 ? 1.32 : 1.75);
    const mult = (Math.pow(growth, minesRevealedCount)).toFixed(2);
    document.getElementById('minesCurrentMultiplier').innerText = `×${mult}`;

    const currentWin = Math.round(currentBet * mult);
    document.getElementById('cashoutAmountText').innerText = currentWin.toLocaleString();
  }
}

function cashoutMines() {
  if (!isMinesActive) return;
  isMinesActive = false;
  const multStr = document.getElementById('minesCurrentMultiplier').innerText.replace('×', '');
  const winAmount = Math.round(currentBet * parseFloat(multStr));
  balance += winAmount;
  saveBalance();
  updateBalanceUI();

  if (window.confetti) confetti({ particleCount: 75, spread: 65 });
  playTone('jackpot');
  showToast('Cashed Out!', `Secured ×${multStr} (+${winAmount.toLocaleString()} 🪙)`, '💰');

  revealAllMines();
  document.getElementById('primaryPlayBtn').style.display = 'block';
  document.getElementById('btnCashout').style.display = 'none';
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

// -------------------------------------------------------------
// 7. UNDER OVER
// -------------------------------------------------------------
function setUnderOverMode(mode) {
  playTone('tick');
  uoDirection = mode;
  const btnUnder = document.getElementById('btnUOunder');
  const btnOver = document.getElementById('btnUOover');
  if (mode === 'under') {
    btnUnder.style.background = 'rgba(132, 204, 22, 0.2)';
    btnUnder.style.borderColor = '#84cc16';
    btnUnder.style.color = '#bef264';
    btnOver.style.background = '#171c26';
    btnOver.style.borderColor = '#273042';
    btnOver.style.color = '#94a3b8';
  } else {
    btnOver.style.background = 'rgba(132, 204, 22, 0.2)';
    btnOver.style.borderColor = '#84cc16';
    btnOver.style.color = '#bef264';
    btnUnder.style.background = '#171c26';
    btnUnder.style.borderColor = '#273042';
    btnUnder.style.color = '#94a3b8';
  }
  updateUnderOverCalculations();
}

function onThresholdChange(val) {
  uoThreshold = parseInt(val, 10);
  document.getElementById('sliderValueText').innerText = uoThreshold;
  document.getElementById('uoThresholdUnderLabel').innerText = uoThreshold;
  document.getElementById('uoThresholdOverLabel').innerText = uoThreshold;
  document.getElementById('underOverBarLabel').innerText = `Target: ${uoThreshold}`;
  document.getElementById('underOverFillBar').style.width = `${uoThreshold}%`;
  updateUnderOverCalculations();
}

function updateUnderOverCalculations() {
  let winChance = uoDirection === 'under' ? uoThreshold : (99 - uoThreshold);
  winChance = Math.max(1, Math.min(98, winChance));

  const payout = (95 / winChance).toFixed(2);
  const toWin = Math.round(currentBet * payout);

  document.getElementById('uoWinChanceText').innerText = `${winChance}%`;
  document.getElementById('uoMultiplierText').innerText = `×${payout}`;
  document.getElementById('uoToWinText').innerText = `${toWin.toLocaleString()} 🪙`;
}

function rollUnderOverGame() {
  if (isRollingUO) return;
  isRollingUO = true;
  balance -= currentBet;
  saveBalance();
  updateBalanceUI();
  playTone('roll');

  const numEl = document.getElementById('underOverResultNum');
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
      if (payout >= 5 && window.confetti) confetti({ particleCount: 75, spread: 65 });
      playTone('win');
      showToast('Target Hit!', `Rolled ${finalNumber}! Won ${winAmount.toLocaleString()} 🪙 (×${payout})`, '🎯');
    } else {
      playTone('lose');
      showToast('Missed!', `Rolled ${finalNumber}. Condition not met.`, '❌');
    }
  }, 1100);
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  balance = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  updateBalanceUI();
  updateActiveChipUI();
  switchTab('lobby');

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
