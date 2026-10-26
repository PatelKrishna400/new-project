// Gaming Arena Interactive Logic & Audio Engine
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
if (localStorage.getItem('task_game_stars') === '850' || !localStorage.getItem('task_game_stars')) {
  localStorage.setItem('task_game_stars', '0');
}

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
let gamesPlayed = parseInt(localStorage.getItem('task_games_played') || '0', 10);
let coinsWonToday = parseInt(localStorage.getItem('task_coins_won_today') || '0', 10);
let winStreak = parseInt(localStorage.getItem('task_win_streak') || '0', 10);

/* ==========================================================================
   WEB AUDIO API SYNTHESIZER FOR ARCADE GAMES
   ========================================================================== */
const ArcadeAudio = {
  ctx: null,
  muted: false,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  },
  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1, startDelay = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime + startDelay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(gainVal, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch (e) {}
  },
  playClick() {
    this.playTone(600, 'triangle', 0.05, 0.07);
  },
  playWheelTick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, t);
      osc.frequency.exponentialRampToValueAtTime(280, t + 0.025);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.03);
    } catch (e) {}
  },
  playWheelWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.18, 0.12, idx * 0.08);
    });
  },
  playJackpot() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.25, 0.14, idx * 0.07);
    });
  },
  playKeyStroke() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const pitch = 360 + Math.random() * 80;
    this.playTone(pitch, 'triangle', 0.04, 0.05);
  },
  playWordSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    this.playTone(880, 'sine', 0.1, 0.12, 0);
    this.playTone(1320, 'triangle', 0.18, 0.14, 0.06);
  },
  playCountdownWarning() {
    this.playTone(480, 'sine', 0.09, 0.12);
  },
  playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    this.playTone(440, 'triangle', 0.15, 0.12, 0);
    this.playTone(554.37, 'triangle', 0.15, 0.12, 0.12);
    this.playTone(659.25, 'triangle', 0.28, 0.14, 0.24);
  },
  playCardFlip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(780, t + 0.06);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    } catch (e) {}
  },
  playPairMatch() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    this.playTone(659.25, 'triangle', 0.14, 0.12, 0);
    this.playTone(987.77, 'triangle', 0.22, 0.14, 0.08);
  },
  playCardMismatch() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    this.playTone(240, 'sawtooth', 0.09, 0.08, 0);
    this.playTone(190, 'sawtooth', 0.12, 0.08, 0.09);
  },
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.25, 0.14, idx * 0.09);
    });
  },
  playCoinChime() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) {}
  }
};

window.toggleArcadeSound = function() {
  const isMuted = ArcadeAudio.toggleMute();
  const ico = document.getElementById('soundToggleIcon');
  const lbl = document.getElementById('soundToggleLabel');
  if (ico) ico.textContent = isMuted ? '🔇' : '🔊';
  if (lbl) lbl.textContent = isMuted ? 'MUTED' : 'SFX ON';
};

function updateGameDisplays() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  const coinsDisplay = document.getElementById('gameCoinsDisplay');
  const starsDisplay = document.getElementById('gameStarsDisplay');
  if (coinsDisplay) coinsDisplay.textContent = userCoins.toLocaleString();
  if (starsDisplay) starsDisplay.textContent = userStars.toLocaleString();

  const statPlayed = document.getElementById('statGamesPlayed');
  const statWon = document.getElementById('statCoinsWon');
  const statStrk = document.getElementById('statStreak');

  if (statPlayed) statPlayed.textContent = gamesPlayed.toString();
  if (statWon) statWon.textContent = `+${coinsWonToday.toLocaleString()} 🪙`;
  if (statStrk) statStrk.textContent = `${winStreak} 🔥`;

  // Live Sunflower Valley Farm Stats from ENERGY_TAP_SUNFLOWER_STATE_V4
  let sfCoins = 0;
  let sfSeeds = 3;
  let sfBuckets = 20;

  try {
    const rawSf = localStorage.getItem('ENERGY_TAP_SUNFLOWER_STATE_V4');
    if (rawSf) {
      const sfState = JSON.parse(rawSf);
      if (typeof sfState.coins === 'number') sfCoins = sfState.coins;
      if (typeof sfState.seeds === 'number') sfSeeds = sfState.seeds;
      if (typeof sfState.baskets === 'number') sfBuckets = sfState.baskets;
    }
  } catch (e) {}

  const tabCoinsEl = document.getElementById('tabSfCoins');
  const tabSeedsEl = document.getElementById('tabSfSeeds');
  const tabBucketsEl = document.getElementById('tabSfBuckets');

  if (tabCoinsEl) tabCoinsEl.textContent = `${Math.floor(sfCoins).toLocaleString()} 🍯`;
  if (tabSeedsEl) tabSeedsEl.textContent = `${sfSeeds} 🌱`;
  if (tabBucketsEl) tabBucketsEl.textContent = `${sfBuckets} 🌸`;
}

