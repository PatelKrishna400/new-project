// Zero-start sanitizer: Purge all mock demo users, artificial balances, and start from 0
try {
  if (!localStorage.getItem('task_game_zero_start_clean_v5')) {
    localStorage.setItem('task_game_coins', '0');
    localStorage.setItem('task_game_stars', '0');
    localStorage.setItem('task_game_total_tasks', '0');
    localStorage.setItem('task_game_total_tasks_completed', '0');
    localStorage.setItem('task_game_ads_watched_count', '0');
    localStorage.setItem('task_game_event_tasks', '0');
    localStorage.setItem('task_game_event_tasks_count', '0');
    localStorage.setItem('task_coins_won_today', '0');
    localStorage.setItem('task_games_played_today', '0');
    localStorage.setItem('task_win_streak', '0');
    localStorage.removeItem('task_game_users');
    localStorage.removeItem('task_game_withdrawals');
    localStorage.removeItem('task_game_referrals_list');
    localStorage.removeItem('task_game_stars_transactions');
    localStorage.removeItem('task_game_stars_rating');
    localStorage.removeItem('task_game_claims');
    localStorage.removeItem('task_game_cloud_referral_codes');
    localStorage.removeItem('task_game_ad_timer_end');
    localStorage.removeItem('ENERGY_TAP_SUNFLOWER_STATE_V4');
    localStorage.removeItem('task_game_tg_profile');
    localStorage.removeItem('player_email');
    localStorage.removeItem('player_whatsapp');
    const existingName = localStorage.getItem('player_username');
    if (!existingName || existingName.toLowerCase().includes('nova')) {
      localStorage.setItem('player_username', 'Player');
    }
    localStorage.setItem('player_avatar', '⚡');
    localStorage.setItem('task_game_zero_start_clean_v5', 'true');
  }
} catch (e) {}

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
  if (userName) userName.textContent = localStorage.getItem('player_username') || 'Player';

  // Update Buy Buttons on Gift Cards (Always unlocked)
  const buyBtns = document.querySelectorAll('.btn-buy-giftcard');
  buyBtns.forEach(btn => {
    btn.classList.remove('locked-req');
    btn.innerHTML = '<span>Buy ⭐</span>';
  });

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

// 1. Trigger Buy: Open Buy Form Modal directly
function buyGiftCard(rsAmount, starCost, title, imgPath) {
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
      playerName: localStorage.getItem('player_username') || 'Player',
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

function renderWalletOrders() {
  const historyList = document.getElementById('walletHistoryList');
  if (!historyList) return;

  const WITHDRAW_STORAGE_KEY = 'task_game_withdrawals';
  let withdrawals = [];
  try {
    const rawWd = localStorage.getItem(WITHDRAW_STORAGE_KEY);
    withdrawals = rawWd ? JSON.parse(rawWd) : [];
  } catch (e) {
    withdrawals = [];
  }

  if (!Array.isArray(withdrawals) || withdrawals.length === 0) {
    historyList.innerHTML = `
      <div style="padding: 1.5rem 1rem; text-align: center; color: #64748b; font-size: 0.82rem;">
        <span>🛍️ No withdrawal requests yet. Claim an Amazon voucher above once eligible!</span>
      </div>
    `;
    return;
  }

  historyList.innerHTML = withdrawals.map(w => {
    const isApproved = w.status === 'approved';
    const isRejected = w.status === 'rejected';
    const statusText = isApproved ? 'Approved ✅' : (isRejected ? 'Rejected ❌' : 'Pending Review ⏳');
    const statusColor = isApproved ? '#10b981' : (isRejected ? '#ef4444' : '#f59e0b');
    const statusBg = isApproved ? 'rgba(16, 185, 129, 0.15)' : (isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)');

    const linkButton = (isApproved && w.deliveryLink) ? `
      <div style="margin-top: 0.45rem;">
        <a href="${escapeHtml(w.deliveryLink)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border-radius: 6px; font-weight: 800; font-size: 0.74rem; text-decoration: none; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);">
          <span>Open Link</span> <span>🔗</span>
        </a>
      </div>
    ` : '';

    return `
      <div class="history-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0.8rem 0.6rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <div>
          <div class="history-name" style="font-weight: 700; color: #fff; font-size: 0.88rem;">${escapeHtml(w.method || 'Amazon Voucher')}</div>
          <div class="history-time" style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">
            ${escapeHtml(w.time || 'Recently')} • ID: #${escapeHtml(w.id || '')}
          </div>
          ${linkButton}
        </div>
        <div style="text-align: right;">
          <span class="history-amount" style="font-weight: 800; color: #facc15; font-size: 0.95rem;">₹${Number(w.amount).toLocaleString()}</span>
          <div style="margin-top: 4px;">
            <span style="display: inline-block; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}33;">
              ${statusText}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.renderTgTransactionsLedger = function() {
  if (window.TelegramStars && typeof window.TelegramStars.renderTransactionsLedger === 'function') {
    window.TelegramStars.renderTransactionsLedger('tgWalletTransactionsLedger');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  updateWalletDisplays();
  renderWalletOrders();
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
    e.key === 'task_game_withdrawals' ||
    e.key === 'player_username' ||
    e.key === 'player_avatar'
  ) {
    updateWalletDisplays();
    renderWalletOrders();
  }
});

try {
  const syncChannel = new BroadcastChannel('nova_task_sync');
  syncChannel.onmessage = () => {
    updateWalletDisplays();
    renderWalletOrders();
  };
} catch (e) {}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateWalletDisplays();
    renderWalletOrders();
  }
});
