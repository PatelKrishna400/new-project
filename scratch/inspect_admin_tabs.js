const fs = require('fs');

console.log('=== frontend/page/profile/index.html ===');
const profileHtml = fs.readFileSync('frontend/page/profile/index.html', 'utf8');
profileHtml.split('\n').forEach((l, i) => {
  if (l.includes('admin-sub-nav') || l.includes('adminSub') || l.includes('admin-nav') || l.includes('admin-sub-view') || (l.includes('switchAdmin') && l.includes('onclick'))) {
    console.log(i + 1, l.trim());
  }
});

console.log('\n=== admin/page/home page/index.html ===');
const adminHtml = fs.readFileSync('admin/page/home page/index.html', 'utf8');
adminHtml.split('\n').forEach((l, i) => {
  if (l.includes('nav') || l.includes('tab') || l.includes('page') || l.includes('view') || l.includes('event')) {
    if (l.includes('class="') && (l.includes('nav') || l.includes('tab') || l.includes('btn'))) {
      console.log(i + 1, l.trim());
    }
  }
});
