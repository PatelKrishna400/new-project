const fs = require('fs');

const c = fs.readFileSync('index.html', 'utf8');
let pos = 0;
while ((pos = c.indexOf('class="forge-card"', pos)) !== -1) {
  console.log('index.html class="forge-card" at', pos);
  console.log(c.substring(pos, pos + 1200));
  console.log('---------------------------------------------');
  pos += 20;
}
