// Profile & Admin Portal Script
// Credentials: Username: 400 @123 | Password: 0911 (Masked, not shown on UI)

const SF_STORAGE_KEY = 'ENERGY_TAP_SUNFLOWER_STATE_V4';
const TASKS_STORAGE_KEY = 'task_game_tasks';
const CLAIMS_STORAGE_KEY = 'task_game_claims';
const WITHDRAW_STORAGE_KEY = 'task_game_withdrawals';
const USERS_STORAGE_KEY = 'task_game_users';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';
const TOTAL_TASKS_KEY = 'task_game_total_tasks';
const EVENT_TASKS_KEY = 'task_game_event_tasks';

// Clean zero start - No mock users or fake withdrawals
const DEFAULT_USERS = [];
const DEFAULT_WITHDRAWALS = [];

// Storage sanitization to purge legacy demo data and start everything from 0
try {
  const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (rawUsers && (rawUsers.includes('VortexTyper') || rawUsers.includes('CyberKey') || rawUsers.includes('42850') || rawUsers.includes('usr_2'))) {
    localStorage.removeItem(USERS_STORAGE_KEY);
  }
  const rawWd = localStorage.getItem(WITHDRAW_STORAGE_KEY);
  if (rawWd && (rawWd.includes('WD-8491') || rawWd.includes('WD-8490') || rawWd.includes('AMZN-7492'))) {
    localStorage.removeItem(WITHDRAW_STORAGE_KEY);
  }
} catch (e) {}

// Ensure all balances and task counters start at 0
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
if (localStorage.getItem('task_game_stars') === '850' || !localStorage.getItem('task_game_stars')) {
  localStorage.setItem('task_game_stars', '0');
}
if (!localStorage.getItem(TOTAL_TASKS_KEY)) {
  localStorage.setItem(TOTAL_TASKS_KEY, '0');
}
if (!localStorage.getItem('task_game_total_tasks_completed')) {
  localStorage.setItem('task_game_total_tasks_completed', '0');
}
if (!localStorage.getItem('task_game_ads_watched_count')) {
  localStorage.setItem('task_game_ads_watched_count', '0');
}
if (!localStorage.getItem(EVENT_TASKS_KEY)) {
  localStorage.setItem(EVENT_TASKS_KEY, '0');
}
if (!localStorage.getItem('task_game_event_tasks_count')) {
  localStorage.setItem('task_game_event_tasks_count', '0');
}

// Global active tab state ('profile' | 'admin')
let activeProfileTab = 'profile';
let currentAdminSubView = 'tasks';
let tasksData = [];
let withdrawalsData = [];
let usersData = [];
let currentWdFilter = 'all';
let adminEventInterval = null;
let syncChannel = null;

// Initialize BroadcastChannel
try {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  syncChannel.onmessage = (event) => {
    loadAllAdminData();
    renderCurrentAdminSubView();
  };
} catch (e) {
  console.warn('BroadcastChannel not supported');
}

/**
 * Check if admin session is currently authenticated
 */
function isAdminLoggedIn() {
  return sessionStorage.getItem('admin_authenticated') === 'true' || localStorage.getItem('admin_authenticated') === 'true';
}

/**
 * Switch top tabs between Profile and Admin
 * Swaps bottom menu bar dynamically between player navigation (#belowMenuBar)
 * and admin navigation (#adminMenuBar)
 * @param {'profile'|'admin'} tabName
 */
function switchProfileTab(tabName) {
  activeProfileTab = tabName;

  const tabBtnProfile = document.getElementById('tabBtnProfile');
  const tabBtnAdmin = document.getElementById('tabBtnAdmin');
  const panelUserProfile = document.getElementById('panelUserProfile');
  const panelAdminLogin = document.getElementById('panelAdminLogin');
  const panelAdminDashboard = document.getElementById('panelAdminDashboard');
  const adminStatusTag = document.getElementById('adminStatusTag');
  const belowMenuBar = document.getElementById('belowMenuBar');
  const adminMenuBar = document.getElementById('adminMenuBar');

  if (tabName === 'profile') {
    if (tabBtnProfile) tabBtnProfile.classList.add('active');
    if (tabBtnAdmin) tabBtnAdmin.classList.remove('active');

    if (panelUserProfile) panelUserProfile.style.display = 'block';
    if (panelAdminLogin) panelAdminLogin.style.display = 'none';
    if (panelAdminDashboard) panelAdminDashboard.style.display = 'none';

    // Show Player Bottom Menu Bar, Hide Admin Menu Bar
    if (belowMenuBar) belowMenuBar.style.display = 'flex';
    if (adminMenuBar) adminMenuBar.style.display = 'none';
  } else if (tabName === 'admin') {
    if (tabBtnAdmin) tabBtnAdmin.classList.add('active');
    if (tabBtnProfile) tabBtnProfile.classList.remove('active');

    if (panelUserProfile) panelUserProfile.style.display = 'none';

    if (isAdminLoggedIn()) {
      if (panelAdminLogin) panelAdminLogin.style.display = 'none';
      if (panelAdminDashboard) panelAdminDashboard.style.display = 'flex';
      if (adminStatusTag) adminStatusTag.textContent = '🔓';

      // Hide Player Bottom Menu Bar, Show Admin Bottom Menu Bar
      if (belowMenuBar) belowMenuBar.style.display = 'none';
      if (adminMenuBar) adminMenuBar.style.display = 'flex';

      loadAllAdminData();
      switchAdminSubView('tasks');
      updateAdminLiveDisplays();
    } else {
      if (panelAdminLogin) panelAdminLogin.style.display = 'block';
      if (panelAdminDashboard) panelAdminDashboard.style.display = 'none';
      if (adminStatusTag) adminStatusTag.textContent = '🔒';

      // Keep Player Menu visible or hide until logged in
      if (belowMenuBar) belowMenuBar.style.display = 'flex';
      if (adminMenuBar) adminMenuBar.style.display = 'none';

      const userInput = document.getElementById('adminUsername');
      if (userInput) userInput.focus();
    }
  }
}

/**
 * Handle Admin Secure Login
 * Accepts username '400 @123' (and space-trimmed '400@123') and password '0911'
 */
function handleAdminLogin(event) {
  event.preventDefault();

  const userField = document.getElementById('adminUsername');
  const passField = document.getElementById('adminPassword');
  const errBox = document.getElementById('adminLoginError');

  const rawUser = userField ? userField.value.trim() : '';
  const rawPass = passField ? passField.value : '';

  // Normalize user input to match 400 @123 (allowing single space, no space, or multi-space)
  const normalizedUser = rawUser.replace(/\s+/g, ' ');
  const compactUser = rawUser.replace(/\s+/g, '');

  const isUserValid = (normalizedUser === '400 @123' || compactUser === '400@123');
  const isPassValid = (rawPass === '0911');

  if (isUserValid && isPassValid) {
    if (errBox) errBox.style.display = 'none';

    // Set authenticated session flag
    sessionStorage.setItem('admin_authenticated', 'true');
    localStorage.setItem('admin_authenticated', 'true');

    // Reset login form
    const form = document.getElementById('adminLoginForm');
    if (form) form.reset();

    // Transition to Dashboard in SAME mobile layout
    const panelAdminLogin = document.getElementById('panelAdminLogin');
    const panelAdminDashboard = document.getElementById('panelAdminDashboard');
    const panelUserProfile = document.getElementById('panelUserProfile');
    const adminStatusTag = document.getElementById('adminStatusTag');
    const belowMenuBar = document.getElementById('belowMenuBar');
    const adminMenuBar = document.getElementById('adminMenuBar');

    if (panelUserProfile) panelUserProfile.style.display = 'none';
    if (panelAdminLogin) panelAdminLogin.style.display = 'none';
    if (panelAdminDashboard) panelAdminDashboard.style.display = 'flex';
    if (adminStatusTag) adminStatusTag.textContent = '🔓';

    // Swap Menu Bar to Admin Menu Bar
    if (belowMenuBar) belowMenuBar.style.display = 'none';
    if (adminMenuBar) adminMenuBar.style.display = 'flex';

    loadAllAdminData();
    switchAdminSubView('tasks');
    updateAdminLiveDisplays();
    showToast('Root administrator authenticated! Mobile Control Panel Ready.');
  } else {
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = '⚠️ Invalid admin username or password. Access denied!';
    }
    if (passField) {
      passField.value = '';
      passField.focus();
    }
  }
}

/**
 * Exit Admin Control Panel cleanly and return to Player Profile view
 */
function exitAdminToProfile() {
  switchProfileTab('profile');
  showToast('Exited Admin Control Portal. Back to Profile.');
}

/**
 * Fast Auto-Fill for Credentials
 */
function quickFillProfileAdmin() {
  const userField = document.getElementById('adminUsername');
  const passField = document.getElementById('adminPassword');
  if (userField) userField.value = '400 @123';
  if (passField) passField.value = '0911';
  const errBox = document.getElementById('adminLoginError');
  if (errBox) errBox.style.display = 'none';
}

/**
 * Sign out of Admin session
 */
function adminLogout() {
  sessionStorage.removeItem('admin_authenticated');
  localStorage.removeItem('admin_authenticated');

  const panelAdminLogin = document.getElementById('panelAdminLogin');
  const panelAdminDashboard = document.getElementById('panelAdminDashboard');
  const adminStatusTag = document.getElementById('adminStatusTag');
  const errBox = document.getElementById('adminLoginError');
  const belowMenuBar = document.getElementById('belowMenuBar');
  const adminMenuBar = document.getElementById('adminMenuBar');

  if (panelAdminDashboard) panelAdminDashboard.style.display = 'none';
  if (panelAdminLogin) panelAdminLogin.style.display = 'block';
  if (adminStatusTag) adminStatusTag.textContent = '🔒';
  if (errBox) errBox.style.display = 'none';

  // Restore player bottom bar
  if (adminMenuBar) adminMenuBar.style.display = 'none';
  if (belowMenuBar) belowMenuBar.style.display = 'flex';

  showToast('Admin signed out.');
}

/**
 * Switch Admin subviews menu-bar-wise
 * @param {'tasks'|'users'|'withdraw'|'event'} viewKey
 */
function switchAdminSubView(viewKey) {
  currentAdminSubView = viewKey;

  const views = {
    tasks: document.getElementById('adminSubTasks'),
    users: document.getElementById('adminSubUsers'),
    withdraw: document.getElementById('adminSubWithdraw'),
    event: document.getElementById('adminSubEvent')
  };

  const menuBtns = {
    tasks: document.getElementById('adminMenuTasks'),
    users: document.getElementById('adminMenuUsers'),
    withdraw: document.getElementById('adminMenuWithdraw'),
    event: document.getElementById('adminMenuEvent')
  };

  const titles = {
    tasks: 'Edit Task & Missions',
    users: 'All Registered Players',
    withdraw: 'Wallet Withdrawal Requests',
    event: 'Global 3-Month Championship'
  };

  // Update title
  const titleEl = document.getElementById('adminActivePageTitle');
  if (titleEl) titleEl.textContent = titles[viewKey] || 'Admin Control Panel';

  // Toggle view visibility
  Object.keys(views).forEach(key => {
    if (views[key]) {
      views[key].style.display = (key === viewKey) ? 'block' : 'none';
    }
  });

  // Toggle active button style on admin menu bar
  Object.keys(menuBtns).forEach(key => {
    if (menuBtns[key]) {
      if (key === viewKey) menuBtns[key].classList.add('active');
      else menuBtns[key].classList.remove('active');
    }
  });

  renderCurrentAdminSubView();
}

/**
 * Render the currently selected admin subview
 */
function renderCurrentAdminSubView() {
  if (currentAdminSubView === 'tasks') renderAdminTasksList();
  else if (currentAdminSubView === 'users') renderAdminUsersList();
  else if (currentAdminSubView === 'withdraw') renderAdminWithdrawalsList();
  else if (currentAdminSubView === 'event') renderAdminEventSection();
}

/**
 * Load all stored data from localStorage
 */
function loadAllAdminData() {
  // 1. Tasks
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    tasksData = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(tasksData)) tasksData = [];
  } catch (e) {
    tasksData = [];
  }

  // 2. Users (Clean zero start, no mock pool)
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    let parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) parsed = [];

    // Filter out any mock users
    parsed = parsed.filter(u => u && !['usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6', 'usr_7', 'usr_8', 'usr_9', 'usr_10', 'usr_11', 'usr_12', 'usr_13', 'usr_14', 'usr_15', 'usr_16', 'usr_17', 'usr_18', 'usr_19', 'usr_20', 'usr_21'].includes(u.id) && u.name !== 'VortexTyper' && u.name !== 'CyberKey');

    // Sync live player values into usr_1
    const pCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
    const pStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
    const pName = localStorage.getItem('player_username') || 'Player';
    const pAvatar = localStorage.getItem('player_avatar') || '⚡';
    const pTotalTasks = parseInt(localStorage.getItem(TOTAL_TASKS_KEY) || '0', 10);
    const pEventTasks = parseInt(localStorage.getItem(EVENT_TASKS_KEY) || '0', 10);

    let usr1 = parsed.find(u => u.id === 'usr_1' || u.name === pName);
    if (!usr1) {
      usr1 = {
        id: "usr_1",
        name: pName,
        avatar: pAvatar,
        level: "LVL 1 • NOVICE",
        coins: pCoins,
        stars: pStars,
        totalTasks: pTotalTasks,
        eventTasks: pEventTasks,
        status: "active",
        joined: "Today"
      };
      parsed.unshift(usr1);
    } else {
      usr1.name = pName;
      usr1.avatar = pAvatar;
      usr1.coins = pCoins;
      usr1.stars = pStars;
      usr1.totalTasks = pTotalTasks;
      usr1.eventTasks = pEventTasks;
    }
    usersData = parsed;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersData));
  } catch (e) {
    usersData = [];
  }

  // 3. Withdrawals (Clean zero start, no mock records)
  try {
    const raw = localStorage.getItem(WITHDRAW_STORAGE_KEY);
    let parsedWd = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsedWd)) parsedWd = [];
    withdrawalsData = parsedWd.filter(w => w && !['WD-8491', 'WD-8490', 'WD-8489', 'WD-8488'].includes(w.id));
    localStorage.setItem(WITHDRAW_STORAGE_KEY, JSON.stringify(withdrawalsData));
  } catch (e) {
    withdrawalsData = [];
  }

  updateAdminCounters();
}

/**
 * Update badge counts on Admin Menu Bar
 */
function updateAdminCounters() {
  const taskCount = document.getElementById('adminMenuTaskCount');
  if (taskCount) taskCount.textContent = tasksData.length.toString();

  const userCount = document.getElementById('adminMenuUserCount');
  if (userCount) userCount.textContent = usersData.length.toString();

  const pendingWd = withdrawalsData.filter(w => w.status === 'pending');
  const wdCount = document.getElementById('adminMenuPendingCount');
  if (wdCount) {
    wdCount.textContent = pendingWd.length.toString();
    wdCount.style.display = pendingWd.length > 0 ? 'inline-block' : 'none';
  }
}

// -----------------------------------------------------------------------------
// 1. EDIT TASKS SUBVIEW LOGIC
// -----------------------------------------------------------------------------

