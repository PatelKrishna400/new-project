const fs = require('fs');
const path = require('path');

const files = [
  'frontend/page/home/index.html',
  'frontend/page/home page/index.html',
  'index.html',
  'frontend/page/leaderboard/index.html',
  'frontend/page/profile/index.html',
  'frontend/page/shop/index.html',
  'frontend/page/shopping/index.html',
  'frontend/page/wallet/index.html',
  'frontend/page/help/index.html',
  'frontend/page/pandemic/index.html',
  'admin/index.html',
  'admin/page/home page/index.html'
];

let allOk = true;
files.forEach(f => {
  if (!fs.existsSync(f)) {
    console.log(`MISSING: ${f}`);
    return;
  }
  const content = fs.readFileSync(f, 'utf8');
  const opens = (content.match(/<div(\s|>)/gi) || []).length;
  const closes = (content.match(/<\/div>/gi) || []).length;
  const ok = opens === closes;
  if (!ok) allOk = false;
  console.log(`${ok ? 'OK' : 'MISMATCH'} [opens=${opens}, closes=${closes}, diff=${opens - closes}] : ${f}`);
});

console.log(allOk ? '\nALL HTML FILES BALANCED!' : '\nTAG BALANCE ERRORS FOUND!');
