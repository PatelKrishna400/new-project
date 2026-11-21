const fs = require('fs');
const s = fs.readFileSync('frontend/page/home/script.js', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('task_pro_') || l.includes('hubProTimer') || l.includes('proPackage') || l.includes('half price') || (l.includes('pro') && l.includes('timer'))) {
    console.log(i + 1, l.trim().slice(0, 100));
  }
});
