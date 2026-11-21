const fs = require('fs');
const s = fs.readFileSync('frontend/page/leaderboard/index.html', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('task_pass_') || l.includes('pass_') || l.includes('toggleActivatePass') || l.includes('currentLevel') || l.includes('500') || l.includes('Season 6')) {
    if (l.includes('localStorage') || l.includes('function ') || l.includes('let ') || l.includes('const ')) {
      console.log(i + 1, l.trim());
    }
  }
});
