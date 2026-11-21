const fs = require('fs');
const profileScript = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const lines = profileScript.split('\n');
console.log('Total lines in profile/script.js:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('adminSubEvent') || l.includes('switchAdminSubView') || l.includes('handleAdminTaskCategoryChange') || l.includes('renderAdminTasksList')) {
    console.log(i + 1, l.trim());
  }
});
