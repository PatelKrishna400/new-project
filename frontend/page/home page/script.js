// Zero-start sanitizer: Purge all mock demo users, artificial balances, and start from 0
try {
  if (!localStorage.getItem('task_game_zero_start_clean_v7')) {
    if (!localStorage.getItem('task_game_coins')) localStorage.setItem('task_game_coins', '0');
    if (!localStorage.getItem('task_game_stars')) localStorage.setItem('task_game_stars', '0');
    if (!localStorage.getItem('user_coins')) localStorage.setItem('user_coins', '0');
    if (!localStorage.getItem('user_stars')) localStorage.setItem('user_stars', '0');
    localStorage.setItem('task_game_total_tasks', '0');
    localStorage.setItem('task_game_total_tasks_completed', '0');
    localStorage.setItem('completed_tasks_count', '0');
    localStorage.setItem('task_game_ads_watched_count', '0');
    localStorage.setItem('ads_watched_count', '0');
    localStorage.setItem('task_game_event_tasks', '0');
    localStorage.setItem('task_game_event_tasks_count', '0');
    localStorage.setItem('task_coins_won_today', '0');
    localStorage.setItem('task_games_played_today', '0');
    localStorage.setItem('task_win_streak', '0');
    localStorage.setItem('task_game_users', '[]');
    localStorage.setItem('task_game_withdrawals', '[]');
    localStorage.setItem('task_game_referrals_list', '[]');
    localStorage.setItem('task_game_stars_transactions', '[]');
    localStorage.setItem('task_game_claims', '{}');
    localStorage.removeItem('task_game_stars_rating');
    localStorage.removeItem('task_game_cloud_referral_codes');
    localStorage.removeItem('task_game_ad_timer_end');
    localStorage.removeItem('task_game_tg_profile');
    localStorage.removeItem('player_email');
    localStorage.removeItem('player_whatsapp');
    const existingName = localStorage.getItem('player_username');
    if (!existingName || existingName.toLowerCase().includes('nova')) {
      localStorage.setItem('player_username', 'Player');
    }
    localStorage.setItem('player_avatar', '⚡');
    localStorage.setItem('task_game_zero_start_clean_v7', 'true');
  }
} catch (e) {}

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

// Storage Keys & Sync Channels
const TASKS_STORAGE_KEY = 'task_game_tasks';
const CLAIMS_STORAGE_KEY = 'task_game_claims';
const COMPLETED_TASKS_KEY = 'task_game_completed_tasks';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Default tasks: empty by default; managed directly from Admin Panel
const DEFAULT_TASKS = [];

function getStoredTasks() {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Purge any legacy demo sponsor tasks
        const cleaned = parsed.filter(t => t && t.id && !t.id.startsWith('task_sponsor_') && !String(t.title || '').toLowerCase().includes('sponsor'));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (e) {}
  return [];
}

function getStoredCompletedTasks() {
  try {
    const raw = localStorage.getItem(COMPLETED_TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function markTaskCompleted(taskId) {
  const completed = getStoredCompletedTasks();
  completed[taskId] = { completedAt: Date.now(), rewardStars: 5 };
  localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(completed));
  localStorage.removeItem('task_opened_' + taskId);

  try {
    const claims = getStoredClaims();
    claims[taskId] = Date.now();
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims));
  } catch (e) {}

  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'TASK_COMPLETED', taskId, timestamp: Date.now() });
  } catch (e) {}
}

function isTaskOpened(taskId) {
  return localStorage.getItem('task_opened_' + taskId) === 'true';
}

function setTaskOpened(taskId) {
  localStorage.setItem('task_opened_' + taskId, 'true');
}

function getStoredClaims() {
  try {
    const raw = localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {};
}

function saveClaims(claims) {
  localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'CLAIMS_UPDATED', timestamp: Date.now() });
  } catch (e) {}
}

function getTaskRemainingSeconds(task, claims) {
  const timerSec = Number(task.timerSeconds);
  if (isNaN(timerSec) || timerSec <= 0) {
    return claims[task.id] ? -999 : 0;
  }
  const claimedAt = claims[task.id];
  if (!claimedAt) return 0;
  const elapsed = Math.floor((Date.now() - claimedAt) / 1000);
  const remaining = timerSec - elapsed;
  return remaining > 0 ? remaining : 0;
}

function formatRemainingTime(seconds) {
  if (seconds <= 0) return 'Ready';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDurationBadge(seconds) {
  const s = Number(seconds || 0);
  if (s <= 0) return 'One-time Bounty';
  const hrs = s / 3600;
  if (hrs >= 1 && Number.isInteger(hrs)) return `${hrs}h Cooldown`;
  if (hrs >= 1) return `${hrs.toFixed(1)}h Cooldown`;
  const mins = Math.floor(s / 60);
  if (mins >= 1) return `${mins}m Cooldown`;
  return `${s}s Cooldown`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const HomeAudio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  playStartupChime() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        gain.gain.setValueAtTime(0.08, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.38);
      });
    } catch (e) {}
  },
  playCoinClaim() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, t);
      osc.frequency.setValueAtTime(1318.51, t + 0.06);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    } catch (e) {}
  }
};

let userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

