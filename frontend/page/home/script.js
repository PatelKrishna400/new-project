// Zero-start sanitizer: Purge all mock demo users, artificial balances, and start from 0
try {
  if (!localStorage.getItem('task_game_zero_start_clean_v7')) {
    localStorage.setItem('task_game_coins', '0');
    localStorage.setItem('task_game_stars', '0');
    localStorage.setItem('user_coins', '0');
    localStorage.setItem('user_stars', '0');
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

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

// Storage Keys & Sync Channels
const TASKS_STORAGE_KEY = 'task_game_tasks';
const CLAIMS_STORAGE_KEY = 'task_game_claims';
const COMPLETED_TASKS_KEY = 'task_game_completed_tasks';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Initial default seed tasks with 6-digit verification codes
const DEFAULT_TASKS = [
  {
    id: 'task_sponsor_1',
    title: 'Visit Webtask Sponsor Page',
    link: 'https://telegram.org',
    verificationCode: '583921',
    code: '583921',
    icon: '🌐',
    reward: 5,
    rewardStars: 5,
    description: 'Open link, get the 6-digit code, and verify',
    active: true,
    createdAt: 1700000000000
  },
  {
    id: 'task_sponsor_2',
    title: 'Join Community Channel',
    link: 'https://t.me',
    verificationCode: '729401',
    code: '729401',
    icon: '✈️',
    reward: 5,
    rewardStars: 5,
    description: 'Open channel & enter 6-digit verification code',
    active: true,
    createdAt: 1700000000001
  },
  {
    id: 'task_sponsor_3',
    title: 'Explore Gaming Partner Arena',
    link: 'https://google.com',
    verificationCode: '314859',
    code: '314859',
    icon: '🎮',
    reward: 5,
    rewardStars: 5,
    description: 'Check out partner gaming hub and verify 6-digit code',
    active: true,
    createdAt: 1700000000002
  }
];

function getStoredTasks() {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(DEFAULT_TASKS));
    return DEFAULT_TASKS;
  } catch (e) {}
  return DEFAULT_TASKS;
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

// Dynamic Task Rendering with Open / Verify & Fixed 5 Star Reward
function renderTasks() {
  const container = document.getElementById('tasksList');
  if (!container) return;

  const tasks = getStoredTasks();
  const completedTasks = getStoredCompletedTasks();

  // "and fininshed task remove. new add automatically."
  // Filter out any task that is inactive OR already finished by user
  const activeTasks = tasks.filter(t => t.active !== false && !completedTasks[t.id]);

  if (activeTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-tasks-box">
        <div class="empty-tasks-icon">🎯</div>
        <div class="empty-tasks-text">All webtasks completed! Great job!</div>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.35rem;">New tasks added by admin will appear automatically.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = activeTasks.map(task => {
    const opened = isTaskOpened(task.id);

    // "first tab on claim to change a open than click open button link open than open button change to verify button"
    let btnHtml = '';
    if (opened) {
      btnHtml = `<button type="button" class="btn-claim btn-task-verify" onclick="openVerifyModal('${task.id}')">Verify</button>`;
    } else {
      btnHtml = `<button type="button" class="btn-claim btn-task-open" onclick="handleOpenTask('${task.id}')">Open</button>`;
    }

    return `
      <div class="task-card" id="taskCard_${task.id}">
        <div class="task-icon-wrap">${task.icon || '⚡'}</div>
        <div class="task-info">
          <div class="task-name-row">
            <span class="task-name">${escapeHtml(task.title)}</span>
            <span class="task-status-pill ready">⭐ 5 Stars</span>
          </div>
          <div class="task-desc-row">
            <span class="task-reward" style="color: #facc15; font-weight: 800;">+5 ⭐</span>
          </div>
        </div>
        <div class="task-action-wrap" id="action_${task.id}">
          ${btnHtml}
        </div>
      </div>
    `;
  }).join('');
}

// Open Button Click: opens link in new tab, changes button to Verify, opens modal
window.handleOpenTask = function(taskId) {
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // 1. Open task link in a new tab/window
  const targetLink = (task.link || task.url || '').trim();
  if (targetLink) {
    window.open(targetLink, '_blank');
  }

  // 2. Mark opened in storage
  setTaskOpened(taskId);

  // 3. Immediately change the button from "Open" to "Verify" on the UI
  const actionWrap = document.getElementById(`action_${taskId}`);
  if (actionWrap) {
    actionWrap.innerHTML = `<button type="button" class="btn-claim btn-task-verify" onclick="openVerifyModal('${taskId}')">Verify</button>`;
  }

  // 4. Open the verify modal automatically so user can enter the 6-digit code
  setTimeout(() => {
    openVerifyModal(taskId);
  }, 400);
};

let currentVerifyTaskId = null;

