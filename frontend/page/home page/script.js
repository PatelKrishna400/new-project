// Game State (Max Level 5000)
const MAX_TASK_PASS_LEVEL = 5000;

// Calculate target tasks required for any given level (1 task = 1 level with its winning prize)
function getTargetForLevel(level) {
  return 1;
}

// Custom Game SVG Icons matching the reference Coin Sack / Ticket / Star style
const TASK_PASS_SVGS = {
  coin: `<svg viewBox="0 0 64 64" width="52" height="52" style="width: 52px; height: 52px; display: block;">
  <defs>
    <radialGradient id="coinGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#fff59d"/>
      <stop offset="35%" stop-color="#facc15"/>
      <stop offset="70%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </radialGradient>
    <linearGradient id="coinRim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
    <linearGradient id="coinInner" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef9c3"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="27" fill="url(#coinGrad)" stroke="#111318" stroke-width="3.5"/>
  <circle cx="32" cy="32" r="21" fill="url(#coinInner)" stroke="url(#coinRim)" stroke-width="2.5"/>
  <polygon points="32,18 35.5,26 44,27 37.5,33 39.5,41.5 32,37 24.5,41.5 26.5,33 20,27 28.5,26" fill="#fffbeb" stroke="#b45309" stroke-width="1.5"/>
  <path d="M16 26 A20 20 0 0 1 40 14" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
</svg>`,
  coinBag: `<svg viewBox="0 0 64 64" width="52" height="52" style="width: 52px; height: 52px; display: block;">
  <defs>
    <radialGradient id="coinGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#fff59d"/>
      <stop offset="35%" stop-color="#facc15"/>
      <stop offset="70%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </radialGradient>
    <linearGradient id="coinRim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
    <linearGradient id="coinInner" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef9c3"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="27" fill="url(#coinGrad)" stroke="#111318" stroke-width="3.5"/>
  <circle cx="32" cy="32" r="21" fill="url(#coinInner)" stroke="url(#coinRim)" stroke-width="2.5"/>
  <polygon points="32,18 35.5,26 44,27 37.5,33 39.5,41.5 32,37 24.5,41.5 26.5,33 20,27 28.5,26" fill="#fffbeb" stroke="#b45309" stroke-width="1.5"/>
  <path d="M16 26 A20 20 0 0 1 40 14" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
</svg>`,
  ticket: `<svg viewBox="0 0 64 64" width="52" height="52" style="width: 52px; height: 52px; display: block;">
  <defs>
    <linearGradient id="ticketGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff4d4d"/>
      <stop offset="45%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
    <linearGradient id="ticketInnerGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <g transform="rotate(-8 32 32)">
    <path d="M10 18 H54 V27 A5 5 0 0 0 54 37 V46 H10 V37 A5 5 0 0 0 10 27 Z" fill="url(#ticketGrad)" stroke="#111318" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="18" y="24" width="28" height="16" rx="4" fill="url(#ticketInnerGrad)" stroke="#111318" stroke-width="2.5"/>
    <polygon points="32,26 34,30.5 38.5,31 35,34 36,38.5 32,36 28,38.5 29,34 25.5,31 30,30.5" fill="#dc2626"/>
    <path d="M14 21 H50" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
  </g>
</svg>`,
  star: `<svg viewBox="0 0 64 64" width="52" height="52" style="width: 52px; height: 52px; display: block;">
  <defs>
    <radialGradient id="starGlow" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#fef08a"/>
      <stop offset="60%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#eab308"/>
    </radialGradient>
    <linearGradient id="starShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <polygon points="32,6 40,22 57,24 44.5,36 47.5,53 32,44.5 16.5,53 19.5,36 7,24 24,22"
    fill="url(#starGlow)" stroke="#111318" stroke-width="3.8" stroke-linejoin="round"/>
  <polygon points="32,13 37.5,23.5 48.5,25 40,33 42,44.5 32,39 22,44.5 24,33 15.5,25 26.5,23.5"
    fill="#fef08a" stroke="#ca8a04" stroke-width="1.5" stroke-linejoin="round"/>
  <polygon points="32,18 35,25 42,26 36.5,31 38,38 32,34.5 26,38 27.5,31 22,26 29,25"
    fill="#ffffff" opacity="0.9"/>
</svg>`
};

// Determine exact reward for a given level:
// - Level 10, 20, 30, 40... -> 100 Stars ⭐
// - All other levels -> 100 Coins 🪙 (Tickets removed; tickets are only for shop page)
function getLevelReward(level) {
  level = parseInt(level, 10);
  if (isNaN(level) || level < 1) level = 1;
  const target = getTargetForLevel(level);
  const taskWord = target === 1 ? 'Task' : 'Tasks';

  if (level % 10 === 0) {
    return {
      type: 'stars',
      amount: 100,
      iconSvg: TASK_PASS_SVGS.star,
      tag: `Level ${level} / ${MAX_TASK_PASS_LEVEL} • Target: ${target} ${taskWord}`,
      title: `Complete ${target} ${taskWord} to Win 100 Stars ⭐`,
      popText: '+100 STARS ⭐'
    };
  } else if (level % 2 === 0) {
    return {
      type: 'tickets',
      amount: 5,
      iconSvg: TASK_PASS_SVGS.ticket || TASK_PASS_SVGS.coin,
      tag: `Level ${level} • Target: ${target} ${taskWord}`,
      title: `Complete ${target} ${taskWord} to Win 5 Tickets 🎟️`,
      popText: '+5 TICKETS 🎟️'
    };
  } else {
    return {
      type: 'coins',
      amount: 100,
      iconSvg: TASK_PASS_SVGS.coin,
      tag: `Level ${level} • Target: ${target} ${taskWord}`,
      title: `Complete ${target} ${taskWord} to Win 100 Coins 🪙`,
      popText: '+100 COINS 🪙'
    };
  }
}

function spawnFloatingPop(x, y, text, isLevelUp = false) {
  const pop = document.createElement('div');
  pop.className = `floating-pop game-outline ${isLevelUp ? 'text-2xl' : 'text-xl'}`;
  pop.textContent = text;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 700);
}

function syncTaskPassFromCompletedTasks() {
  try {
    const rawCompleted = localStorage.getItem("task_game_completed_tasks");
    const completedTasks = rawCompleted ? JSON.parse(rawCompleted) : {};
    let totalCompleted = Object.keys(completedTasks).length;
    const directCompleted = parseInt(localStorage.getItem("task_pass_total_completed") || "0", 10);
    if (directCompleted > totalCompleted) {
      totalCompleted = directCompleted;
    }

    // 1 task = 1 level completed
    const currentLevel = Math.min(MAX_TASK_PASS_LEVEL, totalCompleted + 1);

    localStorage.setItem("task_pass_level", currentLevel.toString());
    localStorage.setItem("task_pass_current_tasks", "0");
    localStorage.setItem("task_pass_total_completed", totalCompleted.toString());
  } catch (e) {}
}

function renderTaskPassLevelsStrip(currentLevel, totalCompleted) {
  const strip = document.getElementById("taskPassLevelsStrip");
  if (!strip) return;

  // 1 to 5000 levels created, but only show target in 10-level block (e.g. 1-10, 11-20, 21-30... up to 5000)
  const targetMilestone = Math.min(MAX_TASK_PASS_LEVEL, Math.ceil(currentLevel / 10) * 10);
  const startLevel = targetMilestone - 9;
  const endLevel = targetMilestone;
  let html = "";

  for (let lvl = startLevel; lvl <= endLevel; lvl++) {
    const reward = getLevelReward(lvl);
    const isCompleted = lvl <= totalCompleted;
    const isCurrent = lvl === currentLevel;
    const isMilestone = (lvl % 10 === 0);

    let cardClass = "level-strip-card";
    if (isMilestone) cardClass += " milestone";
    if (isCompleted) cardClass += " completed";
    if (isCurrent) cardClass += " active";

    let statusText = "🔒 1 Task";
    let statusClass = "status-locked";

    if (isCompleted) {
      statusText = "✓ Won";
      statusClass = "status-won";
    } else if (isCurrent) {
      statusText = "🎯 0/1 Task";
      statusClass = "status-current";
    }

    const emoji = reward.type === "stars" ? "⭐" : (reward.type === "tickets" ? "🎟️" : "🪙");

    html += `
      <div class="${cardClass}" id="levelStripCard_${lvl}" onclick="openTaskPassRoadmapModal(${lvl})" title="Level ${lvl}: Complete 1 task to win ${reward.amount} ${emoji}">
        <span class="level-strip-num">Lvl ${lvl}</span>
        <div class="level-strip-reward">
          <span>${emoji}</span>
          <span>${reward.amount}</span>
        </div>
        <span class="level-strip-status ${statusClass}">${statusText}</span>
      </div>
    `;
  }

  strip.innerHTML = html;

  // Auto-scroll strip to center the active current level card
  setTimeout(() => {
    const activeEl = document.getElementById(`levelStripCard_${currentLevel}`);
    const container = document.getElementById("taskPassLevelsStripContainer");
    if (activeEl && container) {
      const scrollPos = activeEl.offsetLeft - (container.clientWidth / 2) + (activeEl.clientWidth / 2);
      container.scrollTo({ left: Math.max(0, scrollPos), behavior: "smooth" });
    }
  }, 100);
}

function updateTaskPassUI() {
  syncTaskPassFromCompletedTasks();
  const currentLevel = parseInt(localStorage.getItem("task_pass_level") || "1", 10);
  const totalCompleted = parseInt(localStorage.getItem("task_pass_total_completed") || "0", 10);

  const cycleTaskTag = document.getElementById("cycleTaskTag");
  const nextMilestoneLabel = document.getElementById("nextMilestoneLabel");

  const reward = getLevelReward(currentLevel);

  // Target in 10-level block: e.g. Level 1-10 -> Target Lvl 10 (100 ⭐), Level 11-20 -> Target Lvl 20 (100 ⭐)
  const nextTenLevel = Math.min(MAX_TASK_PASS_LEVEL, Math.ceil(currentLevel / 10) * 10);
  if (nextMilestoneLabel) nextMilestoneLabel.textContent = 'All Levels 🏆';

  // Top-left gold pill: show target progress out of 10 (e.g. 0/10, 1/10, 2/10, 3/10)
  const startLevel = nextTenLevel - 9;
  const completedInBlock = Math.max(0, Math.min(10, totalCompleted - (startLevel - 1)));
  if (cycleTaskTag) cycleTaskTag.textContent = `${completedInBlock}/10`;

  // Optional legacy elements if present in DOM
  const levelNumText = document.getElementById("levelNumText");
  const taskProgressBar = document.getElementById("taskProgressBar");
  const taskCountText = document.getElementById("taskCountText");
  const rewardBagSvg = document.getElementById("rewardBagSvg");
  const rewardAmountText = document.getElementById("rewardAmountText");

  if (levelNumText) levelNumText.textContent = currentLevel;
  if (taskProgressBar) taskProgressBar.style.width = "0%";
  if (taskCountText) taskCountText.textContent = "0/1 Task";
  if (rewardBagSvg) rewardBagSvg.innerHTML = reward.iconSvg;
  if (rewardAmountText) rewardAmountText.textContent = reward.amount;

  // Render Horizontal Levels Strip: only show target in 10-level block (Image 4)
  renderTaskPassLevelsStrip(currentLevel, totalCompleted);
}
window.updateTaskPassUI = updateTaskPassUI;
window.renderTaskPassLevelsStrip = renderTaskPassLevelsStrip;

// Initialize Task Pass UI immediately on load and DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { if (typeof updateTaskPassUI === "function") updateTaskPassUI(); });
} else {
  if (typeof updateTaskPassUI === "function") updateTaskPassUI();
}
window.addEventListener("load", () => { if (typeof updateTaskPassUI === "function") updateTaskPassUI(); });

