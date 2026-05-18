import { useMemo, useState } from 'react'
import './App.css'

const availableFtc = 10000
const modes = {
  exchange: {
    actionText: '立即兑换',
    balanceLabel: '可用',
    cardEyebrow: '当前兑换价',
    cardTitle: '1 FTC = 1 DW20',
    heroEyebrow: '资产兑换',
    heroTitle: 'FTC 兑换 DW20',
    heroSubtitle: '将 FTC 资产兑换成 DW20 并存入无链钱包',
    inputLabel: '输入兑换数量',
    outputLabel: '可获得',
    outputToken: 'DW20',
    placeholder: '最小兑换 1',
    recordTitle: '兑换记录',
    tabLabel: '奖金币兑换',
  },
  wallet: {
    actionText: '存入钱包',
    balanceLabel: '可提',
    cardEyebrow: '存入比例',
    cardTitle: '1 FTC = 1 DW20',
    heroEyebrow: '奖金存入',
    heroTitle: '存入无链钱包',
    heroSubtitle: '将您的 FTC 奖金资产提现到无链钱包',
    inputLabel: '输入存入数量',
    outputLabel: '预计到账',
    outputToken: 'DW20',
    placeholder: '最小存入 1',
    recordTitle: '存入记录',
    tabLabel: '奖金存入钱包',
  },
} as const

type Mode = keyof typeof modes

function App() {
  const [amount, setAmount] = useState('')
  const [activeMode, setActiveMode] = useState<Mode>('exchange')
  const mode = modes[activeMode]

  const receiveAmount = useMemo(() => {
    const value = Number(amount)

    if (!Number.isFinite(value) || value <= 0) {
      return ''
    }

    return String(value)
  }, [amount])

  const canExchange = Number(receiveAmount) >= 1
  const switchMode = (nextMode: Mode) => {
    setActiveMode(nextMode)
    setAmount('')
  }

  return (
    <main className="exchange-page">
      <section className="hero-panel">
        <header className="top-bar">
          <button className="back-button" type="button" aria-label="返回">
            <span aria-hidden="true"></span>
          </button>
          <h1>兑换</h1>
        </header>

        <div className="hero-copy">
          <p>{mode.heroEyebrow}</p>
          <h2>{mode.heroTitle}</h2>
          <span>{mode.heroSubtitle}</span>
        </div>
      </section>

      <section className="exchange-shell" aria-labelledby="exchange-title">
        <nav className="mode-tabs" aria-label="兑换模式">
          <button
            className={`mode-tab ${activeMode === 'exchange' ? 'active' : ''}`}
            type="button"
            aria-pressed={activeMode === 'exchange'}
            onClick={() => switchMode('exchange')}
          >
            {modes.exchange.tabLabel}
          </button>
          <button
            className={`mode-tab ${activeMode === 'wallet' ? 'active' : ''}`}
            type="button"
            aria-pressed={activeMode === 'wallet'}
            onClick={() => switchMode('wallet')}
          >
            {modes.wallet.tabLabel}
          </button>
        </nav>

        <div className="exchange-card">
          <div className="card-heading">
            <div>
              <p>{mode.cardEyebrow}</p>
              <h2 id="exchange-title">{mode.cardTitle}</h2>
            </div>
            <span>实时</span>
          </div>

          <div className="field-row">
            <label className="field-label" htmlFor="ftc-amount">
              {mode.inputLabel}
            </label>
            <span>
              {mode.balanceLabel} {availableFtc.toLocaleString()} FTC
            </span>
          </div>
          <div className="amount-field">
            <input
              id="ftc-amount"
              inputMode="decimal"
              min="1"
              placeholder={mode.placeholder}
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <strong>FTC</strong>
          </div>

          <div className="field-row">
            <label className="field-label" htmlFor="dw20-amount">
              {mode.outputLabel}
            </label>
          </div>
          <div className="receive-field">
            <output id="dw20-amount">{receiveAmount || '0'}</output>
            <strong>{mode.outputToken}</strong>
          </div>

          <button className="exchange-button" disabled={!canExchange} type="button">
            {mode.actionText}
          </button>

          <div className="record-heading">
            <h2>{mode.recordTitle}</h2>
            <a href="#records">查看更多</a>
          </div>

          <div className="empty-record" id="records">
            <svg viewBox="0 0 80 80" role="presentation" aria-hidden="true">
              <path d="M24 31h32l5 13v18H19V44l5-13Z" />
              <path d="M29 37h22l3 8H26l3-8Z" />
              <path d="M19 44h14c2 5 12 5 14 0h14" />
              <path d="M31 26h18M36 19h8M24 22l-5-5M56 22l5-5" />
            </svg>
            <p>暂无数据</p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