function renderAdminTasksList() {
  const container = document.getElementById('adminTasksList');
  if (!container) return;

  const searchVal = (document.getElementById('adminTaskSearch')?.value || '').toLowerCase().trim();
  let list = [...tasksData];
  if (searchVal) {
    list = list.filter(t => (t.title && t.title.toLowerCase().includes(searchVal)) || (t.category && t.category.toLowerCase().includes(searchVal)));
  }

  updateAdminCounters();

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: #94a3b8; font-size: 0.85rem; background: #0a1738; border-radius: 14px; border: 1px dashed rgba(56, 189, 248, 0.25);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📋</div>
        <div style="font-weight: 800; color: #ffffff; margin-bottom: 0.25rem;">${searchVal ? 'No tasks match search' : 'No Missions Created Yet'}</div>
        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.75rem;">Create missions to publish them live to all players immediately.</div>
        <button class="btn-card-action" onclick="openCreateTaskModal()">＋ Add Mission Now</button>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(task => {
    const catIcons = {
      youtube: '📺 YouTube',
      telegram: '✈️ Telegram',
      partner: '🤝 Partner',
      website: '🌐 WebTask',
      app: '📱 App',
      daily: '📅 Daily'
    };
    const catLabel = catIcons[task.category] || '⚡ Mission';
    const isActive = task.active !== false;

    return `
      <div class="admin-task-card" style="border-left: 3.5px solid ${isActive ? '#38bdf8' : '#64748b'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
          <div>
            <span style="font-size: 0.65rem; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 2px 7px; border-radius: 6px;">${catLabel}</span>
            <h4 style="font-size: 0.92rem; font-weight: 800; color: #ffffff; margin: 0.35rem 0 0.15rem 0;">${escapeHtml(task.title || 'Untitled Mission')}</h4>
            <div style="font-size: 0.72rem; color: #94a3b8; line-height: 1.3;">${escapeHtml(task.desc || task.url || '')}</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: ${isActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(148, 163, 184, 0.15)'}; color: ${isActive ? '#34d399' : '#94a3b8'};">
            ${isActive ? 'Active 🟢' : 'Paused ⚪'}
          </span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 0.75rem;">
          <div style="display: flex; gap: 0.65rem; font-weight: 800; align-items: center;">
            <span style="color: #fbbf24;">+${Number(task.coins || 100).toLocaleString()} 🪙</span>
            <span style="color: #facc15;">+${Number(task.stars || 5)} ⭐</span>
            ${task.secretCode ? `<span style="color: #38bdf8; font-family: monospace; font-size: 0.68rem; background: rgba(56, 189, 248, 0.1); padding: 2px 5px; border-radius: 4px;">🔑 ${escapeHtml(task.secretCode)}</span>` : ''}
          </div>

          <div style="display: flex; gap: 0.35rem;">
            <button class="btn-card-action" onclick="openEditTaskModal('${task.id}')" title="Edit Mission">✏️</button>
            <button class="btn-card-action" onclick="toggleTaskActive('${task.id}')" title="Toggle active status">${isActive ? 'Pause' : 'Play'}</button>
            <button class="btn-card-action danger" onclick="deleteAdminTask('${task.id}')" title="Delete Mission">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleAdminTaskSearch(val) {
  renderAdminTasksList();
}

function openCreateTaskModal() {
  const modal = document.getElementById('adminTaskModalOverlay');
  const heading = document.getElementById('adminTaskModalHeading');
  const form = document.getElementById('adminTaskModalForm');
  if (heading) heading.textContent = 'Create New Task Mission';
  if (form) form.reset();
  const idField = document.getElementById('taskEditId');
  if (idField) idField.value = '';
  if (modal) modal.style.display = 'flex';
}

function openEditTaskModal(taskId) {
  const task = tasksData.find(t => t.id === taskId);
  if (!task) return;

  const modal = document.getElementById('adminTaskModalOverlay');
  const heading = document.getElementById('adminTaskModalHeading');
  if (heading) heading.textContent = 'Edit Task Mission';

  document.getElementById('taskEditId').value = task.id;
  document.getElementById('taskInputTitle').value = task.title || '';
  document.getElementById('taskInputDesc').value = task.desc || '';
  document.getElementById('taskInputUrl').value = task.url || '';
  document.getElementById('taskInputCoins').value = task.coins || 100;
  document.getElementById('taskInputStars').value = task.stars || 5;
  document.getElementById('taskInputCategory').value = task.category || 'youtube';
  document.getElementById('taskInputTimer').value = task.timer || 10;
  document.getElementById('taskInputSecret').value = task.secretCode || '';

  if (modal) modal.style.display = 'flex';
}

function closeAdminTaskModal() {
  const modal = document.getElementById('adminTaskModalOverlay');
  if (modal) modal.style.display = 'none';
}

function handleTaskModalBackdropClick(e) {
  if (e.target && e.target.id === 'adminTaskModalOverlay') {
    closeAdminTaskModal();
  }
}

function generateRandomTaskCode() {
  const prefix = ['NV', 'TASK', 'WEB', 'EARN', 'STAR'][Math.floor(Math.random() * 5)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const input = document.getElementById('taskInputSecret');
  if (input) input.value = `${prefix}-${num}`;
}

function handleSaveAdminTaskForm(e) {
  e.preventDefault();
  const editId = document.getElementById('taskEditId')?.value;
  const title = document.getElementById('taskInputTitle')?.value.trim();
  const desc = document.getElementById('taskInputDesc')?.value.trim();
  const url = document.getElementById('taskInputUrl')?.value.trim();
  const coins = parseInt(document.getElementById('taskInputCoins')?.value || '100', 10);
  const stars = parseInt(document.getElementById('taskInputStars')?.value || '5', 10);
  const category = document.getElementById('taskInputCategory')?.value || 'youtube';
  const timer = parseInt(document.getElementById('taskInputTimer')?.value || '10', 10);
  const secretCode = document.getElementById('taskInputSecret')?.value.trim();

  if (!title || !url) {
    showToast('Please fill in mission title and URL.');
    return;
  }

  if (editId) {
    const idx = tasksData.findIndex(t => t.id === editId);
    if (idx !== -1) {
      tasksData[idx] = {
        ...tasksData[idx],
        title,
        desc,
        url,
        coins,
        stars,
        category,
        timer,
        secretCode,
        updatedAt: Date.now()
      };
    }
  } else {
    const newTask = {
      id: `task_${Date.now()}`,
      title,
      desc,
      url,
      coins,
      stars,
      category,
      timer,
      secretCode,
      active: true,
      createdAt: Date.now()
    };
    tasksData.unshift(newTask);
  }

  saveTasksAndSync();
  closeAdminTaskModal();
  showToast(editId ? 'Mission updated! ✓' : 'New Mission published live! ✓');
}

function toggleTaskActive(taskId) {
  const task = tasksData.find(t => t.id === taskId);
  if (!task) return;
  task.active = (task.active === false);
  saveTasksAndSync();
  showToast(`Mission ${task.active ? 'activated' : 'paused'}.`);
}

function deleteAdminTask(taskId) {
  if (!confirm('Are you sure you want to delete this mission?')) return;
  tasksData = tasksData.filter(t => t.id !== taskId);
  saveTasksAndSync();
  showToast('Mission deleted.');
}

function resetPlayerCooldowns() {
  localStorage.removeItem(CLAIMS_STORAGE_KEY);
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  if (syncChannel) {
    syncChannel.postMessage({ type: 'CLAIMS_UPDATED', timestamp: Date.now() });
  }
  showToast('🔄 All player mission cooldowns reset! ✓');
}

function saveTasksAndSync() {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  if (syncChannel) {
    syncChannel.postMessage({ type: 'TASKS_UPDATED', timestamp: Date.now() });
  }
  if (window.Firebase && typeof window.Firebase.saveTasksToCloud === 'function') {
    window.Firebase.saveTasksToCloud(tasksData);
  }
  renderAdminTasksList();
}

// -----------------------------------------------------------------------------
// 2. ALL USERS SUBVIEW LOGIC
// -----------------------------------------------------------------------------

function renderAdminUsersList() {
  const container = document.getElementById('adminUsersList');
  if (!container) return;

  const searchVal = (document.getElementById('adminUserSearch')?.value || '').toLowerCase().trim();
  let list = [...usersData];
  if (searchVal) {
    list = list.filter(u => (u.name && u.name.toLowerCase().includes(searchVal)) || (u.id && u.id.toLowerCase().includes(searchVal)));
  }

  // Update metrics
  const totUsers = document.getElementById('adminTotalUsers');
  const actUsers = document.getElementById('adminActiveUsers');
  const totCoins = document.getElementById('adminTotalCoins');

  const activeCount = usersData.filter(u => u.status !== 'suspended').length;
  const coinsSum = usersData.reduce((acc, u) => acc + Number(u.coins || 0), 0);

  if (totUsers) totUsers.textContent = usersData.length.toString();
  if (actUsers) actUsers.textContent = activeCount.toString();
  if (totCoins) totCoins.textContent = `${coinsSum.toLocaleString()} 🪙`;

  updateAdminCounters();

  if (list.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.85rem;">No players found matching "${searchVal}".</div>`;
    return;
  }

  container.innerHTML = list.map(user => {
    const isSusp = user.status === 'suspended';
    return `
      <div class="admin-user-card" style="display: flex; justify-content: space-between; align-items: center; background: #0a1738; border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 12px; padding: 0.65rem 0.8rem; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span style="font-size: 1.4rem;">${user.avatar || '⚡'}</span>
          <div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="font-size: 0.85rem; font-weight: 800; color: #ffffff;">${escapeHtml(user.name || 'Player')}</span>
              ${isSusp ? '<span style="font-size: 0.6rem; color: #ef4444; font-weight: 800;">[BANNED]</span>' : ''}
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; display: flex; gap: 0.5rem; margin-top: 2px;">
              <span style="color: #fbbf24; font-weight: 700;">🪙 ${Number(user.coins || 0).toLocaleString()}</span>
              <span style="color: #facc15; font-weight: 700;">⭐ ${user.stars || 0}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <button class="btn-card-action" onclick="quickAddUserCoins('${user.id}', 500)" title="Give 500 Coins">+500 🪙</button>
          <button class="btn-card-action" onclick="openEditUserModal('${user.id}')" title="Edit player details">⚙️</button>
        </div>
      </div>
    `;
  }).join('');
}

function handleAdminUserSearch(val) {
  renderAdminUsersList();
}

function openEditUserModal(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  const modal = document.getElementById('adminUserModalOverlay');
  document.getElementById('userEditId').value = user.id;
  document.getElementById('userEditAvatar').textContent = user.avatar || '⚡';
  document.getElementById('userEditName').textContent = user.name || 'Player';
  document.getElementById('userEditLevel').textContent = user.level || 'LVL 1 • CADET';
  document.getElementById('userEditCoins').value = user.coins || 0;
  document.getElementById('userEditStars').value = user.stars || 0;
  document.getElementById('userEditStatus').value = user.status || 'active';

  if (modal) modal.style.display = 'flex';
}

function closeAdminUserModal() {
  const modal = document.getElementById('adminUserModalOverlay');
  if (modal) modal.style.display = 'none';
}

function handleUserModalBackdropClick(e) {
  if (e.target && e.target.id === 'adminUserModalOverlay') {
    closeAdminUserModal();
  }
}

function handleSaveAdminUserForm(e) {
  e.preventDefault();
  const userId = document.getElementById('userEditId')?.value;
  const coins = parseInt(document.getElementById('userEditCoins')?.value || '0', 10);
  const stars = parseInt(document.getElementById('userEditStars')?.value || '0', 10);
  const status = document.getElementById('userEditStatus')?.value || 'active';

  const user = usersData.find(u => u.id === userId);
  if (user) {
    user.coins = coins;
    user.stars = stars;
    user.status = status;

    const currentName = localStorage.getItem('player_username') || 'NovaEarner';
    if (user.id === 'usr_1' || user.name === currentName) {
      localStorage.setItem('task_game_coins', coins.toString());
      localStorage.setItem('task_game_stars', stars.toString());
      updateAdminLiveDisplays();
    }

    saveUsersAndSync();
    closeAdminUserModal();
    showToast(`Updated balance for ${user.name}! ✓`);
  }
}

function handleDeleteUserFromModal() {
  const userId = document.getElementById('userEditId')?.value;
  if (!userId) return;
  if (!confirm('Are you sure you want to remove this player?')) return;

  usersData = usersData.filter(u => u.id !== userId);
  saveUsersAndSync();
  closeAdminUserModal();
  showToast('Player deleted.');
}

function quickAddUserCoins(userId, delta) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;
  user.coins = Math.max(0, (user.coins || 0) + delta);

  const currentName = localStorage.getItem('player_username') || 'NovaEarner';
  if (user.id === 'usr_1' || user.name === currentName) {
    localStorage.setItem('task_game_coins', user.coins.toString());
    updateAdminLiveDisplays();
  }

  saveUsersAndSync();
  showToast(`${delta > 0 ? '+' : ''}${delta} coins given to ${user.name}`);
}

function quickAwardAllPlayers(amount) {
  usersData.forEach(u => {
    u.coins = (u.coins || 0) + amount;
  });
  let myCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  myCoins += amount;
  localStorage.setItem('task_game_coins', myCoins.toString());
  updateAdminLiveDisplays();

  saveUsersAndSync();
  showToast(`🎁 Granted +${amount.toLocaleString()} Coins to all players!`);
}

function saveUsersAndSync() {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersData));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  renderAdminUsersList();
}

// -----------------------------------------------------------------------------
// 3. WITHDRAWAL REQUESTS SUBVIEW LOGIC
// -----------------------------------------------------------------------------

function filterAdminWithdrawals(filter, btn) {
  currentWdFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAdminWithdrawalsList();
}

