// Shop Logic
if (localStorage.getItem('task_game_coins') === '2450' || !localStorage.getItem('task_game_coins')) {
  localStorage.setItem('task_game_coins', '0');
}
let userCoins = parseInt(localStorage.getItem('task_game_coins') || '0', 10);

document.addEventListener('DOMContentLoaded', () => {
  updateCoins();
});

function updateCoins() {
  const display = document.getElementById('shopCoinsDisplay');
  if (display) display.textContent = userCoins.toLocaleString();
}

function buyItem(btn, price, itemName) {
  if (userCoins < price) {
    alert(`Insufficient coins! You need ${price} 🪙 to purchase ${itemName}.`);
    return;
  }

  userCoins -= price;
  localStorage.setItem('task_game_coins', userCoins.toString());
  updateCoins();

  btn.textContent = 'Owned ✓';
  btn.disabled = true;
  alert(`🎉 Purchase Successful!\n\nYou acquired: ${itemName}\nCoins remaining: ${userCoins.toLocaleString()} 🪙`);
}
