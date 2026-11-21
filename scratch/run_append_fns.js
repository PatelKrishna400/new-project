const fs = require('fs');

const profileScriptPath = 'frontend/page/profile/script.js';
let s = fs.readFileSync(profileScriptPath, 'utf8');

if (!s.includes('function switchAdminEventTab')) {
  // Read codeToAppend from scratch
  const scratchContent = fs.readFileSync('scratch/append_profile_event_js.js', 'utf8');
  const startIdx = scratchContent.indexOf('const codeToAppend = `');
  const endIdx = scratchContent.lastIndexOf('`;');
  const code = scratchContent.slice(startIdx + 'const codeToAppend = `'.length, endIdx);
  
  s += '\n\n' + code;
  fs.writeFileSync(profileScriptPath, s, 'utf8');
  console.log('Appended function switchAdminEventTab and related controllers to profile/script.js!');
} else {
  console.log('Already has function switchAdminEventTab');
}
