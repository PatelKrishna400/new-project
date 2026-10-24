const fs = require('fs');

const js = fs.readFileSync('frontend/page/sunflower/sunflower.js', 'utf8');
const html = fs.readFileSync('frontend/page/sunflower/index.html', 'utf8');

const regex = /onclick\s*=\s*["']([^"'\\]+)["']/gi;
let match;
const jsActions = new Set();
while ((match = regex.exec(js)) !== null) {
  jsActions.add(match[1]);
}

const htmlActions = new Set();
while ((match = regex.exec(html)) !== null) {
  htmlActions.add(match[1]);
}

console.log('--- JS Template Actions ---');
for (const a of jsActions) console.log(a);

console.log('--- HTML Actions ---');
for (const a of htmlActions) console.log(a);
