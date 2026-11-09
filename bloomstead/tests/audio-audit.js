// Plays every SFX through an analyser; reports peak level per sound (detect silence / clipping).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/');
  await p.mouse.click(5, 5); // user gesture -> unlock
  await p.waitForTimeout(500);
  const out = await p.evaluate(async () => {
    const { ctx, master } = BS.Audio._debug();
    const an = ctx.createAnalyser(); an.fftSize = 2048; master.connect(an);
    const buf = new Float32Array(an.fftSize);
    const measure = async (fn, ms = 700) => {
      let peak = 0; fn(); const t0 = performance.now();
      while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v)); await new Promise(r => setTimeout(r, 15)); }
      return +peak.toFixed(3);
    };
    BS.Save.state.settings.music = false; BS.Audio.Music.sync();
    await new Promise(r => setTimeout(r, 800));
    const S = BS.Audio.SFX, res = {};
    const list = { tap: () => S.tap(), pick: () => S.pick(), drop: () => S.drop(), invalid: () => S.invalid(), clear1: () => S.clear(1, 1), clear4combo8: () => S.clear(4, 8), bloom: () => S.bloom(), combo: () => S.combo(5), sweep: () => S.sweep(), coin: () => S.coin(), bud: () => S.bud(), gameover: () => S.gameover(), win: () => S.win(), unlock: () => S.unlock(), spinTick: () => S.spinTick(), whoosh: () => S.whoosh(),
      worstCase: () => { S.clear(4, 8); S.bloom(); S.sweep(); S.drop(); S.combo(9); } };
    for (const k in list) res[k] = await measure(list[k], k === 'sweep' || k === 'win' || k === 'gameover' ? 1100 : 600);
    BS.Save.state.settings.music = true; BS.Audio.Music.sync();
    res.music_5s = await measure(() => {}, 5000);
    BS.Save.state.settings.music = false; BS.Audio.Music.sync(); await new Promise(r => setTimeout(r, 1500)); BS.Save.state.settings.sfx = false; res.muted_sfx = await measure(() => S.bloom(), 600);
    return res;
  });
  console.table(out);
  const silent = Object.entries(out).filter(([k, v]) => k !== 'muted_sfx' && v < 0.01);
  const clip = Object.entries(out).filter(([, v]) => v > 0.99);
  console.log('silent:', silent.map(x => x[0]).join(',') || 'none', '| clipping:', clip.map(x => x[0]).join(',') || 'none', '| mute works:', out.muted_sfx < 0.01, '| errors:', errs.length);
  await b.close();
})();