// Advance Task Pass Progress upon verifying/claiming a task (1 task = 1 level with winning prize)
function advanceTaskPassProgress(clickX, clickY) {
  let totalTasksCompleted = parseInt(localStorage.getItem("task_pass_total_completed") || localStorage.getItem("task_game_total_tasks_completed") || "0", 10);
  totalTasksCompleted++;

  // 1 task = 1 level completed with winning prize
  const completedLevel = totalTasksCompleted;
  const newLevel = Math.min(MAX_TASK_PASS_LEVEL, completedLevel + 1);

  localStorage.setItem("task_pass_total_completed", totalTasksCompleted.toString());
  localStorage.setItem("task_game_total_tasks_completed", totalTasksCompleted.toString());
  localStorage.setItem("completed_tasks_count", totalTasksCompleted.toString());
  localStorage.setItem("task_pass_level", newLevel.toString());
  localStorage.setItem("task_pass_current_tasks", "0");

  // Award the winning prize for the completed level
  const rewardWon = getLevelReward(completedLevel);

  if (rewardWon.type === "stars") {
    let curStars = parseInt(localStorage.getItem("task_game_stars") || localStorage.getItem("user_stars") || "0", 10);
    curStars += rewardWon.amount;
    localStorage.setItem("task_game_stars", curStars.toString());
    localStorage.setItem("user_stars", curStars.toString());
    if (window.userStars !== undefined) window.userStars = curStars;
    const starDisplay = document.getElementById("userStarsDisplay");
    if (starDisplay) starDisplay.textContent = curStars.toLocaleString();
    if (typeof triggerHeaderPillBounce === "function") triggerHeaderPillBounce("starPill");
  } else if (rewardWon.type === "tickets") {
    let curTickets = parseInt(localStorage.getItem("task_game_tickets") || localStorage.getItem("user_tickets") || "0", 10);
    curTickets += rewardWon.amount;
    localStorage.setItem("task_game_tickets", curTickets.toString());
    localStorage.setItem("user_tickets", curTickets.toString());
    if (window.userTickets !== undefined) window.userTickets = curTickets;
  } else {
    let curCoins = parseInt(localStorage.getItem("task_game_coins") || localStorage.getItem("user_coins") || "0", 10);
    curCoins += rewardWon.amount;
    localStorage.setItem("task_game_coins", curCoins.toString());
    localStorage.setItem("task_game_coins_alt", curCoins.toString());
    localStorage.setItem("user_coins", curCoins.toString());
    if (window.userCoins !== undefined) window.userCoins = curCoins;
    const coinDisplay = document.getElementById("userCoinsDisplay");
    if (coinDisplay) coinDisplay.textContent = curCoins.toLocaleString();
    if (typeof triggerHeaderPillBounce === "function") triggerHeaderPillBounce("coinPill");
  }
  if (typeof updateCoinDisplay === "function") updateCoinDisplay();
  if (typeof window.updateCoinDisplay === "function") window.updateCoinDisplay();

  // Animate loading bar to 100% to reflect level completion immediately
  const taskProgressBar = document.getElementById("taskProgressBar");
  const taskCountText = document.getElementById("taskCountText");
  const levelNumText = document.getElementById("levelNumText");

  if (taskProgressBar) taskProgressBar.style.width = "100%";
  if (taskCountText) taskCountText.textContent = `1/1 Task - Lvl ${completedLevel} Done!`;

  // Immediately update top-left gold pill to show completed level / 10
  const targetMilestoneNow = Math.min(MAX_TASK_PASS_LEVEL, Math.ceil(completedLevel / 10) * 10);
  const startLvlNow = targetMilestoneNow - 9;
  const completedInBlockNow = Math.max(0, Math.min(10, totalTasksCompleted - (startLvlNow - 1)));
  const cycleTaskTag = document.getElementById("cycleTaskTag");
  if (cycleTaskTag) cycleTaskTag.textContent = `${completedInBlockNow}/10`;

  // Trigger bounce animation on Level Badge & Reward Icon
  const levelBadge = document.getElementById("levelBadge");
  const rewardPreviewBox = document.getElementById("rewardPreviewBox");
  if (levelBadge && rewardPreviewBox) {
    levelBadge.classList.remove("bounce-anim");
    rewardPreviewBox.classList.remove("bounce-anim");
    void levelBadge.offsetWidth;
    levelBadge.classList.add("bounce-anim");
    rewardPreviewBox.classList.add("bounce-anim");
  }

  const posX = clickX || (window.innerWidth / 2);
  const posY = clickY || (window.innerHeight / 2);
  spawnFloatingPop(posX, posY - 24, `LVL ${completedLevel} DONE! ${rewardWon.popText}`, true);

  // Transition to next level after brief celebration
  setTimeout(() => {
    updateTaskPassUI();
    if (typeof updateCoinDisplay === "function") updateCoinDisplay();
    if (typeof updateDisplays === "function") updateDisplays();
  }, 450);

  if (typeof updateCoinDisplay === "function") updateCoinDisplay();
  if (typeof updateDisplays === "function") updateDisplays();

  try {
    const bc = new BroadcastChannel("nova_task_sync");
    bc.postMessage({
      type: "TASK_PASS_SYNC",
      level: newLevel,
      currentTasks: 0,
      totalCompleted: totalTasksCompleted,
      timestamp: Date.now()
    });
    bc.postMessage({
      type: "BALANCES_UPDATED",
      coins: parseInt(localStorage.getItem("task_game_coins") || "0", 10),
      stars: parseInt(localStorage.getItem("task_game_stars") || "0", 10),
      timestamp: Date.now()
    });
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('balance:changed'));

  return {
    levelCompleted: true,
    completedLevel,
    newLevel,
    reward: rewardWon
  };
}
window.advanceTaskPassProgress = advanceTaskPassProgress;

let roadmapDisplayMax = 50;

function renderRoadmapLevels(maxLimit) {
  const listContainer = document.getElementById("roadmapLevelsList");
  if (!listContainer) return;

  const currentLevel = parseInt(localStorage.getItem("task_pass_level") || "1", 10);
  const totalCompleted = parseInt(localStorage.getItem("task_pass_total_completed") || "0", 10);
  roadmapDisplayMax = Math.min(MAX_TASK_PASS_LEVEL, maxLimit || 50);

  let listHtml = "";

  for (let lvl = 1; lvl <= roadmapDisplayMax; lvl++) {
    const reward = getLevelReward(lvl);
    const isCompleted = lvl <= totalCompleted;
    const isCurrent = lvl === currentLevel;
    const isMilestone = (lvl % 10 === 0);

    const emoji = reward.type === "stars" ? "⭐" : "🪙";
    const rewardName = reward.type === "stars" ? "Stars" : "Coins";

    let rowClass = "roadmap-level-row";
    if (isMilestone) rowClass += " milestone-row";
    if (isCompleted) rowClass += " completed-row";
    if (isCurrent) rowClass += " active-row";

    let statusBadge = `<span class="roadmap-status-badge status-locked">🔒 Locked</span>`;
    if (isCompleted) {
      statusBadge = `<span class="roadmap-status-badge status-won">✅ Won</span>`;
    } else if (isCurrent) {
      statusBadge = `<span class="roadmap-status-badge status-current">🎯 0/1 Task</span>`;
    }

    listHtml += `
      <div class="${rowClass}" id="roadmapLevelItem_${lvl}">
        <div class="roadmap-level-shield ${isCurrent ? "active-shield" : ""}">
          <span class="shield-num">${lvl}</span>
        </div>
        <div class="roadmap-level-info">
          <div class="roadmap-level-title">
            <span>Level ${lvl}</span>
            ${isMilestone ? "<span class='milestone-star-badge'>⭐ Target Milestone</span>" : ""}
          </div>
          <div class="roadmap-level-sub">Complete 1 Task &bull; Win <strong style="color: #fde047;">+${reward.amount} ${rewardName} ${emoji}</strong></div>
        </div>
        <div class="roadmap-level-right">
          <div class="roadmap-level-reward-tag">
            <span class="roadmap-reward-icon">${emoji}</span>
            <span class="roadmap-reward-val">${reward.amount}</span>
          </div>
          ${statusBadge}
        </div>
      </div>
    `;
  }

  if (roadmapDisplayMax < MAX_TASK_PASS_LEVEL) {
    listHtml += `
      <div style="text-align: center; padding: 12px 6px;">
        <button type="button" onclick="loadMoreRoadmapLevels()" style="width: 100%; background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.2) 100%); border: 1.5px solid rgba(56, 189, 248, 0.45); color: #38bdf8; font-weight: 800; font-size: 0.85rem; padding: 10px 16px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>⚡ Load Next 50 Levels (Showing ${roadmapDisplayMax} of 5,000)</span>
        </button>
      </div>
    `;
  }

  listContainer.innerHTML = listHtml;
}

function loadMoreRoadmapLevels() {
  renderRoadmapLevels(roadmapDisplayMax + 50);
}
window.loadMoreRoadmapLevels = loadMoreRoadmapLevels;

function openTaskPassRoadmapModal(targetLevel) {
  const modal = document.getElementById("taskPassRoadmapModalOverlay");
  if (!modal) return;

  const currentLevel = parseInt(localStorage.getItem("task_pass_level") || "1", 10);
  const totalCompleted = parseInt(localStorage.getItem("task_pass_total_completed") || "0", 10);
  const nextTenLevel = Math.min(MAX_TASK_PASS_LEVEL, Math.ceil(currentLevel / 10) * 10);
  const startLevel = nextTenLevel - 9;
  const completedInBlock = Math.max(0, Math.min(10, totalCompleted - (startLevel - 1)));

  const focusLvl = targetLevel || currentLevel;
  const initialMax = Math.min(MAX_TASK_PASS_LEVEL, Math.max(50, Math.ceil(focusLvl / 10) * 10 + 20));
  renderRoadmapLevels(initialMax);

  const summaryText = document.getElementById("roadmapSummaryText");
  if (summaryText) {
    summaryText.textContent = `Current: Level ${currentLevel} • Target: Lvl ${nextTenLevel} (${completedInBlock}/10) • 1 to 5,000 Levels 🏆`;
  }

  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);

  setTimeout(() => {
    const targetItem = document.getElementById(`roadmapLevelItem_${focusLvl}`);
    if (targetItem) {
      targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 200);
}

function closeTaskPassRoadmapModal() {
  const modal = document.getElementById("taskPassRoadmapModalOverlay");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => { modal.style.display = "none"; }, 200);
  }
}
window.openTaskPassRoadmapModal = openTaskPassRoadmapModal;
window.closeTaskPassRoadmapModal = closeTaskPassRoadmapModal;





// Zero-start sanitizer: Purge all mock demo users, artificial balances, and start from 0
try {
  if (!localStorage.getItem('task_game_zero_start_clean_v7')) {
    if (!localStorage.getItem('task_game_coins')) localStorage.setItem('task_game_coins', '0');
    if (!localStorage.getItem('task_game_stars')) localStorage.setItem('task_game_stars', '0');
    if (!localStorage.getItem('user_coins')) localStorage.setItem('user_coins', '0');
    if (!localStorage.getItem('user_stars')) localStorage.setItem('user_stars', '0');
    localStorage.setItem('task_game_total_tasks', '0');
    localStorage.setItem('task_game_total_tasks_completed', '0');
    localStorage.setItem('completed_tasks_count', '0');
    localStorage.setItem('task_game_ads_watched_count', '0');
    localStorage.setItem('ads_watched_count', '0');
    localStorage.setItem('task_game_event_tasks', '0');
    localStorage.setItem('task_game_event_tasks_count', '0');
    localStorage.setItem('task_coins_won_today', '0');
    localStorage.setItem('task_games_played_today', '0');
    localStorage.setItem('task_win_streak', '0');
    localStorage.setItem('task_game_users', '[]');
    localStorage.setItem('task_game_withdrawals', '[]');
    localStorage.setItem('task_game_referrals_list', '[]');
    localStorage.setItem('task_game_stars_transactions', '[]');
    localStorage.setItem('task_game_claims', '{}');
    localStorage.removeItem('task_game_stars_rating');
    localStorage.removeItem('task_game_cloud_referral_codes');
    localStorage.removeItem('task_game_ad_timer_end');
    localStorage.removeItem('task_game_tg_profile');
    localStorage.removeItem('player_email');
    localStorage.removeItem('player_whatsapp');
    const existingName = localStorage.getItem('player_username');
    if (!existingName || existingName.toLowerCase().includes('nova')) {
      localStorage.setItem('player_username', 'Player');
    }
    localStorage.setItem('player_avatar', '⚡');
    localStorage.setItem('task_game_zero_start_clean_v7', 'true');
  }
} catch (e) {}

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

