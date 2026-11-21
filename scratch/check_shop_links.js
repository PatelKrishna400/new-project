const fs = require('fs');

const files = [
  'frontend/page/home/index.html',
  'frontend/page/home page/index.html',
  'index.html',
  'frontend/page/tasks/index.html',
  'frontend/page/profile/index.html',
  'frontend/page/wallet/index.html'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    ['shop', 'shopping'].forEach(p => {
      if (c.includes(p + '/index.html') || c.includes('/' + p + '/') || c.includes('page/' + p)) {
        console.log(f, 'links to:', p);
      }
    });
  }
});
