// Leaderboard Interactive Controller & State Sync
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
if (localStorage.getItem('task_game_stars') === '850' || !localStorage.getItem('task_game_stars')) {
  localStorage.setItem('task_game_stars', '0');
}

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

// Web Audio API Sound Synthesizer for Leaderboard Tabs
const LeaderboardAudio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  playTabSwitch() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, t);
      osc.frequency.setValueAtTime(880, t + 0.05);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) {}
  }
};

window.switchLeaderboardTab = function(tabName) {
  LeaderboardAudio.playTabSwitch();

  const panelLeaderboard = document.getElementById('panelLeaderboard');
  const panelYourRank = document.getElementById('panelYourRank');
  const tabBtnLeaderboard = document.getElementById('tabBtnLeaderboard');
  const tabBtnYourRank = document.getElementById('tabBtnYourRank');
  const staticYourRankBar = document.getElementById('staticYourRankBar');

  if (tabName === 'leaderboard') {
    if (panelLeaderboard) panelLeaderboard.style.display = 'block';
    if (panelYourRank) panelYourRank.style.display = 'none';
    if (tabBtnLeaderboard) tabBtnLeaderboard.classList.add('active');
    if (tabBtnYourRank) tabBtnYourRank.classList.remove('active');
    if (staticYourRankBar) staticYourRankBar.style.display = 'flex';
  } else {
    if (panelLeaderboard) panelLeaderboard.style.display = 'none';
    if (panelYourRank) panelYourRank.style.display = 'block';
    if (tabBtnLeaderboard) tabBtnLeaderboard.classList.remove('active');
    if (tabBtnYourRank) tabBtnYourRank.classList.add('active');
    if (staticYourRankBar) staticYourRankBar.style.display = 'none';
  }
};

function updateLeaderboardDisplays() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  const topCoins = document.getElementById('leaderboardCoinsTop');
  const scrollCoins = document.getElementById('userScrollCoins');
  const stickyCoins = document.getElementById('stickyUserCoins');
  const detailCoins = document.getElementById('detailCoins');
  const detailStars = document.getElementById('detailStars');

  const coinsStr = `${userCoins.toLocaleString()} 🪙`;
  const starsStr = `${userStars.toLocaleString()} ⭐`;

  if (topCoins) topCoins.textContent = userCoins.toLocaleString();
  if (scrollCoins) scrollCoins.textContent = coinsStr;
  if (stickyCoins) stickyCoins.textContent = coinsStr;
  if (detailCoins) detailCoins.textContent = coinsStr;
  if (detailStars) detailStars.textContent = starsStr;
}

document.addEventListener('DOMContentLoaded', () => {
  updateLeaderboardDisplays();

  // Highlight or scroll to user's rank if needed
  const userRow = document.querySelector('.leader-row-card.highlight-me');
  const scrollContainer = document.getElementById('ranksScrollContainer');
  if (userRow && scrollContainer) {
    // Keep user's card easily viewable in list
    userRow.addEventListener('click', () => {
      switchLeaderboardTab('your-rank');
    });
  }

  // Initialize audio on first click
  document.addEventListener('click', () => {
    LeaderboardAudio.init();
  }, { once: true });
});