function updateCoinDisplay() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  const display = document.getElementById('userCoinsDisplay');
  if (display) {
    display.textContent = userCoins.toLocaleString();
  }

  const starDisplay = document.getElementById('userStarsDisplay');
  if (starDisplay) {
    starDisplay.textContent = userStars.toLocaleString();
  }

  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) avatarEl.textContent = localStorage.getItem('player_avatar') || '⚡';

  const nameEl = document.querySelector('.user-name');
  if (nameEl) {
    const savedName = localStorage.getItem('player_username');
    nameEl.textContent = (savedName && savedName !== 'NovaEarner' && savedName !== 'Player') ? savedName : 'Task Earner';
  }

  // Dynamic User Rank Display in Header
  const rankEl = document.getElementById('userRankDisplay') || document.querySelector('.user-level');
  if (rankEl) {
    let playerRank = 1;
    try {
      const rawUsers = localStorage.getItem('task_game_users');
      const pName = localStorage.getItem('player_username') || 'Task Earner';
      if (rawUsers) {
        let users = JSON.parse(rawUsers);
        if (Array.isArray(users) && users.length > 0) {
          users.sort((a, b) => {
            const tasksDiff = Number(b.eventTasks || 0) - Number(a.eventTasks || 0);
            if (tasksDiff !== 0) return tasksDiff;
            const coinsDiff = Number(b.coins || 0) - Number(a.coins || 0);
            if (coinsDiff !== 0) return coinsDiff;
            return Number(b.stars || 0) - Number(a.stars || 0);
          });
          const idx = users.findIndex(u => (u.name && u.name.toLowerCase() === pName.toLowerCase()) || u.id === 'usr_1');
          if (idx >= 0) playerRank = idx + 1;
        }
      }
      const savedRank = localStorage.getItem('task_game_rank') || localStorage.getItem('player_rank');
      if (savedRank) playerRank = savedRank;
    } catch (e) {}
    rankEl.textContent = `RANK #${playerRank}`;
  }

  const pill = document.getElementById('coinPill');
  if (pill) {
    pill.style.transform = 'scale(1.05)';
    setTimeout(() => {
      pill.style.transform = 'scale(1)';
    }, 200);
  }
}

function showFloatingCoin(targetElement, text) {
  if (!targetElement) return;
  const rect = targetElement.getBoundingClientRect();
  const floatEl = document.createElement('div');
  floatEl.className = 'floating-coin';
  floatEl.textContent = text;
  floatEl.style.left = `${rect.left + rect.width / 4}px`;
  floatEl.style.top = `${rect.top - 8}px`;

  document.body.appendChild(floatEl);
  setTimeout(() => {
    floatEl.remove();
  }, 800);
}



// ==========================================================================
// ==========================================================================
// VIP SUBSCRIPTION SYSTEM (15 Days / 30 Days / 3 Months with Daily Limits)
// Starter Pass: 5 tasks/day | Popular: 10 tasks/day | Best Value: 20 tasks/day
// ==========================================================================
const VIP_STORAGE_KEY = 'premium_vip_expiry';
const VIP_PLAN_KEY = 'premium_vip_plan';
const VIP_DAILY_LIMIT_KEY = 'premium_vip_daily_limit';
const VIP_TODAY_DATE_KEY = 'premium_tasks_today_date';
const VIP_TODAY_COUNT_KEY = 'premium_tasks_today_count';

function getTodayDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getVipSubscriptionExpiry() {
  const expiry = parseInt(localStorage.getItem(VIP_STORAGE_KEY) || '0', 10);
  return isNaN(expiry) ? 0 : expiry;
}

function hasActivePremiumSubscription() {
  const expiry = getVipSubscriptionExpiry();
  return expiry > Date.now();
}

