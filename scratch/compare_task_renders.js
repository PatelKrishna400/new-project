const fs = require('fs');

console.log('=== tasks/index.html renderTasks ===');
const tasksHtml = fs.readFileSync('frontend/page/tasks/index.html', 'utf8');
const startTasks = tasksHtml.indexOf('function renderTasks()');
console.log(tasksHtml.slice(startTasks, startTasks + 2000));

console.log('\n=== home/script.js renderTasks task card ===');
const homeScript = fs.readFileSync('frontend/page/home/script.js', 'utf8');
const cardStart = homeScript.indexOf('return `\n      <div class="task-card');
if (cardStart !== -1) {
  console.log(homeScript.slice(cardStart, cardStart + 1500));
} else {
  const cardStart2 = homeScript.indexOf('<div class="task-card');
  console.log(homeScript.slice(cardStart2, cardStart2 + 1500));
}
