/* ==========================================================================
   SUNFLOWER SOLAR TYCOON ENGINE (pages/sunflower/sunflower.js)
   - 20 Lands in Rectangular Card Layout (Levels 1 to 5000)
   - 60s Growth Phase -> 500s Initial Lifetime upon Mature Bloom
   - Water Bucket: Unlimited Life Extension (Throwing water adds life with NO LIMIT)
   - Shovel / Water: Shovel Clears Dead Sunflowers, or Throw Water to Revive
   - Workers HQ: 2 Top Tabs for Farming Workers & Water Workers
   - Firebase Realtime Database Integration & Cloud Sync in Every Action
   ========================================================================== */

const SF_STORAGE_KEY = 'ENERGY_TAP_SUNFLOWER_STATE_V4';

// 20 Lands Base Unlock Costs (Plot 1: 10 🪙 Gold Coins, Plots 2-20: ⭐ Star Coins)
const SF_LAND_UNLOCK_COSTS = [
  10,     // Land 1: 10 🪙 Gold Coins
  10,     // Land 2: 10 ⭐
  50,     // Land 3: 50 ⭐
  150,    // Land 4: 150 ⭐
  300,    // Land 5: 300 ⭐
  500,    // Land 6: 500 ⭐
  800,    // Land 7: 800 ⭐
  1200,   // Land 8: 1200 ⭐
  1800,   // Land 9: 1800 ⭐
  2500,   // Land 10: 2500 ⭐
  3500,   // Land 11: 3500 ⭐
  5000,   // Land 12: 5000 ⭐
  7000,   // Land 13: 7000 ⭐
  9500,   // Land 14: 9500 ⭐
  13000,  // Land 15: 13000 ⭐
  18000,  // Land 16: 18000 ⭐
  25000,  // Land 17: 25000 ⭐
  35000,  // Land 18: 35000 ⭐
  50000,  // Land 19: 50000 ⭐
  75000   // Land 20: 75000 ⭐
];

// ==========================================================================
// 20 WELLS AQUIFER CONFIGURATION (FIXED 1*20 FORMAT)
// - Well 1 is Free: Produces 1 Basket after 5s
// - Wells 2 to 20: Progressive unlock costs, cycle times & basket outputs
// - Well Workers: Assignable workers for continuous automated basket creation
// ==========================================================================
const SF_WELL_UNLOCK_COSTS = [
  0,      // Well 1: Free (5s base, 1 basket)
  10,     // Well 2: 10 ⭐
  30,     // Well 3: 30 ⭐
  75,     // Well 4: 75 ⭐
  150,    // Well 5: 150 ⭐
  300,    // Well 6: 300 ⭐
  500,    // Well 7: 500 ⭐
  800,    // Well 8: 800 ⭐
  1200,   // Well 9: 1200 ⭐
  1800,   // Well 10: 1800 ⭐
  2500,   // Well 11: 2500 ⭐
  3500,   // Well 12: 3500 ⭐
  5000,   // Well 13: 5000 ⭐
  7000,   // Well 14: 7000 ⭐
  9500,   // Well 15: 9500 ⭐
  13000,  // Well 16: 13000 ⭐
  18000,  // Well 17: 18000 ⭐
  25000,  // Well 18: 25000 ⭐
  35000,  // Well 19: 35000 ⭐
  50000   // Well 20: 50000 ⭐
];

// 20 Wells Base Starting Cycle Times (Well 1: 5 min / 300s, Well 2: 10 min / 600s, ... Well 20: 6000s)
const SF_WELL_BASE_TIMES = Array.from({ length: 20 }, (_, i) => (i + 1) * 300);

// 20 Wells Base Basket Production per Cycle (Well 1 to 20 starting at 1 bucket at Level 1)
const SF_WELL_BASE_BASKETS = Array.from({ length: 20 }, () => 1);

const SF_WELL_NAMES = [
  "Mountain Spring Well #1",
  "Valley Aquifer Well #2",
  "Pebble Creek Well #3",
  "Deep Geyser Well #4",
  "Glacier Fountain Well #5",
  "Crystal Borehole Well #6",
  "Emerald Artesian Well #7",
  "Sunstone Cistern Well #8",
  "Golden Cascades Well #9",
  "Highland Basin Well #10",
  "Riverhead Siphon Well #11",
  "Sapphire Reservoir Well #12",
  "Quartz Spring Well #13",
  "Cobalt Torrent Well #14",
  "Obsidian Trench Well #15",
  "Celestial Aqueduct Well #16",
  "Solar Spring Well #17",
  "Radiant Basin Well #18",
  "Infinity Flow Well #19",
  "Apex Ocean Well #20"
];

// ==========================================================================
// 20 LANDS CONFIGURATION (EXACT USER SPECIFICATION)
// - Level 1 🌻 Generated, Production Time, Base Life Limit, 💧 Water Bonus
// - Level 5000 🌻 Generated, Production Time at L5000, Life Limit at L5000
// ==========================================================================

// Level 1 🌻 Generated per cycle
const SF_LAND_L1_COINS = [
  1,        // Land 1: 1
  100,      // Land 2: 100
  1e3,      // Land 3: 1K
  10e3,     // Land 4: 10K
  100e3,    // Land 5: 100K
  1e6,      // Land 6: 1M
  10e6,     // Land 7: 10M
  100e6,    // Land 8: 100M
  1e9,      // Land 9: 1B
  10e9,     // Land 10: 10B
  100e9,    // Land 11: 100B
  1e12,     // Land 12: 1T
  10e12,    // Land 13: 10T
  100e12,   // Land 14: 100T
  1e15,     // Land 15: 1Qa
  10e15,    // Land 16: 10Qa
  100e15,   // Land 17: 100Qa
  1e18,     // Land 18: 1Qi
  10e18,    // Land 19: 10Qi
  100e18    // Land 20: 100Qi
];

// Production Time at Level 1 (in seconds)
const SF_LAND_BASE_TIMES = [
  60,       // Land 1: 60 sec
  300,      // Land 2: 5 min (300 sec)
  600,      // Land 3: 10 min (600 sec)
  900,      // Land 4: 15 min (900 sec)
  600,      // Land 5: 10 min (600 sec)
  1200,     // Land 6: 20 min (1200 sec)
  1500,     // Land 7: 25 min (1500 sec)
  1800,     // Land 8: 30 min (1800 sec)
  2100,     // Land 9: 35 min (2100 sec)
  2400,     // Land 10: 40 min (2400 sec)
  2700,     // Land 11: 45 min (2700 sec)
  3000,     // Land 12: 50 min (3000 sec)
  3300,     // Land 13: 55 min (3300 sec)
  3600,     // Land 14: 60 min (3600 sec)
  3900,     // Land 15: 65 min (3900 sec)
  4200,     // Land 16: 70 min (4200 sec)
  4500,     // Land 17: 75 min (4500 sec)
  4800,     // Land 18: 80 min (4800 sec)
  5100,     // Land 19: 85 min (5100 sec)
  5400      // Land 20: 90 min (5400 sec)
];

// Base Initial Life for all Lands: 500 seconds (Unlimited life filling via water bucket throws)
const SF_LAND_BASE_LIFE_LIMITS = Array.from({ length: 20 }, () => 500);


// 💧 Water Bonus/Life (seconds added per water bucket)
const SF_LAND_WATER_BONUS = [
  10,       // Land 1: +10 sec
  19,       // Land 2: +19 sec
  28,       // Land 3: +28 sec
  37,       // Land 4: +37 sec
  46,       // Land 5: +46 sec
  55,       // Land 6: +55 sec
  64,       // Land 7: +64 sec
  73,       // Land 8: +73 sec
  82,       // Land 9: +82 sec
  91,       // Land 10: +91 sec
  100,      // Land 11: +100 sec
  109,      // Land 12: +109 sec
  118,      // Land 13: +118 sec
  127,      // Land 14: +127 sec
  136,      // Land 15: +136 sec
  145,      // Land 16: +145 sec
  154,      // Land 17: +154 sec
  163,      // Land 18: +163 sec
  172,      // Land 19: +172 sec
  181       // Land 20: +181 sec
];

// Level 5000 🌻 Generated per cycle
const SF_LAND_L5000_COINS = [
  1,        // Land 1: 1
  1e6,      // Land 2: 1M
  1e9,      // Land 3: 1B
  10e9,     // Land 4: 10B
  1e12,     // Land 5: 1T
  100e12,   // Land 6: 100T
  10e15,    // Land 7: 10Qa
  1e18,     // Land 8: 1Qi
  100e18,   // Land 9: 100Qi
  10e21,    // Land 10: 10Sx
  1e24,     // Land 11: 1Sp
  100e24,   // Land 12: 100Sp
  10e27,    // Land 13: 10Oc
  1e30,     // Land 14: 1No
  100e30,   // Land 15: 100No
  10e33,    // Land 16: 10Dc
  1e36,     // Land 17: 1Ud
  100e36,   // Land 18: 100Ud
  10e39,    // Land 19: 10Dd
  1e42      // Land 20: 1Td
];

// Production Time at Level 5000 (in seconds)
const SF_LAND_L5000_TIMES = [
  0.001,    // Land 1: 0.001 sec
  0.001,    // Land 2: 0.001 sec
  0.01,     // Land 3: 0.01 sec
  0.01,     // Land 4: 0.01 sec
  0.01,     // Land 5: 0.01 sec
  0.01,     // Land 6: 0.01 sec
  0.01,     // Land 7: 0.01 sec
  0.01,     // Land 8: 0.01 sec
  0.01,     // Land 9: 0.01 sec
  0.01,     // Land 10: 0.01 sec
  0.01,     // Land 11: 0.01 sec
  0.01,     // Land 12: 0.01 sec
  0.01,     // Land 13: 0.01 sec
  0.01,     // Land 14: 0.01 sec
  0.01,     // Land 15: 0.01 sec
  0.01,     // Land 16: 0.01 sec
  0.01,     // Land 17: 0.01 sec
  0.01,     // Land 18: 0.01 sec
  0.01,     // Land 19: 0.01 sec
  0.01      // Land 20: 0.01 sec
];

// Life Limit at Level 5000 (in seconds)
const SF_LAND_L5000_LIFE_LIMITS = [
  1250,     // Land 1: 1,250 sec (5x base 250s)
  2500,     // Land 2: 2,500 sec (5x base 500s)
  3750,     // Land 3: 3,750 sec (5x base 750s)
  5400,     // Land 4: 5,400 sec
  7200,     // Land 5: 7,200 sec
  9000,     // Land 6: 9,000 sec
  10800,    // Land 7: 10,800 sec
  12600,    // Land 8: 12,600 sec
  14400,    // Land 9: 14,400 sec
  16200,    // Land 10: 16,200 sec
  18000,    // Land 11: 18,000 sec
  19800,    // Land 12: 19,800 sec
  21600,    // Land 13: 21,600 sec
  23400,    // Land 14: 23,400 sec
  25200,    // Land 15: 25,200 sec
  27000,    // Land 16: 27,000 sec
  28800,    // Land 17: 28,800 sec
  30600,    // Land 18: 30,600 sec
  32400,    // Land 19: 32,400 sec
  34200     // Land 20: 34,200 sec
];

// Max Life Limit Formula (Level 1 to 5000) - Life filling limit removed (Unlimited Life!)
function getSfPlotMaxLifeLimit(plotIndex, level) {
  return Infinity;
}


// Water Bonus per Bucket
function getSfPlotWaterBonus(plotIndex) {
  return SF_LAND_WATER_BONUS[plotIndex] || 10;
}

// 🪣 Water Buckets Required per Watering:
// Increases +1 after every 5 levels (Lv 1-5 = 1 bucket for 10s, Lv 6-10 = 2 buckets for 10s, Lv 11-15 = 3 buckets, etc.)
function getSfPlotRequiredBuckets(level) {
  const L = Math.max(1, level || 1);
  return Math.floor((L - 1) / 5) + 1;
}
window.getSfPlotRequiredBuckets = getSfPlotRequiredBuckets;

function createDefaultSfPlots() {
  const plots = [];
  for (let i = 1; i <= 20; i++) {
    const isUnlocked = false; // All lands start locked. Land 1 is bought for 10 Gold Coins!
    const baseTime = SF_LAND_BASE_TIMES[i - 1];
    const baseLife = SF_LAND_BASE_LIFE_LIMITS[i - 1];
    const initialLife = baseLife;
    const baseCoins = SF_LAND_L1_COINS[i - 1];
    plots.push({
      id: i,
      unlocked: false,
      unlockCost: SF_LAND_UNLOCK_COSTS[i - 1],
      level: 1, // Levels 1 to 5000
      plantStatus: 'empty', // 'empty' | 'growing' | 'alive' | 'dead'
      growthTimer: 0,
      growthDuration: 60.0, // 1 min (60s) growth for all lands
      lifeTimer: 0,
      productionTime: baseTime,
      coinProduction: baseCoins,
      upgradeCost: Math.max(10, Math.round(baseCoins * 5 + 5)),
      timer: baseTime,
      totalCoinsGenerated: 0,
      uncollectedCoins: 0,
      readyToCollect: false,
      progress: 0,
      isWithered: false,
      hasWorker: false, // Dedicated Land Manager for this plot
      lastTick: Date.now()
    });
  }
  return plots;
}

function createDefaultSfWells() {
  const wells = [];
  for (let i = 1; i <= 20; i++) {
    const isUnlocked = i === 1;
    const baseTime = SF_WELL_BASE_TIMES[i - 1];
    const baseBaskets = SF_WELL_BASE_BASKETS[i - 1];
    wells.push({
      id: i,
      name: SF_WELL_NAMES[i - 1],
      unlocked: isUnlocked,
      unlockCost: SF_WELL_UNLOCK_COSTS[i - 1],
      level: 1, // Levels 1 to 5000
      productionTime: baseTime,
      basketProduction: baseBaskets,
      upgradeCost: Math.round(baseBaskets * 30 + 20),
      timer: baseTime,
      storedBaskets: 0,
      maxStorage: 999999999,
      hasWorker: false, // Manager hired for this well
      isProducing: isUnlocked, // All unlocked wells produce!
      totalBasketsGenerated: 0,
      lastTick: Date.now()
    });
  }
  return wells;
}

function loadInitialSunflowerState() {
  try {
    localStorage.removeItem('ENERGY_TAP_SUNFLOWER_STATE_V1');
    localStorage.removeItem('ENERGY_TAP_SUNFLOWER_STATE_V2');
    localStorage.removeItem('ENERGY_TAP_SUNFLOWER_STATE_V3');
  } catch (e) {}

  try {
    const raw = localStorage.getItem(SF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.plots) && parsed.plots.length === 20) {
        parsed.plots.forEach((p, idx) => {
          if (typeof p.level !== 'number' || !Number.isFinite(p.level)) p.level = 1;
          p.level = Math.min(5000, Math.max(1, p.level));
          if (typeof p.unlockCost !== 'number' || idx === 0) p.unlockCost = SF_LAND_UNLOCK_COSTS[idx];
          if (idx === 0) {
            p.unlockCost = SF_LAND_UNLOCK_COSTS[0]; // 10 Gold Coins
            if (!p.boughtFirstLand && p.level === 1 && (p.totalCoinsGenerated || 0) === 0 && (p.uncollectedCoins || 0) === 0) {
              p.unlocked = false;
              p.plantStatus = 'empty';
              p.lifeTimer = 0;
            }
          }
          p.productionTime = getSfPlotCycleTime(idx, p.level);
          p.coinProduction = getSfPlotCoinsPerCycle(idx, p.level);
          p.upgradeCost = getSfPlotUpgradeCost(idx, p.level);
          const maxCap = getSfPlotMaxLifeLimit(idx, p.level);
          if (typeof p.hasWorker !== 'boolean') p.hasWorker = false;

          // Sanitize corrupted timers
          if (typeof p.timer !== 'number' || !Number.isFinite(p.timer) || p.timer <= 0 || p.timer > p.productionTime * 1.5) {
            p.timer = p.productionTime;
          }
          if (typeof p.totalCoinsGenerated !== 'number' || !Number.isFinite(p.totalCoinsGenerated)) p.totalCoinsGenerated = 0;
          p.growthDuration = 60.0;
          if (typeof p.growthTimer !== 'number' || !Number.isFinite(p.growthTimer) || p.growthTimer < 0 || p.growthTimer > 60) {
            p.growthTimer = (p.plantStatus === 'growing') ? 60.0 : 0;
          }
          if (typeof p.uncollectedCoins !== 'number' || !Number.isFinite(p.uncollectedCoins) || p.uncollectedCoins < 0) p.uncollectedCoins = 0;
          if (typeof p.readyToCollect !== 'boolean') p.readyToCollect = Boolean(p.uncollectedCoins > 0);

          // Migrate plantStatus
          // Migrate plantStatus and ensure all unlocked lands are active and healthy
          if (!p.plantStatus) {
            if (!p.unlocked) p.plantStatus = 'empty';
            else p.plantStatus = 'alive';
          }

          const baseLife = SF_LAND_BASE_LIFE_LIMITS[idx] || 500;
          if (typeof p.lifeTimer !== 'number' || !Number.isFinite(p.lifeTimer) || p.lifeTimer < 0) {
            p.lifeTimer = (p.plantStatus === 'alive') ? baseLife : 0;
          }

          // Ensure unlocked lands have an active plant and working timer (auto-revive withered/dead plots)
          if (p.unlocked) {
            if (p.plantStatus === 'dead' || p.isWithered || p.lifeTimer <= 0) {
              p.plantStatus = 'alive';
              p.isWithered = false;
              p.lifeTimer = baseLife;
              p.timer = p.productionTime;
            } else if (p.plantStatus === 'alive' && p.level === 1 && p.lifeTimer < baseLife) {
              // Automatically upgrade existing level 1 plots to 500s initial life
              p.lifeTimer = baseLife;
            }
          }

          // Offline catchup for land plots
          if (p.unlocked && p.lastTick && typeof p.lastTick === 'number') {
            const elapsed = Math.min(86400, (Date.now() - p.lastTick) / 1000);
            if (elapsed > 0) {
              if (p.plantStatus === 'growing') {
                p.growthTimer -= elapsed;
                if (p.growthTimer <= 0) {
                  p.growthTimer = 0;
                  p.plantStatus = 'alive';
                  p.lifeTimer = baseLife;
                  p.timer = p.productionTime;
                  p.isWithered = false;
                }
              } else if (p.plantStatus === 'alive') {
                // Keep plants alive offline - do not wither player crops away!
                p.lifeTimer = Math.max(0, (p.lifeTimer || baseLife) - elapsed * 0.1);
                if (p.productionTime > 0) {
                  const cycles = Math.floor(elapsed / p.productionTime);
                  const remainder = elapsed % p.productionTime;
                  if (cycles > 0) {
                    const gainedCoins = cycles * p.coinProduction;
                    if (p.hasWorker) {
                      parsed.coins = (parsed.coins || 0) + gainedCoins;
                      p.totalCoinsGenerated = (p.totalCoinsGenerated || 0) + gainedCoins;
                      p.uncollectedCoins = 0;
                      p.readyToCollect = false;
                    } else {
                      p.uncollectedCoins = (p.uncollectedCoins || 0) + gainedCoins;
                      p.readyToCollect = true;
                    }
                  }
                  p.timer = Math.max(0.1, p.productionTime - remainder);
                }
              }
            }
          }
          p.lastTick = Date.now();
        });

        // Wells Migration & Initialization
        if (!Array.isArray(parsed.wells) || parsed.wells.length !== 20) {
          parsed.wells = createDefaultSfWells();
        } else {
          parsed.wells.forEach((w, idx) => {
            if (typeof w.level !== 'number' || !Number.isFinite(w.level)) w.level = 1;
            w.level = Math.min(5000, Math.max(1, w.level));
            if (typeof w.unlockCost !== 'number') w.unlockCost = SF_WELL_UNLOCK_COSTS[idx];
            w.productionTime = getSfWellCycleTime(idx, w.level);
            w.basketProduction = getSfWellBasketsPerCycle(idx, w.level);
            w.upgradeCost = getSfWellUpgradeCost(idx, w.level);
            if (typeof w.timer !== 'number' || !Number.isFinite(w.timer) || w.timer <= 0 || w.timer > w.productionTime * 1.5) {
              w.timer = w.productionTime;
            }
            if (typeof w.storedBaskets !== 'number' || !Number.isFinite(w.storedBaskets) || w.storedBaskets < 0) w.storedBaskets = 0;
            w.maxStorage = Infinity;
            if (typeof w.hasWorker !== 'boolean') w.hasWorker = false;
            // Unlocked wells are ALWAYS producing water continuously!
            w.isProducing = Boolean(w.unlocked);
            if (typeof w.totalBasketsGenerated !== 'number') w.totalBasketsGenerated = 0;
            if (!w.name) w.name = SF_WELL_NAMES[idx];

            // Offline catchup for wells: accumulate produced baskets and keep timer ticking!
            if (w.unlocked && w.lastTick && typeof w.lastTick === 'number') {
              const elapsedSec = Math.min(86400, (Date.now() - w.lastTick) / 1000);
              if (elapsedSec > 0 && w.productionTime > 0) {
                const cycles = Math.floor(elapsedSec / w.productionTime);
                const remainder = elapsedSec % w.productionTime;
                if (cycles > 0) {
                  const gained = cycles * w.basketProduction;
                  if (w.hasWorker) {
                    parsed.baskets = (parsed.baskets || 0) + gained;
                  } else {
                    w.storedBaskets = (w.storedBaskets || 0) + gained;
                  }
                  w.totalBasketsGenerated = (w.totalBasketsGenerated || 0) + gained;
                }
                w.timer = Math.max(0.1, w.productionTime - remainder);
                w.isProducing = true;
              }
            }
            w.lastTick = Date.now();
          });
        }

        if (typeof parsed.wellWorkersCount !== 'number') {
          const assigned = parsed.wells.filter(w => w.hasWorker).length;
          parsed.wellWorkersCount = assigned;
        }

        if (typeof parsed.landWorkersCount !== 'number') {
          const assigned = parsed.plots.filter(p => p.hasWorker).length;
          parsed.landWorkersCount = assigned;
        }

        if (typeof parsed.seeds !== 'number') parsed.seeds = 0;
        if (typeof parsed.baskets !== 'number') parsed.baskets = 0;
        if (typeof parsed.shovels !== 'number') parsed.shovels = 0;
        if (!parsed.workers) {
          parsed.workers = { walter: false, dave: false, elena: false, leo: false, barney: false, chloe: false };
        }
        if (!Array.isArray(parsed.managers) || parsed.managers.length !== 20) {
          parsed.managers = createDefaultSfManagers();
        }
        if (!Array.isArray(parsed.wellManagers) || parsed.wellManagers.length !== 20) {
          parsed.wellManagers = createDefaultSfWellManagers();
        }
        if (!parsed.managerSubTab) parsed.managerSubTab = 'sunflower';
        if (!parsed.upgradeMultiplier) parsed.upgradeMultiplier = 1;

        // Migration for wells: ensure Well 1 and other wells use 5 min (300s) base cycle time
        if (Array.isArray(parsed.wells)) {
          parsed.wells.forEach((w, idx) => {
            const expTime = (SF_WELL_BASE_TIMES && SF_WELL_BASE_TIMES[idx]) || ((idx + 1) * 300);
            if (w.level === 1 && (w.productionTime !== expTime || w.productionTime === 180 || w.productionTime === 500 || w.productionTime === 100)) {
              w.productionTime = expTime;
              if (w.timer > expTime || w.timer === 180) {
                w.timer = expTime;
              }
            }
          });
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved Sunflower state:', e);
  }

  return {
    currentPage: 1,
    coins: 0,
    energy: 0,
    diamonds: 0,
    seeds: 0,        // Sunflower plants / seeds in inventory (0 to start)
    baskets: 0,      // Water buckets (0 to start)
    shovels: 0,      // Shovels to clear dead plants (0 to start)
    upgradeMultiplier: 1, // 1, 10, 100, or 'max'
    wellWorkersCount: 0, // Total hired well workers
    landWorkersCount: 0, // Total hired land managers
    managerSubTab: 'sunflower',
    workers: {
      walter: false, // Water Worker: auto-pumps cistern spring water & boosts wells
      chloe: false,  // Water Worker: auto-waters plants when life < 30s
      dave: false,   // Farming Worker: auto-harvests lands 1-5
      elena: false,  // Farming Worker: auto-harvests lands 6-10 + 20% coin boost
      leo: false,    // Farming Worker: auto-harvests lands 11-20 + 2x speed
      barney: false  // Farming Worker: auto-plants seeds into empty plots
    },
    managers: createDefaultSfManagers(),
    wellManagers: createDefaultSfWellManagers(),
    cistern: {
      basketsInCrate: 0,
      maxCrateCapacity: 999999999,
      baseFillSeconds: 4.0,
      currentProgress: 0,
      boostTimerRemaining: 0
    },
    isWaterCollecting: false,
    plots: createDefaultSfPlots(),
    wells: createDefaultSfWells()
  };
}

function createDefaultSfManagers() {
  const managers = [];
  const avatars = ['👷‍♂️', '👩‍🌾', '🧑‍🌾', '👨‍🌾', '👷‍♀️', '🕵️‍♂️', '🧑‍🔧', '🌱', '🌻', '🚜', '🧑‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '🧙‍♂️', '🧚‍♀️', '🤖', '🦊', '🐻', '👑'];
  for (let i = 1; i <= 20; i++) {
    managers.push({
      landId: i,
      unlocked: false,
      activeTimer: 0,
      hireCount: 0,
      avatar: avatars[(i - 1) % avatars.length]
    });
  }
  return managers;
}

function createDefaultSfWellManagers() {
  const wellManagers = [];
  const avatars = ['💧', '🌊', '⛲', '🚣', '🧜‍♂️', '🐬', '🐋', '🏄‍♂️', '⚓', '🚢', '🤿', '🧊', '🌧️', '⛈️', '🫧', '🦭', '🐟', '🐙', '🦈', '👑'];
  for (let i = 1; i <= 20; i++) {
    wellManagers.push({
      wellId: i,
      unlocked: false,
      activeTimer: 0,
      hireCount: 0,
      avatar: avatars[(i - 1) % avatars.length]
    });
  }
  return wellManagers;
}

const sunflowerState = loadInitialSunflowerState();
if (!Array.isArray(sunflowerState.managers) || sunflowerState.managers.length !== 20) {
  sunflowerState.managers = createDefaultSfManagers();
}
if (!Array.isArray(sunflowerState.wellManagers) || sunflowerState.wellManagers.length !== 20) {
  sunflowerState.wellManagers = createDefaultSfWellManagers();
}
if (!sunflowerState.managerSubTab) sunflowerState.managerSubTab = 'sunflower';
if (sunflowerState.cistern) sunflowerState.cistern.maxCrateCapacity = 999999999;
if (Array.isArray(sunflowerState.wells)) {
  sunflowerState.wells.forEach((w, idx) => {
    w.maxStorage = 999999999;
    const expTime = (SF_WELL_BASE_TIMES && SF_WELL_BASE_TIMES[idx]) || ((idx + 1) * 300);
    if (w.level === 1 && (w.productionTime !== expTime || w.productionTime === 180)) {
      w.productionTime = expTime;
      if (w.timer > expTime || w.timer === 180) {
        w.timer = expTime;
      }
    }
  });
}
sunflowerState._diamonds = typeof sunflowerState.diamonds === 'number' ? sunflowerState.diamonds : (parseInt(localStorage.getItem('task_game_stars') || '0', 10) || 0);
sunflowerState._coins = typeof sunflowerState.coins === 'number' ? sunflowerState.coins : 0;

// Star Coins / Diamonds Currency Binding (Fully synced with player's Star Coins: task_game_stars)
const starCoinsPropDef = {
  get() {
    const localStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
    if (typeof window !== 'undefined' && window.gameState && window.gameState.player && typeof window.gameState.player.stars === 'number') {
      return window.gameState.player.stars;
    }
    if (typeof window !== 'undefined' && window.gameState && window.gameState.player && typeof window.gameState.player.diamonds === 'number') {
      return window.gameState.player.diamonds;
    }
    return (localStars !== undefined && !isNaN(localStars)) ? localStars : (this._diamonds || 0);
  },
  set(val) {
    const num = Math.max(0, Number(val) || 0);
    this._diamonds = num;
    try {
      localStorage.setItem('task_game_stars', num.toString());
      const ch = new BroadcastChannel('nova_task_sync');
      ch.postMessage({ type: 'COINS_UPDATED', stars: num });
    } catch (e) {}
    if (typeof window !== 'undefined' && window.gameState && window.gameState.player) {
      window.gameState.player.diamonds = num;
      window.gameState.player.stars = num;
      window._lastCurrencyDeductionTime = Date.now();
      if (typeof window.updateUI === 'function') window.updateUI();
      if (typeof window.saveGame === 'function') window.saveGame(true);
      if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
        window.firebaseSync.syncPlayerCurrenciesImmediate();
      }
    }
  }
};
Object.defineProperty(sunflowerState, 'diamonds', starCoinsPropDef);
Object.defineProperty(sunflowerState, 'starCoins', starCoinsPropDef);
Object.defineProperty(sunflowerState, 'stars', starCoinsPropDef);

Object.defineProperty(sunflowerState, 'coins', {
  get() {
    if (typeof window !== 'undefined' && window.gameState && window.gameState.player) {
      if (typeof window.gameState.player.sunflowerCoins === 'number') {
        return window.gameState.player.sunflowerCoins;
      }
      if (typeof window.gameState.player.sunflower === 'number') {
        return window.gameState.player.sunflower;
      }
    }
    return this._coins || 0;
  },
  set(val) {
    const num = Math.max(0, Number(val) || 0);
    this._coins = num;
    if (typeof window !== 'undefined' && window.gameState && window.gameState.player) {
      window.gameState.player.sunflowerCoins = num;
      window.gameState.player.sunflower = num;
      if (typeof window.updateUI === 'function') window.updateUI();
      if (typeof window.saveGame === 'function') window.saveGame(true);
    }
  }
});

window.sunflowerState = sunflowerState;

// Player's Main Gold Coins Accessors & Synced Deductions (task_game_coins / user_coins / gameState.player.coins)
window.getPlayerGoldCoins = function() {
  if (typeof window !== 'undefined' && window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number') {
    return window.gameState.player.coins;
  }
  if (typeof gameState !== 'undefined' && gameState.player && typeof gameState.player.coins === 'number') {
    return gameState.player.coins;
  }
  const val = localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0';
  const num = parseInt(val, 10);
  return isNaN(num) ? 0 : num;
};

window.deductPlayerGoldCoins = function(amt) {
  amt = Math.max(0, Number(amt) || 0);
  const current = window.getPlayerGoldCoins();
  if (current < amt) return false;
  const next = Math.max(0, current - amt);

  if (typeof window !== 'undefined' && window.gameState && window.gameState.player) {
    window.gameState.player.coins = next;
  }
  if (typeof gameState !== 'undefined' && gameState.player) {
    gameState.player.coins = next;
  }

  try {
    localStorage.setItem('task_game_coins', next.toString());
    localStorage.setItem('user_coins', next.toString());
    const ch = new BroadcastChannel('nova_task_sync');
    ch.postMessage({ type: 'COINS_UPDATED', coins: next });
  } catch (e) {}

  window._lastCurrencyDeductionTime = Date.now();
  if (typeof window.saveGame === 'function') window.saveGame(true);
  if (typeof window.updateUI === 'function') window.updateUI();
  if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
    try { window.firebaseSync.syncPlayerCurrenciesImmediate(); } catch (e) {}
  }
  return true;
};

