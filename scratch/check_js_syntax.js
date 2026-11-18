const { execSync } = require('child_process');
const fs = require('fs');

const jsFiles = [
  'frontend/page/home/script.js',
  'frontend/page/home page/script.js',
  'frontend/page/leaderboard/script.js',
  'frontend/page/profile/script.js',
  'frontend/page/shop/script.js',
  'frontend/page/shopping/script.js',
  'frontend/page/wallet/script.js',
  'frontend/page/help/script.js',
  'frontend/page/pandemic/script.js',
  'admin/page/home page/script.js',
  'frontend/ad-service.js',
  'frontend/daily-streak.js',
  'frontend/telegram-stars.js'
];

let allOk = true;
jsFiles.forEach(file => {
  try {
    execSync(`node --check "${file}"`);
    console.log(`OK : ${file}`);
  } catch (err) {
    allOk = false;
    console.error(`SYNTAX ERROR : ${file}`);
  }
});

console.log(allOk ? '\nALL JS FILES PASS SYNTAX CHECK!' : '\nSYNTAX ERRORS FOUND!');
