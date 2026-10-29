/**
 * HONEY BEE FARM — Golden Apiary Tycoon Engine
 * Full Idle simulation with audio, upgrades, offline production & coin/star wallet sync.
 */

const HB_STORAGE_KEY = 'honey_bee_game_state_v1';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Web Audio API Synthesizer
const HoneyAudio = {
  ctx: null,
  muted: localStorage.getItem('honey_bee_muted') === 'true',
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
    localStorage.setItem('honey_bee_muted', this.muted.toString());
    const icon = document.getElementById('soundIcon');
    if (icon) icon.textContent = this.muted ? '🔇' : '🔊';
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
  playTap() {
    if (this.muted) return;
    // Pleasant water/honey drop pop
    const pitch = 520 + Math.random() * 120;
    this.playTone(pitch, 'sine', 0.08, 0.15);
    setTimeout(() => {
      this.playTone(pitch * 1.5, 'triangle', 0.05, 0.08);
    }, 20);
  },
  playBuzz() {
    if (this.muted) return;
    this.playTone(220, 'sawtooth', 0.09, 0.03);
  },
  playUpgrade() {
    if (this.muted) return;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.14, 0.1, idx * 0.06);
    });
  },
  playSell() {
    if (this.muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.2, 0.12, idx * 0.07);
    });
  }
};

// Default Initial State
const DEFAULT_HB_STATE = {
  honey: 15,
  nectarProgress: 0,
  totalHoneyProduced: 15,
  lastSaveTime: Date.now(),
  hives: [
    { id: 'hive_1', name: 'Meadow Box', icon: '📦', level: 1, baseRate: 1, baseCost: 10, unlocked: true },
    { id: 'hive_2', name: 'Clover Apiary', icon: '🍀', level: 0, baseRate: 4, baseCost: 45, unlocked: false },
    { id: 'hive_3', name: 'Lavender Haven', icon: '🪻', level: 0, baseRate: 15, baseCost: 160, unlocked: false },
    { id: 'hive_4', name: 'Royal Comb', icon: '👑', level: 0, baseRate: 50, baseCost: 550, unlocked: false },
    { id: 'hive_5', name: 'Golden Vault', icon: '🏺', level: 0, baseRate: 180, baseCost: 2000, unlocked: false },
    { id: 'hive_6', name: 'Cyber Sanctuary', icon: '🤖', level: 0, baseRate: 650, baseCost: 7500, unlocked: false }
  ],
  bees: [
    { id: 'worker', name: 'Worker Bee', icon: '🐝', count: 3, baseCost: 8, rate: 0.5, desc: 'Collects nectar from nearby meadow' },
    { id: 'forager', name: 'Forager Scout', icon: '🌸', count: 1, baseCost: 28, rate: 2, desc: 'Flies far to locate rare blooms' },
    { id: 'guard', name: 'Hive Guard', icon: '🛡️', count: 0, baseCost: 100, rate: 8, desc: 'Protects honeycomb cells from pests' },
    { id: 'queen', name: 'Queen Bee', icon: '👑', count: 0, baseCost: 380, rate: 32, desc: 'Lays royal broods, boosts total output' },
    { id: 'drone', name: 'Cyber Drone', icon: '🤖', count: 0, baseCost: 1350, rate: 125, desc: 'Autonomous high-tech pollinator' }
  ],
  flowers: [
    { id: 'clover', name: 'Sweet Clover', icon: '🍀', level: 1, baseCost: 18, multStep: 0.1, desc: '+10% Nectar richness from pastures' },
    { id: 'lavender', name: 'Alpine Lavender', icon: '🪻', level: 0, baseCost: 70, multStep: 0.25, desc: '+25% Fragrant pollen collection' },
    { id: 'sunflower', name: 'Solar Sunflowers', icon: '🌻', level: 0, baseCost: 240, multStep: 0.5, desc: '+50% Solar energy nectar yield' },
    { id: 'orchid', name: 'Imperial Orchid', icon: '🌺', level: 0, baseCost: 850, multStep: 1.0, desc: '+100% Royal honey synthesis' }
  ],
  factory: [
    { id: 'smoker', name: 'Herb Smoker', icon: '🪵', level: 0, baseCost: 35, tapStep: 1, desc: '+1 Honey per manual hive tap' },
    { id: 'spinner', name: 'Manual Extractor', icon: '⚙️', level: 0, baseCost: 130, multStep: 0.2, desc: '+20% Extraction speed' },
    { id: 'centrifuge', name: 'Electric Centrifuge', icon: '⚡', level: 0, baseCost: 480, multStep: 0.35, desc: '+35% Automated hive throughput' },
    { id: 'bottler', name: 'Airtight Bottler', icon: '🏺', level: 0, baseCost: 1600, priceStep: 0.2, desc: '+20% Coins from Market orders' }
  ]
};

