// Task Claiming Logic
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

document.addEventListener('DOMContentLoaded', () => {
  updateCoinDisplay();
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
