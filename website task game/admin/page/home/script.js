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
  if (u) u.value = '400 @123';
  if (p) p.value = '0911';
  showToast('Credentials filled! Click Authenticate.', 'info');
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

  // Always load freshest data from storage for users, withdrawals, and tasks
  loadAllStoredData();

  if (pageKey === 'withdraw') {
    withdrawFilter = 'all';
    withdrawSearchFilter = '';
    const searchInput = document.getElementById('withdrawSearchInput');
    if (searchInput) searchInput.value = '';
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach((p, idx) => {
      if (idx === 0) p.classList.add('active');
      else p.classList.remove('active');
    });
  } else if (pageKey === 'users') {
    userSearchFilter = '';
    const uSearch = document.getElementById('userSearchInput');
    if (uSearch) uSearch.value = '';
  }

  // Update Navigation Active Class (4 Tabs: tasks, users, withdraw, event)
  const navItems = {
    tasks: document.getElementById('navItemTasks'),
    users: document.getElementById('navItemUsers'),
    withdraw: document.getElementById('navItemWithdraw'),
    event: document.getElementById('navItemEvent')
  };

  Object.keys(navItems).forEach(key => {
    if (navItems[key]) {
      if (key === pageKey) navItems[key].classList.add('active');
      else navItems[key].classList.remove('active');
    }
  });

  // Mobile Bottom Nav items sync
  const mobNavItems = {
    tasks: document.getElementById('mobNavTasks'),
    users: document.getElementById('mobNavUsers'),
    withdraw: document.getElementById('mobNavWithdraw'),
    event: document.getElementById('mobNavEvent')
  };

  Object.keys(mobNavItems).forEach(key => {
    if (mobNavItems[key]) {
      if (key === pageKey) mobNavItems[key].classList.add('active');
      else mobNavItems[key].classList.remove('active');
    }
  });

  // Update Breadcrumb
  const breadcrumb = document.getElementById('breadcrumbPageName');
  const names = {
    tasks: 'Edit Task',
    users: 'All Users',
    withdraw: 'Wallet Requests',
    event: 'Leaderboard Event'
  };
  if (breadcrumb) breadcrumb.textContent = names[pageKey] || 'Edit Task';

  // Show Active Page Section
  const pages = {
    tasks: document.getElementById('pageSectionTasks'),
    users: document.getElementById('pageSectionUsers'),
    withdraw: document.getElementById('pageSectionWithdraw'),
    event: document.getElementById('pageSectionEvent')
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

function handleEditTaskTabClick() {
  switchAdminPage('tasks');
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
  else if (currentAdminPage === 'event') renderAdminEventSection();
}

// ============================================================================
// 3. DATA PERSISTENCE & SYNC
// ============================================================================

function loadAllStoredData() {
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

    // Sync current player live stats to usr_1
    const playerCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
    const playerStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
    const playerTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
    const playerEventTasks = parseInt(localStorage.getItem(EVENT_TASKS_KEY) || '0', 10);
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
        totalTasks: playerTotalTasks,
        eventTasks: playerEventTasks,
        status: 'active',
        joined: 'Today'
      };
      parsedUsers.unshift(primaryUser);
    } else {
      primaryUser.name = playerName;
      primaryUser.avatar = playerAvatar;
      primaryUser.coins = playerCoins;
      primaryUser.stars = playerStars;
      primaryUser.totalTasks = playerTotalTasks;
      primaryUser.eventTasks = playerEventTasks;
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
  const mobWd = document.getElementById('mobWithdrawCounter');
  if (mobWd) {
    mobWd.textContent = pendingWdCount.toString();
    mobWd.style.display = pendingWdCount > 0 ? 'inline-block' : 'none';
  }
  if (navUsers) navUsers.textContent = totalUsers.toString();

  const navEvt = document.getElementById('navEventStatusBadge');
  if (navEvt) {
    const evt = getAdminLeaderboardEvent();
    const isEnded = (evt.endTime - Date.now() <= 0) || (evt.status === 'finished');
    navEvt.textContent = isEnded ? 'ENDED' : 'ACTIVE';
    navEvt.className = isEnded ? 'nav-counter badge-amber' : 'nav-counter';
  }

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
                <span class="task-bounty-val">+${Number(task.reward).toLocaleString()} 🪙</span>
                ${task.link ? `<a href="${escapeHtml(task.link)}" target="_blank" class="task-link-badge" title="Open task link">🔗 ${escapeHtml(task.link.length > 28 ? task.link.substring(0, 28) + '...' : task.link)} ↗</a>` : ''}
                ${(task.verificationCode || task.code) ? `<span class="task-code-badge" title="Verification code required by player">🔑 Code: <code>${escapeHtml(task.verificationCode || task.code)}</code></span>` : ''}
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

  if (currentAdminPage === 'event') {
    const evt = getAdminLeaderboardEvent();
    const clockEl = document.getElementById('adminEventCountdownText');
    const remaining = evt.endTime - Date.now();
    if (clockEl) {
      if (remaining <= 0) clockEl.textContent = '00:00:00 (ENDED)';
      else clockEl.textContent = formatAdminCountdown(remaining);
    }
  }
}

