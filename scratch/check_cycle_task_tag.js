const fs = require('fs');

const c = fs.readFileSync('index.html', 'utf8');
let pos = 0;
while ((pos = c.indexOf('cycleTaskTag', pos)) !== -1) {
  console.log('index.html cycleTaskTag at', pos);
  console.log(c.substring(Math.max(0, pos - 150), pos + 400));
  console.log('---------------------------------------------');
  pos += 15;
}
