const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const start = s.indexOf('function switchAdminSubView');
console.log(s.slice(start, start + 1200));
