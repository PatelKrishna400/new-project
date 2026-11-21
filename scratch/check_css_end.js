const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/style.css', 'utf8');
console.log('Last 200 chars of profile/style.css:');
console.log(s.slice(s.length - 200));