window.addPlayerGoldCoins = function(amt) {
  amt = Math.max(0, Number(amt) || 0);
  const current = window.getPlayerGoldCoins();
  const next = current + amt;

  if (typeof window !== 'undefined' && window.gameState && window.gameState.player) {
    window.gameState.player.coins = next;
  }
  if (typeof gameState !== 'undefined' && gameState.player) {
    gameState.player.coins = next;
  }

  try {
    localStorage.setItem('task_game_coins', next.toString());
    localStorage.setItem('user_coins', next.toString());
    const ch = new BroadcastChannel('nova_task_sync');
    ch.postMessage({ type: 'COINS_UPDATED', coins: next });
  } catch (e) {}

  if (typeof window.saveGame === 'function') window.saveGame(true);
  if (typeof window.updateUI === 'function') window.updateUI();
  if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
    try { window.firebaseSync.syncPlayerCurrenciesImmediate(); } catch (e) {}
  }
  return true;
};


/* ==========================================================================
   FIREBASE REALTIME CLOUD SYNCHRONIZATION
   ========================================================================== */
let sfSaveTimeout = null;
function saveSunflowerStateDebounced() {
  if (sfSaveTimeout) return;
  sfSaveTimeout = setTimeout(() => {
    sfSaveTimeout = null;
    try {
      localStorage.setItem(SF_STORAGE_KEY, JSON.stringify(sunflowerState));
    } catch (e) {}
    syncSunflowerToFirebase();
  }, 1000);
}

function syncSunflowerToFirebase() {
  if (typeof window !== 'undefined' && window.firebaseSync) {
    const fs = window.firebaseSync;
    if (fs.database && fs.userId) {
      updateFirebaseCloudBadge('saving');
      fs.database.ref(`players/${fs.userId}/sunflower`).set(sunflowerState)
        .then(() => {
          updateFirebaseCloudBadge('synced');
        })
        .catch(() => {
          updateFirebaseCloudBadge('offline');
        });
    }
  }
}

function updateFirebaseCloudBadge(status) {
  const dot = document.getElementById('sfFbDot');
  const label = document.getElementById('sfFbLabel');
  if (!dot || !label) return;

  if (status === 'synced') {
    dot.className = 'sf-cloud-dot online';
    label.innerText = 'Cloud Synced';
  } else if (status === 'saving') {
    dot.className = 'sf-cloud-dot syncing';
    label.innerText = 'Saving...';
  } else {
    dot.className = 'sf-cloud-dot offline';
    label.innerText = 'Offline';
  }
}

window.syncSunflowerFromCloud = function(cloudSunflower) {
  if (!cloudSunflower || typeof cloudSunflower !== 'object') return;
  try {
    if (Array.isArray(cloudSunflower.plots) && cloudSunflower.plots.length === 20) {
      sunflowerState.plots = cloudSunflower.plots;
    }
    if (Array.isArray(cloudSunflower.wells) && cloudSunflower.wells.length === 20) {
      sunflowerState.wells = cloudSunflower.wells;
    }
    if (typeof cloudSunflower.wellWorkersCount === 'number') {
      sunflowerState.wellWorkersCount = cloudSunflower.wellWorkersCount;
    }
    if (typeof cloudSunflower.landWorkersCount === 'number') {
      sunflowerState.landWorkersCount = cloudSunflower.landWorkersCount;
    }
    if (typeof cloudSunflower.coins === 'number') sunflowerState.coins = cloudSunflower.coins;
    if (typeof cloudSunflower.seeds === 'number') sunflowerState.seeds = cloudSunflower.seeds;
    if (typeof cloudSunflower.baskets === 'number') sunflowerState.baskets = cloudSunflower.baskets;
    if (typeof cloudSunflower.shovels === 'number') sunflowerState.shovels = cloudSunflower.shovels;
    if (cloudSunflower.workers) sunflowerState.workers = Object.assign(sunflowerState.workers || {}, cloudSunflower.workers);
    if (cloudSunflower.cistern) sunflowerState.cistern = Object.assign(sunflowerState.cistern || {}, cloudSunflower.cistern);
    renderSunflowerPlots();
    renderSunflowerWells();
    updateStickyHeaderAndMiniStats();
    updateWorkersUI();
    updateFirebaseCloudBadge('synced');
  } catch (e) {
    console.warn('Failed to apply cloud sunflower state:', e);
  }
};

/* ==========================================================================
   FORMULAS: SPEED, OUTPUT & UPGRADE COSTS (Levels 1 to 5000)
   ========================================================================== */

function getSfPlotCycleTime(plotIndex, level) {
  const baseTime = SF_LAND_BASE_TIMES[plotIndex] || 60;
  const minTime = SF_LAND_L5000_TIMES[plotIndex] || 0.01;
  const L = Math.min(5000, Math.max(1, level || 1));
  if (L >= 5000) return minTime;
  if (L <= 1) return baseTime;

  let time = baseTime * Math.pow(minTime / baseTime, (L - 1) / 4999);

  // Leo Worker speed boost (halves cycle duration)
  if (sunflowerState && sunflowerState.workers && sunflowerState.workers.leo) {
    time = time / 2;
  }
  return Math.max(minTime, time);
}

function getSfPlotCoinsPerCycle(plotIndex, level) {
  const baseCoins = SF_LAND_L1_COINS[plotIndex] || 1;
  const maxCoins = SF_LAND_L5000_COINS[plotIndex] || 1;
  const L = Math.min(5000, Math.max(1, level || 1));
  if (L <= 1) return baseCoins;
  if (L >= 5000) return maxCoins;
  if (baseCoins === maxCoins) return baseCoins;

  let coins = baseCoins * Math.pow(maxCoins / baseCoins, (L - 1) / 4999);

  // Elena Worker output boost (+20%)
  if (sunflowerState && sunflowerState.workers && sunflowerState.workers.elena) {
    coins = coins * 1.2;
  }
  return Math.max(1, Math.round(coins));
}

function getSfPlotUpgradeCost(plotIndex, level) {
  const L = Math.min(5000, Math.max(1, level || 1));
  if (L >= 5000) return Infinity;
  const coinsGen = getSfPlotCoinsPerCycle(plotIndex, L);
  return Math.max(10, Math.round(coinsGen * 5 + L * 2));
}

function getSfMultiUpgradeInfo(plotIndex, currentLevel, multMode, playerCoins) {
  let levelsToAdd = 0;
  let totalCost = 0;
  let curL = currentLevel;

  // Milestone ad checkpoint: at Lv 5, 10, 15... watch ad to unlock the next level!
  if (currentLevel % 5 === 0 && currentLevel < 5000) {
    return {
      levelsToAdd: 1,
      totalCost: 0,
      targetLevel: Math.min(5000, currentLevel + 1),
      isAdUpgrade: true
    };
  }

  let targetLevels = 1;
  if (multMode === 10) targetLevels = 10;
  else if (multMode === 100) targetLevels = 100;
  else if (multMode === 'max') targetLevels = 5000;

  while (curL < 5000 && levelsToAdd < targetLevels) {
    // If the next level is a milestone (e.g. 5, 10, 15...), pause there so player can watch ad
    if (curL > currentLevel && curL % 5 === 0) {
      break;
    }
    const cost = getSfPlotUpgradeCost(plotIndex, curL);
    if (cost === Infinity) break;
    if (multMode === 'max' && totalCost + cost > playerCoins && levelsToAdd > 0) {
      break;
    }
    totalCost += cost;
    curL++;
    levelsToAdd++;
    if (multMode !== 'max' && levelsToAdd >= targetLevels) break;
  }

  if (levelsToAdd === 0) {
    levelsToAdd = 1;
    totalCost = getSfPlotUpgradeCost(plotIndex, currentLevel);
  }

  return {
    levelsToAdd: Math.max(1, levelsToAdd),
    totalCost,
    targetLevel: Math.min(5000, currentLevel + levelsToAdd),
    isAdUpgrade: false
  };
}

/* ==========================================================================
   FORMULAS: 20 WELLS SPEED, OUTPUT & UPGRADE COSTS (Levels 1 to 5000)
   ========================================================================== */

function getSfWellCycleTime(wellIndex, level) {
  const baseTime = (SF_WELL_BASE_TIMES && SF_WELL_BASE_TIMES[wellIndex]) || ((wellIndex + 1) * 300);
  const L = Math.min(5000, Math.max(1, level || 1));
  if (L <= 1) return baseTime;
  if (L >= 5000) return 1.0;

  // Decrease from baseTime (e.g. 300s = 5 min for Well 1) down to 1s at Level 5000
  let time = baseTime - ((baseTime - 1) * ((L - 1) / 4999));

  // Walter Aquifer Grandmaster speed boost (+25% speed => time / 1.25)
  if (sunflowerState && sunflowerState.workers && sunflowerState.workers.walter) {
    time = time / 1.25;
  }
  return Math.max(1.0, Math.round(time * 10) / 10);
}

function getSfWellBasketsPerCycle(wellIndex, level) {
  const L = Math.min(5000, Math.max(1, level || 1));
  const maxBaskets = 100 + (wellIndex * 150); // Well 1: 100, Well 2: 250, Well 3: 400...
  if (L <= 1) return 1;
  if (L >= 5000) return maxBaskets;
  return Math.max(1, Math.round(1 + ((maxBaskets - 1) * ((L - 1) / 4999))));
}

function getSfWellUpgradeCost(wellIndex, level) {
  const L = Math.min(5000, Math.max(1, level || 1));
  if (L >= 5000) return Infinity;
  const baseCoins = (wellIndex + 1) * 25;
  // Smooth progressive polynomial curve (Level 1 to 5000) without float overflow
  return Math.max(10, Math.round(baseCoins * (1 + (L * 0.5) + Math.pow(L, 1.25))));
}

function getSfWellMultiUpgradeInfo(wellIndex, currentLevel, multMode, playerCoins) {
  let levelsToAdd = 0;
  let totalCost = 0;
  let curL = currentLevel;

  // Milestone ad checkpoint: at Lv 5, 10, 15... watch ad to unlock the next level!
  if (currentLevel % 5 === 0 && currentLevel < 5000) {
    return {
      levelsToAdd: 1,
      totalCost: 0,
      targetLevel: Math.min(5000, currentLevel + 1),
      isAdUpgrade: true
    };
  }

  let targetLevels = 1;
  if (multMode === 10) targetLevels = 10;
  else if (multMode === 100) targetLevels = 100;
  else if (multMode === 'max') targetLevels = 5000;

  while (curL < 5000 && levelsToAdd < targetLevels) {
    // If the next level is a milestone (e.g. 5, 10, 15...), pause there so player can watch ad
    if (curL > currentLevel && curL % 5 === 0) {
      break;
    }
    const cost = getSfWellUpgradeCost(wellIndex, curL);
    if (cost === Infinity) break;
    if (multMode === 'max' && totalCost + cost > playerCoins && levelsToAdd > 0) {
      break;
    }
    totalCost += cost;
    curL++;
    levelsToAdd++;
    if (multMode !== 'max' && levelsToAdd >= targetLevels) break;
  }

  if (levelsToAdd === 0) {
    levelsToAdd = 1;
    totalCost = getSfWellUpgradeCost(wellIndex, currentLevel);
  }

  return {
    levelsToAdd: Math.max(1, levelsToAdd),
    totalCost,
    targetLevel: Math.min(5000, currentLevel + levelsToAdd),
    isAdUpgrade: false
  };
}

function getAssignedWellWorkersCount() {
  if (!sunflowerState || !Array.isArray(sunflowerState.wells)) return 0;
  return sunflowerState.wells.filter(w => w.hasWorker).length;
}
window.getAssignedWellWorkersCount = getAssignedWellWorkersCount;

function getIdleWellWorkersCount() {
  const total = sunflowerState.wellWorkersCount || 0;
  const assigned = getAssignedWellWorkersCount();
  return Math.max(0, total - assigned);
}
window.getIdleWellWorkersCount = getIdleWellWorkersCount;

function getAssignedLandWorkersCount() {
  if (!sunflowerState || !Array.isArray(sunflowerState.plots)) return 0;
  return sunflowerState.plots.filter(p => p.hasWorker).length;
}
window.getAssignedLandWorkersCount = getAssignedLandWorkersCount;

function getIdleLandWorkersCount() {
  const total = sunflowerState.landWorkersCount || 0;
  const assigned = getAssignedLandWorkersCount();
  return Math.max(0, total - assigned);
}
window.getIdleLandWorkersCount = getIdleLandWorkersCount;

function formatTimerText(seconds, cycleTime) {
  if (cycleTime < 0.05) return '⚡ Instant';
  const sec = Math.max(0, seconds || 0);
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }
  return `${Math.ceil(sec)}s`;
}

/* ==========================================================================
   AUDIO SYNTHESIS SYSTEM
   ========================================================================== */
const sunflowerAudio = {
  ctx: null,
  muted: false,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  },
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playTone(freq, type = 'sine', duration = 0.12, gainLevel = 0.09) {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.02);
    } catch (e) {}
  },
  playCoin() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) {}
  },
  playWaterSplash() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.0, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  },
  playUnlockChime() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sine', 0.2, 0.1), idx * 70);
    });
  },
  playUpgradeChime() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    [587.33, 739.99, 880.0, 1174.66].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.18, 0.1), idx * 60);
    });
  },
  playSolarChime() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    [659.25, 830.61, 987.77, 1318.51].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.22, 0.1), idx * 80);
    });
  },
  playPlant() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    [330, 440, 550].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sine', 0.1, 0.08), idx * 45);
    });
  },
  playHarvest() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.16, 0.09), idx * 40);
    });
  },
  playShovel() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    [220, 180, 150].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.12, 0.06), idx * 50);
    });
  },
  playClick() {
    if (this.muted) return;
    this.playTone(600, 'sine', 0.05, 0.04);
  },
  playError() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    [200, 160].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'square', 0.15, 0.07), idx * 80);
    });
  },
  playFanfare() {
    if (this.muted) return;
    this.init(); this.resume();
    if (!this.ctx) return;
    [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.12), idx * 90);
    });
  }
};

function spawnSfFloat(text, x, y, color = 'text-amber-400') {
  const el = document.createElement('div');
  el.className = `floating-coin-particle ${color} text-xs sm:text-sm select-none font-bold`;
  el.innerHTML = text;
  el.style.left = `${x || window.innerWidth / 2}px`;
  el.style.top = `${y || window.innerHeight / 2}px`;
  document.body.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1100);
}

/* ==========================================================================
   NAVIGATION: 5-TAB CUSTOM BOTTOM MENU
   1: Garden | 2: Water | 3: Shop | 4: Workers | 5: Converter
   ========================================================================== */
window.navigateSunflowerPage = function(pageNum) {
  sunflowerState.currentPage = pageNum;
  sunflowerAudio.playTone(520, 'triangle', 0.08, 0.05);

  for (let i = 1; i <= 5; i++) {
    const pageEl = document.getElementById(`sfPage${i}`);
    if (pageEl) {
      if (i === pageNum) {
        pageEl.classList.remove('hidden');
        pageEl.classList.add('active-page');
      } else {
        pageEl.classList.add('hidden');
        pageEl.classList.remove('active-page');
      }
    }
  }

  // Update Bottom Menu Bar Active State
  const menuMap = {
    1: 'sfMenuTabGarden',
    2: 'sfMenuTabWater',
    3: 'sfMenuTabShop',
    4: 'sfMenuTabWorkers',
    5: 'sfMenuTabConvert'
  };

  Object.values(menuMap).forEach(btnId => {
    const b = document.getElementById(btnId);
    if (b) b.classList.remove('active');
  });

  const activeBtnId = menuMap[pageNum];
  if (activeBtnId) {
    const b = document.getElementById(activeBtnId);
    if (b) b.classList.add('active');
  }

  // Ensure upper game heading remains pinned, fully visible, and not scrolled off
  const viewContainer = document.getElementById('pageSunflower');
  if (viewContainer) {
    viewContainer.scrollTop = 0;
  }
  const appContainer = document.querySelector('.mobile-container') || document.querySelector('.app-container');
  if (appContainer) {
    appContainer.scrollTop = 0;
  }
  if (typeof window.scrollTo === 'function') {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
  }
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

  // Explicitly ensure the sticky top header bar is visible and flex layout intact
  const stickyHdr = document.getElementById('sfStickyHeader');
  if (stickyHdr) {
    stickyHdr.style.display = 'flex';
    stickyHdr.style.visibility = 'visible';
    stickyHdr.style.opacity = '1';
  }

  if (pageNum === 1) renderSunflowerPlots();
  if (pageNum === 2) renderSunflowerWells();
  if (pageNum === 3) updateSunflowerUI();
  if (pageNum === 4) renderSunflowerManagers();
  if (pageNum === 5) {
    renderSunflowerStarExchange();
  }

  saveSunflowerStateDebounced();
};

/* ==========================================================================
   WORKER PAGE SUBTABS (Farming / Water)
   ========================================================================== */
window.switchSunflowerWorkerSubtab = function(tabKey) {
  const farmBtn = document.getElementById('sfWorkerTabFarming');
  const waterBtn = document.getElementById('sfWorkerTabWater');
  const farmSec = document.getElementById('sfWorkerSectionFarming');
  const waterSec = document.getElementById('sfWorkerSectionWater');

  if (tabKey === 'farming') {
    if (farmBtn) farmBtn.classList.add('active');
    if (waterBtn) waterBtn.classList.remove('active');
    if (farmSec) farmSec.classList.remove('hidden');
    if (waterSec) waterSec.classList.add('hidden');
  } else {
    if (waterBtn) waterBtn.classList.add('active');
    if (farmBtn) farmBtn.classList.remove('active');
    if (waterSec) waterSec.classList.remove('hidden');
    if (farmSec) farmSec.classList.add('hidden');
    updateWorkersUI();
  }
  sunflowerAudio.playTone(480, 'sine', 0.08, 0.05);
};

/* ==========================================================================
   UPGRADE MULTIPLIER (1x, 10x, 100x, MAX) - CIRCLE TOGGLE SWITCH
   ========================================================================== */
window.setSfUpgradeMultiplier = function(mult) {
  sunflowerState.upgradeMultiplier = mult;

  // 1. Update circular toggle button text & data-mult attribute
  const displayVal = mult === 'max' ? 'MAX' : `${mult}x`;
  document.querySelectorAll('.sf-mult-circle-val').forEach(el => {
    el.innerText = displayVal;
  });
  document.querySelectorAll('.sf-mult-circle-toggle-btn').forEach(btn => {
    btn.setAttribute('data-mult', String(mult));
    btn.classList.remove('sf-mult-bump');
    void btn.offsetWidth;
    btn.classList.add('sf-mult-bump');
    setTimeout(() => btn.classList.remove('sf-mult-bump'), 220);
  });

  // 2. Legacy support for any multi-button elements
  document.querySelectorAll('.sf-mult-btn').forEach(b => {
    const m = b.getAttribute('data-mult');
    if (m === String(mult)) b.classList.add('active');
    else b.classList.remove('active');
  });

  renderSunflowerPlots();
  renderSunflowerWells();
  saveSunflowerStateDebounced();
};

window.toggleSfUpgradeMultiplier = function(event = null) {
  const current = sunflowerState.upgradeMultiplier || 1;
  let next = 1;
  if (current === 1 || current === '1') next = 10;
  else if (current === 10 || current === '10') next = 100;
  else if (current === 100 || current === '100') next = 'max';
  else next = 1;

  setSfUpgradeMultiplier(next);

  sunflowerAudio.playTone(620, 'triangle', 0.08, 0.06);

  const display = next === 'max' ? 'MAX' : `${next}x`;
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat(`⚡ Buy Multiplier: ${display}`, posX, posY, 'text-amber-400');
};

/* ==========================================================================
   LAND ACTIONS: PLANT, WATER (+10s), UPGRADE (+5s CAP), SHOVEL (CLEAR)
   ========================================================================== */

// 1. Plant Seed (Restart to Level 1, 60s / 1 min Growth)

window.quickBuyPlantAndInstall = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked || plot.plantStatus !== 'empty') return;

  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;

  if ((sunflowerState.seeds || 0) > 0) {
    plantSfPlot(plotId, event);
    return;
  }

  // Auto buy seed if player has resources
  if ((sunflowerState.coins || 0) >= 50) {
    sunflowerState.coins -= 50;
    sunflowerState.seeds = (sunflowerState.seeds || 0) + 1;
    saveSunflowerState();
    plantSfPlot(plotId, event);
    spawnSfFloat('🌱 Bought & Planted Seed (-50 🌻)!', posX, posY, 'text-emerald-400 font-black');
  } else if ((sunflowerState.diamonds || 0) >= 1) {
    sunflowerState.diamonds -= 1;
    sunflowerState.seeds = (sunflowerState.seeds || 0) + 1;
    saveSunflowerState();
    plantSfPlot(plotId, event);
    spawnSfFloat('🌱 Bought & Planted Seed (-1 ⭐)!', posX, posY, 'text-amber-400 font-black');
  } else if (window.getPlayerGoldCoins() >= 200) {
    window.deductPlayerGoldCoins(200);
    sunflowerState.seeds = (sunflowerState.seeds || 0) + 1;
    saveSunflowerState();
    plantSfPlot(plotId, event);
    spawnSfFloat('🌱 Bought & Planted Seed (-200 🪙)!', posX, posY, 'text-emerald-400 font-black');
  } else {
    spawnSfFloat('❌ Need Seeds 🌱 or 200 🪙 Gold Coins to plant!', posX, posY, 'text-rose-400 font-bold');
  }
};

window.plantSfPlot = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked || plot.plantStatus !== 'empty') return;

  if (sunflowerState.seeds > 0) {
    sunflowerState.seeds -= 1;
    plot.plantStatus = 'growing';
    plot.growthTimer = 60.0;
    plot.growthDuration = 60.0;
    plot.level = 1;
    plot.lifeTimer = 0;
    plot.timer = getSfPlotCycleTime(plotIndex, 1);
    plot.readyToCollect = false;
    plot.uncollectedCoins = 0;
    plot.isWithered = false;
    plot.lastTick = Date.now();

    sunflowerAudio.playPlant();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`🌱 Planted Baby Plant on Land #${plot.id}! (1 min / 60s Growth incubation)`, posX, posY, 'text-emerald-400');

    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerPlots();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`No baby plants in inventory! Buy in Shop 🏪`, posX, posY, 'text-red-400');
  }
};

// 2. Quick Buy Plant from Shop and Install Directly onto Plot
window.quickBuyPlantAndInstall = function(plotId, event = null) {
  if (sunflowerState.coins >= 50) {
    sunflowerState.coins -= 50;
    sunflowerState.seeds = (sunflowerState.seeds || 0) + 1;
    plantSfPlot(plotId, event);
  } else if (sunflowerState.diamonds >= 1) {
    sunflowerState.diamonds -= 1;
    sunflowerState.seeds = (sunflowerState.seeds || 0) + 1;
    plantSfPlot(plotId, event);
  } else {
    navigateSunflowerPage(3);
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat('Need 50 ☀️ or 1 ⭐ to buy a Plant Seed!', posX, posY, 'text-amber-400');
  }
};

// 3. Water Plot (Bonus added from SF_LAND_WATER_BONUS - Unlimited Life Filling)
window.waterSfPlot = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked) return;
  if (plot.plantStatus !== 'alive' && plot.plantStatus !== 'dead') return;

  const bonus = getSfPlotWaterBonus(plotIndex);
  const reqBuckets = getSfPlotRequiredBuckets(plot.level);

  if ((sunflowerState.baskets || 0) >= reqBuckets) {
    sunflowerState.baskets -= reqBuckets;
    const wasDead = plot.plantStatus === 'dead';
    if (wasDead) {
      plot.plantStatus = 'alive';
      plot.isWithered = false;
      plot.lifeTimer = bonus;
      plot.timer = getSfPlotCycleTime(plotIndex, plot.level);
    } else {
      // Unlimited life filling without cap
      plot.lifeTimer = (plot.lifeTimer || 0) + bonus;
    }

    sunflowerAudio.playWaterSplash();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    const msg = wasDead
      ? `-${reqBuckets} 🪣 Used! Revived with +${bonus}s Life! 🌻`
      : `-${reqBuckets} 🪣 Used! +${bonus}s Unlimited Life Added! (${Math.ceil(plot.lifeTimer)}s) 🌻`;
    spawnSfFloat(msg, posX, posY, 'text-cyan-400 font-bold');

    // Visual water splash animation on the plot card
    const tile = document.getElementById(`sfPlotTile-${plotId}`);
    if (tile) {
      tile.classList.add('sf-tile-water-splash');
      setTimeout(() => tile.classList.remove('sf-tile-water-splash'), 600);
    }

    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    if (wasDead) {
      renderSunflowerPlots();
    } else {
      updateSinglePlotUI(plotId);
    }
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`Need ${reqBuckets} 🪣 Water Buckets! (Have: ${sunflowerState.baskets || 0}) Collect at Water Well (Page 2) or Shop (Page 3) 💧`, posX, posY, 'text-red-400');
  }
};

