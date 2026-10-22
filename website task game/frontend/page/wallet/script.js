// Wallet Vault State & Amazon Gift Card Redemption
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
if (localStorage.getItem('task_game_stars') === '850' || !localStorage.getItem('task_game_stars')) {
  localStorage.setItem('task_game_stars', '0');
}

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

// Remove any active 7-hour ad cooldown timer
localStorage.removeItem('task_game_ad_timer_end');

const REQUIRED_TASKS = 100;
const REQUIRED_ADS = 30;

function getWalletStats() {
  const tasksCount = Math.max(
    parseInt(localStorage.getItem('task_game_total_tasks_completed') || '0', 10),
    parseInt(localStorage.getItem('task_game_total_tasks') || '0', 10)
  );
  const adsCount = parseInt(localStorage.getItem('task_game_ads_watched_count') || '0', 10);
  return { tasksCount, adsCount };
}

function updateWalletDisplays() {
  userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

  const coinsFmt = userCoins.toLocaleString();
  const starsFmt = userStars.toLocaleString();

  const topCoins = document.getElementById('walletBalanceTop');
  if (topCoins) topCoins.textContent = coinsFmt;

  const topStars = document.getElementById('walletStarsTop');
  if (topStars) topStars.textContent = starsFmt;

  const userAvatar = document.querySelector('.user-avatar');
  if (userAvatar) userAvatar.textContent = localStorage.getItem('player_avatar') || '💰';

  const userName = document.querySelector('.user-name');
  if (userName) userName.textContent = localStorage.getItem('player_username') || 'NovaEarner';

  const { tasksCount, adsCount, adTimerEnd } = getWalletStats();

  // 1. Tasks progress (100 Tasks Minimum)
  const tasksProgress = Math.min(100, Math.floor((tasksCount / REQUIRED_TASKS) * 100));
  const tasksText = document.getElementById('reqTasksProgressText');
  const tasksBar = document.getElementById('reqTasksProgressBar');
  if (tasksText) tasksText.textContent = `${tasksCount} / ${REQUIRED_TASKS} (${tasksProgress}%)`;
  if (tasksBar) tasksBar.style.width = `${tasksProgress}%`;

  // 2. Ads progress (30 Ads Minimum)
  const adsProgress = Math.min(100, Math.floor((adsCount / REQUIRED_ADS) * 100));
  const adsText = document.getElementById('reqAdsProgressText');
  const adsBar = document.getElementById('reqAdsProgressBar');
  if (adsText) adsText.textContent = `${adsCount} / ${REQUIRED_ADS} (${adsProgress}%)`;
  if (adsBar) adsBar.style.width = `${adsProgress}%`;

  // 3. Status pill & Buy button badges
  const pill = document.getElementById('eligibilityStatusPill');
  const isEligible = (tasksCount >= REQUIRED_TASKS && adsCount >= REQUIRED_ADS);
  if (pill) {
    if (isEligible) {
      pill.textContent = 'ELIGIBLE TO BUY ✓';
      pill.className = 'req-status-pill unlocked';
    } else {
      pill.textContent = 'LOCKED 🔒';
      pill.className = 'req-status-pill locked';
    }
  }

  // Update Buy Buttons on Gift Cards
  const buyBtns = document.querySelectorAll('.btn-buy-giftcard');
  buyBtns.forEach(btn => {
    if (isEligible) {
      btn.classList.remove('locked-req');
      btn.innerHTML = '<span>Buy ⭐</span>';
    } else {
      btn.classList.add('locked-req');
      btn.innerHTML = '<span>🔒 Buy</span>';
    }
  });

  // 4. Watch Ad Button State & Modal Sync (Cooldown removed)
  const watchBtn = document.getElementById('btnWalletWatchAd');
  const watchBtnText = document.getElementById('btnWalletWatchAdText');
  const modalWatchBtn = document.getElementById('btnModalWatchAd');
  const modalWatchBtnText = document.getElementById('btnModalWatchAdText');

  // Modal progress elements
  const modalTasksText = document.getElementById('modalTasksRemaining');
  const modalTasksBar = document.getElementById('modalTasksProgressBar');
  if (modalTasksText) modalTasksText.textContent = `${tasksCount} / ${REQUIRED_TASKS} (${tasksCount >= REQUIRED_TASKS ? 'Done ✓' : REQUIRED_TASKS - tasksCount + ' needed'})`;
  if (modalTasksBar) modalTasksBar.style.width = `${tasksProgress}%`;

  const modalAdsText = document.getElementById('modalAdsRemaining');
  const modalAdsBar = document.getElementById('modalAdsProgressBar');
  if (modalAdsText) modalAdsText.textContent = `${adsCount} / ${REQUIRED_ADS} (${adsCount >= REQUIRED_ADS ? 'Done ✓' : REQUIRED_ADS - adsCount + ' needed'})`;
  if (modalAdsBar) modalAdsBar.style.width = `${adsProgress}%`;

  if (adsCount >= REQUIRED_ADS) {
    if (watchBtn) {
      watchBtn.disabled = true;
      if (watchBtnText) watchBtnText.textContent = '30/30 Ads Completed ✓';
    }
    if (modalWatchBtn) {
      modalWatchBtn.disabled = true;
      if (modalWatchBtnText) modalWatchBtnText.textContent = '30/30 Ads Completed ✓';
    }
  } else {
    if (watchBtn && !watchBtn.classList.contains('watching-ad')) {
      watchBtn.disabled = false;
      if (watchBtnText) watchBtnText.textContent = 'Watch Ad (+1 Count)';
    }
    if (modalWatchBtn && !modalWatchBtn.classList.contains('watching-ad')) {
      modalWatchBtn.disabled = false;
      if (modalWatchBtnText) modalWatchBtnText.textContent = 'Watch Ad ▶ (+1 Count)';
    }
  }
}

