// Profile Page Script
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
const userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

document.addEventListener('DOMContentLoaded', () => {
  const coinsDisplay = document.getElementById('profileCoinsDisplay');
  if (coinsDisplay) coinsDisplay.textContent = userCoins.toLocaleString();
});
