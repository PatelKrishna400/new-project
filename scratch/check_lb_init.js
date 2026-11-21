const fs = require('fs');
const s = fs.readFileSync('frontend/page/leaderboard/index.html', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(595, 630).join('\n'));
