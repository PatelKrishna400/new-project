const fs = require('fs');
const s = fs.readFileSync('admin/page/home page/script.js', 'utf8').split('\n');
console.log(s.slice(s.length - 50).join('\n'));
