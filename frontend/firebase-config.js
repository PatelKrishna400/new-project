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
      localStorage.setItem('player_email', user.email);
      localStorage.setItem('player_uid', user.uid);

      // Fetch cloud Firestore user document
      let profile = null;
      if (db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            profile = snap.data();
            // Sync balances
            if (typeof profile.coins === 'number') localStorage.setItem('user_coins', profile.coins.toString());
            if (typeof profile.stars === 'number') localStorage.setItem('user_stars', profile.stars.toString());
            if (typeof profile.tasksCompleted === 'number') localStorage.setItem('completed_tasks_count', profile.tasksCompleted.toString());
            if (typeof profile.adsWatched === 'number') localStorage.setItem('ads_watched_count', profile.adsWatched.toString());
            if (profile.displayName) localStorage.setItem('player_username', profile.displayName);
            if (profile.avatar) localStorage.setItem('player_avatar', profile.avatar);
          } else {
            // Document doesn't exist yet, save current local state
            await saveCurrentProfileToFirestore(user);
          }
        } catch (e) {
          console.warn("[Firebase] Auth state profile sync note:", e.message);
        }
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

/**
 * Update all DOM balance indicators across any active page and tab in real time
 */
function updateAllDomBalances(coins, stars) {
  const c = typeof coins === 'number' ? coins : parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  const s = typeof stars === 'number' ? stars : parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  const coinsFmt = Number(c || 0).toLocaleString();
  const starsFmt = Number(s || 0).toLocaleString();

  // All known coin DOM IDs across all games, hub, shop, wallet
  const coinElements = [
    'userCoinsTop', 'walletCoinsTop', 'shopCoinsDisplay', 'gameCoinsDisplay', 
    'tabSfCoins', 'tabSfSolarCoins', 'headerCoins', 'statCoinsVal', 'sfCoinDisplay',
    'playerCoinsDisplay', 'heroCoinsDisplay', 'lobbyCoinsDisplay'
  ];
  coinElements.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'INPUT') el.value = c;
      else if (id === 'tabSfCoins') el.textContent = `${coinsFmt} 🍯`;
      else if (id === 'tabSfSolarCoins') el.textContent = `${coinsFmt} 🪙`;
      else el.textContent = coinsFmt;
    }
  });

  // All known star DOM IDs across all games, hub, shop, wallet, leaderboard
  const starElements = [
    'userStarsTop', 'walletStarsTop', 'shopStarsDisplay', 'shopStarsDisplayTop', 
    'statStarsVal', 'headerStars', 'playerStarsDisplay', 'lobbyStarsDisplay'
  ];
  starElements.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'INPUT') el.value = s;
      else el.textContent = starsFmt;
    }
  });
}

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
    const email = currentUser && currentUser.email ? currentUser.email : (localStorage.getItem('player_email') || '');

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

let userDocUnsubscribe = null;
/**
 * Real-time listener for current user's profile in Firestore
 */
function startRealtimeUserSync() {
  if (!db) return null;
  const uid = getEffectivePlayerUid();
  if (!uid) return null;

  if (userDocUnsubscribe) {
    userDocUnsubscribe();
    userDocUnsubscribe = null;
  }

  try {
    const userRef = doc(db, 'users', String(uid));
    userDocUnsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data() || {};
        let changed = false;

        if (typeof cloudData.coins === 'number') {
          const currentCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
          if (cloudData.coins !== currentCoins) {
            localStorage.setItem('task_game_coins', cloudData.coins.toString());
            localStorage.setItem('user_coins', cloudData.coins.toString());
            changed = true;
          }
        }

        if (typeof cloudData.stars === 'number') {
          const currentStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
          if (cloudData.stars !== currentStars) {
            localStorage.setItem('task_game_stars', cloudData.stars.toString());
            localStorage.setItem('user_stars', cloudData.stars.toString());
            changed = true;
          }
        }

        if (typeof cloudData.tasksCompleted === 'number') {
          localStorage.setItem('completed_tasks_count', cloudData.tasksCompleted.toString());
          localStorage.setItem('task_game_total_tasks_completed', cloudData.tasksCompleted.toString());
        }

        if (typeof cloudData.adsWatched === 'number') {
          localStorage.setItem('ads_watched_count', cloudData.adsWatched.toString());
          localStorage.setItem('task_game_ads_watched_count', cloudData.adsWatched.toString());
        }

        if (cloudData.displayName && cloudData.displayName !== 'Player') {
          localStorage.setItem('player_username', cloudData.displayName);
        }

        if (cloudData.avatar) {
          localStorage.setItem('player_avatar', cloudData.avatar);
        }

        updateAllDomBalances();

        if (changed) {
          try {
            const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
            ch.postMessage({ type: 'COINS_SYNCED', timestamp: Date.now() });
          } catch (e) {}
        }
      } else {
        // Document does not exist in Firestore yet, initialize it
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
function scheduleCloudBalanceSync() {
  if (cloudBalanceTimer) clearTimeout(cloudBalanceTimer);
  cloudBalanceTimer = setTimeout(() => {
    saveCurrentProfileToFirestore();
  }, 450);
}

// Listen to storage events across tabs to save to Firestore
window.addEventListener('storage', (e) => {
  if (e.key === 'task_game_coins' || e.key === 'user_coins' || e.key === 'task_game_stars' || e.key === 'user_stars') {
    scheduleCloudBalanceSync();
    updateAllDomBalances();
  }
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
 * Save tasks to Firestore cloud (system/tasks_config)
 */
async function saveTasksToCloud(tasks) {
  if (!db) return false;
  try {
    const tasksRef = doc(db, 'system', 'tasks_config');
    await setDoc(tasksRef, {
      tasks: tasks,
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[Firebase] Could not save tasks to cloud:", err.message);
    return false;
  }
}

/**
 * Real-time listener for tasks in Firestore
 */
function listenToCloudTasks(onUpdateCallback) {
  if (!db) return null;
  try {
    const tasksRef = doc(db, 'system', 'tasks_config');
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.tasks)) {
          localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(data.tasks));
          localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
          try {
            const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
            ch.postMessage({ type: 'TASKS_SYNCED', timestamp: Date.now() });
          } catch (e) {}

          if (typeof onUpdateCallback === 'function') {
            onUpdateCallback(data.tasks);
          }
        }
      }
    }, (err) => {
      console.log("[Firebase] Firestore tasks listening in offline mode.");
    });
    return unsubscribe;
  } catch (e) {
    return null;
  }
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
window.Firebase = {
  app,
  analytics,
  db,
  auth,
  config: firebaseConfig,
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
  listenToCloudLeaderboardEvent
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
  // 1. Start user document real-time listener
  startRealtimeUserSync();

  // 2. Start cloud tasks real-time listener
  listenToCloudTasks((tasks) => {
    if (typeof window.renderTasks === 'function') {
      window.renderTasks();
    }
  });

  // 3. Start ad config real-time listener
  listenToCloudAdConfig();

  // 4. Update DOM with initial balances
  updateAllDomBalances();

  // 5. Try anonymous sign-in if not signed in yet
  if (auth && !auth.currentUser) {
    try {
      signInAnonymously(auth).catch(() => {});
    } catch (e) {}
  }
} catch (e) {
  console.warn('[Firebase] Auto-sync notice:', e.message);
}

// Dispatch global ready event
window.dispatchEvent(new CustomEvent('firebase:ready', {
  detail: { app, analytics, db, auth }
}));

export { 
  app, 
  analytics, 
  db, 
  auth,
  firebaseConfig, 
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
  listenToCloudLeaderboardEvent
};
