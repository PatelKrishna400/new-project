const fs = require('fs');
const s = fs.readFileSync('frontend/page/home page/script.js', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(1345, 1370).join('\n'));
