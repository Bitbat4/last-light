/* Bloomstead — gameplay controller, renderer and input. */
(function () {
  const C = BS.Core, A = BS.Art, N = C.N;
  const E = () => BS.CONFIG.ECONOMY;

  const G = {
    canvas: null, ctx: null, w: 0, h: 0,
    board: null, tray: [null, null, null], trayAnim: [1, 1, 1],
    mode: 'classic', level: 1, score: 0, shownScore: 0, combo: 0, sinceClear: 0,
    buds: 0, budsTotal: 0, petals: 0, lines: 0, blooms: 0, bestCombo: 0,
    rng: Math.random, help: 1, undo: null, revives: 0, adRevive: false, adBooster: {},
    state: 'idle', targeting: null, drag: null, ghost: null,
    anims: [], particles: [], texts: [], shake: 0, t: 0, last: 0,
    L: {}, // layout
    placedFlash: [],
  };

  // ---------------- setup ----------------
  G.init = function () {
    G.canvas = document.getElementById('game-canvas');
    G.ctx = G.canvas.getContext('2d');
    const c = G.canvas;
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onCancel);
    window.addEventListener('resize', G.resize);
    G.resize();
    requestAnimationFrame(loop);
  };

  G.resize = function (inner) {
    const c = G.canvas; if (!c) return;
    if (!inner) { c.style.flex = ''; c.style.height = ''; c.parentElement.style.justifyContent = ''; }
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    const d = Math.min(window.devicePixelRatio || 1, 3);
    G.w = r.width; G.h = r.height;
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
    G.ctx.setTransform(d, 0, 0, d, 0, 0);
    const pad = 14;
    const trayH = Math.min(G.h * 0.28, 170);
    const bs = Math.min(G.w - pad * 2, G.h - trayH - pad * 2, 560);
    const cell = Math.floor(bs / N);
    const size = cell * N;
    const wantTray = Math.max(96, Math.min(cell * 3.4, G.h - size - 24));
    const block = size + 12 + wantTray;
    G.L = {
      cell, size,
      bx: Math.round((G.w - size) / 2), by: Math.round(Math.max(pad + 4, (G.h - block) * 0.4)),
    };
    G.L.trayY = G.L.by + size + 12;
    G.L.trayH = Math.max(80, Math.min(wantTray, G.h - G.L.trayY - 6));
    G.L.slotW = Math.min(G.w / 3, size / 2.4);
    G.L.trayX = G.w / 2 - G.L.slotW * 1.5;
    G.L.mini = Math.min(cell * 0.62, (G.L.trayH - 16) / 4);
    // Tall phones: shrink the canvas to its content and centre the whole column (no dead gap).
    const spare = G.h - (G.L.trayY + G.L.trayH + 6);
    if (!inner && spare > 30) {
      c.style.flex = 'none'; c.style.height = Math.round(G.h - spare) + 'px';
      c.parentElement.style.justifyContent = 'center';
      G.resize(true);
    }
  };

  // ---------------- game lifecycle ----------------
  G.start = function (mode, level, resume) {
    G.hard = false;
    G.mode = mode; G.level = level || 1;
    G.score = 0; G.shownScore = 0; G.combo = 0; G.sinceClear = 0; G.buds = 0; G.petals = 0; G.lines = 0; G.blooms = 0; G.bestCombo = 0;
    G.undo = null; G.revives = 0; G.adRevive = false; G.adBooster = {}; G.targeting = null; G.drag = null; G.ghost = null;
    G.anims = []; G.particles = []; G.texts = []; G.placedFlash = [];
    G.rng = C.mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    let firstTray = null;
    if (mode === 'level') {
      const L = C.makeLevel(G.level);
      G.board = L.board; G.budsTotal = L.budsTotal; G.help = L.help; firstTray = L.firstTray; G.hard = L.hard;
      if (L.hard) setTimeout(() => BS.UI.toast('Hard Level — bigger rewards!'), 300);
    } else if (resume) {
      Object.assign(G, { board: resume.board, score: resume.score, shownScore: resume.score, combo: resume.combo, sinceClear: resume.sinceClear || 0, petals: resume.petals || 0, lines: resume.lines || 0, blooms: resume.blooms || 0, revives: resume.revives || 0 });
      G.budsTotal = 0;
      firstTray = resume.tray.map((p) => (p ? { shape: C.SHAPES[p.s], color: p.c } : null));
    } else {
      G.board = C.newBoard(); G.budsTotal = 0;
    }
    G.state = 'play';
    G.resize();
    if (firstTray) { G.tray = firstTray; G.trayAnim = [0, 0, 0]; } else refill();
    if (G.tray.every((p) => !p)) refill();
    BS.UI.updateHud(true);
    G.saveRun();
    if (mode === 'level' && G.level === 1 && !BS.Save.state.tutorialDone) BS.UI.showHint('Drag a block onto the board.<br>Fill a row to clear it and free the <b>bud</b>!');
  };

  function helpNow() { return G.mode === 'level' ? G.help : C.classicHelp(G.score); }

  function refill() {
    const set = C.generateSet(G.board, G.rng, helpNow());
    G.tray = set;
    G.trayAnim = [0, 0, 0];
  }

  G.saveRun = function () {
    const s = BS.Save.state;
    if (G.mode !== 'classic' || G.state !== 'play') { if (G.mode === 'classic') { s.classicRun = null; BS.Save.save(); } return; }
    s.classicRun = {
      board: G.board, score: G.score, combo: G.combo, sinceClear: G.sinceClear, petals: G.petals, lines: G.lines, blooms: G.blooms, revives: G.revives,
      tray: G.tray.map((p) => (p ? { s: p.shape.id, c: p.color } : null)),
    };
    BS.Save.save();
  };

  // ---------------- placement ----------------
  function snapshot() {
    return { board: C.cloneBoard(G.board), tray: G.tray.slice(), score: G.score, combo: G.combo, sinceClear: G.sinceClear, buds: G.buds, petals: G.petals, lines: G.lines, blooms: G.blooms };
  }

  function placePiece(idx, r, c) {
    const p = G.tray[idx];
    G.undo = snapshot();
    const res = C.place(G.board, p.shape, p.color, r, c);
    G.tray[idx] = null;
    const L = G.L;
    // placement flash
    for (const [dr, dc] of p.shape.cells) G.placedFlash.push({ i: (r + dr) * N + (c + dc), t: 0 });
    let gained = p.shape.cells.length * 10;
    BS.Audio.SFX.drop();
    BS.Audio.haptic('light');

    if (res.lines) {
      G.combo++; G.sinceClear = 0;
      G.bestCombo = Math.max(G.bestCombo, G.combo);
      const ls = C.lineScore(res.lines, G.combo, res.blooms);
      gained += ls;
      G.lines += res.lines; G.blooms += res.blooms;
      G.petals += res.lines * E().petalsPerLine + res.blooms * E().petalsPerBloom;
      const st = BS.Save.state.stats; st.lines += res.lines; st.blooms += res.blooms; st.bestCombo = Math.max(st.bestCombo, G.combo);
      // cleared cell effects
      res.cleared.forEach(({ i, cell }, k) => {
        const cr = Math.floor(i / N), cc = i % N;
        const x = L.bx + cc * L.cell, y = L.by + cr * L.cell;
        G.anims.push({ type: 'pop', x, y, color: cell.bud ? 6 : cell.c, t: -k * 0.012, dur: 0.32 });
        burst(x + L.cell / 2, y + L.cell / 2, A.PALETTE[cell.bud ? 0 : cell.c].base, 4);
        if (cell.bud) {
          G.anims.push({ type: 'budfly', x: x + L.cell / 2, y: y + L.cell / 2, t: 0, dur: 0.7 });
          burst(x + L.cell / 2, y + L.cell / 2, '#ff8fb8', 10, true);
        }
      });
      const cx = L.bx + (c + p.shape.w / 2) * L.cell, cy = L.by + (r + p.shape.h / 2) * L.cell;
      const praise = ['', 'Nice!', 'Great!', 'Amazing!', 'Spectacular!', 'Legendary!', 'Legendary!'][Math.min(res.lines, 6)];
      floatText(praise, cx, cy - 10, res.lines >= 3 ? 34 : 28, '#ffffff', '#ff6b8f');
      floatText('+' + ls, cx, cy + 22, 22, '#fff7c2', '#c26a00', 0.1);
      if (G.combo >= 2) { floatText('Combo ×' + G.combo, L.bx + L.size / 2, L.by + L.cell * 0.9, 26, '#ffffff', '#7a52c7', 0.05); BS.Audio.SFX.combo(G.combo); }
      if (res.blooms) {
        floatText(res.blooms > 1 ? `Full Bloom ×${res.blooms}!` : 'Full Bloom!', L.bx + L.size / 2, L.by + L.size / 2, 38, '#fff6b0', '#d4508a', 0.15);
        for (let k = 0; k < 40; k++) burst(L.bx + Math.random() * L.size, L.by + Math.random() * L.size, ['#ffd23f', '#ff8fb8', '#fff'][k % 3], 1, true);
        BS.Audio.SFX.bloom(); BS.Audio.haptic('success');
      }
      BS.Audio.SFX.clear(res.lines, G.combo);
      BS.Audio.haptic(res.lines >= 2 ? 'heavy' : 'medium');
      if (res.lines >= 3) G.shake = 0.35;
      if (C.isEmpty(G.board)) {
        gained += 3000; G.petals += 15;
        floatText('Clean Sweep! +3000', L.bx + L.size / 2, L.by + L.size * 0.7, 30, '#ffffff', '#1f9a6d', 0.3);
        BS.Audio.SFX.sweep();
      }
      if (res.buds) { G.buds += res.buds; setTimeout(() => BS.Audio.SFX.bud(), 350); }
    } else {
      G.sinceClear++;
      if (G.sinceClear >= 3 && G.combo) { G.combo = 0; }
    }
    G.score += gained;

    if (G.tray.every((x) => !x)) refill();
    BS.UI.updateHud();
    if (BS.Save.state.tutorialDone === false && G.mode === 'level') { BS.UI.hideHint(); }

    if (G.mode === 'level' && G.buds >= G.budsTotal) {
      G.state = 'won';
      G.saveRun();
      setTimeout(() => winLevel(), 750);
      return;
    }
    checkOver();
    G.saveRun();
  }

  function checkOver() {
    if (G.state !== 'play') return;
    const any = G.tray.some((p) => p && C.anyFit(G.board, p.shape));
    if (!any) {
      G.state = 'stuck';
      BS.Audio.haptic('error');
      setTimeout(() => BS.UI.showRevive(G), 600);
    }
  }

  function winLevel() {
    BS.Audio.SFX.win(); BS.Audio.haptic('success');
    const s = BS.Save.state;
    s.tutorialDone = true;
    s.stats.levelsWon++;
    s.gamesPlayed++;
    const lvl = G.level;
    s.level = Math.max(s.level, lvl + 1);
    BS.Save.save();
    for (let k = 0; k < 60; k++) burst(G.w / 2 + (Math.random() - 0.5) * G.w, G.h * 0.3, ['#ffd23f', '#ff8fb8', '#a6f2d2', '#b0dbff'][k % 4], 1, true);
    BS.UI.showLevelWin({ level: lvl, petals: E().levelPetals(lvl) + G.petals, gems: E().levelGems(lvl) });
    setTimeout(() => C.makeLevel(lvl + 1), 400); // pre-generate while the player reads the win screen
  }

  G.endRun = function () {
    // called when player declines revive
    const s = BS.Save.state;
    G.state = 'over';
    s.gamesPlayed++;
    BS.Audio.SFX.gameover();
    if (G.mode === 'classic') {
      const newBest = G.score > s.best;
      if (newBest) s.best = G.score;
      s.classicRun = null; BS.Save.save();
      const petals = G.petals + Math.floor(G.score / E().scorePerEndPetal);
      BS.UI.showResults({ score: G.score, best: s.best, newBest, petals, lines: G.lines, blooms: G.blooms });
    } else {
      BS.Save.save();
      BS.UI.showLevelFail({ level: G.level, buds: G.buds, total: G.budsTotal, petals: G.petals });
    }
  };

  // revive: clear the 2 fullest rows + 2 fullest columns, fresh friendly tray
  G.revive = function () {
    G.revives++;
    const rows = [...Array(N).keys()].map((r) => [r, [...Array(N).keys()].filter((c) => G.board[r * N + c]).length]).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
    const cols = [...Array(N).keys()].map((c) => [c, [...Array(N).keys()].filter((r) => G.board[r * N + c]).length]).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
    const kill = new Set();
    rows.forEach((r) => { for (let c = 0; c < N; c++) kill.add(r * N + c); });
    cols.forEach((c) => { for (let r = 0; r < N; r++) kill.add(r * N + c); });
    kill.forEach((i) => {
      const cell = G.board[i]; if (!cell) return;
      if (cell.bud) { G.buds++; }
      const x = G.L.bx + (i % N) * G.L.cell, y = G.L.by + Math.floor(i / N) * G.L.cell;
      G.anims.push({ type: 'pop', x, y, color: cell.bud ? 6 : cell.c, t: 0, dur: 0.35 });
      burst(x + G.L.cell / 2, y + G.L.cell / 2, '#fff', 3, true);
      G.board[i] = null;
    });
    G.tray = C.generateSet(G.board, G.rng, 1); G.trayAnim = [0, 0, 0];
    G.undo = null; G.state = 'play';
    BS.Audio.SFX.unlock();
    BS.UI.updateHud();
    if (G.mode === 'level' && G.buds >= G.budsTotal) { G.state = 'won'; setTimeout(winLevel, 600); return; }
    checkOver();
    G.saveRun();
  };

  // ---------------- boosters ----------------
  G.canUndo = () => !!G.undo && G.state === 'play';
  G.applyBooster = function (type) {
    if (G.state !== 'play') return false;
    if (type === 'undo') {
      if (!G.undo) { BS.UI.toast('Nothing to undo yet'); return false; }
      Object.assign(G, G.undo); G.undo = null; G.trayAnim = [1, 1, 1];
      BS.Audio.SFX.whoosh(); BS.UI.updateHud(); G.saveRun();
      return true;
    }
    if (type === 'reroll') {
      const set = C.generateSet(G.board, G.rng, 1);
      G.tray = G.tray.map((p, i) => (p ? set[i] : null));
      if (G.tray.every((x) => !x)) refill();
      G.trayAnim = [0, 0, 0]; G.undo = null;
      BS.Audio.SFX.whoosh(); G.saveRun();
      return true;
    }
    if (type === 'trowel') {
      G.targeting = 'trowel';
      BS.UI.showHint('Tap the board to dig out a 3×3 patch', true);
      return 'pending';
    }
    return false;
  };

  function digAt(r, c) {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
      const i = rr * N + cc, cell = G.board[i];
      if (!cell) continue;
      n++;
      if (cell.bud) { G.buds++; G.anims.push({ type: 'budfly', x: G.L.bx + (cc + 0.5) * G.L.cell, y: G.L.by + (rr + 0.5) * G.L.cell, t: 0, dur: 0.7 }); }
      G.anims.push({ type: 'pop', x: G.L.bx + cc * G.L.cell, y: G.L.by + rr * G.L.cell, color: cell.bud ? 6 : cell.c, t: 0, dur: 0.3 });
      burst(G.L.bx + (cc + 0.5) * G.L.cell, G.L.by + (rr + 0.5) * G.L.cell, '#8a5a3b', 5);
      G.board[i] = null;
    }
    return n;
  }

  // ---------------- input ----------------
  function pos(e) { const r = G.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function slotAt(x, y) {
    const L = G.L;
    if (y < L.trayY - 10 || y > L.trayY + L.trayH + 10) return -1;
    const i = Math.floor((x - L.trayX) / L.slotW);
    return i >= 0 && i < 3 ? i : -1;
  }
  function slotCenter(i) { const L = G.L; return { x: L.trayX + L.slotW * (i + 0.5), y: L.trayY + L.trayH / 2 }; }

  function onDown(e) {
    if (G.state !== 'play') return;
    const p = pos(e);
    if (G.targeting === 'trowel') {
      const c = Math.floor((p.x - G.L.bx) / G.L.cell), r = Math.floor((p.y - G.L.by) / G.L.cell);
      if (r >= 0 && c >= 0 && r < N && c < N) {
        G.undo = null;
        const n = digAt(r, c);
        G.targeting = null; BS.UI.hideHint();
        if (n) { BS.Audio.SFX.drop(); BS.Audio.haptic('medium'); }
        BS.UI.boosterConsumed('trowel');
        BS.UI.updateHud();
        if (G.mode === 'level' && G.buds >= G.budsTotal) { G.state = 'won'; setTimeout(winLevel, 600); return; }
        G.saveRun();
      }
      return;
    }
    const i = slotAt(p.x, p.y);
    if (i < 0 || !G.tray[i]) return;
    G.canvas.setPointerCapture(e.pointerId);
    const touch = e.pointerType !== 'mouse';
    const sh = G.tray[i].shape;
    G.drag = { idx: i, x: p.x, y: p.y, lift: (touch ? G.L.cell * 1.3 : G.L.cell * 0.4) + sh.h * G.L.cell / 2, scale: 0.55, id: e.pointerId };
    BS.Audio.SFX.pick();
    BS.Audio.haptic('light');
    updateGhost();
  }
  function onMove(e) {
    if (!G.drag || e.pointerId !== G.drag.id) return;
    const p = pos(e); G.drag.x = p.x; G.drag.y = p.y;
    updateGhost();
  }
  function onUp(e) {
    if (!G.drag || e.pointerId !== G.drag.id) return;
    const d = G.drag; G.drag = null;
    if (G.ghost && G.state === 'play') {
      const g = G.ghost; G.ghost = null;
      placePiece(d.idx, g.r, g.c);
    } else {
      G.ghost = null;
      if (G.state === 'play') {
        const sc = slotCenter(d.idx);
        G.anims.push({ type: 'return', idx: d.idx, fx: d.x, fy: d.y - d.lift, tx: sc.x, ty: sc.y, t: 0, dur: 0.18 });
        if (d.y < G.L.trayY - 10) { BS.Audio.SFX.invalid(); }
      }
    }
  }
  function onCancel() { G.drag = null; G.ghost = null; }

  function dragTopLeft() {
    const d = G.drag, sh = G.tray[d.idx].shape, L = G.L;
    const x = d.x - (sh.w * L.cell) / 2, y = d.y - d.lift - (sh.h * L.cell) / 2;
    return { x, y };
  }
  function updateGhost() {
    const d = G.drag; if (!d) return;
    const p = G.tray[d.idx]; const L = G.L;
    const tl = dragTopLeft();
    const fc = (tl.x - L.bx) / L.cell, fr = (tl.y - L.by) / L.cell;
    let best = null, bd = 0.75; // snap radius in cells
    for (const r of [Math.floor(fr), Math.ceil(fr)]) for (const c of [Math.floor(fc), Math.ceil(fc)]) {
      const dist = Math.hypot(r - fr, c - fc);
      if (dist < bd && C.canPlace(G.board, p.shape, r, c)) { bd = dist; best = { r, c }; }
    }
    const prev = G.ghost;
    if (best) {
      best.clear = C.previewClears(G.board, p.shape, best.r, best.c);
      G.ghost = best;
      if (!prev || prev.r !== best.r || prev.c !== best.c) { if (best.clear.rows.length + best.clear.cols.length) BS.Audio.haptic('light'); }
    } else G.ghost = null;
  }

  // ---------------- effects ----------------
  function burst(x, y, color, n, sparkle) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 220;
      G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, size: sparkle ? 3 + Math.random() * 4 : 4 + Math.random() * 5, color, life: 0.8 + Math.random() * 0.6, age: 0, sparkle });
    }
    if (G.particles.length > 500) G.particles.splice(0, G.particles.length - 500);
  }
  function floatText(text, x, y, size, fill, stroke, delay = 0) {
    if (text.startsWith('Combo')) G.texts = G.texts.filter((t) => !t.text.startsWith('Combo'));
    G.texts.push({ text, x, y, size, fill, stroke, t: -delay, dur: 1.1 });
  }

  // ---------------- render loop ----------------
  function loop(ts) {
    const dt = Math.min(0.05, (ts - (G.last || ts)) / 1000);
    G.last = ts; G.t += dt;
    if (BS.UI.currentScreen === 'game' && G.board) { update(dt); draw(); }
    requestAnimationFrame(loop);
  }

  function update(dt) {
    for (let i = 0; i < 3; i++) G.trayAnim[i] = Math.min(1, G.trayAnim[i] + dt * 4.5);
    G.anims = G.anims.filter((a) => (a.t += dt) < a.dur);
    G.texts = G.texts.filter((a) => (a.t += dt) < a.dur);
    G.placedFlash = G.placedFlash.filter((a) => (a.t += dt) < 0.25);
    for (const p of G.particles) { p.age += dt; p.vy += 520 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    G.particles = G.particles.filter((p) => p.age < p.life);
    G.shake = Math.max(0, G.shake - dt);
    // score count-up
    if (G.shownScore !== G.score) {
      G.shownScore += Math.max(1, Math.ceil((G.score - G.shownScore) * Math.min(1, dt * 10)));
      if (G.shownScore > G.score) G.shownScore = G.score;
      BS.UI.setScore(G.shownScore);
    }
  }

  const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  function draw() {
    const ctx = G.ctx, L = G.L;
    ctx.clearRect(0, 0, G.w, G.h);
    ctx.save();
    if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * G.shake, (Math.random() - 0.5) * 10 * G.shake);

    // board frame (wooden planter) + soil
    const fr = 10;
    ctx.fillStyle = 'rgba(60,40,30,0.25)'; A.rr(ctx, L.bx - fr, L.by - fr + 6, L.size + fr * 2, L.size + fr * 2, 22); ctx.fill();
    const wg = ctx.createLinearGradient(0, L.by - fr, 0, L.by + L.size + fr);
    wg.addColorStop(0, '#c98d5c'); wg.addColorStop(1, '#9c6640');
    ctx.fillStyle = wg; A.rr(ctx, L.bx - fr, L.by - fr, L.size + fr * 2, L.size + fr * 2, 22); ctx.fill();
    ctx.fillStyle = '#3d6b55'; A.rr(ctx, L.bx - 3, L.by - 3, L.size + 6, L.size + 6, 14); ctx.fill();

    const clearSet = new Set();
    if (G.ghost) {
      G.ghost.clear.rows.forEach((r) => { for (let c = 0; c < N; c++) clearSet.add(r * N + c); });
      G.ghost.clear.cols.forEach((c) => { for (let r = 0; r < N; r++) clearSet.add(r * N + c); });
    }
    const dragColor = G.drag ? G.tray[G.drag.idx].color : 0;

    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c, x = L.bx + c * L.cell, y = L.by + r * L.cell;
      ctx.fillStyle = (r + c) % 2 ? '#467a62' : '#4a8068';
      A.rr(ctx, x + 2, y + 2, L.cell - 4, L.cell - 4, L.cell * 0.18); ctx.fill();
      const cell = G.board[i];
      if (cell) {
        const fl = G.placedFlash.find((f) => f.i === i);
        let s = L.cell, off = 0;
        if (fl) { const k = fl.t / 0.25; s = L.cell * (1.12 - 0.12 * k); off = (L.cell - s) / 2; }
        const col = clearSet.has(i) && !cell.stone ? dragColor : cell.bud ? 6 : cell.c;
        A.drawTile(ctx, col, x + off, y + off, s);
        if (cell.bud) A.drawBud(ctx, x, y, L.cell, G.t);
        if (clearSet.has(i)) { ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(G.t * 12)})`; A.rr(ctx, x + 3, y + 3, L.cell - 6, L.cell - 6, L.cell * 0.2); ctx.fill(); }
      }
    }

    // ghost
    if (G.ghost && G.drag) {
      const p = G.tray[G.drag.idx];
      for (const [dr, dc] of p.shape.cells) {
        const i = (G.ghost.r + dr) * N + (G.ghost.c + dc);
        A.drawTile(ctx, p.color, L.bx + (G.ghost.c + dc) * L.cell, L.by + (G.ghost.r + dr) * L.cell, L.cell, clearSet.has(i) ? 0.85 : 0.42);
      }
    }

    // trowel targeting overlay
    if (G.targeting) {
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(G.t * 6)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      A.rr(ctx, L.bx - 4, L.by - 4, L.size + 8, L.size + 8, 14); ctx.stroke(); ctx.setLineDash([]);
    }

    // pops
    for (const a of G.anims) {
      if (a.type === 'pop' && a.t > 0) {
        const k = a.t / a.dur, s = L.cell * (1 + k * 0.35) * (1 - k * 0.9);
        A.drawTile(ctx, a.color, a.x + (L.cell - s) / 2, a.y + (L.cell - s) / 2, s, 1 - k);
      }
    }

    // tray
    for (let i = 0; i < 3; i++) {
      const p = G.tray[i]; if (!p) continue;
      if (G.drag && G.drag.idx === i) continue;
      if (G.anims.some((a) => a.type === 'return' && a.idx === i)) continue;
      const sc = slotCenter(i); const k = easeOutBack(G.trayAnim[i]);
      const m = miniFor(p.shape) * k;
      const fits = C.anyFit(G.board, p.shape);
      drawPiece(ctx, p, sc.x - (p.shape.w * m) / 2, sc.y - (p.shape.h * m) / 2, m, fits ? 1 : 0.9, fits ? '' : 'gray');
    }
    for (const a of G.anims) if (a.type === 'return') {
      const p = G.tray[a.idx]; if (!p) continue;
      const k = a.t / a.dur, x = a.fx + (a.tx - a.fx) * k, y = a.fy + (a.ty - a.fy) * k;
      const s = L.cell + (miniFor(p.shape) - L.cell) * k;
      drawPiece(ctx, p, x - (p.shape.w * s) / 2, y - (p.shape.h * s) / 2, s, 1);
    }
    // dragged piece
    if (G.drag) {
      const p = G.tray[G.drag.idx], tl = dragTopLeft();
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 10;
      drawPiece(ctx, p, tl.x, tl.y, L.cell, 1);
      ctx.restore();
    }

    // particles
    for (const p of G.particles) {
      const a = 1 - p.age / p.life;
      if (p.sparkle) { ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      else A.drawPetal(ctx, p.x, p.y, p.size, p.rot, p.color, a);
    }
    // bud flying to the top (goal counter)
    for (const a of G.anims) if (a.type === 'budfly') {
      const k = a.t / a.dur, e = k * k;
      const tx = G.w / 2, ty = -20;
      const x = a.x + (tx - a.x) * e, y = a.y + (ty - a.y) * e - Math.sin(k * Math.PI) * 40;
      A.drawBud(ctx, x - L.cell * 0.4, y - L.cell * 0.4, L.cell * 0.8, 0);
    }
    // floating texts
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const tx of G.texts) {
      if (tx.t < 0) continue;
      const k = tx.t / tx.dur;
      const sc = k < 0.15 ? easeOutBack(k / 0.15) : 1;
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.font = `900 ${tx.size * sc}px ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif`;
      const y = tx.y - k * 40;
      ctx.lineWidth = tx.size * 0.22; ctx.strokeStyle = tx.stroke; ctx.lineJoin = 'round';
      ctx.strokeText(tx.text, tx.x, y); ctx.fillStyle = tx.fill; ctx.fillText(tx.text, tx.x, y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function miniFor(sh) { const L = G.L; return Math.min(L.mini, (L.slotW - 10) / sh.w); }

  function drawPiece(ctx, p, x, y, s, alpha, variant) {
    for (const [r, c] of p.shape.cells) A.drawTile(ctx, p.color, x + c * s, y + r * s, s, alpha, variant);
  }

  // test/debug hooks
  G._placeForTest = placePiece;
  BS.Game = G;
})();
