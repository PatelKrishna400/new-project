const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/style.css', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(2650, 2710).join('\n'));
