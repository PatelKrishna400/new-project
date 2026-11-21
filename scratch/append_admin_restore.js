const fs = require('fs');

const profileScript = fs.readFileSync('frontend/page/profile/script.js', 'utf8');
const canonicalStart = profileScript.indexOf('const CANONICAL_BASIC_DEFAULT_TASKS = [');
const canonicalEnd = profileScript.indexOf('window.restoreAndRenewAllTasks = restoreAndRenewAllTasks;');
const codeToInsert = profileScript.slice(canonicalStart, canonicalEnd + 'window.restoreAndRenewAllTasks = restoreAndRenewAllTasks;'.length);

let adminScript = fs.readFileSync('admin/page/home page/script.js', 'utf8');
if (!adminScript.includes('CANONICAL_BASIC_DEFAULT_TASKS')) {
  adminScript += '\n\n' + codeToInsert + '\n';
  fs.writeFileSync('admin/page/home page/script.js', adminScript, 'utf8');
  console.log('Appended to admin/page/home page/script.js successfully!');
} else {
  console.log('Already contains CANONICAL_BASIC_DEFAULT_TASKS');
}
