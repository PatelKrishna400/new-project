const fs = require('fs');
const h = fs.readFileSync('admin/page/home page/index.html', 'utf8');
const lines = h.split('\n');
lines.forEach((l, i) => {
  if (l.includes('adminLiveEventStandingsTableBody') || l.includes('adminEventSeasonTitle')) {
    console.log(i + 1, l.trim());
  }
});
