/**
 * ==========================================================================
 * UNIVERSAL REWARDED INTERSTITIAL AD SERVICE (ZONE: 10691428)
 * ==========================================================================
 */

// Safe fallback in case Monetag SDK is loading or ad blocker active
if (typeof window.show_10691428 !== 'function') {
  window.show_10691428 = function() {
    return new Promise((resolve) => {
      console.log('[AdService] show_10691428 invoked');
      resolve();
    });
  };
}

const DEFAULT_AD_CONFIG = {
  enabled: true,
  provider: 'monetag',
  zoneId: '10691428',
  adUrl: 'https://otieuche.com/4/8893420',
  openMethod: 'rewarded_interstitial',
  countdownSeconds: 0,
  scriptCode: 'show_10691428'
};

function getAdConfig() {
  return DEFAULT_AD_CONFIG;
}

function saveAdConfig(cfg) {
  // no-op
}

/**
 * Universal Watch Ad Runner with Rewarded Interstitial
 */
function openWatchAd(options = {}) {
  const onReward = options.onReward || options.callback;
  const rewardFunc = () => {
    if (typeof onReward === 'function') {
      onReward({ success: true, rewardPlays: options.rewardPlays || 10 });
    }
  };

  // Rewarded interstitial
  if (typeof show_10691428 === 'function') {
    show_10691428().then(() => {
      // You need to add your user reward function here, which will be executed after the user watches the ad.
      // For more details, please refer to the detailed instructions.
      alert('You have seen an ad!');
      rewardFunc();
    }).catch((err) => {
      console.warn('[AdService] show_10691428 error:', err);
      rewardFunc();
    });
  } else if (typeof window.show_10691428 === 'function') {
    window.show_10691428().then(() => {
      alert('You have seen an ad!');
      rewardFunc();
    }).catch((err) => {
      console.warn('[AdService] show_10691428 error:', err);
      rewardFunc();
    });
  } else {
    try {
      show_10691428().then(() => {
        alert('You have seen an ad!');
        rewardFunc();
      });
    } catch(e) {
      alert('You have seen an ad!');
      rewardFunc();
    }
  }
}

function openDirectSponsoredAd(options = {}) {
  openWatchAd(options);
}

window.AdService = {
  getAdConfig,
  saveAdConfig,
  openWatchAd,
  openDirectSponsoredAd
};
window.openWatchAd = openWatchAd;
window.showRewardedAd = function(onReward, options = {}) {
  openWatchAd({ onReward, ...options });
};
