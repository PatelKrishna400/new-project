// Task Claiming Logic with Web Audio Synthesis & Dynamic Real-Time Admin Sync
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

// Storage Keys & Sync Channels
const TASKS_STORAGE_KEY = 'task_game_tasks';
const CLAIMS_STORAGE_KEY = 'task_game_claims';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Dynamic tasks managed strictly from Admin Panel (no hardcoded defaults)
const DEFAULT_TASKS = [];

function getStoredTasks() {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip out legacy hardcoded tasks if present & sanitize names to Webtask
        let modified = false;
        const filtered = parsed
          .filter(t => !['task_1', 'task_2', 'task_3', 'task_4', 'task_5'].includes(t.id))
          .map(t => {
            if (t.title && /daily\s*task/i.test(t.title)) {
              t.title = t.title.replace(/daily\s*task[s]?/gi, 'Webtask');
              modified = true;
            }
            if (t.description && /daily\s*task/i.test(t.description)) {
              t.description = t.description.replace(/daily\s*task[s]?/gi, 'webtask');
              modified = true;
            }
            return t;
          });
        if (filtered.length !== parsed.length || modified) {
          localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(filtered));
        }
        return filtered;
      }
    }
  } catch (e) {}
  return [];
}

function getStoredClaims() {
  try {
    const raw = localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (raw) {
      const claims = JSON.parse(raw);
      // Remove any lingering cooldown claims for legacy seed tasks
      ['task_1', 'task_2', 'task_3', 'task_4', 'task_5'].forEach(id => delete claims[id]);
      return claims;
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
  if (nameEl) nameEl.textContent = localStorage.getItem('player_username') || 'NovaEarner';

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

// Dynamic Task Rendering & Real-time Live Timer
function renderTasks() {
  const container = document.getElementById('tasksList');
  if (!container) return;

  const tasks = getStoredTasks();
  const claims = getStoredClaims();
  const activeTasks = tasks.filter(t => t.active !== false);

  if (activeTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-tasks-box">
        <div class="empty-tasks-icon">🎯</div>
        <div class="empty-tasks-text">No active webtasks right now. Check back soon!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = activeTasks.map(task => {
    const remaining = getTaskRemainingSeconds(task, claims);
    const isCoolingDown = remaining > 0;
    const isOneTimeClaimed = (Number(task.timerSeconds || 0) <= 0 && claims[task.id]);

    let btnHtml = '';
    if (isOneTimeClaimed) {
      btnHtml = `<button class="btn-claim" disabled>Claimed ✓</button>`;
    } else if (isCoolingDown) {
      btnHtml = `<button class="btn-claim btn-timer-cooling" data-task-id="${task.id}" disabled title="Resets in ${formatRemainingTime(remaining)}">⏳ ${formatRemainingTime(remaining)}</button>`;
    } else {
      btnHtml = `<button class="btn-claim" onclick="handleClaimTask('${task.id}', ${task.reward})">Claim</button>`;
    }

    return `
      <div class="task-card ${isCoolingDown ? 'cooling-down' : ''} ${isOneTimeClaimed ? 'completed' : ''}" id="taskCard_${task.id}">
        <div class="task-icon-wrap">${task.icon || '⚡'}</div>
        <div class="task-info">
          <div class="task-name-row">
            <span class="task-name">${escapeHtml(task.title)}</span>
            ${isCoolingDown 
              ? `<span class="task-status-pill cooling" id="pill_${task.id}">⏳ ${formatRemainingTime(remaining)}</span>` 
              : `<span class="task-status-pill ready">⏱️ ${formatDurationBadge(task.timerSeconds)}</span>`
            }
          </div>
          <div class="task-desc-row">
            <span class="task-reward">+${Number(task.reward).toLocaleString()} 🪙</span>
            ${task.description ? `<span class="task-desc-sep">•</span><span class="task-desc-text">${escapeHtml(task.description)}</span>` : ''}
          </div>
        </div>
        <div class="task-action-wrap" id="action_${task.id}">
          ${btnHtml}
        </div>
      </div>
    `;
  }).join('');
}

// Live 1-Second Timer Ticking
function updateLiveTimers() {
  const tasks = getStoredTasks();
  const claims = getStoredClaims();
  let needFullRerender = false;

  tasks.forEach(task => {
    if (task.active === false) return;
    const remaining = getTaskRemainingSeconds(task, claims);
    const btn = document.querySelector(`.btn-timer-cooling[data-task-id="${task.id}"]`);
    const pill = document.getElementById(`pill_${task.id}`);

    if (btn) {
      if (remaining > 0) {
        const timeStr = `⏳ ${formatRemainingTime(remaining)}`;
        btn.textContent = timeStr;
        if (pill) pill.textContent = timeStr;
      } else {
        needFullRerender = true;
      }
    }
  });

  if (needFullRerender) {
    renderTasks();
  }
}

// User Task Claim Handler
function handleClaimTask(taskId, reward) {
  const btn = event ? (event.target.closest('button') || event.target) : null;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const claims = getStoredClaims();
  const remaining = getTaskRemainingSeconds(task, claims);
  if (remaining > 0) return;

  // 1. If task has a target URL / link, open it in a new window/tab
  if (task.link && task.link.trim() !== '') {
    window.open(task.link, '_blank');
  }

  // 2. If task requires a verification code, verify it
  const requiredCode = (task.verificationCode || task.code || '').trim();
  if (requiredCode !== '') {
    const enteredCode = prompt(`🔑 Task Verification Required!\nEnter the verification code to claim +${Number(reward).toLocaleString()} coins for "${task.title}":`);
    if (enteredCode === null) {
      // User cancelled
      return;
    }
    if (enteredCode.trim() !== requiredCode) {
      alert(`❌ Invalid Verification Code! Please check the code and try again.`);
      return;
    }
  }

  // Add coins
  userCoins += Number(reward);
  localStorage.setItem('task_game_coins', userCoins.toString());

  // Track total tasks completed for wallet withdrawal & leaderboard eligibility (Min 100)
  let completedTasks = parseInt(localStorage.getItem('task_game_total_tasks_completed') || '0', 10) + 1;
  localStorage.setItem('task_game_total_tasks_completed', completedTasks.toString());

  // If Leaderboard Event is active, count this task towards the active event
  recordLeaderboardEventTask(completedTasks);

  updateCoinDisplay();

  // Audio & Float
  HomeAudio.playCoinClaim();
  if (btn) showFloatingCoin(btn, `+${Number(reward).toLocaleString()} 🪙`);

  // Save claim timestamp
  claims[taskId] = Date.now();
  saveClaims(claims);

  // Instantly transition into ticking live timer
  renderTasks();
}

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
      // 100-TASK QUALIFICATION LIMIT GATE:
      // User only plays/ranks in the Leaderboard after reaching 100 completed tasks ("100 limit after user play a lederboard")
      if (totalTasks >= 100) {
        let eventTasks = parseInt(localStorage.getItem('task_game_event_tasks_count') || '0', 10) + 1;
        localStorage.setItem('task_game_event_tasks_count', eventTasks.toString());

        // Synchronize in task_game_users
        try {
          const rawUsers = localStorage.getItem('task_game_users');
          if (rawUsers) {
            const users = JSON.parse(rawUsers);
            const myName = localStorage.getItem('player_username') || 'NovaEarner';
            const me = users.find(u => u.id === 'usr_1' || u.name === myName || u.name === 'NovaEarner');
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
      } else {
        // Player under 100 tasks: update totalTasks, eventTasks remains 0 until qualified
        try {
          const rawUsers = localStorage.getItem('task_game_users');
          if (rawUsers) {
            const users = JSON.parse(rawUsers);
            const myName = localStorage.getItem('player_username') || 'NovaEarner';
            const me = users.find(u => u.id === 'usr_1' || u.name === myName || u.name === 'NovaEarner');
            if (me) {
              me.totalTasks = totalTasks;
              localStorage.setItem('task_game_users', JSON.stringify(users));
            }
          }
        } catch (e) {}

        try {
          const bc = new BroadcastChannel('nova_task_sync');
          bc.postMessage({ type: 'TOTAL_TASK_COUNT', totalTasks: totalTasks });
          bc.close();
        } catch (e) {}
      }
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
window.handleClaimTask = handleClaimTask;

