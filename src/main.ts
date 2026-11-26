// GhostBird Glance — a heads-up crypto companion for Even Realities G2.
//
// Built for the Heads Up hackathon, Crypto & DeFi track.
// READ:  live prices from Hyperliquid, live odds from Polymarket.
// WRITE: paper trades (virtual $1,000) placed with taps on the glasses —
//        no real funds, no custody, no financial advice. Positions are
//        marked to market against live Polymarket odds and persisted
//        on-device via the Even Hub bridge storage.
//
// The same state machine drives two renderers:
//   1. the Even Hub SDK bridge (simulator / real G2 glasses), and
//   2. a DOM preview that appears when the bridge is absent (plain
//      browser), so anyone can try the exact demo flow with a mouse.

import {
  waitForEvenAppBridge,
  TextContainerProperty,
  TextContainerUpgrade,
  ListContainerProperty,
  ListItemContainerProperty,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  OsEventTypeList,
  type EvenAppBridge,
} from '@evenrealities/even_hub_sdk'
import {
  fetchPrices,
  fetchBtcMarkets,
  SNAPSHOT_PRICES,
  SNAPSHOT_MARKETS,
  type CoinPrice,
  type PredictionMarket,
} from './api'

// ---------------------------------------------------------------------------
// Paper portfolio
// ---------------------------------------------------------------------------

interface Position {
  marketId: string
  question: string
  shortTitle: string
  side: 'YES' | 'NO'
  shares: number
  entryPrice: number
  costBasis: number
  lastPrice: number // last known price of the held side, for PnL
  openedAt: number
}

interface Portfolio {
  balance: number
  realized: number
  positions: Position[]
}

const START_BALANCE = 1000
const STORE_KEY = 'ghostbird-glance-portfolio-v1'

