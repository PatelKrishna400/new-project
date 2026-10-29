// Leaderboard Interactive Controller & Real-Time Event Sync Engine
// Manages:
// 1. 100-Task Qualification Gate: Player's name only enters leaderboard when >= 100 tasks completed.
// 2. Leaderboard Event & Live Task Counting: Counts tasks completed during active event.
// 3. Event Finish: Sets counter to 0 when finished.
// 4. Event Restart: Clears old data, resets task counter to 0, starts fresh countdown.
// 5. Dynamic Podium (Top 1, 2, 3), In-Between Contenders, and Pinned Above-Menu-Bar Rank Bar.

const USERS_STORAGE_KEY = 'task_game_users';
const EVENT_STORAGE_KEY = 'task_game_leaderboard_event';
const EVENT_TASKS_KEY = 'task_game_event_tasks_count';
const TOTAL_TASKS_KEY = 'task_game_total_tasks_completed';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Clean zero start - No mock users in leaderboard
const DEFAULT_USERS_POOL = [];

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
    localStorage.removeItem('ENERGY_TAP_SUNFLOWER_STATE_V4');
    localStorage.removeItem('sunflower_state');
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

// Clear legacy demo users and dummy pools if present
try {
  const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (rawUsers && (rawUsers.includes('Vortex') || rawUsers.includes('Cyber') || rawUsers.includes('42850') || rawUsers.includes('38120') || rawUsers.includes('usr_2') || rawUsers.includes('ShadowTyper') || rawUsers.includes('Alex_Gamer') || rawUsers.includes('NeonBlaze'))) {
    localStorage.setItem(USERS_STORAGE_KEY, '[]');
  }
} catch (e) { }

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
let currentRanksList = [];
let myCurrentRank = 0;
let isUserQualified = true;
let eventCountdownInterval = null;

// Web Audio API Sound Synthesizer for Leaderboard Tabs
const LeaderboardAudio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  playTabSwitch() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, t);
      osc.frequency.setValueAtTime(880, t + 0.05);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) { }
  },
  playEventRestart() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(659.25, t + 0.08);
      osc.frequency.setValueAtTime(880, t + 0.16);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    } catch (e) { }
  }
};

window.switchLeaderboardTab = function (tabName) {
  LeaderboardAudio.playTabSwitch();
  const panelLeaderboard = document.getElementById('panelLeaderboard');
  if (panelLeaderboard) panelLeaderboard.style.display = 'block';
};

/**
 * Escape HTML utility
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// 1. LEADERBOARD EVENT LIFECYCLE CONTROLLER (GLOBAL 3-MONTH CYCLE)
// ============================================================================

// 3 Months = 90 Days = 2,160 Hours
const THREE_MONTHS_DAYS = 90;
const THREE_MONTHS_HOURS = 2160;
const THREE_MONTHS_MS = THREE_MONTHS_HOURS * 60 * 60 * 1000;

// Universal Global Epoch Anchor in UTC (October 1, 2026 00:00:00 UTC)
// Guarantees all users worldwide (new, old, guest, logged-in) see the exact same timer!
const GLOBAL_EPOCH_ANCHOR = Date.UTC(2026, 9, 1, 0, 0, 0);

/**
 * Star prize calculator based on final rank:
 * 1st: 10,000 ⭐
 * 2nd: 5,000 ⭐
 * 3rd, 4th, 5th: 1,000 ⭐
 * 6th - 10th: 500 ⭐
 * 11th - 20th: 100 ⭐
 */
function getRankStarPrize(rank) {
  if (rank === 1) return 10000;
  if (rank === 2) return 5000;
  if (rank >= 3 && rank <= 5) return 1000;
  if (rank >= 6 && rank <= 10) return 500;
  if (rank >= 11 && rank <= 20) return 100;
  return 0;
}

/**
 * Retrieve or compute the active Leaderboard Event with Global 3-Month Timer.
 * "globe timer work not indevusal user wise work all user in same time show in game if new or old both in same timer show."
 * Every user worldwide sees the EXACT SAME global countdown!
 */
function getOrCreateLeaderboardEvent() {
  const now = Date.now();

  // Purge legacy key if present
  try {
    if (localStorage.getItem('task_leaderboard_event_v1')) {
      localStorage.removeItem('task_leaderboard_event_v1');
    }
  } catch (e) {}

  // 1. Check if an explicit active event is stored
  let customEvt = null;
  try {
    const raw = localStorage.getItem(EVENT_STORAGE_KEY);
    if (raw) customEvt = JSON.parse(raw);
  } catch (e) {
    customEvt = null;
  }

  // If an event has finished, respect it
  if (customEvt && customEvt.status === 'finished') {
    return customEvt;
  }
  // If active manual override is still running
  if (customEvt && customEvt.isManualOverride && now < customEvt.endTime && customEvt.status === 'active') {
    return customEvt;
  }

  // 2. Compute Deterministic Universal Global 3-Month Season (Identical for ALL users worldwide)
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

  // 3. If stored event was from a previous season, rollover and reset task counters to zero
  if (customEvt && (
    (customEvt.seasonNumber && customEvt.seasonNumber < seasonNumber) ||
    (customEvt.endTime && customEvt.endTime <= now)
  )) {
    localStorage.setItem(EVENT_TASKS_KEY, '0');
    try {
      const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (rawUsers) {
        const uList = JSON.parse(rawUsers);
        if (Array.isArray(uList)) {
          uList.forEach(u => { u.eventTasks = 0; });
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(uList));
        }
      }
    } catch (e) { }
  }

  try {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(globalEvt));
  } catch (e) { }

  return globalEvt;
}

/**
 * Format milliseconds into DDd HHh MMm SSs (Global Synchronized Timer)
 */