function getRemainingVipDays() {
  const expiry = getVipSubscriptionExpiry();
  const diff = expiry - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getVipDailyTaskLimit() {
  const plan = localStorage.getItem(VIP_PLAN_KEY) || '15days';
  if (plan === '90days') return 20;
  if (plan === '30days') return 10;
  return 5; // Starter pass is 5 tasks/day
}

function getVipMaxAllowedLevel() {
  if (!hasActivePremiumSubscription()) return 0;
  const plan = localStorage.getItem(VIP_PLAN_KEY) || '15days';
  if (plan === '90days') return 5;
  if (plan === '30days') return 4;
  return 2; // 15days plan allows Level 1 & Level 2 tasks
}

function getVipPlanName() {
  const plan = localStorage.getItem(VIP_PLAN_KEY) || '15days';
  if (plan === '90days') return 'Best Value Pass (20 tasks/day, Levels 1-5)';
  if (plan === '30days') return 'Popular Pass (10 tasks/day, Levels 1-4)';
  return 'Starter Pass (5 tasks/day, Levels 1-2)';
}

function getTodayCompletedPremiumTasksCount() {
  const todayKey = getTodayDateKey();
  const storedDate = localStorage.getItem(VIP_TODAY_DATE_KEY);
  if (storedDate !== todayKey) {
    localStorage.setItem(VIP_TODAY_DATE_KEY, todayKey);
    localStorage.setItem(VIP_TODAY_COUNT_KEY, '0');
    return 0;
  }
  const count = parseInt(localStorage.getItem(VIP_TODAY_COUNT_KEY) || '0', 10);
  return isNaN(count) ? 0 : count;
}

function hasReachedDailyTaskLimit() {
  const count = getTodayCompletedPremiumTasksCount();
  const limit = getVipDailyTaskLimit();
  return count >= limit;
}

function incrementTodayCompletedPremiumTasks() {
  const count = getTodayCompletedPremiumTasksCount();
  localStorage.setItem(VIP_TODAY_COUNT_KEY, (count + 1).toString());
}

window.hasActivePremiumSubscription = hasActivePremiumSubscription;
window.getRemainingVipDays = getRemainingVipDays;
window.getVipDailyTaskLimit = getVipDailyTaskLimit;
window.getVipMaxAllowedLevel = getVipMaxAllowedLevel;
window.getVipPlanName = getVipPlanName;
window.getTodayCompletedPremiumTasksCount = getTodayCompletedPremiumTasksCount;
window.hasReachedDailyTaskLimit = hasReachedDailyTaskLimit;
window.incrementTodayCompletedPremiumTasks = incrementTodayCompletedPremiumTasks;

window.openSubscriptionModal = function() {
  const modal = document.getElementById('vipSubscriptionModal');
  if (!modal) return;
  const userStarsDisplay = document.getElementById('vipModalUserStars');
  const userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  if (userStarsDisplay) userStarsDisplay.textContent = userStars.toLocaleString();
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
};

window.closeSubscriptionModal = function() {
  const modal = document.getElementById('vipSubscriptionModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
};

window.handleVipModalBackdropClick = function(e) {
  if (e.target && e.target.id === 'vipSubscriptionModal') {
    closeSubscriptionModal();
  }
};

window.handleDailyLimitReachedClick = function() {
  const planKey = localStorage.getItem(VIP_PLAN_KEY) || '15days';
  const planName = getVipPlanName();
  const dailyLimit = getVipDailyTaskLimit();

  if (planKey === '90days') {
    alert(`🛑 Daily Limit Reached!\n\nYou have completed your maximum quota of ${dailyLimit} Premium Tasks today on the ${planName}.\n\nYour limit will automatically reset tomorrow at midnight!`);
  } else {
    const upgradeText = planKey === '15days'
      ? 'Popular Pass (10 tasks/day) or Best Value Pass (20 tasks/day)'
      : 'Best Value Pass (20 tasks/day)';
    if (confirm(`🛑 Daily Limit Reached!\n\nYou have completed ${dailyLimit}/${dailyLimit} Premium Tasks today on your ${planName}.\n\nWould you like to upgrade your VIP Pass to ${upgradeText} to complete more tasks per day?`)) {
      openSubscriptionModal();
    }
  }
};

window.purchaseVipPlan = function(planKey) {
  const plans = {
    '15days': { days: 15, stars: 500, label: 'Starter Pass', dailyLimit: 5, maxLevel: 2 },
    '30days': { days: 30, stars: 1000, label: 'Popular Pass', dailyLimit: 10, maxLevel: 4 },
    '90days': { days: 90, stars: 5000, label: 'Best Value Pass', dailyLimit: 20, maxLevel: 5 }
  };
  const plan = plans[planKey];
  if (!plan) return;

  let currentStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  if (currentStars < plan.stars) {
    alert(`❌ Insufficient Stars! You need ${plan.stars.toLocaleString()} ⭐ for the ${plan.label} (${plan.dailyLimit} tasks/day), but you currently have ${currentStars.toLocaleString()} ⭐.\n\nPlease earn more stars or visit the Shop to top up!`);
    return;
  }

  // Deduct stars
  currentStars -= plan.stars;
  localStorage.setItem('task_game_stars', currentStars.toString());
  localStorage.setItem('user_stars', currentStars.toString());

  // Calculate new expiry (extends if already active)
  const now = Date.now();
  const currentExpiry = getVipSubscriptionExpiry();
  const baseTime = (currentExpiry > now) ? currentExpiry : now;
  const newExpiry = baseTime + (plan.days * 24 * 60 * 60 * 1000);

  localStorage.setItem(VIP_STORAGE_KEY, newExpiry.toString());
  localStorage.setItem(VIP_PLAN_KEY, planKey);
  localStorage.setItem(VIP_DAILY_LIMIT_KEY, plan.dailyLimit.toString());
  localStorage.setItem('premium_vip_activated_at', now.toString());

  // Notify cross-tab channels of VIP update (including 30-day/90-day 20 shop limit upgrade)
  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.postMessage({ type: 'VIP_PURCHASED', plan: planKey, timestamp: now });
  } catch (e) {}

  // Update displays & play audio
  updateCoinDisplay();
  if (window.HomeAudio && typeof window.HomeAudio.playCoinClaim === 'function') {
    window.HomeAudio.playCoinClaim();
  }

  // Sync balances with cloud if available
  if (typeof window.syncBalancesWithCloud === 'function') {
    try { window.syncBalancesWithCloud(); } catch(e) {}
  }

  closeSubscriptionModal();

  // Floating celebration notification
  const targetBtn = document.getElementById('tabPremiumTasks') || document.body;
  if (typeof showFloatingCoin === 'function') {
    showFloatingCoin(targetBtn, `👑 ${plan.label} (${plan.dailyLimit} Tasks/Day, Levels 1-${plan.maxLevel}) Activated!`);
  }

  // Switch to Premium Tasks tab & render
  switchTaskTab('premium');
};

let currentTaskTab = localStorage.getItem('task_active_tab') || 'simple';

window.switchTaskTab = function(tab) {
  // If user clicks Premium Tasks without active subscription, open the 3-plans subscription popup
  if (tab === 'premium' && !hasActivePremiumSubscription()) {
    openSubscriptionModal();
    return;
  }

  currentTaskTab = tab;
  localStorage.setItem('task_active_tab', tab);

  const tabSimple = document.getElementById('tabSimpleTasks');
  const tabPremium = document.getElementById('tabPremiumTasks');
  const banner = document.getElementById('tasksModeBanner');
  const badge = document.getElementById('modeBannerBadge');
  const title = document.getElementById('modeBannerTitle');
  const desc = document.getElementById('modeBannerDesc');

  if (tab === 'premium') {
    if (tabSimple) tabSimple.classList.remove('active');
    if (tabPremium) tabPremium.classList.add('active');
    if (banner) banner.classList.add('banner-premium');
    const daysLeft = getRemainingVipDays();
    const dailyLimit = getVipDailyTaskLimit();
    const completedToday = getTodayCompletedPremiumTasksCount();
    const remainingToday = Math.max(0, dailyLimit - completedToday);
    const planName = getVipPlanName();

    if (badge) badge.innerHTML = `👑 VIP ACTIVE • ${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'} LEFT • ${completedToday}/${dailyLimit} TASKS TODAY`;
    if (title) title.innerHTML = '💎 Premium VIP Tasks';
    if (desc) {
      if (completedToday >= dailyLimit) {
        desc.innerHTML = `🛑 <strong style="color:#ef4444;">Daily limit reached (${completedToday}/${dailyLimit} tasks)</strong> for ${planName}. Resets at midnight! <button type="button" onclick="openSubscriptionModal()" style="background:none; border:none; color:#facc15; font-weight:800; text-decoration:underline; cursor:pointer; font-size:0.75rem; padding:0 4px;">Upgrade Pass ↗</button>`;
      } else {
        desc.innerHTML = `Plan: <strong style="color:#38bdf8;">${planName}</strong> • Today: <strong style="color:#facc15;">${completedToday}/${dailyLimit}</strong> completed (${remainingToday} left). <button type="button" onclick="openSubscriptionModal()" style="background:none; border:none; color:#facc15; font-weight:800; text-decoration:underline; cursor:pointer; font-size:0.75rem; padding:0 4px;">Extend / Upgrade Pass ↗</button>`;
      }
    }
  } else {
    if (tabPremium) tabPremium.classList.remove('active');
    if (tabSimple) tabSimple.classList.add('active');
    if (banner) banner.classList.remove('banner-premium');
    if (badge) badge.textContent = 'STANDARD MISSIONS';
    if (title) title.innerHTML = '📋 Simple Tasks';
    if (desc) desc.textContent = 'Complete quick missions & enter 6-digit code to claim rewards.';
  }

  renderTasks();
};

// Dynamic Task Rendering with Open / Verify & Simple/Premium Filtering & Daily VIP Task Limits
function renderTasks() {
  const container = document.getElementById('tasksList');
  if (!container) return;

  const activeTab = localStorage.getItem('task_active_tab') || 'simple';

  // Ensure banner & tab buttons match activeTab
  const tabSimple = document.getElementById('tabSimpleTasks');
  const tabPremium = document.getElementById('tabPremiumTasks');
  const banner = document.getElementById('tasksModeBanner');
  const badge = document.getElementById('modeBannerBadge');
  const title = document.getElementById('modeBannerTitle');
  const desc = document.getElementById('modeBannerDesc');

  const isVipActive = hasActivePremiumSubscription();
  const daysLeft = getRemainingVipDays();
  const dailyLimit = getVipDailyTaskLimit();
  const completedToday = getTodayCompletedPremiumTasksCount();
  const remainingToday = Math.max(0, dailyLimit - completedToday);
  const limitReached = isVipActive && (completedToday >= dailyLimit);

  if (activeTab === 'premium') {
    if (tabSimple) tabSimple.classList.remove('active');
    if (tabPremium) tabPremium.classList.add('active');
    if (banner) banner.classList.add('banner-premium');
    if (isVipActive) {
      const planName = getVipPlanName();
      if (badge) badge.innerHTML = `👑 VIP ACTIVE • ${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'} LEFT • ${completedToday}/${dailyLimit} TASKS TODAY`;
      if (title) title.innerHTML = '💎 Premium VIP Tasks';
      if (desc) {
        if (limitReached) {
          desc.innerHTML = `🛑 <strong style="color:#ef4444;">Daily limit reached (${completedToday}/${dailyLimit} tasks)</strong> for ${planName}. Resets at midnight! <button type="button" onclick="openSubscriptionModal()" style="background:none; border:none; color:#facc15; font-weight:800; text-decoration:underline; cursor:pointer; font-size:0.75rem; padding:0 4px;">Upgrade Pass ↗</button>`;
        } else {
          desc.innerHTML = `Plan: <strong style="color:#38bdf8;">${planName}</strong> • Today: <strong style="color:#facc15;">${completedToday}/${dailyLimit}</strong> completed (${remainingToday} left). <button type="button" onclick="openSubscriptionModal()" style="background:none; border:none; color:#facc15; font-weight:800; text-decoration:underline; cursor:pointer; font-size:0.75rem; padding:0 4px;">Extend / Upgrade Pass ↗</button>`;
        }
      }
    } else {
      if (badge) badge.textContent = '🔒 VIP SUBSCRIPTION REQUIRED';
      if (title) title.innerHTML = '💎 Premium VIP Tasks';
      if (desc) desc.innerHTML = 'Subscription required for Premium Tasks. <button type="button" onclick="openSubscriptionModal()" style="background:none; border:none; color:#facc15; font-weight:800; text-decoration:underline; cursor:pointer; font-size:0.75rem; padding:0 4px;">Unlock VIP Now ↗</button>';
    }
  } else {
    if (tabPremium) tabPremium.classList.remove('active');
    if (tabSimple) tabSimple.classList.add('active');
    if (banner) banner.classList.remove('banner-premium');
    if (badge) badge.textContent = 'STANDARD MISSIONS';
    if (title) title.innerHTML = '📋 Simple Tasks';
    if (desc) desc.textContent = 'Complete quick missions & enter 6-digit code to claim rewards.';
  }

  const tasks = getStoredTasks();
  const completedTasks = getStoredCompletedTasks();
  const claims = getStoredClaims();

  // Active uncompleted tasks
  const activeTasks = tasks.filter(t => {
    if (!t || t.active === false) return false;
    if (completedTasks && completedTasks[t.id]) return false;
    if (claims && claims[t.id]) return false;
    return true;
  });

  const isTaskShop = (t) => t.category === 'shop_task' || t.isShopTask || (t.title && t.title.toLowerCase().includes('shop task'));

  // Calculate and update category count badges
  const simpleTasks = activeTasks.filter(t => t.category === 'simple' || (!t.category && !isTaskShop(t)));
  const allPremiumTasks = activeTasks.filter(t => t.category === 'premium' || isTaskShop(t));

  // Level Gating:
  // 15 days plan: only show Level 1 & Level 2 tasks
  // 30 days plan: show Level 1, 2, 3, 4 tasks
  // 3 months (90 days) plan: show Level 1, 2, 3, 4, 5 tasks (all)
  const maxAllowedLevel = getVipMaxAllowedLevel();
  const premiumTasks = isVipActive 
    ? allPremiumTasks.filter(t => {
        const lvl = parseInt(t.level || 1, 10);
        return lvl <= maxAllowedLevel;
      })
    : allPremiumTasks;

  const simpleBadge = document.getElementById('simpleTasksCount');
  const premiumBadge = document.getElementById('premiumTasksCount');
  if (simpleBadge) simpleBadge.textContent = simpleTasks.length;
  if (premiumBadge) premiumBadge.textContent = premiumTasks.length;

  const currentList = (activeTab === 'premium') ? premiumTasks : simpleTasks;

  if (activeTab === 'premium' && !isVipActive) {
    container.innerHTML = `
      <div class="empty-tasks-box" style="border-color: rgba(250, 204, 21, 0.45); padding: 2rem 1rem;">
        <div class="empty-tasks-icon" style="font-size: 2.8rem;">🔒</div>
        <div class="empty-tasks-text" style="color: #facc15; font-size: 1.15rem; font-weight: 900;">Premium VIP Tasks Locked</div>
        <div style="font-size: 0.78rem; color: #94a3b8; margin: 0.5rem auto 1.25rem; max-width: 320px; line-height: 1.45;">
          Subscribe to VIP Pass to unlock exclusive high-reward missions and claim massive Star earnings!
        </div>
        <button type="button" class="btn-claim" onclick="openSubscriptionModal()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; font-weight: 900; padding: 0.65rem 1.6rem; border-radius: 12px; font-size: 0.88rem; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.45); cursor: pointer;">
          👑 View VIP Subscription Plans
        </button>
      </div>
    `;
    return;
  }

  if (currentList.length === 0) {
    if (activeTab === 'premium') {
      const lockedHigher = allPremiumTasks.length - premiumTasks.length;
      container.innerHTML = `
        <div class="empty-tasks-box" style="border-color: rgba(250, 204, 21, 0.35);">
          <div class="empty-tasks-icon">💎</div>
          <div class="empty-tasks-text" style="color: #facc15;">No Premium VIP Tasks Available</div>
          <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.35rem;">
            ${lockedHigher > 0 ? `${lockedHigher} higher-level tasks locked on your current plan. <button type="button" onclick="openSubscriptionModal()" style="background:none; border:none; color:#facc15; font-weight:800; text-decoration:underline; cursor:pointer;">Upgrade Pass ↗</button>` : 'New VIP missions created by admin will appear here immediately!'}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-tasks-box">
          <div class="empty-tasks-icon">🎯</div>
          <div class="empty-tasks-text">All simple webtasks completed! Great job!</div>
          <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.35rem;">New tasks added by admin will appear automatically.</div>
        </div>
      `;
    }
    return;
  }

  let statusBarHtml = '';
  if (activeTab === 'premium' && isVipActive) {
    const lockedHigherCount = allPremiumTasks.length - premiumTasks.length;
    if (limitReached) {
      statusBarHtml = `
        <div class="vip-daily-status-bar limit-reached" style="background: rgba(239, 68, 68, 0.12); border: 1.5px solid rgba(239, 68, 68, 0.45); border-radius: 14px; padding: 0.75rem 1rem; margin-bottom: 0.9rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="color: #f87171; font-weight: 900; font-size: 0.82rem; display: flex; align-items: center; gap: 0.35rem;">
              <span>🛑</span> Daily Quota Reached (${completedToday}/${dailyLimit} Tasks)
            </div>
            <div style="color: #94a3b8; font-size: 0.7rem; margin-top: 0.15rem;">
              You've completed all ${dailyLimit} tasks allowed today for your plan. Resets at midnight!
            </div>
          </div>
          ${localStorage.getItem('premium_vip_plan') !== '90days' ? '<button type="button" onclick="openSubscriptionModal()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; font-weight: 800; border: none; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.72rem; cursor: pointer; white-space: nowrap;">Upgrade Pass ↗</button>' : ''}
        </div>
      `;
    } else {
      statusBarHtml = `
        <div class="vip-daily-status-bar" style="background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 0.55rem 0.9rem; margin-bottom: 0.9rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
          <span style="font-size: 0.75rem; color: #bae6fd; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
            <span>⚡</span> Daily Progress: <b style="color: #ffffff;">${completedToday} / ${dailyLimit}</b> Tasks • Lvl 1-${maxAllowedLevel}
          </span>
          <span style="font-size: 0.7rem; color: #38bdf8; font-weight: 800;">
            ${remainingToday} Left ${lockedHigherCount > 0 ? `<button type="button" onclick="openSubscriptionModal()" style="background:none; border:none; color:#facc15; font-weight:800; text-decoration:underline; cursor:pointer; margin-left:4px;">(${lockedHigherCount} Locked ↗)</button>` : ''}
          </span>
        </div>
      `;
    }
  }

  container.innerHTML = statusBarHtml + currentList.map(task => {
    const opened = isTaskOpened(task.id);
    const taskShop = isTaskShop(task);
    const isPremium = task.category === 'premium' || taskShop;
    const taskLevel = parseInt(task.level || 1, 10);
    const rewardCoins = Number(task.rewardCoins || task.reward || task.coins || (isPremium ? 200 : 50));
    const shopExtension = parseInt(task.shopLimitExtension || task.limitExtension || 10, 10);

    let btnHtml = '';
    if (isPremium && limitReached) {
      btnHtml = `<button type="button" class="btn-claim btn-task-limit" onclick="handleDailyLimitReachedClick()" style="background: #334155; color: #94a3b8; border: 1px solid #475569; cursor: pointer;">Limit Reached (${completedToday}/${dailyLimit})</button>`;
    } else if (opened) {
      btnHtml = `<button type="button" class="btn-claim btn-task-verify" onclick="openVerifyModal('${task.id}')">Verify</button>`;
    } else {
      btnHtml = `<button type="button" class="btn-claim btn-task-open" onclick="handleOpenTask('${task.id}')">Open</button>`;
    }

    const cardClass = isPremium ? 'task-card task-card-premium' : 'task-card';
    let statusPill = '';
    if (taskShop) {
      statusPill = `<span class="task-status-pill vip-pill" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-color: #34d399; color: #ffffff;">🛒 +${shopExtension} Shop Limit • Lvl ${taskLevel}</span>`;
    } else if (isPremium) {
      statusPill = `<span class="task-status-pill vip-pill">💎 Lvl ${taskLevel} • +${rewardCoins} 🪙</span>`;
    } else {
      statusPill = `<span class="task-status-pill ready">🪙 ${rewardCoins} Coins</span>`;
    }

    return `
      <div class="${cardClass}" id="taskCard_${task.id}">
        <div class="task-icon-wrap">${task.icon || (taskShop ? '🛒' : (isPremium ? '💎' : '⚡'))}</div>
        <div class="task-details">
          <div class="task-header-row">
            <span class="task-title-text">${escapeHtml(task.title || 'Webtask Mission')}</span>
            ${statusPill}
          </div>
          <div class="task-reward-row">
            <span class="task-reward" style="color: #fbbf24; font-weight: 900;">+${rewardCoins} 🪙</span>
            ${taskShop ? `<span style="font-size: 0.72rem; color: #34d399; font-weight: 800; margin-left: 6px;">🛒 +${shopExtension} Shop Buy Limit</span>` : ''}
            ${task.description ? `<span style="font-size: 0.68rem; color: #94a3b8; margin-left: 6px;">• ${escapeHtml(task.description)}</span>` : ''}
          </div>
        </div>
        <div class="task-action-wrap" id="action_${task.id}">
          ${btnHtml}
        </div>
      </div>
    `;
  }).join('');
}

let currentVerifyTaskId = null;

// Open Verify Modal directly
window.openVerifyModal = function(taskId) {
  currentVerifyTaskId = taskId;
  const modal = document.getElementById('taskVerifyModalOverlay');
  const codeInput = document.getElementById('verifyCodeInput');
  const errorMsg = document.getElementById('verifyErrorMsg');
  if (codeInput) {
    codeInput.value = '';
    codeInput.classList.remove('input-error');
  }
  if (errorMsg) {
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
  }

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    setTimeout(() => {
      if (codeInput) codeInput.focus();
    }, 200);
  }
};