// Storage Keys & Sync Channels
const TASKS_STORAGE_KEY = 'task_game_tasks';
const CLAIMS_STORAGE_KEY = 'task_game_claims';
const COMPLETED_TASKS_KEY = 'task_game_completed_tasks';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Default tasks: zero start (no demo tasks)
const DEFAULT_TASKS = [];

function getStoredTasks() {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Purge demo, seed, and sponsor tasks
        const cleaned = parsed.filter(t => t && t.id && 
          !t.id.startsWith('task_article_') && 
          !t.id.startsWith('task_sponsor_') && 
          !String(t.title || '').toLowerCase().includes('demo') &&
          !String(t.title || '').toLowerCase().includes('sponsor')
        );
        // Ensure each task has a valid 6-digit verification code
        let modified = false;
        cleaned.forEach(t => {
          if (!t.verificationCode && !t.code && !t.secretCode) {
            const genCode = Math.floor(100000 + Math.random() * 900000).toString();
            t.verificationCode = genCode;
            t.code = genCode;
            t.secretCode = genCode;
            modified = true;
          }
        });
        if (modified || cleaned.length !== parsed.length) {
          localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
    const adminRaw = localStorage.getItem('admin_tasks');
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [];
}

function getStoredCompletedTasks() {
  try {
    const raw = localStorage.getItem(COMPLETED_TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function markTaskCompleted(taskId) {
  const completed = getStoredCompletedTasks();
  completed[taskId] = { completedAt: Date.now(), rewardStars: 5 };
  localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(completed));
  localStorage.removeItem('task_opened_' + taskId);

  try {
    const claims = getStoredClaims();
    claims[taskId] = Date.now();
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims));
  } catch (e) {}

  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'TASK_COMPLETED', taskId, timestamp: Date.now() });
    ch.close();
  } catch (e) {}
}

function isTaskOpened(taskId) {
  return localStorage.getItem('task_opened_' + taskId) === 'true';
}

function setTaskOpened(taskId) {
  localStorage.setItem('task_opened_' + taskId, 'true');
}

function getStoredClaims() {
  try {
    const raw = localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {};
}

function saveClaims(claims) {
  localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    ch.postMessage({ type: 'CLAIMS_UPDATED', timestamp: Date.now() });
  } catch (e) {}
}

function getTaskRemainingSeconds(task, claims) {
  const timerSec = Number(task.timerSeconds);
  if (isNaN(timerSec) || timerSec <= 0) {
    return claims[task.id] ? -999 : 0;
  }
  const claimedAt = claims[task.id];
  if (!claimedAt) return 0;
  const elapsed = Math.floor((Date.now() - claimedAt) / 1000);
  const remaining = timerSec - elapsed;
  return remaining > 0 ? remaining : 0;
}

function formatRemainingTime(seconds) {
  if (seconds <= 0) return 'Ready';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDurationBadge(seconds) {
  const s = Number(seconds || 0);
  if (s <= 0) return 'One-time Bounty';
  const hrs = s / 3600;
  if (hrs >= 1 && Number.isInteger(hrs)) return `${hrs}h Cooldown`;
  if (hrs >= 1) return `${hrs.toFixed(1)}h Cooldown`;
  const mins = Math.floor(s / 60);
  if (mins >= 1) return `${mins}m Cooldown`;
  return `${s}s Cooldown`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const HomeAudio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  playStartupChime() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        gain.gain.setValueAtTime(0.08, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.38);
      });
    } catch (e) {}
  },
  playCoinClaim() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, t);
      osc.frequency.setValueAtTime(1318.51, t + 0.06);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    } catch (e) {}
  }
};

function triggerHeaderPillBounce(pillId) {
  const el = document.getElementById(pillId);
  if (el) {
    el.classList.remove('bounce-anim');
    void el.offsetWidth;
    el.classList.add('bounce-anim');
  }
}
window.triggerHeaderPillBounce = triggerHeaderPillBounce;

let userStars = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);

function updateCoinDisplay() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);

  const display = document.getElementById('userCoinsDisplay');
  if (display) {
    display.textContent = userCoins.toLocaleString();
  }

  const starDisplay = document.getElementById('userStarsDisplay');
  if (starDisplay) {
    starDisplay.textContent = userStars.toLocaleString();
  }

  const diamondDisplay = document.getElementById('userDiamondsDisplay');
  if (diamondDisplay) {
    const userDiamonds = parseInt(localStorage.getItem('task_user_diamonds') || '0', 10);
    diamondDisplay.textContent = userDiamonds.toLocaleString();
  }

  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) avatarEl.textContent = localStorage.getItem('player_avatar') || '⚡';

  const nameEl = document.querySelector('.user-name');
  if (nameEl) {
    const savedName = localStorage.getItem('player_username');
    nameEl.textContent = (savedName && savedName !== 'NovaEarner' && savedName !== 'Player') ? savedName : 'Task Earner';
  }

  // Dynamic User Rank Display in Header
  const rankEl = document.getElementById('userRankDisplay') || document.querySelector('.user-level');
  if (rankEl) {
    let playerRank = 1;
    try {
      const rawUsers = localStorage.getItem('task_game_users');
      const pName = localStorage.getItem('player_username') || 'Task Earner';
      if (rawUsers) {
        let users = JSON.parse(rawUsers);
        if (Array.isArray(users) && users.length > 0) {
          users.sort((a, b) => {
            const tasksDiff = Number(b.eventTasks || 0) - Number(a.eventTasks || 0);
            if (tasksDiff !== 0) return tasksDiff;
            const coinsDiff = Number(b.coins || 0) - Number(a.coins || 0);
            if (coinsDiff !== 0) return coinsDiff;
            return Number(b.stars || 0) - Number(a.stars || 0);
          });
          const idx = users.findIndex(u => (u.name && u.name.toLowerCase() === pName.toLowerCase()) || u.id === 'usr_1');
          if (idx >= 0) playerRank = idx + 1;
        }
      }
      const savedRank = localStorage.getItem('task_game_rank') || localStorage.getItem('player_rank');
      if (savedRank) playerRank = savedRank;
    } catch (e) {}
    rankEl.textContent = `RANK #${playerRank}`;
  }

  const pill = document.getElementById('coinPill');
  if (pill) {
    pill.style.transform = 'scale(1.05)';
    setTimeout(() => {
      pill.style.transform = 'scale(1)';
    }, 200);
  }
}
window.updateCoinDisplay = updateCoinDisplay;

function showFloatingCoin(targetElement, text) {
  if (!targetElement) return;
  const rect = targetElement.getBoundingClientRect();
  const floatEl = document.createElement('div');
  floatEl.className = 'floating-coin';
  floatEl.textContent = text;
  floatEl.style.left = `${rect.left + rect.width / 4}px`;
  floatEl.style.top = `${rect.top - 8}px`;

  document.body.appendChild(floatEl);
  setTimeout(() => {
    floatEl.remove();
  }, 800);
}



// ==========================================================================
// ==========================================================================
// VIP SUBSCRIPTION SYSTEM (15 Days / 30 Days / 3 Months with Daily Limits)
// Starter Pass: 5 tasks/day | Popular: 10 tasks/day | Best Value: 20 tasks/day
// ==========================================================================
const VIP_STORAGE_KEY = 'premium_vip_expiry';
const VIP_PLAN_KEY = 'premium_vip_plan';
const VIP_DAILY_LIMIT_KEY = 'premium_vip_daily_limit';
const VIP_TODAY_DATE_KEY = 'premium_tasks_today_date';
const VIP_TODAY_COUNT_KEY = 'premium_tasks_today_count';

function getTodayDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getVipSubscriptionExpiry() {
  const expiry = parseInt(localStorage.getItem(VIP_STORAGE_KEY) || '0', 10);
  return isNaN(expiry) ? 0 : expiry;
}

function hasActivePremiumSubscription() {
  const expiry = getVipSubscriptionExpiry();
  return expiry > Date.now();
}