function rewardPlayer(coins, stars, targetEl) {
  if (coins > 0) {
    userCoins += coins;
    coinsWonToday += coins;
    localStorage.setItem('task_game_coins', userCoins.toString());
    localStorage.setItem('task_coins_won_today', coinsWonToday.toString());
    if (targetEl) showFloatingReward(targetEl, `+${coins} 🪙`);
  }
  if (stars > 0) {
    userStars += stars;
    localStorage.setItem('task_game_stars', userStars.toString());
    if (targetEl) showFloatingReward(targetEl, `+${stars} ⭐`);
  }
  gamesPlayed += 1;
  winStreak += 1;
  localStorage.setItem('task_games_played', gamesPlayed.toString());
  localStorage.setItem('task_win_streak', winStreak.toString());

  ArcadeAudio.playCoinChime();
  updateGameDisplays();
}

function showFloatingReward(targetEl, text) {
  const rect = targetEl.getBoundingClientRect();
  const floatEl = document.createElement('div');
  floatEl.className = 'floating-reward';
  floatEl.textContent = text;
  floatEl.style.left = `${rect.left + rect.width / 3}px`;
  floatEl.style.top = `${rect.top}px`;
  document.body.appendChild(floatEl);

  setTimeout(() => floatEl.remove(), 850);
}

/* ==========================================================================
   1. FORTUNE WHEEL SYSTEM
   ========================================================================== */
const wheelCanvas = document.getElementById('fortuneWheelCanvas');
const wheelCtx = wheelCanvas ? wheelCanvas.getContext('2d') : null;

const wheelSlices = [
  { text: '+50 🪙', coins: 50, stars: 0, color: '#1e3a8a', textColor: '#60a5fa' },
  { text: '+10 ⭐', coins: 0, stars: 10, color: '#854d0e', textColor: '#facc15' },
  { text: '+100 🪙', coins: 100, stars: 0, color: '#1e40af', textColor: '#93c5fd' },
  { text: '+20 ⭐', coins: 0, stars: 20, color: '#a16207', textColor: '#fde047' },
  { text: '+200 🪙', coins: 200, stars: 0, color: '#1d4ed8', textColor: '#bfdbfe' },
  { text: '+50 ⭐', coins: 0, stars: 50, color: '#ca8a04', textColor: '#fef08a' },
  { text: '+150 🪙', coins: 150, stars: 0, color: '#2563eb', textColor: '#ffffff' },
  { text: 'JACKPOT 500🪙', coins: 500, stars: 0, color: '#4f46e5', textColor: '#fbbf24' }
];

let currentWheelAngle = 0;
let isSpinningWheel = false;

