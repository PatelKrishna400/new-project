const fs = require('fs');
const s = fs.readFileSync('frontend/page/tasks/index.html', 'utf8');
console.log('tasks/index.html first 1500 chars:');
console.log(s.slice(0, 1500));
