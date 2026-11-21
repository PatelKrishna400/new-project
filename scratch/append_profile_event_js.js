const fs = require('fs');

const profileScriptPath = 'frontend/page/profile/script.js';
let s = fs.readFileSync(profileScriptPath, 'utf8');

// 1. Update renderCurrentAdminSubView to call switchAdminEventTab when view is event
const oldRenderSubView = "if (currentAdminSubView === 'tasks') renderAdminTasksList();\n  else if (currentAdminSubView === 'users') renderAdminUsersList();\n  else if (currentAdminSubView === 'withdraw') renderAdminWithdrawalsList();\n  else if (currentAdminSubView === 'event') renderAdminEventSection();";

const newRenderSubView = "if (currentAdminSubView === 'tasks') renderAdminTasksList();\n  else if (currentAdminSubView === 'users') renderAdminUsersList();\n  else if (currentAdminSubView === 'withdraw') renderAdminWithdrawalsList();\n  else if (currentAdminSubView === 'event') switchAdminEventTab(currentAdminEventTab || 'pro');";

if (s.includes(oldRenderSubView)) {
  s = s.replace(oldRenderSubView, newRenderSubView);
  console.log('Updated renderCurrentAdminSubView in profile/script.js');
} else {
  console.log('oldRenderSubView target not matched, will check alternative');
}