// 4a. Upgrade Land Level with Sponsored Rewarded Ad (Every 5 Levels Milestone: 5, 10, 15, 20...)
window.upgradeSfPlotWithAd = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked || plot.level >= 5000) return;

  const doAdUpgrade = () => {
    plot.level = Math.min(5000, plot.level + 1);
    plot.productionTime = getSfPlotCycleTime(plotIndex, plot.level);
    plot.coinProduction = getSfPlotCoinsPerCycle(plotIndex, plot.level);
    plot.upgradeCost = getSfPlotUpgradeCost(plotIndex, plot.level);

    sunflowerAudio.playUpgradeChime();
    if (typeof window.recordTaskEvent === 'function') {
      window.recordTaskEvent('sunflower_upgrade', 1);
    }
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`🎉 Milestone Unlocked: Land #${plot.id} Lv. ${plot.level}! (Unlimited Life 🪣) 🌻`, posX, posY, 'text-emerald-400 font-black');

    renderSunflowerPlots();
    updateStickyHeaderAndMiniStats();
    saveSunflowerStateDebounced();
  };

  if (typeof window.showRewardedAd === 'function') {
    window.showRewardedAd(doAdUpgrade, {
      adTitle: `Land #${plot.id} Milestone Lv.${plot.level + 1}`,
      adDesc: `Watch a short sponsor video to upgrade Land #${plot.id} past milestone Level ${plot.level}!`
    });
  } else {
    doAdUpgrade();
  }
};

// 4b. Upgrade Land Level (Boosts sunflower coin output & produces coins)
window.upgradeSfPlot = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked || plot.level >= 5000) return;

  // Milestone ad checkpoint: each 5 levels (Lv 5, 10, 15, 20...) watch ad to advance!
  if (plot.level % 5 === 0) {
    window.upgradeSfPlotWithAd(plotId, event);
    return;
  }

  const mult = sunflowerState.upgradeMultiplier || 1;
  const playerSfCoins = sunflowerState.coins || 0;

  // STRICT RULE: Land level upgrades use ONLY Sunflower Coins (🌻). Gold Coins (🪙) are NEVER used!
  const info = getSfMultiUpgradeInfo(plotIndex, plot.level, mult, playerSfCoins);

  if (info.isAdUpgrade) {
    window.upgradeSfPlotWithAd(plotId, event);
    return;
  }

  // Deduct cost STRICTLY from Sunflower Coins
  if (playerSfCoins >= info.totalCost) {
    sunflowerState.coins -= info.totalCost;
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`Need ${formatNumber(info.totalCost)} 🌻 Sunflower Coins! Or Watch Ad 📢`, posX, posY, 'text-red-400');
    return;
  }

  const oldLvl = plot.level;
  plot.level = info.targetLevel;
  plot.productionTime = getSfPlotCycleTime(plotIndex, plot.level);
  plot.coinProduction = getSfPlotCoinsPerCycle(plotIndex, plot.level);
  plot.upgradeCost = getSfPlotUpgradeCost(plotIndex, plot.level);

  if (typeof window.recordTaskEvent === 'function') {
    window.recordTaskEvent('sunflower_upgrade', Math.max(1, info.targetLevel - oldLvl));
  }

  sunflowerAudio.playUpgradeChime();
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat(`▲ Land #${plot.id} Lv. ${plot.level}! (Unlimited Life 🪣) 🌻`, posX, posY, 'text-yellow-400 font-bold');

  renderSunflowerPlots();
  updateStickyHeaderAndMiniStats();
  saveSunflowerStateDebounced();
};


// 5. Shovel Dead Flower (Clears plot -> Install new plant -> Restart Level 1)
window.shovelSfPlot = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked || plot.plantStatus !== 'dead') return;

  if (sunflowerState.shovels > 0) {
    sunflowerState.shovels -= 1;
    plot.plantStatus = 'empty';
    plot.isWithered = false;
    plot.level = 1;
    plot.growthTimer = 0;
    plot.lifeTimer = 0;
    plot.timer = getSfPlotCycleTime(plotIndex, 1);

    sunflowerAudio.playShovel();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`Plot #${plot.id} Cleared! Install a new plant to restart at Level 1 🌱`, posX, posY, 'text-emerald-400');

    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerPlots();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat('Need 🪏 Shovel! Buy on Page 3 Shop', posX, posY, 'text-red-400');
  }
};

// 6. Unlock Land Plot
window.unlockSfPlot = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || plot.unlocked) return;

  // LAND 1: Buy for 10 Gold Coins (gameState.player.coins)
  if (plotId === 1) {
    const cost = plot.unlockCost || 10;
    const playerGoldCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number')
      ? window.gameState.player.coins
      : (typeof gameState !== 'undefined' && gameState.player && typeof gameState.player.coins === 'number' ? gameState.player.coins : 0);

    if (playerGoldCoins >= cost) {
      if (window.gameState && window.gameState.player) {
        window.gameState.player.coins -= cost;
      } else if (typeof gameState !== 'undefined' && gameState.player) {
        gameState.player.coins -= cost;
      }
      window._lastCurrencyDeductionTime = Date.now();
      if (typeof window.saveGame === 'function') window.saveGame(true);
      if (typeof window.updateUI === 'function') window.updateUI();
      if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
        window.firebaseSync.syncPlayerCurrenciesImmediate();
      }

      plot.unlocked = true;
      plot.boughtFirstLand = true;
      plot.level = 1;
      plot.plantStatus = 'alive';
      plot.growthTimer = 0;
      plot.lifeTimer = SF_LAND_BASE_LIFE_LIMITS[0] || 500;
      plot.timer = getSfPlotCycleTime(0, 1);
      plot.isWithered = false;
      plot.readyToCollect = false;
      plot.uncollectedCoins = 0;
      plot.lastTick = Date.now();

      sunflowerAudio.playUnlockChime();
      const posX = event ? event.clientX : window.innerWidth / 2;
      const posY = event ? event.clientY : window.innerHeight / 2;
      spawnSfFloat(`🎉 Land #1 Bought (-${cost} 🪙 Gold Coins)! Sunflower planted with 500s Life! 🌻`, posX, posY, 'text-amber-300 font-bold');

      // Auto-assign an idle land manager if player has one
      if (getIdleLandWorkersCount() > 0) {
        plot.hasWorker = true;
      }

      saveSunflowerStateDebounced();
      updateStickyHeaderAndMiniStats();
      renderSunflowerPlots();
      updateWorkersUI();
    } else {
      const posX = event ? event.clientX : window.innerWidth / 2;
      const posY = event ? event.clientY : window.innerHeight / 2;
      spawnSfFloat(`Need ${cost} 🪙 Gold Coins! Have: ${Math.floor(playerGoldCoins)} 🪙`, posX, posY, 'text-rose-400 font-bold');
    }
    return;
  }

  // LANDS 2 TO 20: Unlock with Star Coins (sunflowerState.diamonds / sunflowerState.starCoins)
  const cost = plot.unlockCost;
  const currentDiamonds = sunflowerState.diamonds;

  if (currentDiamonds >= cost) {
    sunflowerState.diamonds = currentDiamonds - cost;
    window._lastCurrencyDeductionTime = Date.now();
    if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
      window.firebaseSync.syncPlayerCurrenciesImmediate();
    }
    plot.unlocked = true;
    plot.level = 1;
    plot.plantStatus = 'alive';
    plot.growthTimer = 0;
    plot.lifeTimer = SF_LAND_BASE_LIFE_LIMITS[plotIndex] || 500;
    plot.timer = getSfPlotCycleTime(plotIndex, 1);
    plot.isWithered = false;
    plot.readyToCollect = false;
    plot.uncollectedCoins = 0;
    plot.lastTick = Date.now();

    sunflowerAudio.playUnlockChime();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`🎉 Land #${plot.id} Unlocked (-${cost} ⭐)! Sunflower planted with 500s Life! 🌻`, posX, posY, 'text-emerald-400 font-bold');

    // Auto-assign an idle land manager if player has one
    if (getIdleLandWorkersCount() > 0) {
      plot.hasWorker = true;
    }

    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerPlots();
    updateWorkersUI();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    const haveStr = typeof currentDiamonds === 'number' ? (currentDiamonds < 1 && currentDiamonds > 0 ? currentDiamonds.toFixed(6) : currentDiamonds) : 0;
    spawnSfFloat(`Need ${cost} ⭐ Star Coins! Have: ${haveStr} ⭐`, posX, posY, 'text-red-400 font-bold');
  }
};

// 6b. Start Water Surge Boost (Uses 1 ⚡ Energy)
window.startWaterCollectionSession = function(event = null) {
  const currentEnergy = (typeof window !== 'undefined' && window.gameState && window.gameState.reactor && typeof window.gameState.reactor.currentEnergy === 'number')
    ? window.gameState.reactor.currentEnergy
    : 0;

  if (currentEnergy < 1) {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat('Need 1 ⚡ Energy to activate Water Surge!', posX, posY, 'text-red-400');
    return;
  }

  // Deduct 1 ⚡ Energy
  window.gameState.reactor.currentEnergy -= 1;
  if (typeof window.updateUI === 'function') window.updateUI();
  if (typeof window.saveGame === 'function') window.saveGame(true);

  sunflowerState.waterSurgeTimer = (sunflowerState.waterSurgeTimer || 0) + 30.0;
  sunflowerState.baskets = (sunflowerState.baskets || 0) + 5;

  if (Array.isArray(sunflowerState.wells)) {
    sunflowerState.wells.forEach((w, idx) => {
      if (w.unlocked) {
        const basketsPerCycle = getSfWellBasketsPerCycle(idx, w.level);
        if (w.hasWorker) {
          sunflowerState.baskets = (sunflowerState.baskets || 0) + basketsPerCycle;
        } else {
          w.storedBaskets = (w.storedBaskets || 0) + basketsPerCycle;
        }
        w.productionTime = getSfWellCycleTime(idx, w.level);
        updateSingleWellUI(w.id, true);
      }
    });
  }

  const btn = document.getElementById('sfStartWaterCollectionBtn');
  if (btn) {
    btn.classList.add('collecting');
    btn.innerHTML = '<span>⚡ 2x Water Surge Active (30s)!</span>';
    setTimeout(() => {
      if (btn) {
        btn.classList.remove('collecting');
        btn.innerHTML = '<span>⚡ Start Water Surge (1 ⚡)</span>';
      }
    }, 30000);
  }

  sunflowerAudio.playSolarChime();
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat('⚡ Water Surge (2x Speed + 5 🧺 Buckets)!', posX, posY, 'text-cyan-300');
  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
};

// 7. Quick Tool: Plant All Empty Plots
window.plantAllSfPlots = function(event = null) {
  let planted = 0;
  sunflowerState.plots.forEach(p => {
    if (p.unlocked && p.plantStatus === 'empty' && sunflowerState.seeds > 0) {
      sunflowerState.seeds -= 1;
      p.plantStatus = 'growing';
      p.growthTimer = 30.0;
      p.growthDuration = 30.0;
      p.level = 1;
      p.lifeTimer = 0;
      p.isWithered = false;
      planted++;
    }
  });

  if (planted > 0) {
    sunflowerAudio.playTone(550, 'triangle', 0.15, 0.1);
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`🌱 Planted ${planted} Lands with Seeds!`, posX, posY, 'text-emerald-400');
    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerPlots();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat('No empty lands or seeds in inventory!', posX, posY, 'text-stone-400');
  }
};

// 8. Quick Tool: Water All Active Plots (Unlimited life extension & revival)
window.waterAllSfPlots = function(event = null) {
  let watered = 0;
  sunflowerState.plots.forEach((p, idx) => {
    if (p.unlocked && (p.plantStatus === 'alive' || p.plantStatus === 'dead') && sunflowerState.baskets > 0) {
      const bonus = getSfPlotWaterBonus(idx);
      sunflowerState.baskets -= 1;
      if (p.plantStatus === 'dead') {
        p.plantStatus = 'alive';
        p.isWithered = false;
        p.lifeTimer = bonus;
        p.timer = getSfPlotCycleTime(idx, p.level);
      } else {
        // Unlimited life filling without cap
        p.lifeTimer = (p.lifeTimer || 0) + bonus;
      }
      watered++;
    }
  });

  if (watered > 0) {
    sunflowerAudio.playWaterSplash();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`Watered ${watered} Lands! (Unlimited life added) 🧺`, posX, posY, 'text-cyan-300');
    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerPlots();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat('No water buckets available! Collect water at wells (Page 2) 💧', posX, posY, 'text-stone-400');
  }
};

// 9. Quick Tool: Shovel All Dead Plots
window.shovelAllSfPlots = function(event = null) {
  let cleared = 0;
  sunflowerState.plots.forEach(p => {
    if (p.unlocked && p.plantStatus === 'dead' && sunflowerState.shovels > 0) {
      sunflowerState.shovels -= 1;
      p.plantStatus = 'empty';
      p.isWithered = false;
      p.level = 1;
      p.growthTimer = 0;
      p.lifeTimer = 0;
      cleared++;
    }
  });

  if (cleared > 0) {
    sunflowerAudio.playTone(200, 'sawtooth', 0.2, 0.1);
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`Cleared ${cleared} Dead Lands! 🪏`, posX, posY, 'text-emerald-400');
    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerPlots();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat('No dead flowers to shovel!', posX, posY, 'text-stone-400');
  }
};

/* ==========================================================================
   SHOP ITEMS PURCHASING (Seeds, Buckets, Shovels)
   ========================================================================== */
window.buySunflowerItem = function(itemType, count = 1, currency = 'gold') {
  count = Number(count) || 1;
  const curr = String(currency || 'gold').toLowerCase();

  const isSeed = itemType === 'seed' || itemType === 'plant' || itemType === 'sprout';
  const isBucket = itemType === 'basket' || itemType === 'bucket';
  const isShovel = itemType === 'shovel';

  const posX = window.innerWidth / 2;
  const posY = window.innerHeight / 2;

  let cost = 0;
  let itemName = isSeed ? '🌱 Sunflower Seed' : isBucket ? '🪣 Water Buckets' : '🪏 Garden Shovel';

  if (curr === 'gold' || curr === 'goldcoins' || curr === 'main') {
    if (isSeed) cost = 200 * count;
    else if (isBucket) cost = count === 10 ? 250 : Math.ceil(25 * count);
    else if (isShovel) cost = 200 * count;

    const playerGold = window.getPlayerGoldCoins();
    if (playerGold < cost) {
      if (sunflowerAudio && sunflowerAudio.playErrorChime) sunflowerAudio.playErrorChime();
      spawnSfFloat(`❌ Need ${cost} 🪙 Gold Coins! (Have: ${Math.floor(playerGold)} 🪙)`, posX, posY, 'text-rose-400 font-bold');
      return;
    }
    window.deductPlayerGoldCoins(cost);

    if (isSeed) sunflowerState.seeds = (sunflowerState.seeds || 0) + count;
    else if (isBucket) sunflowerState.baskets = (sunflowerState.baskets || 0) + count;
    else if (isShovel) sunflowerState.shovels = (sunflowerState.shovels || 0) + count;

    saveSunflowerState();
    updateSunflowerHeaderUI();
    updateSunflowerShopUI();
    if (sunflowerAudio && sunflowerAudio.playBuySuccess) sunflowerAudio.playBuySuccess();
    else if (sunflowerAudio && sunflowerAudio.playTone) sunflowerAudio.playTone(600, 'triangle', 0.15, 0.1);

    spawnSfFloat(`🎉 ${itemName} Purchased! (-${cost} 🪙)`, posX, posY, 'text-emerald-400 font-black');
    return;
  }

  let priceCoins = 0;
  let priceDiamonds = 0;

  if (isSeed) {
    if (count === 1) { priceCoins = 50; priceDiamonds = 1; }
    else { priceCoins = 200; priceDiamonds = 4; }
  } else if (isBucket) {
    if (count === 1) { priceCoins = 25; priceDiamonds = 1; }
    else { priceCoins = 100; priceDiamonds = 2; }
  } else if (isShovel) {
    if (count === 1) { priceCoins = 10; priceDiamonds = 1; }
    else { priceCoins = 40; priceDiamonds = 3; }
  }

  const costVal = curr === 'diamonds' ? priceDiamonds : priceCoins;
  const balance = curr === 'diamonds' ? (sunflowerState.diamonds || 0) : (sunflowerState.coins || 0);

  if (balance < costVal) {
    const symbol = curr === 'diamonds' ? '⭐' : '🌻';
    spawnSfFloat(`❌ Not enough ${symbol}! Need ${costVal} ${symbol}`, posX, posY, 'text-red-400');
    return;
  }

  if (curr === 'diamonds') {
    sunflowerState.diamonds -= costVal;
    window._lastCurrencyDeductionTime = Date.now();
    if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
      try { window.firebaseSync.syncPlayerCurrenciesImmediate(); } catch (e) {}
    }
  } else {
    sunflowerState.coins -= costVal;
  }

  if (isSeed) sunflowerState.seeds = (sunflowerState.seeds || 0) + count;
  else if (isBucket) sunflowerState.baskets = (sunflowerState.baskets || 0) + count;
  else if (isShovel) sunflowerState.shovels = (sunflowerState.shovels || 0) + count;

  saveSunflowerState();
  updateSunflowerHeaderUI();
  updateSunflowerShopUI();
  if (sunflowerAudio && sunflowerAudio.playBuySuccess) sunflowerAudio.playBuySuccess();
  spawnSfFloat(`🎉 ${itemName} Purchased!`, posX, posY, 'text-emerald-400 font-black');
};


/* ==========================================================================
   WORKER & AUTOMATION HQ (Farming & Water Workers)
   ========================================================================== */
window.hireSunflowerWorker = function(workerKey) {
  const costs = {
    walter: { coins: 500, diamonds: 10, name: 'Walter (Well Master)' },
    chloe:  { coins: 3500, diamonds: 40, name: 'Chloe (Auto-Hydrator)' },
    dave:   { coins: 1500, diamonds: 25, name: 'Dave (Lands 1-5)' },
    elena:  { coins: 10000, diamonds: 50, name: 'Elena (Lands 6-10 +20%)' },
    leo:    { coins: 50000, diamonds: 100, name: 'Leo (Lands 11-20 2x Speed)' },
    barney: { coins: 5000, diamonds: 35, name: 'Barney (Auto-Planter)' }
  };

  const req = costs[workerKey];
  if (!req) return;

  if (sunflowerState.workers && sunflowerState.workers[workerKey]) {
    spawnSfFloat(`${req.name} is already working! ⚡`, window.innerWidth / 2, window.innerHeight / 2, 'text-yellow-400');
    return;
  }

  if (sunflowerState.coins >= req.coins) {
    sunflowerState.coins -= req.coins;
  } else if (sunflowerState.diamonds >= req.diamonds) {
    sunflowerState.diamonds -= req.diamonds;
  } else {
    spawnSfFloat(`Need ${req.coins} ☀️ Coins or ${req.diamonds} ⭐!`, window.innerWidth / 2, window.innerHeight / 2, 'text-red-400');
    return;
  }

  if (!sunflowerState.workers) sunflowerState.workers = {};
  sunflowerState.workers[workerKey] = true;

  sunflowerAudio.playUnlockChime();
  spawnSfFloat(`🎉 Hired ${req.name}!`, window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400');

  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  if (typeof renderSunflowerManagers === 'function') renderSunflowerManagers();
  updateWorkersUI();
};

/* ==========================================================================
   LAND MANAGERS SYSTEM (1 MANAGER = 1 LAND FIXED AUTOMATION)
   - Vertical stack of rectangle cards
   - Unlock: 300 ⭐
   - 1 Day use: 500, 1000, 1500, 2000... ☀️ OR 1 Ad
   ========================================================================== */
function formatContractDuration(seconds) {
  if (seconds <= 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
}

window.switchSunflowerManagerTab = function(tab) {
  if (sunflowerState) {
    sunflowerState.managerSubTab = tab;
  }
  const tabAll = document.getElementById('sfMgrTabAll');
  const tabSun = document.getElementById('sfMgrTabSunflower');
  const tabWater = document.getElementById('sfMgrTabWater');
  if (tabAll) tabAll.className = (tab === 'all') ? 'sf-mgr-subtab-btn active all' : 'sf-mgr-subtab-btn all';
  if (tabSun) tabSun.className = (tab === 'sunflower') ? 'sf-mgr-subtab-btn active sunflower' : 'sf-mgr-subtab-btn sunflower';
  if (tabWater) tabWater.className = (tab === 'water') ? 'sf-mgr-subtab-btn active water' : 'sf-mgr-subtab-btn water';

  renderSunflowerManagers();
};

function renderSunflowerManagers() {
  const listEl = document.getElementById('sfManagersVerticalList');
  if (!listEl) return;

  if (!Array.isArray(sunflowerState.managers) || sunflowerState.managers.length !== 20) {
    sunflowerState.managers = createDefaultSfManagers();
  }
  if (!Array.isArray(sunflowerState.wellManagers) || sunflowerState.wellManagers.length !== 20) {
    sunflowerState.wellManagers = createDefaultSfWellManagers();
  }

  const activeSunCount = sunflowerState.managers.filter(m => m.unlocked && m.activeTimer > 0).length;
  const activeWaterCount = sunflowerState.wellManagers.filter(m => m.unlocked && m.activeTimer > 0).length;

  const countBadge = document.getElementById('sfManagersSummaryLabel');
  const allBadge = document.getElementById('sfMgrAllActiveBadge');
  const sunBadge = document.getElementById('sfMgrSunflowerActiveBadge');
  const waterBadge = document.getElementById('sfMgrWaterActiveBadge');

  if (allBadge) allBadge.innerText = `${activeSunCount + activeWaterCount}/40`;
  if (sunBadge) sunBadge.innerText = `${activeSunCount}/20`;
  if (waterBadge) waterBadge.innerText = `${activeWaterCount}/20`;

  const currentTab = sunflowerState.managerSubTab || 'all';
  if (countBadge) {
    countBadge.innerText = currentTab === 'all'
      ? `${activeSunCount + activeWaterCount} / 40 Active`
      : (currentTab === 'water'
        ? `${activeWaterCount} / 20 Water Active`
        : `${activeSunCount} / 20 Sunflower Active`);
  }

  // Update tab switcher button classes
  const tabAll = document.getElementById('sfMgrTabAll');
  const tabSun = document.getElementById('sfMgrTabSunflower');
  const tabWater = document.getElementById('sfMgrTabWater');
  if (tabAll) tabAll.className = (currentTab === 'all') ? 'sf-mgr-subtab-btn active all' : 'sf-mgr-subtab-btn all';
  if (tabSun) tabSun.className = (currentTab === 'sunflower') ? 'sf-mgr-subtab-btn active sunflower' : 'sf-mgr-subtab-btn sunflower';
  if (tabWater) tabWater.className = (currentTab === 'water') ? 'sf-mgr-subtab-btn active water' : 'sf-mgr-subtab-btn water';

  const renderMgrCard = (mgr) => {
    const plot = sunflowerState.plots ? sunflowerState.plots[mgr.landId - 1] : null;
    const isPlotUnlocked = plot && plot.unlocked;
    const isActive = mgr.unlocked && mgr.activeTimer > 0;

    return `
      <div class="sf-mgr-card ${isActive ? 'active-contract' : (mgr.unlocked ? '' : 'locked')}" id="sfMgrCard-${mgr.landId}">
        <div class="sf-mgr-card-top">
          <div class="sf-mgr-info-left">
            <div class="sf-mgr-avatar-box">
              <span>${mgr.avatar || '👷‍♂️'}</span>
            </div>
            <div class="sf-mgr-title-box">
              <div class="sf-mgr-name">
                <span>🌻 Sunflower Manager #${mgr.landId}</span>
                <span class="text-[9px] bg-amber-950/80 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-700/60 font-mono">Land #${mgr.landId}</span>
              </div>
              <div class="sf-mgr-sub">
                <span>${isPlotUnlocked ? `Manages Land #${mgr.landId} • Auto-Water 🪣 &amp; Auto-Harvest 🌻` : `⚠️ Unlock Land #${mgr.landId} in Garden first`}</span>
              </div>
            </div>
          </div>
          <div class="sf-mgr-status-badge ${!mgr.unlocked ? 'locked' : (isActive ? 'active' : 'expired')}" id="sfMgrStatusBadge-${mgr.landId}">
            ${!mgr.unlocked ? '🔒 LOCKED' : (isActive ? `⚡ ${formatContractDuration(mgr.activeTimer)}` : '⏳ EXPIRED')}
          </div>
        </div>

        <div class="sf-mgr-actions-row" id="sfMgrActionsRow-${mgr.landId}">
          ${!mgr.unlocked ? `
            <button class="sf-mgr-unlock-btn" onclick="unlockLandManager(${mgr.landId}, event)" title="Unlock Sunflower Manager (Costs 300 🪙 Gold Coins)">
              <span>🪙 Hire Sunflower Manager (300 🪙 Gold Coins)</span>
            </button>
          ` : `
            <button class="sf-mgr-coin-btn bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 border border-yellow-400" onclick="hireLandManagerGoldCoins(${mgr.landId}, event)" title="Extend Manager by 24 Hours for 300 Gold Coins (Max 100h)">
              <span>🪙 300 🪙 (+24h)</span>
            </button>
            <button class="sf-mgr-ad-btn" onclick="hireLandManagerAd(${mgr.landId}, event)" title="Extend Manager by 24 Hours via Ad (Max 100h)">
              <span>📢 Ad (+24h)</span>
            </button>
          `}
        </div>
      </div>
    `;
  };

  const renderWellMgrCard = (wm) => {
    const well = sunflowerState.wells ? sunflowerState.wells[wm.wellId - 1] : null;
    const isWellUnlocked = well && well.unlocked;
    const isActive = wm.unlocked && wm.activeTimer > 0;

    return `
      <div class="sf-mgr-card water-card ${isActive ? 'active-contract' : (wm.unlocked ? '' : 'locked')}" id="sfWellMgrCard-${wm.wellId}">
        <div class="sf-mgr-card-top">
          <div class="sf-mgr-info-left">
            <div class="sf-mgr-avatar-box">
              <span>${wm.avatar || '💧'}</span>
            </div>
            <div class="sf-mgr-title-box">
              <div class="sf-mgr-name">
                <span>💧 Water Well Manager #${wm.wellId}</span>
                <span class="text-[9px] bg-cyan-950/80 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-700/60 font-mono">Well #${wm.wellId}</span>
              </div>
              <div class="sf-mgr-sub">
                <span>${isWellUnlocked ? `Manages Well #${wm.wellId} • Auto-Pumps &amp; Deposits Water Buckets 🪣` : `⚠️ Unlock Well #${wm.wellId} in Aquifer first`}</span>
              </div>
            </div>
          </div>
          <div class="sf-mgr-status-badge ${!wm.unlocked ? 'locked' : (isActive ? 'active' : 'expired')}" id="sfWellMgrStatusBadge-${wm.wellId}">
            ${!wm.unlocked ? '🔒 LOCKED' : (isActive ? `⚡ ${formatContractDuration(wm.activeTimer)}` : '⏳ EXPIRED')}
          </div>
        </div>

        <div class="sf-mgr-actions-row" id="sfWellMgrActionsRow-${wm.wellId}">
          ${!wm.unlocked ? `
            <button class="sf-mgr-unlock-btn" onclick="unlockWellManager(${wm.wellId}, event)" title="Unlock Water Well Manager (Costs 300 🪙 Gold Coins)">
              <span>🪙 Hire Water Manager (300 🪙 Gold Coins)</span>
            </button>
          ` : `
            <button class="sf-mgr-coin-btn bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 border border-yellow-400" onclick="hireWellManagerGoldCoins(${wm.wellId}, event)" title="Extend Manager by 24 Hours for 300 Gold Coins (Max 100h)">
              <span>🪙 300 🪙 (+24h)</span>
            </button>
            <button class="sf-mgr-ad-btn" onclick="hireWellManagerAd(${wm.wellId}, event)" title="Extend Manager by 24 Hours via Ad (Max 100h)">
              <span>📢 Ad (+24h)</span>
            </button>
          `}
        </div>
      </div>
    `;
  };

  let html = '';

  if (currentTab === 'all') {
    sunflowerState.managers.forEach(mgr => { html += renderMgrCard(mgr); });
    sunflowerState.wellManagers.forEach(wm => { html += renderWellMgrCard(wm); });
  } else if (currentTab === 'water') {
    sunflowerState.wellManagers.forEach(wm => { html += renderWellMgrCard(wm); });
  } else {
    sunflowerState.managers.forEach(mgr => { html += renderMgrCard(mgr); });
  }

  listEl.innerHTML = html;
}
window.renderSunflowerManagers = renderSunflowerManagers;

function updateSunflowerManagersLiveTimers() {
  const activeSunCount = Array.isArray(sunflowerState.managers) ? sunflowerState.managers.filter(m => m.unlocked && m.activeTimer > 0).length : 0;
  const activeWaterCount = Array.isArray(sunflowerState.wellManagers) ? sunflowerState.wellManagers.filter(m => m.unlocked && m.activeTimer > 0).length : 0;

  const allBadge = document.getElementById('sfMgrAllActiveBadge');
  const sunBadge = document.getElementById('sfMgrSunflowerActiveBadge');
  const waterBadge = document.getElementById('sfMgrWaterActiveBadge');
  if (allBadge) allBadge.innerText = `${activeSunCount + activeWaterCount}/40`;
  if (sunBadge) sunBadge.innerText = `${activeSunCount}/20`;
  if (waterBadge) waterBadge.innerText = `${activeWaterCount}/20`;

  if (sunflowerState.currentPage !== 4) return;

  const currentTab = sunflowerState.managerSubTab || 'all';
  const countBadge = document.getElementById('sfManagersSummaryLabel');
  if (countBadge) {
    countBadge.innerText = currentTab === 'all'
      ? `${activeSunCount + activeWaterCount} / 40 Active`
      : (currentTab === 'water'
        ? `${activeWaterCount} / 20 Water Active`
        : `${activeSunCount} / 20 Sunflower Active`);
  }

  if ((currentTab === 'all' || currentTab === 'sunflower') && Array.isArray(sunflowerState.managers)) {
    sunflowerState.managers.forEach(mgr => {
      const badge = document.getElementById(`sfMgrStatusBadge-${mgr.landId}`);
      if (badge && mgr.unlocked) {
        if (mgr.activeTimer > 0) {
          badge.className = 'sf-mgr-status-badge active';
          badge.innerText = `⚡ ${formatContractDuration(mgr.activeTimer)}`;
        } else {
          badge.className = 'sf-mgr-status-badge expired';
          badge.innerText = '⏳ EXPIRED';
        }
      }
    });
  }
  if ((currentTab === 'all' || currentTab === 'water') && Array.isArray(sunflowerState.wellManagers)) {
    sunflowerState.wellManagers.forEach(wm => {
      const badge = document.getElementById(`sfWellMgrStatusBadge-${wm.wellId}`);
      if (badge && wm.unlocked) {
        if (wm.activeTimer > 0) {
          badge.className = 'sf-mgr-status-badge active';
          badge.innerText = `⚡ ${formatContractDuration(wm.activeTimer)}`;
        } else {
          badge.className = 'sf-mgr-status-badge expired';
          badge.innerText = '⏳ EXPIRED';
        }
      }
    });
  }
}
window.updateSunflowerManagersLiveTimers = updateSunflowerManagersLiveTimers;

window.unlockLandManager = function(landId, event) {
  if (event) event.stopPropagation();
  const mgr = sunflowerState.managers ? sunflowerState.managers.find(m => m.landId === landId) : null;
  if (!mgr) return;

  const playerCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number') ? window.gameState.player.coins : 0;
  if (playerCoins < 300) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`❌ Need 300 🪙 Gold Coins! You have ${Math.floor(playerCoins)} 🪙`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
    return;
  }

  // Deduct 300 Gold Coins
  if (window.gameState && window.gameState.player) {
    window.gameState.player.coins -= 300;
    window._lastCurrencyDeductionTime = Date.now();
    if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
      window.firebaseSync.syncPlayerCurrenciesImmediate();
    }
  }
  mgr.unlocked = true;
  mgr.activeTimer = Math.min(360000, 86400); // 1 full day (24 hours, max 100 hours)
  sunflowerState.landWorkersCount = (sunflowerState.landWorkersCount || 0) + 1;
  if (sunflowerState.plots && sunflowerState.plots[landId - 1]) {
    sunflowerState.plots[landId - 1].hasWorker = true;
  }

  if (sunflowerAudio && sunflowerAudio.playUnlockChime) sunflowerAudio.playUnlockChime();
  spawnSfFloat(`🎉 Hired Sunflower Manager #${landId} for 300 🪙 Gold Coins! Active for 24h!`, window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400 font-bold');

  if (typeof window.updateUI === 'function') window.updateUI();
  if (typeof window.saveGame === 'function') window.saveGame(true);
  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  renderSunflowerManagers();
  if (typeof renderSunflowerPlots === 'function') renderSunflowerPlots();
};

window.hireLandManagerGoldCoins = function(landId, event) {
  if (event) event.stopPropagation();
  const mgr = sunflowerState.managers ? sunflowerState.managers.find(m => m.landId === landId) : null;
  if (!mgr || !mgr.unlocked) return;

  const MAX_LIMIT = 360000; // 100 hours in seconds
  if ((mgr.activeTimer || 0) >= MAX_LIMIT) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`⚠️ Manager #${landId} is already at the maximum 100 Hours limit!`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400 font-bold');
    return;
  }

  const playerCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number') ? window.gameState.player.coins : 0;
  if (playerCoins < 300) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`❌ Need 300 🪙 Gold Coins! You have ${Math.floor(playerCoins)} 🪙`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
    return;
  }

  if (window.gameState && window.gameState.player) {
    window.gameState.player.coins -= 300;
    window._lastCurrencyDeductionTime = Date.now();
    if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
      window.firebaseSync.syncPlayerCurrenciesImmediate();
    }
  }
  mgr.activeTimer = Math.min(MAX_LIMIT, (mgr.activeTimer > 0 ? mgr.activeTimer : 0) + 86400); // +24 hours
  if (sunflowerState.plots && sunflowerState.plots[landId - 1]) {
    sunflowerState.plots[landId - 1].hasWorker = true;
  }

  if (sunflowerAudio && sunflowerAudio.playSolarChime) sunflowerAudio.playSolarChime();
  spawnSfFloat(`🪙 Sunflower Manager #${landId} extended +24 Hours! (-300 🪙 Gold Coins)`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-300 font-bold');

  if (typeof window.updateUI === 'function') window.updateUI();
  if (typeof window.saveGame === 'function') window.saveGame(true);
  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  renderSunflowerManagers();
};
window.hireLandManagerDiamonds = window.hireLandManagerGoldCoins; // alias for compatibility

window.unlockWellManager = function(wellId, event) {
  if (event) event.stopPropagation();
  const wm = sunflowerState.wellManagers ? sunflowerState.wellManagers.find(m => m.wellId === wellId) : null;
  if (!wm) return;

  const playerCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number') ? window.gameState.player.coins : 0;
  if (playerCoins < 300) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`❌ Need 300 🪙 Gold Coins! You have ${Math.floor(playerCoins)} 🪙`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
    return;
  }

  // Deduct 300 Gold Coins
  if (window.gameState && window.gameState.player) {
    window.gameState.player.coins -= 300;
    window._lastCurrencyDeductionTime = Date.now();
    if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
      window.firebaseSync.syncPlayerCurrenciesImmediate();
    }
  }
  wm.unlocked = true;
  wm.activeTimer = Math.min(360000, 86400); // 24 hours
  sunflowerState.wellWorkersCount = (sunflowerState.wellWorkersCount || 0) + 1;
  if (sunflowerState.wells && sunflowerState.wells[wellId - 1]) {
    sunflowerState.wells[wellId - 1].hasWorker = true;
  }

  if (sunflowerAudio && sunflowerAudio.playUnlockChime) sunflowerAudio.playUnlockChime();
  spawnSfFloat(`🎉 Hired Water Well Manager #${wellId} for 300 🪙 Gold Coins! Active for 24h!`, window.innerWidth / 2, window.innerHeight / 2, 'text-cyan-400 font-bold');

  if (typeof window.updateUI === 'function') window.updateUI();
  if (typeof window.saveGame === 'function') window.saveGame(true);
  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  renderSunflowerManagers();
  if (typeof renderSunflowerWells === 'function') renderSunflowerWells();
};