// Open Button Click: opens link in new tab, changes button to Verify, opens modal
window.handleOpenTask = function(taskId) {
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const isTaskShop = task.category === 'shop_task' || task.isShopTask || (task.title && task.title.toLowerCase().includes('shop task'));
  const isPremium = task.category === 'premium' || isTaskShop;

  if (isPremium) {
    if (!hasActivePremiumSubscription()) {
      openSubscriptionModal();
      return;
    }
    const maxLevel = getVipMaxAllowedLevel();
    const taskLevel = parseInt(task.level || 1, 10);
    if (taskLevel > maxLevel) {
      alert(`🔒 Level ${taskLevel} Mission Locked!\n\nYour current VIP plan unlocks tasks up to Level ${maxLevel}.\nUpgrade your plan to unlock Level ${taskLevel} missions!`);
      openSubscriptionModal();
      return;
    }
    if (hasReachedDailyTaskLimit()) {
      handleDailyLimitReachedClick();
      return;
    }
  }

  setTaskOpened(taskId);
  if (task.url || task.link) {
    window.open(task.url || task.link, '_blank');
  }
  openVerifyModal(taskId);
  renderTasks();
};

window.closeVerifyModal = function() {
  const modal = document.getElementById('taskVerifyModalOverlay');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
  currentVerifyTaskId = null;
};

