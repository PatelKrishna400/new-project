const fs = require('fs');
const s = fs.readFileSync('frontend/page/tasks/index.html', 'utf8');
console.log('tasks/index.html 1500 to 3000 chars:');
console.log(s.slice(1500, 3000));
