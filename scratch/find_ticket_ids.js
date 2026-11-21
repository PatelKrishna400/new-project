const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '.git', '.gemini', 'scratch'].includes(e.name)) searchDir(full);
    } else if (/\.html$/.test(e.name)) {
      const c = fs.readFileSync(full, 'utf8');
      const matches = c.match(/id=['"][^'"]*ticket[^'"]*['"]/gi);
      if (matches) {
        console.log(full, ':', matches);
      }
    }
  }
}

searchDir('.');