window.handleVerifyModalBackdropClick = function(e) {
  if (e.target && e.target.id === 'taskVerifyModalOverlay') {
    closeVerifyModal();
  }
};

window.handleVerifyCodeInput = function(input) {
  if (!input) return;
  input.value = input.value.replace(/[^0-9]/g, '');
  const errorMsg = document.getElementById('verifyErrorMsg');
  if (errorMsg) errorMsg.style.display = 'none';
  input.classList.remove('input-error');
};

window.submitTaskVerification = function(event) {
  if (event) event.preventDefault();

  if (!currentVerifyTaskId) return;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === currentVerifyTaskId);
  if (!task) return;

  const codeInput = document.getElementById('verifyCodeInput');
  const errorMsg = document.getElementById('verifyErrorMsg');
  const userCode = (codeInput ? codeInput.value : '').trim();

  const correctCode = String(task.verificationCode || task.code || task.secretCode || '').trim();

  if (!userCode || (correctCode && userCode !== correctCode)) {
    if (codeInput) {
      codeInput.classList.add('input-error');
      codeInput.focus();
    }
    if (errorMsg) {
      errorMsg.style.display = 'block';
      errorMsg.textContent = '❌ Invalid 6-digit verification code. Please check and try again.';
    }
    return;
  }

  const isTaskShop = task.category === 'shop_task' || task.isShopTask || (task.title && task.title.toLowerCase().includes('shop task'));
  const isPremium = task.category === 'premium' || isTaskShop;
  const rewardAmount = Number(task.rewardCoins || task.reward || task.coins || (isPremium ? 200 : 50));
  userCoins += rewardAmount;
  localStorage.setItem('task_game_coins', userCoins.toString());
  localStorage.setItem('user_coins', userCoins.toString());

  if (isPremium) {
    incrementTodayCompletedPremiumTasks();
  }

  let shopBonusMsg = '';
  if (isTaskShop) {
    const extAmount = parseInt(task.shopLimitExtension || task.limitExtension || 10, 10);
    const curBonus = parseInt(localStorage.getItem('task_game_shop_bonus_limit') || '0', 10);
    const newBonus = curBonus + extAmount;
    localStorage.setItem('task_game_shop_bonus_limit', newBonus.toString());
    shopBonusMsg = `\n🛒 Shop Buy Limit Extended by +${extAmount}! (Total Bonus: +${newBonus})`;

    try {
      const syncChannel = new BroadcastChannel('nova_task_sync');
      syncChannel.postMessage({ type: 'SHOP_LIMIT_EXTENDED', bonusLimit: newBonus, timestamp: Date.now() });
    } catch (e) {}
  }

  let completedCount = parseInt(localStorage.getItem('task_game_total_tasks_completed') || '0', 10) + 1;
  localStorage.setItem('task_game_total_tasks_completed', completedCount.toString());
  localStorage.setItem('completed_tasks_count', completedCount.toString());
  recordLeaderboardEventTask(completedCount);

  markTaskCompleted(task.id);
  updateCoinDisplay();

  HomeAudio.playCoinClaim();
  const submitBtn = document.getElementById('btnVerifyConfirm');
  if (submitBtn) showFloatingCoin(submitBtn, `+${rewardAmount} 🪙 Won!${isTaskShop ? ' +Limit' : ''}`);

  closeVerifyModal();

  if (shopBonusMsg) {
    alert(`🎉 Mission Verified!\n\nYou earned +${rewardAmount} 🪙 Coins!${shopBonusMsg}\nYou can now purchase more items in the Shop!`);
  }

  const taskCard = document.getElementById(`taskCard_${task.id}`);
  if (taskCard) {
    taskCard.style.transition = 'all 0.35s ease';
    taskCard.style.opacity = '0';
    taskCard.style.transform = 'translateY(-10px) scale(0.96)';
    setTimeout(() => {
      renderTasks();
    }, 350);
  } else {
    renderTasks();
  }
};

