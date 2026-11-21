const fs = require('fs');
const profileScript = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const lines = profileScript.split('\n');
console.log(lines.slice(484, 555).join('\n'));