// Watch Ad Handler (Instant / No Cooldown - Increment ad count towards 30)
function handleWalletWatchAd() {
  const { adsCount } = getWalletStats();

  if (adsCount >= REQUIRED_ADS) {
    alert(`✅ Requirements Met!\n\nYou have already watched all 30 ads (${adsCount} / ${REQUIRED_ADS}). You are eligible to buy Amazon Gift Cards!`);
    return;
  }

  const btn = document.getElementById('btnWalletWatchAd');
  const btnText = document.getElementById('btnWalletWatchAdText');
  const modalBtn = document.getElementById('btnModalWatchAd');
  const modalBtnText = document.getElementById('btnModalWatchAdText');

  const onAdCompleted = () => {
    if (btn) btn.classList.remove('watching-ad');
    if (modalBtn) modalBtn.classList.remove('watching-ad');

    // Increment ad count towards 30
    const newAdsCount = Math.min(REQUIRED_ADS, adsCount + 1);
    localStorage.setItem('task_game_ads_watched_count', newAdsCount.toString());
    localStorage.removeItem('task_game_ad_timer_end');

    updateWalletDisplays();

    try {
      const syncChannel = new BroadcastChannel('nova_task_sync');
      syncChannel.postMessage({ type: 'WALLET_AD_WATCHED', timestamp: Date.now() });
    } catch (e) {}

    // Sync with Firebase Firestore if available
    if (window.Firebase && typeof window.Firebase.saveCurrentProfileToFirestore === 'function') {
      window.Firebase.saveCurrentProfileToFirestore().catch(() => {});
    }

    alert(`🎉 Ad Completed!\n\n+1 Ad Count added (${newAdsCount} / ${REQUIRED_ADS})!`);
  };

  if (btn) {
    btn.disabled = true;
    btn.classList.add('watching-ad');
  }
  if (btnText) btnText.textContent = 'Watching Ad (3s)...';

  if (modalBtn) {
    modalBtn.disabled = true;
    modalBtn.classList.add('watching-ad');
  }
  if (modalBtnText) modalBtnText.textContent = 'Watching Ad (3s)...';

  if (typeof show_10676091 === 'function') {
    show_10676091().then(() => {
      onAdCompleted();
    }).catch(e => {
      console.warn('show_10676091 notice:', e);
      onAdCompleted();
    });
  } else if (typeof window.showRewardedAd === 'function') {
    window.showRewardedAd(onAdCompleted, {
      adTitle: 'Wallet Buy Ad Verification',
      adDesc: 'Watch this short sponsor clip to increment your ad verification count.'
    });
  } else {
    let countdown = 3;
    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        if (btnText) btnText.textContent = `Watching Ad (${countdown}s)...`;
        if (modalBtnText) modalBtnText.textContent = `Watching Ad (${countdown}s)...`;
      } else {
        clearInterval(interval);
        onAdCompleted();
      }
    }, 1000);
  }
}

window.getWalletStats = getWalletStats;
window.updateWalletDisplays = updateWalletDisplays;
window.handleWalletWatchAd = handleWalletWatchAd;
window.openEligibilityModal = openEligibilityModal;
window.closeEligibilityModal = closeEligibilityModal;
window.buyGiftCard = buyGiftCard;


function openEligibilityModal(tasksCount, adsCount) {
  const modal = document.getElementById('eligibilityModalOverlay');
  updateWalletDisplays();
  if (modal) modal.classList.add('active');
}

function closeEligibilityModal() {
  const modal = document.getElementById('eligibilityModalOverlay');
  if (modal) modal.classList.remove('active');
}

