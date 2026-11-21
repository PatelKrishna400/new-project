const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '.git', '.gemini', 'scratch'].includes(e.name)) searchDir(full);
    } else if (/\.(html|js)$/.test(e.name)) {
      const c = fs.readFileSync(full, 'utf8');
      ['user_tickets', 'task_user_tickets'].forEach(k => {
        let idx = 0;
        while ((idx = c.indexOf(k, idx)) !== -1) {
          const snippet = c.substring(Math.max(0, idx - 60), idx + 100).replace(/\r?\n/g, ' ');
          console.log(full, ':', snippet);
          idx += k.length + 10;
        }
      });
    }
  }
}

searchDir('.');
