const fs = require('fs');
const s = fs.readFileSync('frontend/page/leaderboard/index.html', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(1098, 1125).join('\n'));
