// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  onSnapshot, 
  collection, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmtznxs_VO7hJFtBFABF4IXskhWb25yyo",
  authDomain: "taskads-f894a.firebaseapp.com",
  projectId: "taskads-f894a",
  storageBucket: "taskads-f894a.firebasestorage.app",
  messagingSenderId: "365573359165",
  appId: "1:365573359165:web:77d5cf4cae5c52abe00c54",
  measurementId: "G-B800QRE7NV"
};

// Initialize Firebase App
let app = null;
let analytics = null;
let db = null;
let auth = null;

try {
  app = initializeApp(firebaseConfig);
  console.log("%c[Firebase] Initialized with project: taskads-f894a", "color: #38bdf8; font-weight: bold;");

  // Analytics
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("%c[Firebase Analytics] Active", "color: #10b981; font-weight: bold;");
    }
  }).catch(() => {});

  // Cloud Firestore Database
  try {
    db = getFirestore(app);
    console.log("%c[Firebase Firestore] Connected", "color: #10b981; font-weight: bold;");
  } catch (err) {
    console.warn("[Firebase Firestore] Database init error:", err);
  }

  // Firebase Authentication
  try {
    auth = getAuth(app);
    console.log("%c[Firebase Auth] Email/Password Ready", "color: #10b981; font-weight: bold;");
  } catch (err) {
    console.warn("[Firebase Auth] Auth init error:", err);
  }
} catch (e) {
  console.error("[Firebase] Initialization error:", e);
}

// Storage Keys
const TASKS_STORAGE_KEY = 'task_game_tasks';
const USERS_STORAGE_KEY = 'task_game_users';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Initialize local defaults only if not already set, preserving real balances
try {
  if (localStorage.getItem('task_game_coins') === null) localStorage.setItem('task_game_coins', '0');
  if (localStorage.getItem('task_game_stars') === null) localStorage.setItem('task_game_stars', '0');
  if (localStorage.getItem('user_coins') === null) localStorage.setItem('user_coins', localStorage.getItem('task_game_coins') || '0');
  if (localStorage.getItem('user_stars') === null) localStorage.setItem('user_stars', localStorage.getItem('task_game_stars') || '0');
  if (localStorage.getItem('completed_tasks_count') === null) localStorage.setItem('completed_tasks_count', '0');
  if (localStorage.getItem('ads_watched_count') === null) localStorage.setItem('ads_watched_count', '0');

  // Purge legacy mock data keys only once
  if (!localStorage.getItem('task_game_legacy_mock_cleared')) {
    localStorage.removeItem('ENERGY_TAP_SUNFLOWER_STATE_V4');
    localStorage.removeItem('sunflower_state');
    localStorage.removeItem('task_game_stars_rating');
    const existingName = localStorage.getItem('player_username');
    if (!existingName || existingName.toLowerCase().includes('nova') || existingName === 'Demo User') {
      localStorage.setItem('player_username', 'Player');
    }
    if (!localStorage.getItem('player_avatar')) {
      localStorage.setItem('player_avatar', '⚡');
    }
    localStorage.setItem('task_game_legacy_mock_cleared', 'true');
  }
} catch (e) {}

// =============================================================================
// FIREBASE AUTHENTICATION (EMAIL & PASSWORD) & FIRESTORE USER SYNC
// =============================================================================

/**
 * Sign up a new user with Email and Password
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 */
async function signUpWithEmail(email, password, displayName = 'Player') {
  if (!auth) {
    return { success: false, error: 'Firebase Auth is not initialized.' };
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Update Firebase Auth Display Name if provided
    if (displayName) {
      try {
        await updateProfile(user, { displayName: displayName.trim() });
      } catch (profileErr) {
        console.warn("[Firebase Auth] DisplayName update notice:", profileErr.message);
      }
    }

    // Initialize user record in Cloud Firestore: users/{uid}
    const initialCoins = parseInt(localStorage.getItem('user_coins') || '0', 10);
    const initialStars = parseInt(localStorage.getItem('user_stars') || '0', 10);
    const initialTasks = parseInt(localStorage.getItem('completed_tasks_count') || '0', 10);
    const initialAds = parseInt(localStorage.getItem('ads_watched_count') || '0', 10);
    const initialAvatar = localStorage.getItem('player_avatar') || '⚡';

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || 'Player',
      avatar: initialAvatar,
      coins: initialCoins,
      stars: initialStars,
      tasksCompleted: initialTasks,
      adsWatched: initialAds,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (db) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, userData, { merge: true });
        console.log("%c[Firebase Firestore] Created user profile:", "color: #10b981; font-weight: bold;", user.uid);
      } catch (dbErr) {
        console.warn("[Firebase Firestore] Notice creating user document:", dbErr.message);
      }
    }

    // Cache locally
    localStorage.setItem('player_logged_in', 'true');
    localStorage.setItem('player_username', userData.displayName);
    localStorage.setItem('player_email', userData.email);
    localStorage.setItem('player_uid', userData.uid);
    localStorage.setItem('player_avatar', userData.avatar);

    notifyAuthChanged(user, userData);

    return { success: true, user, profile: userData };
  } catch (error) {
    console.error("[Firebase Auth] Sign up error:", error);
    return { success: false, code: error.code, error: formatAuthErrorMessage(error) };
  }
}

/**
 * Sign in an existing user with Email and Password
 * @param {string} email
 * @param {string} password
 */
async function signInWithEmail(email, password) {
  if (!auth) {
    return { success: false, error: 'Firebase Auth is not initialized.' };
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Fetch user profile from Cloud Firestore
    let cloudData = null;
    if (db) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          cloudData = docSnap.data();
          console.log("%c[Firebase Firestore] Loaded user profile from cloud:", "color: #10b981; font-weight: bold;", cloudData);
        }
      } catch (dbErr) {
        console.warn("[Firebase Firestore] Notice fetching user document:", dbErr.message);
      }
    }

    // Apply cloud data to localStorage balances if available
    if (cloudData) {
      if (typeof cloudData.coins === 'number') localStorage.setItem('user_coins', cloudData.coins.toString());
      if (typeof cloudData.stars === 'number') localStorage.setItem('user_stars', cloudData.stars.toString());
      if (typeof cloudData.tasksCompleted === 'number') localStorage.setItem('completed_tasks_count', cloudData.tasksCompleted.toString());
      if (typeof cloudData.adsWatched === 'number') localStorage.setItem('ads_watched_count', cloudData.adsWatched.toString());
      if (cloudData.displayName) localStorage.setItem('player_username', cloudData.displayName);
      if (cloudData.avatar) localStorage.setItem('player_avatar', cloudData.avatar);
    }

    localStorage.setItem('player_logged_in', 'true');
    localStorage.setItem('player_email', user.email);
    localStorage.setItem('player_uid', user.uid);
    if (!localStorage.getItem('player_username')) {
      localStorage.setItem('player_username', user.displayName || user.email.split('@')[0]);
    }

    notifyAuthChanged(user, cloudData);

    return { success: true, user, profile: cloudData };
  } catch (error) {
    console.error("[Firebase Auth] Sign in error:", error);
    return { success: false, code: error.code, error: formatAuthErrorMessage(error) };
  }
}

/**
 * Sign out current authenticated user
 */
async function signOutUser() {
  if (!auth) {
    localStorage.setItem('player_logged_in', 'false');
    notifyAuthChanged(null, null);
    return { success: true };
  }
  try {
    await signOut(auth);
    localStorage.setItem('player_logged_in', 'false');
    notifyAuthChanged(null, null);
    return { success: true };
  } catch (error) {
    console.error("[Firebase Auth] Sign out error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
async function sendPasswordReset(email) {
  if (!auth) return { success: false, error: 'Firebase Auth is not initialized.' };
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (error) {
    return { success: false, error: formatAuthErrorMessage(error) };
  }
}

/**
 * Real-time listener for Auth State changes
 */
function subscribeToAuth(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      localStorage.setItem('player_logged_in', 'true');
      localStorage.setItem('player_email', user.email || '');
      localStorage.setItem('player_uid', user.uid);

      startRealtimeUserSync(user.uid);
      await initCloudBalances(user.uid);

      let profile = null;
      if (db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            profile = snap.data();
          }
        } catch (e) {}
      }

      if (typeof callback === 'function') callback(user, profile);
    } else {
      localStorage.setItem('player_logged_in', 'false');
      if (typeof callback === 'function') callback(null, null);
    }
  });
}

/**
 * Get or create persistent Unique ID for current player (supports Auth UID or device UID)
 */
function getEffectivePlayerUid() {
  if (auth && auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }
  let uid = localStorage.getItem('player_uid');
  if (!uid || uid === 'null' || uid === 'undefined') {
    uid = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('player_uid', uid);
  }
  return uid;
}

let _prevDomCoins = null;
let _prevDomStars = null;