function openCreateModal() {
  document.getElementById('editTaskId').value = '';
  document.getElementById('modalTitleText').textContent = 'Edit Task';
  const badge = document.getElementById('modalIconBadge');
  if (badge) badge.textContent = '✏️';
  document.getElementById('taskTitleInput').value = '';
  const linkEl = document.getElementById('taskLinkInput');
  if (linkEl) linkEl.value = '';
  const codeEl = document.getElementById('taskCodeInput');
  if (codeEl) codeEl.value = '';
  document.getElementById('taskIconInput').value = '⚡';
  document.getElementById('taskRewardInput').value = '250';
  document.getElementById('taskTimerPreset').value = '86400';
  document.getElementById('customSecondsWrap').style.display = 'none';
  document.getElementById('customSecondsInput').value = '';
  document.getElementById('taskDescInput').value = '';
  document.getElementById('taskActiveToggle').checked = true;

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

  document.getElementById('editTaskId').value = task.id;
  document.getElementById('modalTitleText').textContent = `Edit Task: ${task.title}`;
  document.getElementById('taskTitleInput').value = task.title || '';
  const linkEl = document.getElementById('taskLinkInput');
  if (linkEl) linkEl.value = task.link || '';
  const codeEl = document.getElementById('taskCodeInput');
  if (codeEl) codeEl.value = task.verificationCode || task.code || '';
  document.getElementById('taskIconInput').value = task.icon || '⚡';
  document.getElementById('taskRewardInput').value = task.reward || 150;
  document.getElementById('taskDescInput').value = task.description || '';
  document.getElementById('taskActiveToggle').checked = task.active !== false;

  const timerSec = Number(task.timerSeconds || 0);
  const presetDropdown = document.getElementById('taskTimerPreset');
  const customWrap = document.getElementById('customSecondsWrap');
  const customInput = document.getElementById('customSecondsInput');

  const standardPresets = ['86400', '43200', '21600', '3600', '900', '60', '0'];
  if (standardPresets.includes(timerSec.toString())) {
    presetDropdown.value = timerSec.toString();
    customWrap.style.display = 'none';
  } else {
    presetDropdown.value = 'custom';
    customWrap.style.display = 'block';
    customInput.value = timerSec.toString();
  }

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
  event.preventDefault();

  const editId = document.getElementById('editTaskId').value;
  const title = document.getElementById('taskTitleInput').value.trim();
  const linkEl = document.getElementById('taskLinkInput');
  const link = linkEl ? linkEl.value.trim() : '';
  const codeEl = document.getElementById('taskCodeInput');
  const verificationCode = codeEl ? codeEl.value.trim() : '';
  const icon = document.getElementById('taskIconInput').value.trim() || '⚡';
  const reward = parseInt(document.getElementById('taskRewardInput').value, 10) || 100;
  const desc = document.getElementById('taskDescInput').value.trim();
  const active = document.getElementById('taskActiveToggle').checked;
  const preset = document.getElementById('taskTimerPreset').value;

  let timerSeconds = 0;
  if (preset === 'custom') {
    timerSeconds = Math.max(1, parseInt(document.getElementById('customSecondsInput').value, 10) || 60);
  } else {
    timerSeconds = parseInt(preset, 10);
  }

  if (editId) {
    const taskIdx = tasksData.findIndex(t => t.id === editId);
    if (taskIdx !== -1) {
      tasksData[taskIdx] = {
        ...tasksData[taskIdx],
        title,
        link,
        verificationCode,
        code: verificationCode,
        icon,
        reward,
        description: desc,
        timerSeconds,
        active,
        updatedAt: Date.now()
      };
      saveTasksAndSync(`✓ Task "${title}" updated! Pushed to players.`);
      logActivity(`Admin updated task: "${title}" (Link: ${link}, Code: ${verificationCode}, +${reward} 🪙)`);
    }
  } else {
    const newId = `task_${Date.now()}`;
    const newTask = {
      id: newId,
      title,
      link,
      verificationCode,
      code: verificationCode,
      icon,
      reward,
      description: desc,
      timerSeconds,
      active,
      createdAt: Date.now()
    };
    tasksData.push(newTask);
    saveTasksAndSync(`✓ New task "${title}" created!`);
    logActivity(`Admin created new task: "${title}" (Link: ${link}, Code: ${verificationCode}, +${reward} 🪙)`);
  }

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
        <button class="btn-table-action btn-approve" onclick="openApproveModal('${w.id}')" title="Approve with Security Code 1109">
          ✅ Approve (1109)
        </button>
        <button class="btn-table-action btn-reject" onclick="rejectWithdrawal('${w.id}')" title="Reject and refund">
          ❌ Reject
        </button>
      `;
    } else if (w.status === 'approved') {
      actionButtons = `
        <span style="font-size: 0.72rem; color: #34d399; font-weight: 800; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 0.2rem 0.5rem; border-radius: 6px;">
          ✅ Code 1109 Verified
        </span>
        <button class="btn-table-action" onclick="deleteWithdrawal('${w.id}')" title="Delete request record">🗑️</button>
      `;
    } else {
      actionButtons = `
        <span style="font-size: 0.72rem; color: #f87171; font-weight: 800; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.2rem 0.5rem; border-radius: 6px;">
          ❌ Rejected
        </span>
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
          <div style="display: flex; gap: 0.4rem; align-items: center;">
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
    approveWithdrawalWithPrompt(reqId);
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

function approveWithdrawalWithPrompt(reqId) {
  const req = withdrawalsData.find(w => w.id === reqId);
  if (!req) return;

  const voucherUrl = prompt(`🔗 Optional: Add Delivery / Voucher / Reward Link for player to claim (or leave blank):\n(e.g. https://example.com/voucher/claim...)`, req.deliveryLink || req.link || '');
  if (voucherUrl === null) return;

  const enteredCode = prompt(`🔐 Security Verification Required!\nEnter Admin Approval Code (Code: 1109) to approve cashout #${req.id} for ₹${Number(req.amount).toLocaleString()} (${req.playerName}):`);

  if (enteredCode === null) return;

  if (enteredCode.trim() !== '1109') {
    alert('❌ Invalid Approval Code! Verification failed. Cashout request NOT approved.\n(Required approval code is: 1109)');
    showToast('Invalid security code! Approval cancelled.', 'error');
    return;
  }

  req.status = 'approved';
  req.approvedAt = Date.now();
  req.approvedWithCode = '1109';
  if (voucherUrl.trim()) {
    let cleanLink = voucherUrl.trim();
    if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      cleanLink = 'https://' + cleanLink;
    }
    req.deliveryLink = cleanLink;
    req.link = cleanLink;
  }
  saveWithdrawalsAndSync();
  logActivity(`Admin approved cashout #${req.id} for ${req.playerName} (₹${req.amount}) with link using code 1109`);
  showToast(`✅ Withdrawal #${req.id} approved for ₹${req.amount}! (Code 1109 Verified)`, 'success');
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

  // If this is the active frontend user (usr_1), update frontend localStorage!
  if (userId === 'usr_1') {
    localStorage.setItem('task_game_coins', coins.toString());
    localStorage.setItem('task_game_stars', stars.toString());
    if (syncChannel) {
      syncChannel.postMessage({ type: 'COINS_UPDATED', coins: coins, stars: stars });
    }
  }

  saveUsersAndSync();
  closeUserEditModal();
  logActivity(`Admin updated balance for ${user.name}: ${coins.toLocaleString()} 🪙, ${stars.toLocaleString()} ⭐`);
  showToast(`✓ Player ${user.name} balance updated!`, 'success');
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
  });

  // Also give to active player
  let playerCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  playerCoins += amount;
  localStorage.setItem('task_game_coins', playerCoins.toString());

  if (syncChannel) {
    syncChannel.postMessage({ type: 'COINS_UPDATED', coins: playerCoins });
  }

  saveUsersAndSync();
  logActivity(`Admin sent +${amount.toLocaleString()} 🪙 community bounty to all players.`);
  showToast(`🎉 Sent +${amount.toLocaleString()} coins bonus to all players!`, 'success');
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
// 9.5 LEADERBOARD EVENT & 100-TASK QUALIFICATION ADMIN MANAGEMENT
// ============================================================================

