const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const lines = s.split('\n');
console.log(lines.slice(4720, 4745).join('\n'));