function formatTimeRemaining(ms) {
  if (ms <= 0) return '00d 00h 00m 00s';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function startEventCountdownTimer() {
  if (eventCountdownInterval) clearInterval(eventCountdownInterval);

  function tick() {
    const evt = getOrCreateLeaderboardEvent();
    const clockEl = document.getElementById('eventCountdownClock');
    const liveBadge = document.getElementById('eventLiveBadge');
    const statusText = document.getElementById('eventStatusText');
    const seasonTag = document.getElementById('podiumSeasonTag');
    const titleDisplay = document.getElementById('eventTitleDisplay');

    const cleanName = (evt.name || `Season ${evt.seasonNumber || 1}: 3-Month Championship`).replace(/\s*\([^)]*Prize Pool[^)]*\)/i, '');
    if (titleDisplay) {
      titleDisplay.textContent = cleanName;
    }
    if (seasonTag) {
      seasonTag.textContent = `3-MONTH GLOBAL SEASON ${evt.seasonNumber || 1}`;
    }

    const modalTitle = document.getElementById('modalSeasonTitle');
    if (modalTitle) modalTitle.textContent = cleanName;

    const now = Date.now();
    const remaining = evt.endTime - now;

    if (remaining <= 0) {
      // 3-Month Event has concluded!
      if (clockEl) clockEl.textContent = '00:00:00 (ENDED)';
      if (liveBadge) {
        liveBadge.style.display = 'none';
      }
      if (statusText) statusText.textContent = '';
      const modalStatus = document.getElementById('modalSeasonStatusText');
      if (modalStatus) modalStatus.textContent = 'SEASON CONCLUDED';

      // Conclude event, award star prizes, and auto-restart next 3-month season globally!
      if (evt.status !== 'finished') {
        finishLeaderboardEvent();
      }
    } else {
      // Event is actively running globally
      const timeStr = formatTimeRemaining(remaining);
      if (clockEl) clockEl.textContent = timeStr;
      if (liveBadge) {
        liveBadge.style.display = 'none';
      }
      if (statusText) statusText.textContent = '';
      const modalStatus = document.getElementById('modalSeasonStatusText');
      if (modalStatus) modalStatus.textContent = `SEASON ${evt.seasonNumber || 1} • GLOBAL EVENT ACTIVE`;
    }

    const modalClock = document.getElementById('modalSeasonCountdown');
    if (modalClock && clockEl) modalClock.textContent = clockEl.textContent;

    if (typeof updateSeasonAdCooldownClock === 'function') {
      updateSeasonAdCooldownClock();
    }
  }

  tick();
  eventCountdownInterval = setInterval(tick, 1000);
}

/**
 * Finish event when 3-month timer expires:
 * 1. Checks current player's rank (1-20), awards Star Prizes (+10,000 ⭐, +5,000 ⭐, etc.)
 * 2. "after end finished than count zero to start" -> resets event tasks to 0
 * 3. Removes old event data
 * 4. Automatically restarts global timer for the next 3-Month season for all users!
 */
function finishLeaderboardEvent() {
  const evt = getOrCreateLeaderboardEvent();
  evt.status = 'finished';

  // Automatically snapshot and archive current session into Session-Wise Store
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const uList = rawUsers ? JSON.parse(rawUsers) : [];
    const qualified = (Array.isArray(uList) ? uList : [])
      .filter(u => Number(u.totalTasks || 0) >= 100)
      .sort((a, b) => (Number(b.eventTasks || 0)) - (Number(a.eventTasks || 0)));

    const now = Date.now();
    const sessionNum = evt.seasonNumber || 1;
    const standings = qualified.map((u, idx) => {
      const rank = idx + 1;
      const starReward = getRankStarPrize(rank);
      return {
        rank,
        id: u.id || ('usr_' + idx),
        name: u.name || 'Anonymous',
        avatar: u.avatar || '⚡',
        eventTasks: Number(u.eventTasks || 0),
        totalTasks: Number(u.totalTasks || 0),
        starReward
      };
    });

    const archivedSession = {
      id: 'session_' + sessionNum + '_' + now,
      sessionNumber: sessionNum,
      name: evt.name || ('Season ' + sessionNum + ': 3-Month Championship'),
      startTime: evt.startTime || (now - (90 * 24 * 60 * 60 * 1000)),
      endTime: now,
      archivedAt: now,
      status: 'concluded',
      totalContenders: standings.length,
      totalTasksCompleted: standings.reduce((sum, s) => sum + s.eventTasks, 0),
      totalStarsAwarded: standings.reduce((sum, s) => sum + s.starReward, 0),
      topWinner: standings[0] || null,
      standings
    };

    const rawSessions = localStorage.getItem('task_game_leaderboard_sessions');
    const sessionsList = rawSessions ? JSON.parse(rawSessions) : [];
    const updatedSessions = Array.isArray(sessionsList) ? sessionsList : [];
    updatedSessions.unshift(archivedSession);
    localStorage.setItem('task_game_leaderboard_sessions', JSON.stringify(updatedSessions));

    if (window.Firebase && typeof window.Firebase.saveLeaderboardSessionsToCloud === 'function') {
      window.Firebase.saveLeaderboardSessionsToCloud(updatedSessions);
    }
  } catch(e) {
    console.warn('[Leaderboard] Error auto-archiving finished session:', e.message);
  }

  // 1. Award Star Prizes to user if qualified (100 tasks limit) and placed in top 20!
  const userTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
  const myPlayerName = localStorage.getItem('player_username') || 'Player';
  const users = getActiveUsersList();
  const myIndex = userTotalTasks >= 100 ? users.findIndex(u => u.id === 'usr_1' || u.name === myPlayerName) : -1;
  const myRank = myIndex >= 0 ? myIndex + 1 : 0;

  if (myRank >= 1 && myRank <= 20) {
    const starReward = getRankStarPrize(myRank);
    if (starReward > 0) {
      let currentStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
      currentStars += starReward;
      localStorage.setItem('task_game_stars', currentStars.toString());
      alert(`🎉 3-Month Leaderboard Season Concluded!\n\nOutstanding! You placed Rank #${myRank} and won +${starReward.toLocaleString()} Stars (⭐)!\nYour new balance: ${currentStars.toLocaleString()} ⭐`);
    }
  }

  // 2. Reset event tasks counter to 0 ("after end finished than count zero to start")
  localStorage.setItem(EVENT_TASKS_KEY, '0');

  // 3. Remove old event task counts from user pool
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      const uList = JSON.parse(rawUsers);
      if (Array.isArray(uList)) {
        uList.forEach(u => { u.eventTasks = 0; });
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(uList));
      }
    }
  } catch (e) { }

  // 4. Save finished status & broadcast
  try {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(evt));
    const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
    bc.postMessage({ type: 'EVENT_FINISHED', timestamp: Date.now() });
    bc.close();
  } catch (e) { }

  renderRealLeaderboard();

  // 5. Automatically roll over to the next 3-Month season globally!
  setTimeout(() => {
    localStorage.removeItem(EVENT_STORAGE_KEY);
    const nextEvt = getOrCreateLeaderboardEvent();
    startEventCountdownTimer();
    renderRealLeaderboard();
    showToastNotification(`🏆 3-Month Season Concluded! New Global Season Started with fresh 90-day timer.`);
  }, 2500);
}

