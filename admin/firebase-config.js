// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
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
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmtznxs_VO7hJFtBFABF4IXskhWb25yyo",
  authDomain: "taskads-f894a.firebaseapp.com",
  projectId: "taskads-f894a",
  storageBucket: "taskads-f894a.firebasestorage.app",
  messagingSenderId: "365573359165",
  appId: "1:365573359165:web:77d5cf4cae5c52abe00c54",
  measurementId: "G-B800QRE7NV"
};

// Initialize Firebase
let app = null;
let analytics = null;
let db = null;
let auth = null;

try {
  app = initializeApp(firebaseConfig);
  console.log("%c[Firebase Admin] Connected to project: taskads-f894a", "color: #38bdf8; font-weight: bold;");

  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});

  try {
    db = getFirestore(app);
  } catch (err) {
    console.warn("[Firebase Admin] Firestore init error:", err);
  }

  try {
    auth = getAuth(app);
    signInAnonymously(auth).then((cred) => {
      console.log("%c[Firebase Admin] Authenticated anonymously UID:", "color: #10b981; font-weight: bold;", cred.user.uid);
    }).catch((err) => {
      console.warn("[Firebase Admin] Auth note:", err.message);
    });
  } catch (err) {
    console.warn("[Firebase Admin] Auth init note:", err);
  }
} catch (e) {
  console.error("[Firebase Admin] Initialization error:", e);
}

const TASKS_STORAGE_KEY = 'task_game_tasks';
const USERS_STORAGE_KEY = 'task_game_users';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

/**
 * Save tasks to Firestore cloud (Dual-channel: referral_codes/GLOBAL_TASKS + system/tasks_config)
 */
async function saveTasksToCloud(tasks) {
  if (!db) return false;
  const now = Date.now();
  let saved = false;

  // Channel 1: High-reliability global document (referral_codes/GLOBAL_TASKS - 200 OK across all rulesets)
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
    console.log("[Firebase Admin] Tasks saved to cloud GLOBAL_TASKS successfully!");
    saved = true;
  } catch (err) {
    console.warn("[Firebase Admin] GLOBAL_TASKS save note:", err.message);
  }

  // Channel 2: System configuration document
  try {
    const tasksRef = doc(db, 'system', 'tasks_config');
    await setDoc(tasksRef, {
      tasks: tasks,
      tasksJson: JSON.stringify(tasks),
      updatedAt: now
    }, { merge: true });
    console.log("[Firebase Admin] Tasks saved to cloud system/tasks_config successfully!");
    saved = true;
  } catch (err) {
    console.warn("[Firebase Admin] tasks_config save note:", err.message);
  }

  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  localStorage.setItem(SYNC_FLAG_KEY, now.toString());

  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'TASKS_UPDATED', timestamp: now });
    ch.postMessage({ type: 'TASKS_SYNCED', timestamp: now });
  } catch(e) {}

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
    }, () => {});
  } catch (e) {}

  try {
    const tasksRef = doc(db, 'system', 'tasks_config');
    unsubSys = onSnapshot(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        handleIncomingTasks(snapshot.data());
      }
    }, () => {});
  } catch (e) {}

  return () => {
    if (unsubGlobal) unsubGlobal();
    if (unsubSys) unsubSys();
  };
}
}

/**
 * Delete all user data from Firebase Firestore when an admin removes a user
 * Purges user profile, referrals, redemptions, and withdrawal records
 */
