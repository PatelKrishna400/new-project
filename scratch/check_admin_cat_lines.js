const fs = require('fs');
const h = fs.readFileSync('admin/page/home page/index.html', 'utf8');
const lines = h.split('\n');
console.log(lines.slice(50, 62).join('\n'));
