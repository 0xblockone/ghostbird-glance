# GhostBird Glance 🦞

**Your crypto markets, at a glance — on Even Realities G2.**

GhostBird Glance is a heads-up companion for the Even G2 smart glasses,
built for the **Heads Up: Even Realities Hackathon** (Crypto & DeFi track).
It puts the two things a crypto holder actually checks fifty times a day —
*live prices* and *live prediction-market odds* — on the 576×288 lens,
and lets you act on them in seconds with taps, without touching your phone.

## What it does

- **Glance (read):** Live BTC / ETH / SOL prices with 24h change, streamed
  from the **Hyperliquid** public info API. Refreshes every 30 seconds.
- **Markets (read):** The top live Bitcoin prediction markets on
  **Polymarket** (Gamma API), ranked by 24h volume, with live YES odds.
- **Paper trade (write):** Open any market and place a paper trade —
  YES or NO, $25 or $100 of a virtual $1,000 balance — through a
  tap-to-confirm flow designed for the glasses (TAP confirms,
  DOUBLE-TAP cancels; nothing executes on a single accidental tap).
- **Positions (read + write):** Open paper positions are marked to market
  against live Polymarket odds with live PnL, and can be closed at market
  from the glasses. Portfolio (balance, positions, realized PnL) persists
  on-device via Even Hub bridge storage.
- **Offline-safe:** If both APIs are unreachable, the app falls back to a
  clearly-labelled snapshot instead of dying — your demo never bricks.

Safety by design: **read-only public APIs, paper money only.** The app
holds no keys, connects no wallet, custodies nothing, and gives no
financial advice. It is a glanceable window and a practice range — not a
trading terminal.

## Run it

Prerequisites: Node.js 20+ and npm. No glasses required — the official
Even Hub simulator renders the app exactly as the lenses would.

```bash
npm install

# Terminal 1 — dev server
npm run dev

# Terminal 2 — official G2 simulator (free, no hardware needed)
npm install -g @evenrealities/evenhub-simulator
evenhub-simulator http://localhost:5173
```

**No simulator?** Open http://localhost:5173 in any browser. When no Even
bridge is present, the app renders the exact same 576×288 screen model as
a clickable preview (click a row to select; on text screens, click = TAP,
double-click = DOUBLE-TAP). Same state machine, same flow.

**On real G2 glasses:** with Developer Mode enabled in the Even app,

```bash
npx evenhub qr --url "http://<YOUR-LAN-IP>:5173"
```

and scan the QR from the phone app.

**Production build / packaged app:**

```bash
npm run build                       # -> dist/
npx evenhub pack app.json dist      # -> .ehpk (a prebuilt one is in the repo root)
```

## How it works

```
src/
  api.ts    Data layer. Hyperliquid metaAndAssetCtxs (prices + 24h change)
            and Polymarket Gamma /events?tag_slug=bitcoin (markets, odds).
            Filters out effectively-resolved markets; snapshot fallback.
  main.ts   One state machine (9 screens) driving two renderers:
            the Even Hub SDK bridge (text + list containers, tap /
            double-tap / list-select events, bridge local storage) and
            the DOM preview used in plain browsers.
app.json    Even Hub manifest — network permission whitelists exactly the
            two API origins above, nothing else.
```

Interactions follow the G2 grammar: lists are scrolled with the ring /
temple swipe and selected with a tap; full-screen text pages use TAP /
DOUBLE-TAP; the root page exits through the system confirmation dialog
(`shutDownPageContainer(1)`), as Even Hub QA requires.

## APIs used (all public, keyless, read-only)

| API | Use |
| --- | --- |
| Hyperliquid `POST https://api.hyperliquid.xyz/info` (`metaAndAssetCtxs`) | Live mark prices + previous-day prices for BTC/ETH/SOL |
| Polymarket Gamma `GET https://gamma-api.polymarket.com/events` | Live Bitcoin prediction markets, outcome odds, 24h volume |

## Hackathon notes

- **Track:** Crypto & DeFi — built exclusively on apps listed in the
  track (Polymarket, Hyperliquid).
- **Rules compliance:** demos use read-only live data + paper trading
  only; no user funds are held; no financial advice is given.
- **What existed before Nov 23, 2026:** nothing project-specific. The
  Even Hub SDK, CLI and simulator (`@evenrealities/*`, MIT-style public
  tooling) and the two public APIs predate the hackathon; every line of
  GhostBird Glance was written during the build week.
- **Team:** solo build by BLOCK.

## Roadmap (post-hackathon)

- Price alerts: set a level on Hyperliquid pairs, get pinged on the lens.
- Trust Wallet / Gram Wallet read-only balance glance (same track).
- Voice confirmations via the G2 microphone ("buy yes" / "cancel").
- Telegram bot bridge: fills and alerts mirrored to Telegram.

---

*GhostBird Glance — built by BLOCK (0xblockone) 🦞 — Bitcoin puzzle hunter
& developer of single-file offline key-scanning apps (BPHKS · BPMH ·
NFSW GhostBird KeyGen), now building in the open, from zero.*
