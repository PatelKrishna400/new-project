const fs = require('fs');
const cssPath = 'frontend/page/profile/style.css';
let css = fs.readFileSync(cssPath, 'utf8');

const extraCss = `
/* ==========================================================================
   ADMIN EVENT PAGE TABS & EDITORS (PRO TASKS • PASS • LEADERBOARD)
   ========================================================================== */
.admin-event-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
  border-bottom: 1.5px solid rgba(56, 189, 248, 0.25);
  padding-bottom: 0.75rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.admin-event-tabs::-webkit-scrollbar { display: none; }

.admin-event-tab-btn {
  flex: 1;
  min-width: 105px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.65rem 0.85rem;
  background: rgba(15, 23, 42, 0.85);
  border: 1.5px solid rgba(56, 189, 248, 0.25);
  border-radius: 12px;
  color: #94a3b8;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  white-space: nowrap;
}

.admin-event-tab-btn:hover {
  border-color: rgba(56, 189, 248, 0.6);
  color: #ffffff;
  background: rgba(20, 35, 75, 0.95);
  transform: translateY(-1px);
}

.admin-event-tab-btn.active {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  border-color: #38bdf8;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.45);
}

.admin-event-tab-btn.tab-pro.active {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  border-color: #34d399;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.45);
}

.admin-event-tab-btn.tab-pass.active {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  border-color: #facc15;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.45);
}

.admin-event-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pro-card-accent {
  background: linear-gradient(145deg, #062b1e 0%, #06181b 100%) !important;
  border: 1.5px solid rgba(52, 211, 153, 0.45) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(16, 185, 129, 0.15) !important;
}

.pass-card-accent {
  background: linear-gradient(145deg, #2b1f06 0%, #171104 100%) !important;
  border: 1.5px solid rgba(250, 204, 21, 0.45) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(250, 204, 21, 0.15) !important;
}

.pro-event-live-pill {
  font-size: 0.7rem;
  font-weight: 900;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(52, 211, 153, 0.5);
  color: #34d399;
  letter-spacing: 0.04em;
}

.pass-live-pill {
  font-size: 0.7rem;
  font-weight: 900;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.2);
  border: 1px solid rgba(250, 204, 21, 0.5);
  color: #facc15;
  letter-spacing: 0.04em;
}

.btn-admin-pro-edit, .btn-admin-pass-edit {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-admin-pro-edit {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}
.btn-admin-pro-edit:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.btn-admin-pass-edit {
  background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
  color: #1a1202;
  box-shadow: 0 2px 8px rgba(250, 204, 21, 0.4);
}
.btn-admin-pass-edit:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.btn-admin-pro-toggle, .btn-admin-pass-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 800;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #cbd5e1;
  cursor: pointer;
}
.btn-admin-pro-toggle:hover, .btn-admin-pass-toggle:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: #ffffff;
}

.pro-metrics-grid, .pass-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 0.5rem;
}

.pro-metric-box, .pass-metric-box {
  background: #060e24;
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 10px;
  padding: 0.45rem 0.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-size: 0.92rem;
  font-weight: 900;
  color: #ffffff;
}

.pro-metric-box small, .pass-metric-box small {
  font-size: 0.55rem;
  color: #94a3b8;
  font-weight: 700;
  margin-bottom: 2px;
}

.pro-tasks-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pro-subtask-card {
  background: linear-gradient(145deg, #0f1c34 0%, #0a1324 100%);
  border: 1.5px solid rgba(52, 211, 153, 0.3);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}

.pro-subtask-info {
  flex: 1;
  min-width: 0;
}

.pro-subtask-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  flex-wrap: wrap;
}

.pro-subtask-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.pro-subtask-badge.half-bounty {
  background: rgba(250, 204, 21, 0.2);
  color: #facc15;
  border: 1px solid rgba(250, 204, 21, 0.4);
}

.pass-milestones-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}

.pass-milestone-card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(250, 204, 21, 0.3);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  text-align: center;
}
`;

if (!css.includes('.admin-event-tabs')) {
  css += '\n' + extraCss;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Appended Event Tabs CSS to profile/style.css');
} else {
  console.log('Already has .admin-event-tabs CSS');
}
