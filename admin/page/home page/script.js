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

// Canonical default contenders shared between Admin & Leaderboard (real player only; demo users removed)
const CANONICAL_TASK_USERS = [
  { id: 'usr_1', name: 'Player', avatar: '⚡', level: 'LVL 1 • NOVICE', coins: 0, stars: 0, totalTasks: 0, eventTasks: 0, status: 'active', role: 'player', email: 'player@novatasks.io', username: '@player', joined: 'Today' }
];

const DEMO_USER_IDS = ['usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6'];
const DEMO_USER_NAMES = ['User 2', 'CyberHunter', 'NeonBlaze', 'ShadowNova', 'PixelMaster'];

function isDemoUser(u) {
  if (!u) return true;
  if (DEMO_USER_IDS.includes(u.id)) return true;
  if (DEMO_USER_NAMES.includes(u.name)) return true;
  if (typeof u.id === 'string' && u.id.startsWith('mock_')) return true;
  return false;
}

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

function loadAllStoredData() {
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    let parsedUsers = rawUsers ? JSON.parse(rawUsers) : [];
    if (Array.isArray(parsedUsers)) {
      parsedUsers = parsedUsers.filter(u => !isDemoUser(u));
    }
    if (!Array.isArray(parsedUsers) || parsedUsers.length === 0) {
      parsedUsers = JSON.parse(JSON.stringify(CANONICAL_TASK_USERS));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedUsers));
    }
    usersData = parsedUsers;
  } catch(e) {
    usersData = JSON.parse(JSON.stringify(CANONICAL_TASK_USERS));
  }

  try {
    const rawTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    tasksData = rawTasks ? JSON.parse(rawTasks) : [];
    if (!Array.isArray(tasksData)) tasksData = [];
    let modified = false;
    tasksData.forEach(t => {
      if (!t.verificationCode && !t.code && !t.secretCode) {
        const gen = Math.floor(100000 + Math.random() * 900000).toString();
        t.verificationCode = gen;
        t.code = gen;
        t.secretCode = gen;
        modified = true;
      }
    });
    if (modified) {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
    }
  } catch(e) { tasksData = []; }

  try {
    const rawSessions = localStorage.getItem(LEADERBOARD_SESSIONS_KEY);
    sessionsData = rawSessions ? JSON.parse(rawSessions) : [];
  } catch(e) { sessionsData = []; }
}

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
    .filter(u => u && u.status !== 'suspended')
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
    .filter(u => u && u.status !== 'suspended')
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

function openUserEditModal(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;
  const modal = document.getElementById('userEditModalOverlay');
  if (document.getElementById('editUserId')) document.getElementById('editUserId').value = user.id;
  if (document.getElementById('editUserCoinsInput')) document.getElementById('editUserCoinsInput').value = user.coins || 0;
  if (document.getElementById('editUserStarsInput')) document.getElementById('editUserStarsInput').value = user.stars || 0;
  if (document.getElementById('editUserStatusSelect')) document.getElementById('editUserStatusSelect').value = user.status || 'active';
  if (modal) modal.classList.add('active');
}

function closeUserEditModal() {
  const modal = document.getElementById('userEditModalOverlay');
  if (modal) modal.classList.remove('active');
}

function handleSaveUserBalance(e) {
  if (e && e.preventDefault) e.preventDefault();
  const userId = document.getElementById('editUserId')?.value;
  const coins = parseInt(document.getElementById('editUserCoinsInput')?.value || '0', 10);
  const stars = parseInt(document.getElementById('editUserStarsInput')?.value || '0', 10);
  const status = document.getElementById('editUserStatusSelect')?.value || 'active';

  const user = usersData.find(u => u.id === userId);
  if (user) {
    user.coins = coins;
    user.stars = stars;
    user.status = status;
    saveUsersAndSync();
    closeUserEditModal();
    renderEventsAndSessionsPage();
    if (typeof showToast === 'function') showToast(`Player "${user.name}" updated!`, 'success');
  }
}

function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this player?')) return;
  usersData = usersData.filter(u => u.id !== userId);
  saveUsersAndSync();
  renderEventsAndSessionsPage();
  if (typeof showToast === 'function') showToast('Player removed.', 'info');
}

window.openUserEditModal = openUserEditModal;
window.closeUserEditModal = closeUserEditModal;
window.handleSaveUserBalance = handleSaveUserBalance;
window.deleteUser = deleteUser;