/**
 * Restart leaderboard event:
 * "and if event restart than old data remove than task are counter restart."
 * Restarts global 3-month timer and resets counters to 0.
 */
window.restartLeaderboardEvent = function (durationHours = THREE_MONTHS_HOURS, newTitle = null) {
  LeaderboardAudio.playEventRestart();

  const now = Date.now();
  const dur = Number(durationHours) || THREE_MONTHS_HOURS;
  const title = newTitle || 'Season 1: 3-Month Championship';

  // 1. Old event task data removed / reset counter to zero
  localStorage.setItem(EVENT_TASKS_KEY, '0');

  // 2. Wipe event tasks in users list to restart from 0
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        users.forEach(u => {
          u.eventTasks = 0;
        });
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }
  } catch (e) { }

  // 3. Create fresh global 3-month event window
  const newEvt = {
    id: 'evt_' + now,
    name: title,
    startTime: now,
    endTime: now + (dur * 60 * 60 * 1000),
    durationHours: dur,
    status: 'active',
    isManualOverride: true,
    isGlobal: true
  };

  try {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(newEvt));
  } catch (e) { }

  // Save to Firebase Firestore cloud so ALL devices sync
  if (window.Firebase && typeof window.Firebase.saveGlobalLeaderboardEventToCloud === 'function') {
    window.Firebase.saveGlobalLeaderboardEventToCloud(newEvt).catch(() => { });
  }

  // 4. Broadcast restart across all open tabs
  try {
    const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
    bc.postMessage({ type: 'EVENT_RESTART', event: newEvt, timestamp: now });
    bc.close();
  } catch (e) { }

  // 5. Re-render UI
  startEventCountdownTimer();
  renderRealLeaderboard();

  // Feedback
  showToastNotification(`🏆 3-Month Leaderboard Restarted! Task counters reset to 0. Global timer active.`);
};

window.handleRestartEventClick = function () {
  if (confirm('🔄 Restart 3-Month Leaderboard Season?\n\n• Old event task data will be removed.\n• Task counters will restart from 0 for all players.\n• Global 3-Month timer will be synchronized.')) {
    window.restartLeaderboardEvent(THREE_MONTHS_HOURS);
  }
};

function showToastNotification(msg) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = '#0284c7';
  toast.style.color = '#ffffff';
  toast.style.padding = '0.75rem 1.25rem';
  toast.style.borderRadius = '12px';
  toast.style.fontWeight = '800';
  toast.style.fontSize = '0.8rem';
  toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
  toast.style.zIndex = '9999';
  toast.style.maxWidth = '90%';
  toast.style.textAlign = 'center';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ============================================================================
// 2. USER QUALIFICATION & ACTIVE LEADERBOARD DATA
// ============================================================================

/**
 * Load and merge users from localStorage, seed pool, and live player balance.
 * Enforces the 100-task qualification gate:
 * - If current user has completed < 100 total tasks, their name is NOT placed
 *   in the active leaderboard ranks until they reach 100 tasks.
 * - During active events, ranking is sorted by eventTasks (descending), then coins.
 */
function getActiveUsersList() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  const userTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
  const userEventTasks = parseInt(localStorage.getItem(EVENT_TASKS_KEY) || '0', 10);

  isUserQualified = true;

  let rawUsers = null;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) rawUsers = JSON.parse(raw);
  } catch (e) {
    rawUsers = null;
  }

  let users = [];
  if (Array.isArray(rawUsers) && rawUsers.length > 0) {
    // Purge any mock/demo users from storage
    users = rawUsers.filter(u => u && !['usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6', 'usr_7', 'usr_8', 'usr_9', 'usr_10', 'usr_11', 'usr_12', 'usr_13', 'usr_14', 'usr_15', 'usr_16', 'usr_17', 'usr_18', 'usr_19', 'usr_20', 'usr_21'].includes(u.id) && u.name !== 'VortexTyper' && u.name !== 'CyberKey' && u.name !== 'ShadowTyper' && u.name !== 'Alex_Gamer' && u.name !== 'NeonBlaze' && u.name !== 'Phoenix99' && u.name !== 'QuantumCoder' && u.name !== 'StarHunter' && u.name !== 'HyperStrike' && u.name !== 'VortexPilot' && u.name !== 'LunaBlade');
  } else {
    users = [];
  }

  const myName = localStorage.getItem('player_username') || 'Player';
  const myAvatar = localStorage.getItem('player_avatar') || '⚡';

  // Find or manage current player entry
  let primaryUser = users.find(u => u.id === 'usr_1' || u.name === myName);
  if (!primaryUser) {
    primaryUser = {
      id: 'usr_1',
      name: myName,
      avatar: myAvatar,
      level: 'LVL 1 • NOVICE',
      coins: userCoins,
      stars: userStars,
      totalTasks: userTotalTasks,
      eventTasks: userEventTasks,
      status: 'active',
      joined: 'Today'
    };
    users.unshift(primaryUser);
  } else {
    primaryUser.name = myName;
    primaryUser.avatar = myAvatar;
    primaryUser.coins = userCoins;
    primaryUser.stars = userStars;
    primaryUser.totalTasks = userTotalTasks;
    primaryUser.eventTasks = userEventTasks;
  }

  // Active players start directly from 0 tasks
  let activeOnly = users.filter(u => u.status !== 'suspended');

  // SORTING:
  // Rank by event tasks completed (primary), then coins (secondary), then stars (tertiary)
  activeOnly.sort((a, b) => {
    const tasksDiff = Number(b.eventTasks || 0) - Number(a.eventTasks || 0);
    if (tasksDiff !== 0) return tasksDiff;
    const coinsDiff = Number(b.coins || 0) - Number(a.coins || 0);
    if (coinsDiff !== 0) return coinsDiff;
    return Number(b.stars || 0) - Number(a.stars || 0);
  });

  return activeOnly;
}

