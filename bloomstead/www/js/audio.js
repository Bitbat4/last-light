/* Bloomstead — fully synthesized SFX + generative music (WebAudio, no asset files). */
(function () {
  let ctx = null, master = null, sfxBus = null, musicBus = null, unlocked = false;
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(comp);
  }

  function unlock() {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!unlocked) {
      unlocked = true;
      // iOS needs a sound started inside a gesture
      const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
      Music.sync();
    }
  }
  ['touchstart', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (unlocked) ctx.resume();
  });

  const on = () => ctx && unlocked && BS.Save.state.settings.sfx;
  const freq = (semi, base = 523.25) => base * Math.pow(2, semi / 12);

  function tone({ f = 440, type = 'sine', t = 0, dur = 0.2, vol = 0.3, attack = 0.005, slide = 0, bus = sfxBus, detune = 0 }) {
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, now); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(bus); o.start(now); o.stop(now + dur + 0.05);
  }
  // marimba-ish: sine + quick high partial
  function mallet(f, t = 0, vol = 0.25, dur = 0.5) {
    tone({ f, t, dur, vol, type: 'sine' });
    tone({ f: f * 4, t, dur: 0.06, vol: vol * 0.35, type: 'sine' });
    tone({ f: f * 2, t, dur: dur * 0.5, vol: vol * 0.25, type: 'triangle' });
  }
  function noise(t, dur, vol, fq = 1200, q = 1) {
    const now = ctx.currentTime + t;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(now);
  }

  const SFX = {
    tap() { if (!on()) return; tone({ f: 880, dur: 0.06, vol: 0.12, type: 'triangle' }); },
    pick() { if (!on()) return; tone({ f: 620, dur: 0.09, vol: 0.14, type: 'sine', slide: 1.4 }); },
    drop() { if (!on()) return; tone({ f: 180, dur: 0.12, vol: 0.35, slide: 0.6 }); noise(0, 0.06, 0.25, 900, 2); },
    invalid() { if (!on()) return; tone({ f: 160, dur: 0.15, vol: 0.2, type: 'square', slide: 0.7 }); },
    clear(lines, combo) {
      if (!on()) return;
      const start = Math.min(combo, 6);
      const n = 2 + Math.min(lines, 4);
      for (let i = 0; i < n; i++) mallet(freq(PENTA[start + i], 392), i * 0.055, 0.22);
      noise(0, 0.25, 0.08, 5000, 0.8);
    },
    bloom() {
      if (!on()) return;
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone({ f: freq(s, 784), t: i * 0.04, dur: 0.6, vol: 0.17, type: 'sine' }));
      noise(0, 0.5, 0.06, 7000, 0.5);
    },
    combo(n) { if (!on()) return; tone({ f: freq(PENTA[Math.min(n, 12)], 523), dur: 0.25, vol: 0.15, type: 'triangle' }); },
    sweep() { if (!on()) return; for (let i = 0; i < 10; i++) mallet(freq(PENTA[i], 523), i * 0.05, 0.18, 0.6); },
    coin() { if (!on()) return; tone({ f: 1318, dur: 0.08, vol: 0.12, type: 'square' }); tone({ f: 1760, t: 0.07, dur: 0.18, vol: 0.12, type: 'square' }); },
    bud() { if (!on()) return; tone({ f: 990, dur: 0.15, vol: 0.14, type: 'sine', slide: 1.5 }); },
    gameover() { if (!on()) return; [7, 4, 0, -5].forEach((s, i) => mallet(freq(s, 392), i * 0.18, 0.2, 0.7)); },
    win() { if (!on()) return; [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => mallet(freq(s, 523), i * 0.1, 0.22, 0.6)); },
    unlock() { if (!on()) return; [0, 7, 12, 19, 24].forEach((s, i) => tone({ f: freq(s, 523), t: i * 0.07, dur: 0.8, vol: 0.12, type: 'triangle' })); noise(0, 0.6, 0.05, 6000, 0.5); },
    spinTick() { if (!on()) return; tone({ f: 2000, dur: 0.02, vol: 0.06, type: 'square' }); },
    whoosh() { if (!on()) return; noise(0, 0.3, 0.3, 900, 0.6); },
  };

  // ---- generative, gentle background music ----
  const Music = {
    timer: null, step: 0,
    chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], // I vi IV V (in C)
    sync() {
      if (!ctx) return;
      const want = BS.Save.state.settings.music && unlocked;
      musicBus.gain.setTargetAtTime(want ? 0.32 : 0, ctx.currentTime, 0.4);
      if (want && !this.timer) this.timer = setInterval(() => this.tick(), 375);
      if (!want && this.timer) { clearInterval(this.timer); this.timer = null; }
    },
    tick() {
      if (!ctx || ctx.state !== 'running') return;
      const bar = Math.floor(this.step / 8) % 4;
      const beat = this.step % 8;
      const ch = this.chords[bar];
      if (beat === 0) ch.forEach((s) => tone({ f: freq(s, 261.6), dur: 3.2, vol: 0.05, attack: 0.6, type: 'sine', bus: musicBus, detune: 4 }));
      if (beat === 0 || beat === 4) tone({ f: freq(ch[0] - 12, 261.6), dur: 1.2, vol: 0.08, attack: 0.02, type: 'triangle', bus: musicBus });
      if (Math.random() < (beat % 2 === 0 ? 0.55 : 0.2)) {
        const s = ch[Math.floor(Math.random() * 3)] + (Math.random() < 0.5 ? 12 : 24);
        tone({ f: freq(s, 261.6), dur: 0.7, vol: 0.045, type: 'sine', bus: musicBus });
        tone({ f: freq(s, 261.6) * 3, dur: 0.15, vol: 0.01, type: 'sine', bus: musicBus });
      }
      this.step++;
    },
  };

  function haptic(kind = 'light') {
    if (!BS.Save.state.settings.haptics) return;
    const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
    try {
      if (H) {
        if (kind === 'success') H.notification({ type: 'SUCCESS' });
        else if (kind === 'error') H.notification({ type: 'ERROR' });
        else H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
      } else if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 30 : 10);
    } catch (e) {}
  }

  BS.Audio = { SFX, Music, haptic, unlock, _debug: () => ({ ctx, master }) };
})();
