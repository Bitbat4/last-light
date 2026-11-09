# Bloomstead — Launch Guide (zero to App Store)

Plan on 1–2 evenings of setup, then Apple review (usually 1–3 days).

## 0. What you need
| Item | Cost | Notes |
|---|---|---|
| Mac with **Xcode 15+** | — | Required by Apple to build iOS apps. A borrowed Mac or a cloud Mac (e.g. MacinCloud) works. |
| **Apple Developer Program** | $99/year | developer.apple.com/programs — individual enrollment is fine. |
| **Google AdMob** account | free | admob.google.com — this is where ad money is paid out. |
| **RevenueCat** account | free up to $2.5k/mo revenue | app.revenuecat.com — validates purchases. |
| Node.js 18+ | free | nodejs.org |

Also: in App Store Connect → **Agreements, Tax, and Banking**, sign the *Paid Apps* agreement and add your bank details.
**In-app purchases will not work until this is done.**

## 1. Build the iOS project
```bash
git clone -b claude/iphone-game-monetized-euw04y https://github.com/Bitbat4/last-light.git
cd last-light/bloomstead        # the game lives entirely in this folder
npm install
npx cap add ios
npx @capacitor/assets generate --ios      # makes all icon + splash sizes from /assets
npx cap sync ios
npx cap open ios                          # opens Xcode
```
(Recommended: copy the `bloomstead/` folder into its own new GitHub repo called `bloomstead`, so it's fully separate from Last Light.)

In Xcode, select the **App** target:
- **Signing & Capabilities** → pick your Team. Bundle ID: `com.bitbat4.bloomstead` (or change it in `capacitor.config.json` and re-sync).
- Click **+ Capability** → add **In-App Purchase**.
- **General** → Deployment Info: iPhone only, Portrait only, and tick *Requires full screen*.

## 2. AdMob setup
1. In AdMob: **Apps → Add app → iOS** → "Bloomstead". Copy the **App ID** (`ca-app-pub-XXXX~YYYY`).
2. Create 3 ad units: **Rewarded**, **Interstitial**, **Banner**. Copy their IDs (`ca-app-pub-XXXX/ZZZZ`).
3. Put the unit IDs in `www/js/config.js` → `ADS`, and set `testing: false` **only for the release build**.
4. In Xcode, open `ios/App/App/Info.plist` (right-click → Open As → Source Code) and add, inside `<dict>`:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
<key>NSUserTrackingUsageDescription</key>
<string>This lets us show you ads that are more relevant and keeps Bloomstead free to play.</string>
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```
5. Add Google's **SKAdNetworkItems** list to the same Info.plist (copy the current list from
   developers.google.com/admob/ios/quick-start → "Update your Info.plist"). This noticeably raises ad revenue.
6. In AdMob → **Privacy & messaging**, create a **GDPR** message and an **IDFA explainer** message (free, required for EU users).
7. After the game is live, link the App Store listing in AdMob so ads serve at full rates.

⚠️ Never tap your own live ads. Use test mode (`testing: true`) on your own device.

## 3. In-app purchases
### App Store Connect (appstoreconnect.apple.com)
Create the app (**My Apps → + → New App**, name "Bloomstead", the bundle ID above). Then **Monetization → In-App Purchases**, and create:

| Product ID | Type | Suggested price |
|---|---|---|
| `bloom.noads` | Non-Consumable | $3.99 |
| `bloom.gardener` | Non-Consumable | $7.99 |
| `bloom.starter` | Consumable | $1.99 |
| `bloom.gems.120` | Consumable | $0.99 |
| `bloom.gems.650` | Consumable | $4.99 |
| `bloom.gems.1400` | Consumable | $9.99 |
| `bloom.gems.3000` | Consumable | $19.99 |
| `bloom.gems.8000` | Consumable | $49.99 |

Each needs a display name, description, and a review screenshot (use a shop screenshot).

### RevenueCat
1. Create a project → add an **App Store** app with your bundle ID.
2. Upload the **In-App Purchase Key** (App Store Connect → Users and Access → Integrations → In-App Purchase) as RevenueCat instructs.
3. **Products** → import the 8 product IDs.
4. Copy the **public iOS SDK key** (`appl_...`) into `www/js/config.js` → `REVENUECAT_IOS_KEY`.

### Test purchases
App Store Connect → Users and Access → **Sandbox Testers** → create a tester. On your iPhone: Settings → App Store → Sandbox Account → sign in. Purchases in your Xcode build are then free.

## 4. Privacy policy & support page (required)
Host `docs/privacy.html` for free with **GitHub Pages**:
create a repo `bloomstead`, put `privacy.html` in it, then Settings → Pages → deploy from `main`.
The URL will be `https://<your-username>.github.io/bloomstead/privacy.html`. Put it in `config.js` → `PRIVACY_URL`
and in App Store Connect. Set `SUPPORT_EMAIL` in config too.

**App Privacy questionnaire** (App Store Connect → App Privacy): declare
*Identifiers (Device ID)*, *Usage Data (Product Interaction, Advertising Data)*, *Diagnostics*, *Location (Coarse)*:
used for **Third-Party Advertising** and **Analytics**, and linked to tracking. Purchase history goes under App Functionality.

## 5. Store listing
- **Name:** Bloomstead: Block Garden  ·  **Subtitle:** Relaxing block puzzle & garden
- **Category:** Games → Puzzle (secondary: Casual)  ·  **Age rating:** 4+ (no objectionable content; Apple automatically labels "Contains Ads" and "In-App Purchases")
- **Keywords** (100 chars): `block,puzzle,blast,garden,cozy,brain,flower,blocks,relax,match,tile,offline,classic,game,sudoku`
- **Screenshots:** `store-screenshots/` (1290×2796, the required 6.7" size). Optional: add captions in Canva, e.g.
  "Clear lines, grow a garden", "FULL BLOOM combos!", "Restore magical gardens", "Hundreds of levels".
- **Description (starter):**
  > Drop flower blocks, clear lines and bring a forgotten family garden back to life!
  > Bloomstead is a calm, satisfying block puzzle: drag pieces onto the 8×8 garden bed and fill rows or columns to clear them.
  > Match a whole line in one colour for a FULL BLOOM bonus. Free flower buds in hundreds of adventure levels,
  > chase high scores in Classic mode, and spend petals to restore Grandma's Cottage, a Sunflower Meadow and a Moonlit Greenhouse.
  > • No timers, play at your own pace • Works offline • Daily gifts & lucky spins • Gorgeous hand-drawn gardens

## 6. Release checklist
- [ ] `config.js`: real AdMob unit IDs, `testing: false`, RevenueCat key, privacy URL, support email
- [ ] Info.plist: `GADApplicationIdentifier`, `NSUserTrackingUsageDescription`, SKAdNetwork list
- [ ] `npx cap sync ios`, then in Xcode: Product → Archive → Distribute → App Store Connect
- [ ] TestFlight test on a real iPhone: rewarded ad, interstitial, a sandbox purchase, **Restore Purchases**
- [ ] Fill in App Privacy, pricing (Free), IAPs attached to the version, screenshots, then **Submit for Review**

Common review rejections, already handled in the code: a **Restore Purchases** button (Shop + Settings), no forced ads in the first games,
a privacy policy link, and rewarded ads that are always optional.

## 7. After launch: growing revenue
1. **Watch the numbers** (AdMob + RevenueCat dashboards): day-1 retention (aim for 35%+), rewarded views per user, purchase conversion.
2. **Tune without coding** in `www/js/config.js`: prices, revive costs, interstitial frequency, rewards. Re-sync and ship an update.
3. **Add a 4th garden** every few weeks (copy an area block in `www/js/art.js`). New content is what brings players back.
4. **Cheap user acquisition:** short TikTok/Reels/Shorts clips of Full Bloom combos and garden transformations.
   Screen-record from the iOS Simulator. Organic video is how most indie puzzle games find players.
5. Consider AdMob **mediation** (add AppLovin or Unity Ads) once you have traffic. It typically lifts ad revenue 20–40%.
6. Optional: add **Firebase Analytics** behind `BS.Analytics.log` (every key event is already logged there).