// ============================================================================
// 3. RENDER LEADERBOARD VIEW
// ============================================================================

/**
 * Render the entire real-time leaderboard (Event Banner, Qualification Card, Podium, Contenders, Sticky Bar)
 */
function renderRealLeaderboard() {
  updateSeasonTabButton();
  const userTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
  const userEventTasks = parseInt(localStorage.getItem(EVENT_TASKS_KEY) || '0', 10);
  isUserQualified = userTotalTasks >= 100;

  // Header coin & star display
  const topCoins = document.getElementById('leaderboardCoinsTop');
  if (topCoins) topCoins.textContent = userCoins.toLocaleString();

  const topStars = document.getElementById('leaderboardStarsTop');
  if (topStars) topStars.textContent = userStars.toLocaleString();

  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) avatarEl.textContent = localStorage.getItem('player_avatar') || '🏆';

  const nameEl = document.querySelector('.user-name');
  if (nameEl) nameEl.textContent = localStorage.getItem('player_username') || 'Player';

  // 1. RENDER EVENT BANNER BODY STATS
  const myEventTasksEl = document.getElementById('myEventTasksCount');
  if (myEventTasksEl) {
    myEventTasksEl.textContent = `${userEventTasks} 🎯`;
  }

  // 2. HIDE PRIZES AND QUALIFICATION CARDS PER USER REQUEST
  const prizesCard = document.getElementById('leaderboardPrizesCard');
  if (prizesCard) prizesCard.style.display = 'none';

  const qualCard = document.getElementById('qualificationCard');
  if (qualCard) qualCard.style.display = 'none';

  // 3. GET QUALIFIED USERS LIST
  const users = getActiveUsersList();
  currentRanksList = users;

  const myPlayerName = localStorage.getItem('player_username') || 'Player';
  const myIndex = isUserQualified ? users.findIndex(u => u.id === 'usr_1' || u.name === myPlayerName) : -1;
  myCurrentRank = myIndex >= 0 ? myIndex + 1 : 0;

  // 4. RENDER TOP 3 PODIUM
  const u1 = users[0] || { name: 'Awaiting Champion', coins: 0, eventTasks: 0, avatar: '👑', id: 'empty' };
  const u2 = users[1] || { name: 'Awaiting Contender', coins: 0, eventTasks: 0, avatar: '🥈', id: 'empty' };
  const u3 = users[2] || { name: 'Awaiting Challenger', coins: 0, eventTasks: 0, avatar: '🥉', id: 'empty' };

  updatePodiumSlot(1, u1, myIndex === 0);
  updatePodiumSlot(2, u2, myIndex === 1);
  updatePodiumSlot(3, u3, myIndex === 2);

  // 5. RENDER IN-BETWEEN CONTENDERS (Ranks #4 onwards)
  const scrollContainer = document.getElementById('ranksScrollContainer');
  if (scrollContainer) {
    const contenders = users.slice(3);
    if (contenders.length === 0) {
      scrollContainer.innerHTML = `
        <div class="empty-ranks-box">
          <div class="empty-ranks-icon">🏆</div>
          <div class="empty-ranks-title">Leaderboard Awaiting Competitors</div>
          <div class="empty-ranks-desc">Complete Web Tasks to claim your rank!</div>
          <a href="../home/index.html" class="btn-qualify-now">Complete Web Tasks &rarr;</a>
        </div>
      `;
    } else {
      scrollContainer.innerHTML = contenders.map((u, idx) => {
        const rank = idx + 4;
        const isMe = isUserQualified && (u.id === 'usr_1' || u.name === myPlayerName);
        const highlightClass = isMe ? 'leader-row-card highlight-me' : 'leader-row-card';
        const rankClass = isMe ? 'row-rank my-rank' : 'row-rank';
        const youBadge = isMe ? `<span class="row-you-pill">YOU</span>` : '';
        const rowId = isMe ? 'id="myLeaderboardRow"' : '';

        const statsInfo = `${Number(u.totalTasks || 0)} Total Web Tasks`;
        const taskBadge = `<span class="row-task-pill">${Number(u.eventTasks || 0)} 🎯 Season</span>`;
        const starPrize = getRankStarPrize(rank);
        const starBadge = starPrize > 0 ? `<span class="row-star-prize">+${starPrize.toLocaleString()} ⭐</span>` : '';

        return `
          <div class="${highlightClass}" ${rowId}>
            <span class="${rankClass}">#${rank}</span>
            <div class="row-avatar">${escapeHtml(u.avatar || '👤')}</div>
            <div class="row-info" style="min-width: 0; flex: 1;">
              <div class="row-name" style="display: flex; align-items: center; gap: 4px;">
                <span>${escapeHtml(u.name)}</span>
                ${youBadge}
              </div>
              <div class="row-stats">${escapeHtml(statsInfo)}</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                ${starBadge}
                ${taskBadge}
              </div>
              <span class="row-coins" style="font-weight: 800; color: #fbbf24; font-size: 0.78rem;">${Number(u.coins || 0).toLocaleString()} 🪙</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 6. RENDER STICKY USER REAL-TIME RANK BAR (ABOVE MENU BAR)
  updateStickyUserRankBar(users, myIndex, myCurrentRank, userTotalTasks, userEventTasks);

  // 7. SYNC DATA INSIDE SEASON DETAILS & REWARDS MODAL
  if (typeof updateSeasonModalData === 'function') {
    updateSeasonModalData();
  }
}

/**
 * Render the 100-Task Qualification Gate Card (Hidden per user request)
 */
function renderQualificationCard(totalTasks) {
  const card = document.getElementById('qualificationCard');
  if (card) {
    card.style.display = 'none';
  }
}

/**
 * Update a specific podium slot (1, 2, or 3)
 */
function updatePodiumSlot(rankNum, user, isMe) {
  const nameEl = document.getElementById(`podiumName${rankNum}`);
  const coinsEl = document.getElementById(`podiumCoins${rankNum}`);
  const tasksEl = document.getElementById(`podiumTasks${rankNum}`);
  const avatarEl = document.getElementById(`podiumAvatar${rankNum}`);
  const cardEl = document.getElementById(`podiumCard${rankNum}`);

  const isAwaiting = !user || user.id === 'empty' || !user.name || user.name.startsWith('Awaiting');

  if (nameEl) {
    if (isAwaiting) {
      nameEl.innerHTML = `<span style="color: #64748b; font-style: italic;">Awaiting #${rankNum}</span>`;
    } else {
      nameEl.innerHTML = escapeHtml(user.name) + (isMe ? ' <span style="font-size: 0.62rem; color: #fde047; font-weight: 900;">(YOU)</span>' : '');
    }
  }
  if (tasksEl) {
    tasksEl.textContent = isAwaiting ? '0 🎯' : `${Number(user.eventTasks || 0)} 🎯`;
  }
  if (coinsEl) {
    coinsEl.textContent = isAwaiting ? '0 🪙' : `${Number(user.coins || 0).toLocaleString()} 🪙`;
  }
  if (avatarEl) {
    avatarEl.textContent = isAwaiting ? (rankNum === 1 ? '👑' : rankNum === 2 ? '🥈' : '🥉') : (user.avatar || '👤');
  }
  if (cardEl) {
    if (isMe) cardEl.classList.add('is-me');
    else cardEl.classList.remove('is-me');
  }
}

/**
 * Update the sticky real-time user rank bar docked above the bottom menu bar
 */
function updateStickyUserRankBar(users, myIndex, myRank, totalTasks, eventTasks) {
  const badgeEl = document.getElementById('myLiveRankBadge');
  const avatarEl = document.getElementById('myLiveRankAvatar');
  const nameEl = document.getElementById('myLiveRankName');
  const coinsEl = document.getElementById('myLiveRankCoins');
  const starsEl = document.getElementById('myLiveRankStars');
  const subEl = document.getElementById('myLiveRankSub');

  const myAvatar = localStorage.getItem('player_avatar') || '⚡';
  const myName = localStorage.getItem('player_username') || 'Player';

  if (avatarEl) avatarEl.textContent = myAvatar;
  if (nameEl) nameEl.textContent = myName;
  if (coinsEl) coinsEl.textContent = `${userCoins.toLocaleString()} 🪙`;
  if (starsEl) starsEl.textContent = `${userStars.toLocaleString()} ⭐`;

  if (!isUserQualified) {
    // Unqualified (< 100 tasks)
    if (badgeEl) {
      badgeEl.textContent = '🔒';
      badgeEl.className = 'user-rank-badge rank-locked';
    }
    if (subEl) {
      subEl.innerHTML = `<span style="color: #f59e0b;">Complete 100 Web Tasks to enter (${totalTasks}/100 done)</span>`;
    }
  } else {
    // Qualified
    if (badgeEl) {
      badgeEl.textContent = `#${myRank}`;
      badgeEl.className = 'user-rank-badge';
      if (myRank === 1) badgeEl.classList.add('rank-1');
      else if (myRank === 2) badgeEl.classList.add('rank-2');
      else if (myRank === 3) badgeEl.classList.add('rank-3');
    }
    if (subEl) {
      if (myRank === 1) {
        subEl.innerHTML = `<span style="color: #fde047;">👑 You are in 1st Place! (${eventTasks} 🎯)</span>`;
      } else if (myRank === 2) {
        const leader = users[0];
        const diff = leader ? (Number(leader.eventTasks || 0) - eventTasks) : 0;
        subEl.textContent = `🥈 Rank #2 • ${diff} 🎯 behind #1`;
      } else if (myRank === 3) {
        const second = users[1];
        const diff = second ? (Number(second.eventTasks || 0) - eventTasks) : 0;
        subEl.textContent = `🥉 Rank #3 • ${diff} 🎯 behind #2`;
      } else if (myRank > 3) {
        const target = users[myRank - 2];
        const diff = target ? (Number(target.eventTasks || 0) - eventTasks) : 0;
        subEl.textContent = `${diff} 🎯 to Rank #${myRank - 1} • Rank #${myRank}`;
      } else {
        subEl.textContent = `🎯 ${eventTasks} Event Tasks • Qualified`;
      }
    }
  }
}

/**
 * Smoothly scroll to the current user's position when the sticky rank bar is clicked
 */
function setupStickyBarClickListener() {
  const stickyBar = document.getElementById('stickyUserRankBar');
  if (!stickyBar) return;

  stickyBar.addEventListener('click', () => {
    LeaderboardAudio.playTabSwitch();

    if (!isUserQualified) {
      const qCard = document.getElementById('qualificationCard');
      if (qCard) {
        qCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        qCard.style.transition = 'transform 0.3s ease';
        qCard.style.transform = 'scale(1.03)';
        setTimeout(() => { qCard.style.transform = 'scale(1)'; }, 500);
      }
      return;
    }

    if (myCurrentRank >= 1 && myCurrentRank <= 3) {
      const podiumTarget = document.getElementById(`podiumCol${myCurrentRank}`);
      if (podiumTarget) {
        podiumTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      const myRow = document.getElementById('myLeaderboardRow');
      if (myRow) {
        myRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        myRow.style.transition = 'transform 0.3s ease';
        myRow.style.transform = 'scale(1.04)';
        setTimeout(() => { myRow.style.transform = 'scale(1)'; }, 500);
      }
    }
  });
}

// ============================================================================
// 4. REAL-TIME SYNC LISTENERS (BROADCASTCHANNEL, STORAGE, FIREBASE)
// ============================================================================

try {
  const syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  syncChannel.onmessage = (event) => {
    if (event.data && (event.data.type === 'EVENT_RESTART' || event.data.type === 'EVENT_FINISHED' || event.data.type === 'EVENT_SYNCED')) {
      startEventCountdownTimer();
    }
    renderRealLeaderboard();
  };
} catch (e) { }

window.addEventListener('balance:changed', () => {
  renderRealLeaderboard();
});

window.addEventListener('balance:synced', () => {
  renderRealLeaderboard();
});

window.addEventListener('storage', (e) => {
  if (
    e.key === 'task_game_coins' ||
    e.key === 'task_game_stars' ||
    e.key === TOTAL_TASKS_KEY ||
    e.key === EVENT_TASKS_KEY ||
    e.key === EVENT_STORAGE_KEY ||
    e.key === USERS_STORAGE_KEY
  ) {
    if (e.key === EVENT_STORAGE_KEY) {
      startEventCountdownTimer();
    }
    renderRealLeaderboard();
  }
});

function setupFirebaseCloudSync() {
  if (window.Firebase && typeof window.Firebase.listenToCloudUsers === 'function') {
    window.Firebase.listenToCloudUsers((cloudUsers) => {
      if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        renderRealLeaderboard();
      }
    });
  }
  if (window.Firebase && typeof window.Firebase.listenToCloudLeaderboardEvent === 'function') {
    window.Firebase.listenToCloudLeaderboardEvent((cloudEvent) => {
      if (cloudEvent && cloudEvent.status) {
        try {
          localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(cloudEvent));
        } catch (e) { }
        startEventCountdownTimer();
        renderRealLeaderboard();
      }
    });
  }
}

