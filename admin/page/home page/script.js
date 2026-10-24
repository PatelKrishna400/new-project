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

  // Update Navigation Active Class (3 Tabs: tasks, users, withdraw)
  const navItems = {
    tasks: document.getElementById('navItemTasks'),
    users: document.getElementById('navItemUsers'),
    withdraw: document.getElementById('navItemWithdraw')
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
    withdraw: 'Wallet Requests'
  };
  if (breadcrumb) breadcrumb.textContent = names[pageKey] || 'Tasks';

  // Show Active Page Section
  const pages = {
    tasks: document.getElementById('pageSectionTasks'),
    users: document.getElementById('pageSectionUsers'),
    withdraw: document.getElementById('pageSectionWithdraw')
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
    parsedUsers = parsedUsers.filter(u => u && !['usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6', 'usr_7', 'usr_8', 'usr_9', 'usr_10', 'usr_11', 'usr_12', 'usr_13', 'usr_14', 'usr_15', 'usr_16', 'usr_17', 'usr_18', 'usr_19', 'usr_20', 'usr_21'].includes(u.id) && u.name !== 'VortexTyper' && u.name !== 'CyberKey');

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
}

function openCreateModal() {
  document.getElementById('editTaskId').value = '';
  document.getElementById('modalTitleText').textContent = 'Add New Task';
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

function approveWithdrawal(reqId) {
  const req = withdrawalsData.find(w => w.id === reqId);
  if (!req) return;

  const enteredCode = prompt(`🔐 Security Verification Required!\nEnter Admin Approval Code (Code: 1109) to approve cashout #${req.id} for ₹${Number(req.amount).toLocaleString()} (${req.playerName}):`);

  if (enteredCode === null) {
    // Admin clicked cancel
    return;
  }

  if (enteredCode.trim() !== '1109') {
    alert('❌ Invalid Approval Code! Verification failed. Cashout request NOT approved.\n(Required approval code is: 1109)');
    showToast('Invalid security code! Approval cancelled.', 'error');
    return;
  }

  req.status = 'approved';
  req.approvedAt = Date.now();
  saveWithdrawalsAndSync();
  logActivity(`Admin approved cashout #${req.id} for ${req.playerName} (₹${req.amount}) using code 1109`);
  showToast(`✅ Withdrawal #${req.id} approved for ₹${req.amount}!`, 'success');
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
