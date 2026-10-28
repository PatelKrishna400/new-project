/**
 * ==========================================================================
 * UNIVERSAL AD SERVICE - ALL ADS DISABLED
 * ==========================================================================
 */

const DEFAULT_AD_CONFIG = {
  enabled: false,
  provider: 'none',
  adUrl: '',
  openMethod: 'none',
  countdownSeconds: 0,
  scriptCode: ''
};

function getAdConfig() {
  return DEFAULT_AD_CONFIG;
}

function saveAdConfig(cfg) {
  // no-op
}

function openWatchAd(options = {}) {
  const onReward = options.onReward || options.callback;
  if (typeof onReward === 'function') {
    onReward({ success: true, rewardPlays: options.rewardPlays || 5 });
  }
}

function openDirectSponsoredAd(options = {}) {
  const onReward = options.onReward || options.callback;
  if (typeof onReward === 'function') {
    onReward({ success: true });
  }
}

window.AdService = {
  getAdConfig,
  saveAdConfig,
  openWatchAd,
  openDirectSponsoredAd
};
window.openWatchAd = openWatchAd;
