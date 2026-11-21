const fs = require('fs');
const s = fs.readFileSync('frontend/page/home/script.js', 'utf8');
const start = s.indexOf('function openTaskCategoryPage');
console.log(s.slice(start, start + 1200));
