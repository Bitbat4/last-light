/* Bloomstead — procedural art: tiles, buds, petals and the garden scenes. */
(function () {
  const PALETTE = [
    { base: '#ff6b8f', light: '#ffb3c6', dark: '#c9406a', name: 'Rose' },
    { base: '#ffc531', light: '#ffe48f', dark: '#d48f00', name: 'Sun' },
    { base: '#a07cf2', light: '#d4c2ff', dark: '#6f4ccc', name: 'Lilac' },
    { base: '#3fcf9a', light: '#a6f2d2', dark: '#1f9a6d', name: 'Mint' },
    { base: '#4aa3ff', light: '#b0dbff', dark: '#2670cc', name: 'Bell' },
    { base: '#a3acb7', light: '#d5dbe2', dark: '#6f7883', name: 'Stone' },
    { base: '#f7ead2', light: '#fffaf0', dark: '#cfb48a', name: 'Soil' }, // bud cells
  ];
  const dpr = () => Math.min(window.devicePixelRatio || 1, 3);

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function flower(ctx, cx, cy, rad, petal, center, n = 5, rot = 0) {
    ctx.fillStyle = petal;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, rad * 0.95, rad * 0.62, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = center;
    ctx.beginPath(); ctx.arc(cx, cy, rad * 0.6, 0, Math.PI * 2); ctx.fill();
  }

  const cache = new Map();
  function tile(color, s, variant = '') {
    const k = color + '|' + Math.round(s * 10) + '|' + variant + '|' + dpr();
    let cv = cache.get(k);
    if (cv) return cv;
    const d = dpr();
    cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(s * d);
    const c = cv.getContext('2d');
    c.scale(d, d);
    const p = PALETTE[color];
    const ins = s * 0.045, r = s * 0.22, w = s - ins * 2;
    // drop / bevel
    rr(c, ins, ins + s * 0.02, w, w, r); c.fillStyle = p.dark; c.fill();
    // body
    const g = c.createLinearGradient(0, ins, 0, ins + w);
    g.addColorStop(0, p.light); g.addColorStop(0.45, p.base); g.addColorStop(1, p.base);
    rr(c, ins, ins, w, w - s * 0.07, r); c.fillStyle = g; c.fill();
    if (color === 6) {
      c.fillStyle = 'rgba(160,120,70,0.18)';
      [[0.25, 0.3], [0.72, 0.28], [0.3, 0.75], [0.75, 0.72]].forEach(([x, y]) => { c.beginPath(); c.arc(s * x, s * y, s * 0.035, 0, 7); c.fill(); });
    } else if (color === 5) {
      // stone: speckles + crack
      c.fillStyle = 'rgba(0,0,0,0.12)';
      [[0.3, 0.35, 0.05], [0.65, 0.3, 0.035], [0.55, 0.65, 0.045], [0.28, 0.68, 0.03]].forEach(([x, y, rad]) => { c.beginPath(); c.arc(s * x, s * y, s * rad, 0, 7); c.fill(); });
      c.strokeStyle = 'rgba(60,60,70,0.35)'; c.lineWidth = s * 0.035; c.lineCap = 'round';
      c.beginPath(); c.moveTo(s * 0.62, s * 0.18); c.lineTo(s * 0.52, s * 0.4); c.lineTo(s * 0.6, s * 0.52); c.stroke();
    } else {
      flower(c, s / 2, s * 0.47, s * 0.12, 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0.7)');
    }
    // gloss
    c.save(); rr(c, ins, ins, w, w - s * 0.07, r); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.ellipse(s * 0.32, s * 0.2, s * 0.26, s * 0.1, -0.35, 0, Math.PI * 2); c.fill();
    c.restore();
    if (variant === 'gray') {
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(120,120,130,0.55)'; c.fillRect(0, 0, s, s);
    }
    cache.set(k, cv);
    if (cache.size > 400) cache.delete(cache.keys().next().value);
    return cv;
  }

  function drawTile(ctx, color, x, y, s, alpha = 1, variant = '') {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(tile(color, s, variant), x, y, s, s);
    ctx.globalAlpha = 1;
  }

  // A plump flower bud sitting on a tile.
  function drawBud(ctx, x, y, s, t = 0) {
    const cx = x + s / 2, cy = y + s / 2 + Math.sin(t * 3 + x) * s * 0.02;
    ctx.save();
    // glow
    const gl = ctx.createRadialGradient(cx, cy, s * 0.05, cx, cy, s * 0.55);
    gl.addColorStop(0, 'rgba(255,255,220,0.55)'); gl.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - s * 0.1, y - s * 0.1, s * 1.2, s * 1.2);
    // leaves
    ctx.fillStyle = '#2fa86a';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.13, cy + s * 0.14, s * 0.17, s * 0.08, -0.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + s * 0.13, cy + s * 0.14, s * 0.17, s * 0.08, 0.6, 0, 7); ctx.fill();
    // bud
    const g = ctx.createLinearGradient(cx, cy - s * 0.3, cx, cy + s * 0.15);
    g.addColorStop(0, '#fff0f6'); g.addColorStop(0.5, '#ff8fb8'); g.addColorStop(1, '#e0457f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.3);
    ctx.bezierCurveTo(cx + s * 0.24, cy - s * 0.12, cx + s * 0.2, cy + s * 0.12, cx, cy + s * 0.13);
    ctx.bezierCurveTo(cx - s * 0.2, cy + s * 0.12, cx - s * 0.24, cy - s * 0.12, cx, cy - s * 0.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,30,80,0.35)'; ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.24); ctx.quadraticCurveTo(cx - s * 0.06, cy - s * 0.05, cx, cy + s * 0.1); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.07, cy - s * 0.12, s * 0.04, s * 0.08, 0.3, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawPetal(ctx, x, y, size, rot, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.9, 0, 0, size);
    ctx.quadraticCurveTo(-size * 0.9, 0, 0, -size);
    ctx.fill();
    ctx.restore();
  }

  // ======================= GARDEN SCENES =======================
  // Logical scene is 400 x 300; caller scales.
  const W = 400, H = 300;
  const outline = '#4a3b33';

  function sky(ctx, top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function hills(ctx, c1, c2) {
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.moveTo(0, 150); ctx.quadraticCurveTo(90, 95, 200, 140); ctx.quadraticCurveTo(300, 100, 400, 135); ctx.lineTo(400, 300); ctx.lineTo(0, 300); ctx.fill();
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.moveTo(0, 175); ctx.quadraticCurveTo(140, 140, 260, 170); ctx.quadraticCurveTo(340, 155, 400, 165); ctx.lineTo(400, 300); ctx.lineTo(0, 300); ctx.fill();
  }
  function cloud(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    [[0, 0, 14], [14, -6, 16], [30, 0, 12], [15, 5, 13]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill(); });
  }
  function o(ctx, w = 2) { ctx.strokeStyle = outline; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function shape(ctx, fill, path, w = 2) { ctx.beginPath(); path(); ctx.fillStyle = fill; ctx.fill(); o(ctx, w); ctx.stroke(); }

  function weeds(ctx, t, pts, col = '#6b7d3a') {
    for (const [x, y, s] of pts) {
      ctx.fillStyle = col;
      for (let i = -2; i <= 2; i++) {
        const sw = Math.sin(t * 2 + x) * 2;
        ctx.beginPath(); ctx.moveTo(x + i * 3 * s, y); ctx.quadraticCurveTo(x + i * 5 * s + sw, y - 10 * s, x + i * 7 * s + sw, y - (16 - Math.abs(i) * 3) * s); ctx.lineTo(x + i * 3 * s + 2, y); ctx.fill();
      }
    }
  }
  function tree(ctx, x, y, s, leaf, fruit, t) {
    shape(ctx, '#8a5a3b', () => { ctx.moveTo(x - 6 * s, y); ctx.lineTo(x - 4 * s, y - 40 * s); ctx.lineTo(x + 4 * s, y - 40 * s); ctx.lineTo(x + 6 * s, y); ctx.closePath(); });
    const sw = Math.sin(t * 1.2) * 1.5;
    shape(ctx, leaf, () => {
      ctx.arc(x + sw, y - 60 * s, 26 * s, 0, 7);
    });
    ctx.fillStyle = leaf;
    [[-20, -48, 18], [20, -48, 18], [0, -78, 18]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s + sw, y + dy * s, r * s, 0, 7); ctx.fill(); o(ctx); ctx.stroke(); });
    ctx.fillStyle = leaf; ctx.beginPath(); ctx.arc(x + sw, y - 58 * s, 26 * s, 0, 7); ctx.fill();
    if (fruit) [[-12, -55], [10, -66], [16, -45], [-4, -76], [-20, -40]].forEach(([dx, dy]) => { ctx.fillStyle = fruit; ctx.beginPath(); ctx.arc(x + dx * s + sw, y + dy * s, 3.6 * s, 0, 7); ctx.fill(); o(ctx, 1.2); ctx.stroke(); });
  }
  function bloomCluster(ctx, x, y, colors, n, spread, t) {
    for (let i = 0; i < n; i++) {
      const fx = x + ((i * 37) % spread) - spread / 2, fy = y + ((i * 17) % 18) - 9;
      ctx.strokeStyle = '#3c8d4f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx, fy + 10); ctx.lineTo(fx, fy); ctx.stroke();
      flower(ctx, fx, fy, 3.2 + (i % 3), colors[i % colors.length], '#ffe27a', 5, t * 0.3 + i);
    }
  }
  function butterfly(ctx, x, y, t, col) {
    const f = Math.abs(Math.sin(t * 10)) * 0.8 + 0.2;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x - 4 * f, y, 4 * f, 3, 0.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 4 * f, y, 4 * f, 3, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = outline; ctx.fillRect(x - 0.6, y - 3, 1.2, 6);
  }

  const AREAS = [
    {
      name: "Grandma's Cottage",
      blurb: 'Bring the old family cottage back to life.',
      costs: [60, 100, 150, 200, 260, 330, 400, 480],
      items: ['weeds', 'cottage', 'path', 'fence', 'roses', 'pond', 'tree', 'bench'],
      names: ['Clear the weeds', 'Fix up the cottage', 'Lay a stone path', 'Build a picket fence', 'Plant a rose bed', 'Dig a lily pond', 'Grow an apple tree', 'Add a garden bench'],
      draw(ctx, done, t) {
        sky(ctx, '#8fd3ff', '#dff5ff');
        cloud(ctx, 60 + (t * 4) % 460 - 60, 40, 1); cloud(ctx, 280 + (t * 2.5) % 460 - 230, 26, 0.7);
        hills(ctx, '#9ad37a', '#7cc263');
        ctx.fillStyle = '#86c96a'; ctx.fillRect(0, 190, W, 110);
        const dull = !done.cottage;
        // cottage
        const cx = 200, cy = 175;
        shape(ctx, dull ? '#b9a993' : '#fff3df', () => ctx.rect(cx - 50, cy - 50, 100, 55));
        shape(ctx, dull ? '#7a6a5e' : '#e86a5a', () => { ctx.moveTo(cx - 62, cy - 48); ctx.lineTo(cx, cy - 92); ctx.lineTo(cx + 62, cy - 48); ctx.closePath(); });
        shape(ctx, dull ? '#6b5545' : '#8a5a3b', () => ctx.rect(cx - 11, cy - 30, 22, 35));
        [[cx - 36, cy - 38], [cx + 18, cy - 38]].forEach(([wx, wy]) => {
          shape(ctx, dull ? '#5f6870' : '#bfe6ff', () => ctx.rect(wx, wy, 18, 16));
          if (dull) { o(ctx, 3); ctx.beginPath(); ctx.moveTo(wx - 2, wy + 2); ctx.lineTo(wx + 20, wy + 14); ctx.stroke(); }
          else { ctx.fillStyle = '#ff9fb8'; ctx.fillRect(wx - 2, wy + 15, 22, 4); }
        });
        shape(ctx, dull ? '#7a6a5e' : '#c9b8a6', () => ctx.rect(cx + 25, cy - 95, 12, 26));
        if (!dull) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 3; i++) { const p = (t * 0.4 + i / 3) % 1; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(cx + 31 + Math.sin(p * 6) * 4, cy - 100 - p * 30, 4 + p * 5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
        if (done.fence) {
          for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
            const fx = side < 0 ? 20 + i * 16 : 290 + i * 16;
            shape(ctx, '#ffffff', () => { ctx.moveTo(fx, 200); ctx.lineTo(fx, 172); ctx.lineTo(fx + 5, 166); ctx.lineTo(fx + 10, 172); ctx.lineTo(fx + 10, 200); ctx.closePath(); }, 1.5);
          }
          ctx.fillStyle = '#fff'; ctx.fillRect(18, 180, 116, 5); ctx.fillRect(288, 180, 116, 5);
        }
        if (done.path) {
          [[200, 190, 14], [194, 208, 16], [206, 228, 18], [196, 252, 20], [208, 280, 22]].forEach(([x, y, r]) => shape(ctx, '#d9d2c5', () => ctx.ellipse(x, y, r, r * 0.45, 0, 0, 7), 1.5));
        }
        if (done.tree) tree(ctx, 70, 230, 1.1, '#5cbf5a', '#ff4d4d', t);
        if (done.pond) {
          shape(ctx, '#5ab6e8', () => ctx.ellipse(320, 255, 58, 22, 0, 0, 7));
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(320, 255, 30 + Math.sin(t * 2) * 6, 9 + Math.sin(t * 2) * 2, 0, 0, 7); ctx.stroke();
          [[300, 250], [345, 260]].forEach(([x, y]) => { ctx.fillStyle = '#3fae5a'; ctx.beginPath(); ctx.arc(x, y, 7, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(x, y); ctx.fill(); });
          flower(ctx, 345, 257, 3, '#ffc0d8', '#ffe27a');
        }
        if (done.roses) {
          shape(ctx, '#8a5a3b', () => rr(ctx, 30, 255, 110, 20, 6));
          bloomCluster(ctx, 85, 250, ['#ff4d6d', '#ff8fab', '#ffffff'], 14, 100, t);
        }
        if (done.bench) {
          shape(ctx, '#b07a4f', () => ctx.rect(250, 214, 50, 6));
          shape(ctx, '#b07a4f', () => ctx.rect(250, 200, 50, 6));
          o(ctx, 3); ctx.beginPath(); ctx.moveTo(254, 220); ctx.lineTo(254, 232); ctx.moveTo(296, 220); ctx.lineTo(296, 232); ctx.stroke();
        }
        if (!done.weeds) weeds(ctx, t, [[40, 235, 1.2], [110, 215, 1], [160, 260, 1.3], [250, 240, 1.1], [330, 215, 1], [370, 270, 1.3], [210, 285, 1], [90, 280, 1.2]]);
        if (done.roses && done.pond) { butterfly(ctx, 120 + Math.sin(t * 0.7) * 60, 200 + Math.sin(t * 1.3) * 20, t, '#ffd23f'); butterfly(ctx, 280 + Math.cos(t * 0.6) * 50, 190 + Math.sin(t * 1.1) * 15, t + 1, '#c08bff'); }
      },
    },
    {
      name: 'Sunflower Meadow',
      blurb: 'A golden meadow beyond the cottage hill.',
      costs: [520, 600, 700, 800, 900, 1000, 1150, 1300],
      items: ['brambles', 'windmill', 'sunflowers', 'hives', 'scarecrow', 'hay', 'picnic', 'kite'],
      names: ['Clear the brambles', 'Restore the windmill', 'Sow sunflowers', 'Set up beehives', 'Build a scarecrow', 'Stack hay bales', 'Lay a picnic', 'Fly a kite'],
      draw(ctx, done, t) {
        sky(ctx, '#ffcf8a', '#fff1d6');
        ctx.fillStyle = '#fff6b0'; ctx.beginPath(); ctx.arc(330, 60, 26, 0, 7); ctx.fill();
        cloud(ctx, (t * 3) % 480 - 60, 50, 0.9);
        hills(ctx, '#d6c36a', '#b8b358');
        ctx.fillStyle = '#a9b552'; ctx.fillRect(0, 195, W, 105);
        if (done.windmill) {
          shape(ctx, '#f4e6d0', () => { ctx.moveTo(290, 190); ctx.lineTo(300, 95); ctx.lineTo(330, 95); ctx.lineTo(340, 190); ctx.closePath(); });
          shape(ctx, '#c0533a', () => { ctx.moveTo(294, 98); ctx.lineTo(315, 75); ctx.lineTo(336, 98); ctx.closePath(); });
          ctx.save(); ctx.translate(315, 100); ctx.rotate(t * 0.8);
          for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); shape(ctx, '#fff', () => ctx.rect(-5, 6, 10, 48), 1.5); }
          ctx.restore();
          shape(ctx, '#8a5a3b', () => ctx.arc(315, 100, 5, 0, 7));
        }
        if (done.sunflowers) for (let i = 0; i < 9; i++) {
          const x = 20 + i * 26, y = 205 + (i % 2) * 8, sw = Math.sin(t * 1.5 + i) * 2;
          ctx.strokeStyle = '#3c8d4f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.quadraticCurveTo(x + sw, y + 20, x + sw, y); ctx.stroke();
          flower(ctx, x + sw, y, 6, '#ffcd1f', '#7a4a1f', 10, i);
        }
        if (done.hives) [[60, 268], [95, 272]].forEach(([x, y]) => {
          shape(ctx, '#ffd45e', () => ctx.ellipse(x, y, 14, 16, 0, 0, 7));
          o(ctx, 1.5); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x - 13, y + k * 7); ctx.lineTo(x + 13, y + k * 7); ctx.stroke(); }
          ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(x, y + 6, 3, 0, 7); ctx.fill();
          for (let b = 0; b < 3; b++) { const a = t * 2 + b * 2; ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 22, y - 10 + Math.sin(a * 1.3) * 10, 2, 0, 7); ctx.fill(); }
        });
        if (done.scarecrow) {
          o(ctx, 3); ctx.beginPath(); ctx.moveTo(250, 260); ctx.lineTo(250, 205); ctx.moveTo(230, 220); ctx.lineTo(270, 220); ctx.stroke();
          shape(ctx, '#5b8fd6', () => ctx.rect(240, 214, 20, 26));
          shape(ctx, '#f2d9a0', () => ctx.arc(250, 202, 9, 0, 7));
          shape(ctx, '#a0522d', () => { ctx.moveTo(236, 196); ctx.lineTo(264, 196); ctx.lineTo(256, 184); ctx.lineTo(244, 184); ctx.closePath(); });
          if (!done.brambles) {} else { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(250 + Math.sin(t) * 30, 180 - Math.abs(Math.sin(t * 2)) * 8, 3, 0, 7); ctx.fill(); }
        }
        if (done.hay) [[150, 270], [178, 270], [164, 252]].forEach(([x, y]) => { shape(ctx, '#e8c25a', () => rr(ctx, x - 13, y - 9, 26, 18, 5), 1.5); o(ctx, 1); ctx.beginPath(); ctx.moveTo(x - 8, y - 9); ctx.lineTo(x - 8, y + 9); ctx.moveTo(x + 8, y - 9); ctx.lineTo(x + 8, y + 9); ctx.stroke(); });
        if (done.picnic) {
          shape(ctx, '#ff6b6b', () => { ctx.moveTo(300, 245); ctx.lineTo(370, 240); ctx.lineTo(385, 275); ctx.lineTo(305, 282); ctx.closePath(); });
          ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) ctx.fillRect(306 + i * 19, 246, 8, 32);
          shape(ctx, '#b07a4f', () => rr(ctx, 330, 248, 24, 16, 3), 1.5);
        }
        if (done.kite) {
          const kx = 120 + Math.sin(t * 0.8) * 20, ky = 60 + Math.cos(t * 1.1) * 10;
          ctx.strokeStyle = 'rgba(80,60,50,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(kx, ky + 18); ctx.quadraticCurveTo(kx + 40, ky + 110, 160, 255); ctx.stroke();
          shape(ctx, '#a07cf2', () => { ctx.moveTo(kx, ky - 18); ctx.lineTo(kx + 13, ky); ctx.lineTo(kx, ky + 18); ctx.lineTo(kx - 13, ky); ctx.closePath(); });
        }
        if (!done.brambles) {
          weeds(ctx, t, [[30, 230, 1.5], [90, 250, 1.4], [150, 225, 1.6], [220, 270, 1.5], [280, 230, 1.4], [350, 265, 1.6], [380, 220, 1.3]], '#5d4a3a');
        }
      },
    },
    {
      name: 'Moonlit Greenhouse',
      blurb: 'Where night-blooming flowers glow.',
      costs: [1400, 1550, 1700, 1850, 2000, 2200, 2400, 2700],
      items: ['vines', 'greenhouse', 'lights', 'fountain', 'pots', 'lotus', 'hammock', 'fireflies'],
      names: ['Untangle the vines', 'Rebuild the greenhouse', 'String fairy lights', 'Restore the fountain', 'Pot the night ferns', 'Float moon lotuses', 'Hang a hammock', 'Invite the fireflies'],
      draw(ctx, done, t) {
        sky(ctx, '#1d1b4a', '#6b4f9e');
        for (let i = 0; i < 40; i++) { const x = (i * 97) % 400, y = (i * 53) % 130; ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.abs(Math.sin(t + i))})`; ctx.fillRect(x, y, 1.6, 1.6); }
        ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(70, 55, 20, 0, 7); ctx.fill();
        ctx.fillStyle = '#1d1b4a'; ctx.beginPath(); ctx.arc(80, 50, 18, 0, 7); ctx.fill();
        hills(ctx, '#3f3a7a', '#35617a');
        ctx.fillStyle = '#2f6b5e'; ctx.fillRect(0, 195, W, 105);
        if (done.greenhouse) {
          ctx.fillStyle = 'rgba(180,240,255,0.25)';
          shape(ctx, 'rgba(180,240,255,0.25)', () => { ctx.moveTo(140, 190); ctx.lineTo(140, 120); ctx.quadraticCurveTo(200, 70, 260, 120); ctx.lineTo(260, 190); ctx.closePath(); });
          o(ctx, 1.5); for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(140 + i * 24, 190); ctx.lineTo(140 + i * 24, 100 + Math.abs(i - 2.5) * 10); ctx.stroke(); }
          bloomCluster(ctx, 200, 175, ['#9ff0ff', '#ffd1f5', '#fff'], 10, 100, t);
        }
        if (done.lights) {
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, 120); ctx.quadraticCurveTo(100, 160, 200, 110); ctx.quadraticCurveTo(300, 160, 390, 120); ctx.stroke();
          for (let i = 0; i < 16; i++) {
            const u = i / 15, x = 10 + u * 380, y = u < 0.5 ? 120 + Math.sin(u * 2 * Math.PI) * 22 : 110 + Math.sin((u - 0.5) * 2 * Math.PI) * 22;
            const cols = ['#ffd23f', '#ff8fb8', '#9ff0ff', '#b4ff9f']; ctx.fillStyle = cols[i % 4]; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + i);
            ctx.beginPath(); ctx.arc(x, y + 4, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
          }
        }
        if (done.fountain) {
          shape(ctx, '#9aa5c4', () => ctx.ellipse(200, 250, 40, 13, 0, 0, 7));
          shape(ctx, '#7ad3ff', () => ctx.ellipse(200, 247, 32, 9, 0, 0, 7), 1);
          shape(ctx, '#9aa5c4', () => ctx.rect(195, 215, 10, 30));
          for (let i = 0; i < 8; i++) { const p = (t * 0.8 + i / 8) % 1; ctx.fillStyle = `rgba(160,230,255,${1 - p})`; ctx.beginPath(); ctx.arc(200 + (i % 2 ? 1 : -1) * p * 26, 212 - Math.sin(p * Math.PI) * 18 + p * 30, 2, 0, 7); ctx.fill(); }
        }
        if (done.pots) [[110, 270], [290, 270], [130, 230], [270, 230]].forEach(([x, y], i) => {
          shape(ctx, '#c86b4a', () => { ctx.moveTo(x - 10, y - 12); ctx.lineTo(x + 10, y - 12); ctx.lineTo(x + 7, y + 6); ctx.lineTo(x - 7, y + 6); ctx.closePath(); }, 1.5);
          ctx.fillStyle = '#4fdc9a'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x + k * 4, y - 20 + Math.abs(k) * 2, 3, 10, k * 0.4 + Math.sin(t + i) * 0.1, 0, 7); ctx.fill(); }
        });
        if (done.lotus) { shape(ctx, '#2c4f8a', () => ctx.ellipse(60, 262, 45, 15, 0, 0, 7)); [[45, 260], [75, 265]].forEach(([x, y]) => { flower(ctx, x, y, 4.5, '#f2e6ff', '#fff6a0', 6, t * 0.2); ctx.fillStyle = 'rgba(255,240,255,0.25)'; ctx.beginPath(); ctx.arc(x, y, 12 + Math.sin(t * 2) * 2, 0, 7); ctx.fill(); }); }
        if (done.hammock) {
          tree(ctx, 315, 245, 0.8, '#2f8a6e', null, t); tree(ctx, 385, 245, 0.8, '#2f8a6e', null, t);
          shape(ctx, '#ff9f68', () => { ctx.moveTo(318, 212); ctx.quadraticCurveTo(350, 245 + Math.sin(t) * 3, 382, 212); ctx.quadraticCurveTo(350, 232 + Math.sin(t) * 3, 318, 212); }, 1.5);
        }
        if (done.fireflies) for (let i = 0; i < 14; i++) { const x = (i * 71 + Math.sin(t * 0.7 + i) * 25) % 400, y = 150 + (i * 37) % 120 + Math.cos(t + i) * 10; const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); const g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, `rgba(255,250,150,${a})`); g.addColorStop(1, 'rgba(255,250,150,0)'); ctx.fillStyle = g; ctx.fillRect(x - 7, y - 7, 14, 14); }
        if (!done.vines) weeds(ctx, t, [[40, 220, 1.6], [120, 260, 1.5], [200, 230, 1.7], [280, 270, 1.5], [350, 225, 1.6], [380, 280, 1.4]], '#24473f');
      },
    },
  ];

  function drawGarden(ctx, areaIdx, doneList, t, scale) {
    const area = AREAS[Math.min(areaIdx, AREAS.length - 1)];
    const done = {};
    area.items.forEach((id, i) => { if (doneList.includes(i)) done[id] = true; });
    ctx.save(); ctx.scale(scale, scale);
    area.draw(ctx, done, t);
    ctx.restore();
  }

  BS.Art = { PALETTE, rr, flower, tile, drawTile, drawBud, drawPetal, drawGarden, AREAS, SCENE_W: W, SCENE_H: H };
})();
