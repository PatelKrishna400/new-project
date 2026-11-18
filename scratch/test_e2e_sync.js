const fs = require('fs');
const path = require('path');

// Mock localStorage and BroadcastChannel for Node environment
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();

const CANONICAL_TASK_USERS = [
  { id: 'usr_1', name: 'Player', avatar: '⚡', level: 'LVL 1 • NOVICE', coins: 0, stars: 0, totalTasks: 0, eventTasks: 0, status: 'active', role: 'player', email: 'player@novatasks.io', username: '@player', joined: 'Today' }
];

const DEMO_USER_IDS = ['usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6'];
const DEMO_USER_NAMES = ['User 2', 'CyberHunter', 'NeonBlaze', 'ShadowNova', 'PixelMaster'];

function isDemoUser(u) {
  if (!u) return true;
  if (DEMO_USER_IDS.includes(u.id)) return true;
  if (DEMO_USER_NAMES.includes(u.name)) return true;
  return false;
}

console.log('--- TEST 1: Initial State (Demo Users Removed) ---');
localStorage.setItem('task_game_users', JSON.stringify(CANONICAL_TASK_USERS));
let loadedUsers = JSON.parse(localStorage.getItem('task_game_users')).filter(u => !isDemoUser(u));
console.log(`Loaded ${loadedUsers.length} real user in storage.`);
if (loadedUsers.length !== 1) throw new Error('Expected 1 real user');

console.log('\n--- TEST 2: Leaderboard Ranking Function ---');
function rankUsers(users, mode = 'tasks') {
  const active = users.filter(u => u && u.status !== 'suspended' && !isDemoUser(u));
  if (mode === 'coins') {
    return active.sort((a, b) => (b.coins || 0) - (a.coins || 0));
  } else if (mode === 'name') {
    return active.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else {
    return active.sort((a, b) => {
      const diff = (b.eventTasks || 0) - (a.eventTasks || 0);
      if (diff !== 0) return diff;
      return (b.coins || 0) - (a.coins || 0);
    });
  }
}

let initialRanked = rankUsers([...loadedUsers]);
console.log('Top Champion:');
console.log(`🥇 #1: ${initialRanked[0].name} (${initialRanked[0].eventTasks} tasks)`);
if (initialRanked[0].name !== 'Player' || initialRanked[0].eventTasks !== 0) {
  throw new Error('Expected Player at #1');
}

console.log('\n--- TEST 3: Admin Edits User 1 ---');
// Admin edits usr_1 (name -> AlphaLegend, avatar -> 👑, tasks -> 35, coins -> 15000)
const u1 = loadedUsers.find(u => u.id === 'usr_1');
u1.name = 'AlphaLegend';
u1.avatar = '👑';
u1.eventTasks = 35;
u1.totalTasks = 40;
u1.coins = 15000;
u1.stars = 300;
localStorage.setItem('task_game_users', JSON.stringify(loadedUsers));

// Leaderboard re-reads storage:
const usersAfterAdminEdit = JSON.parse(localStorage.getItem('task_game_users'));
const rankedAfterEdit = rankUsers([...usersAfterAdminEdit]);
console.log('Top Champion After Admin Edit:');
console.log(`🥇 #1: ${rankedAfterEdit[0].name} (${rankedAfterEdit[0].eventTasks} tasks, ${rankedAfterEdit[0].coins} coins)`);
if (rankedAfterEdit[0].name !== 'AlphaLegend' || rankedAfterEdit[0].eventTasks !== 35) {
  throw new Error('Expected AlphaLegend to take #1 rank');
}

console.log('\n--- TEST 4: Admin Adds New Contender ---');
const newUser = {
  id: 'usr_new_99',
  name: 'VortexMaster',
  avatar: '🌀',
  level: 'LVL 5 • TASK MASTER',
  coins: 20000,
  stars: 500,
  eventTasks: 50,
  totalTasks: 60,
  status: 'active'
};
usersAfterAdminEdit.push(newUser);
localStorage.setItem('task_game_users', JSON.stringify(usersAfterAdminEdit));

const usersAfterAdd = JSON.parse(localStorage.getItem('task_game_users'));
const rankedAfterAdd = rankUsers([...usersAfterAdd]);
console.log(`Total users: ${usersAfterAdd.length}`);
console.log(`🥇 #1: ${rankedAfterAdd[0].name} (${rankedAfterAdd[0].eventTasks} tasks)`);
console.log(`🥈 #2: ${rankedAfterAdd[1].name} (${rankedAfterAdd[1].eventTasks} tasks)`);
if (rankedAfterAdd[0].name !== 'VortexMaster' || rankedAfterAdd[0].eventTasks !== 50) {
  throw new Error('Expected VortexMaster at #1');
}

console.log('\n--- TEST 5: Admin Deletes Contender ---');
const usersAfterDelete = usersAfterAdd.filter(u => u.id !== 'usr_new_99');
localStorage.setItem('task_game_users', JSON.stringify(usersAfterDelete));
const rankedAfterDelete = rankUsers([...usersAfterDelete]);
console.log(`Total users after delete: ${usersAfterDelete.length}`);
console.log(`🥇 #1: ${rankedAfterDelete[0].name} (${rankedAfterDelete[0].eventTasks} tasks)`);
if (rankedAfterDelete[0].name !== 'AlphaLegend') {
  throw new Error('Expected AlphaLegend back at #1');
}

console.log('\n=========================================');
console.log('ALL E2E ADMIN-LEADERBOARD SYNC TESTS PASSED!');
console.log('=========================================');