function freshPortfolio(): Portfolio {
  return { balance: START_BALANCE, realized: 0, positions: [] }
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

type Page =
  | 'home'
  | 'markets'
  | 'detail'
  | 'confirm'
  | 'result'
  | 'positions'
  | 'posdetail'
  | 'posconfirm'
  | 'posresult'

interface PendingTrade {
  market: PredictionMarket
  side: 'YES' | 'NO'
  stake: number
}

const state = {
  page: 'home' as Page,
  prices: [] as CoinPrice[],
  markets: [] as PredictionMarket[],
  portfolio: freshPortfolio(),
  selectedMarket: null as PredictionMarket | null,
  pendingTrade: null as PendingTrade | null,
  selectedPosition: -1,
  lastFillText: '',
  live: false, // true when showing live API data, false for offline snapshot
  loading: true,
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const fmtUsd = (n: number, dp = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
const fmtPrice = (n: number) => (n >= 1000 ? fmtUsd(n, 0) : n >= 10 ? fmtUsd(n, 2) : fmtUsd(n, 3))
const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
const fmtSigned = (n: number) => `${n >= 0 ? '+' : '-'}$${fmtUsd(Math.abs(n))}`
const pctOf = (p: number) => `${Math.round(p * 100)}%`
const centsOf = (p: number) => `${Math.round(p * 100)}c`
const clock = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function positionValue(pos: Position): number {
  return pos.shares * pos.lastPrice
}
function positionPnl(pos: Position): number {
  return positionValue(pos) - pos.costBasis
}
function openPnl(): number {
  return state.portfolio.positions.reduce((a, p) => a + positionPnl(p), 0)
}

// ---------------------------------------------------------------------------
// Screen model — every page is (text, optional list). Both renderers consume
// exactly this model, so the glasses and the browser preview never diverge.
// ---------------------------------------------------------------------------

interface Screen {
  text: string
  list?: string[]
  capture: 'text' | 'list'
}

function currentScreen(): Screen {
  const pf = state.portfolio
  switch (state.page) {
    case 'home': {
      const lines = state.loading
        ? ['GHOSTBIRD GLANCE', '', 'Loading live markets…']
        : [
            `GHOSTBIRD GLANCE        ${clock()}`,
            ...state.prices.map(
              (p) => `${p.coin.padEnd(4)} $${fmtPrice(p.price).padStart(9)}  ${fmtPct(p.changePct)}`,
            ),
            '------------------------------',
            `Paper $${fmtUsd(pf.balance)} · Open ${pf.positions.length} · PnL ${fmtSigned(openPnl())}`,
            state.live ? 'Live: Hyperliquid + Polymarket' : 'OFFLINE - snapshot data',
          ]
      return {
        text: lines.join('\n'),
        list: ['Prediction markets', 'My positions', 'Refresh prices', 'Exit app'],
        capture: 'list',
      }
    }
    case 'markets': {
      return {
        text: `POLYMARKET - BTC MARKETS\nLive odds, updated on open.\nPaper balance $${fmtUsd(pf.balance)}`,
        list: [
          ...state.markets.map((m) => clip(`${m.shortTitle} YES ${pctOf(m.yesPrice)}`, 63)),
          'Refresh markets',
          'Back',
        ],
        capture: 'list',
      }
    }
    case 'detail': {
      const m = state.selectedMarket!
      return {
        text: [
          clip(m.question, 180),
          '',
          `YES ${centsOf(m.yesPrice)}  ·  NO ${centsOf(m.noPrice)}`,
          `24h volume $${fmtUsd(m.volume24hr, 0)}`,
          m.endDate ? `Ends ${m.endDate.slice(0, 10)}` : '',
          `Paper balance $${fmtUsd(pf.balance)}`,
        ]
          .filter(Boolean)
          .join('\n'),
        list: ['Buy YES - $25', 'Buy NO - $25', 'Buy YES - $100', 'Buy NO - $100', 'Back'],
        capture: 'list',
      }
    }
    case 'confirm': {
      const t = state.pendingTrade!
      const price = t.side === 'YES' ? t.market.yesPrice : t.market.noPrice
      const shares = t.stake / price
      return {
        text: [
          'CONFIRM PAPER TRADE',
          '',
          `Buy ${fmtUsd(shares)} ${t.side} shares`,
          `"${clip(t.market.shortTitle, 44)}"`,
          `@ ${centsOf(price)} = $${fmtUsd(t.stake)} paper`,
          `Balance after: $${fmtUsd(pf.balance - t.stake)}`,
          '',
          'TAP to confirm',
          'DOUBLE-TAP to cancel',
        ].join('\n'),
        capture: 'text',
      }
    }
    case 'result': {
      return {
        text: [
          'PAPER TRADE FILLED',
          '',
          state.lastFillText,
          '',
          `Balance $${fmtUsd(pf.balance)} · Open ${pf.positions.length}`,
          '',
          'TAP: view positions',
          'DOUBLE-TAP: back to markets',
        ].join('\n'),
        capture: 'text',
      }
    }
    case 'positions': {
      const items = pf.positions.map((p) =>
        clip(`${p.side} ${p.shortTitle} ${fmtSigned(positionPnl(p))}`, 63),
      )
      return {
        text: [
          'MY PAPER POSITIONS',
          `Balance $${fmtUsd(pf.balance)} · Realized ${fmtSigned(pf.realized)}`,
          pf.positions.length === 0 ? 'No open positions yet.' : 'Tap a position to manage it.',
        ].join('\n'),
        list: [...items, 'Back'],
        capture: 'list',
      }
    }
    case 'posdetail': {
      const p = pf.positions[state.selectedPosition]
      if (!p) return { text: 'Position gone.', list: ['Back'], capture: 'list' }
      return {
        text: [
          clip(p.question, 170),
          '',
          `Side ${p.side} · ${fmtUsd(p.shares)} shares`,
          `Entry ${centsOf(p.entryPrice)} · Now ${centsOf(p.lastPrice)}`,
          `Value $${fmtUsd(positionValue(p))} · PnL ${fmtSigned(positionPnl(p))}`,
        ].join('\n'),
        list: ['Close position at market', 'Back'],
        capture: 'list',
      }
    }
    case 'posconfirm': {
      const p = pf.positions[state.selectedPosition]
      if (!p) return { text: 'Position gone.', capture: 'text' }
      return {
        text: [
          'CONFIRM CLOSE',
          '',
          `Sell ${fmtUsd(p.shares)} ${p.side} shares`,
          `"${clip(p.shortTitle, 44)}"`,
          `@ ${centsOf(p.lastPrice)} = $${fmtUsd(positionValue(p))}`,
          `Realizes ${fmtSigned(positionPnl(p))}`,
          '',
          'TAP to confirm',
          'DOUBLE-TAP to cancel',
        ].join('\n'),
        capture: 'text',
      }
    }
    case 'posresult': {
      return {
        text: [
          'POSITION CLOSED',
          '',
          state.lastFillText,
          '',
          `Balance $${fmtUsd(pf.balance)} · Realized ${fmtSigned(pf.realized)}`,
          '',
          'TAP: back to positions',
          'DOUBLE-TAP: home',
        ].join('\n'),
        capture: 'text',
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Actions (shared by both renderers)
// ---------------------------------------------------------------------------

function go(page: Page) {
  state.page = page
  render()
}

function executeTrade() {
  const t = state.pendingTrade
  if (!t) return
  const pf = state.portfolio
  if (t.stake > pf.balance) {
    state.lastFillText = 'Not enough paper balance.'
    go('result')
    return
  }
  const price = t.side === 'YES' ? t.market.yesPrice : t.market.noPrice
  const shares = t.stake / price
  pf.balance -= t.stake
  pf.positions.push({
    marketId: t.market.id,
    question: t.market.question,
    shortTitle: t.market.shortTitle,
    side: t.side,
    shares,
    entryPrice: price,
    costBasis: t.stake,
    lastPrice: price,
    openedAt: Date.now(),
  })
  state.lastFillText = `+${fmtUsd(shares)} ${t.side} @ ${centsOf(price)}\n"${clip(t.market.shortTitle, 46)}"`
  state.pendingTrade = null
  void savePortfolio()
  go('result')
}

function executeClose() {
  const pf = state.portfolio
  const p = pf.positions[state.selectedPosition]
  if (!p) {
    go('positions')
    return
  }
  const proceeds = positionValue(p)
  const pnl = positionPnl(p)
  pf.balance += proceeds
  pf.realized += pnl
  pf.positions.splice(state.selectedPosition, 1)
  state.selectedPosition = -1
  state.lastFillText = `Sold ${fmtUsd(p.shares)} ${p.side} for $${fmtUsd(proceeds)}\nRealized ${fmtSigned(pnl)}`
  void savePortfolio()
  go('posresult')
}

function handleSelect(index: number) {
  const pf = state.portfolio
  switch (state.page) {
    case 'home':
      if (index === 0) go('markets')
      else if (index === 1) go('positions')
      else if (index === 2) void refreshData(true)
      else if (index === 3) exitApp()
      break
    case 'markets': {
      const n = state.markets.length
      if (index < n) {
        state.selectedMarket = state.markets[index]
        go('detail')
      } else if (index === n) void refreshData(true)
      else go('home')
      break
    }
    case 'detail': {
      const m = state.selectedMarket
      if (!m) return go('markets')
      const trades: Array<[PendingTrade['side'], number]> = [
        ['YES', 25],
        ['NO', 25],
        ['YES', 100],
        ['NO', 100],
      ]
      if (index < 4) {
        const [side, stake] = trades[index]
        state.pendingTrade = { market: m, side, stake }
        go('confirm')
      } else go('markets')
      break
    }
    case 'positions': {
      if (index < pf.positions.length) {
        state.selectedPosition = index
        go('posdetail')
      } else go('home')
      break
    }
    case 'posdetail':
      if (index === 0) go('posconfirm')
      else go('positions')
      break
  }
}

function handleTextClick() {
  switch (state.page) {
    case 'confirm':
      executeTrade()
      break
    case 'result':
      go('positions')
      break
    case 'posconfirm':
      executeClose()
      break
    case 'posresult':
      go('positions')
      break
  }
}

function handleTextDoubleClick() {
  switch (state.page) {
    case 'confirm':
      state.pendingTrade = null
      go('detail')
      break
    case 'result':
      go('markets')
      break
    case 'posconfirm':
      go('posdetail')
      break
    case 'posresult':
      go('home')
      break
  }
}

// ---------------------------------------------------------------------------
// Data loading / refresh
// ---------------------------------------------------------------------------

async function refreshData(manual = false) {
  try {
    const [prices, markets] = await Promise.all([fetchPrices(), fetchBtcMarkets()])
    state.prices = prices
    if (markets.length > 0) state.markets = markets
    state.live = true
    // Mark open positions to market with the fresh odds.
    for (const pos of state.portfolio.positions) {
      const m = state.markets.find((x) => x.id === pos.marketId)
      if (m) pos.lastPrice = pos.side === 'YES' ? m.yesPrice : m.noPrice
    }
  } catch {
    if (state.prices.length === 0) state.prices = SNAPSHOT_PRICES
    if (state.markets.length === 0) state.markets = SNAPSHOT_MARKETS
    state.live = false
  }
  state.loading = false
  if (manual || state.page === 'home') render()
}

// ---------------------------------------------------------------------------
// Persistence — bridge storage on device, localStorage in the browser.
// ---------------------------------------------------------------------------

let bridge: EvenAppBridge | null = null

async function savePortfolio() {
  const raw = JSON.stringify(state.portfolio)
  try {
    if (bridge) await bridge.setLocalStorage(STORE_KEY, raw)
    else localStorage.setItem(STORE_KEY, raw)
  } catch {
    /* storage is best-effort */
  }
}

async function loadPortfolio() {
  try {
    const raw = bridge ? await bridge.getLocalStorage(STORE_KEY) : localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Portfolio
      if (typeof parsed.balance === 'number' && Array.isArray(parsed.positions)) {
        state.portfolio = parsed
      }
    }
  } catch {
    /* start fresh */
  }
}

// ---------------------------------------------------------------------------
// Renderer 1: Even Hub bridge (simulator / real glasses)
// ---------------------------------------------------------------------------

const TEXT_ID = 1
const LIST_ID = 2

function buildContainers(screen: Screen) {
  const textObject = [
    new TextContainerProperty({
      xPosition: 0,
      yPosition: 0,
      width: 576,
      height: screen.list ? 150 : 288,
      borderWidth: 0,
      borderColor: 5,
      paddingLength: 6,
      containerID: TEXT_ID,
      containerName: 'main',
      content: screen.text,
      isEventCapture: screen.capture === 'text' ? 1 : 0,
    }),
  ]
  const listObject = screen.list
    ? [
        new ListContainerProperty({
          xPosition: 0,
          yPosition: 150,
          width: 576,
          height: 138,
          borderWidth: 1,
          borderColor: 5,
          paddingLength: 4,
          containerID: LIST_ID,
          containerName: 'menu',
          itemContainer: new ListItemContainerProperty({
            itemCount: screen.list.length,
            itemWidth: 560,
            isItemSelectBorderEn: 1,
            itemName: screen.list,
          }),
          isEventCapture: screen.capture === 'list' ? 1 : 0,
        }),
      ]
    : []
  return { containerTotalNum: textObject.length + listObject.length, textObject, listObject }
}

let pageCreated = false
let lastScreenKey = ''

async function renderBridge() {
  if (!bridge) return
  const screen = currentScreen()
  // Key captures everything that would change the rendered page; list pages
  // need a full rebuild when anything changes (lists have no in-place
  // update), text-only pages use the flicker-free upgrade path.
  const key = `${state.page}::${screen.text}::${(screen.list ?? []).join('|')}`
  if (!pageCreated) {
    const parts = buildContainers(screen)
    const result = await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer(parts),
    )
    if ((result as unknown as number) !== 0) {
      console.error('createStartUpPageContainer failed:', result)
    }
    pageCreated = true
    lastScreenKey = key
    return
  }
  if (key === lastScreenKey) return
  lastScreenKey = key
  if (screen.list) {
    const parts = buildContainers(screen)
    await bridge.rebuildPageContainer(new RebuildPageContainer(parts))
  } else {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: TEXT_ID,
        containerName: 'main',
        content: screen.text,
      }),
    )
  }
}

function wireBridgeEvents() {
  if (!bridge) return
  bridge.onEvenHubEvent((event) => {
    const listEvent = event.listEvent
    if (listEvent && listEvent.containerID === LIST_ID) {
      const t = listEvent.eventType
      // CLICK_EVENT (0) is normalized to undefined by the SDK in some paths.
      if (t === undefined || t === OsEventTypeList.CLICK_EVENT) {
        if (typeof listEvent.currentSelectItemIndex === 'number') {
          handleSelect(listEvent.currentSelectItemIndex)
        }
      }
      return
    }
    const textEvent = event.textEvent
    if (textEvent && textEvent.containerID === TEXT_ID) {
      if (textEvent.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) handleTextDoubleClick()
      else if (
        textEvent.eventType === OsEventTypeList.CLICK_EVENT ||
        textEvent.eventType === undefined
      )
        handleTextClick()
      return
    }
    if (event.sysEvent?.eventType === OsEventTypeList.FOREGROUND_ENTER_EVENT) {
      void refreshData()
    }
  })
}

function exitApp() {
  // Mode 1 = system exit-confirmation dialog (required on the root page).
  if (bridge) void bridge.shutDownPageContainer(1)
}

// ---------------------------------------------------------------------------
// Renderer 2: DOM preview (plain browser — for demos without hardware)
// ---------------------------------------------------------------------------

function renderDom() {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return
  const screen = currentScreen()
  app.innerHTML = `
    <div style="font-family:system-ui;max-width:640px;margin:24px auto;color:#222">
      <h2 style="margin:0 0 4px">GhostBird Glance — browser preview</h2>
      <p style="margin:0 0 12px;color:#555;font-size:14px">
        No Even bridge detected, so this is the exact G2 screen model in a
        576×288 canvas. Click a row to select it; on text screens, click =
        TAP, double-click = DOUBLE-TAP.
      </p>
      <div id="g2" style="width:576px;height:288px;background:#031507;border:2px solid #2f7d32;
           color:#7dff8a;font-family:ui-monospace,Menlo,monospace;font-size:17px;
           padding:10px;box-sizing:border-box;white-space:pre-wrap;overflow:hidden;cursor:pointer">
      </div>
    </div>`
  const g2 = app.querySelector<HTMLDivElement>('#g2')!
  const textDiv = document.createElement('div')
  textDiv.textContent = screen.text
  g2.appendChild(textDiv)
  if (screen.list) {
    const listDiv = document.createElement('div')
    listDiv.style.marginTop = '10px'
    listDiv.style.borderTop = '1px solid #2f7d32'
    screen.list.forEach((item, i) => {
      const row = document.createElement('div')
      row.textContent = `> ${item}`
      row.style.padding = '3px 2px'
      row.addEventListener('click', (e) => {
        e.stopPropagation()
        handleSelect(i)
      })
      listDiv.appendChild(row)
    })
    g2.appendChild(listDiv)
  }
  if (screen.capture === 'text') {
    g2.addEventListener('click', () => handleTextClick())
    g2.addEventListener('dblclick', () => handleTextDoubleClick())
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

let useDom = false
function render() {
  if (useDom) renderDom()
  else void renderBridge()
}

async function boot() {
  // The bridge resolves immediately in the simulator and on hardware.
  // In a plain browser it never arrives — fall back to the DOM preview.
  const bridgePromise = waitForEvenAppBridge().catch(() => null)
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 2500))
  bridge = (await Promise.race([bridgePromise, timeout])) as EvenAppBridge | null

  if (bridge) {
    wireBridgeEvents()
  } else {
    useDom = true
  }
  await loadPortfolio()
  render()
  await refreshData()
  render()
  // Live tick: refresh prices/odds every 30s (re-renders the home glance).
  setInterval(() => void refreshData(), 30_000)
}

void boot()