// Helper to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 1. Trigger Buy: Verify Prerequisites (100 Tasks & 30 Ads) -> Open Buy Form Modal
function buyGiftCard(rsAmount, starCost, title, imgPath) {
  const { tasksCount, adsCount } = getWalletStats();
  if (tasksCount < REQUIRED_TASKS || adsCount < REQUIRED_ADS) {
    openEligibilityModal(tasksCount, adsCount);
    return;
  }
  openBuyModal(rsAmount, starCost, title, imgPath);
}

function openBuyModal(rsAmount, starCost, title, imgPath) {
  const modal = document.getElementById('buyModalOverlay');
  const imgEl = document.getElementById('buyModalImg');
  const titleEl = document.getElementById('buyModalTitle');
  const costEl = document.getElementById('buyModalCost');

  const rsInput = document.getElementById('buyParamRs');
  const starsInput = document.getElementById('buyParamStars');
  const titleInput = document.getElementById('buyParamTitle');
  const imgInput = document.getElementById('buyParamImg');

  if (imgEl) imgEl.src = imgPath;
  if (titleEl) titleEl.textContent = title;
  if (costEl) costEl.textContent = `${starCost.toLocaleString()} Stars`;

  if (rsInput) rsInput.value = rsAmount;
  if (starsInput) starsInput.value = starCost;
  if (titleInput) titleInput.value = title;
  if (imgInput) imgInput.value = imgPath;

  // Restore previous email or whatsapp if already stored
  const savedEmail = localStorage.getItem('player_email') || '';
  const savedWhatsapp = localStorage.getItem('player_whatsapp') || '';
  const emailInput = document.getElementById('buyUserEmail');
  const waInput = document.getElementById('buyUserWhatsapp');
  if (emailInput && !emailInput.value && savedEmail) emailInput.value = savedEmail;
  if (waInput && !waInput.value && savedWhatsapp) waInput.value = savedWhatsapp;

  if (modal) modal.classList.add('active');
  setTimeout(() => {
    if (emailInput) emailInput.focus();
  }, 100);
}

function closeBuyModal() {
  const modal = document.getElementById('buyModalOverlay');
  if (modal) modal.classList.remove('active');
}