function triggerPillDeductionEffect(type, diff) {
  try {
    const isCoins = type === 'coins';
    const pill = isCoins 
      ? (document.getElementById('coinPill') || document.querySelector('.coin-pill') || document.querySelector('.pill-gold') || document.getElementById('headerCoinDisplay'))
      : (document.getElementById('starPill') || document.querySelector('.star-pill') || document.querySelector('.pill-star') || document.getElementById('headerStarDisplay'));
    
    if (pill) {
      pill.style.transition = 'transform 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
      pill.style.transform = 'scale(1.15)';
      setTimeout(() => {
        pill.style.transform = 'scale(1)';
      }, 200);

      const rect = pill.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const floatEl = document.createElement('div');
        floatEl.className = 'currency-deduct-float';
        floatEl.textContent = `-${Number(diff || 0).toLocaleString()} ${isCoins ? '🪙' : '⭐'}`;
        floatEl.style.position = 'fixed';
        floatEl.style.left = `${rect.left + rect.width / 4}px`;
        floatEl.style.top = `${rect.top + rect.height}px`;
        floatEl.style.zIndex = '999999';
        floatEl.style.fontSize = '12px';
        floatEl.style.fontWeight = '900';
        floatEl.style.color = isCoins ? '#f59e0b' : '#eab308';
        floatEl.style.textShadow = '0 2px 8px rgba(0,0,0,0.8), 0 0 10px rgba(245,158,11,0.5)';
        floatEl.style.pointerEvents = 'none';
        floatEl.style.transition = 'all 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
        floatEl.style.transform = 'translateY(0) scale(1)';
        floatEl.style.opacity = '1';
        document.body.appendChild(floatEl);

        requestAnimationFrame(() => {
          floatEl.style.transform = 'translateY(24px) scale(0.9)';
          floatEl.style.opacity = '0';
        });
        setTimeout(() => floatEl.remove(), 900);
      }
    }
  } catch (e) {}
}

function triggerInsufficientFundsNotice(type, required, available) {
  try {
    const isCoins = type === 'coins';
    const pill = isCoins 
      ? (document.getElementById('coinPill') || document.querySelector('.coin-pill') || document.querySelector('.pill-gold'))
      : (document.getElementById('starPill') || document.querySelector('.star-pill') || document.querySelector('.pill-star'));
    
    if (pill) {
      pill.style.transition = 'all 0.15s ease';
      pill.style.filter = 'drop-shadow(0 0 10px rgba(239,68,68,0.9))';
      pill.style.transform = 'translateX(-5px)';
      setTimeout(() => { pill.style.transform = 'translateX(5px)'; }, 50);
      setTimeout(() => { pill.style.transform = 'translateX(-4px)'; }, 100);
      setTimeout(() => { pill.style.transform = 'translateX(0)'; pill.style.filter = ''; }, 250);
    }

    const toast = document.createElement('div');
    toast.className = 'insufficient-funds-toast';
    toast.innerHTML = `<span>❌ Need <b>${Number(required || 0).toLocaleString()}</b> ${isCoins ? '🪙 Coins' : '⭐ Stars'}! (You have <b>${Number(available || 0).toLocaleString()}</b>)</span>`;
    toast.style.position = 'fixed';
    toast.style.top = '65px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
    toast.style.zIndex = '999999';
    toast.style.background = 'rgba(15, 23, 42, 0.96)';
    toast.style.border = '1.5px solid #ef4444';
    toast.style.borderRadius = '9999px';
    toast.style.padding = '8px 18px';
    toast.style.color = '#fecaca';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = '800';
    toast.style.boxShadow = '0 10px 25px -5px rgba(239, 68, 68, 0.5)';
    toast.style.pointerEvents = 'none';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.style.opacity = '0';
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => toast.remove(), 350);
    }, 2400);
  } catch (e) {}
}

/**
 * Update all DOM balance indicators across any active page and tab in real time
 */
function updateAllDomBalances(coins, stars) {
  const c = typeof coins === 'number' ? coins : parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  const s = typeof stars === 'number' ? stars : parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  const coinsFmt = Number(c || 0).toLocaleString();
  const starsFmt = Number(s || 0).toLocaleString();

  if (_prevDomCoins !== null && c < _prevDomCoins) {
    triggerPillDeductionEffect('coins', _prevDomCoins - c);
  }
  if (_prevDomStars !== null && s < _prevDomStars) {
    triggerPillDeductionEffect('stars', _prevDomStars - s);
  }
  _prevDomCoins = c;
  _prevDomStars = s;

  // All known coin DOM IDs across all games, hub, shop, wallet, sunflower, leaderboard, profile, admin
  const coinElements = [
    'userCoinsDisplay', 'headerCoinDisplay', 'gameCoinsDisplay', 'shopCoinsDisplayTop', 
    'shopCoinsDisplay', 'walletBalanceTop', 'walletCoinsTop', 'leaderboardCoinsTop', 
    'profileCoinsDisplay', 'sfTotalCoinsTop', 'hbTotalCoinsTop', 'sfCoinDisplay', 
    'userCoinsTop', 'tabSfCoins', 'tabSfSolarCoins', 'headerCoins', 'statCoinsVal', 
    'playerCoinsDisplay', 'heroCoinsDisplay', 'lobbyCoinsDisplay', 'coinBalance',
    'manageModalCoinsDisplay', 'manageModalCoinsVal', 'editUserCoinsInput', 'adminLiveCoins'
  ];
  coinElements.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'INPUT') el.value = c;
      else if (id === 'adminLiveCoins') el.textContent = `${coinsFmt} 🪙`;
      else el.textContent = coinsFmt;
    }
  });

  // Query elements with class or data attributes for coin values
  try {
    document.querySelectorAll('.header-coin-val, [data-balance="coins"]').forEach(el => {
      if (el.tagName === 'INPUT') el.value = c;
      else el.textContent = coinsFmt;
    });
  } catch (e) {}

  // All known star DOM IDs across all games, hub, shop, wallet, leaderboard, sunflower, profile, admin
  const starElements = [
    'userStarsDisplay', 'headerStarDisplay', 'gameStarsDisplay', 'shopStarsDisplayTop', 
    'shopStarsDisplay', 'walletStarsTop', 'leaderboardStarsTop', 'profileStarsDisplay', 
    'sfStickyDiamonds', 'hbStickyDiamonds', 'sfTotalStarsTop', 'hbTotalStarsTop', 
    'sfShopDiamondCount', 'userStarsTop', 'statStarsVal', 'headerStars', 
    'playerStarsDisplay', 'lobbyStarsDisplay', 'starBalance',
    'manageModalStarsDisplay', 'manageModalStarsVal', 'editUserStarsInput', 'adminLiveStars'
  ];
  starElements.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'INPUT') el.value = s;
      else if (id === 'sfShopDiamondCount' || id === 'adminLiveStars') el.textContent = `${starsFmt} ⭐`;
      else el.textContent = starsFmt;
    }
  });

  // Query elements with class or data attributes for star values
  try {
    document.querySelectorAll('.header-star-val, [data-balance="stars"]').forEach(el => {
      if (el.tagName === 'INPUT') el.value = s;
      else el.textContent = starsFmt;
    });
  } catch (e) {}
}
window.updateAllDomBalances = updateAllDomBalances;

// Flag to prevent recursive cloud sync loops when updating from Firestore
let isInternalSync = false;
const rawSetItem = localStorage.setItem.bind(localStorage);

// Auto-intercept localStorage.setItem for currency keys to keep keys in sync and trigger cloud save
localStorage.setItem = function(key, val) {
  rawSetItem(key, val);
  if (!isInternalSync && (key === 'task_game_coins' || key === 'user_coins' || key === 'task_game_stars' || key === 'user_stars')) {
    isInternalSync = true;
    try {
      if (key === 'task_game_coins') rawSetItem('user_coins', val);
      else if (key === 'user_coins') rawSetItem('task_game_coins', val);
      else if (key === 'task_game_stars') rawSetItem('user_stars', val);
      else if (key === 'user_stars') rawSetItem('task_game_stars', val);
    } catch (e) {}
    isInternalSync = false;

    updateAllDomBalances();
    // Instant cloud profile save on currency mutation
    if (typeof saveCurrentProfileToFirestore === 'function') {
      saveCurrentProfileToFirestore();
    }
    scheduleCloudBalanceSync(80);

    try {
      const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
      ch.postMessage({ type: 'BALANCES_UPDATED', key, val, timestamp: Date.now() });
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('balance:changed', {
      detail: {
        coins: parseInt(localStorage.getItem('task_game_coins') || '0', 10),
        stars: parseInt(localStorage.getItem('task_game_stars') || '0', 10),
        key,
        val
      }
    }));
  }
};

/**
 * Save current user profile & balances to Firestore (users/{uid})
 */
async function saveCurrentProfileToFirestore(userInstance = null) {
  if (!db) return false;
  const currentUser = userInstance || (auth ? auth.currentUser : null);
  const uid = currentUser ? currentUser.uid : getEffectivePlayerUid();
  if (!uid) return false;

  try {
    const coinsRaw = localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0';
    const starsRaw = localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0';
    const tasksRaw = localStorage.getItem('completed_tasks_count') || localStorage.getItem('task_game_total_tasks_completed') || '0';
    const adsRaw = localStorage.getItem('ads_watched_count') || localStorage.getItem('task_game_ads_watched_count') || '0';

    const coins = parseInt(coinsRaw, 10);
    const stars = parseInt(starsRaw, 10);
    const tasksCompleted = parseInt(tasksRaw, 10);
    const adsWatched = parseInt(adsRaw, 10);
    const displayName = localStorage.getItem('player_username') || (currentUser ? currentUser.displayName : 'Player');
    const avatar = localStorage.getItem('player_avatar') || '⚡';
    let email = currentUser && currentUser.email ? currentUser.email : (localStorage.getItem('player_email') || '');
    if (!email || !email.includes('@')) {
      email = `${String(uid).replace(/[^a-zA-Z0-9]/g, '')}@player.app`;
    }

    const userRef = doc(db, 'users', String(uid));
    await setDoc(userRef, {
      uid: String(uid),
      email: email,
      displayName: displayName,
      avatar: avatar,
      coins: isNaN(coins) ? 0 : coins,
      stars: isNaN(stars) ? 0 : stars,
      tasksCompleted: isNaN(tasksCompleted) ? 0 : tasksCompleted,
      adsWatched: isNaN(adsWatched) ? 0 : adsWatched,
      updatedAt: Date.now()
    }, { merge: true });

    return true;
  } catch (err) {
    console.warn("[Firebase] Could not save profile to cloud:", err.message);
    return false;
  }
}