let gameState = null;
let offlineRewardAccumulated = 0;

function loadGameState() {
  try {
    const raw = localStorage.getItem(HB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      gameState = Object.assign({}, DEFAULT_HB_STATE, parsed);
      // Ensure arrays have correct elements
      if (!Array.isArray(gameState.hives) || gameState.hives.length === 0) gameState.hives = DEFAULT_HB_STATE.hives;
      if (!Array.isArray(gameState.bees) || gameState.bees.length === 0) gameState.bees = DEFAULT_HB_STATE.bees;
      if (!Array.isArray(gameState.flowers) || gameState.flowers.length === 0) gameState.flowers = DEFAULT_HB_STATE.flowers;
      if (!Array.isArray(gameState.factory) || gameState.factory.length === 0) gameState.factory = DEFAULT_HB_STATE.factory;
    } else {
      gameState = JSON.parse(JSON.stringify(DEFAULT_HB_STATE));
    }
  } catch (e) {
    gameState = JSON.parse(JSON.stringify(DEFAULT_HB_STATE));
  }
}

function saveGameState() {
  if (!gameState) return;
  gameState.lastSaveTime = Date.now();
  try {
    localStorage.setItem(HB_STORAGE_KEY, JSON.stringify(gameState));
  } catch (e) {}
}

/* ==========================================================================
   PRODUCTION FORMULAS
   ========================================================================== */
function getFlowerMultiplier() {
  let mult = 1.0;
  gameState.flowers.forEach(f => {
    mult += f.level * f.multStep;
  });
  return mult;
}

function getFactoryMultiplier() {
  let mult = 1.0;
  gameState.factory.forEach(item => {
    if (item.multStep) {
      mult += item.level * item.multStep;
    }
  });
  return mult;
}

function getHoneyPerSecond() {
  let hiveSum = 0;
  gameState.hives.forEach(h => {
    if (h.unlocked && h.level > 0) {
      hiveSum += h.level * h.baseRate;
    }
  });

  let beeSum = 0;
  gameState.bees.forEach(b => {
    beeSum += b.count * b.rate;
  });

  const flowersMult = getFlowerMultiplier();
  const factoryMult = getFactoryMultiplier();
  const total = (hiveSum + beeSum) * flowersMult * factoryMult;
  return Math.max(0, total);
}

function getTapValue() {
  let tapVal = 1;
  const smoker = gameState.factory.find(f => f.id === 'smoker');
  if (smoker) tapVal += smoker.level * smoker.tapStep;
  const queen = gameState.bees.find(b => b.id === 'queen');
  if (queen && queen.count > 0) tapVal += queen.count;
  return tapVal;
}

function getTotalActiveBees() {
  return gameState.bees.reduce((sum, b) => sum + b.count, 0);
}

/* ==========================================================================
   UI RENDERING
   ========================================================================== */
