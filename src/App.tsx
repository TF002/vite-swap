import { useMemo, useState } from 'react'
import './App.css'

const availableFtc = 10000

function App() {
  const [amount, setAmount] = useState('')

  const receiveAmount = useMemo(() => {
    const value = Number(amount)

    if (!Number.isFinite(value) || value <= 0) {
      return ''
    }

    return String(value)
  }, [amount])

  const canExchange = Number(receiveAmount) >= 1

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
          <p>资产兑换</p>
          <h2>FTC 兑换 DW20</h2>
          <span>将 FTC 资产兑换成 DW20 并存入无链钱包</span>
        </div>
      </section>

      <section className="exchange-shell" aria-labelledby="exchange-title">
        <nav className="mode-tabs" aria-label="兑换模式">
          <button className="mode-tab active" type="button">
            奖金币兑换
          </button>
          <button className="mode-tab" type="button">
            奖金存入钱包
          </button>
        </nav>

        <div className="exchange-card">
          <div className="card-heading">
            <div>
              <p>当前兑换价</p>
              <h2 id="exchange-title">1 FTC = 1 DW20</h2>
            </div>
            <span>实时</span>
          </div>

          <div className="field-row">
            <label className="field-label" htmlFor="ftc-amount">
              输入兑换数量
            </label>
            <span>可用 {availableFtc.toLocaleString()} FTC</span>
          </div>
          <div className="amount-field">
            <input
              id="ftc-amount"
              inputMode="decimal"
              min="1"
              placeholder="最小兑换 1"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <strong>FTC</strong>
          </div>

          <div className="field-row">
            <label className="field-label" htmlFor="dw20-amount">
              可获得
            </label>
          </div>
          <div className="receive-field">
            <output id="dw20-amount">{receiveAmount || '0'}</output>
            <strong>DW20</strong>
          </div>

          <button className="exchange-button" disabled={!canExchange} type="button">
            立即兑换
          </button>

          <div className="record-heading">
            <h2>兑换记录</h2>
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
