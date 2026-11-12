
// ============================================================================
// 24-HOUR BACKEND SHOP BUY LIMIT SYSTEM (NO COUNTDOWN TIMER DISPLAYED ON UI)
// Standard Limit: 10 buys per item | 30-Day VIP Pass: 20 buys per item
// Completing "Shop Task" in Tasks adds bonus limit (+10 or +5)
// ============================================================================
const SHOP_CYCLE_KEY = 'task_game_shop_cycle_start';
const SHOP_PURCHASES_KEY = 'task_game_shop_item_purchases';
const SHOP_BONUS_LIMIT_KEY = 'task_game_shop_bonus_limit';
const SHOP_CYCLE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function checkAndResetShopCycle() {
  const now = Date.now();
  const cycleStart = parseInt(localStorage.getItem(SHOP_CYCLE_KEY) || '0', 10);
  if (!cycleStart || (now - cycleStart >= SHOP_CYCLE_DURATION_MS)) {
    // 24 hours elapsed: silently reset backend cycle without displaying timer on UI
    localStorage.setItem(SHOP_CYCLE_KEY, now.toString());
    localStorage.setItem(SHOP_PURCHASES_KEY, '{}');
    localStorage.setItem(SHOP_BONUS_LIMIT_KEY, '0');
  }
}

function getShopBaseLimit() {
  const expiry = parseInt(localStorage.getItem('premium_vip_expiry') || '0', 10);
  const isVip = expiry > Date.now();
  if (isVip) {
    const plan = localStorage.getItem('premium_vip_plan') || '15days';
    if (plan === '30days' || plan === '90days') {
      return 20; // 30-Day and 3-Month VIP plans upgrade shop limit to 20
    }
  }
  return 10; // Default base limit is 10
}

function getShopBonusLimit() {
  checkAndResetShopCycle();
  const bonus = parseInt(localStorage.getItem(SHOP_BONUS_LIMIT_KEY) || '0', 10);
  return isNaN(bonus) ? 0 : bonus;
}

function getShopTotalLimit() {
  return getShopBaseLimit() + getShopBonusLimit();
}