function openTaskModal(taskId) {
  const modal = document.getElementById('taskModalOverlay');
  const titleText = document.getElementById('modalTitleText');
  const form = document.getElementById('taskModalForm');
  if (form) form.reset();

  if (taskId) {
    const task = tasksData.find(t => t.id === taskId);
    if (task) {
      if (titleText) titleText.textContent = 'Edit Mission & 6-Digit Code';
      if (document.getElementById('editTaskId')) document.getElementById('editTaskId').value = task.id;
      if (document.getElementById('taskTitleInput')) document.getElementById('taskTitleInput').value = task.title || '';
      if (document.getElementById('taskLinkInput')) document.getElementById('taskLinkInput').value = task.url || task.link || '';
      if (document.getElementById('taskCategorySelect')) document.getElementById('taskCategorySelect').value = task.category || 'simple';
      if (document.getElementById('taskLevelSelect')) document.getElementById('taskLevelSelect').value = (task.level || 1).toString();
      if (document.getElementById('taskRewardInput')) document.getElementById('taskRewardInput').value = task.rewardCoins || task.reward || task.coins || 50;
      if (document.getElementById('taskTicketCostInput')) document.getElementById('taskTicketCostInput').value = task.ticketCost || 0;
      if (document.getElementById('taskCoinCostInput')) document.getElementById('taskCoinCostInput').value = task.coinCost || 0;
      let taskCode = String(task.verificationCode || task.code || task.secretCode || '').trim();
      if (!taskCode || !/^\d{6}$/.test(taskCode)) {
        taskCode = Math.floor(100000 + Math.random() * 900000).toString();
      }
      if (document.getElementById('taskCodeInput')) document.getElementById('taskCodeInput').value = taskCode;
      switchAdminModalTaskMode('single');
      if (document.getElementById('adminModalModeTabs')) document.getElementById('adminModalModeTabs').style.display = 'none';
      if (modal) modal.classList.add('active');
      updateModalPreview();
      return;
    }
  }

  if (titleText) titleText.textContent = 'Create New Mission';
  if (document.getElementById('editTaskId')) document.getElementById('editTaskId').value = '';
  if (document.getElementById('taskCodeInput')) document.getElementById('taskCodeInput').value = Math.floor(100000 + Math.random() * 900000).toString();
  if (document.getElementById('adminModalModeTabs')) document.getElementById('adminModalModeTabs').style.display = 'flex';
  switchAdminModalTaskMode('single');
  if (modal) modal.classList.add('active');
  updateModalPreview();
}

function closeTaskModal() {
  const modal = document.getElementById('taskModalOverlay');
  if (modal) modal.classList.remove('active');
}

function switchAdminModalTaskMode(mode) {
  const modeInput = document.getElementById('adminTaskCreationMode');
  if (modeInput) modeInput.value = mode;
  const btnSingle = document.getElementById('btnAdminModeSingle');
  const btnBulk = document.getElementById('btnAdminModeBulk');
  const singleLink = document.getElementById('taskLinkInput')?.parentElement;
  const bulkUrls = document.getElementById('adminBulkUrlsGroup');
  const singleCode = document.getElementById('adminSingleCodeGroup');
  const bulkCodes = document.getElementById('adminBulkCodesGroup');
  const bulkSummary = document.getElementById('adminBulkSummaryBox');

  if (mode === 'bulk') {
    if (btnSingle) btnSingle.classList.remove('active');
    if (btnBulk) btnBulk.classList.add('active');
    if (singleLink) singleLink.style.display = 'none';
    if (bulkUrls) bulkUrls.style.display = 'block';
    if (singleCode) singleCode.style.display = 'none';
    if (bulkCodes) bulkCodes.style.display = 'block';
    if (bulkSummary) bulkSummary.style.display = 'block';
  } else {
    if (btnSingle) btnSingle.classList.add('active');
    if (btnBulk) btnBulk.classList.remove('active');
    if (singleLink) singleLink.style.display = 'block';
    if (bulkUrls) bulkUrls.style.display = 'none';
    if (singleCode) singleCode.style.display = 'block';
    if (bulkCodes) bulkCodes.style.display = 'none';
    if (bulkSummary) bulkSummary.style.display = 'none';
  }
}

