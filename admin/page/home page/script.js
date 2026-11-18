/**
 * ==========================================================================
 * NOVA MISSION CONTROL — COMPLETE ADMIN PORTAL JAVASCRIPT
 * Authentication • 4-Page SPA Navigation • Tasks • Withdrawals • Users
 * ==========================================================================
 */

// Storage Keys
const TASKS_STORAGE_KEY = 'task_game_tasks';
const CLAIMS_STORAGE_KEY = 'task_game_claims';
const WITHDRAW_STORAGE_KEY = 'task_game_withdrawals';
const LEADERBOARD_SESSIONS_KEY = 'task_game_leaderboard_sessions';
const LEADERBOARD_EVENT_KEY = 'task_game_leaderboard_event';
const USERS_STORAGE_KEY = 'task_game_users';
const ACTIVITY_STORAGE_KEY = 'task_admin_activities';
const SYNC_FLAG_KEY = 'task_game_sync_flag';
const SYNC_CHANNEL_NAME = 'nova_task_sync';

// Default tasks: zero start (no demo tasks)
const DEFAULT_TASKS = [];

// Clean zero start - No mock withdrawals or users
const DEFAULT_WITHDRAWALS = [];
const DEFAULT_USERS = [];

// State Variables
let tasksData = [];
let claimsData = {};
let withdrawalsData = [];
let usersData = [];
let sessionsData = [];
let adminEventTimerInterval = null;
let activityData = [];
let currentAdminPage = 'tasks';
let withdrawFilter = 'all';
let taskSearchFilter = '';
let withdrawSearchFilter = '';
let userSearchFilter = '';
let syncChannel = null;

// Initialize BroadcastChannel
try {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  syncChannel.onmessage = (event) => {
    loadAllStoredData();
    renderCurrentPage();
  };
} catch (e) {
  console.warn('BroadcastChannel not supported');
}

// Ads configuration removed);
    bc.close();
  } catch (err) {}

  // Open Ad URL
  window.open(url, '_blank', 'noopener,noreferrer');
  showAdminNotification('Ad Opened in New Tab', 'Opening ad in new tab...', 'info');
  renderAdsConfigPage();
}


// ============================================================================
// 10. EVENTS & LEADERBOARD SESSIONS MANAGEMENT (SESSION-WISE DATA STORE)
// ============================================================================

const THREE_MONTHS_HOURS = 2160;
const THREE_MONTHS_MS = THREE_MONTHS_HOURS * 60 * 60 * 1000;
const GLOBAL_EPOCH_ANCHOR = Date.UTC(2026, 9, 1, 0, 0, 0);

function getRankPrizeStars(rank) {
  if (rank === 1) return 10000;
  if (rank === 2) return 5000;
  if (rank >= 3 && rank <= 5) return 1000;
  if (rank >= 6 && rank <= 10) return 500;
  if (rank >= 11 && rank <= 20) return 100;
  return 0;
}

function getLeaderboardEventInfo() {
  const now = Date.now();

  // Purge legacy key if present
  try {
    if (localStorage.getItem('task_leaderboard_event_v1')) {
      localStorage.removeItem('task_leaderboard_event_v1');
    }
  } catch (e) {}

  let evt = null;
  try {
    const raw = localStorage.getItem(LEADERBOARD_EVENT_KEY);
    if (raw) evt = JSON.parse(raw);
  } catch (e) {}

  // If an event has finished, respect it
  if (evt && evt.status === 'finished') {
    return evt;
  }

  // If active manual override is still running
  if (evt && evt.isManualOverride && now < evt.endTime && evt.status === 'active') {
    return evt;
  }

  // Deterministic Universal Global 3-Month Season (Identical to Leaderboard rank page)
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

  try {
    localStorage.setItem(LEADERBOARD_EVENT_KEY, JSON.stringify(globalEvt));
  } catch (e) {}

  return globalEvt;
}