const GLOBAL_EPOCH_ANCHOR = Date.UTC(2026, 9, 1, 0, 0, 0); // Oct 1, 2026 00:00:00 UTC
const THREE_MONTHS_HOURS = 2160; // 90 days
const THREE_MONTHS_MS = THREE_MONTHS_HOURS * 60 * 60 * 1000;

function getUniversalGlobalLeaderboardEvent() {
  const now = Date.now();

  try {
    if (localStorage.getItem('task_leaderboard_event_v1')) {
      localStorage.removeItem('task_leaderboard_event_v1');
    }
  } catch (e) {}

  let customEvt = null;
  try {
    const raw = localStorage.getItem('task_game_leaderboard_event');
    if (raw) customEvt = JSON.parse(raw);
  } catch (e) {}

  if (customEvt && customEvt.status === 'finished') {
    return customEvt;
  }

  if (customEvt && customEvt.isManualOverride && now < customEvt.endTime && customEvt.status === 'active') {
    return customEvt;
  }

  // Universal Global 3-Month Season (Identical for ALL users worldwide)
  const elapsed = Math.max(0, now - GLOBAL_EPOCH_ANCHOR);
  const seasonIndex = Math.floor(elapsed / THREE_MONTHS_MS);
  const seasonNumber = seasonIndex + 1;
  const startTime = GLOBAL_EPOCH_ANCHOR + (seasonIndex * THREE_MONTHS_MS);
  const endTime = startTime + THREE_MONTHS_MS;

  const globalEvt = {
    id: `global_season_${seasonNumber}`,
    seasonNumber: seasonNumber,
    name: `Season ${seasonNumber}: 3-Month Championship`,
    startTime: startTime,
    endTime: endTime,
    durationHours: THREE_MONTHS_HOURS,
    durationDays: THREE_MONTHS_DAYS,
    status: 'active',
    isGlobal: true
  };

  // Rollover check: If stored event is from an older season, reset task counters
  if (customEvt && (
    (customEvt.seasonNumber && customEvt.seasonNumber < seasonNumber) ||
    (customEvt.endTime && customEvt.endTime <= now)
  )) {
    try {
      localStorage.setItem('task_game_event_tasks_count', '0');
      const rawUsers = localStorage.getItem('task_game_users');
      if (rawUsers) {
        const uList = JSON.parse(rawUsers);
        if (Array.isArray(uList)) {
          uList.forEach(u => { u.eventTasks = 0; });
          localStorage.setItem('task_game_users', JSON.stringify(uList));
        }
      }
    } catch (e) {}
  }

  try {
    localStorage.setItem('task_game_leaderboard_event', JSON.stringify(globalEvt));
  } catch (e) {}

  return globalEvt;
}