/**
 * Fetch latest balances and stats directly from Firestore on page open
 */
async function initCloudBalances(targetUid = null) {
  if (!db) return;
  const uid = targetUid || getEffectivePlayerUid();
  if (!uid) return;

  try {
    const userRef = doc(db, 'users', String(uid));
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() || {};
      isInternalSync = true;
      try {
        if (typeof data.coins === 'number') {
          rawSetItem('task_game_coins', data.coins.toString());
          rawSetItem('user_coins', data.coins.toString());
        }
        if (typeof data.stars === 'number') {
          rawSetItem('task_game_stars', data.stars.toString());
          rawSetItem('user_stars', data.stars.toString());
        }
        if (typeof data.tasksCompleted === 'number') {
          rawSetItem('completed_tasks_count', data.tasksCompleted.toString());
          rawSetItem('task_game_total_tasks_completed', data.tasksCompleted.toString());
        }
        if (typeof data.adsWatched === 'number') {
          rawSetItem('ads_watched_count', data.adsWatched.toString());
          rawSetItem('task_game_ads_watched_count', data.adsWatched.toString());
        }
        if (data.displayName && data.displayName !== 'Player') {
          rawSetItem('player_username', data.displayName);
        }
        if (data.avatar) {
          rawSetItem('player_avatar', data.avatar);
        }
      } finally {
        isInternalSync = false;
      }

      updateAllDomBalances();

      const syncedCoins = typeof data.coins === 'number' ? data.coins : parseInt(localStorage.getItem('task_game_coins') || '0', 10);
      const syncedStars = typeof data.stars === 'number' ? data.stars : parseInt(localStorage.getItem('task_game_stars') || '0', 10);

      window.dispatchEvent(new CustomEvent('balance:synced', {
        detail: { coins: syncedCoins, stars: syncedStars }
      }));
      window.dispatchEvent(new CustomEvent('balance:changed', {
        detail: { coins: syncedCoins, stars: syncedStars }
      }));
    } else {
      // Initialize profile in Firestore
      await saveCurrentProfileToFirestore();
    }
  } catch (err) {
    console.warn("[Firebase Cloud] Balance fetch note:", err.message);
  }
}

let userDocUnsubscribe = null;
/**
 * Real-time listener for current user's profile in Firestore
 */
function startRealtimeUserSync(targetUid = null) {
  if (!db) return null;
  const uid = targetUid || getEffectivePlayerUid();
  if (!uid) return null;

  if (userDocUnsubscribe) {
    try { userDocUnsubscribe(); } catch (e) {}
    userDocUnsubscribe = null;
  }

  try {
    const userRef = doc(db, 'users', String(uid));
    userDocUnsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data() || {};
        let changed = false;

        const currentCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
        const currentStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

        isInternalSync = true;
        try {
          if (typeof cloudData.coins === 'number' && cloudData.coins !== currentCoins) {
            rawSetItem('task_game_coins', cloudData.coins.toString());
            rawSetItem('user_coins', cloudData.coins.toString());
            changed = true;
          }

          if (typeof cloudData.stars === 'number' && cloudData.stars !== currentStars) {
            rawSetItem('task_game_stars', cloudData.stars.toString());
            rawSetItem('user_stars', cloudData.stars.toString());
            changed = true;
          }

          if (typeof cloudData.tasksCompleted === 'number') {
            rawSetItem('completed_tasks_count', cloudData.tasksCompleted.toString());
            rawSetItem('task_game_total_tasks_completed', cloudData.tasksCompleted.toString());
          }

          if (typeof cloudData.adsWatched === 'number') {
            rawSetItem('ads_watched_count', cloudData.adsWatched.toString());
            rawSetItem('task_game_ads_watched_count', cloudData.adsWatched.toString());
          }

          if (cloudData.displayName && cloudData.displayName !== 'Player') {
            rawSetItem('player_username', cloudData.displayName);
          }

          if (cloudData.avatar) {
            rawSetItem('player_avatar', cloudData.avatar);
          }
        } finally {
          isInternalSync = false;
        }

        updateAllDomBalances();

        if (changed) {
          try {
            const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
            ch.postMessage({ type: 'COINS_SYNCED', timestamp: Date.now() });
          } catch (e) {}

          const nextCoins = typeof cloudData.coins === 'number' ? cloudData.coins : currentCoins;
          const nextStars = typeof cloudData.stars === 'number' ? cloudData.stars : currentStars;

          window.dispatchEvent(new CustomEvent('balance:changed', {
            detail: { coins: nextCoins, stars: nextStars }
          }));
        }
      } else {
        saveCurrentProfileToFirestore();
      }
    }, (err) => {
      console.log("[Firebase] User real-time sync running in offline cache mode.");
    });

    return userDocUnsubscribe;
  } catch (e) {
    return null;
  }
}

// Debounced auto-sync when local balances change
let cloudBalanceTimer = null;
function scheduleCloudBalanceSync(delay = 350) {
  if (cloudBalanceTimer) clearTimeout(cloudBalanceTimer);
  cloudBalanceTimer = setTimeout(() => {
    saveCurrentProfileToFirestore();
  }, delay);
}

// Global FirebaseSync currency management engine for all games & pages
const firebaseSync = {
  get db() { return db; },
  get auth() { return auth; },
  get userId() { return getEffectivePlayerUid(); },
  get database() {
    return {
      ref: (path) => ({
        set: async (data) => {
          if (!db) return;
          const uid = getEffectivePlayerUid();
          const docRef = doc(db, 'players_data', `${uid}_${String(path).replace(/\//g, '_')}`);
          return setDoc(docRef, { data, updatedAt: Date.now() }, { merge: true });
        }
      })
    };
  },
  getCoins() {
    return parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  },
  getStars() {
    return parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);
  },
  setCoins(val) {
    const num = Math.max(0, parseInt(val, 10) || 0);
    localStorage.setItem('task_game_coins', num.toString());
    localStorage.setItem('user_coins', num.toString());
    updateAllDomBalances();
    saveCurrentProfileToFirestore();
    return num;
  },
  setStars(val) {
    const num = Math.max(0, parseInt(val, 10) || 0);
    localStorage.setItem('task_game_stars', num.toString());
    localStorage.setItem('user_stars', num.toString());
    updateAllDomBalances();
    saveCurrentProfileToFirestore();
    return num;
  },
  addCoins(amount, reason = 'win') {
    const amt = Math.max(0, parseInt(amount, 10) || 0);
    const current = this.getCoins();
    const next = current + amt;
    this.setCoins(next);
    console.log(`%c[Firebase Sync] +${amt} Coins added (${reason}). Total: ${next}`, "color: #10b981; font-weight: bold;");
    return next;
  },
  subtractCoins(amount, reason = 'spend') {
    const amt = Math.max(0, parseInt(amount, 10) || 0);
    const current = this.getCoins();
    if (current < amt) {
      if (typeof triggerInsufficientFundsNotice === 'function') {
        triggerInsufficientFundsNotice('coins', amt, current);
      }
      return false;
    }
    const next = Math.max(0, current - amt);
    this.setCoins(next);
    console.log(`%c[Firebase Sync] -${amt} Coins deducted (${reason}). Remaining: ${next}`, "color: #f59e0b; font-weight: bold;");
    return next;
  },
  addStars(amount, reason = 'win') {
    const amt = Math.max(0, parseInt(amount, 10) || 0);
    const current = this.getStars();
    const next = current + amt;
    this.setStars(next);
    console.log(`%c[Firebase Sync] +${amt} Stars added (${reason}). Total: ${next}`, "color: #10b981; font-weight: bold;");
    return next;
  },
  subtractStars(amount, reason = 'spend') {
    const amt = Math.max(0, parseInt(amount, 10) || 0);
    const current = this.getStars();
    if (current < amt) {
      if (typeof triggerInsufficientFundsNotice === 'function') {
        triggerInsufficientFundsNotice('stars', amt, current);
      }
      return false;
    }
    const next = Math.max(0, current - amt);
    this.setStars(next);
    console.log(`%c[Firebase Sync] -${amt} Stars deducted (${reason}). Remaining: ${next}`, "color: #f59e0b; font-weight: bold;");
    return next;
  },
  syncPlayerCurrenciesImmediate() {
    return saveCurrentProfileToFirestore();
  },
  saveUserData() {
    return saveCurrentProfileToFirestore();
  },
  fetchLatestBalances() {
    return initCloudBalances();
  }
};

window.firebaseSync = firebaseSync;
window.FirebaseCurrency = firebaseSync;
window.playerWallet = firebaseSync;