window.hireWellManagerGoldCoins = function(wellId, event) {
  if (event) event.stopPropagation();
  const wm = sunflowerState.wellManagers ? sunflowerState.wellManagers.find(m => m.wellId === wellId) : null;
  if (!wm || !wm.unlocked) return;

  const MAX_LIMIT = 360000;
  if ((wm.activeTimer || 0) >= MAX_LIMIT) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`⚠️ Well Manager #${wellId} is already at max 100 Hours limit!`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400 font-bold');
    return;
  }

  const playerCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number') ? window.gameState.player.coins : 0;
  if (playerCoins < 300) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`❌ Need 300 🪙 Gold Coins! You have ${Math.floor(playerCoins)} 🪙`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
    return;
  }

  if (window.gameState && window.gameState.player) {
    window.gameState.player.coins -= 300;
    window._lastCurrencyDeductionTime = Date.now();
    if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
      window.firebaseSync.syncPlayerCurrenciesImmediate();
    }
  }
  wm.activeTimer = Math.min(MAX_LIMIT, (wm.activeTimer > 0 ? wm.activeTimer : 0) + 86400);
  if (sunflowerState.wells && sunflowerState.wells[wellId - 1]) {
    sunflowerState.wells[wellId - 1].hasWorker = true;
  }

  if (sunflowerAudio && sunflowerAudio.playSolarChime) sunflowerAudio.playSolarChime();
  spawnSfFloat(`🪙 Water Manager #${wellId} extended +24 Hours! (-300 🪙 Gold Coins)`, window.innerWidth / 2, window.innerHeight / 2, 'text-cyan-300 font-bold');

  if (typeof window.updateUI === 'function') window.updateUI();
  if (typeof window.saveGame === 'function') window.saveGame(true);
  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  renderSunflowerManagers();
};

window.hireWellManagerCoins = function(wellId, event) {
  if (event) event.stopPropagation();
  const wm = sunflowerState.wellManagers ? sunflowerState.wellManagers.find(m => m.wellId === wellId) : null;
  if (!wm || !wm.unlocked) return;

  const MAX_LIMIT = 360000;
  if ((wm.activeTimer || 0) >= MAX_LIMIT) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`⚠️ Well Manager #${wellId} is already at max 100 Hours limit!`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400 font-bold');
    return;
  }

  const cost = (wm.hireCount + 1) * 500;
  if ((sunflowerState.coins || 0) < cost) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`❌ Need ${formatNumber(cost)} ☀️ Coins!`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
    return;
  }

  sunflowerState.coins -= cost;
  wm.hireCount++;
  wm.activeTimer = Math.min(MAX_LIMIT, (wm.activeTimer > 0 ? wm.activeTimer : 0) + 86400);
  if (sunflowerState.wells && sunflowerState.wells[wellId - 1]) {
    sunflowerState.wells[wellId - 1].hasWorker = true;
  }

  if (sunflowerAudio && sunflowerAudio.playSolarChime) sunflowerAudio.playSolarChime();
  spawnSfFloat(`⚡ Water Manager #${wellId} active +24 Hours!`, window.innerWidth / 2, window.innerHeight / 2, 'text-cyan-300 font-bold');

  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  renderSunflowerManagers();
};

window.hireWellManagerAd = function(wellId, event) {
  if (event) event.stopPropagation();
  const wm = sunflowerState.wellManagers ? sunflowerState.wellManagers.find(m => m.wellId === wellId) : null;
  if (!wm || !wm.unlocked) return;

  const MAX_LIMIT = 360000;
  if ((wm.activeTimer || 0) >= MAX_LIMIT) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`⚠️ Well Manager #${wellId} is already at max 100 Hours limit!`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400 font-bold');
    return;
  }

  const onAdCompleted = function(success) {
    if (success !== false) {
      wm.activeTimer = Math.min(MAX_LIMIT, (wm.activeTimer > 0 ? wm.activeTimer : 0) + 86400); // +24h
      if (sunflowerState.wells && sunflowerState.wells[wellId - 1]) {
        sunflowerState.wells[wellId - 1].hasWorker = true;
      }
      if (sunflowerAudio && sunflowerAudio.playSolarChime) sunflowerAudio.playSolarChime();
      spawnSfFloat(`🎬 Water Manager #${wellId} extended +24 Hours!`, window.innerWidth / 2, window.innerHeight / 2, 'text-cyan-300 font-bold');
      saveSunflowerStateDebounced();
      updateStickyHeaderAndMiniStats();
      renderSunflowerManagers();
    }
  };

  if (typeof window.showRewardedAd === 'function') {
    window.showRewardedAd(onAdCompleted, {
      adTitle: `Water Manager #${wellId} (+24 Hours Contract)`,
      adDesc: `Watch a video to extend Water Well #${wellId} Manager by 24 Hours!`
    });
  } else {
    onAdCompleted(true);
  }
};

window.hireLandManagerCoins = function(landId, event) {
  if (event) event.stopPropagation();
  const mgr = sunflowerState.managers ? sunflowerState.managers.find(m => m.landId === landId) : null;
  if (!mgr || !mgr.unlocked) return;

  const MAX_LIMIT = 360000; // 100 hours in seconds
  if ((mgr.activeTimer || 0) >= MAX_LIMIT) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`⚠️ Manager #${landId} is already at the maximum 100 Hours limit!`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400 font-bold');
    return;
  }

  const cost = (mgr.hireCount + 1) * 500;
  if ((sunflowerState.coins || 0) < cost) {
    sunflowerAudio.playWitherSound();
    spawnSfFloat(`❌ Need ${formatNumber(cost)} ☀️ Coins!`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
    return;
  }

  sunflowerState.coins -= cost;
  mgr.hireCount++;
  mgr.activeTimer = Math.min(MAX_LIMIT, (mgr.activeTimer > 0 ? mgr.activeTimer : 0) + 86400);

  sunflowerAudio.playSolarChime();
  spawnSfFloat(`⚡ Sunflower Manager #${landId} active +24 Hours! (Max 100h limit)`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400 font-bold');

  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  renderSunflowerManagers();
};

window.hireLandManagerAd = function(landId, event) {
  if (event) event.stopPropagation();
  const mgr = sunflowerState.managers ? sunflowerState.managers.find(m => m.landId === landId) : null;
  if (!mgr || !mgr.unlocked) return;

  const MAX_LIMIT = 360000; // 100 hours in seconds
  if ((mgr.activeTimer || 0) >= MAX_LIMIT) {
    if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
    spawnSfFloat(`⚠️ Manager #${landId} is already at the maximum 100 Hours limit!`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400 font-bold');
    return;
  }

  const onAdCompleted = function(success) {
    if (success !== false) {
      mgr.activeTimer = Math.min(MAX_LIMIT, (mgr.activeTimer > 0 ? mgr.activeTimer : 0) + 86400); // +24 hours
      sunflowerAudio.playSolarChime();
      spawnSfFloat(`🎬 Manager #${landId} extended +24 Hours! (Max 100h limit)`, window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400 font-bold');
      saveSunflowerStateDebounced();
      updateStickyHeaderAndMiniStats();
      renderSunflowerManagers();
    }
  };

  if (typeof window.showRewardedAd === 'function') {
    window.showRewardedAd(onAdCompleted, {
      adTitle: `Manager #${landId} (+24 Hours Contract)`,
      adDesc: `Watch a short sponsor video to extend Land #${landId} Manager by 24 Hours!`
    });
  } else {
    onAdCompleted(true);
  }
};

function updateWorkersUI() {
  const keys = ['walter', 'chloe', 'dave', 'elena', 'leo', 'barney'];
  keys.forEach(k => {
    const isHired = sunflowerState.workers && sunflowerState.workers[k];
    const badge = document.getElementById(`sfWorkerBadge${capitalize(k)}`);
    const btn = document.getElementById(`sfHireWorker${capitalize(k)}Btn`);
    if (badge) {
      if (isHired) {
        badge.className = "text-[9px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/50";
        badge.innerText = "Active ⚡";
      } else {
        badge.className = "text-[9px] bg-stone-800 text-stone-400 font-bold px-2 py-0.5 rounded-full border border-stone-700";
        badge.innerText = "Not Hired";
      }
    }
    if (btn && isHired) {
      btn.innerText = "✓ Active Automation";
      btn.className = "w-full bg-stone-800 text-emerald-400 font-bold text-xs py-2 rounded-xl cursor-default border border-emerald-500/40";
      btn.disabled = true;
    }
  });

  // Well Automation Worker Allocation & Mini Matrix
  const hiredCount = sunflowerState.wellWorkersCount || 0;
  const assignedCount = getAssignedWellWorkersCount();
  const idleCount = getIdleWellWorkersCount();

  const hiredBadge = document.getElementById('sfWellWorkerBadge');
  const hiredCountEl = document.getElementById('sfWellWorkersHiredCount');
  const statHired = document.getElementById('sfWorkerStatHired');
  const statAssigned = document.getElementById('sfWorkerStatAssigned');
  const statIdle = document.getElementById('sfWorkerStatIdle');

  if (hiredCountEl) hiredCountEl.innerText = hiredCount;
  if (statHired) statHired.innerText = hiredCount;
  if (statAssigned) statAssigned.innerText = assignedCount;
  if (statIdle) statIdle.innerText = idleCount;

  if (hiredBadge) {
    if (hiredCount >= 20) {
      hiredBadge.innerText = '20 / 20 Max Hired ★';
      hiredBadge.className = 'text-[9.5px] bg-emerald-950 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/50';
    } else {
      hiredBadge.innerText = `${hiredCount} / 20 Hired`;
    }
  }

  // 20 Wells Mini Chip Grid on Workers Page
  const miniGrid = document.getElementById('sfWellWorkerMiniGrid');
  if (miniGrid && Array.isArray(sunflowerState.wells)) {
    miniGrid.innerHTML = '';
    sunflowerState.wells.forEach(w => {
      const chip = document.createElement('div');
      if (!w.unlocked) {
        chip.className = 'sf-well-mini-chip locked';
        chip.title = `Well #${w.id} is locked. Unlock on Page 2!`;
        chip.innerHTML = `<span>#${w.id}</span><span>🔒</span>`;
      } else if (w.hasWorker) {
        chip.className = 'sf-well-mini-chip assigned';
        chip.title = `Well #${w.id} has an active worker! Click to recall/unassign.`;
        chip.innerHTML = `<span>#${w.id}</span><span>👷</span>`;
        chip.onclick = (e) => toggleWellWorkerAssignment(w.id, e);
      } else {
        chip.className = 'sf-well-mini-chip unassigned';
        chip.title = idleCount > 0 ? `Well #${w.id} has no worker. Click to assign an idle worker!` : `Well #${w.id} has no worker. Hire workers above!`;
        chip.innerHTML = `<span>#${w.id}</span><span>⛲</span>`;
        chip.onclick = (e) => toggleWellWorkerAssignment(w.id, e);
      }
      miniGrid.appendChild(chip);
    });
  }

  // Land Automation Manager Allocation & Mini Matrix
  const hiredLandCount = sunflowerState.landWorkersCount || 0;
  const assignedLandCount = getAssignedLandWorkersCount();
  const idleLandCount = getIdleLandWorkersCount();

  const landHiredBadge = document.getElementById('sfLandWorkerBadge');
  const landHiredCountEl = document.getElementById('sfLandWorkersHiredCount');
  const landStatHired = document.getElementById('sfLandWorkerStatHired');
  const landStatAssigned = document.getElementById('sfLandWorkerStatAssigned');
  const landStatIdle = document.getElementById('sfLandWorkerStatIdle');

  if (landHiredCountEl) landHiredCountEl.innerText = hiredLandCount;
  if (landStatHired) landStatHired.innerText = hiredLandCount;
  if (landStatAssigned) landStatAssigned.innerText = assignedLandCount;
  if (landStatIdle) landStatIdle.innerText = idleLandCount;

  if (landHiredBadge) {
    if (hiredLandCount >= 20) {
      landHiredBadge.innerText = '20 / 20 Max Hired ★';
      landHiredBadge.className = 'text-[9.5px] bg-emerald-950 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/50';
    } else {
      landHiredBadge.innerText = `${hiredLandCount} / 20 Hired`;
    }
  }

  // 20 Lands Mini Chip Grid on Workers Page
  const landMiniGrid = document.getElementById('sfLandWorkerMiniGrid');
  if (landMiniGrid && Array.isArray(sunflowerState.plots)) {
    landMiniGrid.innerHTML = '';
    sunflowerState.plots.forEach(p => {
      const chip = document.createElement('div');
      if (!p.unlocked) {
        chip.className = 'sf-land-mini-chip locked';
        chip.title = `Land #${p.id} is locked. Unlock on Page 1!`;
        chip.innerHTML = `<span>#${p.id}</span><span>🔒</span>`;
      } else if (p.hasWorker) {
        chip.className = 'sf-land-mini-chip assigned';
        chip.title = `Land #${p.id} has an active manager! Click to recall/unassign.`;
        chip.innerHTML = `<span>#${p.id}</span><span>👷</span>`;
        chip.onclick = (e) => toggleLandWorkerAssignment(p.id, e);
      } else {
        chip.className = 'sf-land-mini-chip unassigned';
        chip.title = idleLandCount > 0 ? `Land #${p.id} has no manager. Click to assign an idle manager!` : `Land #${p.id} has no manager. Hire managers above!`;
        chip.innerHTML = `<span>#${p.id}</span><span>🌾</span>`;
        chip.onclick = (e) => toggleLandWorkerAssignment(p.id, e);
      }
      landMiniGrid.appendChild(chip);
    });
  }
}

/* ==========================================================================
   20 WELLS AQUIFER ACTIONS & WELL WORKERS AUTOMATION
   ========================================================================== */

function clickWaterCoin(wellId, event = null) {
  const wellIndex = wellId - 1;
  const well = sunflowerState.wells[wellIndex];
  if (!well || !well.unlocked) return;

  const posX = event && event.clientX ? event.clientX : window.innerWidth / 2;
  const posY = event && event.clientY ? event.clientY : window.innerHeight / 2;

  // Add click ripple / animation to the coin element
  const coinEl = document.getElementById(`sfWaterCoin-${wellId}`);
  if (coinEl) {
    coinEl.classList.remove('coin-pressed');
    void coinEl.offsetWidth;
    coinEl.classList.add('coin-pressed');
    setTimeout(() => coinEl.classList.remove('coin-pressed'), 180);
  }

  const stored = well.storedBaskets || 0;
  if (stored > 0) {
    sunflowerState.baskets = (sunflowerState.baskets || 0) + stored;
    well.storedBaskets = 0;
    sunflowerAudio.playWaterSplash();
    spawnSfFloat(`+${stored} Water Baskets Collected! 🧺`, posX, posY, 'text-cyan-300 font-black');
  } else {
    well.timer = Math.max(0.1, (well.timer || 1) - 1.0);
    sunflowerAudio.playWaterSplash();
    spawnSfFloat(`🌊 Pump Boost (-1s)! (${Math.ceil(well.timer)}s left)`, posX, posY, 'text-cyan-300 font-bold');
  }

  well.isProducing = true;
  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  updateSingleWellUI(wellId);
}
window.clickWaterCoin = clickWaterCoin;

// 1. Collect Stored Baskets from a Single Well (Manual)
window.collectWellBaskets = function(wellId, event = null) {
  clickWaterCoin(wellId, event);
};

// 2. Quick Tool: Collect from All Ready Wells at Once
window.collectAllWellsBaskets = function(event = null) {
  let totalCollected = 0;
  if (Array.isArray(sunflowerState.wells)) {
    sunflowerState.wells.forEach((w, idx) => {
      if (w.unlocked) {
        if (w.storedBaskets > 0) {
          totalCollected += w.storedBaskets;
          w.storedBaskets = 0;
        }
        w.isProducing = true;
        updateSingleWellUI(w.id);
      }
    });
  }

  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;

  if (totalCollected > 0) {
    sunflowerState.baskets = (sunflowerState.baskets || 0) + totalCollected;
    sunflowerAudio.playWaterSplash();
    spawnSfFloat(`+${totalCollected} Water Baskets Collected! 🧺`, posX, posY, 'text-cyan-300 font-bold');
    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
  } else {
    spawnSfFloat(`All wells are actively pumping! 🌊`, posX, posY, 'text-stone-400');
  }
};

// 3. Assign an Idle Well Worker/Manager to a Well
window.assignWellWorker = function(wellId, event = null) {
  const wellIndex = wellId - 1;
  const well = sunflowerState.wells[wellIndex];
  if (!well || !well.unlocked) return;

  if (well.hasWorker) {
    spawnSfFloat(`Well #${wellId} already has an automated manager!`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400');
    return;
  }

  const idle = getIdleWellWorkersCount();
  if (idle <= 0) {
    hireWellWorker('coins');
    return;
  }

  well.hasWorker = true;
  well.isProducing = true; // Manager automatically starts/clicks production!
  if (!well.timer || well.timer <= 0) {
    well.timer = getSfWellCycleTime(wellIndex, well.level);
  }

  sunflowerAudio.playTone(640, 'triangle', 0.16, 0.1);
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat(`👷 Well Manager Assigned to Well #${wellId}! Auto-production activated! ⚡`, posX, posY, 'text-emerald-400 font-bold');

  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  updateSingleWellUI(wellId);
  updateWorkersUI();
};

// 4. Recall / Unassign a Worker/Manager from a Well
window.unassignWellWorker = function(wellId, event = null) {
  const wellIndex = wellId - 1;
  const well = sunflowerState.wells[wellIndex];
  if (!well || !well.hasWorker) return;

  well.hasWorker = false;
  sunflowerAudio.playTone(400, 'sine', 0.12, 0.08);
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat(`👷 Manager recalled from Well #${wellId}! Now in manual mode.`, posX, posY, 'text-amber-400');

  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  updateSingleWellUI(wellId);
  updateWorkersUI();
};

// 5. Toggle Worker/Manager Assignment on a Well
window.toggleWellWorkerAssignment = function(wellId, event = null) {
  const wellIndex = wellId - 1;
  const well = sunflowerState.wells[wellIndex];
  if (!well || !well.unlocked) return;

  if (well.hasWorker) {
    unassignWellWorker(wellId, event);
  } else {
    assignWellWorker(wellId, event);
  }
};

// 6. Auto-Assign All Idle Workers to Unlocked Wells
window.autoAssignAllWellWorkers = function(event = null) {
  let assignedCount = 0;
  let idle = getIdleWellWorkersCount();

  if (Array.isArray(sunflowerState.wells)) {
    sunflowerState.wells.forEach(w => {
      if (w.unlocked && !w.hasWorker && idle > 0) {
        w.hasWorker = true;
        idle--;
        assignedCount++;
        updateSingleWellUI(w.id);
      }
    });
  }

  if (assignedCount > 0) {
    sunflowerAudio.playUnlockChime();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`⚡ Auto-assigned ${assignedCount} Well Workers!`, posX, posY, 'text-emerald-400');
    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    updateWorkersUI();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`No available idle workers to assign!`, posX, posY, 'text-stone-400');
  }
};

// 7. Hire a Well Worker (Repeatable for up to 20 Wells)
window.hireWellWorker = function(currency = 'coins') {
  const currentCount = sunflowerState.wellWorkersCount || 0;
  if (currentCount >= 20) {
    spawnSfFloat(`Max 20 Well Workers already hired (1 for each well)! ⚡`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400');
    return;
  }

  const costCoins = 250;
  const costGoldCoins = 5;

  if (currency === 'coins') {
    if (sunflowerState.coins >= costCoins) {
      sunflowerState.coins -= costCoins;
      sunflowerState.wellWorkersCount = currentCount + 1;
      sunflowerAudio.playUnlockChime();
      spawnSfFloat(`🎉 Hired Well Worker #${sunflowerState.wellWorkersCount}!`, window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400');
      // Auto-assign to first unlocked well without worker
      const freeWell = sunflowerState.wells.find(w => w.unlocked && !w.hasWorker);
      if (freeWell) {
        freeWell.hasWorker = true;
        spawnSfFloat(`⚡ Auto-assigned to Well #${freeWell.id}!`, window.innerWidth / 2, window.innerHeight / 2 + 30, 'text-cyan-300');
      }
      saveSunflowerStateDebounced();
      updateStickyHeaderAndMiniStats();
      renderSunflowerWells();
      updateWorkersUI();
    } else {
      spawnSfFloat(`Need ${costCoins} ☀️ Coins to hire a Well Worker!`, window.innerWidth / 2, window.innerHeight / 2, 'text-red-400');
    }
  } else {
    const playerCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number') ? window.gameState.player.coins : 0;
    if (playerCoins >= costGoldCoins) {
      if (window.gameState && window.gameState.player) {
        window.gameState.player.coins -= costGoldCoins;
        window._lastCurrencyDeductionTime = Date.now();
        if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
          window.firebaseSync.syncPlayerCurrenciesImmediate();
        }
      }
      sunflowerState.wellWorkersCount = currentCount + 1;
      sunflowerAudio.playUnlockChime();
      spawnSfFloat(`🎉 Hired Well Worker #${sunflowerState.wellWorkersCount}! (-5 🪙 Gold Coins)`, window.innerWidth / 2, window.innerHeight / 2, 'text-cyan-400');
      const freeWell = sunflowerState.wells.find(w => w.unlocked && !w.hasWorker);
      if (freeWell) {
        freeWell.hasWorker = true;
        spawnSfFloat(`⚡ Auto-assigned to Well #${freeWell.id}!`, window.innerWidth / 2, window.innerHeight / 2 + 30, 'text-cyan-300');
      }
      if (typeof window.updateUI === 'function') window.updateUI();
      if (typeof window.saveGame === 'function') window.saveGame(true);
      saveSunflowerStateDebounced();
      updateStickyHeaderAndMiniStats();
      renderSunflowerWells();
      updateWorkersUI();
    } else {
      spawnSfFloat(`Need ${costGoldCoins} 🪙 Gold Coins to hire a Well Worker!`, window.innerWidth / 2, window.innerHeight / 2, 'text-red-400');
    }
  }
};

/* ==========================================================================
   20 LANDS DEDICATED LAND MANAGER AUTOMATION (Per-Land Manager)
   ========================================================================== */

// 1. Assign an Idle Land Manager to a Land Plot
function assignLandWorker(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked) return;

  if (plot.hasWorker) {
    spawnSfFloat(`Land #${plotId} already has an automated manager!`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400');
    return;
  }

  const idle = getIdleLandWorkersCount();
  if (idle <= 0) {
    hireLandWorker('coins');
    return;
  }

  plot.hasWorker = true;
  sunflowerAudio.playTone(640, 'triangle', 0.16, 0.1);
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat(`👷 Land Manager Assigned to Land #${plotId}! Auto-water, harvest & cycle management active! ⚡`, posX, posY, 'text-emerald-400 font-bold');

  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  renderSunflowerPlots();
  updateWorkersUI();
}
window.assignLandWorker = assignLandWorker;

// 2. Recall / Unassign a Manager from a Land Plot
function unassignLandWorker(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.hasWorker) return;

  plot.hasWorker = false;
  sunflowerAudio.playTone(400, 'sine', 0.12, 0.08);
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat(`👷 Manager recalled from Land #${plotId}! Manual farming mode.`, posX, posY, 'text-amber-400');

  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
  renderSunflowerPlots();
  updateWorkersUI();
}
window.unassignLandWorker = unassignLandWorker;

// 3. Toggle Manager Assignment on a Land Plot
function toggleLandWorkerAssignment(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked) return;

  if (plot.hasWorker) {
    unassignLandWorker(plotId, event);
  } else {
    assignLandWorker(plotId, event);
  }
}
window.toggleLandWorkerAssignment = toggleLandWorkerAssignment;

// 4. Auto-Assign All Idle Managers to Unlocked Lands
function autoAssignAllLandWorkers(event = null) {
  let assignedCount = 0;
  let idle = getIdleLandWorkersCount();

  if (Array.isArray(sunflowerState.plots)) {
    sunflowerState.plots.forEach(p => {
      if (p.unlocked && !p.hasWorker && idle > 0) {
        p.hasWorker = true;
        idle--;
        assignedCount++;
      }
    });
  }

  if (assignedCount > 0) {
    sunflowerAudio.playUnlockChime();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`⚡ Auto-assigned ${assignedCount} Land Managers!`, posX, posY, 'text-emerald-400 font-bold');
    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerPlots();
    updateWorkersUI();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`No available idle managers to assign!`, posX, posY, 'text-stone-400');
  }
}
window.autoAssignAllLandWorkers = autoAssignAllLandWorkers;

