const fs = require('fs');
const profileHtml = fs.readFileSync('frontend/page/profile/index.html', 'utf8');
const lines = profileHtml.split('\n');
console.log(lines.slice(375, 425).join('\n'));