function recordLeaderboardEventTask(totalTasks) {
  try {
    const now = Date.now();
    const evt = getUniversalGlobalLeaderboardEvent();

    if (evt.status === 'active' && now < evt.endTime) {
      // Task completion directly increments event tasks from task 1 (clean zero start)
      let eventTasks = parseInt(localStorage.getItem('task_game_event_tasks_count') || '0', 10) + 1;
      localStorage.setItem('task_game_event_tasks_count', eventTasks.toString());

      // Synchronize in task_game_users
      try {
        const rawUsers = localStorage.getItem('task_game_users');
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          const myName = localStorage.getItem('player_username') || 'Task Earner';
          const me = users.find(u => u.id === 'usr_1' || u.name === myName || u.name === 'Task Earner' || u.name === 'NovaEarner' || u.name === 'Player');
          if (me) {
            me.eventTasks = eventTasks;
            me.totalTasks = totalTasks;
            localStorage.setItem('task_game_users', JSON.stringify(users));
          }
        }
      } catch (e) {}

      // Broadcast to other tabs
      try {
        const bc = new BroadcastChannel('nova_task_sync');
        bc.postMessage({ type: 'EVENT_TASK_COUNT', count: eventTasks, totalTasks: totalTasks });
        bc.close();
      } catch (e) {}
    } else if (now >= evt.endTime) {
      // 3-Month Timer finished -> Rollover to next global 3-month season!
      localStorage.setItem('task_game_event_tasks_count', '0');

      // Remove old event data from user pool
      try {
        const rawUsers = localStorage.getItem('task_game_users');
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          if (Array.isArray(users)) {
            users.forEach(u => { u.eventTasks = 0; });
            localStorage.setItem('task_game_users', JSON.stringify(users));
          }
        }
      } catch (e) {}

      localStorage.removeItem('task_game_leaderboard_event');
      const nextEvt = getUniversalGlobalLeaderboardEvent();

      try {
        const bc = new BroadcastChannel('nova_task_sync');
        bc.postMessage({ type: 'EVENT_FINISHED', nextEvent: nextEvt, timestamp: now });
        bc.close();
      } catch (e) {}
    }
  } catch (err) {
    console.error('Leaderboard event counting error:', err);
  }
}

