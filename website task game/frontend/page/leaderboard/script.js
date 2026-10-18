// Leaderboard Page Script
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
const userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

document.addEventListener('DOMContentLoaded', () => {
  const topCoins = document.getElementById('leaderboardCoinsTop');
  if (topCoins) topCoins.textContent = userCoins.toLocaleString();

  const rankCoins = document.getElementById('userLeaderboardCoins');
  if (rankCoins) rankCoins.textContent = `${userCoins.toLocaleString()} 🪙`;
});
