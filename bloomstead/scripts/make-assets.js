// Renders App icon (1024), splash (2732) and App Store screenshots from the live game.
// node scripts/make-assets.js   (with www served on :8080)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:8080/');
  await p.waitForTimeout(500);
  const render = async (size, kind) => p.evaluate(({ size, kind }) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, size); g.addColorStop(0, '#9fdcff'); g.addColorStop(0.55, '#d9f6ff'); g.addColorStop(1, '#a8e07f');
    c.fillStyle = g; c.fillRect(0, 0, size, size);
    const u = size / 1024;
    if (kind === 'splash') {
      const s = 300 * u * 0.55; const ox = size / 2 - s * 1.5, oy = size / 2 - s * 1.9;
      [[0, 0, 0], [1, 0, 1], [2, 0, 3], [1, 1, 2]].forEach(([x, y, col]) => BS.Art.drawTile(c, col, ox + x * s, oy + y * s, s));
      c.font = `900 ${150 * u * 0.55}px ui-rounded, "Nunito", system-ui, sans-serif`; c.textAlign = 'center';
      c.lineWidth = 22 * u * 0.55; c.strokeStyle = '#fff'; c.lineJoin = 'round';
      c.strokeText('Bloomstead', size / 2, size / 2 + s * 1.2); c.fillStyle = '#ff6b8f'; c.fillText('Bloomstead', size / 2, size / 2 + s * 1.2);
      return cv.toDataURL('image/png');
    }
    // icon: big tile with bud + small tiles in an L
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(820 * u, 190 * u, 120 * u, 0, 7); c.fill();
    const s = 300 * u;
    BS.Art.drawTile(c, 1, 120 * u, 520 * u, s);
    BS.Art.drawTile(c, 3, 420 * u, 520 * u, s);
    BS.Art.drawTile(c, 4, 120 * u, 220 * u, s);
    BS.Art.drawTile(c, 0, 420 * u, 220 * u, s * 1.0);
    BS.Art.drawTile(c, 6, 640 * u, 470 * u, s * 0.95);
    BS.Art.drawBud(c, 640 * u, 470 * u, s * 0.95, 0);
    BS.Art.flower(c, 860 * u, 860 * u, 46 * u, '#ff8fb8', '#ffd84d', 5, 0.3);
    BS.Art.flower(c, 160 * u, 900 * u, 30 * u, '#ffffff', '#ffd84d', 5, 0.9);
    return cv.toDataURL('image/png');
  }, { size, kind });
  const save = (d, f) => require('fs').writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
  save(await render(1024, 'icon'), 'assets/icon-only.png');
  save(await render(1024, 'icon'), 'www/img/icon-1024.png');
  save(await render(2732, 'splash'), 'assets/splash.png');
  save(await render(2732, 'splash'), 'assets/splash-dark.png');
  console.log('icon + splash written');

  // ---- App Store screenshots: 6.7" (1290x2796) => 430x932 @3x ----
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const s = await ctx.newPage();
  await s.goto('http://localhost:8080/');
  await s.evaluate(() => { localStorage.clear(); });
  await s.reload(); await s.waitForTimeout(600);
  // 1: mid-game classic with a combo moment
  await s.evaluate(() => {
    document.querySelectorAll('.modal-bg').forEach(x => x.remove());
    BS.Save.state.tutorialDone = true; BS.Save.state.gamesPlayed = 0; BS.Save.state.best = 48210;
    BS.UI.startClassic(false);
    const G = BS.Game, C = BS.Core; const rows = ['........','........','.....AA.','DD..BBA.','DDC.BBAA','ECCCB..A','EEEDDD.A','EEDDDBBB'];
    rows.forEach((r, i) => { for (let c = 0; c < 8; c++) G.board[i*8+c] = r[c] === '.' ? null : { c: r.charCodeAt(0) ? (r.charCodeAt(c) - 65) % 5 : 0 }; });
    G.score = G.shownScore = 32740; BS.UI.setScore(32740); BS.UI.updateHud();
    G.tray = [{ shape: C.SHAPES.find(x => x.family === 'i4' && x.w === 1), color: 2 }, { shape: C.SHAPES.find(x => x.family === 'o2'), color: 0 }, { shape: C.SHAPES.find(x => x.family === 'corner'), color: 1 }];
    G.trayAnim = [1,1,1];
    BS.UI.hideHint();
  });
  await s.waitForTimeout(300);
  // play a clearing move for juicy effects
  await s.evaluate(() => { const G = BS.Game; const C = BS.Core; const sh = C.SHAPES.find(x => x.family === 'dom' && x.w === 2); G.tray[0] = { shape: sh, color: 3 }; G._placeForTest(0, 5, 5); });
  await s.waitForTimeout(260);
  await s.screenshot({ path: 'store-screenshots/1-gameplay.png' });
  // 2: full bloom moment
  await s.evaluate(() => { const G = BS.Game, C = BS.Core; for (let c = 0; c < 6; c++) G.board[0*8+c] = { c: 0 }; G.board[6] = G.board[7] = null; G.tray[1] = { shape: C.SHAPES.find(x => x.family === 'dom' && x.w === 2), color: 0 }; G._placeForTest(1, 0, 6); });
  await s.waitForTimeout(350);
  await s.screenshot({ path: 'store-screenshots/2-full-bloom.png' });
  // 3: garden
  await s.evaluate(() => { BS.Save.state.garden = { area: 0, done: [0,1,2,3,4,5] }; BS.Save.state.petals = 1240; BS.Save.state.gems = 380; BS.UI.refreshWallet(); BS.UI.show('garden'); });
  await s.waitForTimeout(700);
  await s.screenshot({ path: 'store-screenshots/3-garden.png' });
  // 4: level with buds
  await s.evaluate(() => { BS.Save.state.level = 14; BS.UI.startLevel(); });
  await s.waitForTimeout(900);
  await s.evaluate(() => document.querySelectorAll('.modal-bg').forEach(x => x.remove()));
  await s.screenshot({ path: 'store-screenshots/4-levels.png' });
  // 5: meadow
  await s.evaluate(() => { BS.Save.state.garden = { area: 1, done: [0,1,2,3,4,5,6,7] }; BS.UI.show('garden'); });
  await s.waitForTimeout(700);
  await s.screenshot({ path: 'store-screenshots/5-meadow.png' });
  console.log('screenshots written');
  await b.close();
})();