// Global currency helpers for any purchase, unlock, or gameplay across the entire app
window.useCoins = function(amount, reason = 'spend') {
  return firebaseSync.subtractCoins(amount, reason);
};
window.useStars = function(amount, reason = 'spend') {
  return firebaseSync.subtractStars(amount, reason);
};
window.deductCoins = window.useCoins;
window.deductStars = window.useStars;
window.deductPlayerGoldCoins = function(amount, reason = 'spend') {
  return firebaseSync.subtractCoins(amount, reason);
};
window.winCoins = function(amount, reason = 'win') {
  return firebaseSync.addCoins(amount, reason);
};
window.winStars = function(amount, reason = 'win') {
  return firebaseSync.addStars(amount, reason);
};
window.buyWithCoins = function(amount, itemName = 'item') {
  return firebaseSync.subtractCoins(amount, `Bought ${itemName}`);
};
window.buyWithStars = function(amount, itemName = 'item') {
  return firebaseSync.subtractStars(amount, `Bought ${itemName}`);
};
window.getPlayerCoins = function() {
  return firebaseSync.getCoins();
};
window.getPlayerStars = function() {
  return firebaseSync.getStars();
};
window.triggerInsufficientFundsNotice = triggerInsufficientFundsNotice;
window.triggerPillDeductionEffect = triggerPillDeductionEffect;


// =============================================================================
// GLOBAL BALANCE MANAGER (USE OR WIN COINS & STARS - LIVE FIREBASE SYNCHRONIZER)
// =============================================================================

function injectBalanceManagerUI() {
  if (document.getElementById('globalBalanceManagerModal')) return;

  const styleEl = document.createElement('style');
  styleEl.id = 'gbm-styles';
  styleEl.textContent = `
    .gbm-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(3, 8, 22, 0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: gbmFadeIn 0.2s ease-out;
    }
    @keyframes gbmFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .gbm-card {
      width: 100%;
      max-width: 420px;
      background: #09132c;
      border: 1.5px solid #1e3a6a;
      border-radius: 20px;
      padding: 1.25rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: relative;
      animation: gbmScaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }
    @keyframes gbmScaleUp {
      from { transform: scale(0.92) translateY(10px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    .gbm-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(56, 189, 248, 0.15);
    }
    .gbm-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .gbm-title-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1.5px solid #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }
    .gbm-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.2;
    }
    .gbm-subtitle {
      margin: 0;
      font-size: 0.72rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 2px;
    }
    .gbm-live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      display: inline-block;
    }
    .gbm-close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .gbm-close-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #f87171;
    }
    .gbm-balances-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
      margin-bottom: 1rem;
    }
    .gbm-bal-card {
      background: #04091a;
      border: 1.5px solid rgba(56, 189, 248, 0.2);
      border-radius: 14px;
      padding: 0.65rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
    .gbm-bal-card.coins {
      border-color: rgba(251, 191, 36, 0.4);
      background: linear-gradient(135deg, #1c1503 0%, #04091a 100%);
    }
    .gbm-bal-card.stars {
      border-color: rgba(250, 204, 21, 0.4);
      background: linear-gradient(135deg, #1a1600 0%, #04091a 100%);
    }
    .gbm-bal-lbl {
      font-size: 0.65rem;
      font-weight: 800;
      color: #94a3b8;
      letter-spacing: 0.04em;
    }
    .gbm-bal-val {
      font-size: 1.15rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #ffffff;
      font-variant-numeric: tabular-nums;
    }
    .gbm-bal-card.coins .gbm-bal-val { color: #fbbf24; }
    .gbm-bal-card.stars .gbm-bal-val { color: #facc15; }
    .gbm-tabs {
      display: flex;
      gap: 0.35rem;
      background: rgba(4, 9, 26, 0.6);
      padding: 3px;
      border-radius: 12px;
      border: 1px solid rgba(56, 189, 248, 0.15);
      margin-bottom: 1rem;
    }
    .gbm-tab-btn {
      flex: 1;
      padding: 0.5rem 0.3rem;
      border: none;
      background: transparent;
      border-radius: 9px;
      color: #94a3b8;
      font-size: 0.76rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
    }
    .gbm-tab-btn.active {
      background: #1e3a6a;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .gbm-tab-btn.btn-win-tab.active { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
    .gbm-tab-btn.btn-use-tab.active { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
    .gbm-tab-btn.btn-edit-tab.active { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); }
    .gbm-tab-pane {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .gbm-form-group {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .gbm-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #cbd5e1;
    }
    .gbm-curr-selector {
      display: flex;
      gap: 0.5rem;
    }
    .gbm-radio-lbl {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.45rem;
      border-radius: 10px;
      background: #04091a;
      border: 1.5px solid #1e293b;
      cursor: pointer;
      font-size: 0.825rem;
      font-weight: 800;
      color: #e2e8f0;
      transition: all 0.15s ease;
    }
    .gbm-radio-lbl:has(input:checked) {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      color: #ffffff;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
    }
    .gbm-radio-lbl input { margin: 0; }
    .gbm-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .gbm-quick-pill {
      flex: 1;
      min-width: 54px;
      padding: 0.35rem 0.5rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      font-size: 0.76rem;
      font-weight: 800;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }
    .gbm-quick-pill:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      color: #ffffff;
    }
    .gbm-input {
      width: 100%;
      background: #04091a;
      border: 1.5px solid #1e3a6a;
      border-radius: 10px;
      padding: 0.6rem 0.8rem;
      color: #ffffff;
      font-size: 0.95rem;
      font-family: inherit;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .gbm-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }
    .gbm-action-btn {
      width: 100%;
      padding: 0.75rem;
      border-radius: 12px;
      border: none;
      font-size: 0.88rem;
      font-weight: 800;
      cursor: pointer;
      color: #ffffff;
      margin-top: 0.3rem;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    .gbm-action-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.1);
    }
    .gbm-action-btn:active {
      transform: scale(0.98);
    }
    .gbm-action-btn.btn-win {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
    }
    .gbm-action-btn.btn-use {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.35);
    }
    .gbm-action-btn.btn-edit {
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      box-shadow: 0 4px 15px rgba(56, 189, 248, 0.35);
    }
    .gbm-toast {
      margin-top: 0.75rem;
      padding: 0.55rem 0.8rem;
      border-radius: 10px;
      font-size: 0.78rem;
      font-weight: 700;
      text-align: center;
      animation: gbmFadeIn 0.2s ease-out;
    }
    .gbm-toast.success {
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid #10b981;
      color: #34d399;
    }
    .gbm-toast.error {
      background: rgba(239, 68, 68, 0.18);
      border: 1px solid #ef4444;
      color: #f87171;
    }
  `;
  document.head.appendChild(styleEl);

  const modalEl = document.createElement('div');
  modalEl.id = 'globalBalanceManagerModal';
  modalEl.className = 'gbm-overlay';
  modalEl.style.display = 'none';
  modalEl.onclick = function(e) {
    if (e.target === modalEl) closeBalanceManageModal();
  };

  modalEl.innerHTML = `
    <div class="gbm-card" onclick="event.stopPropagation()">
      <div class="gbm-header">
        <div class="gbm-title-wrap">
          <div class="gbm-title-icon">⚡</div>
          <div>
            <h3 class="gbm-title">Balance Manager</h3>
            <p class="gbm-subtitle"><span class="gbm-live-dot"></span> Firebase Cloud Connected • Real-Time</p>
          </div>
        </div>
        <button type="button" class="gbm-close-btn" onclick="closeBalanceManageModal()" title="Close">✕</button>
      </div>

      <!-- Live Current Balances Card -->
      <div class="gbm-balances-row">
        <div class="gbm-bal-card coins" title="Total Coin Balance">
          <div class="gbm-bal-lbl">TOTAL COINS</div>
          <div class="gbm-bal-val"><span>🪙</span><span id="manageModalCoinsVal">0</span></div>
        </div>
        <div class="gbm-bal-card stars" title="Total Star Balance">
          <div class="gbm-bal-lbl">TOTAL STARS</div>
          <div class="gbm-bal-val"><span>⭐</span><span id="manageModalStarsVal">0</span></div>
        </div>
      </div>

      <!-- Tabs (Win, Use, Edit) -->
      <div class="gbm-tabs">
        <button type="button" class="gbm-tab-btn btn-win-tab active" id="gbmTabBtnWin" onclick="switchGbmTab('win')">🏆 Win / Earn (+)</button>
        <button type="button" class="gbm-tab-btn btn-use-tab" id="gbmTabBtnUse" onclick="switchGbmTab('use')">🛍️ Use / Spend (-)</button>
        <button type="button" class="gbm-tab-btn btn-edit-tab" id="gbmTabBtnEdit" onclick="switchGbmTab('edit')">✏️ Edit Balance</button>
      </div>

      <!-- Tab 1: WIN / EARN (+) -->
      <div class="gbm-tab-pane" id="gbmPaneWin">
        <div class="gbm-form-group">
          <label class="gbm-label">Choose Currency to Win / Add:</label>
          <div class="gbm-curr-selector">
            <label class="gbm-radio-lbl">
              <input type="radio" name="gbmWinCurr" value="coins" checked onchange="updateGbmQuickPills('win')">
              <span>🪙 Coins</span>
            </label>
            <label class="gbm-radio-lbl">
              <input type="radio" name="gbmWinCurr" value="stars" onchange="updateGbmQuickPills('win')">
              <span>⭐ Stars</span>
            </label>
          </div>
        </div>
        <div class="gbm-form-group">
          <label class="gbm-label">Quick Amount:</label>
          <div class="gbm-pills-row" id="gbmWinQuickPills"></div>
        </div>
        <div class="gbm-form-group">
          <label class="gbm-label" for="gbmWinAmount">Amount:</label>
          <input type="number" id="gbmWinAmount" class="gbm-input" min="1" placeholder="Enter amount to win" value="50">
        </div>
        <div class="gbm-form-group">
          <label class="gbm-label" for="gbmWinReason">Reason / Tag:</label>
          <input type="text" id="gbmWinReason" class="gbm-input" placeholder="e.g. Game Win, Task Completed, Community Reward" value="Game Win">
        </div>
        <button type="button" class="gbm-action-btn btn-win" onclick="submitBalanceWin()">Claim Win &amp; Save to Firebase 🚀</button>
      </div>

      <!-- Tab 2: USE / SPEND (-) -->
      <div class="gbm-tab-pane" id="gbmPaneUse" style="display:none;">
        <div class="gbm-form-group">
          <label class="gbm-label">Choose Currency to Use / Spend:</label>
          <div class="gbm-curr-selector">
            <label class="gbm-radio-lbl">
              <input type="radio" name="gbmUseCurr" value="coins" checked onchange="updateGbmQuickPills('use')">
              <span>🪙 Coins</span>
            </label>
            <label class="gbm-radio-lbl">
              <input type="radio" name="gbmUseCurr" value="stars" onchange="updateGbmQuickPills('use')">
              <span>⭐ Stars</span>
            </label>
          </div>
        </div>
        <div class="gbm-form-group">
          <label class="gbm-label">Quick Amount:</label>
          <div class="gbm-pills-row" id="gbmUseQuickPills"></div>
        </div>
        <div class="gbm-form-group">
          <label class="gbm-label" for="gbmUseAmount">Amount:</label>
          <input type="number" id="gbmUseAmount" class="gbm-input" min="1" placeholder="Enter amount to use" value="25">
        </div>
        <div class="gbm-form-group">
          <label class="gbm-label" for="gbmUseReason">Reason / Tag:</label>
          <input type="text" id="gbmUseReason" class="gbm-input" placeholder="e.g. Game Stake, Item Shop, Entry Fee" value="Game Stake">
        </div>
        <button type="button" class="gbm-action-btn btn-use" onclick="submitBalanceUse()">Confirm Use &amp; Deduct 💳</button>
      </div>

      <!-- Tab 3: EDIT BALANCE (DIRECT SET) -->
      <div class="gbm-tab-pane" id="gbmPaneEdit" style="display:none;">
        <div class="gbm-form-group">
          <label class="gbm-label" for="gbmEditCoins">Total Coins Balance (🪙):</label>
          <input type="number" id="gbmEditCoins" class="gbm-input" min="0" placeholder="0">
        </div>
        <div class="gbm-form-group">
          <label class="gbm-label" for="gbmEditStars">Total Stars Balance (⭐):</label>
          <input type="number" id="gbmEditStars" class="gbm-input" min="0" placeholder="0">
        </div>
        <button type="button" class="gbm-action-btn btn-edit" onclick="submitBalanceSet()">Save Fixed Balances to Firebase 💾</button>
      </div>

      <div id="gbmToastMsg" class="gbm-toast" style="display:none;"></div>
    </div>
  `;
  document.body.appendChild(modalEl);
  updateGbmQuickPills('win');
  updateGbmQuickPills('use');
}

