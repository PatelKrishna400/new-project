const fs = require('fs');
const s = fs.readFileSync('admin/page/home page/script.js', 'utf8');
const start = s.indexOf('function renderEventsAndSessionsPage()');
console.log(s.slice(start, start + 1200));