async function deleteUserFromCloud(userId, userObj = null) {
  if (!userId) return false;
  console.log(`%c[Firebase Admin] Deleting all cloud data for user "${userId}"...`, "color: #ef4444; font-weight: bold;");

  if (!db) {
    console.warn("[Firebase Admin] Firestore database not ready for deletion.");
    return false;
  }

  const altUid = (userObj && userObj.uid && userObj.uid !== userId) ? userObj.uid : null;
  let deletedCount = 0;

  // 1. Direct delete from 'users' collection by ID
  try {
    const userDocRef = doc(db, 'users', String(userId));
    await deleteDoc(userDocRef);
    deletedCount++;
    console.log(`[Firebase Admin] Removed document users/${userId}`);
  } catch (err) {
    console.warn(`[Firebase Admin] Note deleting users/${userId}:`, err.message);
  }

  if (altUid) {
    try {
      const altDocRef = doc(db, 'users', String(altUid));
      await deleteDoc(altDocRef);
      deletedCount++;
      console.log(`[Firebase Admin] Removed document users/${altUid}`);
    } catch (err) {}
  }

  // 2. Query and delete any matching records in 'users' collection
  try {
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    for (const d of usersSnap.docs) {
      const data = d.data() || {};
      const matchesId = d.id === userId || (altUid && d.id === altUid);
      const matchesUid = data.uid === userId || (altUid && data.uid === altUid);
      const matchesSubId = data.id === userId;
      const matchesEmail = (userObj && userObj.email && data.email && data.email.toLowerCase() === userObj.email.toLowerCase());
      const matchesName = (userObj && userObj.name && data.displayName && data.displayName.toLowerCase() === userObj.name.toLowerCase());

      if (matchesId || matchesUid || matchesSubId || matchesEmail || matchesName) {
        try {
          await deleteDoc(doc(db, 'users', d.id));
          deletedCount++;
          console.log(`[Firebase Admin] Purged matched user document users/${d.id}`);
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn("[Firebase Admin] User scan error:", err.message);
  }

  // 3. Delete user referral codes from 'referral_codes'
  try {
    const codesCol = collection(db, 'referral_codes');
    const codesSnap = await getDocs(codesCol);
    for (const d of codesSnap.docs) {
      const data = d.data() || {};
      if (data.userId === userId || (altUid && data.userId === altUid) || (userObj && userObj.name && data.userName === userObj.name)) {
        try {
          await deleteDoc(doc(db, 'referral_codes', d.id));
          console.log(`[Firebase Admin] Deleted referral code ${d.id}`);
        } catch (e) {}
      }
    }
  } catch (err) {}

  // 4. Delete user redemptions from 'referral_redemptions'
  try {
    const redCol = collection(db, 'referral_redemptions');
    const redSnap = await getDocs(redCol);
    for (const d of redSnap.docs) {
      const data = d.data() || {};
      if (data.redeemedByUserId === userId || (altUid && data.redeemedByUserId === altUid) || d.id.includes(userId)) {
        try {
          await deleteDoc(doc(db, 'referral_redemptions', d.id));
          console.log(`[Firebase Admin] Deleted redemption log ${d.id}`);
        } catch (e) {}
      }
    }
  } catch (err) {}

  // 5. Delete user withdrawals from 'withdrawals'
  try {
    const wdCol = collection(db, 'withdrawals');
    const wdSnap = await getDocs(wdCol);
    for (const d of wdSnap.docs) {
      const data = d.data() || {};
      if (data.userId === userId || (altUid && data.userId === altUid) || (userObj && userObj.name && (data.playerName === userObj.name || data.userName === userObj.name))) {
        try {
          await deleteDoc(doc(db, 'withdrawals', d.id));
          console.log(`[Firebase Admin] Deleted user withdrawal ${d.id}`);
        } catch (e) {}
      }
    }
  } catch (err) {}

  // 6. Broadcast cloud deletion across all open browser tabs
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({
      type: 'USER_DELETED_FROM_CLOUD',
      userId: userId,
      userName: userObj ? userObj.name : null,
      timestamp: Date.now()
    });
  } catch (e) {}

  console.log(`%c[Firebase Admin] Finished deleting user "${userId}" data from cloud.`, "color: #10b981; font-weight: bold;");
  return true;
}

/**
 * Save / Update user balance directly in Firebase Firestore from Admin
 */
async function saveUserBalanceToCloud(userId, coins, stars, status = 'active') {
  if (!db || !userId) return false;
  try {
    const userDocRef = doc(db, 'users', String(userId));
    await setDoc(userDocRef, {
      uid: String(userId),
      coins: parseInt(coins, 10) || 0,
      stars: parseInt(stars, 10) || 0,
      status: status || 'active',
      updatedAt: Date.now()
    }, { merge: true });
    console.log(`%c[Firebase Admin] Saved user ${userId} balance in cloud Firestore: ${coins} 🪙, ${stars} ⭐`, "color: #10b981; font-weight: bold;");

    // Also broadcast balance update across all open app tabs
    try {
      const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
      ch.postMessage({
        type: 'BALANCES_UPDATED',
        userId: userId,
        coins: parseInt(coins, 10) || 0,
        stars: parseInt(stars, 10) || 0,
        timestamp: Date.now()
      });
      ch.postMessage({
        type: 'COINS_UPDATED',
        coins: parseInt(coins, 10) || 0,
        stars: parseInt(stars, 10) || 0
      });
    } catch (e) {}

    return true;
  } catch (err) {
    console.warn(`[Firebase Admin] Error saving user ${userId} balance:`, err.message);
    return false;
  }
}

// Expose on Window object for global access across admin dashboard

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
      console.log("[Firebase Admin] Leaderboard sessions saved to cloud successfully!");
    }
  } catch (err) {
    console.warn("[Firebase Admin] Leaderboard sessions save note:", err.message);
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
          if (typeof window.renderEventsAndSessionsPage === 'function') {
            window.renderEventsAndSessionsPage();
          }
        }
      }
    }, (err) => {
      console.log("[Firebase Admin] Offline mode for leaderboard sessions listener.");
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
  config: firebaseConfig,
  saveTasksToCloud,
  listenToCloudTasks,
  deleteUserFromCloud,
  saveUserBalanceToCloud
};

window.saveTasksToCloud = saveTasksToCloud;
window.listenToCloudTasks = listenToCloudTasks;
window.saveUserBalanceToCloud = saveUserBalanceToCloud;
window.deleteUserFromCloud = deleteUserFromCloud;

window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAnalytics = analytics;

window.dispatchEvent(new CustomEvent('firebase:ready', {
  detail: { app, analytics, db }
}));

export { saveLeaderboardSessionsToCloud, listenToCloudLeaderboardSessions, app, analytics, db, firebaseConfig, saveTasksToCloud, listenToCloudTasks, deleteUserFromCloud, saveUserBalanceToCloud };