function autoGenerateAdminBulkCodes() {
  const urlsText = document.getElementById('adminBulkUrlsInput')?.value || '';
  const count = urlsText.split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0).length || 5;
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(Math.floor(100000 + Math.random() * 900000).toString());
  }
  const codesInput = document.getElementById('adminBulkCodesInput');
  if (codesInput) {
    codesInput.value = codes.join('\n');
    updateAdminModalBulkCounter();
  }
}

function updateAdminModalBulkCounter() {
  const urlsText = document.getElementById('adminBulkUrlsInput')?.value || '';
  const urlCount = urlsText.split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0).length;
  const codesText = document.getElementById('adminBulkCodesInput')?.value || '';
  const codeCount = codesText.split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0).length;

  const urlBadge = document.getElementById('adminBulkLinksCountBadge');
  if (urlBadge) urlBadge.textContent = `${urlCount} URLs`;
  const codeBadge = document.getElementById('adminBulkCodesCountBadge');
  if (codeBadge) codeBadge.textContent = `${codeCount} Codes`;
}

function handleSaveTask(e) {
  if (e && e.preventDefault) e.preventDefault();
  const editId = document.getElementById('editTaskId')?.value;
  const mode = document.getElementById('adminTaskCreationMode')?.value || 'single';
  const category = document.getElementById('taskCategorySelect')?.value || 'simple';
  const level = parseInt(document.getElementById('taskLevelSelect')?.value || '1', 10) || 1;
  const shopLimitExtension = parseInt(document.getElementById('taskShopLimitExtension')?.value || '10', 10) || 10;
  const isShopTask = (category === 'shop_task');
  const rewardCoins = parseInt(document.getElementById('taskRewardInput')?.value || '50', 10) || 50;
  const ticketCost = Math.max(0, parseInt(document.getElementById('taskTicketCostInput')?.value || '0', 10) || 0);
  const coinCost = Math.max(0, parseInt(document.getElementById('taskCoinCostInput')?.value || '0', 10) || 0);
  if (category === 'event') {
    const durationHours = parseInt(document.getElementById('eventTimerDuration')?.value || '24', 10);
    const eventEndTime = Date.now() + (durationHours * 3600 * 1000);
    const packCoinCost = Math.max(0, parseInt(document.getElementById('packageCoinCost')?.value || '50', 10));
    const packTicketCost = Math.max(0, parseInt(document.getElementById('packageTicketCost')?.value || '2', 10));
    const packId = 'pack_' + Date.now();

    const t1 = {
      id: 'task_' + Date.now() + '_1',
      title: document.getElementById('eventTask1Title')?.value.trim() || 'Mission 1: Promo Signup',
      url: document.getElementById('eventTask1Url')?.value.trim() || 'https://youtube.com/',
      link: document.getElementById('eventTask1Url')?.value.trim() || 'https://youtube.com/',
      verificationCode: document.getElementById('eventTask1Code')?.value.trim() || '583921',
      rewardCoins: parseInt(document.getElementById('eventTask1Price')?.value || '500', 10),
      category: 'pro',
      isEventTask: true,
      eventPackId: packId,
      coinCost: packCoinCost,
      ticketCost: packTicketCost,
      eventEndTime: eventEndTime,
      active: true,
      createdAt: Date.now()
    };

    const t2 = {
      id: 'task_' + Date.now() + '_2',
      title: document.getElementById('eventTask2Title')?.value.trim() || 'Mission 2: Community Join',
      url: document.getElementById('eventTask2Url')?.value.trim() || 'https://telegram.org/',
      link: document.getElementById('eventTask2Url')?.value.trim() || 'https://telegram.org/',
      verificationCode: document.getElementById('eventTask2Code')?.value.trim() || '749201',
      rewardCoins: parseInt(document.getElementById('eventTask2Price')?.value || '250', 10),
      category: 'pro',
      isEventTask: true,
      eventPackId: packId,
      coinCost: packCoinCost,
      ticketCost: packTicketCost,
      eventEndTime: eventEndTime,
      active: true,
      createdAt: Date.now() + 1
    };

    const t3 = {
      id: 'task_' + Date.now() + '_3',
      title: document.getElementById('eventTask3Title')?.value.trim() || 'Mission 3: Survey Bonus',
      url: document.getElementById('eventTask3Url')?.value.trim() || 'https://google.com/',
      link: document.getElementById('eventTask3Url')?.value.trim() || 'https://google.com/',
      verificationCode: document.getElementById('eventTask3Code')?.value.trim() || '382910',
      rewardCoins: parseInt(document.getElementById('eventTask3Price')?.value || '250', 10),
      category: 'pro',
      isEventTask: true,
      eventPackId: packId,
      coinCost: packCoinCost,
      ticketCost: packTicketCost,
      eventEndTime: eventEndTime,
      active: true,
      createdAt: Date.now() + 2
    };

    tasksData.unshift(t1, t2, t3);
    saveTasksAndSync();
    closeTaskModal();
    renderEventsAndSessionsPage();
    if (typeof showToast === 'function') showToast('Event 3-Task Pack added successfully!', 'success');
    return;
  }

  const baseTitle = document.getElementById('taskTitleInput')?.value.trim();
  const icon = document.getElementById('taskIconInput')?.value.trim() || '⚡';
  const desc = document.getElementById('taskDescInput')?.value.trim() || '';

  if (!baseTitle) {
    alert('Please enter a task title.');
    return;
  }

  if (editId) {
    const url = document.getElementById('taskLinkInput')?.value.trim();
    let code = document.getElementById('taskCodeInput')?.value.trim();
    if (!url) {
      alert('Please enter target URL.');
      return;
    }
    if (!code || !/^\d{6}$/.test(code)) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }
    const idx = tasksData.findIndex(t => t.id === editId);
    if (idx !== -1) {
      tasksData[idx] = {
        ...tasksData[idx],
        title: baseTitle,
        url,
        link: url,
        category,
        level,
        shopLimitExtension,
        isShopTask,
        rewardCoins,
        reward: rewardCoins,
        coins: rewardCoins,
        ticketCost,
        coinCost,
        icon,
        description: desc,
        secretCode: code,
        verificationCode: code,
        code,
        updatedAt: Date.now()
      };
    }
  } else if (mode === 'bulk') {
    const rawUrls = document.getElementById('adminBulkUrlsInput')?.value || '';
    const urls = rawUrls.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const rawCodes = document.getElementById('adminBulkCodesInput')?.value || '';
    const codes = rawCodes.split(/\r?\n/).map(c => c.trim()).filter(c => c.length > 0);
    const now = Date.now();
    for (let i = 0; i < urls.length; i++) {
      let u = urls[i];
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      const code = (codes[i] && /^\d{6}$/.test(codes[i])) ? codes[i] : Math.floor(100000 + Math.random() * 900000).toString();
      tasksData.push({
        id: `task_${now}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        title: baseTitle,
        url: u,
        link: u,
        category,
        level,
        shopLimitExtension,
        isShopTask,
        rewardCoins,
        reward: rewardCoins,
        coins: rewardCoins,
        ticketCost,
        coinCost,
        icon,
        description: desc,
        secretCode: code,
        verificationCode: code,
        code,
        active: true,
        createdAt: now + i,
        updatedAt: now
      });
    }
  } else {
    const url = document.getElementById('taskLinkInput')?.value.trim();
    let code = document.getElementById('taskCodeInput')?.value.trim();
    if (!url) {
      alert('Please enter target URL.');
      return;
    }
    if (!code || !/^\d{6}$/.test(code)) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }
    tasksData.push({
      id: `task_${Date.now()}`,
      title: baseTitle,
      url,
      link: url,
      category,
      level,
      shopLimitExtension,
      isShopTask,
      rewardCoins,
      reward: rewardCoins,
      coins: rewardCoins,
      ticketCost,
        coinCost,
      icon,
      description: desc,
      secretCode: code,
      verificationCode: code,
      code,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  saveAdminTasksAndSync();
  closeTaskModal();
}

function saveAdminTasksAndSync() {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  try {
    const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
    bc.postMessage({ type: 'TASKS_UPDATED', timestamp: Date.now() });
    bc.close();
  } catch(e) {}
}

function handleAdminHomeCategoryChange(val) {
  const rewardInput = document.getElementById('taskRewardInput');
  const badge = document.getElementById('adminHomeTaskRewardTypeBadge');
  const iconInput = document.getElementById('taskIconInput');
  if (val === 'pro') {
    if (rewardInput && (rewardInput.value === '50' || !rewardInput.value)) rewardInput.value = '300';
    if (badge) {
      badge.textContent = '💎 Pro Mission Bounty (+300 🪙)';
      badge.style.color = '#34d399';
    }
    if (iconInput && (iconInput.value === '⚡' || iconInput.value === '⭐')) iconInput.value = '💎';
  } else if (val === 'premium') {
    if (rewardInput && (rewardInput.value === '50' || rewardInput.value === '300' || !rewardInput.value)) rewardInput.value = '200';
    if (badge) {
      badge.textContent = '⭐ Star Task Bounty (+200 🪙)';
      badge.style.color = '#facc15';
    }
    if (iconInput && (iconInput.value === '⚡' || iconInput.value === '💎')) iconInput.value = '⭐';
  } else {
    if (rewardInput && (rewardInput.value === '200' || rewardInput.value === '300' || !rewardInput.value)) rewardInput.value = '50';
    if (badge) {
      badge.textContent = '📋 Standard Coin Bounty (+50 🪙)';
      badge.style.color = '#38bdf8';
    }
    if (iconInput && (iconInput.value === '⭐' || iconInput.value === '💎')) iconInput.value = '⚡';
  }
  updateModalPreview();
}
window.handleAdminHomeCategoryChange = handleAdminHomeCategoryChange;

function updateModalPreview() {
  const title = document.getElementById('taskTitleInput')?.value || 'Webtask Check-In';
  const coins = document.getElementById('taskRewardInput')?.value || '50';
  const desc = document.getElementById('taskDescInput')?.value || 'Open link & verify 6-digit code';
  const icon = document.getElementById('taskIconInput')?.value || '⚡';
  const code = document.getElementById('taskCodeInput')?.value || '000000';
  const cat = document.getElementById('taskCategorySelect')?.value || 'simple';

  const previewTitle = document.getElementById('previewTitle');
  const previewReward = document.getElementById('previewReward');
  const previewDesc = document.getElementById('previewDesc');
  const previewIcon = document.getElementById('previewIcon');
  const previewPill = document.getElementById('previewDurationPill');

  if (previewTitle) previewTitle.textContent = title;
  if (previewReward) previewReward.textContent = `🪙 +${coins} Coins`;
  if (previewDesc) previewDesc.textContent = `${desc} (Code: ${code})`;
  if (previewIcon) previewIcon.textContent = icon;
  if (previewPill) {
    if (cat === 'pro') {
      previewPill.textContent = '💎 Pro Task';
      previewPill.style.color = '#34d399';
    } else if (cat === 'premium') {
      previewPill.textContent = '⭐ Star Task';
      previewPill.style.color = '#facc15';
    } else {
      previewPill.textContent = '🪙 Coin Task';
      previewPill.style.color = '#38bdf8';
    }
  }
}

window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.switchAdminModalTaskMode = switchAdminModalTaskMode;
window.autoGenerateAdminBulkCodes = autoGenerateAdminBulkCodes;
window.updateAdminModalBulkCounter = updateAdminModalBulkCounter;
window.handleSaveTask = handleSaveTask;
window.updateModalPreview = updateModalPreview;

document.addEventListener('DOMContentLoaded', () => {
  loadAllStoredData();
  renderEventsAndSessionsPage();
});


window.updatePackageTotalPrice = function() {
  const p1 = parseInt(document.getElementById('eventTask1Price')?.value || '500', 10) || 0;
  const p2 = parseInt(document.getElementById('eventTask2Price')?.value || '250', 10) || 0;
  const p3 = parseInt(document.getElementById('eventTask3Price')?.value || '250', 10) || 0;
  const total = p1 + p2 + p3;
  const label = document.getElementById('packageTotalBountyLabel');
  if (label) label.textContent = total.toLocaleString() + ' Coins';
};

window.handleAdminHomeCategoryChange = function(val) {
  const builder = document.getElementById('adminEventPackBuilder');
  const levelGroup = document.getElementById('taskLevelGroup');
  const shopGroup = document.getElementById('shopExtensionGroup');
  const singleUrlGroup = document.getElementById('adminSingleUrlGroup');
  const singleCodeGroup = document.getElementById('adminSingleCodeGroup');

  if (val === 'event') {
    if (builder) builder.style.display = 'block';
    if (levelGroup) levelGroup.style.display = 'none';
    if (shopGroup) shopGroup.style.display = 'none';
  } else {
    if (builder) builder.style.display = 'none';
    if (levelGroup) levelGroup.style.display = 'block';
    if (shopGroup) shopGroup.style.display = (val === 'shop_task') ? 'block' : 'none';
  }
};


const CANONICAL_BASIC_DEFAULT_TASKS = [
  // 1. Standard Coin Tasks
  {
    id: "task_coin_1",
    title: "Join Telegram Community",
    category: "simple",
    rewardCoins: 100,
    reward: 100,
    coins: 100,
    level: 1,
    url: "https://telegram.org",
    link: "https://telegram.org",
    verificationCode: "583921",
    code: "583921",
    secretCode: "583921",
    description: "Join official announcement group & verify code",
    active: true,
    createdAt: Date.now()
  },
  {
    id: "task_coin_2",
    title: "Follow Official Twitter / X",
    category: "simple",
    rewardCoins: 100,
    reward: 100,
    coins: 100,
    level: 1,
    url: "https://twitter.com",
    link: "https://twitter.com",
    verificationCode: "749201",
    code: "749201",
    secretCode: "749201",
    description: "Follow official updates and verify code",
    active: true,
    createdAt: Date.now() + 1
  },
  {
    id: "task_coin_3",
    title: "Watch YouTube Tutorial Video",
    category: "simple",
    rewardCoins: 75,
    reward: 75,
    coins: 75,
    level: 1,
    url: "https://youtube.com",
    link: "https://youtube.com",
    verificationCode: "382910",
    code: "382910",
    secretCode: "382910",
    description: "Watch video guide & copy secret code",
    active: true,
    createdAt: Date.now() + 2
  },
  {
    id: "task_coin_4",
    title: "Visit Partner Website",
    category: "simple",
    rewardCoins: 50,
    reward: 50,
    coins: 50,
    level: 1,
    url: "https://google.com",
    link: "https://google.com",
    verificationCode: "619482",
    code: "619482",
    secretCode: "619482",
    description: "Browse partner features and verify",
    active: true,
    createdAt: Date.now() + 3
  },
  {
    id: "task_coin_5",
    title: "Daily App Check-In Bonus",
    category: "simple",
    rewardCoins: 50,
    reward: 50,
    coins: 50,
    level: 1,
    url: "https://google.com",
    link: "https://google.com",
    verificationCode: "119284",
    code: "119284",
    secretCode: "119284",
    description: "Daily active player bonus verification",
    active: true,
    createdAt: Date.now() + 4
  },

  // 2. Star Tasks (VIP)
  {
    id: "task_star_1",
    title: "VIP Daily Quiz Bonus",
    category: "premium",
    rewardCoins: 250,
    reward: 250,
    coins: 250,
    level: 2,
    url: "https://google.com",
    link: "https://google.com",
    verificationCode: "492018",
    code: "492018",
    secretCode: "492018",
    description: "VIP exclusive trivia question reward",
    active: true,
    createdAt: Date.now() + 5
  },
  {
    id: "task_star_2",
    title: "Exclusive VIP Survey",
    category: "premium",
    rewardCoins: 350,
    reward: 350,
    coins: 350,
    level: 2,
    url: "https://google.com",
    link: "https://google.com",
    verificationCode: "829103",
    code: "829103",
    secretCode: "829103",
    description: "VIP community feedback survey",
    active: true,
    createdAt: Date.now() + 6
  },
  {
    id: "task_star_3",
    title: "VIP Partner Sponsorship Check",
    category: "premium",
    rewardCoins: 300,
    reward: 300,
    coins: 300,
    level: 2,
    url: "https://google.com",
    link: "https://google.com",
    verificationCode: "301928",
    code: "301928",
    secretCode: "301928",
    description: "High-tier sponsor verification",
    active: true,
    createdAt: Date.now() + 7
  },

  // 3. Pro Tasks (Elite 3-Task Pack)
  {
    id: "task_pro_1",
    title: "Elite Cyber Challenge - Pack Mission 1",
    category: "pro",
    rewardCoins: 1000,
    reward: 1000,
    coins: 1000,
    coinCost: 50,
    ticketCost: 2,
    level: 3,
    url: "https://youtube.com/",
    link: "https://youtube.com/",
    verificationCode: "583921",
    code: "583921",
    secretCode: "583921",
    description: "Mission 1 of 3 (Half 500 Coins on 1st!)",
    isEventTask: true,
    eventPackId: "pack_default",
    active: true,
    createdAt: Date.now() + 8
  },
  {
    id: "task_pro_2",
    title: "Elite Cyber Challenge - Pack Mission 2",
    category: "pro",
    rewardCoins: 1000,
    reward: 1000,
    coins: 1000,
    coinCost: 50,
    ticketCost: 2,
    level: 3,
    url: "https://telegram.org/",
    link: "https://telegram.org/",
    verificationCode: "749201",
    code: "749201",
    secretCode: "749201",
    description: "Mission 2 of 3 (Progress toward full bounty)",
    isEventTask: true,
    eventPackId: "pack_default",
    active: true,
    createdAt: Date.now() + 9
  },
  {
    id: "task_pro_3",
    title: "Elite Cyber Challenge - Pack Mission 3",
    category: "pro",
    rewardCoins: 1000,
    reward: 1000,
    coins: 1000,
    coinCost: 50,
    ticketCost: 2,
    level: 3,
    url: "https://google.com/",
    link: "https://google.com/",
    verificationCode: "382910",
    code: "382910",
    secretCode: "382910",
    description: "Mission 3 of 3 (Full 1000 bounty awarded!)",
    isEventTask: true,
    eventPackId: "pack_default",
    active: true,
    createdAt: Date.now() + 10
  }
];

function restoreAndRenewAllTasks() {
  if (!confirm("Are you sure you want to restore all basic missions and renew all tasks for all players?\n\nThis will reset all completion records so that both completed and non-completed tasks are refreshed back to active and visible in the app!")) {
    return;
  }

  // 1. Reset all completed task tracking across all storage keys
  localStorage.setItem('task_game_completed_tasks', '{}');
  localStorage.setItem('task_completed_tasks', '{}');
  localStorage.removeItem(CLAIMS_STORAGE_KEY);
  localStorage.removeItem('task_game_claims');
  localStorage.setItem('completed_tasks_count', '0');
  localStorage.setItem('task_game_total_tasks_completed', '0');
  localStorage.setItem('task_pass_total_completed', '0');

  // Reset all balances (coins, stars, tickets) to 0
  localStorage.setItem('task_game_coins', '0');
  localStorage.setItem('user_coins', '0');
  localStorage.setItem('task_game_stars', '0');
  localStorage.setItem('user_stars', '0');
  localStorage.setItem('task_user_tickets', '0');
  localStorage.setItem('user_tickets', '0');
  localStorage.setItem('task_game_tickets', '0');
  if (typeof updateAllDomBalances === 'function') {
    updateAllDomBalances(0, 0, 0);
  }

  // Clear any temporary task open/claim state
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('task_opened_') || k.startsWith('task_claimed_'))) {
      localStorage.removeItem(k);
    }
  }

  // 2. Restore basic default tasks to storage
  tasksData = JSON.parse(JSON.stringify(CANONICAL_BASIC_DEFAULT_TASKS));
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
  localStorage.setItem('admin_tasks', JSON.stringify(tasksData));

  // 3. Set sync flags
  localStorage.setItem(SYNC_FLAG_KEY, Date.now().toString());
  localStorage.setItem('task_restore_flag', Date.now().toString());

  // 4. Broadcast to other open windows / tabs
  if (syncChannel) {
    syncChannel.postMessage({ type: 'TASKS_RESTORED', timestamp: Date.now() });
    syncChannel.postMessage({ type: 'TASKS_UPDATED', timestamp: Date.now() });
    syncChannel.postMessage({ type: 'CLAIMS_UPDATED', timestamp: Date.now() });
    syncChannel.postMessage({ type: 'BALANCES_UPDATED', coins: 0, stars: 0, tickets: 0, timestamp: Date.now() });
  }
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'TASKS_RESTORED', timestamp: Date.now() });
    bc.postMessage({ type: 'TASKS_UPDATED', timestamp: Date.now() });
    bc.postMessage({ type: 'BALANCES_UPDATED', coins: 0, stars: 0, tickets: 0, timestamp: Date.now() });
    bc.close();
  } catch(e) {}

  // 5. Cloud sync if Firebase is present
  if (window.Firebase && typeof window.Firebase.saveTasksToCloud === 'function') {
    window.Firebase.saveTasksToCloud(tasksData);
  }

  // 6. Refresh admin UI
  renderAdminTasksList();
  showToast('🔄 All missions restored to basic state and renewed for all players! ✓');
}
window.restoreAndRenewAllTasks = restoreAndRenewAllTasks;
