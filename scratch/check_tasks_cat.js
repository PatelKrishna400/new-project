const fs = require('fs');
const s = fs.readFileSync('frontend/page/tasks/index.html', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('category') || l.includes('pro') || l.includes('banner')) {
    if (l.includes('const ') || l.includes('function ') || l.includes('if ') || l.includes('let ')) {
      console.log(i + 1, l.trim());
    }
  }
});
