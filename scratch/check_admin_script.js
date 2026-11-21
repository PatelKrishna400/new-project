const fs = require('fs');
const s = fs.readFileSync('admin/page/home page/script.js', 'utf8');
const lines = s.split('\n');
console.log('admin script line count:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('task_game_tasks') || l.includes('admin_tasks') || l.includes('resetPlayerCooldowns') || l.includes('renderAdminTasksList') || l.includes('renderTasks') || l.includes('restoreAndRenewAllTasks')) {
    console.log(i + 1, l.trim().slice(0, 100));
  }
});
