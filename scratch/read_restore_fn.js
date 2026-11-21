const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const start = s.indexOf('function restoreAndRenewAllTasks()');
console.log(s.slice(start, start + 2500));
