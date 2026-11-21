const fs = require('fs');
const s = fs.readFileSync('frontend/page/profile/style.css', 'utf8');
const lines = s.split('\n');
console.log('Total lines in profile/style.css:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('admin-sub-') || l.includes('admin-event-') || l.includes('btn-admin-action-restore')) {
    console.log(i + 1, l.trim());
  }
});