function getRemainingVipDays() {
  const expiry = getVipSubscriptionExpiry();
  const diff = expiry - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getVipDailyTaskLimit() {
  const plan = localStorage.getItem(VIP_PLAN_KEY) || '15days';
  let baseLimit = 5;
  if (plan === '90days') baseLimit = 20;
  else if (plan === '30days') baseLimit = 10;

  // Extra tasks earned via watching rewarded ads!
  const todayKey = new Date().toISOString().slice(0, 10);
  const extraFromAds = parseInt(localStorage.getItem('extra_vip_tasks_' + todayKey) || '0', 10);
  return baseLimit + extraFromAds;
}

function getVipMaxAllowedLevel() {
  if (!hasActivePremiumSubscription()) return 0;
  const plan = localStorage.getItem(VIP_PLAN_KEY) || '15days';
  if (plan === '90days') return 5;
  if (plan === '30days') return 4;
  return 2; // 15days plan allows Level 1 & Level 2 tasks
}

function getVipPlanName() {
  const plan = localStorage.getItem(VIP_PLAN_KEY) || '15days';
  if (plan === '90days') return 'Best Value Pass (20 tasks/day, Levels 1-5)';
  if (plan === '30days') return 'Popular Pass (10 tasks/day, Levels 1-4)';
  return 'Starter Pass (5 tasks/day, Levels 1-2)';
}

function getTodayCompletedPremiumTasksCount() {
  const todayKey = getTodayDateKey();
  const storedDate = localStorage.getItem(VIP_TODAY_DATE_KEY);
  if (storedDate !== todayKey) {
    localStorage.setItem(VIP_TODAY_DATE_KEY, todayKey);
    localStorage.setItem(VIP_TODAY_COUNT_KEY, '0');
    return 0;
  }
  const count = parseInt(localStorage.getItem(VIP_TODAY_COUNT_KEY) || '0', 10);
  return isNaN(count) ? 0 : count;
}

function hasReachedDailyTaskLimit() {
  const count = getTodayCompletedPremiumTasksCount();
  const limit = getVipDailyTaskLimit();
  return count >= limit;
}

function incrementTodayCompletedPremiumTasks() {
  const count = getTodayCompletedPremiumTasksCount();
  localStorage.setItem(VIP_TODAY_COUNT_KEY, (count + 1).toString());
}

window.hasActivePremiumSubscription = hasActivePremiumSubscription;
window.getRemainingVipDays = getRemainingVipDays;
window.getVipDailyTaskLimit = getVipDailyTaskLimit;
window.getVipMaxAllowedLevel = getVipMaxAllowedLevel;
window.getVipPlanName = getVipPlanName;
window.getTodayCompletedPremiumTasksCount = getTodayCompletedPremiumTasksCount;
window.hasReachedDailyTaskLimit = hasReachedDailyTaskLimit;
window.incrementTodayCompletedPremiumTasks = incrementTodayCompletedPremiumTasks;

window.openSubscriptionModal = function() {
  const modal = document.getElementById('vipSubscriptionModal');
  if (!modal) return;
  const userStarsDisplay = document.getElementById('vipModalUserStars');
  const userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  if (userStarsDisplay) userStarsDisplay.textContent = userStars.toLocaleString();
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
};

window.closeSubscriptionModal = function() {
  const modal = document.getElementById('vipSubscriptionModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
};

window.handleVipModalBackdropClick = function(e) {
  if (e.target && e.target.id === 'vipSubscriptionModal') {
    closeSubscriptionModal();
  }
};

window.handleDailyLimitReachedClick = function() {
  const planKey = localStorage.getItem(VIP_PLAN_KEY) || '15days';
  const planName = getVipPlanName();
  const dailyLimit = getVipDailyTaskLimit();

  if (planKey === '90days') {
    alert(`🛑 Daily Limit Reached!\n\nYou have completed your maximum quota of ${dailyLimit} Premium Tasks today on the ${planName}.\n\nYour limit will automatically reset tomorrow at midnight!`);
  } else {
    const upgradeText = planKey === '15days'
      ? 'Popular Pass (10 tasks/day) or Best Value Pass (20 tasks/day)'
      : 'Best Value Pass (20 tasks/day)';
    if (confirm(`🛑 Daily Limit Reached!\n\nYou have completed ${dailyLimit}/${dailyLimit} Premium Tasks today on your ${planName}.\n\nWould you like to upgrade your VIP Pass to ${upgradeText} to complete more tasks per day?`)) {
      openSubscriptionModal();
    }
  }
};

window.purchaseVipPlan = function(planKey) {
  const plans = {
    '15days': { days: 15, stars: 500, label: 'Starter Pass', dailyLimit: 5, maxLevel: 2 },
    '30days': { days: 30, stars: 1000, label: 'Popular Pass', dailyLimit: 10, maxLevel: 4 },
    '90days': { days: 90, stars: 5000, label: 'Best Value Pass', dailyLimit: 20, maxLevel: 5 }
  };
  const plan = plans[planKey];
  if (!plan) return;

  let currentStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  if (currentStars < plan.stars) {
    alert(`❌ Insufficient Stars! You need ${plan.stars.toLocaleString()} ⭐ for the ${plan.label} (${plan.dailyLimit} tasks/day), but you currently have ${currentStars.toLocaleString()} ⭐.\n\nPlease earn more stars or visit the Shop to top up!`);
    return;
  }

  // Deduct stars
  currentStars -= plan.stars;
  localStorage.setItem('task_game_stars', currentStars.toString());
  localStorage.setItem('user_stars', currentStars.toString());

  // Calculate new expiry (extends if already active)
  const now = Date.now();
  const currentExpiry = getVipSubscriptionExpiry();
  const baseTime = (currentExpiry > now) ? currentExpiry : now;
  const newExpiry = baseTime + (plan.days * 24 * 60 * 60 * 1000);

  localStorage.setItem(VIP_STORAGE_KEY, newExpiry.toString());
  localStorage.setItem(VIP_PLAN_KEY, planKey);
  localStorage.setItem(VIP_DAILY_LIMIT_KEY, plan.dailyLimit.toString());
  localStorage.setItem('premium_vip_activated_at', now.toString());

  // Notify cross-tab channels of VIP update (including 30-day/90-day 20 shop limit upgrade)
  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.postMessage({ type: 'VIP_PURCHASED', plan: planKey, timestamp: now });
  } catch (e) {}

  // Update displays & play audio
  updateCoinDisplay();
  if (window.HomeAudio && typeof window.HomeAudio.playCoinClaim === 'function') {
    window.HomeAudio.playCoinClaim();
  }

  // Sync balances with cloud if available
  if (typeof window.syncBalancesWithCloud === 'function') {
    try { window.syncBalancesWithCloud(); } catch(e) {}
  }

  closeSubscriptionModal();

  // Floating celebration notification
  const targetBtn = document.getElementById('tabPremiumTasks') || document.body;
  if (typeof showFloatingCoin === 'function') {
    showFloatingCoin(targetBtn, `👑 ${plan.label} (${plan.dailyLimit} Tasks/Day, Levels 1-${plan.maxLevel}) Activated!`);
  }

  // Switch to Premium Tasks tab & render
  switchTaskTab('premium');
};

// Leaderboard Global Event Timer Helper for Home Banner
function getUniversalGlobalLeaderboardEvent() {
  const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
  const GLOBAL_EPOCH_ANCHOR = Date.UTC(2026, 9, 1, 0, 0, 0);
  const now = Date.now();
  const rawEvt = localStorage.getItem('task_game_leaderboard_event');
  if (rawEvt) {
    try {
      const evt = JSON.parse(rawEvt);
      if (evt && evt.endTime && evt.endTime > now && evt.status !== 'finished') {
        return evt;
      }
    } catch (e) {}
  }
  const elapsed = Math.max(0, now - GLOBAL_EPOCH_ANCHOR);
  const seasonIndex = Math.floor(elapsed / THREE_MONTHS_MS);
  const startTime = GLOBAL_EPOCH_ANCHOR + (seasonIndex * THREE_MONTHS_MS);
  const endTime = startTime + THREE_MONTHS_MS;
  return {
    id: `season_${seasonIndex + 1}`,
    name: `Season ${seasonIndex + 1}: 3-Month Championship`,
    seasonNumber: seasonIndex + 1,
    status: 'active',
    startTime,
    endTime
  };
}
window.getUniversalGlobalLeaderboardEvent = getUniversalGlobalLeaderboardEvent;

function updateHomeEventTimer() {
  const clock = document.getElementById('homeEventCountdownClock');
  const title = document.getElementById('homeEventTitleDisplay');
  if (!clock) return;
  const evt = getUniversalGlobalLeaderboardEvent();
  if (title && evt && evt.name) {
    title.textContent = `Season ${evt.seasonNumber || 1}: 3-Month Championship`;
  }
  const now = Date.now();
  const diff = Math.max(0, (evt ? evt.endTime : 0) - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  clock.textContent = `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
window.updateHomeEventTimer = updateHomeEventTimer;
setInterval(updateHomeEventTimer, 1000);

let currentTaskTab = localStorage.getItem('task_active_tab') || 'simple';

window.switchTaskTab = function(tab) {
  currentTaskTab = tab;
  localStorage.setItem('task_active_tab', tab);

  const tabSimple = document.getElementById('tabSimpleTasks');
  const tabPremium = document.getElementById('tabPremiumTasks');
  const tabPro = document.getElementById('tabProTasks');

  if (tabSimple) tabSimple.classList.toggle('active', tab === 'simple' || tab === 'all');
  if (tabPremium) tabPremium.classList.toggle('active', tab === 'premium' || tab === 'all');
  if (tabPro) tabPro.classList.toggle('active', tab === 'pro' || tab === 'all');

  renderTasks();
};

// Player Level Progression & Gating System (200 tasks per tier; Level 6 is Master; Level 2 unlocks with 20 Diamonds)
function isLevel2Unlocked() {
  if (localStorage.getItem('task_level_2_unlocked') === 'true') return true;
  const userDiamonds = Math.max(0, parseInt(
    localStorage.getItem('task_user_diamonds') || '0', 
    10
  ));
  const totalCompleted = Math.max(0, parseInt(
    localStorage.getItem('task_game_total_tasks_completed') || 
    localStorage.getItem('completed_tasks_count') || '0', 
    10
  ));
  if (userDiamonds >= 20 || totalCompleted >= 200) {
    localStorage.setItem('task_level_2_unlocked', 'true');
    return true;
  }
  return false;
}
window.isLevel2Unlocked = isLevel2Unlocked;

function isLevelUnlocked(lvl) {
  lvl = parseInt(lvl, 10);
  if (lvl === 1) return true;
  const pInfo = getPlayerLevelInfo();
  if (lvl === 2) return pInfo.isLevel2Unlocked;
  if (!pInfo.isLevel2Unlocked) return false;
  return pInfo.totalCompleted >= (lvl - 1) * 200;
}
window.isLevelUnlocked = isLevelUnlocked;

function unlockLevel2WithDiamonds() {
  let diamonds = parseInt(localStorage.getItem('task_user_diamonds') || '0', 10);
  const totalComp = parseInt(localStorage.getItem('task_game_total_tasks_completed') || '0', 10);
  if (diamonds >= 20 || totalComp >= 200) {
    localStorage.setItem('task_level_2_unlocked', 'true');
    localStorage.setItem('task_selected_level_tab', '2');
    try {
      if (typeof HomeAudio !== 'undefined' && HomeAudio.playSuccess) HomeAudio.playSuccess();
    } catch(e) {}
    alert('🎉 Task Level 2 Unlocked!\n\nYou can now complete high-reward Level 2 missions!');
  } else {
    alert(`🔒 Level 2 requires 20 Diamonds (10 tasks = 1 💎).\n\nCurrent: ${diamonds}/20 Diamonds.`);
  }

  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'LEVEL_2_UNLOCKED', newDiamonds: diamonds, timestamp: Date.now() });
  } catch (e) {}

  updateCoinDisplay();
  renderTasks();
}
window.unlockLevel2WithDiamonds = unlockLevel2WithDiamonds;

window.openDiamondInfoModal = function() {
  const diamonds = parseInt(localStorage.getItem('task_user_diamonds') || '0', 10);
  const lvl2Unlocked = isLevel2Unlocked();
  const totalComp = parseInt(localStorage.getItem('task_game_total_tasks_completed') || '0', 10);
  const lastDiamondTaskCount = parseInt(localStorage.getItem('task_last_diamond_completed_count') || '0', 10);
  const tasksInMilestone = (totalComp - lastDiamondTaskCount) % 10;
  const nextIn = 10 - tasksInMilestone;

  let msg = `💎 DIAMOND VAULT\n\n` +
    `• Balance: ${diamonds} Diamonds 💎\n` +
    `• Rule: 10 tasks completed = 1 Diamond auto added\n` +
    `• Next Diamond in: ${nextIn} tasks\n\n`;

  if (!lvl2Unlocked) {
    msg += `🔓 Level 2 Status: ${diamonds}/20 Diamonds to auto-unlock Level 2 (or reach 200 tasks)`;
  } else {
    msg += `✓ Level 2 Status: UNLOCKED!`;
  }
  alert(msg);
};

function getPlayerLevelInfo() {
  const totalCompleted = Math.max(0, parseInt(
    localStorage.getItem('task_game_total_tasks_completed') || 
    localStorage.getItem('completed_tasks_count') || '0', 
    10
  ));
  const userDiamonds = Math.max(0, parseInt(
    localStorage.getItem('task_user_diamonds') || '0', 
    10
  ));

  // Level 2 auto-unlocks loading-wise when 20 diamonds are collected or totalCompleted >= 200
  let lvl2Unlocked = isLevel2Unlocked();
  if (!lvl2Unlocked && (userDiamonds >= 20 || totalCompleted >= 200)) {
    lvl2Unlocked = true;
    localStorage.setItem('task_level_2_unlocked', 'true');
  }

  let level = 1;
  let progressPercent = 0;
  let levelSubText = '';

  if (!lvl2Unlocked) {
    level = 1;
    // Level 1 progress towards unlocking Level 2 (20 diamonds / 200 tasks)
    const diamondEquivalent = Math.max(userDiamonds, Math.floor(totalCompleted / 10));
    progressPercent = Math.min(100, Math.floor((Math.min(20, diamondEquivalent) / 20) * 100));
    levelSubText = `💎 ${Math.min(20, diamondEquivalent)}/20 Diamonds to unlock Level 2 (10 tasks = 1 💎)`;
  } else {
    // Levels 2 to 6 unlocked loading-wise by completed tasks (200 tasks per tier)
    if (totalCompleted >= 1000) {
      level = 6;
      progressPercent = 100;
      levelSubText = `👑 Level 6 Crown Legend • All Tasks Mastered! (Total: ${userDiamonds} 💎)`;
    } else if (totalCompleted >= 800) {
      level = 5;
      progressPercent = Math.min(100, Math.floor(((totalCompleted - 800) / 200) * 100));
      levelSubText = `🏆 Level 5 • ${1000 - totalCompleted} tasks to unlock Level 6 (10 tasks = 1 💎)`;
    } else if (totalCompleted >= 600) {
      level = 4;
      progressPercent = Math.min(100, Math.floor(((totalCompleted - 600) / 200) * 100));
      levelSubText = `💎 Level 4 • ${800 - totalCompleted} tasks to unlock Level 5 (10 tasks = 1 💎)`;
    } else if (totalCompleted >= 400) {
      level = 3;
      progressPercent = Math.min(100, Math.floor(((totalCompleted - 400) / 200) * 100));
      levelSubText = `🔥 Level 3 • ${600 - totalCompleted} tasks to unlock Level 4 (10 tasks = 1 💎)`;
    } else {
      level = 2;
      progressPercent = Math.min(100, Math.floor(((totalCompleted - 200) / 200) * 100));
      levelSubText = `⚡ Level 2 • ${400 - totalCompleted} tasks to unlock Level 3 (10 tasks = 1 💎)`;
    }
  }

  const levelTitles = {
    1: 'Novice',
    2: 'Hunter',
    3: 'Specialist',
    4: 'Pro',
    5: 'Elite',
    6: 'Crown Legend'
  };

  const levelIcons = {
    1: '⭐',
    2: '⚡',
    3: '🔥',
    4: '💎',
    5: '🏆',
    6: '👑'
  };

  return {
    level,
    totalCompleted,
    userDiamonds,
    isLevel2Unlocked: lvl2Unlocked,
    progressPercent,
    levelSubText,
    title: levelTitles[level] || 'Novice',
    icon: levelIcons[level] || '⭐'
  };
}
window.getPlayerLevelInfo = getPlayerLevelInfo;

function getSelectedLevelTab() {
  const levelCard = document.getElementById('playerLevelCard');
  if (!levelCard) return 6; // Level tab removed: default to All tasks (level 6)
  const pInfo = getPlayerLevelInfo();
  let stored = parseInt(localStorage.getItem('task_selected_level_tab') || '0', 10);
  if (!stored || stored < 1 || stored > 6) {
    stored = pInfo.level;
    localStorage.setItem('task_selected_level_tab', stored.toString());
  }
  return stored;
}

function switchLevelTab(lvl) {
  lvl = parseInt(lvl, 10);
  if (isNaN(lvl) || lvl < 1 || lvl > 6) lvl = 1;
  localStorage.setItem('task_selected_level_tab', lvl.toString());
  renderTasks();
}
window.switchLevelTab = switchLevelTab;

function isTaskShop(t) {
  if (!t) return false;
  return t.category === 'shop_task' || t.isShopTask === true || (t.title && t.title.toLowerCase().includes('shop task'));
}
window.isTaskShop = isTaskShop;

function isTaskArticle(t) {
  if (!t) return false;
  return t.category === 'article' || t.isArticleTask === true || (t.title && (t.title.toLowerCase().includes('article') || t.title.toLowerCase().includes('paragraph') || t.title.toLowerCase().includes('read')));
}
window.isTaskArticle = isTaskArticle;

// Dynamic Task Rendering with Level Filtering & Open / Verify & Simple/Premium Filtering & Daily VIP Task Limits
function renderTasks() {
  if (typeof updateTaskPassUI === 'function') updateTaskPassUI();
  const container = document.getElementById('tasksList');
  if (!container) return;

  const activeTab = localStorage.getItem('task_active_tab') || 'simple';
  const playerInfo = getPlayerLevelInfo();
  const selectedLevel = getSelectedLevelTab();

  const isVipActive = hasActivePremiumSubscription();
  const daysLeft = getRemainingVipDays();
  const dailyLimit = getVipDailyTaskLimit();
  const completedToday = getTodayCompletedPremiumTasksCount();
  const remainingToday = Math.max(0, dailyLimit - completedToday);
  const limitReached = isVipActive && (completedToday >= dailyLimit);

  const tasks = getStoredTasks();
  const completedTasks = getStoredCompletedTasks();
  const claims = getStoredClaims();

  // Active uncompleted tasks only (completed tasks are removed/hidden)
  // Also filter expired event tasks: if eventEndTime has passed, event is OFF and hidden from home page!
  const now = Date.now();
  const activeTasks = tasks.filter(t => {
    if (!t || t.active === false) return false;
    if (completedTasks && completedTasks[t.id]) return false;
    if (claims && claims[t.id]) return false;

    if (t.eventEndTime && now > t.eventEndTime) {
      return false; // Limited-time event expired -> off -> hide!
    }

    return true;
  });

  // Separate Coin Tasks vs Star Tasks vs Pro Tasks
  const simpleTasks = activeTasks.filter(t => (t.category === 'simple' || t.category === 'coin' || t.category === 'article' || (!t.category && !isTaskShop(t))) && t.category !== 'pro' && t.category !== 'elite' && t.category !== 'event');
  const allPremiumTasks = activeTasks.filter(t => t.category === 'premium' || t.category === 'star' || isTaskShop(t));
  const allProTasks = activeTasks.filter(t => t.category === 'pro' || t.category === 'elite' || t.category === 'event');

  // Hub counter badges & dynamic indicators
  const simpleBadge = document.getElementById('simpleTasksCount');
  const premiumBadge = document.getElementById('premiumTasksCount');
  const proBadge = document.getElementById('proTasksCount');
  if (simpleBadge) simpleBadge.textContent = simpleTasks.length;
  if (premiumBadge) premiumBadge.textContent = allPremiumTasks.length;
  if (proBadge) proBadge.textContent = allProTasks.length;

  const vipStatusPill = document.getElementById('hubCardVipStatus');
  if (vipStatusPill) {
    if (isVipActive) {
      vipStatusPill.textContent = `👑 VIP Active (${daysLeft}d)`;
      vipStatusPill.style.background = 'rgba(16, 185, 129, 0.25)';
      vipStatusPill.style.color = '#34d399';
    } else {
      vipStatusPill.textContent = '👑 VIP';
      vipStatusPill.style.background = 'rgba(234, 179, 8, 0.2)';
      vipStatusPill.style.color = '#facc15';
    }
  }

  const proTimerBadge = document.getElementById('hubProTimerBadge');
  const hubCardPro = document.getElementById('hubCardPro');
  let proSettings = null;
  try {
    const rawPro = localStorage.getItem('task_game_pro_event_settings');
    if (rawPro) proSettings = JSON.parse(rawPro);
  } catch (e) {}

  const isProEventActive = proSettings ? (proSettings.active !== false) : true;
  if (hubCardPro) {
    if (!isProEventActive) {
      hubCardPro.style.display = 'none';
    } else {
      hubCardPro.style.display = 'flex';
    }
  }

  if (proTimerBadge) {
    if (!isProEventActive) {
      proTimerBadge.textContent = 'Ended';
    } else if (proSettings && proSettings.durationHours) {
      proTimerBadge.textContent = `⏱️ ${proSettings.durationHours}h`;
    } else {
      const globalEvt = (typeof getUniversalGlobalLeaderboardEvent === 'function') ? getUniversalGlobalLeaderboardEvent() : null;
      if (globalEvt && globalEvt.endTime && globalEvt.endTime > Date.now()) {
        const msLeft = globalEvt.endTime - Date.now();
        const hrs = Math.floor(msLeft / (1000 * 60 * 60));
        const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
        proTimerBadge.textContent = `⏱️ ${hrs}h ${mins}m`;
      } else {
        proTimerBadge.textContent = '⏱️ Event';
      }
    }
  }

  // Active mode tasks collection
  let currentModeTasks = simpleTasks;
  if (activeTab === 'premium') {
    currentModeTasks = allPremiumTasks;
  } else if (activeTab === 'pro' || activeTab === 'event') {
    currentModeTasks = allProTasks;
  } else if (activeTab === 'all') {
    currentModeTasks = activeTasks;
  }

  const currentList = [...currentModeTasks].sort((a, b) => {
    const timeA = a.createdAt || parseInt(String(a.id || '').replace(/\D/g, '').slice(0, 13), 10) || 0;
    const timeB = b.createdAt || parseInt(String(b.id || '').replace(/\D/g, '').slice(0, 13), 10) || 0;
    if (timeA !== timeB && timeA && timeB) return timeA - timeB;
    return tasks.indexOf(a) - tasks.indexOf(b);
  });

  // Banner Container per Category
  let statusBarHtml = '';
  if (activeTab === 'premium') {
    if (!isVipActive) {
      statusBarHtml = `
        <div class="vip-pass-promo-card">
          <div class="vip-promo-title">
            <span>👑</span> Star Tasks VIP Pass
          </div>
          <div class="vip-promo-desc">
            Unlock exclusive high-bounty Star tasks, earn Stars daily to redeem real rewards! Choose a 15, 30, or 90-day plan.
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="vip-promo-btn" onclick="openSubscriptionModal()">
              ⚡ Unlock VIP Pass ↗
            </button>
            <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">Includes 5 Daily Tasks</span>
          </div>
        </div>
      `;
    } else {
      statusBarHtml = `
        <div class="vip-active-status-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 6px;">
            <div style="color: #facc15; font-weight: 900; font-size: 0.88rem; display: flex; align-items: center; gap: 5px;">
              <span>👑</span> VIP ACTIVE • ${daysLeft} Days Remaining
            </div>
            <button type="button" class="btn-watch-ad-unlock" onclick="watchAdForExtraTasks()">
              📺 Watch Ad (+5 Tasks)
            </button>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: #94a3b8; font-weight: 700;">
            <span>⚡ Daily Tasks: <b style="color: #ffffff;">${completedToday} / ${dailyLimit}</b> Used</span>
            <span style="color: #38bdf8;">${remainingToday} Tasks Left Today</span>
          </div>
        </div>
      `;
    }
  } else if (activeTab === 'pro' || activeTab === 'event') {
    statusBarHtml = `
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%); border: 1.5px solid rgba(52, 211, 153, 0.4); border-radius: 14px; padding: 0.85rem 1rem; margin-bottom: 0.95rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
        <div>
          <div style="color: #34d399; font-weight: 900; font-size: 0.9rem; display: flex; align-items: center; gap: 5px;">
            <span>💎</span> Pro Elite &amp; Event Missions
          </div>
          <div style="color: #94a3b8; font-size: 0.72rem; margin-top: 2px;">
            Complete 3-task packs: Win 50% half price on 1st task, and full total price on all 3!
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <span style="font-size: 0.7rem; font-weight: 800; color: #34d399; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); padding: 3px 8px; border-radius: 999px; white-space: nowrap;">
            ⏱️ Event Active
          </span>
        </div>
      </div>
    `;
  }

  const completedCount = parseInt(localStorage.getItem('task_game_total_tasks_completed') || '0', 10);

  if (currentList.length === 0) {
    container.innerHTML = statusBarHtml + `
      <div style="text-align: center; padding: 2.5rem 1rem; background: rgba(15, 23, 42, 0.6); border: 1.5px dashed rgba(56, 189, 248, 0.3); border-radius: 16px;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎯</div>
        <div style="color: #ffffff; font-weight: 800; font-size: 1rem;">All Missions Completed!</div>
        <div style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.35rem;">Check back soon or explore other categories.</div>
      </div>
    `;
    return;
  }

  // Render One-Line Sleek Task Bar (1, 2, 3 -> 4 Number Badge & Open / Verify Buttons in One Line)
  container.innerHTML = statusBarHtml + currentList.map((task, idx) => {
    const taskNumber = idx + 1; // 1, 2, 3... in one line
    const taskShop = isTaskShop(task);
    const taskArticle = isTaskArticle(task);
    const isPro = task.category === 'pro' || task.category === 'elite' || task.category === 'event';
    const isPremium = (task.category === 'premium' || taskShop) && !isPro;
    const taskLevel = parseInt(task.level || 1, 10);
    const rewardCoins = Number(task.rewardCoins || task.reward || task.coins || (isPro ? 1000 : (isPremium ? 200 : (taskArticle ? 75 : 50))));

    // Dual Unlock Check (Coin Cost or Ticket Cost)
    const coinCost = Math.max(0, parseInt(task.coinCost || 0, 10));
    const ticketCost = Math.max(0, parseInt(task.ticketCost || 0, 10));
    const hasUnlockCost = (coinCost > 0 || ticketCost > 0);
    const isUnlocked = (!hasUnlockCost) || isTaskUnlocked(task.id);

    let btnHtml = '';
    if (isPremium && !isVipActive) {
      btnHtml = `<button type="button" class="btn-claim btn-task-open" onclick="openSubscriptionModal()" style="padding: 0.45rem 0.85rem; font-size: 0.78rem; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; font-weight: 900; white-space: nowrap; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35); border-radius: 8px;">👑 VIP Lock</button>`;
    } else if (isPremium && limitReached) {
      btnHtml = `<button type="button" class="btn-claim btn-task-limit" onclick="watchAdForExtraTasks()" style="background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%); color: #000; font-weight: 900; font-size: 0.75rem; border: none; cursor: pointer; white-space: nowrap; box-shadow: 0 3px 12px rgba(245, 158, 11, 0.4); border-radius: 8px;">📺 Watch Ad (+5)</button>`;
    } else if (!isUnlocked) {
      const unlockText = (coinCost > 0 && ticketCost > 0)
        ? `🔒 Unlock (🪙${coinCost}/🎟️${ticketCost})`
        : (coinCost > 0 ? `🔒 Unlock (🪙 ${coinCost})` : `🔒 Unlock (🎟️ ${ticketCost})`);
      btnHtml = `<button type="button" class="btn-claim btn-task-unlock" onclick="openTaskUnlockModal('${task.id}')" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #ffffff; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.45); cursor: pointer; white-space: nowrap; font-size: 0.75rem; padding: 0.45rem 0.75rem; border-radius: 8px;">${unlockText}</button>`;
    } else {
      const openBtnText = taskArticle ? '↗ Read' : '↗ Open';
      btnHtml = `
        <div style="display: flex; gap: 6px; align-items: center;">
          <button type="button" class="btn-claim btn-task-open" onclick="handleOpenTask('${task.id}')" style="padding: 0.45rem 0.75rem; font-size: 0.78rem; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); white-space: nowrap; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35); font-weight: 800; border-radius: 8px;">${openBtnText}</button>
          <button type="button" class="btn-claim btn-task-verify" onclick="openVerifyModal('${task.id}')" style="padding: 0.45rem 0.75rem; font-size: 0.78rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); white-space: nowrap; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); font-weight: 800; border-radius: 8px;">✓ Verify</button>
        </div>
      `;
    }

    let cardClass = isPro ? 'task-card task-card-pro' : (isPremium ? 'task-card task-card-premium' : 'task-card');
    if (!isUnlocked) cardClass += ' task-card-locked';

    const numBadgeStyle = isPro
      ? 'background: rgba(16, 185, 129, 0.25); border: 1.5px solid #34d399; color: #34d399;'
      : (isPremium
        ? 'background: rgba(168, 85, 247, 0.25); border: 1.5px solid #c084fc; color: #facc15;'
        : 'background: rgba(56, 189, 248, 0.25); border: 1.5px solid #38bdf8; color: #38bdf8;');

    const halfRewardNotice = isPro ? `<span style="font-size: 0.65rem; color: #34d399; font-weight: 800; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(52, 211, 153, 0.35); padding: 1px 5px; border-radius: 4px;">Half ${Math.floor(rewardCoins/2)} on 1st</span>` : '';

    return `
      <div class="${cardClass}" id="taskCard_${task.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0.95rem; gap: 0.75rem; border-radius: 14px; margin-bottom: 0.65rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
          <!-- Left Number Badge (1, 2, 3 -> 4) -->
          <div class="task-num-badge" style="width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.05rem; flex-shrink: 0; box-shadow: 0 0 10px rgba(0, 0, 0, 0.4); ${numBadgeStyle}">
            ${taskNumber}
          </div>
          <!-- Center Task Details in One Line -->
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-weight: 800; color: #ffffff; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;" title="${escapeHtml(task.title || 'Mission')}">${escapeHtml(task.title || 'Mission')}</span>
              <span class="task-status-pill ready" style="font-size: 0.7rem; font-weight: 800; padding: 2px 6px;">🪙 ${rewardCoins}</span>
              ${halfRewardNotice}
            </div>
          </div>
        </div>
        <!-- Right Action (Open and Verify Buttons in One Line) -->
        <div class="task-action-wrap" id="action_${task.id}" style="flex-shrink: 0;">
          ${btnHtml}
        </div>
      </div>
    `;
  }).join('');
}
function getWebsiteFaviconUrl(url) {
  try {
    if (!url) return null;
    let fullUrl = url.trim();
    if (!/^https?:\/\//i.test(fullUrl)) fullUrl = 'https://' + fullUrl;
    const domain = new URL(fullUrl).hostname;
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return null;
  }
}

function getUnlockedTasks() {
  try {
    return JSON.parse(localStorage.getItem('task_unlocked_tasks') || '{}');
  } catch (e) {
    return {};
  }
}

function isTaskUnlocked(taskId) {
  if (!taskId) return true;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return true;
  const costTicket = Math.max(0, parseInt(task.ticketCost || 0, 10));
  const costCoin = Math.max(0, parseInt(task.coinCost || 0, 10));
  if (costTicket <= 0 && costCoin <= 0) return true;
  const unlocked = getUnlockedTasks();
  return !!unlocked[taskId];
}

let currentUnlockTaskId = null;

window.openTaskUnlockModal = function(taskId) {
  currentUnlockTaskId = taskId;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const cost = Math.max(0, parseInt(task.ticketCost || 0, 10));
  const userTickets = parseInt(localStorage.getItem('task_user_tickets') || localStorage.getItem('user_tickets') || '0', 10) || 0;

  const modal = document.getElementById('taskUnlockModalOverlay');
  const titleEl = document.getElementById('unlockModalTaskTitle');
  const rewardEl = document.getElementById('unlockModalTaskReward');
  const costEl = document.getElementById('unlockModalTicketCostText');
  const balanceEl = document.getElementById('unlockModalUserTicketsText');
  const alertEl = document.getElementById('unlockModalAlertMsg');
  const confirmBtn = document.getElementById('btnConfirmUnlockTask');

  if (titleEl) titleEl.textContent = task.title || 'Webtask Mission';
  if (rewardEl) {
    const rew = task.rewardCoins || task.reward || task.coins || 50;
    rewardEl.textContent = `🪙 +${rew} Coins Bounty`;
  }
  if (costEl) costEl.textContent = `🎟️ ${cost} Tickets`;
  if (balanceEl) balanceEl.textContent = `🎟️ ${userTickets.toLocaleString()}`;

  if (userTickets >= cost) {
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = 'rgba(52, 211, 153, 0.12)';
      alertEl.style.color = '#34d399';
      alertEl.style.border = '1px solid rgba(52, 211, 153, 0.3)';
      alertEl.textContent = `✓ You have enough tickets to unlock this mission!`;
    }
    if (confirmBtn) {
      confirmBtn.style.display = 'inline-block';
      confirmBtn.innerHTML = `🎟️ Unlock with ${cost} Tickets`;
      confirmBtn.onclick = function() { confirmUnlockTask(); };
      confirmBtn.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
      confirmBtn.style.color = '#ffffff';
    }
  } else {
    const diff = cost - userTickets;
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = 'rgba(239, 68, 68, 0.12)';
      alertEl.style.color = '#f87171';
      alertEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      alertEl.textContent = `⚠️ You need ${diff} more ticket${diff === 1 ? '' : 's'}! Claim free tickets daily from Daily Streak.`;
    }
    if (confirmBtn) {
      confirmBtn.style.display = 'inline-block';
      confirmBtn.innerHTML = `🔥 Claim in Daily Streak`;
      confirmBtn.onclick = function() {
        closeTaskUnlockModal();
        if (typeof openDailyStreakModal === 'function') openDailyStreakModal();
      };
      confirmBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      confirmBtn.style.color = '#000000';
    }
  }

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }
};

