// Run: node tests/core.test.js
const C = require('../www/js/core.js');
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.error('FAIL', msg); } else console.log('ok  ', msg); };

ok(C.SHAPES.length > 40, `shape variants built (${C.SHAPES.length})`);
ok(C.SHAPES.every(s => s.cells.every(([r, c]) => r >= 0 && c >= 0 && r < s.h && c < s.w)), 'shapes normalized');

// line clear + bloom
let b = C.newBoard();
for (let c = 0; c < 6; c++) b[c] = { c: 2 };
const dom = C.SHAPES.find(s => s.family === 'dom' && s.w === 2);
ok(C.canPlace(b, dom, 0, 6), 'domino fits end of row');
ok(!C.canPlace(b, dom, 0, 7), 'domino out of bounds rejected');
let pv = C.previewClears(b, dom, 0, 6);
ok(pv.rows.length === 1 && pv.rows[0] === 0, 'preview shows row clear');
let res = C.place(b, dom, 2, 0, 6);
ok(res.lines === 1 && res.blooms === 1, 'same-colour row = bloom');
ok(C.isEmpty(b), 'board empty after clear');

// cross clear (row + col)
b = C.newBoard();
for (let i = 1; i < 8; i++) { b[i] = { c: 0 }; b[i * 8] = { c: 1 }; }
const mono = C.SHAPES.find(s => s.family === 'mono');
res = C.place(b, mono, 3, 0, 0);
ok(res.lines === 2 && res.cleared.length === 15, 'row+col cleared, shared cell counted once');
ok(res.blooms === 0, 'mixed colours => no bloom');

// buds
b = C.newBoard();
for (let c = 0; c < 7; c++) b[c] = { c: 1, bud: c === 3 };
res = C.place(b, mono, 1, 0, 7);
ok(res.buds === 1, 'bud collected');

// generator always gives 3 pieces and on empty board all fit
const rng = C.mulberry32(42);
for (let k = 0; k < 50; k++) {
  const set = C.generateSet(C.newBoard(), rng, Math.random());
  if (set.length !== 3 || !set.every(p => C.anyFit(C.newBoard(), p.shape))) { ok(false, 'generator'); break; }
}
ok(true, 'generator sanity on empty board');

// levels valid
let bad = 0;
for (let l = 1; l <= 300; l++) {
  const L = C.makeLevel(l);
  const full = (() => { for (let r = 0; r < 8; r++) { if ([...Array(8)].every((_, c) => L.board[r * 8 + c])) return true; } for (let c = 0; c < 8; c++) { if ([...Array(8)].every((_, r) => L.board[r * 8 + c])) return true; } return false; })();
  if (L.budsTotal < 1 || full) bad++;
}
ok(bad === 0, 'levels 1..300 valid (buds present, no pre-full lines)');

// simulate many bot games: game should end eventually but last a reasonable time
function botGame(seed, help) {
  const r = C.mulberry32(seed); let board = C.newBoard(); let score = 0, moves = 0, combo = 0;
  while (moves < 2000) {
    const set = C.generateSet(board, r, help(score));
    for (const p of set) {
      let best = null, bv = -1;
      for (let y = 0; y <= 8 - p.shape.h; y++) for (let x = 0; x <= 8 - p.shape.w; x++) if (C.canPlace(board, p.shape, y, x)) {
        const pv = C.previewClears(board, p.shape, y, x); const v = (pv.rows.length + pv.cols.length) * 100 + Math.random();
        if (v > bv) { bv = v; best = [y, x]; }
      }
      if (!best) return { score, moves };
      const res = C.place(board, p.shape, p.color, best[0], best[1]);
      combo = res.lines ? combo + 1 : 0;
      score += p.shape.cells.length + C.lineScore(res.lines, combo, res.blooms); moves++;
    }
  }
  return { score, moves };
}
const runs = [...Array(20)].map((_, i) => botGame(i + 1, C.classicHelp));
const avg = runs.reduce((s, x) => s + x.moves, 0) / runs.length;
console.log('bot avg moves', avg.toFixed(0), 'avg score', (runs.reduce((s, x) => s + x.score, 0) / runs.length).toFixed(0));
ok(avg > 25, 'games are not trivially short for a simple bot');

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
