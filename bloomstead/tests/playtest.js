// End-to-end playtest with real pointer drags. Run: node tests/playtest.js  (serve www on :8080 first)
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8080/';
const shots = 'tests/shots/';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };

async function dragPiece(p) {
  // choose a move like a decent player: maximise lines cleared, then buds
  const mv = await p.evaluate(() => {
    const G = BS.Game, C = BS.Core; let best = null;
    G.tray.forEach((pc, idx) => {
      if (!pc) return;
      for (let r = 0; r <= 8 - pc.shape.h; r++) for (let c = 0; c <= 8 - pc.shape.w; c++) {
        if (!C.canPlace(G.board, pc.shape, r, c)) continue;
        const pv = C.previewClears(G.board, pc.shape, r, c);
        let v = (pv.rows.length + pv.cols.length) * 100 + r * 2 + Math.random();
        if (!best || v > best.v) best = { idx, r, c, v, w: pc.shape.w, h: pc.shape.h };
      }
    });
    if (!best) return null;
    const L = G.L, rect = G.canvas.getBoundingClientRect();
    const sx = rect.left + L.trayX + L.slotW * (best.idx + 0.5), sy = rect.top + L.trayY + L.trayH / 2;
    const lift = L.cell * 0.4 + best.h * L.cell / 2;
    const tx = rect.left + L.bx + best.c * L.cell + best.w * L.cell / 2;
    const ty = rect.top + L.by + best.r * L.cell + best.h * L.cell / 2 + lift;
    return { sx, sy, tx, ty };
  });
  if (!mv) return false;
  await p.mouse.move(mv.sx, mv.sy); await p.mouse.down();
  await p.mouse.move((mv.sx + mv.tx) / 2, (mv.sy + mv.ty) / 2, { steps: 3 });
  await p.mouse.move(mv.tx, mv.ty, { steps: 3 });
  await p.mouse.up();
  await p.waitForTimeout(40);
  return true;
}
const clickText = async (p, txt) => { await p.locator('.modal button', { hasText: txt }).first().click(); await p.waitForTimeout(250); };
const modalTitle = (p) => p.evaluate(() => { const h = document.querySelector('.modal h2'); return h ? h.textContent : null; });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 14 Pro'], deviceScaleFactor: 2, hasTouch: false, isMobile: false });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.evaluate(() => { localStorage.clear(); });
  await p.reload();
  await p.evaluate(() => { window.__BS_FAST_ADS = true; window.__BS_AUTO_BUY = true; });
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => BS.UI.currentScreen === 'game' && BS.Game.mode === 'level'), 'new player dropped straight into Level 1');
  ok(!(await p.evaluate(() => document.body.classList.contains('has-banner'))), 'no banner for brand-new player');
  await p.screenshot({ path: shots + '01-level1.png' });

  // ---- play levels 1..6 ----
  for (let lvl = 1; lvl <= 6; lvl++) {
    let guard = 0;
    while (guard++ < 200) {
      const st = await p.evaluate(() => BS.Game.state);
      if (st !== 'play') break;
      if (!(await dragPiece(p))) break;
      if (lvl === 2 && guard === 2) await p.screenshot({ path: shots + '02-midlevel.png' });
    }
    await p.waitForTimeout(1500);
    const t = await modalTitle(p);
    if (t && t.includes('Complete')) {
      if (lvl === 1) await p.screenshot({ path: shots + '03-level-win.png' });
      ok(true, `level ${lvl} won`);
      await clickText(p, lvl % 2 ? 'Collect' : 'Next Level');
      await p.waitForTimeout(400);
      if (await p.evaluate(() => BS.UI.currentScreen) !== 'game') await p.evaluate(() => BS.UI.startLevel());
    } else if (t === 'Out of room!') {
      ok(true, `level ${lvl}: stuck -> revive offered`);
      await clickText(p, 'No thanks'); await p.waitForTimeout(300);
      await clickText(p, 'Try Again'); await p.waitForTimeout(500);
      lvl--; // retry
      if (await p.evaluate(() => BS.Save.state.level) > 30) break;
    } else { ok(false, `level ${lvl} unexpected modal: ${t}`); break; }
    await p.waitForTimeout(300);
    const left = await p.evaluate(() => document.querySelectorAll('.modal').length);
    if (left) { const tt = await modalTitle(p); console.log('   (modal open:', tt, ')'); await p.evaluate(() => document.querySelectorAll('.modal-bg').forEach(x => x.remove())); if (await p.evaluate(() => BS.UI.currentScreen) !== 'game') await p.evaluate(() => BS.UI.startLevel()); }
  }
  const lvlNow = await p.evaluate(() => BS.Save.state.level);
  ok(lvlNow >= 7, `progressed to level ${lvlNow}`);
  const petals = await p.evaluate(() => BS.Save.state.petals);
  ok(petals > 100, `earned petals from levels (${petals})`);

  // ---- classic mode ----
  await p.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(x => x.remove()); BS.UI.show('home'); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: shots + '04-home.png' });
  await p.click('#btn-classic');
  await p.waitForTimeout(400);
  let moves = 0, revived = false;
  while (moves < 600) {
    const st = await p.evaluate(() => BS.Game.state);
    if (st === 'play') { if (!(await dragPiece(p))) await p.waitForTimeout(700); else moves++; if (moves === 12) await p.screenshot({ path: shots + '05-classic.png' }); continue; }
    await p.waitForTimeout(800);
    const t = await modalTitle(p);
    if (t === 'Out of room!' && !revived) {
      await p.screenshot({ path: shots + '06-revive.png' });
      await clickText(p, 'Revive free'); await p.waitForTimeout(800); revived = true;
      ok(await p.evaluate(() => BS.Game.state === 'play'), 'rewarded revive resumed the game');
      continue;
    }
    if (t === 'Out of room!') { await clickText(p, 'No thanks'); await p.waitForTimeout(400); }
    break;
  }
  const res = await modalTitle(p);
  ok(res === 'Game Over' || res === 'New Best!', `classic ended with results (${moves} moves)`);
  await p.screenshot({ path: shots + '07-results.png' });
  const before = await p.evaluate(() => BS.Save.state.petals);
  await clickText(p, 'Collect ×2');
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => BS.Save.state.petals);
  ok(after > before, `x2 petals collected (${before} -> ${after})`);
  ok(await p.evaluate(() => BS.Save.state.best > 0), 'best score saved');
  await p.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(x => x.remove()); });

  // resume after "app kill"
  await p.waitForTimeout(300);
  for (let i = 0; i < 3; i++) await dragPiece(p);
  const scoreBefore = await p.evaluate(() => BS.Game.score);
  await p.evaluate(() => BS.Save.flush());
  await p.reload(); await p.evaluate(() => { window.__BS_FAST_ADS = true; window.__BS_AUTO_BUY = true; }); await p.waitForTimeout(1600);
  await p.evaluate(() => document.querySelectorAll('.modal-bg').forEach(x => x.remove()));
  ok(await p.evaluate(() => !document.querySelector('#btn-resume').classList.contains('hidden')), 'resume button shown after reload');
  await p.click('#btn-resume'); await p.waitForTimeout(300);
  ok(await p.evaluate((s) => BS.Game.score === s, scoreBefore), 'classic run resumed with same score');

  // boosters
  const cnt = await p.evaluate(() => ({ ...BS.Save.state.boosters }));
  await p.click('[data-b="reroll"]'); await p.waitForTimeout(200);
  if (cnt.reroll > 0) ok(await p.evaluate((n) => BS.Save.state.boosters.reroll === n - 1, cnt.reroll), 'shuffle booster consumed');
  else { ok(!!(await modalTitle(p)), 'booster offer shown when empty'); await p.evaluate(() => document.querySelectorAll('.modal-bg').forEach(x => x.remove())); }
  await dragPiece(p);
  await p.click('[data-b="undo"]'); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelectorAll('.modal-bg').forEach(x => x.remove()));
  await p.click('[data-b="trowel"]'); await p.waitForTimeout(200);
  const tg = await p.evaluate(() => BS.Game.targeting);
  if (tg === 'trowel') {
    const box = await p.evaluate(() => { const r = BS.Game.canvas.getBoundingClientRect(), L = BS.Game.L; return { x: r.left + L.bx + L.cell * 4.5, y: r.top + L.by + L.cell * 7.5 }; });
    await p.mouse.click(box.x, box.y); await p.waitForTimeout(200);
    ok(await p.evaluate(() => BS.Game.targeting === null), 'trowel dig resolves');
  } else { await p.screenshot({ path: shots + '08-booster-offer.png' }); await p.evaluate(() => document.querySelectorAll('.modal-bg').forEach(x => x.remove())); }

  // ---- garden ----
  await p.evaluate(() => BS.UI.show('garden')); await p.waitForTimeout(500);
  await p.screenshot({ path: shots + '09-garden-start.png' });
  await p.evaluate(() => BS.Save.addPetals(5000));
  for (let i = 0; i < 8; i++) { await p.evaluate(() => BS.UI.renderGarden()); const btn = p.locator('#btn-task'); await btn.click(); await p.waitForTimeout(150); }
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shots + '10-garden-done.png' });
  ok((await modalTitle(p)) === 'Garden Restored!', 'area complete celebration');
  await clickText(p, 'Visit'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => BS.Save.state.garden.area === 1), 'unlocked area 2');
  await p.evaluate(() => { BS.Save.addPetals(20000); for (let i = 0; i < 8; i++) BS.Save.state.garden.done.push(i); BS.UI.renderGarden(); });
  await p.waitForTimeout(400); await p.screenshot({ path: shots + '11-meadow.png' });
  await p.evaluate(() => { BS.Save.state.garden.area = 2; BS.Save.state.garden.done = [0,1,2,3,4,5,6,7]; BS.UI.renderGarden(); });
  await p.waitForTimeout(400); await p.screenshot({ path: shots + '12-greenhouse.png' });
  await p.evaluate(() => { BS.Save.state.garden.area = 0; BS.Save.state.garden.done = [0,1,2,3,4,5,6,7]; BS.UI.renderGarden(); });
  await p.waitForTimeout(300); await p.screenshot({ path: shots + '12b-cottage.png' });
  await p.evaluate(() => { BS.Save.state.garden.area = 1; BS.Save.state.garden.done = []; BS.Save.save(); });

  // ---- shop ----
  await p.evaluate(() => BS.UI.show('shop')); await p.waitForTimeout(300);
  await p.screenshot({ path: shots + '13-shop.png', fullPage: false });
  const g0 = await p.evaluate(() => BS.Save.state.gems);
  await p.locator('.offer-card.starter button').click(); await p.waitForTimeout(300);
  ok(await p.evaluate((g) => BS.Save.state.gems === g + 400 && BS.Save.state.purchased['bloom.starter'] === 1, g0), 'starter bundle grants gems');
  await p.locator('.offer-card.noads button').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => BS.Save.state.noAds), 'No Ads purchase sets flag');
  const ia = await p.evaluate(async () => { BS.Save.state.gamesPlayed = 99; BS.Save.state.gamesSinceInterstitial = 99; BS.Save.state.lastInterstitial = 0; return BS.Ads.maybeInterstitial(); });
  ok(ia === false, 'no interstitials after No Ads');

  // ---- daily & spin ----
  await p.evaluate(() => BS.UI.show('home')); await p.waitForTimeout(200);
  await p.click('#btn-daily'); await p.waitForTimeout(300);
  await p.screenshot({ path: shots + '14-daily.png' });
  await clickText(p, 'Claim ×2'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => BS.Save.state.daily.streak === 1), 'daily claimed');
  await p.click('#btn-spin'); await p.waitForTimeout(300);
  await p.locator('#spin-go').click(); await p.waitForTimeout(4300);
  await p.screenshot({ path: shots + '15-spin.png' });
  ok(await p.evaluate(() => BS.Save.state.spin.freeUsed), 'free spin used');
  await p.evaluate(() => document.querySelectorAll('.modal-bg').forEach(x => x.remove()));
  await p.click('#btn-settings'); await p.waitForTimeout(300);
  await p.screenshot({ path: shots + '16-settings.png' });

  ok(errs.length === 0, 'no JS errors' + (errs.length ? ':\n' + errs.join('\n') : ''));
  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