function drawWheel() {
  if (!wheelCtx || !wheelCanvas) return;
  const numSlices = wheelSlices.length;
  const arcSize = (2 * Math.PI) / numSlices;
  const cx = wheelCanvas.width / 2;
  const cy = wheelCanvas.height / 2;
  const radius = cx - 8;

  wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

  for (let i = 0; i < numSlices; i++) {
    const angle = currentWheelAngle + i * arcSize;
    wheelCtx.beginPath();
    wheelCtx.fillStyle = wheelSlices[i].color;
    wheelCtx.moveTo(cx, cy);
    wheelCtx.arc(cx, cy, radius, angle, angle + arcSize);
    wheelCtx.fill();

    // Border bevel
    wheelCtx.lineWidth = 1.5;
    wheelCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    wheelCtx.stroke();

    // Text label
    wheelCtx.save();
    wheelCtx.translate(cx, cy);
    wheelCtx.rotate(angle + arcSize / 2);
    wheelCtx.textAlign = 'right';
    wheelCtx.fillStyle = wheelSlices[i].textColor;
    wheelCtx.font = 'bold 12px sans-serif';
    wheelCtx.fillText(wheelSlices[i].text, radius - 15, 4);
    wheelCtx.restore();
  }

  // Center hub pin
  wheelCtx.beginPath();
  wheelCtx.arc(cx, cy, 22, 0, 2 * Math.PI);
  wheelCtx.fillStyle = '#060e24';
  wheelCtx.fill();
  wheelCtx.lineWidth = 2.5;
  wheelCtx.strokeStyle = '#38bdf8';
  wheelCtx.stroke();

  wheelCtx.fillStyle = '#facc15';
  wheelCtx.font = 'bold 14px sans-serif';
  wheelCtx.textAlign = 'center';
  wheelCtx.fillText('★', cx, cy + 5);
}

