// Profile & Admin Portal Script
// Credentials: Username: 400 @123 | Password: 0911 (Masked, not shown on UI)

const SF_STORAGE_KEY = 'ENERGY_TAP_SUNFLOWER_STATE_V4';

// Initialize default coins if needed
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}

// Global active tab state ('profile' | 'admin')
let activeProfileTab = 'profile';

/**
 * Check if admin session is currently authenticated
 */
function isAdminLoggedIn() {
  return sessionStorage.getItem('admin_authenticated') === 'true';
}

/**
 * Switch top tabs between Profile and Admin
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

  if (tabName === 'profile') {
    tabBtnProfile.classList.add('active');
    tabBtnAdmin.classList.remove('active');

    panelUserProfile.style.display = 'block';
    panelAdminLogin.style.display = 'none';
    panelAdminDashboard.style.display = 'none';
  } else if (tabName === 'admin') {
    tabBtnAdmin.classList.add('active');
    tabBtnProfile.classList.remove('active');

    panelUserProfile.style.display = 'none';

    if (isAdminLoggedIn()) {
      panelAdminLogin.style.display = 'none';
      panelAdminDashboard.style.display = 'flex';
      if (adminStatusTag) adminStatusTag.textContent = '🔓';
      updateAdminLiveDisplays();
    } else {
      panelAdminLogin.style.display = 'block';
      panelAdminDashboard.style.display = 'none';
      if (adminStatusTag) adminStatusTag.textContent = '🔒';
      
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

    // Reset login form
    const form = document.getElementById('adminLoginForm');
    if (form) form.reset();

    // Transition to Dashboard
    const panelAdminLogin = document.getElementById('panelAdminLogin');
    const panelAdminDashboard = document.getElementById('panelAdminDashboard');
    const adminStatusTag = document.getElementById('adminStatusTag');

    if (panelAdminLogin) panelAdminLogin.style.display = 'none';
    if (panelAdminDashboard) panelAdminDashboard.style.display = 'flex';
    if (adminStatusTag) adminStatusTag.textContent = '🔓';

    logAdminAction('Root administrator authenticated. Console online.');
    updateAdminLiveDisplays();
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
 * Sign out of Admin session
 */
function adminLogout() {
  sessionStorage.removeItem('admin_authenticated');

  const panelAdminLogin = document.getElementById('panelAdminLogin');
  const panelAdminDashboard = document.getElementById('panelAdminDashboard');
  const adminStatusTag = document.getElementById('adminStatusTag');
  const errBox = document.getElementById('adminLoginError');

  if (panelAdminDashboard) panelAdminDashboard.style.display = 'none';
  if (panelAdminLogin) panelAdminLogin.style.display = 'block';
  if (adminStatusTag) adminStatusTag.textContent = '🔒';
  if (errBox) errBox.style.display = 'none';

  logAdminAction('Admin signed out.');
}

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

  // Update top header and admin coins
  const headerCoins = document.getElementById('profileCoinsDisplay');
  if (headerCoins) headerCoins.textContent = currentCoins.toLocaleString();

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

  // If already authenticated in this session, show unlocked indicator
  const adminStatusTag = document.getElementById('adminStatusTag');
  if (adminStatusTag && isAdminLoggedIn()) {
    adminStatusTag.textContent = '🔓';
  }
});