function formatEventCountdown(ms) {
  if (ms <= 0) return '00:00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startAdminEventsTimer() {
  if (adminEventTimerInterval) clearInterval(adminEventTimerInterval);

  function tick() {
    const evt = getLeaderboardEventInfo();
    const now = Date.now();
    const remaining = Math.max(0, evt.endTime - now);
    const elCountdown = document.getElementById('adminEventCountdownText');
    if (elCountdown) {
      elCountdown.textContent = formatEventCountdown(remaining);
    }
  }

  tick();
  adminEventTimerInterval = setInterval(tick, 1000);
}

function renderEventsAndSessionsPage() {
  const evt = getLeaderboardEventInfo();

  // 1. Overview cards
  const elTitle = document.getElementById('adminEventSeasonTitle');
  if (elTitle) elTitle.textContent = evt.name || `Season ${evt.seasonNumber || 1}`;

  const elSub = document.getElementById('adminEventDurationText');
  if (elSub) elSub.textContent = `Season ${evt.seasonNumber || 1} • 3-Month Championship`;

  startAdminEventsTimer();

  // 2. Qualified Contenders (Gate >= 100 tasks)
  const qualifiedContenders = usersData
    .filter(u => Number(u.totalTasks || 0) >= 100)
    .sort((a, b) => (Number(b.eventTasks || 0)) - (Number(a.eventTasks || 0)));

  const elQualCount = document.getElementById('adminEventQualifiedCount');
  if (elQualCount) elQualCount.textContent = qualifiedContenders.length.toString();

  const elTotalSessions = document.getElementById('adminTotalSessionsCount');
  if (elTotalSessions) elTotalSessions.textContent = sessionsData.length.toString();

  // 3. Render Live Standings Table
  const tbodyLive = document.getElementById('adminLiveEventStandingsTableBody');
  if (tbodyLive) {
    if (qualifiedContenders.length === 0) {
      tbodyLive.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">
            <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🎯</div>
            <div style="font-weight: 700;">No players have reached the 100-task qualification gate yet.</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Once a player completes 100 missions, their name enters the championship standings automatically.</div>
          </td>
        </tr>`;
    } else {
      tbodyLive.innerHTML = qualifiedContenders.map((u, idx) => {
        const rank = idx + 1;
        const estPrize = getRankPrizeStars(rank);
        const rankColor = rank === 1 ? '#facc15' : rank === 2 ? '#94a3b8' : rank === 3 ? '#d97706' : '#64748b';
        const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

        return `
          <tr>
            <td style="font-weight: 900; color: ${rankColor}; font-size: 1rem;">${rankMedal}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1rem;">${escapeHtml(u.avatar || '⚡')}</span>
                <div>
                  <div style="font-weight: 800; color: #ffffff;">${escapeHtml(u.name || 'Anonymous')}</div>
                  <div style="font-size: 0.72rem; color: #64748b; font-family: monospace;">${escapeHtml(u.id || '')}</div>
                </div>
              </div>
            </td>
            <td style="font-weight: 800; color: #38bdf8;">${Number(u.eventTasks || 0).toLocaleString()} Tasks</td>
            <td style="font-weight: 700; color: #94a3b8;">${Number(u.totalTasks || 0).toLocaleString()} Total</td>
            <td style="font-weight: 800; color: #facc15;">${estPrize > 0 ? `+${estPrize.toLocaleString()} ⭐` : '—'}</td>
            <td>
              <span class="badge-active" style="padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8;">Qualified</span>
            </td>
          </tr>`;
      }).join('');
    }
  }

  // 4. Update Filter Dropdown
  const sessionFilterSelect = document.getElementById('adminSessionSelectFilter');
  if (sessionFilterSelect) {
    const curVal = sessionFilterSelect.value || 'all';
    sessionFilterSelect.innerHTML = '<option value="all">All Sessions</option>' + 
      sessionsData.map(s => `<option value="${escapeHtml(s.id)}" ${curVal === s.id ? 'selected' : ''}>${escapeHtml(s.name || ('Session ' + s.sessionNumber))}</option>`).join('');
  }

  // 5. Render Stored Sessions Archive Cards & Tables
  renderSessionsArchiveView();
}

function renderSessionsArchiveView(filterSessionId = 'all', searchQuery = '') {
  const container = document.getElementById('adminSessionsArchiveContainer');
  if (!container) return;

  let list = [...sessionsData];
  if (filterSessionId !== 'all') {
    list = list.filter(s => s.id === filterSessionId);
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 12px; background: rgba(6, 14, 36, 0.5);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📁</div>
        <h4 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0 0 0.4rem 0;">No Historical Sessions Archived Yet</h4>
        <p style="font-size: 0.8rem; color: #94a3b8; max-width: 480px; margin: 0 auto 1.25rem auto;">
          When an event concludes or when you click "Conclude & Archive Current Session", all contenders, rankings, tasks, and star prizes are permanently saved session-wise here.
        </p>
        <button type="button" class="btn-primary" onclick="adminArchiveCurrentSession()" style="padding: 0.5rem 1.25rem; font-size: 0.85rem; font-weight: 800;">
          <span>📸 Create First Session Snapshot Now</span>
        </button>
      </div>`;
    return;
  }

  container.innerHTML = list.map((session, sIdx) => {
    let standings = session.standings || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      standings = standings.filter(st => (st.name || '').toLowerCase().includes(q) || String(st.rank).includes(q));
    }

    const startDateStr = session.startTime ? new Date(session.startTime).toLocaleDateString() : 'N/A';
    const endDateStr = session.endTime ? new Date(session.endTime).toLocaleDateString() : 'N/A';
    const topWinner = session.topWinner || (session.standings && session.standings[0]);

    return `
      <div style="background: rgba(6, 14, 36, 0.8); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 14px; margin-bottom: 1.5rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);">
        
        <!-- Session Header Bar -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%); border-bottom: 1px solid rgba(56, 189, 248, 0.2);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">🏆</span>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0;">${escapeHtml(session.name || ('Session ' + session.sessionNumber))}</h4>
              <span style="padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; background: rgba(52, 211, 153, 0.2); color: #34d399; border: 1px solid #34d399;">🏁 CONCLUDED &amp; STORED</span>
            </div>
            <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 4px;">
              Duration: <b>${startDateStr}</b> ➔ <b>${endDateStr}</b> • Total Contenders: <b style="color: #38bdf8;">${session.totalContenders || (session.standings ? session.standings.length : 0)}</b> • Tasks Completed: <b style="color: #facc15;">${Number(session.totalTasksCompleted || 0).toLocaleString()}</b>
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" onclick="exportSingleSessionJson('${escapeHtml(session.id)}')" class="btn-ctrl" style="padding: 4px 10px; font-size: 0.75rem; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; border-radius: 6px; cursor: pointer; font-weight: 700;">
              📥 Export Session
            </button>
            <button type="button" onclick="deleteArchivedSession('${escapeHtml(session.id)}')" class="btn-ctrl" style="padding: 4px 10px; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; border-radius: 6px; cursor: pointer; font-weight: 700;">
              🗑️ Delete
            </button>
          </div>
        </div>

        <!-- Winner Highlight Ribbon -->
        ${topWinner ? `
        <div style="background: rgba(250, 204, 21, 0.08); border-bottom: 1px solid rgba(250, 204, 21, 0.2); padding: 0.6rem 1.25rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem;">🥇</span>
            <span style="font-size: 0.8rem; font-weight: 800; color: #fef08a;">Session Champion:</span>
            <span style="font-size: 0.82rem; font-weight: 900; color: #ffffff;">${escapeHtml(topWinner.name)}</span>
            <span style="font-size: 0.75rem; color: #38bdf8; font-weight: 700;">(${topWinner.eventTasks || 0} Tasks)</span>
          </div>
          <span style="font-size: 0.8rem; font-weight: 900; color: #facc15;">Awarded: +${Number(topWinner.starReward || 10000).toLocaleString()} 🪙</span>
        </div>` : ''}

        <!-- Session Standings Table -->
        <div class="table-responsive">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th style="width: 80px;">Rank</th>
                <th>Contender</th>
                <th>Session Tasks</th>
                <th>Total Career Tasks</th>
                <th>Coin Prize Awarded</th>
                <th>Contender ID</th>
              </tr>
            </thead>
            <tbody>
              ${standings.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 1.25rem; color: #94a3b8; font-size: 0.8rem;">
                    No contenders recorded for this session.
                  </td>
                </tr>` : standings.map(st => {
                  const rank = st.rank;
                  const rankColor = rank === 1 ? '#facc15' : rank === 2 ? '#94a3b8' : rank === 3 ? '#d97706' : '#64748b';
                  const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                  return `
                    <tr>
                      <td style="font-weight: 900; color: ${rankColor}; font-size: 0.95rem;">${rankMedal}</td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span>${escapeHtml(st.avatar || '⚡')}</span>
                          <span style="font-weight: 800; color: #ffffff;">${escapeHtml(st.name || 'Anonymous')}</span>
                        </div>
                      </td>
                      <td style="font-weight: 800; color: #38bdf8;">${Number(st.eventTasks || 0).toLocaleString()}</td>
                      <td style="color: #94a3b8;">${Number(st.totalTasks || 0).toLocaleString()}</td>
                      <td style="font-weight: 800; color: #facc15;">${st.starReward > 0 ? `+${st.starReward.toLocaleString()} 🪙` : '—'}</td>
                      <td style="font-family: monospace; font-size: 0.72rem; color: #64748b;">${escapeHtml(st.id || '')}</td>
                    </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>

      </div>`;
  }).join('');
}

function filterAdminSessionView(sessionId) {
  const q = document.getElementById('adminSessionContenderSearch')?.value || '';
  renderSessionsArchiveView(sessionId, q);
}

function filterAdminSessionContenders(query) {
  const sessionId = document.getElementById('adminSessionSelectFilter')?.value || 'all';
  renderSessionsArchiveView(sessionId, query);
}

// Conclude & Archive Current Session to History
function adminArchiveCurrentSession() {
  const evt = getLeaderboardEventInfo();
  const qualified = usersData
    .filter(u => Number(u.totalTasks || 0) >= 100)
    .sort((a, b) => (Number(b.eventTasks || 0)) - (Number(a.eventTasks || 0)));

  const sessionNum = evt.seasonNumber || (sessionsData.length + 1);
  const sessionName = evt.name || `Season ${sessionNum}: 3-Month Championship`;

  if (!confirm(`Conclude & Archive "${sessionName}"?\n\n• This will capture all ${qualified.length} qualified contenders and save full rankings to the session-wise store.\n• Event tasks counter will reset to 0 for the next season.\n• Ready to proceed?`)) {
    return;
  }

  const now = Date.now();
  const standings = qualified.map((u, idx) => {
    const rank = idx + 1;
    const starReward = getRankPrizeStars(rank);
    return {
      rank,
      id: u.id || `usr_${idx}`,
      name: u.name || 'Anonymous',
      avatar: u.avatar || '⚡',
      eventTasks: Number(u.eventTasks || 0),
      totalTasks: Number(u.totalTasks || 0),
      starReward
    };
  });

  const totalTasks = standings.reduce((sum, s) => sum + s.eventTasks, 0);
  const totalStars = standings.reduce((sum, s) => sum + s.starReward, 0);

  const archivedSession = {
    id: `session_${sessionNum}_${now}`,
    sessionNumber: sessionNum,
    name: sessionName,
    startTime: evt.startTime || (now - THREE_MONTHS_MS),
    endTime: now,
    archivedAt: now,
    status: 'concluded',
    totalContenders: standings.length,
    totalTasksCompleted: totalTasks,
    totalStarsAwarded: totalStars,
    topWinner: standings[0] || null,
    standings
  };

  sessionsData.unshift(archivedSession);
  saveSessionsAndSync();

  // Reset users' eventTasks to 0 for next season
  usersData.forEach(u => {
    u.eventTasks = 0;
  });
  saveUsersAndSync();

  // Create next season
  const nextSeasonNum = sessionNum + 1;
  const nextEvt = {
    id: `global_season_${nextSeasonNum}`,
    seasonNumber: nextSeasonNum,
    name: `Season ${nextSeasonNum}: 3-Month Championship`,
    startTime: now,
    endTime: now + THREE_MONTHS_MS,
    durationHours: THREE_MONTHS_HOURS,
    durationDays: 90,
    status: 'active',
    isGlobal: true,
    isManualOverride: true
  };

  try {
    localStorage.setItem(LEADERBOARD_EVENT_KEY, JSON.stringify(nextEvt));
    if (window.Firebase && typeof window.Firebase.saveGlobalLeaderboardEventToCloud === 'function') {
      window.Firebase.saveGlobalLeaderboardEventToCloud(nextEvt);
    }
  } catch (e) {}

  renderEventsAndSessionsPage();
  showToast(`🏆 ${sessionName} archived successfully to Session Store! Season ${nextSeasonNum} is now LIVE.`, 'success');
  logActivity(`Admin archived ${sessionName} with ${standings.length} contenders into session history.`);
}

function adminRestartEventSeason() {
  if (!confirm('Restart the 3-Month Championship Season with a fresh 90-day timer?')) return;
  const now = Date.now();
  const evt = getLeaderboardEventInfo();
  const seasonNum = evt.seasonNumber || 1;
  const nextEvt = {
    ...evt,
    id: evt.id || `global_season_${seasonNum}`,
    seasonNumber: seasonNum, // Keep season number unchanged on restart
    name: evt.name || `Season ${seasonNum}: 3-Month Championship`,
    startTime: now,
    endTime: now + THREE_MONTHS_MS,
    status: 'active',
    isManualOverride: true
  };

  try {
    localStorage.setItem(LEADERBOARD_EVENT_KEY, JSON.stringify(nextEvt));
    if (window.Firebase && typeof window.Firebase.saveGlobalLeaderboardEventToCloud === 'function') {
      window.Firebase.saveGlobalLeaderboardEventToCloud(nextEvt);
    }
    const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
    bc.postMessage({ type: 'EVENT_RESTART', event: nextEvt, timestamp: now });
    bc.close();
  } catch(e) {}

  usersData.forEach(u => { u.eventTasks = 0; });
  saveUsersAndSync();
  renderEventsAndSessionsPage();
  showToast('🔄 Event season restarted with fresh 90-day global timer!', 'info');
}

function saveSessionsAndSync() {
  try {
    localStorage.setItem(LEADERBOARD_SESSIONS_KEY, JSON.stringify(sessionsData));
    localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
    if (syncChannel) {
      syncChannel.postMessage({ type: 'SESSIONS_UPDATED', timestamp: Date.now() });
    }
    if (window.Firebase && typeof window.Firebase.saveLeaderboardSessionsToCloud === 'function') {
      window.Firebase.saveLeaderboardSessionsToCloud(sessionsData);
    } else if (typeof window.saveLeaderboardSessionsToCloud === 'function') {
      window.saveLeaderboardSessionsToCloud(sessionsData);
    }
  } catch(e) {
    console.warn('Error saving leaderboard sessions:', e.message);
  }
}

function deleteArchivedSession(sessionId) {
  if (!confirm('Are you sure you want to delete this archived session record?')) return;
  sessionsData = sessionsData.filter(s => s.id !== sessionId);
  saveSessionsAndSync();
  renderEventsAndSessionsPage();
  showToast('Archived session removed.', 'info');
}

function exportSingleSessionJson(sessionId) {
  const session = sessionsData.find(s => s.id === sessionId);
  if (!session) return;
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", jsonStr);
  dlAnchor.setAttribute("download", `${session.id}_leaderboard.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function adminExportSessionHistory() {
  const data = {
    exportDate: new Date().toISOString(),
    totalSessions: sessionsData.length,
    activeEvent: getLeaderboardEventInfo(),
    sessions: sessionsData
  };
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", jsonStr);
  dlAnchor.setAttribute("download", `leaderboard_sessions_archive_${Date.now()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast('📥 Session history exported to JSON!', 'success');
}

window.renderEventsAndSessionsPage = renderEventsAndSessionsPage;
window.filterAdminSessionView = filterAdminSessionView;
window.filterAdminSessionContenders = filterAdminSessionContenders;
window.adminArchiveCurrentSession = adminArchiveCurrentSession;
window.adminRestartEventSeason = adminRestartEventSeason;
window.adminExportSessionHistory = adminExportSessionHistory;
window.deleteArchivedSession = deleteArchivedSession;
window.exportSingleSessionJson = exportSingleSessionJson;


function openDesktopUserDetailModal(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  const modal = document.getElementById('desktopUserDetailModalOverlay');
  const body = document.getElementById('desktopUserDetailBody');
  if (!modal || !body) return;

  const isSusp = user.status === 'suspended';
  const roleBadge = user.role === 'admin' ? '👑 Admin' : (user.role === 'vip' ? '🌟 VIP' : '👤 Player');
  const handle = user.username ? (user.username.startsWith('@') ? user.username : '@' + user.username) : '@' + (user.name || 'player').toLowerCase().replace(/\s+/g, '');
  const email = user.email || (user.id + '@novatasks.io');

  body.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.85rem; background: #060e24; padding: 0.85rem; border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.35); margin-bottom: 0.85rem;">
      <div style="font-size: 2.4rem; line-height: 1;">${user.avatar || '⚡'}</div>
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span style="font-weight: 800; font-size: 1.05rem; color: #ffffff; display: inline-flex; align-items: center; gap: 4px;">
            <span>👤</span> ${escapeHtml(user.name || 'Player')}
          </span>
          <span class="badge-tag" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.35); color: #38bdf8;">${roleBadge}</span>
          <span class="status-badge ${isSusp ? 'rejected' : 'approved'}">${isSusp ? 'SUSPENDED' : 'ACTIVE'}</span>
        </div>
        <div style="font-size: 0.75rem; color: #38bdf8; font-family: monospace; margin-top: 2px;">${escapeHtml(handle)}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; margin-bottom: 0.85rem;">
      <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.5rem 0.65rem;">
        <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700;">USER ID (UID)</div>
        <div style="font-size: 0.82rem; font-family: monospace; color: #38bdf8; font-weight: 700; margin-top: 2px;">${escapeHtml(user.id)}</div>
      </div>
      <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.5rem 0.65rem;">
        <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700;">LEVEL TIER</div>
        <div style="font-size: 0.82rem; color: #e2e8f0; font-weight: 800; margin-top: 2px;">${escapeHtml(user.level || 'LVL 1 • NOVICE')}</div>
      </div>
      <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.5rem 0.65rem; grid-column: span 2;">
        <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700;">EMAIL ADDRESS</div>
        <div style="font-size: 0.82rem; color: #e2e8f0; font-family: monospace; margin-top: 2px;">✉️ ${escapeHtml(email)}</div>
      </div>
    </div>

    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.6rem 0.75rem; margin-bottom: 0.85rem;">
      <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700; margin-bottom: 0.4rem;">ECONOMY &amp; BALANCES</div>
      <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
        <span style="color: #fbbf24; font-weight: 800; font-size: 0.82rem; background: rgba(245, 158, 11, 0.15); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.35);">🪙 ${Number(user.coins || 0).toLocaleString()} Coins</span>
        <span style="color: #facc15; font-weight: 800; font-size: 0.82rem; background: rgba(250, 204, 21, 0.15); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(250, 204, 21, 0.35);">⭐ ${Number(user.stars || 0).toLocaleString()} Stars</span>
      </div>
    </div>

    <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 0.75rem;">
      <button type="button" class="btn-table-action" onclick="closeDesktopUserDetailModal()" style="padding: 0.5rem 0.85rem; font-weight: 700;">Close</button>
      <button type="button" class="btn-table-action btn-reject" onclick="closeDesktopUserDetailModal(); deleteUser('${user.id}')" style="padding: 0.5rem 0.85rem; font-weight: 700;">🗑️ Delete</button>
      <button type="button" class="btn-table-action btn-approve" onclick="closeDesktopUserDetailModal(); openUserEditModal('${user.id}')" style="padding: 0.5rem 0.85rem; font-weight: 700;">✏️ Edit</button>
    </div>
  `;

  modal.classList.add('active');
}

function closeDesktopUserDetailModal() {
  const modal = document.getElementById('desktopUserDetailModalOverlay');
  if (modal) modal.classList.remove('active');
}

window.openDesktopUserDetailModal = openDesktopUserDetailModal;
window.closeDesktopUserDetailModal = closeDesktopUserDetailModal;
