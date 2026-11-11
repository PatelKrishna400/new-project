/**
 * ============================================================================
 * DAILY STREAK REWARDS SYSTEM (7-DAY CALENDAR)
 * Day 1: 5 Tickets
 * Day 2: 8 Tickets
 * Day 3: 10 Tickets
 * Day 4: 15 Tickets
 * Day 5: 20 Tickets
 * Day 6: 25 Tickets
 * Day 7: 100 Coins + 20 Tickets
 * ============================================================================
 */

(function() {
  const STREAK_COUNT_KEY = 'task_daily_streak_count';
  const STREAK_LAST_DATE_KEY = 'task_daily_streak_last_date';
  const USER_TICKETS_KEY = 'task_user_tickets';
  const USER_COINS_KEY = 'task_game_coins';
  const USER_COINS_ALT_KEY = 'user_coins';

  const STREAK_REWARDS = [
    { day: 1, tickets: 5, coins: 0, label: '5 Tickets' },
    { day: 2, tickets: 8, coins: 0, label: '8 Tickets' },
    { day: 3, tickets: 10, coins: 0, label: '10 Tickets' },
    { day: 4, tickets: 15, coins: 0, label: '15 Tickets' },
    { day: 5, tickets: 20, coins: 0, label: '20 Tickets' },
    { day: 6, tickets: 25, coins: 0, label: '25 Tickets' },
    { day: 7, tickets: 20, coins: 100, label: '100 Coins + 20 Tickets' }
  ];

  function getStreakLocalDateString(offsetDays = 0) {
    const d = new Date();
    if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDailyStreakState() {
    const today = getStreakLocalDateString(0);
    const yesterday = getStreakLocalDateString(-1);
    const lastClaimDate = localStorage.getItem(STREAK_LAST_DATE_KEY) || '';
    let streakCount = parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0', 10);
    if (isNaN(streakCount) || streakCount < 0) streakCount = 0;

    let canClaimToday = false;
    let activeDay = 1;
    let isStreakBroken = false;
    let brokenStreakCount = streakCount;

    if (!lastClaimDate) {
      // First time player
      activeDay = 1;
      canClaimToday = true;
    } else if (lastClaimDate === today) {
      // Already claimed today
      canClaimToday = false;
      activeDay = streakCount || 1;
    } else if (lastClaimDate === yesterday) {
      // Consecutive streak! Next day unlocks
      let next = (streakCount % 7) + 1;
      activeDay = next;
      canClaimToday = true;
    } else {
      // Missed a day -> Streak was broken!
      isStreakBroken = true;
      activeDay = 1;
      canClaimToday = true;
    }

    let tickets = parseInt(localStorage.getItem(USER_TICKETS_KEY) || localStorage.getItem('user_tickets') || '0', 10);
    if (isNaN(tickets)) tickets = 0;

    return {
      today,
      lastClaimDate,
      streakCount,
      activeDay,
      canClaimToday,
      hasClaimedToday: (lastClaimDate === today),
      isStreakBroken,
      brokenStreakCount,
      tickets
    };
  }

  function ensureDailyStreakStyles() {
    if (document.getElementById('dailyStreakStyles')) return;
    const style = document.createElement('style');
    style.id = 'dailyStreakStyles';
    style.textContent = `
      .streak-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(249, 115, 22, 0.18) 100%);
        border: 1px solid rgba(249, 115, 22, 0.45);
        padding: 0.32rem 0.65rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 800;
        color: #fdba74;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        user-select: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      }
      .streak-pill:hover {
        border-color: #f97316;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35);
      }
      .streak-pill.has-claim {
        border-color: #fb923c;
        animation: streakPulseAnim 1.8s infinite ease-in-out;
      }
      @keyframes streakPulseAnim {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.6);
        }
        50% {
          box-shadow: 0 0 0 5px rgba(249, 115, 22, 0);
        }
      }
      .streak-badge-dot {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
        box-shadow: 0 0 6px #ef4444;
        border: 1.5px solid #060e24;
      }
      .streak-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(3, 7, 18, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .streak-modal-overlay.active {
        opacity: 1;
      }
      .streak-modal-card {
        background: linear-gradient(145deg, #0a1738 0%, #060e24 100%);
        border: 1.5px solid rgba(249, 115, 22, 0.4);
        border-radius: 20px;
        padding: 1.25rem;
        width: 100%;
        max-width: 380px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(249, 115, 22, 0.15);
        animation: streakSlideUpAnim 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        max-height: 90vh;
        overflow-y: auto;
        box-sizing: border-box;
      }
      @keyframes streakSlideUpAnim {
        from { transform: translateY(30px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      .streak-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.85rem;
      }
      .streak-fire-icon {
        font-size: 2rem;
        line-height: 1;
        filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.6));
      }
      .streak-modal-title {
        font-size: 1.15rem;
        font-weight: 900;
        color: #ffffff;
        margin: 0;
        line-height: 1.2;
      }
      .streak-modal-subtitle {
        font-size: 0.72rem;
        color: #94a3b8;
        margin: 2px 0 0 0;
      }
      .btn-close-streak {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #94a3b8;
        font-size: 0.9rem;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-close-streak:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border-color: #ef4444;
      }
      .streak-stats-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(56, 189, 248, 0.2);
        border-radius: 12px;
        padding: 0.6rem 0.9rem;
        margin-bottom: 0.85rem;
      }
      .streak-stat-label {
        display: block;
        font-size: 0.62rem;
        color: #94a3b8;
        font-weight: 800;
        letter-spacing: 0.05em;
      }
      .streak-stat-value {
        font-size: 0.95rem;
        font-weight: 900;
        color: #fdba74;
      }
      .streak-days-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.55rem;
        margin-bottom: 1rem;
      }
      .streak-day-card {
        background: rgba(15, 23, 42, 0.7);
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 0.65rem 0.4rem;
        text-align: center;
        position: relative;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .streak-day-card.day-7-card {
        grid-column: span 3;
        background: linear-gradient(135deg, rgba(234, 88, 12, 0.2) 0%, rgba(202, 138, 4, 0.25) 50%, rgba(15, 23, 42, 0.8) 100%);
        border-color: rgba(250, 204, 21, 0.5);
        padding: 0.75rem 0.85rem;
        flex-direction: row;
        justify-content: space-between;
        text-align: left;
      }
      .streak-day-card.claimed {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.4);
        opacity: 0.8;
      }
      .streak-day-card.today-ready {
        background: linear-gradient(145deg, rgba(249, 115, 22, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%);
        border-color: #f97316;
        box-shadow: 0 0 16px rgba(249, 115, 22, 0.35);
        transform: scale(1.02);
      }
      .streak-day-num {
        font-size: 0.65rem;
        font-weight: 800;
        color: #94a3b8;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }
      .streak-day-reward-ico {
        font-size: 1.4rem;
        line-height: 1;
        margin-bottom: 0.25rem;
      }
      .streak-day-reward-val {
        font-size: 0.76rem;
        font-weight: 900;
        color: #ffffff;
      }
      .streak-day-badge {
        font-size: 0.58rem;
        font-weight: 800;
        padding: 1px 6px;
        border-radius: 999px;
        margin-top: 0.3rem;
        display: inline-block;
      }
      .streak-day-badge.badge-claimed {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.4);
      }
      .streak-day-badge.badge-today {
        background: rgba(249, 115, 22, 0.25);
        color: #fb923c;
        border: 1px solid #f97316;
      }
      .streak-day-badge.badge-locked {
        background: rgba(255, 255, 255, 0.06);
        color: #64748b;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .btn-claim-streak {
        width: 100%;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 900;
        color: #ffffff;
        background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%);
        border: 1px solid #fb923c;
        box-shadow: 0 4px 18px rgba(249, 115, 22, 0.45);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-claim-streak:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 22px rgba(249, 115, 22, 0.6);
      }
      .btn-claim-streak:disabled {
        background: #1e293b;
        color: #64748b;
        border-color: #334155;
        box-shadow: none;
        cursor: not-allowed;
      }
      .streak-countdown-note {
        font-size: 0.72rem;
        color: #94a3b8;
        text-align: center;
        margin-top: 0.45rem;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDailyStreakModalInDOM() {
    ensureDailyStreakStyles();
    if (document.getElementById('dailyStreakModalOverlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'streak-modal-overlay';
    overlay.id = 'dailyStreakModalOverlay';
    overlay.onclick = handleDailyStreakModalBackdropClick;
    overlay.innerHTML = `
      <div class="streak-modal-card" onclick="event.stopPropagation()">
        <!-- Modal Header -->
        <div class="streak-modal-header">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="streak-fire-icon">🔥</div>
            <div>
              <h2 class="streak-modal-title">Daily Streak Rewards</h2>
              <p class="streak-modal-subtitle">Log in daily to claim free Tickets &amp; Coins!</p>
            </div>
          </div>
          <button type="button" class="btn-close-streak" onclick="closeDailyStreakModal()" title="Close">✕</button>
        </div>

        <!-- Streak Status & Ticket Balance Bar -->
        <div class="streak-stats-bar">
          <div class="streak-stat-item">
            <span class="streak-stat-label">CURRENT STREAK</span>
            <span class="streak-stat-value" id="modalStreakCountText">🔥 Day 1 of 7</span>
          </div>
          <div class="streak-stat-item" style="text-align: right;">
            <span class="streak-stat-label">TOTAL TICKETS</span>
            <span class="streak-stat-value" id="modalTicketsTotalText" style="color: #38bdf8;">🎟️ 0</span>
          </div>
        </div>

        <!-- Broken Streak Warning & Freeze / Restore Option -->
        <div id="streakBrokenBannerWrap"></div>

        <!-- 7 Days Grid -->
        <div class="streak-days-grid" id="streakDaysGrid">
          <!-- Injected dynamically by renderDailyStreakModalContent() -->
        </div>

        <!-- Bottom Claim Action Section -->
        <div class="streak-action-section">
          <div id="streakActionButtonsWrap" style="width: 100%;">
            <button type="button" class="btn-claim-streak" id="btnClaimDailyStreak" onclick="claimDailyStreakReward(false)">
              🎁 Claim Today's Reward
            </button>
          </div>
          <div class="streak-countdown-note" id="streakCountdownNote" style="display: none;">
            ⏰ Next reward unlocks tomorrow at midnight!
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function updateDailyStreakHeaderDisplays() {
    ensureDailyStreakStyles();
    const state = getDailyStreakState();

    const streakDisplays = document.querySelectorAll('#userStreakDisplay, .user-streak-display');
    streakDisplays.forEach(el => {
      el.textContent = `Day ${state.activeDay}`;
    });

    const streakPills = document.querySelectorAll('#streakPill, .streak-pill');
    streakPills.forEach(pill => {
      if (state.canClaimToday) {
        pill.classList.add('has-claim');
      } else {
        pill.classList.remove('has-claim');
      }
    });

    const dots = document.querySelectorAll('#streakNotificationDot, .streak-badge-dot');
    dots.forEach(dot => {
      dot.style.display = state.canClaimToday ? 'block' : 'none';
    });
  }

  function renderDailyStreakModalContent() {
    const state = getDailyStreakState();
    const grid = document.getElementById('streakDaysGrid');
    const modalStreakText = document.getElementById('modalStreakCountText');
    const modalTicketsText = document.getElementById('modalTicketsTotalText');
    const claimBtn = document.getElementById('btnClaimDailyStreak');
    const countdownNote = document.getElementById('streakCountdownNote');

    if (modalStreakText) {
      modalStreakText.textContent = `🔥 Day ${state.activeDay} of 7`;
    }
    if (modalTicketsText) {
      modalTicketsText.textContent = `🎟️ ${state.tickets.toLocaleString()}`;
    }

    if (grid) {
      grid.innerHTML = STREAK_REWARDS.map(r => {
        const isDay7 = r.day === 7;
        const isClaimed = (state.hasClaimedToday && r.day <= state.activeDay) || (state.canClaimToday && r.day < state.activeDay);
        const isTodayReady = state.canClaimToday && (r.day === state.activeDay);

        let cardClass = 'streak-day-card';
        if (isDay7) cardClass += ' day-7-card';
        if (isClaimed) cardClass += ' claimed';
        if (isTodayReady) cardClass += ' today-ready';

        let badgeHtml = '';
        if (isClaimed) {
          badgeHtml = `<span class="streak-day-badge badge-claimed">✓ Claimed</span>`;
        } else if (isTodayReady) {
          badgeHtml = `<span class="streak-day-badge badge-today">⭐ Ready!</span>`;
        } else {
          badgeHtml = `<span class="streak-day-badge badge-locked">🔒 Day ${r.day}</span>`;
        }

        if (isDay7) {
          return `
            <div class="${cardClass}">
              <div style="display:flex; align-items:center; gap:0.65rem;">
                <span style="font-size:1.8rem;">👑</span>
                <div>
                  <div style="font-size:0.68rem; font-weight:800; color:#facc15; letter-spacing:0.06em;">DAY 7 • GRAND PRIZE</div>
                  <div style="font-size:0.88rem; font-weight:900; color:#ffffff; margin-top:2px;">🪙 100 Coins + 🎟️ 20 Tickets</div>
                </div>
              </div>
              <div>${badgeHtml}</div>
            </div>
          `;
        }

        return `
          <div class="${cardClass}">
            <div class="streak-day-num">DAY ${r.day}</div>
            <div class="streak-day-reward-ico">🎟️</div>
            <div class="streak-day-reward-val">${r.tickets} Tickets</div>
            ${badgeHtml}
          </div>
        `;
      }).join('');
    }

    const brokenWrap = document.getElementById('streakBrokenBannerWrap');
    const actionWrap = document.getElementById('streakActionButtonsWrap');

    if (brokenWrap) {
      if (state.isStreakBroken && !state.hasClaimedToday) {
        brokenWrap.innerHTML = `
          <div class="streak-broken-banner" style="background: rgba(239, 68, 68, 0.14); border: 1.5px solid rgba(239, 68, 68, 0.45); border-radius: 14px; padding: 0.75rem 0.9rem; margin-bottom: 0.85rem; text-align: center;">
            <div style="font-weight: 800; color: #f87171; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
              <span>⚠️</span> Missed Yesterday's Streak (Was Day ${state.brokenStreakCount})!
            </div>
            <div style="font-size: 0.73rem; color: #cbd5e1; margin: 0.3rem auto 0.65rem; max-width: 330px; line-height: 1.35;">
              Streak break resets to Day 1 and penalizes <b>-10 Tasks</b> from your level progress. Save your streak using tickets!
            </div>
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
              <button type="button" onclick="restoreStreakWithTickets()" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #ffffff; font-weight: 800; padding: 0.45rem 0.9rem; border-radius: 10px; border: none; cursor: pointer; font-size: 0.78rem; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);">
                🛡️ Save Streak (🎟️ 200 Tickets)
              </button>
              <button type="button" onclick="acceptStreakResetWithPenalty()" style="background: rgba(255, 255, 255, 0.08); color: #94a3b8; font-weight: 700; padding: 0.45rem 0.75rem; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.15); cursor: pointer; font-size: 0.75rem;">
                Reset (-10 Tasks Penalty)
              </button>
            </div>
          </div>
        `;
      } else {
        brokenWrap.innerHTML = '';
      }
    }

    if (actionWrap) {
      if (state.canClaimToday) {
        const activeReward = STREAK_REWARDS.find(r => r.day === state.activeDay) || STREAK_REWARDS[0];
        actionWrap.innerHTML = `
          <div style="display: flex; gap: 8px; width: 100%;">
            <button type="button" class="btn-claim-streak" style="flex: 1; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);" onclick="claimDailyStreakReward(false)">
              🎁 Collect (🎟️ ${activeReward.tickets})
            </button>
            <button type="button" class="btn-claim-streak" style="flex: 1.25; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);" onclick="claimDailyStreakReward(true)">
              📺 2X Double (🎟️ ${activeReward.tickets * 2})
            </button>
          </div>
        `;
        if (countdownNote) countdownNote.style.display = 'none';
      } else {
        actionWrap.innerHTML = `
          <button type="button" class="btn-claim-streak" disabled style="opacity: 0.65; cursor: not-allowed; width: 100%;">
            ✓ Claimed Today (Day ${state.activeDay})
          </button>
        `;
        if (countdownNote) {
          countdownNote.style.display = 'block';
          countdownNote.textContent = '⏰ Next streak reward unlocks tomorrow at midnight!';
        }
      }
    } else if (claimBtn) {
      if (state.canClaimToday) {
        const activeReward = STREAK_REWARDS.find(r => r.day === state.activeDay) || STREAK_REWARDS[0];
        claimBtn.disabled = false;
        claimBtn.innerHTML = `🎁 Claim Day ${state.activeDay} Reward (${activeReward.label})`;
        if (countdownNote) countdownNote.style.display = 'none';
      } else {
        claimBtn.disabled = true;
        claimBtn.innerHTML = `✓ Claimed Today (Day ${state.activeDay})`;
        if (countdownNote) {
          countdownNote.style.display = 'block';
          countdownNote.textContent = '⏰ Next streak reward unlocks tomorrow at midnight!';
        }
      }
    }
  }

  function showQuickAdSimulation(onComplete) {
    if (typeof document === 'undefined') {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    const adBox = document.createElement('div');
    adBox.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; text-align:center; padding:1.5rem;';
    adBox.innerHTML = `
      <div style="font-size:3rem; margin-bottom:1rem; animation: pulse 1s infinite;">📺</div>
      <div style="font-size:1.2rem; font-weight:900; color:#38bdf8;">Watching Sponsored Ad for 2X Rewards</div>
      <div style="font-size:0.85rem; color:#94a3b8; margin:0.5rem 0 1.25rem;">Ad will complete in <span id="adCountdownVal" style="color:#facc15; font-weight:800; font-size:1.1rem;">2</span> seconds...</div>
      <div style="width:200px; height:6px; background:#1e293b; border-radius:999px; overflow:hidden;">
        <div id="adProgressBar" style="width:0%; height:100%; background:linear-gradient(90deg, #38bdf8, #ec4899); transition:width 2s linear;"></div>
      </div>
    `;
    document.body.appendChild(adBox);
    setTimeout(() => {
      const bar = document.getElementById('adProgressBar');
      if (bar) bar.style.width = '100%';
    }, 50);

    let sec = 2;
    const interval = setInterval(() => {
      sec--;
      const el = document.getElementById('adCountdownVal');
      if (el) el.textContent = sec.toString();
      if (sec <= 0) {
        clearInterval(interval);
        if (adBox && adBox.parentNode) adBox.parentNode.removeChild(adBox);
        if (typeof onComplete === 'function') onComplete();
      }
    }, 1000);
  }

  function restoreStreakWithTickets() {
    const state = getDailyStreakState();
    const currentTickets = parseInt(localStorage.getItem(USER_TICKETS_KEY) || localStorage.getItem('user_tickets') || '0', 10);
    if (currentTickets < 200) {
      const diff = 200 - currentTickets;
      const msg = `⚠️ You need 200 tickets to save your streak, but you only have ${currentTickets} tickets (need ${diff} more).`;
      if (typeof showToast === 'function') showToast(msg, 'warning');
      else alert(msg);
      return;
    }

    // Deduct 200 tickets
    const newTickets = currentTickets - 200;
    localStorage.setItem(USER_TICKETS_KEY, newTickets.toString());
    localStorage.setItem('user_tickets', newTickets.toString());

    // Restore streak: set lastClaimDate to yesterday so streak is continuous!
    const yesterday = getStreakLocalDateString(-1);
    localStorage.setItem(STREAK_LAST_DATE_KEY, yesterday);
    if (state.brokenStreakCount) {
      localStorage.setItem(STREAK_COUNT_KEY, state.brokenStreakCount.toString());
    }

    const okMsg = '🛡️ Streak Saved! 200 Tickets used. Consecutive streak continues with NO level penalty!';
    if (typeof showToast === 'function') showToast(okMsg, 'success');
    else alert(okMsg);

    updateDailyStreakHeaderDisplays();
    renderDailyStreakModalContent();
    if (typeof updateDisplays === 'function') updateDisplays();

    try {
      const bc = new BroadcastChannel('nova_task_sync');
      bc.postMessage({ type: 'STREAK_RESTORED', newTickets, timestamp: Date.now() });
    } catch(e) {}
  }

  function acceptStreakResetWithPenalty() {
    const today = getStreakLocalDateString(0);
    const penaltyDateKey = 'task_daily_streak_penalty_date';
    const lastPenaltyDate = localStorage.getItem(penaltyDateKey);

    // Apply -10 penalty to completed task count once per missed day
    if (lastPenaltyDate !== today) {
      let totalComp = parseInt(localStorage.getItem('task_game_total_tasks_completed') || localStorage.getItem('completed_tasks_count') || '0', 10);
      totalComp = Math.max(0, totalComp - 10);
      localStorage.setItem('task_game_total_tasks_completed', totalComp.toString());
      localStorage.setItem('completed_tasks_count', totalComp.toString());
      localStorage.setItem(penaltyDateKey, today);
    }

    // Reset streak count to 0
    localStorage.setItem(STREAK_COUNT_KEY, '0');
    // Set lastClaimDate to something old so activeDay is 1
    localStorage.setItem(STREAK_LAST_DATE_KEY, '2020-01-01');

    const warnMsg = '⚠️ Streak reset to Day 1. -10 Tasks penalty applied to level target.';
    if (typeof showToast === 'function') showToast(warnMsg, 'warning');
    else alert(warnMsg);

    updateDailyStreakHeaderDisplays();
    renderDailyStreakModalContent();
    if (typeof renderTasks === 'function') renderTasks();
    if (typeof updateDisplays === 'function') updateDisplays();

    try {
      const bc = new BroadcastChannel('nova_task_sync');
      bc.postMessage({ type: 'STREAK_RESET_PENALTY', timestamp: Date.now() });
    } catch(e) {}
  }

  function claimDailyStreakReward(isDouble = false) {
    const state = getDailyStreakState();
    if (!state.canClaimToday) {
      const alreadyMsg = "You have already claimed today's daily streak reward! Return tomorrow to claim the next day.";
      if (typeof showToast === 'function') showToast(alreadyMsg);
      else if (typeof alert === 'function') alert(alreadyMsg);
      else console.log(alreadyMsg);
      return;
    }

    const reward = STREAK_REWARDS.find(r => r.day === state.activeDay) || STREAK_REWARDS[0];

    const executeClaim = () => {
      // If user missed yesterday and didn't pay 200 tickets to freeze/save:
      if (state.isStreakBroken) {
        const penaltyDateKey = 'task_daily_streak_penalty_date';
        const lastPenaltyDate = localStorage.getItem(penaltyDateKey);
        if (lastPenaltyDate !== state.today) {
          let totalComp = parseInt(localStorage.getItem('task_game_total_tasks_completed') || localStorage.getItem('completed_tasks_count') || '0', 10);
          totalComp = Math.max(0, totalComp - 10);
          localStorage.setItem('task_game_total_tasks_completed', totalComp.toString());
          localStorage.setItem('completed_tasks_count', totalComp.toString());
          localStorage.setItem(penaltyDateKey, state.today);
        }
      }

      const multiplier = isDouble ? 2 : 1;
      const awardedTickets = reward.tickets * multiplier;
      const awardedCoins = (reward.coins || 0) * multiplier;

      // 1. Add tickets
      const currentTickets = parseInt(localStorage.getItem(USER_TICKETS_KEY) || '0', 10);
      const newTickets = currentTickets + awardedTickets;
      localStorage.setItem(USER_TICKETS_KEY, newTickets.toString());
      localStorage.setItem('user_tickets', newTickets.toString());

      // 2. Add coins if any (Day 7 gives 100 coins)
      if (awardedCoins > 0) {
        const currentCoins = parseInt(localStorage.getItem(USER_COINS_KEY) || '0', 10);
        const newCoins = currentCoins + awardedCoins;
        localStorage.setItem(USER_COINS_KEY, newCoins.toString());
        localStorage.setItem(USER_COINS_ALT_KEY, newCoins.toString());
        if (window.userCoins !== undefined) window.userCoins = newCoins;
      }

      // 3. Update streak count and claim date
      localStorage.setItem(STREAK_COUNT_KEY, state.activeDay.toString());
      localStorage.setItem(STREAK_LAST_DATE_KEY, state.today);

      // 4. Update local user profile / cloud sync if user is in usersData
      try {
        const rawUsers = localStorage.getItem('task_platform_users');
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          const currentUid = localStorage.getItem('player_uid') || 'usr_1';
          const u = users.find(x => x.id === currentUid);
          if (u) {
            u.tickets = newTickets;
            if (awardedCoins > 0) u.coins = (parseInt(u.coins || 0, 10)) + awardedCoins;
            localStorage.setItem('task_platform_users', JSON.stringify(users));
            if (window.Firebase && typeof window.Firebase.saveUserToCloud === 'function') {
              window.Firebase.saveUserToCloud(u).catch(() => {});
            }
          }
        }
      } catch(e) {}

      // 5. Broadcast to all open tabs
      try {
        const bc = new BroadcastChannel('nova_task_sync');
        bc.postMessage({ type: 'DAILY_STREAK_CLAIMED', day: state.activeDay, isDouble, tickets: newTickets, timestamp: Date.now() });
        bc.close();
      } catch(e) {}

      // 6. Update UI
      updateDailyStreakHeaderDisplays();
      renderDailyStreakModalContent();
      if (typeof renderTasks === 'function') renderTasks();
      if (typeof updateDisplays === 'function') updateDisplays();

      // 7. Toast / Celebration
      let msg = isDouble 
        ? `🎉 2X DOUBLE CLAIMED! +${awardedTickets} Tickets 🎟️ awarded!`
        : `🎉 Day ${state.activeDay} Claimed! +${awardedTickets} Tickets 🎟️`;
      if (awardedCoins > 0) {
        msg = isDouble
          ? `🎉 DAY 7 JACKPOT (2X)! +${awardedCoins} Coins 🪙 & +${awardedTickets} Tickets 🎟️`
          : `🎉 DAY 7 JACKPOT! +${awardedCoins} Coins 🪙 & +${awardedTickets} Tickets 🎟️`;
      }
      if (typeof showToast === 'function') {
        showToast(msg);
      } else if (typeof alert === 'function') {
        alert(msg);
      } else {
        console.log(msg);
      }
    };

    if (isDouble) {
      showQuickAdSimulation(executeClaim);
    } else {
      executeClaim();
    }
  }

  function openDailyStreakModal() {
    ensureDailyStreakModalInDOM();
    renderDailyStreakModalContent();
    const modal = document.getElementById('dailyStreakModalOverlay');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('active'), 10);
    }
  }

  function closeDailyStreakModal() {
    const modal = document.getElementById('dailyStreakModalOverlay');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => { modal.style.display = 'none'; }, 200);
    }
  }

  function handleDailyStreakModalBackdropClick(e) {
    if (e.target && e.target.id === 'dailyStreakModalOverlay') {
      closeDailyStreakModal();
    }
  }

  // Listen to broadcast sync
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.onmessage = function(ev) {
      if (ev.data && (ev.data.type === 'DAILY_STREAK_CLAIMED' || ev.data.type === 'TASK_UNLOCKED')) {
        updateDailyStreakHeaderDisplays();
        renderDailyStreakModalContent();
        if (typeof updateDisplays === 'function') updateDisplays();
      }
    };
  } catch(e) {}

  // Expose on window
  window.openDailyStreakModal = openDailyStreakModal;
  window.closeDailyStreakModal = closeDailyStreakModal;
  window.handleDailyStreakModalBackdropClick = handleDailyStreakModalBackdropClick;
  window.claimDailyStreakReward = claimDailyStreakReward;
  window.getDailyStreakState = getDailyStreakState;
  window.updateDailyStreakHeaderDisplays = updateDailyStreakHeaderDisplays;
  window.getUserTickets = function() {
    let tickets = parseInt(localStorage.getItem(USER_TICKETS_KEY) || localStorage.getItem('user_tickets') || '0', 10);
    return isNaN(tickets) ? 0 : tickets;
  };
  window.setUserTickets = function(count) {
    const val = Math.max(0, parseInt(count, 10) || 0);
    localStorage.setItem(USER_TICKETS_KEY, val.toString());
    localStorage.setItem('user_tickets', val.toString());
    updateDailyStreakHeaderDisplays();
    return val;
  };
  window.deductUserTickets = function(amount) {
    const current = window.getUserTickets();
    const cost = Math.max(0, parseInt(amount, 10) || 0);
    if (current < cost) return false;
    window.setUserTickets(current - cost);
    return true;
  };

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureDailyStreakStyles();
      updateDailyStreakHeaderDisplays();
    });
  } else {
    ensureDailyStreakStyles();
    updateDailyStreakHeaderDisplays();
  }
})();
