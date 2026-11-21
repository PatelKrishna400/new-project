const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const start = s.indexOf('if (menuBtns[key]) {');
console.log(s.slice(start, start + 800));
