// Task Claiming Logic with Web Audio Synthesis
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

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

document.addEventListener('DOMContentLoaded', () => {
  updateCoinDisplay();

  // Cybernetic Loading Screen Progression (Transitions into Home Page)
  const overlay = document.getElementById('appLoadingOverlay');
  const bar = document.getElementById('loadingProgressBar');
  const statusText = document.getElementById('loadingStatusText');

  if (overlay && bar) {
    let progress = 0;
    const steps = [
      { p: 25, msg: 'INITIALIZING SYSTEM...' },
      { p: 55, msg: 'CONNECTING SECURE VAULT...' },
      { p: 85, msg: 'SYNCHRONIZING REWARDS...' },
      { p: 100, msg: 'ARENA READY!' }
    ];
    let stepIdx = 0;

    const loadInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        progress = steps[stepIdx].p;
        bar.style.width = `${progress}%`;
        if (statusText) statusText.textContent = steps[stepIdx].msg;
        stepIdx++;
      } else {
        clearInterval(loadInterval);
        HomeAudio.playStartupChime();
        setTimeout(() => {
          overlay.classList.add('fade-out');
          setTimeout(() => overlay.remove(), 550);
        }, 300);
      }
    }, 220);
  }
});

function claimTask(btn, rewardAmount) {
  if (btn.disabled) return;

  btn.disabled = true;
  btn.textContent = 'Claimed ✓';

  const card = btn.closest('.task-card');
  if (card) {
    card.classList.add('completed');
  }

  // Floating +coins animation
  showFloatingCoin(btn, `+${rewardAmount} 🪙`);

  // Update user coins
  userCoins += rewardAmount;
  localStorage.setItem('task_game_coins', userCoins.toString());
  updateCoinDisplay();
  HomeAudio.playCoinClaim();
}

function updateCoinDisplay() {
  const display = document.getElementById('userCoinsDisplay');
  if (display) {
    display.textContent = userCoins.toLocaleString();
  }

  const pill = document.getElementById('coinPill');
  if (pill) {
    pill.style.transform = 'scale(1.1)';
    setTimeout(() => {
      pill.style.transform = 'scale(1)';
    }, 200);
  }
}

function showFloatingCoin(targetElement, text) {
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
