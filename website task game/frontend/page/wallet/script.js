// Wallet Vault State & Amazon Gift Card Redemption
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
if (localStorage.getItem('task_game_stars') === '850' || !localStorage.getItem('task_game_stars')) {
  localStorage.setItem('task_game_stars', '0');
}

let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);
let userStars = parseInt(localStorage.getItem('task_game_stars') || '0', 10);

function updateWalletDisplays() {
  const coinsFmt = userCoins.toLocaleString();
  const starsFmt = userStars.toLocaleString();

  const topCoins = document.getElementById('walletBalanceTop');
  if (topCoins) topCoins.textContent = coinsFmt;

  const topStars = document.getElementById('walletStarsTop');
  if (topStars) topStars.textContent = starsFmt;

  const bigCoins = document.getElementById('vaultBalanceBig');
  if (bigCoins) bigCoins.textContent = `${coinsFmt} 🪙`;

  const bigStars = document.getElementById('vaultStarsBig');
  if (bigStars) bigStars.textContent = `${starsFmt} ⭐`;
}

// Convert 100 Coins to 50 Stars
function convertCoinsToStars() {
  if (userCoins < 100) {
    alert('Insufficient Coins! You need at least 100 Coins to convert.');
    return;
  }
  userCoins -= 100;
  userStars += 50;

  localStorage.setItem('task_game_coins', userCoins.toString());
  localStorage.setItem('task_game_stars', userStars.toString());
  updateWalletDisplays();

  addTransaction('Converted 100 Coins to 50 Stars', '+50 ⭐', 'Just now');
}

// Buy Amazon Gift Card with Stars
function buyGiftCard(rsAmount, starCost, title, imgPath) {
  if (userStars < starCost) {
    const diff = starCost - userStars;
    const confirmConvert = confirm(
      `Insufficient Stars!\n\nYou have ${userStars.toLocaleString()} ⭐ but need ${starCost.toLocaleString()} ⭐ (${diff} more).\n\nWould you like to exchange 100 Coins for 50 Stars now?`
    );
    if (confirmConvert) {
      convertCoinsToStars();
    }
    return;
  }

  // Deduct stars
  userStars -= starCost;
  localStorage.setItem('task_game_stars', userStars.toString());
  updateWalletDisplays();

  // Generate unique claim code
  const randomChars = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const claimCode = `AMZN-${randomChars()}-${randomChars()}-${rsAmount}R`;

  // Show Modal
  const modal = document.getElementById('voucherModalOverlay');
  const modalImg = document.getElementById('modalVoucherImg');
  const modalTitle = document.getElementById('modalVoucherTitle');
  const modalCode = document.getElementById('modalVoucherCode');
  const btnCopy = document.getElementById('btnCopyCode');

  if (modalImg) modalImg.src = imgPath;
  if (modalTitle) modalTitle.textContent = title;
  if (modalCode) modalCode.textContent = claimCode;
  if (btnCopy) {
    btnCopy.textContent = 'Copy';
    btnCopy.disabled = false;
  }

  if (modal) modal.classList.add('active');

  // Add to transaction history
  addTransaction(`Redeemed ${title}`, `-${starCost.toLocaleString()} ⭐`, 'Just now');
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

document.addEventListener('DOMContentLoaded', () => {
  updateWalletDisplays();
});
