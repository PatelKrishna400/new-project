const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const start = s.indexOf('CANONICAL_BASIC_DEFAULT_TASKS');
console.log(s.slice(start, start + 2500));
