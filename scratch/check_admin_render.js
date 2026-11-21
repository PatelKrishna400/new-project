const fs = require('fs');
const s = fs.readFileSync('admin/page/home page/script.js', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('function render') || l.includes('function load')) {
    console.log(i + 1, l.trim());
  }
});