// 2. Prepare code to append
const codeToAppend = `
// ============================================================================
// ADMIN EVENT PAGE: PRO TASKS & PASS MULTI-TAB CONTROLLER (DETAIL & EDIT)
// ============================================================================

let currentAdminEventTab = 'pro';

const PRO_EVENT_SETTINGS_KEY = 'task_game_pro_event_settings';
const PASS_CONFIG_STORAGE_KEY = 'task_pass_config';

function getStoredProEventSettings() {
  try {
    const raw = localStorage.getItem(PRO_EVENT_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return {
    active: true,
    durationHours: 48,
    packageCoinCost: 50,
    packageTicketCost: 2,
    startTime: Date.now() - 3600000,
    endTime: Date.now() + 48 * 3600000,
    tasks: [
      {
        id: "task_pro_1",
        title: "Mission 1: Promo Signup",
        category: "pro",
        rewardCoins: 500,
        reward: 500,
        coins: 500,
        url: "https://youtube.com",
        link: "https://youtube.com",
        verificationCode: "583921",
        code: "583921",
        secretCode: "583921",
        description: "First mission of 3-task package (Half price awarded here!)",
        isPackagePart: true,
        packagePartIndex: 1,
        active: true
      },
      {
        id: "task_pro_2",
        title: "Mission 2: Community Join",
        category: "pro",
        rewardCoins: 250,
        reward: 250,
        coins: 250,
        url: "https://telegram.org",
        link: "https://telegram.org",
        verificationCode: "749201",
        code: "749201",
        secretCode: "749201",
        description: "Second mission of 3-task package",
        isPackagePart: true,
        packagePartIndex: 2,
        active: true
      },
      {
        id: "task_pro_3",
        title: "Mission 3: Survey Bonus",
        category: "pro",
        rewardCoins: 250,
        reward: 250,
        coins: 250,
        url: "https://google.com",
        link: "https://google.com",
        verificationCode: "382910",
        code: "382910",
        secretCode: "382910",
        description: "Third mission of 3-task package (Full package completion bounty!)",
        isPackagePart: true,
        packagePartIndex: 3,
        active: true
      }
    ]
  };
}

function saveProEventSettings(settings) {
  try {
    localStorage.setItem(PRO_EVENT_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());

    if (settings.tasks && Array.isArray(settings.tasks)) {
      settings.tasks.forEach(pt => {
        const idx = tasksData.findIndex(t => t.id === pt.id);
        if (idx !== -1) {
          tasksData[idx] = { ...tasksData[idx], ...pt };
        } else {
          tasksData.push(pt);
        }
      });
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
      localStorage.setItem('admin_tasks', JSON.stringify(tasksData));
    }

    try {
      const bc = new BroadcastChannel('nova_task_sync');
      bc.postMessage({ type: 'PRO_EVENT_UPDATED', settings, timestamp: Date.now() });
      bc.postMessage({ type: 'TASKS_UPDATED', timestamp: Date.now() });
      bc.close();
    } catch(e) {}
  } catch(e) {
    console.error('Error saving pro event settings:', e);
  }
}

function getStoredPassConfig() {
  try {
    const raw = localStorage.getItem(PASS_CONFIG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {
    seasonName: "Season 6: Light the Fuse",
    durationDays: 21,
    totalLevels: 500,
    tasksPerLevel: 1,
    milestoneLevel: 10,
    milestoneRewardType: "stars",
    milestoneRewardAmount: 100,
    passActivated: localStorage.getItem("season_6_pass_activated") === "true" || true
  };
}

function savePassConfig(config) {
  try {
    localStorage.setItem(PASS_CONFIG_STORAGE_KEY, JSON.stringify(config));
    if (config.passActivated !== undefined) {
      localStorage.setItem("season_6_pass_activated", config.passActivated ? "true" : "false");
    }
    localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
    try {
      const bc = new BroadcastChannel('nova_task_sync');
      bc.postMessage({ type: 'PASS_CONFIG_UPDATED', config, timestamp: Date.now() });
      bc.close();
    } catch(e) {}
  } catch(e) {
    console.error('Error saving pass config:', e);
  }
}

function switchAdminEventTab(tabKey) {
  currentAdminEventTab = tabKey || 'pro';

  const btnPro = document.getElementById('btnEventTabPro');
  const btnPass = document.getElementById('btnEventTabPass');
  const btnSeason = document.getElementById('btnEventTabSeason');

  const panelPro = document.getElementById('adminEventPanelPro');
  const panelPass = document.getElementById('adminEventPanelPass');
  const panelSeason = document.getElementById('adminEventPanelSeason');

  if (btnPro) btnPro.classList.toggle('active', currentAdminEventTab === 'pro');
  if (btnPass) btnPass.classList.toggle('active', currentAdminEventTab === 'pass');
  if (btnSeason) btnSeason.classList.toggle('active', currentAdminEventTab === 'season');

  if (panelPro) panelPro.style.display = (currentAdminEventTab === 'pro') ? 'flex' : 'none';
  if (panelPass) panelPass.style.display = (currentAdminEventTab === 'pass') ? 'flex' : 'none';
  if (panelSeason) panelSeason.style.display = (currentAdminEventTab === 'season') ? 'block' : 'none';

  if (currentAdminEventTab === 'pro') {
    renderAdminProTasksPanel();
  } else if (currentAdminEventTab === 'pass') {
    renderAdminPassPanel();
  } else if (currentAdminEventTab === 'season') {
    renderAdminEventSection();
  }
}

function renderAdminProTasksPanel() {
  const settings = getStoredProEventSettings();
  
  const badge = document.getElementById('proEventStatusBadge');
  const toggleBtn = document.getElementById('labelToggleProEvent');
  if (badge) {
    if (settings.active) {
      badge.textContent = '● EVENT ACTIVE';
      badge.style.background = 'rgba(16, 185, 129, 0.2)';
      badge.style.color = '#34d399';
      badge.style.borderColor = 'rgba(52, 211, 153, 0.5)';
      if (toggleBtn) toggleBtn.textContent = 'Turn Off ⏸️';
    } else {
      badge.textContent = '○ EVENT OFF';
      badge.style.background = 'rgba(239, 68, 68, 0.2)';
      badge.style.color = '#f87171';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      if (toggleBtn) toggleBtn.textContent = 'Turn On ▶️';
    }
  }

  const timerEl = document.getElementById('proDetailTimerText');
  if (timerEl) timerEl.textContent = \`⏱️ \${settings.durationHours || 48}H 00M\`;

  const costEl = document.getElementById('proDetailCostText');
  if (costEl) costEl.textContent = \`🪙 \${settings.packageCoinCost || 50} + 🎟️ \${settings.packageTicketCost || 2}\`;

  const tasks = settings.tasks || [];
  const t1 = tasks[0] || { title: 'Mission 1: Promo Signup', rewardCoins: 500, url: 'https://youtube.com', verificationCode: '583921' };
  const t2 = tasks[1] || { title: 'Mission 2: Community Join', rewardCoins: 250, url: 'https://telegram.org', verificationCode: '749201' };
  const t3 = tasks[2] || { title: 'Mission 3: Survey Bonus', rewardCoins: 250, url: 'https://google.com', verificationCode: '382910' };

  const totalBounty = (Number(t1.rewardCoins || t1.reward || 500)) + 
                      (Number(t2.rewardCoins || t2.reward || 250)) + 
                      (Number(t3.rewardCoins || t3.reward || 250));

  const bountyEl = document.getElementById('proDetailBountyText');
  if (bountyEl) bountyEl.textContent = \`🪙 \${totalBounty.toLocaleString()}\`;

  const listContainer = document.getElementById('proTasksDetailList');
  if (listContainer) {
    listContainer.innerHTML = \`
      <!-- Sub-Task 1 Card -->
      <div class="pro-subtask-card" style="border-left: 4px solid #facc15;">
        <div class="pro-subtask-info">
          <div class="pro-subtask-title-row">
            <span class="pro-subtask-badge half-bounty">🎁 1 of 3 • Half Price Award (50%)</span>
            <span style="font-weight: 800; color: #ffffff; font-size: 0.88rem;">\${escapeHtml(t1.title)}</span>
          </div>
          <div style="font-size: 0.72rem; color: #94a3b8; display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
            <span>Reward: <b style="color: #fbbf24; font-size: 0.82rem;">🪙 \${t1.rewardCoins || t1.reward || 500} Coins</b> (Wins 50% = 500 Coins on this task!)</span>
            <span>&bull;</span>
            <span>Secret Code: <b style="color: #facc15; font-family: monospace;">\${t1.verificationCode || t1.code || '583921'}</b></span>
          </div>
          <div style="font-size: 0.7rem; color: #38bdf8; margin-top: 3px; word-break: break-all;">
            Target URL: <a href="\${t1.url || t1.link || '#'}" target="_blank" style="color: #38bdf8; text-decoration: underline;">\${t1.url || t1.link || 'https://youtube.com'}</a>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.7rem; color: #7dd3fc; font-weight: 800;">
            Task #1
          </span>
        </div>
      </div>

      <!-- Sub-Task 2 Card -->
      <div class="pro-subtask-card" style="border-left: 4px solid #34d399;">
        <div class="pro-subtask-info">
          <div class="pro-subtask-title-row">
            <span class="pro-subtask-badge">⚡ 2 of 3 • Mid Mission</span>
            <span style="font-weight: 800; color: #ffffff; font-size: 0.88rem;">\${escapeHtml(t2.title)}</span>
          </div>
          <div style="font-size: 0.72rem; color: #94a3b8; display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
            <span>Reward: <b style="color: #fbbf24; font-size: 0.82rem;">🪙 \${t2.rewardCoins || t2.reward || 250} Coins</b></span>
            <span>&bull;</span>
            <span>Secret Code: <b style="color: #facc15; font-family: monospace;">\${t2.verificationCode || t2.code || '749201'}</b></span>
          </div>
          <div style="font-size: 0.7rem; color: #38bdf8; margin-top: 3px; word-break: break-all;">
            Target URL: <a href="\${t2.url || t2.link || '#'}" target="_blank" style="color: #38bdf8; text-decoration: underline;">\${t2.url || t2.link || 'https://telegram.org'}</a>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.7rem; color: #7dd3fc; font-weight: 800;">
            Task #2
          </span>
        </div>
      </div>

      <!-- Sub-Task 3 Card -->
      <div class="pro-subtask-card" style="border-left: 4px solid #a855f7;">
        <div class="pro-subtask-info">
          <div class="pro-subtask-title-row">
            <span class="pro-subtask-badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc;">🏆 3 of 3 • Full Package Completion Bounty</span>
            <span style="font-weight: 800; color: #ffffff; font-size: 0.88rem;">\${escapeHtml(t3.title)}</span>
          </div>
          <div style="font-size: 0.72rem; color: #94a3b8; display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
            <span>Reward: <b style="color: #fbbf24; font-size: 0.82rem;">🪙 \${t3.rewardCoins || t3.reward || 250} Coins</b> (Wins Full Total Package Bounty!)</span>
            <span>&bull;</span>
            <span>Secret Code: <b style="color: #facc15; font-family: monospace;">\${t3.verificationCode || t3.code || '382910'}</b></span>
          </div>
          <div style="font-size: 0.7rem; color: #38bdf8; margin-top: 3px; word-break: break-all;">
            Target URL: <a href="\${t3.url || t3.link || '#'}" target="_blank" style="color: #38bdf8; text-decoration: underline;">\${t3.url || t3.link || 'https://google.com'}</a>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); font-size: 0.7rem; color: #c084fc; font-weight: 800;">
            Task #3
          </span>
        </div>
      </div>
    \`;
  }
}

function toggleProEventActive() {
  const settings = getStoredProEventSettings();
  settings.active = !settings.active;
  saveProEventSettings(settings);
  renderAdminProTasksPanel();
  showToast(settings.active ? '● Pro Event Activated!' : '○ Pro Event Turned Off!');
}

function openEditProTasksModal() {
  const settings = getStoredProEventSettings();
  const tasks = settings.tasks || [];
  const t1 = tasks[0] || {};
  const t2 = tasks[1] || {};
  const t3 = tasks[2] || {};

  const durEl = document.getElementById('editProEventDuration');
  if (durEl) durEl.value = settings.durationHours || 48;
  const coinCostEl = document.getElementById('editProPackageCoinCost');
  if (coinCostEl) coinCostEl.value = settings.packageCoinCost || 50;
  const ticketCostEl = document.getElementById('editProPackageTicketCost');
  if (ticketCostEl) ticketCostEl.value = settings.packageTicketCost || 2;
  const activeToggle = document.getElementById('editProEventActiveToggle');
  if (activeToggle) activeToggle.checked = (settings.active !== false);

  const t1Title = document.getElementById('editProTask1Title');
  if (t1Title) t1Title.value = t1.title || 'Mission 1: Promo Signup';
  const t1Price = document.getElementById('editProTask1Price');
  if (t1Price) t1Price.value = t1.rewardCoins || t1.reward || 500;
  const t1Url = document.getElementById('editProTask1Url');
  if (t1Url) t1Url.value = t1.url || t1.link || 'https://youtube.com';
  const t1Code = document.getElementById('editProTask1Code');
  if (t1Code) t1Code.value = t1.verificationCode || t1.code || '583921';

  const t2Title = document.getElementById('editProTask2Title');
  if (t2Title) t2Title.value = t2.title || 'Mission 2: Community Join';
  const t2Price = document.getElementById('editProTask2Price');
  if (t2Price) t2Price.value = t2.rewardCoins || t2.reward || 250;
  const t2Url = document.getElementById('editProTask2Url');
  if (t2Url) t2Url.value = t2.url || t2.link || 'https://telegram.org';
  const t2Code = document.getElementById('editProTask2Code');
  if (t2Code) t2Code.value = t2.verificationCode || t2.code || '749201';

  const t3Title = document.getElementById('editProTask3Title');
  if (t3Title) t3Title.value = t3.title || 'Mission 3: Survey Bonus';
  const t3Price = document.getElementById('editProTask3Price');
  if (t3Price) t3Price.value = t3.rewardCoins || t3.reward || 250;
  const t3Url = document.getElementById('editProTask3Url');
  if (t3Url) t3Url.value = t3.url || t3.link || 'https://google.com';
  const t3Code = document.getElementById('editProTask3Code');
  if (t3Code) t3Code.value = t3.verificationCode || t3.code || '382910';

  updateEditProBountyPreview();
  const modal = document.getElementById('adminProTaskEditModalOverlay');
  if (modal) modal.style.display = 'flex';
}

function closeEditProTasksModal() {
  const modal = document.getElementById('adminProTaskEditModalOverlay');
  if (modal) modal.style.display = 'none';
}

function updateEditProBountyPreview() {
  const p1 = parseInt(document.getElementById('editProTask1Price')?.value || '500', 10) || 0;
  const p2 = parseInt(document.getElementById('editProTask2Price')?.value || '250', 10) || 0;
  const p3 = parseInt(document.getElementById('editProTask3Price')?.value || '250', 10) || 0;
  const total = p1 + p2 + p3;
  const label = document.getElementById('editProTotalBountyPreview');
  if (label) label.textContent = \`Total: \${total.toLocaleString()} Coins\`;
}

function handleSaveProTasksForm(e) {
  if (e && e.preventDefault) e.preventDefault();

  const durationHours = parseInt(document.getElementById('editProEventDuration')?.value || '48', 10);
  const packageCoinCost = parseInt(document.getElementById('editProPackageCoinCost')?.value || '50', 10);
  const packageTicketCost = parseInt(document.getElementById('editProPackageTicketCost')?.value || '2', 10);
  const isActive = document.getElementById('editProEventActiveToggle')?.checked ?? true;

  const t1 = {
    id: "task_pro_1",
    title: document.getElementById('editProTask1Title')?.value.trim() || 'Mission 1: Promo Signup',
    category: "pro",
    rewardCoins: parseInt(document.getElementById('editProTask1Price')?.value || '500', 10),
    reward: parseInt(document.getElementById('editProTask1Price')?.value || '500', 10),
    coins: parseInt(document.getElementById('editProTask1Price')?.value || '500', 10),
    url: document.getElementById('editProTask1Url')?.value.trim() || 'https://youtube.com',
    link: document.getElementById('editProTask1Url')?.value.trim() || 'https://youtube.com',
    verificationCode: document.getElementById('editProTask1Code')?.value.trim() || '583921',
    code: document.getElementById('editProTask1Code')?.value.trim() || '583921',
    secretCode: document.getElementById('editProTask1Code')?.value.trim() || '583921',
    description: "First mission of 3-task package (Half price awarded here!)",
    isPackagePart: true,
    packagePartIndex: 1,
    active: isActive
  };

  const t2 = {
    id: "task_pro_2",
    title: document.getElementById('editProTask2Title')?.value.trim() || 'Mission 2: Community Join',
    category: "pro",
    rewardCoins: parseInt(document.getElementById('editProTask2Price')?.value || '250', 10),
    reward: parseInt(document.getElementById('editProTask2Price')?.value || '250', 10),
    coins: parseInt(document.getElementById('editProTask2Price')?.value || '250', 10),
    url: document.getElementById('editProTask2Url')?.value.trim() || 'https://telegram.org',
    link: document.getElementById('editProTask2Url')?.value.trim() || 'https://telegram.org',
    verificationCode: document.getElementById('editProTask2Code')?.value.trim() || '749201',
    code: document.getElementById('editProTask2Code')?.value.trim() || '749201',
    secretCode: document.getElementById('editProTask2Code')?.value.trim() || '749201',
    description: "Second mission of 3-task package",
    isPackagePart: true,
    packagePartIndex: 2,
    active: isActive
  };

  const t3 = {
    id: "task_pro_3",
    title: document.getElementById('editProTask3Title')?.value.trim() || 'Mission 3: Survey Bonus',
    category: "pro",
    rewardCoins: parseInt(document.getElementById('editProTask3Price')?.value || '250', 10),
    reward: parseInt(document.getElementById('editProTask3Price')?.value || '250', 10),
    coins: parseInt(document.getElementById('editProTask3Price')?.value || '250', 10),
    url: document.getElementById('editProTask3Url')?.value.trim() || 'https://google.com',
    link: document.getElementById('editProTask3Url')?.value.trim() || 'https://google.com',
    verificationCode: document.getElementById('editProTask3Code')?.value.trim() || '382910',
    code: document.getElementById('editProTask3Code')?.value.trim() || '382910',
    secretCode: document.getElementById('editProTask3Code')?.value.trim() || '382910',
    description: "Third mission of 3-task package (Full package completion bounty!)",
    isPackagePart: true,
    packagePartIndex: 3,
    active: isActive
  };

  const settings = {
    active: isActive,
    durationHours,
    packageCoinCost,
    packageTicketCost,
    startTime: Date.now(),
    endTime: Date.now() + durationHours * 3600000,
    tasks: [t1, t2, t3]
  };

  saveProEventSettings(settings);
  closeEditProTasksModal();
  renderAdminProTasksPanel();
  showToast('💎 Pro Tasks & 3-Task Pack updated successfully! ✓');
}

function renderAdminPassPanel() {
  const config = getStoredPassConfig();

  const titleEl = document.getElementById('passDetailSeasonTitle');
  if (titleEl) titleEl.textContent = config.seasonName || 'Season 6: Light the Fuse';

  const badgeEl = document.getElementById('passStatusBadge');
  const toggleBtn = document.getElementById('labelTogglePassAdmin');
  if (badgeEl) {
    if (config.passActivated) {
      badgeEl.textContent = '⚡ PASS ACTIVE';
      badgeEl.style.background = 'rgba(250, 204, 21, 0.2)';
      badgeEl.style.color = '#facc15';
      badgeEl.style.borderColor = 'rgba(250, 204, 21, 0.5)';
      if (toggleBtn) toggleBtn.textContent = 'Free Only 🔄';
    } else {
      badgeEl.textContent = '○ FREE TRACK ONLY';
      badgeEl.style.background = 'rgba(56, 189, 248, 0.2)';
      badgeEl.style.color = '#38bdf8';
      badgeEl.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      if (toggleBtn) toggleBtn.textContent = 'Activate Pass ⚡';
    }
  }

  const tiersEl = document.getElementById('passDetailTotalLevels');
  if (tiersEl) tiersEl.textContent = \`\${config.totalLevels || 500} Levels\`;

  const rewardEl = document.getElementById('passDetailMilestoneReward');
  if (rewardEl) {
    const symbol = config.milestoneRewardType === 'coins' ? '🪙' : (config.milestoneRewardType === 'tickets' ? '🎟️' : '⭐');
    rewardEl.textContent = \`\${symbol} \${config.milestoneRewardAmount || 100} \${config.milestoneRewardType || 'Stars'}\`;
  }

  const playerLvlEl = document.getElementById('passDetailPlayerLevel');
  if (playerLvlEl) {
    const pLvl = localStorage.getItem('task_pass_level') || '4';
    playerLvlEl.textContent = \`Level \${pLvl}\`;
  }

  const milestonesContainer = document.getElementById('passMilestonesPreviewGrid');
  if (milestonesContainer) {
    const currentLvl = parseInt(localStorage.getItem('task_pass_level') || '4', 10);
    const milestones = [
      { lvl: 2, reward: '🎟️ 5 Tickets' },
      { lvl: 3, reward: '🪙 100 Coins' },
      { lvl: 4, reward: '🎟️ 5 Tickets' },
      { lvl: 5, reward: '🪙 100 Coins' },
      { lvl: 6, reward: '🎟️ 5 Tickets' },
      { lvl: 10, reward: \`⭐ \${config.milestoneRewardAmount || 100} Stars (Goal)\` },
      { lvl: 50, reward: '🪙 1,000 Coins (Silver)' },
      { lvl: 100, reward: '⭐ 500 Stars (Gold)' },
      { lvl: 500, reward: '👑 Grand Trophy & 10k ⭐' }
    ];

    milestonesContainer.innerHTML = milestones.map(m => {
      let statusHtml = '';
      let borderStyle = 'border: 1px solid rgba(56, 189, 248, 0.25);';
      if (m.lvl < currentLvl) {
        statusHtml = '<span style="font-size: 0.65rem; color: #34d399; font-weight: 800;">✓ Won</span>';
        borderStyle = 'border: 1.5px solid rgba(52, 211, 153, 0.5); background: rgba(16, 185, 129, 0.1);';
      } else if (m.lvl === currentLvl) {
        statusHtml = '<span style="font-size: 0.65rem; color: #38bdf8; font-weight: 800;">🎯 Active Target</span>';
        borderStyle = 'border: 2px solid #38bdf8; background: rgba(14, 165, 233, 0.15); box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);';
      } else {
        statusHtml = '<span style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">🔒 Locked</span>';
      }
      return \`
        <div class="pass-milestone-card" style="\${borderStyle}">
          <div style="font-weight: 900; color: #ffffff; font-size: 0.85rem; margin-bottom: 2px;">Level \${m.lvl}</div>
          <div style="font-size: 0.75rem; color: #fde047; font-weight: 800; margin-bottom: 4px;">\${m.reward}</div>
          \${statusHtml}
        </div>
      \`;
    }).join('');
  }
}

function adminTogglePassActivation() {
  const config = getStoredPassConfig();
  config.passActivated = !config.passActivated;
  savePassConfig(config);
  renderAdminPassPanel();
  showToast(config.passActivated ? '⚡ Pass Activated for all users!' : '○ Free Track mode active.');
}

function openEditPassSettingsModal() {
  const config = getStoredPassConfig();
  document.getElementById('editPassSeasonName').value = config.seasonName || 'Season 6: Light the Fuse';
  document.getElementById('editPassDurationDays').value = config.durationDays || 21;
  document.getElementById('editPassTotalLevels').value = config.totalLevels || 500;
  document.getElementById('editPassTasksPerLevel').value = config.tasksPerLevel || 1;
  document.getElementById('editPassMilestoneLevel').value = config.milestoneLevel || 10;
  document.getElementById('editPassMilestoneType').value = config.milestoneRewardType || 'stars';
  document.getElementById('editPassMilestoneAmount').value = config.milestoneRewardAmount || 100;
  document.getElementById('editPassActivatedToggle').checked = (config.passActivated !== false);

  const modal = document.getElementById('adminPassEditModalOverlay');
  if (modal) modal.style.display = 'flex';
}

function closeEditPassSettingsModal() {
  const modal = document.getElementById('adminPassEditModalOverlay');
  if (modal) modal.style.display = 'none';
}

function handleSavePassSettingsForm(e) {
  if (e && e.preventDefault) e.preventDefault();

  const config = {
    seasonName: document.getElementById('editPassSeasonName')?.value.trim() || 'Season 6: Light the Fuse',
    durationDays: parseInt(document.getElementById('editPassDurationDays')?.value || '21', 10),
    totalLevels: parseInt(document.getElementById('editPassTotalLevels')?.value || '500', 10),
    tasksPerLevel: parseInt(document.getElementById('editPassTasksPerLevel')?.value || '1', 10),
    milestoneLevel: parseInt(document.getElementById('editPassMilestoneLevel')?.value || '10', 10),
    milestoneRewardType: document.getElementById('editPassMilestoneType')?.value || 'stars',
    milestoneRewardAmount: parseInt(document.getElementById('editPassMilestoneAmount')?.value || '100', 10),
    passActivated: document.getElementById('editPassActivatedToggle')?.checked ?? true
  };

  savePassConfig(config);
  closeEditPassSettingsModal();
  renderAdminPassPanel();
  showToast('🎫 Pass settings updated and synced across all user screens! ✓');
}

window.switchAdminEventTab = switchAdminEventTab;
window.renderAdminProTasksPanel = renderAdminProTasksPanel;
window.renderAdminPassPanel = renderAdminPassPanel;
window.toggleProEventActive = toggleProEventActive;
window.openEditProTasksModal = openEditProTasksModal;
window.closeEditProTasksModal = closeEditProTasksModal;
window.updateEditProBountyPreview = updateEditProBountyPreview;
window.handleSaveProTasksForm = handleSaveProTasksForm;
window.adminTogglePassActivation = adminTogglePassActivation;
window.openEditPassSettingsModal = openEditPassSettingsModal;
window.closeEditPassSettingsModal = closeEditPassSettingsModal;
window.handleSavePassSettingsForm = handleSavePassSettingsForm;
`;

if (!s.includes('switchAdminEventTab')) {
  s += '\n\n' + codeToAppend;
  fs.writeFileSync(profileScriptPath, s, 'utf8');
  console.log('Appended event tab functions to profile/script.js successfully!');
} else {
  console.log('Already has switchAdminEventTab in profile/script.js');
}