const EVENT_STORAGE_KEY = 'task_game_leaderboard_event';
const EVENT_TASKS_KEY = 'task_game_event_tasks_count';
const TOTAL_TASKS_KEY = 'task_game_total_tasks_completed';

const GLOBAL_EPOCH_ANCHOR = Date.UTC(2026, 9, 1, 0, 0, 0); // Oct 1, 2026 00:00:00 UTC
const THREE_MONTHS_HOURS = 2160;
const THREE_MONTHS_DAYS = 90;
const THREE_MONTHS_MS = THREE_MONTHS_HOURS * 60 * 60 * 1000;

function getAdminLeaderboardEvent() {
  let customEvt = null;
  try {
    const raw = localStorage.getItem(EVENT_STORAGE_KEY);
    if (raw) customEvt = JSON.parse(raw);
  } catch (e) {}

  const now = Date.now();

  // If a manual override is active and has not expired, respect it
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
    name: `Season ${seasonNumber}: 3-Month Championship (21,500 ⭐ Prize Pool)`,
    startTime: startTime,
    endTime: endTime,
    durationHours: THREE_MONTHS_HOURS,
    durationDays: THREE_MONTHS_DAYS,
    status: 'active',
    isGlobal: true
  };

  // Rollover check: If stored event is from an older season, reset task counters to zero
  if (customEvt && customEvt.seasonNumber && customEvt.seasonNumber < seasonNumber) {
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
    } catch (e) {}
  }

  try {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(globalEvt));
  } catch (e) {}

  return globalEvt;
}

