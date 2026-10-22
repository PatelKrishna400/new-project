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

// 5-Hour Cooldown Configuration (5 hours = 18,000,000 ms)
const AD_COOLDOWN_MS = 5 * 60 * 60 * 1000;
let adCooldownInterval = null;

function getAdCooldownRemaining() {
  const endTimestamp = parseInt(localStorage.getItem('task_game_shop_ad_cooldown') || '0', 10);
  if (!endTimestamp) return 0;
  const remaining = endTimestamp - Date.now();
  return remaining > 0 ? remaining : 0;
}

function formatCooldownTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateAdCooldownUI() {
  const remaining = getAdCooldownRemaining();
  const btn = document.getElementById('btnWatchAd') || document.querySelector('.shop-ad-card .btn-buy');
  const commentWrap = document.getElementById('adTimerCommentWrap');
  const timerDisplay = document.getElementById('adShopCooldownDisplay');

  if (remaining > 0) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = '🔒 Cooldown';
      btn.classList.add('btn-disabled-cooldown');
    }
    if (commentWrap) {
      commentWrap.style.display = 'flex';
    }
    if (timerDisplay) {
      timerDisplay.textContent = formatCooldownTime(remaining);
    }
    if (!adCooldownInterval) {
      adCooldownInterval = setInterval(updateAdCooldownUI, 1000);
    }
  } else {
    if (adCooldownInterval) {
      clearInterval(adCooldownInterval);
      adCooldownInterval = null;
    }
    localStorage.removeItem('task_game_shop_ad_cooldown');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Watch Ad';
      btn.classList.remove('btn-disabled-cooldown');
    }
    if (commentWrap) {
      commentWrap.style.display = 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateDisplays();
  updateAdCooldownUI();
});

function updateDisplays() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  const displayCoins = document.getElementById('shopCoinsDisplay');
  if (displayCoins) displayCoins.textContent = userCoins.toLocaleString();

  const topCoins = document.getElementById('shopCoinsDisplayTop');
  if (topCoins) topCoins.textContent = userCoins.toLocaleString();

  const displayStars = document.getElementById('shopStarsDisplay');
  if (displayStars) displayStars.textContent = userStars.toLocaleString();

  const topStars = document.getElementById('shopStarsDisplayTop');
  if (topStars) topStars.textContent = userStars.toLocaleString();
}

// Watch Ad -> Win 10 Coins (Triggers 5-Hour Cooldown with Comment Tab)
function watchAdForCoins(btn) {
  const remaining = getAdCooldownRemaining();
  if (remaining > 0) {
    alert(`⏳ Ad on Cooldown!\n\nPlease wait ${formatCooldownTime(remaining)} before watching another ad for free coins.`);
    return;
  }
  if (btn.disabled) return;

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

      // Trigger cloud sync if available
      if (typeof window.firebaseSync !== 'undefined' && typeof window.firebaseSync.saveUserData === 'function') {
        window.firebaseSync.saveUserData();
      }

      btn.textContent = '+10 🪙 Won!';
      btn.style.background = 'linear-gradient(155deg, #10b981 0%, #047857 100%)';
      btn.style.borderColor = '#34d399';

      // Set 5-hour cooldown (18,000,000 ms)
      const cooldownEnd = Date.now() + AD_COOLDOWN_MS;
      localStorage.setItem('task_game_shop_ad_cooldown', cooldownEnd.toString());

      setTimeout(() => {
        btn.style.background = '';
        btn.style.borderColor = '';
        updateAdCooldownUI();
      }, 1500);
    }
  }, 1000);
}

// Buy Stars for Coins (1 for 300, 10 for 2900, 20 for 5000)
function buyStars(starAmount, coinCost) {
  if (userCoins < coinCost) {
    const diff = coinCost - userCoins;
    alert(`Insufficient Coins!\n\nYou have ${userCoins.toLocaleString()} 🪙 but need ${coinCost.toLocaleString()} 🪙 (${diff.toLocaleString()} more).\n\nComplete webtasks or play in the Games Arena to earn more coins!`);
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

// Real-Time Cross-Tab / Cross-Window Sync
window.addEventListener('storage', (e) => {
  if (e.key === 'task_game_coins' || e.key === 'task_game_stars') {
    updateDisplays();
  }
});

try {
  const syncChannel = new BroadcastChannel('nova_task_sync');
  syncChannel.onmessage = () => {
    updateDisplays();
  };
} catch (e) {}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateDisplays();
  }
});