function spinWheel() {
  if (isSpinningWheel) return;
  ArcadeAudio.init();
  ArcadeAudio.playClick();
  isSpinningWheel = true;

  const btn = document.getElementById('btnSpinWheel');
  const msg = document.getElementById('wheelResultMsg');
  if (btn) btn.disabled = true;
  if (msg) msg.textContent = 'Spinning the wheel... Good luck!';

  const spinRounds = 5 + Math.random() * 3;
  const extraAngle = Math.random() * (2 * Math.PI);
  const targetAngle = currentWheelAngle + spinRounds * (2 * Math.PI) + extraAngle;
  const startAngle = currentWheelAngle;
  const duration = 3500;
  const startTime = performance.now();
  const arcSize = (2 * Math.PI) / wheelSlices.length;
  let lastSliceTick = Math.floor(currentWheelAngle / arcSize);

  function animateSpin(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Cubic ease out
    const ease = 1 - Math.pow(1 - progress, 3);
    currentWheelAngle = startAngle + (targetAngle - startAngle) * ease;
    drawWheel();

    // Wheel ticking audio on slice crossing
    const curSliceTick = Math.floor(currentWheelAngle / arcSize);
    if (curSliceTick !== lastSliceTick) {
      lastSliceTick = curSliceTick;
      ArcadeAudio.playWheelTick();
    }

    if (progress < 1) {
      requestAnimationFrame(animateSpin);
    } else {
      isSpinningWheel = false;
      if (btn) btn.disabled = false;

      // Determine winning slice (pointer is at top: 3*PI/2)
      const numSlices = wheelSlices.length;
      const normalizedAngle = (currentWheelAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const pointerAngle = (3 * Math.PI / 2 - normalizedAngle + 2 * Math.PI) % (2 * Math.PI);
      const winIndex = Math.floor(pointerAngle / arcSize) % numSlices;
      const prize = wheelSlices[winIndex];

      if (prize.coins >= 500) {
        ArcadeAudio.playJackpot();
      } else {
        ArcadeAudio.playWheelWin();
      }

      rewardPlayer(prize.coins, prize.stars, btn);
      if (msg) {
        msg.textContent = `🎉 Awesome! You won ${prize.text}!`;
      }
    }
  }

  requestAnimationFrame(animateSpin);
}

/* ==========================================================================
   2. SPEED TYPING SPRINT
   ========================================================================== */
const wordBank = ['CYBER', 'TURBO', 'SPEED', 'ARCADE', 'ENERGY', 'MATRIX', 'ROCKET', 'VAULT', 'AVATAR', 'STRIKE'];
let typingTimerInterval = null;
let typingTimeLeft = 10;
let typingScore = 0;
let currentTargetWord = '';
let isTypingActive = false;

function startTypingGame() {
  if (isTypingActive) return;
  ArcadeAudio.init();
  ArcadeAudio.playClick();
  isTypingActive = true;
  typingTimeLeft = 10;
  typingScore = 0;

  const btn = document.getElementById('btnStartTyping');
  const input = document.getElementById('typingInput');
  const timerEl = document.getElementById('typingTimer');
  const scoreEl = document.getElementById('typingScore');
  const msg = document.getElementById('typingResultMsg');

  if (btn) btn.disabled = true;
  if (input) {
    input.disabled = false;
    input.value = '';
    input.focus();
  }
  if (scoreEl) scoreEl.textContent = '0 pts';
  if (timerEl) timerEl.textContent = '10s';
  if (msg) msg.textContent = 'Type the word rapidly!';

  nextTypingWord();

  typingTimerInterval = setInterval(() => {
    typingTimeLeft -= 1;
    if (timerEl) timerEl.textContent = `${typingTimeLeft}s`;

    if (typingTimeLeft <= 3 && typingTimeLeft > 0) {
      ArcadeAudio.playCountdownWarning();
    }

    if (typingTimeLeft <= 0) {
      clearInterval(typingTimerInterval);
      endTypingGame();
    }
  }, 1000);
}

function nextTypingWord() {
  const randIndex = Math.floor(Math.random() * wordBank.length);
  currentTargetWord = wordBank[randIndex];
  const display = document.getElementById('targetWordDisplay');
  if (display) display.textContent = currentTargetWord;
}

const typingInput = document.getElementById('typingInput');
if (typingInput) {
  typingInput.addEventListener('input', () => {
    if (!isTypingActive) return;
    ArcadeAudio.playKeyStroke();
    const val = typingInput.value.trim().toUpperCase();
    if (val === currentTargetWord) {
      typingScore += 25;
      ArcadeAudio.playWordSuccess();
      const scoreEl = document.getElementById('typingScore');
      if (scoreEl) scoreEl.textContent = `${typingScore} pts`;
      typingInput.value = '';
      nextTypingWord();
    }
  });
}

function endTypingGame() {
  isTypingActive = false;
  ArcadeAudio.playGameOver();
  const btn = document.getElementById('btnStartTyping');
  const input = document.getElementById('typingInput');
  const msg = document.getElementById('typingResultMsg');
  const display = document.getElementById('targetWordDisplay');

  if (btn) btn.disabled = false;
  if (input) {
    input.disabled = true;
    input.value = '';
  }
  if (display) display.textContent = 'TIME UP!';

  const coinsAwarded = Math.max(50, typingScore * 2);
  rewardPlayer(coinsAwarded, 0, btn);

  if (msg) {
    msg.textContent = `⚡ Sprint complete! You scored ${typingScore} pts & earned +${coinsAwarded} 🪙!`;
  }
}

/* ==========================================================================
   3. CYBER MEMORY CARD MATCH
   ========================================================================== */
const memorySymbols = ['⚡', '🎮', '💎', '🚀'];
let memoryCards = [];
let flippedCards = [];
let matchedPairsCount = 0;

function resetMemoryGame() {
  ArcadeAudio.init();
  ArcadeAudio.playClick();
  const grid = document.getElementById('memoryGrid');
  if (!grid) return;
  grid.innerHTML = '';
  flippedCards = [];
  matchedPairsCount = 0;

  // 4 pairs duplicated = 8 cards
  memoryCards = [...memorySymbols, ...memorySymbols]
    .sort(() => Math.random() - 0.5);

  memoryCards.forEach((symbol, index) => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.symbol = symbol;
    card.dataset.index = index;
    card.textContent = '❓';
    card.onclick = () => onMemoryCardClick(card);
    grid.appendChild(card);
  });
}