function renderAdminWithdrawalsList() {
  const container = document.getElementById('adminWithdrawalsList');
  if (!container) return;

  const pending = withdrawalsData.filter(w => w.status === 'pending');
  const approved = withdrawalsData.filter(w => w.status === 'approved');
  const rejected = withdrawalsData.filter(w => w.status === 'rejected');

  const cntAll = document.getElementById('cntWdAll');
  const cntPend = document.getElementById('cntWdPending');
  const cntApp = document.getElementById('cntWdApproved');
  const cntRej = document.getElementById('cntWdRejected');

  if (cntAll) cntAll.textContent = withdrawalsData.length.toString();
  if (cntPend) cntPend.textContent = pending.length.toString();
  if (cntApp) cntApp.textContent = approved.length.toString();
  if (cntRej) cntRej.textContent = rejected.length.toString();

  updateAdminCounters();

  let list = [...withdrawalsData];
  if (currentWdFilter !== 'all') {
    list = list.filter(w => w.status === currentWdFilter);
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: #94a3b8; font-size: 0.85rem; background: #0a1738; border-radius: 14px;">
        <div style="font-size: 2rem; margin-bottom: 0.4rem;">💸</div>
        No ${currentWdFilter === 'all' ? '' : currentWdFilter} requests found.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(wd => {
    const isPending = wd.status === 'pending';
    const isApproved = wd.status === 'approved';
    const statusColor = isPending ? '#fbbf24' : isApproved ? '#34d399' : '#f87171';
    const statusBg = isPending ? 'rgba(251, 191, 36, 0.15)' : isApproved ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)';

    return `
      <div class="admin-withdraw-card" style="background: #0a1738; border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 12px; padding: 0.8rem; margin-bottom: 0.6rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <span style="font-size: 1.1rem;">${wd.playerAvatar || '⚡'}</span>
              <span style="font-size: 0.88rem; font-weight: 800; color: #ffffff;">${escapeHtml(wd.playerName || 'Player')}</span>
              <span style="font-size: 0.62rem; color: #64748b; font-family: monospace;">(${wd.id})</span>
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.25rem;">
              <b>${wd.method}</b> • ${escapeHtml(wd.details || '')}
            </div>
            <div style="font-size: 0.65rem; color: #64748b; margin-top: 0.15rem;">${wd.time || 'Recent'}</div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 1.05rem; font-weight: 900; color: #38bdf8;">₹${Number(wd.amount || 0).toLocaleString()}</div>
            <span style="font-size: 0.65rem; font-weight: 800; padding: 2px 7px; border-radius: 6px; background: ${statusBg}; color: ${statusColor}; text-transform: uppercase;">
              ${wd.status}
            </span>
          </div>
        </div>

        ${isPending ? `
          <div style="display: flex; gap: 0.5rem; margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05);">
            <button class="btn-card-action success" style="flex: 1; padding: 6px;" onclick="approveWithdrawal('${wd.id}')">Approve &amp; Pay ✓</button>
            <button class="btn-card-action danger" style="padding: 6px 12px;" onclick="rejectWithdrawal('${wd.id}')">Reject ✕</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function approveWithdrawal(wdId) {
  const wd = withdrawalsData.find(w => w.id === wdId);
  if (!wd) return;
  wd.status = 'approved';
  saveWithdrawalsAndSync();
  showToast(`Request ${wd.id} Approved!`);
}

function rejectWithdrawal(wdId) {
  const wd = withdrawalsData.find(w => w.id === wdId);
  if (!wd) return;
  wd.status = 'rejected';
  saveWithdrawalsAndSync();
  showToast(`Request ${wd.id} Rejected.`);
}

function saveWithdrawalsAndSync() {
  localStorage.setItem(WITHDRAW_STORAGE_KEY, JSON.stringify(withdrawalsData));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  if (syncChannel) {
    syncChannel.postMessage({ type: 'WITHDRAWALS_UPDATED', timestamp: Date.now() });
  }
  renderAdminWithdrawalsList();
}

// -----------------------------------------------------------------------------
// 4. LEADERBOARD EVENT SUBVIEW LOGIC
// -----------------------------------------------------------------------------

function renderAdminEventSection() {
  startAdminEventTimer();
  renderAdminEventContenders();
}

function getLeaderboardEventState() {
  const EVENT_STORAGE_KEY = 'task_leaderboard_event_v1';
  let data = null;
  try {
    const raw = localStorage.getItem(EVENT_STORAGE_KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) {}

  if (!data || !data.endTime) {
    const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
    data = {
      seasonNumber: 1,
      startTime: Date.now(),
      endTime: Date.now() + THREE_MONTHS_MS,
      status: 'active'
    };
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(data));
  }
  return data;
}

function startAdminEventTimer() {
  if (adminEventInterval) clearInterval(adminEventInterval);

  function tick() {
    const evt = getLeaderboardEventState();
    const diff = Math.max(0, evt.endTime - Date.now());

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const elDays = document.getElementById('adminTimerDays');
    const elHours = document.getElementById('adminTimerHours');
    const elMins = document.getElementById('adminTimerMins');
    const elSecs = document.getElementById('adminTimerSecs');

    if (elDays) elDays.textContent = String(days).padStart(2, '0');
    if (elHours) elHours.textContent = String(hours).padStart(2, '0');
    if (elMins) elMins.textContent = String(mins).padStart(2, '0');
    if (elSecs) elSecs.textContent = String(secs).padStart(2, '0');
  }

  tick();
  adminEventInterval = setInterval(tick, 1000);
}

function renderAdminEventContenders() {
  const container = document.getElementById('adminEventPlayersList');
  if (!container) return;

  const qualified = usersData.filter(u => Number(u.totalTasks || 0) >= 100).sort((a, b) => (b.eventTasks || 0) - (a.eventTasks || 0));

  if (qualified.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 1.5rem; color: #94a3b8; font-size: 0.8rem;">No players have reached the 100 tasks gate yet.</div>`;
    return;
  }

  container.innerHTML = qualified.slice(0, 10).map((u, i) => `
    <div style="display: flex; align-items: center; justify-content: space-between; background: #060e24; border: 1px solid rgba(250, 204, 21, 0.2); border-radius: 10px; padding: 0.5rem 0.75rem; margin-bottom: 0.4rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-weight: 900; color: ${i === 0 ? '#facc15' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#64748b'}; width: 20px;">#${i + 1}</span>
        <span>${u.avatar || '⚡'}</span>
        <span style="font-size: 0.82rem; font-weight: 800; color: #ffffff;">${escapeHtml(u.name)}</span>
      </div>
      <div style="font-size: 0.75rem; font-weight: 800; color: #facc15;">
        ${u.eventTasks || 0} Event Tasks
      </div>
    </div>
  `).join('');
}

function adminResetLeaderboardSeason() {
  if (!confirm('Restart the 3-Month Global Championship Event Season?')) return;
  const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
  const current = getLeaderboardEventState();
  const nextSeason = {
    seasonNumber: (current.seasonNumber || 1) + 1,
    startTime: Date.now(),
    endTime: Date.now() + THREE_MONTHS_MS,
    status: 'active'
  };
  localStorage.setItem('task_leaderboard_event_v1', JSON.stringify(nextSeason));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

  // Reset event tasks for users
  usersData.forEach(u => {
    u.eventTasks = 0;
  });
  saveUsersAndSync();

  startAdminEventTimer();
  renderAdminEventContenders();
  showToast(`🏆 Season ${nextSeason.seasonNumber} started! Fresh 90 days countdown.`);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Expose functions to global window scope for inline onclicks
window.switchProfileTab = switchProfileTab;
window.handleAdminLogin = handleAdminLogin;
window.exitAdminToProfile = exitAdminToProfile;
window.quickFillProfileAdmin = quickFillProfileAdmin;
window.adminLogout = adminLogout;
window.switchAdminSubView = switchAdminSubView;
window.openCreateTaskModal = openCreateTaskModal;
window.openEditTaskModal = openEditTaskModal;
window.closeAdminTaskModal = closeAdminTaskModal;
window.handleTaskModalBackdropClick = handleTaskModalBackdropClick;
window.generateRandomTaskCode = generateRandomTaskCode;
window.handleSaveAdminTaskForm = handleSaveAdminTaskForm;
window.toggleTaskActive = toggleTaskActive;
window.deleteAdminTask = deleteAdminTask;
window.resetPlayerCooldowns = resetPlayerCooldowns;
window.handleAdminTaskSearch = handleAdminTaskSearch;
window.openEditUserModal = openEditUserModal;
window.closeAdminUserModal = closeAdminUserModal;
window.handleUserModalBackdropClick = handleUserModalBackdropClick;
window.handleSaveAdminUserForm = handleSaveAdminUserForm;
window.handleDeleteUserFromModal = handleDeleteUserFromModal;
window.quickAddUserCoins = quickAddUserCoins;
window.quickAwardAllPlayers = quickAwardAllPlayers;
window.handleAdminUserSearch = handleAdminUserSearch;
window.filterAdminWithdrawals = filterAdminWithdrawals;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.adminResetLeaderboardSeason = adminResetLeaderboardSeason;


/**
 * Log action with timestamp into the Admin Log Console
 */
function logAdminAction(message) {
  const logBox = document.getElementById('adminLogBox');
  if (!logBox) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  logBox.innerHTML = `<div>[${timeStr}] ${message}</div>` + logBox.innerHTML;
}

/**
 * Refresh all live currency and game indicators on the profile & admin dashboard
 */
function updateAdminLiveDisplays() {
  const currentCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  const currentStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  // Update top header and admin coins & stars
  const headerCoins = document.getElementById('profileCoinsDisplay');
  if (headerCoins) headerCoins.textContent = currentCoins.toLocaleString();

  const headerStars = document.getElementById('profileStarsDisplay');
  if (headerStars) headerStars.textContent = currentStars.toLocaleString();

  // Telegram Stars Rating (per MTProto userFull.stars_rating)
  if (window.TelegramStars && typeof window.TelegramStars.getRating === 'function') {
    const ratingData = window.TelegramStars.getRating();
    const ratingLevelEl = document.getElementById('tgProfileRatingLevel');
    const ratingSubEl = document.getElementById('tgProfileRatingSub');
    if (ratingLevelEl) {
      ratingLevelEl.textContent = `Star Rating: Level ${ratingData.level}`;
    }
    if (ratingSubEl) {
      ratingSubEl.textContent = `${ratingData.rating} / ${ratingData.next_level_stars} ⭐ Total Volume`;
    }
  }

  const userAvatar = document.querySelector('.user-avatar');
  if (userAvatar) userAvatar.textContent = localStorage.getItem('player_avatar') || '👤';

  const userName = document.querySelector('.user-name');
  if (userName) userName.textContent = localStorage.getItem('player_username') || 'NovaEarner';

  const adminCoins = document.getElementById('adminLiveCoins');
  if (adminCoins) adminCoins.textContent = `${currentCoins.toLocaleString()} 🪙`;

  const adminStars = document.getElementById('adminLiveStars');
  if (adminStars) adminStars.textContent = `${currentStars.toLocaleString()} ⭐`;

  // Read Sunflower Tycoon state
  let seedsCount = 0;
  let wellsCount = 0;
  try {
    const raw = localStorage.getItem(SF_STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      seedsCount = state.seeds || 0;
      wellsCount = state.baskets || 0;
    }
  } catch (e) {
    console.warn('Error reading SF Tycoon state:', e);
  }

  const adminSeeds = document.getElementById('adminLiveSeeds');
  if (adminSeeds) adminSeeds.textContent = `${seedsCount.toLocaleString()} 🌱`;

  const adminWells = document.getElementById('adminLiveWells');
  if (adminWells) adminWells.textContent = `${wellsCount.toLocaleString()} 🪣`;
}

// -----------------------------------------------------------------------------
// Admin Currency Manipulation Functions
// -----------------------------------------------------------------------------

/**
 * Add specified amount of coins from input field
 */
function adminAddCoins() {
  const input = document.getElementById('inputCoinsAdjust');
  const amount = parseInt(input ? input.value : '0', 10);

  if (isNaN(amount) || amount === 0) {
    alert('Please enter a valid coin amount to add.');
    return;
  }

  let coins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  coins = Math.max(0, coins + amount);
  localStorage.setItem('task_game_coins', coins.toString());

  if (input) input.value = '';
  updateAdminLiveDisplays();
  logAdminAction(`Added ${amount.toLocaleString()} coins. New balance: ${coins.toLocaleString()} 🪙`);
}

/**
 * Set player coins directly to a specific value
 */
function adminSetCoins() {
  const input = document.getElementById('inputCoinsAdjust');
  const amount = parseInt(input ? input.value : '0', 10);

  if (isNaN(amount) || amount < 0) {
    alert('Please enter a valid non-negative coin amount.');
    return;
  }

  localStorage.setItem('task_game_coins', amount.toString());
  if (input) input.value = '';
  updateAdminLiveDisplays();
  logAdminAction(`Coins set directly to: ${amount.toLocaleString()} 🪙`);
}

/**
 * Quick preset coin adjustments (+500, +2000, +10000, -500)
 */
function adminQuickCoins(amount) {
  let coins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  coins = Math.max(0, coins + amount);
  localStorage.setItem('task_game_coins', coins.toString());

  updateAdminLiveDisplays();
  const sign = amount > 0 ? `+${amount.toLocaleString()}` : `${amount.toLocaleString()}`;
  logAdminAction(`Quick adjustment: ${sign} coins. New balance: ${coins.toLocaleString()} 🪙`);
}

/**
 * Add stars to player profile
 */
function adminAddStars() {
  const input = document.getElementById('inputStarsAdjust');
  const amount = parseInt(input ? input.value : '0', 10);

  if (isNaN(amount) || amount === 0) {
    alert('Please enter a valid star amount.');
    return;
  }

  let stars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  stars = Math.max(0, stars + amount);
  localStorage.setItem('task_game_stars', stars.toString());

  if (input) input.value = '';
  updateAdminLiveDisplays();
  logAdminAction(`Added ${amount} Stars. Total stars: ${stars} ⭐`);
}

// -----------------------------------------------------------------------------
// Sunflower Valley Tycoon Admin Actions
// -----------------------------------------------------------------------------

/**
 * Give Sunflower seeds and water buckets
 */
function adminGiveFarmSupplies(seedsToAdd, bucketsToAdd) {
  try {
    let state = {};
    const raw = localStorage.getItem(SF_STORAGE_KEY);
    if (raw) state = JSON.parse(raw);

    state.seeds = Math.max(0, (state.seeds || 0) + seedsToAdd);
    state.baskets = Math.max(0, (state.baskets || 0) + bucketsToAdd);

    localStorage.setItem(SF_STORAGE_KEY, JSON.stringify(state));
    updateAdminLiveDisplays();
    logAdminAction(`Granted +${seedsToAdd} Seeds & +${bucketsToAdd} Water Buckets to Sunflower Tycoon.`);
  } catch (e) {
    console.error('Failed to grant farm supplies:', e);
  }
}

/**
 * Give Sunflower game coins
 */
function adminGiveSunflowerCoins(amount) {
  try {
    let state = {};
    const raw = localStorage.getItem(SF_STORAGE_KEY);
    if (raw) state = JSON.parse(raw);

    state.coins = Math.max(0, (state.coins || 0) + amount);

    localStorage.setItem(SF_STORAGE_KEY, JSON.stringify(state));
    updateAdminLiveDisplays();
    logAdminAction(`Granted +${amount.toLocaleString()} Sunflower Coins to Sunflower Tycoon.`);
  } catch (e) {
    console.error('Failed to grant Sunflower coins:', e);
  }
}

/**
 * Reset all 20 land plots to fully bloomed harvest-ready sunflowers
 */
function adminResetFarmPlots() {
  try {
    let state = {};
    const raw = localStorage.getItem(SF_STORAGE_KEY);
    if (raw) state = JSON.parse(raw);

    if (Array.isArray(state.plots)) {
      state.plots.forEach((p, idx) => {
        p.unlocked = true;
        p.plantStatus = 'alive';
        p.growthTimer = 0;
        p.isWithered = false;
        p.uncollectedCoins = (p.coinProduction || 10) * 5;
        p.readyToCollect = true;
        p.lifeTimer = 300; // 300s healthy life
      });
    }

    localStorage.setItem(SF_STORAGE_KEY, JSON.stringify(state));
    updateAdminLiveDisplays();
    logAdminAction('Restored all 20 land plots to Harvest-Ready Sunflower state!');
  } catch (e) {
    console.error('Failed to reset farm plots:', e);
  }
}

// -----------------------------------------------------------------------------
// DOM Ready Lifecycle Initialization
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Sync live coin count on header
  updateAdminLiveDisplays();

  // Initialize tabs to Profile view by default
  switchProfileTab('profile');

  // Initialize player session & authentication indicator
  updatePlayerSessionUI();

  // Initialize the Invite Friends & Referral System
  initReferralSystem();

  // If already authenticated in this session, show unlocked indicator
  const adminStatusTag = document.getElementById('adminStatusTag');
  if (adminStatusTag && isAdminLoggedIn()) {
    adminStatusTag.textContent = '🔓';
  }
});

// =============================================================================
// INVITE FRIENDS & REFERRAL SYSTEM LOGIC
// =============================================================================

const REFERRAL_CODE_KEY = 'task_game_referral_code';
const REFERRALS_LIST_KEY = 'task_game_referrals';
const REDEEMED_REFERRAL_KEY = 'task_game_redeemed_referral';

// Sound synthesis helper
const ProfileAudio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  playCopyChime() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.setValueAtTime(880, t + 0.08); // A5
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    } catch (e) {}
  },
  playRewardFanfare() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.07);
        gain.gain.setValueAtTime(0.12, t + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.38);
      });
    } catch (e) {}
  }
};

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('profileToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function showFloatingCoin(targetElement, text) {
  if (!targetElement || typeof targetElement.getBoundingClientRect !== 'function') return;
  const rect = targetElement.getBoundingClientRect();
  const floatEl = document.createElement('div');
  floatEl.className = 'floating-coin-profile';
  floatEl.textContent = text;
  floatEl.style.left = `${rect.left + rect.width / 4}px`;
  floatEl.style.top = `${rect.top - 12}px`;
  document.body.appendChild(floatEl);
  setTimeout(() => floatEl.remove(), 800);
}

// =============================================================================
// PLAYER SESSION & AUTHENTICATION STATE
// =============================================================================

function getCurrentPlayer() {
  const username = localStorage.getItem('player_username') || 'NovaEarner';
  const avatar = localStorage.getItem('player_avatar') || '⚡';
  const id = localStorage.getItem('player_id') || 'usr_1';
  const isLoggedIn = localStorage.getItem('player_logged_in') !== 'false';
  return { id, username, avatar, isLoggedIn };
}

function isUserLoggedIn() {
  return localStorage.getItem('player_logged_in') !== 'false' && Boolean(localStorage.getItem('player_username') || 'NovaEarner');
}

function updatePlayerSessionUI() {
  const player = getCurrentPlayer();
  const loggedIn = isUserLoggedIn();
  const fbUser = window.FirebaseAuth && typeof window.FirebaseAuth.getCurrentUser === 'function'
    ? window.FirebaseAuth.getCurrentUser()
    : null;
  const playerEmail = fbUser ? fbUser.email : localStorage.getItem('player_email');

  // 1. Profile Hero Card Session Badge
  const sessionDot = document.getElementById('sessionDot');
  const sessionStatusText = document.getElementById('sessionStatusText');
  const btnSessionSwitch = document.getElementById('btnSessionSwitch');

  if (sessionDot) {
    sessionDot.className = loggedIn ? 'session-dot' : 'session-dot offline';
  }
  if (sessionStatusText) {
    if (loggedIn) {
      const fbBadge = playerEmail 
        ? `<span style="font-size: 0.65rem; color: #fbbf24; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 1px 6px; border-radius: 999px; margin-left: 4px;" title="Firebase: ${escapeHtml(playerEmail)}">🔥 Firebase</span>` 
        : '';
      sessionStatusText.innerHTML = `Logged In: <b>${escapeHtml(player.username)}</b>${fbBadge}`;
    } else {
      sessionStatusText.innerHTML = `<span style="color: #f87171;">🔴 Not Logged In (Guest)</span>`;
    }
  }
  if (btnSessionSwitch) {
    btnSessionSwitch.textContent = loggedIn ? 'Sign Out' : 'Sign In';
  }

  const btnDevicesSwitch = document.getElementById('btnDevicesSwitch');
  if (btnDevicesSwitch) {
    btnDevicesSwitch.style.display = loggedIn ? 'inline-block' : 'none';
  }

  // 2. Modal User Login Status Check Chip
  const userCheckIcon = document.getElementById('userCheckIcon');
  const userCheckText = document.getElementById('userCheckText');
  const btnQuickLoginAction = document.getElementById('btnQuickLoginAction');

  if (userCheckIcon) {
    userCheckIcon.textContent = loggedIn ? '🟢' : '🔴';
  }
  if (userCheckText) {
    if (loggedIn) {
      userCheckText.innerHTML = `Account: <b>${escapeHtml(player.username)}</b> ${playerEmail ? `<span style="color: #94a3b8; font-size: 0.68rem;">(${escapeHtml(playerEmail)})</span>` : ''}`;
    } else {
      userCheckText.innerHTML = `<span style="color: #f87171;">⚠️ Not Logged In</span> (Sign in required)`;
    }
  }
  if (btnQuickLoginAction) {
    btnQuickLoginAction.textContent = loggedIn ? 'Sign Out' : 'Sign In';
  }
}

