const fs = require('fs');

const c = fs.readFileSync('index.html', 'utf8');
let pos = 0;
while ((pos = c.indexOf('task-pass-widget-wrap', pos)) !== -1) {
  console.log('index.html task-pass-widget-wrap at', pos);
  console.log(c.substring(Math.max(0, pos - 100), pos + 800));
  console.log('---------------------------------------------');
  pos += 25;
}