function onMemoryCardClick(card) {
  if (card.classList.contains('flipped') || card.classList.contains('matched') || flippedCards.length >= 2) {
    return;
  }

  ArcadeAudio.playCardFlip();
  card.classList.add('flipped');
  card.textContent = card.dataset.symbol;
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    const [c1, c2] = flippedCards;
    if (c1.dataset.symbol === c2.dataset.symbol) {
      c1.classList.add('matched');
      c2.classList.add('matched');
      flippedCards = [];
      matchedPairsCount += 1;
      ArcadeAudio.playPairMatch();

      if (matchedPairsCount === memorySymbols.length) {
        setTimeout(() => {
          ArcadeAudio.playVictory();
          rewardPlayer(150, 5, card);
          alert('🎉 Victory! You matched all memory cards and won +150 🪙 and +5 ⭐!');
        }, 300);
      }
    } else {
      ArcadeAudio.playCardMismatch();
      setTimeout(() => {
        c1.classList.remove('flipped');
        c2.classList.remove('flipped');
        c1.textContent = '❓';
        c2.textContent = '❓';
        flippedCards = [];
      }, 700);
    }
  }
}

/* ==========================================================================
   GAME CATEGORY SWITCHER (IDLE GAME VS LUCKY GAME)
   ========================================================================== */
window.switchGameCategory = function(category) {
  try {
    if (typeof ArcadeAudio !== 'undefined' && ArcadeAudio.playClick) {
      ArcadeAudio.init();
      ArcadeAudio.playClick();
    }
  } catch (e) {}

  const idleSection = document.getElementById('idleGameSection');
  const luckySection = document.getElementById('luckyGameSection');
  const tabBtnIdle = document.getElementById('tabBtnIdle');
  const tabBtnLucky = document.getElementById('tabBtnLucky');

  if (category === 'lucky' || category === 'star') {
    if (idleSection) idleSection.style.display = 'none';
    if (luckySection) luckySection.style.display = 'flex';
    if (tabBtnIdle) {
      tabBtnIdle.classList.remove('active');
      tabBtnIdle.setAttribute('aria-selected', 'false');
    }
    if (tabBtnLucky) {
      tabBtnLucky.classList.add('active');
      tabBtnLucky.setAttribute('aria-selected', 'true');
    }
    localStorage.setItem('task_games_active_tab', 'star');
  } else {
    if (idleSection) idleSection.style.display = 'flex';
    if (luckySection) luckySection.style.display = 'none';
    if (tabBtnIdle) {
      tabBtnIdle.classList.add('active');
      tabBtnIdle.setAttribute('aria-selected', 'true');
    }
    if (tabBtnLucky) {
      tabBtnLucky.classList.remove('active');
      tabBtnLucky.setAttribute('aria-selected', 'false');
    }
    localStorage.setItem('task_games_active_tab', 'idle');
  }
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  updateGameDisplays();
  drawWheel();
  resetMemoryGame();

  const savedTab = localStorage.getItem('task_games_active_tab') || 'idle';
  switchGameCategory(savedTab);

  const sfTab = document.getElementById('sunflowerGameTab');
  if (sfTab) {
    sfTab.addEventListener('click', () => {
      try {
        ArcadeAudio.init();
        ArcadeAudio.playClick();
      } catch (e) {}
    });
  }

  // Resume Web Audio context on first click
  document.addEventListener('click', () => {
    ArcadeAudio.init();
  }, { once: true });
});

// Real-Time Cross-Tab / Cross-Window Synchronization
window.addEventListener('storage', (e) => {
  if (e.key === 'task_game_coins' || e.key === 'task_game_stars' || e.key === 'ENERGY_TAP_SUNFLOWER_STATE_V4') {
    updateGameDisplays();
  }
});

try {
  const syncChannel = new BroadcastChannel('nova_task_sync');
  syncChannel.onmessage = () => {
    updateGameDisplays();
  };
} catch (e) {}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateGameDisplays();
  }
});
