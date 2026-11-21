const fs = require('fs');
const profileHtml = fs.readFileSync('frontend/page/profile/index.html', 'utf8');
const lines = profileHtml.split('\n');
lines.forEach((l, i) => {
  if (l.includes('taskCategorySelect') || l.includes('taskCategory') || l.includes('openCreateTaskModal') || l.includes('taskModal')) {
    console.log(i + 1, l.trim());
  }
});