window.openVerifyModal = function(taskId) {
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  currentVerifyTaskId = taskId;

  const modal = document.getElementById('taskVerifyModalOverlay');
  const titleEl = document.getElementById('verifyModalTaskTitle');
  const descEl = document.getElementById('verifyModalTaskDesc');
  const iconEl = document.getElementById('verifyModalTaskIcon');
  const linkBtn = document.getElementById('verifyModalLinkBtn');
  const codeInput = document.getElementById('verifyCodeInput');
  const errorMsg = document.getElementById('verifyErrorMsg');

  if (titleEl) titleEl.textContent = task.title || 'Webtask Mission';
  if (descEl) descEl.textContent = 'Enter 6-digit verification code to win +5 ⭐';
  if (iconEl) iconEl.textContent = task.icon || '⚡';
  if (linkBtn) {
    const url = (task.link || task.url || '').trim();
    if (url) {
      linkBtn.href = url;
      linkBtn.style.display = 'inline-flex';
    } else {
      linkBtn.style.display = 'none';
    }
  }
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
  // Allow only digits
  input.value = input.value.replace(/[^0-9]/g, '');
  const errorMsg = document.getElementById('verifyErrorMsg');
  if (errorMsg) errorMsg.style.display = 'none';
  input.classList.remove('input-error');
};

// Verify button submit handler:
// "user code and verification are same than task compelted than win 5 star each task that fixed a reward . and fininshed task remove. new add automatically."
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

  // Validate 6-digit code:
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

  // Code matches! User wins 5 Stars fixed reward:
  userStars += 5;
  localStorage.setItem('task_game_stars', userStars.toString());
  localStorage.setItem('user_stars', userStars.toString());

  // Also track total completed tasks for wallet/leaderboard
  let completedCount = parseInt(localStorage.getItem('task_game_total_tasks_completed') || '0', 10) + 1;
  localStorage.setItem('task_game_total_tasks_completed', completedCount.toString());
  localStorage.setItem('completed_tasks_count', completedCount.toString());
  recordLeaderboardEventTask(completedCount);

  // Mark task completed so finished task is removed:
  markTaskCompleted(task.id);

  // Update coin & star display
  updateCoinDisplay();

  // Audio and floating animation
  HomeAudio.playCoinClaim();
  const submitBtn = document.getElementById('btnVerifyConfirm');
  if (submitBtn) showFloatingCoin(submitBtn, '+5 ⭐ Won!');

  // Close modal
  closeVerifyModal();

  // "fininshed task remove. new add automatically."
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
  let customEvt = null;
  try {
    const raw = localStorage.getItem('task_game_leaderboard_event');
    if (raw) customEvt = JSON.parse(raw);
  } catch (e) {}

  if (customEvt && customEvt.isManualOverride && now < customEvt.endTime && customEvt.status === 'active') {
    return customEvt;
  }

  // Universal Global 3-Month Season (Identical for ALL users worldwide: new, old, guest, logged-in)
  const elapsed = Math.max(0, now - GLOBAL_EPOCH_ANCHOR);
  const seasonIndex = Math.floor(elapsed / THREE_MONTHS_MS);
  const seasonNumber = seasonIndex + 1;
  const startTime = GLOBAL_EPOCH_ANCHOR + (seasonIndex * THREE_MONTHS_MS);
  const endTime = startTime + THREE_MONTHS_MS;

  const globalEvt = {
    id: `global_season_${seasonNumber}`,
    seasonNumber: seasonNumber,
    name: `Season ${seasonNumber}: 3-Month Championship (21,500 ⭐ Prize Pool)`,
    startTime: startTime,
    endTime: endTime,
    durationHours: THREE_MONTHS_HOURS,
    durationDays: 90,
    status: 'active',
    isGlobal: true
  };

  // Rollover check: If stored event is from an older season, reset task counters
  if (customEvt && customEvt.seasonNumber && customEvt.seasonNumber < seasonNumber) {
    localStorage.setItem('task_game_event_tasks_count', '0');
    try {
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

document.addEventListener('DOMContentLoaded', () => {
  updateCoinDisplay();
  renderTasks();

  // Start live countdown timer clock
  setInterval(updateLiveTimers, 1000);

  // Cybernetic Loading Screen Progression (Runs ONLY once per app session)
  const overlay = document.getElementById('appLoadingOverlay');
  const bar = document.getElementById('loadingProgressBar');
  const statusText = document.getElementById('loadingStatusText');
  const isAlreadyLoaded = sessionStorage.getItem('task_app_loaded') === 'true';

  if (isAlreadyLoaded) {
    if (overlay) overlay.remove();
  } else if (overlay && bar) {
    sessionStorage.setItem('task_app_loaded', 'true');
    let progress = 0;
    const steps = [
      { p: 25, msg: 'INITIALIZING SYSTEM...' },
      { p: 55, msg: 'CONNECTING SECURE VAULT...' },
      { p: 85, msg: 'SYNCHRONIZING REWARDS...' },
      { p: 100, msg: 'ARENA READY!' }
    ];
    let stepIdx = 0;

    const loadInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        progress = steps[stepIdx].p;
        bar.style.width = `${progress}%`;
        if (statusText) statusText.textContent = steps[stepIdx].msg;
        stepIdx++;
      } else {
        clearInterval(loadInterval);
        HomeAudio.playStartupChime();
        setTimeout(() => {
          overlay.classList.add('fade-out');
          setTimeout(() => overlay.remove(), 550);
        }, 300);
      }
    }, 220);
  }
});

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

// Expose on window for Firebase Cloud Sync and Admin Real-Time Connection
window.renderTasks = renderTasks;
window.getStoredTasks = getStoredTasks;
window.handleOpenTask = handleOpenTask;
window.openVerifyModal = openVerifyModal;
window.submitTaskVerification = submitTaskVerification;