function updateHeaderDisplays() {
  const honeyEl = document.getElementById('hbHoneyDisplay');
  if (honeyEl) honeyEl.textContent = Math.floor(gameState.honey).toLocaleString();

  const rateEl = document.getElementById('hbRateDisplay');
  if (rateEl) {
    const rate = getHoneyPerSecond();
    rateEl.textContent = `+${rate.toFixed(1)} /sec`;
  }

  // Sync main user coins & stars from localStorage
  const coins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  const stars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  const coinsEl = document.getElementById('gameCoinsDisplay');
  if (coinsEl) coinsEl.textContent = coins.toLocaleString();

  const starsEl = document.getElementById('gameStarsDisplay');
  if (starsEl) starsEl.textContent = stars.toLocaleString();

  // Market Stock Displays
  const stockHoneyEl = document.getElementById('marketStockHoney');
  if (stockHoneyEl) stockHoneyEl.textContent = `${Math.floor(gameState.honey).toLocaleString()} 🍯`;

  const stockValEl = document.getElementById('marketStockValue');
  if (stockValEl) {
    const estCoins = Math.floor(gameState.honey * 0.7);
    stockValEl.textContent = `${estCoins.toLocaleString()} 🪙`;
  }

  const hivesTag = document.getElementById('unlockedHivesCountTag');
  if (hivesTag) {
    const activeCount = gameState.hives.filter(h => h.unlocked).length;
    hivesTag.textContent = `${activeCount}/6 Active`;
  }

  const beesTag = document.getElementById('totalBeesCountTag');
  if (beesTag) {
    beesTag.textContent = `${getTotalActiveBees()} Bees`;
  }
}

function renderHives() {
  const container = document.getElementById('hivesGridContainer');
  if (!container) return;

  container.innerHTML = gameState.hives.map(hive => {
    const cost = Math.floor(hive.baseCost * Math.pow(1.35, Math.max(0, hive.level)));
    const canAfford = gameState.honey >= cost;
    const isLocked = !hive.unlocked;

    const btnText = isLocked 
      ? `Unlock (${cost} 🍯)` 
      : `Upgrade (${cost} 🍯)`;

    return `
      <div class="hive-box-card ${isLocked ? 'locked' : ''}">
        <div class="hive-card-top">
          <span class="hive-card-icon">${hive.icon}</span>
          <span class="hive-level-pill">${isLocked ? 'LOCKED' : `LVL ${hive.level}`}</span>
        </div>
        <div class="hive-card-name">${hive.name}</div>
        <div class="hive-card-rate">${isLocked ? 'Tap to unlock' : `+${(hive.level * hive.baseRate * getFlowerMultiplier()).toFixed(1)}/s 🍯`}</div>
        <button type="button" 
          class="btn-upgrade-hive ${canAfford ? '' : 'disabled'}"
          onclick="buyHiveUpgrade('${hive.id}')">
          ${btnText}
        </button>
      </div>
    `;
  }).join('');
}

function renderUpgradesList(listId, items, onBuyMethod, costMultiplier = 1.3) {
  const container = document.getElementById(listId);
  if (!container) return;

  container.innerHTML = items.map(item => {
    const lvl = typeof item.level === 'number' ? item.level : item.count;
    const cost = Math.floor(item.baseCost * Math.pow(costMultiplier, lvl));
    const canAfford = gameState.honey >= cost;

    let bonusText = '';
    if (item.rate) bonusText = `+${item.rate}/s output`;
    else if (item.multStep) bonusText = `+${Math.round(item.multStep * 100)}% multiplier`;
    else if (item.tapStep) bonusText = `+${item.tapStep} per manual tap`;
    else if (item.priceStep) bonusText = `+${Math.round(item.priceStep * 100)}% sell price`;

    return `
      <div class="upgrade-item-card">
        <div class="upgrade-left">
          <div class="upgrade-icon-wrap">${item.icon}</div>
          <div class="upgrade-meta">
            <div class="upgrade-title-row">
              <span class="upgrade-title">${item.name}</span>
              <span class="upgrade-lvl-badge">x${lvl}</span>
            </div>
            <p class="upgrade-desc">${item.desc}</p>
            <span class="upgrade-bonus-val">${bonusText}</span>
          </div>
        </div>
        <button type="button" 
          class="btn-buy-upgrade ${canAfford ? '' : 'disabled'}"
          onclick="${onBuyMethod}('${item.id}')">
          <span>Buy +1</span>
          <span class="btn-cost-sub">${cost} 🍯</span>
        </button>
      </div>
    `;
  }).join('');
}

