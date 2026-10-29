/**
 * ==========================================================================
 * NOVA MISSION CONTROL — COMPLETE ADMIN PORTAL JAVASCRIPT
 * Authentication • 4-Page SPA Navigation • Tasks • Withdrawals • Users
 * ==========================================================================
 */

// Storage Keys
const TASKS_STORAGE_KEY = 'task_game_tasks';
const CLAIMS_STORAGE_KEY = 'task_game_claims';
const WITHDRAW_STORAGE_KEY = 'task_game_withdrawals';
const LEADERBOARD_SESSIONS_KEY = 'task_game_leaderboard_sessions';
const LEADERBOARD_EVENT_KEY = 'task_game_leaderboard_event';
const USERS_STORAGE_KEY = 'task_game_users';
const ACTIVITY_STORAGE_KEY = 'task_admin_activities';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Default Seed Tasks (Managed completely from Admin Panel Form)
const DEFAULT_TASKS = [];

// Clean zero start - No mock withdrawals or users
const DEFAULT_WITHDRAWALS = [];
const DEFAULT_USERS = [];

// State Variables
let tasksData = [];
let claimsData = {};
let withdrawalsData = [];
let usersData = [];
let sessionsData = [];
let adminEventTimerInterval = null;
let activityData = [];
let currentAdminPage = 'tasks';
let withdrawFilter = 'all';
let taskSearchFilter = '';
let withdrawSearchFilter = '';
let userSearchFilter = '';
let syncChannel = null;

// Initialize BroadcastChannel
try {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  syncChannel.onmessage = (event) => {
    loadAllStoredData();
    renderCurrentPage();
  };
} catch (e) {
  console.warn('BroadcastChannel not supported');
}

// ============================================================================
// 1. AUTHENTICATION & LOGIN FLOW
// ============================================================================

function checkAuthStatus() {
  const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
  const loginScreen = document.getElementById('adminLoginScreen');
  const dashboardView = document.getElementById('adminDashboardView');

  if (isAuth) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'flex';
    initDashboard();
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (dashboardView) dashboardView.style.display = 'none';
  }
}

function handleAdminLogin(event) {
  event.preventDefault();

  const userField = document.getElementById('adminUsernameInput');
  const passField = document.getElementById('adminPasswordInput');
  const errBox = document.getElementById('loginErrorMessage');

  const rawUser = userField ? userField.value.trim() : '';
  const rawPass = passField ? passField.value : '';

  const normalizedUser = rawUser.replace(/\s+/g, ' ');
  const compactUser = rawUser.replace(/\s+/g, '');

  const isUserValid = (normalizedUser === '400 @123' || compactUser === '400@123' || normalizedUser.toLowerCase() === 'admin');
  const isPassValid = (rawPass === '0911' || rawPass === 'admin123');

  if (isUserValid && isPassValid) {
    if (errBox) errBox.style.display = 'none';
    sessionStorage.setItem('admin_authenticated', 'true');

    // Smooth transition
    const loginScreen = document.getElementById('adminLoginScreen');
    const dashboardView = document.getElementById('adminDashboardView');

    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'flex';

    initDashboard();
    logActivity('Root Administrator logged into Mission Control.');
    showToast('Welcome, Administrator! Mission Control unlocked.', 'success');
  } else {
    if (errBox) {
      errBox.style.display = 'flex';
    }
    if (passField) {
      passField.value = '';
      passField.focus();
    }
  }
}

function quickFillCredentials() {
  const u = document.getElementById('adminUsernameInput');
  const p = document.getElementById('adminPasswordInput');
  if (u) u.value = '';
  if (p) p.value = '';
}

function handleAdminLogout() {
  if (confirm('Are you sure you want to log out of the admin console?')) {
    sessionStorage.removeItem('admin_authenticated');
    checkAuthStatus();
    showToast('Admin logged out. Console locked.', 'info');
  }
}

// ============================================================================
// 2. SPA NAVIGATION & PAGE SWITCHING
// ============================================================================

function switchAdminPage(pageKey) {
  currentAdminPage = pageKey;

  // Update Navigation Active Class (4 Tabs: tasks, users, withdraw, ads)
  const navItems = {
    tasks: document.getElementById('navItemTasks'),
    users: document.getElementById('navItemUsers'),
    withdraw: document.getElementById('navItemWithdraw'),
    ads: document.getElementById('navItemAds'),
    events: document.getElementById('navItemEvents')
  };

  Object.keys(navItems).forEach(key => {
    if (navItems[key]) {
      if (key === pageKey) navItems[key].classList.add('active');
      else navItems[key].classList.remove('active');
    }
  });

  // Update Breadcrumb
  const breadcrumb = document.getElementById('breadcrumbPageName');
  const names = {
    tasks: 'Tasks Management',
    users: 'All Users',
    withdraw: 'Wallet Requests',
    ads: 'Ads Manager',
    events: 'Events & Leaderboard Sessions'
  };
  if (breadcrumb) breadcrumb.textContent = names[pageKey] || 'Tasks';

  // Show Active Page Section
  const pages = {
    tasks: document.getElementById('pageSectionTasks'),
    users: document.getElementById('pageSectionUsers'),
    withdraw: document.getElementById('pageSectionWithdraw'),
    ads: document.getElementById('pageSectionAds'),
    events: document.getElementById('pageSectionEvents')
  };

  Object.keys(pages).forEach(key => {
    if (pages[key]) {
      if (key === pageKey) pages[key].classList.add('active');
      else pages[key].classList.remove('active');
    }
  });

  // Re-render data for current page
  renderCurrentPage();

  // Close sidebar on mobile
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar && window.innerWidth <= 860) {
    sidebar.classList.remove('open');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

function renderCurrentPage() {
  updateAllMetricsAndBadges();
  if (currentAdminPage === 'tasks') renderAdminTasks();
  else if (currentAdminPage === 'users') renderUsersTable();
  else if (currentAdminPage === 'withdraw') renderWithdrawalsTable();
  else if (currentAdminPage === 'ads') renderAdsConfigPage();
  else if (currentAdminPage === 'events') renderEventsAndSessionsPage();
}

// ============================================================================
// 3. DATA PERSISTENCE & SYNC
// ============================================================================

function loadAllStoredData() {
  // Leaderboard Sessions History Store
  try {
    const rawSessions = localStorage.getItem(LEADERBOARD_SESSIONS_KEY);
    sessionsData = rawSessions ? JSON.parse(rawSessions) : [];
    if (!Array.isArray(sessionsData)) sessionsData = [];
  } catch (e) {
    sessionsData = [];
  }

  // Tasks
  try {
    const rawTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    let parsed = rawTasks ? JSON.parse(rawTasks) : [];
    if (Array.isArray(parsed)) {
      // Filter out legacy hardcoded seed tasks
      parsed = parsed.filter(t => !['task_1', 'task_2', 'task_3', 'task_4', 'task_5'].includes(t.id));
    } else {
      parsed = [];
    }
    tasksData = parsed;
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
  } catch (e) {
    tasksData = [];
  }

  // Claims
  try {
    const rawClaims = localStorage.getItem(CLAIMS_STORAGE_KEY);
    claimsData = rawClaims ? JSON.parse(rawClaims) : {};
  } catch (e) {
    claimsData = {};
  }

  // Withdrawals (Clean zero start, no mock records)
  try {
    const rawWd = localStorage.getItem(WITHDRAW_STORAGE_KEY);
    let parsedWd = rawWd ? JSON.parse(rawWd) : [];
    if (!Array.isArray(parsedWd)) parsedWd = [];
    withdrawalsData = parsedWd.filter(w => w && !['WD-8491', 'WD-8490', 'WD-8489', 'WD-8488'].includes(w.id));
    localStorage.setItem(WITHDRAW_STORAGE_KEY, JSON.stringify(withdrawalsData));
  } catch (e) {
    withdrawalsData = [];
  }

  // Users (Clean zero start, no mock pool)
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    let parsedUsers = rawUsers ? JSON.parse(rawUsers) : [];
    if (!Array.isArray(parsedUsers)) parsedUsers = [];

    // Filter out mock users
    parsedUsers = parsedUsers.filter(u => u && !['usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6', 'usr_7', 'usr_8', 'usr_9', 'usr_10', 'usr_11', 'usr_12', 'usr_13', 'usr_14', 'usr_15', 'usr_16', 'usr_17', 'usr_18', 'usr_19', 'usr_20', 'usr_21'].includes(u.id) && u.name !== 'VortexTyper' && u.name !== 'CyberKey' && u.name !== 'ShadowTyper' && u.name !== 'Alex_Gamer' && u.name !== 'NeonBlaze' && u.name !== 'Phoenix99' && u.name !== 'QuantumCoder' && u.name !== 'StarHunter' && u.name !== 'HyperStrike' && u.name !== 'VortexPilot' && u.name !== 'LunaBlade');

    // Sync current player coins to usr_1
    const playerCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
    const playerStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
    const playerName = localStorage.getItem('player_username') || 'Player';
    const playerAvatar = localStorage.getItem('player_avatar') || '⚡';

    let primaryUser = parsedUsers.find(u => u.id === 'usr_1' || u.name === playerName);
    if (!primaryUser) {
      primaryUser = {
        id: 'usr_1',
        name: playerName,
        avatar: playerAvatar,
        level: 'LVL 1 • NOVICE',
        coins: playerCoins,
        stars: playerStars,
        totalTasks: 0,
        eventTasks: 0,
        status: 'active',
        joined: 'Today'
      };
      parsedUsers.unshift(primaryUser);
    } else {
      primaryUser.name = playerName;
      primaryUser.avatar = playerAvatar;
      primaryUser.coins = playerCoins;
      primaryUser.stars = playerStars;
    }
    usersData = parsedUsers;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersData));
  } catch (e) {
    usersData = [];
  }

  // Activity Logs
  try {
    const rawAct = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    activityData = rawAct ? JSON.parse(rawAct) : [
      { text: "System initialized and ready.", time: "Just now" }
    ];
  } catch (e) {
    activityData = [];
  }
}

function saveTasksAndSync(notifyMessage) {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

  if (syncChannel) {
    syncChannel.postMessage({ type: 'TASKS_UPDATED', timestamp: Date.now() });
  }

  // Cloud Firebase Sync
  if (window.Firebase && typeof window.Firebase.saveTasksToCloud === 'function') {
    window.Firebase.saveTasksToCloud(tasksData);
  } else if (typeof window.saveTasksToCloud === 'function') {
    window.saveTasksToCloud(tasksData);
  }

  renderCurrentPage();
  if (notifyMessage) showToast(notifyMessage, 'success');
}

