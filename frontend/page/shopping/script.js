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
  if (remaining > AD_COOLDOWN_MS) {
    localStorage.removeItem('task_game_shop_ad_cooldown');
    return 0;
  }
  return remaining > 0 ? remaining : 0;
}

function formatCooldownTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function autoLoginWithTelegram() {
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
      if (typeof tg.ready === 'function') tg.ready();
      if (typeof tg.expand === 'function') tg.expand();
      const tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user;
      if (tgUser) {
        const username = tgUser.username 
          || [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') 
          || 'Task Earner';
        localStorage.setItem('player_username', username);
        localStorage.setItem('player_id', `tg_${tgUser.id}`);
        localStorage.setItem('player_logged_in', 'true');
        if (tgUser.photo_url) localStorage.setItem('player_avatar_url', tgUser.photo_url);
        return;
      }
    }
    localStorage.setItem('player_logged_in', 'true');
    const existingName = localStorage.getItem('player_username');
    if (!existingName || existingName === 'NovaEarner' || existingName === 'Player') {
      localStorage.setItem('player_username', 'Task Earner');
    }
  } catch (e) {
    localStorage.setItem('player_logged_in', 'true');
  }
}

function updateAdCooldownUI() {
  const remaining = getAdCooldownRemaining();
  const btn = document.getElementById('btnWatchAd') || document.querySelector('.shop-ad-card .btn-buy');

  // Ensure any comment bubble from Image 1 is removed
  const commentWrap = document.getElementById('adTimerCommentWrap') || document.querySelector('.ad-timer-comment-wrap');
  if (commentWrap) commentWrap.remove();

  if (remaining > 0) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="cooldown-timer-tab" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 0.74rem; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid #f87171; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4); letter-spacing: 0.04em;">⏱️ ${formatCooldownTime(remaining)}</span>`;
      btn.classList.add('btn-disabled-cooldown');
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
  }
}

