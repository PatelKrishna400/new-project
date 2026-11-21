const fs = require('fs');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] !== undefined ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  get length() { return Object.keys(storage).length; },
  key: (i) => Object.keys(storage)[i] || null
};

// Mock BroadcastChannel
global.BroadcastChannel = class {
  constructor(name) { this.name = name; }
  postMessage(msg) {}
  close() {}
};

global.confirm = () => true;
global.window = global;
global.window.addEventListener = () => {};
global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};

// Read and run profile script
const profileCode = fs.readFileSync('frontend/page/profile/script.js', 'utf8');

// Isolate CANONICAL_BASIC_DEFAULT_TASKS and restore function
eval(profileCode);

console.log('Testing Restore & Renew All Tasks...');

// 1. Setup dirty player state
localStorage.setItem('task_game_completed_tasks', JSON.stringify({ task_coin_1: { completedAt: 100 }, task_pro_1: { completedAt: 200 } }));
localStorage.setItem('task_completed_tasks', JSON.stringify({ task_coin_1: true }));
localStorage.setItem('task_game_claims', JSON.stringify({ task_coin_1: 100 }));
localStorage.setItem('completed_tasks_count', '8');
localStorage.setItem('task_opened_task_coin_1', 'true');
localStorage.setItem('task_opened_task_star_2', 'true');
localStorage.setItem('task_game_tasks', '[]'); // deleted/wiped tasks

console.log('Before restore:');
console.log('- completed_tasks:', localStorage.getItem('task_game_completed_tasks'));
console.log('- tasks count in storage:', JSON.parse(localStorage.getItem('task_game_tasks')).length);
console.log('- completed_tasks_count:', localStorage.getItem('completed_tasks_count'));

// 2. Call restore
global.restoreAndRenewAllTasks();

console.log('After restore:');
const restoredTasks = JSON.parse(localStorage.getItem('task_game_tasks'));
const completedMap = JSON.parse(localStorage.getItem('task_game_completed_tasks'));
const completedCount = localStorage.getItem('completed_tasks_count');

console.log('- Restored tasks count:', restoredTasks.length);
console.log('- Completed tasks map:', JSON.stringify(completedMap));
console.log('- Completed count:', completedCount);
console.log('- Task opened keys remaining:', Object.keys(storage).filter(k => k.startsWith('task_opened_')).length);
console.log('- Task restore flag set:', localStorage.getItem('task_restore_flag') !== null);

const coinTasks = restoredTasks.filter(t => t.category === 'simple');
const starTasks = restoredTasks.filter(t => t.category === 'premium');
const proTasks = restoredTasks.filter(t => t.category === 'pro');

console.log(`- Coin Tasks: ${coinTasks.length} (Expected: 5)`);
console.log(`- Star Tasks: ${starTasks.length} (Expected: 3)`);
console.log(`- Pro Tasks: ${proTasks.length} (Expected: 3)`);

if (restoredTasks.length === 11 && Object.keys(completedMap).length === 0 && completedCount === '0') {
  console.log('\n>>> ALL RESTORE TESTS PASSED SUCCESSFULLY! <<<');
} else {
  console.error('\n>>> TEST FAILED! <<<');
  process.exit(1);
}