// 5. Hire a Land Manager (Repeatable for up to 20 Lands)
function hireLandWorker(currency = 'coins') {
  const currentCount = sunflowerState.landWorkersCount || 0;
  if (currentCount >= 20) {
    spawnSfFloat(`Max 20 Land Managers already hired (1 for each land plot)! 🌾`, window.innerWidth / 2, window.innerHeight / 2, 'text-amber-400');
    return;
  }

  const costCoins = 250;
  const costGoldCoins = 5;

  if (currency === 'coins') {
    if (sunflowerState.coins >= costCoins) {
      sunflowerState.coins -= costCoins;
      sunflowerState.landWorkersCount = currentCount + 1;
      sunflowerAudio.playUnlockChime();
      spawnSfFloat(`🎉 Hired Land Manager #${sunflowerState.landWorkersCount}!`, window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400 font-bold');
      // Auto-assign to first unlocked plot without manager
      const freePlot = sunflowerState.plots.find(p => p.unlocked && !p.hasWorker);
      if (freePlot) {
        freePlot.hasWorker = true;
        spawnSfFloat(`⚡ Auto-assigned to Land #${freePlot.id}!`, window.innerWidth / 2, window.innerHeight / 2 + 30, 'text-amber-300');
      }
      saveSunflowerStateDebounced();
      updateStickyHeaderAndMiniStats();
      renderSunflowerPlots();
      updateWorkersUI();
    } else {
      spawnSfFloat(`Need ${costCoins} ☀️ Coins to hire a Land Manager!`, window.innerWidth / 2, window.innerHeight / 2, 'text-red-400');
    }
  } else {
    const playerCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number') ? window.gameState.player.coins : 0;
    if (playerCoins >= costGoldCoins) {
      if (window.gameState && window.gameState.player) {
        window.gameState.player.coins -= costGoldCoins;
        window._lastCurrencyDeductionTime = Date.now();
        if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
          window.firebaseSync.syncPlayerCurrenciesImmediate();
        }
      }
      sunflowerState.landWorkersCount = currentCount + 1;
      sunflowerAudio.playUnlockChime();
      spawnSfFloat(`🎉 Hired Land Manager #${sunflowerState.landWorkersCount}! (-5 🪙 Gold Coins)`, window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400 font-bold');
      const freePlot = sunflowerState.plots.find(p => p.unlocked && !p.hasWorker);
      if (freePlot) {
        freePlot.hasWorker = true;
        spawnSfFloat(`⚡ Auto-assigned to Land #${freePlot.id}!`, window.innerWidth / 2, window.innerHeight / 2 + 30, 'text-amber-300');
      }
      if (typeof window.updateUI === 'function') window.updateUI();
      if (typeof window.saveGame === 'function') window.saveGame(true);
      saveSunflowerStateDebounced();
      updateStickyHeaderAndMiniStats();
      renderSunflowerPlots();
      updateWorkersUI();
    } else {
      spawnSfFloat(`Need ${costGoldCoins} 🪙 Gold Coins to hire a Land Manager!`, window.innerWidth / 2, window.innerHeight / 2, 'text-red-400');
    }
  }
}
window.hireLandWorker = hireLandWorker;

// 8. Unlock a Locked Well with Star Coins (Well 1 is Free: 0 Star Coins)
window.unlockSfWell = function(wellId, event = null) {
  const wellIndex = wellId - 1;
  const well = sunflowerState.wells[wellIndex];
  if (!well || well.unlocked) return;

  const cost = well.unlockCost || 0;
  if (cost === 0 || sunflowerState.diamonds >= cost) {
    if (cost > 0) {
      sunflowerState.diamonds -= cost;
      window._lastCurrencyDeductionTime = Date.now();
      if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
        window.firebaseSync.syncPlayerCurrenciesImmediate();
      }
    }
    well.unlocked = true;
    well.level = 1;
    well.timer = getSfWellCycleTime(wellIndex, 1);
    well.storedBaskets = 0;
    well.isProducing = true;
    well.lastTick = Date.now();

    // Auto-assign an idle worker if player has one
    if (getIdleWellWorkersCount() > 0) {
      well.hasWorker = true;
    }

    sunflowerAudio.playUnlockChime();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    const msg = cost === 0 ? `🎉 Well #${well.id} Opened for FREE! 💧` : `🎉 Well #${well.id} Unlocked (-${cost} ⭐)!`;
    spawnSfFloat(msg, posX, posY, 'text-emerald-400 font-bold');

    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerWells();
    updateWorkersUI();
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`Need ${cost} ⭐ Star Coins to unlock Well #${well.id}!`, posX, posY, 'text-red-400 font-bold');
  }
};

// 9a. Upgrade Well Level with Sponsored Rewarded Ad (Every 5 Levels Milestone: 5, 10, 15, 20...)
window.upgradeSfWellWithAd = function(wellId, event = null) {
  const wellIndex = wellId - 1;
  const well = sunflowerState.wells[wellIndex];
  if (!well || !well.unlocked || well.level >= 5000) return;

  const doAdUpgrade = () => {
    well.level = Math.min(5000, well.level + 1);
    well.productionTime = getSfWellCycleTime(wellIndex, well.level);
    well.basketProduction = getSfWellBasketsPerCycle(wellIndex, well.level);
    well.upgradeCost = getSfWellUpgradeCost(wellIndex, well.level);
    well.timer = Math.min(well.timer, well.productionTime);

    sunflowerAudio.playUpgradeChime();
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`🎬 Well #${well.id} Milestone Lv. ${well.level} Unlocked! (+Speed & Output) 💧`, posX, posY, 'text-cyan-300 font-bold');

    renderSunflowerWells();
    updateStickyHeaderAndMiniStats();
    saveSunflowerStateDebounced();
  };

  if (typeof window.showRewardedAd === 'function') {
    window.showRewardedAd(doAdUpgrade, {
      adTitle: `Well #${well.id} Milestone Lv.${well.level + 1}`,
      adDesc: `Watch a short sponsor video to upgrade Well #${well.id} past milestone Level ${well.level}!`
    });
  } else {
    doAdUpgrade();
  }
};

// 9b. Upgrade Well Level with Coins
window.upgradeSfWell = function(wellId, event = null) {
  const wellIndex = wellId - 1;
  const well = sunflowerState.wells[wellIndex];
  if (!well || !well.unlocked || well.level >= 5000) return;

  // Milestone ad checkpoint: each 5 levels (Lv 5, 10, 15, 20...) watch ad to advance!
  if (well.level % 5 === 0) {
    window.upgradeSfWellWithAd(wellId, event);
    return;
  }

  const mult = sunflowerState.upgradeMultiplier || 1;
  const playerSfCoins = sunflowerState.coins || 0;

  // STRICT RULE: Well level upgrades use ONLY Sunflower Coins (🌻). Gold Coins (🪙) are NEVER used!
  const info = getSfWellMultiUpgradeInfo(wellIndex, well.level, mult, playerSfCoins);

  if (info.isAdUpgrade) {
    window.upgradeSfWellWithAd(wellId, event);
    return;
  }

  // Deduct cost STRICTLY from Sunflower Coins
  if (playerSfCoins >= info.totalCost) {
    sunflowerState.coins -= info.totalCost;
  } else {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`Need ${formatNumber(info.totalCost)} 🌻 Sunflower Coins! Or Watch Ad 📢`, posX, posY, 'text-red-400');
    return;
  }

  well.level = info.targetLevel;
  well.productionTime = getSfWellCycleTime(wellIndex, well.level);
  well.basketProduction = getSfWellBasketsPerCycle(wellIndex, well.level);
  well.upgradeCost = getSfWellUpgradeCost(wellIndex, well.level);
  well.timer = Math.min(well.timer, well.productionTime);
  well.maxStorage = Infinity;

  sunflowerAudio.playUpgradeChime();
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat(`▲ Well #${well.id} Lv. ${well.level}! (+Speed & Basket Output)`, posX, posY, 'text-cyan-300 font-bold');

  renderSunflowerWells();
  updateStickyHeaderAndMiniStats();
  saveSunflowerStateDebounced();
};

