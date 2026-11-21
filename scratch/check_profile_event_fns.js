const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('adminSubEvent') || l.includes('renderAdminEvent') || l.includes('adminEvent') || l.includes('Session') || l.includes('renderEvent')) {
    if (l.includes('function ') || l.includes('const ') || l.includes('let ')) {
      console.log(i + 1, l.trim());
    }
  }
});