function saveClaimsAndSync() {
  localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claimsData));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

  if (syncChannel) {
    syncChannel.postMessage({ type: 'CLAIMS_UPDATED', timestamp: Date.now() });
  }

  renderCurrentPage();
}

function saveWithdrawalsAndSync() {
  localStorage.setItem(WITHDRAW_STORAGE_KEY, JSON.stringify(withdrawalsData));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

  if (syncChannel) {
    syncChannel.postMessage({ type: 'WITHDRAWALS_UPDATED', timestamp: Date.now() });
  }

  renderCurrentPage();
}

function saveUsersAndSync() {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersData));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

  renderCurrentPage();
}

function logActivity(text) {
  const item = {
    text: text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  activityData.unshift(item);
  if (activityData.length > 25) activityData.pop();
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activityData));
  } catch (e) {}
  if (currentAdminPage === 'home') renderHomePage();
}

function clearActivityLogs() {
  activityData = [];
  localStorage.removeItem(ACTIVITY_STORAGE_KEY);
  renderHomePage();
  showToast('Activity logs cleared.', 'info');
}

// ============================================================================
// 4. METRICS & COUNTERS
// ============================================================================

function updateAllMetricsAndBadges() {
  const totalTasks = tasksData.length;
  const activeTasks = tasksData.filter(t => t.active !== false).length;
  const pendingWd = withdrawalsData.filter(w => w.status === 'pending');
  const pendingWdCount = pendingWd.length;
  const pendingWdSum = pendingWd.reduce((acc, w) => acc + Number(w.amount || 0), 0);
  const totalUsers = usersData.length;
  const playerCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

  // Sidebar counters
  const navTasks = document.getElementById('navTasksCounter');
  const navWd = document.getElementById('navPendingWithdrawCounter');
  const navUsers = document.getElementById('navUsersCounter');

  if (navTasks) navTasks.textContent = totalTasks.toString();
  if (navWd) {
    navWd.textContent = pendingWdCount.toString();
    navWd.style.display = pendingWdCount > 0 ? 'inline-block' : 'none';
  }
  if (navUsers) navUsers.textContent = totalUsers.toString();

  // Home metrics
  const hLiveTasks = document.getElementById('homeHeroLiveTasks');
  const hTotTasks = document.getElementById('homeMetricTotalTasks');
  const hActTasks = document.getElementById('homeMetricActiveTasks');
  const hPendWd = document.getElementById('homeMetricPendingWd');
  const hPendWdSum = document.getElementById('homeMetricPendingWdAmount');
  const hTotUsers = document.getElementById('homeMetricTotalUsers');
  const hPlayerCoins = document.getElementById('homeMetricPlayerCoins');

  if (hLiveTasks) hLiveTasks.textContent = activeTasks.toString();
  if (hTotTasks) hTotTasks.textContent = totalTasks.toString();
  if (hActTasks) hActTasks.textContent = `${activeTasks} Active on Player Screen`;
  if (hPendWd) hPendWd.textContent = pendingWdCount.toString();
  if (hPendWdSum) hPendWdSum.textContent = `₹${pendingWdSum.toLocaleString()} Pending Review`;
  if (hTotUsers) hTotUsers.textContent = totalUsers.toString();
  if (hPlayerCoins) hPlayerCoins.textContent = `${playerCoins.toLocaleString()} 🪙`;

  // Tasks section pill
  const tCounter = document.getElementById('tasksCounterPill');
  if (tCounter) tCounter.textContent = `${totalTasks} Mission${totalTasks === 1 ? '' : 's'}`;

  // Withdraw section stats
  const wPend = document.getElementById('wdStatPending');
  const wApp = document.getElementById('wdStatApproved');
  const wRej = document.getElementById('wdStatRejected');
  const wSum = document.getElementById('wdStatTotalSum');
  const countAll = document.getElementById('countWdAll');
  const countPending = document.getElementById('countWdPending');
  const countApproved = document.getElementById('countWdApproved');
  const countRejected = document.getElementById('countWdRejected');
  const wdTableCnt = document.getElementById('wdTableCounter');

  const appWd = withdrawalsData.filter(w => w.status === 'approved');
  const rejWd = withdrawalsData.filter(w => w.status === 'rejected');
  const totalWdSum = appWd.reduce((acc, w) => acc + Number(w.amount || 0), 0);

  if (wPend) wPend.textContent = pendingWdCount.toString();
  if (wApp) wApp.textContent = appWd.length.toString();
  if (wRej) wRej.textContent = rejWd.length.toString();
  if (wSum) wSum.textContent = `₹${totalWdSum.toLocaleString()}`;

  if (countAll) countAll.textContent = withdrawalsData.length.toString();
  if (countPending) countPending.textContent = pendingWdCount.toString();
  if (countApproved) countApproved.textContent = appWd.length.toString();
  if (countRejected) countRejected.textContent = rejWd.length.toString();
  if (wdTableCnt) wdTableCnt.textContent = `${withdrawalsData.length} Requests`;

  // Users section stats
  const uTot = document.getElementById('userStatTotal');
  const uAct = document.getElementById('userStatActive');
  const uSusp = document.getElementById('userStatSuspended');
  const uCoins = document.getElementById('userStatCoinsSum');
  const uTableCnt = document.getElementById('usersTableCounter');

  const actUsers = usersData.filter(u => u.status !== 'suspended');
  const suspUsers = usersData.filter(u => u.status === 'suspended');
  const sumCoins = usersData.reduce((acc, u) => acc + Number(u.coins || 0), 0);

  if (uTot) uTot.textContent = totalUsers.toString();
  if (uAct) uAct.textContent = actUsers.length.toString();
  if (uSusp) uSusp.textContent = suspUsers.length.toString();
  if (uCoins) uCoins.textContent = `${sumCoins.toLocaleString()} 🪙`;
  if (uTableCnt) uTableCnt.textContent = `${totalUsers} Players`;
}

// ============================================================================
// 5. PAGE 1: HOME PAGE LOGIC
// ============================================================================

function renderHomePage() {
  const container = document.getElementById('activityFeedList');
  if (!container) return;

  if (activityData.length === 0) {
    container.innerHTML = `<div style="color: #64748b; font-size: 0.8rem; padding: 0.5rem 0;">No activity recorded yet.</div>`;
    return;
  }

  container.innerHTML = activityData.map(item => `
    <div class="activity-item">
      <span class="activity-text">${escapeHtml(item.text)}</span>
      <span class="activity-time">${escapeHtml(item.time)}</span>
    </div>
  `).join('');
}

// ============================================================================
// 6. WEBTASK MANAGEMENT LOGIC
// ============================================================================

function getTaskRemainingSeconds(task) {
  const timerSec = Number(task.timerSeconds || 0);
  if (timerSec <= 0) return claimsData[task.id] ? -999 : 0;
  const claimedAt = claimsData[task.id];
  if (!claimedAt) return 0;
  const elapsed = Math.floor((Date.now() - claimedAt) / 1000);
  const remaining = timerSec - elapsed;
  return remaining > 0 ? remaining : 0;
}