window.closeTaskUnlockModal = function() {
  const modal = document.getElementById('taskUnlockModalOverlay');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
};

window.handleUnlockModalBackdropClick = function(e) {
  if (e.target && e.target.id === 'taskUnlockModalOverlay') {
    closeTaskUnlockModal();
  }
};

window.confirmUnlockTask = function() {
  if (!currentUnlockTaskId) return;
  const taskId = currentUnlockTaskId;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const cost = Math.max(0, parseInt(task.ticketCost || 0, 10));
  const currentTickets = parseInt(localStorage.getItem('task_user_tickets') || localStorage.getItem('user_tickets') || '0', 10) || 0;

  if (currentTickets < cost) {
    if (typeof showToast === 'function') showToast(`Need ${cost} tickets to unlock!`, 'warning');
    else alert(`Need ${cost} tickets to unlock!`);
    return;
  }

  // Deduct tickets
  const newTickets = currentTickets - cost;
  localStorage.setItem('task_user_tickets', newTickets.toString());
  localStorage.setItem('user_tickets', newTickets.toString());

  // Save unlocked state
  let unlockedMap = getUnlockedTasks();
  unlockedMap[taskId] = true;
  localStorage.setItem('task_unlocked_tasks', JSON.stringify(unlockedMap));

  closeTaskUnlockModal();

  if (typeof showToast === 'function') {
    showToast(`🎉 Mission unlocked with ${cost} tickets!`, 'success');
  }

  if (typeof updateDailyStreakHeaderDisplays === 'function') {
    updateDailyStreakHeaderDisplays();
  }

  // Sync across tabs
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'TASK_UNLOCKED', taskId, cost, newTickets });
  } catch (e) {}

  renderTasks();
};