function renderAllViews() {
  updateHeaderDisplays();
  renderHives();
  renderUpgradesList('flowersListContainer', gameState.flowers, 'buyFlowerUpgrade', 1.35);
  renderUpgradesList('beesListContainer', gameState.bees, 'buyBee', 1.25);
  renderUpgradesList('factoryListContainer', gameState.factory, 'buyFactoryUpgrade', 1.45);
}

/* ==========================================================================
   GAMEPLAY ACTIONS
   ========================================================================== */
function handleCentralHiveTap(event) {
  HoneyAudio.init();
  HoneyAudio.playTap();
  if (Math.random() > 0.6) HoneyAudio.playBuzz();

  const tapVal = getTapValue();
  gameState.honey += tapVal;
  gameState.totalHoneyProduced += tapVal;
  gameState.nectarProgress = (gameState.nectarProgress + 15) % 100;

  // Visual tap feedback
  const bar = document.getElementById('hiveTapProgressBar');
  if (bar) bar.style.width = `${gameState.nectarProgress}%`;

  // Floating text animation at tap location
  const card = document.getElementById('centralHiveCard');
  if (card && event) {
    const rect = card.getBoundingClientRect();
    const x = event.clientX ? (event.clientX - rect.left) : (rect.width / 2);
    const y = event.clientY ? (event.clientY - rect.top) : (rect.height / 2);

    const floater = document.createElement('div');
    floater.className = 'tap-floating-text';
    floater.textContent = `+${tapVal} 🍯`;
    floater.style.left = `${x}px`;
    floater.style.top = `${y}px`;
    card.appendChild(floater);
    setTimeout(() => { try { floater.remove(); } catch(e){} }, 750);
  }

  updateHeaderDisplays();
  renderHives();
}

function buyHiveUpgrade(hiveId) {
  const hive = gameState.hives.find(h => h.id === hiveId);
  if (!hive) return;

  const cost = Math.floor(hive.baseCost * Math.pow(1.35, Math.max(0, hive.level)));
  if (gameState.honey < cost) {
    showToast('Not enough Honey Jars!');
    return;
  }

  gameState.honey -= cost;
  if (!hive.unlocked) {
    hive.unlocked = true;
    hive.level = 1;
    showToast(`Unlocked ${hive.name}! 🐝`);
  } else {
    hive.level += 1;
    showToast(`${hive.name} Upgraded to Lvl ${hive.level}! ✨`);
  }

  HoneyAudio.playUpgrade();
  saveGameState();
  renderAllViews();
}

function buyBee(beeId) {
  const bee = gameState.bees.find(b => b.id === beeId);
  if (!bee) return;

  const cost = Math.floor(bee.baseCost * Math.pow(1.25, bee.count));
  if (gameState.honey < cost) {
    showToast('Not enough Honey Jars!');
    return;
  }

  gameState.honey -= cost;
  bee.count += 1;

  HoneyAudio.playUpgrade();
  showToast(`Hatched +1 ${bee.name}! 🐝`);
  saveGameState();
  renderAllViews();
}

function buyFlowerUpgrade(flowerId) {
  const flower = gameState.flowers.find(f => f.id === flowerId);
  if (!flower) return;

  const cost = Math.floor(flower.baseCost * Math.pow(1.35, flower.level));
  if (gameState.honey < cost) {
    showToast('Not enough Honey Jars!');
    return;
  }

  gameState.honey -= cost;
  flower.level += 1;

  HoneyAudio.playUpgrade();
  showToast(`Planted more ${flower.name}! 🌸`);
  saveGameState();
  renderAllViews();
}

