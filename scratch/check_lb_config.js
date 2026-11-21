const fs = require('fs');
const s = fs.readFileSync('frontend/page/leaderboard/index.html', 'utf8');
console.log('leaderboard config matches:');
s.split('\n').forEach((l, i) => {
  if (l.includes('task_pass_config') || l.includes('Season 6') || l.includes('MAX_TIERS')) {
    console.log(i + 1, l.trim());
  }
});