window.isTaskUnlocked = isTaskUnlocked;
window.getWebsiteFaviconUrl = getWebsiteFaviconUrl;

let currentVerifyTaskId = null;

// Open Verify Modal directly
window.openVerifyModal = function(taskId) {
  currentVerifyTaskId = taskId;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    const cost = Math.max(0, parseInt(task.ticketCost || 0, 10));
    if (cost > 0 && !isTaskUnlocked(taskId)) {
      openTaskUnlockModal(taskId);
      return;
    }

    const titleEl = document.getElementById('verifyModalTaskTitle');
    const descEl = document.getElementById('verifyModalTaskDesc');
    const iconEl = document.getElementById('verifyModalTaskIcon');
    const rewardEl = document.getElementById('verifyModalRewardHighlight');
    const linkBtn = document.getElementById('verifyModalLinkBtn');
    const badgeText = document.getElementById('verifyModalHeaderBadgeText');
    const taskShop = isTaskShop(task);
    const taskArticle = isTaskArticle(task);
    const isPremium = task.category === 'premium' || taskShop;
    const rewardCoins = Number(task.rewardCoins || task.reward || task.coins || (isPremium ? 200 : (taskArticle ? 75 : 50)));

    if (titleEl) titleEl.textContent = task.title || 'Webtask Mission';
    if (descEl) descEl.textContent = task.description || (taskArticle ? 'Read a few short paragraphs on the page to find the 6-digit code' : 'Visit link & get code from admin');
    if (iconEl) iconEl.textContent = task.icon || (taskArticle ? '📰' : (isPremium ? '💎' : '⚡'));
    if (rewardEl) rewardEl.textContent = `+${rewardCoins} 🪙`;
    if (linkBtn) {
      linkBtn.href = task.link || task.url || '#';
      linkBtn.textContent = taskArticle ? 'Read Article ↗' : 'Open ↗';
    }
    if (badgeText) {
      badgeText.textContent = taskArticle ? 'ARTICLE READING VERIFICATION' : 'WEBTASK VERIFICATION';
    }
  }

  const modal = document.getElementById('taskVerifyModalOverlay');
  const codeInput = document.getElementById('verifyCodeInput');
  const errorMsg = document.getElementById('verifyErrorMsg');
  if (codeInput) {
    codeInput.value = '';
    codeInput.classList.remove('input-error');
  }
  if (errorMsg) {
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
  }

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    setTimeout(() => {
      if (codeInput) codeInput.focus();
    }, 200);
  }
};

// Open Button Click: opens link in new tab, changes button to Verify, opens modal
window.handleOpenTask = function(taskId) {
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const cost = Math.max(0, parseInt(task.ticketCost || 0, 10));
  if (cost > 0 && !isTaskUnlocked(taskId)) {
    openTaskUnlockModal(taskId);
    return;
  }

  const taskShop = isTaskShop(task);
  const isPremium = task.category === 'premium' || taskShop;

  if (isPremium) {
    if (!hasActivePremiumSubscription()) {
      openSubscriptionModal();
      return;
    }
    const maxLevel = getVipMaxAllowedLevel();
    const taskLevel = parseInt(task.level || 1, 10);
    if (taskLevel > maxLevel) {
      alert(`🔒 Level ${taskLevel} Mission Locked!\n\nYour current VIP plan unlocks tasks up to Level ${maxLevel}.\nUpgrade your plan to unlock Level ${taskLevel} missions!`);
      openSubscriptionModal();
      return;
    }
    if (hasReachedDailyTaskLimit()) {
      handleDailyLimitReachedClick();
      return;
    }
  }

  setTaskOpened(taskId);
  if (task.url || task.link) {
    window.open(task.url || task.link, '_blank');
  }
  openVerifyModal(taskId);
  renderTasks();
};

window.closeVerifyModal = function() {
  const modal = document.getElementById('taskVerifyModalOverlay');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
  currentVerifyTaskId = null;
};

window.handleVerifyModalBackdropClick = function(e) {
  if (e.target && e.target.id === 'taskVerifyModalOverlay') {
    closeVerifyModal();
  }
};

window.handleVerifyCodeInput = function(input) {
  if (!input) return;
  input.value = input.value.replace(/[^0-9]/g, '').slice(0, 6);
  const errorMsg = document.getElementById('verifyErrorMsg');
  if (errorMsg) errorMsg.style.display = 'none';
  input.classList.remove('input-error');
};

