# 🌸 Bloomstead — Block Puzzle · Garden Story

An original iPhone puzzle game: drag flower-blocks onto an 8×8 garden bed, clear rows and columns,
and spend the petals you earn to restore three hand-drawn gardens.

> **Status:** gameplay, art, sound, economy and monetization are complete and tested in a browser.
> To ship, follow **[docs/LAUNCH_GUIDE.md](docs/LAUNCH_GUIDE.md)** (needs a Mac with Xcode + an Apple Developer account).

## Why this design (2026 market research)
| Finding (2026) | How Bloomstead uses it |
|---|---|
| Block puzzles (e.g. Block Blast) top **downloads** and earn through ads at massive scale | Same instantly-readable core loop: drag pieces, clear lines, no timer |
| Royal Match–style **renovation meta** drives top **revenue** and retention | Petals → restore Grandma's Cottage, Sunflower Meadow, Moonlit Greenhouse |
| Hybrid-casual puzzle (sort/screw/block) grew **+46%** in revenue | Hybrid monetization: opt-in rewarded ads **plus** IAP |
| Hybrid (ads + IAP) is now the default model | Rewarded videos, capped interstitials, banners, gem packs, bundles, No Ads |

## What makes it ours
- **Full Bloom** — clear a line of *one colour* for a big bonus + shower of petals (adds strategy to the genre).
- **Buds** — adventure levels where you free flower buds embedded in the board.
- **Self-tuning levels** — every generated level is bot-tested at load time and picked to match a difficulty curve,
  with a deliberate **Hard Level** every 10 levels (bigger rewards; where boosters/revives sell).
- Cozy hand-drawn garden scenes that visibly come back to life — all art is procedural (no licensing risk).
- All sound and music synthesized in code (WebAudio) — no audio files, no licensing risk.

## Monetization map
| Placement | Type |
|---|---|
| Revive when out of room (once/run) | Rewarded video (or gems, escalating 60/120/240) |
| ×2 petals after a game / level | Rewarded video |
| Free booster (once per booster per run) | Rewarded video |
| Daily gift ×2, Lucky Spin bonus spins (3/day), free gems (6/day) | Rewarded video |
| Between games (after 3rd game, max every 2 games / 120 s) | Interstitial — removed by No Ads |
| Under the board (after 3rd game) | Banner — removed by No Ads |
| Starter Bundle $1.99 (one-time), Gardener's Bundle $7.99, No Ads $3.99, Gems $0.99–$49.99 | IAP |
| Gems → petals / boosters / revives | Soft-currency sinks |

New players see **no forced ads** for their first 3 games, and offers never pop up over a fresh run.

## Project layout
```
www/                 the game (plain HTML/CSS/JS — no build step)
  js/core.js         pure game logic, piece generator, level generator (unit-tested)
  js/game.js         gameplay, renderer, input, effects
  js/ui.js           screens, shop, garden, daily gift, spin wheel
  js/monetize.js     AdMob + RevenueCat (real on iPhone, simulated in browser)
  js/config.js       ← ad unit IDs, product IDs, prices, economy tuning
assets/              icon + splash sources for @capacitor/assets
store-screenshots/   6.7" App Store screenshots (1290×2796)
docs/                launch guide + privacy policy
tests/               unit, end-to-end, difficulty and audio audits
```

## Run it locally
```bash
python3 -m http.server 8080 -d www     # then open http://localhost:8080 (use phone-size window)
node tests/core.test.js                # logic tests
node tests/playtest.js                 # full automated playthrough (needs Playwright + server running)
node tests/difficulty.js               # bot win-rate per level
node tests/audio-audit.js              # sound levels / clipping check
```
In the browser, ads and purchases are simulated so every flow can be tested.