// 10. Render All 20 Wells in Fixed 1*20 Format
function renderSunflowerWells() {
  const container = document.getElementById('sfWellsContainer');
  if (!container || !Array.isArray(sunflowerState.wells)) return;

  const mult = sunflowerState.upgradeMultiplier || 1;
  const coins = sunflowerState.coins;
  const idleWorkers = getIdleWellWorkersCount();

  container.innerHTML = '';

  sunflowerState.wells.forEach((well, idx) => {
    const tile = document.createElement('div');
    tile.id = `sfWellTile-${well.id}`;

    // 1. LOCKED WELL
    if (!well.unlocked) {
      const isFree = (well.unlockCost === 0 || well.id === 1);
      tile.className = "sf-well-card locked";
      tile.innerHTML = `
        <div class="sf-card-header">
          <div class="flex items-center gap-1.5">
            <span class="text-stone-500 text-sm">🏞️</span>
            <span class="sf-card-title">${well.name || `Water Well #${well.id}`}</span>
          </div>
          <span class="sf-status-pill pill-locked">${isFree ? 'Free to Open 💧' : 'Locked 🔒'}</span>
        </div>
        <div class="sf-card-body flex items-center justify-between gap-3 py-2">
          <div class="sf-card-avatar locked-avatar">🪨</div>
          <div class="sf-card-details flex-1">
            <div class="text-xs font-black text-stone-700">Underground Aquifer Well</div>
            <div class="text-[10px] text-stone-500">${isFree ? 'Initial mountain aquifer: <strong class="text-emerald-600 font-bold">FREE to open!</strong>' : `Drilling &amp; pump license fee: <strong class="text-amber-600 font-bold">${well.unlockCost} ⭐</strong>`}</div>
          </div>
        </div>
        <button onclick="unlockSfWell(${well.id}, event)" class="sf-card-btn sf-btn-unlock ${isFree ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold' : ''}">
          <span>${isFree ? '🔓 Open Well (FREE)' : `🔓 Unlock Well (${well.unlockCost} ⭐)`}</span>
        </button>
      `;
      container.appendChild(tile);
      return;
    }

    // 2. UNLOCKED WELL
    const cycleTime = getSfWellCycleTime(idx, well.level);
    const basketsPerCycle = getSfWellBasketsPerCycle(idx, well.level);
    const upInfo = getSfWellMultiUpgradeInfo(idx, well.level, mult, coins);
    const canAfford = coins >= upInfo.totalCost && well.level < 5000;
    const isProducing = Boolean(well.hasWorker || well.isProducing);
    const stored = well.storedBaskets || 0;
    const progress = stored > 0 ? 1 : (!isProducing ? 0 : Math.max(0, Math.min(1, 1 - (well.timer / cycleTime))));
    const wellSecLeft = Math.ceil(Math.max(0, well.timer));

    let cardClass = "sf-well-card active";
    if (well.hasWorker) cardClass += " automated";
    else if (stored > 0) cardClass += " ready";
    else if (isProducing) cardClass += " producing";
    else cardClass += " idle";

    let pillClass = 'pill-well-idle';
    let pillText = `👆 Click Water Coin`;
    if (well.hasWorker) {
      pillClass = 'pill-well-automated';
      pillText = `👷 Manager Auto (${wellSecLeft}s)`;
    } else if (stored > 0) {
      pillClass = 'pill-well-ready';
      pillText = `🧺 ${stored} Ready • Claim`;
    } else if (isProducing) {
      pillClass = 'pill-well-filling';
      pillText = `⏳ Producing (${wellSecLeft}s)`;
    }

    const coinIcon = well.hasWorker ? '👷' : (stored > 0 ? '🧺' : (isProducing ? '🌊' : '💧'));
    const coinBadge = well.hasWorker ? 'AUTO' : (stored > 0 ? 'CLAIM' : (isProducing ? 'PUMP' : 'START'));
    const coinStateClass = well.hasWorker ? 'automated' : (stored > 0 ? 'ready' : (isProducing ? 'producing' : 'idle'));

    tile.className = cardClass;
    tile.innerHTML = `
      <div class="sf-card-header">
        <div class="flex items-center gap-1.5">
          <span class="text-cyan-500 text-sm">${well.hasWorker ? '👷💧' : '⛲'}</span>
          <span class="sf-card-title">${well.name || `Water Well #${well.id}`}</span>
          <span class="sf-card-level-tag" id="sfWellLvBadge-${well.id}">Lv. ${well.level}/5000</span>
        </div>
      </div>

      <div class="sf-card-body flex items-center justify-between gap-3 py-1.5">
        <!-- Interactive Water Coin Button -->
        <div class="sf-water-coin ${coinStateClass}"
             id="sfWaterCoin-${well.id}"
             onclick="clickWaterCoin(${well.id}, event)"
             title="${well.hasWorker ? '👷 Manager Active: Auto-pumping water buckets!' : (stored > 0 ? '🧺 Click to collect ' + stored + ' water baskets!' : (isProducing ? '⏳ Producing water bucket... ' + wellSecLeft + 's left' : '💧 Click Water Coin to start producing!'))}">
          <span class="sf-water-coin-icon" id="sfWaterCoinIcon-${well.id}">${coinIcon}</span>
          <span class="sf-water-coin-badge" id="sfWaterCoinBadge-${well.id}">${coinBadge}</span>
        </div>

        <div class="sf-card-details flex-1 flex flex-col gap-1">
          <div class="flex justify-between items-center text-[11px]">
            <span class="font-black text-cyan-800" id="sfWellOut-${well.id}">+${formatNumber(basketsPerCycle)} 🧺 Baskets</span>
            <span class="font-mono text-cyan-700 font-bold text-[10px]" id="sfWellTime-${well.id}">
              ⏱️ ${formatTimerText(well.timer, cycleTime)} / ${formatTimerText(cycleTime, cycleTime)}${stored > 0 ? ` (+${stored} 🧺 ready)` : ''}
            </span>
          </div>

          <div class="sf-progress-bar-track">
            <div class="sf-progress-bar-fill cyan ${stored > 0 ? 'ready' : ''}" id="sfWellProgressBar-${well.id}" style="width: ${(Math.max(0, Math.min(1, 1 - (well.timer / cycleTime))) * 100).toFixed(1)}%"></div>
          </div>

          <div class="text-[9.5px] text-stone-600 mt-0.5 flex justify-between items-center" id="sfWellDescRow-${well.id}">
            ${well.hasWorker
              ? `<span class="text-emerald-700 font-bold flex items-center gap-1"><span>⚡</span> Manager auto-deposits water buckets directly to inventory!</span>`
              : (stored > 0
                  ? `<span class="text-cyan-800 font-bold">Stored: <strong id="sfWellStoredCount-${well.id}">${stored}</strong> 🧺 &bull; Click Water Coin or Collect!</span>`
                  : `<span class="text-cyan-700 font-semibold">🌊 Producing water bucket... (${wellSecLeft}s left)</span>`
                )
            }
            <span class="font-mono text-[9px] text-stone-500">Base: ${SF_WELL_BASE_TIMES[idx]}s &bull; ${SF_WELL_BASE_BASKETS[idx]}🧺</span>
          </div>
        </div>
      </div>

      <!-- Dual Action Buttons: Collect/Start/Assign & Level Upgrade -->
      <div class="sf-card-dual-actions grid grid-cols-2 gap-1.5 pt-1">
        <div id="sfWellWorkerSlot-${well.id}">
          <button onclick="collectWellBaskets(${well.id}, event)" id="sfWellCollectBtn-${well.id}" class="sf-card-btn sf-btn-well-collect ${stored > 0 ? 'active-ready' : ''} w-full" title="Collect stored water baskets">
            <span>🧺 Collect ${stored > 0 ? `(${stored} 🧺)` : ''}</span>
          </button>
        </div>

        ${well.level >= 5000
          ? `<button id="sfWellUpBtn-${well.id}" class="sf-card-btn sf-btn-upgrade disabled" disabled><span>★ MAX</span></button>`
          : (well.level % 5 === 0
              ? `<button onclick="upgradeSfWell(${well.id}, event)" id="sfWellUpBtn-${well.id}" class="sf-card-btn sf-btn-upgrade sf-ad-upgrade-btn" title="Watch sponsor video to upgrade well level"><span>📢 Watch Ad (Lv.${well.level + 1})</span></button>`
              : `<button onclick="upgradeSfWell(${well.id}, event)" id="sfWellUpBtn-${well.id}" class="sf-card-btn sf-btn-upgrade ${!canAfford ? 'disabled' : ''}"><span>▲ Lv.${upInfo.targetLevel} (${formatNumber(upInfo.totalCost)} ☀️)</span></button>`
            )
        }
      </div>
    `;

    container.appendChild(tile);
  });

  const summary = document.getElementById('sfWellsSummaryLabel');
  if (summary) {
    const unlockedCount = sunflowerState.wells.filter(w => w.unlocked).length;
    summary.innerText = `${unlockedCount} of 20 Wells Unlocked`;
  }
}

// 11. Immediate Single-Well Real-Time UI Updater
function updateSingleWellUI(wellId, full = true) {
  const wellIndex = wellId - 1;
  const well = sunflowerState.wells[wellIndex];
  if (!well || !well.unlocked) return;

  const cycleTime = getSfWellCycleTime(wellIndex, well.level);
  const basketsPerCycle = getSfWellBasketsPerCycle(wellIndex, well.level);
  const isProducing = true;
  const stored = well.storedBaskets || 0;
  const progress = Math.max(0, Math.min(1, 1 - (well.timer / cycleTime)));
  const wellSecLeft = Math.ceil(Math.max(0, well.timer));

  const lvBadgeEl = document.getElementById(`sfWellLvBadge-${wellId}`);
  if (lvBadgeEl) lvBadgeEl.innerText = `Lv. ${well.level}/5000`;

  const outEl = document.getElementById(`sfWellOut-${wellId}`);
  if (outEl) outEl.innerText = `+${formatNumber(basketsPerCycle)} 🧺 Baskets`;

  const timeEl = document.getElementById(`sfWellTime-${wellId}`);
  if (timeEl) {
    const timerStr = `⏱️ ${formatTimerText(well.timer, cycleTime)} / ${formatTimerText(cycleTime, cycleTime)}`;
    timeEl.innerText = stored > 0 ? `${timerStr} (+${stored} 🧺 ready)` : timerStr;
  }

  const barEl = document.getElementById(`sfWellProgressBar-${wellId}`);
  if (barEl) {
    barEl.style.width = `${(progress * 100).toFixed(1)}%`;
    if (stored > 0) barEl.classList.add('ready');
    else barEl.classList.remove('ready');
  }

  // Update status pill live
  const pillEl = document.getElementById(`sfWellStatusPill-${wellId}`);
  if (pillEl) {
    pillEl.remove();
  }

  // Update Water Coin state
  const coinEl = document.getElementById(`sfWaterCoin-${wellId}`);
  const coinIconEl = document.getElementById(`sfWaterCoinIcon-${wellId}`);
  const coinBadgeEl = document.getElementById(`sfWaterCoinBadge-${wellId}`);
  if (coinEl) {
    const coinStateClass = well.hasWorker ? 'automated' : (stored > 0 ? 'ready' : (isProducing ? 'producing' : 'idle'));
    coinEl.className = `sf-water-coin ${coinStateClass}`;
    if (coinIconEl) {
      coinIconEl.innerText = well.hasWorker ? '👷' : (stored > 0 ? '🧺' : (isProducing ? '🌊' : '💧'));
    }
    if (coinBadgeEl) {
      coinBadgeEl.innerText = well.hasWorker ? 'AUTO' : (stored > 0 ? 'CLAIM' : (isProducing ? 'PUMP' : 'START'));
    }
  }

  const descRow = document.getElementById(`sfWellDescRow-${wellId}`);
  if (descRow) {
    const baseText = `Base: ${SF_WELL_BASE_TIMES[wellIndex]}s &bull; ${SF_WELL_BASE_BASKETS[wellIndex]}🧺`;
    if (well.hasWorker) {
      descRow.innerHTML = `<span class="text-emerald-700 font-bold flex items-center gap-1"><span>⚡</span> Manager auto-deposits water buckets directly to inventory!</span><span class="font-mono text-[9px] text-stone-500">${baseText}</span>`;
    } else if (stored > 0) {
      descRow.innerHTML = `<span class="text-cyan-800 font-bold">Stored: <strong id="sfWellStoredCount-${wellId}">${stored}</strong> 🧺 &bull; Click Water Coin or Collect!</span><span class="font-mono text-[9px] text-stone-500">${baseText}</span>`;
    } else {
      descRow.innerHTML = `<span class="text-cyan-700 font-semibold">🌊 Producing water bucket... (${wellSecLeft}s left)</span><span class="font-mono text-[9px] text-stone-500">${baseText}</span>`;
    }
  }

  if (full) {
    const storedEl = document.getElementById(`sfWellStoredCount-${wellId}`);
    if (storedEl) storedEl.innerText = stored;

    const workerSlot = document.getElementById(`sfWellWorkerSlot-${wellId}`);
    if (workerSlot) {
      const collBtn = document.getElementById(`sfWellCollectBtn-${wellId}`);
      if (collBtn) {
        if (stored > 0) {
          collBtn.classList.add('active-ready');
          collBtn.innerHTML = `<span>🧺 Collect (${stored} 🧺)</span>`;
        } else {
          collBtn.classList.remove('active-ready');
          collBtn.innerHTML = `<span>🧺 Collect</span>`;
        }
      } else {
        workerSlot.innerHTML = `
          <button onclick="collectWellBaskets(${wellId}, event)" id="sfWellCollectBtn-${wellId}" class="sf-card-btn sf-btn-well-collect ${stored > 0 ? 'active-ready' : ''} w-full" title="Collect stored water baskets">
            <span>🧺 Collect ${stored > 0 ? `(${stored} 🧺)` : ''}</span>
          </button>
        `;
      }
    }

    const mult = sunflowerState.upgradeMultiplier || 1;
    const playerSfCoins = sunflowerState.coins || 0;
    const upInfo = getSfWellMultiUpgradeInfo(wellIndex, well.level, mult, playerSfCoins);
    const canAfford = playerSfCoins >= upInfo.totalCost && well.level < 5000;
    const upBtn = document.getElementById(`sfWellUpBtn-${wellId}`);
    if (upBtn) {
      if (well.level >= 5000) {
        upBtn.className = "sf-card-btn sf-btn-upgrade disabled";
        upBtn.disabled = true;
        upBtn.innerHTML = "<span>★ MAX</span>";
      } else if (well.level % 5 === 0) {
        upBtn.disabled = false;
        upBtn.className = "sf-card-btn sf-btn-upgrade sf-ad-upgrade-btn";
        upBtn.innerHTML = `<span>📢 Watch Ad (Lv.${well.level + 1})</span>`;
      } else {
        upBtn.disabled = false;
        upBtn.className = `sf-card-btn sf-btn-upgrade ${!canAfford ? 'disabled' : ''}`;
        upBtn.innerHTML = `<span>▲ Lv.${upInfo.targetLevel} (${formatNumber(upInfo.totalCost)} ☀️)</span>`;
      }
    }
  }
}

/* ==========================================================================
   SUNFLOWER VISUAL LIFECYCLE HELPER (Levels 1 to 5000)
   ========================================================================== */
function getSfPlotVisualLifecycle(level) {
  const L = Math.max(1, level || 1);
  if (L < 25) {
    return {
      stage: 'Seedling',
      badge: 'Young Bloom',
      emoji: '🌻',
      title: 'Young Sunflower',
      badgeClass: 'young'
    };
  } else if (L < 100) {
    return {
      stage: 'Bloom',
      badge: 'Golden Bloom',
      emoji: '🌻',
      title: 'Golden Sunflower',
      badgeClass: 'bloom'
    };
  } else if (L < 500) {
    return {
      stage: 'Radiant',
      badge: 'Radiant Solar',
      emoji: '☀️🌻',
      title: 'Radiant Sunflower',
      badgeClass: 'radiant'
    };
  } else if (L < 1500) {
    return {
      stage: 'Royal',
      badge: 'Royal Valley',
      emoji: '👑🌻',
      title: 'Royal Sunflower',
      badgeClass: 'royal'
    };
  } else if (L < 3000) {
    return {
      stage: 'Celestial',
      badge: 'Celestial King',
      emoji: '🌌🌻',
      title: 'Celestial Sunflower',
      badgeClass: 'celestial'
    };
  } else {
    return {
      stage: 'Divine',
      badge: 'Infinity Divine',
      emoji: '⭐🌻',
      title: 'Divine Sunflower',
      badgeClass: 'divine'
    };
  }
}


/* ==========================================================================
   DIRECT LAND HARVEST COLLECT (Fixed instant collection without errors)
   ========================================================================== */
window.collectPlotHarvest = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked) return;

  const posX = event && event.clientX ? event.clientX : window.innerWidth / 2;
  const posY = event && event.clientY ? event.clientY : window.innerHeight / 2;

  if (plot.plantStatus === 'growing') {
    const secLeft = Math.ceil(Math.max(0, plot.growthTimer || 0));
    sunflowerAudio.playTone(400, 'sine', 0.1, 0.05);
    spawnSfFloat(`⏳ Baby plant is growing! (${secLeft}s left)`, posX, posY, 'text-emerald-400 font-bold');
    return;
  }

  if (plot.plantStatus === 'dead') {
    sunflowerAudio.playTone(200, 'sawtooth', 0.15, 0.08);
    spawnSfFloat(`🥀 Flower is dead! Use shovel 🪏 to clear and replant.`, posX, posY, 'text-rose-400 font-bold');
    return;
  }

  if (plot.plantStatus !== 'alive') {
    spawnSfFloat(`🌱 Empty land! Plant a seed first.`, posX, posY, 'text-amber-300 font-bold');
    return;
  }

  const uncollected = plot.uncollectedCoins || 0;
  if (uncollected > 0) {
    const boosterMult = (typeof getActiveSunflowerProfitMultiplier === 'function') ? getActiveSunflowerProfitMultiplier() : 1;
    const finalHarvest = uncollected * boosterMult;
    sunflowerState.coins = (sunflowerState.coins || 0) + finalHarvest;
    plot.totalCoinsGenerated = (plot.totalCoinsGenerated || 0) + finalHarvest;
    plot.uncollectedCoins = 0;
    plot.readyToCollect = false;

    sunflowerAudio.playHarvest();
    const multMsg = boosterMult > 1 ? ` (${boosterMult}X Boosted!)` : '';
    spawnSfFloat(`+${formatNumber(finalHarvest)} 🌻 Harvest Collected!${multMsg}`, posX, posY, 'text-yellow-400 font-black');

    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    updateSinglePlotUI(plotId);
  } else {
    const secLeft = Math.ceil(Math.max(0, plot.timer || 0));
    sunflowerAudio.playTone(520, 'sine', 0.08, 0.04);
    spawnSfFloat(`⏳ Growing sunflower... next harvest in ${secLeft}s!`, posX, posY, 'text-amber-300 font-medium');
  }
};

/* ==========================================================================
   COLLECT MODAL & 2X PROFIT AD WATCH
   ========================================================================== */
let sfActiveCollectPlotId = null;

window.openSfCollectModal = function(plotId, event = null) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked) return;

  sfActiveCollectPlotId = plotId;
  const coinsPerCycle = getSfPlotCoinsPerCycle(plotIndex, plot.level);
  const boosterMult = (typeof getActiveSunflowerProfitMultiplier === 'function') ? getActiveSunflowerProfitMultiplier() : 1;
  const rawProfit = (plot.uncollectedCoins && plot.uncollectedCoins > 0) ? plot.uncollectedCoins : coinsPerCycle;
  const profit = rawProfit * boosterMult;
  if (profit <= 0) return;
  const art = getSfPlotVisualLifecycle(plot.level);

  const titleEl = document.getElementById('sfCollectModalLandTitle');
  const lvSubEl = document.getElementById('sfCollectModalLvSub');
  const emojiEl = document.getElementById('sfCollectModalEmoji');
  const profitEl = document.getElementById('sfCollectModalProfitVal');
  const doubleEl = document.getElementById('sfCollectModalDoubleVal');
  const normalEl = document.getElementById('sfCollectModalNormalVal');

  if (titleEl) titleEl.innerText = `Land #${plot.id} Harvest Ready! (Unlimited)${boosterMult > 1 ? ` (${boosterMult}X Boosted!)` : ''}`;
  if (lvSubEl) lvSubEl.innerText = `Level ${plot.level} ${art.title}`;
  if (emojiEl) emojiEl.innerText = art.emoji;
  if (profitEl) profitEl.innerText = `+${formatNumber(profit)}`;
  if (doubleEl) doubleEl.innerText = `+${formatNumber(profit * 2)} 🌻`;
  if (normalEl) normalEl.innerText = `${formatNumber(profit)} 🌻`;

  const modal = document.getElementById('sfCollectProfitModal');
  if (modal) modal.classList.remove('hidden');
};

window.closeSfCollectModal = function() {
  const modal = document.getElementById('sfCollectProfitModal');
  if (modal) modal.classList.add('hidden');
  sfActiveCollectPlotId = null;
};

window.confirmSfCollect = function(isWatchAd) {
  if (!sfActiveCollectPlotId) return;
  const plotIndex = sfActiveCollectPlotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot) {
    closeSfCollectModal();
    return;
  }

  const cycleTime = getSfPlotCycleTime(plotIndex, plot.level);
  const coinsPerCycle = getSfPlotCoinsPerCycle(plotIndex, plot.level);
  const uncoll = (plot.uncollectedCoins && plot.uncollectedCoins > 0) ? plot.uncollectedCoins : coinsPerCycle;
  const boosterMult = (typeof getActiveSunflowerProfitMultiplier === 'function') ? getActiveSunflowerProfitMultiplier() : 1;
  const baseProfit = uncoll * boosterMult;

  if (isWatchAd) {
    const doDoubleClaim = () => {
      const doubleProfit = baseProfit * 2;
      sunflowerState.coins += doubleProfit;
      plot.totalCoinsGenerated = (plot.totalCoinsGenerated || 0) + doubleProfit;
      plot.readyToCollect = false;
      plot.uncollectedCoins = 0;
      plot.timer = cycleTime;

      sunflowerAudio.playCoin();
      spawnSfFloat(`🎉 2X HARVEST PROFIT: +${formatNumber(doubleProfit)} 🌻!${boosterMult > 1 ? ` (${boosterMult}X Boost Active)` : ''}`, window.innerWidth / 2, window.innerHeight / 2, 'text-yellow-400 font-black');

      closeSfCollectModal();
      saveSunflowerStateDebounced();
      updateStickyHeaderAndMiniStats();
      renderSunflowerPlots();
    };

    // Rewarded interstitial
    if (typeof show_10676091 === 'function') {
      show_10676091().then(() => {
        // You need to add your user reward function here, which will be executed after the user watches the ad.
        // For more details, please refer to the detailed instructions.
        alert('You have seen an ad!');
        doDoubleClaim();
      }).catch(e => {
        console.warn('show_10676091 notice:', e);
        doDoubleClaim();
      });
    } else if (typeof window.showRewardedAd === 'function') {
      window.showRewardedAd(doDoubleClaim, {
        adTitle: '2X Harvest Profit',
        adDesc: 'Watch this sponsor clip to double your solar coin harvest!'
      });
    } else {
      doDoubleClaim();
    }
  } else {
    // Normal collection with active booster multiplier applied
    sunflowerState.coins += baseProfit;
    plot.totalCoinsGenerated = (plot.totalCoinsGenerated || 0) + baseProfit;
    plot.readyToCollect = false;
    plot.uncollectedCoins = 0;
    plot.timer = cycleTime;

    sunflowerAudio.playCoin();
    spawnSfFloat(`+${formatNumber(baseProfit)} 🌻 Harvest Collected!${boosterMult > 1 ? ` (${boosterMult}X Boost)` : ''}`, window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400');

    closeSfCollectModal();
    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    renderSunflowerPlots();
  }
};

/* ==========================================================================
   RENDER 20 LANDS IN HANDWRITTEN SKETCH CARDS
   ========================================================================== */
function renderSunflowerPlots() {
  const container = document.getElementById('sfPlotsContainer');
  if (!container) return;

  const mult = sunflowerState.upgradeMultiplier || 1;
  const coins = sunflowerState.coins;
  const seeds = sunflowerState.seeds || 0;
  const shovels = sunflowerState.shovels || 0;
  const idleLandWorkers = getIdleLandWorkersCount();

  sunflowerState.plots.forEach((plot, idx) => {
    let tile = document.getElementById(`sfPlotTile-${plot.id}`);
    const isNew = !tile;
    if (isNew) {
      tile = document.createElement('div');
      tile.id = `sfPlotTile-${plot.id}`;
    }

    const isAutomated = Boolean(plot.hasWorker);
    const mgrBtnHtml = '';

    // 1. LOCKED PLOT
    if (!plot.unlocked) {
      const isLand1 = plot.id === 1;
      const costBadge = isLand1 ? `${plot.unlockCost} 🪙` : `${plot.unlockCost} ⭐`;
      const btnTitle = isLand1 ? `🔓 Buy Land (${plot.unlockCost} 🪙)` : `🔓 Unlock Land (${plot.unlockCost} ⭐)`;
      const descText = isLand1
        ? 'Fertile first land! Buy for 10 Gold Coins to start growing sunflowers!'
        : 'Fertile virgin soil awaiting exploration. Unlock to start growing sunflowers!';
      tile.className = "sf-plot-tile sf-sketch-card locked";
      tile.innerHTML = `
        <div class="sf-sketch-square stage-locked" onclick="unlockSfPlot(${plot.id}, event)" title="${isLand1 ? 'Buy Land 1 for 10 Gold Coins' : 'Unlock land with Star Coins'}">
          <div class="sf-sketch-square-art">🔒</div>
          <span class="sf-sketch-square-badge dead">Locked</span>
          <span class="text-[9px] font-mono font-bold ${isLand1 ? 'text-amber-400' : 'text-stone-600'} mt-1">${costBadge}</span>
        </div>
        <div class="sf-sketch-right">
          <div class="sf-sketch-top">
            <div class="sf-sketch-land-title">
              <span>Land ${plot.id}</span>
            </div>
            <div class="sf-sketch-lv-col">
              <span class="sf-sketch-lv-tag">Locked</span>
            </div>
          </div>
          <div class="sf-sketch-middle py-1">
            <p class="text-xs text-stone-500">${descText}</p>
          </div>
          <div class="sf-sketch-bottom">
            <button onclick="unlockSfPlot(${plot.id}, event)" class="sf-btn-sketch-action sf-btn-unlock col-span-2 w-full ${isLand1 ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black' : ''}">
              <span>${btnTitle}</span>
            </button>
          </div>
        </div>
      `;
      if (isNew) container.appendChild(tile);
      return;
    }

    // 2. UNLOCKED: EMPTY PLOT
    if (plot.plantStatus === 'empty') {
      tile.className = `sf-plot-tile sf-sketch-card empty ${isAutomated ? 'automated' : ''}`;
      tile.innerHTML = `
        <div class="sf-sketch-square stage-empty" onclick="quickBuyPlantAndInstall(${plot.id}, event)" title="Plant baby sunflower">
          <div class="sf-sketch-square-art">🟫</div>
          <span class="sf-sketch-square-badge" style="background:#78350f;color:#fef08a;">Empty Soil</span>
          <span class="text-[9px] font-bold text-amber-900 mt-1">+ Buy Plant</span>
        </div>
        <div class="sf-sketch-right">
          <div class="sf-sketch-top">
            <div class="sf-sketch-land-title">
              <span>Land ${plot.id}</span>
              ${mgrBtnHtml}
            </div>
            <div class="sf-sketch-lv-col">
              <span class="sf-sketch-lv-tag">Lv. 1/5000 Soil</span>
              <span class="sf-sketch-rate text-stone-500">Ready</span>
            </div>
          </div>
          <div class="sf-sketch-middle py-1">
            ${isAutomated
              ? `<p class="text-xs text-emerald-700 font-bold">👷 Manager assigned: Will auto-water &amp; auto-collect once plant is growing!</p>`
              : `<p class="text-xs text-stone-600">Install baby plant &bull; 1 min (60s) growth incubation &bull; Starts at Level 1</p>`
            }
          </div>
          <div class="sf-sketch-bottom">
            ${seeds > 0 ? `
              <button onclick="plantSfPlot(${plot.id}, event)" class="sf-btn-sketch-action sf-btn-plant col-span-2 w-full">
                <span>🌱 Plant Baby Plant (Owned: ${seeds})</span>
              </button>
            ` : `
              <button onclick="quickBuyPlantAndInstall(${plot.id}, event)" class="sf-btn-sketch-action sf-btn-buy-plant col-span-2 w-full">
                <span>🛒 Buy Baby Plant (50 ☀️ / 1 ⭐)</span>
              </button>
            `}
          </div>
        </div>
      `;
      if (isNew) container.appendChild(tile);
      return;
    }

    // 3. UNLOCKED: 60s (1 MIN) GROWING PHASE
    if (plot.plantStatus === 'growing') {
      const growthTime = Math.max(0, plot.growthTimer || 0);
      const progress = Math.max(0, Math.min(1, (60 - growthTime) / 60));
      tile.className = `sf-plot-tile sf-sketch-card growing ${isAutomated ? 'automated' : ''}`;
      tile.innerHTML = `
        <div class="sf-sketch-square stage-growing">
          <div class="sf-sketch-square-art animate-bounce-gentle">${growthTime < 30 ? '🌿' : '🌱'}</div>
          <span class="sf-sketch-square-badge growing">Baby Plant</span>
          <span class="text-[9px] font-mono font-bold text-emerald-800 mt-1" id="sfGrowthSquareTimer-${plot.id}">${Math.ceil(growthTime)}s</span>
        </div>
        <div class="sf-sketch-right">
          <div class="sf-sketch-top">
            <div class="sf-sketch-land-title">
              <span>Land ${plot.id}</span>
              ${mgrBtnHtml}
            </div>
            <div class="sf-sketch-lv-col">
              <span class="sf-sketch-lv-tag">Lv. 1/5000 Seedling</span>
              <span class="sf-sketch-rate text-emerald-700">Sprouting</span>
            </div>
          </div>
          <div class="sf-sketch-middle">
            <div class="sf-loading-bar-wrap">
              <div class="sf-loading-bar-fill" id="sfGrowthBar-${plot.id}" style="width: ${(progress * 100).toFixed(1)}%"></div>
              <span class="sf-loading-bar-text" id="sfGrowthTimer-${plot.id}">⏳ Incubating: ${Math.ceil(growthTime)}s / 60s</span>
            </div>
            <div class="sf-sketch-life-info">
              <span>1 min incubation</span>
              <span>${isAutomated ? '<strong class="text-emerald-700">👷 Manager Active</strong>' : 'Blooms into mature sunflower!'}</span>
            </div>
          </div>
          <div class="sf-sketch-bottom">
            <button class="sf-btn-sketch-action sf-btn-disabled col-span-2 w-full" id="sfGrowthBtn-${plot.id}" disabled>
              <span>⏳ Photosynthesizing (${Math.ceil(growthTime)}s left)...</span>
            </button>
          </div>
        </div>
      `;
      if (isNew) container.appendChild(tile);
      return;
    }

    // 4. UNLOCKED: DEAD / WITHERED STALKS
    if (plot.plantStatus === 'dead') {
      tile.className = `sf-plot-tile sf-sketch-card dead ${isAutomated ? 'automated' : ''}`;
      tile.innerHTML = `
        <div class="sf-sketch-square stage-dead" onclick="shovelSfPlot(${plot.id}, event)" title="Click with shovel to clear">
          <div class="sf-sketch-square-art">🥀</div>
          <span class="sf-sketch-square-badge dead">Dead Flower</span>
          <span class="text-[9px] font-bold text-rose-800 mt-1">🪏 Clear</span>
        </div>
        <div class="sf-sketch-right">
          <div class="sf-sketch-top">
            <div class="sf-sketch-land-title">
              <span>Land ${plot.id}</span>
              ${mgrBtnHtml}
            </div>
            <div class="sf-sketch-lv-col">
              <span class="sf-sketch-lv-tag bg-rose-100 text-rose-800 border-rose-300">Expired</span>
            </div>
          </div>
          <div class="sf-sketch-middle py-1">
            <p class="text-xs text-rose-800 font-medium">Life expired. Throw water bucket 🪣 to revive or use shovel 🪏 to replant at Level 1.${isAutomated ? ' (👷 Manager active)' : ''}</p>
          </div>
          <div class="sf-sketch-bottom">
            <button onclick="waterSfPlot(${plot.id}, event)" class="sf-btn-sketch-action sf-btn-sketch-water" title="Throw water bucket to revive sunflower">
              <span>🪣 Throw Water (+${getSfPlotWaterBonus(idx)}s)</span>
            </button>
            <button onclick="shovelSfPlot(${plot.id}, event)" class="sf-btn-sketch-action sf-btn-shovel" title="Clear with shovel to restart Level 1">
              <span>🪏 Shovel (${shovels})</span>
            </button>
          </div>
        </div>
      `;
      if (isNew) container.appendChild(tile);
      return;
    }

    // 5. UNLOCKED: ALIVE & MATURE SUNFLOWER (Exact handwritten sketch layout)
    const cycleTime = getSfPlotCycleTime(idx, plot.level);
    const coinsPerCycle = getSfPlotCoinsPerCycle(idx, plot.level);
    const upInfo = getSfMultiUpgradeInfo(idx, plot.level, mult, coins);
    const canAfford = coins >= upInfo.totalCost && plot.level < 5000;
    const maxCap = getSfPlotMaxLifeLimit(idx, plot.level);
    const waterBonus = getSfPlotWaterBonus(idx);
    const art = getSfPlotVisualLifecycle(plot.level);

    const boosterMult = (typeof getActiveSunflowerProfitMultiplier === 'function') ? getActiveSunflowerProfitMultiplier() : 1;
    const effectiveCoins = coinsPerCycle * boosterMult;
    const boostedUncollected = (plot.uncollectedCoins || 0) * boosterMult;

    const progressPct = Math.max(0, Math.min(100, (1 - ((plot.timer || 0) / cycleTime)) * 100));

    tile.className = `sf-plot-tile sf-sketch-card alive ${isAutomated ? 'automated' : ''}`;
    tile.innerHTML = `
      <!-- LEFT: BIG SQUARE WITH SUNFLOWER LIFECYCLE ART (Clickable to collect) -->
      <div class="sf-sketch-square stage-alive" onclick="collectPlotHarvest(${plot.id}, event)" style="cursor: pointer;" title="Tap to collect sunflower harvest">
        <div class="sf-sketch-square-art">${art.emoji}</div>
        <span class="sf-sketch-square-badge alive">${art.badge}</span>
        <span class="text-[9px] font-bold text-amber-900 mt-1" id="sfPlotSquareLvTag-${plot.id}">Lv. ${plot.level}/5000</span>
      </div>

      <!-- RIGHT: SKETCH CONTENT -->
      <div class="sf-sketch-right">
        <!-- TOP ROW: Land 1 on left, Manager button, Lv 1 + Upgrade Button + +1 Output on right -->
        <div class="sf-sketch-top">
          <div class="sf-sketch-land-title">
            <span>Land ${plot.id}</span>
            ${mgrBtnHtml}
          </div>

          <div class="sf-sketch-lv-col">
            <span class="sf-sketch-lv-tag" id="sfPlotLvTag-${plot.id}">Lv. ${plot.level}/5000</span>
            ${plot.level >= 5000
              ? `<button id="sfPlotUpBtn-${plot.id}" class="sf-sketch-up-btn disabled" disabled><span>MAX</span></button>`
              : (plot.level % 5 === 0
                  ? `<button onclick="upgradeSfPlot(${plot.id}, event)" id="sfPlotUpBtn-${plot.id}" class="sf-sketch-up-btn sf-ad-upgrade-btn" title="Watch sponsor video to upgrade land level"><span>📢 Watch Ad (Lv.${plot.level + 1})</span></button>`
                  : `<button onclick="upgradeSfPlot(${plot.id}, event)" id="sfPlotUpBtn-${plot.id}" class="sf-sketch-up-btn ${!canAfford ? 'disabled' : ''}" title="Upgrade land level"><span>Upgrade (${formatNumber(upInfo.totalCost)} ☀️)</span></button>`
                )
            }
            <span class="sf-sketch-rate" id="sfPlotRateTag-${plot.id}">+${formatNumber(effectiveCoins)} 🌻${boosterMult > 1 ? ` (${boosterMult}X)` : ''}</span>
          </div>
        </div>

        <!-- CENTER: LOADING BAR WITH COUNTDOWN TIMER INSIDE (e.g. 60s) (Clickable to collect) -->
        <div class="sf-sketch-middle">
          <div class="sf-loading-bar-wrap" onclick="collectPlotHarvest(${plot.id}, event)" style="cursor: pointer;" title="Tap to collect sunflower harvest">
            <div class="sf-loading-bar-fill ${plot.readyToCollect ? 'ready' : ''}" id="sfPlotBarFill-${plot.id}" style="width: ${progressPct.toFixed(1)}%"></div>
            <span class="sf-loading-bar-text" id="sfPlotBarText-${plot.id}">
              ${(plot.uncollectedCoins || 0) > 0 ? `✨ Ready (+${formatNumber(boostedUncollected)} 🌻${boosterMult > 1 ? ` • ${boosterMult}X` : ''}) • Next: ${formatTimerText(plot.timer, cycleTime)}` : `⏳ ${formatTimerText(plot.timer, cycleTime)}`}
            </span>
          </div>
          <div class="sf-sketch-life-info">
            <span>⏳ Life: <strong id="sfPlotLifeText-${plot.id}">${Math.ceil(plot.lifeTimer || 0)}s</strong> ${isAutomated ? '<span class="text-emerald-700 font-bold ml-1 text-[9.5px]">⚡ Auto-Feed &amp; Harvest</span>' : ''}</span>
            <span>Limit: <strong id="sfCapLabel-${plot.id}" class="text-emerald-700 font-bold">Unlimited 🪣</strong></span>
          </div>
        </div>

        <!-- BOTTOM ROW: DUAL BUTTONS [ WATER ] & [ COLLECT ] -->
        <div class="sf-sketch-bottom">
          <button onclick="waterSfPlot(${plot.id}, event)" id="sfPlotWaterBtn-${plot.id}" class="sf-btn-sketch-action sf-btn-sketch-water" title="Water flower to extend life (+${waterBonus}s)">
            <span>🪣 Water (${getSfPlotRequiredBuckets(plot.level) > 1 ? `${getSfPlotRequiredBuckets(plot.level)}🪣 ` : ''}+${waterBonus}s)</span>
          </button>
          <button onclick="collectPlotHarvest(${plot.id}, event)" id="sfPlotCollectBtn-${plot.id}" class="sf-btn-sketch-action sf-btn-sketch-collect ${(plot.uncollectedCoins || 0) > 0 ? 'active-ready' : ''}" title="Collect harvested coins">
            <span>🧺 Collect ${(plot.uncollectedCoins || 0) > 0 ? `(${formatNumber(boostedUncollected)})` : ''}</span>
          </button>
        </div>
      </div>
    `;

    if (isNew) container.appendChild(tile);
  });

  const summary = document.getElementById('sfPlotsSummaryLabel');
  if (summary) {
    const unlockedCount = sunflowerState.plots.filter(p => p.unlocked).length;
    summary.innerText = `${unlockedCount} of 20 Lands Unlocked`;
  }
}

// Immediate Single-Land Real-Time UI Updater
function updateSinglePlotUI(plotId) {
  const plotIndex = plotId - 1;
  const plot = sunflowerState.plots[plotIndex];
  if (!plot || !plot.unlocked) return;

  // Manager badge update
  const mgrBtn = document.getElementById(`sfPlotManagerBtn-${plotId}`);
  if (mgrBtn) mgrBtn.remove();

  if (plot.plantStatus === 'growing') {
    const growthTime = Math.max(0, plot.growthTimer || 0);
    const progress = Math.max(0, Math.min(1, (60 - growthTime) / 60));
    const sqTimer = document.getElementById(`sfGrowthSquareTimer-${plotId}`);
    if (sqTimer) sqTimer.innerText = `${Math.ceil(growthTime)}s`;
    const gTimer = document.getElementById(`sfGrowthTimer-${plotId}`);
    if (gTimer) gTimer.innerText = `⏳ Incubating: ${Math.ceil(growthTime)}s / 60s`;
    const gBar = document.getElementById(`sfGrowthBar-${plotId}`);
    if (gBar) gBar.style.width = `${(progress * 100).toFixed(1)}%`;
    const gBtn = document.getElementById(`sfGrowthBtn-${plotId}`);
    if (gBtn) gBtn.innerHTML = `<span>⏳ Photosynthesizing (${Math.ceil(growthTime)}s left)...</span>`;
    return;
  }

  if (plot.plantStatus !== 'alive') return;

  const cycleTime = getSfPlotCycleTime(plotIndex, plot.level);
  const coinsPerCycle = getSfPlotCoinsPerCycle(plotIndex, plot.level);
  const mult = sunflowerState.upgradeMultiplier || 1;
  const playerSfCoins = sunflowerState.coins || 0;
  const upInfo = getSfMultiUpgradeInfo(plotIndex, plot.level, mult, playerSfCoins);
  const canAfford = playerSfCoins >= upInfo.totalCost && plot.level < 5000;
  const maxCap = getSfPlotMaxLifeLimit(plotIndex, plot.level);
  const waterBonus = getSfPlotWaterBonus(plotIndex);
  const reqBuckets = getSfPlotRequiredBuckets(plot.level);

  const sqLvEl = document.getElementById(`sfPlotSquareLvTag-${plotId}`);
  if (sqLvEl) sqLvEl.innerText = `Lv. ${plot.level}/5000`;

  const lvEl = document.getElementById(`sfPlotLvTag-${plotId}`);
  if (lvEl) lvEl.innerText = `Lv. ${plot.level}/5000`;

  const boosterMult = (typeof getActiveSunflowerProfitMultiplier === 'function') ? getActiveSunflowerProfitMultiplier() : 1;
  const effectiveCoins = coinsPerCycle * boosterMult;

  const rateEl = document.getElementById(`sfPlotRateTag-${plotId}`);
  if (rateEl) rateEl.innerText = `+${formatNumber(effectiveCoins)} 🌻${boosterMult > 1 ? ` (${boosterMult}X)` : ''}`;

  const capEl = document.getElementById(`sfCapLabel-${plotId}`);
  if (capEl) capEl.innerText = `Unlimited 🪣`;

  const lifeEl = document.getElementById(`sfPlotLifeText-${plotId}`);
  if (lifeEl) lifeEl.innerText = `${Math.ceil(plot.lifeTimer || 0)}s`;

  // Water button update
  const waterBtn = document.getElementById(`sfPlotWaterBtn-${plotId}`);
  if (waterBtn) {
    waterBtn.innerHTML = `<span>🪣 Water (${reqBuckets > 1 ? `${reqBuckets}🪣 ` : ''}+${waterBonus}s)</span>`;
  }

  // Loading bar & live countdown timer update
  const barFill = document.getElementById(`sfPlotBarFill-${plotId}`);
  const barText = document.getElementById(`sfPlotBarText-${plotId}`);
  const collectBtn = document.getElementById(`sfPlotCollectBtn-${plotId}`);
  const uncollected = plot.uncollectedCoins || 0;
  const boostedUncollected = uncollected * boosterMult;

  const currentTimer = Math.max(0, plot.timer || 0);
  const progressPct = Math.max(0, Math.min(100, (1 - (currentTimer / cycleTime)) * 100));

  if (barFill) {
    barFill.style.width = `${progressPct.toFixed(1)}%`;
    if (uncollected > 0) {
      barFill.classList.add('ready');
    } else {
      barFill.classList.remove('ready');
    }
  }

  if (barText) {
    if (uncollected > 0) {
      barText.innerText = `✨ Ready (+${formatNumber(boostedUncollected)} 🌻${boosterMult > 1 ? ` • ${boosterMult}X` : ''}) • Next: ${formatTimerText(currentTimer, cycleTime)}`;
    } else {
      barText.innerText = `⏳ ${formatTimerText(currentTimer, cycleTime)}`;
    }
  }

  if (collectBtn) {
    collectBtn.disabled = false;
    collectBtn.classList.remove("disabled");
    if (uncollected > 0) {
      collectBtn.classList.add("active-ready");
      collectBtn.innerHTML = `<span>🧺 Collect (${formatNumber(boostedUncollected)})</span>`;
    } else {
      collectBtn.classList.remove("active-ready");
      collectBtn.innerHTML = `<span>🧺 Collect</span>`;
    }
  }

  // Upgrade button update
  const upBtn = document.getElementById(`sfPlotUpBtn-${plotId}`);
  if (upBtn) {
    if (plot.level >= 5000) {
      upBtn.className = "sf-sketch-up-btn disabled";
      upBtn.disabled = true;
      upBtn.innerHTML = `<span>MAX</span>`;
    } else if (plot.level % 5 === 0) {
      upBtn.disabled = false;
      upBtn.className = "sf-sketch-up-btn sf-ad-upgrade-btn";
      upBtn.innerHTML = `<span>📢 Watch Ad (Lv.${plot.level + 1})</span>`;
    } else {
      upBtn.disabled = false;
      upBtn.className = `sf-sketch-up-btn ${!canAfford ? 'disabled' : ''}`;
      upBtn.innerHTML = `<span>Upgrade (${formatNumber(upInfo.totalCost)} ☀️)</span>`;
    }
  }
}

/* ==========================================================================
   GAME LOOP & RESOURCE ADVANCEMENT
   ========================================================================== */
let sfLastFrameTime = 0;
let sfIncomeSecondAccumulator = 0;
let sfNeedRerender = false;
let sfAnimationId = null;
let sfIsLoopRunning = false;

function cleanupSunflowerPage() {
  if (sfAnimationId) {
    cancelAnimationFrame(sfAnimationId);
    sfAnimationId = null;
  }
  sfIsLoopRunning = false;
}
window.cleanupSunflowerPage = cleanupSunflowerPage;

function sunflowerMainLoop(now) {
  if (!sfIsLoopRunning) return;
  const sfPage = document.getElementById('pageSunflower');
  if (!sfPage || !sfPage.classList.contains('active')) {
    cleanupSunflowerPage();
    return;
  }
  if (!now || typeof now !== 'number') {
    now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }
  if (!sfLastFrameTime || typeof sfLastFrameTime !== 'number' || sfLastFrameTime > now) {
    sfLastFrameTime = now;
  }
  let dt = (now - sfLastFrameTime) / 1000;
  sfLastFrameTime = now;

  if (!Number.isFinite(dt) || dt < 0) dt = 0;
  dt = Math.min(1.0, dt); // Cap frame delta to 1 second max

  let gardenTotalCps = 0;
  sfNeedRerender = false;

  // 1. Advance All 20 Wells (Water Aquifer) - Continuous Filling & Live Countdown Second-by-Second
  if (Array.isArray(sunflowerState.wells)) {
    let surgeMultiplier = 1;
    if (sunflowerState.waterSurgeTimer && sunflowerState.waterSurgeTimer > 0) {
      sunflowerState.waterSurgeTimer = Math.max(0, sunflowerState.waterSurgeTimer - dt);
      surgeMultiplier = 2;
    }

    sunflowerState.wells.forEach((well, idx) => {
      if (!well.unlocked) return;

      const cycleTime = getSfWellCycleTime(idx, well.level);
      const basketsPerCycle = getSfWellBasketsPerCycle(idx, well.level);
      well.productionTime = cycleTime;
      well.basketProduction = basketsPerCycle;
      well.lastTick = Date.now();

      // If manager is hired for water well, automatic click / produce continuously!
      if (well.hasWorker) {
        well.isProducing = true;
      }

      // Unlocked wells are always actively pumping water and advancing timers!
      well.isProducing = true;

      // Unlimited Well Storage - Continuous generation without cap
      if (typeof well.timer !== 'number' || !Number.isFinite(well.timer) || isNaN(well.timer) || well.timer <= 0 || well.timer > cycleTime * 1.5) {
        well.timer = cycleTime;
      }
      const speedMult = (typeof getActiveSunflowerSpeedMultiplier === 'function') ? getActiveSunflowerSpeedMultiplier() : 1;
      well.timer -= dt * surgeMultiplier * speedMult;
      if (well.timer <= 0) {
        well.timer = cycleTime;
        const produced = basketsPerCycle;
        well.totalBasketsGenerated = (well.totalBasketsGenerated || 0) + produced;

        if (well.hasWorker) {
          // Automatic Well Worker creates water baskets directly into player inventory & keeps producing!
          sunflowerState.baskets = (sunflowerState.baskets || 0) + produced;
        } else {
          // Manual well stores produced baskets ready for user collect, and KEEPS PRODUCING!
          well.storedBaskets = (well.storedBaskets || 0) + produced;
        }
        updateSingleWellUI(well.id, true);
      } else {
        // Fast progress bar & live countdown timer update
        updateSingleWellUI(well.id, false);
      }
    });
  }

  // Fallback for pump overdrive boost timer if active
  if (sunflowerState.cistern && sunflowerState.cistern.boostTimerRemaining > 0) {
    sunflowerState.cistern.boostTimerRemaining = Math.max(0, sunflowerState.cistern.boostTimerRemaining - dt);
  }

  // Advance 20 Dedicated Land Managers (Countdown active contracts)
  if (Array.isArray(sunflowerState.managers)) {
    sunflowerState.managers.forEach((mgr, idx) => {
      if (mgr.unlocked && mgr.activeTimer > 0) {
        mgr.activeTimer = Math.max(0, mgr.activeTimer - dt);
      }
      if (sunflowerState.plots && sunflowerState.plots[idx]) {
        sunflowerState.plots[idx].hasWorker = Boolean(mgr.unlocked && mgr.activeTimer > 0);
      }
    });
  }

  // Advance 20 Dedicated Water Well Managers (Countdown active contracts)
  if (Array.isArray(sunflowerState.wellManagers)) {
    sunflowerState.wellManagers.forEach((wm, idx) => {
      if (wm.unlocked && wm.activeTimer > 0) {
        wm.activeTimer = Math.max(0, wm.activeTimer - dt);
      }
      if (sunflowerState.wells && sunflowerState.wells[idx]) {
        sunflowerState.wells[idx].hasWorker = Boolean(wm.unlocked && wm.activeTimer > 0);
      }
    });
  }

  // 2. Advance All 20 Lands
  sunflowerState.plots.forEach((plot, idx) => {
    if (!plot.unlocked) return;

    // DEDICATED LAND MANAGER: 1 Manager for 1 Land (Fixed to Land idx + 1)
    const landMgr = Array.isArray(sunflowerState.managers) ? sunflowerState.managers[idx] : null;
    const isMgrActive = (landMgr && landMgr.unlocked && landMgr.activeTimer > 0) || plot.hasWorker;

    if (isMgrActive) {
      // 1. AUTOMATIC WATER FEED: Hydrate plant to maintain lifetime before it dies
      if (plot.plantStatus === 'alive') {
        const reqBuckets = getSfPlotRequiredBuckets(plot.level);
        if ((sunflowerState.baskets || 0) >= reqBuckets) {
          const maxCap = getSfPlotMaxLifeLimit(idx, plot.level);
          const waterBonus = getSfPlotWaterBonus(idx);
          // Feed water whenever life drops below 500s, adding water bonus with NO capping (unlimited life)
          if (plot.lifeTimer < 500) {
            sunflowerState.baskets -= reqBuckets;
            plot.lifeTimer = (plot.lifeTimer || 0) + waterBonus;
          }
        }
      }

      // 2. AUTOMATIC HARVEST COIN COLLECTION: Instantly sweep ready coins into player balance
      if (plot.plantStatus === 'alive' && (plot.uncollectedCoins || 0) > 0) {
        const boosterMult = (typeof getActiveSunflowerProfitMultiplier === 'function') ? getActiveSunflowerProfitMultiplier() : 1;
        const harvestCoins = plot.uncollectedCoins * boosterMult;
        sunflowerState.coins = (sunflowerState.coins || 0) + harvestCoins;
        plot.totalCoinsGenerated = (plot.totalCoinsGenerated || 0) + harvestCoins;
        plot.uncollectedCoins = 0;
        plot.readyToCollect = false;
      }
    }

    // A. GROWING PHASE (60 Seconds / 1 min Incubation for all Lands)
    if (plot.plantStatus === 'growing') {
      const speedMult = (typeof getActiveSunflowerSpeedMultiplier === 'function') ? getActiveSunflowerSpeedMultiplier() : 1;
      plot.growthTimer -= dt * speedMult;
      plot.lastTick = Date.now();
      if (plot.growthTimer <= 0) {
        plot.growthTimer = 0;
        plot.plantStatus = 'alive';
        const initialLife = 500; // User request: starts for 500 sec initial life
        plot.lifeTimer = initialLife; // Initial lifetime is 500s upon bloom! Add water buckets for unlimited life!
        plot.timer = getSfPlotCycleTime(idx, plot.level);
        plot.readyToCollect = false;
        plot.uncollectedCoins = 0;
        plot.isWithered = false;
        sunflowerAudio.playSolarChime();
        spawnSfFloat(`🌻 Land #${plot.id} Sunflower Matured! Initial Life: ${initialLife}s (Add 🪣 water for unlimited life!)`, window.innerWidth / 2, window.innerHeight / 2, 'text-yellow-400 font-bold');
        sfNeedRerender = true;
      } else {
        updateSinglePlotUI(plot.id);
      }
      return;
    }

    // B. EMPTY PLOT: Barney Auto-Planter Worker (Fallback for lands without dedicated manager)
    if (plot.plantStatus === 'empty') {
      if (sunflowerState.workers && sunflowerState.workers.barney && sunflowerState.seeds > 0) {
        sunflowerState.seeds -= 1;
        plot.plantStatus = 'growing';
        plot.growthTimer = 60.0;
        plot.growthDuration = 60.0;
        plot.level = 1;
        plot.lifeTimer = 0;
        plot.timer = getSfPlotCycleTime(idx, 1);
        plot.readyToCollect = false;
        plot.uncollectedCoins = 0;
        plot.isWithered = false;
        plot.lastTick = Date.now();
        sfNeedRerender = true;
      }
      return;
    }

    // C. DEAD PLOT
    if (plot.plantStatus === 'dead') {
      return;
    }

    // D. ALIVE PHASE
    if (plot.plantStatus === 'alive') {
      const maxCap = getSfPlotMaxLifeLimit(idx, plot.level);
      const waterBonus = getSfPlotWaterBonus(idx);

      // Chloe Auto-Waterer Worker (Fallback for lands without dedicated manager)
      if (sunflowerState.workers && sunflowerState.workers.chloe && sunflowerState.baskets > 0 && plot.lifeTimer < 500) {
        sunflowerState.baskets -= 1;
        plot.lifeTimer = (plot.lifeTimer || 0) + waterBonus;
      }

      // Sunflower Lifetime reduces second-by-second
      plot.lifeTimer -= dt;

      // Flower dies when lifetime runs out
      if (plot.lifeTimer <= 0) {
        plot.lifeTimer = 0;
        plot.plantStatus = 'dead';
        plot.isWithered = true;
        plot.readyToCollect = false;
        sunflowerAudio.playTone(180, 'sawtooth', 0.25, 0.1);
        spawnSfFloat(`🥀 Land #${plot.id} Sunflower expired! Use shovel 🪏 to clear or throw water 🪣 to revive`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
        sfNeedRerender = true;
        return;
      }

      // Coin Generation Timer (Loading Bar value generates flower time until full)
      const cycleTime = getSfPlotCycleTime(idx, plot.level);
      const coinsPerCycle = getSfPlotCoinsPerCycle(idx, plot.level);
      const speedMult = (typeof getActiveSunflowerSpeedMultiplier === 'function') ? getActiveSunflowerSpeedMultiplier() : 1;

      plot.productionTime = cycleTime;
      plot.coinProduction = coinsPerCycle;
      gardenTotalCps += (coinsPerCycle / cycleTime) * speedMult;

      // UNLIMITED COIN PRODUCTION: Continuous cycle without capping
      if (typeof plot.timer !== 'number' || !Number.isFinite(plot.timer) || isNaN(plot.timer) || plot.timer <= 0 || plot.timer > cycleTime * 1.5) {
        plot.timer = cycleTime;
      }
      plot.timer -= dt * speedMult;

      // Each time cycle completes, accumulate coins infinitely with NO LIMIT!
      if (plot.timer <= 0) {
        plot.timer = cycleTime; // Continue immediately to next cycle!
        plot.uncollectedCoins = (plot.uncollectedCoins || 0) + coinsPerCycle;
        plot.readyToCollect = true;

        if (!sunflowerAudio.muted) {
          sunflowerAudio.playTone(880, 'sine', 0.12, 0.08);
        }

        // Dedicated Land Manager auto-collects immediately upon cycle completion!
        if ((isMgrActive || plot.hasWorker) && (plot.uncollectedCoins || 0) > 0) {
          const boosterMult = (typeof getActiveSunflowerProfitMultiplier === 'function') ? getActiveSunflowerProfitMultiplier() : 1;
          const harvestCoins = plot.uncollectedCoins * boosterMult;
          sunflowerState.coins = (sunflowerState.coins || 0) + harvestCoins;
          plot.totalCoinsGenerated = (plot.totalCoinsGenerated || 0) + harvestCoins;
          plot.uncollectedCoins = 0;
          plot.readyToCollect = false;
        }
      }

      if ((plot.uncollectedCoins || 0) > 0) {
        plot.readyToCollect = true;
      }

      plot.lastTick = Date.now();
      updateSinglePlotUI(plot.id);
    }
  });

  if (sfNeedRerender) {
    renderSunflowerPlots();
  }

  // 3. Update Income Rate Display & Live UI
  sfIncomeSecondAccumulator += dt;
  if (sfIncomeSecondAccumulator >= 0.5) {
    sfIncomeSecondAccumulator = 0;
    const rateEl = document.getElementById('sfTotalIncomeRate');
    if (rateEl) rateEl.innerText = formatNumber(gardenTotalCps);
    updateStickyHeaderAndMiniStats();
    updateLiveUpgradeButtons();
    updateSunflowerManagersLiveTimers();
  }

  sfAnimationId = requestAnimationFrame(sunflowerMainLoop);
}

function updateLiveUpgradeButtons() {
  const mult = sunflowerState.upgradeMultiplier || 1;
  const coins = sunflowerState.coins;

  sunflowerState.plots.forEach((plot, idx) => {
    if (!plot.unlocked || plot.plantStatus !== 'alive') return;
    const btn = document.getElementById(`sfPlotUpBtn-${plot.id}`);
    if (btn) {
      if (plot.level >= 5000) {
        btn.className = "sf-sketch-up-btn disabled";
        btn.disabled = true;
        btn.innerHTML = `<span>MAX</span>`;
      } else {
        const upInfo = getSfMultiUpgradeInfo(idx, plot.level, mult, coins);
        const canAfford = coins >= upInfo.totalCost;
        btn.disabled = false;
        if (canAfford) {
          btn.classList.remove('disabled');
        } else {
          btn.classList.add('disabled');
        }
        btn.innerHTML = `<span>Upgrade (${formatNumber(upInfo.totalCost)} ☀️)</span>`;
      }
    }
  });

  if (Array.isArray(sunflowerState.wells)) {
    sunflowerState.wells.forEach((well, idx) => {
      if (!well.unlocked) return;
      const upBtn = document.getElementById(`sfWellUpBtn-${well.id}`);
      if (upBtn) {
        if (well.level >= 5000) {
          upBtn.className = "sf-card-btn sf-btn-upgrade disabled";
          upBtn.disabled = true;
          upBtn.innerHTML = "<span>★ MAX</span>";
        } else {
          const upInfo = getSfWellMultiUpgradeInfo(idx, well.level, mult, coins);
          const canAfford = coins >= upInfo.totalCost;
          upBtn.disabled = false;
          if (canAfford) {
            upBtn.classList.remove('disabled');
          } else {
            upBtn.classList.add('disabled');
          }
          upBtn.innerHTML = `<span>▲ Lv.${upInfo.targetLevel} (${formatNumber(upInfo.totalCost)} ☀️)</span>`;
        }
      }
    });
  }
}

function updateStickyHeaderAndMiniStats() {
  const sCoins = document.getElementById('sfStickyCoins');
  const sGold = document.getElementById('sfStickyGoldCoins');
  const sDiamonds = document.getElementById('sfStickyDiamonds');
  const sSeeds = document.getElementById('sfStickySeeds');
  const sBaskets = document.getElementById('sfStickyBaskets');
  const sShovels = document.getElementById('sfStickyShovels');
  
  if (sCoins) sCoins.innerText = formatNumber(Math.floor(sunflowerState.coins || 0));
  if (sGold) {
    const g = (window.gameState && window.gameState.player && window.gameState.player.coins) || 0;
    sGold.innerText = typeof formatNumber === 'function' ? formatNumber(g) : g;
  }
  if (sDiamonds) {
    const d = sunflowerState.diamonds;
    sDiamonds.innerText = typeof formatNumber === 'function' ? formatNumber(d || 0) : (d || 0);
  }
  if (sSeeds) sSeeds.innerText = sunflowerState.seeds || 0;
  if (sBaskets) sBaskets.innerText = sunflowerState.baskets || 0;
  if (sShovels) sShovels.innerText = sunflowerState.shovels || 0;

  

  // Shop display counts
  const spPlant = document.getElementById('sfShopPlantCount');
  const spBask = document.getElementById('sfShopBucketCount');
  const spShov = document.getElementById('sfShopShovelCount');
  const spDiam = document.getElementById('sfShopDiamondCount');
  if (spPlant) spPlant.innerText = sunflowerState.seeds || 0;
  if (spBask) spBask.innerText = sunflowerState.baskets || 0;
  if (spShov) spShov.innerText = sunflowerState.shovels || 0;
  if (spDiam) {
    const d = sunflowerState.diamonds;
    spDiam.innerText = (typeof d === 'number' && d > 0 && d < 1 ? d.toFixed(6) : (d || 0)) + ' ⭐';
  }

  if (typeof updateSunflowerBoosterUI === 'function') {
    updateSunflowerBoosterUI();
  }

  // Land Page 1 Live Counters
  const lpSummary = document.getElementById('sfPlotsSummaryLabel');
  const lpWorkerBadge = document.getElementById('sfLandWorkersSummaryBadge');
  if (lpSummary && Array.isArray(sunflowerState.plots)) {
    const unl = sunflowerState.plots.filter(p => p.unlocked).length;
    lpSummary.innerText = `${unl} of 20 Lands Unlocked`;
  }
  if (lpWorkerBadge) {
    lpWorkerBadge.innerText = `👷 ${getAssignedLandWorkersCount()}/20 Managers`;
  }

  // Water Page 2 Live Counters
  const wpBask = document.getElementById('sfWaterPageBasketsCount');
  const wpIdle = document.getElementById('sfWaterPageIdleWorkers');
  const wpSummary = document.getElementById('sfWellsSummaryLabel');
  const wpWorkerBadge = document.getElementById('sfWellWorkersSummaryBadge');

  if (wpBask) wpBask.innerText = `${sunflowerState.baskets || 0} 🧺`;
  if (wpIdle) wpIdle.innerText = getIdleWellWorkersCount();
  if (wpSummary && Array.isArray(sunflowerState.wells)) {
    const unl = sunflowerState.wells.filter(w => w.unlocked).length;
    wpSummary.innerText = `${unl} of 20 Wells Unlocked`;
  }
  if (wpWorkerBadge) {
    wpWorkerBadge.innerText = `👷 ${getAssignedWellWorkersCount()}/20 Workers`;
  }

  // Converter Page 5 counters
  const convCoin = document.getElementById('sfConvCoinDisplay');
  const convTot = document.getElementById('sfConvTotalEnergyDisplay');
  if (convCoin) convCoin.innerText = `${formatNumber(Math.floor(sunflowerState.coins))} ☀️`;
  if (convTot) convTot.innerText = `${formatNumber(sunflowerState.energy || 0)} ⚡`;

  // Spin Coin Exchange Page 5 counters
  const spinCoinsDisp = document.getElementById('sfSpinExchCoinsDisplay');
  const spinOwnedDisp = document.getElementById('sfSpinExchOwnedDisplay');
  const spinMaxLabel = document.getElementById('sfSpinMaxPossibleLabel');
  if (spinCoinsDisp) spinCoinsDisp.innerText = `${formatNumber(Math.floor(sunflowerState.coins))} ☀️`;
  if (spinOwnedDisp && typeof gameState !== 'undefined' && gameState.player) {
    spinOwnedDisp.innerText = `${((gameState.player && gameState.player.chestTickets) || 0).toLocaleString()} 🎡`;
  }
  if (spinMaxLabel) {
    const maxAfford = Math.floor((sunflowerState.coins || 0) / 1e15);
    spinMaxLabel.innerText = `${maxAfford.toLocaleString()} 🎡`;
  }
}

/* ==========================================================================
   SOLAR REFINERY CONVERTER: 100 ☀️ Coins -> 29 ⚡ Energy
   ========================================================================== */
function executeSfCoinToEnergy(amount = 100, event = null) {
  let cost = 0;
  if (amount === 'all') {
    const batches = Math.floor(sunflowerState.coins / 100);
    cost = batches * 100;
  } else {
    cost = amount;
  }

  if (cost < 100 || sunflowerState.coins < cost) {
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat('Need at least 100 ☀️ Coins to Convert!', posX, posY, 'text-red-400');
    return;
  }

  const batches = Math.floor(cost / 100);
  const energyGain = batches * 29;

  sunflowerState.coins -= cost;
  sunflowerState.energy = (sunflowerState.energy || 0) + energyGain;

  if (typeof gameState !== 'undefined' && gameState.reactor) {
    const maxE = gameState.reactor.maxEnergy || 1000;
    gameState.reactor.currentEnergy = Math.min(maxE, (gameState.reactor.currentEnergy || 0) + energyGain);
    if (typeof updateEnergyUI === 'function') updateEnergyUI();
    if (typeof window.saveGame === 'function') window.saveGame(true);
    if (typeof window.updateUI === 'function') window.updateUI();
  }

  sunflowerAudio.playSolarChime();
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2;
  spawnSfFloat(`-${cost} ☀️ &rarr; +${energyGain} ⚡ Solar Energy!`, posX, posY, 'text-yellow-300');

  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
}


/* ==========================================================================
   ⭐ STAR COIN EXCHANGE (10 Qa ☀️ = 1 ⭐ Star Coin ... 10 Cn ☀️ = 97 ⭐)
   - Exchange ladder: 10 Qa, 10 Qi, 10 Sx ... up to 10 Cn
   - Exchange triggers Full Sunflower Farm Rebirth (Zero to start full game)
   - Sunflower coins, water buckets, shovels, baby plants/seeds reset to 0
   - All plots, wells, and managers reset to initial starting defaults
   - Player's Main Gold Coins (task_game_coins) & Star Coins (task_game_stars)
     ARE FULLY PRESERVED and Star Coins are credited with earned stars!
   ========================================================================== */

const SF_NUM_SUFFIXES = (function() {
  const base = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
    'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod'];
  const ones = ['', 'U', 'D', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
  const tens = ['Vg', 'Tg', 'Qag', 'Qig', 'Sxg', 'Spg', 'Ocg', 'Nog'];
  const list = [...base];
  for (let t = 0; t < tens.length; t++) {
    for (let o = 0; o < 10; o++) {
      const prefix = ones[o];
      const root = tens[t];
      list.push(o === 0 ? root : prefix + root.toLowerCase());
    }
  }
  list.push('Cn');
  return list;
})();
window.SF_NUM_SUFFIXES = SF_NUM_SUFFIXES;

function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) return '0';
  if (Math.abs(num) < 1000) return Math.floor(num).toLocaleString();
  const tier = Math.min(SF_NUM_SUFFIXES.length - 1, Math.floor(Math.log10(Math.abs(num)) / 3));
  if (tier <= 0) return Math.floor(num).toLocaleString();
  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;
  const formatted = (scaled >= 100 || Math.abs(scaled - Math.round(scaled)) < 0.01)
    ? Math.round(scaled).toString()
    : scaled.toFixed(scaled < 10 ? 2 : 1);
  return formatted + ' ' + SF_NUM_SUFFIXES[tier];
}
window.formatNumber = formatNumber;

// Build 97 Exchange Tiers from 10 Qa (index 5) up to 10 Cn (index 101)
const SF_EXCHANGE_TIERS = (function() {
  const tiers = [];
  for (let i = 5; i < SF_NUM_SUFFIXES.length; i++) {
    const sfx = SF_NUM_SUFFIXES[i];
    const exponent = 3 * i;
    const cost = 10 * Math.pow(10, exponent);
    const tierNum = i - 4; // Tier 1: 10 Qa, Tier 2: 10 Qi, ... Tier 97: 10 Cn
    const stars = tierNum; // 1 ⭐, 2 ⭐, 3 ⭐ ... 97 ⭐
    tiers.push({
      tier: tierNum,
      suffix: sfx,
      name: '10 ' + sfx,
      cost: cost,
      stars: stars
    });
  }
  return tiers;
})();
window.SF_EXCHANGE_TIERS = SF_EXCHANGE_TIERS;

const SF_STAR_BASE_COST = SF_EXCHANGE_TIERS[0].cost; // 10 Qa (1e16)
const SF_STAR_BATCHES = SF_EXCHANGE_TIERS.map(t => t.stars);
window.SF_STAR_BASE_COST = SF_STAR_BASE_COST;
window.SF_STAR_BATCHES = SF_STAR_BATCHES;
window.SF_SPIN_BASE_COST = SF_STAR_BASE_COST; // compatibility alias

function resetSunflowerFarmForExchange() {
  sunflowerState.coins = 0;
  sunflowerState._coins = 0;
  if (typeof window !== 'undefined' && window.gameState && window.gameState.player) {
    window.gameState.player.sunflowerCoins = 0;
    window.gameState.player.sunflower = 0;
  }
  sunflowerState.seeds = 0;        // Baby plant / seeds reset to 0
  sunflowerState.baskets = 0;      // Water bucket / baskets reset to 0
  sunflowerState.shovels = 0;      // Shovels reset to 0
  sunflowerState.energy = 0;
  sunflowerState.selectedStarTierIndex = 0;
  sunflowerState.wellWorkersCount = 0;
  sunflowerState.landWorkersCount = 0;
  sunflowerState.workers = { walter: false, dave: false, elena: false, leo: false, barney: false, chloe: false };
  sunflowerState.cistern = {
    basketsInCrate: 0,
    maxCrateCapacity: 999999999,
    baseFillSeconds: 4.0,
    currentProgress: 0,
    boostTimerRemaining: 0
  };
  sunflowerState.isWaterCollecting = false;
  sunflowerState.plots = createDefaultSfPlots();
  sunflowerState.wells = createDefaultSfWells();
  sunflowerState.managers = createDefaultSfManagers();
  sunflowerState.wellManagers = createDefaultSfWellManagers();
}
window.resetSunflowerFarmForExchange = resetSunflowerFarmForExchange;

function renderSunflowerStarExchange() {
  const coinsDisplay = document.getElementById('sfStarExchCoinsDisplay') || document.getElementById('sfSpinExchCoinsDisplay');
  const ownedDisplay = document.getElementById('sfStarExchOwnedDisplay') || document.getElementById('sfSpinExchOwnedDisplay');
  const maxLabel = document.getElementById('sfStarMaxPossibleLabel') || document.getElementById('sfSpinMaxPossibleLabel');

  const currentCoins = (typeof sunflowerState !== 'undefined' && sunflowerState.coins) || 0;
  const currentStars = (typeof sunflowerState !== 'undefined' && typeof sunflowerState.diamonds === 'number')
    ? sunflowerState.diamonds
    : (parseInt(localStorage.getItem('task_game_stars') || '0', 10) || 0);

  if (coinsDisplay) {
    coinsDisplay.innerText = `${formatNumber(currentCoins)} ☀️`;
  }
  if (ownedDisplay) {
    ownedDisplay.innerText = `${typeof formatNumber === 'function' ? formatNumber(currentStars) : currentStars} ⭐`;
  }

  // Find maximum affordable tier
  let maxAffordableTier = null;
  for (let i = SF_EXCHANGE_TIERS.length - 1; i >= 0; i--) {
    if (currentCoins >= SF_EXCHANGE_TIERS[i].cost) {
      maxAffordableTier = SF_EXCHANGE_TIERS[i];
      break;
    }
  }
  if (maxLabel) {
    if (maxAffordableTier) {
      maxLabel.innerText = `${maxAffordableTier.stars} ⭐ (${maxAffordableTier.name})`;
    } else {
      maxLabel.innerText = '0 ⭐ (Need 10 Qa)';
    }
  }

  let selectedIdx = (typeof sunflowerState.selectedStarTierIndex === 'number') ? sunflowerState.selectedStarTierIndex : 0;
  if (selectedIdx < 0) selectedIdx = 0;
  if (selectedIdx >= SF_EXCHANGE_TIERS.length) selectedIdx = SF_EXCHANGE_TIERS.length - 1;
  sunflowerState.selectedStarTierIndex = selectedIdx;

  const currentTier = SF_EXCHANGE_TIERS[selectedIdx];
  const canAfford = currentCoins >= currentTier.cost;

  const ticketsLabel = document.getElementById('sfStarPackageLabel') || document.getElementById('sfSpinPackageTicketsLabel');
  const costLabel = document.getElementById('sfStarPackageCostLabel') || document.getElementById('sfSpinPackageCostLabel');
  const rawCostLabel = document.getElementById('sfStarPackageRawCost') || document.getElementById('sfSpinPackageRawCost');
  const selectedCountEl = document.getElementById('sfStarSelectedCount') || document.getElementById('sfSpinSelectedCount');
  const actionBtn = document.getElementById('sfStarExchangeSelectedBtn') || document.getElementById('sfSpinExchangeSelectedBtn');

  if (ticketsLabel) ticketsLabel.innerText = `${currentTier.stars} ⭐ Star Coin${currentTier.stars > 1 ? 's' : ''}`;
  if (costLabel) costLabel.innerText = `${formatNumber(currentTier.cost)} ☀️`;
  if (rawCostLabel) rawCostLabel.innerText = `(${currentTier.name} ☀️ &bull; Tier ${currentTier.tier} of ${SF_EXCHANGE_TIERS.length} &bull; Farm Rebirth)`;
  if (selectedCountEl) selectedCountEl.innerText = `${currentTier.stars}`;
  if (actionBtn) {
    if (canAfford) {
      actionBtn.classList.remove('opacity-60', 'grayscale');
      actionBtn.title = `Exchange ${currentTier.name} ☀️ for ${currentTier.stars} ⭐ (Rebirth Sunflower Farm)`;
    } else {
      actionBtn.classList.add('opacity-60');
      actionBtn.title = `Need ${currentTier.name} ☀️ to exchange`;
    }
  }
}
window.renderSunflowerStarExchange = renderSunflowerStarExchange;
window.renderSunflowerSpinExchange = renderSunflowerStarExchange; // compatibility alias

window.stepSunflowerStarPackage = function(delta) {
  let idx = (typeof sunflowerState.selectedStarTierIndex === 'number') ? sunflowerState.selectedStarTierIndex : 0;
  idx += delta;
  if (idx < 0) idx = 0;
  if (idx >= SF_EXCHANGE_TIERS.length) idx = SF_EXCHANGE_TIERS.length - 1;
  sunflowerState.selectedStarTierIndex = idx;
  sunflowerState.selectedStarCount = SF_EXCHANGE_TIERS[idx].stars;
  if (sunflowerAudio && sunflowerAudio.playTone) sunflowerAudio.playTone(500 + Math.min(200, idx * 5), 'sine', 0.08, 0.05);
  renderSunflowerStarExchange();
};
window.stepSunflowerSpinPackage = window.stepSunflowerStarPackage; // compatibility alias

window.exchangeCurrentSfStarPackage = function(event) {
  const idx = (typeof sunflowerState.selectedStarTierIndex === 'number') ? sunflowerState.selectedStarTierIndex : 0;
  const currentTier = SF_EXCHANGE_TIERS[idx] || SF_EXCHANGE_TIERS[0];
  executeSunflowerStarExchange(currentTier, event);
};
window.exchangeCurrentSfSpinPackage = window.exchangeCurrentSfStarPackage; // compatibility alias

function executeSunflowerStarExchange(tier, event = null) {
  if (typeof sunflowerState === 'undefined' || !tier) return;

  const currentCoins = sunflowerState.coins || 0;
  const cost = tier.cost;
  const starsAwarded = tier.stars;

  if (currentCoins < cost) {
    if (typeof sunflowerAudio !== 'undefined' && typeof sunflowerAudio.playTone === 'function') {
      sunflowerAudio.playTone(220, 'sawtooth', 0.15, 0.08);
    }
    const needed = cost - currentCoins;
    const posX = event ? event.clientX : window.innerWidth / 2;
    const posY = event ? event.clientY : window.innerHeight / 2;
    spawnSfFloat(`⚠️ Need ${tier.name} ☀️! (Short ${formatNumber(needed)})`, posX, posY, 'text-red-400 font-black');
    return;
  }

  // 1. Award Star Coins (Increases player's Star balance; never reset to zero)
  const currentStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10) || 0;
  const newStars = currentStars + starsAwarded;
  sunflowerState.diamonds = newStars;
  try {
    localStorage.setItem('task_game_stars', newStars.toString());
    const ch = new BroadcastChannel('nova_task_sync');
    ch.postMessage({ type: 'COINS_UPDATED', stars: newStars });
  } catch (e) {}
  if (typeof window !== 'undefined' && window.gameState && window.gameState.player) {
    window.gameState.player.diamonds = newStars;
    window.gameState.player.stars = newStars;
    if (typeof window.updateUI === 'function') window.updateUI();
  }

  // 2. Full reset of Sunflower Farm (zero to start full game)
  // Sunflower coins = 0, water bucket = 0, shovels = 0, baby plant / seeds = 0
  // Plots, wells, managers reset to initial starting state
  // Player's Main Gold Coins (task_game_coins) & Star Coins are NOT changed/wiped!
  resetSunflowerFarmForExchange();

  // Record task event if task runner is listening
  if (typeof window.recordTaskEvent === 'function') {
    window.recordTaskEvent('sunflower_exchange', starsAwarded);
  }

  // Audio feedback
  if (typeof sunflowerAudio !== 'undefined' && typeof sunflowerAudio.playUnlockChime === 'function') {
    sunflowerAudio.playUnlockChime();
  } else if (typeof sunflowerAudio !== 'undefined' && typeof sunflowerAudio.playSolarChime === 'function') {
    sunflowerAudio.playSolarChime();
  }

  // Celebratory UI feedback
  const posX = event ? event.clientX : window.innerWidth / 2;
  const posY = event ? event.clientY : window.innerHeight / 2 - 20;
  spawnSfFloat(`🎉 +${starsAwarded.toLocaleString()} ⭐ Star Coin${starsAwarded > 1 ? 's' : ''} Claimed! Farm Rebirth at Zero!`, posX, posY, 'text-yellow-300 font-black text-sm');

  // Live UI updates across all tabs
  if (typeof renderSunflowerPlots === 'function') renderSunflowerPlots();
  if (typeof renderSunflowerWells === 'function') renderSunflowerWells();
  if (typeof updateWorkersUI === 'function') updateWorkersUI();
  if (typeof updateStickyHeaderAndMiniStats === 'function') updateStickyHeaderAndMiniStats();
  renderSunflowerStarExchange();

  // Immediate save & Cloud sync
  try {
    localStorage.setItem(SF_STORAGE_KEY, JSON.stringify(sunflowerState));
  } catch (e) {}
  saveSunflowerStateDebounced();
  if (typeof saveGameState === 'function') saveGameState();
  if (typeof window.firebaseSync !== 'undefined' && typeof window.firebaseSync.saveUserData === 'function') {
    window.firebaseSync.saveUserData();
  }
}
window.executeSunflowerStarExchange = executeSunflowerStarExchange;

function exchangeSfCoinsForStars(amount, event = null) {
  if (typeof sunflowerState === 'undefined') return;
  const currentCoins = sunflowerState.coins || 0;

  if (amount === 'max') {
    let bestTier = null;
    let bestIdx = 0;
    for (let i = SF_EXCHANGE_TIERS.length - 1; i >= 0; i--) {
      if (currentCoins >= SF_EXCHANGE_TIERS[i].cost) {
        bestTier = SF_EXCHANGE_TIERS[i];
        bestIdx = i;
        break;
      }
    }
    if (!bestTier) {
      if (typeof sunflowerAudio !== 'undefined' && typeof sunflowerAudio.playTone === 'function') {
        sunflowerAudio.playTone(220, 'sawtooth', 0.15, 0.08);
      }
      const posX = event ? event.clientX : window.innerWidth / 2;
      const posY = event ? event.clientY : window.innerHeight / 2;
      spawnSfFloat('⚠️ Need at least 10 Qa ☀️ Coins for 1 ⭐ Star Coin!', posX, posY, 'text-red-400 font-black');
      return;
    }
    sunflowerState.selectedStarTierIndex = bestIdx;
    executeSunflowerStarExchange(bestTier, event);
    return;
  }

  const idx = (typeof sunflowerState.selectedStarTierIndex === 'number') ? sunflowerState.selectedStarTierIndex : 0;
  const currentTier = SF_EXCHANGE_TIERS[idx] || SF_EXCHANGE_TIERS[0];
  executeSunflowerStarExchange(currentTier, event);
}
window.exchangeSfCoinsForStars = exchangeSfCoinsForStars;
window.exchangeSfCoinsForSpin = exchangeSfCoinsForStars; // compatibility alias

// Safe no-ops for removed fuel and prestige systems
window.switchSunflowerExchangeSubtab = function() { renderSunflowerStarExchange(); };
window.renderSunflowerFuelShopCards = function() {};
window.renderSunflowerPrestigeUI = function() {};
window.executeSunflowerPrestige = function() {};
window.buySunflowerFuelCell = function() {};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
function initSunflowerTycoonGame() {
  const collBtn = document.getElementById('sfCollectAllWellsBtn');
  if (collBtn) {
    collBtn.onclick = (e) => collectAllWellsBaskets(e);
  }

  const sndBtn = document.getElementById('sfSoundBtn');
  if (sndBtn) {
    sndBtn.onclick = () => {
      sunflowerAudio.muted = !sunflowerAudio.muted;
      sndBtn.innerText = sunflowerAudio.muted ? '🔇' : '🔊';
    };
  }

  // Initialize Multiplier Circle Toggle Button
  const mult = sunflowerState.upgradeMultiplier || 1;
  const displayVal = mult === 'max' ? 'MAX' : `${mult}x`;
  document.querySelectorAll('.sf-mult-circle-val').forEach(el => {
    el.innerText = displayVal;
  });
  document.querySelectorAll('.sf-mult-circle-toggle-btn').forEach(btn => {
    btn.setAttribute('data-mult', String(mult));
  });

  renderSunflowerPlots();
  renderSunflowerWells();
  updateStickyHeaderAndMiniStats();
  updateWorkersUI();
  syncSunflowerToFirebase();

  cleanupSunflowerPage();
  const sfPage = document.getElementById('pageSunflower');
  if (sfPage && sfPage.classList.contains('active')) {
    sfIsLoopRunning = true;
    sfLastFrameTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    sfAnimationId = requestAnimationFrame(sunflowerMainLoop);
  }
}


function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Global Exports
window.initSunflowerTycoonGame = initSunflowerTycoonGame;
window.initSunflowerPage = initSunflowerTycoonGame;
window.updateSunflowerUI = function() {
  renderSunflowerPlots();
  renderSunflowerWells();
  updateStickyHeaderAndMiniStats();
};
window.renderSunflowerPlots = renderSunflowerPlots;
window.renderSunflowerWells = renderSunflowerWells;
window.renderSunflowerSpinExchange = renderSunflowerSpinExchange;
window.renderSunflowerFuelShopCards = renderSunflowerFuelShopCards;
window.exchangeSfCoinsForSpin = exchangeSfCoinsForSpin;
window.updateSunflowerMiniStats = updateStickyHeaderAndMiniStats;
window.executeSfCoinToEnergy = executeSfCoinToEnergy;

// Sunflower Shop Watch Ad Buttons (Page 3 Store & Depot)
window.openSunflowerAdModal = function(itemType) {
  const doReward = () => {
    if (itemType === 'sprout' || itemType === 'seed') {
      sunflowerState.seeds = (sunflowerState.seeds || 0) + 1;
      spawnSfFloat('+1 Free 🌱 Baby Plant Claimed!', window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400 font-black');
    } else if (itemType === 'basket' || itemType === 'bucket') {
      sunflowerState.baskets = (sunflowerState.baskets || 0) + 5; // 5 buckets per user request
      spawnSfFloat('+5 Free 🪣 Water Buckets Claimed!', window.innerWidth / 2, window.innerHeight / 2, 'text-cyan-400 font-black');
    } else if (itemType === 'shovel') {
      sunflowerState.shovels = (sunflowerState.shovels || 0) + 1;
      spawnSfFloat('+1 Free 🪏 Garden Shovel Claimed!', window.innerWidth / 2, window.innerHeight / 2, 'text-orange-400 font-black');
    }
    saveSunflowerStateDebounced();
    updateStickyHeaderAndMiniStats();
    if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playCoin) sunflowerAudio.playCoin();
  };

  // Rewarded interstitial
  if (typeof show_10676091 === 'function') {
    show_10676091().then(() => {
      // You need to add your user reward function here, which will be executed after the user watches the ad.
      // For more details, please refer to the detailed instructions.
      alert('You have seen an ad!');
      doReward();
    }).catch(e => {
      console.warn('show_10676091 notice in sunflower shop:', e);
      doReward();
    });
  } else if (typeof window.showRewardedAd === 'function') {
    window.showRewardedAd(doReward, {
      adTitle: `Sunflower Shop Free ${itemType}`,
      adDesc: `Watch ad to claim free ${itemType}!`
    });
  } else {
    doReward();
  }
};

/* ==========================================================================
   SUNFLOWER SHOP PURCHASES & 20-MINUTE HARVEST PROFIT BOOSTERS
   ========================================================================== */
window.buySunflowerItem = function(itemType, count, currency) {
  if (typeof gameState === 'undefined' || !gameState.player) return;
  let cost = 0;
  if (itemType === 'seed' || itemType === 'plant') {
    cost = 200; // 200 gold coins
    if ((gameState.player.coins || 0) < cost) {
      if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
      spawnSfFloat(`❌ Need 200 🪙 Gold Coins! (Have: ${Math.floor(gameState.player.coins || 0)})`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
      return;
    }
    gameState.player.coins -= cost;
    sunflowerState.seeds = (sunflowerState.seeds || 0) + (count || 1);
    spawnSfFloat(`+${count || 1} 🌱 Baby Plant Seed Purchased! (-200 🪙)`, window.innerWidth / 2, window.innerHeight / 2, 'text-emerald-400 font-black');
  } else if (itemType === 'basket' || itemType === 'bucket') {
    cost = 250; // 250 gold coins for 10 buckets
    if ((gameState.player.coins || 0) < cost) {
      if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
      spawnSfFloat(`❌ Need 250 🪙 Gold Coins! (Have: ${Math.floor(gameState.player.coins || 0)})`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
      return;
    }
    gameState.player.coins -= cost;
    sunflowerState.baskets = (sunflowerState.baskets || 0) + (count || 10);
    spawnSfFloat(`+${count || 10} 🪣 Water Buckets Purchased! (-250 🪙)`, window.innerWidth / 2, window.innerHeight / 2, 'text-cyan-400 font-black');
  } else if (itemType === 'shovel') {
    cost = 200; // 200 gold coins
    if ((gameState.player.coins || 0) < cost) {
      if (sunflowerAudio && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
      spawnSfFloat(`❌ Need 200 🪙 Gold Coins! (Have: ${Math.floor(gameState.player.coins || 0)})`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold');
      return;
    }
    gameState.player.coins -= cost;
    sunflowerState.shovels = (sunflowerState.shovels || 0) + (count || 1);
    spawnSfFloat(`+${count || 1} 🪏 Garden Shovel Purchased! (-200 🪙)`, window.innerWidth / 2, window.innerHeight / 2, 'text-orange-400 font-black');
  }
  window._lastCurrencyDeductionTime = Date.now();
  if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
    window.firebaseSync.syncPlayerCurrenciesImmediate();
  }
  if (sunflowerAudio && sunflowerAudio.playCoin) sunflowerAudio.playCoin();
  if (typeof window.updateUI === 'function') window.updateUI();
  if (typeof window.saveGame === 'function') window.saveGame(true);
  saveSunflowerStateDebounced();
  updateStickyHeaderAndMiniStats();
};

window.activateSunflowerProfitBooster = function(multiplier) {
  multiplier = Number(multiplier) || 2;

  const doActivate = () => {
    // One time one run: overwrites existing booster so only 1 is active at a time
    sunflowerState.activeBooster = {
      type: 'profit',
      multiplier: multiplier,
      expiresAt: Date.now() + 20 * 60 * 1000 // 20 minutes duration
    };
    if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playSolarChime) sunflowerAudio.playSolarChime();
    spawnSfFloat(`⚡ ${multiplier}X HARVEST PROFIT ACTIVATED! (20 Minutes)`, window.innerWidth / 2, window.innerHeight / 2, 'text-yellow-400 font-black text-sm');
    saveSunflowerStateDebounced();
    updateSunflowerBoosterUI();
    renderSunflowerPlots();
  };

  if (multiplier === 2) {
    // *2: Watch Ad
    if (typeof window.showRewardedAd === 'function') {
      window.showRewardedAd(doActivate, {
        adTitle: `2X Harvest Profit Booster`,
        adDesc: `Watch this sponsored video to boost all harvest coins by 2X for 20 Minutes!`
      });
    } else {
      doActivate();
    }
    return;
  }

  if (multiplier === 5) {
    // *5: 100 Coins
    const playerCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number')
      ? window.gameState.player.coins
      : (typeof gameState !== 'undefined' && gameState.player && typeof gameState.player.coins === 'number' ? gameState.player.coins : 0);

    if (playerCoins < 100) {
      if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
      spawnSfFloat(`❌ Need 100 🪙 Gold Coins! You have ${Math.floor(playerCoins)} 🪙`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold text-sm');
      return;
    }

    if (window.gameState && window.gameState.player) {
      window.gameState.player.coins -= 100;
    } else if (typeof gameState !== 'undefined' && gameState.player) {
      gameState.player.coins -= 100;
    }

    if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playCoin) sunflowerAudio.playCoin();
    doActivate();
    if (typeof window.updateUI === 'function') window.updateUI();
    if (typeof window.saveGame === 'function') window.saveGame(true);
    return;
  }

  if (multiplier === 10) {
    // *10: 100 Star Coins
    const playerStars = (typeof sunflowerState !== 'undefined' && typeof sunflowerState.diamonds === 'number')
      ? sunflowerState.diamonds
      : ((window.gameState && window.gameState.player && typeof window.gameState.player.diamonds === 'number')
        ? window.gameState.player.diamonds
        : (parseInt(localStorage.getItem('task_game_stars') || '0', 10) || 0));

    if (playerStars < 100) {
      if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
      spawnSfFloat(`❌ Need 100 ⭐ Star Coins! You have ${Math.floor(playerStars)} ⭐`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold text-sm');
      return;
    }

    if (typeof sunflowerState !== 'undefined') {
      sunflowerState.diamonds -= 100;
    } else if (window.gameState && window.gameState.player) {
      window.gameState.player.diamonds -= 100;
    } else if (typeof gameState !== 'undefined' && gameState.player) {
      gameState.player.diamonds -= 100;
    }

    window._lastCurrencyDeductionTime = Date.now();
    if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
      window.firebaseSync.syncPlayerCurrenciesImmediate();
    }
    if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playUnlockChime) sunflowerAudio.playUnlockChime();
    doActivate();
    if (typeof window.updateUI === 'function') window.updateUI();
    if (typeof window.saveGame === 'function') window.saveGame(true);
    return;
  }

  doActivate();
};

window.activateSunflowerSpeedBooster = function(multiplier) {
  multiplier = Number(multiplier) || 2;

  const doActivate = () => {
    // One time one run: overwrites existing booster so only 1 is active at a time
    sunflowerState.activeBooster = {
      type: 'speed',
      multiplier: multiplier,
      expiresAt: Date.now() + 20 * 60 * 1000 // 20 minutes duration
    };
    if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playSolarChime) sunflowerAudio.playSolarChime();
    spawnSfFloat(`⏩ ${multiplier}X PRODUCTION SPEED ACTIVATED! (20 Minutes)`, window.innerWidth / 2, window.innerHeight / 2, 'text-cyan-300 font-black text-sm');
    saveSunflowerStateDebounced();
    updateSunflowerBoosterUI();
    renderSunflowerPlots();
  };

  if (multiplier === 2) {
    // *2: Watch Ad
    if (typeof window.showRewardedAd === 'function') {
      window.showRewardedAd(doActivate, {
        adTitle: `2X Production Speed Booster`,
        adDesc: `Watch this sponsored video to boost all crops & wells speed by 2X for 20 Minutes!`
      });
    } else {
      doActivate();
    }
    return;
  }

  if (multiplier === 5) {
    // *5: 100 Coins
    const playerCoins = (window.gameState && window.gameState.player && typeof window.gameState.player.coins === 'number')
      ? window.gameState.player.coins
      : (typeof gameState !== 'undefined' && gameState.player && typeof gameState.player.coins === 'number' ? gameState.player.coins : 0);

    if (playerCoins < 100) {
      if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
      spawnSfFloat(`❌ Need 100 🪙 Gold Coins! You have ${Math.floor(playerCoins)} 🪙`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold text-sm');
      return;
    }

    if (window.gameState && window.gameState.player) {
      window.gameState.player.coins -= 100;
    } else if (typeof gameState !== 'undefined' && gameState.player) {
      gameState.player.coins -= 100;
    }

    if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playCoin) sunflowerAudio.playCoin();
    doActivate();
    if (typeof window.updateUI === 'function') window.updateUI();
    if (typeof window.saveGame === 'function') window.saveGame(true);
    return;
  }

  if (multiplier === 10) {
    // *10: 100 Star Coins
    const playerStars = (typeof sunflowerState !== 'undefined' && typeof sunflowerState.diamonds === 'number')
      ? sunflowerState.diamonds
      : ((window.gameState && window.gameState.player && typeof window.gameState.player.diamonds === 'number')
        ? window.gameState.player.diamonds
        : (parseInt(localStorage.getItem('task_game_stars') || '0', 10) || 0));

    if (playerStars < 100) {
      if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playWitherSound) sunflowerAudio.playWitherSound();
      spawnSfFloat(`❌ Need 100 ⭐ Star Coins! You have ${Math.floor(playerStars)} ⭐`, window.innerWidth / 2, window.innerHeight / 2, 'text-rose-400 font-bold text-sm');
      return;
    }

    if (typeof sunflowerState !== 'undefined') {
      sunflowerState.diamonds -= 100;
    } else if (window.gameState && window.gameState.player) {
      window.gameState.player.diamonds -= 100;
    } else if (typeof gameState !== 'undefined' && gameState.player) {
      gameState.player.diamonds -= 100;
    }

    window._lastCurrencyDeductionTime = Date.now();
    if (window.firebaseSync && typeof window.firebaseSync.syncPlayerCurrenciesImmediate === 'function') {
      window.firebaseSync.syncPlayerCurrenciesImmediate();
    }
    if (typeof sunflowerAudio !== 'undefined' && sunflowerAudio.playUnlockChime) sunflowerAudio.playUnlockChime();
    doActivate();
    if (typeof window.updateUI === 'function') window.updateUI();
    if (typeof window.saveGame === 'function') window.saveGame(true);
    return;
  }

  doActivate();
};

