# GhostBird Glance — DoraHacks Submission Package

Everything for the **Heads Up: Even Realities Hackathon** submission is
pre-filled below. Copy-paste the fields, follow the checklist.

## ⏰ Deadline

**Submissions close 29 Nov 2026, 19:59 UTC = 30 Nov 2026, 02:59 GMT+7
(Asia/Jakarta).** Judging Nov 30 – Dec 1. Demo Day Dec 3 (Dubai, remote
OK). Do not leave this to the last hour — DoraHacks gets slow near
deadlines.

## Paste-ready submission fields

**Project name**
```
GhostBird Glance
```

**Track**
```
Crypto & DeFi
```

**Tagline / short description (1–2 sentences)**
```
A heads-up crypto companion for Even Realities G2: live Hyperliquid prices and live Polymarket odds on the lens, with tap-to-confirm paper trading and positions marked to market — read-only APIs, zero custody.
```

**Long description**
```
THE PROBLEM
Crypto holders check prices and prediction-market odds dozens of times a
day, and every check means pulling out a phone. The G2's glanceable,
hands-free display is the right surface for exactly this — if the app is
built for glances and two-tap actions instead of shrinking a phone UI.

WHAT GHOSTBIRD GLANCE DOES
• Glance — Live BTC/ETH/SOL prices with 24h change from Hyperliquid's
  public info API, refreshed every 30 seconds, next to a paper-portfolio
  summary (balance, open positions, live PnL).
• Markets — Polymarket's top live Bitcoin prediction markets (Gamma
  API), ranked by 24h volume with live YES odds. Effectively-resolved
  markets are filtered out.
• Paper trade (the write path) — Open any market and buy YES or NO with
  $25 or $100 of a virtual $1,000 balance. Execution is a two-step,
  glasses-native flow: select the trade, then TAP to confirm on a screen
  showing shares, price and balance-after (DOUBLE-TAP cancels). Nothing
  fires on a single stray tap.
• Positions — Open positions are marked to market against live
  Polymarket odds with live PnL, closable at market from the glasses.
  The portfolio persists on-device via Even Hub bridge storage.
• Offline-safe — if both APIs are unreachable the app falls back to a
  clearly-labelled snapshot instead of a dead screen.

SAFETY BY DESIGN
Read-only public APIs and paper money only. The app holds no keys,
connects no wallet, custodies nothing and gives no financial advice.
The network permission in app.json whitelists exactly two origins:
api.hyperliquid.xyz and gamma-api.polymarket.com.

BUILT FOR G2, NOT PORTED TO IT
One state machine renders through the Even Hub SDK (text + list
containers, list-select / TAP / DOUBLE-TAP grammar, system exit dialog
on the root page). The identical screen model also renders as a DOM
preview in a plain browser, so judges can run the full demo flow
without hardware or the simulator.

STACK
Vite + TypeScript, @evenrealities/even_hub_sdk 0.0.16. Packaged .ehpk
included in the repo. Solo build, written entirely during the build
week (the SDK/CLI/simulator and the two public APIs predate the event).
```

**Repository link** — *(after you push, see checklist)*
```
https://github.com/0xblockone/ghostbird-glance
```

**Demo video** — *(after you record + upload, see checklist; max 3 min,
script in DEMO-SCRIPT.md)*

**Feature requests for the APIs used (submission asks for up to 5)**
```
1. Polymarket Gamma API: allow tag + volume ordering directly on
   /markets. Today, getting "top Bitcoin markets by 24h volume"
   requires fetching /events and flattening markets client-side.
2. Polymarket Gamma API: return outcomePrices/outcomes as native JSON
   arrays instead of JSON-encoded strings, to remove a parse step (and
   a failure mode) in constrained WebView clients.
3. Hyperliquid info API: a cacheable GET mirror of metaAndAssetCtxs
   would cut latency for glanceable UIs that poll prices every ~30s
   from a phone WebView.
4. Even Hub SDK: an in-place list update (listContainerUpgrade) so
   live data can refresh list rows without a full rebuildPageContainer
   rebuild — currently every odds tick that touches a list flickers.
5. Even Hub SDK: ship an official browser mock of the bridge
   (waitForEvenAppBridge + event injection) for developing and demoing
   without the desktop simulator.
```

**Tags / keywords**
```
even-g2, smart-glasses, polymarket, hyperliquid, crypto, defi,
prediction-markets, paper-trading, typescript, even-hub-sdk
```

## ✅ Done (already prepared in this folder)

- [x] Full working app — `src/api.ts` + `src/main.ts`, TypeScript strict
      build passes (`npm run build`, verified 2026-11-26)
- [x] Data layer verified end-to-end against the LIVE Polymarket +
      Hyperliquid APIs from this machine (prices, 8 tradeable markets,
      paper-trade math)
- [x] `app.json` Even Hub manifest (network whitelist = the two APIs)
- [x] Packaged build: `ghostbird-glance-1.0.0.ehpk` (produced with the
      official `evenhub pack`, no account needed)
- [x] App icon (`public/icon.png`, 24×24 greyscale)
- [x] README with setup instructions (a submission requirement)
- [x] Demo video script, shot-by-shot, 2:30 target (`DEMO-SCRIPT.md`)
- [x] All submission fields pre-written (above)
- [x] Local git repo initialized and committed — ready to push

## 👉 Remaining steps for BLOCK (in order)

1. **Push the repo** (needs your GitHub — you're already signed in as
   0xblockone in the browser):
   - Create an empty PUBLIC repo named `ghostbird-glance` at
     https://github.com/new (no README, no .gitignore — this folder has
     both).
   - Then in this folder:
     ```bash
     cd ~/workspace/evenrealities-build
     git remote add origin https://github.com/0xblockone/ghostbird-glance.git
     git branch -M main
     git push -u origin main
     ```
2. **DoraHacks account + registration** (one-time; this is the step
   that needs you — account creation may ask for a password, which is
   yours to set; GitHub/Google social login also works):
   - Sign up / log in at https://dorahacks.io with 0xblockone@gmail.com
     or a social login.
   - Open https://dorahacks.io/hackathon/even-realities and register
     for the hackathon (solo team is fine — teams of 1–4 allowed).
3. **Record the demo** (≤3 min) following `DEMO-SCRIPT.md`:
   `npm run dev`, then either the simulator
   (`evenhub-simulator http://localhost:5173`) or the browser preview,
   screen-record, upload to YouTube.
4. **Submit the BUIDL** on the hackathon page before
   **30 Nov 02:59 GMT+7**: paste the fields above, add the repo link
   and the video link, pick the **Crypto & DeFi** track, submit.
5. *(Optional, not required)* Even Hub store listing: create an Even
   Realities developer account, `npx evenhub login`, then
   `npx evenhub create ghostbird-glance-1.0.0.ehpk` — only if you want
   the app on Even Hub beta as well.

## Honest notes

- Track rules say "use only the apps listed in your track" — this entry
  uses **only Polymarket and Hyperliquid** (both Crypto & DeFi). The
  Best Telegram Integration prize ($1,000) was deliberately NOT chased:
  bolting on a Telegram bot would have halved the polish of the core
  loop in the time available. If time remains after submitting, a
  Telegram fills-alert bot is the cheapest add-on (see README roadmap).
- One source discrepancy worth knowing: most listings say track 2nd
  place is $375; one aggregator (aihackathon.app) says $500. The
  DoraHacks page governs; it couldn't be re-read directly during prep
  (the fetch failed), so confirm the prize table on the page when you
  register.
