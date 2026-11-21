const fs = require('fs');

const c = fs.readFileSync('frontend/page/leaderboard/index.html', 'utf8');
const lines = c.split('\n');
console.log(lines.slice(240, 360).join('\n'));
