const fs = require('fs');
const s = fs.readFileSync('frontend/page/home/script.js', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('task_pass_') || l.includes('updateTaskPassUI')) {
    if (l.includes('function ') || l.includes('localStorage') || l.includes('const ') || l.includes('let ')) {
      console.log(i + 1, l.trim());
    }
  }
});