function formatRemainingTime(seconds) {
  if (seconds <= 0) return 'Ready to Claim';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
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

function renderAdminTasks() {
  const container = document.getElementById('adminTasksList');
  if (!container) return;

  const filtered = tasksData.filter(t => {
    if (!taskSearchFilter) return true;
    const term = taskSearchFilter.toLowerCase();
    return (t.title && t.title.toLowerCase().includes(term)) || 
           (t.description && t.description.toLowerCase().includes(term));
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="background: rgba(10, 23, 56, 0.4); border: 1.5px dashed rgba(56, 189, 248, 0.25); border-radius: 18px; padding: 3rem 1.5rem; text-align: center; color: #94a3b8;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎯</div>
        <div style="font-weight: 800; color: #ffffff; font-size: 1.1rem;">No Missions Found</div>
        <p style="font-size: 0.85rem; margin-top: 0.3rem;">Click "+ Add New Mission" to create tasks or click "Restore Defaults".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((task, index) => {
    const isActive = task.active !== false;
    const remaining = getTaskRemainingSeconds(task);
    const isCoolingDown = remaining > 0;
    const isOneTimeClaimed = (Number(task.timerSeconds || 0) <= 0 && claimsData[task.id]);

    let timerBadgeText = isOneTimeClaimed ? 'Claimed (One-time)' : (isCoolingDown ? `⏳ ${formatRemainingTime(remaining)}` : formatDurationBadge(task.timerSeconds));

    return `
      <div class="admin-task-card ${isActive ? '' : 'inactive'}" id="adminCard_${task.id}">
        <div class="task-card-main-row">
          <div class="task-left-meta">
            <div class="task-icon-avatar">${task.icon || '⚡'}</div>
            <div class="task-details">
              <div class="task-title-group">
                <span class="task-heading">${escapeHtml(task.title)}</span>
                <span class="badge-tag ${isActive ? 'badge-active' : 'badge-inactive'}">${isActive ? 'ACTIVE' : 'HIDDEN'}</span>
                <span class="badge-tag badge-timer ${isCoolingDown ? 'cooling' : ''}" id="adminTimerBadge_${task.id}">${timerBadgeText}</span>
              </div>
              <div class="task-meta-sub">
                <span class="task-bounty-val" style="color: #facc15; font-weight: 800;">+5 ⭐ (Fixed Reward)</span>
                ${task.link ? `<a href="${escapeHtml(task.link)}" target="_blank" class="task-link-badge" title="Open task link">🔗 ${escapeHtml(task.link.length > 28 ? task.link.substring(0, 28) + '...' : task.link)} ↗</a>` : ''}
                ${(task.verificationCode || task.code) ? `<span class="task-code-badge" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; padding: 2px 7px; border-radius: 6px; font-weight: 800;" title="6-Digit Verification Code">🔑 6-Digit Code: <code style="color: #facc15; font-size: 0.95rem;">${escapeHtml(task.verificationCode || task.code)}</code></span>` : ''}
                ${task.description ? `<span class="task-desc-sub">• ${escapeHtml(task.description)}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="task-right-controls">
            <button class="btn-ctrl btn-ctrl-edit" onclick="openEditModal('${task.id}')" title="Edit mission">✏️ Edit</button>
            <button class="btn-ctrl btn-ctrl-toggle ${isActive ? '' : 'is-inactive'}" onclick="toggleTaskActive('${task.id}')">
              ${isActive ? '👁️ Visible' : '🙈 Hidden'}
            </button>
            <button class="btn-ctrl" onclick="moveTask('${task.id}', -1)" title="Move up" ${index === 0 ? 'disabled style="opacity:0.3;cursor:default"' : ''}>▲</button>
            <button class="btn-ctrl" onclick="moveTask('${task.id}', 1)" title="Move down" ${index === filtered.length - 1 ? 'disabled style="opacity:0.3;cursor:default"' : ''}>▼</button>
            <button class="btn-ctrl" onclick="resetSingleTaskCooldown('${task.id}')" title="Reset cooldown">⏱️ Reset</button>
            <button class="btn-ctrl btn-ctrl-delete" onclick="deleteTask('${task.id}')" title="Delete">🗑️</button>
          </div>
        </div>

        <div class="task-live-preview-box">
          <span class="preview-pill-tag">Player Live Screen Simulation</span>
          <div class="live-countdown-display" id="adminSimDisplay_${task.id}">
            ${isCoolingDown ? `⏳ Cooldown Active: ${formatRemainingTime(remaining)}` : (isOneTimeClaimed ? '✓ Claimed (Disabled)' : '● Ready to Claim (+ Coins)')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateAdminLiveTimers() {
  tasksData.forEach(task => {
    const remaining = getTaskRemainingSeconds(task);
    const badge = document.getElementById(`adminTimerBadge_${task.id}`);
    const sim = document.getElementById(`adminSimDisplay_${task.id}`);
    const isOneTimeClaimed = (Number(task.timerSeconds || 0) <= 0 && claimsData[task.id]);

    if (badge && sim) {
      if (isOneTimeClaimed) {
        badge.textContent = 'Claimed (One-time)';
        badge.classList.remove('cooling');
        sim.textContent = '✓ Claimed (Disabled)';
      } else if (remaining > 0) {
        badge.textContent = `⏳ ${formatRemainingTime(remaining)}`;
        badge.classList.add('cooling');
        sim.textContent = `⏳ Cooldown Active: ${formatRemainingTime(remaining)}`;
      } else {
        badge.textContent = formatDurationBadge(task.timerSeconds);
        badge.classList.remove('cooling');
        sim.textContent = '● Ready to Claim (+ Coins)';
      }
    }
  });
}

window.generateRandom6DigitCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const el = document.getElementById('taskCodeInput');
  if (el) {
    el.value = code;
    updateModalPreview();
  }
  return code;
};


// Switch Task Creation Mode in Admin Dashboard (Single vs Bulk Multiple Tasks)
function switchAdminModalTaskMode(mode) {
  const modeInput = document.getElementById('adminTaskCreationMode');
  if (modeInput) modeInput.value = mode;

  const btnSingle = document.getElementById('adminTabModeSingle');
  const btnBulk = document.getElementById('adminTabModeBulk');
  const singleLink = document.getElementById('adminSingleLinkGroup');
  const bulkLink = document.getElementById('adminBulkLinksGroup');
  const singleCode = document.getElementById('adminSingleCodeGroup');
  const bulkCode = document.getElementById('adminBulkCodesGroup');
  const bulkTitleOpt = document.getElementById('adminBulkTitleOptions');
  const bulkSummary = document.getElementById('adminBulkSummaryBox');
  const previewBox = document.querySelector('.modal-preview-box');
  const submitBtn = document.querySelector('#taskForm .btn-modal-save');

  if (mode === 'bulk') {
    if (btnSingle) btnSingle.classList.remove('active');
    if (btnBulk) btnBulk.classList.add('active');
    if (singleLink) singleLink.style.display = 'none';
    if (bulkLink) bulkLink.style.display = 'block';
    if (singleCode) singleCode.style.display = 'none';
    if (bulkCode) bulkCode.style.display = 'block';
    if (bulkTitleOpt) bulkTitleOpt.style.display = 'block';
    if (bulkSummary) bulkSummary.style.display = 'block';
    if (previewBox) previewBox.style.display = 'none';
    updateAdminModalBulkCounter();
  } else {
    if (btnSingle) btnSingle.classList.add('active');
    if (btnBulk) btnBulk.classList.remove('active');
    if (singleLink) singleLink.style.display = 'block';
    if (bulkLink) bulkLink.style.display = 'none';
    if (singleCode) singleCode.style.display = 'block';
    if (bulkCode) bulkCode.style.display = 'none';
    if (bulkTitleOpt) bulkTitleOpt.style.display = 'none';
    if (bulkSummary) bulkSummary.style.display = 'none';
    if (previewBox) previewBox.style.display = 'block';
    if (submitBtn) submitBtn.innerHTML = 'Submit Task 🚀';
    updateModalPreview();
  }
}
window.switchAdminModalTaskMode = switchAdminModalTaskMode;

function updateAdminModalBulkCounter() {
  const mode = document.getElementById('adminTaskCreationMode')?.value || 'single';
  if (mode !== 'bulk') return;

  const rawUrls = document.getElementById('adminBulkUrlsInput')?.value || '';
  const urls = rawUrls.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  const rawCodes = document.getElementById('adminBulkCodesInput')?.value || '';
  const codes = rawCodes.split(/\r?\n/).map(c => c.trim()).filter(c => c.length > 0);

  const linksBadge = document.getElementById('adminBulkLinksCountBadge');
  if (linksBadge) linksBadge.textContent = `${urls.length} Link${urls.length === 1 ? '' : 's'}`;

  const codesBadge = document.getElementById('adminBulkCodesCountBadge');
  if (codesBadge) codesBadge.textContent = `${codes.length} Code${codes.length === 1 ? '' : 's'}`;

  const sumTitle = document.getElementById('adminBulkSummaryTitle');
  if (sumTitle) {
    sumTitle.textContent = urls.length > 0 
      ? `Ready to create ${urls.length} task${urls.length === 1 ? '' : 's'} at once!` 
      : 'Ready to create 0 tasks';
  }

  const sumDetails = document.getElementById('adminBulkSummaryDetails');
  if (sumDetails) {
    if (urls.length === 0) {
      sumDetails.textContent = 'Paste links (one per line) and matching codes above to batch create tasks in one click.';
    } else if (codes.length < urls.length) {
      sumDetails.textContent = `Notice: ${urls.length - codes.length} code(s) missing — random 6-digit codes will be auto-generated for missing ones upon saving!`;
    } else {
      sumDetails.textContent = `Each task will be created with its corresponding link and 6-digit verification code (+5 ⭐ reward, timer wait).`;
    }
  }

  const submitBtn = document.querySelector('#taskForm .btn-modal-save');
  if (submitBtn) {
    submitBtn.innerHTML = urls.length > 1 ? `Create ${urls.length} Tasks 🚀` : 'Submit Task 🚀';
  }
}
window.updateAdminModalBulkCounter = updateAdminModalBulkCounter;

function autoGenerateAdminBulkCodes() {
  const rawUrls = document.getElementById('adminBulkUrlsInput')?.value || '';
  const urls = rawUrls.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const count = Math.max(urls.length, 10);
  const generated = [];
  for (let i = 0; i < count; i++) {
    generated.push(Math.floor(100000 + Math.random() * 900000).toString());
  }
  const codesArea = document.getElementById('adminBulkCodesInput');
  if (codesArea) {
    codesArea.value = generated.join('\n');
    updateAdminModalBulkCounter();
    showToast(`🎲 Generated ${count} unique 6-digit codes!`, 'info');
  }
}
window.autoGenerateAdminBulkCodes = autoGenerateAdminBulkCodes;

function openCreateModal() {
  document.getElementById('editTaskId').value = '';
  document.getElementById('modalTitleText').textContent = 'Add New Task';
  document.getElementById('taskTitleInput').value = '';
  const linkEl = document.getElementById('taskLinkInput');
  if (linkEl) linkEl.value = '';
  const codeEl = document.getElementById('taskCodeInput');
  if (codeEl) codeEl.value = Math.floor(100000 + Math.random() * 900000).toString();
  const bulkUrls = document.getElementById('adminBulkUrlsInput');
  if (bulkUrls) bulkUrls.value = '';
  const bulkCodes = document.getElementById('adminBulkCodesInput');
  if (bulkCodes) bulkCodes.value = '';
  const tabs = document.getElementById('adminModalModeTabs');
  if (tabs) tabs.style.display = 'flex';

  document.getElementById('taskIconInput').value = '⚡';
  document.getElementById('taskRewardInput').value = '+5 ⭐ (Fixed Reward)';
  document.getElementById('taskTimerPreset').value = '0';
  document.getElementById('customSecondsWrap').style.display = 'none';
  document.getElementById('customSecondsInput').value = '';
  document.getElementById('taskDescInput').value = '';
  document.getElementById('taskActiveToggle').checked = true;

  switchAdminModalTaskMode('single');
  updateModalPreview();
  const modal = document.getElementById('taskModalOverlay');
  if (modal) modal.classList.add('active');
  setTimeout(() => {
    const titleEl = document.getElementById('taskTitleInput');
    if (titleEl) titleEl.focus();
  }, 100);
}

function openEditModal(taskId) {
  const task = tasksData.find(t => t.id === taskId);
  if (!task) return;

  const tabs = document.getElementById('adminModalModeTabs');
  if (tabs) tabs.style.display = 'none';
  switchAdminModalTaskMode('single');

  document.getElementById('editTaskId').value = task.id;
  document.getElementById('modalTitleText').textContent = `Edit Task: ${task.title}`;
  document.getElementById('taskTitleInput').value = task.title || '';
  const linkEl = document.getElementById('taskLinkInput');
  if (linkEl) linkEl.value = task.link || task.url || '';
  const codeEl = document.getElementById('taskCodeInput');
  if (codeEl) codeEl.value = task.verificationCode || task.code || task.secretCode || '';
  document.getElementById('taskIconInput').value = task.icon || '⚡';
  document.getElementById('taskRewardInput').value = '+5 ⭐ (Fixed Reward)';

  const timerSec = task.timerSeconds !== undefined ? task.timerSeconds : (task.timer || 0);
  const presetEl = document.getElementById('taskTimerPreset');
  const customWrap = document.getElementById('customSecondsWrap');
  const customInput = document.getElementById('customSecondsInput');

  const presetValues = ['0', '86400', '43200', '21600', '3600', '900', '60'];
  if (presetValues.includes(timerSec.toString())) {
    presetEl.value = timerSec.toString();
    customWrap.style.display = 'none';
  } else {
    presetEl.value = 'custom';
    customWrap.style.display = 'block';
    customInput.value = timerSec;
  }

  document.getElementById('taskDescInput').value = task.description || '';
  document.getElementById('taskActiveToggle').checked = task.active !== false;

  updateModalPreview();
  const modal = document.getElementById('taskModalOverlay');
  if (modal) modal.classList.add('active');
}

function closeTaskModal() {
  const modal = document.getElementById('taskModalOverlay');
  if (modal) modal.classList.remove('active');
}


function handleTimerPresetChange(val) {
  const customWrap = document.getElementById('customSecondsWrap');
  if (val === 'custom') {
    customWrap.style.display = 'block';
    document.getElementById('customSecondsInput').focus();
  } else {
    customWrap.style.display = 'none';
  }
  updateModalPreview();
}

function selectEmoji(emoji) {
  document.getElementById('taskIconInput').value = emoji;
  updateModalPreview();
}

function updateModalPreview() {
  const title = document.getElementById('taskTitleInput').value.trim() || 'Untitled Task';
  const icon = document.getElementById('taskIconInput').value.trim() || '⚡';
  const reward = document.getElementById('taskRewardInput').value || '0';
  const desc = document.getElementById('taskDescInput').value.trim() || 'Complete task to earn bounty';
  const preset = document.getElementById('taskTimerPreset').value;
  let timerSeconds = 0;

  if (preset === 'custom') {
    timerSeconds = parseInt(document.getElementById('customSecondsInput').value || '60', 10);
  } else {
    timerSeconds = parseInt(preset, 10);
  }

  const pIcon = document.getElementById('previewIcon');
  const pTitle = document.getElementById('previewTitle');
  const pReward = document.getElementById('previewReward');
  const pDesc = document.getElementById('previewDesc');
  const pBadge = document.getElementById('previewDurationPill');
  const modalBadge = document.getElementById('modalIconBadge');

  if (pIcon) pIcon.textContent = icon;
  if (modalBadge) modalBadge.textContent = icon;
  if (pTitle) pTitle.textContent = title;
  if (pReward) pReward.textContent = `+${Number(reward).toLocaleString()} 🪙`;
  if (pDesc) pDesc.textContent = desc;
  if (pBadge) pBadge.textContent = `⏱️ ${formatDurationBadge(timerSeconds)}`;
}

function handleSaveTask(event) {
  if (event && event.preventDefault) event.preventDefault();

  const editId = (document.getElementById('editTaskId').value || '').trim();
  const mode = (document.getElementById('adminTaskCreationMode')?.value || 'single').trim();
  const title = (document.getElementById('taskTitleInput').value || '').trim();
  if (!title) {
    showToast('Task title is required!', 'warning');
    return;
  }

  const icon = (document.getElementById('taskIconInput').value || '').trim() || '⚡';
  const desc = (document.getElementById('taskDescInput').value || '').trim();
  const active = document.getElementById('taskActiveToggle').checked;
  const preset = document.getElementById('taskTimerPreset').value;

  let timerSeconds = 0;
  if (preset === 'custom') {
    timerSeconds = Math.max(1, parseInt(document.getElementById('customSecondsInput').value, 10) || 60);
  } else {
    timerSeconds = parseInt(preset, 10);
  }

  const now = Date.now();

  // 1. EDIT EXISTING TASK
  if (editId) {
    const linkEl = document.getElementById('taskLinkInput');
    let link = linkEl ? linkEl.value.trim() : '';
    if (link && !/^https?:\/\//i.test(link)) {
      link = 'https://' + link;
    }

    const codeEl = document.getElementById('taskCodeInput');
    let verificationCode = (codeEl ? codeEl.value : '').trim();
    if (!verificationCode || verificationCode.length < 4) {
      verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const taskIdx = tasksData.findIndex(t => t.id === editId);
    if (taskIdx !== -1) {
      tasksData[taskIdx] = {
        ...tasksData[taskIdx],
        title,
        link,
        url: link,
        verificationCode,
        code: verificationCode,
        secretCode: verificationCode,
        icon,
        reward: 5,
        rewardStars: 5,
        stars: 5,
        description: desc,
        timerSeconds,
        timer: timerSeconds,
        active,
        updatedAt: now
      };

      try {
        const completedRaw = localStorage.getItem('task_game_completed_tasks');
        if (completedRaw) {
          const compObj = JSON.parse(completedRaw);
          delete compObj[editId];
          localStorage.setItem('task_game_completed_tasks', JSON.stringify(compObj));
        }
        localStorage.removeItem('task_opened_' + editId);
      } catch(e) {}

      saveTasksAndSync(`✓ Task "${title}" updated! Pushed to players.`);
      logActivity(`Admin updated task: "${title}" (Link: ${link}, 6-Digit Code: ${verificationCode}, +5 ⭐)`);
    }
    closeTaskModal();
    return;
  }

  // 2. BULK / MULTIPLE TASKS CREATION (e.g. 10 links + 10 codes)
  if (mode === 'bulk') {
    const rawUrls = document.getElementById('adminBulkUrlsInput')?.value || '';
    const urls = rawUrls.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (urls.length === 0) {
      showToast('Please enter at least one URL link in the links box.', 'warning');
      return;
    }

    const rawCodes = document.getElementById('adminBulkCodesInput')?.value || '';
    const codes = rawCodes.split(/\r?\n/).map(c => c.trim()).filter(c => c.length > 0);
    const autoNumber = document.getElementById('adminAutoNumberCheckbox')?.checked !== false;

    for (let i = 0; i < urls.length; i++) {
      let url = urls[i];
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const code = (codes[i] && codes[i].length >= 4) ? codes[i] : Math.floor(100000 + Math.random() * 900000).toString();
      const taskTitle = (urls.length > 1 && autoNumber) ? `${title} #${i + 1}` : title;
      const newId = `task_${now}_${i}_${Math.random().toString(36).substring(2, 7)}`;

      const newTask = {
        id: newId,
        title: taskTitle,
        link: url,
        url: url,
        verificationCode: code,
        code: code,
        secretCode: code,
        icon,
        reward: 5,
        rewardStars: 5,
        stars: 5,
        description: desc || 'Open link & verify 6-digit code',
        timerSeconds,
        timer: timerSeconds,
        active,
        createdAt: now + i,
        updatedAt: now
      };
      tasksData.unshift(newTask);
    }

    saveTasksAndSync(`🎉 ${urls.length} New tasks created in bulk! Pushed to all players.`);
    logActivity(`Admin created ${urls.length} tasks in bulk under "${title}"`);
    closeTaskModal();
    return;
  }

  // 3. SINGLE TASK CREATION
  const linkEl = document.getElementById('taskLinkInput');
  let link = linkEl ? linkEl.value.trim() : '';
  if (link && !/^https?:\/\//i.test(link)) {
    link = 'https://' + link;
  }

  const codeEl = document.getElementById('taskCodeInput');
  let verificationCode = (codeEl ? codeEl.value : '').trim();
  if (!verificationCode || verificationCode.length < 4) {
    verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  }

  const newId = `task_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const newTask = {
    id: newId,
    title,
    link,
    url: link,
    verificationCode,
    code: verificationCode,
    secretCode: verificationCode,
    icon,
    reward: 5,
    rewardStars: 5,
    stars: 5,
    description: desc,
    timerSeconds,
    timer: timerSeconds,
    active,
    createdAt: now,
    updatedAt: now
  };
  tasksData.unshift(newTask);
  saveTasksAndSync(`✓ New task "${title}" created!`);
  logActivity(`Admin created new task: "${title}" (Link: ${link}, 6-Digit Code: ${verificationCode}, +5 ⭐)`);
  closeTaskModal();
}

function toggleTaskActive(taskId) {
  const task = tasksData.find(t => t.id === taskId);
  if (!task) return;
  task.active = (task.active === false);
  const statusStr = task.active ? 'visible' : 'hidden';
  saveTasksAndSync(`Mission "${task.title}" is now ${statusStr}.`);
  logActivity(`Admin toggled mission "${task.title}" to ${statusStr}.`);
}

function deleteTask(taskId) {
  const task = tasksData.find(t => t.id === taskId);
  if (!task) return;

  if (confirm(`Delete the mission "${task.title}"? This removes it immediately from player screens.`)) {
    tasksData = tasksData.filter(t => t.id !== taskId);
    saveTasksAndSync(`🗑️ Mission "${task.title}" removed!`);
    logActivity(`Admin deleted mission: "${task.title}".`);
  }
}

function moveTask(taskId, direction) {
  const idx = tasksData.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= tasksData.length) return;

  const temp = tasksData[idx];
  tasksData[idx] = tasksData[targetIdx];
  tasksData[targetIdx] = temp;
  saveTasksAndSync('Missions reordered!');
}

function resetSingleTaskCooldown(taskId) {
  const task = tasksData.find(t => t.id === taskId);
  if (!task) return;
  delete claimsData[taskId];
  saveClaimsAndSync();
  showToast(`Cooldown reset for "${task.title}". Ready to claim!`, 'success');
  logActivity(`Admin reset claim timer for "${task.title}".`);
}

function resetUserClaims() {
  if (confirm('Reset all claim cooldown timers? All tasks can be claimed immediately.')) {
    claimsData = {};
    saveClaimsAndSync();
    showToast('🧪 All task claim cooldowns reset to 0!', 'success');
    logActivity('Admin reset all player claim cooldown timers.');
  }
}

function clearAllTasks() {
  if (confirm('Clear all missions from player screens? You can create new missions using "+ Add New Mission".')) {
    tasksData = [];
    saveTasksAndSync('All missions cleared from player screens.');
    logActivity('Admin cleared all missions.');
  }
}

function restoreDefaultTasks() {
  clearAllTasks();
}

function handleSearchFilter(term) {
  taskSearchFilter = term.trim();
  renderAdminTasks();
}

// ============================================================================
// 7. PAGE 3: WITHDRAW REQUESTS MANAGEMENT
// ============================================================================

function filterWithdrawals(filterType, btnElement) {
  withdrawFilter = filterType;
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(p => p.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderWithdrawalsTable();
}

function handleWithdrawSearch(val) {
  withdrawSearchFilter = val.trim().toLowerCase();
  renderWithdrawalsTable();
}

function renderWithdrawalsTable() {
  const tbody = document.getElementById('withdrawalsTableBody');
  if (!tbody) return;

  let filtered = withdrawalsData.filter(w => {
    if (withdrawFilter !== 'all' && w.status !== withdrawFilter) return false;
    if (withdrawSearchFilter) {
      const matchName = w.playerName && w.playerName.toLowerCase().includes(withdrawSearchFilter);
      const matchDetails = w.details && w.details.toLowerCase().includes(withdrawSearchFilter);
      const matchId = w.id && w.id.toLowerCase().includes(withdrawSearchFilter);
      return matchName || matchDetails || matchId;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #64748b; padding: 2.5rem 1rem;">
          No withdrawal requests found for this filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(w => {
    let actionButtons = '';
    if (w.status === 'pending') {
      actionButtons = `
        <button class="btn-table-action btn-approve" onclick="approveWithdrawal('${w.id}')" title="Approve and mark settled">✅ Approve</button>
        <button class="btn-table-action btn-reject" onclick="rejectWithdrawal('${w.id}')" title="Reject and refund">❌ Reject</button>
      `;
    } else {
      actionButtons = `
        <button class="btn-table-action" onclick="deleteWithdrawal('${w.id}')" title="Delete request record">🗑️</button>
      `;
    }

    return `
      <tr>
        <td class="font-mono font-bold" style="color: #93c5fd;">#${w.id}</td>
        <td>
          <div class="user-cell">
            <span class="user-avatar-sm">${w.playerAvatar || '👤'}</span>
            <span class="user-name-bold">${escapeHtml(w.playerName)}</span>
          </div>
        </td>
        <td class="font-bold text-gold" style="font-size: 0.95rem;">₹${Number(w.amount).toLocaleString()}</td>
        <td>
          <div style="font-weight: 700; color: #ffffff;">${escapeHtml(w.method)}</div>
          <div style="font-size: 0.72rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">${escapeHtml(w.details)}</div>
          ${(w.deliveryLink || w.link) ? `<div style="margin-top: 3px;"><a href="${escapeHtml(w.deliveryLink || w.link)}" target="_blank" rel="noopener noreferrer" style="color: #34d399; font-size: 0.72rem; font-weight: 800; text-decoration: underline;">🔗 View Link</a></div>` : ''}
        </td>
        <td style="color: #cbd5e1; font-size: 0.75rem;">${escapeHtml(w.time || 'Recent')}</td>
        <td>
          <span class="status-badge ${w.status}">${w.status}</span>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            ${actionButtons}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openApproveModal(reqId) {
  const req = withdrawalsData.find(w => w.id === reqId);
  if (!req) return;

  const modal = document.getElementById('withdrawApproveModalOverlay');
  const idInput = document.getElementById('approveReqId');
  const idDisplay = document.getElementById('approveReqIdDisplay');
  const nameDisplay = document.getElementById('approvePlayerNameDisplay');
  const amtDisplay = document.getElementById('approveAmountDisplay');
  const detDisplay = document.getElementById('approveDetailsDisplay');
  const linkInput = document.getElementById('approveDeliveryLinkInput');
  const codeInput = document.getElementById('approveSecurityCodeInput');
  const errBox = document.getElementById('approveCodeError');

  if (idInput) idInput.value = req.id;
  if (idDisplay) idDisplay.textContent = `#${req.id}`;
  if (nameDisplay) nameDisplay.textContent = req.playerName || 'Player';
  if (amtDisplay) amtDisplay.textContent = `₹${Number(req.amount).toLocaleString()}`;
  if (detDisplay) detDisplay.textContent = `${req.method} • ${req.details || ''}`;
  if (linkInput) linkInput.value = req.deliveryLink || req.link || '';
  if (codeInput) codeInput.value = '';
  if (errBox) errBox.style.display = 'none';

  if (modal) {
    modal.classList.add('active');
    setTimeout(() => {
      if (codeInput) codeInput.focus();
    }, 150);
  } else {
    // Fallback if modal not present
    const link = prompt(`Enter Delivery / Reward Link for #${req.id} (optional):`, req.deliveryLink || req.link || '');
    if (link === null) return;
    const code = prompt('Enter Admin Approval Code (1109):');
    if (code !== '1109') {
      alert('❌ Invalid code! Approval cancelled.');
      return;
    }
    req.status = 'approved';
    req.approvedAt = Date.now();
    if (link.trim()) {
      let cleanLink = link.trim();
      if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
        cleanLink = 'https://' + cleanLink;
      }
      req.deliveryLink = cleanLink;
      req.link = cleanLink;
    }
    saveWithdrawalsAndSync();
    showToast(`✅ Withdrawal #${req.id} approved!`, 'success');
  }
}

function closeWithdrawApproveModal() {
  const modal = document.getElementById('withdrawApproveModalOverlay');
  if (modal) modal.classList.remove('active');
}

function handleConfirmApproveWithdrawal(event) {
  if (event) event.preventDefault();
  const reqId = document.getElementById('approveReqId') ? document.getElementById('approveReqId').value : '';
  const codeInput = document.getElementById('approveSecurityCodeInput');
  const linkInput = document.getElementById('approveDeliveryLinkInput');
  const errBox = document.getElementById('approveCodeError');
  const enteredCode = codeInput ? codeInput.value.trim() : '';

  if (enteredCode !== '1109') {
    if (errBox) errBox.style.display = 'flex';
    if (codeInput) {
      codeInput.value = '';
      codeInput.focus();
    }
    showToast('❌ Invalid Approval Code! Must enter code 1109.', 'error');
    return;
  }

  const req = withdrawalsData.find(w => w.id === reqId);
  if (!req) return;

  req.status = 'approved';
  req.approvedAt = Date.now();
  req.approvedWithCode = '1109';
  if (linkInput && linkInput.value.trim()) {
    let cleanLink = linkInput.value.trim();
    if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      cleanLink = 'https://' + cleanLink;
    }
    req.deliveryLink = cleanLink;
    req.link = cleanLink;
  }
  saveWithdrawalsAndSync();
  closeWithdrawApproveModal();
  logActivity(`Admin approved cashout #${req.id} for ${req.playerName} (₹${req.amount}) with link attached`);
  showToast(`✅ Withdrawal #${req.id} approved with link! (Code 1109 Verified)`, 'success');
}

function approveWithdrawal(reqId) {
  openApproveModal(reqId);
}

function rejectWithdrawal(reqId) {
  const req = withdrawalsData.find(w => w.id === reqId);
  if (!req) return;

  req.status = 'rejected';
  req.rejectedAt = Date.now();
  saveWithdrawalsAndSync();
  logActivity(`Admin rejected cashout #${req.id} for ${req.playerName} (₹${req.amount})`);
  showToast(`❌ Withdrawal #${req.id} rejected and refunded.`, 'error');
}

function deleteWithdrawal(reqId) {
  if (confirm(`Remove record for #${reqId}?`)) {
    withdrawalsData = withdrawalsData.filter(w => w.id !== reqId);
    saveWithdrawalsAndSync();
    showToast(`Withdrawal record #${reqId} deleted.`, 'info');
  }
}

function openCreateWithdrawModal() {
  const modal = document.getElementById('withdrawCreateModalOverlay');
  if (modal) modal.classList.add('active');
}

function closeWithdrawCreateModal() {
  const modal = document.getElementById('withdrawCreateModalOverlay');
  if (modal) modal.classList.remove('active');
}

function handleWdMethodChange(val) {
  const label = document.getElementById('wdDetailsLabel');
  const input = document.getElementById('wdDetailsInput');
  if (val === 'UPI') {
    if (label) label.textContent = 'UPI ID';
    if (input) input.placeholder = 'e.g. novaearner@okhdfcbank';
  } else if (val === 'Bank') {
    if (label) label.textContent = 'Bank A/C & IFSC';
    if (input) input.placeholder = 'e.g. A/C 9876543210 (IFSC: HDFC0001234)';
  } else if (val === 'Amazon') {
    if (label) label.textContent = 'Amazon Voucher Code / Email';
    if (input) input.placeholder = 'e.g. AMZN-7492-89BX-500R';
  } else {
    if (label) label.textContent = 'Crypto USDT TRC20 Wallet';
    if (input) input.placeholder = 'e.g. T9yD14Nj9j7xAB4dbGeiX9h...';
  }
}

function handleSaveTestWithdraw(event) {
  event.preventDefault();

  const name = document.getElementById('wdPlayerNameInput').value.trim() || 'NovaEarner';
  const amount = parseInt(document.getElementById('wdAmountInput').value, 10) || 100;
  const method = document.getElementById('wdMethodSelect').value;
  const details = document.getElementById('wdDetailsInput').value.trim() || 'Default ID';

  const newWd = {
    id: `WD-${Math.floor(1000 + Math.random() * 9000)}`,
    playerName: name,
    playerAvatar: name === 'NovaEarner' ? '⚡' : '👤',
    amount: amount,
    method: method,
    details: details,
    time: 'Just now',
    timestamp: Date.now(),
    status: 'pending'
  };

  withdrawalsData.unshift(newWd);
  saveWithdrawalsAndSync();
  closeWithdrawCreateModal();
  logActivity(`New cashout request submitted: #${newWd.id} by ${name} (₹${amount})`);
  showToast(`💸 Cashout request #${newWd.id} created! Ready for review.`, 'success');
}

// ============================================================================
// 8. PAGE 4: USER / PLAYER MANAGEMENT
// ============================================================================

function handleUserSearch(val) {
  userSearchFilter = val.trim().toLowerCase();
  renderUsersTable();
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const filtered = usersData.filter(u => {
    if (!userSearchFilter) return true;
    return (u.name && u.name.toLowerCase().includes(userSearchFilter)) ||
           (u.level && u.level.toLowerCase().includes(userSearchFilter));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #64748b; padding: 2.5rem 1rem;">
          No players match your search.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const isSusp = u.status === 'suspended';

    return `
      <tr>
        <td>
          <div class="user-cell">
            <span class="user-avatar-sm">${u.avatar || '👤'}</span>
            <div>
              <div class="user-name-bold">${escapeHtml(u.name)}</div>
              <div style="font-size: 0.68rem; color: #64748b; font-family: 'JetBrains Mono', monospace;">ID: #${u.id}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-tag badge-timer">${escapeHtml(u.level || 'LVL 1')}</span>
        </td>
        <td class="font-bold text-gold" style="font-size: 0.95rem;">${Number(u.coins || 0).toLocaleString()} 🪙</td>
        <td class="font-bold text-gold" style="font-size: 0.95rem;">${Number(u.stars || 0).toLocaleString()} ⭐</td>
        <td>
          <span class="status-badge ${isSusp ? 'rejected' : 'approved'}">${isSusp ? 'SUSPENDED' : 'ACTIVE'}</span>
        </td>
        <td style="color: #94a3b8; font-size: 0.75rem;">${escapeHtml(u.joined || 'Oct 2026')}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn-table-action" onclick="openUserEditModal('${u.id}')" title="Adjust Coins/Stars">✏️ Edit</button>
            <button class="btn-table-action ${isSusp ? 'btn-approve' : 'btn-reject'}" onclick="toggleUserStatus('${u.id}')" title="Ban/Unban player">
              ${isSusp ? '🟢 Unban' : '🚫 Ban'}
            </button>
            <button class="btn-table-action" onclick="deleteUser('${u.id}')" title="Delete player record">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openUserEditModal(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('editUserId').value = user.id;
  document.getElementById('userEditModalTitle').textContent = `Adjust Balance: ${user.name}`;
  document.getElementById('userEditModalSub').textContent = `Manage economy for player ${user.name}`;
  document.getElementById('editUserCoinsInput').value = user.coins || 0;
  document.getElementById('editUserStarsInput').value = user.stars || 0;
  document.getElementById('editUserStatusSelect').value = user.status || 'active';

  const modal = document.getElementById('userEditModalOverlay');
  if (modal) modal.classList.add('active');
}

function closeUserEditModal() {
  const modal = document.getElementById('userEditModalOverlay');
  if (modal) modal.classList.remove('active');
}

function handleSaveUserBalance(event) {
  event.preventDefault();

  const userId = document.getElementById('editUserId').value;
  const coins = parseInt(document.getElementById('editUserCoinsInput').value, 10) || 0;
  const stars = parseInt(document.getElementById('editUserStarsInput').value, 10) || 0;
  const status = document.getElementById('editUserStatusSelect').value;

  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  user.coins = coins;
  user.stars = stars;
  user.status = status;

  // 1. Save directly to Firebase Firestore users/{userId}
  if (window.Firebase && typeof window.Firebase.saveUserBalanceToCloud === 'function') {
    window.Firebase.saveUserBalanceToCloud(userId, coins, stars, status);
  }

  // 2. Check if this is the current active player session (by uid or username)
  const currentUid = localStorage.getItem('player_uid');
  const isCurrentPlayer = (userId === currentUid || userId === 'usr_1' || (user.uid && user.uid === currentUid));
  if (isCurrentPlayer) {
    localStorage.setItem('task_game_coins', coins.toString());
    localStorage.setItem('user_coins', coins.toString());
    localStorage.setItem('task_game_stars', stars.toString());
    localStorage.setItem('user_stars', stars.toString());
  }

  // 3. Broadcast balance update across all open tabs
  try {
    const ch = syncChannel || new BroadcastChannel('nova_task_sync');
    ch.postMessage({ type: 'COINS_UPDATED', coins: coins, stars: stars, userId: userId });
    ch.postMessage({ type: 'BALANCES_UPDATED', coins: coins, stars: stars, userId: userId });
  } catch (e) {}

  saveUsersAndSync();
  closeUserEditModal();
  logActivity(`Admin updated balance for ${user.name}: ${coins.toLocaleString()} 🪙, ${stars.toLocaleString()} ⭐`);
  showToast(`✓ Player ${user.name} balance saved to Firebase & updated on all pages!`, 'success');
}

function toggleUserStatus(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  user.status = (user.status === 'suspended') ? 'active' : 'suspended';
  const isSusp = user.status === 'suspended';
  saveUsersAndSync();
  logActivity(`Admin ${isSusp ? 'suspended' : 'reactivated'} player ${user.name}.`);
  showToast(`Player ${user.name} is now ${isSusp ? 'Suspended 🚫' : 'Active 🟢'}`, isSusp ? 'error' : 'success');
}

function quickAwardAllPlayers(amount) {
  usersData.forEach(u => {
    u.coins = (u.coins || 0) + amount;
    if (window.Firebase && typeof window.Firebase.saveUserBalanceToCloud === 'function') {
      window.Firebase.saveUserBalanceToCloud(u.id, u.coins, u.stars || 0, u.status || 'active');
    }
  });

  // Also give to active player
  let playerCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  playerCoins += amount;
  localStorage.setItem('task_game_coins', playerCoins.toString());
  localStorage.setItem('user_coins', playerCoins.toString());

  try {
    const ch = syncChannel || new BroadcastChannel('nova_task_sync');
    ch.postMessage({ type: 'COINS_UPDATED', coins: playerCoins });
    ch.postMessage({ type: 'BALANCES_UPDATED', coins: playerCoins });
  } catch (e) {}

  saveUsersAndSync();
  logActivity(`Admin sent +${amount.toLocaleString()} 🪙 community bounty to all players.`);
  showToast(`🎉 Sent +${amount.toLocaleString()} coins bonus to all players (Saved to Firebase)!`, 'success');
}

async function deleteUser(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  if (confirm(`Delete player account "${user.name}"? This will permanently delete all user records from Firebase cloud as well.`)) {
    const deletedCopy = { ...user };
    usersData = usersData.filter(u => u.id !== userId);
    saveUsersAndSync();

    // Reset local player session if the deleted user is the current player
    const currentUid = localStorage.getItem('player_uid');
    const currentName = localStorage.getItem('player_username');
    if (userId === 'usr_1' || userId === currentUid || (deletedCopy.name && deletedCopy.name === currentName)) {
      localStorage.removeItem('player_uid');
      localStorage.removeItem('player_email');
      localStorage.setItem('player_logged_in', 'false');
      localStorage.setItem('task_game_coins', '0');
      localStorage.setItem('task_game_stars', '0');
      localStorage.setItem('completed_tasks_count', '0');
      localStorage.setItem('ads_watched_count', '0');
    }

    // Call Firebase complete cloud deletion
    if (window.Firebase && typeof window.Firebase.deleteUserFromCloud === 'function') {
      try {
        await window.Firebase.deleteUserFromCloud(userId, deletedCopy);
      } catch (err) {
        console.warn("[Admin] Cloud delete notice:", err);
      }
    }

    logActivity(`Admin deleted player account: ${deletedCopy.name} (purged all Firebase data).`);
    showToast(`Player "${deletedCopy.name}" and all Firebase cloud data removed.`, 'info');
  }
}

function openCreateUserModal() {
  const name = prompt('Enter player username:');
  if (!name || !name.trim()) return;

  const newUser = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    avatar: '🎮',
    level: 'LVL 1 • NOVICE',
    coins: 500,
    stars: 50,
    status: 'active',
    joined: 'Just now'
  };

  usersData.push(newUser);
  saveUsersAndSync();
  logActivity(`Admin registered new player account: ${newUser.name}`);
  showToast(`Player "${newUser.name}" created!`, 'success');
}

// ============================================================================
// 9. TOAST NOTIFICATIONS & UTILITIES
// ============================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '⚡' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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

// ============================================================================
// 10. INITIALIZATION
// ============================================================================

function initDashboard() {
  loadAllStoredData();
  switchAdminPage('tasks');

  // Start live timer interval for task cooldown ticking
  setInterval(updateAdminLiveTimers, 1000);

  // Cloud listener for tasks
  setupCloudTaskListener();
}

function setupCloudTaskListener() {
  const listener = (window.Firebase && window.Firebase.listenToCloudTasks) || window.listenToCloudTasks;
  if (typeof listener === 'function') {
    listener((tasks) => {
      if (Array.isArray(tasks) && tasks.length > 0) {
        tasksData = tasks;
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
      } else {
        loadAllStoredData();
      }
      renderCurrentPage();
    });
  }
}

window.renderAdminTasks = renderAdminTasks;
window.renderTasksTable = renderAdminTasks;
window.renderCurrentPage = renderCurrentPage;
window.setupCloudTaskListener = setupCloudTaskListener;

window.addEventListener('firebase:ready', () => {
  setupCloudTaskListener();
});

document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
});

// Cross-tab storage synchronization
window.addEventListener('storage', (e) => {
  if (e.key === TASKS_STORAGE_KEY || e.key === SYNC_FLAG_KEY || e.key === CLAIMS_STORAGE_KEY || e.key === WITHDRAW_STORAGE_KEY) {
    loadAllStoredData();
    renderCurrentPage();
  }
  if (e.key === 'task_game_coins' || e.key === 'task_game_stars') {
    loadAllStoredData();
    updateAllMetricsAndBadges();
  }
});
// ============================================================================
// 8. ADS CONFIGURATION & METRICS CONTROLLER
// ============================================================================

const DEFAULT_AD_CONFIG = {
  enabled: true,
  provider: 'direct_link',
  adUrl: 'https://monetag.com',
  openMethod: 'new_tab',
  countdownSeconds: 5,
  scriptCode: ''
};

function getAdminAdConfig() {
  try {
    const raw = localStorage.getItem('task_game_ad_config');
    if (raw) return { ...DEFAULT_AD_CONFIG, ...JSON.parse(raw) };
  } catch (e) {}
  return DEFAULT_AD_CONFIG;
}

function renderAdsConfigPage() {
  const cfg = getAdminAdConfig();
  const urlInput = document.getElementById('adminAdUrlInput');
  const providerSelect = document.getElementById('adminAdProviderSelect');
  const openMethodSelect = document.getElementById('adminAdOpenMethodSelect');
  const countdownInput = document.getElementById('adminAdCountdownInput');
  const enabledToggle = document.getElementById('adminAdEnabledToggle');

  if (urlInput) urlInput.value = cfg.adUrl || 'https://monetag.com';
  if (providerSelect) providerSelect.value = cfg.provider || 'direct_link';
  if (openMethodSelect) openMethodSelect.value = cfg.openMethod || 'new_tab';
  if (countdownInput) countdownInput.value = cfg.countdownSeconds || 5;
  if (enabledToggle) enabledToggle.checked = cfg.enabled !== false;

  // Render metrics
  const totalClicks = parseInt(localStorage.getItem('task_admin_ads_clicked_count') || '0', 10);
  const totalRewards = parseInt(localStorage.getItem('task_game_ads_watched_count') || '0', 10);

  const clicksEl = document.getElementById('adminTotalAdClicks');
  const rewardsEl = document.getElementById('adminTotalAdRewards');
  const statusEl = document.getElementById('adminAdStatusDisplay');

  if (clicksEl) clicksEl.innerText = totalClicks.toLocaleString();
  if (rewardsEl) rewardsEl.innerText = totalRewards.toLocaleString();
  if (statusEl) {
    statusEl.innerText = cfg.enabled !== false ? 'ONLINE' : 'PAUSED';
    statusEl.style.color = cfg.enabled !== false ? '#34d399' : '#f87171';
  }
}

function handleSaveAdConfig(e) {
  if (e) e.preventDefault();
  const url = document.getElementById('adminAdUrlInput')?.value.trim() || 'https://monetag.com';
  const provider = document.getElementById('adminAdProviderSelect')?.value || 'direct_link';
  const openMethod = document.getElementById('adminAdOpenMethodSelect')?.value || 'new_tab';
  const countdown = parseInt(document.getElementById('adminAdCountdownInput')?.value || '5', 10);
  const enabled = document.getElementById('adminAdEnabledToggle')?.checked !== false;

  const newConfig = {
    enabled,
    provider,
    adUrl: url,
    openMethod,
    countdownSeconds: countdown
  };

  localStorage.setItem('task_game_ad_config', JSON.stringify(newConfig));

  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'AD_CONFIG_UPDATED', config: newConfig, timestamp: Date.now() });
    bc.close();
  } catch (err) {}

  showAdminNotification('Ad Configuration Saved', 'All game Watch Ad buttons updated live!', 'success');
  renderAdsConfigPage();
}

function testAdLink() {
  const cfg = getAdminAdConfig();
  const url = cfg.adUrl || 'https://monetag.com';

  // Increment metrics
  const currentClicks = parseInt(localStorage.getItem('task_admin_ads_clicked_count') || '0', 10) + 1;
  localStorage.setItem('task_admin_ads_clicked_count', currentClicks.toString());

  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'AD_CLICKED', totalClicks: currentClicks, timestamp: Date.now() });
    bc.close();
  } catch (err) {}

  // Open Ad URL
  window.open(url, '_blank', 'noopener,noreferrer');
  showAdminNotification('Ad Opened in New Tab', 'Opening ad in new tab...', 'info');
  renderAdsConfigPage();
}


// ============================================================================
// 10. EVENTS & LEADERBOARD SESSIONS MANAGEMENT (SESSION-WISE DATA STORE)
// ============================================================================

const THREE_MONTHS_HOURS = 2160;
const THREE_MONTHS_MS = THREE_MONTHS_HOURS * 60 * 60 * 1000;
const GLOBAL_EPOCH_ANCHOR = Date.UTC(2026, 9, 1, 0, 0, 0);

function getRankPrizeStars(rank) {
  if (rank === 1) return 10000;
  if (rank === 2) return 5000;
  if (rank >= 3 && rank <= 5) return 1000;
  if (rank >= 6 && rank <= 10) return 500;
  if (rank >= 11 && rank <= 20) return 100;
  return 0;
}

function getLeaderboardEventInfo() {
  const now = Date.now();

  // Purge legacy key if present
  try {
    if (localStorage.getItem('task_leaderboard_event_v1')) {
      localStorage.removeItem('task_leaderboard_event_v1');
    }
  } catch (e) {}

  let evt = null;
  try {
    const raw = localStorage.getItem(LEADERBOARD_EVENT_KEY);
    if (raw) evt = JSON.parse(raw);
  } catch (e) {}

  // If an event has finished, respect it
  if (evt && evt.status === 'finished') {
    return evt;
  }

  // If active manual override is still running
  if (evt && evt.isManualOverride && now < evt.endTime && evt.status === 'active') {
    return evt;
  }

  // Deterministic Universal Global 3-Month Season (Identical to Leaderboard rank page)
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

  try {
    localStorage.setItem(LEADERBOARD_EVENT_KEY, JSON.stringify(globalEvt));
  } catch (e) {}

  return globalEvt;
}

function formatEventCountdown(ms) {
  if (ms <= 0) return '00d 00h 00m 00s';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function startAdminEventsTimer() {
  if (adminEventTimerInterval) clearInterval(adminEventTimerInterval);

  function tick() {
    const evt = getLeaderboardEventInfo();
    const now = Date.now();
    const remaining = Math.max(0, evt.endTime - now);
    const elCountdown = document.getElementById('adminEventCountdownText');
    if (elCountdown) {
      elCountdown.textContent = formatEventCountdown(remaining);
    }
  }

  tick();
  adminEventTimerInterval = setInterval(tick, 1000);
}

function renderEventsAndSessionsPage() {
  const evt = getLeaderboardEventInfo();

  // 1. Overview cards
  const elTitle = document.getElementById('adminEventSeasonTitle');
  if (elTitle) elTitle.textContent = evt.name || `Season ${evt.seasonNumber || 1}`;

  const elSub = document.getElementById('adminEventDurationText');
  if (elSub) elSub.textContent = `Season ${evt.seasonNumber || 1} • 3-Month Championship`;

  startAdminEventsTimer();

  // 2. Qualified Contenders (Gate >= 100 tasks)
  const qualifiedContenders = usersData
    .filter(u => Number(u.totalTasks || 0) >= 100)
    .sort((a, b) => (Number(b.eventTasks || 0)) - (Number(a.eventTasks || 0)));

  const elQualCount = document.getElementById('adminEventQualifiedCount');
  if (elQualCount) elQualCount.textContent = qualifiedContenders.length.toString();

  const elTotalSessions = document.getElementById('adminTotalSessionsCount');
  if (elTotalSessions) elTotalSessions.textContent = sessionsData.length.toString();

  // 3. Render Live Standings Table
  const tbodyLive = document.getElementById('adminLiveEventStandingsTableBody');
  if (tbodyLive) {
    if (qualifiedContenders.length === 0) {
      tbodyLive.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">
            <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🎯</div>
            <div style="font-weight: 700;">No players have reached the 100-task qualification gate yet.</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Once a player completes 100 missions, their name enters the championship standings automatically.</div>
          </td>
        </tr>`;
    } else {
      tbodyLive.innerHTML = qualifiedContenders.map((u, idx) => {
        const rank = idx + 1;
        const estPrize = getRankPrizeStars(rank);
        const rankColor = rank === 1 ? '#facc15' : rank === 2 ? '#94a3b8' : rank === 3 ? '#d97706' : '#64748b';
        const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

        return `
          <tr>
            <td style="font-weight: 900; color: ${rankColor}; font-size: 1rem;">${rankMedal}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1rem;">${escapeHtml(u.avatar || '⚡')}</span>
                <div>
                  <div style="font-weight: 800; color: #ffffff;">${escapeHtml(u.name || 'Anonymous')}</div>
                  <div style="font-size: 0.72rem; color: #64748b; font-family: monospace;">${escapeHtml(u.id || '')}</div>
                </div>
              </div>
            </td>
            <td style="font-weight: 800; color: #38bdf8;">${Number(u.eventTasks || 0).toLocaleString()} Tasks</td>
            <td style="font-weight: 700; color: #94a3b8;">${Number(u.totalTasks || 0).toLocaleString()} Total</td>
            <td style="font-weight: 800; color: #facc15;">${estPrize > 0 ? `+${estPrize.toLocaleString()} ⭐` : '—'}</td>
            <td>
              <span class="badge-active" style="padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8;">Qualified</span>
            </td>
          </tr>`;
      }).join('');
    }
  }

  // 4. Update Filter Dropdown
  const sessionFilterSelect = document.getElementById('adminSessionSelectFilter');
  if (sessionFilterSelect) {
    const curVal = sessionFilterSelect.value || 'all';
    sessionFilterSelect.innerHTML = '<option value="all">All Sessions</option>' + 
      sessionsData.map(s => `<option value="${escapeHtml(s.id)}" ${curVal === s.id ? 'selected' : ''}>${escapeHtml(s.name || ('Session ' + s.sessionNumber))}</option>`).join('');
  }

  // 5. Render Stored Sessions Archive Cards & Tables
  renderSessionsArchiveView();
}

function renderSessionsArchiveView(filterSessionId = 'all', searchQuery = '') {
  const container = document.getElementById('adminSessionsArchiveContainer');
  if (!container) return;

  let list = [...sessionsData];
  if (filterSessionId !== 'all') {
    list = list.filter(s => s.id === filterSessionId);
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 12px; background: rgba(6, 14, 36, 0.5);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📁</div>
        <h4 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0 0 0.4rem 0;">No Historical Sessions Archived Yet</h4>
        <p style="font-size: 0.8rem; color: #94a3b8; max-width: 480px; margin: 0 auto 1.25rem auto;">
          When an event concludes or when you click "Conclude & Archive Current Session", all contenders, rankings, tasks, and star prizes are permanently saved session-wise here.
        </p>
        <button type="button" class="btn-primary" onclick="adminArchiveCurrentSession()" style="padding: 0.5rem 1.25rem; font-size: 0.85rem; font-weight: 800;">
          <span>📸 Create First Session Snapshot Now</span>
        </button>
      </div>`;
    return;
  }

  container.innerHTML = list.map((session, sIdx) => {
    let standings = session.standings || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      standings = standings.filter(st => (st.name || '').toLowerCase().includes(q) || String(st.rank).includes(q));
    }

    const startDateStr = session.startTime ? new Date(session.startTime).toLocaleDateString() : 'N/A';
    const endDateStr = session.endTime ? new Date(session.endTime).toLocaleDateString() : 'N/A';
    const topWinner = session.topWinner || (session.standings && session.standings[0]);

    return `
      <div style="background: rgba(6, 14, 36, 0.8); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 14px; margin-bottom: 1.5rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);">
        
        <!-- Session Header Bar -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%); border-bottom: 1px solid rgba(56, 189, 248, 0.2);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">🏆</span>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0;">${escapeHtml(session.name || ('Session ' + session.sessionNumber))}</h4>
              <span style="padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; background: rgba(52, 211, 153, 0.2); color: #34d399; border: 1px solid #34d399;">🏁 CONCLUDED &amp; STORED</span>
            </div>
            <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 4px;">
              Duration: <b>${startDateStr}</b> ➔ <b>${endDateStr}</b> • Total Contenders: <b style="color: #38bdf8;">${session.totalContenders || (session.standings ? session.standings.length : 0)}</b> • Tasks Completed: <b style="color: #facc15;">${Number(session.totalTasksCompleted || 0).toLocaleString()}</b>
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" onclick="exportSingleSessionJson('${escapeHtml(session.id)}')" class="btn-ctrl" style="padding: 4px 10px; font-size: 0.75rem; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; border-radius: 6px; cursor: pointer; font-weight: 700;">
              📥 Export Session
            </button>
            <button type="button" onclick="deleteArchivedSession('${escapeHtml(session.id)}')" class="btn-ctrl" style="padding: 4px 10px; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; border-radius: 6px; cursor: pointer; font-weight: 700;">
              🗑️ Delete
            </button>
          </div>
        </div>

        <!-- Winner Highlight Ribbon -->
        ${topWinner ? `
        <div style="background: rgba(250, 204, 21, 0.08); border-bottom: 1px solid rgba(250, 204, 21, 0.2); padding: 0.6rem 1.25rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem;">🥇</span>
            <span style="font-size: 0.8rem; font-weight: 800; color: #fef08a;">Session Champion:</span>
            <span style="font-size: 0.82rem; font-weight: 900; color: #ffffff;">${escapeHtml(topWinner.name)}</span>
            <span style="font-size: 0.75rem; color: #38bdf8; font-weight: 700;">(${topWinner.eventTasks || 0} Tasks)</span>
          </div>
          <span style="font-size: 0.8rem; font-weight: 900; color: #facc15;">Awarded: +${Number(topWinner.starReward || 10000).toLocaleString()} ⭐</span>
        </div>` : ''}

        <!-- Session Standings Table -->
        <div class="table-responsive">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th style="width: 80px;">Rank</th>
                <th>Contender</th>
                <th>Session Tasks</th>
                <th>Total Career Tasks</th>
                <th>Star Prize Awarded</th>
                <th>Contender ID</th>
              </tr>
            </thead>
            <tbody>
              ${standings.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 1.25rem; color: #94a3b8; font-size: 0.8rem;">
                    No contenders recorded for this session.
                  </td>
                </tr>` : standings.map(st => {
                  const rank = st.rank;
                  const rankColor = rank === 1 ? '#facc15' : rank === 2 ? '#94a3b8' : rank === 3 ? '#d97706' : '#64748b';
                  const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                  return `
                    <tr>
                      <td style="font-weight: 900; color: ${rankColor}; font-size: 0.95rem;">${rankMedal}</td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span>${escapeHtml(st.avatar || '⚡')}</span>
                          <span style="font-weight: 800; color: #ffffff;">${escapeHtml(st.name || 'Anonymous')}</span>
                        </div>
                      </td>
                      <td style="font-weight: 800; color: #38bdf8;">${Number(st.eventTasks || 0).toLocaleString()}</td>
                      <td style="color: #94a3b8;">${Number(st.totalTasks || 0).toLocaleString()}</td>
                      <td style="font-weight: 800; color: #facc15;">${st.starReward > 0 ? `+${st.starReward.toLocaleString()} ⭐` : '—'}</td>
                      <td style="font-family: monospace; font-size: 0.72rem; color: #64748b;">${escapeHtml(st.id || '')}</td>
                    </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>

      </div>`;
  }).join('');
}

function filterAdminSessionView(sessionId) {
  const q = document.getElementById('adminSessionContenderSearch')?.value || '';
  renderSessionsArchiveView(sessionId, q);
}

function filterAdminSessionContenders(query) {
  const sessionId = document.getElementById('adminSessionSelectFilter')?.value || 'all';
  renderSessionsArchiveView(sessionId, query);
}

// Conclude & Archive Current Session to History
function adminArchiveCurrentSession() {
  const evt = getLeaderboardEventInfo();
  const qualified = usersData
    .filter(u => Number(u.totalTasks || 0) >= 100)
    .sort((a, b) => (Number(b.eventTasks || 0)) - (Number(a.eventTasks || 0)));

  const sessionNum = evt.seasonNumber || (sessionsData.length + 1);
  const sessionName = evt.name || `Season ${sessionNum}: 3-Month Championship`;

  if (!confirm(`Conclude & Archive "${sessionName}"?\n\n• This will capture all ${qualified.length} qualified contenders and save full rankings to the session-wise store.\n• Event tasks counter will reset to 0 for the next season.\n• Ready to proceed?`)) {
    return;
  }

  const now = Date.now();
  const standings = qualified.map((u, idx) => {
    const rank = idx + 1;
    const starReward = getRankPrizeStars(rank);
    return {
      rank,
      id: u.id || `usr_${idx}`,
      name: u.name || 'Anonymous',
      avatar: u.avatar || '⚡',
      eventTasks: Number(u.eventTasks || 0),
      totalTasks: Number(u.totalTasks || 0),
      starReward
    };
  });

  const totalTasks = standings.reduce((sum, s) => sum + s.eventTasks, 0);
  const totalStars = standings.reduce((sum, s) => sum + s.starReward, 0);

  const archivedSession = {
    id: `session_${sessionNum}_${now}`,
    sessionNumber: sessionNum,
    name: sessionName,
    startTime: evt.startTime || (now - THREE_MONTHS_MS),
    endTime: now,
    archivedAt: now,
    status: 'concluded',
    totalContenders: standings.length,
    totalTasksCompleted: totalTasks,
    totalStarsAwarded: totalStars,
    topWinner: standings[0] || null,
    standings
  };

  sessionsData.unshift(archivedSession);
  saveSessionsAndSync();

  // Reset users' eventTasks to 0 for next season
  usersData.forEach(u => {
    u.eventTasks = 0;
  });
  saveUsersAndSync();

  // Create next season
  const nextSeasonNum = sessionNum + 1;
  const nextEvt = {
    id: `global_season_${nextSeasonNum}`,
    seasonNumber: nextSeasonNum,
    name: `Season ${nextSeasonNum}: 3-Month Championship`,
    startTime: now,
    endTime: now + THREE_MONTHS_MS,
    durationHours: THREE_MONTHS_HOURS,
    durationDays: 90,
    status: 'active',
    isGlobal: true,
    isManualOverride: true
  };

  try {
    localStorage.setItem(LEADERBOARD_EVENT_KEY, JSON.stringify(nextEvt));
    if (window.Firebase && typeof window.Firebase.saveGlobalLeaderboardEventToCloud === 'function') {
      window.Firebase.saveGlobalLeaderboardEventToCloud(nextEvt);
    }
  } catch (e) {}

  renderEventsAndSessionsPage();
  showToast(`🏆 ${sessionName} archived successfully to Session Store! Season ${nextSeasonNum} is now LIVE.`, 'success');
  logActivity(`Admin archived ${sessionName} with ${standings.length} contenders into session history.`);
}

function adminRestartEventSeason() {
  if (!confirm('Restart the 3-Month Championship Season with a fresh 90-day timer?')) return;
  const now = Date.now();
  const evt = getLeaderboardEventInfo();
  const nextEvt = {
    ...evt,
    startTime: now,
    endTime: now + THREE_MONTHS_MS,
    status: 'active',
    isManualOverride: true
  };

  try {
    localStorage.setItem(LEADERBOARD_EVENT_KEY, JSON.stringify(nextEvt));
    if (window.Firebase && typeof window.Firebase.saveGlobalLeaderboardEventToCloud === 'function') {
      window.Firebase.saveGlobalLeaderboardEventToCloud(nextEvt);
    }
    const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
    bc.postMessage({ type: 'EVENT_RESTART', event: nextEvt, timestamp: now });
    bc.close();
  } catch(e) {}

  usersData.forEach(u => { u.eventTasks = 0; });
  saveUsersAndSync();
  renderEventsAndSessionsPage();
  showToast('🔄 Event season restarted with fresh 90-day global timer!', 'info');
}

function saveSessionsAndSync() {
  try {
    localStorage.setItem(LEADERBOARD_SESSIONS_KEY, JSON.stringify(sessionsData));
    localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
    if (syncChannel) {
      syncChannel.postMessage({ type: 'SESSIONS_UPDATED', timestamp: Date.now() });
    }
    if (window.Firebase && typeof window.Firebase.saveLeaderboardSessionsToCloud === 'function') {
      window.Firebase.saveLeaderboardSessionsToCloud(sessionsData);
    } else if (typeof window.saveLeaderboardSessionsToCloud === 'function') {
      window.saveLeaderboardSessionsToCloud(sessionsData);
    }
  } catch(e) {
    console.warn('Error saving leaderboard sessions:', e.message);
  }
}

function deleteArchivedSession(sessionId) {
  if (!confirm('Are you sure you want to delete this archived session record?')) return;
  sessionsData = sessionsData.filter(s => s.id !== sessionId);
  saveSessionsAndSync();
  renderEventsAndSessionsPage();
  showToast('Archived session removed.', 'info');
}

function exportSingleSessionJson(sessionId) {
  const session = sessionsData.find(s => s.id === sessionId);
  if (!session) return;
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", jsonStr);
  dlAnchor.setAttribute("download", `${session.id}_leaderboard.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function adminExportSessionHistory() {
  const data = {
    exportDate: new Date().toISOString(),
    totalSessions: sessionsData.length,
    activeEvent: getLeaderboardEventInfo(),
    sessions: sessionsData
  };
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", jsonStr);
  dlAnchor.setAttribute("download", `leaderboard_sessions_archive_${Date.now()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast('📥 Session history exported to JSON!', 'success');
}

window.renderEventsAndSessionsPage = renderEventsAndSessionsPage;
window.filterAdminSessionView = filterAdminSessionView;
window.filterAdminSessionContenders = filterAdminSessionContenders;
window.adminArchiveCurrentSession = adminArchiveCurrentSession;
window.adminRestartEventSeason = adminRestartEventSeason;
window.adminExportSessionHistory = adminExportSessionHistory;
window.deleteArchivedSession = deleteArchivedSession;
window.exportSingleSessionJson = exportSingleSessionJson;
