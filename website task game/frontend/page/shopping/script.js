// Shop Logic with Star Exchange & Watch Ad Rewards
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
if (localStorage.getItem('task_game_stars') === '850' || !localStorage.getItem('task_game_stars')) {
  localStorage.setItem('task_game_stars', '0');
}

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

// Simple Web Audio API Sound Synthesizer
const shopSfx = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  playCoin() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {}
  },
  playStarChime() {
    this.init();
    if (!this.ctx) return;
    try {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        setTimeout(() => {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.22);
        }, idx * 60);
      });
    } catch (e) {}
  }
};

document.addEventListener('DOMContentLoaded', () => {
  updateDisplays();
});

function updateDisplays() {
  const displayCoins = document.getElementById('shopCoinsDisplay');
  if (displayCoins) displayCoins.textContent = userCoins.toLocaleString();

  const displayStars = document.getElementById('shopStarsDisplay');
  if (displayStars) displayStars.textContent = userStars.toLocaleString();
}

// Watch Ad -> Win 10 Coins
function watchAdForCoins(btn) {
  if (btn.disabled) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Watching (3s)...';

  let countdown = 3;
  const interval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      btn.textContent = `Watching (${countdown}s)...`;
    } else {
      clearInterval(interval);
      userCoins += 10;
      localStorage.setItem('task_game_coins', userCoins.toString());
      updateDisplays();
      shopSfx.playCoin();

      btn.textContent = '+10 🪙 Won!';
      btn.style.background = 'linear-gradient(155deg, #10b981 0%, #047857 100%)';
      btn.style.borderColor = '#34d399';

      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Watch Again (+10 🪙)';
        btn.style.background = '';
        btn.style.borderColor = '';
      }, 2000);
    }
  }, 1000);
}

// Buy Stars for Coins (1 for 300, 10 for 2900, 20 for 5000)
function buyStars(starAmount, coinCost) {
  if (userCoins < coinCost) {
    const diff = coinCost - userCoins;
    alert(`Insufficient Coins!\n\nYou have ${userCoins.toLocaleString()} 🪙 but need ${coinCost.toLocaleString()} 🪙 (${diff.toLocaleString()} more).\n\nComplete daily tasks or play in the Games Arena to earn more coins!`);
    return;
  }

  userCoins -= coinCost;
  userStars += starAmount;

  localStorage.setItem('task_game_coins', userCoins.toString());
  localStorage.setItem('task_game_stars', userStars.toString());
  updateDisplays();
  shopSfx.playStarChime();

  alert(`⭐ Star Purchase Successful!\n\nYou converted ${coinCost.toLocaleString()} 🪙 Coins into +${starAmount} ⭐ Stars!\nTotal Stars: ${userStars.toLocaleString()} ⭐`);
}

function buyItem(btn, price, itemName) {
  if (userCoins < price) {
    alert(`Insufficient coins! You need ${price} 🪙 to purchase ${itemName}.`);
    return;
  }

  userCoins -= price;
  localStorage.setItem('task_game_coins', userCoins.toString());
  updateDisplays();
  shopSfx.playCoin();

  btn.textContent = 'Owned ✓';
  btn.disabled = true;
  alert(`🎉 Purchase Successful!\n\nYou acquired: ${itemName}\nCoins remaining: ${userCoins.toLocaleString()} 🪙`);
}