function renderAdminEventSection() {
  const evt = getAdminLeaderboardEvent();
  const now = Date.now();
  const remaining = evt.endTime - now;

  const statusEl = document.getElementById('adminEventStatusText');
  const nameEl = document.getElementById('adminEventNameDisplay');
  const clockEl = document.getElementById('adminEventCountdownText');
  const navEvt = document.getElementById('navEventStatusBadge');

  const isEnded = (remaining <= 0) || (evt.status === 'finished');

  if (statusEl) {
    statusEl.textContent = isEnded ? 'FINISHED' : 'ACTIVE';
    statusEl.className = isEnded ? 'metric-value text-red' : 'metric-value text-emerald';
  }
  if (nameEl) nameEl.textContent = evt.name || 'Season 1: 3-Month Championship';
  if (navEvt) {
    navEvt.textContent = isEnded ? 'ENDED' : 'ACTIVE';
    navEvt.className = isEnded ? 'nav-counter badge-amber' : 'nav-counter';
  }

  if (clockEl) {
    if (remaining <= 0) clockEl.textContent = '00:00:00 (ENDED)';
    else clockEl.textContent = formatAdminCountdown(remaining);
  }

  const titleInput = document.getElementById('adminEventTitleInput');
  if (titleInput && !titleInput.matches(':focus') && evt.name) {
    titleInput.value = evt.name;
  }
  const durationSelect = document.getElementById('adminEventDurationSelect');
  if (durationSelect && !durationSelect.matches(':focus') && evt.durationHours) {
    durationSelect.value = String(evt.durationHours);
  }

  loadAllStoredData();
  let users = [...usersData];

  const myTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
  const myEventTasks = parseInt(localStorage.getItem(EVENT_TASKS_KEY) || '0', 10);
  const myCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  const myStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  const myName = localStorage.getItem('player_username') || 'Task Earner';

  let me = users.find(u => u.id === 'usr_1' || u.name === myName || u.name === 'Task Earner' || u.name === 'NovaEarner');
  if (me) {
    me.totalTasks = myTotalTasks;
    me.eventTasks = myEventTasks;
    me.coins = myCoins;
    me.stars = myStars;
  } else {
    users.unshift({
      id: 'usr_1',
      name: myName,
      avatar: '⚡',
      level: 'RANK #1',
      coins: myCoins,
      stars: myStars,
      totalTasks: myTotalTasks,
      eventTasks: myEventTasks,
      status: 'active'
    });
  }

  let qualifiedCount = 0;
  let unqualifiedCount = 0;
  let sumEventTasks = 0;

  users.forEach(u => {
    const tot = Number(u.totalTasks !== undefined ? u.totalTasks : (u.id === 'usr_1' ? myTotalTasks : 0));
    const ev = Number(u.eventTasks || 0);
    sumEventTasks += ev;
    if (tot >= 100) qualifiedCount++;
    else unqualifiedCount++;
  });

  const totTasksEl = document.getElementById('adminTotalEventTasks');
  if (totTasksEl) totTasksEl.textContent = sumEventTasks.toLocaleString();

  const qualEl = document.getElementById('adminQualifiedPlayersCount');
  if (qualEl) qualEl.textContent = `${qualifiedCount} Players`;

  const unqualEl = document.getElementById('adminUnqualifiedPlayersCount');
  if (unqualEl) unqualEl.textContent = `${unqualifiedCount} Locked (<100 tasks)`;

  const counterEl = document.getElementById('adminEventTableCounter');
  if (counterEl) counterEl.textContent = `${users.length} Players`;

  // Render Table Rows
  const tbody = document.getElementById('adminEventPlayersTableBody');
  if (tbody) {
    tbody.innerHTML = users.map(u => {
      const isCurrentPlayer = (u.id === 'usr_1' || u.name === myName || u.name === 'Task Earner' || u.name === 'NovaEarner');
      const totTasks = Number(u.totalTasks !== undefined ? u.totalTasks : (isCurrentPlayer ? myTotalTasks : 0));
      const evTasks = Number(isCurrentPlayer ? myEventTasks : (u.eventTasks || 0));
      const isQualified = totTasks >= 100;

      const qualBadge = isQualified
        ? `<span class="badge-tag badge-active" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">✅ QUALIFIED (≥100)</span>`
        : `<span class="badge-tag badge-pending" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4);">🔒 LOCKED (<100)</span>`;

      const statusBadge = isQualified
        ? `<span style="color: #38bdf8; font-weight: 700; font-size: 0.8rem;">● In Leaderboard Ranks</span>`
        : `<span style="color: #64748b; font-weight: 600; font-size: 0.8rem;">○ Hidden from Ranks</span>`;

      return `
        <tr>
          <td>
            <div class="user-cell">
              <span class="user-avatar-small">${escapeHtml(u.avatar || '👤')}</span>
              <div class="user-info-meta">
                <span class="user-name-cell">${escapeHtml(u.name)} ${isCurrentPlayer ? '<strong style="color: #38bdf8;">(YOU)</strong>' : ''}</span>
                <span class="user-level-sub">${escapeHtml(u.level || 'Player')}</span>
              </div>
            </div>
          </td>
          <td>
            <strong style="color: ${isQualified ? '#34d399' : '#fbbf24'}; font-size: 0.95rem;">${totTasks} Tasks</strong>
          </td>
          <td>
            <strong style="color: #38bdf8; font-size: 0.95rem;">${evTasks} 🎯</strong>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 3px;">
              ${qualBadge}
              ${statusBadge}
            </div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fbbf24;">${Number(u.coins || 0).toLocaleString()} 🪙</div>
            <div style="font-size: 0.72rem; color: #facc15;">${Number(u.stars || 0).toLocaleString()} ⭐</div>
          </td>
          <td>
            <div class="table-actions-row">
              ${isCurrentPlayer ? `
                <button class="btn-table-action" onclick="adminQuickSetUserTasks(100)" title="Set to 100 tasks">
                  <span>Qualify (100)</span>
                </button>
                <button class="btn-table-action" onclick="adminQuickSetUserTasks(0)" title="Set to 0 tasks">
                  <span>Lock (0)</span>
                </button>
              ` : `
                <button class="btn-table-action" onclick="adminAwardUserEventTasks('${u.id}', 5)" title="Add +5 Event Tasks">
                  <span>+5 Tasks</span>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function formatAdminCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function adminRestartLeaderboardEvent(durationHours = 2160, newTitle = null) {
  if (!confirm('🔄 Restart Leaderboard Event?\n\nThis will remove old event data, reset the task counters to 0 for all players, and start a fresh 3-Month event window.')) {
    return;
  }

  const now = Date.now();
  const dur = Number(durationHours) || 2160;
  const currentEvt = getAdminLeaderboardEvent();
  const title = newTitle || (document.getElementById('adminEventTitleInput') ? document.getElementById('adminEventTitleInput').value.trim() : null) || currentEvt.name || 'Season 1: 3-Month Championship';

  // 1. Remove old event task data & restart task counter to 0
  localStorage.setItem(EVENT_TASKS_KEY, '0');

  // 2. Wipe event tasks in users list to restart from 0
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        users.forEach(u => { u.eventTasks = 0; });
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }
  } catch (e) {}

  // 3. New event window (Global timer)
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
  localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(newEvt));

  // Sync to Firebase Firestore cloud so all players' devices update immediately
  if (window.Firebase && typeof window.Firebase.saveGlobalLeaderboardEventToCloud === 'function') {
    window.Firebase.saveGlobalLeaderboardEventToCloud(newEvt).catch(() => {});
  }

  // 4. Broadcast to clients
  if (syncChannel) {
    syncChannel.postMessage({ type: 'EVENT_RESTART', event: newEvt, timestamp: now });
  }

  renderCurrentPage();
  showToast(`Leaderboard Event restarted! Task counters reset to 0. Duration: ${dur} Hours. Global timer synced.`, 'success');
}

function adminSaveAndRestartEvent() {
  const titleInput = document.getElementById('adminEventTitleInput');
  const durSelect = document.getElementById('adminEventDurationSelect');
  const title = titleInput ? titleInput.value.trim() : 'Season 1: 3-Month Championship (21,500 ⭐ Prize Pool)';
  const dur = durSelect ? parseInt(durSelect.value, 10) : 2160;

  adminRestartLeaderboardEvent(dur, title);
}

function adminEndLeaderboardEvent() {
  if (!confirm('🏁 End Leaderboard Event now?\n\nThis will set the event status to FINISHED, clear old event tasks, and reset task counters to 0.')) {
    return;
  }
  const evt = getAdminLeaderboardEvent();
  evt.status = 'finished';
  localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(evt));
  localStorage.setItem(EVENT_TASKS_KEY, '0');

  // Clear old event data from all users in pool
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        users.forEach(u => { u.eventTasks = 0; });
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }
  } catch (e) {}

  if (window.Firebase && typeof window.Firebase.saveGlobalLeaderboardEventToCloud === 'function') {
    window.Firebase.saveGlobalLeaderboardEventToCloud(evt).catch(() => {});
  }

  if (syncChannel) {
    syncChannel.postMessage({ type: 'EVENT_FINISHED', timestamp: Date.now() });
  }
  renderCurrentPage();
  showToast('Leaderboard Event finished. Old event data cleared & task counter reset to 0.', 'info');
}