// =============================================================================
// TELEGRAM USER AUTHORIZATION (MTProto Specification: auth.sendCode / auth.signIn)
// =============================================================================
const TG_SESSION_KEY = 'task_game_tg_session';
const TG_FUTURE_TOKENS_KEY = 'task_game_future_auth_tokens';

let currentTgAuth = {
  phone: '+919876543210',
  codeHash: '',
  codeType: 'app',
  expectedCode: '12345',
  dcId: 1,
  isTestDc: false,
  resendTimer: null,
  resendSeconds: 45
};

let tgQrTimer = null;
let tgQrSeconds = 30;

function getFutureAuthTokens() {
  try {
    const raw = localStorage.getItem(TG_FUTURE_TOKENS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function storeFutureAuthToken(phone) {
  try {
    let tokens = getFutureAuthTokens();
    const newToken = {
      token: 'tok_' + Math.random().toString(36).substr(2, 12),
      phone: phone || '+919876543210',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    // Prepend and enforce MTProto 20 tokens max limit
    tokens = [newToken, ...tokens.filter(t => t.phone !== phone)].slice(0, 20);
    localStorage.setItem(TG_FUTURE_TOKENS_KEY, JSON.stringify(tokens));
    updateFutureTokensUI();
  } catch (e) {}
}

function updateFutureTokensUI() {
  const counterEl = document.getElementById('tgFutureTokensCount');
  if (counterEl) {
    const tokens = getFutureAuthTokens();
    counterEl.textContent = `${tokens.length} / 20`;
  }
  const banner = document.getElementById('tgFutureTokenBox');
  if (banner) {
    const tokens = getFutureAuthTokens();
    banner.style.display = tokens.length > 0 ? 'block' : 'none';
  }
}

function togglePlayerLoginState() {
  const currentlyLoggedIn = isUserLoggedIn();

  if (currentlyLoggedIn) {
    // If Firebase Auth is initialized, sign out from Firebase
    if (window.Firebase && typeof window.Firebase.signOutUser === 'function') {
      window.Firebase.signOutUser();
    }

    const curPhone = localStorage.getItem('player_username') || '+919876543210';
    storeFutureAuthToken(curPhone);

    localStorage.setItem('player_logged_in', 'false');
    localStorage.removeItem('player_email');
    localStorage.removeItem('player_uid');
    showToast('🔒 Signed out of session.');
    updatePlayerSessionUI();
  } else {
    openPlayerLoginModal();
  }
}

function openPlayerLoginModal() {
  const modal = document.getElementById('playerLoginModalOverlay');
  if (!modal) return;

  modal.classList.add('active');
  modal.style.display = 'flex';

  // Default to Firebase Email/Password View
  switchTgAuthTab('firebase_email');
  updateFbAuthModalUI();
  updateFutureTokensUI();

  // Populate avatar row in signup if empty
  populateSignUpAvatarOptions();
}

function closePlayerLoginModal() {
  const modal = document.getElementById('playerLoginModalOverlay');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  if (currentTgAuth.resendTimer) {
    clearInterval(currentTgAuth.resendTimer);
    currentTgAuth.resendTimer = null;
  }
  if (tgQrTimer) {
    clearInterval(tgQrTimer);
    tgQrTimer = null;
  }
}

function handlePlayerLoginModalBackdropClick(event) {
  if (event && (event.target.id === 'playerLoginModalOverlay' || event.target.classList.contains('profile-modal-overlay'))) {
    closePlayerLoginModal();
  }
}

function handlePlayerLoginForm(event) {
  if (event) event.preventDefault();
  handleSendTgCode();
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// =============================================================================
// FIREBASE AUTHENTICATION (EMAIL & PASSWORD) MODAL CONTROLLER
// =============================================================================
let currentFbAuthMode = 'signin';

function setFbAuthMode(mode) {
  currentFbAuthMode = mode;
  const btnIn = document.getElementById('btnFbModeSignIn');
  const btnUp = document.getElementById('btnFbModeSignUp');
  const lblName = document.getElementById('lblFbDisplayName');
  const wrapName = document.getElementById('wrapFbDisplayName');
  const lblConfirm = document.getElementById('lblFbConfirmPassword');
  const wrapConfirm = document.getElementById('wrapFbConfirmPassword');
  const forgotRow = document.getElementById('fbForgotRow');
  const submitText = document.getElementById('btnFbSubmitText');
  const msgBanner = document.getElementById('fbAuthMsgBanner');

  if (msgBanner) msgBanner.style.display = 'none';

  if (mode === 'signup') {
    if (btnIn) btnIn.classList.remove('active');
    if (btnUp) btnUp.classList.add('active');
    if (lblName) lblName.style.display = 'block';
    if (wrapName) wrapName.style.display = 'flex';
    if (lblConfirm) lblConfirm.style.display = 'block';
    if (wrapConfirm) wrapConfirm.style.display = 'flex';
    if (forgotRow) forgotRow.style.display = 'none';
    if (submitText) submitText.textContent = 'Create Account & Cloud Sync';
  } else {
    if (btnIn) btnIn.classList.add('active');
    if (btnUp) btnUp.classList.remove('active');
    if (lblName) lblName.style.display = 'none';
    if (wrapName) wrapName.style.display = 'none';
    if (lblConfirm) lblConfirm.style.display = 'none';
    if (wrapConfirm) wrapConfirm.style.display = 'none';
    if (forgotRow) forgotRow.style.display = 'block';
    if (submitText) submitText.textContent = 'Sign In with Email';
  }
}

function toggleFbPasswordVisibility(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
}

function showFbAuthBanner(type, message) {
  const banner = document.getElementById('fbAuthMsgBanner');
  if (!banner) return;
  banner.className = `fb-auth-msg-banner ${type}`;
  banner.textContent = message;
  banner.style.display = 'block';
}

async function handleFirebaseEmailAuthSubmit() {
  const emailInput = document.getElementById('fbInputEmail');
  const pwdInput = document.getElementById('fbInputPassword');
  const nameInput = document.getElementById('fbInputDisplayName');
  const confirmPwdInput = document.getElementById('fbInputConfirmPassword');
  const submitBtn = document.getElementById('btnFbSubmitAuth');
  const submitText = document.getElementById('btnFbSubmitText');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = pwdInput ? pwdInput.value : '';

  if (!email || !email.includes('@')) {
    showFbAuthBanner('error', 'Please enter a valid email address.');
    return;
  }
  if (!password || password.length < 6) {
    showFbAuthBanner('error', 'Password must be at least 6 characters long.');
    return;
  }

  if (currentFbAuthMode === 'signup') {
    const confirmPwd = confirmPwdInput ? confirmPwdInput.value : '';
    if (password !== confirmPwd) {
      showFbAuthBanner('error', 'Passwords do not match. Please re-enter.');
      return;
    }
  }

  // Loading state
  const originalText = submitText ? submitText.textContent : 'Submit';
  if (submitBtn) submitBtn.disabled = true;
  if (submitText) submitText.textContent = 'Authenticating with Firebase...';

  try {
    if (!window.Firebase) {
      throw new Error('Firebase services are still initializing. Please wait a moment.');
    }

    let result = null;
    if (currentFbAuthMode === 'signup') {
      const displayName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Player';
      result = await window.Firebase.signUpWithEmail(email, password, displayName);
    } else {
      result = await window.Firebase.signInWithEmail(email, password);
    }

    if (result && result.success) {
      const user = result.user;
      showFbAuthBanner('success', `Success! Authenticated as ${user.email}.`);
      showToast(`🔥 Authenticated with Firebase: ${user.email}`);

      // Refresh site header & profile session UI
      updatePlayerSessionUI();
      updateFbAuthModalUI();

      setTimeout(() => {
        closePlayerLoginModal();
      }, 1200);
    } else {
      showFbAuthBanner('error', result ? result.error : 'Authentication failed.');
    }
  } catch (err) {
    console.error("[Firebase Auth Submit]", err);
    showFbAuthBanner('error', err.message || 'Error communicating with Firebase.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = originalText;
  }
}

async function handleFirebaseSignOut() {
  if (window.Firebase && typeof window.Firebase.signOutUser === 'function') {
    await window.Firebase.signOutUser();
  }
  showToast('🔒 Signed out from Firebase.');
  updatePlayerSessionUI();
  updateFbAuthModalUI();
}

async function handleFirebasePasswordReset() {
  const emailInput = document.getElementById('fbInputEmail');
  const email = emailInput ? emailInput.value.trim() : '';
  if (!email || !email.includes('@')) {
    showFbAuthBanner('error', 'Please enter your email address to reset password.');
    return;
  }

  showFbAuthBanner('info', 'Sending password reset email via Firebase...');
  try {
    const res = await window.Firebase.sendPasswordReset(email);
    if (res && res.success) {
      showFbAuthBanner('success', `Password reset email sent to ${email}! Check your inbox.`);
    } else {
      showFbAuthBanner('error', res.error || 'Failed to send reset email.');
    }
  } catch (err) {
    showFbAuthBanner('error', err.message);
  }
}

function updateFbAuthModalUI() {
  const loggedInBox = document.getElementById('fbLoggedInBox');
  const formBox = document.getElementById('fbAuthFormBox');
  const emailVal = document.getElementById('fbUserDetailEmail');
  const nameVal = document.getElementById('fbUserDetailName');
  const uidVal = document.getElementById('fbUserDetailUid');

  const fbUser = window.FirebaseAuth && typeof window.FirebaseAuth.getCurrentUser === 'function'
    ? window.FirebaseAuth.getCurrentUser()
    : null;

  const playerEmail = fbUser ? fbUser.email : localStorage.getItem('player_email');
  const playerUid = fbUser ? fbUser.uid : localStorage.getItem('player_uid');
  const playerName = (fbUser && fbUser.displayName) || localStorage.getItem('player_username') || 'Player';
  const isLoggedIn = Boolean(playerEmail && localStorage.getItem('player_logged_in') !== 'false');

  if (loggedInBox && formBox) {
    if (isLoggedIn) {
      loggedInBox.style.display = 'block';
      formBox.style.display = 'none';
      if (emailVal) emailVal.textContent = playerEmail;
      if (nameVal) nameVal.textContent = playerName;
      if (uidVal) uidVal.textContent = playerUid ? `${playerUid.substring(0, 14)}...` : '-';
    } else {
      loggedInBox.style.display = 'none';
      formBox.style.display = 'block';
    }
  }
}

function switchTgAuthTab(tabName) {
  const tabs = [
    { id: 'firebase_email', btn: 'tabBtnTgFirebaseEmail', view: 'tgAuthViewFirebaseEmail' },
    { id: 'phone', btn: 'tabBtnTgPhone', view: 'tgAuthViewPhone' },
    { id: 'qr', btn: 'tabBtnTgQr', view: 'tgAuthViewQR' },
    { id: 'passkey', btn: 'tabBtnTgPasskey', view: 'tgAuthViewPasskey' },
    { id: 'bot', btn: 'tabBtnTgBot', view: 'tgAuthViewBot' },
    { id: 'test', btn: 'tabBtnTgTest', view: 'tgAuthViewTest' }
  ];

  tabs.forEach(item => {
    const btn = document.getElementById(item.btn);
    if (btn) btn.classList.toggle('active', item.id === tabName);

    const view = document.getElementById(item.view);
    if (view) view.style.display = (item.id === tabName) ? 'block' : 'none';
  });

  const codeView = document.getElementById('tgAuthViewCode');
  const twoFaView = document.getElementById('tgAuthView2FA');
  const signUpView = document.getElementById('tgAuthViewSignUp');

  if (codeView) codeView.style.display = 'none';
  if (twoFaView) twoFaView.style.display = 'none';
  if (signUpView) signUpView.style.display = 'none';

  if (tabName === 'firebase_email') {
    updateFbAuthModalUI();
  }

  if (tabName === 'qr') {
    startQrCountdown();
  } else if (tgQrTimer) {
    clearInterval(tgQrTimer);
    tgQrTimer = null;
  }
}

function backToTgAuthView(viewName) {
  const views = ['firebase_email', 'phone', 'code', '2FA', 'signUp'];
  views.forEach(v => {
    const elId = v === 'firebase_email' ? 'tgAuthViewFirebaseEmail' : ('tgAuthView' + v);
    const el = document.getElementById(elId);
    if (el) el.style.display = (v.toLowerCase() === viewName.toLowerCase()) ? 'block' : 'none';
  });
}

function handleTgCountrySelectChange() {
  const sel = document.getElementById('tgAuthCountrySelect');
  const dialDisplay = document.getElementById('tgPhoneDialCodeDisplay');
  if (sel && dialDisplay) {
    dialDisplay.textContent = sel.value;
  }
}

function fillTestDcAccount(dcNum) {
  const sel = document.getElementById('tgAuthCountrySelect');
  const phoneInput = document.getElementById('tgAuthPhoneInput');
  const dialDisplay = document.getElementById('tgPhoneDialCodeDisplay');

  if (sel) sel.value = '+999';
  if (dialDisplay) dialDisplay.textContent = '+999';

  const testNumbers = {
    1: '6611111',
    2: '6622222',
    3: '6633333'
  };

  if (phoneInput) {
    phoneInput.value = testNumbers[dcNum] || '6611111';
    phoneInput.focus();
  }

  showToast(`⚡ Loaded Test DC ${dcNum} account (+999${testNumbers[dcNum]}). Code: ${dcNum.toString().repeat(5)}`);
}

function fillAndSendTestDc(dcNum) {
  switchTgAuthTab('phone');
  fillTestDcAccount(dcNum);
  setTimeout(() => {
    handleSendTgCode();
  }, 300);
}

function handleSendTgCode() {
  const dialDisplay = document.getElementById('tgPhoneDialCodeDisplay');
  const phoneInput = document.getElementById('tgAuthPhoneInput');
  const deliverySel = document.getElementById('tgCodeDeliverySelect');

  const dial = dialDisplay ? dialDisplay.textContent.trim() : '+91';
  const rawNum = phoneInput ? phoneInput.value.trim().replace(/\D/g, '') : '';

  if (!rawNum || rawNum.length < 5) {
    showToast('⚠️ Please enter a valid phone number to continue.');
    if (phoneInput) phoneInput.focus();
    return;
  }

  const fullPhone = dial + rawNum;
  currentTgAuth.phone = fullPhone;
  currentTgAuth.codeHash = 'hash_' + Math.random().toString(36).substr(2, 9);
  currentTgAuth.codeType = deliverySel ? deliverySel.value : 'app';

  // Check if phone belongs to official Test DC format (99966XYYYY)
  if (rawNum.startsWith('661') || fullPhone.includes('999661')) {
    currentTgAuth.isTestDc = true;
    currentTgAuth.dcId = 1;
    currentTgAuth.expectedCode = '11111';
  } else if (rawNum.startsWith('662') || fullPhone.includes('999662')) {
    currentTgAuth.isTestDc = true;
    currentTgAuth.dcId = 2;
    currentTgAuth.expectedCode = '22222';
  } else if (rawNum.startsWith('663') || fullPhone.includes('999663')) {
    currentTgAuth.isTestDc = true;
    currentTgAuth.dcId = 3;
    currentTgAuth.expectedCode = '33333';
  } else {
    currentTgAuth.isTestDc = false;
    currentTgAuth.expectedCode = '12345';
  }

  // Check future auth token match per MTProto spec
  const futureTokens = getFutureAuthTokens();
  const matchedToken = futureTokens.find(t => t.phone === fullPhone);
  if (matchedToken) {
    showToast('⚡ Future Auth Token matched! Authorizing session instantly (auth.sentCodeSuccess)...');
    setTimeout(() => {
      completeTgAuthorization({
        phone: fullPhone,
        firstName: 'Nova User',
        username: 'nova_auth_' + rawNum.slice(-4)
      });
    }, 600);
    return;
  }

  // Update Code Verification UI
  const destEl = document.getElementById('tgDisplayDestPhone');
  if (destEl) destEl.textContent = fullPhone;

  const badgeEl = document.getElementById('tgCodeTypeBadge');
  if (badgeEl) {
    const badgeNames = {
      app: '📱 Telegram App',
      sms: '💬 SMS Code',
      email: '📧 Email Code',
      fragment: '💎 Fragment SMS',
      call: '📞 Voice Call'
    };
    badgeEl.textContent = badgeNames[currentTgAuth.codeType] || '📱 Telegram App';
  }

  // Auto-fill button label
  const autoFillBtn = document.getElementById('btnTgAutofillTestCode');
  if (autoFillBtn) {
    autoFillBtn.textContent = `⚡ Auto-fill Code (${currentTgAuth.expectedCode})`;
  }

  // Clear PIN inputs
  for (let i = 1; i <= 5; i++) {
    const pinBox = document.getElementById('tgPin' + i);
    if (pinBox) pinBox.value = '';
  }

  // Start resend countdown
  startResendTimer();

  // Switch to Code View
  backToTgAuthView('code');

  setTimeout(() => {
    const p1 = document.getElementById('tgPin1');
    if (p1) p1.focus();
  }, 100);

  ProfileAudio.playClickSoft();
  showToast(`📩 Code sent to ${fullPhone} via ${currentTgAuth.codeType.toUpperCase()}! (Code: ${currentTgAuth.expectedCode})`);
}

function startResendTimer() {
  if (currentTgAuth.resendTimer) clearInterval(currentTgAuth.resendTimer);
  currentTgAuth.resendSeconds = 45;

  const timerText = document.getElementById('tgResendTimerText');
  const secEl = document.getElementById('tgResendSeconds');
  const resendBtn = document.getElementById('btnTgResendCode');

  if (timerText) timerText.style.display = 'inline';
  if (resendBtn) resendBtn.style.display = 'none';
  if (secEl) secEl.textContent = '45s';

  currentTgAuth.resendTimer = setInterval(() => {
    currentTgAuth.resendSeconds--;
    if (secEl) secEl.textContent = currentTgAuth.resendSeconds + 's';

    if (currentTgAuth.resendSeconds <= 0) {
      clearInterval(currentTgAuth.resendTimer);
      currentTgAuth.resendTimer = null;
      if (timerText) timerText.style.display = 'none';
      if (resendBtn) resendBtn.style.display = 'inline';
    }
  }, 1000);
}

function resendTgCode() {
  currentTgAuth.codeType = 'sms';
  const badgeEl = document.getElementById('tgCodeTypeBadge');
  if (badgeEl) badgeEl.textContent = '💬 SMS Code (auth.resendCode)';
  startResendTimer();
  showToast(`📲 Code resent via SMS (auth.resendCode): ${currentTgAuth.expectedCode}`);
}

function handlePinInput(index, event) {
  const input = event.target;
  const val = input.value.replace(/\D/g, '');
  input.value = val ? val[val.length - 1] : '';

  if (input.value && index < 5) {
    const next = document.getElementById('tgPin' + (index + 1));
    if (next) next.focus();
  }

  // Check if all 5 digits are entered
  checkAndAutoSubmitPin();
}

function handlePinKeydown(index, event) {
  if (event.key === 'Backspace' && !event.target.value && index > 1) {
    const prev = document.getElementById('tgPin' + (index - 1));
    if (prev) {
      prev.focus();
      prev.value = '';
    }
  }
}

function checkAndAutoSubmitPin() {
  let pin = '';
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('tgPin' + i);
    if (el && el.value) pin += el.value;
  }
  if (pin.length === 5) {
    setTimeout(() => {
      handleVerifyTgCode();
    }, 200);
  }
}

function autoFillTestCode() {
  const code = currentTgAuth.expectedCode || '12345';
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('tgPin' + i);
    if (el) el.value = code[i - 1] || '';
  }
  setTimeout(() => {
    handleVerifyTgCode();
  }, 150);
}

function handleVerifyTgCode() {
  let enteredPin = '';
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('tgPin' + i);
    if (el) enteredPin += el.value.trim();
  }

  if (enteredPin.length < 5) {
    showToast('⚠️ Please enter all 5 digits of your verification code.');
    return;
  }

  if (enteredPin !== currentTgAuth.expectedCode) {
    ProfileAudio.playWarningBuzzer();
    showToast('❌ 400 PHONE_CODE_INVALID: The confirmation code is incorrect.');
    // Shake pin inputs
    const row = document.getElementById('tgPinInputsRow');
    if (row) {
      row.style.animation = 'shake 0.4s ease';
      setTimeout(() => row.style.animation = '', 400);
    }
    return;
  }

  // Check if 2FA is required for DC2 test account
  if (currentTgAuth.isTestDc && currentTgAuth.dcId === 2) {
    backToTgAuthView('2FA');
    showToast('🔐 400 SESSION_PASSWORD_NEEDED: 2FA cloud password required.');
    const pwdInput = document.getElementById('tg2faPasswordInput');
    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.focus();
    }
    return;
  }

  // Check if new user registration is required for DC3 test account
  if (currentTgAuth.isTestDc && currentTgAuth.dcId === 3) {
    backToTgAuthView('signUp');
    showToast('✨ auth.authorizationSignUpRequired: Complete registration.');
    const fnInput = document.getElementById('tgSignUpFirstName');
    if (fnInput) fnInput.focus();
    return;
  }

  // Standard Success Login
  completeTgAuthorization({
    phone: currentTgAuth.phone,
    firstName: currentTgAuth.isTestDc ? `Test User DC${currentTgAuth.dcId}` : 'Nova Player',
    username: currentTgAuth.isTestDc ? `test_dc${currentTgAuth.dcId}` : 'nova_earner'
  });
}

function toggleTgPasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPwd = input.type === 'password';
  input.type = isPwd ? 'text' : 'password';
  if (btnEl) btnEl.textContent = isPwd ? '🔒' : '👁️';
}

function handleVerifyTg2FA() {
  const pwdInput = document.getElementById('tg2faPasswordInput');
  const val = pwdInput ? pwdInput.value.trim() : '';

  if (!val) {
    showToast('⚠️ Please enter your 2FA cloud password.');
    if (pwdInput) pwdInput.focus();
    return;
  }

  // Accept password
  completeTgAuthorization({
    phone: currentTgAuth.phone,
    firstName: 'Nova 2FA VIP',
    username: 'nova_2fa_secure'
  });
}

function populateSignUpAvatarOptions() {
  const row = document.getElementById('tgSignUpAvatarRow');
  if (!row || row.children.length > 0) return;

  const avatars = ["⚡", "👑", "💎", "🚀", "🦊", "🦁", "🎯", "🤖"];
  avatars.forEach((av, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tg-test-chip' + (idx === 0 ? ' active' : '');
    btn.style.fontSize = '1.2rem';
    btn.textContent = av;
    btn.onclick = () => {
      row.querySelectorAll('.tg-test-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    row.appendChild(btn);
  });
}

function handleCompleteTgSignUp() {
  const fnInput = document.getElementById('tgSignUpFirstName');
  const lnInput = document.getElementById('tgSignUpLastName');
  const fn = fnInput ? fnInput.value.trim() : '';
  const ln = lnInput ? lnInput.value.trim() : '';

  if (!fn) {
    showToast('⚠️ Please enter your first name.');
    if (fnInput) fnInput.focus();
    return;
  }

  const activeAvBtn = document.querySelector('#tgSignUpAvatarRow .tg-test-chip.active');
  const avatar = activeAvBtn ? activeAvBtn.textContent.trim() : '⚡';

  completeTgAuthorization({
    phone: currentTgAuth.phone,
    firstName: fn,
    lastName: ln,
    username: fn.toLowerCase().replace(/\s+/g, '_') + '_tg',
    avatar: avatar
  });
}

// QR Code Flow
function startQrCountdown() {
  tgQrSeconds = 30;
  const timerEl = document.getElementById('tgQrTimerText');
  if (timerEl) timerEl.textContent = tgQrSeconds + 's';

  if (tgQrTimer) clearInterval(tgQrTimer);
  tgQrTimer = setInterval(() => {
    tgQrSeconds--;
    if (timerEl) timerEl.textContent = tgQrSeconds + 's';
    if (tgQrSeconds <= 0) {
      refreshTgQrToken();
    }
  }, 1000);
}

function refreshTgQrToken() {
  tgQrSeconds = 30;
  const timerEl = document.getElementById('tgQrTimerText');
  if (timerEl) timerEl.textContent = '30s';
  showToast('🔄 QR Login Token refreshed (auth.exportLoginToken).');
}

function simulateQrLoginApprove() {
  showToast('📷 QR Code scanned by Telegram mobile app! Authorizing...');
  setTimeout(() => {
    completeTgAuthorization({
      phone: '+1 555-0199',
      firstName: 'Desktop Client',
      username: 'telegram_desktop'
    });
  }, 500);
}

// Passkey Flow
function handlePasskeyAuth() {
  showToast('👆 Verifying biometric passkey (auth.initPasskeyLogin)...');
  setTimeout(() => {
    completeTgAuthorization({
      phone: '+1 555-PASS',
      firstName: 'Passkey Master',
      username: 'biometric_vip'
    });
  }, 600);
}

// Bot Token Flow
function handleBotTokenAuth() {
  const tokenInput = document.getElementById('tgBotTokenInput');
  const token = tokenInput ? tokenInput.value.trim() : '';

  if (!token || !token.includes(':')) {
    showToast('⚠️ Please enter a valid Telegram Bot Token from @BotFather.');
    return;
  }

  completeTgAuthorization({
    phone: 'BOT',
    firstName: 'NovaTaskBot 🤖',
    username: 'NovaTaskOfficialBot',
    avatar: '🤖',
    isBot: true
  });
}

function handleFutureTokenLogin() {
  const tokens = getFutureAuthTokens();
  if (tokens.length === 0) {
    showToast('⚠️ No future auth token available.');
    return;
  }
  const latest = tokens[0];
  showToast(`⚡ Fast login using cached token for ${latest.phone}...`);
  setTimeout(() => {
    completeTgAuthorization({
      phone: latest.phone,
      firstName: 'Nova Earner',
      username: 'nova_token_user'
    });
  }, 400);
}

function completeTgAuthorization(userData) {
  const username = userData.firstName || userData.username || 'NovaEarner';
  const phone = userData.phone || '+919876543210';
  const avatar = userData.avatar || '⚡';

  // Save session info
  const sessionData = {
    authKeyId: 'auth_key_#' + Math.random().toString(16).substr(2, 8),
    phone: phone,
    firstName: userData.firstName,
    lastName: userData.lastName || '',
    username: userData.username || 'nova_earner',
    avatar: avatar,
    isBot: Boolean(userData.isBot),
    dateCreated: Date.now()
  };

  localStorage.setItem(TG_SESSION_KEY, JSON.stringify(sessionData));
  localStorage.setItem('player_username', username);
  localStorage.setItem('player_logged_in', 'true');
  if (userData.avatar) {
    localStorage.setItem('player_avatar', avatar);
  }

  // Also update Telegram Profile record if exists
  try {
    const prof = getTgProfile();
    prof.firstName = userData.firstName || prof.firstName;
    if (userData.lastName) prof.lastName = userData.lastName;
    if (userData.username) prof.username = userData.username;
    if (userData.avatar) prof.avatar = userData.avatar;
    saveTgProfile(prof);
  } catch (e) {}

  // Save future auth token
  storeFutureAuthToken(phone);

  closePlayerLoginModal();
  updatePlayerSessionUI();
  updateAdminLiveDisplays();
  syncProfileReferralCode();

  ProfileAudio.playRewardFanfare();
  showToast(`✓ Telegram Authorized! Key: ${sessionData.authKeyId} (${username})`);

  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'USER_LOGIN', username: username });
  } catch (e) {}
}

