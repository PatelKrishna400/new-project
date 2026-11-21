const fs = require('fs');
const profileScriptPath = 'frontend/page/profile/script.js';
let s = fs.readFileSync(profileScriptPath, 'utf8');

// Replace all \` with ` and \${ with ${ in the appended section
const marker = '// ============================================================================\n// ADMIN EVENT PAGE: PRO TASKS & PASS MULTI-TAB CONTROLLER (DETAIL & EDIT)';
const idx = s.indexOf(marker);
if (idx !== -1) {
  const head = s.slice(0, idx);
  let tail = s.slice(idx);
  tail = tail.replace(/\\`/g, '`');
  tail = tail.replace(/\\\${/g, '${');
  s = head + tail;
  fs.writeFileSync(profileScriptPath, s, 'utf8');
  console.log('Fixed backslashes in profile/script.js');
}
