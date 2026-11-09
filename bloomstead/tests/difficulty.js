// Bot-simulated win rates per level. node tests/difficulty.js
const C = require('../www/js/core.js');
function evalBoard(b) { // penalise isolated empty cells
  let holes = 0;
  for (let i = 0; i < 64; i++) if (!b[i]) { const r = i >> 3, c = i & 7; let n = 0;
    if (r === 0 || b[i - 8]) n++; if (r === 7 || b[i + 8]) n++; if (c === 0 || b[i - 1]) n++; if (c === 7 || b[i + 1]) n++; if (n >= 3) holes++; }
  return -holes * 8;
}
function play(level, seed) {
  const L = C.makeLevel(level); const rng = C.mulberry32(seed); let b = L.board, buds = 0, moves = 0;
  let tray = L.firstTray || C.generateSet(b, rng, L.help);
  while (moves < 300) {
    let best = null;
    tray.forEach((p, idx) => { if (!p) return;
      for (let r = 0; r <= 8 - p.shape.h; r++) for (let c = 0; c <= 8 - p.shape.w; c++) if (C.canPlace(b, p.shape, r, c)) {
        const t = C.cloneBoard(b); const res = C.place(t, p.shape, p.color, r, c);
        const v = res.lines * 100 + res.buds * 80 + evalBoard(t) + Math.random();
        if (!best || v > best.v) best = { v, idx, r, c };
      } });
    if (!best) return { win: false, moves };
    const p = tray[best.idx]; const res = C.place(b, p.shape, p.color, best.r, best.c); buds += res.buds; moves++;
    tray[best.idx] = null;
    if (buds >= L.budsTotal) return { win: true, moves };
    if (tray.every(x => !x)) tray = C.generateSet(b, rng, L.help);
  }
  return { win: false, moves };
}
const rows = [];
for (let l = 1; l <= 80; l++) {
  let w = 0, m = 0; const N = 30;
  for (let s = 0; s < N; s++) { const r = play(l, s * 31 + l); if (r.win) w++; m += r.moves; }
  rows.push([l, Math.round(w / N * 100), Math.round(m / N)]);
}
let line = '';
rows.forEach(([l, w, m], i) => { line += `L${String(l).padEnd(3)} ${String(w).padStart(3)}%  `; if (i % 8 === 7) { console.log(line); line = ''; } });
const band = (a, b) => Math.round(rows.slice(a - 1, b).reduce((s, r) => s + r[1], 0) / (b - a + 1));
console.log(`avg win: 1-10 ${band(1,10)}%  11-30 ${band(11,30)}%  31-60 ${band(31,60)}%  61-80 ${band(61,80)}%`);
