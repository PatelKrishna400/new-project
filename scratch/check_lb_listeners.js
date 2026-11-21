const fs = require('fs');
const s = fs.readFileSync('frontend/page/leaderboard/index.html', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('addEventListener') || l.includes('BroadcastChannel')) {
    console.log(i + 1, l.trim());
  }
});