// Active Devices & Sessions Modal Management
function openTgActiveSessionsModal() {
  const modal = document.getElementById('tgActiveSessionsModalOverlay');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
  updateFutureTokensUI();
}

function closeTgActiveSessionsModal() {
  const modal = document.getElementById('tgActiveSessionsModalOverlay');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function handleActiveSessionsModalBackdrop(event) {
  if (event && (event.target.id === 'tgActiveSessionsModalOverlay' || event.target.classList.contains('profile-modal-overlay'))) {
    closeTgActiveSessionsModal();
  }
}

function terminateSingleSession(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.style.opacity = '0.4';
    card.style.pointerEvents = 'none';
    card.innerHTML += `<div style="color: #ef4444; font-size: 0.65rem; font-weight: 800; margin-top: 4px;">✓ Session Terminated (account.resetAuthorization)</div>`;
    ProfileAudio.playClickSoft();
    showToast('🛑 Session terminated successfully.');
  }
}

function terminateAllOtherTgSessions() {
  const list = document.getElementById('tgOtherSessionsList');
  if (list) {
    list.innerHTML = `<div style="text-align: center; padding: 1rem; color: #10b981; font-size: 0.76rem; font-weight: 700;">✓ All other sessions terminated (account.resetAuthorization). Only current session is active.</div>`;
    ProfileAudio.playClickSoft();
    showToast('🛑 Terminated all other active sessions.');
  }
}

function triggerSimulatedNewAuthAlert() {
  const alertModal = document.getElementById('tgNewSessionConfirmModal');
  if (alertModal) {
    alertModal.style.display = 'flex';
    ProfileAudio.playWarningBuzzer();
  }
}

function confirmNewSessionAlert(isConfirmed) {
  const alertModal = document.getElementById('tgNewSessionConfirmModal');
  if (alertModal) alertModal.style.display = 'none';

  if (isConfirmed) {
    showToast('✓ Session confirmed (account.changeAuthorizationSettings: confirmed=true).');
  } else {
    showToast('🛑 Session rejected and terminated (account.resetAuthorization).');
  }
}

// =============================================================================

// =============================================================================
// UNIQUE REFERRAL CODE & FIREBASE SYNC (Per-Profile Different Code)
// =============================================================================

function getOrCreateReferralCode() {
  let code = localStorage.getItem(REFERRAL_CODE_KEY);
  if (!code) {
    const player = getCurrentPlayer();
    // Unique code customized per profile
    let prefix = 'NOVA';
    if (player.username) {
      prefix = player.username.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase();
      if (!prefix) prefix = 'USER';
    }
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    code = `${prefix}-${randomNum}`;
    localStorage.setItem(REFERRAL_CODE_KEY, code);
  }

  // Synchronize to Firebase cloud in background
  syncProfileReferralCode(code);

  return code;
}

function syncProfileReferralCode(customCode) {
  const code = customCode || localStorage.getItem(REFERRAL_CODE_KEY);
  const player = getCurrentPlayer();
  if (!code) return;

  if (window.Firebase && typeof window.Firebase.registerReferralCodeInCloud === 'function') {
    window.Firebase.registerReferralCodeInCloud(code, player.id, player.username).catch(() => {});
  } else {
    // Save to local cloud cache
    try {
      const rawLocal = localStorage.getItem('task_game_cloud_referral_codes');
      const localCodes = rawLocal ? JSON.parse(rawLocal) : {};
      localCodes[code.toUpperCase()] = {
        code: code.toUpperCase(),
        userId: player.id,
        userName: player.username,
        rewardCoins: 100,
        updatedAt: Date.now()
      };
      localStorage.setItem('task_game_cloud_referral_codes', JSON.stringify(localCodes));
    } catch (e) {}
  }
}

function getStoredReferrals() {
  try {
    const raw = localStorage.getItem(REFERRALS_LIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveReferrals(list) {
  localStorage.setItem(REFERRALS_LIST_KEY, JSON.stringify(list));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'REFERRAL_UPDATED', timestamp: Date.now() });
  } catch (e) {}
}

let pendingReferralReward = null;

function initReferralSystem() {
  const code = getOrCreateReferralCode();
  const userCodeEl = document.getElementById('userReferralCode');
  const inviteLinkInput = document.getElementById('inviteLinkInput');

  if (userCodeEl) userCodeEl.textContent = code;

  const origin = window.location.origin.includes('http') ? window.location.origin : 'http://127.0.0.1:5500';
  const shareLink = `${origin}/?ref=${code}`;
  if (inviteLinkInput) inviteLinkInput.value = shareLink;

  updatePlayerSessionUI();

  // Check if user already claimed referral bonus
  const isRedeemed = localStorage.getItem(REDEEMED_REFERRAL_KEY) === 'true';
  const inputFriendCode = document.getElementById('inputFriendReferralCode');
  const btnVerify = document.getElementById('btnVerifyReferralCode');
  const btnVerifyText = document.getElementById('btnVerifyText');
  const claimRow = document.getElementById('referralClaimRow');
  const redeemSuccessMsg = document.getElementById('redeemSuccessMsg');
  const verifyStatus = document.getElementById('referralVerifyStatus');

  if (isRedeemed) {
    if (inputFriendCode) {
      inputFriendCode.value = 'CLAIMED ✓';
      inputFriendCode.disabled = true;
    }
    if (btnVerify) {
      btnVerify.disabled = true;
      btnVerify.classList.add('verified-done');
    }
    if (btnVerifyText) {
      btnVerifyText.textContent = 'Claimed ✓';
    }
    if (claimRow) {
      claimRow.style.display = 'none';
    }
    if (verifyStatus) {
      verifyStatus.style.display = 'none';
    }
    if (redeemSuccessMsg) {
      redeemSuccessMsg.style.display = 'flex';
      redeemSuccessMsg.innerHTML = '<span>✓ Referral bonus (+100 🪙) already claimed by this profile!</span>';
    }
  } else {
    // Reset claim row to hidden until Firebase verification
    if (claimRow) claimRow.style.display = 'none';
    if (verifyStatus) verifyStatus.style.display = 'none';
    pendingReferralReward = null;
  }

  renderReferralStatsAndList();
}

