/**
 * ==========================================================================
 * UNIVERSAL REWARDED INTERSTITIAL AD SERVICE (ZONE: 11677609)
 * Monetag Rewarded Interstitial SDK integration with safe Promise fallback
 * ==========================================================================
 */

// Fallback in case Monetag SDK is loading, blocked, or unavailable
if (typeof window.show_11677609 !== 'function') {
  window.show_11677609 = function() {
    return new Promise((resolve) => {
      console.log('[AdService] show_11677609 fallback invoked');
      resolve();
    });
  };
}

// Backward-compat fallback if old zone function is called
if (typeof window.show_10691428 !== 'function') {
  window.show_10691428 = window.show_11677609;
}

function runRewardedAd() {
  return new Promise((resolve) => {
    const onCompleted = () => {
      resolve({ success: true });
    };

    // Rewarded interstitial
    if (typeof window.show_11677609 === 'function') {
      window.show_11677609().then(() => {
        onCompleted();
      }).catch((err) => {
        console.warn('[AdService] Monetag ad notice:', err);
        onCompleted();
      });
    } else if (typeof show_11677609 === 'function') {
      show_11677609().then(() => {
        onCompleted();
      }).catch((err) => {
        console.warn('[AdService] Monetag ad notice:', err);
        onCompleted();
      });
    } else if (typeof window.show_10691428 === 'function') {
      window.show_10691428().then(() => {
        onCompleted();
      }).catch(() => {
        onCompleted();
      });
    } else {
      onCompleted();
    }
  });
}

window.AdService = {
  showWatchAd: runRewardedAd,
  runRewardedAd: runRewardedAd
};
window.runRewardedAd = runRewardedAd;