window.getActiveSunflowerProfitMultiplier = function() {
  if (sunflowerState && sunflowerState.activeBooster && sunflowerState.activeBooster.type === 'profit' && sunflowerState.activeBooster.expiresAt > Date.now()) {
    return Number(sunflowerState.activeBooster.multiplier) || 1;
  }
  return 1;
};

window.getActiveSunflowerSpeedMultiplier = function() {
  if (sunflowerState && sunflowerState.activeBooster && sunflowerState.activeBooster.type === 'speed' && sunflowerState.activeBooster.expiresAt > Date.now()) {
    return Number(sunflowerState.activeBooster.multiplier) || 1;
  }
  return 1;
};

let _sfWasBoosterActive = false;
function updateSunflowerBoosterUI() {
  const badgeProfit = document.getElementById('sfBoosterActiveBadge');
  const badgeSpeed = document.getElementById('sfSpeedBoosterActiveBadge');
  const isBoosterActive = sunflowerState && sunflowerState.activeBooster && sunflowerState.activeBooster.expiresAt > Date.now();

  if (!isBoosterActive && _sfWasBoosterActive) {
    _sfWasBoosterActive = false;
    renderSunflowerPlots();
  } else if (isBoosterActive) {
    _sfWasBoosterActive = true;
  }

  if (isBoosterActive) {
    const remMs = sunflowerState.activeBooster.expiresAt - Date.now();
    const remMins = Math.floor(remMs / 60000);
    const remSecs = Math.floor((remMs % 60000) / 1000);
    const type = sunflowerState.activeBooster.type || 'profit';
    const mult = sunflowerState.activeBooster.multiplier || 1;

    if (type === 'profit') {
      if (badgeProfit) {
        badgeProfit.className = "bg-amber-950 text-amber-300 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/50 animate-pulse";
        badgeProfit.innerText = `⚡ ${mult}X PROFIT ACTIVE (${remMins}m ${String(remSecs).padStart(2, '0')}s)`;
      }
      if (badgeSpeed) {
        badgeSpeed.className = "bg-stone-800 text-stone-400 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border border-stone-700";
        badgeSpeed.innerText = "⚡ Profit Booster Active";
      }
    } else {
      if (badgeSpeed) {
        badgeSpeed.className = "bg-cyan-950 text-cyan-300 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-500/50 animate-pulse";
        badgeSpeed.innerText = `⏩ ${mult}X SPEED ACTIVE (${remMins}m ${String(remSecs).padStart(2, '0')}s)`;
      }
      if (badgeProfit) {
        badgeProfit.className = "bg-stone-800 text-stone-400 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border border-stone-700";
        badgeProfit.innerText = "⏩ Speed Booster Active";
      }
    }
  } else {
    if (badgeProfit) {
      badgeProfit.className = "bg-stone-800 text-stone-400 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border border-stone-700";
      badgeProfit.innerText = "No Active Booster";
    }
    if (badgeSpeed) {
      badgeSpeed.className = "bg-stone-800 text-stone-400 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border border-stone-700";
      badgeSpeed.innerText = "No Active Booster";
    }
  }
}
window.updateSunflowerBoosterUI = updateSunflowerBoosterUI;

