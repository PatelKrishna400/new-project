const fs = require('fs');
const h = fs.readFileSync('admin/page/home page/index.html', 'utf8');
const lines = h.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('<button') || l.includes('class="btn')) {
    console.log(i + 1, l.trim());
  }
});