function renderReferralStatsAndList() {
  const referrals = getStoredReferrals();
  const totalInvited = referrals.length;
  const totalCoins = totalInvited * 100; // 100 coin win per invite

  const countEl = document.getElementById('refTotalInvited');
  const coinsEl = document.getElementById('refCoinsEarned');
  const rateEl = document.getElementById('refRewardRate');
  const starsEl = document.getElementById('refStarsEarned');
  const listCountEl = document.getElementById('refListCount');

  if (countEl) countEl.textContent = totalInvited.toString();
  if (coinsEl) coinsEl.textContent = `+${totalCoins.toLocaleString()} 🪙`;
  if (rateEl) rateEl.textContent = '+100 🪙';
  if (starsEl) starsEl.textContent = '0 ⭐';
  if (listCountEl) listCountEl.textContent = `${totalInvited} Friend${totalInvited === 1 ? '' : 's'}`;

  const listContainer = document.getElementById('recentReferralsList');
  if (!listContainer) return;

  if (referrals.length === 0) {
    listContainer.innerHTML = `
      <div class="referral-empty-state">
        <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">👥</div>
        <div>No friends invited yet.</div>
        <div style="color: #64748b; font-size: 0.7rem; margin-top: 0.15rem;">Share your code above (+100 🪙 each) or click "Simulate Friend Joined" to test!</div>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = referrals.map(r => `
    <div class="referral-item-card">
      <div class="referral-item-left">
        <div class="referral-avatar">${r.avatar || '👤'}</div>
        <div>
          <div class="referral-name">${escapeHtml(r.name)}</div>
          <div class="referral-time">${escapeHtml(r.time || 'Recently')}</div>
        </div>
      </div>
      <span class="referral-reward-pill">+100 🪙</span>
    </div>
  `).join('');
}

function copyReferralCode() {
  const code = getOrCreateReferralCode();
  const btn = document.getElementById('btnCopyCode');
  const textEl = document.getElementById('copyCodeText');

  navigator.clipboard.writeText(code).then(() => {
    ProfileAudio.playCopyChime();
    showToast(`✓ Referral Code "${code}" copied to clipboard!`);
    if (textEl) textEl.textContent = 'Copied! ✓';
    if (btn) btn.style.background = 'linear-gradient(155deg, #10b981 0%, #059669 100%)';
    setTimeout(() => {
      if (textEl) textEl.textContent = 'Copy Code';
      if (btn) btn.style.background = '';
    }, 2000);
  }).catch(() => {
    prompt('Copy your referral code:', code);
  });
}

function copyReferralLink() {
  const input = document.getElementById('inviteLinkInput');
  const textEl = document.getElementById('copyLinkText');
  const url = input ? input.value : `http://127.0.0.1:5500/?ref=${getOrCreateReferralCode()}`;

  navigator.clipboard.writeText(url).then(() => {
    ProfileAudio.playCopyChime();
    showToast('✓ Invite link copied to clipboard!');
    if (textEl) textEl.textContent = 'Copied!';
    setTimeout(() => {
      if (textEl) textEl.textContent = 'Copy';
    }, 2000);
  }).catch(() => {
    prompt('Copy your invite link:', url);
  });
}

function shareOnWhatsApp() {
  const code = getOrCreateReferralCode();
  const url = document.getElementById('inviteLinkInput')?.value || `http://127.0.0.1:5500/?ref=${code}`;
  const text = encodeURIComponent(`🎮 Join me on Nova Task Game to complete missions & earn real cash! Use my unique code: ${code}\nWin 100 coins now: ${url}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

function shareOnTelegram() {
  const code = getOrCreateReferralCode();
  const url = document.getElementById('inviteLinkInput')?.value || `http://127.0.0.1:5500/?ref=${code}`;
  const text = encodeURIComponent(`Join Nova Task Game & earn real rewards! My unique code: ${code} (Win 100 coins)`);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
}

function nativeShareInvite() {
  const code = getOrCreateReferralCode();
  const url = document.getElementById('inviteLinkInput')?.value || `http://127.0.0.1:5500/?ref=${code}`;
  const shareData = {
    title: 'Nova Task Game — Join & Earn 100 Coins',
    text: `Join me on Nova Task Game and win 100 coins! My unique invite code: ${code}`,
    url: url
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    navigator.share(shareData).catch(() => {});
  } else {
    copyReferralLink();
  }
}

// =============================================================================
// FIREBASE CODE VERIFICATION & CLAIM REVELATION ("than after a cliam are show")
// =============================================================================

/**
 * Handle friend referral code verification:
 * 1. Checks if user is logged in or not.
 * 2. Checks with Firebase Firestore database.
 * 3. Shows "Claim +100 🪙" button only after Firebase verification succeeds!
 */
async function handleVerifyFriendCode() {
  const input = document.getElementById('inputFriendReferralCode');
  const verifyBtn = document.getElementById('btnVerifyReferralCode');
  const verifyBtnText = document.getElementById('btnVerifyText');
  const statusBox = document.getElementById('referralVerifyStatus');
  const claimRow = document.getElementById('referralClaimRow');

  if (!input || !statusBox || !claimRow) return;

  // Step 1: User Login Check ("user are login or not that cheak")
  if (!isUserLoggedIn()) {
    statusBox.style.display = 'block';
    statusBox.className = 'referral-verify-status error';
    statusBox.innerHTML = `
      <div>⚠️ <b>User Not Logged In!</b></div>
      <div style="margin-top: 0.2rem; font-size: 0.7rem;">Please log in to your player account first before verifying and claiming a friend code.</div>
    `;
    claimRow.style.display = 'none';
    showToast('⚠️ Please log in to your profile first!');
    openPlayerLoginModal();
    return;
  }

  // Step 2: Validate Input
  const rawVal = input.value.trim().toUpperCase();
  if (!rawVal) {
    statusBox.style.display = 'block';
    statusBox.className = 'referral-verify-status error';
    statusBox.innerHTML = `⚠️ Please enter a referral code to verify.`;
    claimRow.style.display = 'none';
    input.focus();
    return;
  }

  // Step 3: Check Self-Referral
  const myCode = getOrCreateReferralCode().toUpperCase();
  if (rawVal === myCode) {
    statusBox.style.display = 'block';
    statusBox.className = 'referral-verify-status error';
    statusBox.innerHTML = `⚠️ <b>Self-Referral Rejected:</b> You cannot redeem your own profile's referral code!`;
    claimRow.style.display = 'none';
    return;
  }

  // Step 4: Check if already redeemed
  if (localStorage.getItem(REDEEMED_REFERRAL_KEY) === 'true') {
    statusBox.style.display = 'block';
    statusBox.className = 'referral-verify-status error';
    statusBox.innerHTML = `⚠️ <b>Already Claimed:</b> You have already claimed your 100 coin referral reward.`;
    claimRow.style.display = 'none';
    return;
  }

  // Step 5: Firebase Cloud Verification in Progress
  statusBox.style.display = 'flex';
  statusBox.className = 'referral-verify-status verifying';
  statusBox.innerHTML = `
    <span>🔄</span>
    <span>Connecting to Firebase... Verifying code <b>"${rawVal}"</b>...</span>
  `;
  if (verifyBtn) verifyBtn.disabled = true;
  if (verifyBtnText) verifyBtnText.textContent = 'Verifying...';
  claimRow.style.display = 'none';

  // Small delay for UI smoothness and real-time network feel
  await new Promise(r => setTimeout(r, 450));

  const player = getCurrentPlayer();
  let verifyResult = null;

  try {
    if (window.Firebase && typeof window.Firebase.verifyReferralCodeInCloud === 'function') {
      verifyResult = await window.Firebase.verifyReferralCodeInCloud(rawVal, player.id);
    } else {
      // Fallback local verification against known profiles and cloud cache
      verifyResult = verifyReferralCodeFallback(rawVal, player.id);
    }
  } catch (err) {
    console.warn('[Firebase Verification Error]:', err);
    verifyResult = verifyReferralCodeFallback(rawVal, player.id);
  }

  // Step 6: Process Verification Outcome
  if (!verifyResult || !verifyResult.valid) {
    statusBox.style.display = 'block';
    statusBox.className = 'referral-verify-status error';
    statusBox.innerHTML = `❌ <b>Firebase Verification Failed:</b> ${escapeHtml(verifyResult?.error || 'Code not found in Firebase database.')}`;
    if (verifyBtn) verifyBtn.disabled = false;
    if (verifyBtnText) verifyBtnText.textContent = 'Verify Code 🔍';
    claimRow.style.display = 'none';
    showToast('❌ Referral code verification failed.');
    return;
  }

  // SUCCESS: Firebase Verified!
  pendingReferralReward = verifyResult;

  statusBox.style.display = 'block';
  statusBox.className = 'referral-verify-status verified';
  statusBox.innerHTML = `
    <div>✅ <b>Firebase Verified!</b> Code is registered to <b>${escapeHtml(verifyResult.ownerName)}</b>.</div>
    <div style="font-size: 0.68rem; margin-top: 0.15rem; color: #a7f3d0;">Verification passed via ${escapeHtml(verifyResult.source || 'Firebase Cloud')}. Claim button unlocked below!</div>
  `;

  input.disabled = true;
  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.classList.add('verified-done');
  }
  if (verifyBtnText) {
    verifyBtnText.textContent = 'Verified ✓';
  }

  ProfileAudio.playCopyChime();

  // STEP 7: "than after a cliam are show"
  // The Claim +100 🪙 button is now revealed to the user!
  claimRow.style.display = 'block';
  showToast(`✅ Code verified! Click "CLAIM +100 🪙 BONUS" now!`, 3500);
}

/**
 * Fallback local verification if Firebase offline
 */
function verifyReferralCodeFallback(code, currentUserId) {
  const cleanCode = String(code).trim().toUpperCase();

  // Check local cache
  try {
    const rawLocal = localStorage.getItem('task_game_cloud_referral_codes');
    if (rawLocal) {
      const localCodes = JSON.parse(rawLocal);
      if (localCodes[cleanCode]) {
        const item = localCodes[cleanCode];
        if (currentUserId && item.userId && String(item.userId) === String(currentUserId)) {
          return { valid: false, error: 'You cannot redeem your own profile referral code!' };
        }
        return { valid: true, code: cleanCode, ownerName: item.userName || 'Friend', ownerUserId: item.userId, rewardCoins: 100, source: 'Firebase Sync Cache' };
      }
    }
  } catch (e) {}

  return { valid: false, error: `Code "${cleanCode}" not found in Firebase registry. Enter a valid registered friend code.` };
}

/**
 * Handle claiming the 100 coin reward:
 * Triggered when user clicks the revealed "Claim +100 🪙" button!
 */
async function handleClaimReferralReward() {
  if (!isUserLoggedIn()) {
    showToast('⚠️ Please log in to your profile first.');
    openPlayerLoginModal();
    return;
  }

  if (!pendingReferralReward) {
    showToast('⚠️ Please verify a friend code first.');
    return;
  }

  if (localStorage.getItem(REDEEMED_REFERRAL_KEY) === 'true') {
    showToast('⚠️ Referral bonus already claimed!');
    return;
  }

  const claimBtn = document.getElementById('btnClaimReferralCode');
  const claimRow = document.getElementById('referralClaimRow');
  const successMsg = document.getElementById('redeemSuccessMsg');
  const player = getCurrentPlayer();

  // Credit 100 coins win
  const rewardCoins = 100;
  let coins = parseInt(localStorage.getItem('task_game_coins') || '0', 10) + rewardCoins;
  localStorage.setItem('task_game_coins', coins.toString());
  localStorage.setItem(REDEEMED_REFERRAL_KEY, 'true');
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

  // Record redemption in Firebase
  if (window.Firebase && typeof window.Firebase.redeemReferralCodeInCloud === 'function') {
    window.Firebase.redeemReferralCodeInCloud(pendingReferralReward.code, player.id, player.username).catch(() => {});
  }

  // Add friend to invited list
  const referrals = getStoredReferrals();
  referrals.unshift({
    id: `ref_${Date.now()}`,
    name: pendingReferralReward.ownerName || 'Friend',
    avatar: '🎁',
    time: 'Just now',
    rewardCoins: 100,
    rewardStars: 0,
    timestamp: Date.now()
  });
  saveReferrals(referrals);

  // Audio and visual celebrations
  ProfileAudio.playRewardFanfare();
  if (claimBtn) showFloatingCoin(claimBtn, `+${rewardCoins} 🪙`);

  if (claimRow) claimRow.style.display = 'none';

  if (successMsg) {
    successMsg.style.display = 'flex';
    successMsg.innerHTML = `<span>🎉 Claimed successfully! +${rewardCoins} 🪙 added to your wallet!</span>`;
  }

  updateAdminLiveDisplays();
  renderReferralStatsAndList();
  showToast(`🎉 Congratulations! +${rewardCoins} 🪙 claimed successfully!`, 3500);

  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'COINS_UPDATED', timestamp: Date.now() });
  } catch (e) {}
}

const SAMPLE_FRIEND_NAMES = [
  'Alex_Gamer', 'ShadowTyper', 'CyberViper', 'NeonBlaze', 'Phoenix99', 
  'QuantumCoder', 'StarHunter', 'HyperStrike', 'VortexPilot', 'LunaBlade'
];
const SAMPLE_AVATARS = ['⚡', '🎮', '🚀', '🔥', '👑', '🎯', '💎', '🌟', '🛡️', '👾'];

function simulateFriendJoin() {
  const btn = event ? (event.target.closest('button') || event.target) : null;
  const referrals = getStoredReferrals();

  const randName = SAMPLE_FRIEND_NAMES[Math.floor(Math.random() * SAMPLE_FRIEND_NAMES.length)] + '_' + Math.floor(10 + Math.random() * 89);
  const randAvatar = SAMPLE_AVATARS[Math.floor(Math.random() * SAMPLE_AVATARS.length)];

  const newRef = {
    id: `ref_${Date.now()}`,
    name: randName,
    avatar: randAvatar,
    time: 'Just now',
    rewardCoins: 100,
    rewardStars: 0,
    timestamp: Date.now()
  };

  referrals.unshift(newRef);
  if (referrals.length > 20) referrals.pop();
  saveReferrals(referrals);

  // Credit user +100 Coins per invite
  let coins = parseInt(localStorage.getItem('task_game_coins') || '0', 10) + 100;
  localStorage.setItem('task_game_coins', coins.toString());
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

  ProfileAudio.playRewardFanfare();
  if (btn) showFloatingCoin(btn, '+100 🪙');

  renderReferralStatsAndList();
  updateAdminLiveDisplays();

  showToast(`🎉 ${randName} joined with your code! +100 🪙 added!`, 3500);

  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'REFERRAL_JOINED', timestamp: Date.now() });
  } catch (e) {}
}

// ============================================================================
// INVITE FRIENDS POPUP MODAL CONTROLLER
// ============================================================================
function openInviteFriendsModal() {
  const modal = document.getElementById('inviteFriendsModalOverlay');
  if (!modal) return;

  initReferralSystem();
  modal.classList.add('active');
  modal.style.display = 'flex';
  toggleEditReferralCode(false);

  if (ProfileAudio && typeof ProfileAudio.playTabSwitch === 'function') {
    ProfileAudio.playTabSwitch();
  }
}

function closeInviteFriendsModal() {
  const modal = document.getElementById('inviteFriendsModalOverlay');
  if (!modal) return;

  modal.classList.remove('active');
  modal.style.display = 'none';
  toggleEditReferralCode(false);
}

function handleInviteModalBackdropClick(event) {
  if (event && (event.target.id === 'inviteFriendsModalOverlay' || event.target.classList.contains('profile-modal-overlay'))) {
    closeInviteFriendsModal();
  }
}

function toggleEditReferralCode(isEditing) {
  const displayRow = document.getElementById('codeDisplayRow');
  const editRow = document.getElementById('codeEditRow');
  const input = document.getElementById('inputCustomReferralCode');

  if (isEditing) {
    if (displayRow) displayRow.style.display = 'none';
    if (editRow) editRow.style.display = 'flex';
    if (input) {
      input.value = getOrCreateReferralCode();
      input.focus();
      input.select();
    }
  } else {
    if (displayRow) displayRow.style.display = 'flex';
    if (editRow) editRow.style.display = 'none';
  }
}