function updateLiveTimers() {
  // Tasks are permanently one-time completion per user ("never show second time in life").
  // Finished tasks are removed forever and never resurrected.
}

function initHomePage() {
  updateCoinDisplay();
  renderTasks();

  // Start live countdown timer clock
  setInterval(updateLiveTimers, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePage);
} else {
  initHomePage();
}

// Real-Time Cross-Tab / Cross-Window Synchronization (Admin Edits -> Real-Time Player Screen Updates)
window.addEventListener('storage', (e) => {
  if (e.key === TASKS_STORAGE_KEY || e.key === SYNC_FLAG_KEY || e.key === CLAIMS_STORAGE_KEY) {
    renderTasks();
  }
  if (e.key === 'task_game_coins' || e.key === 'task_game_stars' || e.key === 'player_username' || e.key === 'player_avatar') {
    updateCoinDisplay();
  }
});

// BroadcastChannel for instant same-browser cross-window sync
try {
  const syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  syncChannel.onmessage = () => {
    renderTasks();
    updateCoinDisplay();
  };
} catch (e) {}

// When tab gains focus, refresh tasks and balances
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    renderTasks();
    updateCoinDisplay();
  }
});

window.addEventListener('balance:changed', () => {
  updateCoinDisplay();
});

window.addEventListener('balance:synced', () => {
  updateCoinDisplay();
});

// Real-Time Cloud Tasks Listener from Firebase Firestore (Global Admin Missions Sync)
function setupCloudTasksListener() {
  const listener = (window.Firebase && window.Firebase.listenToCloudTasks) || window.listenToCloudTasks;
  if (typeof listener === 'function') {
    listener(() => {
      renderTasks();
    });
  }
}

window.addEventListener('firebase:ready', () => {
  setupCloudTasksListener();
  renderTasks();
});

if (window.listenToCloudTasks || (window.Firebase && window.Firebase.listenToCloudTasks)) {
  setupCloudTasksListener();
}

// Expose on window for Firebase Cloud Sync and Admin Real-Time Connection
window.renderTasks = renderTasks;
window.setupCloudTasksListener = setupCloudTasksListener;
window.getStoredTasks = getStoredTasks;
window.handleOpenTask = handleOpenTask;
window.openVerifyModal = openVerifyModal;
window.submitTaskVerification = submitTaskVerification;