window.addEventListener('firebase:ready', setupFirebaseCloudSync);
if (window.Firebase) setupFirebaseCloudSync();

// Periodic heartbeat check (every 2.5s)
setInterval(() => {
  renderRealLeaderboard();
}, 2500);

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateSeasonTabButton();
  startEventCountdownTimer();
  renderRealLeaderboard();
  setupStickyBarClickListener();

  document.addEventListener('click', () => {
    LeaderboardAudio.init();
  }, { once: true });
});

window.renderRealLeaderboard = renderRealLeaderboard;

// ============================================================================
// 4. LEADERBOARD SEASON & REWARDS MODAL CONTROLLER
// Manages:
// 1. 100 Tasks Participation Gate
// 2. Watch Ads (+50 Coins) with 6-Hour Cooldown Renewal Timer (100 Ads Quota)
// 3. Season Finish -> Rank-Wise Star Prize Claim (Enforcing 100 Ads to Claim)
// ============================================================================

const SEASON_ADS_KEY = 'task_game_leaderboard_season_ads_watched';
const SEASON_COOLDOWN_KEY = 'task_game_leaderboard_season_ad_cooldown';
const SEASON_CLAIMED_KEY = 'task_game_leaderboard_season_reward_claimed';

/**
 * Toast Notification Utility
 */
