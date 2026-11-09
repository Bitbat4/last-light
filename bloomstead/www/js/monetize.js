/* Bloomstead — Ads (AdMob) + In-App Purchases (RevenueCat).
 * On iOS (Capacitor) it uses the real plugins:
 *   @capacitor-community/admob      -> Capacitor.Plugins.AdMob
 *   @revenuecat/purchases-capacitor -> Capacitor.Plugins.Purchases
 * In a desktop browser it falls back to a simulator so the full flow is testable.
 */
(function () {
  const CFG = BS.CONFIG;
  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  function plugin(name) {
    const C = window.Capacitor;
    if (!C) return null;
    if (C.Plugins && C.Plugins[name]) return C.Plugins[name];
    try { return C.registerPlugin ? C.registerPlugin(name) : null; } catch (e) { return null; }
  }

  // ================= ADS =================
  const Ads = {
    ready: false, rewardedLoaded: false, interstitialLoaded: false, bannerShown: false, busy: false,

    async init() {
      if (!isNative()) { this.ready = true; return; }
      const AdMob = plugin('AdMob');
      if (!AdMob) return;
      try {
        // Ask App Tracking Transparency permission (improves eCPM when allowed).
        try {
          const st = await AdMob.trackingAuthorizationStatus();
          if (st && st.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        } catch (e) {}
        await AdMob.initialize({ initializeForTesting: CFG.ADS.testing });
        this.ready = true;
        this.preloadRewarded();
        if (!BS.Save.state.noAds) this.preloadInterstitial();
      } catch (e) { console.warn('AdMob init failed', e); }
    },

    async preloadRewarded() {
      const AdMob = plugin('AdMob'); if (!AdMob) return;
      try { await AdMob.prepareRewardVideoAd({ adId: CFG.ADS.rewarded, isTesting: CFG.ADS.testing }); this.rewardedLoaded = true; }
      catch (e) { this.rewardedLoaded = false; setTimeout(() => this.preloadRewarded(), 30000); }
    },
    async preloadInterstitial() {
      const AdMob = plugin('AdMob'); if (!AdMob) return;
      try { await AdMob.prepareInterstitial({ adId: CFG.ADS.interstitial, isTesting: CFG.ADS.testing }); this.interstitialLoaded = true; }
      catch (e) { this.interstitialLoaded = false; setTimeout(() => this.preloadInterstitial(), 45000); }
    },

    /** Opt-in rewarded video. Resolves true only if the reward was earned. */
    async showRewarded(placement) {
      if (this.busy) return false;
      this.busy = true;
      BS.Analytics.log('ad_rewarded_request', { placement });
      try {
        let earned = false;
        if (!isNative()) earned = await BS.UI.simulateAd('rewarded');
        else {
          const AdMob = plugin('AdMob');
          if (!this.rewardedLoaded) await this.preloadRewarded();
          if (!this.rewardedLoaded) { BS.UI.toast('No video available right now — try again soon'); return false; }
          this.rewardedLoaded = false;
          BS.Audio.Music.pauseForAd && BS.Audio.Music.pauseForAd(true);
          const item = await AdMob.showRewardVideoAd();
          earned = !!item;
          this.preloadRewarded();
        }
        BS.Analytics.log(earned ? 'ad_rewarded_earned' : 'ad_rewarded_skipped', { placement });
        return earned;
      } catch (e) {
        console.warn('rewarded failed', e);
        this.preloadRewarded();
        return false;
      } finally { this.busy = false; }
    },

    /** Called at natural breaks (after a run / level). Respects frequency caps & No Ads. */
    async maybeInterstitial() {
      const s = BS.Save.state, A = CFG.ADS;
      if (s.noAds) return false;
      s.gamesSinceInterstitial++;
      BS.Save.save();
      const now = Date.now() / 1000;
      if (s.gamesPlayed < A.interstitialMinGames) return false;
      if (s.gamesSinceInterstitial < A.interstitialEvery) return false;
      if (now - s.lastInterstitial < A.interstitialCooldownSec) return false;
      s.gamesSinceInterstitial = 0; s.lastInterstitial = now; BS.Save.save();
      BS.Analytics.log('ad_interstitial');
      if (!isNative()) { await BS.UI.simulateAd('interstitial'); return true; }
      const AdMob = plugin('AdMob');
      try {
        if (!this.interstitialLoaded) return false;
        this.interstitialLoaded = false;
        await AdMob.showInterstitial();
      } catch (e) {}
      this.preloadInterstitial();
      return true;
    },

    async showBanner() {
      if (!CFG.ADS.bannerEnabled || BS.Save.state.noAds || this.bannerShown) return;
      if (BS.Save.state.gamesPlayed < CFG.ADS.interstitialMinGames) return; // let new players fall in love first
      this.bannerShown = true;
      document.body.classList.add('has-banner');
      if (!isNative()) return; // CSS placeholder shown in browser
      const AdMob = plugin('AdMob');
      try { await AdMob.showBanner({ adId: CFG.ADS.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: CFG.ADS.testing }); }
      catch (e) { this.bannerShown = false; document.body.classList.remove('has-banner'); }
    },
    async hideBanner() {
      if (!this.bannerShown) return;
      this.bannerShown = false;
      document.body.classList.remove('has-banner');
      if (!isNative()) return;
      try { await plugin('AdMob').removeBanner(); } catch (e) {}
    },
  };

  // ================= IAP =================
  const Store = {
    prices: {}, nativeProducts: {}, ready: false,

    async init() {
      for (const id in CFG.PRODUCTS) this.prices[id] = CFG.PRODUCTS[id].price;
      if (!isNative()) { this.ready = true; return; }
      const P = plugin('Purchases');
      if (!P) return;
      try {
        await P.configure({ apiKey: CFG.REVENUECAT_IOS_KEY });
        const res = await P.getProducts({ productIdentifiers: Object.keys(CFG.PRODUCTS) });
        for (const p of (res && res.products) || []) {
          this.nativeProducts[p.identifier] = p;
          this.prices[p.identifier] = p.priceString;
        }
        this.ready = true;
        // silently re-apply non-consumables (e.g. reinstall / new device)
        const info = await P.getCustomerInfo();
        this.applyOwned(info && info.customerInfo);
      } catch (e) { console.warn('RevenueCat init failed', e); }
    },

    price(id) { return this.prices[id] || CFG.PRODUCTS[id].price; },

    applyOwned(customerInfo) {
      if (!customerInfo) return 0;
      const owned = customerInfo.allPurchasedProductIdentifiers || [];
      let n = 0;
      for (const id of owned) {
        const def = CFG.PRODUCTS[id];
        if (def && def.type === 'nonconsumable' && def.grant.noAds && !BS.Save.state.noAds) { this.setNoAds(); n++; }
      }
      return n;
    },

    setNoAds() {
      BS.Save.state.noAds = true; BS.Save.save();
      Ads.hideBanner();
    },

    grant(id) {
      const def = CFG.PRODUCTS[id]; const g = def.grant; const s = BS.Save.state;
      s.purchased[id] = (s.purchased[id] || 0) + 1;
      if (g.noAds) this.setNoAds();
      if (g.gems) BS.Save.addGems(g.gems);
      if (g.petals) BS.Save.addPetals(g.petals);
      if (g.boosters) ['trowel', 'reroll', 'undo'].forEach((b) => BS.Save.addBooster(b, g.boosters));
      BS.Save.flush();
    },

    /** Returns true on successful purchase (already granted). */
    async purchase(id) {
      const def = CFG.PRODUCTS[id];
      if (!def) return false;
      BS.Analytics.log('iap_begin', { id });
      try {
        let ok = false;
        if (!isNative()) ok = await BS.UI.simulatePurchase(def.title, this.price(id));
        else {
          const P = plugin('Purchases');
          const product = this.nativeProducts[id];
          if (!P || !product) { BS.UI.toast('Store unavailable. Check your connection.'); return false; }
          const r = await P.purchaseStoreProduct({ product });
          ok = !!r;
        }
        if (ok) { this.grant(id); BS.Analytics.log('iap_success', { id }); BS.Audio.SFX.unlock(); }
        return ok;
      } catch (e) {
        if (!(e && (e.userCancelled || e.code === '1' || /cancel/i.test(String(e.message))))) BS.UI.toast('Purchase failed. You have not been charged.');
        return false;
      }
    },

    async restore() {
      if (!isNative()) { BS.UI.toast(BS.Save.state.noAds ? 'Purchases restored' : 'No purchases to restore'); return; }
      try {
        const r = await plugin('Purchases').restorePurchases();
        const n = this.applyOwned(r && r.customerInfo);
        BS.UI.toast(n || BS.Save.state.noAds ? 'Purchases restored' : 'No purchases to restore');
      } catch (e) { BS.UI.toast('Restore failed. Try again later.'); }
    },
  };

  // Lightweight analytics hook — wire to Firebase/GameAnalytics later if desired.
  const Analytics = {
    log(event, params) { if (window.__BS_DEBUG) console.log('[analytics]', event, params || ''); },
  };

  BS.Ads = Ads; BS.Store = Store; BS.Analytics = Analytics; BS.isNative = isNative;
})();