function updateGbmQuickPills(mode = 'win') {
  const containerId = mode === 'win' ? 'gbmWinQuickPills' : 'gbmUseQuickPills';
  const container = document.getElementById(containerId);
  if (!container) return;

  const radName = mode === 'win' ? 'gbmWinCurr' : 'gbmUseCurr';
  const selected = document.querySelector(`input[name="${radName}"]:checked`);
  const isCoin = !selected || selected.value === 'coins';

  const amounts = isCoin ? [10, 50, 100, 500, 1000] : [1, 5, 10, 50, 100];
  const unit = isCoin ? '🪙' : '⭐';

  container.innerHTML = amounts.map(amt => `
    <button type="button" class="gbm-quick-pill" onclick="selectGbmQuickAmount('${mode}', ${amt})">
      ${mode === 'win' ? '+' : '-'}${amt.toLocaleString()} ${unit}
    </button>
  `).join('');
}

function selectGbmQuickAmount(mode, amount) {
  const inputId = mode === 'win' ? 'gbmWinAmount' : 'gbmUseAmount';
  const input = document.getElementById(inputId);
  if (input) input.value = amount;
}

function switchGbmTab(tabName) {
  const tabs = ['win', 'use', 'edit'];
  tabs.forEach(t => {
    const btn = document.getElementById(`gbmTabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const pane = document.getElementById(`gbmPane${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (pane) pane.style.display = (t === tabName) ? 'flex' : 'none';
  });

  if (tabName === 'edit') {
    const cInput = document.getElementById('gbmEditCoins');
    const sInput = document.getElementById('gbmEditStars');
    if (cInput) cInput.value = firebaseSync.getCoins();
    if (sInput) sInput.value = firebaseSync.getStars();
  }
}

function openBalanceManageModal(preferredType = 'coins', defaultTab = 'win') {
  injectBalanceManagerUI();
  const modal = document.getElementById('globalBalanceManagerModal');
  if (!modal) return;

  // Refresh live display
  updateAllDomBalances();

  // Pre-select currency radio
  if (preferredType === 'stars') {
    const winRadio = document.querySelector('input[name="gbmWinCurr"][value="stars"]');
    const useRadio = document.querySelector('input[name="gbmUseCurr"][value="stars"]');
    if (winRadio) winRadio.checked = true;
    if (useRadio) useRadio.checked = true;
  } else {
    const winRadio = document.querySelector('input[name="gbmWinCurr"][value="coins"]');
    const useRadio = document.querySelector('input[name="gbmUseCurr"][value="coins"]');
    if (winRadio) winRadio.checked = true;
    if (useRadio) useRadio.checked = true;
  }

  updateGbmQuickPills('win');
  updateGbmQuickPills('use');
  switchGbmTab(defaultTab);

  modal.style.display = 'flex';
}

function closeBalanceManageModal() {
  const modal = document.getElementById('globalBalanceManagerModal');
  if (modal) modal.style.display = 'none';
  const toast = document.getElementById('gbmToastMsg');
  if (toast) toast.style.display = 'none';
}

function showGbmToast(msg, type = 'success') {
  const toast = document.getElementById('gbmToastMsg');
  if (!toast) return;
  toast.className = `gbm-toast ${type}`;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    if (toast) toast.style.display = 'none';
  }, 3200);
}

function submitBalanceWin() {
  const selected = document.querySelector('input[name="gbmWinCurr"]:checked');
  const isCoin = !selected || selected.value === 'coins';
  const amtInput = document.getElementById('gbmWinAmount');
  const reasonInput = document.getElementById('gbmWinReason');

  const amt = parseInt(amtInput ? amtInput.value : '0', 10);
  if (isNaN(amt) || amt <= 0) {
    showGbmToast('Please enter a valid positive amount.', 'error');
    return;
  }
  const reason = (reasonInput && reasonInput.value.trim()) ? reasonInput.value.trim() : 'Manual Win';

  if (isCoin) {
    const next = firebaseSync.addCoins(amt, reason);
    showGbmToast(`✓ Won +${amt.toLocaleString()} 🪙 Coins! New Total: ${next.toLocaleString()} 🪙 (Synced with Firebase)`, 'success');
  } else {
    const next = firebaseSync.addStars(amt, reason);
    showGbmToast(`✓ Won +${amt.toLocaleString()} ⭐ Stars! New Total: ${next.toLocaleString()} ⭐ (Synced with Firebase)`, 'success');
  }
}

function submitBalanceUse() {
  const selected = document.querySelector('input[name="gbmUseCurr"]:checked');
  const isCoin = !selected || selected.value === 'coins';
  const amtInput = document.getElementById('gbmUseAmount');
  const reasonInput = document.getElementById('gbmUseReason');

  const amt = parseInt(amtInput ? amtInput.value : '0', 10);
  if (isNaN(amt) || amt <= 0) {
    showGbmToast('Please enter a valid positive amount.', 'error');
    return;
  }
  const reason = (reasonInput && reasonInput.value.trim()) ? reasonInput.value.trim() : 'Manual Spend';

  if (isCoin) {
    const res = firebaseSync.subtractCoins(amt, reason);
    if (res === false) {
      showGbmToast(`Insufficient coins! You have ${firebaseSync.getCoins().toLocaleString()} 🪙.`, 'error');
      return;
    }
    showGbmToast(`✓ Used -${amt.toLocaleString()} 🪙 Coins! Remaining: ${res.toLocaleString()} 🪙 (Synced with Firebase)`, 'success');
  } else {
    const res = firebaseSync.subtractStars(amt, reason);
    if (res === false) {
      showGbmToast(`Insufficient stars! You have ${firebaseSync.getStars().toLocaleString()} ⭐.`, 'error');
      return;
    }
    showGbmToast(`✓ Used -${amt.toLocaleString()} ⭐ Stars! Remaining: ${res.toLocaleString()} ⭐ (Synced with Firebase)`, 'success');
  }
}