function adminQuickSetUserTasks(num) {
  const count = Number(num) || 0;
  localStorage.setItem(TOTAL_TASKS_KEY, count.toString());

  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      const myName = localStorage.getItem('player_username') || 'Task Earner';
      const me = users.find(u => u.id === 'usr_1' || u.name === myName || u.name === 'Task Earner' || u.name === 'NovaEarner');
      if (me) {
        me.totalTasks = count;
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }
  } catch (e) {}

  if (syncChannel) {
    syncChannel.postMessage({ type: 'TASKS_QUALIFICATION_CHANGED', totalTasks: count });
  }

  renderCurrentPage();
  showToast(count >= 100 ? `Player tasks set to ${count}! (QUALIFIED for Leaderboard)` : `Player tasks set to ${count}! (LOCKED from Leaderboard)`, 'success');
}

function adminSimulateEventTask() {
  const current = parseInt(localStorage.getItem(EVENT_TASKS_KEY) || '0', 10) + 1;
  const tot = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10) + 1;
  localStorage.setItem(EVENT_TASKS_KEY, current.toString());
  localStorage.setItem(TOTAL_TASKS_KEY, tot.toString());

  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      const myName = localStorage.getItem('player_username') || 'Task Earner';
      const me = users.find(u => u.id === 'usr_1' || u.name === myName || u.name === 'Task Earner' || u.name === 'NovaEarner');
      if (me) {
        me.eventTasks = current;
        me.totalTasks = tot;
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }
  } catch (e) {}

  if (syncChannel) {
    syncChannel.postMessage({ type: 'EVENT_TASK_COUNT', count: current, totalTasks: tot });
  }

  renderCurrentPage();
  showToast(`Simulated +1 task claim (Total: ${tot}, Event: ${current})`, 'info');
}

