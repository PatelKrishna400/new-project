/**
 * PANDEMIC CONTROLLER — TELEGRAM ARCADE SUITE
 * Matches Reference Screenshot 3 Pixel-Perfect
 * Milestone Tracks, Daily Tournament, Weekly League, Roll Shop
 */

let balance = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '10', 10);
let rolls = parseInt(localStorage.getItem('pandemic_rolls') || '25', 10);
let soundEnabled = true;

// Audio
let synth = null;
function initAudio() {
  if (!synth && window.Tone) {
    try {
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 }
      }).toDestination();
    } catch(e) {}
  }
}

function playTone(type) {
  if (!soundEnabled) return;
  try {
    if (window.Tone && Tone.context.state !== 'running') Tone.start();
    initAudio();
    if (!synth) return;
    if (type === 'click') {
      synth.triggerAttackRelease("C5", "32n", undefined, 0.2);
    } else if (type === 'win') {
      synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", undefined, 0.5);
    }
  } catch(e) {}
}

function updateBalanceUI() {
  const el = document.getElementById('starBalanceDisplay');
  if (el) el.innerText = balance.toLocaleString();
}

function saveBalance() {
  localStorage.setItem('task_game_stars', Math.max(0, balance).toString());
  localStorage.setItem('user_stars', Math.max(0, balance).toString());
  localStorage.setItem('task_game_coins', Math.max(0, balance).toString());
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'BALANCES_UPDATED', timestamp: Date.now() });
    bc.close();
  } catch(e) {}
}

// Tournament Countdown Timer (ends in 14:58:29)
let secondsRemaining = 14 * 3600 + 58 * 60 + 29;
function updateTimer() {
  if (secondsRemaining > 0) secondsRemaining--;
  const h = String(Math.floor(secondsRemaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((secondsRemaining % 3600) / 60)).padStart(2, '0');
  const s = String(secondsRemaining % 60).padStart(2, '0');
  const timerEl = document.getElementById('tournamentTimer');
  if (timerEl) timerEl.innerText = `${h}:${m}:${s}`;
}

function openPandemicRules() {
  playTone('click');
  alert("PANDEMIC RULES:\n• Roll and land on raid & attack tiles to multiply points.\n• Complete Petri Dish milestones to earn packs and free rolls.\n• Climb the Cold Weekly League to win jackpot stars!");
}

function openReferralShare() {
  playTone('click');
  navigator.clipboard.writeText("https://t.me/stargame_bot?start=pandemic_ref").catch(() => {});
  alert("Referral link copied! Share with friends to earn +40 rolls each.");
}

function openRollShop() {
  playTone('click');
  openBuyCoinsModal();
}

function openBuyCoinsModal() {
  playTone('click');
  document.getElementById('buyCoinsModalOverlay').classList.remove('hidden');
  document.getElementById('buyCoinsModalSheet').classList.add('active');
}
function closeBuyCoinsModal() {
  document.getElementById('buyCoinsModalOverlay').classList.add('hidden');
  document.getElementById('buyCoinsModalSheet').classList.remove('active');
}

function claimFreeRefill() {
  playTone('win');
  balance += 200;
  rolls += 10;
  saveBalance();
  updateBalanceUI();
  closeBuyCoinsModal();
  if (window.confetti) confetti({ particleCount: 45, spread: 70, origin: { y: 0.3 } });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  updateBalanceUI();
  setInterval(updateTimer, 1000);

  window.addEventListener('storage', (e) => {
    if (e.key === 'task_game_stars' || e.key === 'user_stars') {
      balance = parseInt(localStorage.getItem('task_game_stars') || '10', 10);
      updateBalanceUI();
    }
  });

  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.onmessage = () => {
      balance = parseInt(localStorage.getItem('task_game_stars') || '10', 10);
      updateBalanceUI();
    };
  } catch(e) {}
});