function showToastNotification(msg) {
  let toast = document.getElementById('leaderboardToastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'leaderboardToastNotification';
    toast.style.cssText = 'position: fixed; top: 18px; left: 50%; transform: translateX(-50%) translateY(-20px); background: linear-gradient(135deg, rgba(8, 20, 52, 0.95), rgba(13, 31, 80, 0.98)); border: 1.5px solid rgba(56, 189, 248, 0.6); color: #ffffff; padding: 0.7rem 1.1rem; border-radius: 14px; font-size: 0.82rem; font-weight: 800; z-index: 100000; box-shadow: 0 10px 30px rgba(0,0,0,0.6); opacity: 0; pointer-events: none; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); max-width: 90vw; text-align: center;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 3200);
}

/**
 * Update Header Balances
 */
function updateHeaderBalances() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  const topCoins = document.getElementById('leaderboardCoinsTop');
  if (topCoins) topCoins.textContent = userCoins.toLocaleString();
  const topStars = document.getElementById('leaderboardStarsTop');
  if (topStars) topStars.textContent = userStars.toLocaleString();
}

/**
 * Open Leaderboard Season & Rewards Modal
 */
window.openLeaderboardSeasonModal = function (e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  LeaderboardAudio.playTabSwitch();
  const modal = document.getElementById('leaderboardSeasonModalOverlay');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    updateSeasonModalData();
  }
};

function updateSeasonTabButton() {
  const joinBtn = document.getElementById('sessionTabJoinBtn');
  if (!joinBtn) return;
  const userTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
  if (userTotalTasks >= 100) {
    joinBtn.innerHTML = '<span>Joined ✓</span>';
    joinBtn.classList.add('joined');
  } else {
    joinBtn.innerHTML = '<span>Join</span>';
    joinBtn.classList.remove('joined');
  }
}

/**
 * Close Leaderboard Season Modal
 */
window.closeLeaderboardSeasonModal = function () {
  const modal = document.getElementById('leaderboardSeasonModalOverlay');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
};

window.handleSeasonModalBackdropClick = function (e) {
  if (e.target && e.target.id === 'leaderboardSeasonModalOverlay') {
    closeLeaderboardSeasonModal();
  }
};

/**
 * Update dynamic contents inside Leaderboard Season Modal
 */
