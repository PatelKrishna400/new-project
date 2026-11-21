const fs = require('fs');
const h = fs.readFileSync('admin/page/home page/index.html', 'utf8');
const lines = h.split('\n');
lines.forEach((l, i) => {
  if (l.includes('<section') || l.includes('id="view') || l.includes('id="page') || l.includes('Task') || l.includes('tasks')) {
    if (l.includes('button') || l.includes('nav') || l.includes('header') || l.includes('toolbar')) {
      console.log(i + 1, l.trim());
    }
  }
});
