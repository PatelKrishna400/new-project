const fs = require('fs');
const profileHtml = fs.readFileSync('frontend/page/profile/index.html', 'utf8');
const lines = profileHtml.split('\n');
console.log(lines.slice(1590, 1625).join('\n'));
