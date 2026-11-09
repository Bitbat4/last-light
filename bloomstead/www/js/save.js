/* Bloomstead — persistent player state. localStorage + Capacitor Preferences mirror. */
(function () {
  const KEY = 'bloomstead.save.v1';
  const E = BS.CONFIG.ECONOMY;

  function defaults() {
    return {
      v: 1,
      gems: E.startGems,
      petals: 0,
      boosters: Object.assign({}, E.startBoosters),
      level: 1,
      best: 0,
      gamesPlayed: 0,
      gamesSinceInterstitial: 0,
      lastInterstitial: 0,
      noAds: false,
      purchased: {},            // productId -> count
      garden: { area: 0, done: [] },
      daily: { last: '', streak: 0 },
      spin: { day: '', freeUsed: false, adSpins: 0 },
      freeGems: { last: 0, day: '', count: 0 },
      settings: { sfx: true, music: true, haptics: true },
      stats: { lines: 0, blooms: 0, levelsWon: 0, bestCombo: 0 },
      tutorialDone: false,
      classicRun: null,         // in-progress classic game (resume after app kill)
      installDay: today(),
    };
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function deepMerge(base, over) {
    for (const k in over) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') deepMerge(base[k], over[k]);
      else base[k] = over[k];
    }
    return base;
  }

  const Prefs = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;

  let state = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = deepMerge(defaults(), JSON.parse(raw));
  } catch (e) { console.warn('save load failed', e); }

  let pending = null;
  function save() {
    clearTimeout(pending);
    pending = setTimeout(flush, 150);
  }
  function flush() {
    const raw = JSON.stringify(state);
    try { localStorage.setItem(KEY, raw); } catch (e) {}
    try { const p = Prefs(); if (p) p.set({ key: KEY, value: raw }); } catch (e) {}
  }

  // On native, Preferences survives iOS WebView storage purges: restore if localStorage was wiped.
  async function restoreNative() {
    try {
      const p = Prefs(); if (!p) return;
      const r = await p.get({ key: KEY });
      if (r && r.value && !localStorage.getItem(KEY)) {
        state = deepMerge(defaults(), JSON.parse(r.value));
        BS.Save.state = state;
        flush();
        return true;
      }
    } catch (e) {}
    return false;
  }

  BS.Save = {
    state, save, flush, today, restoreNative,
    reset() { state = defaults(); BS.Save.state = state; flush(); },
    addGems(n) { state.gems = Math.max(0, state.gems + n); save(); BS.UI && BS.UI.refreshWallet(n > 0 ? 'gems' : null); },
    addPetals(n) { state.petals = Math.max(0, state.petals + n); save(); BS.UI && BS.UI.refreshWallet(n > 0 ? 'petals' : null); },
    addBooster(type, n) { state.boosters[type] = (state.boosters[type] || 0) + n; save(); },
    spendGems(n) { if (state.gems < n) return false; state.gems -= n; save(); BS.UI && BS.UI.refreshWallet(); return true; },
    spendPetals(n) { if (state.petals < n) return false; state.petals -= n; save(); BS.UI && BS.UI.refreshWallet(); return true; },
  };
  // state may be replaced by reset/restore; keep a live getter
  Object.defineProperty(BS.Save, 'state', { get: () => state, set: (v) => { state = v; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
})();
