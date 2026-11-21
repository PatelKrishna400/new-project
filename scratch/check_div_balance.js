const fs = require('fs');

const files = [
  'frontend/page/profile/index.html',
  'frontend/page/home/index.html',
  'frontend/page/home page/index.html',
  'index.html',
  'frontend/page/tasks/index.html',
  'frontend/page/leaderboard/index.html'
];

files.forEach(f => {
  if (!fs.existsSync(f)) {
    console.log(f, 'NOT FOUND');
    return;
  }
  const html = fs.readFileSync(f, 'utf8');
  const openDivs = (html.match(/<div(\s|>)/gi) || []).length;
  const closeDivs = (html.match(/<\/div>/gi) || []).length;
  const diff = openDivs - closeDivs;
  console.log(`${f}: open=${openDivs}, close=${closeDivs}, diff=${diff}`);
});