function updateSeasonModalData() {
  const userTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
  const adsWatched = parseInt(localStorage.getItem(SEASON_ADS_KEY) || '0', 10);
  const isClaimed = localStorage.getItem(SEASON_CLAIMED_KEY) === 'true';
  const evt = getOrCreateLeaderboardEvent();

  // 1. Tasks Participation (Min 100)
  const isParticipated = userTotalTasks >= 100;
  const tasksProgressText = document.getElementById('modalTasksProgressText');
  const tasksProgressBar = document.getElementById('modalTasksProgressBar');
  const tasksRemainingText = document.getElementById('modalTasksRemainingText');
  const participationStatusPill = document.getElementById('participationStatusPill');
  const participationStatusIcon = document.getElementById('participationStatusIcon');
  const participationStatusText = document.getElementById('participationStatusText');
  const participationActionRow = document.getElementById('participationActionRow');

  const taskPct = Math.min(100, Math.round((userTotalTasks / 100) * 100));

  if (tasksProgressText) {
    tasksProgressText.textContent = `${userTotalTasks} / 100 (${taskPct}%)`;
  }
  if (tasksProgressBar) {
    tasksProgressBar.style.width = `${taskPct}%`;
  }

  if (isParticipated) {
    if (participationStatusPill) participationStatusPill.className = 'participation-status-pill participated';
    if (participationStatusIcon) participationStatusIcon.textContent = '✅';
    if (participationStatusText) participationStatusText.textContent = 'PARTICIPATED';
    if (tasksRemainingText) {
      tasksRemainingText.style.display = 'none';
      tasksRemainingText.textContent = '';
    }
    if (participationActionRow) participationActionRow.style.display = 'none';
  } else {
    if (participationStatusPill) participationStatusPill.className = 'participation-status-pill locked';
    if (participationStatusIcon) participationStatusIcon.textContent = '🔒';
    if (participationStatusText) participationStatusText.textContent = 'NOT PARTICIPATED';
    if (tasksRemainingText) {
      tasksRemainingText.style.display = 'none';
      tasksRemainingText.textContent = '';
    }
    if (participationActionRow) participationActionRow.style.display = 'inline-flex';
  }

  // 2. Season Ads Quota (30 Ads Quota)
  const adsCountBadge = document.getElementById('seasonAdsCountBadge');
  const adsProgressText = document.getElementById('modalAdsProgressText');
  const adsProgressBar = document.getElementById('modalAdsProgressBar');
  const btnWatchAd = document.getElementById('btnSeasonWatchAd');
  const btnWatchAdText = document.getElementById('btnSeasonWatchAdText');

  const adPct = Math.min(100, Math.round((adsWatched / 30) * 100));
  if (adsCountBadge) adsCountBadge.textContent = `${adsWatched} / 30 ADS`;
  if (adsProgressText) adsProgressText.textContent = `${adsWatched} / 30 (${adPct}%)`;
  if (adsProgressBar) adsProgressBar.style.width = `${adPct}%`;

  if (btnWatchAd) {
    if (adsWatched >= 30) {
      btnWatchAd.disabled = true;
      if (btnWatchAdText) btnWatchAdText.textContent = '✅ Completed (30/30)';
    } else {
      btnWatchAd.disabled = false;
      if (btnWatchAdText) btnWatchAdText.textContent = '📺 Watch Ad';
    }
  }

  // 3. Leaderboard Rank Standing & Claim Gate (Requires 30 Ads)
  const userRankBadge = document.getElementById('modalUserRankBadge');
  const userRankText = document.getElementById('modalUserRankText');
  const standingRankName = document.getElementById('modalStandingRankName');
  const standingPrizeStars = document.getElementById('modalStandingPrizeStars');
  const claimWarning = document.getElementById('modalClaimWarning');
  const claimWarningText = document.getElementById('modalClaimWarningText');
  const btnClaim = document.getElementById('btnClaimSeasonRankReward');
  const btnClaimText = document.getElementById('btnClaimSeasonRewardText');

  const myRank = myCurrentRank;
  let rankPrize = 0;
  if (isParticipated && myRank >= 1 && myRank <= 20) {
    rankPrize = getRankStarPrize(myRank);
  }

  if (isParticipated && myRank > 0) {
    if (userRankText) userRankText.textContent = `Rank #${myRank}`;
    if (standingRankName) standingRankName.textContent = `Rank #${myRank} • Participating`;
    if (standingPrizeStars) standingPrizeStars.textContent = `+${rankPrize.toLocaleString()} ⭐`;
  } else {
    if (userRankText) userRankText.textContent = 'Not Ranked';
    if (standingRankName) standingRankName.textContent = 'Not Ranked (Complete 100 Tasks)';
    if (standingPrizeStars) standingPrizeStars.textContent = '+0 ⭐';
  }

  const isFinished = evt.status === 'finished' || (evt.endTime && (evt.endTime - Date.now() <= 0));

  if (isClaimed) {
    if (claimWarning) {
      claimWarning.className = 'claim-req-warning satisfied';
      claimWarning.innerHTML = `<span>✅</span><span>Season Rank Reward already claimed (+${rankPrize.toLocaleString()} ⭐ received)!</span>`;
    }
    if (btnClaim) {
      btnClaim.disabled = true;
      btnClaim.className = 'btn-claim-season-reward claimed';
      if (btnClaimText) btnClaimText.textContent = '✅ Rank Reward Claimed';
    }
  } else if (!isParticipated) {
    if (claimWarning) {
      claimWarning.className = 'claim-req-warning';
      claimWarning.innerHTML = `<span>🔒</span><span>Complete 100 Web Tasks first to enter ranks and participate in Season 1.</span>`;
    }
    if (btnClaim) {
      btnClaim.disabled = true;
      btnClaim.className = 'btn-claim-season-reward locked';
      if (btnClaimText) btnClaimText.textContent = '🔒 Complete 100 Tasks to Qualify';
    }
  } else if (adsWatched < 30) {
    if (claimWarning) {
      claimWarning.className = 'claim-req-warning';
      claimWarning.innerHTML = `<span>🔒</span><span>Watch 30 Ads to qualify for Season Rank Rewards (${adsWatched} / 30 Ads watched).</span>`;
    }
    if (btnClaim) {
      btnClaim.disabled = true;
      btnClaim.className = 'btn-claim-season-reward locked';
      if (btnClaimText) btnClaimText.textContent = `🔒 Complete 30 Ads to Qualify (${adsWatched}/30)`;
    }
  } else if (isFinished) {
    if (claimWarning) {
      claimWarning.className = 'claim-req-warning satisfied';
      claimWarning.innerHTML = `<span>✅</span><span>Eligible to claim rank reward upon season finish.</span>`;
    }
    if (btnClaim) {
      btnClaim.disabled = false;
      btnClaim.className = 'btn-claim-season-reward active';
      if (btnClaimText) btnClaimText.textContent = '🏆 Claim Season Reward';
    }
  } else {
    // Still in active season
    if (claimWarning) {
      claimWarning.className = 'claim-req-warning satisfied';
      claimWarning.innerHTML = `<span>⏳</span><span>Season 1 is currently active. Claim unlocks upon season end.</span>`;
    }
    if (btnClaim) {
      btnClaim.disabled = true;
      btnClaim.className = 'btn-claim-season-reward locked';
      if (btnClaimText) btnClaimText.textContent = `⏳ Claim Unlocks When Season Finishes (${rankPrize.toLocaleString()} ⭐)`;
    }
  }
}