function saveCustomReferralCode() {
  const input = document.getElementById('inputCustomReferralCode');
  const rawVal = input ? input.value.trim().toUpperCase() : '';
  const cleaned = rawVal.replace(/[^A-Z0-9_-]/g, '');

  if (!cleaned || cleaned.length < 3) {
    showToast('⚠️ Referral code must be at least 3 characters.');
    if (input) input.focus();
    return;
  }

  localStorage.setItem(REFERRAL_CODE_KEY, cleaned);

  // Save to Firebase Firestore
  const player = getCurrentPlayer();
  if (window.Firebase && typeof window.Firebase.registerReferralCodeInCloud === 'function') {
    window.Firebase.registerReferralCodeInCloud(cleaned, player.id, player.username).catch(() => {});
  }

  // Update UI in popup
  const userCodeEl = document.getElementById('userReferralCode');
  const inviteLinkInput = document.getElementById('inviteLinkInput');
  if (userCodeEl) userCodeEl.textContent = cleaned;

  const origin = window.location.origin.includes('http') ? window.location.origin : 'http://127.0.0.1:5500';
  const shareLink = `${origin}/?ref=${cleaned}`;
  if (inviteLinkInput) inviteLinkInput.value = shareLink;

  toggleEditReferralCode(false);

  if (ProfileAudio && typeof ProfileAudio.playRewardFanfare === 'function') {
    ProfileAudio.playRewardFanfare();
  }
  showToast(`🎉 Unique Code updated to "${cleaned}" & saved to Firebase!`, 3000);

  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'REFERRAL_CODE_CHANGED', code: cleaned });
  } catch (e) {}
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeInviteFriendsModal();
    closePlayerLoginModal();
  }
});

window.openInviteFriendsModal = openInviteFriendsModal;
window.closeInviteFriendsModal = closeInviteFriendsModal;
window.handleInviteModalBackdropClick = handleInviteModalBackdropClick;
window.toggleEditReferralCode = toggleEditReferralCode;
window.saveCustomReferralCode = saveCustomReferralCode;
window.copyReferralCode = copyReferralCode;
window.copyReferralLink = copyReferralLink;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnTelegram = shareOnTelegram;
window.nativeShareInvite = nativeShareInvite;
window.handleVerifyFriendCode = handleVerifyFriendCode;
window.handleClaimReferralReward = handleClaimReferralReward;
window.simulateFriendJoin = simulateFriendJoin;
window.togglePlayerLoginState = togglePlayerLoginState;
window.openPlayerLoginModal = openPlayerLoginModal;
window.closePlayerLoginModal = closePlayerLoginModal;
window.handlePlayerLoginModalBackdropClick = handlePlayerLoginModalBackdropClick;
window.handlePlayerLoginForm = handlePlayerLoginForm;

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
// TELEGRAM USER PROFILE (MTProto Specs: user, userFull, account.updateProfile)
// ============================================================================
const TG_PROFILE_KEY = 'task_game_tg_profile';

const DEFAULT_TG_PROFILE = {
  firstName: "Nova",
  lastName: "Earner",
  username: "nova_earner",
  bio: "🎮 Web Task Champion • Official Telegram Mini App Player",
  avatar: "⚡",
  emojiStatus: "⚡",
  accentColor: "blue",
  birthday: "Oct 12",
  personalChannel: "@NovaCommunityOfficial",
  note: "Complete daily WebTasks & claim ₹100 Amazon Voucher",
  onlineStatus: "online",
  activeProfileTab: "gifts"
};

const TG_AVATAR_OPTIONS = ["⚡", "👤", "👑", "💎", "🚀", "🦊", "🦁", "🎯", "🤖", "💻"];
const TG_STATUS_EMOJIS = ["⚡", "👑", "💎", "🔥", "🚀", "🌟", "🛡️", "💫", "🦊", "🏆"];

let currentTgProfile = null;
let currentMusicPlaying = false;

function getTgProfile() {
  if (currentTgProfile) return currentTgProfile;
  try {
    const raw = localStorage.getItem(TG_PROFILE_KEY);
    if (raw) {
      currentTgProfile = Object.assign({}, DEFAULT_TG_PROFILE, JSON.parse(raw));
    } else {
      currentTgProfile = Object.assign({}, DEFAULT_TG_PROFILE);
    }
  } catch (e) {
    currentTgProfile = Object.assign({}, DEFAULT_TG_PROFILE);
  }
  return currentTgProfile;
}

function saveTgProfile(profile) {
  currentTgProfile = profile;
  localStorage.setItem(TG_PROFILE_KEY, JSON.stringify(profile));
  // Sync to player_username & player_avatar
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'NovaEarner';
  localStorage.setItem('player_username', fullName);
  localStorage.setItem('player_avatar', profile.avatar || '⚡');
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PROFILE_UPDATED', timestamp: Date.now() });
    } catch (e) {}
  }

  renderTgProfileUI();
  updateAdminLiveDisplays();
}

function renderTgProfileUI() {
  const p = getTgProfile();

  // Name
  const nameEl = document.getElementById('tgProfileDisplayName');
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'NovaEarner';
  if (nameEl) nameEl.textContent = fullName;

  // Avatar
  const bigAvatar = document.getElementById('tgProfileBigAvatar');
  if (bigAvatar) bigAvatar.textContent = p.avatar || '⚡';

  // Emoji Status
  const emojiStatusEl = document.getElementById('tgProfileEmojiStatus');
  if (emojiStatusEl) emojiStatusEl.textContent = p.emojiStatus || '⚡';

  // Username
  const usernameEl = document.getElementById('tgProfileUsername');
  if (usernameEl) usernameEl.textContent = p.username || 'nova_earner';

  // Bio
  const bioEl = document.getElementById('tgProfileBio');
  if (bioEl) bioEl.textContent = p.bio || '🎮 Web Task Champion • Official Telegram Mini App Player';

  // Birthday
  const bdayEl = document.getElementById('tgProfileBirthdayText');
  if (bdayEl) bdayEl.textContent = p.birthday || 'Oct 12';

  // Channel
  const channelEl = document.getElementById('tgProfileChannelText');
  const linkChannelName = document.getElementById('tgLinkChannelName');
  const chanName = p.personalChannel ? (p.personalChannel.startsWith('@') ? p.personalChannel : '@' + p.personalChannel) : '@NovaChannel';
  if (channelEl) channelEl.textContent = chanName;
  if (linkChannelName) linkChannelName.textContent = chanName;

  // Note
  const noteEl = document.getElementById('tgProfileNote');
  if (noteEl) noteEl.textContent = p.note ? `Private Note: ${p.note}` : 'Private Note: No note added';

  // Online Status
  const onlineDot = document.getElementById('tgOnlineDot');
  const onlineText = document.getElementById('tgOnlineText');
  const onlineChip = document.getElementById('tgProfileOnlineChip');
  if (p.onlineStatus === 'online') {
    if (onlineDot) onlineDot.textContent = '🟢';
    if (onlineText) onlineText.textContent = 'Online';
    if (onlineChip) onlineChip.className = 'tg-meta-chip online';
  } else {
    if (onlineDot) onlineDot.textContent = '⚪';
    if (onlineText) onlineText.textContent = 'Recently';
    if (onlineChip) onlineChip.className = 'tg-meta-chip';
  }

  // Accent Color
  applyTgProfileAccentColor(p.accentColor || 'blue', false);

  // Active Tab
  switchTgProfileTab(p.activeProfileTab || 'gifts', false);
}

function applyTgProfileAccentColor(color, save = true) {
  const heroCard = document.getElementById('tgProfileHeroCard');
  if (heroCard) {
    heroCard.className = `profile-hero-card theme-${color}`;
  }

  // Update dots
  const dots = ['blue', 'purple', 'green', 'red', 'gold', 'pink'];
  dots.forEach(d => {
    const el = document.getElementById('dot' + d.charAt(0).toUpperCase() + d.slice(1));
    if (el) {
      if (d === color) el.classList.add('active');
      else el.classList.remove('active');
    }
  });

  if (save) {
    const p = getTgProfile();
    p.accentColor = color;
    saveTgProfile(p);
  }
}

function setTgProfileAccentColor(color) {
  applyTgProfileAccentColor(color, true);
  showToast(`Profile Theme set to ${color.toUpperCase()} ✨`);
}

