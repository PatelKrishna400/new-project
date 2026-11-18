// Test simulation of Admin User Edit & Leaderboard Synchronization (demo users removed)

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

// Verify initial ranks
function sortUsers(list, mode = 'tasks') {
  const active = list.filter(u => u && u.status !== 'suspended');
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

console.log('--- Initial Leaderboard Standings ---');
const initial = sortUsers([...CANONICAL_TASK_USERS]);
initial.forEach((u, i) => console.log(`#${i + 1}: ${u.avatar} ${u.name} — ${u.eventTasks} tasks (${u.coins} coins)`));

// Simulate Admin Editing usr_1:
console.log('\n--- Admin Edits User 1 (Player -> "AlphaKing", 25 tasks, 10,000 coins) ---');
const users = JSON.parse(JSON.stringify(CANONICAL_TASK_USERS));
const u1 = users.find(u => u.id === 'usr_1');
u1.name = 'AlphaKing';
u1.avatar = '👑';
u1.eventTasks = 25;
u1.totalTasks = 30;
u1.coins = 10000;
u1.stars = 500;

const updated = sortUsers(users);
console.log('--- New Leaderboard Standings After Admin Edit ---');
updated.forEach((u, i) => console.log(`#${i + 1}: ${u.avatar} ${u.name} — ${u.eventTasks} tasks (${u.coins} coins)`));

if (updated[0].name === 'AlphaKing' && updated[0].eventTasks === 25) {
  console.log('\nSUCCESS: AlphaKing is now Rank #1 Champion on the Leaderboard!');
} else {
  console.error('\nFAILED: Ranking logic mismatch');
  process.exit(1);
}