// Real-Time Percentage Discount Calculator (1 Star = 500 Coins Baseline)
function updateRealTimeDiscounts() {
  const baseRatePerStar = 500;
  document.querySelectorAll('.star-shop-card').forEach(card => {
    const buyBtn = card.querySelector('.btn-buy');
    const badge = card.querySelector('.star-pack-badge');
    if (!buyBtn || !badge) return;

    const onclickStr = buyBtn.getAttribute('onclick') || '';
    const match = onclickStr.match(/buyStars\((\d+),\s*(\d+)\)/);
    if (match) {
      const stars = parseInt(match[1], 10);
      const cost = parseInt(match[2], 10);
      const regularCost = stars * baseRatePerStar;

      if (stars > 1 && regularCost > cost) {
        const discountPct = Math.round(((regularCost - cost) / regularCost) * 100);
        badge.textContent = `${discountPct}%`;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  autoLoginWithTelegram();
  updateDisplays();
  updateRealTimeDiscounts();
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

// Free Gift Reward (+10 Coins using Ads)
function watchAdForCoins(btn) {
  const remaining = getAdCooldownRemaining();
  if (remaining > 0) {
    alert(`⏳ Free Gift on Cooldown!\n\nPlease wait ${formatCooldownTime(remaining)} before claiming again.`);
    return;
  }

  // Trigger ad view
  try {
    if (typeof window.openWatchAd === 'function') {
      window.openWatchAd({
        onReward: () => {}
      });
    } else {
      window.open('https://otieuche.com/4/8893420', '_blank');
    }
  } catch (e) {
    try { window.open('https://otieuche.com/4/8893420', '_blank'); } catch (err) {}
  }

  const rewardCoins = 10;
  if (window.firebaseSync && typeof window.firebaseSync.addCoins === 'function') {
    userCoins = window.firebaseSync.addCoins(rewardCoins, 'Watch Ad Free Gift');
  } else {
    userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10) + rewardCoins;
    localStorage.setItem('task_game_coins', userCoins.toString());
    localStorage.setItem('user_coins', userCoins.toString());
  }
  if (typeof window.updateAllDomBalances === 'function') {
    window.updateAllDomBalances(userCoins, userStars);
  }
  if (typeof window.saveCurrentProfileToFirestore === 'function') {
    window.saveCurrentProfileToFirestore();
  }

  // Set 5-hour cooldown
  const endTimestamp = Date.now() + AD_COOLDOWN_MS;
  localStorage.setItem('task_game_shop_ad_cooldown', endTimestamp.toString());

  // Track completed claim / ad count for tasks and leaderboard
  const adsCount = parseInt(localStorage.getItem('task_game_ads_watched_count') || '0', 10) + 1;
  localStorage.setItem('task_game_ads_watched_count', adsCount.toString());
  localStorage.setItem('ads_watched_count', adsCount.toString());

  updateDisplays();
  shopSfx.playCoin();

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.postMessage({ type: 'BALANCES_UPDATED', timestamp: Date.now() });
  } catch (e) {}

  updateAdCooldownUI();

  alert(`🎁 Free Gift Claimed!\n\nYou watched an ad and won +${rewardCoins} 🪙 Coins!\nTotal Coins: ${userCoins.toLocaleString()} 🪙`);
}
window.watchAdForCoins = watchAdForCoins;
window.buyStars = buyStars;

// Buy Stars for Coins (1 for 500, 10 for 4800, 20 for 9600, 50 for 20000)
function buyStars(starAmount, coinCost) {
  if (userCoins < coinCost) {
    const diff = coinCost - userCoins;
    alert(`Insufficient Coins!\n\nYou have ${userCoins.toLocaleString()} 🪙 but need ${coinCost.toLocaleString()} 🪙 (${diff.toLocaleString()} more).\n\nComplete webtasks or play in the Games Arena to earn more coins!`);
    return;
  }

  if (window.firebaseSync && typeof window.firebaseSync.subtractCoins === 'function') {
    window.firebaseSync.subtractCoins(coinCost, 'Buy Stars');
    window.firebaseSync.addStars(starAmount, 'Bought Stars');
    userCoins = window.firebaseSync.getCoins();
    userStars = window.firebaseSync.getStars();
  } else {
    userCoins -= coinCost;
    userStars += starAmount;
    localStorage.setItem('task_game_coins', userCoins.toString());
    localStorage.setItem('user_coins', userCoins.toString());
    localStorage.setItem('task_game_stars', userStars.toString());
    localStorage.setItem('user_stars', userStars.toString());
  }

  if (typeof window.updateAllDomBalances === 'function') {
    window.updateAllDomBalances(userCoins, userStars);
  }
  if (typeof window.saveCurrentProfileToFirestore === 'function') {
    window.saveCurrentProfileToFirestore();
  }
  updateDisplays();
  shopSfx.playStarChime();

  alert(`⭐ Star Purchase Successful!\n\nYou converted ${coinCost.toLocaleString()} 🪙 Coins into +${starAmount} ⭐ Stars!\nTotal Stars: ${userStars.toLocaleString()} ⭐`);
}

function buyItem(btn, price, itemName) {
  if (userCoins < price) {
    alert(`Insufficient coins! You need ${price} 🪙 to purchase ${itemName}.`);
    return;
  }

  if (window.firebaseSync && typeof window.firebaseSync.subtractCoins === 'function') {
    const res = window.firebaseSync.subtractCoins(price, `Bought ${itemName}`);
    if (res === false) {
      alert(`Insufficient coins! You need ${price.toLocaleString()} 🪙 to purchase ${itemName}.`);
      return;
    }
    userCoins = res;
  } else {
    userCoins -= price;
    localStorage.setItem('task_game_coins', userCoins.toString());
    localStorage.setItem('user_coins', userCoins.toString());
  }

  if (typeof window.updateAllDomBalances === 'function') {
    window.updateAllDomBalances(userCoins, userStars);
  }
  if (typeof window.saveCurrentProfileToFirestore === 'function') {
    window.saveCurrentProfileToFirestore();
  }
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

window.addEventListener('balance:changed', () => {
  updateDisplays();
});

window.addEventListener('balance:synced', () => {
  updateDisplays();
});