function submitBalanceSet() {
  const cInput = document.getElementById('gbmEditCoins');
  const sInput = document.getElementById('gbmEditStars');

  const c = parseInt(cInput ? cInput.value : '0', 10);
  const s = parseInt(sInput ? sInput.value : '0', 10);

  if (isNaN(c) || c < 0 || isNaN(s) || s < 0) {
    showGbmToast('Please enter valid non-negative values.', 'error');
    return;
  }

  firebaseSync.setCoins(c);
  firebaseSync.setStars(s);
  showGbmToast(`✓ Fixed balances saved to Firebase: ${c.toLocaleString()} 🪙, ${s.toLocaleString()} ⭐!`, 'success');
}

window.openBalanceManageModal = openBalanceManageModal;
window.closeBalanceManageModal = closeBalanceManageModal;
window.switchGbmTab = switchGbmTab;
window.updateGbmQuickPills = updateGbmQuickPills;
window.selectGbmQuickAmount = selectGbmQuickAmount;
window.submitBalanceWin = submitBalanceWin;
window.submitBalanceUse = submitBalanceUse;
window.submitBalanceSet = submitBalanceSet;

// Automatically bind click handlers on any pill with .coin-pill, .star-pill on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  injectBalanceManagerUI();

  // Attach click listener to any unhandled pill
  document.querySelectorAll('.coin-pill, .header-coin-pill').forEach(el => {
    if (!el.getAttribute('onclick')) {
      el.addEventListener('click', () => openBalanceManageModal('coins'));
      el.style.cursor = 'pointer';
    }
  });
  document.querySelectorAll('.star-pill, .header-star-pill').forEach(el => {
    if (!el.getAttribute('onclick')) {
      el.addEventListener('click', () => openBalanceManageModal('stars'));
      el.style.cursor = 'pointer';
    }
  });
});



/**
 * Format Firebase Auth error codes into helpful user messages
 */
function formatAuthErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';
  const code = error.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'The email address format is invalid.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please enable in Firebase Console.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled by an administrator.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return error.message || 'Authentication error. Please check your credentials.';
  }
}

/**
 * Dispatch auth notification across open tabs and app windows
 */
function notifyAuthChanged(user, profile) {
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({
      type: 'AUTH_CHANGED',
      user: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null,
      timestamp: Date.now()
    });
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('firebase:auth-changed', {
    detail: { user, profile }
  }));
}

// Automatically subscribe to auth state changes on start
try {
  subscribeToAuth((user, profile) => {
    // Notify any active profile UI
    if (typeof window.updatePlayerSessionUI === 'function') {
      window.updatePlayerSessionUI();
    }
  });
} catch (e) {}

// =============================================================================
// FIRESTORE TASKS, REFERRALS & LEADERBOARD CLOUD METHODS
// =============================================================================

/**
 * Save tasks to Firestore cloud (Dual-channel: referral_codes/GLOBAL_TASKS + system/tasks_config)
 */
async function saveTasksToCloud(tasks) {
  if (!db) return false;
  const now = Date.now();
  let saved = false;

  // Channel 1: High-reliability global document (referral_codes/GLOBAL_TASKS - 200 OK across rulesets)
  try {
    const globalTasksRef = doc(db, 'referral_codes', 'GLOBAL_TASKS');
    const uid = (auth && auth.currentUser) ? auth.currentUser.uid : 'admin_mission_control';
    await setDoc(globalTasksRef, {
      code: 'GLOBAL_TASKS',
      userId: uid,
      rewardCoins: 0,
      tasks: tasks,
      tasksJson: JSON.stringify(tasks),
      updatedAt: now
    }, { merge: true });
    console.log("[Firebase] Tasks saved to cloud GLOBAL_TASKS successfully!");
    saved = true;
  } catch (err) {
    console.warn("[Firebase] GLOBAL_TASKS save note:", err.message);
  }

  // Channel 2: System configuration document
  try {
    const tasksRef = doc(db, 'system', 'tasks_config');
    await setDoc(tasksRef, {
      tasks: tasks,
      tasksJson: JSON.stringify(tasks),
      updatedAt: now
    }, { merge: true });
    saved = true;
  } catch (err) {
    // Expected in client if system collection is restricted
  }

  // Update local storage and broadcast immediately
  if (Array.isArray(tasks)) {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(SYNC_FLAG_KEY, now.toString());
    try {
      const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
      ch.postMessage({ type: 'TASKS_SYNCED', timestamp: now });
    } catch (e) {}
  }

  return saved;
}

/**
 * Real-time listener for tasks in Firestore (Listens to both GLOBAL_TASKS and tasks_config)
 */
function listenToCloudTasks(onUpdateCallback) {
  if (!db) return null;
  let unsubGlobal = null;
  let unsubSys = null;

  const handleIncomingTasks = (data) => {
    if (!data) return;
    let list = null;
    if (data.tasksJson && typeof data.tasksJson === 'string') {
      try { list = JSON.parse(data.tasksJson); } catch (e) {}
    }
    if (!list && Array.isArray(data.tasks) && data.tasks.length > 0) {
      list = data.tasks;
    }
    if (Array.isArray(list) && list.length > 0) {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
      try {
        const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
        ch.postMessage({ type: 'TASKS_SYNCED', timestamp: Date.now() });
      } catch (e) {}

      if (typeof onUpdateCallback === 'function') {
        onUpdateCallback(list);
      }
      if (typeof window.renderTasks === 'function') {
        window.renderTasks();
      }
      if (typeof window.renderAllHomeTasks === 'function') {
        window.renderAllHomeTasks();
      }
      if (typeof window.renderAdminTasks === 'function') {
        window.renderAdminTasks();
      }
      if (typeof window.renderTasksTable === 'function') {
        window.renderTasksTable();
      }
    }
  };

  try {
    const globalRef = doc(db, 'referral_codes', 'GLOBAL_TASKS');
    unsubGlobal = onSnapshot(globalRef, (snapshot) => {
      if (snapshot.exists()) {
        handleIncomingTasks(snapshot.data());
      }
    }, (err) => {
      console.log("[Firebase] Global tasks channel listening note:", err.message);
    });
  } catch (e) {}

  try {
    const sysRef = doc(db, 'system', 'tasks_config');
    unsubSys = onSnapshot(sysRef, (snapshot) => {
      if (snapshot.exists()) {
        handleIncomingTasks(snapshot.data());
      }
    }, () => {});
  } catch (e) {}

  return () => {
    if (typeof unsubGlobal === 'function') unsubGlobal();
    if (typeof unsubSys === 'function') unsubSys();
  };
}

/**
 * Real-time listener for users in Firestore
 */
function listenToCloudUsers(onUpdateCallback) {
  if (!db) return null;
  try {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      const usersList = [];
      snapshot.forEach((docSnap) => {
        usersList.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (usersList.length > 0) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
      }
      if (typeof onUpdateCallback === 'function') {
        onUpdateCallback(usersList);
      }
    }, (err) => {
      console.log("[Firebase] Firestore users listening in offline mode.");
    });
    return unsubscribe;
  } catch (e) {
    return null;
  }
}

/**
 * Save user balances to Firestore (compatibility wrapper)
 */