function buyFactoryUpgrade(toolId) {
  const tool = gameState.factory.find(f => f.id === toolId);
  if (!tool) return;

  const cost = Math.floor(tool.baseCost * Math.pow(1.45, tool.level));
  if (gameState.honey < cost) {
    showToast('Not enough Honey Jars!');
    return;
  }

  gameState.honey -= cost;
  tool.level += 1;

  HoneyAudio.playUpgrade();
  showToast(`Upgraded ${tool.name}! ⚙️`);
  saveGameState();
  renderAllViews();
}

/* ==========================================================================
   MARKET & WALLET SYNCHRONIZATION
   ========================================================================== */
function exchangeHoney(jarCost, coinReward, starReward) {
  if (gameState.honey < jarCost) {
    showToast(`Need at least ${jarCost} Honey Jars to trade!`);
    return;
  }

  // Calculate bottler bonus
  const bottler = gameState.factory.find(f => f.id === 'bottler');
  const bonus = bottler ? (bottler.level * bottler.priceStep) : 0;
  const finalCoins = Math.floor(coinReward * (1 + bonus));

  gameState.honey -= jarCost;

  // Add to main game coins
  let curCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  let curStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  curCoins += finalCoins;
  curStars += starReward;

  localStorage.setItem('task_game_coins', curCoins.toString());
  localStorage.setItem('task_game_stars', curStars.toString());
  localStorage.setItem('task_last_sync_timestamp', Date.now().toString());

  // Broadcast sync event to all open tabs
  try {
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channel.postMessage({ type: 'BALANCE_UPDATED', coins: curCoins, stars: curStars });
  } catch (e) {}

  HoneyAudio.playSell();
  showToast(`Sold ${jarCost} Jars for +${finalCoins} 🪙 ${starReward > 0 ? `& +${starReward} ⭐` : ''}! 🎉`);
  saveGameState();
  renderAllViews();
}

function exchangeMaxHoney() {
  const available = Math.floor(gameState.honey);
  if (available < 10) {
    showToast('Need at least 10 Honey Jars to Sell All!');
    return;
  }

  const bottler = gameState.factory.find(f => f.id === 'bottler');
  const bonus = bottler ? (bottler.level * bottler.priceStep) : 0;
  
  // Rate: 1 Honey = 0.7 Coins
  const earnedCoins = Math.floor(available * 0.7 * (1 + bonus));
  const earnedStars = Math.floor(available / 500); // 1 star per 500 honey

  gameState.honey -= available;

  let curCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  let curStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  curCoins += earnedCoins;
  curStars += earnedStars;

  localStorage.setItem('task_game_coins', curCoins.toString());
  localStorage.setItem('task_game_stars', curStars.toString());
  localStorage.setItem('task_last_sync_timestamp', Date.now().toString());

  try {
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channel.postMessage({ type: 'BALANCE_UPDATED', coins: curCoins, stars: curStars });
  } catch (e) {}

  HoneyAudio.playSell();
  showToast(`Sold ALL ${available} Jars for +${earnedCoins} 🪙 ${earnedStars > 0 ? `& +${earnedStars} ⭐` : ''}! 🚀`);
  saveGameState();
  renderAllViews();
}

/* ==========================================================================
   NAVIGATION TABS
   ========================================================================== */
function switchHoneyTab(tabName) {
  HoneyAudio.init();
  HoneyAudio.playBuzz();

  const tabViews = {
    'meadow': 'tabViewMeadow',
    'bees': 'tabViewBees',
    'apiary': 'tabViewApiary',
    'factory': 'tabViewFactory',
    'market': 'tabViewMarket'
  };

  const btnIds = {
    'meadow': 'hbMenuTabMeadow',
    'bees': 'hbMenuTabBees',
    'apiary': 'hbMenuTabApiary',
    'factory': 'hbMenuTabFactory',
    'market': 'hbMenuTabMarket'
  };

  Object.keys(tabViews).forEach(k => {
    const view = document.getElementById(tabViews[k]);
    const btn = document.getElementById(btnIds[k]);
    if (k === tabName) {
      if (view) view.style.display = 'flex';
      if (btn) btn.classList.add('active');
    } else {
      if (view) view.style.display = 'none';
      if (btn) btn.classList.remove('active');
    }
  });

  renderAllViews();
}

