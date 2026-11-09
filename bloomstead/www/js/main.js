/* Bloomstead — boot. */
(async function () {
  const native = BS.isNative();
  if (native) document.body.classList.add('native');
  if (native) await BS.Save.restoreNative();
  BS.UI.init();
  BS.Game.init();
  BS.Store.init();
  BS.Ads.init();

  const P = window.Capacitor && window.Capacitor.Plugins;
  if (P && P.SplashScreen) setTimeout(() => P.SplashScreen.hide(), 200);
  if (P && P.App) P.App.addListener('pause', () => BS.Save.flush());

  // Brand-new players go straight into Level 1 (fastest path to fun = better day-1 retention).
  const s = BS.Save.state;
  if (!s.tutorialDone && s.level === 1 && s.gamesPlayed === 0) {
    setTimeout(() => BS.UI.startLevel(), 350);
  } else {
    setTimeout(() => BS.UI.showDaily(false), 700);
  }
  window.addEventListener('beforeunload', () => BS.Save.flush());
})();