/**
 * Handle 6-Hour Cooldown Timer Tick (Live Renewal) - Deprecated / Optional helper
 */
function updateSeasonAdCooldownClock() {
  const cooldownClock = document.getElementById('seasonAdCooldownClock');
  if (cooldownClock) cooldownClock.textContent = 'Ready to Watch ✓';
}

/**
 * Watch Ad button clicked inside Season popup:
 * 1. Opens ad immediately
 * 2. Increments 30-ads quota
 * 3. Awards +50 coins
 */
window.handleSeasonWatchAd = function () {
  LeaderboardAudio.init();

  let adsWatched = parseInt(localStorage.getItem(SEASON_ADS_KEY) || '0', 10);
  if (adsWatched >= 30) {
    showToastNotification('✅ Maximum 30 Ads Quota already completed for Season Rewards!');
    return;
  }

  const onAdReward = () => {
    // Increment ads watched count (up to 30)
    adsWatched = Math.min(30, adsWatched + 1);
    localStorage.setItem(SEASON_ADS_KEY, adsWatched.toString());
    localStorage.setItem('task_game_ads_watched_count', (parseInt(localStorage.getItem('task_game_ads_watched_count') || '0', 10) + 1).toString());

    // Award +50 Coins to user balance
    let coins = parseInt(localStorage.getItem('task_game_coins') || '0', 10) + 50;
    userCoins = coins;
    localStorage.setItem('task_game_coins', coins.toString());
    localStorage.setItem('user_coins', coins.toString());

    if (window.firebaseSync && typeof window.firebaseSync.addCoins === 'function') {
      window.firebaseSync.addCoins(50);
    }

    // Sound feedback
    LeaderboardAudio.playTabSwitch();

    // Toast / notification
    showToastNotification(`📺 Ad Watched! +50 Coins awarded (${adsWatched}/30 Ads).`);

    updateHeaderBalances();
    updateSeasonModalData();
  };

  // Rewarded interstitial
  show_10691428().then(() => {
    // You need to add your user reward function here, which will be executed after the user watches the ad.
    // For more details, please refer to the detailed instructions.
    alert('You have seen an ad!');
    onAdReward();
  }).catch((err) => {
    console.warn('show_10691428 notice:', err);
    onAdReward();
  });
};


window.handleClaimSeasonRankReward = function () {
  LeaderboardAudio.init();
  const adsWatched = parseInt(localStorage.getItem(SEASON_ADS_KEY) || '0', 10);
  const userTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
  const evt = getOrCreateLeaderboardEvent();
  const isFinished = evt.status === 'finished' || (evt.endTime && (evt.endTime - Date.now() <= 0));

  if (userTotalTasks < 100) {
    alert('🔒 Complete 100 Web Tasks first to qualify for Season 1 Participation.');
    return;
  }

  if (adsWatched < 30) {
    alert(`🔒 You must watch 30 Ads to qualify for Season Rank Rewards!\nCurrent: ${adsWatched} / 30 Ads.`);
    return;
  }

  if (!isFinished) {
    alert('⏳ The season is still actively running!\nRank rewards can be claimed once the season countdown reaches 0 and concludes.');
    return;
  }

  const myRank = myCurrentRank;
  if (myRank < 1 || myRank > 20) {
    alert('🎖️ You must be placed in the Top 20 to claim a Star prize.');
    return;
  }

  const starReward = getRankStarPrize(myRank);
  let currentStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  currentStars += starReward;
  userStars = currentStars;
  localStorage.setItem('task_game_stars', currentStars.toString());
  localStorage.setItem(SEASON_CLAIMED_KEY, 'true');

  if (window.firebaseSync && typeof window.firebaseSync.addStars === 'function') {
    window.firebaseSync.addStars(starReward);
  }

  LeaderboardAudio.playEventRestart();

  alert(`🎉 CONGRATULATIONS!\n\nYou completed 30 Ads and achieved Rank #${myRank} in Season 1!\n\nClaimed: +${starReward.toLocaleString()} Stars (⭐)!\nYour new balance: ${currentStars.toLocaleString()} ⭐`);

  updateHeaderBalances();
  updateSeasonModalData();
};

/**
 * Fast Testing Simulation Controls
 */
window.simulateSeasonTasks = function (count = 100) {
  let tasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10) + count;
  localStorage.setItem(TOTAL_TASKS_KEY, tasks.toString());
  localStorage.setItem(EVENT_TASKS_KEY, tasks.toString());
  renderRealLeaderboard();
  updateSeasonModalData();
  showToastNotification(`🧪 Simulated: Added +${count} tasks! Total tasks: ${tasks}`);
};

window.simulateSeasonAds = function (count = 5) {
  let ads = parseInt(localStorage.getItem(SEASON_ADS_KEY) || '0', 10) + count;
  ads = Math.min(30, ads);
  localStorage.setItem(SEASON_ADS_KEY, ads.toString());
  updateSeasonModalData();
  showToastNotification(`🧪 Simulated: Added +${count} ads! Season Ads: ${ads}/30`);
};

window.simulateResetAdCooldown = function () {
  localStorage.removeItem(SEASON_COOLDOWN_KEY);
  updateSeasonModalData();
  showToastNotification(`🧪 Simulated: 6-Hour ad cooldown reset! Ready to watch.`);
};

window.simulateConcludeSeason = function () {
  const evt = getOrCreateLeaderboardEvent();
  evt.status = 'finished';
  evt.endTime = Date.now() - 1000;
  localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(evt));
  startEventCountdownTimer();
  updateSeasonModalData();
  showToastNotification(`🧪 Simulated: Season marked concluded/finished!`);
};
