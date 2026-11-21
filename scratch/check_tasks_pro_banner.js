const fs = require('fs');
const s = fs.readFileSync('frontend/page/tasks/index.html', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(265, 305).join('\n'));