window.submitTaskVerification = function(event) {
  if (event) event.preventDefault();

  if (!currentVerifyTaskId) return;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === currentVerifyTaskId);
  if (!task) return;

  const codeInput = document.getElementById('verifyCodeInput');
  const errorMsg = document.getElementById('verifyErrorMsg');
  const userCode = (codeInput ? codeInput.value : '').trim();

  const correctCode = String(task.verificationCode || task.code || task.secretCode || '').trim();

  if (!userCode || userCode.length !== 6 || !correctCode || userCode !== correctCode) {
    if (codeInput) {
      codeInput.classList.add('input-error');
      codeInput.focus();
    }
    if (errorMsg) {
      errorMsg.style.display = 'block';
      errorMsg.textContent = '❌ Invalid 6-digit code! Please enter the exact verification code set by Admin.';
    }
    return;
  }

  const taskShop = isTaskShop(task);
  const isPremium = task.category === 'premium' || taskShop;
  const rewardAmount = Number(task.rewardCoins || task.reward || task.coins || (isPremium ? 200 : 50));
  userCoins += rewardAmount;
  localStorage.setItem('task_game_coins', userCoins.toString());
  localStorage.setItem('user_coins', userCoins.toString());

  if (isPremium) {
    incrementTodayCompletedPremiumTasks();
  }

  let shopBonusMsg = '';
  if (taskShop) {
    const extAmount = parseInt(task.shopLimitExtension || task.limitExtension || 10, 10);
    const curBonus = parseInt(localStorage.getItem('task_game_shop_bonus_limit') || '0', 10);
    const newBonus = curBonus + extAmount;
    localStorage.setItem('task_game_shop_bonus_limit', newBonus.toString());
    shopBonusMsg = `\n🛒 Shop Buy Limit Extended by +${extAmount}! (Total Bonus: +${newBonus})`;

    try {
      const syncChannel = new BroadcastChannel('nova_task_sync');
      syncChannel.postMessage({ type: 'SHOP_LIMIT_EXTENDED', bonusLimit: newBonus, timestamp: Date.now() });
    } catch (e) {}
  }

  // Event Task Pack 3-Task Half Price Reward Logic
  const isEventTask = (task.category === 'pro' || task.category === 'event' || task.isEventTask);
  let eventMsg = '';
  if (isEventTask) {
    const packKey = 'event_pack_completed_count';
    let packCount = parseInt(localStorage.getItem(packKey) || '0', 10) + 1;
    localStorage.setItem(packKey, packCount.toString());

    if (packCount % 3 === 1) {
      // 1st of 3 completed -> Win Half Price (e.g. 500 out of 1000)
      const halfAmount = Math.floor(rewardAmount / 2);
      eventMsg = `\n🎉 1st Event Task Completed! Won Half Bounty: +${halfAmount} 🪙 Coins! (Complete remaining 2 to win full prize!)`;
    } else if (packCount % 3 === 0) {
      // All 3 completed -> Full Remaining Price Win
      const fullRemaining = Math.ceil(rewardAmount / 2);
      eventMsg = `\n🏆 3-Task Event Pack Finished! Won Remaining +${fullRemaining} 🪙 Coins! Total event price won!`;
    }
  }

  let completedCount = parseInt(localStorage.getItem('task_game_total_tasks_completed') || '0', 10) + 1;
  localStorage.setItem('task_game_total_tasks_completed', completedCount.toString());
  localStorage.setItem('completed_tasks_count', completedCount.toString());
  recordLeaderboardEventTask(completedCount);

  // Check Diamond Milestone: 10 tasks completed = 1 Diamond (💎) win
  let lastDiamondTaskCount = parseInt(localStorage.getItem('task_last_diamond_completed_count') || '0', 10);
  let diamondWonMsg = '';
  if (completedCount - lastDiamondTaskCount >= 10) {
    const diamondsWon = Math.floor((completedCount - lastDiamondTaskCount) / 10);
    lastDiamondTaskCount += diamondsWon * 10;
    localStorage.setItem('task_last_diamond_completed_count', lastDiamondTaskCount.toString());

    let curDiamonds = parseInt(localStorage.getItem('task_user_diamonds') || '0', 10);
    curDiamonds += diamondsWon;
    localStorage.setItem('task_user_diamonds', curDiamonds.toString());
    localStorage.setItem('user_diamonds', curDiamonds.toString());

    diamondWonMsg = `\n💎 +${diamondsWon} Diamond Won! (Total: ${curDiamonds} 💎)`;

    try {
      const bc = new BroadcastChannel('nova_task_sync');
      bc.postMessage({ type: 'DIAMOND_WON', diamondsWon, totalDiamonds: curDiamonds, timestamp: Date.now() });
    } catch (e) {}
  }

  markTaskCompleted(task.id);
  const passResult = (typeof advanceTaskPassProgress === 'function') ? advanceTaskPassProgress() : null;
  updateCoinDisplay();
  if (typeof triggerHeaderPillBounce === 'function') {
    triggerHeaderPillBounce('coinPill');
    if (passResult && passResult.reward && passResult.reward.type === 'stars') {
      triggerHeaderPillBounce('starPill');
    }
  }

  HomeAudio.playCoinClaim();
  const submitBtn = document.getElementById('btnVerifyConfirm');
  if (submitBtn) {
    let coinText = `+${rewardAmount} 🪙 Won!`;
    if (passResult && passResult.levelCompleted && passResult.reward) {
      coinText += ` + Pass Lvl ${passResult.completedLevel} (${passResult.reward.popText})!`;
    } else if (taskShop) {
      coinText += ' +Limit';
    }
    showFloatingCoin(submitBtn, coinText);
  }

  closeVerifyModal();

  if (passResult && passResult.levelCompleted && passResult.reward) {
    const passMsg = `\n🎉 Task Pass Level ${passResult.completedLevel} Completed!\nReward: ${passResult.reward.popText} Won!\nNow entering Level ${passResult.newLevel}!`;
    setTimeout(() => {
      alert(`🎉 Mission Verified!\n\n• Task Reward: +${rewardAmount} 🪙 Coins${shopBonusMsg}${diamondWonMsg}${eventMsg}${passMsg}`);
    }, 400);
  } else if (diamondWonMsg) {
    setTimeout(() => {
      alert(`🎉 10 Tasks Milestone Reached!\n\n${diamondWonMsg.trim()}`);
    }, 400);
  } else if (shopBonusMsg) {
    alert(`🎉 Mission Verified!\n\nYou earned +${rewardAmount} 🪙 Coins!${shopBonusMsg}\nYou can now purchase more items in the Shop!`);
  }

  const taskCard = document.getElementById(`taskCard_${task.id}`);
  if (taskCard) {
    taskCard.remove();
  }
  renderTasks();
};

const GLOBAL_EPOCH_ANCHOR = Date.UTC(2026, 9, 1, 0, 0, 0); // Oct 1, 2026 00:00:00 UTC
const THREE_MONTHS_HOURS = 2160; // 90 days
const THREE_MONTHS_MS = THREE_MONTHS_HOURS * 60 * 60 * 1000;

function getUniversalGlobalLeaderboardEvent() {
  const now = Date.now();

  try {
    if (localStorage.getItem('task_leaderboard_event_v1')) {
      localStorage.removeItem('task_leaderboard_event_v1');
    }
  } catch (e) {}

  let customEvt = null;
  try {
    const raw = localStorage.getItem('task_game_leaderboard_event');
    if (raw) customEvt = JSON.parse(raw);
  } catch (e) {}

  if (customEvt && customEvt.status === 'finished') {
    return customEvt;
  }

  if (customEvt && customEvt.isManualOverride && now < customEvt.endTime && customEvt.status === 'active') {
    return customEvt;
  }

  // Universal Global 3-Month Season (Identical for ALL users worldwide)
  const elapsed = Math.max(0, now - GLOBAL_EPOCH_ANCHOR);
  const seasonIndex = Math.floor(elapsed / THREE_MONTHS_MS);
  const seasonNumber = seasonIndex + 1;
  const startTime = GLOBAL_EPOCH_ANCHOR + (seasonIndex * THREE_MONTHS_MS);
  const endTime = startTime + THREE_MONTHS_MS;

  const globalEvt = {
    id: `global_season_${seasonNumber}`,
    seasonNumber: seasonNumber,
    name: `Season ${seasonNumber}: 3-Month Championship`,
    startTime: startTime,
    endTime: endTime,
    durationHours: THREE_MONTHS_HOURS,
    durationDays: THREE_MONTHS_DAYS,
    status: 'active',
    isGlobal: true
  };

  // Rollover check: If stored event is from an older season, reset task counters
  if (customEvt && (
    (customEvt.seasonNumber && customEvt.seasonNumber < seasonNumber) ||
    (customEvt.endTime && customEvt.endTime <= now)
  )) {
    try {
      localStorage.setItem('task_game_event_tasks_count', '0');
      const rawUsers = localStorage.getItem('task_game_users');
      if (rawUsers) {
        const uList = JSON.parse(rawUsers);
        if (Array.isArray(uList)) {
          uList.forEach(u => { u.eventTasks = 0; });
          localStorage.setItem('task_game_users', JSON.stringify(uList));
        }
      }
    } catch (e) {}
  }

  try {
    localStorage.setItem('task_game_leaderboard_event', JSON.stringify(globalEvt));
  } catch (e) {}

  return globalEvt;
}

function recordLeaderboardEventTask(totalTasks) {
  try {
    const now = Date.now();
    const evt = getUniversalGlobalLeaderboardEvent();

    if (evt.status === 'active' && now < evt.endTime) {
      // Task completion directly increments event tasks from task 1 (clean zero start)
      let eventTasks = parseInt(localStorage.getItem('task_game_event_tasks_count') || '0', 10) + 1;
      localStorage.setItem('task_game_event_tasks_count', eventTasks.toString());

      // Synchronize in task_game_users
      try {
        const rawUsers = localStorage.getItem('task_game_users');
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          const myName = localStorage.getItem('player_username') || 'Task Earner';
          const me = users.find(u => u.id === 'usr_1' || u.name === myName || u.name === 'Task Earner' || u.name === 'NovaEarner' || u.name === 'Player');
          if (me) {
            me.eventTasks = eventTasks;
            me.totalTasks = totalTasks;
            localStorage.setItem('task_game_users', JSON.stringify(users));
          }
        }
      } catch (e) {}

      // Broadcast to other tabs
      try {
        const bc = new BroadcastChannel('nova_task_sync');
        bc.postMessage({ type: 'EVENT_TASK_COUNT', count: eventTasks, totalTasks: totalTasks });
        bc.close();
      } catch (e) {}
    } else if (now >= evt.endTime) {
      // 3-Month Timer finished -> Rollover to next global 3-month season!
      localStorage.setItem('task_game_event_tasks_count', '0');

      // Remove old event data from user pool
      try {
        const rawUsers = localStorage.getItem('task_game_users');
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          if (Array.isArray(users)) {
            users.forEach(u => { u.eventTasks = 0; });
            localStorage.setItem('task_game_users', JSON.stringify(users));
          }
        }
      } catch (e) {}

      localStorage.removeItem('task_game_leaderboard_event');
      const nextEvt = getUniversalGlobalLeaderboardEvent();

      try {
        const bc = new BroadcastChannel('nova_task_sync');
        bc.postMessage({ type: 'EVENT_FINISHED', nextEvent: nextEvt, timestamp: now });
        bc.close();
      } catch (e) {}
    }
  } catch (err) {
    console.error('Leaderboard event counting error:', err);
  }
}

function updateLiveTimers() {
  // Tasks are permanently one-time completion per user ("never show second time in life").
  // Finished tasks are removed forever and never resurrected.
}

function initHomePage() {
  updateCoinDisplay();
  updateHomeEventTimer();
  renderTasks();

  // Start live countdown timer clock
  setInterval(updateLiveTimers, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePage);
} else {
  initHomePage();
}

