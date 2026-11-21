const fs = require('fs');

console.log('Testing Admin Task Category & Event Page Tabs...');

// 1. Check HTML Category Options
const profileHtml = fs.readFileSync('frontend/page/profile/index.html', 'utf8');
const adminHtml = fs.readFileSync('admin/page/home page/index.html', 'utf8');

const profileCatBlock = profileHtml.slice(profileHtml.indexOf('id="taskInputCategory"'), profileHtml.indexOf('</select>', profileHtml.indexOf('id="taskInputCategory"')));
console.log('Profile Task Category Select:');
console.log(profileCatBlock);

const adminCatBlock = adminHtml.slice(adminHtml.indexOf('id="taskCategorySelect"'), adminHtml.indexOf('</select>', adminHtml.indexOf('id="taskCategorySelect"')));
console.log('\nAdmin Task Category Select:');
console.log(adminCatBlock);

if (profileCatBlock.includes('value="simple"') && profileCatBlock.includes('value="premium"') && !profileCatBlock.includes('value="pro"') && !profileCatBlock.includes('value="event"')) {
  console.log('✓ Profile task category only shows Simple Task and Premium Task!');
} else {
  console.error('FAIL: Profile task category contains extra options');
  process.exit(1);
}

if (adminCatBlock.includes('value="simple"') && adminCatBlock.includes('value="premium"') && !adminCatBlock.includes('value="pro"') && !adminCatBlock.includes('value="event"')) {
  console.log('✓ Admin task category only shows Simple Task and Premium Task!');
} else {
  console.error('FAIL: Admin task category contains extra options');
  process.exit(1);
}

// 2. Check Event Page Tabs & Panels
const hasProTab = profileHtml.includes('id="btnEventTabPro"');
const hasPassTab = profileHtml.includes('id="btnEventTabPass"');
const hasSeasonTab = profileHtml.includes('id="btnEventTabSeason"');

const hasProPanel = profileHtml.includes('id="adminEventPanelPro"');
const hasPassPanel = profileHtml.includes('id="adminEventPanelPass"');
const hasSeasonPanel = profileHtml.includes('id="adminEventPanelSeason"');

const hasProModal = profileHtml.includes('id="adminProTaskEditModalOverlay"');
const hasPassModal = profileHtml.includes('id="adminPassEditModalOverlay"');

console.log(`Tabs found: Pro=${hasProTab}, Pass=${hasPassTab}, Season=${hasSeasonTab}`);
console.log(`Panels found: Pro=${hasProPanel}, Pass=${hasPassPanel}, Season=${hasSeasonPanel}`);
console.log(`Modals found: Pro=${hasProModal}, Pass=${hasPassModal}`);

if (!hasProTab || !hasPassTab || !hasProPanel || !hasPassPanel || !hasProModal || !hasPassModal) {
  console.error('FAIL: Missing Event tabs, panels or modals');
  process.exit(1);
}

console.log('\n>>> ALL TEST VERIFICATIONS PASSED SUCCESSFULLY! <<<');
