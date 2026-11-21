const fs = require('fs');

function checkFile(f) {
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  let pos = 0;
  while ((pos = c.indexOf('taskPassLevelsStrip', pos)) !== -1) {
    console.log(f, 'found taskPassLevelsStrip at', pos);
    console.log(c.substring(Math.max(0, pos - 200), pos + 300));
    console.log('---------------------------------------------');
    pos += 20;
  }
}

['index.html', 'frontend/page/home/index.html', 'frontend/page/leaderboard/index.html'].forEach(checkFile);
