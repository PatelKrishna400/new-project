const fs = require('fs');

const c = fs.readFileSync('frontend/page/leaderboard/index.html', 'utf8');
let pos = 0;
while ((pos = c.indexOf('TASK PASS', pos)) !== -1) {
  console.log('leaderboard TASK PASS at', pos);
  console.log(c.substring(Math.max(0, pos - 200), pos + 400));
  console.log('---------------------------------------------');
  pos += 10;
}
