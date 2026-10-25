/**
 * ==========================================================================
 * UNIVERSAL AD SERVICE — NOVA ARCADE SUITE & TASK EARNER
 * Connects all "Watch Ad" buttons to Backend Admin Configuration
 * Opens actual ad link/script & manages reward callbacks and click tracking
 * ==========================================================================
 */

const DEFAULT_AD_CONFIG = {
  enabled: true,
  provider: 'direct_link',
  adUrl: 'https://monetag.com', // Default Ad Smartlink
  openMethod: 'new_tab',
  countdownSeconds: 5,
  scriptCode: ''
};

function getAdConfig() {
  try {
    const raw = localStorage.getItem('task_game_ad_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AD_CONFIG, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_AD_CONFIG;
}

function saveAdConfig(cfg) {
  const merged = { ...getAdConfig(), ...cfg };
  localStorage.setItem('task_game_ad_config', JSON.stringify(merged));
  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ type: 'AD_CONFIG_UPDATED', config: merged, timestamp: Date.now() });
    bc.close();
  } catch (e) {}
  return merged;
}

function recordAdClickMetrics() {
  const adminClicks = parseInt(localStorage.getItem('task_admin_ads_clicked_count') || '0', 10) + 1;
  localStorage.setItem('task_admin_ads_clicked_count', adminClicks.toString());

  const userWatched = parseInt(localStorage.getItem('task_game_ads_watched_count') || '0', 10) + 1;
  localStorage.setItem('task_game_ads_watched_count', userWatched.toString());
  localStorage.setItem('ads_watched_count', userWatched.toString());

  try {
    const bc = new BroadcastChannel('nova_task_sync');
    bc.postMessage({ 
      type: 'AD_CLICKED', 
      totalClicks: adminClicks, 
      userWatched: userWatched, 
      timestamp: Date.now() 
    });
    bc.close();
  } catch (e) {}
}

/**
 * Universal Open Ad Function
 * Opens the ad in a new tab / window and triggers the reward callback
 */
function openWatchAd(options = {}, onComplete = null) {
  const cfg = getAdConfig();
  recordAdClickMetrics();

  // 1. If custom monetization script is active (e.g. Monetag tag)
  if (typeof window.show_10676091 === 'function') {
    try {
      window.show_10676091().then(() => {
        if (typeof onComplete === 'function') onComplete();
      }).catch(err => {
        console.warn('Monetag interstitial fallback to direct link:', err);
        const url = cfg.adUrl || DEFAULT_AD_CONFIG.adUrl;
        window.open(url, '_blank', 'noopener,noreferrer');
        if (typeof onComplete === 'function') onComplete();
      });
      return;
    } catch (e) {
      console.warn('Monetag execution error:', e);
    }
  }

  // 2. Open Ad URL in New Tab / Window
  const targetUrl = (options && options.adUrl) || cfg.adUrl || DEFAULT_AD_CONFIG.adUrl;
  if (cfg.enabled !== false && targetUrl) {
    try {
      const adWin = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!adWin) {
        console.warn('Ad popup was blocked by browser. Please allow popups to earn rewards.');
      }
    } catch (err) {
      console.warn('Could not open ad window:', err);
    }
  }

  // 3. Callback execution
  if (typeof onComplete === 'function') {
    onComplete();
  }
}

// Global Exports
window.getAdConfig = getAdConfig;
window.saveAdConfig = saveAdConfig;
window.openWatchAd = openWatchAd;
window.showRewardedAd = function(onComplete, options) {
  openWatchAd(options, onComplete);
};