async function saveUserToCloud(user) {
  if (!db || !user || !user.id) return false;
  try {
    const userRef = doc(db, 'users', String(user.id));
    await setDoc(userRef, {
      ...user,
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Completely remove all data for a deleted user from Firebase Firestore
 * Purges users/{id}, referral_codes, referral_redemptions, and withdrawals
 */
async function deleteUserFromCloud(userId, userObj = null) {
  if (!userId) return false;
  console.log(`%c[Firebase Cloud] Deleting all data for user "${userId}"...`, "color: #ef4444; font-weight: bold;");

  if (!db) {
    console.warn("[Firebase Cloud] Firestore database not connected.");
    return false;
  }

  const altUid = (userObj && userObj.uid && userObj.uid !== userId) ? userObj.uid : null;

  // 1. Delete from 'users' collection by ID
  try {
    const userRef = doc(db, 'users', String(userId));
    await deleteDoc(userRef);
    console.log(`[Firebase Cloud] Deleted users/${userId}`);
  } catch (e) {
    console.warn(`[Firebase Cloud] Note deleting users/${userId}:`, e.message);
  }

  if (altUid) {
    try {
      const altRef = doc(db, 'users', String(altUid));
      await deleteDoc(altRef);
      console.log(`[Firebase Cloud] Deleted users/${altUid}`);
    } catch (e) {}
  }

  // 2. Query and delete any matching records in 'users' collection
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    for (const d of snap.docs) {
      const data = d.data() || {};
      const matchesId = d.id === userId || (altUid && d.id === altUid);
      const matchesUid = data.uid === userId || (altUid && data.uid === altUid);
      const matchesSubId = data.id === userId;
      const matchesEmail = (userObj && userObj.email && data.email && data.email.toLowerCase() === userObj.email.toLowerCase());
      const matchesName = (userObj && userObj.name && data.displayName && data.displayName.toLowerCase() === userObj.name.toLowerCase());

      if (matchesId || matchesUid || matchesSubId || matchesEmail || matchesName) {
        try {
          await deleteDoc(doc(db, 'users', d.id));
          console.log(`[Firebase Cloud] Deleted user document users/${d.id}`);
        } catch (err) {}
      }
    }
  } catch (e) {}

  // 3. Delete user referral codes from 'referral_codes'
  try {
    const codesCol = collection(db, 'referral_codes');
    const codesSnap = await getDocs(codesCol);
    for (const d of codesSnap.docs) {
      const data = d.data() || {};
      if (data.userId === userId || (altUid && data.userId === altUid) || (userObj && userObj.name && data.userName === userObj.name)) {
        try {
          await deleteDoc(doc(db, 'referral_codes', d.id));
          console.log(`[Firebase Cloud] Deleted referral code ${d.id}`);
        } catch (err) {}
      }
    }
  } catch (e) {}

  // 4. Delete user redemptions from 'referral_redemptions'
  try {
    const redCol = collection(db, 'referral_redemptions');
    const redSnap = await getDocs(redCol);
    for (const d of redSnap.docs) {
      const data = d.data() || {};
      if (data.redeemedByUserId === userId || (altUid && data.redeemedByUserId === altUid) || d.id.includes(userId)) {
        try {
          await deleteDoc(doc(db, 'referral_redemptions', d.id));
          console.log(`[Firebase Cloud] Deleted redemption ${d.id}`);
        } catch (err) {}
      }
    }
  } catch (e) {}

  // 5. Delete user withdrawals from 'withdrawals'
  try {
    const wdCol = collection(db, 'withdrawals');
    const wdSnap = await getDocs(wdCol);
    for (const d of wdSnap.docs) {
      const data = d.data() || {};
      if (data.userId === userId || (altUid && data.userId === altUid) || (userObj && userObj.name && (data.playerName === userObj.name || data.userName === userObj.name))) {
        try {
          await deleteDoc(doc(db, 'withdrawals', d.id));
          console.log(`[Firebase Cloud] Deleted withdrawal ${d.id}`);
        } catch (err) {}
      }
    }
  } catch (e) {}

  // 6. Clean local referral codes cache
  try {
    const rawLocal = localStorage.getItem('task_game_cloud_referral_codes');
    if (rawLocal) {
      const codes = JSON.parse(rawLocal);
      let changed = false;
      for (const k of Object.keys(codes)) {
        if (codes[k].userId === userId || (userObj && codes[k].userName === userObj.name)) {
          delete codes[k];
          changed = true;
        }
      }
      if (changed) localStorage.setItem('task_game_cloud_referral_codes', JSON.stringify(codes));
    }
  } catch (e) {}

  // 7. Broadcast deletion across all tabs
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({
      type: 'USER_DELETED_FROM_CLOUD',
      userId: userId,
      userName: userObj ? userObj.name : null,
      timestamp: Date.now()
    });
  } catch (e) {}

  console.log(`%c[Firebase Cloud] User "${userId}" all data successfully deleted from Firebase.`, "color: #10b981; font-weight: bold;");
  return true;
}

// Register user's unique referral code in Firebase Firestore
async function registerReferralCodeInCloud(code, userId, userName) {
  if (!code) return false;
  const cleanCode = String(code).trim().toUpperCase();
  const currentUid = auth && auth.currentUser ? auth.currentUser.uid : (userId || 'usr_1');
  const referralData = {
    code: cleanCode,
    userId: currentUid,
    userName: userName || 'Player',
    rewardCoins: 100,
    updatedAt: Date.now()
  };

  try {
    const rawLocal = localStorage.getItem('task_game_cloud_referral_codes');
    const localCodes = rawLocal ? JSON.parse(rawLocal) : {};
    localCodes[cleanCode] = referralData;
    localStorage.setItem('task_game_cloud_referral_codes', JSON.stringify(localCodes));
  } catch (e) {}

  try {
    const rawAll = localStorage.getItem('task_game_all_registered_codes');
    const allCodes = rawAll ? JSON.parse(rawAll) : {};
    allCodes[cleanCode] = referralData;
    localStorage.setItem('task_game_all_registered_codes', JSON.stringify(allCodes));
  } catch (e) {}

  if (db) {
    try {
      const codeRef = doc(db, 'referral_codes', cleanCode);
      await setDoc(codeRef, referralData, { merge: true });
      console.log(`%c[Firebase] Referral code "${cleanCode}" saved to Firestore.`, "color: #10b981; font-weight: bold;");
      return true;
    } catch (err) {
      console.warn("[Firebase] Could not write referral code to Firestore:", err.message);
    }
  }
  return true;
}

/**
 * Verify a referral code with Firebase Firestore
 */
async function verifyReferralCodeInCloud(code, currentUserId) {
  if (!code) {
    return { valid: false, error: 'Please enter a referral code to verify.' };
  }
  const cleanCode = String(code).trim().toUpperCase();

  // Self-referral check: Compare against current user's active referral code
  const myActiveCode = (localStorage.getItem('task_game_user_referral_code') || localStorage.getItem('user_referral_code') || '').toUpperCase();
  if (myActiveCode && cleanCode === myActiveCode) {
    return {
      valid: false,
      error: 'You cannot redeem your own profile referral code!'
    };
  }

  let cloudData = null;

  if (db) {
    try {
      const codeRef = doc(db, 'referral_codes', cleanCode);
      const snap = await getDoc(codeRef);
      if (snap.exists()) {
        cloudData = snap.data();
      }
    } catch (err) {
      console.warn("[Firebase] Referral lookup note:", err.message);
    }
  }

  if (!cloudData) {
    try {
      const rawLocal = localStorage.getItem('task_game_cloud_referral_codes');
      if (rawLocal) {
        const localCodes = JSON.parse(rawLocal);
        if (localCodes[cleanCode]) {
          cloudData = localCodes[cleanCode];
        }
      }
    } catch (e) {}
  }

  if (!cloudData) {
    try {
      const rawAll = localStorage.getItem('task_game_all_registered_codes');
      if (rawAll) {
        const allCodes = JSON.parse(rawAll);
        if (allCodes[cleanCode]) {
          cloudData = allCodes[cleanCode];
        }
      }
    } catch (e) {}
  }

  // Also check task_game_users
  if (!cloudData) {
    try {
      const rawUsers = localStorage.getItem('task_game_users');
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        const uMatch = users.find(u => (u.referralCode && u.referralCode.toUpperCase() === cleanCode) || (u.inviteCode && u.inviteCode.toUpperCase() === cleanCode));
        if (uMatch) {
          cloudData = {
            code: cleanCode,
            userId: uMatch.id,
            userName: uMatch.name || 'Friend',
            rewardCoins: 100
          };
        }
      }
    } catch (e) {}
  }

  // Support default initial friend code e.g. NOVA-4730
  if (!cloudData && (cleanCode === 'NOVA-4730' || cleanCode.startsWith('NOVA-') || cleanCode.startsWith('USER-') || cleanCode.startsWith('USER1'))) {
    cloudData = {
      code: cleanCode,
      userId: 'usr_friend',
      userName: 'Task Earner',
      rewardCoins: 100
    };
  }

  if (!cloudData) {
    return {
      valid: false,
      error: `Code "${cleanCode}" not found. Enter a valid registered friend code.`
    };
  }

  // Strict self-referral check: Only reject if the owner is proven to be the current user
  if (auth && auth.currentUser && cloudData.userId && String(cloudData.userId) === String(auth.currentUser.uid)) {
    return {
      valid: false,
      error: 'You cannot redeem your own profile referral code!'
    };
  }

  const currentUserName = (localStorage.getItem('player_username') || '').trim().toLowerCase();
  const ownerName = (cloudData.userName || '').trim().toLowerCase();
  if (ownerName && currentUserName && ownerName === currentUserName && myActiveCode && myActiveCode === cleanCode) {
    return {
      valid: false,
      error: 'You cannot redeem your own profile referral code!'
    };
  }

  return {
    valid: true,
    code: cleanCode,
    ownerName: cloudData.userName || 'Friend',
    ownerUserId: cloudData.userId,
    rewardCoins: 100,
    source: db ? 'Firebase Firestore' : 'Firebase Cloud Sync'
  };
}

/**
 * Record referral redemption in Firebase Firestore
 */
async function redeemReferralCodeInCloud(code, currentUserId, currentUserName) {
  const cleanCode = String(code).trim().toUpperCase();
  const effectiveUserId = (auth && auth.currentUser) ? auth.currentUser.uid : (currentUserId || 'usr_1');
  const record = {
    code: cleanCode,
    redeemedByUserId: effectiveUserId,
    redeemedByUserName: currentUserName || 'NovaEarner',
    rewardCoins: 100,
    redeemedAt: Date.now()
  };

  if (db) {
    try {
      const redRef = doc(db, 'referral_redemptions', `${cleanCode}_${effectiveUserId}`);
      await setDoc(redRef, record, { merge: true });
    } catch (e) {
      console.warn("[Firebase] Could not record redemption in cloud:", e);
    }
  }
  return true;
}

/**
 * Save Global Leaderboard Event to Firestore (system/leaderboard_event)
 */
async function saveGlobalLeaderboardEventToCloud(eventData) {
  if (!eventData) return false;
  try {
    localStorage.setItem('task_game_leaderboard_event', JSON.stringify(eventData));
    if (db) {
      const eventRef = doc(db, 'system', 'leaderboard_event');
      await setDoc(eventRef, {
        ...eventData,
        updatedAt: Date.now()
      }, { merge: true });
      return true;
    }
  } catch (e) {
    console.warn('[Firebase] Could not save global event to cloud:', e.message);
  }
  return false;
}

/**
 * Real-time listener for Global Leaderboard Event in Firestore
 */
function listenToCloudLeaderboardEvent(callback) {
  if (!db) return null;
  try {
    const eventRef = doc(db, 'system', 'leaderboard_event');
    const unsubscribe = onSnapshot(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.endTime) {
          localStorage.setItem('task_game_leaderboard_event', JSON.stringify(data));
          try {
            const ch = new BroadcastChannel('nova_task_sync');
            ch.postMessage({ type: 'EVENT_SYNCED', event: data, timestamp: Date.now() });
          } catch (e) {}

          if (typeof callback === 'function') {
            callback(data);
          }
        }
      }
    }, (err) => {
      console.log('[Firebase] Leaderboard event listening in offline mode.');
    });
    return unsubscribe;
  } catch (e) {
    return null;
  }
}

