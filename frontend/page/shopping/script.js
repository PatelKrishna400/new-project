
// Ads removed
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

  updateShopButtonAffordability();
}

// Match-Value Button Affordability: changes button from gray to green if user balance >= item cost
function updateShopButtonAffordability() {
  const currentCoins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10) || 0;
  const currentStars = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10) || 0;

  // 1. Star shop cards (Paying with Coins)
  document.querySelectorAll('.btn-buy').forEach((buyBtn) => {
    const onclickStr = buyBtn.getAttribute('onclick') || '';
    const match = onclickStr.match(/buyStars\((\d+),\s*(\d+)\)/);
    if (match) {
      const coinsRequired = parseInt(match[2], 10);
      if (currentCoins >= coinsRequired) {
        buyBtn.classList.add('btn-affordable');
      } else {
        buyBtn.classList.remove('btn-affordable');
      }
    }
  });

  // 2. Ticket store cards (Paying with Stars)
  document.querySelectorAll('.btn-buy').forEach((buyBtn) => {
    const onclickStr = buyBtn.getAttribute('onclick') || '';
    const match = onclickStr.match(/buyTicketsWithStars\((\d+),\s*(\d+)\)/);
    if (match) {
      const starsRequired = parseInt(match[2], 10);
      if (currentStars >= starsRequired) {
        buyBtn.classList.add('btn-affordable');
      } else {
        buyBtn.classList.remove('btn-affordable');
      }
    }
  });

  // 3. Ad Watch Buttons (Always affordable/available)
  const btnCoinsAd = document.getElementById('btnWatchAdCoins');
  if (btnCoinsAd) btnCoinsAd.classList.add('btn-affordable');
  const btnTicketsAd = document.getElementById('btnWatchAdTickets');
  if (btnTicketsAd) btnTicketsAd.classList.add('btn-affordable');
}
window.updateShopButtonAffordability = updateShopButtonAffordability;

// ============================================================================
// WATCH ADS REWARDS: +100 COINS (Star Store) & +1 TICKET (Ticket Store)
// ============================================================================

// Fallback in case Monetag SDK is loading, blocked, or unavailable
if (typeof window.show_11677609 !== 'function') {
  window.show_11677609 = function() {
    return new Promise((resolve) => {
      console.log('[Ad] show_11677609 fallback invoked');
      resolve();
    });
  };
}

function watchAdForCoins(btn) {
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : 'Watch Ad 📺';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Loading 📺...';
  }

  // Rewarded interstitial
  show_11677609().then(() => {
    // You need to add your user reward function here, which will be executed after the user watches the ad.
    // For more details, please refer to the detailed instructions.
    alert('You have seen an ad!');

    let coins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10) || 0;
    coins += 100;
    userCoins = coins;
    localStorage.setItem('task_game_coins', coins.toString());
    localStorage.setItem('user_coins', coins.toString());

    if (window.firebaseSync && typeof window.firebaseSync.addCoins === 'function') {
      window.firebaseSync.addCoins(100);
    }

    updateDisplays();
    if (typeof window.updateAllDomBalances === 'function') {
      window.updateAllDomBalances(userCoins, userStars);
    }
    if (typeof updateDailyStreakHeaderDisplays === 'function') {
      updateDailyStreakHeaderDisplays();
    }

    if (typeof shopSfx !== 'undefined' && shopSfx.playCoin) {
      shopSfx.playCoin();
    }

    try {
      const bc = new BroadcastChannel('nova_task_sync');
      bc.postMessage({ type: 'AD_REWARD_COINS', amount: 100, newCoins: coins, timestamp: Date.now() });
    } catch (e) {}
  }).catch((err) => {
    console.warn('Ad error:', err);
  }).finally(() => {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      btn.classList.add('btn-affordable');
    }
  });
}
window.watchAdForCoins = watchAdForCoins;

function watchAdForTickets(btn) {
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : 'Watch Ad 📺';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Loading 📺...';
  }

  // Rewarded interstitial
  show_11677609().then(() => {
    // You need to add your user reward function here, which will be executed after the user watches the ad.
    // For more details, please refer to the detailed instructions.
    alert('You have seen an ad!');

    let tickets = parseInt(localStorage.getItem('task_user_tickets') || localStorage.getItem('user_tickets') || '0', 10) || 0;
    tickets += 1;
    localStorage.setItem('task_user_tickets', tickets.toString());
    localStorage.setItem('user_tickets', tickets.toString());

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
      const bc = new BroadcastChannel('nova_task_sync');
      bc.postMessage({ type: 'AD_REWARD_TICKETS', amount: 1, newTickets: tickets, timestamp: Date.now() });
    } catch (e) {}
  }).catch((err) => {
    console.warn('Ad error:', err);
  }).finally(() => {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      btn.classList.add('btn-affordable');
    }
  });
}
window.watchAdForTickets = watchAdForTickets;

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
    syncChannel.postMessage({ type: 'BALANCES_UPDATED', coins: userCoins, stars: userStars, tickets: newTickets, timestamp: Date.now() });
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('balance:changed'));

  alert(`🎉 Purchase Successful!\n\nYou exchanged ${starCost} ⭐ Stars for ${ticketAmount.toLocaleString()} 🎟️ Tickets!\n\nTotal Tickets: ${newTickets.toLocaleString()} 🎟️\nRemaining Stars: ${stars.toLocaleString()} ⭐`);
}

window.buyTicketsWithStars = buyTicketsWithStars;

// Buy Stars for Coins (50 for 2,000, 100 for 3,750, 500 for 15,000)
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
  if (e.key === 'task_game_coins' || e.key === 'task_game_stars' || e.key === 'task_user_tickets' || e.key === 'user_tickets' || e.key === 'user_coins' || e.key === 'user_stars') {
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
