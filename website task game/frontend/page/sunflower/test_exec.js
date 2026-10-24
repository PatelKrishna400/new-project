const fs = require('fs');

// Create mock browser globals
global.window = global;
global.document = {
  getElementById: (id) => ({
    id,
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    style: {},
    innerText: '',
    textContent: '',
    innerHTML: '',
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
  }),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: (tag) => ({
    tagName: tag,
    classList: { add: () => {}, remove: () => {} },
    style: {},
    innerText: '',
    textContent: '',
    innerHTML: '',
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  readyState: 'complete',
};
global.localStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] !== undefined ? this._store[k] : null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; },
  clear: function() { this._store = {}; }
};
global.sessionStorage = global.localStorage;
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.CustomEvent = class CustomEvent {};
global.dispatchEvent = () => {};
global.BroadcastChannel = class BroadcastChannel {
  postMessage() {}
  onmessage() {}
};

try {
  require('./sunflower.js');
  console.log('sunflower.js executed successfully without throwing top-level errors!');

  console.log('\nTesting key functions:');
  const testFns = [
    'navigateSunflowerPage',
    'toggleSfUpgradeMultiplier',
    'buySunflowerItem',
    'unlockSfPlot',
    'plantSfPlot',
    'waterSfPlot',
    'shovelSfPlot',
    'collectPlotHarvest',
    'upgradeSfPlot',
    'unlockSfWell',
    'collectWellBaskets',
    'upgradeSfWell',
    'stepSunflowerStarPackage',
    'exchangeCurrentSfStarPackage',
    'exchangeSfCoinsForStars',
    'switchSunflowerManagerTab',
    'unlockLandManager',
    'hireLandManagerGoldCoins',
    'hireLandManagerAd',
    'openSunflowerAdModal',
    'confirmSfCollect',
    'closeSfCollectModal'
  ];

  for (const fn of testFns) {
    const type = typeof global[fn];
    console.log(`- ${fn}: ${type}`);
    if (type !== 'function') {
      console.error(`  ERROR: ${fn} is NOT a function on window!`);
    }
  }

  // Test executing navigateSunflowerPage
  console.log('\nExecuting navigateSunflowerPage(1)...');
  global.navigateSunflowerPage(1);

  console.log('Executing navigateSunflowerPage(2)...');
  global.navigateSunflowerPage(2);

  console.log('Executing navigateSunflowerPage(3)...');
  global.navigateSunflowerPage(3);

  console.log('Executing navigateSunflowerPage(4)...');
  global.navigateSunflowerPage(4);

  console.log('Executing navigateSunflowerPage(5)...');
  global.navigateSunflowerPage(5);

  console.log('\nExecuting toggleSfUpgradeMultiplier()...');
  global.toggleSfUpgradeMultiplier({ stopPropagation: () => {} });

  console.log('All test executions passed!');

} catch (err) {
  console.error('CRASH in sunflower.js:', err);
}
