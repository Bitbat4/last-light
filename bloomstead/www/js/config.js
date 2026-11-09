/* Bloomstead — central configuration. Edit IDs/prices here before shipping. */
window.BS = window.BS || {};

BS.CONFIG = {
  APP_NAME: 'Bloomstead',
  VERSION: '1.0.0',

  // ---- AdMob (iOS). These are Google's official TEST unit IDs. ----
  // Replace with your real unit IDs from admob.google.com before release,
  // and set testing:false. Never click your own live ads.
  ADS: {
    testing: true,
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitialMinGames: 3,      // no forced ads during a player's first games
    interstitialEvery: 2,         // at most one interstitial every N finished games
    interstitialCooldownSec: 120, // and never more often than this
    bannerEnabled: true,          // small banner under the board (removed by No Ads)
  },

  // ---- RevenueCat (in-app purchases). Public iOS SDK key from app.revenuecat.com ----
  REVENUECAT_IOS_KEY: 'appl_REPLACE_WITH_YOUR_PUBLIC_KEY',

  // Product IDs must match App Store Connect exactly.
  // type: 'consumable' | 'nonconsumable'. price is only a fallback label;
  // the real localized price comes from the App Store at runtime.
  PRODUCTS: {
    'bloom.noads':          { type: 'nonconsumable', price: '$3.99',  title: 'No Ads',            grant: { noAds: true } },
    'bloom.starter':        { type: 'consumable',    price: '$1.99',  title: 'Starter Bundle',    grant: { gems: 400, petals: 1500, boosters: 2 }, once: true },
    'bloom.gardener':       { type: 'nonconsumable', price: '$7.99',  title: "Gardener's Bundle", grant: { noAds: true, gems: 1000, boosters: 5 } },
    'bloom.gems.120':       { type: 'consumable',    price: '$0.99',  title: 'Pouch of Gems',     grant: { gems: 120 } },
    'bloom.gems.650':       { type: 'consumable',    price: '$4.99',  title: 'Bag of Gems',       grant: { gems: 650 },   tag: '+8%' },
    'bloom.gems.1400':      { type: 'consumable',    price: '$9.99',  title: 'Chest of Gems',     grant: { gems: 1400 },  tag: 'Popular' },
    'bloom.gems.3000':      { type: 'consumable',    price: '$19.99', title: 'Crate of Gems',     grant: { gems: 3000 },  tag: '+25%' },
    'bloom.gems.8000':      { type: 'consumable',    price: '$49.99', title: 'Cart of Gems',      grant: { gems: 8000 },  tag: 'Best Value' },
  },

  ECONOMY: {
    startGems: 60,
    startBoosters: { trowel: 1, reroll: 1, undo: 1 },
    petalsPerLine: 2,
    petalsPerBloom: 10,
    scorePerEndPetal: 1200,         // classic: +1 petal per N points at game end
    levelPetals: (lvl) => 30 + Math.floor(lvl * 1.5),
    levelGems: (lvl) => (lvl % 10 === 0 ? 30 : lvl % 5 === 0 ? 15 : 3),
    reviveGems: [60, 120, 240],     // escalating gem cost per revive in one run
    boosterGems: { trowel: 40, reroll: 30, undo: 25 },
    petalPacks: [ { petals: 900, gems: 100 }, { petals: 3000, gems: 300 }, { petals: 11000, gems: 900 } ],
    freeGemsAd: { gems: 10, cooldownMin: 20, perDay: 6 },
    adSpinsPerDay: 3,
    daily: [
      { petals: 60 }, { gems: 10 }, { booster: 'reroll', n: 2 }, { petals: 150 },
      { gems: 25 }, { booster: 'trowel', n: 2 }, { gems: 60, petals: 300, booster: 'undo', n: 2 },
    ],
    // wheel segments; weight = relative chance
    wheel: [
      { label: '40', icon: 'petal', petals: 40, w: 22 },
      { label: '5',  icon: 'gem', gems: 5, w: 18 },
      { label: '1',  icon: 'reroll', booster: 'reroll', w: 14 },
      { label: '100', icon: 'petal', petals: 100, w: 14 },
      { label: '1',  icon: 'trowel', booster: 'trowel', w: 10 },
      { label: '15', icon: 'gem', gems: 15, w: 10 },
      { label: '1',  icon: 'undo', booster: 'undo', w: 9 },
      { label: '50', icon: 'gem', gems: 50, w: 3 },
    ],
  },

  PRIVACY_URL: 'https://REPLACE-ME.github.io/bloomstead/privacy.html', // host docs/privacy.html (see LAUNCH_GUIDE)
  SUPPORT_EMAIL: 'support@example.com',
};
