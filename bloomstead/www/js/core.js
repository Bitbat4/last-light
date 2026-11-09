/* Bloomstead — pure game logic (no DOM). Unit-testable in Node. */
(function (root) {
  const N = 8;
  const COLORS = 5;

  // ---------- RNG ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Pieces ----------
  // family: [cells, weight, allowRotations]
  const FAMILIES = {
    mono:   [[[0, 0]], 4],
    dom:    [[[0, 0], [0, 1]], 7],
    tri:    [[[0, 0], [0, 1], [0, 2]], 8],
    corner: [[[0, 0], [1, 0], [1, 1]], 8],
    i4:     [[[0, 0], [0, 1], [0, 2], [0, 3]], 6],
    i5:     [[[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], 4],
    o2:     [[[0, 0], [0, 1], [1, 0], [1, 1]], 8],
    o3:     [[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], 3],
    r23:    [[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], 4],
    t:      [[[0, 0], [0, 1], [0, 2], [1, 1]], 6],
    s:      [[[0, 1], [0, 2], [1, 0], [1, 1]], 4],
    l4:     [[[0, 0], [1, 0], [2, 0], [2, 1]], 7],
    bigL:   [[[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], 4],
    diag2:  [[[0, 0], [1, 1]], 2],
    diag3:  [[[0, 0], [1, 1], [2, 2]], 1],
  };

  function normalize(cells) {
    let mr = Infinity, mc = Infinity;
    for (const [r, c] of cells) { mr = Math.min(mr, r); mc = Math.min(mc, c); }
    return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
  const key = (cells) => cells.map((p) => p.join(',')).join(';');

  const SHAPES = []; // {id, family, cells, w, h, weight}
  (function build() {
    for (const fam in FAMILIES) {
      const [base, weight] = FAMILIES[fam];
      const seen = new Set();
      const variants = [];
      let cur = base;
      for (let m = 0; m < 2; m++) {
        for (let r = 0; r < 4; r++) {
          const n = normalize(cur);
          const k = key(n);
          if (!seen.has(k)) { seen.add(k); variants.push(n); }
          cur = cur.map(([y, x]) => [x, -y]); // rotate 90
        }
        cur = base.map(([y, x]) => [y, -x]); // mirror
      }
      for (const v of variants) {
        const h = Math.max(...v.map((p) => p[0])) + 1;
        const w = Math.max(...v.map((p) => p[1])) + 1;
        SHAPES.push({ id: SHAPES.length, family: fam, cells: v, w, h, weight: weight / variants.length });
      }
    }
  })();
  const TOTAL_W = SHAPES.reduce((s, x) => s + x.weight, 0);

  function randomShape(rng, maxSize) {
    for (let guard = 0; guard < 50; guard++) {
      let t = rng() * TOTAL_W;
      for (const s of SHAPES) {
        t -= s.weight;
        if (t <= 0) {
          if (maxSize && s.cells.length > maxSize) break;
          return s;
        }
      }
    }
    return SHAPES[0];
  }

  // ---------- Board ----------
  // cell: null | { c: colorIdx, bud?: true, stone?: true }
  const newBoard = () => new Array(N * N).fill(null);
  const cloneBoard = (b) => b.map((x) => (x ? Object.assign({}, x) : null));

  function canPlace(board, shape, r0, c0) {
    for (const [r, c] of shape.cells) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || cc < 0 || rr >= N || cc >= N) return false;
      if (board[rr * N + cc]) return false;
    }
    return true;
  }

  function anyFit(board, shape) {
    for (let r = 0; r <= N - shape.h; r++)
      for (let c = 0; c <= N - shape.w; c++) if (canPlace(board, shape, r, c)) return true;
    return false;
  }

  // Which rows/cols would be full if shape placed at r0,c0 (assumes canPlace).
  function previewClears(board, shape, r0, c0) {
    const filled = new Set(shape.cells.map(([r, c]) => (r0 + r) * N + (c0 + c)));
    const rows = [], cols = [];
    for (let r = 0; r < N; r++) {
      let full = true;
      for (let c = 0; c < N; c++) if (!board[r * N + c] && !filled.has(r * N + c)) { full = false; break; }
      if (full) rows.push(r);
    }
    for (let c = 0; c < N; c++) {
      let full = true;
      for (let r = 0; r < N; r++) if (!board[r * N + c] && !filled.has(r * N + c)) { full = false; break; }
      if (full) cols.push(c);
    }
    return { rows, cols };
  }

  function fullLines(board) {
    const rows = [], cols = [];
    for (let r = 0; r < N; r++) { let f = true; for (let c = 0; c < N; c++) if (!board[r * N + c]) { f = false; break; } if (f) rows.push(r); }
    for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N; r++) if (!board[r * N + c]) { f = false; break; } if (f) cols.push(c); }
    return { rows, cols };
  }

  /**
   * Place a piece and resolve clears. Mutates board.
   * Returns { rows, cols, cleared:[{i,cell}], blooms, buds, lines }
   */
  function place(board, shape, color, r0, c0) {
    for (const [r, c] of shape.cells) board[(r0 + r) * N + (c0 + c)] = { c: color };
    const { rows, cols } = fullLines(board);
    const lineSets = [];
    for (const r of rows) lineSets.push(Array.from({ length: N }, (_, c) => r * N + c));
    for (const c of cols) lineSets.push(Array.from({ length: N }, (_, r) => r * N + c));
    let blooms = 0;
    for (const set of lineSets) {
      const first = board[set[0]];
      if (first && !first.stone && set.every((i) => board[i] && !board[i].stone && board[i].c === first.c)) blooms++;
    }
    const toClear = new Set();
    lineSets.forEach((s) => s.forEach((i) => toClear.add(i)));
    const cleared = [];
    let buds = 0;
    for (const i of toClear) {
      if (board[i].bud) buds++;
      cleared.push({ i, cell: board[i] });
      board[i] = null;
    }
    return { rows, cols, cleared, blooms, buds, lines: rows.length + cols.length };
  }

  function lineScore(lines, combo, blooms) {
    if (!lines) return 0;
    const base = (100 * lines * (lines + 1)) / 2; // 100, 300, 600, 1000...
    const mult = Math.min(Math.max(combo, 1), 10);
    return (base + blooms * 400) * mult;
  }

  const isEmpty = (b) => b.every((x) => !x);
  const fillRatio = (b) => b.filter(Boolean).length / (N * N);

  // Best line-clear count a shape could achieve anywhere.
  function bestClear(board, shape) {
    let best = -1;
    for (let r = 0; r <= N - shape.h; r++)
      for (let c = 0; c <= N - shape.w; c++)
        if (canPlace(board, shape, r, c)) {
          const p = previewClears(board, shape, r, c);
          best = Math.max(best, p.rows.length + p.cols.length);
        }
    return best; // -1 means doesn't fit
  }

  // Greedy check whether all pieces can be placed in some order.
  function greedyPlaceable(board, shapes) {
    const orders = shapes.length === 3
      ? [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
      : shapes.length === 2 ? [[0, 1], [1, 0]] : [[0]];
    for (const ord of orders) {
      const b = cloneBoard(board);
      let ok = true;
      for (const k of ord) {
        const s = shapes[k];
        let bestPos = null, bestVal = -1;
        for (let r = 0; r <= N - s.h; r++)
          for (let c = 0; c <= N - s.w; c++)
            if (canPlace(b, s, r, c)) {
              const p = previewClears(b, s, r, c);
              const v = (p.rows.length + p.cols.length) * 10 + (r === 0 || c === 0 ? 1 : 0);
              if (v > bestVal) { bestVal = v; bestPos = [r, c]; }
            }
        if (!bestPos) { ok = false; break; }
        place(b, s, 0, bestPos[0], bestPos[1]);
      }
      if (ok) return true;
    }
    return false;
  }

  /**
   * Generate 3 tray pieces. help in [0..1]: higher = friendlier sets.
   * Picks the best of several random candidate sets.
   */
  function generateSet(board, rng, help) {
    const tries = 1 + Math.round(help * 14);
    const fill = fillRatio(board);
    let best = null, bestScore = -Infinity;
    for (let t = 0; t < tries; t++) {
      const maxSize = fill > 0.55 && rng() < help ? 4 : 0;
      const shapes = [randomShape(rng, maxSize), randomShape(rng, maxSize), randomShape(rng, maxSize)];
      let fits = 0, clearPot = 0;
      for (const s of shapes) {
        const bc = bestClear(board, s);
        if (bc >= 0) fits++;
        clearPot += Math.max(0, bc);
      }
      const seq = greedyPlaceable(board, shapes);
      const score = (seq ? 100 : 0) + fits * 12 + clearPot * 18 * help + rng() * 25;
      if (score > bestScore) { bestScore = score; best = shapes; }
    }
    // colours: sometimes a matching set to make "Bloom" lines achievable
    const mono = rng() < 0.28;
    const base = Math.floor(rng() * COLORS);
    return best.map((s) => ({ shape: s, color: mono ? base : Math.floor(rng() * COLORS) }));
  }

  // ---------- Adventure levels ----------
  // Hand-made tutorial levels then procedural, symmetric layouts.
  const HAND_LEVELS = [
    // L1: one row nearly complete, 2 buds
    { rows: ['........', '........', '........', '........', '........', '........', 'AAAAA...', 'BBbBBb..'], tray: ['tri', 'tri', 'dom'] },
    { rows: ['........', '........', '........', 'C..CC..C', 'Cb.CC.bC', 'C..CC..C', '........', '........'], tray: ['o2', 'o2', 'dom'] },
    { rows: ['.......C', '.......C', '.......C', '.......b', 'AAb..bAC', '.......C', '.......C', '........'], tray: ['dom', 'mono', 'corner'] },
  ];

  function parseHand(def) {
    const b = newBoard();
    def.rows.forEach((row, r) => {
      for (let c = 0; c < N; c++) {
        const ch = row[c];
        if (ch === '.') continue;
        if (ch === 'b') { b[r * N + c] = { c: 0, bud: true }; continue; }
        if (ch === '#') { b[r * N + c] = { c: 5, stone: true }; continue; }
        b[r * N + c] = { c: (ch.charCodeAt(0) - 65) % COLORS };
      }
    });
    return b;
  }

  function hasFullLine(b) { const f = fullLines(b); return f.rows.length + f.cols.length > 0; }

  // Quick bot used to auto-tune generated levels (deterministic via rng).
  function botWins(L, rng, maxMoves = 120) {
    let b = cloneBoard(L.board), buds = 0, moves = 0;
    let tray = generateSet(b, rng, L.help);
    while (moves < maxMoves) {
      let best = null;
      for (let idx = 0; idx < 3; idx++) {
        const p = tray[idx]; if (!p) continue;
        for (let r = 0; r <= N - p.shape.h; r++) for (let c = 0; c <= N - p.shape.w; c++) {
          if (!canPlace(b, p.shape, r, c)) continue;
          const pv = previewClears(b, p.shape, r, c);
          const v = (pv.rows.length + pv.cols.length) * 100 + (r + c) * 0.1 + rng();
          if (!best || v > best.v) best = { v, idx, r, c };
        }
      }
      if (!best) return false;
      const p = tray[best.idx];
      buds += place(b, p.shape, p.color, best.r, best.c).buds; moves++;
      tray[best.idx] = null;
      if (buds >= L.budsTotal) return true;
      if (!tray[0] && !tray[1] && !tray[2]) tray = generateSet(b, rng, L.help);
    }
    return false;
  }

  const isHard = (level) => level >= 10 && level % 10 === 0;
  // Target bot win-rate: gentle start, slow ramp, "Hard Levels" every 10th.
  function targetWin(level) {
    if (isHard(level)) return 0.4;
    if (level <= 10) return 0.95;
    return Math.max(0.55, 0.9 - (level - 10) * 0.006);
  }

  function layoutCandidate(level, rng) {
    const diff = Math.min(1, (level - 3) / 60); // 0..1
    for (let attempt = 0; attempt < 40; attempt++) {
      const b = newBoard();
      const density = (level <= 10 ? 0.14 : 0.2) + diff * 0.22 + rng() * 0.06 + (isHard(level) ? 0.12 : 0);
      const sym = rng() < 0.5 ? 'h' : rng() < 0.5 ? 'v' : 'both';
      const palette = [Math.floor(rng() * COLORS), Math.floor(rng() * COLORS)];
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N / 2; c++) {
          if (rng() < density) {
            const cell = { c: palette[(r + c) % 2 === 0 || rng() < 0.3 ? 0 : 1] };
            const set = (rr, cc) => { b[rr * N + cc] = Object.assign({}, cell); };
            set(r, c);
            if (sym !== 'v') set(r, N - 1 - c);
            if (sym === 'v' || sym === 'both') { set(N - 1 - r, c); if (sym === 'both') set(N - 1 - r, N - 1 - c); }
          }
        }
      if (hasFullLine(b)) continue;
      if (level >= 8) {
        const stones = Math.floor(diff * 6) + (rng() < 0.5 ? 1 : 0);
        for (let k = 0; k < stones; k++) {
          const i = Math.floor(rng() * N * N);
          if (b[i]) { b[i].stone = true; b[i].c = 5; }
        }
      }
      const filled = b.map((x, i) => (x && !x.stone ? i : -1)).filter((i) => i >= 0);
      const budCount = Math.min(filled.length, (level <= 10 ? 2 : 3) + Math.floor(level / 4) + Math.floor(rng() * 2) + (isHard(level) ? 3 : 0), 18);
      for (let k = 0; k < budCount; k++) {
        const j = Math.floor(rng() * filled.length);
        const i = filled.splice(j, 1)[0];
        if (i === undefined) break;
        b[i].bud = true;
      }
      const budsTotal = b.filter((x) => x && x.bud).length;
      if (budsTotal < 2) continue;
      return { board: b, budsTotal, firstTray: null, help: isHard(level) ? 0.45 : level <= 10 ? 1 : Math.max(0.35, 0.95 - diff * 0.6), hard: isHard(level) };
    }
    return null;
  }

  const levelCache = new Map();
  function makeLevel(level, opts = {}) {
    const hit = levelCache.get(level);
    const copy = (x) => Object.assign({}, x, { board: cloneBoard(x.board), firstTray: x.firstTray ? x.firstTray.slice() : null });
    if (hit) return copy(hit);
    const L = buildLevel(level, opts);
    levelCache.set(level, copy(L));
    if (levelCache.size > 6) levelCache.delete(levelCache.keys().next().value);
    return copy(L);
  }

  function buildLevel(level, opts) {
    if (level <= HAND_LEVELS.length) {
      const def = HAND_LEVELS[level - 1];
      const board = parseHand(def);
      const tray = def.tray ? def.tray.map((f, i) => ({ shape: SHAPES.find((s) => s.family === f), color: (i + 1) % COLORS })) : null;
      return { board, budsTotal: board.filter((x) => x && x.bud).length, firstTray: tray, help: 1, hard: false };
    }
    const rng = mulberry32(level * 7919 + 13);
    const target = targetWin(level);
    const cands = opts.candidates || (isHard(level) ? 6 : 4), sims = opts.sims || 6;
    let best = null, bestErr = Infinity;
    for (let k = 0; k < cands; k++) {
      const L = layoutCandidate(level, rng);
      if (!L) continue;
      let w = 0;
      for (let s = 0; s < sims; s++) if (botWins(L, mulberry32(level * 131 + k * 17 + s))) w++;
      L.botRate = w / sims;
      const err = Math.abs(L.botRate - target);
      if (err < bestErr) { bestErr = err; best = L; }
      if (err <= 0.1) break;
    }
    return best || buildLevel(1, opts);
  }

  function classicHelp(score) {
    // friendly early, tougher later — but never brutal
    return Math.max(0.3, 1 - score / 60000);
  }

  const api = {
    N, COLORS, SHAPES, mulberry32, newBoard, cloneBoard, canPlace, anyFit, previewClears, place,
    lineScore, isEmpty, isHard, botWins, fillRatio, bestClear, greedyPlaceable, generateSet, makeLevel, classicHelp, randomShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.BS = root.BS || {}; root.BS.Core = api; }
})(typeof window !== 'undefined' ? window : globalThis);