// Real-Time Cross-Tab / Cross-Window Synchronization (Admin Edits -> Real-Time Player Screen Updates)
window.addEventListener('storage', (e) => {
  if (e.key === TASKS_STORAGE_KEY || e.key === SYNC_FLAG_KEY || e.key === CLAIMS_STORAGE_KEY || e.key === COMPLETED_TASKS_KEY || e.key === 'task_restore_flag' || e.key === 'admin_tasks' || e.key === 'task_game_pro_event_settings' || e.key === 'task_pass_config') {
    renderTasks();
    if (typeof updateTaskPassUI === 'function') updateTaskPassUI();
  }
  if (e.key === 'task_game_coins' || e.key === 'task_game_stars' || e.key === 'user_coins' || e.key === 'user_stars' || e.key === 'player_username' || e.key === 'player_avatar' || e.key === 'task_pass_level' || e.key === 'task_pass_total_completed' || e.key === 'completed_tasks_count') {
    updateCoinDisplay();
    if (typeof updateTaskPassUI === 'function') updateTaskPassUI();
  }
});

// BroadcastChannel for instant same-browser cross-window sync
try {
  const syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  syncChannel.onmessage = (msg) => {
    renderTasks();
    updateCoinDisplay();
    if (typeof updateTaskPassUI === 'function') updateTaskPassUI();
    if (msg && msg.data && msg.data.type === 'BALANCES_UPDATED') {
      if (typeof triggerHeaderPillBounce === 'function') {
        if (msg.data.coins !== undefined) triggerHeaderPillBounce('coinPill');
        if (msg.data.stars !== undefined) triggerHeaderPillBounce('starPill');
      }
    }
  };
} catch (e) {}

// When tab gains focus, refresh tasks and balances
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    renderTasks();
    updateCoinDisplay();
    if (typeof updateTaskPassUI === 'function') updateTaskPassUI();
  }
});

window.addEventListener('balance:changed', () => {
  updateCoinDisplay();
  if (typeof updateTaskPassUI === 'function') updateTaskPassUI();
});

window.addEventListener('balance:synced', () => {
  updateCoinDisplay();
  if (typeof updateTaskPassUI === 'function') updateTaskPassUI();
});

// Real-Time Cloud Tasks Listener from Firebase Firestore (Global Admin Missions Sync)
function setupCloudTasksListener() {
  const listener = (window.Firebase && window.Firebase.listenToCloudTasks) || window.listenToCloudTasks;
  if (typeof listener === 'function') {
    listener(() => {
      renderTasks();
    });
  }
}

window.addEventListener('firebase:ready', () => {
  setupCloudTasksListener();
  renderTasks();
});

if (window.listenToCloudTasks || (window.Firebase && window.Firebase.listenToCloudTasks)) {
  setupCloudTasksListener();
}

// Expose on window for Firebase Cloud Sync and Admin Real-Time Connection
window.renderTasks = renderTasks;
window.setupCloudTasksListener = setupCloudTasksListener;
window.getStoredTasks = getStoredTasks;
window.handleOpenTask = handleOpenTask;
window.openVerifyModal = openVerifyModal;
window.openTaskUnlockModal = openTaskUnlockModal;
window.closeTaskUnlockModal = closeTaskUnlockModal;
window.confirmUnlockTask = confirmUnlockTask;
window.isTaskUnlocked = isTaskUnlocked;
window.submitTaskVerification = submitTaskVerification;
window.isTaskShop = isTaskShop;
window.isTaskArticle = isTaskArticle;

// Sticky Task Controls Dynamic Header Offset Sync
function syncStickyTaskControlsTop() {
  const header = document.querySelector('.home-header');
  const controls = document.getElementById('stickyTaskControls');
  if (header && controls) {
    const h = header.offsetHeight || 61;
    controls.style.top = h + 'px';
  }
}
window.addEventListener('resize', syncStickyTaskControlsTop);
window.addEventListener('orientationchange', syncStickyTaskControlsTop);
window.addEventListener('load', syncStickyTaskControlsTop);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncStickyTaskControlsTop);
} else {
  syncStickyTaskControlsTop();
}
window.syncStickyTaskControlsTop = syncStickyTaskControlsTop;




// ============================================================================
// DEDICATED TASK CATEGORY PAGE NAVIGATION & REWARDED AD SYSTEM
// ============================================================================
window.openTaskCategoryPage = function(category) {
  currentTaskTab = category;
  localStorage.setItem('task_active_tab', category);

  const catParam = (category === 'simple' || category === 'coin') ? 'coin' : ((category === 'premium' || category === 'star') ? 'star' : 'pro');
  const isSubdir = window.location.pathname.includes('/frontend/page/');
  const targetUrl = isSubdir ? '../tasks/index.html?cat=' + catParam : 'frontend/page/tasks/index.html?cat=' + catParam;

  try {
    window.location.href = targetUrl;
    return;
  } catch(e) {
    console.warn("Navigation failed, using fallback:", e);
  }

  // Fallback in-page view
  const hub = document.getElementById('taskCategoryHub');
  const pageView = document.getElementById('taskCategoryPageView');
  const homeHeader = document.querySelector('.home-header') || document.querySelector('header');
  const belowMenu = document.getElementById('belowMenuBar');

  if (hub) hub.style.display = 'none';
  if (homeHeader) homeHeader.style.display = 'none';
  if (belowMenu) belowMenu.style.display = 'none';
  if (pageView) {
    pageView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderTasks();
};

window.closeTaskCategoryPage = function() {
  const hub = document.getElementById('taskCategoryHub');
  const pageView = document.getElementById('taskCategoryPageView');
  const homeHeader = document.querySelector('.home-header') || document.querySelector('header');
  const belowMenu = document.getElementById('belowMenuBar');

  if (pageView) pageView.style.display = 'none';
  if (hub) hub.style.display = 'flex';
  if (homeHeader) homeHeader.style.display = '';
  if (belowMenu) belowMenu.style.display = '';

  renderTasks();
};

let adTimerInterval = null;

window.watchAdForExtraTasks = function() {
  const modal = document.getElementById('rewardedAdModalOverlay');
  if (!modal) return;

  const claimBtn = document.getElementById('btnClaimAdReward');
  const countdownSec = document.getElementById('adCountdownSeconds');
  const progressFill = document.getElementById('adProgressFill');

  modal.style.display = 'flex';
  if (claimBtn) {
    claimBtn.disabled = true;
    claimBtn.style.cursor = 'not-allowed';
    claimBtn.style.background = 'rgba(250, 204, 21, 0.3)';
    claimBtn.style.color = '#94a3b8';
    claimBtn.textContent = '⏳ Watching Ad...';
  }
  if (progressFill) progressFill.style.width = '0%';

  let secondsLeft = 5;
  if (countdownSec) countdownSec.textContent = `${secondsLeft}s`;

  if (adTimerInterval) clearInterval(adTimerInterval);

  const startTime = Date.now();
  const totalDuration = 5000;

  adTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(100, (elapsed / totalDuration) * 100);
    if (progressFill) progressFill.style.width = `${progress}%`;

    const remainingSec = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
    if (countdownSec) countdownSec.textContent = `${remainingSec}s`;

    if (elapsed >= totalDuration) {
      clearInterval(adTimerInterval);
      if (countdownSec) countdownSec.textContent = 'Done! ✓';
      if (claimBtn) {
        claimBtn.disabled = false;
        claimBtn.style.cursor = 'pointer';
        claimBtn.style.background = 'linear-gradient(135deg, #facc15 0%, #f59e0b 55%, #d97706 100%)';
        claimBtn.style.color = '#000000';
        claimBtn.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.5)';
        claimBtn.textContent = '🎉 Claim +5 Extra Tasks!';
      }
    }
  }, 100);
};

window.finishRewardedAd = function() {
  const modal = document.getElementById('rewardedAdModalOverlay');
  if (modal) modal.style.display = 'none';

  const todayKey = new Date().toISOString().slice(0, 10);
  const extraKey = 'extra_vip_tasks_' + todayKey;
  const currentExtra = parseInt(localStorage.getItem(extraKey) || '0', 10);
  const newExtra = currentExtra + 5;
  localStorage.setItem(extraKey, newExtra.toString());

  try {
    if (typeof HomeAudio !== 'undefined' && HomeAudio.playSuccess) HomeAudio.playSuccess();
  } catch(e) {}

  alert('🎉 Rewarded Ad Completed!\n\n+5 Extra Star Task Unlocks added to your daily quota for today!');
  renderTasks();
};

window.openTaskUnlockModal = function(taskId) {
  currentUnlockTaskId = taskId;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const modal = document.getElementById('taskUnlockModalOverlay');
  const titleEl = document.getElementById('unlockModalTaskTitle');
  const rewardEl = document.getElementById('unlockModalTaskReward');
  const coinCostEl = document.getElementById('unlockModalCoinCostText');
  const ticketCostEl = document.getElementById('unlockModalTicketCostText');
  const userCoinsEl = document.getElementById('unlockModalUserCoinsText');
  const userTicketsEl = document.getElementById('unlockModalUserTicketsText');
  const btnUnlockCoins = document.getElementById('btnUnlockWithCoins');
  const btnUnlockTickets = document.getElementById('btnUnlockWithTickets');

  const coinCost = Math.max(0, parseInt(task.coinCost || 0, 10));
  const ticketCost = Math.max(0, parseInt(task.ticketCost || (coinCost === 0 ? 2 : 0), 10));

  const userCoins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  const userTickets = parseInt(localStorage.getItem('task_user_tickets') || localStorage.getItem('user_tickets') || '0', 10);

  if (titleEl) titleEl.textContent = task.title || 'Mission';
  if (rewardEl) {
    const rew = task.rewardCoins || task.reward || task.coins || 50;
    rewardEl.textContent = `🪙 +${rew} Coins Bounty`;
  }

  if (coinCostEl) coinCostEl.textContent = `🪙 ${coinCost} Coins`;
  if (ticketCostEl) ticketCostEl.textContent = `🎟️ ${ticketCost} Tickets`;
  if (userCoinsEl) userCoinsEl.textContent = `Balance: 🪙 ${userCoins.toLocaleString()}`;
  if (userTicketsEl) userTicketsEl.textContent = `Balance: 🎟️ ${userTickets.toLocaleString()}`;

  if (btnUnlockCoins) {
    btnUnlockCoins.disabled = (coinCost > 0 && userCoins < coinCost);
    btnUnlockCoins.style.opacity = (coinCost > 0 && userCoins < coinCost) ? '0.5' : '1';
  }
  if (btnUnlockTickets) {
    btnUnlockTickets.disabled = (ticketCost > 0 && userTickets < ticketCost);
    btnUnlockTickets.style.opacity = (ticketCost > 0 && userTickets < ticketCost) ? '0.5' : '1';
  }

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }
};

window.confirmUnlockTask = function(method) {
  if (!currentUnlockTaskId) return;
  const taskId = currentUnlockTaskId;
  const tasks = getStoredTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const coinCost = Math.max(0, parseInt(task.coinCost || 0, 10));
  const ticketCost = Math.max(0, parseInt(task.ticketCost || (coinCost === 0 ? 2 : 0), 10));

  let userCoins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
  let userTickets = parseInt(localStorage.getItem('task_user_tickets') || localStorage.getItem('user_tickets') || '0', 10);

  if (method === 'coins') {
    if (coinCost > 0 && userCoins < coinCost) {
      alert(`Insufficient coins! You need ${coinCost} coins to unlock.`);
      return;
    }
    userCoins -= coinCost;
    localStorage.setItem('task_game_coins', userCoins.toString());
    localStorage.setItem('user_coins', userCoins.toString());
  } else {
    if (ticketCost > 0 && userTickets < ticketCost) {
      alert(`Insufficient tickets! You need ${ticketCost} tickets to unlock.`);
      return;
    }
    userTickets -= ticketCost;
    localStorage.setItem('task_user_tickets', userTickets.toString());
    localStorage.setItem('user_tickets', userTickets.toString());
  }

  const unlockedMap = getUnlockedTasks();
  unlockedMap[taskId] = true;
  localStorage.setItem('task_unlocked_tasks', JSON.stringify(unlockedMap));

  try {
    if (typeof HomeAudio !== 'undefined' && HomeAudio.playSuccess) HomeAudio.playSuccess();
  } catch(e) {}

  alert(`🎉 Mission Unlocked!\n\nSuccessfully unlocked with ${method === 'coins' ? coinCost + ' Coins 🪙' : ticketCost + ' Tickets 🎟️'}!`);
  closeTaskUnlockModal();
  updateCoinDisplay();
  renderTasks();
};