/* ==========================================================================
   OFFLINE PRODUCTION & TOASTS
   ========================================================================== */
function checkOfflineProduction() {
  if (!gameState || !gameState.lastSaveTime) return;
  const now = Date.now();
  const elapsedSec = Math.floor((now - gameState.lastSaveTime) / 1000);

  // Minimum 10 seconds, maximum 8 hours (28800 seconds)
  if (elapsedSec >= 10) {
    const cappedSec = Math.min(elapsedSec, 28800);
    const rate = getHoneyPerSecond();
    const offlineHoney = Math.floor(rate * cappedSec * 0.7); // 70% offline efficiency

    if (offlineHoney > 0) {
      offlineRewardAccumulated = offlineHoney;
      const modal = document.getElementById('hbOfflineModal');
      const amtEl = document.getElementById('hbOfflineRewardAmount');
      if (modal && amtEl) {
        amtEl.textContent = `+${offlineHoney.toLocaleString()} 🍯`;
        modal.style.display = 'flex';
      }
    }
  }
}

function claimOfflineRewards() {
  if (offlineRewardAccumulated > 0) {
    gameState.honey += offlineRewardAccumulated;
    gameState.totalHoneyProduced += offlineRewardAccumulated;
    showToast(`Claimed +${offlineRewardAccumulated.toLocaleString()} Offline Honey! 🍯`);
    offlineRewardAccumulated = 0;
  }
  const modal = document.getElementById('hbOfflineModal');
  if (modal) modal.style.display = 'none';
  saveGameState();
  renderAllViews();
}

function showToast(msg) {
  const toast = document.getElementById('hbToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function toggleAudioMute() {
  HoneyAudio.toggleMute();
}

/* ==========================================================================
   GAME LOOP & INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  loadGameState();
  checkOfflineProduction();
  renderAllViews();

  // Primary 1-second idle production loop
  setInterval(() => {
    const rate = getHoneyPerSecond();
    if (rate > 0) {
      gameState.honey += rate;
      gameState.totalHoneyProduced += rate;
      updateHeaderDisplays();
    }
  }, 1000);

  // Auto-save state every 5 seconds
  setInterval(saveGameState, 5000);

  // Sound toggle button initial icon
  const icon = document.getElementById('soundIcon');
  if (icon) icon.textContent = HoneyAudio.muted ? '🔇' : '🔊';

  // Unlock AudioContext on first tap
  document.addEventListener('click', () => {
    HoneyAudio.init();
  }, { once: true });
});

// Save before leaving page
window.addEventListener('beforeunload', saveGameState);

// Real-Time Cross-Tab / Cross-Window Synchronization (Coins/Stars from other tabs)
window.addEventListener('storage', (e) => {
  if (e.key === 'task_game_coins' || e.key === 'task_game_stars') {
    updateHeaderDisplays();
  }
});

try {
  const syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  syncChannel.onmessage = (e) => {
    if (e.data && e.data.type === 'BALANCE_UPDATED') {
      updateHeaderDisplays();
    }
  };
} catch (e) {}

// Expose handlers to global window for onclick events
window.handleCentralHiveTap = handleCentralHiveTap;
window.buyHiveUpgrade = buyHiveUpgrade;
window.buyBee = buyBee;
window.buyFlowerUpgrade = buyFlowerUpgrade;
window.buyFactoryUpgrade = buyFactoryUpgrade;
window.exchangeHoney = exchangeHoney;
window.exchangeMaxHoney = exchangeMaxHoney;
window.switchHoneyTab = switchHoneyTab;
window.claimOfflineRewards = claimOfflineRewards;
window.toggleAudioMute = toggleAudioMute;
