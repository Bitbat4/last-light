/* Bloomstead — screens, modals, shop, garden, daily & spin. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const S = () => BS.Save.state;
  const CFG = BS.CONFIG, E = CFG.ECONOMY;
  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const ico = (n, cls = '') => `<span class="ico ico-${n} ${cls}"></span>`;
  const sfx = (n, ...a) => BS.Audio.SFX[n](...a);

  const UI = { currentScreen: 'home' };

  // ================= navigation =================
  UI.show = function (name) {
    UI.currentScreen = name;
    $$('.screen').forEach((el) => el.classList.toggle('active', el.id === 'screen-' + name));
    $$('#bottomnav button').forEach((b) => b.classList.toggle('active', b.dataset.go === name));
    document.body.classList.toggle('in-game', name === 'game');
    if (name === 'game') { BS.Game.resize(); BS.Ads.showBanner(); }
    else { BS.Ads.hideBanner(); UI.hideHint(); }
    if (name === 'home') UI.renderHome();
    if (name === 'garden') UI.renderGarden();
    if (name === 'shop') UI.renderShop();
  };

  UI.init = function () {
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => { sfx('tap'); UI.show(b.dataset.go); }));
    $('#btn-settings').onclick = () => { sfx('tap'); UI.showSettings(); };
    $('#btn-level').onclick = () => { sfx('tap'); UI.startLevel(); };
    $('#btn-classic').onclick = () => { sfx('tap'); UI.startClassic(false); };
    $('#btn-resume').onclick = () => { sfx('tap'); UI.startClassic(true); };
    $('#home-garden').onclick = () => { sfx('tap'); UI.show('garden'); };
    $('#btn-daily').onclick = () => { sfx('tap'); UI.showDaily(true); };
    $('#btn-spin').onclick = () => { sfx('tap'); UI.showSpin(); };
    $('#btn-starter').onclick = () => { sfx('tap'); UI.showStarterOffer(); };
    $('#btn-noads').onclick = () => { sfx('tap'); UI.showNoAdsOffer(); };
    $('#btn-pause').onclick = () => { sfx('tap'); UI.showPause(); };
    $('.logo-flower').classList.add('ico-flower');
    $$('.booster').forEach((b) => b.addEventListener('click', () => UI.onBooster(b.dataset.b)));
    UI.refreshWallet();
    UI.renderHome();
    gardenLoop();
  };

  // ================= wallet & hud =================
  UI.refreshWallet = function (flash) {
    $('#w-gems').textContent = fmt(S().gems);
    $('#w-petals').textContent = fmt(S().petals);
    if (flash) { const el = $('#pill-' + flash); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  };
  UI.setScore = (n) => { $('#hud-score').textContent = fmt(n); };
  UI.updateHud = function (reset) {
    const G = BS.Game;
    if (reset) UI.setScore(G.score);
    const goal = $('#hud-goal');
    if (G.mode === 'level') {
      goal.classList.remove('invisible');
      const left = Math.max(0, G.budsTotal - G.buds);
      const el = $('#hud-goal-n');
      if (el.textContent !== String(left) && !reset) { goal.classList.remove('bump'); void goal.offsetWidth; goal.classList.add('bump'); }
      el.textContent = left;
      $('#hud-sub').innerHTML = G.hard ? `<span style="color:#e5484d">Hard Level ${G.level}</span>` : `Level ${G.level}`;
    } else {
      goal.classList.add('invisible');
      $('#hud-sub').innerHTML = `${ico('crown')} <span>${fmt(Math.max(S().best, G.score))}</span>`;
    }
    for (const b of ['undo', 'reroll', 'trowel']) {
      const n = S().boosters[b] || 0;
      const el = $(`[data-cnt="${b}"]`);
      el.textContent = n > 0 ? n : '+';
      el.classList.toggle('plus', n <= 0);
    }
    $('[data-b="undo"]').classList.toggle('off', !G.canUndo());
    $('[data-b="trowel"]').classList.toggle('active', G.targeting === 'trowel');
  };

  // ================= home =================
  UI.renderHome = function () {
    const s = S();
    if (UI.pendingStarter) { UI.pendingStarter = false; UI.maybeStarterPopup(); }
    $('#home-level').textContent = s.level;
    $('#btn-level').classList.toggle('hard', BS.Core.isHard(s.level));
    setTimeout(() => BS.Core.makeLevel(s.level), 600); // warm the level cache
    $('#home-best').textContent = s.best ? 'Best ' + fmt(s.best) : 'Endless';
    $('#btn-resume').classList.toggle('hidden', !s.classicRun);
    $('#btn-noads').classList.toggle('hidden', s.noAds);
    $('#btn-starter').classList.toggle('hidden', !!s.purchased['bloom.starter'] || s.gamesPlayed < 2);
    $('#badge-daily').classList.toggle('hidden', !dailyAvailable());
    const spinsLeft = (spinFree() ? 1 : 0);
    $('#badge-spin').classList.toggle('hidden', !spinsLeft);
    const g = s.garden, area = BS.Art.AREAS[Math.min(g.area, BS.Art.AREAS.length - 1)];
    $('#home-area-name').textContent = area.name;
    $('#home-area-progress').textContent = `${g.done.length}/${area.items.length}`;
    const next = nextTask();
    const nt = $('#home-next-task');
    if (next) {
      const ready = s.petals >= next.cost;
      nt.innerHTML = ready ? `${ico('star')} Build: ${next.name}` : `${ico('petal')} ${fmt(s.petals)} / ${fmt(next.cost)}`;
      nt.classList.toggle('ready', ready);
    } else nt.innerHTML = 'All gardens restored!';
  };

  UI.startLevel = function () {
    UI.show('game');
    BS.Game.start('level', S().level);
  };
  UI.startClassic = function (resume) {
    const run = S().classicRun;
    UI.show('game');
    BS.Game.start('classic', 1, resume && run ? run : null);
  };

  // ================= boosters =================
  UI.onBooster = function (type) {
    const G = BS.Game;
    if (G.state !== 'play') return;
    sfx('tap');
    if (type === 'trowel' && G.targeting === 'trowel') { G.targeting = null; UI.hideHint(); UI.updateHud(); return; }
    const have = S().boosters[type] || 0;
    if (have > 0) {
      const r = G.applyBooster(type);
      if (r === true) { S().boosters[type]--; BS.Save.save(); }
      UI.updateHud();
      return;
    }
    UI.showBoosterOffer(type);
  };
  UI.boosterConsumed = function (type) { S().boosters[type] = Math.max(0, (S().boosters[type] || 0) - 1); BS.Save.save(); UI.updateHud(); };

  const BOOSTER_INFO = {
    undo: ['Undo', 'Take back your last move.'],
    reroll: ['Shuffle', 'Swap the blocks in your tray for friendlier ones.'],
    trowel: ['Trowel', 'Dig out any 3×3 patch of the board.'],
  };
  UI.showBoosterOffer = function (type) {
    const G = BS.Game, cost = E.boosterGems[type];
    const adUsed = G.adBooster[type];
    const m = UI.modal({
      title: BOOSTER_INFO[type][0],
      html: `<div class="bm" style="margin:6px auto;width:64px;height:64px;border-radius:20px;background:linear-gradient(#b493ff,#9068ec);display:grid;place-items:center">${ico(type)}</div><p>${BOOSTER_INFO[type][1]}</p>`,
      buttons: [
        !adUsed && { label: `${ico('ad')} Free with video`, cls: 'btn-green', onClick: async () => {
          m.close();
          if (await BS.Ads.showRewarded('booster_' + type)) { G.adBooster[type] = true; BS.Save.addBooster(type, 1); UI.onBooster(type); }
        } },
        { label: `Buy 3 for ${ico('gem')} ${cost * 2}`, cls: 'btn-blue', onClick: () => {
          if (BS.Save.spendGems(cost * 2)) { m.close(); BS.Save.addBooster(type, 3); sfx('coin'); UI.updateHud(); }
          else { m.close(); UI.needGems(); }
        } },
      ],
      close: true,
    });
  };

  // ================= revive / results =================
  UI.showRevive = function (G) {
    const cost = E.reviveGems[Math.min(G.revives, E.reviveGems.length - 1)];
    const isLevel = G.mode === 'level';
    const m = UI.modal({
      title: 'Out of room!',
      html: `<p>${isLevel ? `Only <b>${G.budsTotal - G.buds}</b> bud${G.budsTotal - G.buds === 1 ? '' : 's'} left to free!` : `Score <b>${fmt(G.score)}</b>${G.score >= S().best && S().best > 0 ? ' — a new best is within reach!' : ''}`}</p>
             <p class="stat-line">Revive clears space on the board and gives you fresh blocks.</p>`,
      buttons: [
        !G.adRevive && { label: `${ico('ad')} Revive free`, cls: 'btn-green', onClick: async () => {
          m.close();
          if (await BS.Ads.showRewarded('revive')) { G.adRevive = true; G.revive(); }
          else UI.showRevive(G);
        } },
        { label: `Revive for ${ico('gem')} ${cost}`, cls: 'btn-blue', onClick: () => {
          if (BS.Save.spendGems(cost)) { m.close(); G.revive(); }
          else { m.close(); UI.needGems(() => UI.showRevive(G)); }
        } },
        { label: 'No thanks', cls: 'link', onClick: () => { m.close(); G.endRun(); } },
      ],
    });
  };

  UI.showResults = function (r) {
    let collected = false;
    const collect = (mult) => { if (collected) return; collected = true; BS.Save.addPetals(r.petals * mult); sfx('coin'); };
    const after = async (fn, skipInterstitial) => { if (!skipInterstitial) await BS.Ads.maybeInterstitial(); fn(); UI.maybeStarterPopup(); };
    const m = UI.modal({
      title: r.newBest ? 'New Best!' : 'Game Over',
      html: `${r.newBest ? '<div class="new-best">★ NEW RECORD ★</div>' : ''}
        <div class="big-score">${fmt(r.score)}</div>
        <div class="stat-line">${ico('crown')} Best ${fmt(r.best)} · ${r.lines} lines · ${r.blooms} blooms</div>
        <div class="reward-row"><div class="reward">${ico('petal')} +${fmt(r.petals)}</div></div>`,
      buttons: [
        r.petals > 0 && { label: `${ico('ad')} Collect ×2 (${fmt(r.petals * 2)})`, cls: 'btn-green', onClick: async () => {
          if (await BS.Ads.showRewarded('double_classic')) { collect(2); m.close(); after(() => UI.startClassic(false), true); }
        } },
        { label: 'Play Again', cls: 'btn-blue', onClick: () => { collect(1); m.close(); after(() => UI.startClassic(false)); } },
        { label: 'Home', cls: 'link', onClick: () => { collect(1); m.close(); after(() => UI.show('home')); } },
      ],
    });
  };

  UI.showLevelWin = function (r) {
    let collected = false;
    const collect = (mult) => {
      if (collected) return; collected = true;
      BS.Save.addPetals(r.petals * mult); BS.Save.addGems(r.gems); sfx('coin');
    };
    const after = async (fn, skip) => { if (!skip) await BS.Ads.maybeInterstitial(); fn(); UI.maybeStarterPopup(); };
    const m = UI.modal({
      title: `Level ${r.level} Complete!`,
      html: `<div style="font-size:40px;letter-spacing:4px">${ico('star')}${ico('star')}${ico('star')}</div>
        <div class="reward-row"><div class="reward">${ico('petal')} +${fmt(r.petals)}</div><div class="reward">${ico('gem')} +${r.gems}</div></div>`,
      buttons: [
        { label: `${ico('ad')} Collect ×2 petals`, cls: 'btn-green', onClick: async () => {
          if (await BS.Ads.showRewarded('double_level')) { collect(2); m.close(); after(() => UI.goNext(), true); }
        } },
        { label: 'Next Level', cls: 'btn-blue', onClick: () => { collect(1); m.close(); after(() => UI.goNext()); } },
      ],
    });
    m.el.querySelectorAll('.ico-star').forEach((s, i) => { s.style.width = s.style.height = '44px'; s.style.animation = `pop .4s ${0.15 * i}s both cubic-bezier(.3,1.6,.5,1)`; });
  };
  // After a win: nudge to the garden when a task is affordable — this is the core retention loop.
  UI.goNext = function () {
    const nt = nextTask();
    if (nt && S().petals >= nt.cost) { UI.show('garden'); UI.toast('You have enough petals to build!'); }
    else UI.startLevel();
  };

  UI.showLevelFail = function (r) {
    const m = UI.modal({
      title: 'So close!',
      html: `<p>You freed <b>${r.buds}</b> of <b>${r.total}</b> buds.</p>`,
      buttons: [
        { label: 'Try Again', cls: 'btn-green', onClick: async () => { m.close(); await BS.Ads.maybeInterstitial(); UI.startLevel(); } },
        { label: 'Home', cls: 'link', onClick: async () => { m.close(); await BS.Ads.maybeInterstitial(); UI.show('home'); } },
      ],
    });
  };

  UI.showPause = function () {
    const G = BS.Game;
    const m = UI.modal({
      title: 'Paused',
      html: settingsToggles(),
      buttons: [
        { label: 'Resume', cls: 'btn-green', onClick: () => m.close() },
        { label: 'Restart', cls: 'btn-blue', onClick: () => { m.close(); if (G.mode === 'level') UI.startLevel(); else { S().classicRun = null; UI.startClassic(false); } } },
        { label: 'Home', cls: 'link', onClick: () => { m.close(); UI.show('home'); } },
      ],
    });
    bindToggles(m.el);
  };

  UI.needGems = function (onDone) {
    const m = UI.modal({
      title: 'Not enough gems',
      html: `<p>Get more gems in the shop — or watch a short video for a few free ones.</p>`,
      buttons: [
        { label: 'Open Shop', cls: 'btn-blue', onClick: () => { m.close(); if (BS.Game.state === 'stuck' || BS.Game.state === 'play') UI.shopModal(onDone); else UI.show('shop'); } },
        { label: 'Cancel', cls: 'link', onClick: () => { m.close(); onDone && onDone(); } },
      ],
    });
  };

  // shop as a modal while mid-game (so the run is not lost)
  UI.shopModal = function (onDone) {
    const m = UI.modal({ title: 'Gems', html: `<div class="grid" id="mini-shop"></div>`, close: true, onClose: () => onDone && onDone() });
    const grid = m.el.querySelector('#mini-shop');
    ['bloom.gems.120', 'bloom.gems.650', 'bloom.gems.1400'].forEach((id) => grid.appendChild(gemItem(id, () => { UI.refreshWallet('gems'); })));
  };

  // ================= garden =================
  function nextTask() {
    const g = S().garden;
    const area = BS.Art.AREAS[g.area];
    if (!area) return null;
    for (let i = 0; i < area.items.length; i++) if (!g.done.includes(i)) return { idx: i, name: area.names[i], cost: area.costs[i], area };
    return null;
  }
  UI.nextTask = nextTask;

  UI.renderGarden = function () {
    const s = S(), g = s.garden;
    const areaIdx = Math.min(g.area, BS.Art.AREAS.length - 1);
    const area = BS.Art.AREAS[areaIdx];
    $('#garden-title').textContent = area.name;
    $('#garden-blurb').textContent = area.blurb;
    const done = g.area >= BS.Art.AREAS.length ? area.items.length : g.done.length;
    $('#garden-bar').style.width = (done / area.items.length) * 100 + '%';
    $('#garden-count').textContent = `${done}/${area.items.length}`;
    const nt = nextTask();
    const card = $('#task-card');
    if (!nt && BS.Art.AREAS[g.area + 1] && g.done.length >= area.items.length) {
      // area finished but player never tapped "Visit" (e.g. app closed) — let them move on
      card.innerHTML = `<div class="tc-text"><h3>${area.name} is restored!</h3><p>A new garden awaits.</p></div><button class="btn btn-pink btn-sm" id="btn-task">Visit</button>`;
      $('#btn-task').onclick = () => { g.area++; g.done = []; BS.Save.save(); BS.Audio.SFX.unlock(); UI.renderGarden(); };
    } else if (!nt) {
      card.innerHTML = `<div class="tc-text"><h3>Every garden is in full bloom!</h3><p>New gardens are on the way. Keep playing to save up petals.</p></div>`;
    } else {
      const can = s.petals >= nt.cost;
      card.innerHTML = `<div class="tc-text"><h3>${nt.name}</h3><p>${ico('petal')} ${fmt(s.petals)} / ${fmt(nt.cost)} petals</p></div>
        <button class="btn ${can ? 'btn-pink' : 'btn-green'} btn-sm" id="btn-task">${can ? 'Build!' : 'Earn petals'}</button>`;
      $('#btn-task').onclick = () => {
        if (s.petals >= nt.cost) buildTask(nt);
        else UI.showPetalOptions(nt);
      };
    }
    $('#task-list').innerHTML = area.names.map((n, i) => `<div class="${g.done.includes(i) || g.area > areaIdx ? 'done' : ''}">${ico(g.done.includes(i) || g.area > areaIdx ? 'check' : 'lock')}${n}</div>`).join('');
  };

  function buildTask(nt) {
    const s = S();
    if (!BS.Save.spendPetals(nt.cost)) return;
    s.garden.done.push(nt.idx);
    BS.Audio.SFX.unlock(); BS.Audio.haptic('success');
    gardenSparkle = 1.2;
    BS.Analytics.log('garden_build', { area: s.garden.area, idx: nt.idx });
    if (s.garden.done.length >= nt.area.items.length) {
      setTimeout(() => {
        const reward = 100 + s.garden.area * 100;
        BS.Save.addGems(reward);
        const m = UI.modal({
          title: 'Garden Restored!',
          html: `<p><b>${nt.area.name}</b> is in full bloom again.</p><div class="reward-row"><div class="reward">${ico('gem')} +${reward}</div></div>`,
          buttons: [{ label: BS.Art.AREAS[s.garden.area + 1] ? `Visit ${BS.Art.AREAS[s.garden.area + 1].name}` : 'Wonderful!', cls: 'btn-green', onClick: () => {
            m.close();
            s.garden.area++; s.garden.done = []; BS.Save.save(); UI.renderGarden();
          } }],
        });
        BS.Audio.SFX.win();
      }, 900);
    }
    BS.Save.save();
    UI.renderGarden();
  }

  UI.showPetalOptions = function (nt) {
    const need = nt.cost - S().petals;
    const pack = E.petalPacks.find((p) => p.petals >= need) || E.petalPacks[E.petalPacks.length - 1];
    const m = UI.modal({
      title: 'Need more petals',
      html: `<p>You need <b>${fmt(need)}</b> more ${ico('petal')} to <b>${nt.name.toLowerCase()}</b>.</p><p class="stat-line">Clear lines in any mode to earn petals. Full Blooms earn extra!</p>`,
      buttons: [
        { label: `Play Level ${S().level}`, cls: 'btn-green', onClick: () => { m.close(); UI.startLevel(); } },
        { label: `${ico('petal')} ${fmt(pack.petals)} for ${ico('gem')} ${pack.gems}`, cls: 'btn-blue', onClick: () => {
          if (BS.Save.spendGems(pack.gems)) { BS.Save.addPetals(pack.petals); sfx('coin'); m.close(); UI.renderGarden(); }
          else { m.close(); UI.needGems(); }
        } },
      ],
      close: true,
    });
  };

  let gardenSparkle = 0;
  const sparkles = [];
  function gardenLoop() {
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = now / 1000;
      const id = UI.currentScreen === 'garden' ? 'garden-canvas' : UI.currentScreen === 'home' ? 'home-garden-canvas' : null;
      if (id) {
        const cv = document.getElementById(id);
        const r = cv.getBoundingClientRect();
        if (r.width) {
          const d = Math.min(window.devicePixelRatio || 1, 2);
          if (cv.width !== Math.round(r.width * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
          const ctx = cv.getContext('2d');
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const g = S().garden;
          const areaIdx = Math.min(g.area, BS.Art.AREAS.length - 1);
          const doneList = g.area >= BS.Art.AREAS.length ? BS.Art.AREAS[areaIdx].items.map((_, i) => i) : g.done;
          BS.Art.drawGarden(ctx, areaIdx, doneList, t, cv.width / BS.Art.SCENE_W);
          if (gardenSparkle > 0 && id === 'garden-canvas') {
            gardenSparkle -= dt;
            for (let k = 0; k < 3; k++) sparkles.push({ x: Math.random() * cv.width, y: cv.height * (0.4 + Math.random() * 0.6), vy: -40 - Math.random() * 80, life: 1 });
          }
          for (const p of sparkles) { p.y += p.vy * dt * d; p.life -= dt; ctx.globalAlpha = Math.max(0, p.life); BS.Art.flower(ctx, p.x, p.y, 4 * d, '#fff6b0', '#ff8fb8'); }
          ctx.globalAlpha = 1;
          for (let i = sparkles.length - 1; i >= 0; i--) if (sparkles[i].life <= 0) sparkles.splice(i, 1);
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ================= shop =================
  function gemItem(id, after) {
    const def = CFG.PRODUCTS[id];
    const d = document.createElement('div');
    d.className = 'item';
    d.innerHTML = `${def.tag ? `<span class="tag">${def.tag}</span>` : ''}${ico('gem', 'big')}<div class="amt">${fmt(def.grant.gems)}</div><button class="btn btn-green">${BS.Store.price(id)}</button>`;
    d.querySelector('button').onclick = async () => { sfx('tap'); if (await BS.Store.purchase(id)) { UI.toast(`+${fmt(def.grant.gems)} gems!`); after && after(); } };
    return d;
  }

  UI.renderShop = function () {
    const s = S(), root = $('#shop');
    root.innerHTML = '';
    const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; const el = d.firstElementChild; root.appendChild(el); return el; };

    if (!s.purchased['bloom.starter']) {
      const g = CFG.PRODUCTS['bloom.starter'].grant;
      const el = add(`<div class="offer-card starter"><div class="ribbon">ONE TIME</div><h3>Starter Bundle</h3>
        <ul><li>${ico('gem')} ${g.gems}</li><li>${ico('petal')} ${fmt(g.petals)}</li><li>${ico('undo')}${ico('reroll')}${ico('trowel')} ×${g.boosters}</li></ul>
        <button class="btn btn-gold">${BS.Store.price('bloom.starter')}</button></div>`);
      el.querySelector('button').onclick = async () => { if (await BS.Store.purchase('bloom.starter')) { UI.toast('Starter Bundle unlocked!'); UI.renderShop(); } };
    }
    if (!s.purchased['bloom.gardener']) {
      const g = CFG.PRODUCTS['bloom.gardener'].grant;
      const el = add(`<div class="offer-card gardener"><div class="ribbon">BEST DEAL</div><h3>Gardener's Bundle</h3>
        <ul><li>${ico('noads')} No forced ads</li><li>${ico('gem')} ${fmt(g.gems)}</li><li>${ico('undo')}${ico('reroll')}${ico('trowel')} ×${g.boosters}</li></ul>
        <button class="btn btn-gold">${BS.Store.price('bloom.gardener')}</button></div>`);
      el.querySelector('button').onclick = async () => { if (await BS.Store.purchase('bloom.gardener')) { UI.toast('Thank you! Enjoy ad-free play.'); UI.renderShop(); } };
    }
    if (!s.noAds) {
      const el = add(`<div class="offer-card noads"><h3>No Ads</h3><ul><li>Remove all banner &amp; between-level ads forever. Optional reward videos stay available.</li></ul>
        <button class="btn btn-gold">${BS.Store.price('bloom.noads')}</button></div>`);
      el.querySelector('button').onclick = async () => { if (await BS.Store.purchase('bloom.noads')) { UI.toast('Ads removed. Thank you!'); UI.renderShop(); } };
    }

    add('<h4>Gems</h4>');
    const grid = add('<div class="grid"></div>');
    // free gems via rewarded video
    const fg = freeGemsStatus();
    const free = document.createElement('div');
    free.className = 'item';
    free.innerHTML = `<span class="tag" style="background:#38a14b">FREE</span>${ico('gem', 'big')}<div class="amt">${E.freeGemsAd.gems}</div><button class="btn btn-purple" ${fg.ok ? '' : 'disabled'}>${fg.ok ? `${ico('ad')}` : fg.label}</button>`;
    free.querySelector('button').onclick = async () => {
      if (!freeGemsStatus().ok) return;
      if (await BS.Ads.showRewarded('free_gems')) {
        const f = S().freeGems; const t = BS.Save.today();
        if (f.day !== t) { f.day = t; f.count = 0; }
        f.count++; f.last = Date.now(); BS.Save.addGems(E.freeGemsAd.gems); sfx('coin'); UI.renderShop();
      }
    };
    grid.appendChild(free);
    Object.keys(CFG.PRODUCTS).filter((id) => id.startsWith('bloom.gems.')).forEach((id) => grid.appendChild(gemItem(id, () => UI.renderShop())));

    add('<h4>Petals</h4>');
    const pg = add('<div class="grid"></div>');
    E.petalPacks.forEach((p) => {
      const d = document.createElement('div'); d.className = 'item';
      d.innerHTML = `${ico('petal', 'big')}<div class="amt">${fmt(p.petals)}</div><button class="btn btn-blue">${ico('gem')} ${p.gems}</button>`;
      d.querySelector('button').onclick = () => { if (BS.Save.spendGems(p.gems)) { BS.Save.addPetals(p.petals); sfx('coin'); UI.toast(`+${fmt(p.petals)} petals`); } else UI.needGems(); };
      pg.appendChild(d);
    });

    add('<h4>Boosters</h4>');
    const bg = add('<div class="grid"></div>');
    ['undo', 'reroll', 'trowel'].forEach((b) => {
      const d = document.createElement('div'); d.className = 'item';
      d.innerHTML = `<div class="bm" style="width:44px;height:44px;border-radius:14px;background:linear-gradient(#b493ff,#9068ec);display:grid;place-items:center">${ico(b)}</div><div class="amt">×3 <small style="font-size:12px;color:#7a6a5e">(have ${S().boosters[b] || 0})</small></div><button class="btn btn-blue">${ico('gem')} ${E.boosterGems[b] * 2}</button>`;
      d.querySelector('button').onclick = () => { if (BS.Save.spendGems(E.boosterGems[b] * 2)) { BS.Save.addBooster(b, 3); sfx('coin'); UI.renderShop(); } else UI.needGems(); };
      bg.appendChild(d);
    });

    const rs = add(`<button class="restore">Restore Purchases</button>`);
    rs.onclick = () => BS.Store.restore();
    add(`<p class="legal">Gems and petals are virtual items with no cash value. Payment is charged to your Apple ID. <a href="${CFG.PRIVACY_URL}" target="_blank" style="color:inherit">Privacy Policy</a></p>`);
  };

  function freeGemsStatus() {
    const f = S().freeGems, now = Date.now();
    if (f.day === BS.Save.today() && f.count >= E.freeGemsAd.perDay) return { ok: false, label: 'Tomorrow' };
    const wait = f.last + E.freeGemsAd.cooldownMin * 60000 - now;
    if (wait > 0) return { ok: false, label: Math.ceil(wait / 60000) + 'm' };
    return { ok: true };
  }

  UI.showStarterOffer = function () {
    if (S().purchased['bloom.starter']) return;
    const g = CFG.PRODUCTS['bloom.starter'].grant;
    const m = UI.modal({
      title: 'Starter Bundle',
      html: `<p>A one-time head start for new gardeners.</p>
        <div class="reward-row"><div class="reward">${ico('gem')} ${g.gems}</div><div class="reward">${ico('petal')} ${fmt(g.petals)}</div></div>
        <div class="reward-row"><div class="reward">${ico('undo')}${ico('reroll')}${ico('trowel')} ×${g.boosters}</div></div>`,
      buttons: [{ label: `Get it for ${BS.Store.price('bloom.starter')}`, cls: 'btn-gold', onClick: async () => { if (await BS.Store.purchase('bloom.starter')) { m.close(); UI.renderHome(); UI.toast('Starter Bundle unlocked!'); } } }],
      close: true,
    });
  };
  UI.showNoAdsOffer = function () {
    const m = UI.modal({
      title: 'Remove Ads',
      html: `<div style="margin:6px auto;width:72px;height:72px">${ico('noads')}</div><p>No more banners or between-level ads — forever. Reward videos stay optional.</p>`,
      buttons: [
        { label: `Remove Ads ${BS.Store.price('bloom.noads')}`, cls: 'btn-blue', onClick: async () => { if (await BS.Store.purchase('bloom.noads')) { m.close(); UI.renderHome(); UI.toast('Ads removed. Thank you!'); } } },
        { label: 'Restore purchase', cls: 'link', onClick: () => { m.close(); BS.Store.restore(); } },
      ],
      close: true,
    });
    m.el.querySelector('.ico-noads').style.cssText = 'width:72px;height:72px';
  };
  // Shown at most once per day, after the player has had a few satisfying wins.
  UI.maybeStarterPopup = function () {
    const s = S();
    if (s.purchased['bloom.starter'] || s.gamesPlayed < 4) return;
    if (s.lastStarterPopup === BS.Save.today()) return;
    if (UI.currentScreen === 'game') { UI.pendingStarter = true; return; } // never interrupt a fresh run
    s.lastStarterPopup = BS.Save.today(); BS.Save.save();
    setTimeout(() => UI.showStarterOffer(), 400);
  };

  // ================= daily rewards =================
  function dailyAvailable() { return S().daily.last !== BS.Save.today(); }
  function rewardHtml(r) {
    const parts = [];
    if (r.petals) parts.push(`${ico('petal')}${fmt(r.petals)}`);
    if (r.gems) parts.push(`${ico('gem')}${r.gems}`);
    if (r.booster) parts.push(`${ico(r.booster)}×${r.n || 1}`);
    return parts.join(' ');
  }
  function grant(r, mult = 1) {
    if (r.petals) BS.Save.addPetals(r.petals * mult);
    if (r.gems) BS.Save.addGems(r.gems * mult);
    if (r.booster) BS.Save.addBooster(r.booster, (r.n || 1) * mult);
  }
  UI.showDaily = function (manual) {
    const s = S(), d = s.daily, t = BS.Save.today();
    const avail = dailyAvailable();
    // streak continues if claimed yesterday
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yest = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    let streak = d.streak;
    if (avail && d.last !== yest) streak = 0;
    const dayIdx = avail ? streak % 7 : (streak - 1 + 7) % 7;
    if (!avail && !manual) return;
    const cells = E.daily.map((r, i) => `<div class="day ${i < dayIdx || (!avail && i === dayIdx) ? 'claimed' : ''} ${avail && i === dayIdx ? 'today' : ''} ${i === 6 ? 'd7' : ''}">Day ${i + 1}<div>${i < dayIdx || (!avail && i === dayIdx) ? ico('check') : rewardHtml(r)}</div></div>`).join('');
    const today = E.daily[dayIdx];
    let m;
    const claim = (mult) => {
      d.last = t; d.streak = streak + 1; BS.Save.save();
      grant(today, mult); sfx('coin'); BS.Audio.haptic('success');
      m.close(); UI.renderHome(); UI.toast('Daily gift collected!');
    };
    m = UI.modal({
      title: 'Daily Gift',
      html: `<p>${avail ? 'Come back every day for bigger gifts!' : 'Come back tomorrow for your next gift.'}</p><div class="days">${cells}</div>`,
      buttons: avail ? [
        { label: `${ico('ad')} Claim ×2`, cls: 'btn-green', onClick: async () => { if (await BS.Ads.showRewarded('daily_double')) claim(2); } },
        { label: 'Claim', cls: 'btn-blue', onClick: () => claim(1) },
      ] : [{ label: 'OK', cls: 'btn-blue', onClick: () => m.close() }],
      close: true,
    });
  };

  // ================= lucky spin =================
  function spinFree() { const sp = S().spin; return sp.day !== BS.Save.today() || !sp.freeUsed; }
  function spinAdsLeft() { const sp = S().spin; return sp.day !== BS.Save.today() ? E.adSpinsPerDay : E.adSpinsPerDay - sp.adSpins; }
  UI.showSpin = function () {
    const segs = E.wheel;
    let spinning = false, angle = 0;
    const m = UI.modal({
      title: 'Lucky Spin',
      html: `<div class="wheel-wrap"><canvas width="520" height="520"></canvas><div class="wheel-ptr"></div></div><p class="stat-line" id="spin-info"></p>`,
      buttons: [{ label: '', cls: 'btn-green', id: 'spin-go', onClick: () => go() }],
      close: true,
    });
    const cv = m.el.querySelector('canvas'), ctx = cv.getContext('2d');
    const imgs = {};
    ['petal', 'gem', 'reroll', 'trowel', 'undo'].forEach((k) => { const im = new Image(); im.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(BS.Icons[k]); im.onload = () => draw(); imgs[k] = im; });
    const cols = ['#ffd1dc', '#fff1b8', '#d9ccff', '#c9f5e2', '#cfe6ff', '#ffe0c7', '#ffd1dc', '#fff1b8'];
    function draw() {
      const R = 250; ctx.clearRect(0, 0, 520, 520); ctx.save(); ctx.translate(260, 260); ctx.rotate(angle);
      const n = segs.length;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n, a1 = a0 + (Math.PI * 2) / n;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath();
        ctx.fillStyle = cols[i]; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke();
        ctx.save(); ctx.rotate((a0 + a1) / 2 + Math.PI / 2);
        const im = imgs[segs[i].icon]; if (im && im.complete) ctx.drawImage(im, -30, -R + 40, 60, 60);
        ctx.fillStyle = '#4a3b33'; ctx.font = '900 34px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText((segs[i].booster ? '×' : '') + segs[i].label, 0, -R + 140);
        ctx.restore();
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(260, 260, 36, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#ff6b8f'; ctx.stroke();
    }
    function refresh() {
      const b = m.el.querySelector('#spin-go'); const info = m.el.querySelector('#spin-info');
      if (spinFree()) { b.innerHTML = 'Spin FREE'; b.disabled = false; info.textContent = 'One free spin every day!'; }
      else if (spinAdsLeft() > 0) { b.innerHTML = `${ico('ad')} Spin again`; b.disabled = false; info.textContent = `${spinAdsLeft()} bonus spins left today`; }
      else { b.innerHTML = 'Come back tomorrow'; b.disabled = true; info.textContent = 'New spins tomorrow!'; }
    }
    async function go() {
      if (spinning) return;
      const sp = S().spin, t = BS.Save.today();
      if (sp.day !== t) { sp.day = t; sp.freeUsed = false; sp.adSpins = 0; }
      if (!sp.freeUsed) sp.freeUsed = true;
      else if (sp.adSpins < E.adSpinsPerDay) { if (!(await BS.Ads.showRewarded('spin'))) return; sp.adSpins++; }
      else return;
      BS.Save.save();
      spinning = true;
      const total = segs.reduce((a, s) => a + s.w, 0); let r = Math.random() * total, win = 0;
      for (let i = 0; i < segs.length; i++) { r -= segs[i].w; if (r <= 0) { win = i; break; } }
      const n = segs.length, start = angle;
      const target = Math.ceil(start / (Math.PI * 2)) * Math.PI * 2 + Math.PI * 2 * 5 - (win / n) * Math.PI * 2;
      const t0 = performance.now(), dur = 3800; let lastTick = -1;
      (function anim(now) {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        angle = start + (target - start) * e; draw();
        const tick = Math.floor((angle / (Math.PI * 2)) * n);
        if (tick !== lastTick) { lastTick = tick; sfx('spinTick'); }
        if (k < 1) requestAnimationFrame(anim);
        else {
          spinning = false;
          const seg = segs[win];
          grant({ petals: seg.petals, gems: seg.gems, booster: seg.booster, n: 1 });
          sfx('coin'); BS.Audio.haptic('success');
          UI.toast(`You won ${seg.booster ? '1 ' + BOOSTER_INFO[seg.booster][0] : seg.label + (seg.gems ? ' gems' : ' petals')}!`);
          refresh(); UI.renderHome();
        }
      })(t0);
    }
    draw(); refresh();
  };

  // ================= settings =================
  function settingsToggles() {
    const st = S().settings;
    return ['sfx', 'music', 'haptics'].map((k) => `<div class="toggle-row"><span>${{ sfx: 'Sound effects', music: 'Music', haptics: 'Vibration' }[k]}</span><button class="switch ${st[k] ? 'on' : ''}" data-set="${k}" aria-label="${k}"></button></div>`).join('');
  }
  function bindToggles(root) {
    root.querySelectorAll('[data-set]').forEach((b) => b.onclick = () => {
      const k = b.dataset.set; S().settings[k] = !S().settings[k]; BS.Save.save();
      b.classList.toggle('on', S().settings[k]); BS.Audio.Music.sync(); sfx('tap');
    });
  }
  UI.showSettings = function () {
    const m = UI.modal({
      title: 'Settings',
      html: settingsToggles() + `<div class="fine">Bloomstead v${CFG.VERSION}<br><a href="${CFG.PRIVACY_URL}" target="_blank" style="color:inherit">Privacy Policy</a> · <a href="mailto:${CFG.SUPPORT_EMAIL}" style="color:inherit">Support</a></div>`,
      buttons: [
        { label: 'Restore Purchases', cls: 'btn-blue', onClick: () => BS.Store.restore() },
        { label: 'Done', cls: 'btn-green', onClick: () => m.close() },
      ],
      close: true,
    });
    bindToggles(m.el);
  };

  // ================= primitives =================
  UI.modal = function ({ title, html = '', buttons = [], close = false, onClose }) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog">${close ? `<button class="x" aria-label="Close">${ico('close')}</button>` : ''}<h2>${title}</h2>${html}<div class="btns"></div></div>`;
    const box = bg.querySelector('.btns');
    let closed = false;
    const api = { el: bg, close: () => { if (closed) return; closed = true; bg.remove(); } };
    for (const b of buttons.filter(Boolean)) {
      const el = document.createElement('button');
      el.className = b.cls === 'link' ? 'link' : 'btn ' + b.cls;
      if (b.id) el.id = b.id;
      el.innerHTML = b.label;
      el.onclick = () => { sfx('tap'); b.onClick(); };
      box.appendChild(el);
    }
    if (close) bg.querySelector('.x').onclick = () => { sfx('tap'); api.close(); onClose && onClose(); };
    $('#modal-root').appendChild(bg);
    return api;
  };

  let toastT;
  UI.toast = function (msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
  };
  UI.showHint = function (html) { const h = $('#hint'); h.innerHTML = html; h.classList.remove('hidden'); };
  UI.hideHint = function () { $('#hint').classList.add('hidden'); };

  // Browser-only stand-ins for real ads / App Store sheets.
  UI.simulateAd = function (kind) {
    return new Promise((resolve) => {
      const secs = window.__BS_FAST_ADS ? 0.2 : kind === 'rewarded' ? 4 : 2;
      const el = document.createElement('div');
      el.className = 'fake-ad';
      el.innerHTML = `<div class="timer"></div>${kind === 'rewarded' ? '<button class="skip">✕ Close</button>' : ''}<div style="font-size:28px">Test Ad</div><div style="opacity:.6">(${kind} — simulated in browser)</div>`;
      $('#modal-root').appendChild(el);
      const t0 = Date.now();
      const iv = setInterval(() => {
        const left = Math.max(0, secs - (Date.now() - t0) / 1000);
        el.querySelector('.timer').textContent = left > 0 ? `${Math.ceil(left)}s` : 'Reward earned ✓';
        if (left <= 0) { clearInterval(iv); setTimeout(() => { el.remove(); resolve(true); }, window.__BS_FAST_ADS ? 50 : 500); }
      }, 100);
      const sk = el.querySelector('.skip');
      if (sk) sk.onclick = () => { clearInterval(iv); el.remove(); resolve(false); };
    });
  };
  UI.simulatePurchase = function (title, price) {
    return new Promise((resolve) => {
      if (window.__BS_AUTO_BUY) return resolve(true);
      const m = UI.modal({
        title: 'App Store (simulated)',
        html: `<p><b>${title}</b><br>${price}</p><p class="stat-line">On iPhone this is the real Apple payment sheet.</p>`,
        buttons: [
          { label: 'Buy', cls: 'btn-blue', onClick: () => { m.close(); resolve(true); } },
          { label: 'Cancel', cls: 'link', onClick: () => { m.close(); resolve(false); } },
        ],
      });
    });
  };

  BS.UI = UI;
})();
