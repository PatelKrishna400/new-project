const fs = require('fs');
const s = fs.readFileSync('frontend/page/home/script.js', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(1340, 1440).join('\n'));