function switchTgProfileTab(tabName, save = true) {
  const tabs = ['gifts', 'music', 'stories', 'links'];
  tabs.forEach(t => {
    const btn = document.getElementById(`ptabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const panel = document.getElementById(`panelTg${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      if (t === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (panel) {
      if (t === tabName) panel.classList.add('active');
      else panel.classList.remove('active');
    }
  });

  if (save) {
    const p = getTgProfile();
    p.activeProfileTab = tabName;
    saveTgProfile(p);
  }
}

function toggleOnlineStatus() {
  const p = getTgProfile();
  p.onlineStatus = p.onlineStatus === 'online' ? 'offline' : 'online';
  saveTgProfile(p);
  showToast(p.onlineStatus === 'online' ? 'Status: Online 🟢' : 'Status: Last seen recently ⚪');
}

function copyProfileUsername() {
  const p = getTgProfile();
  const uname = p.username || 'nova_earner';
  const full = uname.startsWith('@') ? uname : `@${uname}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(full).then(() => {
      showToast(`Copied ${full} to clipboard! 📋`);
    }).catch(() => {
      showToast(`Username: ${full}`);
    });
  } else {
    showToast(`Username: ${full}`);
  }
}

function openPersonalChannelLink() {
  const p = getTgProfile();
  const chan = (p.personalChannel || '@NovaChannel').replace('@', '');
  window.open(`https://t.me/${chan}`, '_blank');
}

// Edit Profile Modal
let selectedEditAvatar = "⚡";

function openEditTgProfileModal() {
  const p = getTgProfile();
  selectedEditAvatar = p.avatar || "⚡";

  const firstNameIn = document.getElementById('inputTgFirstName');
  const lastNameIn = document.getElementById('inputTgLastName');
  const usernameIn = document.getElementById('inputTgUsername');
  const bioIn = document.getElementById('inputTgBio');
  const birthdayIn = document.getElementById('inputTgBirthday');
  const channelIn = document.getElementById('inputTgChannel');
  const noteIn = document.getElementById('inputTgNote');

  if (firstNameIn) firstNameIn.value = p.firstName || "Nova";
  if (lastNameIn) lastNameIn.value = p.lastName || "Earner";
  if (usernameIn) usernameIn.value = (p.username || "nova_earner").replace('@', '');
  if (bioIn) bioIn.value = p.bio || "";
  if (birthdayIn) birthdayIn.value = p.birthday || "Oct 12";
  if (channelIn) channelIn.value = p.personalChannel || "@NovaChannel";
  if (noteIn) noteIn.value = p.note || "";

  renderAvatarOptions();

  const overlay = document.getElementById('editTgProfileModalOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeEditTgProfileModal() {
  const overlay = document.getElementById('editTgProfileModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

function handleEditTgProfileModalBackdrop(e) {
  if (e.target && e.target.id === 'editTgProfileModalOverlay') {
    closeEditTgProfileModal();
  }
}

function renderAvatarOptions() {
  const list = document.getElementById('tgAvatarOptionList');
  if (!list) return;

  list.innerHTML = TG_AVATAR_OPTIONS.map(ico => `
    <button type="button" 
      class="tg-emoji-picker-item ${ico === selectedEditAvatar ? 'active' : ''}" 
      style="padding: 0.35rem 0.6rem; font-size: 1.3rem; border: 1px solid ${ico === selectedEditAvatar ? '#38bdf8' : '#1e293b'}; background: ${ico === selectedEditAvatar ? 'rgba(56,189,248,0.2)' : '#0a1738'}; border-radius: 8px; cursor: pointer;"
      onclick="selectEditAvatar('${ico}')">
      ${ico}
    </button>
  `).join('');
}

function selectEditAvatar(ico) {
  selectedEditAvatar = ico;
  renderAvatarOptions();
}

function saveEditTgProfileForm(e) {
  e.preventDefault();
  const p = getTgProfile();

  const firstNameIn = document.getElementById('inputTgFirstName');
  const lastNameIn = document.getElementById('inputTgLastName');
  const usernameIn = document.getElementById('inputTgUsername');
  const bioIn = document.getElementById('inputTgBio');
  const birthdayIn = document.getElementById('inputTgBirthday');
  const channelIn = document.getElementById('inputTgChannel');
  const noteIn = document.getElementById('inputTgNote');

  p.firstName = firstNameIn ? firstNameIn.value.trim() : p.firstName;
  p.lastName = lastNameIn ? lastNameIn.value.trim() : p.lastName;
  p.username = usernameIn ? usernameIn.value.trim().replace('@', '') : p.username;
  p.bio = bioIn ? bioIn.value.trim() : p.bio;
  p.birthday = birthdayIn ? birthdayIn.value.trim() : p.birthday;
  p.personalChannel = channelIn ? channelIn.value.trim() : p.personalChannel;
  p.note = noteIn ? noteIn.value.trim() : p.note;
  p.avatar = selectedEditAvatar;

  saveTgProfile(p);
  closeEditTgProfileModal();
  showToast('Telegram Profile Updated Successfully! ✓');
}

// Emoji Status Picker
function openEmojiStatusPicker() {
  const grid = document.getElementById('tgEmojiPickerGrid');
  if (grid) {
    const p = getTgProfile();
    grid.innerHTML = TG_STATUS_EMOJIS.map(em => `
      <div class="tg-emoji-picker-item ${em === p.emojiStatus ? 'active' : ''}" onclick="setEmojiStatus('${em}')">
        ${em}
      </div>
    `).join('');
  }

  const overlay = document.getElementById('emojiStatusModalOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeEmojiStatusPicker() {
  const overlay = document.getElementById('emojiStatusModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

function handleEmojiStatusModalBackdrop(e) {
  if (e.target && e.target.id === 'emojiStatusModalOverlay') {
    closeEmojiStatusPicker();
  }
}

function setEmojiStatus(emoji) {
  const p = getTgProfile();
  p.emojiStatus = emoji;
  saveTgProfile(p);
  closeEmojiStatusPicker();
  showToast(`Emoji Status updated to ${emoji} ✨`);
}

// Audio Player for Music Tab
function toggleTgProfileMusic() {
  const btn = document.getElementById('btnTgPlayMusic');
  if (!currentMusicPlaying) {
    currentMusicPlaying = true;
    if (btn) btn.textContent = '⏸';
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      }
    } catch (e) {}
    showToast('Playing: Nova Cyber Wave 🎵');
  } else {
    currentMusicPlaying = false;
    if (btn) btn.textContent = '▶';
    showToast('Paused track ⏸');
  }
}

// Expose Telegram Profile API to window
window.openEditTgProfileModal = openEditTgProfileModal;
window.closeEditTgProfileModal = closeEditTgProfileModal;
window.handleEditTgProfileModalBackdrop = handleEditTgProfileModalBackdrop;
window.selectEditAvatar = selectEditAvatar;
window.saveEditTgProfileForm = saveEditTgProfileForm;
window.openEmojiStatusPicker = openEmojiStatusPicker;
window.closeEmojiStatusPicker = closeEmojiStatusPicker;
window.handleEmojiStatusModalBackdrop = handleEmojiStatusModalBackdrop;
window.setEmojiStatus = setEmojiStatus;
window.setTgProfileAccentColor = setTgProfileAccentColor;
window.switchTgProfileTab = switchTgProfileTab;
window.toggleOnlineStatus = toggleOnlineStatus;
window.copyProfileUsername = copyProfileUsername;
window.openPersonalChannelLink = openPersonalChannelLink;
window.toggleTgProfileMusic = toggleTgProfileMusic;

function updateProfileOverviewStats() {
  const tasks = localStorage.getItem('task_game_total_tasks_completed') || '0';
  const ads = localStorage.getItem('task_game_ads_watched_count') || '0';
  const tasksEl = document.getElementById('profileStatTasks');
  const adsEl = document.getElementById('profileStatAds');
  if (tasksEl) tasksEl.textContent = tasks;
  if (adsEl) adsEl.textContent = ads;
}

// Cross-tab and sync channel listeners
window.addEventListener('storage', (e) => {
  if (e.key === 'task_game_coins' || e.key === 'task_game_stars') {
    updateAdminLiveDisplays();
  }
  if (e.key === TG_PROFILE_KEY) {
    renderTgProfileUI();
  }
  if (e.key === REFERRALS_LIST_KEY) {
    renderReferralStatsAndList();
  }
  if (e.key === 'player_username' || e.key === 'player_logged_in') {
    if (typeof updatePlayerSessionUI === 'function') updatePlayerSessionUI();
    updateAdminLiveDisplays();
  }
  if (e.key === 'task_game_total_tasks_completed' || e.key === 'task_game_ads_watched_count') {
    updateProfileOverviewStats();
  }
});

try {
  const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
  ch.onmessage = () => {
    updateAdminLiveDisplays();
    renderTgProfileUI();
    renderReferralStatsAndList();
    if (typeof updatePlayerSessionUI === 'function') updatePlayerSessionUI();
    updateProfileOverviewStats();
  };
} catch (e) {}

document.addEventListener('DOMContentLoaded', () => {
  renderTgProfileUI();
  updatePlayerSessionUI();
  updateAdminLiveDisplays();
  updateProfileOverviewStats();
  updateFutureTokensUI();
  initTgPushSystem();
});

// Telegram User Authorization Window Exports
window.switchTgAuthTab = switchTgAuthTab;
window.backToTgAuthView = backToTgAuthView;
window.handleTgCountrySelectChange = handleTgCountrySelectChange;
window.fillTestDcAccount = fillTestDcAccount;
window.fillAndSendTestDc = fillAndSendTestDc;
window.handleSendTgCode = handleSendTgCode;
window.resendTgCode = resendTgCode;
window.handlePinInput = handlePinInput;
window.handlePinKeydown = handlePinKeydown;
window.autoFillTestCode = autoFillTestCode;
window.handleVerifyTgCode = handleVerifyTgCode;
window.toggleTgPasswordVisibility = toggleTgPasswordVisibility;
window.handleVerifyTg2FA = handleVerifyTg2FA;
window.handleCompleteTgSignUp = handleCompleteTgSignUp;
window.refreshTgQrToken = refreshTgQrToken;
window.simulateQrLoginApprove = simulateQrLoginApprove;
window.handlePasskeyAuth = handlePasskeyAuth;
window.handleBotTokenAuth = handleBotTokenAuth;
window.handleFutureTokenLogin = handleFutureTokenLogin;
window.openTgActiveSessionsModal = openTgActiveSessionsModal;
window.closeTgActiveSessionsModal = closeTgActiveSessionsModal;
window.handleActiveSessionsModalBackdrop = handleActiveSessionsModalBackdrop;
window.terminateSingleSession = terminateSingleSession;
window.terminateAllOtherTgSessions = terminateAllOtherTgSessions;
window.triggerSimulatedNewAuthAlert = triggerSimulatedNewAuthAlert;
window.confirmNewSessionAlert = confirmNewSessionAlert;

// =============================================================================
// TELEGRAM PUSH NOTIFICATIONS ENGINE (MTProto Handling PUSH-notifications)
// =============================================================================
const TG_PUSH_SUB_KEY = 'task_game_tg_push_subscription';
const TG_PUSH_PREFS_KEY = 'task_game_tg_push_prefs';
const TG_PUSH_HISTORY_KEY = 'task_game_tg_push_history';

let tgPushBannerTimer = null;

// Official MTProto loc_key template dictionary
const TG_PUSH_TEMPLATES = {
  MESSAGE_STARGIFT: '{1} sent you a Gift worth {2} Stars',
  MESSAGE_UNIQUE_STARGIFT: '{1} transferred you a Gift!',
  CHANNEL_MESSAGE_GIVEAWAY_STARS: '{1} posted a giveaway of {3} stars {2}',
  MESSAGE_GIFTCODE: '{1} sent you a Gift Code for {2} of Telegram Premium',
  CHAT_MESSAGE_PAID_MEDIA: '{1} posted a paid post in {2} group for {3} star',
  MESSAGE_TEXT: '{1}: {2}',
  CHAT_MESSAGE_TEXT: '{1} @ {2}: {3}',
  CHANNEL_MESSAGE_TEXT: '{1}: {2}',
  PINNED_TEXT: '{1} pinned "{2}"',
  CONTACT_JOINED: '{1} joined Telegram!',
  REACT_TEXT: '{1}: {2} to your "{3}"',
  CHAT_REACT_TEXT: '{1}: {3} in {2} to your "{4}"',
  PHONE_CALL_REQUEST: '{1} is calling you!',
  PHONE_CALL_MISSED: 'You missed a call from {1}',
  AUTH_REGION: 'New login from unrecognized device {1}, location: {2}',
  AUTH_UNKNOWN: 'New login from unrecognized device {1}',
  MESSAGE_ANNOUNCEMENT: '{message}',
  CHAT_ADD_YOU: '{1} invited you to the group {2}',
  MESSAGE_GAME: '{1} invited you to play {2}'
};

function getPushSubscription() {
  try {
    const raw = localStorage.getItem(TG_PUSH_SUB_KEY);
    return raw ? JSON.parse(raw) : {
      registered: true,
      tokenType: 10,
      endpoint: 'https://fcm.googleapis.com/fcm/send/web_push_' + Math.random().toString(36).substr(2, 10),
      p256dh: 'BNq48aKM' + Math.random().toString(36).substr(2, 14),
      auth: 's81j49Xz' + Math.random().toString(36).substr(2, 8),
      registeredAt: Date.now()
    };
  } catch (e) {
    return { registered: true, tokenType: 10, registeredAt: Date.now() };
  }
}

function savePushSubscription(sub) {
  try {
    localStorage.setItem(TG_PUSH_SUB_KEY, JSON.stringify(sub));
    updatePushBadgeUI();
  } catch (e) {}
}

function getPushPreferences() {
  try {
    const raw = localStorage.getItem(TG_PUSH_PREFS_KEY);
    return raw ? JSON.parse(raw) : {
      privateMsgs: true,
      groupMsgs: true,
      starsGifts: true,
      audioChime: true,
      msgPreviews: true
    };
  } catch (e) {
    return { privateMsgs: true, groupMsgs: true, starsGifts: true, audioChime: true, msgPreviews: true };
  }
}

function savePushPreferences() {
  const prefs = {
    privateMsgs: document.getElementById('prefTgPrivateMsgs')?.checked ?? true,
    groupMsgs: document.getElementById('prefTgGroupMsgs')?.checked ?? true,
    starsGifts: document.getElementById('prefTgStarsGifts')?.checked ?? true,
    audioChime: document.getElementById('prefTgAudioChime')?.checked ?? true,
    msgPreviews: document.getElementById('prefTgMsgPreviews')?.checked ?? true
  };
  localStorage.setItem(TG_PUSH_PREFS_KEY, JSON.stringify(prefs));
  showToast('✓ Notification preferences saved.');
}

function loadPushPreferencesUI() {
  const prefs = getPushPreferences();
  const p1 = document.getElementById('prefTgPrivateMsgs');
  const p2 = document.getElementById('prefTgGroupMsgs');
  const p3 = document.getElementById('prefTgStarsGifts');
  const p4 = document.getElementById('prefTgAudioChime');
  const p5 = document.getElementById('prefTgMsgPreviews');

  if (p1) p1.checked = prefs.privateMsgs;
  if (p2) p2.checked = prefs.groupMsgs;
  if (p3) p3.checked = prefs.starsGifts;
  if (p4) p4.checked = prefs.audioChime;
  if (p5) p5.checked = prefs.msgPreviews;
}

function getPushHistory() {
  try {
    const raw = localStorage.getItem(TG_PUSH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function savePushHistory(history) {
  try {
    localStorage.setItem(TG_PUSH_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    renderPushHistory();
  } catch (e) {}
}

function clearPushHistory() {
  localStorage.removeItem(TG_PUSH_HISTORY_KEY);
  renderPushHistory();
  showToast('✓ Notification history cleared.');
}

function initTgPushSystem() {
  updatePushBadgeUI();
  loadPushPreferencesUI();
  renderPushHistory();

  // Check 24-hour re-registration per MTProto spec
  const sub = getPushSubscription();
  if (sub && sub.registered) {
    const hoursSince = (Date.now() - (sub.registeredAt || 0)) / (1000 * 60 * 60);
    if (hoursSince >= 24) {
      handleRegisterDevice(false);
    }
  }
}

function updatePushBadgeUI() {
  const sub = getPushSubscription();
  const badge = document.getElementById('tgPushRegisteredBadge');
  const stateBadge = document.getElementById('tgPushSubStateBadge');

  if (badge) {
    badge.textContent = sub.registered ? 'WebPush: Active' : 'Push: Muted';
    badge.style.color = sub.registered ? '#34d399' : '#f87171';
    badge.style.borderColor = sub.registered ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
  }
  if (stateBadge) {
    stateBadge.textContent = sub.registered ? '🟢 Registered (Valid 24h)' : '🔴 Unregistered (Muted)';
    stateBadge.className = sub.registered ? 'tg-push-pill active' : 'tg-push-pill offline';
  }
}

function openTgPushNotificationsModal() {
  const modal = document.getElementById('tgPushNotificationsModalOverlay');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
  switchPushModalTab('status');
  updatePushBadgeUI();
  loadPushPreferencesUI();
  renderPushHistory();
}

function closeTgPushNotificationsModal() {
  const modal = document.getElementById('tgPushNotificationsModalOverlay');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function handlePushModalBackdrop(event) {
  if (event && (event.target.id === 'tgPushNotificationsModalOverlay' || event.target.classList.contains('profile-modal-overlay'))) {
    closeTgPushNotificationsModal();
  }
}

function switchPushModalTab(tabName) {
  const tabs = ['status', 'sim', 'prefs', 'logs'];
  tabs.forEach(tab => {
    const btn = document.getElementById('tabBtnPush' + capitalize(tab));
    if (btn) btn.classList.toggle('active', tab === tabName);

    const view = document.getElementById('pushTabView' + capitalize(tab));
    if (view) view.style.display = (tab === tabName) ? 'block' : 'none';
  });
}

function handleRegisterDevice(showNotice = true) {
  const sub = {
    registered: true,
    tokenType: 10,
    endpoint: 'https://fcm.googleapis.com/fcm/send/web_push_' + Math.random().toString(36).substr(2, 10),
    p256dh: 'BNq48aKM' + Math.random().toString(36).substr(2, 14),
    auth: 's81j49Xz' + Math.random().toString(36).substr(2, 8),
    registeredAt: Date.now()
  };
  savePushSubscription(sub);

  const displayEl = document.getElementById('tgPushTokenDisplay');
  if (displayEl) {
    displayEl.innerHTML = `endpoint: ${sub.endpoint.slice(0, 48)}...<br/>p256dh: ${sub.p256dh} | auth: ${sub.auth}`;
  }

  ProfileAudio.playClickSoft();
  if (showNotice) {
    showToast('✓ Device registered with MTProto push server (account.registerDevice)!');
  }
}

function handleUnregisterDevice() {
  const sub = getPushSubscription();
  sub.registered = false;
  savePushSubscription(sub);

  ProfileAudio.playWarningBuzzer();
  showToast('✕ Device unregistered (account.unregisterDevice). Notifications muted.');
}

function requestBrowserPushPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showToast('🔔 Browser Push Notification permission GRANTED!');
        handleRegisterDevice(false);
      } else {
        showToast('⚠️ Push permission: ' + permission);
      }
    });
  } else {
    showToast('ℹ️ Web Push supported via in-app banner chime.');
  }
}

// Synthesize Telegram notification sound using Web Audio API
function playTgNotificationChime() {
  const prefs = getPushPreferences();
  if (!prefs.audioChime) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Chime Note 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.18, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Chime Note 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.22, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

function formatTgPushTemplate(locKey, locArgs = [], custom = {}, message = '') {
  let template = TG_PUSH_TEMPLATES[locKey] || '{1}';
  if (locKey === 'MESSAGE_ANNOUNCEMENT') {
    return message || custom.message || 'Official Announcement from Telegram';
  }

  locArgs.forEach((arg, index) => {
    const placeholder = `{${index + 1}}`;
    template = template.replace(new RegExp(placeholder, 'g'), arg);
  });
  return template;
}

function simulatePushEvent(locKey, locArgs = [], customMessage = '') {
  const sub = getPushSubscription();
  if (!sub.registered) {
    showToast('⚠️ Notifications are currently muted (account.unregisterDevice). Re-register to receive alerts.');
    return;
  }

  const prefs = getPushPreferences();

  // Filter check
  if (locKey.startsWith('MESSAGE_STARGIFT') || locKey.includes('STARS') || locKey.includes('GIFT')) {
    if (!prefs.starsGifts) return;
  } else if (locKey.startsWith('CHAT_') || locKey.startsWith('CHANNEL_')) {
    if (!prefs.groupMsgs) return;
  } else if (locKey.startsWith('MESSAGE_')) {
    if (!prefs.privateMsgs) return;
  }

  const rawFormatted = formatTgPushTemplate(locKey, locArgs, {}, customMessage);

  // Icon mapping
  let icon = '💬';
  let title = 'Telegram Notification';
  let sender = 'Telegram';

  if (locKey.includes('STARGIFT') || locKey.includes('STARS')) {
    icon = '⭐';
    title = 'Telegram Stars';
    sender = locArgs[0] || 'Telegram Stars';
  } else if (locKey.includes('CALL')) {
    icon = '📞';
    title = 'Incoming Call';
    sender = locArgs[0] || 'Call';
  } else if (locKey.includes('REACT')) {
    icon = '🔥';
    title = 'New Reaction';
    sender = locArgs[0] || 'Reaction';
  } else if (locKey.includes('AUTH')) {
    icon = '🔒';
    title = 'Security Alert';
    sender = 'Security Service';
  } else if (locKey.includes('ANNOUNCEMENT')) {
    icon = '📢';
    title = 'Announcement';
    sender = 'Telegram Team';
  } else if (locArgs.length > 0) {
    sender = locArgs[0];
  }

  const pushPayload = {
    id: 'push_' + Date.now(),
    locKey: locKey,
    sender: sender,
    title: title,
    body: prefs.msgPreviews ? rawFormatted : 'You have a new message',
    icon: icon,
    timestamp: Date.now()
  };

  showFloatingTgPushBanner(pushPayload);

  // Store in history
  const history = getPushHistory();
  history.unshift(pushPayload);
  savePushHistory(history);

  // Native notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: pushPayload.body,
        icon: '../../assets/icon.png'
      });
    } catch (e) {}
  }
}

function showFloatingTgPushBanner(push) {
  const container = document.getElementById('tgPushBannerContainer');
  const iconEl = document.getElementById('tgPushBannerIcon');
  const senderEl = document.getElementById('tgPushBannerSender');
  const titleEl = document.getElementById('tgPushBannerTitle');
  const bodyEl = document.getElementById('tgPushBannerBody');

  if (!container) return;

  if (iconEl) iconEl.textContent = push.icon;
  if (senderEl) senderEl.textContent = push.sender;
  if (titleEl) titleEl.textContent = push.title;
  if (bodyEl) bodyEl.textContent = push.body;

  container.style.display = 'flex';
  playTgNotificationChime();

  if (tgPushBannerTimer) clearTimeout(tgPushBannerTimer);
  tgPushBannerTimer = setTimeout(() => {
    dismissPushBanner();
  }, 5000);
}

function dismissPushBanner(e) {
  if (e) e.stopPropagation();
  const container = document.getElementById('tgPushBannerContainer');
  if (container) container.style.display = 'none';
  if (tgPushBannerTimer) clearTimeout(tgPushBannerTimer);
}

function handlePushBannerClick() {
  dismissPushBanner();
  openTgPushNotificationsModal();
  switchPushModalTab('logs');
}

function renderPushHistory() {
  const list = document.getElementById('tgPushLogsList');
  if (!list) return;

  const history = getPushHistory();
  if (history.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 0.74rem; padding: 1.5rem 0;">No notifications received yet.</div>`;
    return;
  }

  list.innerHTML = history.map(item => `
    <div class="tg-log-item">
      <div class="tg-log-top">
        <span class="tg-log-loc-key">${escapeHtml(item.locKey)}</span>
        <span class="tg-log-time">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
      <div class="tg-log-text">${escapeHtml(item.body)}</div>
    </div>
  `).join('');
}

// Window Exports for Push Notifications
window.openTgPushNotificationsModal = openTgPushNotificationsModal;
window.closeTgPushNotificationsModal = closeTgPushNotificationsModal;
window.handlePushModalBackdrop = handlePushModalBackdrop;
window.switchPushModalTab = switchPushModalTab;
window.handleRegisterDevice = handleRegisterDevice;
window.handleUnregisterDevice = handleUnregisterDevice;
window.requestBrowserPushPermission = requestBrowserPushPermission;
window.simulatePushEvent = simulatePushEvent;
window.savePushPreferences = savePushPreferences;
window.clearPushHistory = clearPushHistory;
window.dismissPushBanner = dismissPushBanner;
window.handlePushBannerClick = handlePushBannerClick;






