// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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
} catch (e) {
  console.error("[Firebase Admin] Initialization error:", e);
}

const TASKS_STORAGE_KEY = 'task_game_tasks';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

/**
 * Save tasks to Firestore cloud (system/tasks)
 */
async function saveTasksToCloud(tasks) {
  if (!db) return false;
  try {
    const tasksRef = doc(db, 'system', 'tasks_config');
    await setDoc(tasksRef, {
      tasks: tasks,
      updatedAt: Date.now()
    }, { merge: true });
    console.log("[Firebase Admin] Tasks saved to cloud Firestore successfully!");
    return true;
  } catch (err) {
    console.warn("[Firebase Admin] Cloud save note:", err.message);
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
    return onSnapshot(tasksRef, (snapshot) => {
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
    }, () => {});
  } catch (e) {
    return null;
  }
}

// Expose on Window object for global access across admin dashboard
window.Firebase = {
  app,
  analytics,
  db,
  config: firebaseConfig,
  saveTasksToCloud,
  listenToCloudTasks
};

window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAnalytics = analytics;

window.dispatchEvent(new CustomEvent('firebase:ready', {
  detail: { app, analytics, db }
}));

export { app, analytics, db, firebaseConfig, saveTasksToCloud, listenToCloudTasks };