// 2. Handle Form Submit: Validate, Deduct Stars & Register Order
function handleConfirmBuy(event) {
  event.preventDefault();

  const rsAmount = parseInt(document.getElementById('buyParamRs').value, 10) || 100;
  const starCost = parseInt(document.getElementById('buyParamStars').value, 10) || 1000;
  const title = document.getElementById('buyParamTitle').value || 'Amazon Gift Card';
  const imgPath = document.getElementById('buyParamImg').value || 'assets/amazon_100.jpg';

  const email = document.getElementById('buyUserEmail').value.trim();
  const whatsapp = document.getElementById('buyUserWhatsapp').value.trim();

  if (!email || !whatsapp) {
    alert('Please enter both your Email and WhatsApp number.');
    return;
  }

  // Check user stars balance
  userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);
  if (userStars < starCost) {
    const diff = starCost - userStars;
    const goToShop = confirm(
      `Insufficient Stars!\n\nYou have ${userStars.toLocaleString()} ⭐ but need ${starCost.toLocaleString()} ⭐ (${diff.toLocaleString()} more).\n\nWould you like to open the Shop to get more Stars?`
    );
    if (goToShop) {
      window.location.href = '../shop/index.html';
    }
    return;
  }

  // Save email and whatsapp for next purchase
  localStorage.setItem('player_email', email);
  localStorage.setItem('player_whatsapp', whatsapp);

  // Deduct stars
  userStars -= starCost;
  localStorage.setItem('task_game_stars', userStars.toString());
  updateWalletDisplays();

  // Cloud sync if available
  if (typeof window.firebaseSync !== 'undefined' && typeof window.firebaseSync.saveUserData === 'function') {
    window.firebaseSync.saveUserData();
  }

  // Generate unique voucher claim code
  const randomChars = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const claimCode = `AMZN-${randomChars()}-${randomChars()}-${rsAmount}R`;

  // Push into withdrawals so Admin Mission Control can review and approve it!
  try {
    const WITHDRAW_STORAGE_KEY = 'task_game_withdrawals';
    const rawWd = localStorage.getItem(WITHDRAW_STORAGE_KEY);
    const withdrawals = rawWd ? JSON.parse(rawWd) : [];
    const newOrder = {
      id: `WD-${Math.floor(1000 + Math.random() * 9000)}`,
      playerName: localStorage.getItem('player_username') || 'NovaEarner',
      playerAvatar: '🎁',
      amount: rsAmount,
      method: `Amazon (₹${rsAmount})`,
      details: `Email: ${email} • WA: ${whatsapp} [${claimCode}]`,
      time: 'Just now',
      timestamp: Date.now(),
      status: 'pending',
      userEmail: email,
      userWhatsapp: whatsapp,
      voucherCode: claimCode
    };
    withdrawals.unshift(newOrder);
    localStorage.setItem(WITHDRAW_STORAGE_KEY, JSON.stringify(withdrawals));

    // Real-time broadcast to Admin panel
    try {
      const syncChannel = new BroadcastChannel('nova_task_sync');
      syncChannel.postMessage({ type: 'WITHDRAWALS_UPDATED', timestamp: Date.now() });
    } catch (e) {}
  } catch (e) {
    console.error('Error recording wallet order:', e);
  }

  // Close Buy Form Modal
  closeBuyModal();

  // Show Voucher Success Modal
  const modal = document.getElementById('voucherModalOverlay');
  const modalImg = document.getElementById('modalVoucherImg');
  const modalTitle = document.getElementById('modalVoucherTitle');
  const modalCode = document.getElementById('modalVoucherCode');
  const modalSub = document.querySelector('.modal-voucher-sub');
  const btnCopy = document.getElementById('btnCopyCode');

  if (modalImg) modalImg.src = imgPath;
  if (modalTitle) modalTitle.textContent = title;
  if (modalCode) modalCode.textContent = claimCode;
  if (modalSub) {
    modalSub.innerHTML = `Voucher registered for <strong style="color: #38bdf8;">${escapeHtml(email)}</strong> &bull; <strong style="color: #34d399;">${escapeHtml(whatsapp)}</strong>`;
  }
  if (btnCopy) {
    btnCopy.textContent = 'Copy';
    btnCopy.disabled = false;
  }

  if (modal) modal.classList.add('active');

  // Add to transaction history
  addTransaction(`Redeemed ${title}`, `-${starCost.toLocaleString()} ⭐`, 'Just now');

  if (window.TelegramStars && typeof window.TelegramStars.addTransaction === 'function') {
    window.TelegramStars.addTransaction({
      id: `XTR-SPEND-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: -starCost,
      currency: 'XTR',
      date: Math.floor(Date.now() / 1000),
      formattedDate: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      peer: 'starsTransactionPeer',
      title: `Redeemed ${title}`,
      description: `Amazon Voucher ${claimCode}`,
      status: 'completed',
      paymentMethod: 'voucher_redemption'
    });
    if (typeof window.renderTgTransactionsLedger === 'function') {
      window.renderTgTransactionsLedger();
    }
  }
}

function closeVoucherModal() {
  const modal = document.getElementById('voucherModalOverlay');
  if (modal) modal.classList.remove('active');
}

function copyVoucherCode() {
  const codeEl = document.getElementById('modalVoucherCode');
  const btnCopy = document.getElementById('btnCopyCode');
  if (!codeEl) return;

  const code = codeEl.textContent.trim();
  navigator.clipboard.writeText(code).then(() => {
    if (btnCopy) {
      btnCopy.textContent = 'Copied! ✓';
      setTimeout(() => {
        if (btnCopy) btnCopy.textContent = 'Copy';
      }, 2500);
    }
  }).catch(() => {
    // Fallback for clipboard
    const tempInput = document.createElement('input');
    tempInput.value = code;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    if (btnCopy) {
      btnCopy.textContent = 'Copied! ✓';
      setTimeout(() => {
        if (btnCopy) btnCopy.textContent = 'Copy';
      }, 2500);
    }
  });
}

function addTransaction(name, amount, time) {
  const historyList = document.getElementById('walletHistoryList');
  if (!historyList) return;

  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <div>
      <div class="history-name">${name}</div>
      <div class="history-time">${time}</div>
    </div>
    <span class="history-amount" style="${amount.includes('⭐') ? 'color: #facc15;' : ''}">${amount}</span>
  `;
  historyList.prepend(item);
}

window.renderTgTransactionsLedger = function() {
  if (window.TelegramStars && typeof window.TelegramStars.renderTransactionsLedger === 'function') {
    window.TelegramStars.renderTransactionsLedger('tgWalletTransactionsLedger');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  updateWalletDisplays();
  window.renderTgTransactionsLedger();
  // Live 1-second countdown for the 7-hour ad timer
  setInterval(updateWalletDisplays, 1000);
});

// Real-Time Cross-Tab / Cross-Window Sync
window.addEventListener('storage', (e) => {
  if (
    e.key === 'task_game_coins' ||
    e.key === 'task_game_stars' ||
    e.key === 'task_game_total_tasks_completed' ||
    e.key === 'task_game_ads_watched_count' ||
    e.key === 'task_game_ad_timer_end' ||
    e.key === 'player_username' ||
    e.key === 'player_avatar'
  ) {
    updateWalletDisplays();
  }
});

try {
  const syncChannel = new BroadcastChannel('nova_task_sync');
  syncChannel.onmessage = () => {
    updateWalletDisplays();
  };
} catch (e) {}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateWalletDisplays();
  }
});
