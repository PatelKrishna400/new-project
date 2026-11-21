const fs = require('fs');
const s = fs.readFileSync('admin/page/home page/script.js', 'utf8').split('\n');
console.log(s.slice(0, 50).join('\n'));
