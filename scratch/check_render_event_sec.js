const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(1885, 1950).join('\n'));
