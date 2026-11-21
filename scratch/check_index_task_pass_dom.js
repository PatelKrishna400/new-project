const fs = require('fs');

const c = fs.readFileSync('index.html', 'utf8');
let pos = 0;
while ((pos = c.indexOf('taskPass', pos)) !== -1) {
  // Check if it's in HTML (not script)
  const isScript = c.lastIndexOf('<script', pos) > c.lastIndexOf('</script>', pos);
  console.log('pos', pos, 'isScript:', isScript);
  if (!isScript) {
    console.log(c.substring(Math.max(0, pos - 100), pos + 300));
  }
  pos += 10;
}