function getShopPurchasesMap() {
  checkAndResetShopCycle();
  try {
    const raw = localStorage.getItem(SHOP_PURCHASES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function getItemPurchasedCount(itemId) {
  const map = getShopPurchasesMap();
  const val = parseInt(map[itemId] || '0', 10);
  return isNaN(val) ? 0 : val;
}

function recordItemPurchase(itemId) {
  checkAndResetShopCycle();
  try {
    const map = getShopPurchasesMap();
    map[itemId] = (parseInt(map[itemId] || '0', 10)) + 1;
    localStorage.setItem(SHOP_PURCHASES_KEY, JSON.stringify(map));
  } catch (e) {}
}

function updateShopItemLimitsUI() {
  checkAndResetShopCycle();
  const baseLimit = getShopBaseLimit();
  const bonusLimit = getShopBonusLimit();
  const totalLimit = baseLimit + bonusLimit;

  // Header banner removed as requested
  const limitBanner = document.getElementById('shopLimitBanner');
  if (limitBanner) {
    limitBanner.innerHTML = '';
    limitBanner.style.display = 'none';
  }

  // Update each star card: hide the limit pill (second image view) as requested
  document.querySelectorAll('.star-shop-card').forEach((card) => {
    if (card.classList.contains('shop-ad-card')) return;

    // Hide any limit pill
    const limitPill = card.querySelector('.item-limit-pill');
    if (limitPill) {
      limitPill.style.display = 'none';
    }

    const buyBtn = card.querySelector('.btn-buy');
    if (!buyBtn) return;

    const onclickStr = buyBtn.getAttribute('onclick') || '';
    const match = onclickStr.match(/buyStars\((\d+),\s*(\d+)/);
    if (!match) return;

    const starAmount = match[1];
    const itemId = 'star_' + starAmount;
    const bought = getItemPurchasedCount(itemId);
    const limitReached = bought >= totalLimit;

    if (limitReached) {
      buyBtn.disabled = true;
      buyBtn.style.background = '#334155';
      buyBtn.style.color = '#94a3b8';
      buyBtn.style.border = '1px solid #475569';
      buyBtn.style.cursor = 'not-allowed';
      buyBtn.title = 'Daily buy limit reached. Complete a Shop Task to unlock more purchases!';
    } else {
      buyBtn.disabled = false;
      buyBtn.style.background = '';
      buyBtn.style.color = '';
      buyBtn.style.border = '';
      buyBtn.style.cursor = 'pointer';
      buyBtn.title = '';
    }
  });
}

window.checkAndResetShopCycle = checkAndResetShopCycle;
window.getShopBaseLimit = getShopBaseLimit;
window.getShopBonusLimit = getShopBonusLimit;
window.getShopTotalLimit = getShopTotalLimit;
window.getItemPurchasedCount = getItemPurchasedCount;
window.recordItemPurchase = recordItemPurchase;
window.updateShopItemLimitsUI = updateShopItemLimitsUI;

// Zero-start sanitizer: Purge all mock demo users, artificial balances, and start from 0
try {
  if (!localStorage.getItem('task_game_zero_start_clean_v7')) {
    localStorage.setItem('task_game_coins', '0');
    localStorage.setItem('task_game_stars', '0');
    localStorage.setItem('user_coins', '0');
    localStorage.setItem('user_stars', '0');
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

function getAdCooldownRemaining(type = 'coins') {
  const key = type === 'tickets' ? 'task_game_shop_ad_tickets_cooldown' : 'task_game_shop_ad_coins_cooldown';
  let endTimestamp = parseInt(localStorage.getItem(key) || '0', 10);
  if (!endTimestamp && type === 'coins') {
    endTimestamp = parseInt(localStorage.getItem('task_game_shop_ad_cooldown') || '0', 10);
  }
  if (!endTimestamp) return 0;
  const remaining = endTimestamp - Date.now();
  if (remaining > AD_COOLDOWN_MS) {
    localStorage.removeItem(key);
    if (type === 'coins') localStorage.removeItem('task_game_shop_ad_cooldown');
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
  const coinsRemaining = getAdCooldownRemaining('coins');
  const ticketsRemaining = getAdCooldownRemaining('tickets');

  const btnCoins = document.getElementById('btnWatchAdCoins') || document.getElementById('btnWatchAd');
  const btnTickets = document.getElementById('btnWatchAdTickets');

  const setBtnState = (btn, remaining) => {
    if (!btn) return;
    if (remaining > 0) {
      btn.disabled = true;
      btn.innerHTML = `<span class="cooldown-timer-tab" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 0.74rem; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid #f87171; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4); letter-spacing: 0.04em;">⏱️ ${formatCooldownTime(remaining)}</span>`;
      btn.classList.add('btn-disabled-cooldown');
    } else {
      btn.disabled = false;
      btn.textContent = 'Watch Ad 📺';
      btn.classList.remove('btn-disabled-cooldown');
    }
  };

  setBtnState(btnCoins, coinsRemaining);
  setBtnState(btnTickets, ticketsRemaining);

  if (coinsRemaining > 0 || ticketsRemaining > 0) {
    if (!adCooldownInterval) {
      adCooldownInterval = setInterval(updateAdCooldownUI, 1000);
    }
  } else {
    if (adCooldownInterval) {
      clearInterval(adCooldownInterval);
      adCooldownInterval = null;
    }
  }
}

// Real-Time Percentage Discount Calculator (1 Star = 50 Coins Baseline)
function updateRealTimeDiscounts() {
  const baseRatePerStar = 50;
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
  checkAndResetShopCycle();
  updateShopItemLimitsUI();
  updateAdCooldownUI();
  const savedTab = localStorage.getItem('task_game_shop_active_tab') || 'all';
  switchShopTab(savedTab);
});

function updateDisplays() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  const userTickets = parseInt(localStorage.getItem('task_user_tickets') || localStorage.getItem('user_tickets') || '0', 10);

  const displayCoins = document.getElementById('shopCoinsDisplay');
  if (displayCoins) displayCoins.textContent = userCoins.toLocaleString();

  const topCoins = document.getElementById('shopCoinsDisplayTop');
  if (topCoins) topCoins.textContent = userCoins.toLocaleString();

  const displayStars = document.getElementById('shopStarsDisplay');
  if (displayStars) displayStars.textContent = userStars.toLocaleString();

  const topStars = document.getElementById('shopStarsDisplayTop');
  if (topStars) topStars.textContent = userStars.toLocaleString();

  const displayTickets = document.getElementById('shopTicketsDisplay');
  if (displayTickets) displayTickets.textContent = userTickets.toLocaleString();

  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) avatarEl.textContent = localStorage.getItem('player_avatar') || '🛍️';

  const nameEl = document.querySelector('.user-name');
  if (nameEl) nameEl.textContent = localStorage.getItem('player_username') || 'Player';
}

// Free Coin Reward (+100 Coins using Ads)
function watchAdForCoins(btn) {
  const remaining = getAdCooldownRemaining('coins');
  if (remaining > 0) {
    alert(`⏳ Free Coins on Cooldown!\n\nPlease wait ${formatCooldownTime(remaining)} before claiming again.`);
    return;
  }

  const onReward = () => {
    const rewardCoins = 100;
    if (window.firebaseSync && typeof window.firebaseSync.addCoins === 'function') {
      userCoins = window.firebaseSync.addCoins(rewardCoins, 'Watch Ad Free Coins');
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

    // Set 5-hour cooldown for coins
    const endTimestamp = Date.now() + AD_COOLDOWN_MS;
    localStorage.setItem('task_game_shop_ad_coins_cooldown', endTimestamp.toString());
    localStorage.setItem('task_game_shop_ad_cooldown', endTimestamp.toString());

    // Track completed claim / ad count for tasks and leaderboard
    const adsCount = parseInt(localStorage.getItem('task_game_ads_watched_count') || '0', 10) + 1;
    localStorage.setItem('task_game_ads_watched_count', adsCount.toString());
    localStorage.setItem('ads_watched_count', adsCount.toString());

    updateDisplays();
    if (typeof shopSfx !== 'undefined' && shopSfx.playCoin) shopSfx.playCoin();

    try {
      const syncChannel = new BroadcastChannel('nova_task_sync');
      syncChannel.postMessage({ type: 'BALANCES_UPDATED', newCoins: userCoins, timestamp: Date.now() });
    } catch (e) {}

    updateAdCooldownUI();

    alert(`🎁 Free Coins Claimed!\n\nYou won +${rewardCoins} 🪙 Coins!\nTotal Coins: ${userCoins.toLocaleString()} 🪙`);
  };

  onReward();
}

// Free Ticket Reward (+5 Tickets using Ads)
function watchAdForTickets(btn) {
  const remaining = getAdCooldownRemaining('tickets');
  if (remaining > 0) {
    alert(`⏳ Free Tickets on Cooldown!\n\nPlease wait ${formatCooldownTime(remaining)} before claiming again.`);
    return;
  }

  const onReward = () => {
    const rewardTickets = 5;
    const currentTickets = parseInt(localStorage.getItem('task_user_tickets') || localStorage.getItem('user_tickets') || '0', 10);
    const newTickets = currentTickets + rewardTickets;
    userTickets = newTickets;
    localStorage.setItem('task_user_tickets', newTickets.toString());
    localStorage.setItem('user_tickets', newTickets.toString());
    if (typeof updateDailyStreakHeaderDisplays === 'function') {
      updateDailyStreakHeaderDisplays();
    }

    if (typeof window.saveCurrentProfileToFirestore === 'function') {
      window.saveCurrentProfileToFirestore();
    }

    // Set 5-hour cooldown for tickets
    const endTimestamp = Date.now() + AD_COOLDOWN_MS;
    localStorage.setItem('task_game_shop_ad_tickets_cooldown', endTimestamp.toString());

    // Track completed claim / ad count for tasks and leaderboard
    const adsCount = parseInt(localStorage.getItem('task_game_ads_watched_count') || '0', 10) + 1;
    localStorage.setItem('task_game_ads_watched_count', adsCount.toString());
    localStorage.setItem('ads_watched_count', adsCount.toString());

    updateDisplays();
    if (typeof shopSfx !== 'undefined' && shopSfx.playCoin) shopSfx.playCoin();

    try {
      const syncChannel = new BroadcastChannel('nova_task_sync');
      syncChannel.postMessage({ type: 'BALANCES_UPDATED', newTickets, timestamp: Date.now() });
    } catch (e) {}

    updateAdCooldownUI();

    alert(`🎟️ Free Tickets Claimed!\n\nYou won +${rewardTickets} 🎟️ Tickets!\nTotal Tickets: ${newTickets.toLocaleString()} 🎟️`);
  };

  onReward();
}

// All Shop Items Visible (Category Tabs Removed)
function switchShopTab(tab) {
  const ticketItems = document.querySelectorAll('.shop-item-ticket, .ticket-shop-card');
  const coinItems = document.querySelectorAll('.shop-item-coin');
  const ticketSectionHeader = document.querySelector('.shop-section-header');
  ticketItems.forEach(el => el.style.display = '');
  coinItems.forEach(el => el.style.display = '');
  if (ticketSectionHeader) ticketSectionHeader.style.display = '';
  localStorage.setItem('task_game_shop_active_tab', 'all');
}

window.switchShopTab = switchShopTab;
window.watchAdForTickets = watchAdForTickets;
window.watchAdForCoins = watchAdForCoins;
window.buyStars = buyStars;

// Buy Tickets with Telegram Stars (10 Stars -> 100 Tickets, 20 Stars -> 500 Tickets, 50 Stars -> 1,000 Tickets)
function buyTicketsWithStars(ticketAmount, starCost) {
  let stars = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10) || 0;
  if (stars < starCost) {
    const diff = starCost - stars;
    alert(`Insufficient Stars!\n\nYou have ${stars} ⭐ Stars but need ${starCost} ⭐ Stars (${diff} more).\n\nTop up your Telegram Stars or earn them in the Star Game to buy tickets!`);
    return;
  }

  // Deduct stars
  stars -= starCost;
  userStars = stars;
  localStorage.setItem('task_game_stars', stars.toString());
  localStorage.setItem('user_stars', stars.toString());

  // Add tickets
  const currentTickets = parseInt(localStorage.getItem('task_user_tickets') || localStorage.getItem('user_tickets') || '0', 10) || 0;
  const newTickets = currentTickets + ticketAmount;
  localStorage.setItem('task_user_tickets', newTickets.toString());
  localStorage.setItem('user_tickets', newTickets.toString());

  // Update UI & broadcast
  updateDisplays();
  if (typeof window.updateAllDomBalances === 'function') {
    window.updateAllDomBalances(userCoins, userStars);
  }
  if (typeof updateDailyStreakHeaderDisplays === 'function') {
    updateDailyStreakHeaderDisplays();
  }
  if (typeof shopSfx !== 'undefined' && shopSfx.playPurchase) {
    shopSfx.playPurchase();
  } else if (typeof shopSfx !== 'undefined' && shopSfx.playCoin) {
    shopSfx.playCoin();
  }

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.postMessage({ type: 'TICKETS_PURCHASED', starCost, ticketAmount, newTickets, stars, timestamp: Date.now() });
  } catch (e) {}

  alert(`🎉 Purchase Successful!\n\nYou exchanged ${starCost} ⭐ Stars for ${ticketAmount.toLocaleString()} 🎟️ Tickets!\n\nTotal Tickets: ${newTickets.toLocaleString()} 🎟️\nRemaining Stars: ${stars.toLocaleString()} ⭐`);
}

window.buyTicketsWithStars = buyTicketsWithStars;

// Buy Stars for Coins (10 for 480, 20 for 920, 50 for 2,000, 100 for 3,750, 500 for 15,000)
function buyStars(starAmount, coinCost, explicitItemId) {
  checkAndResetShopCycle();
  const itemId = explicitItemId || ('star_' + starAmount);
  const totalLimit = getShopTotalLimit();
  const currentPurchases = getItemPurchasedCount(itemId);

  if (currentPurchases >= totalLimit) {
    if (confirm(`🛑 Purchase Limit Reached!\n\nYou have purchased this item ${currentPurchases}/${totalLimit} times today.\n\nWould you like to complete a "Shop Task" in the Tasks section to unlock +10 more purchases?`)) {
      window.location.href = '../home/index.html';
    }
    return;
  }
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
  recordItemPurchase(itemId);
  updateShopItemLimitsUI();
  shopSfx.playStarChime();

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.postMessage({ type: 'BALANCES_UPDATED', timestamp: Date.now() });
  } catch (e) {}

  if (window.TelegramStars && typeof window.TelegramStars.addTransaction === 'function') {
    window.TelegramStars.addTransaction({
      id: `XTR-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: starAmount,
      currency: 'XTR',
      date: Math.floor(Date.now() / 1000),
      formattedDate: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      peer: 'starsTransactionPeer',
      title: `${starAmount} Stars Exchange`,
      description: `Converted ${coinCost} Coins to Stars`,
      status: 'completed',
      paymentMethod: 'coins_exchange'
    });
  }

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

  try {
    const syncChannel = new BroadcastChannel('nova_task_sync');
    syncChannel.postMessage({ type: 'BALANCES_UPDATED', timestamp: Date.now() });
  } catch (e) {}

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