function adminAwardUserEventTasks(userId, num) {
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      const target = users.find(u => u.id === userId);
      if (target) {
        target.eventTasks = (Number(target.eventTasks) || 0) + Number(num);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        if (syncChannel) syncChannel.postMessage({ type: 'USERS_UPDATED' });
        renderCurrentPage();
        showToast(`Awarded +${num} event tasks to ${target.name}!`, 'success');
      }
    }
  } catch (e) {}
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
  if (window.Firebase && typeof window.Firebase.listenToCloudTasks === 'function') {
    window.Firebase.listenToCloudTasks((tasks) => {
      loadAllStoredData();
      renderCurrentPage();
    });
  }
}

window.addEventListener('firebase:ready', () => {
  setupCloudTaskListener();
});

function checkAuthStatus() {
  const isAuth = sessionStorage.getItem('admin_authenticated') === 'true' || localStorage.getItem('admin_authenticated') === 'true';
  const loginOverlay = document.getElementById('adminLoginScreen');
  const dashView = document.getElementById('adminDashboardView');

  if (isAuth) {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (dashView) dashView.style.display = 'flex';
    initDashboard();
  } else {
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (dashView) dashView.style.display = 'none';
  }
}

function handleAdminLogin(e) {
  if (e) e.preventDefault();
  const userInput = document.getElementById('adminUsernameInput');
  const passInput = document.getElementById('adminPasswordInput');
  const errBox = document.getElementById('loginErrorMessage');
  const errText = document.getElementById('loginErrorText');

  const rawUser = userInput ? userInput.value.trim() : '';
  const rawPass = passInput ? passInput.value : '';

  const normalizedUser = rawUser.replace(/\s+/g, ' ');
  const compactUser = rawUser.replace(/\s+/g, '');

  const isUserValid = (normalizedUser === '400 @123' || compactUser === '400@123');
  const isPassValid = (rawPass === '0911');

  if (isUserValid && isPassValid) {
    sessionStorage.setItem('admin_authenticated', 'true');
    localStorage.setItem('admin_authenticated', 'true');
    if (errBox) errBox.style.display = 'none';
    showToast('Administrator verified! Welcome to Mission Control.', 'success');
    checkAuthStatus();
  } else {
    if (errBox) {
      errBox.style.display = 'flex';
      if (errText) errText.textContent = 'Invalid administrator credentials. Access denied!';
    }
    if (passInput) {
      passInput.value = '';
      passInput.focus();
    }
  }
}

function quickFillCredentials() {
  const userInput = document.getElementById('adminUsernameInput');
  const passInput = document.getElementById('adminPasswordInput');
  if (userInput) userInput.value = '400 @123';
  if (passInput) passInput.value = '0911';
  const errBox = document.getElementById('loginErrorMessage');
  if (errBox) errBox.style.display = 'none';
}

function handleAdminLogout() {
  sessionStorage.removeItem('admin_authenticated');
  localStorage.removeItem('admin_authenticated');
  const loginOverlay = document.getElementById('adminLoginScreen');
  const dashView = document.getElementById('adminDashboardView');
  if (loginOverlay) loginOverlay.style.display = 'flex';
  if (dashView) dashView.style.display = 'none';
  showToast('Logged out of Admin Console.', 'info');
}

window.checkAuthStatus = checkAuthStatus;
window.handleAdminLogin = handleAdminLogin;
window.quickFillCredentials = quickFillCredentials;
window.handleAdminLogout = handleAdminLogout;
window.openApproveModal = openApproveModal;
window.closeWithdrawApproveModal = closeWithdrawApproveModal;
window.handleConfirmApproveWithdrawal = handleConfirmApproveWithdrawal;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.deleteWithdrawal = deleteWithdrawal;

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