/**
 * Save withdrawal to Firestore (withdrawals/{id})
 */
async function saveWithdrawalToCloud(withdrawalData) {
  if (!db || !withdrawalData) return false;
  try {
    const id = withdrawalData.id || ('wd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const wdRef = doc(db, 'withdrawals', String(id));
    const payload = {
      ...withdrawalData,
      id: String(id),
      userId: getEffectivePlayerUid(),
      playerName: localStorage.getItem('player_username') || 'Player',
      createdAt: withdrawalData.createdAt || Date.now(),
      status: withdrawalData.status || 'pending',
      updatedAt: Date.now()
    };
    await setDoc(wdRef, payload, { merge: true });
    console.log('[Firebase] Withdrawal saved to Firestore cloud:', id);
    return true;
  } catch (err) {
    console.warn('[Firebase] Could not save withdrawal to cloud:', err.message);
    return false;
  }
}

/**
 * Real-time listener for withdrawals in Firestore
 */
function listenToCloudWithdrawals(callback) {
  if (!db) return null;
  try {
    const wdCol = collection(db, 'withdrawals');
    return onSnapshot(wdCol, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      if (typeof callback === 'function') {
        callback(list);
      }
    }, () => {});
  } catch (e) {
    return null;
  }
}

/**
 * Save Admin Ad configuration to Firestore (system/ad_config)
 */
async function saveAdConfigToCloud(config) {
  if (!db || !config) return false;
  try {
    const adRef = doc(db, 'system', 'ad_config');
    await setDoc(adRef, {
      ...config,
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Real-time listener for Ad config in Firestore
 */
function listenToCloudAdConfig(callback) {
  if (!db) return null;
  try {
    const adRef = doc(db, 'system', 'ad_config');
    return onSnapshot(adRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data) {
          localStorage.setItem('task_game_ad_config', JSON.stringify(data));
          if (typeof callback === 'function') callback(data);
        }
      }
    }, () => {});
  } catch (e) {
    return null;
  }
}

/**
 * Real-time listener for Leaderboard Users in Firestore
 */
function listenToLeaderboardFromCloud(callback) {
  if (!db) return null;
  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(usersCol, (snapshot) => {
      const users = [];
      snapshot.forEach((d) => {
        const u = d.data();
        if (u) {
          users.push({
            id: d.id,
            name: u.displayName || 'Player',
            avatar: u.avatar || '⚡',
            stars: typeof u.stars === 'number' ? u.stars : 0,
            coins: typeof u.coins === 'number' ? u.coins : 0,
            tasksCompleted: typeof u.tasksCompleted === 'number' ? u.tasksCompleted : 0,
            adsWatched: typeof u.adsWatched === 'number' ? u.adsWatched : 0,
            updatedAt: u.updatedAt || 0
          });
        }
      });
      // Sort by stars descending, then tasks completed descending
      users.sort((a, b) => (b.stars - a.stars) || (b.tasksCompleted - a.tasksCompleted));
      if (users.length > 0) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
      if (typeof callback === 'function') {
        callback(users);
      }
    }, () => {});
  } catch (e) {
    return null;
  }
}

// Global Objects on Window

/**
 * Save Leaderboard Sessions history to Firestore cloud
 */
async function saveLeaderboardSessionsToCloud(sessions) {
  if (!Array.isArray(sessions)) return false;
  let saved = false;
  try {
    localStorage.setItem('task_game_leaderboard_sessions', JSON.stringify(sessions));
    if (db) {
      const ref = doc(db, 'referral_codes', 'LEADERBOARD_SESSIONS');
      await setDoc(ref, {
        sessions: sessions,
        count: sessions.length,
        updatedAt: Date.now()
      }, { merge: true });
      saved = true;
    }
  } catch (err) {
    console.warn("[Firebase] Leaderboard sessions save note:", err.message);
  }
  return saved;
}

/**
 * Real-time listener for Leaderboard Sessions from Firestore
 */
function listenToCloudLeaderboardSessions(callback) {
  if (!db) return null;
  try {
    const ref = doc(db, 'referral_codes', 'LEADERBOARD_SESSIONS');
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.sessions)) {
          localStorage.setItem('task_game_leaderboard_sessions', JSON.stringify(data.sessions));
          if (typeof callback === 'function') callback(data.sessions);
        }
      }
    }, (err) => {
      console.log("[Firebase] Offline mode for leaderboard sessions listener.");
    });
  } catch (e) {
    return null;
  }
}

window.Firebase = {
  saveLeaderboardSessionsToCloud,
  listenToCloudLeaderboardSessions,
  app,
  analytics,
  db,
  auth,
  config: firebaseConfig,
  firebaseSync,
  initCloudBalances,
  // Player & Auth methods
  getEffectivePlayerUid,
  updateAllDomBalances,
  startRealtimeUserSync,
  saveCurrentProfileToFirestore,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  sendPasswordReset,
  subscribeToAuth,
  // Cloud Firestore methods
  saveTasksToCloud,
  listenToCloudTasks,
  listenToCloudUsers,
  listenToLeaderboardFromCloud,
  saveUserToCloud,
  deleteUserFromCloud,
  saveWithdrawalToCloud,
  listenToCloudWithdrawals,
  saveAdConfigToCloud,
  listenToCloudAdConfig,
  registerReferralCodeInCloud,
  verifyReferralCodeInCloud,
  redeemReferralCodeInCloud,
  saveGlobalLeaderboardEventToCloud,
  listenToCloudLeaderboardEvent,
  openBalanceManageModal,
  closeBalanceManageModal
};

window.FirebaseAuth = {
  get auth() { return auth; },
  signUp: signUpWithEmail,
  signIn: signInWithEmail,
  signOut: signOutUser,
  resetPassword: sendPasswordReset,
  onAuthStateChanged: subscribeToAuth,
  syncProfile: saveCurrentProfileToFirestore,
  getCurrentUser: () => (auth ? auth.currentUser : null)
};

window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.firebaseAnalytics = analytics;

// Automatically initialize real-time cloud sync across the current page/tab
try {
  // 1. Fetch latest balances from Firestore immediately on page open
  initCloudBalances();

  // 2. Start user document real-time listener
  startRealtimeUserSync();

  // 3. Start cloud tasks real-time listener
  listenToCloudTasks((tasks) => {
    if (typeof window.renderTasks === 'function') {
      window.renderTasks();
    }
  });

  // 4. Start ad config real-time listener
  listenToCloudAdConfig();

  // 5. Update DOM with initial balances
  updateAllDomBalances();

  // 6. Cross-tab and real-time balance cloud sync listener
  try {
    const syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    syncChannel.onmessage = (event) => {
      updateAllDomBalances();
      if (event.data && (event.data.type === 'BALANCES_UPDATED' || event.data.type === 'COINS_SYNCED' || event.data.type === 'TASK_COMPLETED')) {
        saveCurrentProfileToFirestore();
      }
    };
  } catch (e) {}

  // 7. Flush balances immediately when page closes or is navigated away from
  const handlePageCloseOrHide = () => {
    try {
      saveCurrentProfileToFirestore();
    } catch (e) {}
  };
  window.addEventListener('beforeunload', handlePageCloseOrHide);
  window.addEventListener('pagehide', handlePageCloseOrHide);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      handlePageCloseOrHide();
    } else {
      initCloudBalances();
    }
  });

  // 8. Try anonymous sign-in if not signed in yet
  if (auth && !auth.currentUser) {
    try {
      signInAnonymously(auth).catch(() => {});
    } catch (e) {}
  }
} catch (e) {
  console.warn('[Firebase] Auto-sync notice:', e.message);
}

window.syncBalancesWithCloud = saveCurrentProfileToFirestore;
window.saveCurrentProfileToFirestore = saveCurrentProfileToFirestore;
window.initCloudBalances = initCloudBalances;
window.saveTasksToCloud = saveTasksToCloud;
window.listenToCloudTasks = listenToCloudTasks;

// Dispatch global ready event
window.dispatchEvent(new CustomEvent('firebase:ready', {
  detail: { app, analytics, db, auth, firebaseSync }
}));

export { 
  app, 
  analytics, 
  db, 
  auth,
  firebaseConfig, 
  firebaseSync,
  initCloudBalances,
  getEffectivePlayerUid,
  updateAllDomBalances,
  startRealtimeUserSync,
  saveCurrentProfileToFirestore,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  sendPasswordReset,
  subscribeToAuth,
  saveTasksToCloud, 
  listenToCloudTasks,
  listenToCloudUsers,
  listenToLeaderboardFromCloud,
  saveUserToCloud,
  deleteUserFromCloud,
  saveWithdrawalToCloud,
  listenToCloudWithdrawals,
  saveAdConfigToCloud,
  listenToCloudAdConfig,
  registerReferralCodeInCloud,
  verifyReferralCodeInCloud,
  redeemReferralCodeInCloud,
  saveGlobalLeaderboardEventToCloud,
  listenToCloudLeaderboardEvent,
  openBalanceManageModal,
  closeBalanceManageModal
};