// Exports
window.renderSunflowerStarExchange = typeof renderSunflowerStarExchange !== 'undefined' ? renderSunflowerStarExchange : window.renderSunflowerStarExchange;
window.stepSunflowerStarPackage = typeof stepSunflowerStarPackage !== 'undefined' ? stepSunflowerStarPackage : window.stepSunflowerStarPackage;
window.exchangeCurrentSfStarPackage = typeof exchangeCurrentSfStarPackage !== 'undefined' ? exchangeCurrentSfStarPackage : window.exchangeCurrentSfStarPackage;
window.exchangeSfCoinsForStars = typeof exchangeSfCoinsForStars !== 'undefined' ? exchangeSfCoinsForStars : window.exchangeSfCoinsForStars;
window.getSunflowerPrestigeInfo = typeof getSunflowerPrestigeInfo !== 'undefined' ? getSunflowerPrestigeInfo : window.getSunflowerPrestigeInfo;
window.renderSunflowerPrestigeUI = typeof renderSunflowerPrestigeUI !== 'undefined' ? renderSunflowerPrestigeUI : window.renderSunflowerPrestigeUI;
window.executeSunflowerPrestige = typeof executeSunflowerPrestige !== 'undefined' ? executeSunflowerPrestige : window.executeSunflowerPrestige;
window.stepSunflowerSpinPackage = typeof stepSunflowerSpinPackage !== 'undefined' ? stepSunflowerSpinPackage : window.stepSunflowerSpinPackage;
window.exchangeCurrentSfSpinPackage = typeof exchangeCurrentSfSpinPackage !== 'undefined' ? exchangeCurrentSfSpinPackage : window.exchangeCurrentSfSpinPackage;
window.activateSunflowerSpeedBooster = typeof activateSunflowerSpeedBooster !== 'undefined' ? activateSunflowerSpeedBooster : window.activateSunflowerSpeedBooster;
window.getActiveSunflowerSpeedMultiplier = typeof getActiveSunflowerSpeedMultiplier !== 'undefined' ? getActiveSunflowerSpeedMultiplier : window.getActiveSunflowerSpeedMultiplier;
window.switchSunflowerManagerTab = typeof switchSunflowerManagerTab !== 'undefined' ? switchSunflowerManagerTab : window.switchSunflowerManagerTab;

window.openSunflowerImageViewer = function() {
  const modal = document.getElementById('sfImageViewerModal');
  if (modal) modal.classList.remove('hidden');
};

window.closeSunflowerImageViewer = function() {
  const modal = document.getElementById('sfImageViewerModal');
  if (modal) modal.classList.add('hidden');
};

function checkAndAutoStartSunflower() {
  const sfPage = document.getElementById('pageSunflower');
  if (sfPage) {
    sfPage.classList.add('active');
    if (typeof initSunflowerTycoonGame === 'function') {
      initSunflowerTycoonGame();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndAutoStartSunflower);
} else {
  checkAndAutoStartSunflower();
}


